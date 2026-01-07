import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
    createWaiterCall,
    getActiveCalls,
    acknowledgeCall,
    resolveCall,
    getCallHistory
} from '../controllers/waiterCallController.js';

const router = express.Router();

// Middleware to check if user can manage waiter calls
const canManageCalls = (req, res, next) => {
    const allowedRoles = ['Owner', 'Manager', 'Waiter'];
    if (!req.user || !allowedRoles.includes(req.user.role?.name)) {
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
    next();
};

// Public route - clients can create calls without auth
router.post('/', createWaiterCall);

// Protected routes - require authentication
router.get('/active', authenticateToken, canManageCalls, getActiveCalls);
router.post('/:id/acknowledge', authenticateToken, canManageCalls, acknowledgeCall);
router.post('/:id/resolve', authenticateToken, canManageCalls, resolveCall);
router.get('/history', authenticateToken, canManageCalls, getCallHistory);

export default router;
