import User from '../models/User.js';
import Role from '../models/Role.js';

// Get all users for the restaurant
export const getUsers = async (req, res) => {
    try {
        const users = await User.find({ restaurant: req.user.restaurant })
            .populate('role', 'name')
            .select('-password'); // Exclude password

        res.json({ users });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

// Create a new user (Admin function)
export const createUser = async (req, res) => {
    try {
        const { name, email, phone, roleId, password } = req.body;

        // Verify role exists
        const role = await Role.findById(roleId);
        if (!role) {
            return res.status(400).json({ error: 'Invalid role selected' });
        }

        // Check availability
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const newUser = await User.create({
            name,
            email,
            phone,
            password, // Will be hashed by pre-save
            role: roleId,
            restaurant: req.user.restaurant,
            isDefaultPassword: true // Admin created users start with default/temp password usually
        });

        res.status(201).json({
            message: 'User created successfully',
            user: {
                _id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: role.name
            }
        });

    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
};

// Update user
export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone, roleId, active } = req.body;

        const user = await User.findOne({ _id: id, restaurant: req.user.restaurant });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (roleId) {
            const role = await Role.findById(roleId);
            if (!role) return res.status(400).json({ error: 'Invalid role' });
            user.role = roleId;
        }

        if (name) user.name = name;
        if (phone) user.phone = phone;
        if (active !== undefined) user.active = active;
        // Email update might require more checks/verification, allowing for now
        if (email) user.email = email;

        await user.save();

        res.json({ message: 'User updated successfully', user });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
};

// Delete user
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Prevent deleting self
        if (id === req.user._id.toString()) {
            return res.status(400).json({ error: 'Cannot delete yourself' });
        }

        const user = await User.findOneAndDelete({ _id: id, restaurant: req.user.restaurant });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'User deleted successfully' });
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

        const user = await User.findOne({ _id: id, restaurant: req.user.restaurant });
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
