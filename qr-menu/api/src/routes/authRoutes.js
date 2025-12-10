import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Restaurant from '../models/Restaurant.js';
import Subscription from '../models/Subscription.js';

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
    );
};

// Register new restaurant (owner + restaurant creation)
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone, restaurantName, restaurantAddress } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Create user (password will be automatically hashed by pre-save hook)
        const user = await User.create({
            name,
            email,
            password,
            phone,
            role: 'owner'
        });

        // Create restaurant
        const restaurant = await Restaurant.create({
            name: restaurantName,
            address: restaurantAddress,
            owner: user._id,
            email: email,
            phone: phone
        });

        // Create subscription (trial period - first month free)
        const now = new Date();
        const trialEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

        const subscription = await Subscription.create({
            restaurant: restaurant._id,
            status: 'trial',
            currentPeriodStart: now,
            currentPeriodEnd: trialEnd,
            amount: 10000
        });

        // Link subscription to restaurant
        restaurant.subscription = subscription._id;
        await restaurant.save();

        // Link restaurant to user
        user.restaurant = restaurant._id;
        await user.save();

        // Generate token
        const token = generateToken(user._id);

        res.status(201).json({
            message: 'Registration successful',
            token,
            user: user.toSafeObject(),
            restaurant: {
                id: restaurant._id,
                name: restaurant.name
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
        const user = await User.findOne({ email }).select('+password').populate('restaurant');

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Check password
        const isValidPassword = await user.comparePassword(password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Check if user is active
        if (!user.active) {
            return res.status(403).json({ error: 'Account is deactivated' });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Generate token
        const token = generateToken(user._id);

        // Get subscription status if restaurant exists
        let subscriptionStatus = null;
        if (user.restaurant) {
            const restaurant = await Restaurant.findById(user.restaurant).populate('subscription');
            if (restaurant && restaurant.subscription) {
                const subscription = await Subscription.findById(restaurant.subscription);
                subscriptionStatus = {
                    status: subscription.status,
                    currentPeriodEnd: subscription.currentPeriodEnd,
                    isValid: subscription.isValid()
                };
            }
        }

        res.json({
            message: 'Login successful',
            token,
            user: user.toSafeObject(),
            subscription: subscriptionStatus
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed', details: error.message });
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

        // Generate new token
        const newToken = generateToken(decoded.userId);

        res.json({
            token: newToken
        });
    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(403).json({ error: 'Invalid token' });
    }
});

// Update FCM token for push notifications
router.post('/fcm-token', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'Access token required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const { fcmToken } = req.body;

        if (!fcmToken) {
            return res.status(400).json({ error: 'FCM token required' });
        }

        await User.findByIdAndUpdate(decoded.userId, { fcmToken });

        res.json({ message: 'FCM token updated successfully' });
    } catch (error) {
        console.error('FCM token update error:', error);
        res.status(500).json({ error: 'Failed to update FCM token' });
    }
});

// Get current user profile
router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'Access token required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const user = await User.findById(decoded.userId).populate('restaurant');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user: user.toSafeObject() });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

export default router;
