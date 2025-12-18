import Role from '../models/Role.js';
import User from '../models/User.js';

// Create a new role
export const createRole = async (req, res) => {
    try {
        const { name, description, permissions } = req.body;

        // Check if role already exists
        const existingRole = await Role.findOne({ name, restaurant: req.user.restaurant });
        if (existingRole) {
            return res.status(400).json({ error: 'Role with this name already exists' });
        }

        const role = await Role.create({
            name,
            description,
            permissions,
            restaurant: req.user.restaurant
        });

        res.status(201).json({
            message: 'Role created successfully',
            role
        });
    } catch (error) {
        console.error('Create role error:', error);
        res.status(500).json({ error: 'Failed to create role' });
    }
};

// Get all roles with user usage count
export const getRoles = async (req, res) => {
    try {
        // Get roles first
        const roles = await Role.find({
            $or: [
                { restaurant: req.user.restaurant },
                { isSystem: true }
            ]
        }).sort({ name: 1 }).lean();

        // Count users for each role
        // This could be optimized with aggregation but this is simple and robust
        const rolesWithCounts = await Promise.all(roles.map(async (role) => {
            const userCount = await User.countDocuments({ role: role._id });
            return {
                ...role,
                userCount
            };
        }));

        res.json({ roles: rolesWithCounts });
    } catch (error) {
        console.error('Get roles error:', error);
        res.status(500).json({ error: 'Failed to fetch roles' });
    }
};

// Update a role
export const updateRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, permissions } = req.body;

        const role = await Role.findOne({ _id: id, restaurant: req.user.restaurant });

        if (!role) {
            return res.status(404).json({ error: 'Role not found or cannot be edited' });
        }

        if (role.isSystem) {
            return res.status(403).json({ error: 'System roles cannot be modified' });
        }

        role.name = name || role.name;
        role.description = description || role.description;
        role.permissions = permissions || role.permissions;

        await role.save();

        res.json({
            message: 'Role updated successfully',
            role
        });
    } catch (error) {
        console.error('Update role error:', error);
        res.status(500).json({ error: 'Failed to update role' });
    }
};

// Delete a role
export const deleteRole = async (req, res) => {
    try {
        const { id } = req.params;

        const role = await Role.findOne({ _id: id, restaurant: req.user.restaurant });

        if (!role) {
            return res.status(404).json({ error: 'Role not found' });
        }

        if (role.isSystem) {
            return res.status(403).json({ error: 'System roles cannot be deleted' });
        }

        // Check if any users are using this role
        const usersWithRole = await User.countDocuments({ role: id });
        if (usersWithRole > 0) {
            return res.status(400).json({ error: 'Cannot delete role assigned to users' });
        }

        await role.deleteOne();

        res.json({ message: 'Role deleted successfully' });
    } catch (error) {
        console.error('Delete role error:', error);
        res.status(500).json({ error: 'Failed to delete role' });
    }
};
