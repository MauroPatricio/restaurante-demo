import Subscription from '../models/Subscription.js';
import SubscriptionTransaction from '../models/SubscriptionTransaction.js';
import Restaurant from '../models/Restaurant.js';
import AuditLog from '../models/AuditLog.js';
import SystemSetting from '../models/SystemSetting.js';
import User from '../models/User.js';
import { calculateGlobalStatus, findCriticalSubscription } from '../utils/subscriptionHelper.js';

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

        // Call checkExpiration to ensure status is up to date with the date
        await subscription.checkExpiration();

        // Calculate effective price (Main vs Additional)
        // 1. Fetch base price
        const priceSetting = await SystemSetting.findOne({ key: 'base_subscription_price' });
        const basePrice = priceSetting ? Number(priceSetting.value) : 1000;

        let effectivePrice = basePrice;

        // 2. Determine if it's Main (100%) or Additional (50%)
        const restaurant = await Restaurant.findById(restaurantId);
        if (restaurant && restaurant.owner) {
            const ownerRestaurants = await Restaurant.find({ owner: restaurant.owner }).sort({ createdAt: 1 });
            if (ownerRestaurants.length > 0) {
                const mainRestaurantId = ownerRestaurants[0]._id.toString();
                // If this is NOT the first restaurant, apply 50% discount
                if (mainRestaurantId !== restaurantId) {
                    effectivePrice = basePrice * 0.5;
                }
            }
        }

        res.json({
            subscription,
            systemPrice: effectivePrice
        });
    } catch (error) {
        console.error('Get subscription error:', error);
        res.status(500).json({ error: 'Failed to fetch subscription' });
    }
};

// Upload Proof
export const uploadProof = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const uploadService = (await import('../services/uploadService.js')).default;
        const streamifier = (await import('streamifier')).default;

        const streamUpload = (req) => {
            return new Promise((resolve, reject) => {
                const stream = uploadService.cloudinary.uploader.upload_stream(
                    {
                        folder: 'subscription-proofs',
                        resource_type: 'auto' // Auto detect (important for PDF)
                    },
                    (error, result) => {
                        if (result) {
                            resolve(result);
                        } else {
                            reject(error);
                        }
                    }
                );
                streamifier.createReadStream(req.file.buffer).pipe(stream);
            });
        };

        const result = await streamUpload(req);

        res.json({
            success: true,
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format
        });
    } catch (error) {
        console.error('Upload proof error:', error);
        res.status(500).json({ error: 'Failed to upload proof' });
    }
};

// Create payment transaction
export const createTransaction = async (req, res) => {
    try {
        const { amount, method, reference, proofUrl } = req.body;
        const restaurantId = req.user.restaurant;
        const userId = req.user.userId;

        // Find subscription
        const subscription = await Subscription.findOne({ restaurant: restaurantId });
        if (!subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }

        // Validate proof for non-automatic methods (if any) or just enforce if method requires it
        if ((method === 'mpesa' || method === 'bci' || method === 'visa') && !proofUrl) {
            // Maybe optional for some, but requirement says "Upload de comprovativo (Obrigatório)"
            if (!proofUrl) {
                return res.status(400).json({ error: 'Payment proof is required' });
            }
        }

        const transaction = await SubscriptionTransaction.create({
            restaurant: restaurantId,
            subscription: subscription._id,
            amount: amount || 15000,
            method,
            reference,
            proofUrl,
            requestedBy: userId,
            status: 'pending'
        });

        // Update subscription status to pending_activation ONLY if currently expired
        // If it's active, keep it active so the user isn't blocked while waiting for approval
        if (subscription.status === 'expired' || !subscription.isValid()) {
            subscription.status = 'pending_activation';
            await subscription.save();
        }

        // Emit real-time notification to all connected sockets
        // Admins will filter this on the frontend
        if (req.io) {
            req.io.emit('subscription:renewal_request', {
                requestId: transaction._id,
                restaurantId,
                restaurantName: req.user.restaurantName || 'Restaurante',
                amount: transaction.amount,
                plan: subscription.plan || 'Standard',
                requestedAt: new Date()
            });
        }

        res.status(201).json({ message: 'Payment request submitted', transaction });
    } catch (error) {
        console.error('Create transaction error:', error);
        res.status(500).json({ error: 'Failed to create payment request' });
    }
};

// Get transactions (History or Pending)
// Get transactions (History or Pending)
export const getTransactions = async (req, res) => {
    try {
        const { restaurantId, status } = req.query;
        let query = {};

        // Security: Strictly enforce scoping
        if (req.user.role?.isSystem) {
            // System Admins can see all or specific restaurant
            if (restaurantId) query.restaurant = restaurantId;
        } else {
            // Owners/Managers MUST have a restaurant context
            const activeRestaurantId = req.user.restaurant || restaurantId;

            if (!activeRestaurantId) {
                return res.status(403).json({ error: 'Restaurant context required' });
            }

            // If providing restaurantId in query, verify it matches user's context (unless it's a multi-res user, but here we expect the active context)
            query.restaurant = activeRestaurantId;
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
                // Add 30 days to current end date OR now if already expired
                // This implements cumulative renewal (summing days)
                let currentEnd = new Date(subscription.currentPeriodEnd);
                let now = new Date();

                let newEnd;
                if (currentEnd > now) {
                    // Cumulative: Add 30 days to the existing future date
                    newEnd = new Date(currentEnd.getTime() + (30 * 24 * 60 * 60 * 1000));
                } else {
                    // Expired: New 30 days starting from now
                    newEnd = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
                }

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

        if (req.io) {
            if (status === 'approved') {
                req.io.emit('subscription:activated', {
                    restaurantId: transaction.restaurant,
                    subscriptionId: transaction.subscription
                });
            } else if (status === 'rejected') {
                req.io.emit('subscription:rejected', {
                    restaurantId: transaction.restaurant,
                    subscriptionId: transaction.subscription,
                    reason: rejectionReason
                });
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

// Get owners summary with subscription totals (Admin only)
export const getOwnersSummary = async (req, res) => {
    try {
        // 1. Get all subscriptions with restaurant and owner details
        const subscriptions = await Subscription.find()
            .populate({
                path: 'restaurant',
                select: 'name email owner createdAt',
                populate: {
                    path: 'owner',
                    select: 'name email'
                }
            });

        // 2. Get base price
        let basePriceSetting = await SystemSetting.findOne({ key: 'base_subscription_price' });
        const basePrice = basePriceSetting ? Number(basePriceSetting.value) : 1000; // Default 1000 Mt

        // 3. Group by Owner
        const ownerMap = {};

        subscriptions.forEach(sub => {
            const restaurant = sub.restaurant;
            if (!restaurant || !restaurant.owner) return;

            const ownerId = restaurant.owner._id.toString();

            if (!ownerMap[ownerId]) {
                ownerMap[ownerId] = {
                    id: ownerId,
                    name: restaurant.owner.name,
                    email: restaurant.owner.email,
                    restaurants: [],
                    totalAmount: 0,
                    status: 'active'
                };
            }

            ownerMap[ownerId].restaurants.push({
                id: restaurant._id,
                subscriptionId: sub._id,
                name: restaurant.name,
                status: sub.status,
                daysUntilExpiry: sub.getDaysUntilExpiry ? sub.getDaysUntilExpiry() : 0,
                createdAt: restaurant.createdAt
            });
        });

        // 4. Calculate Totals and Assign Roles (Main vs Additional)
        const owners = Object.values(ownerMap).map(owner => {
            // Sort restaurants by creation date (Oldest = Main)
            owner.restaurants.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

            let total = 0;
            const enhancedRestaurants = owner.restaurants.map((r, index) => {
                let amount = 0;
                let priceType = 'main';

                if (index === 0) {
                    amount = basePrice;
                    priceType = 'main';
                } else {
                    amount = basePrice * 0.5;
                    priceType = 'additional';
                }

                // Only count active/paying statuses towards total (optional, but requested logic implies we show costs)
                // Actually, the requirement says "Subscription Amount" so we should probably show what they SHOULD pay.
                // But for the total check, usually we sum up what is due. 
                // Let's sum up everything as "Potential Revenue" or "Billed Amount".
                total += amount;

                return {
                    ...r,
                    currentAmount: amount,
                    priceType
                };
            });

            const allSuspendedOrExpired = enhancedRestaurants.every(r => ['suspended', 'expired', 'cancelled'].includes(r.status));
            owner.status = allSuspendedOrExpired ? 'suspended' : 'active';

            return {
                ...owner,
                restaurants: enhancedRestaurants, // Return enhanced list
                totalAmount: total,
                restaurantCount: enhancedRestaurants.length
            };
        });

        res.json({
            success: true,
            basePrice,
            count: owners.length,
            owners
        });

    } catch (error) {
        console.error('Get owners summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch owners summary'
        });
    }
};

// Get Base Price (Admin only)
export const getBasePrice = async (req, res) => {
    try {
        const setting = await SystemSetting.findOne({ key: 'base_subscription_price' });
        res.json({
            success: true,
            basePrice: setting ? Number(setting.value) : 1000
        });
    } catch (error) {
        console.error('Get base price error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch base price' });
    }
};

// Update Base Price (Admin only)
export const updateBasePrice = async (req, res) => {
    try {
        const { price } = req.body;
        if (price === undefined || price < 0) {
            return res.status(400).json({ success: false, message: 'Invalid price' });
        }

        const setting = await SystemSetting.findOneAndUpdate(
            { key: 'base_subscription_price' },
            {
                value: price,
                description: 'Base subscription price for the first restaurant'
            },
            { upsert: true, new: true }
        );

        // Audit Log
        await AuditLog.log({
            userId: req.user.id,
            action: 'update_system_setting',
            targetModel: 'SystemSetting',
            targetId: setting._id,
            changes: { key: 'base_subscription_price', value: price },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        res.json({
            success: true,
            message: 'Base price updated',
            basePrice: Number(setting.value)
        });
    } catch (error) {
        console.error('Update base price error:', error);
        res.status(500).json({ success: false, message: 'Failed to update base price' });
    }
};

// Get global subscription status for multi-restaurant user
export const getGlobalSubscriptionStatus = async (req, res) => {
    try {
        const userId = req.params.userId || req.user.id;

        // Find user
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Fetch user's restaurants (ForeignKey relationship)
        // Dynamic import to avoid circular dependency if any, though regular import is preferred if clean.
        // We use the existing import at the top if available, or dynamic if needed. 
        // Restaurant is already imported at the top of file? Yes: import Restaurant from '../models/Restaurant.js';

        const userRestaurants = await Restaurant.find({ owner: userId });

        if (userRestaurants.length === 0) {
            return res.status(404).json({ error: 'No restaurants found for user' });
        }

        if (userRestaurants.length === 1) {
            const subscription = await Subscription.findOne({ restaurant: userRestaurants[0]._id });
            return res.json({
                globalStatus: subscription?.status || 'suspended',
                isSingleRestaurant: true,
                subscription: subscription,
                restaurant: userRestaurants[0]
            });
        }

        // Fetch subscriptions for all restaurants
        const restaurantIds = userRestaurants.map(r => r._id);
        const subscriptions = await Subscription.find({
            restaurant: { $in: restaurantIds }
        }).populate('restaurant', 'name email logo');

        // Calculate global status
        const globalStatus = calculateGlobalStatus(subscriptions);
        const criticalSubscription = findCriticalSubscription(subscriptions);

        // Build restaurant status array
        // Filter out subscriptions where the restaurant might have been deleted (orphaned)
        const validSubscriptions = subscriptions.filter(sub => sub.restaurant);

        const restaurantStatuses = validSubscriptions.map(sub => ({
            restaurantId: sub.restaurant._id,
            restaurantName: sub.restaurant.name,
            status: sub.status,
            currentPeriodEnd: sub.currentPeriodEnd,
            currentPeriodStart: sub.currentPeriodStart,
            daysUntilExpiry: sub.getDaysUntilExpiry ? sub.getDaysUntilExpiry() : 0
        }));

        res.json({
            globalStatus,
            isSingleRestaurant: false,
            totalRestaurants: userRestaurants.length,
            criticalSubscription: criticalSubscription ? {
                ...criticalSubscription.toObject(),
                restaurant: criticalSubscription.restaurant
            } : null,
            restaurants: restaurantStatuses
        });

    } catch (error) {
        console.error('Get global subscription status error:', error);
        res.status(500).json({ error: 'Failed to fetch global subscription status' });
    }
};
