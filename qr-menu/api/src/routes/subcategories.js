import express from 'express';
import Subcategory from '../models/Subcategory.js';
import Category from '../models/Category.js';
import MenuItem from '../models/MenuItem.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Middleware to check if user is owner or manager
const authorizeRoles = (roles) => {
    return (req, res, next) => {
        const userRole = req.user.role?.name || req.user.role;
        const userRoleLower = typeof userRole === 'string' ? userRole.toLowerCase() : '';
        const rolesLower = roles.map(r => r.toLowerCase());

        if (!rolesLower.includes(userRoleLower)) {
            return res.status(403).json({ message: 'Access denied' });
        }
        next();
    };
};

/**
 * @route   POST /api/subcategories
 * @desc    Create a new subcategory
 * @access  Private (Owner, Manager)
 */
router.post('/', authenticateToken, authorizeRoles(['owner', 'manager']), async (req, res) => {
    try {
        const { name, description, categoryId, displayOrder } = req.body;
        const restaurantId = req.user.restaurant?._id || req.user.restaurant;

        if (!restaurantId) {
            return res.status(400).json({ message: 'Restaurant not found for user' });
        }

        if (!categoryId) {
            return res.status(400).json({ message: 'Category ID is required' });
        }

        // Verify category exists and belongs to restaurant
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        if (category.restaurant.toString() !== restaurantId.toString()) {
            return res.status(403).json({ message: 'Category does not belong to your restaurant' });
        }

        // Check if subcategory with same name already exists in this category
        const existingSubcategory = await Subcategory.findOne({
            category: categoryId,
            name: name.trim(),
            isActive: true
        });

        if (existingSubcategory) {
            return res.status(400).json({ message: 'Subcategory with this name already exists in this category' });
        }

        const subcategory = new Subcategory({
            name: name.trim(),
            description: description?.trim(),
            category: categoryId,
            restaurant: restaurantId,
            displayOrder: displayOrder || 0
        });

        await subcategory.save();

        // Populate category info
        await subcategory.populate('category');

        res.status(201).json({
            message: 'Subcategory created successfully',
            subcategory
        });
    } catch (error) {
        console.error('Error creating subcategory:', error);
        res.status(500).json({ message: 'Failed to create subcategory', error: error.message });
    }
});

/**
 * @route   GET /api/subcategories/category/:categoryId
 * @desc    Get all subcategories for a category
 * @access  Public
 */
router.get('/category/:categoryId', async (req, res) => {
    try {
        const { categoryId } = req.params;
        const { includeInactive } = req.query;

        const filter = { category: categoryId };

        // Only show active subcategories unless explicitly requested
        if (includeInactive !== 'true') {
            filter.isActive = true;
        }

        const subcategories = await Subcategory.find(filter)
            .sort({ displayOrder: 1, name: 1 })
            .populate('category')
            .populate('itemsCount');

        res.json({
            subcategories,
            total: subcategories.length
        });
    } catch (error) {
        console.error('Error fetching subcategories:', error);
        res.status(500).json({ message: 'Failed to fetch subcategories', error: error.message });
    }
});

/**
 * @route   GET /api/subcategories/restaurant/:restaurantId
 * @desc    Get all subcategories for a restaurant
 * @access  Public
 */
router.get('/restaurant/:restaurantId', async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const { includeInactive } = req.query;

        const filter = { restaurant: restaurantId };

        if (includeInactive !== 'true') {
            filter.isActive = true;
        }

        const subcategories = await Subcategory.find(filter)
            .sort({ displayOrder: 1, name: 1 })
            .populate('category')
            .populate('itemsCount');

        res.json({
            subcategories,
            total: subcategories.length
        });
    } catch (error) {
        console.error('Error fetching subcategories:', error);
        res.status(500).json({ message: 'Failed to fetch subcategories', error: error.message });
    }
});

/**
 * @route   GET /api/subcategories/:id
 * @desc    Get a specific subcategory by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
    try {
        const subcategory = await Subcategory.findById(req.params.id)
            .populate('category')
            .populate('itemsCount');

        if (!subcategory) {
            return res.status(404).json({ message: 'Subcategory not found' });
        }

        res.json({ subcategory });
    } catch (error) {
        console.error('Error fetching subcategory:', error);
        res.status(500).json({ message: 'Failed to fetch subcategory', error: error.message });
    }
});

/**
 * @route   PUT /api/subcategories/:id
 * @desc    Update a subcategory
 * @access  Private (Owner, Manager)
 */
router.put('/:id', authenticateToken, authorizeRoles(['owner', 'manager']), async (req, res) => {
    try {
        const { name, description, categoryId, displayOrder, isActive } = req.body;
        const restaurantId = req.user.restaurant?._id || req.user.restaurant;

        const subcategory = await Subcategory.findById(req.params.id);

        if (!subcategory) {
            return res.status(404).json({ message: 'Subcategory not found' });
        }

        // Verify subcategory belongs to user's restaurant
        if (subcategory.restaurant.toString() !== restaurantId.toString()) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // If category is being changed, verify new category
        if (categoryId && categoryId !== subcategory.category.toString()) {
            const category = await Category.findById(categoryId);
            if (!category) {
                return res.status(404).json({ message: 'Category not found' });
            }
            if (category.restaurant.toString() !== restaurantId.toString()) {
                return res.status(403).json({ message: 'Category does not belong to your restaurant' });
            }
            subcategory.category = categoryId;
        }

        // Check for duplicate name if name is being changed
        if (name && name.trim() !== subcategory.name) {
            const existingSubcategory = await Subcategory.findOne({
                category: subcategory.category,
                name: name.trim(),
                _id: { $ne: req.params.id },
                isActive: true
            });

            if (existingSubcategory) {
                return res.status(400).json({ message: 'Subcategory with this name already exists in this category' });
            }
        }

        // Update fields
        if (name) subcategory.name = name.trim();
        if (description !== undefined) subcategory.description = description?.trim();
        if (displayOrder !== undefined) subcategory.displayOrder = displayOrder;
        if (isActive !== undefined) subcategory.isActive = isActive;

        await subcategory.save();
        await subcategory.populate('category');

        res.json({
            message: 'Subcategory updated successfully',
            subcategory
        });
    } catch (error) {
        console.error('Error updating subcategory:', error);
        res.status(500).json({ message: 'Failed to update subcategory', error: error.message });
    }
});

/**
 * @route   DELETE /api/subcategories/:id
 * @desc    Soft delete a subcategory
 * @access  Private (Owner, Manager)
 */
router.delete('/:id', authenticateToken, authorizeRoles(['owner', 'manager']), async (req, res) => {
    try {
        const restaurantId = req.user.restaurant?._id || req.user.restaurant;
        const subcategory = await Subcategory.findById(req.params.id);

        if (!subcategory) {
            return res.status(404).json({ message: 'Subcategory not found' });
        }

        // Verify subcategory belongs to user's restaurant
        if (subcategory.restaurant.toString() !== restaurantId.toString()) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Check if subcategory has active menu items
        const itemCount = await MenuItem.countDocuments({
            subcategory: req.params.id,
            available: true
        });

        if (itemCount > 0) {
            return res.status(400).json({
                message: `Cannot delete subcategory with ${itemCount} active menu items. Please reassign or delete items first.`,
                itemCount
            });
        }

        // Soft delete
        subcategory.isActive = false;
        await subcategory.save();

        res.json({
            message: 'Subcategory deleted successfully',
            subcategory
        });
    } catch (error) {
        console.error('Error deleting subcategory:', error);
        res.status(500).json({ message: 'Failed to delete subcategory', error: error.message });
    }
});

/**
 * @route   PATCH /api/subcategories/reorder
 * @desc    Reorder subcategories
 * @access  Private (Owner, Manager)
 */
router.patch('/reorder', authenticateToken, authorizeRoles(['owner', 'manager']), async (req, res) => {
    try {
        const { subcategories } = req.body; // Array of { id, displayOrder }
        const restaurantId = req.user.restaurant?._id || req.user.restaurant;

        if (!Array.isArray(subcategories)) {
            return res.status(400).json({ message: 'Subcategories must be an array' });
        }

        // Update display order for each subcategory
        const updatePromises = subcategories.map(({ id, displayOrder }) =>
            Subcategory.findOneAndUpdate(
                { _id: id, restaurant: restaurantId },
                { displayOrder },
                { new: true }
            )
        );

        await Promise.all(updatePromises);

        res.json({ message: 'Subcategories reordered successfully' });
    } catch (error) {
        console.error('Error reordering subcategories:', error);
        res.status(500).json({ message: 'Failed to reorder subcategories', error: error.message });
    }
});

export default router;
