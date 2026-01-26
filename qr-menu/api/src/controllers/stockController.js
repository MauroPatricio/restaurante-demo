import MenuItem from '../models/MenuItem.js';
import StockMovement from '../models/StockMovement.js';
import Restaurant from '../models/Restaurant.js';

/**
 * Restock menu item (add inventory)
 * POST /api/stock/restock
 */
export const restockItem = async (req, res) => {
    try {
        const { menuItemId, quantity, reason, notes } = req.body;
        const userId = req.user._id;

        if (!menuItemId || !quantity || quantity <= 0) {
            return res.status(400).json({ error: 'Menu item ID and positive quantity required' });
        }

        const menuItem = await MenuItem.findById(menuItemId);
        if (!menuItem) {
            return res.status(404).json({ error: 'Menu item not found' });
        }

        if (!menuItem.stockControlled) {
            return res.status(400).json({ error: 'This item does not have stock control enabled' });
        }

        const quantityBefore = menuItem.stock;
        menuItem.stock += parseInt(quantity);
        const quantityAfter = menuItem.stock;
        await menuItem.save();

        // Create movement record
        await StockMovement.create({
            menuItem: menuItem._id,
            restaurant: menuItem.restaurant,
            type: 'restock',
            quantityBefore,
            quantityAfter,
            quantity: parseInt(quantity),
            reason: reason || 'Manual restock',
            notes,
            performedBy: userId
        });

        // Emit Socket.IO event
        if (req.app.get('io')) {
            req.app.get('io').to(`restaurant:${menuItem.restaurant}`).emit('stock:updated', {
                menuItemId: menuItem._id,
                menuItemName: menuItem.name,
                newStock: quantityAfter,
                change: parseInt(quantity),
                alert: false
            });
        }

        res.json({
            message: 'Stock updated successfully',
            menuItem: {
                id: menuItem._id,
                name: menuItem.name,
                stockBefore: quantityBefore,
                stockAfter: quantityAfter,
                change: parseInt(quantity)
            }
        });
    } catch (error) {
        console.error('Restock error:', error);
        res.status(500).json({ error: 'Failed to restock item' });
    }
};

/**
 * Adjust stock manually (corrections, waste, etc)
 * POST /api/stock/adjust
 */
export const adjustStock = async (req, res) => {
    try {
        const { menuItemId, quantity, reason, notes, type } = req.body;
        const userId = req.user._id;

        if (!menuItemId || quantity === undefined) {
            return res.status(400).json({ error: 'Menu item ID and quantity required' });
        }

        const menuItem = await MenuItem.findById(menuItemId);
        if (!menuItem) {
            return res.status(404).json({ error: 'Menu item not found' });
        }

        if (!menuItem.stockControlled) {
            return res.status(400).json({ error: 'This item does not have stock control enabled' });
        }

        const quantityBefore = menuItem.stock;
        menuItem.stock += parseInt(quantity); // Can be negative

        if (menuItem.stock < 0) {
            return res.status(400).json({ error: 'Adjustment would result in negative stock' });
        }

        const quantityAfter = menuItem.stock;
        await menuItem.save();

        // Create movement record
        await StockMovement.create({
            menuItem: menuItem._id,
            restaurant: menuItem.restaurant,
            type: type || (quantity < 0 ? 'waste' : 'adjustment'),
            quantityBefore,
            quantityAfter,
            quantity: parseInt(quantity),
            reason: reason || 'Manual adjustment',
            notes,
            performedBy: userId
        });

        // Emit Socket.IO event
        if (req.app.get('io')) {
            req.app.get('io').to(`restaurant:${menuItem.restaurant}`).emit('stock:updated', {
                menuItemId: menuItem._id,
                menuItemName: menuItem.name,
                newStock: quantityAfter,
                change: parseInt(quantity),
                alert: quantityAfter <= 5
            });
        }

        res.json({
            message: 'Stock adjusted successfully',
            menuItem: {
                id: menuItem._id,
                name: menuItem.name,
                stockBefore: quantityBefore,
                stockAfter: quantityAfter,
                change: parseInt(quantity)
            }
        });
    } catch (error) {
        console.error('Adjust stock error:', error);
        res.status(500).json({ error: 'Failed to adjust stock' });
    }
};

/**
 * Get items with low stock
 * GET /api/stock/:restaurantId/low-stock
 */
export const getLowStockItems = async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const { threshold = 5 } = req.query;

        const lowStockItems = await MenuItem.find({
            restaurant: restaurantId,
            stockControlled: true,
            stock: { $lte: parseInt(threshold) },
            active: true
        }).select('name stock price costPrice category imageUrl');

        res.json({
            threshold: parseInt(threshold),
            count: lowStockItems.length,
            items: lowStockItems.map(item => ({
                id: item._id,
                name: item.name,
                stock: item.stock,
                price: item.price,
                costPrice: item.costPrice,
                category: item.category,
                imageUrl: item.imageUrl,
                status: item.stock === 0 ? 'out_of_stock' : 'low_stock'
            }))
        });
    } catch (error) {
        console.error('Get low stock error:', error);
        res.status(500).json({ error: 'Failed to fetch low stock items' });
    }
};

/**
 * Get stock movement history
 * GET /api/stock/:restaurantId/movements
 */
export const getStockMovements = async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const { menuItemId, type, startDate, endDate, limit = 50, page = 1 } = req.query;

        let query = { restaurant: restaurantId };

        if (menuItemId) query.menuItem = menuItemId;
        if (type) query.type = type;
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const movements = await StockMovement.find(query)
            .populate('menuItem', 'name imageUrl')
            .populate('performedBy', 'name email')
            .populate('order', 'customerName total')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(skip);

        const total = await StockMovement.countDocuments(query);

        res.json({
            movements,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get movements error:', error);
        res.status(500).json({ error: 'Failed to fetch stock movements' });
    }
};

/**
 * Get stock report / analytics
 * GET /api/stock/:restaurantId/report
 */
export const getStockReport = async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const { startDate, endDate } = req.query;

        // Get all stock-controlled items
        const items = await MenuItem.find({
            restaurant: restaurantId,
            stockControlled: true,
            active: true
        }).select('name stock costPrice price category');

        // Calculate total inventory value
        const totalValue = items.reduce((sum, item) => sum + (item.stock * item.costPrice), 0);
        const totalRetailValue = items.reduce((sum, item) => sum + (item.stock * item.price), 0);

        // Count by status
        const outOfStock = items.filter(i => i.stock === 0).length;
        const lowStock = items.filter(i => i.stock > 0 && i.stock <= 5).length;
        const inStock = items.filter(i => i.stock > 5).length;

        // Get top selling items (by movement count)
        let movementFilter = { restaurant: restaurantId, type: 'sale' };
        if (startDate && endDate) {
            movementFilter.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const topSelling = await StockMovement.aggregate([
            { $match: movementFilter },
            {
                $group: {
                    _id: '$menuItem',
                    totalSold: { $sum: { $abs: '$quantity' } },
                    revenue: { $sum: { $abs: '$quantity' } } // Will need to mult by price, simplified
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 10 }
        ]);

        // Populate menu item names
        await StockMovement.populate(topSelling, { path: '_id', select: 'name price' });

        res.json({
            summary: {
                totalItems: items.length,
                outOfStock,
                lowStock,
                inStock,
                totalInventoryValue: Math.round(totalValue),
                totalRetailValue: Math.round(totalRetailValue),
                potentialProfit: Math.round(totalRetailValue - totalValue)
            },
            topSelling: topSelling.map(item => ({
                menuItem: item._id,
                totalSold: item.totalSold
            })),
            byCategory: items.reduce((acc, item) => {
                const cat = item.category?.toString() || 'uncategorized';
                if (!acc[cat]) acc[cat] = { count: 0, value: 0 };
                acc[cat].count++;
                acc[cat].value += item.stock * item.costPrice;
                return acc;
            }, {})
        });
    } catch (error) {
        console.error('Get stock report error:', error);
        res.status(500).json({ error: 'Failed to generate stock report' });
    }
};

/**
 * Get all stock-controlled menu items with current stock
 * GET /api/stock/:restaurantId/items
 */
export const getStockItems = async (req, res) => {
    try {
        const { restaurantId } = req.params;

        const items = await MenuItem.find({
            restaurant: restaurantId,
            stockControlled: true
        })
            .populate('category', 'name')
            .select('name stock costPrice price imageUrl category active')
            .sort({ name: 1 });

        res.json({
            count: items.length,
            items: items.map(item => ({
                id: item._id,
                name: item.name,
                stock: item.stock,
                price: item.price,
                costPrice: item.costPrice,
                category: item.category,
                imageUrl: item.imageUrl,
                active: item.active,
                status: item.stock === 0 ? 'out_of_stock' :
                    item.stock <= 5 ? 'low_stock' : 'in_stock'
            }))
        });
    } catch (error) {
        console.error('Get stock items error:', error);
        res.status(500).json({ error: 'Failed to fetch stock items' });
    }
};
