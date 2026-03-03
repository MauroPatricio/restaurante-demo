import mongoose from 'mongoose';
import Account from '../models/Account.js';
import AccountingTransaction from '../models/AccountingTransaction.js';
import FiscalInvoice from '../models/FiscalInvoice.js';
import CashSession from '../models/CashSession.js';
import Order from '../models/Order.js';
import { voidInvoice, postTransaction, processPaidOrderEntry } from '../services/accountingService.js';
import AuditLog from '../models/AuditLog.js';

/**
 * Get General Ledger (Transaction History)
 */
export const getGeneralLedger = async (req, res) => {
    try {
        const { startDate, endDate, accountId, referenceType, status } = req.query;
        const query = { restaurant: req.restaurant._id };

        if (startDate && endDate) {
            query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }
        if (accountId) {
            query['items.account'] = accountId;
        }
        if (referenceType) query.referenceType = referenceType;
        if (status) query.status = status;

        const transactions = await AccountingTransaction.find(query)
            .populate('items.account', 'name code')
            .populate('createdBy', 'name')
            .sort({ date: -1, createdAt: -1 })
            .limit(200);

        res.json({ transactions });
    } catch (error) {
        console.error('getGeneralLedger error:', error);
        res.status(500).json({ error: 'Failed to fetch general ledger' });
    }
};

/**
 * Get Trial Balance (Balancete)
 * Calculates movements for the period
 */
export const getTrialBalance = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const restaurantId = req.restaurant._id;

        // Base account info
        const accounts = await Account.find({ restaurant: restaurantId }).sort({ code: 1 });

        // Aggregate transactions for the period
        const txQuery = {
            restaurant: restaurantId,
            status: 'posted'
        };
        if (startDate && endDate) {
            txQuery.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const movements = await AccountingTransaction.aggregate([
            { $match: txQuery },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.account',
                    totalDebit: { $sum: '$items.debit' },
                    totalCredit: { $sum: '$items.credit' }
                }
            }
        ]);

        // Map movements to accounts
        const trialBalance = accounts.map(acc => {
            const mv = movements.find(m => m._id.toString() === acc._id.toString());
            return {
                _id: acc._id,
                code: acc.code,
                name: acc.name,
                type: acc.type,
                isGroup: acc.isGroup,
                balance: acc.balance, // Current total balance
                periodDebit: mv ? mv.totalDebit : 0,
                periodCredit: mv ? mv.totalCredit : 0
            };
        });

        res.json({ trialBalance });
    } catch (error) {
        console.error('getTrialBalance error:', error);
        res.status(500).json({ error: 'Failed to generate trial balance' });
    }
};

/**
 * Get Accounting Dashboard Stats
 */
export const getAccountingStats = async (req, res) => {
    try {
        const rawId = req.restaurant?._id || req.user?.restaurant;
        if (!rawId) {
            console.error('getAccountingStats error: No restaurant context found in request');
            return res.status(400).json({ error: 'Restaurant context required' });
        }

        const restaurantId = new mongoose.Types.ObjectId(rawId.toString());
        console.log(`[Accounting] Fetching stats for restaurant: ${restaurantId}`);

        // Fetch accounts with a single set of queries
        const [revenueAcc, taxAcc, expenseAccs] = await Promise.all([
            Account.findOne({ restaurant: restaurantId, code: '7.1' }),
            Account.findOne({ restaurant: restaurantId, code: '4.4' }),
            Account.find({ restaurant: restaurantId, type: 'expense' })
        ]);

        const sumRevenue = Math.abs(revenueAcc?.balance || 0);
        const sumTax = Math.abs(taxAcc?.balance || 0);
        const sumExpenses = expenseAccs.reduce((sum, acc) => sum + Math.abs(acc.balance || 0), 0);

        console.log(`[Accounting] Stats computed: Revenue=${sumRevenue}, Expenses=${sumExpenses}, TaxPayable=${sumTax}`);

        res.json({
            revenue: sumRevenue,
            expenses: sumExpenses,
            taxPayable: sumTax,
            netProfit: sumRevenue - sumExpenses
        });
    } catch (error) {
        console.error('getAccountingStats failure:', error);
        res.status(500).json({
            error: 'Failed to fetch accounting stats',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

/**
 * Get Chart of Accounts
 */
export const getPlanOfAccounts = async (req, res) => {
    try {
        const accounts = await Account.find({ restaurant: req.restaurant._id }).sort({ code: 1 });
        res.json({ accounts });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch plan of accounts' });
    }
};

/**
 * Get Fiscal Invoices
 */
export const getFiscalInvoices = async (req, res) => {
    try {
        const { startDate, endDate, status } = req.query;
        const query = { restaurant: req.restaurant._id };

        if (startDate && endDate) {
            query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }
        if (status) query.status = status;

        const invoices = await FiscalInvoice.find(query)
            .sort({ createdAt: -1 })
            .limit(100);

        res.json({ invoices });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch fiscal invoices' });
    }
};

/**
 * Void Invoice
 */
export const handleVoidInvoice = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason) return res.status(400).json({ error: 'Reason for voiding is required' });

        const invoice = await voidInvoice(id, reason, req.user._id);

        await AuditLog.log({
            userId: req.user._id,
            action: 'fiscal_invoice_void',
            targetModel: 'FiscalInvoice',
            targetId: id,
            restaurantId: req.restaurant._id,
            metadata: { reason }
        });

        res.json({ message: 'Invoice voided successfully', invoice });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Cashier Session Management
 */
export const getCashSessions = async (req, res) => {
    try {
        const sessions = await CashSession.find({ restaurant: req.restaurant._id })
            .populate('operator', 'name')
            .sort({ createdAt: -1 });
        res.json({ sessions });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch cash sessions' });
    }
};

export const openSession = async (req, res) => {
    try {
        const { openingBalance } = req.body;

        // Check if operator already has an open session
        const existing = await CashSession.findOne({
            restaurant: req.restaurant._id,
            operator: req.user._id,
            status: 'open'
        });

        if (existing) return res.status(400).json({ error: 'You already have an open session' });

        const session = await CashSession.create({
            restaurant: req.restaurant._id,
            operator: req.user._id,
            openingBalance: openingBalance || 0
        });

        await AuditLog.log({
            userId: req.user._id,
            action: 'cash_session_open',
            targetModel: 'CashSession',
            targetId: session._id,
            restaurantId: req.restaurant._id
        });

        res.status(201).json({ session });
    } catch (error) {
        res.status(500).json({ error: 'Failed to open session' });
    }
};

export const closeSession = async (req, res) => {
    try {
        const { id } = req.params;
        const { actualBalance, notes } = req.body;

        const session = await CashSession.findById(id);
        if (!session) return res.status(404).json({ error: 'Session not found' });

        // Calculate expected balance from transactions
        const totalTx = session.transactions.reduce((acc, tx) => {
            if (tx.type === 'sale' || tx.type === 'entry') return acc + tx.amount;
            if (tx.type === 'exit' || tx.type === 'refund') return acc - tx.amount;
            return acc;
        }, 0);

        const closingBalance = session.openingBalance + totalTx;

        session.status = 'closed';
        session.endTime = new Date();
        session.closingBalance = closingBalance;
        session.actualBalance = actualBalance;
        session.difference = actualBalance - closingBalance;
        session.notes = notes;

        await session.save();

        await AuditLog.log({
            userId: req.user._id,
            action: 'cash_session_close',
            targetModel: 'CashSession',
            targetId: session._id,
            restaurantId: req.restaurant._id,
            metadata: { difference: session.difference }
        });

        res.json({ session });
    } catch (error) {
        res.status(500).json({ error: 'Failed to close session' });
    }
};

/**
 * Create Manual Transaction
 */
export const createManualTransaction = async (req, res) => {
    try {
        const { description, items, costCenter, sourceType, sourceId, employee } = req.body;

        if (!description || !items || !items.length) {
            return res.status(400).json({ error: 'Description and items are required' });
        }

        const transaction = await postTransaction({
            restaurantId: req.restaurant._id,
            description,
            referenceType: 'manual',
            sourceType,
            sourceId,
            employee,
            costCenter,
            items,
            userId: req.user._id,
            status: 'posted'
        });

        await AuditLog.log({
            userId: req.user._id,
            action: 'manual_accounting_transaction',
            targetModel: 'AccountingTransaction',
            targetId: transaction._id,
            restaurantId: req.restaurant._id
        });

        res.status(201).json({ message: 'Transaction created successfully', transaction });
    } catch (error) {
        console.error('createManualTransaction error:', error);
        res.status(400).json({ error: error.message || 'Failed to create transaction' });
    }
};

/**
 * Get Paid Orders pending ledger posting
 */
export const getPendingOrdersForLedger = async (req, res) => {
    try {
        const restaurantId = req.restaurant._id;

        // Find orders that are paid but don't have a corresponding AccountingTransaction
        // We look for AccountingTransaction where sourceId = order._id and sourceType = 'order'

        // Instead of a complex aggregate, let's find all paid orders in last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const paidOrders = await Order.find({
            restaurant: restaurantId,
            paymentStatus: 'completed',
            createdAt: { $gte: thirtyDaysAgo }
        }).sort({ createdAt: -1 });

        // Find existing transactions
        const existingTrans = await AccountingTransaction.find({
            restaurant: restaurantId,
            sourceType: 'order',
            sourceId: { $in: paidOrders.map(o => o._id) }
        }).select('sourceId');

        const postedOrderIds = new Set(existingTrans.map(t => t.sourceId.toString()));

        const pendingOrders = paidOrders.filter(o => !postedOrderIds.has(o._id.toString()));

        res.json({ pendingOrders });
    } catch (error) {
        console.error('getPendingOrdersForLedger error:', error);
        res.status(500).json({ error: 'Failed to fetch pending orders' });
    }
};

/**
 * Post Batch Transactions (e.g. from Orders)
 */
export const postBatchTransactions = async (req, res) => {
    try {
        const { orderIds } = req.body;
        const restaurantId = req.restaurant._id;
        const userId = req.user._id;

        if (!Array.isArray(orderIds) || orderIds.length === 0) {
            return res.status(400).json({ error: 'No order IDs provided.' });
        }

        const orders = await Order.find({
            restaurant: restaurantId,
            _id: { $in: orderIds },
            paymentStatus: 'completed'
        });

        const results = {
            successful: 0,
            failed: 0,
            errors: []
        };

        for (const order of orders) {
            try {
                // Check if already posted
                const existing = await AccountingTransaction.findOne({
                    restaurant: restaurantId,
                    sourceType: 'order',
                    sourceId: order._id
                });

                if (existing) {
                    results.failed++;
                    results.errors.push(`Order ${order.orderNumber} already posted.`);
                    continue;
                }

                await processPaidOrderEntry(restaurantId, order, userId);
                results.successful++;
            } catch (err) {
                console.error(`Error processing order ${order._id}:`, err);
                results.failed++;
                results.errors.push(`Order ${order.orderNumber}: ${err.message}`);
            }
        }

        res.json({ message: 'Batch processing complete', results });
    } catch (error) {
        console.error('postBatchTransactions error:', error);
        res.status(500).json({ error: 'Failed to process batch transactions' });
    }
};

/**
 * Get Razão (General Ledger per Account)
 */
export const getRazao = async (req, res) => {
    try {
        const { accountId, startDate, endDate } = req.query;
        const restaurantId = req.restaurant._id;

        if (!accountId) {
            return res.status(400).json({ error: 'Account ID is required for Razão.' });
        }

        const account = await Account.findOne({ _id: accountId, restaurant: restaurantId });
        if (!account) return res.status(404).json({ error: 'Account not found.' });

        // Query for transactions that include this account
        const query = {
            restaurant: restaurantId,
            'items.account': accountId,
            status: 'posted'
        };

        if (startDate && endDate) {
            query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const transactions = await AccountingTransaction.find(query)
            .populate('createdBy', 'name')
            .sort({ date: 1, createdAt: 1 }); // Chronological order for running balance

        let runningBalance = 0; // In a real system, you'd fetch the opening balance before startDate

        const razaoEntries = transactions.map(tx => {
            const item = tx.items.find(i => i.account.toString() === accountId);
            const debit = item?.debit || 0;
            const credit = item?.credit || 0;

            // Assuming normal balance logic: Assets/Expenses increase on Debit. Liabilities/Equity/Revenue increase on Credit.
            // For a simple running balance absolute calculation, we do Debit - Credit, and let frontend format it based on type, 
            // OR calculate it based on account type. Let's do Debit - Credit for simplicity.

            const movement = debit - credit;
            runningBalance += movement;

            return {
                transactionId: tx._id,
                date: tx.date,
                description: tx.description,
                referenceType: tx.referenceType,
                sourceType: tx.sourceType,
                debit,
                credit,
                balance: runningBalance,
                createdBy: tx.createdBy?.name || 'Sistema'
            };
        });

        res.json({
            account: { code: account.code, name: account.name, type: account.type },
            entries: razaoEntries,
            closingBalance: runningBalance
        });

    } catch (error) {
        console.error('getRazao error:', error);
        res.status(500).json({ error: 'Failed to fetch Razão.' });
    }
};

/**
 * Get Demonstração de Resultados (DRE / Income Statement)
 */
export const getDRE = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const restaurantId = req.restaurant._id;

        const accounts = await Account.find({ restaurant: restaurantId }).sort({ code: 1 });

        const query = { restaurant: restaurantId, status: 'posted' };
        if (startDate && endDate) {
            query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const transactions = await AccountingTransaction.find(query);

        // Map accounts
        const accountBalances = {};
        accounts.forEach(acc => {
            accountBalances[acc._id.toString()] = {
                ...acc.toObject(),
                periodDebit: 0,
                periodCredit: 0,
                movement: 0
            };
        });

        // Calculate movements
        transactions.forEach(tx => {
            tx.items.forEach(item => {
                const accId = item.account.toString();
                if (accountBalances[accId]) {
                    accountBalances[accId].periodDebit += (item.debit || 0);
                    accountBalances[accId].periodCredit += (item.credit || 0);
                }
            });
        });

        // DRE only cares about Revenue (Receitas) and Expenses (Despesas)
        const revenues = [];
        const expenses = [];

        let totalRevenue = 0;
        let totalExpenses = 0;

        Object.values(accountBalances).forEach(acc => {
            // Expenses (Classes 6) usually have debit balances
            if (acc.type === 'expense' || String(acc.code).startsWith('6')) {
                acc.movement = acc.periodDebit - acc.periodCredit;
                if (acc.movement > 0 || acc.periodDebit > 0) {
                    expenses.push(acc);
                    totalExpenses += acc.movement;
                }
            }
            // Revenues (Classes 7) usually have credit balances
            else if (acc.type === 'revenue' || String(acc.code).startsWith('7')) {
                acc.movement = acc.periodCredit - acc.periodDebit;
                if (acc.movement > 0 || acc.periodCredit > 0) {
                    revenues.push(acc);
                    totalRevenue += acc.movement;
                }
            }
        });

        const netIncome = totalRevenue - totalExpenses;

        res.json({
            revenues,
            expenses,
            totalRevenue,
            totalExpenses,
            netIncome
        });

    } catch (error) {
        console.error('getDRE error:', error);
        res.status(500).json({ error: 'Failed to generate DRE.' });
    }
};

/**
 * Get IVA Report (Apuramento de IVA)
 */
export const getIVAReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const restaurantId = req.restaurant._id;

        const query = {
            restaurant: restaurantId,
            status: 'posted'
        };

        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const transactions = await AccountingTransaction.find(query).populate('items.account');

        let ivaLiquidado = 0; // Tax collected on sales (Owed to Govt)
        let ivaDedutivel = 0; // Tax paid on purchases (Reclaimable)

        transactions.forEach(tx => {
            tx.items.forEach(item => {
                if (!item.account) return;

                const code = String(item.account.code);

                if (code === '2433') { // IVA Liquidado (Credit balance)
                    ivaLiquidado += (item.credit - item.debit);
                } else if (code === '2432') { // IVA Dedutível (Debit balance)
                    ivaDedutivel += (item.debit - item.credit);
                }
            });
        });

        const ivaAPagar = ivaLiquidado - ivaDedutivel;

        res.json({
            ivaLiquidado,
            ivaDedutivel,
            ivaAPagar,
            period: { startDate, endDate }
        });

    } catch (error) {
        console.error('getIVAReport error:', error);
        res.status(500).json({ error: 'Failed to generate IVA Report.' });
    }
};

export default {
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
};
