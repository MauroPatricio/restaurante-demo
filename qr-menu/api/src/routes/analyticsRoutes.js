import express from 'express';
import {
    getOwnerStats,
    getRestaurantStats,
    getFinancialReport,
    getSalesReport,
    getOperationalReport,
    getInventoryReport,
    getCustomerAnalytics,
    getHallAnalytics,
    getTableCustomerHistory
} from '../controllers/analyticsController.js';
import { authenticateToken, authorizeRoles, checkSubscription } from '../middleware/auth.js';

const router = express.Router();

// Owner Global Stats (Aggregated)
router.get('/owner', authenticateToken, authorizeRoles('owner', 'admin'), getOwnerStats);
router.post('/owner/clear-stats', authenticateToken, authorizeRoles('owner', 'admin'), async (req, res) => {
    const { clearOwnerStats } = await import('../controllers/analyticsController.js');
    clearOwnerStats(req, res);
});

router.post('/orders/:id/receipt', authenticateToken, async (req, res) => {
    const { generateReceipt } = await import('../controllers/receiptController.js');
    generateReceipt(req, res);
});

// Single Restaurant Detailed Stats
router.get('/restaurant/:id', authenticateToken, checkSubscription, getRestaurantStats);

// Advanced Reporting Endpoints
router.get('/:id/financial', authenticateToken, checkSubscription, getFinancialReport);
router.get('/:id/sales', authenticateToken, checkSubscription, getSalesReport);
router.get('/:id/operational', authenticateToken, checkSubscription, getOperationalReport);
router.get('/:id/inventory', authenticateToken, checkSubscription, getInventoryReport);
router.get('/:id/customers', authenticateToken, checkSubscription, getCustomerAnalytics);
router.get('/:id/hall', authenticateToken, checkSubscription, getHallAnalytics);
router.get('/:id/hall/:tableId/history', authenticateToken, checkSubscription, getTableCustomerHistory);

export default router;
