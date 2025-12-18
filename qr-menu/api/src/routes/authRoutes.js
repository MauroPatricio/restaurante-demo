import express from 'express';
import jwt from 'jsonwebtoken';
import Role from '../models/Role.js'; // Import Role model
import User from '../models/User.js';
import Restaurant from '../models/Restaurant.js';
import Subscription from '../models/Subscription.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Generate JWT token
const generateToken = (userId, restaurantId = null) => {
    const payload = { userId };
    if (restaurantId) {
        payload.restaurantId = restaurantId;
    }
    return jwt.sign(
        payload,
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
    );
};

import streamifier from 'streamifier';
import cloudinary from '../config/cloudinary.js';
import upload from '../middleware/upload.js';

// Helper for stream upload
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


// Register new restaurant (owner + restaurant creation)
router.post('/register', upload.single('image'), async (req, res) => {
    try {
        const { name, email, password, phone, restaurantName, restaurantAddress } = req.body;
        // console.log('Register Body:', req.body);
        // console.log('Register File:', req.file);

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        let logoUrl = null;
        if (req.file) {
            try {
                const result = await streamUpload(req);
                logoUrl = result.secure_url;
            } catch (uErr) {
                console.error('Cloudinary Upload Error:', uErr);
                // Depending on requirements, fail hard or soft. Let's soft fail but log it.
            }
        }

        // Find Owner role
        let ownerRole = await Role.findOne({ name: 'Owner' });
        // Fallback if not seeded yet (though seeding should handle this)
        if (!ownerRole) {
            ownerRole = await Role.create({
                name: 'Owner',
                description: 'Restaurant Owner',
                permissions: ['all'],
                isSystem: true
            });
        }

        // Create user (password will be automatically hashed by pre-save hook)
        const user = await User.create({
            name,
            email,
            password,
            phone,
            role: ownerRole._id // Assign Role ID
        });

        // Create restaurant
        const restaurant = await Restaurant.create({
            name: restaurantName,
            address: restaurantAddress,
            owner: user._id,
            email: email,
            phone: phone,
            logo: logoUrl // Save Logo URL
        });

        // Create subscription (trial period - first month free)
        const now = new Date();
        const trialEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

        const subscription = await Subscription.create({
            restaurant: restaurant._id,
            status: 'trial',
            currentPeriodEnd: trialEnd,
            currentPeriodStart: now,
            amount: 10000
        });

        // Link subscription to restaurant
        restaurant.subscription = subscription._id;
        await restaurant.save();

        // Link restaurant to user (SaaS: Add to array)
        user.restaurants = [restaurant._id];
        // user.restaurant = restaurant._id; // Deprecated
        await user.save();

        // Generate token
        const token = generateToken(user._id);

        res.status(201).json({
            message: 'Registration successful',
            token,
            user: user.toSafeObject(),
            restaurant: {
                id: restaurant._id,
                name: restaurant.name,
                logo: restaurant.logo
            },
            subscription: {
                status: subscription.status,
                trialEndsAt: subscription.currentPeriodEnd
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed', details: error.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user and include password field
        const user = await User.findOne({ email }).select('+password').populate('restaurants').populate('role');

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Check password
        const isValidPassword = await user.comparePassword(password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Password ou email invalido' });
        }

        // Check if user is active
        if (!user.active) {
            return res.status(403).json({ error: 'Conta e desactivada' });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Generate GLOBAL token (no restaurantId)
        const token = generateToken(user._id);

        res.json({
            message: 'Login successful',
            token, // Global token
            user: {
                ...user.toSafeObject(),
                restaurants: user.restaurants // Send full list
            },
            isDefaultPassword: user.isDefaultPassword
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed', details: error.message });
    }
});

// Select Restaurant (SaaS Flow)
router.post('/select-restaurant', authenticateToken, async (req, res) => {
    try {
        const { restaurantId } = req.body;
        const user = await User.findById(req.user._id).populate('restaurants');

        if (!restaurantId) {
            return res.status(400).json({ error: 'Restaurant ID required' });
        }

        // Verify ownership/membership
        const isMember = user.restaurants.some(r => r._id.toString() === restaurantId) || user.role.name === 'Admin'; // Admin super-access optional

        if (!isMember) {
            return res.status(403).json({ error: 'You do not have access to this restaurant' });
        }

        const restaurant = await Restaurant.findById(restaurantId).populate('subscription');

        if (!restaurant) {
            return res.status(404).json({ error: 'Restaurant not found' });
        }

        // Generate SCOPE token (WITH restaurantId)
        const scopedToken = generateToken(user._id, restaurantId);

        let subscriptionStatus = null;
        if (restaurant.subscription) {
            const subscription = await Subscription.findById(restaurant.subscription);
            if (subscription) {
                subscriptionStatus = {
                    status: subscription.status,
                    currentPeriodEnd: subscription.currentPeriodEnd,
                    isValid: subscription.isValid()
                };
            }
        }

        res.json({
            message: 'Context switched',
            token: scopedToken,
            restaurant: restaurant,
            subscription: subscriptionStatus
        });

    } catch (error) {
        console.error('Select restaurant error:', error);
        res.status(500).json({ error: 'Failed to switch context' });
    }
});

// Refresh token
router.post('/refresh', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const oldToken = authHeader && authHeader.split(' ')[1];

        if (!oldToken) {
            return res.status(401).json({ error: 'Token required' });
        }

        // Verify old token (allow expired tokens for refresh)
        const decoded = jwt.verify(
            oldToken,
            process.env.JWT_SECRET || 'your-secret-key',
            { ignoreExpiration: true }
        );

        // Ensure user still exists and is active
        const user = await User.findById(decoded.userId);
        if (!user || !user.active) {
            return res.status(403).json({ error: 'User not found or inactive' });
        }

        // Generate new token
        const newToken = generateToken(user._id);

        res.json({ token: newToken });
    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(403).json({ error: 'Invalid token' });
    }
});

// Update FCM token for push notifications (protected)
router.post('/fcm-token', authenticateToken, async (req, res) => {
    try {
        const { fcmToken } = req.body;

        if (!fcmToken) {
            return res.status(400).json({ error: 'FCM token required' });
        }

        await User.findByIdAndUpdate(req.user._id, { fcmToken });

        res.json({ message: 'FCM token updated successfully' });
    } catch (error) {
        console.error('FCM token update error:', error);
        res.status(500).json({ error: 'Failed to update FCM token' });
    }
});

// Get current user profile (protected)
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('restaurants').populate('role');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user: user.toSafeObject() });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to fetch profile', details: error.message });
    }
});

// Change password (protected)
router.post('/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Use select('+password') to retrieve the password for comparison logic in user model/controller
        // But here we can just findById. Because comparePassword uses instance's this.password
        const user = await User.findById(req.user._id).select('+password');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ error: 'Incorrect current password' });
        }

        // Set new password
        user.password = newPassword;
        user.isDefaultPassword = false; // Reset flag
        await user.save();

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

export default router;
