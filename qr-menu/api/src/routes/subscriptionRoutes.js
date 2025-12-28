import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import isAdmin from '../middleware/isAdmin.js';
import {
    getSubscription,
    createTransaction,
    getTransactions,
    reviewTransaction,
    getAllSubscriptions,
    updateStatus,
    getAuditLogs
} from '../controllers/subscriptionController.js';

const router = express.Router();

router.use(authenticateToken);

// Admin-only routes (must be before other routes to avoid conflicts)
router.get('/admin/all', isAdmin, getAllSubscriptions);
router.patch('/admin/:id/status', isAdmin, updateStatus);
router.get('/admin/audit-logs', isAdmin, getAuditLogs);

// Existing routes
router.get('/:restaurantId', getSubscription);
router.get('/:restaurantId/history', getTransactions);

// Payment routes
router.post('/pay', createTransaction);
router.get('/transactions/list', getTransactions);
router.patch('/transactions/:id/review', reviewTransaction);

export default router;
