import Subscription from '../models/Subscription.js';
import SubscriptionTransaction from '../models/SubscriptionTransaction.js';
import Restaurant from '../models/Restaurant.js';
import AuditLog from '../models/AuditLog.js';

// Get current subscription
export const getSubscription = async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const subscription = await Subscription.findOne({ restaurant: restaurantId });

        if (!subscription) {
            // Create default trial if not exists (auto-provisioning)
            const newSub = await Subscription.create({
                restaurant: restaurantId,
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(new Date().setDate(new Date().getDate() + 30)), // 30 days trial
                status: 'trial'
            });
            return res.json({ subscription: newSub });
        }

        res.json({ subscription });
    } catch (error) {
        console.error('Get subscription error:', error);
        res.status(500).json({ error: 'Failed to fetch subscription' });
    }
};

// Create payment transaction
export const createTransaction = async (req, res) => {
    try {
        const { amount, method, reference } = req.body;
        const restaurantId = req.user.restaurant;
        const userId = req.user.userId;

        // Find subscription
        const subscription = await Subscription.findOne({ restaurant: restaurantId });
        if (!subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }

        const transaction = await SubscriptionTransaction.create({
            restaurant: restaurantId,
            subscription: subscription._id,
            amount: amount || 15000,
            method,
            reference,
            requestedBy: userId,
            status: 'pending'
        });

        res.status(201).json({ message: 'Payment request submitted', transaction });
    } catch (error) {
        console.error('Create transaction error:', error);
        res.status(500).json({ error: 'Failed to create payment request' });
    }
};

// Get transactions (History or Pending)
export const getTransactions = async (req, res) => {
    try {
        const { restaurantId } = req.query;
        const { status } = req.query;

        let query = {};

        if (req.user.restaurant && req.query.view !== 'admin_all') {
            query.restaurant = req.user.restaurant;
        }

        if (status) {
            query.status = status;
        }

        const transactions = await SubscriptionTransaction.find(query)
            .populate('restaurant', 'name')
            .populate('requestedBy', 'name email')
            .populate('processedBy', 'name')
            .sort({ createdAt: -1 });

        res.json({ transactions });
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
};

// Approve/Reject Transaction
export const reviewTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, rejectionReason } = req.body;
        const userId = req.user.userId;

        const transaction = await SubscriptionTransaction.findById(id);
        if (!transaction) return res.status(404).json({ error: 'Transaction not found' });

        if (transaction.status !== 'pending') {
            return res.status(400).json({ error: 'Transaction already processed' });
        }

        transaction.status = status;
        transaction.processedBy = userId;
        transaction.processedAt = new Date();
        if (status === 'rejected') {
            transaction.rejectionReason = rejectionReason;
        }

        await transaction.save();

        if (status === 'approved') {
            // Update Subscription
            const subscription = await Subscription.findById(transaction.subscription);
            if (subscription) {
                // Add 30 days to current end date OR now if expired
                let newEnd = new Date(subscription.currentPeriodEnd);
                if (newEnd < new Date()) {
                    newEnd = new Date();
                }
                newEnd.setDate(newEnd.getDate() + 30);

                subscription.currentPeriodEnd = newEnd;
                subscription.status = 'active';
                subscription.isValid = true;

                subscription.paymentHistory.push({
                    date: new Date(),
                    amount: transaction.amount,
                    method: transaction.method,
                    reference: transaction.reference,
                    status: 'completed'
                });

                await subscription.save();
            }
        }

        res.json({ message: `Transaction ${status}`, transaction });
    } catch (error) {
        console.error('Review transaction error:', error);
        res.status(500).json({ error: 'Failed to process transaction' });
    }
};

// ============================================
// ADMIN-ONLY METHODS
// ============================================

// Get all subscriptions (Admin only)
export const getAllSubscriptions = async (req, res) => {
    try {
        const { status, search, sortBy = 'createdAt', order = 'desc' } = req.query;

        let query = {};

        // Filter by status
        if (status && status !== 'all') {
            query.status = status;
        }

        const subscriptions = await Subscription.find(query)
            .populate('restaurant', 'name email phone owner')
            .populate({
                path: 'restaurant',
                populate: {
                    path: 'owner',
                    select: 'name email'
                }
            })
            .sort({ [sortBy]: order === 'asc' ? 1 : -1 });

        // Apply search filter if provided
        let filteredSubscriptions = subscriptions;
        if (search) {
            const searchLower = search.toLowerCase();
            filteredSubscriptions = subscriptions.filter(sub =>
                sub.restaurant?.name?.toLowerCase().includes(searchLower) ||
                sub.restaurant?.email?.toLowerCase().includes(searchLower)
            );
        }

        // Add computed fields
        const enrichedSubscriptions = filteredSubscriptions.map(sub => ({
            ...sub.toObject(),
            daysUntilExpiry: sub.getDaysUntilExpiry(),
            isExpired: sub.isExpired(),
            isValid: sub.isValid()
        }));

        res.json({
            success: true,
            count: enrichedSubscriptions.length,
            subscriptions: enrichedSubscriptions
        });
    } catch (error) {
        console.error('Get all subscriptions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch subscriptions'
        });
    }
};

// Update subscription status (Admin only)
export const updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, reason } = req.body;
        const userId = req.user.id;

        // Validate status
        const validStatuses = ['trial', 'active', 'suspended', 'cancelled', 'expired'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
        }

        // Find subscription
        const subscription = await Subscription.findById(id).populate('restaurant', 'name');
        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: 'Subscription not found'
            });
        }

        const oldStatus = subscription.status;

        // Update status
        subscription.status = status;
        await subscription.save();

        // Create audit log
        await AuditLog.log({
            userId: userId,
            action: 'subscription_status_change',
            targetModel: 'Subscription',
            targetId: subscription._id,
            changes: {
                oldValue: oldStatus,
                newValue: status
            },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            restaurantId: subscription.restaurant._id
        });

        res.json({
            success: true,
            message: `Subscription status updated from ${oldStatus} to ${status}`,
            subscription: {
                ...subscription.toObject(),
                isValid: subscription.isValid(),
                isActive: subscription.isActive()
            }
        });
    } catch (error) {
        console.error('Update subscription status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update subscription status'
        });
    }
};

// Get audit logs for subscriptions (Admin only)
export const getAuditLogs = async (req, res) => {
    try {
        const { subscriptionId, limit = 50, page = 1 } = req.query;

        let query = { targetModel: 'Subscription' };

        // Filter by specific subscription if provided
        if (subscriptionId) {
            query.targetId = subscriptionId;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const logs = await AuditLog.find(query)
            .populate('user', 'name email')
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .skip(skip);

        const total = await AuditLog.countDocuments(query);

        res.json({
            success: true,
            logs,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get audit logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch audit logs'
        });
    }
};
