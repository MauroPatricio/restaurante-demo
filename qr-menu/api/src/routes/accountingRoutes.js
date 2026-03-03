import express from 'express';
import {
    getAccountingStats,
    getPlanOfAccounts,
    getGeneralLedger,
    getTrialBalance,
    getFiscalInvoices,
    handleVoidInvoice,
    getCashSessions,
    openSession,
    closeSession,
    createManualTransaction,
    getPendingOrdersForLedger,
    postBatchTransactions,
    getRazao,
    getDRE,
    getIVAReport
} from '../controllers/accountingController.js';
import { authenticateToken, authorizeRoles, checkSubscription } from '../middleware/auth.js';

const router = express.Router();

// All accounting routes require authentication and active subscription
router.use(authenticateToken);
router.use(checkSubscription);

// Dashboard & Setup
router.get('/stats', authorizeRoles('owner', 'manager', 'contabilista', 'admin'), getAccountingStats);
router.get('/accounts', authorizeRoles('owner', 'manager', 'contabilista', 'admin'), getPlanOfAccounts);
router.get('/ledger', authorizeRoles('owner', 'manager', 'contabilista', 'admin'), getGeneralLedger);
router.get('/trial-balance', authorizeRoles('owner', 'manager', 'contabilista', 'admin'), getTrialBalance);

// Fiscal Invoices
router.get('/invoices', authorizeRoles('owner', 'manager', 'contabilista', 'admin'), getFiscalInvoices);
router.post('/invoices/:id/void', authorizeRoles('owner', 'manager', 'admin'), handleVoidInvoice);

// Cash Management
router.get('/cash-sessions', authorizeRoles('owner', 'manager', 'contabilista', 'admin'), getCashSessions);
router.post('/cash-sessions/open', authorizeRoles('owner', 'manager', 'waiter', 'cashier'), openSession);
router.post('/cash-sessions/:id/close', authorizeRoles('owner', 'manager', 'waiter', 'cashier'), closeSession);

// Manual Transactions
router.post('/transactions', authorizeRoles('owner', 'manager', 'contabilista', 'admin'), createManualTransaction);

// Automated Batch Transactions
router.get('/pending-orders', authorizeRoles('owner', 'manager', 'contabilista', 'admin'), getPendingOrdersForLedger);
router.post('/batch', authorizeRoles('owner', 'manager', 'contabilista', 'admin'), postBatchTransactions);

// Advanced Reporting
router.get('/razao', authorizeRoles('owner', 'manager', 'contabilista', 'admin'), getRazao);
router.get('/dre', authorizeRoles('owner', 'manager', 'contabilista', 'admin'), getDRE);
router.get('/iva-report', authorizeRoles('owner', 'manager', 'contabilista', 'admin'), getIVAReport);

export default router;
