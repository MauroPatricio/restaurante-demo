import express from 'express';
import QRCode from 'qrcode';
import HotelRoom from '../models/HotelRoom.js';
import Order from '../models/Order.js';
import { authenticateToken, authorizeRoles, checkSubscription } from '../middleware/auth.js';
import { generateTableToken } from '../utils/qrSecurity.js';

const router = express.Router();

/**
 * Generate a QR code data URL and token for a hotel room
 */
const generateRoomQR = async (restaurantId, roomId) => {
    const token = generateTableToken(restaurantId, roomId);
    const baseUrl = process.env.CLIENT_MENU_URL || 'http://localhost:5175';
    const qrUrl = `${baseUrl}/room/${restaurantId}?room=${roomId}&token=${token}`;
    const qrCode = await QRCode.toDataURL(qrUrl);
    return { qrCode, qrToken: token, qrUrl };
};

// ─── GET all rooms for a restaurant ───────────────────────────────────────────
router.get('/restaurant/:restaurantId', authenticateToken, async (req, res) => {
    try {
        const rooms = await HotelRoom.find({ restaurant: req.params.restaurantId })
            .sort({ floor: 1, number: 1 });
        res.json({ rooms });
    } catch (err) {
        console.error('Get rooms error:', err);
        res.status(500).json({ error: 'Failed to fetch rooms' });
    }
});

// ─── POST create a room ────────────────────────────────────────────────────────
router.post('/', authenticateToken, authorizeRoles('owner', 'admin', 'manager'), checkSubscription, async (req, res) => {
    try {
        const { restaurant, number, floor, label, notes } = req.body;

        if (!restaurant || !number) {
            return res.status(400).json({ error: 'Restaurant and room number are required' });
        }

        // Create room first to get its _id
        const room = await HotelRoom.create({ restaurant, number, floor, label, notes });

        // Generate QR
        const { qrCode, qrToken } = await generateRoomQR(restaurant, room._id.toString());
        room.qrCode = qrCode;
        room.qrToken = qrToken;
        await room.save();

        res.status(201).json({ message: 'Quarto criado com sucesso', room });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ error: 'Já existe um quarto com esse número neste restaurante' });
        }
        console.error('Create room error:', err);
        res.status(500).json({ error: 'Failed to create room', details: err.message });
    }
});

// ─── PATCH update a room ───────────────────────────────────────────────────────
router.patch('/:id', authenticateToken, authorizeRoles('owner', 'admin', 'manager'), async (req, res) => {
    try {
        const allowed = ['number', 'floor', 'label', 'active', 'notes'];
        const updates = {};
        allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

        const room = await HotelRoom.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
        if (!room) return res.status(404).json({ error: 'Room not found' });

        res.json({ message: 'Quarto atualizado', room });
    } catch (err) {
        console.error('Update room error:', err);
        res.status(500).json({ error: 'Failed to update room' });
    }
});

// ─── DELETE a room ─────────────────────────────────────────────────────────────
router.delete('/:id', authenticateToken, authorizeRoles('owner', 'admin', 'manager'), async (req, res) => {
    try {
        const room = await HotelRoom.findByIdAndDelete(req.params.id);
        if (!room) return res.status(404).json({ error: 'Room not found' });
        res.json({ message: 'Quarto eliminado' });
    } catch (err) {
        console.error('Delete room error:', err);
        res.status(500).json({ error: 'Failed to delete room' });
    }
});

// ─── POST regenerate QR (e.g. after check-out) ────────────────────────────────
router.post('/:id/regenerate-qr', authenticateToken, authorizeRoles('owner', 'admin', 'manager'), async (req, res) => {
    try {
        const room = await HotelRoom.findById(req.params.id);
        if (!room) return res.status(404).json({ error: 'Room not found' });

        const { qrCode, qrToken } = await generateRoomQR(room.restaurant.toString(), room._id.toString());
        room.qrCode = qrCode;
        room.qrToken = qrToken;
        await room.save();

        res.json({ message: 'QR Code regenerado com sucesso', qrCode });
    } catch (err) {
        console.error('Regenerate QR error:', err);
        res.status(500).json({ error: 'Failed to regenerate QR' });
    }
});

// ─── GET room-service orders for a restaurant ─────────────────────────────────
router.get('/orders/:restaurantId', authenticateToken, async (req, res) => {
    try {
        const { status, limit = 100 } = req.query;

        const query = {
            restaurant: req.params.restaurantId,
            orderType: 'room-service'
        };

        if (status) {
            query.status = status.includes(',') ? { $in: status.split(',') } : status;
        }

        const orders = await Order.find(query)
            .populate('items.item', 'name price imageUrl')
            .populate('roomService.room', 'number floor label')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        res.json({ orders });
    } catch (err) {
        console.error('Get room orders error:', err);
        res.status(500).json({ error: 'Failed to fetch room orders' });
    }
});

export default router;
