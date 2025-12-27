import express from 'express';
import Category from '../models/Category.js';
import Subcategory from '../models/Subcategory.js';
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
 * @route   POST /api/categories
 * @desc    Create a new category
 * @access  Private (Owner, Manager)
 */
router.post('/', authenticateToken, authorizeRoles(['owner', 'manager']), async (req, res) => {
    try {
        const { name, description, displayOrder } = req.body;
        const restaurantId = req.user.restaurant?._id || req.user.restaurant;

        if (!restaurantId) {
            return res.status(400).json({ message: 'Restaurant not found for user' });
        }

        // Check if category with same name already exists for this restaurant
        const existingCategory = await Category.findOne({
            restaurant: restaurantId,
            name: name.trim(),
            isActive: true
        });

        if (existingCategory) {
            return res.status(400).json({ message: 'Category with this name already exists' });
        }

        const category = new Category({
            name: name.trim(),
            description: description?.trim(),
            restaurant: restaurantId,
            displayOrder: displayOrder || 0
        });

        await category.save();

        res.status(201).json({
            message: 'Category created successfully',
            category
        });
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ message: 'Failed to create category', error: error.message });
    }
});

/**
 * @route   GET /api/categories/:restaurantId
 * @desc    Get all categories for a restaurant
 * @access  Public (for menu display) / Private (for admin)
 */
router.get('/:restaurantId', async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const { includeInactive } = req.query;

        const filter = { restaurant: restaurantId };

        // Only show active categories unless explicitly requested
        if (includeInactive !== 'true') {
            filter.isActive = true;
        }

        const categories = await Category.find(filter)
            .sort({ displayOrder: 1, name: 1 })
            .populate('subcategoriesCount')
            .populate('itemsCount');

        res.json({
            categories,
            total: categories.length
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ message: 'Failed to fetch categories', error: error.message });
    }
});

/**
 * @route   GET /api/categories/detail/:id
 * @desc    Get a specific category by ID
 * @access  Public
 */
router.get('/detail/:id', async (req, res) => {
    try {
        const category = await Category.findById(req.params.id)
            .populate('subcategoriesCount')
            .populate('itemsCount');

        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        res.json({ category });
    } catch (error) {
        console.error('Error fetching category:', error);
        res.status(500).json({ message: 'Failed to fetch category', error: error.message });
    }
});

/**
 * @route   PUT /api/categories/:id
 * @desc    Update a category
 * @access  Private (Owner, Manager)
 */
router.put('/:id', authenticateToken, authorizeRoles(['owner', 'manager']), async (req, res) => {
    try {
        const { name, description, displayOrder, isActive } = req.body;
        const restaurantId = req.user.restaurant?._id || req.user.restaurant;

        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        // Verify category belongs to user's restaurant
        if (category.restaurant.toString() !== restaurantId.toString()) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Check for duplicate name if name is being changed
        if (name && name.trim() !== category.name) {
            const existingCategory = await Category.findOne({
                restaurant: restaurantId,
                name: name.trim(),
                _id: { $ne: req.params.id },
                isActive: true
            });

            if (existingCategory) {
                return res.status(400).json({ message: 'Category with this name already exists' });
            }
        }

        // Update fields
        if (name) category.name = name.trim();
        if (description !== undefined) category.description = description?.trim();
        if (displayOrder !== undefined) category.displayOrder = displayOrder;
        if (isActive !== undefined) category.isActive = isActive;

        await category.save();

        res.json({
            message: 'Category updated successfully',
            category
        });
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ message: 'Failed to update category', error: error.message });
    }
});

/**
 * @route   DELETE /api/categories/:id
 * @desc    Soft delete a category
 * @access  Private (Owner, Manager)
 */
router.delete('/:id', authenticateToken, authorizeRoles(['owner', 'manager']), async (req, res) => {
    try {
        const restaurantId = req.user.restaurant?._id || req.user.restaurant;
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        // Verify category belongs to user's restaurant
        if (category.restaurant.toString() !== restaurantId.toString()) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Check if category has active menu items
        const itemCount = await MenuItem.countDocuments({
            category: req.params.id,
            available: true
        });

        if (itemCount > 0) {
            return res.status(400).json({
                message: `Cannot delete category with ${itemCount} active menu items. Please reassign or delete items first.`,
                itemCount
            });
        }

        // Soft delete
        category.isActive = false;
        await category.save();

        // Also soft delete subcategories
        await Subcategory.updateMany(
            { category: req.params.id },
            { isActive: false }
        );

        res.json({
            message: 'Category deleted successfully',
            category
        });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ message: 'Failed to delete category', error: error.message });
    }
});

/**
 * @route   PATCH /api/categories/reorder
 * @desc    Reorder categories
 * @access  Private (Owner, Manager)
 */
router.patch('/reorder', authenticateToken, authorizeRoles(['owner', 'manager']), async (req, res) => {
    try {
        const { categories } = req.body; // Array of { id, displayOrder }
        const restaurantId = req.user.restaurant?._id || req.user.restaurant;

        if (!Array.isArray(categories)) {
            return res.status(400).json({ message: 'Categories must be an array' });
        }

        // Update display order for each category
        const updatePromises = categories.map(({ id, displayOrder }) =>
            Category.findOneAndUpdate(
                { _id: id, restaurant: restaurantId },
                { displayOrder },
                { new: true }
            )
        );

        await Promise.all(updatePromises);

        res.json({ message: 'Categories reordered successfully' });
    } catch (error) {
        console.error('Error reordering categories:', error);
        res.status(500).json({ message: 'Failed to reorder categories', error: error.message });
    }
});

export default router;
