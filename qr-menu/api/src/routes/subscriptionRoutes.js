import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getSubscription, createTransaction, getTransactions, reviewTransaction } from '../controllers/subscriptionController.js';

const router = express.Router();

router.use(authenticateToken);

// Existing route
router.get('/:restaurantId', getSubscription);

// New routes
router.post('/pay', createTransaction);
router.get('/transactions/list', getTransactions); // List all or filter
router.patch('/transactions/:id/review', reviewTransaction); // Approve/Reject

export default router;
