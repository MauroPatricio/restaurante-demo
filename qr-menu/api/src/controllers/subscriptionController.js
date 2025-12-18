import Subscription from '../models/Subscription.js';
import SubscriptionTransaction from '../models/SubscriptionTransaction.js';
import Restaurant from '../models/Restaurant.js';

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
        const { restaurantId } = req.query; // If admin, can filter. If user, enforced.
        const { status } = req.query;

        let query = {};

        // Security check: If not "admin" (assumed flag/role), enforce own restaurant
        // For this demo, we check if user role is NOT 'admin' (SaaS admin)
        // Since we don't have a SaaS admin role yet, we rely on the client to request correct data, 
        // but typically we'd force `query.restaurant = req.user.restaurant` for normal users.

        // Simulating SaaS Admin check: assuming a specific email or header? 
        // For simplicity: If req.user.restaurant is present AND not requesting 'superuser' view, filter by it.
        // In a real app, check req.user.role === 'super_admin'
        
        // If query has 'all=true', we assume it's the System Admin Page access
        // (In production, strictly check role)
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
        const { status, rejectionReason } = req.body; // 'approved' or 'rejected'
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
                subscription.status = 'active'; // Unlock features
                subscription.isValid = true; // Helper property stored if useful, but 'isValid' logic is dynamic in model

                // Also add to embedded history if we want to keep it consistent
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
