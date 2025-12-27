import express from 'express';
import Restaurant from '../models/Restaurant.js';
import Table from '../models/Table.js';
import Order from '../models/Order.js';
import { validateTableToken } from '../utils/qrSecurity.js';

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
        if (!restaurant.subscription || restaurant.subscription.status !== 'active') {
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

        if (!table.active || table.status === 'disabled') {
            return res.status(403).json({
                error: 'Table inactive',
                message: 'Mesa inválida ou indisponível. Contacte o atendimento.'
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
        const { restaurantId, tableId, token, items, customerName, notes } = req.body;

        // Validate token
        if (!validateTableToken(token, restaurantId, tableId)) {
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

        if (!restaurant || !restaurant.active) {
            return res.status(403).json({
                error: 'Restaurant unavailable',
                message: 'Restaurante não disponível no momento'
            });
        }

        if (!restaurant.subscription || restaurant.subscription.status !== 'active') {
            return res.status(403).json({
                error: 'Subscription expired',
                message: 'Não é possível fazer pedidos no momento'
            });
        }

        if (!table || !table.active) {
            return res.status(403).json({
                error: 'Table unavailable',
                message: 'Mesa não disponível'
            });
        }

        // Calculate total
        const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // Create order
        const order = await Order.create({
            restaurant: restaurantId,
            table: tableId,
            tableNumber: table.number,
            items,
            total,
            customerName: customerName || 'Cliente',
            notes,
            status: 'pending',
            type: 'dine-in',
            source: 'qr-menu'
        });

        // Update table status to occupied
        if (table.status === 'free') {
            table.status = 'occupied';
            await table.save();
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

export default router;
