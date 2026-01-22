import express from 'express';
import Restaurant from '../models/Restaurant.js';
import Table from '../models/Table.js';
import Order from '../models/Order.js';
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

export default router;
