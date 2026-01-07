import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
    createReaction,
    getReactions,
    getWaiterStats,
    getRestaurantStats
} from '../controllers/clientReactionController.js';

const router = express.Router();

// Middleware to check if user can view reactions
const canViewReactions = (req, res, next) => {
    const allowedRoles = ['Owner', 'Manager', 'Waiter'];
    if (!req.user || !allowedRoles.includes(req.user.role?.name)) {
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
    next();
};

// Public route - clients can create reactions without auth
router.post('/', createReaction);

// Protected routes - require authentication
router.get('/', authenticateToken, canViewReactions, getReactions);
router.get('/waiter-stats', authenticateToken, canViewReactions, getWaiterStats);
router.get('/restaurant-stats', authenticateToken, canViewReactions, getRestaurantStats);

export default router;
