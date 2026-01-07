import express from 'express';
import MenuItem from '../models/MenuItem.js';
import Category from '../models/Category.js';
import Subcategory from '../models/Subcategory.js';
import { authenticateToken } from '../middleware/auth.js';
import { upload, uploadImage, deleteImage } from '../services/uploadService.js';
import cache from '../services/cacheService.js';

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
 * @route   POST /api/menu-items/upload-image
 * @desc    Upload menu item image
 * @access  Private (Owner, Manager)
 */
router.post('/upload-image', authenticateToken, authorizeRoles(['owner', 'manager']), upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No image file provided' });
        }

        const imageData = await uploadImage(req.file);

        res.json({
            message: 'Image uploaded successfully',
            imageUrl: imageData.url,
            imagePublicId: imageData.publicId
        });
    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({ message: 'Failed to upload image', error: error.message });
    }
});

/**
 * @route   POST /api/menu-items
 * @desc    Create a new menu item
 * @access  Private (Owner, Manager)
 */
/**
 * @route   POST /api/menu-items
 * @desc    Create a new menu item
 * @access  Private (Owner, Manager)
 */
router.post('/', authenticateToken, authorizeRoles(['owner', 'manager']), upload.single('image'), async (req, res) => {
    try {
        console.log('DEBUG: Creating Menu Item');
        console.log('DEBUG: req.file:', req.file);
        console.log('DEBUG: req.body:', req.body);

        const {
            name,
            description,
            category,
            subcategory,
            price,
            // imageUrl, // Handled via req.file or req.body
            // imagePublicId,
            sku,
            ingredients,
            allergens,
            prepTime,
            featured,
            tags,
            portionSize,
            costPrice,
            stockControlled,
            stock,
            customizationOptions,
            nutritionalInfo
        } = req.body;

        const restaurantId = req.user.restaurant?._id || req.user.restaurant;

        if (!restaurantId) {
            return res.status(400).json({ message: 'Restaurant not found for user' });
        }

        // Verify category exists and belongs to restaurant
        const categoryDoc = await Category.findById(category);
        if (!categoryDoc) {
            return res.status(404).json({ message: 'Category not found' });
        }
        if (categoryDoc.restaurant.toString() !== restaurantId.toString()) {
            return res.status(403).json({ message: 'Category does not belong to your restaurant' });
        }

        // Verify subcategory if provided
        if (subcategory) {
            const subcategoryDoc = await Subcategory.findById(subcategory);
            if (!subcategoryDoc) {
                return res.status(404).json({ message: 'Subcategory not found' });
            }
            if (subcategoryDoc.category.toString() !== category.toString()) {
                return res.status(400).json({ message: 'Subcategory does not belong to the selected category' });
            }
            if (subcategoryDoc.restaurant.toString() !== restaurantId.toString()) {
                return res.status(403).json({ message: 'Subcategory does not belong to your restaurant' });
            }
        }

        let finalImageUrl = req.body.imageUrl || '';
        let finalImagePublicId = req.body.imagePublicId || '';

        // Handle Image Upload if file present
        if (req.file) {
            try {
                const imageData = await uploadImage(req.file);
                finalImageUrl = imageData.url;
                finalImagePublicId = imageData.publicId;
            } catch (uErr) {
                console.error('Image upload failed during creation:', uErr);
                // Proceed without image or return error? Let's return error to be safe
                return res.status(500).json({ message: 'Failed to upload image', error: uErr.message });
            }
        }

        const menuItem = new MenuItem({
            restaurant: restaurantId,
            name,
            description,
            category,
            subcategory: subcategory || null,
            price,
            imageUrl: finalImageUrl,
            imagePublicId: finalImagePublicId,
            sku,
            ingredients,
            allergens,
            prepTime,
            featured,
            tags,
            portionSize,
            costPrice,
            stockControlled,
            stock,
            customizationOptions,
            nutritionalInfo,
            createdBy: req.user._id
        });

        await menuItem.save();

        // Populate category and subcategory
        await menuItem.populate('category subcategory');

        console.log('--------------------------------------------------');
        console.log('✅ NEW PRODUCT IMAGE URL SAVED:', menuItem.imageUrl);
        console.log('--------------------------------------------------');

        // Clear menu cache for this restaurant
        const cachePattern = `menu:${restaurantId}*`;
        cache.deletePattern(cachePattern);
        console.log(`🧹 Cache cleared (Broad) for restaurant: ${restaurantId}`);

        res.status(201).json({
            message: 'Menu item created successfully',
            menuItem
        });
    } catch (error) {
        console.error('❌ Error creating menu item:', error);

        // Handle Duplicate Key Errors (e.g., SKU)
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern || {})[0] || 'field';
            const value = error.keyValue ? error.keyValue[field] : '';
            return res.status(400).json({
                message: `Duplicate value for ${field}: ${value}. Please use a unique value.`,
                error: 'DuplicateKeyError'
            });
        }

        res.status(500).json({ message: 'Failed to create menu item', error: error.message });
    }
});

/**
 * @route   GET /api/menu-items/restaurant/:restaurantId
 * @desc    Get all menu items for a restaurant
 * @access  Public
 */
router.get('/restaurant/:restaurantId', async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const { category, subcategory, available } = req.query;

        const filter = { restaurant: restaurantId };

        if (category) filter.category = category;
        if (subcategory) filter.subcategory = subcategory;
        if (available !== undefined) filter.available = available === 'true';

        const menuItems = await MenuItem.find(filter)
            .populate('category')
            .populate('subcategory')
            .sort({ category: 1, name: 1 });

        res.json({
            menuItems,
            total: menuItems.length
        });
    } catch (error) {
        console.error('Error fetching menu items:', error);
        res.status(500).json({ message: 'Failed to fetch menu items', error: error.message });
    }
});

/**
 * @route   GET /api/menu-items/:id
 * @desc    Get a specific menu item
 * @access  Public
 */
router.get('/:id', async (req, res) => {
    try {
        const menuItem = await MenuItem.findById(req.params.id)
            .populate('category')
            .populate('subcategory');

        if (!menuItem) {
            return res.status(404).json({ message: 'Menu item not found' });
        }

        res.json({ menuItem });
    } catch (error) {
        console.error('Error fetching menu item:', error);
        res.status(500).json({ message: 'Failed to fetch menu item', error: error.message });
    }
});

/**
 * @route   PATCH /api/menu-items/:id
 * @desc    Update a menu item
 * @access  Private (Owner, Manager)
 */
router.patch('/:id', authenticateToken, authorizeRoles(['owner', 'manager']), upload.single('image'), async (req, res) => {
    try {
        console.log(`DEBUG: Updating Menu Item ${req.params.id}`);
        console.log('DEBUG: req.file:', req.file);
        console.log('DEBUG: req.body:', req.body);

        const restaurantId = req.user.restaurant?._id || req.user.restaurant;
        const menuItem = await MenuItem.findById(req.params.id);

        if (!menuItem) {
            return res.status(404).json({ message: 'Menu item not found' });
        }

        // Verify menu item belongs to user's restaurant
        if (menuItem.restaurant.toString() !== restaurantId.toString()) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const {
            name,
            description,
            category,
            subcategory,
            price,
            // imageUrl,
            // imagePublicId,
            available,
            sku,
            ingredients,
            allergens,
            prepTime,
            featured,
            tags,
            portionSize,
            costPrice,
            stockControlled,
            stock,
            customizationOptions,
            nutritionalInfo
        } = req.body;

        // Verify category if being changed
        if (category && category !== menuItem.category.toString()) {
            const categoryDoc = await Category.findById(category);
            if (!categoryDoc) {
                return res.status(404).json({ message: 'Category not found' });
            }
            if (categoryDoc.restaurant.toString() !== restaurantId.toString()) {
                return res.status(403).json({ message: 'Category does not belong to your restaurant' });
            }
        }

        // Verify subcategory if being changed
        if (subcategory && subcategory !== menuItem.subcategory?.toString()) {
            const subcategoryDoc = await Subcategory.findById(subcategory);
            if (!subcategoryDoc) {
                return res.status(404).json({ message: 'Subcategory not found' });
            }
            if (subcategoryDoc.category.toString() !== (category || menuItem.category).toString()) {
                return res.status(400).json({ message: 'Subcategory does not belong to the selected category' });
            }
        }

        let newImageUrl = req.body.imageUrl;
        let newImagePublicId = req.body.imagePublicId;

        // Handle Image Update
        if (req.file) {
            try {
                const imageData = await uploadImage(req.file);
                newImageUrl = imageData.url;
                newImagePublicId = imageData.publicId;

                // Delete old image if exists
                if (menuItem.imagePublicId) {
                    await deleteImage(menuItem.imagePublicId);
                }
            } catch (uErr) {
                console.error('Image upload failed during update:', uErr);
                return res.status(500).json({ message: 'Failed to upload image', error: uErr.message });
            }
        } else if (newImageUrl === '') {
            // If explicitly cleared (though logic depends on how frontend sends it)
            // Frontend sends imageUrl: '' via handleRemoveImage
            if (menuItem.imagePublicId) {
                await deleteImage(menuItem.imagePublicId);
            }
        }

        // Update fields
        if (name) menuItem.name = name;
        if (description !== undefined) menuItem.description = description;
        if (category) menuItem.category = category;
        if (subcategory !== undefined) menuItem.subcategory = subcategory === '' ? null : subcategory;
        if (price !== undefined) menuItem.price = price;
        if (newImageUrl !== undefined) menuItem.imageUrl = newImageUrl;
        if (newImagePublicId !== undefined) menuItem.imagePublicId = newImagePublicId;
        if (available !== undefined) menuItem.available = available;
        if (sku !== undefined) menuItem.sku = sku;
        if (ingredients !== undefined) menuItem.ingredients = ingredients;
        if (allergens !== undefined) menuItem.allergens = allergens;
        if (prepTime !== undefined) menuItem.prepTime = prepTime;
        if (featured !== undefined) menuItem.featured = featured;
        if (tags !== undefined) menuItem.tags = tags;
        if (portionSize !== undefined) menuItem.portionSize = portionSize;
        if (costPrice !== undefined) menuItem.costPrice = costPrice;
        if (stockControlled !== undefined) menuItem.stockControlled = stockControlled;
        if (stock !== undefined) menuItem.stock = stock;
        if (customizationOptions !== undefined) menuItem.customizationOptions = customizationOptions;
        if (nutritionalInfo !== undefined) menuItem.nutritionalInfo = nutritionalInfo;

        menuItem.lastUpdatedBy = req.user._id;

        await menuItem.save();
        await menuItem.populate('category subcategory');

        console.log('--------------------------------------------------');
        console.log('✅ UPDATED PRODUCT IMAGE URL SAVED:', menuItem.imageUrl);
        console.log('--------------------------------------------------');

        // Clear menu cache for this restaurant
        const cachePattern = `menu:${restaurantId}*`;
        cache.deletePattern(cachePattern);
        console.log(`🧹 Cache cleared (Broad) for restaurant: ${restaurantId}`);

        res.json({
            message: 'Menu item updated successfully',
            menuItem
        });
    } catch (error) {
        console.error('❌ Error updating menu item:', error);

        // Handle Duplicate Key Errors (e.g., SKU)
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern || {})[0] || 'field';
            const value = error.keyValue ? error.keyValue[field] : '';
            return res.status(400).json({
                message: `Duplicate value for ${field}: ${value}. Please use a unique value.`,
                error: 'DuplicateKeyError'
            });
        }

        res.status(500).json({ message: 'Failed to update menu item', error: error.message });
    }
});

/**
 * @route   DELETE /api/menu-items/:id
 * @desc    Delete a menu item
 * @access  Private (Owner, Manager)
 */
router.delete('/:id', authenticateToken, authorizeRoles(['owner', 'manager']), async (req, res) => {
    try {
        const restaurantId = req.user.restaurant?._id || req.user.restaurant;
        console.log(`🗑️ Attempting to delete Menu Item: ${req.params.id}`);
        console.log(`👤 User Restaurant ID: ${restaurantId}`);

        const menuItem = await MenuItem.findById(req.params.id);

        if (!menuItem) {
            console.warn(`⚠️ Menu item ${req.params.id} not found in DB`);
            return res.status(404).json({ message: 'Menu item not found' });
        }

        console.log(`🏠 Item belongs to Restaurant: ${menuItem.restaurant}`);

        // Verify menu item belongs to user's restaurant
        if (menuItem.restaurant.toString() !== restaurantId.toString()) {
            console.error(`❌ Permission Denied: Item ${menuItem._id} (Rest: ${menuItem.restaurant}) does not match User Rest: ${restaurantId}`);
            return res.status(403).json({ message: 'Access denied' });
        }

        // Delete image from Cloudinary if exists
        if (menuItem.imagePublicId) {
            console.log(`🖼️ Deleting image from Cloudinary: ${menuItem.imagePublicId}`);
            await deleteImage(menuItem.imagePublicId);
        }

        await menuItem.deleteOne();
        console.log(`✅ Menu item ${req.params.id} deleted successfully`);

        // Clear menu cache for this restaurant
        const cachePattern = `menu:${restaurantId}*`;
        cache.deletePattern(cachePattern);
        console.log(`🧹 Cache cleared (Broad) for restaurant: ${restaurantId}`);

        res.json({ message: 'Menu item deleted successfully' });
    } catch (error) {
        console.error('❌ Error deleting menu item:', error);
        res.status(500).json({ message: 'Failed to delete menu item', error: error.message });
    }
});

export default router;
