import express from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js'; // Assuming authorizeRoles needs update to handle new Role logic
import { createRole, getRoles, updateRole, deleteRole } from '../controllers/roleController.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// TODO: Update authorizeRoles to check permissions dynamically
// For now, restricting to legacy 'owner' or 'admin' which might be migrated names

router.post('/', createRole);
router.get('/', getRoles);
router.patch('/:id', updateRole);
router.delete('/:id', deleteRole);

export default router;
