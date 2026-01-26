import WeeklyMenu from '../models/WeeklyMenu.js';
import mongoose from 'mongoose';

/**
 * Get all weekly menus for a restaurant (Admin)
 * GET /api/weekly-menus/:restaurantId
 */
export const getAllWeeklyMenus = async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const { status, limit = 50 } = req.query;

        const query = { restaurant: restaurantId };
        if (status) {
            query.status = status;
        }

        const menus = await WeeklyMenu.find(query)
            .populate('items.menuItem', 'name price imageUrl category')
            .populate('createdBy', 'name')
            .populate('activatedBy', 'name')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        // Update expired status for menus
        const now = new Date();
        const updatePromises = menus.map(menu => {
            if (menu.status === 'active' && menu.endDate < now) {
                menu.status = 'expired';
                return menu.save();
            }
            return Promise.resolve();
        });
        await Promise.all(updatePromises);

        res.json({
            menus,
            count: menus.length
        });
    } catch (error) {
        console.error('Get weekly menus error:', error);
        res.status(500).json({ error: 'Failed to fetch weekly menus' });
    }
};

/**
 * Get currently active weekly menu (Public)
 * GET /api/weekly-menus/:restaurantId/active
 */
export const getActiveWeeklyMenu = async (req, res) => {
    try {
        const { restaurantId } = req.params;

        const activeMenu = await WeeklyMenu.getActiveMenu(restaurantId);

        if (!activeMenu) {
            return res.json({ menu: null, message: 'No active weekly menu' });
        }

        res.json({ menu: activeMenu });
    } catch (error) {
        console.error('Get active weekly menu error:', error);
        res.status(500).json({ error: 'Failed to fetch active weekly menu' });
    }
};

/**
 * Create new weekly menu
 * POST /api/weekly-menus
 */
export const createWeeklyMenu = async (req, res) => {
    try {
        const { restaurant, name, description, startDate, endDate, items } = req.body;

        if (!restaurant || !name || !startDate || !endDate) {
            return res.status(400).json({
                error: 'Missing required fields: restaurant, name, startDate, endDate'
            });
        }

        // Validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (start >= end) {
            return res.status(400).json({ error: 'End date must be after start date' });
        }

        const newMenu = await WeeklyMenu.create({
            restaurant,
            name,
            description,
            startDate: start,
            endDate: end,
            items: items || [],
            createdBy: req.user._id,
            status: 'draft'
        });

        await newMenu.populate('items.menuItem', 'name price imageUrl');

        res.status(201).json({
            message: 'Weekly menu created successfully',
            menu: newMenu
        });
    } catch (error) {
        console.error('Create weekly menu error:', error);
        res.status(500).json({ error: 'Failed to create weekly menu' });
    }
};

/**
 * Update weekly menu
 * PATCH /api/weekly-menus/:id
 */
export const updateWeeklyMenu = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, startDate, endDate, items } = req.body;

        const menu = await WeeklyMenu.findById(id);
        if (!menu) {
            return res.status(404).json({ error: 'Weekly menu not found' });
        }

        // Don't allow editing active menus (must deactivate first)
        if (menu.status === 'active') {
            return res.status(400).json({
                error: 'Cannot edit active menu. Deactivate it first.'
            });
        }

        // Update fields
        if (name) menu.name = name;
        if (description !== undefined) menu.description = description;
        if (startDate) menu.startDate = new Date(startDate);
        if (endDate) menu.endDate = new Date(endDate);
        if (items) menu.items = items;

        // Validate dates if changed
        if (menu.startDate >= menu.endDate) {
            return res.status(400).json({ error: 'End date must be after start date' });
        }

        await menu.save();
        await menu.populate('items.menuItem', 'name price imageUrl');

        res.json({
            message: 'Weekly menu updated successfully',
            menu
        });
    } catch (error) {
        console.error('Update weekly menu error:', error);
        res.status(500).json({ error: 'Failed to update weekly menu' });
    }
};

/**
 * Activate weekly menu
 * POST /api/weekly-menus/:id/activate
 */
export const activateWeeklyMenu = async (req, res) => {
    try {
        const { id } = req.params;

        const menu = await WeeklyMenu.findById(id);
        if (!menu) {
            return res.status(404).json({ error: 'Weekly menu not found' });
        }

        if (menu.status === 'active') {
            return res.json({ message: 'Menu is already active', menu });
        }

        if (menu.status === 'archived') {
            return res.status(400).json({ error: 'Cannot activate archived menu' });
        }

        // Check date validity
        const now = new Date();
        if (now > menu.endDate) {
            return res.status(400).json({ error: 'Menu has expired. Update dates first.' });
        }

        // Deactivate other active menus for this restaurant
        await WeeklyMenu.deactivateOthers(menu.restaurant, menu._id);

        // Activate this menu
        menu.status = 'active';
        menu.activatedAt = now;
        menu.activatedBy = req.user._id;
        await menu.save();

        // Emit Socket.IO event
        const io = req.app.get('io');
        if (io) {
            io.to(`restaurant:${menu.restaurant}`).emit('weekly-menu:activated', {
                menuId: menu._id,
                menuName: menu.name,
                startDate: menu.startDate,
                endDate: menu.endDate
            });
        }

        res.json({
            message: 'Weekly menu activated successfully',
            menu
        });
    } catch (error) {
        console.error('Activate weekly menu error:', error);
        res.status(500).json({ error: 'Failed to activate weekly menu' });
    }
};

/**
 * Deactivate weekly menu
 * POST /api/weekly-menus/:id/deactivate
 */
export const deactivateWeeklyMenu = async (req, res) => {
    try {
        const { id } = req.params;

        const menu = await WeeklyMenu.findById(id);
        if (!menu) {
            return res.status(404).json({ error: 'Weekly menu not found' });
        }

        if (menu.status !== 'active') {
            return res.json({ message: 'Menu is not active', menu });
        }

        menu.status = 'draft';
        await menu.save();

        // Emit Socket.IO event
        const io = req.app.get('io');
        if (io) {
            io.to(`restaurant:${menu.restaurant}`).emit('weekly-menu:deactivated', {
                menuId: menu._id
            });
        }

        res.json({
            message: 'Weekly menu deactivated successfully',
            menu
        });
    } catch (error) {
        console.error('Deactivate weekly menu error:', error);
        res.status(500).json({ error: 'Failed to deactivate weekly menu' });
    }
};

/**
 * Archive (soft delete) weekly menu
 * DELETE /api/weekly-menus/:id
 */
export const archiveWeeklyMenu = async (req, res) => {
    try {
        const { id } = req.params;

        const menu = await WeeklyMenu.findById(id);
        if (!menu) {
            return res.status(404).json({ error: 'Weekly menu not found' });
        }

        // Deactivate if active
        if (menu.status === 'active') {
            const io = req.app.get('io');
            if (io) {
                io.to(`restaurant:${menu.restaurant}`).emit('weekly-menu:deactivated', {
                    menuId: menu._id
                });
            }
        }

        menu.status = 'archived';
        menu.archivedAt = new Date();
        menu.archivedBy = req.user._id;
        await menu.save();

        res.json({ message: 'Weekly menu archived successfully' });
    } catch (error) {
        console.error('Archive weekly menu error:', error);
        res.status(500).json({ error: 'Failed to archive weekly menu' });
    }
};
