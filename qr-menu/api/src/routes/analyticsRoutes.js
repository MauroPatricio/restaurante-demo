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
    getTableCustomerHistory,
    anonymizeCustomer,
    getCashFlowReport,
    getProfitReport,
    getOrdersReport
} from '../controllers/analyticsController.js';
import {
    getAllWaiterAnalytics,
    getWaiterDetailedAnalytics,
    getWaiterRanking,
    getWaiterTableHistory
} from '../controllers/waiterAnalyticsController.js';
import {
    getKitchenDashboard,
    getDishPrepStats,
    getKitchenTimeline,
    getKitchenShiftReport
} from '../controllers/kitchenAnalyticsController.js';
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
router.get('/:id/cash-flow', authenticateToken, checkSubscription, getCashFlowReport);
router.get('/:id/profit', authenticateToken, checkSubscription, getProfitReport);
router.get('/:id/orders-report', authenticateToken, checkSubscription, getOrdersReport);
router.delete('/:id/customers/:phone', authenticateToken, authorizeRoles('owner', 'manager', 'admin'), checkSubscription, anonymizeCustomer);

// ============ WAITER PERFORMANCE ANALYTICS ============
router.get('/:id/waiters',
    authenticateToken,
    authorizeRoles('owner', 'manager', 'admin'),
    checkSubscription,
    getAllWaiterAnalytics
);
router.get('/:id/waiters/ranking',
    authenticateToken,
    authorizeRoles('owner', 'manager', 'admin'),
    checkSubscription,
    getWaiterRanking
);
router.get('/:id/waiters/:waiterId/tables',
    authenticateToken,
    authorizeRoles('owner', 'manager', 'admin'),
    checkSubscription,
    getWaiterTableHistory
);
router.get('/:id/waiters/:waiterId',
    authenticateToken,
    authorizeRoles('owner', 'manager', 'admin'),
    checkSubscription,
    getWaiterDetailedAnalytics
);

// ============ KITCHEN ANALYTICS ============
router.get('/:id/kitchen',
    authenticateToken,
    authorizeRoles('owner', 'manager', 'admin'),
    checkSubscription,
    getKitchenDashboard
);
router.get('/:id/kitchen/dishes',
    authenticateToken,
    authorizeRoles('owner', 'manager', 'admin'),
    checkSubscription,
    getDishPrepStats
);
router.get('/:id/kitchen/timeline',
    authenticateToken,
    authorizeRoles('owner', 'manager', 'admin'),
    checkSubscription,
    getKitchenTimeline
);
router.get('/:id/kitchen/shifts',
    authenticateToken,
    authorizeRoles('owner', 'manager', 'admin'),
    checkSubscription,
    getKitchenShiftReport
);

router.get('/:id/hall', authenticateToken, checkSubscription, getHallAnalytics);
router.get('/:id/hall/:tableId/history', authenticateToken, checkSubscription, getTableCustomerHistory);

export default router;
