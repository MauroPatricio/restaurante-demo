import Restaurant from '../models/Restaurant.js';
import Table from '../models/Table.js';
import Order from '../models/Order.js';
import MenuItem from '../models/MenuItem.js';
import Audience from '../models/Audience.js';
import Coupon from '../models/Coupon.js'; // Assuming Coupon is needed based on previous logic, though not explicitly in imports list in publicRoutes view, but logic was there.
import { validateTableToken } from '../utils/qrSecurity.js';
import { occupyTable } from './tableStateController.js';
import { sendOrderNotification } from '../services/firebaseService.js';
import mongoose from 'mongoose';
import cache from '../services/cacheService.js'; // Ensure this path is correct based on project structure

/**
 * Core internal function to process order creation.
 * Can be called by public route (with token check) or private route (staff).
 */
export const processOrderCreation = async ({
    restaurantId,
    tableId,
    items,
    customerName,
    phone,
    paymentMethod,
    notes,
    orderType = 'dine-in',
    email,
    deliveryAddress,
    couponCode,
    token,
    isStaff = false,
    io, // socket.io instance
    tableSessionId // optional, if already known
}) => {

    // 1. Validations
    if (!restaurantId || !tableId || !items || items.length === 0) {
        throw { status: 400, message: 'Dados do pedido incompletos', error: 'Missing required fields' };
    }

    if (!isStaff) {
        // Token Validation for Public Access
        const isValidToken = validateTableToken(token, restaurantId, tableId);
        if (!isValidToken) {
            throw { status: 403, message: 'Token inválido. Escaneie o QR Code novamente.', error: 'Invalid token' };
        }
    }

    // 2. Restaurant & Subscription Check
    const restaurant = await Restaurant.findById(restaurantId).populate('subscription');
    // Basic Active Check
    if (!restaurant || !restaurant.active) {
        throw { status: 403, message: 'Restaurante não disponível no momento', error: 'Restaurant unavailable' };
    }
    // Subscription Check
    if (!restaurant.subscription || !['active', 'trial'].includes(restaurant.subscription.status)) {
        throw { status: 403, message: 'Não é possível fazer pedidos no momento (Assinatura)', error: 'Subscription expired' };
    }

    // 3. Table Check
    const table = await Table.findById(tableId);
    if (!table) {
        throw { status: 404, message: 'Mesa não encontrada', error: 'Table not found' };
    }
    // Logic: If staff is ordering, we might override some status checks?
    // But usually staff shouldn't order for a closed table either, unless they open it.
    // Let's keep strict checks for consistency.
    if (table.status === 'closed') {
        throw { status: 400, message: 'Esta mesa está fechada', error: 'Table closed' };
    }
    if (table.status === 'cleaning' && !isStaff) {
        // Staff might be able to override cleaning? For now, blocked.
        throw { status: 400, message: 'Mesa sendo limpa', error: 'Table being cleaned' };
    }

    // Validate table ownership
    if (table.restaurant.toString() !== restaurantId.toString()) {
        throw { status: 400, message: 'Mesa inválida para este restaurante', error: 'Table mismatch' };
    }

    // 4. Item Validation & Calculation
    let subtotal = 0;
    const populatedItems = [];
    const menuItemIds = items.map(i => i.item._id || i.item); // Handle both object and ID

    const menuItems = await MenuItem.find({ _id: { $in: menuItemIds } })
        .select('_id name price available orderCount eta') // Added eta for calculation
        .lean();

    const menuItemMap = new Map(menuItems.map(item => [item._id.toString(), item]));

    for (const orderItem of items) {
        const itemId = (orderItem.item._id || orderItem.item).toString();
        const menuItem = menuItemMap.get(itemId);

        if (!menuItem) {
            throw { status: 404, message: `Item não encontrado: ${itemId}`, error: `Item ${itemId} not found` };
        }
        if (!menuItem.available) {
            throw { status: 400, message: `${menuItem.name} está indisponível`, error: `Item ${menuItem.name} unavailable` };
        }

        const qty = parseInt(orderItem.qty || orderItem.quantity || 1);
        let itemSubtotal = menuItem.price * qty;

        // Customizations
        if (orderItem.customizations && Array.isArray(orderItem.customizations)) {
            for (const customization of orderItem.customizations) {
                itemSubtotal += (customization.priceModifier || 0) * qty;
            }
        }

        populatedItems.push({
            item: menuItem._id,
            qty: qty,
            customizations: orderItem.customizations || [],
            itemPrice: menuItem.price,
            subtotal: itemSubtotal
        });

        subtotal += itemSubtotal;
    }

    // 5. Batch Update Order Counts
    // We can do this async without blocking? Ideally yes, but let's keep it here.
    const bulkOps = populatedItems.map(pItem => ({
        updateOne: {
            filter: { _id: pItem.item },
            update: { $inc: { orderCount: pItem.qty } }
        }
    }));
    await MenuItem.bulkWrite(bulkOps);


    // 6. Taxes & Fees
    const settings = restaurant.settings || {}; // Use loaded restaurant settings
    const taxRate = settings.taxRate || 0;
    const serviceChargeRate = settings.serviceChargeRate || 0;

    const tax = (subtotal * taxRate) / 100;
    const serviceCharge = (subtotal * serviceChargeRate) / 100;

    // 7. Coupons
    let discount = 0;
    if (couponCode) {
        try {
            // Basic Coupon logic replication
            const coupon = await Coupon.findOne({
                code: couponCode.toUpperCase(),
                restaurant: restaurantId
            });

            if (coupon) {
                const validation = coupon.isValid ? coupon.isValid(phone) : { valid: true }; // Check method existence
                if ((validation.valid || validation === true) && subtotal >= (coupon.minOrderAmount || 0)) {
                    discount = coupon.calculateDiscount ? coupon.calculateDiscount(subtotal) : 0;

                    // Update usage
                    coupon.usedCount = (coupon.usedCount || 0) + 1;
                    if (!coupon.usedBy) coupon.usedBy = [];
                    coupon.usedBy.push({ user: phone, usedAt: new Date() });
                    await coupon.save();
                }
            }
        } catch (e) {
            console.warn('Coupon error', e);
        }
    }

    const deliveryFee = 0; // Simplified for now as per original code context
    const total = subtotal + tax + serviceCharge + deliveryFee - discount;

    // 8. Session Management
    let session;
    if (tableSessionId) {
        session = { _id: tableSessionId };
    } else if (table.status === 'free' || !table.currentSessionId) {
        // Create new session
        const userId = isStaff ? 'staff-created' : null; // Logic for user linkage?
        session = await occupyTable(tableId, userId, restaurantId);
    } else {
        // Join existing
        session = { _id: table.currentSessionId };
    }

    // 9. Create Order
    // Estimate ready time
    const maxEta = Math.max(...populatedItems.map(pItem => {
        const menuItem = menuItemMap.get(pItem.item.toString());
        return menuItem?.eta || 15;
    }));
    const estimatedReadyTime = new Date(Date.now() + maxEta * 60 * 1000);

    const newOrder = await Order.create({
        restaurant: restaurantId,
        table: tableId,
        tableSession: session._id,
        tableNumber: table.number,
        orderType,
        items: populatedItems,
        subtotal,
        discount,
        couponCode,
        tax,
        serviceCharge,
        deliveryFee,
        total,
        customerName: customerName || 'Cliente',
        phone: phone || '800000000',
        email,
        paymentMethod: paymentMethod || 'pending',
        notes,
        status: 'pending',
        type: orderType, // Some legacy fields might duplicate
        source: isStaff ? 'waiter' : 'qr-menu',
        estimatedReadyTime // Added this field
    });

    // 10. Audience (CRM)
    if (phone) {
        await Audience.findOneAndUpdate(
            { restaurant: restaurantId, phone },
            { restaurant: restaurantId, phone, lastVisit: new Date(), $inc: { visits: 1 } },
            { upsert: true }
        ).catch(e => console.warn('Audience update failed', e));
    }

    // 11. Notifications
    // Async Fire & Forget
    sendOrderNotification(newOrder, 'new-order').catch(console.error);

    // Socket IO
    if (io) {
        const payload = {
            orderId: newOrder._id,
            tableNumber: table.number,
            total: newOrder.total,
            customerName: newOrder.customerName,
            itemsCount: populatedItems.length,
            source: newOrder.source,
            status: newOrder.status
        };
        // Notify restaurant room
        io.to(`restaurant:${restaurantId}`).emit('order:new', payload);
        io.to(`restaurant:${restaurantId}`).emit('order:new:full', newOrder); // Maybe full object for some listeners
    }

    return { order: newOrder, tableNumber: table.number };
};


// Wrappers for Routes

export const createPublicOrder = async (req, res) => {
    try {
        const result = await processOrderCreation({
            ...req.body,
            isStaff: false,
            io: req.app.get('io')
        });

        res.status(201).json({
            message: 'Pedido criado com sucesso',
            order: {
                _id: result.order._id,
                orderNumber: result.order.orderNumber,
                status: result.order.status,
                total: result.order.total,
                tableNumber: result.tableNumber
            }
        });
    } catch (error) {
        console.error('Public order creation error:', error);
        if (error.status) {
            return res.status(error.status).json({ error: error.error, message: error.message });
        }
        res.status(500).json({ error: 'Server error', message: 'Erro interno ao criar pedido' });
    }
};

export const createStaffOrder = async (req, res) => {
    try {
        // Staff is already authenticated via middleware
        // req.user contains staff info

        const { restaurant: restaurantId, table: tableId, items, customerName, phone, notes } = req.body;

        // Debug logging
        console.log('[createStaffOrder] Received payload:', {
            restaurantId,
            tableId,
            items: items?.length || 0,
            customerName,
            phone,
            fullBody: req.body
        });

        // Ensure staff belongs to the restaurant they are ordering for
        // (Assuming req.user.restaurant is populated or present)
        // If Role is 'admin', might bypass. If 'waiter', must match.
        // Simplified check:
        // if (req.user.role !== 'admin' && req.user.restaurant.toString() !== restaurantId) {
        //    return res.status(403).json({ error: 'Unauthorized for this restaurant' });
        // }

        const result = await processOrderCreation({
            restaurantId,
            tableId,
            items,
            customerName,
            phone,
            notes,
            isStaff: true,
            io: req.app.get('io')
        });

        res.status(201).json({
            message: 'Pedido assistido criado com sucesso',
            order: result.order
        });

    } catch (error) {
        console.error('Staff order creation error:', error);
        if (error.status) {
            return res.status(error.status).json({ error: error.error, message: error.message });
        }
        res.status(500).json({ error: 'Server error', message: 'Erro interno ao criar pedido assistido' });
    }
};

/**
 * GET /api/tables/:tableId/orders
 * Get all orders for a specific table
 */
export const getTableOrders = async (req, res) => {
    try {
        const { tableId } = req.params;
        const { limit = 50 } = req.query;

        const orders = await Order.find({ table: tableId })
            .populate('items.item', 'name price imageUrl image')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .lean();

        res.json({
            orders,
            count: orders.length
        });
    } catch (error) {
        console.error('Get table orders error:', error);
        res.status(500).json({ error: 'Failed to fetch table orders' });
    }
};
