import express from 'express';
import { getOwnerStats, getRestaurantStats } from '../controllers/analyticsController.js';
import { authenticateToken, authorizeRoles, checkSubscription } from '../middleware/auth.js';

const router = express.Router();

// Owner Global Stats (Aggregated)
router.get('/owner', authenticateToken, authorizeRoles('owner', 'admin'), getOwnerStats);

// Single Restaurant Detailed Stats
router.get('/restaurant/:id', authenticateToken, checkSubscription, getRestaurantStats);

export default router;
