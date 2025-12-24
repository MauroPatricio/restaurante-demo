import express from 'express';
import Restaurant from '../models/Restaurant.js';
import UserRestaurantRole from '../models/UserRestaurantRole.js';
import Role from '../models/Role.js';
import Subscription from '../models/Subscription.js';
import { authenticateToken } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import cloudinary from '../config/cloudinary.js';
import streamifier from 'streamifier';

const router = express.Router();

// Helper to upload to Cloudinary (reused from authRoutes/upload middleware logic)
const streamUpload = (req) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: 'restaurants' },
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

// Create a new restaurant
router.post('/', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        const { name, address, phone, email } = req.body;
        const userId = req.user._id; // Corrected from req.user.userId

        // Validate required fields
        if (!name || !address) {
            return res.status(400).json({ error: 'Name and Address are required' });
        }

        let logoUrl = null;
        if (req.file) {
            try {
                const result = await streamUpload(req);
                logoUrl = result.secure_url;
            } catch (uErr) {
                console.error('Cloudinary Upload Error:', uErr);
                // We continue even if logo fails
            }
        }

        // Find Owner role
        let ownerRole = await Role.findOne({ name: 'Owner' });
        if (!ownerRole) {
            // Should exist, but fail-safe
            ownerRole = await Role.create({
                name: 'Owner',
                description: 'Restaurant Owner',
                permissions: ['all'],
                isSystem: true
            });
        }

        // Create Restaurant
        const restaurant = await Restaurant.create({
            name,
            address: { street: address }, // Address is object in schema! FIX: map simple string to street or adjust schema? Schema says address is object.
            phone: phone || '',
            email: email || '',
            owner: userId, // Legacy/Reference
            logo: logoUrl
        });

        // Create UserRestaurantRole
        await UserRestaurantRole.create({
            user: userId,
            restaurant: restaurant._id,
            role: ownerRole._id,
            isDefault: true
        });

        // Create Subscription (Trial)
        const now = new Date();
        const trialEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
        const subscription = await Subscription.create({
            restaurant: restaurant._id,
            status: 'trial',
            currentPeriodEnd: trialEnd,
            currentPeriodStart: now,
            amount: 0
        });

        restaurant.subscription = subscription._id;
        await restaurant.save();

        res.status(201).json({
            message: 'Restaurant created successfully',
            restaurant: {
                id: restaurant._id,
                name: restaurant.name,
                logo: restaurant.logo,
                role: 'Owner'
            }
        });

    } catch (error) {
        console.error('Create Restaurant Error:', error);
        res.status(500).json({ error: 'Failed to create restaurant', details: error.message });
    }
});

export default router;
