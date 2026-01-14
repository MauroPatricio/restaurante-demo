import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { authorizeRoles, requirePermission, PERMISSIONS } from '../middleware/permissions.js';
import { getUsers, createUser, updateUser, deleteUser, resetPassword } from '../controllers/userController.js';
import User from '../models/User.js';
import UserRestaurantRole from '../models/UserRestaurantRole.js';
import Role from '../models/Role.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

router.use(authenticateToken);

// Get all users (system-wide) - Admin only
router.get('/', requirePermission(PERMISSIONS.MANAGE_USERS), getUsers);

// Get users by restaurant
router.get('/restaurant/:restaurantId', authorizeRoles('Owner', 'Manager'), async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const { role: roleName, active } = req.query;

        // Find all UserRestaurantRole entries for this restaurant
        let query = { restaurant: restaurantId };

        // Filter by role if specified
        if (roleName) {
            const role = await Role.findOne({ name: roleName });
            if (role) {
                query.role = role._id;
            }
        }

        const userRestaurantRoles = await UserRestaurantRole.find(query)
            .populate('user')
            .populate('role');

        // Extract users and filter by active status if specified
        let users = userRestaurantRoles
            .map(urr => ({
                _id: urr.user._id,
                name: urr.user.name,
                email: urr.user.email,
                phone: urr.user.phone,
                active: urr.user.active,
                role: {
                    _id: urr.role._id,
                    name: urr.role.name
                }
            }))
            .filter(user => user._id); // Filter out null users

        // Filter by active status
        if (active !== undefined) {
            const isActive = active === 'true';
            users = users.filter(user => user.active === isActive);
        }

        res.json({ users });
    } catch (error) {
        console.error('Error fetching restaurant users:', error);
        res.status(500).json({ error: 'Failed to fetch users', details: error.message });
    }
});

// Create user for restaurant
router.post('/restaurant/:restaurantId', authorizeRoles('Owner', 'Manager'), async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const { name, email, password, roleId, phone } = req.body;

        // Validate required fields
        if (!name || !email || !password || !roleId) {
            return res.status(400).json({ error: 'Name, email, password and roleId are required' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }

        // Validate role
        const role = await Role.findById(roleId);
        if (!role) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user (User model doesn't have role field - it's in UserRestaurantRole)
        const user = await User.create({
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
            phone: phone || '', // Provide default if not sent
            active: true,
            isDefaultPassword: true
        });

        // Create UserRestaurantRole
        await UserRestaurantRole.create({
            user: user._id,
            restaurant: restaurantId,
            role: roleId,
            active: true, // Explicitly set active
            isDefault: true
        });

        res.status(201).json({
            message: 'User created successfully',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: {
                    _id: role._id,
                    name: role.name
                }
            }
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Failed to create user', details: error.message });
    }
});

// Toggle user active status
router.patch('/:id/toggle-active', authorizeRoles('Owner', 'Manager'), async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.active = !user.active;
        await user.save();

        res.json({
            message: `User ${user.active ? 'activated' : 'deactivated'} successfully`,
            active: user.active
        });
    } catch (error) {
        console.error('Error toggling user status:', error);
        res.status(500).json({ error: 'Failed to toggle user status', details: error.message });
    }
});

// Get specific role for a user in a restaurant context
router.get('/:userId/restaurants/:restaurantId/role', async (req, res) => {
    try {
        const { userId, restaurantId } = req.params;

        // Ensure user is fetching their own role or is authorized
        if (req.user._id.toString() !== userId && !['Admin', 'Owner', 'Manager'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const userRole = await UserRestaurantRole.findOne({
            user: userId,
            restaurant: restaurantId,
            active: true
        }).populate('role');

        if (!userRole) {
            return res.status(404).json({ error: 'Role not found for this user and restaurant' });
        }

        res.json({
            role: userRole.role
        });
    } catch (error) {
        console.error('Error fetching user-restaurant role:', error);
        res.status(500).json({ error: 'Failed to fetch role', details: error.message });
    }
});

// Existing routes
router.post('/', requirePermission(PERMISSIONS.MANAGE_USERS), createUser);
router.patch('/:id', requirePermission(PERMISSIONS.MANAGE_USERS), updateUser);
router.delete('/:id', requirePermission(PERMISSIONS.MANAGE_USERS), deleteUser);
router.post('/:id/reset-password', authorizeRoles('Owner', 'Manager'), resetPassword);

export default router;
