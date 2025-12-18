import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getUsers, createUser, updateUser, deleteUser, resetPassword } from '../controllers/userController.js';

const router = express.Router();

router.use(authenticateToken);

// TODO: permissions check middleware (e.g. require 'manage_users' permission)

router.get('/', getUsers);
router.post('/', createUser);
router.patch('/:id', updateUser);
router.delete('/:id', deleteUser);
router.post('/:id/reset-password', resetPassword);

export default router;
