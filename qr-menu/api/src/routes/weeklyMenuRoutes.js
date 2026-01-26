import express from 'express';
import {
    getAllWeeklyMenus,
    getActiveWeeklyMenu,
    createWeeklyMenu,
    updateWeeklyMenu,
    activateWeeklyMenu,
    deactivateWeeklyMenu,
    archiveWeeklyMenu
} from '../controllers/weeklyMenuController.js';
import { authenticateToken, authorizeRoles, checkSubscription } from '../middleware/auth.js';

const router = express.Router();

// Public route - get active weekly menu
router.get('/:restaurantId/active', getActiveWeeklyMenu);

// Admin routes - menu management
router.get('/:restaurantId', authenticateToken, authorizeRoles('owner', 'manager', 'admin'), getAllWeeklyMenus);
router.post('/', authenticateToken, authorizeRoles('owner', 'manager', 'admin'), checkSubscription, createWeeklyMenu);
router.patch('/:id', authenticateToken, authorizeRoles('owner', 'manager', 'admin'), checkSubscription, updateWeeklyMenu);
router.post('/:id/activate', authenticateToken, authorizeRoles('owner', 'manager', 'admin'), checkSubscription, activateWeeklyMenu);
router.post('/:id/deactivate', authenticateToken, authorizeRoles('owner', 'manager', 'admin'), checkSubscription, deactivateWeeklyMenu);
router.delete('/:id', authenticateToken, authorizeRoles('owner', 'manager', 'admin'), archiveWeeklyMenu);

export default router;
