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
    getAuditLogs,
    getOwnersSummary,
    getBasePrice,
    updateBasePrice,
    getGlobalSubscriptionStatus
} from '../controllers/subscriptionController.js';

const router = express.Router();

router.use(authenticateToken);

// Admin-only routes (must be before other routes to avoid conflicts)
router.get('/admin/all', isAdmin, getAllSubscriptions);
router.get('/admin/owners', isAdmin, getOwnersSummary);
router.get('/admin/settings', isAdmin, getBasePrice);
router.post('/admin/settings', isAdmin, updateBasePrice);
router.patch('/admin/:id/status', isAdmin, updateStatus);
router.get('/admin/audit-logs', isAdmin, getAuditLogs);
router.get('/admin/transactions', isAdmin, getTransactions);
router.patch('/admin/transactions/:id/review', isAdmin, reviewTransaction);

// Global subscription status for multi-restaurant users
router.get('/global-status/:userId?', getGlobalSubscriptionStatus);

// Existing routes
router.get('/:restaurantId', getSubscription);
router.get('/:restaurantId/history', getTransactions);

// Payment routes
router.post('/pay', createTransaction);
router.get('/transactions/list', getTransactions);
router.patch('/transactions/:id/review', reviewTransaction);

export default router;
