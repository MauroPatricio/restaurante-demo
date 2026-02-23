import express from 'express';
import Restaurant from '../models/Restaurant.js';
import Table from '../models/Table.js';
import Order from '../models/Order.js';
import HotelRoom from '../models/HotelRoom.js';
import { validateTableToken } from '../utils/qrSecurity.js';
import { occupyTable } from '../controllers/tableStateController.js';

import cacheService from '../services/cacheService.js';

const router = express.Router();

/**
 * Validate restaurant, table, and token
 * GET /api/public/menu/validate?r=restaurantId&t=tableId&token=xxx
 */
router.get('/menu/validate', async (req, res) => {
    try {
        const { r: restaurantId, t: tableId, token } = req.query;

        console.log('🔍 QR Validation Request:', { restaurantId, tableId, tokenProvided: !!token });

        // Validate required parameters
        if (!restaurantId || !tableId || !token) {
            return res.status(400).json({
                error: 'Missing parameters',
                message: 'Parâmetros incompletos. Por favor, escaneie o QR Code novamente.'
            });
        }

        // Validate the token
        const isValidToken = validateTableToken(token, restaurantId, tableId);
        console.log('🔐 Token validation result:', isValidToken);

        if (!isValidToken) {
            return res.status(403).json({
                error: 'Invalid QR code',
                message: 'QR Code inválido ou expirado. Por favor, escaneie novamente.',
                valid: false
            });
        }

        // Fetch restaurant and table
        const restaurant = await Restaurant.findById(restaurantId).populate('subscription');
        const table = await Table.findById(tableId);

        console.log('🏪 Restaurant check:', {
            found: !!restaurant,
            active: restaurant?.active,
            hasSubscription: !!restaurant?.subscription
        });

        if (!restaurant || !restaurant.active) {
            return res.status(403).json({
                error: 'Restaurant unavailable',
                message: 'Restaurante não disponível no momento.',
                valid: false
            });
        }

        if (restaurant.settings?.isMaintenance) {
            return res.status(503).json({
                error: 'Maintenance mode',
                message: 'O restaurante está em manutenção temporária.',
                valid: false,
                isMaintenance: true, // Flag for frontend
                restaurant: { name: restaurant.name, logo: restaurant.logo }
            });
        }

        if (!restaurant.subscription || !['active', 'trial'].includes(restaurant.subscription.status)) {
            return res.status(403).json({
                error: 'Subscription expired',
                message: 'O restaurante não está aceitando pedidos no momento.',
                valid: false
            });
        }

        if (!table) {
            return res.status(404).json({
                error: 'Table not found',
                message: 'Mesa não encontrada. Verifique o QR Code.',
                valid: false
            });
        }

        // Success response
        console.log('✅ QR Validation successful');
        res.json({
            valid: true,
            restaurant: {
                _id: restaurant._id,
                name: restaurant.name,
                logo: restaurant.logo
            },
            table: {
                _id: table._id,
                number: table.number,
                location: table.location,
                status: table.status
            }
        });

    } catch (error) {
        console.error('❌ Validation error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Erro ao validar QR Code. Tente novamente.',
            valid: false
        });
    }
});

/**
 * Validate numeric code and return access token
 * POST /api/public/menu/access-by-code
 */
router.post('/menu/access-by-code', async (req, res) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ error: 'Code is required' });
        }

        const table = await Table.findOne({ numericCode: code }).populate('restaurant');

        if (!table) {
            return res.status(404).json({ error: 'Invalid code', message: 'Código inválido. Verifique o número na mesa.' });
        }

        // Validate Restaurant status similar to regular validation
        const restaurant = table.restaurant;
        if (!restaurant || !restaurant.active) {
            return res.status(403).json({ error: 'Restaurant unavailable' });
        }

        if (restaurant.settings?.isMaintenance) {
            return res.json({
                valid: false,
                isMaintenance: true,
                maintenance: true, // Legacy support
                redirectUrl: '/maintenance', // Frontend should intercept this or use the flag
                restaurant: { name: restaurant.name, logo: restaurant.logo }
            });
        }

        // Generate Token
        // We import the generator dynamically or ensure it's imported at top
        const { generateTableToken } = await import('../utils/qrSecurity.js');
        const token = generateTableToken(restaurant._id.toString(), table._id.toString());

        // Construct Redirect URL
        const redirectUrl = `/menu/${restaurant._id}?t=${table._id}&token=${token}`;

        res.json({
            valid: true,
            redirectUrl,
            restaurant: {
                name: restaurant.name,
                logo: restaurant.logo
            },
            table: {
                number: table.number,
                location: table.location
            }
        });

    } catch (error) {
        console.error('Code access error:', error);
        res.status(500).json({ error: 'Server error during validation' });
    }
});


/**
 * Get restaurant menu with table context
 * GET /api/public/menu/:restaurantId?t=tableId&token=xxx
 */
router.get('/menu/:restaurantId', async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const { t: tableId, token } = req.query;

        // Validate token
        if (!validateTableToken(token, restaurantId, tableId)) {
            return res.status(403).json({
                error: 'Invalid token',
                message: 'Token inválido'
            });
        }

        // Check cache
        const cacheKey = `public_menu:${restaurantId}`;
        const cachedData = cacheService.get(cacheKey);
        if (cachedData) {
            return res.json({
                ...cachedData,
                tableId
            });
        }

        // Get restaurant with menu items
        const restaurant = await Restaurant.findById(restaurantId).select('name logo menuItems');

        if (!restaurant) {
            return res.status(404).json({
                error: 'Restaurant not found'
            });
        }

        const responseData = {
            restaurant,
            tableId
        };

        // Cache for 10 minutes (600 seconds)
        cacheService.set(cacheKey, { restaurant }, 600);

        res.json(responseData);
    } catch (error) {
        console.error('Get menu error:', error);
        res.status(500).json({
            error: 'Failed to load menu'
        });
    }
});

// Import logic
import { createPublicOrder } from '../controllers/orderController.js';

/**
 * Create order from client menu
 * POST /api/public/orders
 */
router.post('/orders', createPublicOrder);

/**
 * Get order history for a customer
 * GET /api/public/orders/history?phone=xxx&restaurant=xxx
 */
router.get('/orders/history', async (req, res) => {
    try {
        const { phone, restaurant } = req.query;

        if (!phone || !restaurant) {
            return res.status(400).json({ error: 'Phone and restaurant are required' });
        }

        const orders = await Order.find({
            restaurant,
            phone
        })
            .sort({ createdAt: -1 })
            .populate('items.item', 'name price')
            .limit(20);

        res.json({ orders });
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});


// ===========================
// ROOM SERVICE PUBLIC ROUTES
// ===========================

/**
 * Validate a hotel room QR code
 * GET /api/public/room/validate?r=restaurantId&room=roomId&token=xxx
 */
router.get('/room/validate', async (req, res) => {
    try {
        const { r: restaurantId, room: roomId, token } = req.query;

        if (!restaurantId || !roomId || !token) {
            return res.status(400).json({
                valid: false,
                error: 'Missing parameters',
                message: 'Parâmetros incompletos. Por favor, escaneie o QR Code novamente.'
            });
        }

        // Reuse table token validator (same HMAC logic, just different IDs)
        const isValidToken = validateTableToken(token, restaurantId, roomId);
        if (!isValidToken) {
            return res.status(403).json({
                valid: false,
                error: 'Invalid QR code',
                message: 'QR Code inválido. Por favor, escaneie novamente.'
            });
        }

        const [restaurant, room] = await Promise.all([
            Restaurant.findById(restaurantId).populate('subscription'),
            HotelRoom.findById(roomId)
        ]);

        if (!restaurant || !restaurant.active) {
            return res.status(403).json({ valid: false, message: 'Estabelecimento não disponível.' });
        }
        if (!restaurant.subscription || !['active', 'trial'].includes(restaurant.subscription.status)) {
            return res.status(403).json({ valid: false, message: 'Serviço de quarto indisponível de momento.' });
        }
        if (!room) {
            return res.status(404).json({ valid: false, message: 'Quarto não encontrado.' });
        }
        if (!room.active) {
            return res.status(403).json({
                valid: false,
                message: 'Este quarto não está disponível para pedidos. Por favor contacte a receção.'
            });
        }

        res.json({
            valid: true,
            restaurant: { _id: restaurant._id, name: restaurant.name, logo: restaurant.logo },
            room: { _id: room._id, number: room.number, floor: room.floor, label: room.label }
        });
    } catch (error) {
        console.error('Room QR validation error:', error);
        res.status(500).json({ valid: false, error: 'Server error', message: 'Erro ao validar QR Code.' });
    }
});

/**
 * Get restaurant menu for room service (uses room token)
 * GET /api/public/room/menu/:restaurantId?room=roomId&token=xxx
 */
router.get('/room/menu/:restaurantId', async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const { room: roomId, token } = req.query;

        if (!restaurantId || !roomId || !token) {
            return res.status(400).json({ error: 'Missing parameters' });
        }

        const isValidToken = validateTableToken(token, restaurantId, roomId);
        if (!isValidToken) {
            return res.status(403).json({ error: 'Invalid token' });
        }

        // Use cache if available
        const cacheKey = `room_menu:${restaurantId}`;
        const cached = cacheService.get(cacheKey);
        if (cached) return res.json(cached);

        const MenuItem = (await import('../models/MenuItem.js')).default;
        const Category = (await import('../models/Category.js')).default;

        const [restaurant, items, categories] = await Promise.all([
            Restaurant.findById(restaurantId).select('name logo settings currency'),
            MenuItem.find({ restaurant: restaurantId, available: true }).lean(),
            Category.find({ restaurant: restaurantId }).sort('order').lean()
        ]);

        if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });

        const payload = { restaurant, items, categories };
        cacheService.set(cacheKey, payload, 600);
        res.json(payload);
    } catch (error) {
        console.error('Room menu fetch error:', error);
        res.status(500).json({ error: 'Failed to load menu' });
    }
});

/**
 * Create a room-service order from guest menu
 * POST /api/public/room/orders
 * Body: { restaurantId, roomId, token, items, customerName, phone, notes, scheduledDelivery, paymentMethod }
 */
router.post('/room/orders', async (req, res) => {
    try {
        const {
            restaurantId, roomId, token,
            items, customerName, phone, notes,
            scheduledDelivery, paymentMethod = 'room_account'
        } = req.body;

        if (!restaurantId || !roomId || !token) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const isValidToken = validateTableToken(token, restaurantId, roomId);
        if (!isValidToken) {
            return res.status(403).json({ error: 'Invalid QR token' });
        }

        const [restaurant, room] = await Promise.all([
            Restaurant.findById(restaurantId).populate('subscription'),
            HotelRoom.findById(roomId)
        ]);

        if (!restaurant || !restaurant.active) {
            return res.status(403).json({ error: 'Restaurant unavailable' });
        }
        if (!restaurant.subscription || !['active', 'trial'].includes(restaurant.subscription.status)) {
            return res.status(402).json({ error: 'Subscription expired' });
        }
        if (!room || !room.active) {
            return res.status(403).json({ error: 'Room unavailable' });
        }

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'No items in order' });
        }

        // Import MenuItem for price calculation
        const MenuItem = (await import('../models/MenuItem.js')).default;
        const menuItemIds = items.map(i => i.item);
        const menuItems = await MenuItem.find({ _id: { $in: menuItemIds } }).lean();
        const menuMap = new Map(menuItems.map(m => [m._id.toString(), m]));

        let subtotal = 0;
        const populatedItems = [];

        for (const orderItem of items) {
            const mi = menuMap.get(orderItem.item.toString());
            if (!mi) return res.status(404).json({ error: `Item não encontrado: ${orderItem.item}` });
            if (!mi.available) return res.status(400).json({ error: `${mi.name} está indisponível` });

            const qty = parseInt(orderItem.qty || 1);
            const itemSubtotal = mi.price * qty;
            populatedItems.push({ item: mi._id, qty, itemPrice: mi.price, subtotal: itemSubtotal });
            subtotal += itemSubtotal;
        }

        const settings = restaurant.settings || {};
        const tax = (subtotal * (settings.taxRate || 0)) / 100;
        const total = subtotal + tax;

        const newOrder = await Order.create({
            restaurant: restaurantId,
            orderType: 'room-service',
            items: populatedItems,
            subtotal,
            tax,
            total,
            customerName: customerName || `Quarto ${room.number}`,
            phone: phone || '000000000',
            paymentMethod,
            notes,
            status: 'pending',
            source: 'qr-menu',
            roomService: {
                room: room._id,
                roomNumber: room.number,
                scheduledDelivery: scheduledDelivery ? new Date(scheduledDelivery) : null
            }
        });

        // Notify kitchen/admin via socket
        const io = req.app.get('io');
        if (io) {
            io.to(`restaurant:${restaurantId}`).emit('room:order:new', {
                orderId: newOrder._id,
                roomNumber: room.number,
                floor: room.floor,
                total: newOrder.total,
                customerName: newOrder.customerName,
                itemsCount: populatedItems.length,
                status: 'pending'
            });
        }

        res.status(201).json({
            message: 'Pedido enviado com sucesso!',
            order: {
                _id: newOrder._id,
                status: newOrder.status,
                total: newOrder.total,
                roomNumber: room.number
            }
        });

    } catch (error) {
        console.error('Room order creation error:', error);
        res.status(500).json({ error: 'Failed to create room order', message: error.message });
    }
});

/**
 * Get single order for guest tracking
 * GET /api/public/room/order/:id
 */
router.get('/room/order/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('items.item', 'name price imageUrl')
            .select('status orderType total customerName roomService statusHistory estimatedReadyTime createdAt items');

        if (!order || order.orderType !== 'room-service') {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json({ order });
    } catch (error) {
        console.error('Get room order error:', error);
        res.status(500).json({ error: 'Failed to fetch order' });
    }
});

export default router;
