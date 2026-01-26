import express from 'express';
import {
    restockItem,
    adjustStock,
    getLowStockItems,
    getStockMovements,
    getStockReport,
    getStockItems
} from '../controllers/stockController.js';
import { authenticateToken, authorizeRoles, checkSubscription } from '../middleware/auth.js';

const router = express.Router();

// Restock and adjustment (Manager/Owner/Admin only)
router.post('/restock', authenticateToken, authorizeRoles('owner', 'manager', 'admin'), restockItem);
router.post('/adjust', authenticateToken, authorizeRoles('owner', 'manager', 'admin'), adjustStock);

// Read-only endpoints (accessible to waiters too)
router.get('/:restaurantId/items', authenticateToken, checkSubscription, getStockItems);
router.get('/:restaurantId/low-stock', authenticateToken, checkSubscription, getLowStockItems);
router.get('/:restaurantId/movements', authenticateToken, checkSubscription, getStockMovements);
router.get('/:restaurantId/report', authenticateToken, authorizeRoles('owner', 'manager', 'admin'), checkSubscription, getStockReport);

export default router;
