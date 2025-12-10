import express from 'express';
import Coupon from '../models/Coupon.js';
import { authenticateToken, authorizeRoles, checkSubscription } from '../middleware/auth.js';

const router = express.Router();

// Create new coupon
router.post('/', authenticateToken, authorizeRoles('owner', 'admin', 'manager'), checkSubscription, async (req, res) => {
    try {
        const {
            code,
            type,
            value,
            minOrderAmount,
            maxDiscountAmount,
            validFrom,
            validTo,
            usageLimit,
            perUserLimit,
            description,
            applicableItems,
            applicableCategories
        } = req.body;

        // Validate required fields
        if (!code || !type || !value || !validTo) {
            return res.status(400).json({ error: 'Code, type, value, and validTo are required' });
        }

        // Check if coupon code already exists for this restaurant
        const existingCoupon = await Coupon.findOne({
            code: code.toUpperCase(),
            restaurant: req.restaurant._id
        });

        if (existingCoupon) {
            return res.status(400).json({ error: 'Coupon code already exists for this restaurant' });
        }

        const coupon = await Coupon.create({
            restaurant: req.restaurant._id,
            code: code.toUpperCase(),
            type,
            value,
            minOrderAmount,
            maxDiscountAmount,
            validFrom,
            validTo,
            usageLimit,
            perUserLimit,
            description,
            applicableItems,
            applicableCategories
        });

        res.status(201).json({
            message: 'Coupon created successfully',
            coupon
        });
    } catch (error) {
        console.error('Create coupon error:', error);
        res.status(500).json({ error: 'Failed to create coupon' });
    }
});

// Validate coupon code
router.post('/validate', async (req, res) => {
    try {
        const { code, restaurantId, orderAmount, userId } = req.body;

        if (!code || !restaurantId || orderAmount === undefined) {
            return res.status(400).json({ error: 'Code, restaurantId, and orderAmount required' });
        }

        const coupon = await Coupon.findOne({
            code: code.toUpperCase(),
            restaurant: restaurantId
        });

        if (!coupon) {
            return res.status(404).json({ error: 'Invalid coupon code' });
        }

        // Validate coupon
        const validation = coupon.isValid(userId);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.reason });
        }

        // Check minimum order amount
        if (orderAmount < coupon.minOrderAmount) {
            return res.status(400).json({
                error: `Minimum order amount of ${coupon.minOrderAmount} MT required`
            });
        }

        // Calculate discount
        const discount = coupon.calculateDiscount(orderAmount);

        res.json({
            valid: true,
            coupon: {
                code: coupon.code,
                description: coupon.description,
                type: coupon.type,
                value: coupon.value
            },
            discount,
            newTotal: orderAmount - discount
        });
    } catch (error) {
        console.error('Validate coupon error:', error);
        res.status(500).json({ error: 'Failed to validate coupon' });
    }
});

// Get all coupons for restaurant
router.get('/:restaurantId', authenticateToken, checkSubscription, async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const { active } = req.query;

        const query = { restaurant: restaurantId };
        if (active !== undefined) {
            query.active = active === 'true';
        }

        const coupons = await Coupon.find(query).sort({ createdAt: -1 });

        res.json({ coupons });
    } catch (error) {
        console.error('Get coupons error:', error);
        res.status(500).json({ error: 'Failed to fetch coupons' });
    }
});

// Update coupon
router.patch('/:id', authenticateToken, authorizeRoles('owner', 'admin', 'manager'), checkSubscription, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Prevent changing code and restaurant
        delete updates.code;
        delete updates.restaurant;
        delete updates.usedCount;
        delete updates.usedBy;

        const coupon = await Coupon.findByIdAndUpdate(
            id,
            updates,
            { new: true, runValidators: true }
        );

        if (!coupon) {
            return res.status(404).json({ error: 'Coupon not found' });
        }

        res.json({
            message: 'Coupon updated successfully',
            coupon
        });
    } catch (error) {
        console.error('Update coupon error:', error);
        res.status(500).json({ error: 'Failed to update coupon' });
    }
});

// Delete/deactivate coupon
router.delete('/:id', authenticateToken, authorizeRoles('owner', 'admin', 'manager'), checkSubscription, async (req, res) => {
    try {
        const { id } = req.params;

        // Don't actually delete, just deactivate
        const coupon = await Coupon.findByIdAndUpdate(
            id,
            { active: false },
            { new: true }
        );

        if (!coupon) {
            return res.status(404).json({ error: 'Coupon not found' });
        }

        res.json({
            message: 'Coupon deactivated successfully',
            coupon
        });
    } catch (error) {
        console.error('Delete coupon error:', error);
        res.status(500).json({ error: 'Failed to delete coupon' });
    }
});

export default router;
