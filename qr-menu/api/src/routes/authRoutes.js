import express from 'express';
import jwt from 'jsonwebtoken';
import Role from '../models/Role.js'; // Import Role model
import User from '../models/User.js';
import Restaurant from '../models/Restaurant.js';
import UserRestaurantRole from '../models/UserRestaurantRole.js';
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


// Register new User (Owner) - Step 1
router.post('/register', upload.single('image'), async (req, res) => {
    try {
        console.log('🔹 HITTING NEW V2 REGISTER ENDPOINT');
        console.log('🔹 Body:', req.body);
        const { name, email, password, phone, address } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        let avatarUrl = null;
        if (req.file) {
            try {
                // Upload to Cloudinary (using existing streamUpload helper, maybe change folder if needed)
                const result = await streamUpload(req);
                avatarUrl = result.secure_url;
            } catch (uErr) {
                console.error('Cloudinary Upload Error:', uErr);
            }
        }

        // Create User (Global Entity)
        const user = await User.create({
            name,
            email,
            password,
            phone,
            address,
            avatar: avatarUrl
        });

        // Generate GLOBAL token
        const token = generateToken(user._id);

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: user.toSafeObject()
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
        const user = await User.findOne({ email }).select('+password');

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

        // Fetch User Contexts (Restaurants & Roles)
        const userRoles = await UserRestaurantRole.find({ user: user._id, active: true })
            .populate('restaurant')
            .populate('role');

        const accessibleRestaurants = userRoles.map(ur => ({
            id: ur.restaurant._id,
            name: ur.restaurant.name,
            role: ur.role.name,
            isDefault: ur.isDefault,
            logo: ur.restaurant.logo
        }));

        // Generate GLOBAL token (no restaurantId)
        const token = generateToken(user._id);

        res.json({
            message: 'Login successful',
            token, // Global token
            user: {
                ...user.toSafeObject(),
                restaurants: accessibleRestaurants
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

        if (!restaurantId) {
            return res.status(400).json({ error: 'Restaurant ID required' });
        }

        // Verify access via UserRestaurantRole
        const userRole = await UserRestaurantRole.findOne({
            user: req.user._id,
            restaurant: restaurantId,
            active: true
        }).populate('role');

        if (!userRole) {
            // Check if user is system admin as fallback (optional, but good for superadmins)
            // For now, strict check:
            return res.status(403).json({ error: 'You do not have access to this restaurant' });
        }

        const restaurant = await Restaurant.findById(restaurantId).populate('subscription');

        if (!restaurant) {
            return res.status(404).json({ error: 'Restaurant not found' });
        }

        // Generate SCOPE token (WITH restaurantId and roleId)
        // We might want to pass role Id or Name in the token payload for easier frontend checks
        const scopedToken = generateToken(req.user._id, restaurantId);

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
            role: userRole.role.name, // Send the specific role for this context
            subscription: subscriptionStatus
        });

    } catch (error) {
        console.error('Select restaurant error:', error);
        res.status(500).json({ error: 'Failed to switch context' });
    }
});

// Get current user profile (with role if restaurant context exists)
router.get('/me', authenticateToken, async (req, res) => {
    try {
        // req.user already has role populated by authenticateToken middleware if scoped token
        // Fetch user contexts
        const userRoles = await UserRestaurantRole.find({ user: req.user._id, active: true })
            .populate('restaurant')
            .populate('role');

        const accessibleRestaurants = userRoles.map(ur => ({
            id: ur.restaurant._id,
            name: ur.restaurant.name,
            role: ur.role.name,
            isDefault: ur.isDefault,
            logo: ur.restaurant.logo
        }));

        res.json({
            user: {
                ...req.user.toSafeObject(),
                role: req.user.role, // Will be populated if using scoped token
                restaurant: req.user.restaurant, // Will be present if using scoped token
                restaurants: accessibleRestaurants
            }
        });
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ error: 'Failed to fetch user profile' });
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

// Get current user info
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get user's restaurant associations
        const userRestaurantRoles = await UserRestaurantRole.find({ user: user._id })
            .populate('restaurant')
            .populate('role');

        // Format restaurants array
        const restaurants = userRestaurantRoles.map(urr => ({
            _id: urr.restaurant._id,
            name: urr.restaurant.name,
            role: urr.role.name
        }));

        // If restaurantId is in the token, get full restaurant details + role
        let responseUser = {
            ...user.toObject(),
            restaurants
        };

        console.log('🔍 /auth/me - req.restaurantId:', req.restaurantId);
        console.log('🔍 /auth/me - req.user.restaurant:', req.user.restaurant);

        if (req.restaurantId) {
            console.log('✅ restaurantId found in request, fetching restaurant...');
            const currentRestaurant = await Restaurant.findById(req.restaurantId).populate('subscription');
            const currentUserRole = await UserRestaurantRole.findOne({
                user: req.user._id,
                restaurant: req.restaurantId,
                active: true
            }).populate('role');

            console.log('📊 currentRestaurant:', currentRestaurant ? currentRestaurant.name : 'null');
            console.log('📊 currentUserRole:', currentUserRole ? currentUserRole.role.name : 'null');

            if (currentRestaurant && currentUserRole) {
                responseUser.restaurant = currentRestaurant;
                responseUser.role = currentUserRole.role;
                responseUser.subscription = currentRestaurant.subscription;
                console.log('✅ Restaurant data added to response');
            } else {
                console.log('⚠️  Missing currentRestaurant or currentUserRole');
            }
        } else {
            console.log('⚠️  No restaurantId in request - user.restaurant will be just the ID');
        }

        res.json({
            user: responseUser
        });
    } catch (error) {
        console.error('Get user info error:', error);
        res.status(500).json({ error: 'Failed to get user info' });
    }
});

export default router;
