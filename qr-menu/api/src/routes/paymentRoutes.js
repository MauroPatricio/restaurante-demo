import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    initiateMpesaPayment,
    initiateEmolaPayment,
    processBankReceiptPayment,
    recordCashPayment,
    processPaymentWebhook,
    verifyPaymentStatus
} from '../services/paymentService.js';
import { authenticateToken, checkSubscription } from '../middleware/auth.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for receipt uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/receipts/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.random().toString(36).substring(7);
        cb(null, 'receipt-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Only images and PDF files are allowed'));
        }
    }
});

// Initiate Mpesa payment
router.post('/mpesa', authenticateToken, checkSubscription, async (req, res) => {
    try {
        const { orderId, subscriptionId, amount, phoneNumber } = req.body;

        if (!phoneNumber || !amount) {
            return res.status(400).json({ error: 'Phone number and amount required' });
        }

        const paymentData = {
            type: orderId ? 'order' : 'subscription',
            orderId,
            subscriptionId,
            restaurantId: req.restaurant._id,
            amount,
            phoneNumber
        };

        const result = await initiateMpesaPayment(paymentData);

        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error('Mpesa payment route error:', error);
        res.status(500).json({ error: 'Payment initiation failed' });
    }
});

// Initiate eMola payment
router.post('/emola', authenticateToken, checkSubscription, async (req, res) => {
    try {
        const { orderId, subscriptionId, amount, phoneNumber } = req.body;

        if (!phoneNumber || !amount) {
            return res.status(400).json({ error: 'Phone number and amount required' });
        }

        const paymentData = {
            type: orderId ? 'order' : 'subscription',
            orderId,
            subscriptionId,
            restaurantId: req.restaurant._id,
            amount,
            phoneNumber
        };

        const result = await initiateEmolaPayment(paymentData);

        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error('eMola payment route error:', error);
        res.status(500).json({ error: 'Payment initiation failed' });
    }
});

// Upload bank receipt (BIM/BCI)
router.post('/bank', authenticateToken, checkSubscription, upload.single('receipt'), async (req, res) => {
    try {
        const { orderId, subscriptionId, amount, bank, accountNumber, receiptNumber, notes } = req.body;

        if (!req.file) {
            return res.status(400).json({ error: 'Receipt file required' });
        }

        if (!amount || !bank) {
            return res.status(400).json({ error: 'Amount and bank required' });
        }

        const paymentData = {
            type: orderId ? 'order' : 'subscription',
            orderId,
            subscriptionId,
            restaurantId: req.restaurant._id,
            amount,
            bank, // 'bim' or 'bci'
            accountNumber,
            receiptNumber,
            notes
        };

        const result = await processBankReceiptPayment(paymentData, req.file);

        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error('Bank payment route error:', error);
        res.status(500).json({ error: 'Payment processing failed' });
    }
});

// Record cash payment
router.post('/cash', authenticateToken, checkSubscription, async (req, res) => {
    try {
        const { orderId, amount, receiptNumber, notes } = req.body;

        if (!orderId || !amount) {
            return res.status(400).json({ error: 'Order ID and amount required' });
        }

        const paymentData = {
            orderId,
            restaurantId: req.restaurant._id,
            amount,
            receiptNumber,
            receivedBy: req.user._id,
            notes
        };

        const result = await recordCashPayment(paymentData);

        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error('Cash payment route error:', error);
        res.status(500).json({ error: 'Payment recording failed' });
    }
});

// Webhook endpoint for payment providers
router.post('/webhook', async (req, res) => {
    try {
        // Validate webhook signature/secret here if needed
        const webhookData = req.body;

        const result = await processPaymentWebhook(webhookData);

        if (result.success) {
            res.json({ message: 'Webhook processed successfully' });
        } else {
            res.status(500).json({ error: 'Webhook processing failed' });
        }
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// Get payment status by reference
router.get('/:reference', authenticateToken, async (req, res) => {
    try {
        const { reference } = req.params;

        const result = await verifyPaymentStatus(reference);

        if (result.success) {
            res.json(result);
        } else {
            res.status(404).json(result);
        }
    } catch (error) {
        console.error('Payment status route error:', error);
        res.status(500).json({ error: 'Failed to fetch payment status' });
    }
});

export default router;
