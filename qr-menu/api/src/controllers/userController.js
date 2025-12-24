import User from '../models/User.js';
import Role from '../models/Role.js';
import UserRestaurantRole from '../models/UserRestaurantRole.js';

// Get all users for the restaurant
export const getUsers = async (req, res) => {
    try {
        if (!req.user.restaurant) {
            return res.status(400).json({ error: 'Restaurant context required' });
        }

        // Find roles for this restaurant
        const userRoles = await UserRestaurantRole.find({ restaurant: req.user.restaurant })
            .populate('user', '-password') // Exclude password
            .populate('role', 'name');

        // Transform to flat structure for frontend compatibility
        const users = userRoles.map(ur => ({
            ...ur.user.toObject(),
            role: ur.role, // Populate replaced ID with Object
            // We might want to include the membership status/id
            membershipId: ur._id,
            active: ur.active // Use the role active status, or user active status? Usually membership active.
        }));

        res.json({ users });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

// Create a new user (Invite/Add Staff)
export const createUser = async (req, res) => {
    try {
        const { name, email, phone, roleId, password } = req.body;
        const restaurantId = req.user.restaurant;

        if (!restaurantId) {
            return res.status(400).json({ error: 'Restaurant context required' });
        }

        // Verify role exists
        const role = await Role.findById(roleId);
        if (!role) {
            return res.status(400).json({ error: 'Invalid role selected' });
        }

        // 1. Check if user exists globally
        let user = await User.findOne({ email });
        let isNewUser = false;

        if (user) {
            // User exists, check if already in this restaurant
            const existingRole = await UserRestaurantRole.findOne({
                user: user._id,
                restaurant: restaurantId
            });

            if (existingRole) {
                return res.status(400).json({ error: 'User already added to this restaurant' });
            }
        } else {
            // Create new Global User
            isNewUser = true;
            user = await User.create({
                name,
                email,
                phone,
                password, // Will be hashed (or generate temp one if not provided?) requires password in schema
                isDefaultPassword: true
            });
        }

        // 2. Link User to Restaurant
        await UserRestaurantRole.create({
            user: user._id,
            restaurant: restaurantId,
            role: roleId,
            active: true
        });

        res.status(201).json({
            message: isNewUser ? 'User created and added successfully' : 'Existing user added to restaurant',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: role.name
            }
        });

    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
};

// Update user (Updates local membership usually)
export const updateUser = async (req, res) => {
    try {
        const { id } = req.params; // This is USER ID (not membership ID, usually frontend sends user ID)
        const { name, email, phone, roleId, active } = req.body;
        const restaurantId = req.user.restaurant;

        // Find the Link
        const userRole = await UserRestaurantRole.findOne({ user: id, restaurant: restaurantId });

        if (!userRole) {
            return res.status(404).json({ error: 'User not found in this restaurant' });
        }

        // Update Role if provided
        if (roleId) {
            const role = await Role.findById(roleId);
            if (!role) return res.status(400).json({ error: 'Invalid role' });
            userRole.role = roleId;
        }

        // Update Active Status (Membership level)
        if (active !== undefined) {
            userRole.active = active;
        }

        await userRole.save();

        // Optionally update global user details (if allowed)
        // BE CAREFUL: Changing specific user details might affect them globally.
        // For now, let's allow updating global profile if it's Name/Phone.
        // Or restricted to specific roles. 
        if (name || phone || email) {
            const user = await User.findById(id);
            if (name) user.name = name;
            if (phone) user.phone = phone;
            // Email change is sensitive, maybe block or require verification
            if (email) user.email = email;
            await user.save();
        }

        res.json({ message: 'User updated successfully' });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
};

// Delete user (Unlink from restaurant)
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params; // User ID
        const restaurantId = req.user.restaurant;

        // Prevent deleting yourself from current context logic (optional but good safety)
        if (id === req.user._id.toString()) {
            return res.status(400).json({ error: 'Cannot remove yourself' });
        }

        // Delete the membership link
        const result = await UserRestaurantRole.findOneAndDelete({ user: id, restaurant: restaurantId });

        if (!result) {
            return res.status(404).json({ error: 'User not found in this restaurant' });
        }

        res.json({ message: 'User removed from restaurant successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
};

// Admin reset password to default
export const resetPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const DEFAULT_PASSWORD = 'Password123';

        // Check if user belongs to this restaurant context
        const userRole = await UserRestaurantRole.findOne({ user: id, restaurant: req.user.restaurant });
        if (!userRole) {
            return res.status(404).json({ error: 'User not found in this restaurant' });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.password = DEFAULT_PASSWORD;
        user.isDefaultPassword = true;
        await user.save();

        res.json({ message: `Password reset to default (${DEFAULT_PASSWORD})` });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
};
