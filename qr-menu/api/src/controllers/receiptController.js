import Order from '../models/Order.js';
import Restaurant from '../models/Restaurant.js';
// Note: We'll add PDF generation logic later if needed, for now we log and return data for frontend generation

export const generateReceipt = async (req, res) => {
    try {
        const { id } = req.params; // Order ID
        const userId = req.user._id;
        const { type } = req.body; // 'print', 'email', etc.

        const order = await Order.findById(id).populate('items.item');
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Optional: Check permissions (owner, manager, or waiter assigned to table/order)
        // For now, assuming authenticated user in 'admin' or 'owner' role is sufficient via route middleware

        // Log issuance
        order.receiptHistory.push({
            issuedAt: new Date(),
            issuedBy: userId,
            type: type || 'print'
        });

        await order.save();

        // Fetch restaurant for receipt details
        const restaurant = await Restaurant.findById(order.restaurant);

        // Return data for frontend to render receipt
        res.json({
            message: 'Receipt generated/logged',
            receipt: {
                orderNumber: order.orderNumber || order._id.toString().slice(-6).toUpperCase(),
                createdAt: order.createdAt,
                customer: order.customerName,
                table: order.tableNumber,
                items: order.items,
                totals: {
                    subtotal: order.subtotal,
                    discount: order.discount,
                    tax: order.tax,
                    serviceCharge: order.serviceCharge,
                    total: order.total
                },
                restaurant: {
                    name: restaurant.name,
                    address: restaurant.address,
                    phone: restaurant.phone,
                    email: restaurant.email,
                    logo: restaurant.logo
                },
                issuedAt: new Date(),
                issuedBy: req.user.name
            }
        });

    } catch (error) {
        console.error('Receipt Generation Error:', error);
        res.status(500).json({ error: 'Failed to generate receipt' });
    }
};
