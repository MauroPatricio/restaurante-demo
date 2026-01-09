import express from 'express';
import mongoose from 'mongoose';
import Restaurant from '../models/Restaurant.js';
import Table from '../models/Table.js';
import MenuItem from '../models/MenuItem.js';
import Order from '../models/Order.js';
import Audience from '../models/Audience.js';
import Coupon from '../models/Coupon.js';
import QRCode from 'qrcode';
import { authenticateToken, authorizeRoles, checkSubscription } from '../middleware/auth.js';
import { sendOrderNotification } from '../services/firebaseService.js';
import cache from '../services/cacheService.js';
import upload from '../middleware/upload.js';
import cloudinary from '../config/cloudinary.js';
import streamifier from 'streamifier';
import { generateQRCodeUrl } from '../utils/qrSecurity.js';

// Import feature-specific routes
import authRoutes from './authRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import subscriptionRoutes from './subscriptionRoutes.js';
import feedbackRoutes from './feedbackRoutes.js';
import publicRoutes from './publicRoutes.js';
import couponRoutes from './couponRoutes.js';
import deliveryRoutes from './deliveryRoutes.js';
import userRoutes from './userRoutes.js';
import roleRoutes from './roleRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import restaurantRoutes from './restaurantRoutes.js';
import categoryRoutes from './categories.js';
import subcategoryRoutes from './subcategories.js';
import menuItemRoutes from './menuItems.js';
import waiterCallRoutes from './waiterCallRoutes.js';
import clientReactionRoutes from './clientReactionRoutes.js';

// Table State Management
import {
  getTableCurrentSession,
  freeTable,
  getTableSessionHistory
} from '../controllers/tableStateController.js';
import { validateAndOccupyTable, canFreeTable } from '../middleware/tableValidation.js';

const router = express.Router();

// Mount PUBLIC routes first (no authentication required)
router.use('/public', publicRoutes);

// Mount feature routes
router.use('/auth', authRoutes);
router.use('/restaurants', restaurantRoutes);
router.use('/payments', paymentRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/coupons', couponRoutes);
router.use('/delivery', deliveryRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/users', userRoutes);
router.use('/roles', roleRoutes);
router.use('/categories', categoryRoutes);
router.use('/subcategories', subcategoryRoutes);
router.use('/menu-items', menuItemRoutes);
router.use('/waiter-calls', waiterCallRoutes);
router.use('/client-reactions', clientReactionRoutes);

// ============ TABLE STATE MANAGEMENT ROUTES ============
router.get('/tables/:id/current-session', authenticateToken, getTableCurrentSession);
router.post('/tables/:id/free', authenticateToken, canFreeTable, freeTable);
router.get('/tables/:id/session-history', authenticateToken, authorizeRoles(['manager', 'waiter', 'owner']), getTableSessionHistory);

// ...

// ============ PUBLIC MENU ROUTE ============

/**
 * @route   GET /api/public/menu/:restaurantId
 * @desc    Get structured menu for a restaurant (public access)
 * @access  Public
 */
router.get('/public/menu/:restaurantId', async (req, res) => {
  try {
    const { restaurantId } = req.params;
    console.log(`🔍 Serving menu for restaurant ${restaurantId} from DB: ${mongoose.connection?.db?.databaseName}`);
    const cacheKey = `menu:${restaurantId}`;

    // Check cache first
    const cachedMenu = cache.get(cacheKey);
    if (cachedMenu) {
      return res.json(cachedMenu);
    }

    // Import models
    const Category = (await import('../models/Category.js')).default;
    const Subcategory = (await import('../models/Subcategory.js')).default;

    // Get all active categories for the restaurant
    const categories = await Category.find({
      restaurant: restaurantId,
      isActive: true
    }).sort({ displayOrder: 1, name: 1 });

    // Get all active subcategories for the restaurant
    const subcategories = await Subcategory.find({
      restaurant: restaurantId,
      isActive: true
    }).sort({ displayOrder: 1, name: 1 });

    // Get all available menu items for the restaurant
    const menuItems = await MenuItem.find({
      restaurant: restaurantId,
      available: true
    })
      .populate('category')
      .populate('subcategory')
      .sort({ category: 1, subcategory: 1, name: 1 });

    // Structure the menu
    const structuredMenu = categories.map(category => {
      // Get subcategories for this category
      const categorySubcategories = subcategories.filter(
        sub => sub.category.toString() === category._id.toString()
      );

      // Get items for this category
      const categoryItems = menuItems.filter(
        item => item.category._id.toString() === category._id.toString()
      );

      // Group items by subcategory
      const itemsBySubcategory = categorySubcategories.map(subcategory => ({
        subcategory: {
          _id: subcategory._id,
          name: subcategory.name,
          description: subcategory.description
        },
        items: categoryItems.filter(
          item => item.subcategory?._id.toString() === subcategory._id.toString()
        )
      }));

      // Items without subcategory
      const itemsWithoutSubcategory = categoryItems.filter(item => !item.subcategory);

      return {
        category: {
          _id: category._id,
          name: category.name,
          description: category.description,
          displayOrder: category.displayOrder
        },
        subcategories: itemsBySubcategory,
        items: itemsWithoutSubcategory
      };
    });

    const response = {
      restaurant: restaurantId,
      menu: structuredMenu,
      totalCategories: categories.length,
      totalItems: menuItems.length
    };

    // Cache for 5 minutes
    cache.set(cacheKey, response, 300);

    res.json(response);
  } catch (error) {
    console.error('Error fetching public menu:', error);
    res.status(500).json({ error: 'Failed to fetch menu' });
  }
});

// ============ RESTAURANT ROUTES ============

// Create restaurant (handled by auth/register)

// Get restaurant details
router.get('/restaurants/:id', async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id)
      .populate('owner', 'name email phone')
      .populate('subscription');

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    res.json({ restaurant });
  } catch (error) {
    console.error('Get restaurant error:', error);
    res.status(500).json({ error: 'Failed to fetch restaurant' });
  }
});

// Update restaurant
// Helper for stream upload
const streamUpload = (req) => {
  return new Promise((resolve, reject) => {
    let stream = cloudinary.uploader.upload_stream(
      { folder: 'restaurants' },
      (error, result) => {
        if (result) {
          resolve(result);
        } else {
          reject(error);
        }
      }
    );
    streamifier.createReadStream(req.file.buffer).pipe(stream);
  });
};

// Update restaurant
router.patch('/restaurants/:id', authenticateToken, authorizeRoles('owner', 'admin'), upload.single('image'), async (req, res) => {
  try {
    const updates = req.body;

    // Handle Image Upload if present
    if (req.file) {
      try {
        const result = await streamUpload(req);
        updates.logo = result.secure_url;
      } catch (uErr) {
        console.error('Cloudinary Upload Error:', uErr);
        return res.status(500).json({ error: 'Image upload failed' });
      }
    }

    // Prevent changing owner and subscription fields via this route
    delete updates.owner;
    delete updates.subscription;

    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Invalidate restaurant cache
    cache.delete(`restaurant:${req.params.id}`);

    res.json({
      message: 'Restaurant updated successfully',
      restaurant
    });
  } catch (error) {
    console.error('Update restaurant error:', error);
    res.status(500).json({ error: 'Failed to update restaurant' });
  }
});

// ============ TABLE ROUTES ============

// Create table with QR code
router.post('/tables', authenticateToken, authorizeRoles('owner', 'admin', 'manager'), checkSubscription, async (req, res) => {
  try {
    const {
      restaurant, number, capacity, location, type, status,
      accessibility, joinable, assignedWaiter, minConsumption
    } = req.body;

    // Create table first to get the ID
    const table = await Table.create({
      restaurant, number, capacity, location, type, status,
      accessibility, joinable, assignedWaiter, minConsumption,
      qrCode: '' // Temporary empty string
    });

    // Generate QR code URL with table ID and security token
    const qrUrl = generateQRCodeUrl(restaurant, table._id);
    const qrCode = await QRCode.toDataURL(qrUrl);

    // Update table with QR code
    table.qrCode = qrCode;
    await table.save();

    res.status(201).json({
      message: 'Table created successfully',
      table
    });
  } catch (error) {
    console.error('Create table error:', error);
    res.status(500).json({ error: 'Failed to create table', details: error.message });
  }
});

// Get all tables for a restaurant
router.get('/tables/restaurant/:restaurantId', async (req, res) => {
  try {
    const tables = await Table.find({ restaurant: req.params.restaurantId })
      .populate('assignedWaiterId', 'name email') // Populate waiter info
      .sort({ number: 1 });

    res.json({ tables });
  } catch (error) {
    console.error('Get tables error:', error);
    res.status(500).json({ error: 'Failed to fetch tables' });
  }
});

// Lookup table by number (for public QR menu) - MUST come before /tables/:id
router.get('/tables/lookup', async (req, res) => {
  try {
    const { restaurant, number } = req.query;
    if (!restaurant || !number) {
      return res.status(400).json({ error: 'Missing restaurant or number param' });
    }

    // Since number is Number type in DB, cast it
    const table = await Table.findOne({ restaurant, number: parseInt(number) });

    if (!table) return res.status(404).json({ error: 'Table not found' });

    res.json({ table });
  } catch (error) {
    console.error('Table lookup error:', error);
    res.status(500).json({ error: 'Failed to lookup table' });
  }
});

// Get single table
router.get('/tables/:id', async (req, res) => {
  try {
    const table = await Table.findById(req.params.id)
      .populate('restaurant')
      .populate('assignedWaiterId', 'name email avatar'); // Added avatar

    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    // Add waiter details
    if (table.assignedWaiterId) {
      table.assignedWaiter = table.assignedWaiterId.name;
      table.waiterPhoto = table.assignedWaiterId.avatar;
      table.waiterStatus = 'online'; // TODO: Implement real presence
    } else if (table.assignedWaiter && mongoose.Types.ObjectId.isValid(table.assignedWaiter)) {
      // Logic to resolve ID if it's stored in the legacy string field
      const User = (await import('../models/User.js')).default;
      const waiterUser = await User.findById(table.assignedWaiter).select('name avatar');
      if (waiterUser) {
        table.assignedWaiter = waiterUser.name;
        table.waiterPhoto = waiterUser.avatar;
        table.waiterStatus = 'online';
      }
    }

    res.json({ table });
  } catch (error) {
    console.error('Get table error:', error);
    res.status(500).json({ error: 'Failed to fetch table' });
  }
});

// Update table
router.patch('/tables/:id', authenticateToken, authorizeRoles('owner', 'admin', 'manager'), checkSubscription, async (req, res) => {
  try {
    const table = await Table.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    res.json({
      message: 'Table updated successfully',
      table
    });
  } catch (error) {
    console.error('Update table error:', error);
    res.status(500).json({ error: 'Failed to update table' });
  }
});

// Delete table
router.delete('/tables/:id', authenticateToken, authorizeRoles('owner', 'admin', 'manager'), checkSubscription, async (req, res) => {
  try {
    const table = await Table.findByIdAndDelete(req.params.id);

    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    res.json({ message: 'Table deleted successfully' });
  } catch (error) {
    console.error('Delete table error:', error);
    res.status(500).json({ error: 'Failed to delete table' });
  }
});

// Send Alert/Reaction (Service Call)
router.post('/tables/:id/alert', async (req, res) => {
  try {
    const { type, value, message } = req.body; // type: 'emotion' | 'call', value: 'angry' | 'waiting' | 'happy' 
    const table = await Table.findById(req.params.id);

    if (!table) return res.status(404).json({ error: 'Table not found' });

    const io = req.app.get('io');
    if (io) {
      const payload = {
        type,
        value,
        tableId: table._id,
        tableNumber: table.number,
        waiter: table.assignedWaiter,
        timestamp: new Date(),
        message
      };

      // Emit to restaurant room (Admin/Kitchen/Waiter dashboard)
      io.to(`restaurant-${table.restaurant}`).emit('table-alert', payload);
    }

    res.json({ success: true, message: 'Alert sent' });
  } catch (error) {
    console.error('Table alert error:', error);
    res.status(500).json({ error: 'Failed to send alert' });
  }
});

// ============ MENU ITEM ROUTES ============

// Get menu for a restaurant
router.get('/menu/:restaurantId', async (req, res) => {
  try {
    const { category, available } = req.query;

    // Create cache key based on query parameters
    const cacheKey = `menu:${req.params.restaurantId}:${category || 'all'}:${available || 'all'}`;

    // Check cache first
    const cachedMenu = cache.get(cacheKey);
    if (cachedMenu) {
      return res.json({ items: cachedMenu, cached: true });
    }

    const query = { restaurant: req.params.restaurantId };

    if (category) {
      query.category = category;
    }

    if (available !== undefined) {
      query.available = available === 'true';
    }

    // Use .lean() for read-only query and select only needed fields
    const items = await MenuItem.find(query)
      .select('name price category subcategory description available imageUrl photo imagePublicId allergens prepTime sku eta featured tags variablePrice customizationOptions portionSize costPrice stockControlled stock seasonal')
      .lean()
      .sort({ category: 1, name: 1 });

    // Cache for 10 minutes (menu items don't change frequently)
    cache.set(cacheKey, items, 600);

    res.json({ items });
  } catch (error) {
    console.error('Get menu error:', error);
    res.status(500).json({ error: 'Failed to fetch menu' });
  }
});

// Get menu categories for a restaurant
router.get('/menu/:restaurantId/categories', async (req, res) => {
  try {
    // Get unique categories used by menu items for this restaurant
    const items = await MenuItem.find({
      restaurant: req.params.restaurantId,
      available: true
    }).populate('category').select('category');

    // Extract unique categories
    const categoryMap = new Map();
    items.forEach(item => {
      if (item.category && item.category._id) {
        categoryMap.set(item.category._id.toString(), item.category);
      }
    });

    // Convert to array and add "All" option
    const categories = [{ _id: 'All', name: 'All' }, ...Array.from(categoryMap.values())];

    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});


// Menu Item routes are now fully handled in ./menuItems.js
// Duplicate routes removed to avoid shadowing and confusion.

// ============ ORDER ROUTES ============

// Create order
router.post('/orders', checkSubscription, validateAndOccupyTable, async (req, res) => {
  try {
    const {
      restaurant,
      table,
      items,
      phone,
      customerName,
      email,
      orderType,
      deliveryAddress,
      couponCode,
      notes,
      paymentMethod // Added paymentMethod
    } = req.body;

    // Validate Subscription/Restaurant Status First
    // (Middleware checkSubscription already handles the bulk, 
    // but ensures we have req.restaurant context if needed)

    // Validate table ownership (optimized with .lean() and field projection)
    if (table) {
      const tableData = await Table.findById(table)
        .select('restaurant')
        .lean();
      if (!tableData) {
        return res.status(404).json({ error: 'Table not found' });
      }
      if (tableData.restaurant.toString() !== restaurant) {
        return res.status(400).json({ error: 'Table does not belong to this restaurant' });
      }
    }

    // Calculate subtotal
    let subtotal = 0;
    const populatedItems = [];

    // Batch fetch all menu items at once (optimized)
    const menuItemIds = items.map(i => i.item);
    const menuItems = await MenuItem.find({ _id: { $in: menuItemIds } })
      .select('_id name price available orderCount')
      .lean();

    const menuItemMap = new Map(menuItems.map(item => [item._id.toString(), item]));

    for (const orderItem of items) {
      const menuItem = menuItemMap.get(orderItem.item);
      if (!menuItem) {
        return res.status(404).json({ error: `Menu item ${orderItem.item} not found` });
      }

      if (!menuItem.available) {
        return res.status(400).json({ error: `${menuItem.name} is currently unavailable` });
      }

      let itemSubtotal = menuItem.price * orderItem.qty;

      // Calculate customization price modifications
      if (orderItem.customizations) {
        for (const customization of orderItem.customizations) {
          itemSubtotal += (customization.priceModifier || 0) * orderItem.qty;
        }
      }

      populatedItems.push({
        item: menuItem._id,
        qty: orderItem.qty,
        customizations: orderItem.customizations,
        itemPrice: menuItem.price,
        subtotal: itemSubtotal
      });

      subtotal += itemSubtotal;
    }

    // Batch update order counts (optimized)
    const bulkOps = items.map(orderItem => ({
      updateOne: {
        filter: { _id: orderItem.item },
        update: { $inc: { orderCount: orderItem.qty } }
      }
    }));
    await MenuItem.bulkWrite(bulkOps);

    // Get restaurant settings (optimized with cache and .lean())
    const cacheKey = `restaurant:${restaurant}`;
    let restaurantData = cache.get(cacheKey);

    if (!restaurantData) {
      restaurantData = await Restaurant.findById(restaurant)
        .select('settings')
        .lean();
      cache.set(cacheKey, restaurantData, 600); // Cache for 10 minutes
    }

    const taxRate = restaurantData?.settings?.taxRate || 0;
    const serviceChargeRate = restaurantData?.settings?.serviceChargeRate || 0;

    const tax = (subtotal * taxRate) / 100;
    const serviceCharge = (subtotal * serviceChargeRate) / 100;

    // Apply coupon if provided
    let discount = 0;
    if (couponCode) {
      const coupon = await Coupon.findOne({
        code: couponCode.toUpperCase(),
        restaurant
      });

      if (coupon) {
        const validation = coupon.isValid(phone);
        if (validation.valid && subtotal >= coupon.minOrderAmount) {
          discount = coupon.calculateDiscount(subtotal);

          // Mark coupon as used
          coupon.usedCount += 1;
          coupon.usedBy.push({ user: phone, usedAt: new Date() });
          await coupon.save();
        }
      }
    }

    // Calculate delivery fee if delivery order
    let deliveryFee = 0;
    if (orderType === 'delivery' && deliveryAddress) {
      deliveryFee = 50; // Default delivery fee, can be calculated based on distance
    }

    const total = subtotal + tax + serviceCharge + deliveryFee - discount;

    // Estimate ready time
    const maxEta = Math.max(...populatedItems.map(i => {
      const menuItem = items.find(mi => mi.item === i.item.toString());
      return menuItem?.eta || 15;
    }));
    const estimatedReadyTime = new Date(Date.now() + maxEta * 60 * 1000);

    // Create order
    const order = await Order.create({
      restaurant,
      table,
      tableSession: req.tableSession?._id, // Link to table session
      orderType: orderType || 'dine-in',
      items: populatedItems,
      subtotal,
      discount,
      couponCode,
      tax,
      serviceCharge,
      deliveryFee,
      total,
      customerName,
      phone,
      email,
      deliveryAddress,
      estimatedReadyTime,
      notes,
      status: 'pending'
    });

    // Add to audience if phone provided
    if (phone) {
      await Audience.findOneAndUpdate(
        { restaurant, phone },
        { restaurant, phone },
        { upsert: true }
      );
    }

    // Send notification to kitchen (async - don't wait)
    sendOrderNotification(order, 'new-order').catch(err => {
      console.error('Failed to send order notification:', err);
    });

    // Emit real-time update to restaurant room
    const io = req.app.get('io');
    if (io) {
      io.to(`restaurant-${restaurant}`).emit('order:new', order);
    }

    res.status(201).json({
      message: 'Order created successfully',
      order: {
        id: order._id,
        total: order.total,
        estimatedReadyTime: order.estimatedReadyTime,
        status: order.status
      }
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order', details: error.message });
  }
});

// Get orders for a restaurant
router.get('/orders/restaurant/:restaurantId', authenticateToken, checkSubscription, async (req, res) => {
  try {
    const { status, orderType, limit = 50 } = req.query;

    const query = { restaurant: req.params.restaurantId };

    if (status) {
      if (status.includes(',')) {
        query.status = { $in: status.split(',') };
      } else {
        query.status = status;
      }
    }

    if (orderType) {
      query.orderType = orderType;
    }

    if (req.query.startDate && req.query.endDate) {
      query.createdAt = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }

    const orders = await Order.find(query)
      .populate('items.item')
      .populate('table')
      .populate('feedback')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({ orders });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get single order
router.get('/orders/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.item')
      .populate('table')
      .populate('restaurant')
      .populate('feedback');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ order });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Update order status
router.patch('/orders/:id', authenticateToken, async (req, res) => {
  try {
    const { status, paymentStatus } = req.body;

    const updateData = {};

    if (status) {
      updateData.status = status;
      updateData.$push = {
        statusHistory: {
          status,
          timestamp: new Date(),
          updatedBy: req.user._id
        }
      };
    }

    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus;
    }

    // Set ready time when status changes to ready
    if (status === 'ready') {
      updateData.actualReadyTime = new Date();
    }

    // Set completed time when status changes to completed
    if (status === 'completed') {
      updateData.completedAt = new Date();
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Send notifications based on status
    if (status === 'ready') {
      await sendOrderNotification(order, 'order-ready');
    }

    // Emit real-time update to specific order room
    const io = req.app.get('io');
    if (io) {
      io.to(`order-${order._id}`).emit('order-updated', order);
      // Also emit to restaurant room (e.g., for Kitchen Display System)
      io.to(`restaurant-${order.restaurant}`).emit('order-updated', order);
    }

    res.json({
      message: 'Order updated successfully',
      order
    });
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ error: 'Failed to update order', details: error.message });
  }
});

// Get unique clients from orders
router.get('/clients', authenticateToken, authorizeRoles('owner', 'manager', 'admin'), async (req, res) => {
  try {
    const { restaurantId } = req.query;
    const targetRestaurant = restaurantId || req.user.restaurant;

    const matchStage = {};
    if (targetRestaurant) {
      matchStage.restaurant = new mongoose.Types.ObjectId(targetRestaurant._id || targetRestaurant);
    }

    const clients = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$phone",
          name: { $first: "$customerName" },
          phone: { $first: "$phone" },
          totalSpent: { $sum: "$total" },
          lastOrderDate: { $max: "$createdAt" },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { lastOrderDate: -1 } }
    ]);

    res.json({ clients });
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

// ============ BROADCAST / MARKETING ============

// Send broadcast message
router.post('/broadcast', authenticateToken, authorizeRoles('owner', 'admin', 'manager'), checkSubscription, async (req, res) => {
  try {
    const { restaurant, message } = req.body;
    const phones = await Audience.find({ restaurant });

    // TODO: Integrate with SMS/WhatsApp API
    console.log(`Broadcasting to ${phones.length} customers: ${message}`);

    res.json({
      sent: phones.length,
      message,
      note: 'SMS/WhatsApp integration pending'
    });
  } catch (error) {
    console.error('Broadcast error:', error);
    res.status(500).json({ error: 'Failed to send broadcast' });
  }
});

export default router;