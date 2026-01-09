import express from 'express';
import Restaurant from '../models/Restaurant.js';
import Table from '../models/Table.js';
import Order from '../models/Order.js';
import { validateTableToken } from '../utils/qrSecurity.js';
import { occupyTable } from '../controllers/tableStateController.js';

const router = express.Router();

/**
 * Validate restaurant, table, and token
 * GET /api/public/menu/validate?r=restaurantId&t=tableId&token=xxx
 */
router.get('/menu/validate', async (req, res) => {
    try {
        const { r: restaurantId, t: tableId, token } = req.query;

        // Validate required parameters
        if (!restaurantId || !tableId || !token) {
            return res.status(400).json({
                error: 'Missing required parameters',
                details: 'URL must include r (restaurant), t (table), and token'
            });
        }

        // Validate token first (prevent unnecessary DB queries for invalid tokens)
        const isValidToken = validateTableToken(token, restaurantId, tableId);
        if (!isValidToken) {
            return res.status(403).json({
                error: 'Invalid or expired QR code',
                message: 'Por favor, escaneie o QR Code novamente'
            });
        }

        // Find restaurant and populate subscription
        const restaurant = await Restaurant.findById(restaurantId).populate('subscription');

        if (!restaurant) {
            return res.status(404).json({
                error: 'Restaurant not found',
                message: 'Restaurante não encontrado. O QR Code pode estar desatualizado.'
            });
        }

        if (!restaurant.active) {
            return res.status(403).json({
                error: 'Restaurant inactive',
                message: 'Este restaurante está temporariamente inativo.'
            });
        }

        // Check subscription status
        if (!restaurant.subscription || !['active', 'trial'].includes(restaurant.subscription.status)) {
            return res.status(403).json({
                error: 'Subscription expired',
                message: 'Este restaurante encontra-se temporariamente indisponível.'
            });
        }

        // Check subscription expiry
        if (restaurant.subscription.endDate && new Date(restaurant.subscription.endDate) < new Date()) {
            return res.status(403).json({
                error: 'Subscription expired',
                message: 'Este restaurante encontra-se temporariamente indisponível.'
            });
        }

        // Find table
        const table = await Table.findById(tableId);

        if (!table) {
            return res.status(404).json({
                error: 'Table not found',
                message: 'Mesa não encontrada. Por favor, escaneie o QR Code novamente.'
            });
        }

        // Check if table is closed
        if (table.status === 'closed') {
            return res.status(403).json({
                error: 'Table closed',
                message: 'Esta mesa encontra-se temporariamente indisponível.'
            });
        }

        // Verify table belongs to restaurant
        if (table.restaurant.toString() !== restaurantId) {
            return res.status(403).json({
                error: 'Invalid table',
                message: 'Mesa inválida para este restaurante.'
            });
        }

        // All validations passed
        res.json({
            valid: true,
            restaurant: {
                _id: restaurant._id,
                name: restaurant.name,
                logo: restaurant.logo,
                active: restaurant.active
            },
            table: {
                _id: table._id,
                number: table.number,
                capacity: table.capacity,
                location: table.location,
                status: table.status
            }
        });
    } catch (error) {
        console.error('Menu validation error:', error);
        res.status(500).json({
            error: 'Validation failed',
            message: 'Erro ao validar QR Code. Por favor, tente novamente.'
        });
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

        // Get restaurant with menu items
        const restaurant = await Restaurant.findById(restaurantId).select('name logo menuItems');

        if (!restaurant) {
            return res.status(404).json({
                error: 'Restaurant not found'
            });
        }

        res.json({
            restaurant,
            tableId
        });
    } catch (error) {
        console.error('Get menu error:', error);
        res.status(500).json({
            error: 'Failed to load menu'
        });
    }
});

/**
 * Create order from client menu
 * POST /api/public/orders
 */
router.post('/orders', async (req, res) => {
    try {
        const { restaurantId, tableId, token, items, customerName, phone, paymentMethod, notes } = req.body;

        console.log('📦 Order submission attempt:', {
            restaurantId,
            tableId,
            token: token ? `${token.substring(0, 20)}...` : 'MISSING',
            itemsCount: items?.length,
            customerName
        });

        // Validate token
        const isValidToken = validateTableToken(token, restaurantId, tableId);
        console.log('🔐 Token validation result:', isValidToken);

        if (!isValidToken) {
            console.warn('❌ Token validation failed:', {
                restaurantId,
                tableId,
                tokenProvided: !!token
            });
            return res.status(403).json({
                error: 'Invalid token',
                message: 'Token inválido. Por favor, escaneie o QR Code novamente.'
            });
        }

        // Validate required fields
        if (!restaurantId || !tableId || !items || items.length === 0) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'Dados do pedido incompletos'
            });
        }

        // Verify restaurant and table still valid
        const restaurant = await Restaurant.findById(restaurantId).populate('subscription');
        const table = await Table.findById(tableId);

        console.log('🏪 Restaurant check:', {
            found: !!restaurant,
            active: restaurant?.active,
            hasSubscription: !!restaurant?.subscription,
            subscriptionStatus: restaurant?.subscription?.status
        });

        if (!restaurant || !restaurant.active) {
            console.warn('❌ Restaurant unavailable:', {
                found: !!restaurant,
                active: restaurant?.active
            });
            return res.status(403).json({
                error: 'Restaurant unavailable',
                message: 'Restaurante não disponível no momento'
            });
        }

        if (!restaurant.subscription || !['active', 'trial'].includes(restaurant.subscription.status)) {
            console.warn('❌ Subscription issue:', {
                hasSubscription: !!restaurant.subscription,
                status: restaurant.subscription?.status,
                expected: 'active or trial'
            });
            return res.status(403).json({
                error: 'Subscription expired',
                message: 'Não é possível fazer pedidos no momento'
            });
        }

        console.log('✅ All validations passed, creating order...');

        if (!table) {
            return res.status(404).json({
                error: 'Table not found',
                message: 'Mesa não encontrada.'
            });
        }

        // Check if table is available for orders
        if (table.status === 'closed') {
            return res.status(400).json({
                error: 'Table closed',
                message: 'Esta mesa está atualmente fechada e indisponível para pedidos'
            });
        }

        if (table.status === 'cleaning') {
            return res.status(400).json({
                error: 'Table being cleaned',
                message: 'Esta mesa está sendo limpa. Por favor, aguarde um momento.'
            });
        }

        // Occupy table and create/get session
        let session;
        if (table.status === 'free' || !table.currentSessionId) {
            session = await occupyTable(tableId, null, restaurantId); // null userId for client orders
        } else {
            session = { _id: table.currentSessionId };
        }

        // Calculate total and normalize items for schema compatibility
        let calculatedTotal = 0;
        const normalizedItems = (items || []).map(item => {
            const qty = item.quantity || item.qty || 1;
            const price = item.price || 0;
            const subtotal = price * qty;
            calculatedTotal += subtotal;

            return {
                item: item.item,
                qty: qty,
                itemPrice: price,
                subtotal: subtotal,
                customizations: item.customizations || []
            };
        });

        // Create order
        const order = await Order.create({
            restaurant: restaurantId,
            table: tableId,
            tableSession: session._id, // Link to session
            tableNumber: table.number,
            items: normalizedItems,
            total: calculatedTotal,
            customerName: customerName || 'Cliente',
            phone: phone || '800000000', // Ensure phone is present as it is required in schema
            paymentMethod: paymentMethod || 'pending',
            notes,
            status: 'pending',
            type: 'dine-in',
            source: 'qr-menu'
        });

        // Emit socket event for the dashboard
        if (req.io) {
            req.io.to(`restaurant-${restaurantId}`).emit('order:new', {
                orderId: order._id,
                tableNumber: table.number,
                total: order.total,
                customerName: order.customerName,
                itemsCount: normalizedItems.length
            });
        }

        res.status(201).json({
            message: 'Pedido criado com sucesso',
            order: {
                _id: order._id,
                orderNumber: order.orderNumber,
                status: order.status,
                total: order.total,
                tableNumber: table.number
            }
        });
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({
            error: 'Failed to create order',
            message: 'Erro ao criar pedido. Por favor, tente novamente.'
        });
    }
});

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

export default router;
