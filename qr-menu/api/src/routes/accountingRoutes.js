import express from 'express';
import {
    getAccountingStats,
    getPlanOfAccounts,
    createAccount,
    updateAccount,
    getGeneralLedger,
    getTrialBalance,
    getBalanceSheet,
    getFiscalInvoices,
    handleVoidInvoice,
    handleVoidTransaction,
    getCashSessions,
    openSession,
    closeSession,
    createManualTransaction,
    createPurchaseEntry,
    getPendingOrdersForLedger,
    postBatchTransactions,
    getRazao,
    getDRE,
    getIVAReport
} from '../controllers/accountingController.js';
import { authenticateToken, authorizeRoles, checkSubscription } from '../middleware/auth.js';

const router = express.Router();

// Todas as rotas de contabilidade requerem autenticação e subscrição activa
router.use(authenticateToken);
router.use(checkSubscription);

// ── Dashboard e Estatísticas ───────────────────────────────
router.get('/stats', authorizeRoles('owner', 'manager', 'contabilista', 'admin'), getAccountingStats);

// ── Plano de Contas (CRUD) ─────────────────────────────────
router.get('/accounts', authorizeRoles('owner', 'manager', 'contabilista', 'admin'), getPlanOfAccounts);
router.post('/accounts', authorizeRoles('owner', 'manager', 'contabilista', 'admin'), createAccount);
router.patch('/accounts/:id', authorizeRoles('owner', 'manager', 'contabilista', 'admin'), updateAccount);

// ── Livro Diário (General Ledger) ─────────────────────────
router.get('/ledger', authorizeRoles('owner', 'manager', 'contabilista', 'admin'), getGeneralLedger);

// ── Relatórios Financeiros ─────────────────────────────────
router.get('/trial-balance', authorizeRoles('owner', 'manager', 'contabilista', 'admin'), getTrialBalance);
router.get('/balance-sheet', authorizeRoles('owner', 'manager', 'contabilista', 'admin'), getBalanceSheet);
router.get('/razao', authorizeRoles('owner', 'manager', 'contabilista', 'admin'), getRazao);
router.get('/dre', authorizeRoles('owner', 'manager', 'contabilista', 'admin'), getDRE);
router.get('/iva-report', authorizeRoles('owner', 'manager', 'contabilista', 'admin'), getIVAReport);

// ── Facturas Fiscais ───────────────────────────────────────
router.get('/invoices', authorizeRoles('owner', 'manager', 'contabilista', 'admin'), getFiscalInvoices);
router.post('/invoices/:id/void', authorizeRoles('owner', 'manager', 'admin'), handleVoidInvoice);

// ── Gestão de Caixa ────────────────────────────────────────
router.get('/cash-sessions', authorizeRoles('owner', 'manager', 'contabilista', 'admin'), getCashSessions);
router.post('/cash-sessions/open', authorizeRoles('owner', 'manager', 'waiter', 'cashier'), openSession);
router.post('/cash-sessions/:id/close', authorizeRoles('owner', 'manager', 'waiter', 'cashier'), closeSession);

// ── Lançamentos Manuais ────────────────────────────────────
router.post('/transactions', authorizeRoles('owner', 'manager', 'contabilista', 'admin'), createManualTransaction);
router.post('/transactions/:id/void', authorizeRoles('owner', 'manager', 'contabilista', 'admin'), handleVoidTransaction);

// ── Lançamentos de Compras ─────────────────────────────────
router.post('/purchases', authorizeRoles('owner', 'manager', 'contabilista', 'admin'), createPurchaseEntry);

// ── Processamento em Lote (Vendas) ─────────────────────────
router.get('/pending-orders', authorizeRoles('owner', 'manager', 'contabilista', 'admin'), getPendingOrdersForLedger);
router.post('/batch', authorizeRoles('owner', 'manager', 'contabilista', 'admin'), postBatchTransactions);

export default router;
