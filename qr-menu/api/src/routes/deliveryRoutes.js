import express from 'express';
import Delivery from '../models/Delivery.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import { authenticateToken, authorizeRoles, checkSubscription } from '../middleware/auth.js';
import { sendNotificationToUser } from '../services/firebaseService.js';

const router = express.Router();

// Create delivery order
router.post('/', authenticateToken, checkSubscription, async (req, res) => {
    try {
        const {
            orderId,
            customerName,
            customerPhone,
            address,
            estimatedTime,
            deliveryFee,
            distance,
            notes
        } = req.body;

        // Verify order exists
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Check if delivery already exists for this order
        const existingDelivery = await Delivery.findOne({ order: orderId });
        if (existingDelivery) {
            return res.status(400).json({ error: 'Delivery already exists for this order' });
        }

        const delivery = await Delivery.create({
            order: orderId,
            restaurant: req.restaurant._id,
            customerName,
            customerPhone,
            address,
            estimatedTime,
            deliveryFee,
            distance,
            notes,
            status: 'pending'
        });

        // Update order
        order.orderType = 'delivery';
        order.deliveryAddress = address;
        order.deliveryFee = deliveryFee;
        await order.save();

        res.status(201).json({
            message: 'Delivery created successfully',
            delivery
        });
    } catch (error) {
        console.error('Create delivery error:', error);
        res.status(500).json({ error: 'Failed to create delivery' });
    }
});

// Get active deliveries for delivery person
router.get('/active', authenticateToken, authorizeRoles('delivery'), async (req, res) => {
    try {
        const deliveries = await Delivery.find({
            deliveryPerson: req.user._id,
            status: { $in: ['assigned', 'picked-up', 'in-transit'] }
        })
            .populate('order')
            .sort({ createdAt: -1 });

        res.json({ deliveries });
    } catch (error) {
        console.error('Get active deliveries error:', error);
        res.status(500).json({ error: 'Failed to fetch deliveries' });
    }
});

// Get all deliveries for restaurant
router.get('/restaurant/:restaurantId', authenticateToken, checkSubscription, async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const { status } = req.query;

        const query = { restaurant: restaurantId };
        if (status) {
            query.status = status;
        }

        const deliveries = await Delivery.find(query)
            .populate('deliveryPerson', 'name phone deliveryProfile')
            .populate('order')
            .sort({ createdAt: -1 });

        res.json({ deliveries });
    } catch (error) {
        console.error('Get restaurant deliveries error:', error);
        res.status(500).json({ error: 'Failed to fetch deliveries' });
    }
});

// Assign delivery to delivery person
router.patch('/:id/assign', authenticateToken, authorizeRoles('owner', 'admin', 'manager'), checkSubscription, async (req, res) => {
    try {
        const { id } = req.params;
        const { deliveryPersonId } = req.body;

        // Verify delivery person exists and has delivery role
        const deliveryPerson = await User.findById(deliveryPersonId);
        if (!deliveryPerson || deliveryPerson.role !== 'delivery') {
            return res.status(400).json({ error: 'Invalid delivery person' });
        }

        const delivery = await Delivery.findByIdAndUpdate(
            id,
            {
                deliveryPerson: deliveryPersonId,
                status: 'assigned',
                $push: {
                    statusHistory: {
                        status: 'assigned',
                        timestamp: new Date(),
                        updatedBy: req.user._id
                    }
                }
            },
            { new: true }
        ).populate('order');

        if (!delivery) {
            return res.status(404).json({ error: 'Delivery not found' });
        }

        // Send notification to delivery person
        await sendNotificationToUser(deliveryPersonId, {
            title: 'New Delivery Assignment',
            body: `You have been assigned delivery order #${delivery.order._id.toString().slice(-6)}`,
            data: { deliveryId: delivery._id.toString(), type: 'delivery-assigned' }
        });

        res.json({
            message: 'Delivery assigned successfully',
            delivery
        });
    } catch (error) {
        console.error('Assign delivery error:', error);
        res.status(500).json({ error: 'Failed to assign delivery' });
    }
});

// Update delivery status
router.patch('/:id/status', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['assigned', 'picked-up', 'in-transit', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const updateData = {
            status,
            $push: {
                statusHistory: {
                    status,
                    timestamp: new Date(),
                    updatedBy: req.user._id
                }
            }
        };

        // Set pickup time when status changes to picked-up
        if (status === 'picked-up') {
            updateData.pickupTime = new Date();
        }

        // Set delivery time when status changes to delivered
        if (status === 'delivered') {
            updateData.actualDeliveryTime = new Date();

            // Update delivery person stats
            await User.findByIdAndUpdate(req.user._id, {
                $inc: { 'deliveryProfile.completedDeliveries': 1 }
            });
        }

        const delivery = await Delivery.findByIdAndUpdate(id, updateData, { new: true })
            .populate('order');

        if (!delivery) {
            return res.status(404).json({ error: 'Delivery not found' });
        }

        // Update order status as well
        if (status === 'delivered') {
            await Order.findByIdAndUpdate(delivery.order._id, {
                status: 'completed',
                completedAt: new Date()
            });
        }

        res.json({
            message: 'Delivery status updated successfully',
            delivery
        });
    } catch (error) {
        console.error('Update delivery status error:', error);
        res.status(500).json({ error: 'Failed to update delivery status' });
    }
});

// Update delivery person location
router.patch('/location', authenticateToken, authorizeRoles('delivery'), async (req, res) => {
    try {
        const { latitude, longitude } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json({ error: 'Latitude and longitude required' });
        }

        await User.findByIdAndUpdate(req.user._id, {
            'deliveryProfile.currentLocation': {
                latitude,
                longitude,
                updatedAt: new Date()
            }
        });

        res.json({ message: 'Location updated successfully' });
    } catch (error) {
        console.error('Update location error:', error);
        res.status(500).json({ error: 'Failed to update location' });
    }
});

export default router;
