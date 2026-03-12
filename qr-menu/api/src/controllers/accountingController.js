import mongoose from 'mongoose';
import Account from '../models/Account.js';
import AccountingTransaction from '../models/AccountingTransaction.js';
import FiscalInvoice from '../models/FiscalInvoice.js';
import CashSession from '../models/CashSession.js';
import Order from '../models/Order.js';
import {
    voidInvoice,
    voidTransaction as voidTx,
    postTransaction,
    processPaidOrderEntry,
    processPurchaseEntry,
    IVA_RATE
} from '../services/accountingService.js';
import AuditLog from '../models/AuditLog.js';

// ─────────────────────────────────────────────────────────
// HELPER UTILITIES
// ─────────────────────────────────────────────────────────

const fmt = (n) => Number((n || 0).toFixed(2));

// ─────────────────────────────────────────────────────────
// DASHBOARD STATS
// ─────────────────────────────────────────────────────────

/**
 * Get Accounting Dashboard Stats
 * Returns: todayBilling, totalPurchases, accumulatedIVA, cashBalance, revenue, expenses, taxPayable, netProfit
 */
export const getAccountingStats = async (req, res) => {
    try {
        const restaurantId = new mongoose.Types.ObjectId(
            (req.restaurant?._id || req.user?.restaurant).toString()
        );

        // Date boundaries for "today"
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        // Fetch all accounts in one query
        const accounts = await Account.find({ restaurant: restaurantId }).lean();

        const getAccBal = (codes) => {
            const list = Array.isArray(codes) ? codes : [codes];
            for (const c of list) {
                const acc = accounts.find(a => a.code === c);
                if (acc) return acc.balance || 0;
            }
            return 0;
        };

        // Revenue accounts (Class 7)
        const revenueAccs = accounts.filter(a => a.type === 'revenue' || a.class === 7);
        const expenseAccs = accounts.filter(a => a.type === 'expense' || a.class === 6);

        const sumRevenue = revenueAccs.reduce((s, a) => s + Math.abs(a.balance || 0), 0);
        const sumExpenses = expenseAccs.reduce((s, a) => s + Math.abs(a.balance || 0), 0);

        // IVA balances
        const ivaLiquidado = Math.abs(getAccBal('2433')); // credit balance
        const ivaDedutivel = Math.abs(getAccBal('2432')); // debit balance
        const ivaAPagar = Math.max(0, ivaLiquidado - ivaDedutivel);

        // Cash balance (Caixa + Bancos + M-Pesa)
        const cashBalance = ['111', '121', '13'].reduce((s, c) => s + Math.max(0, getAccBal(c)), 0);

        // Today's transactions
        const todayTx = await AccountingTransaction.aggregate([
            {
                $match: {
                    restaurant: restaurantId,
                    status: 'posted',
                    date: { $gte: todayStart, $lte: todayEnd }
                }
            },
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'accounts',
                    localField: 'items.account',
                    foreignField: '_id',
                    as: 'accInfo'
                }
            },
            { $unwind: { path: '$accInfo', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: null,
                    todayRevenue: {
                        $sum: {
                            $cond: [{ $eq: ['$accInfo.type', 'revenue'] }, '$items.credit', 0]
                        }
                    },
                    todayPurchases: {
                        $sum: {
                            $cond: [{ $eq: ['$accInfo.type', 'expense'] }, '$items.debit', 0]
                        }
                    }
                }
            }
        ]);

        const todayBilling = fmt(todayTx[0]?.todayRevenue || 0);
        const totalPurchases = fmt(todayTx[0]?.todayPurchases || 0);

        res.json({
            todayBilling,
            totalPurchases,
            accumulatedIVA: fmt(ivaAPagar),
            cashBalance: fmt(cashBalance),
            revenue: fmt(sumRevenue),
            expenses: fmt(sumExpenses),
            taxPayable: fmt(ivaAPagar),
            ivaLiquidado: fmt(ivaLiquidado),
            ivaDedutivel: fmt(ivaDedutivel),
            netProfit: fmt(sumRevenue - sumExpenses),
            ivaRate: `${(IVA_RATE * 100).toFixed(0)}%`
        });

    } catch (error) {
        console.error('getAccountingStats error:', error);
        res.status(500).json({ error: 'Falha ao obter estatísticas contabilísticas', details: error.message });
    }
};

// ─────────────────────────────────────────────────────────
// PLAN OF ACCOUNTS (CRUD)
// ─────────────────────────────────────────────────────────

/**
 * Get Chart of Accounts (Plano de Contas)
 */
export const getPlanOfAccounts = async (req, res) => {
    try {
        const accounts = await Account.find({ restaurant: req.restaurant._id })
            .sort({ code: 1 })
            .populate('parent', 'code name');
        res.json({ accounts });
    } catch (error) {
        res.status(500).json({ error: 'Falha ao obter plano de contas' });
    }
};

/**
 * Create a new Account
 */
export const createAccount = async (req, res) => {
    try {
        const { code, name, type, nature, description, class: cls, parent, isGroup, isTaxAccount, costCenter } = req.body;

        if (!code || !name || !type) {
            return res.status(400).json({ error: 'Código, nome e tipo são obrigatórios' });
        }

        const existing = await Account.findOne({ restaurant: req.restaurant._id, code });
        if (existing) {
            return res.status(409).json({ error: `Já existe uma conta com o código ${code}` });
        }

        const account = await Account.create({
            restaurant: req.restaurant._id,
            code,
            name,
            type,
            nature: nature || (type === 'asset' || type === 'expense' ? 'debit' : 'credit'),
            description: description || '',
            class: cls,
            parent: parent || null,
            isGroup: isGroup || false,
            isTaxAccount: isTaxAccount || false,
            costCenter: costCenter || 'Geral',
            active: true,
            balance: 0
        });

        // Non-blocking audit log
        try {
            await AuditLog.log({
                userId: req.user._id,
                action: 'account_create',
                targetModel: 'Account',
                targetId: account._id,
                restaurantId: req.restaurant._id,
                changes: { newValue: { code, name, type } }
            });
        } catch (auditErr) {
            console.warn('[AuditLog] Falha ao registar auditoria:', auditErr.message);
        }

        res.status(201).json({ message: 'Conta criada com sucesso', account });
    } catch (error) {
        console.error('createAccount error:', error);
        res.status(400).json({ error: error.message || 'Falha ao criar conta' });
    }
};

/**
 * Update an Account
 */
export const updateAccount = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, nature, isGroup, isTaxAccount, costCenter, active, parent } = req.body;

        // Only allow updating safe fields – code and type should not change
        const updates = {};
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (nature !== undefined) updates.nature = nature;
        if (isGroup !== undefined) updates.isGroup = isGroup;
        if (isTaxAccount !== undefined) updates.isTaxAccount = isTaxAccount;
        if (costCenter !== undefined) updates.costCenter = costCenter;
        if (active !== undefined) updates.active = active;
        if (parent !== undefined) updates.parent = parent;

        const account = await Account.findOneAndUpdate(
            { _id: id, restaurant: req.restaurant._id },
            updates,
            { new: true, runValidators: true }
        );

        if (!account) return res.status(404).json({ error: 'Conta não encontrada' });

        // Non-blocking audit log
        try {
            await AuditLog.log({
                userId: req.user._id,
                action: 'account_update',
                targetModel: 'Account',
                targetId: id,
                restaurantId: req.restaurant._id,
                changes: { newValue: updates }
            });
        } catch (auditErr) {
            console.warn('[AuditLog] Falha ao registar auditoria:', auditErr.message);
        }

        res.json({ message: 'Conta actualizada', account });
    } catch (error) {
        console.error('updateAccount error:', error);
        res.status(400).json({ error: error.message || 'Falha ao actualizar conta' });
    }
};

// ─────────────────────────────────────────────────────────
// GENERAL LEDGER (Livro Diário)
// ─────────────────────────────────────────────────────────

/**
 * Get General Ledger (Livro Diário)
 */
export const getGeneralLedger = async (req, res) => {
    try {
        const { startDate, endDate, accountId, referenceType, status, userId, costCenter } = req.query;
        const query = { restaurant: req.restaurant._id };

        if (startDate && endDate) {
            query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }
        if (accountId) query['items.account'] = accountId;
        if (referenceType) query.referenceType = referenceType;
        if (status) query.status = status;
        if (userId) query.createdBy = userId;
        if (costCenter) query.costCenter = costCenter;

        const transactions = await AccountingTransaction.find(query)
            .populate('items.account', 'name code nature type')
            .populate('createdBy', 'name email')
            .sort({ date: -1, createdAt: -1 })
            .limit(500);

        // Compute totals
        let totalDebits = 0, totalCredits = 0;
        transactions.forEach(tx => {
            tx.items.forEach(item => {
                totalDebits += item.debit || 0;
                totalCredits += item.credit || 0;
            });
        });

        res.json({ transactions, totalDebits: fmt(totalDebits), totalCredits: fmt(totalCredits) });
    } catch (error) {
        console.error('getGeneralLedger error:', error);
        res.status(500).json({ error: 'Falha ao obter livro diário' });
    }
};

// ─────────────────────────────────────────────────────────
// TRIAL BALANCE (Balancete)
// ─────────────────────────────────────────────────────────

/**
 * Get Trial Balance (Balancete)
 */
export const getTrialBalance = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const restaurantId = req.restaurant._id;

        const accounts = await Account.find({ restaurant: restaurantId }).sort({ code: 1 });

        const txQuery = { restaurant: restaurantId, status: 'posted' };
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

        let grandDebit = 0, grandCredit = 0;

        const trialBalance = accounts.map(acc => {
            const mv = movements.find(m => m._id.toString() === acc._id.toString());
            const periodDebit = mv ? fmt(mv.totalDebit) : 0;
            const periodCredit = mv ? fmt(mv.totalCredit) : 0;
            grandDebit += periodDebit;
            grandCredit += periodCredit;
            return {
                _id: acc._id,
                code: acc.code,
                name: acc.name,
                type: acc.type,
                nature: acc.nature,
                class: acc.class,
                isGroup: acc.isGroup,
                balance: fmt(acc.balance),
                periodDebit,
                periodCredit
            };
        });

        res.json({
            trialBalance,
            grandDebit: fmt(grandDebit),
            grandCredit: fmt(grandCredit),
            balanced: Math.abs(grandDebit - grandCredit) < 0.01
        });
    } catch (error) {
        console.error('getTrialBalance error:', error);
        res.status(500).json({ error: 'Falha ao gerar balancete' });
    }
};

// ─────────────────────────────────────────────────────────
// BALANCE SHEET (Balanço Patrimonial)
// ─────────────────────────────────────────────────────────

/**
 * Get Balance Sheet (Balanço Patrimonial)
 * Ativos = Passivos + Capital Próprio
 */
export const getBalanceSheet = async (req, res) => {
    try {
        const restaurantId = req.restaurant._id;
        const accounts = await Account.find({ restaurant: restaurantId }).sort({ code: 1 });

        const classify = (type, nature, balance) => {
            // For asset/expense (debit nature): positive balance = owns something
            // For liability/equity/revenue (credit nature): negative balance = owes something
            return balance;
        };

        const assets = accounts.filter(a => a.type === 'asset');
        const liabilities = accounts.filter(a => a.type === 'liability');
        const equity = accounts.filter(a => a.type === 'equity');

        const sumBal = (arr) => arr.reduce((s, a) => {
            // Assets with debit nature: positive balance = asset
            // Tax assets (2432, 2434) are debit nature
            const b = a.balance || 0;
            return s + (a.nature === 'debit' ? Math.max(0, b) : Math.max(0, -b));
        }, 0);

        const totalAssets = fmt(sumBal(assets));
        const totalLiabilities = fmt(sumBal(liabilities));
        const totalEquity = fmt(sumBal(equity));

        res.json({
            assets: assets.map(a => ({ code: a.code, name: a.name, class: a.class, balance: fmt(a.balance), nature: a.nature })),
            liabilities: liabilities.map(a => ({ code: a.code, name: a.name, class: a.class, balance: fmt(a.balance), nature: a.nature })),
            equity: equity.map(a => ({ code: a.code, name: a.name, class: a.class, balance: fmt(a.balance), nature: a.nature })),
            totals: {
                totalAssets,
                totalLiabilities,
                totalEquity,
                liabilitiesPlusEquity: fmt(totalLiabilities + totalEquity),
                balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1
            }
        });
    } catch (error) {
        console.error('getBalanceSheet error:', error);
        res.status(500).json({ error: 'Falha ao gerar balanço patrimonial' });
    }
};

// ─────────────────────────────────────────────────────────
// FISCAL INVOICES
// ─────────────────────────────────────────────────────────

export const getFiscalInvoices = async (req, res) => {
    try {
        const { startDate, endDate, status } = req.query;
        const query = { restaurant: req.restaurant._id };

        if (startDate && endDate) {
            query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }
        if (status) query.status = status;

        const invoices = await FiscalInvoice.find(query).sort({ createdAt: -1 }).limit(200);
        res.json({ invoices });
    } catch (error) {
        res.status(500).json({ error: 'Falha ao obter facturas fiscais' });
    }
};

export const handleVoidInvoice = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason) return res.status(400).json({ error: 'Motivo de anulação obrigatório' });

        const invoice = await voidInvoice(id, reason, req.user._id);

        // Non-blocking audit log
        try {
            await AuditLog.log({
                userId: req.user._id,
                action: 'fiscal_invoice_void',
                targetModel: 'FiscalInvoice',
                targetId: id,
                restaurantId: req.restaurant._id,
                changes: { newValue: { reason } }
            });
        } catch (auditErr) {
            console.warn('[AuditLog] Falha ao registar auditoria:', auditErr.message);
        }

        res.json({ message: 'Factura anulada com sucesso', invoice });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ─────────────────────────────────────────────────────────
// VOID TRANSACTION (Estorno)
// ─────────────────────────────────────────────────────────

export const handleVoidTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason) return res.status(400).json({ error: 'Motivo de estorno obrigatório' });

        const result = await voidTx(id, reason, req.user._id);

        await AuditLog.log({
            userId: req.user._id,
            action: 'transaction_void',
            targetModel: 'AccountingTransaction',
            targetId: id,
            restaurantId: req.restaurant._id,
            metadata: { reason }
        });

        res.json({ message: 'Lançamento estornado com sucesso', ...result });
    } catch (error) {
        console.error('handleVoidTransaction error:', error);
        res.status(400).json({ error: error.message });
    }
};

// ─────────────────────────────────────────────────────────
// CASH SESSIONS
// ─────────────────────────────────────────────────────────

export const getCashSessions = async (req, res) => {
    try {
        const sessions = await CashSession.find({ restaurant: req.restaurant._id })
            .populate('operator', 'name')
            .sort({ createdAt: -1 });
        res.json({ sessions });
    } catch (error) {
        res.status(500).json({ error: 'Falha ao obter sessões de caixa' });
    }
};

export const openSession = async (req, res) => {
    try {
        const { openingBalance } = req.body;

        const existing = await CashSession.findOne({
            restaurant: req.restaurant._id,
            operator: req.user._id,
            status: 'open'
        });

        if (existing) return res.status(400).json({ error: 'Já tem uma sessão de caixa aberta' });

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
        res.status(500).json({ error: 'Falha ao abrir sessão de caixa' });
    }
};

export const closeSession = async (req, res) => {
    try {
        const { id } = req.params;
        const { actualBalance, notes } = req.body;

        const session = await CashSession.findById(id);
        if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

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
        res.status(500).json({ error: 'Falha ao fechar sessão de caixa' });
    }
};

// ─────────────────────────────────────────────────────────
// MANUAL TRANSACTIONS
// ─────────────────────────────────────────────────────────

export const createManualTransaction = async (req, res) => {
    try {
        const { description, items, costCenter, sourceType, sourceId, employee } = req.body;

        if (!description || !items || !items.length) {
            return res.status(400).json({ error: 'Descrição e linhas de lançamento são obrigatórias' });
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

        res.status(201).json({ message: 'Lançamento criado com sucesso', transaction });
    } catch (error) {
        console.error('createManualTransaction error:', error);
        res.status(400).json({ error: error.message || 'Falha ao criar lançamento' });
    }
};

// ─────────────────────────────────────────────────────────
// PURCHASE ENTRY
// ─────────────────────────────────────────────────────────

/**
 * Create accounting entry for a purchase (compras manuais)
 */
export const createPurchaseEntry = async (req, res) => {
    try {
        const { totalAmount, ivaIncluded, description, supplierId, paymentMethod } = req.body;

        if (!totalAmount || totalAmount <= 0) {
            return res.status(400).json({ error: 'Montante da compra inválido' });
        }

        const transaction = await processPurchaseEntry(
            req.restaurant._id,
            { totalAmount, ivaIncluded, description, supplierId, paymentMethod },
            req.user._id
        );

        await AuditLog.log({
            userId: req.user._id,
            action: 'purchase_entry',
            targetModel: 'AccountingTransaction',
            targetId: transaction._id,
            restaurantId: req.restaurant._id,
            metadata: { totalAmount, ivaIncluded }
        });

        res.status(201).json({ message: 'Lançamento de compra registado', transaction });
    } catch (error) {
        console.error('createPurchaseEntry error:', error);
        res.status(400).json({ error: error.message });
    }
};

// ─────────────────────────────────────────────────────────
// BATCH / PENDING ORDERS
// ─────────────────────────────────────────────────────────

export const getPendingOrdersForLedger = async (req, res) => {
    try {
        const restaurantId = req.restaurant._id;

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const paidOrders = await Order.find({
            restaurant: restaurantId,
            paymentStatus: 'completed',
            createdAt: { $gte: thirtyDaysAgo }
        }).sort({ createdAt: -1 });

        const existingTrans = await AccountingTransaction.find({
            restaurant: restaurantId,
            sourceType: 'order',
            sourceId: { $in: paidOrders.map(o => o._id) }
        }).select('sourceId');

        const postedOrderIds = new Set(existingTrans.map(t => t.sourceId.toString()));
        const pendingOrders = paidOrders.filter(o => !postedOrderIds.has(o._id.toString()));

        res.json({ pendingOrders, total: pendingOrders.length });
    } catch (error) {
        console.error('getPendingOrdersForLedger error:', error);
        res.status(500).json({ error: 'Falha ao obter pedidos pendentes' });
    }
};

export const postBatchTransactions = async (req, res) => {
    try {
        const { orderIds } = req.body;
        const restaurantId = req.restaurant._id;
        const userId = req.user._id;

        if (!Array.isArray(orderIds) || orderIds.length === 0) {
            return res.status(400).json({ error: 'Nenhum ID de pedido fornecido' });
        }

        const orders = await Order.find({
            restaurant: restaurantId,
            _id: { $in: orderIds },
            paymentStatus: 'completed'
        });

        const results = { successful: 0, failed: 0, errors: [] };

        for (const order of orders) {
            try {
                const existing = await AccountingTransaction.findOne({
                    restaurant: restaurantId,
                    sourceType: 'order',
                    sourceId: order._id
                });

                if (existing) {
                    results.failed++;
                    results.errors.push(`Pedido ${order.orderNumber} já lançado.`);
                    continue;
                }

                await processPaidOrderEntry(restaurantId, order, userId);
                results.successful++;
            } catch (err) {
                console.error(`Erro no pedido ${order._id}:`, err);
                results.failed++;
                results.errors.push(`Pedido ${order.orderNumber}: ${err.message}`);
            }
        }

        res.json({ message: 'Processamento em lote concluído', results });
    } catch (error) {
        console.error('postBatchTransactions error:', error);
        res.status(500).json({ error: 'Falha no processamento em lote' });
    }
};

// ─────────────────────────────────────────────────────────
// RAZÃO (Account Ledger)
// ─────────────────────────────────────────────────────────

export const getRazao = async (req, res) => {
    try {
        const { accountId, startDate, endDate } = req.query;
        const restaurantId = req.restaurant._id;

        if (!accountId) {
            return res.status(400).json({ error: 'ID de conta obrigatório para o Razão.' });
        }

        const account = await Account.findOne({ _id: accountId, restaurant: restaurantId });
        if (!account) return res.status(404).json({ error: 'Conta não encontrada.' });

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
            .sort({ date: 1, createdAt: 1 });

        let runningBalance = 0;

        const razaoEntries = transactions.map(tx => {
            const item = tx.items.find(i => i.account.toString() === accountId);
            const debit = item?.debit || 0;
            const credit = item?.credit || 0;

            runningBalance += (debit - credit);

            return {
                transactionId: tx._id,
                documentNumber: tx.documentNumber,
                date: tx.date,
                description: tx.description,
                referenceType: tx.referenceType,
                debit,
                credit,
                balance: fmt(runningBalance),
                createdBy: tx.createdBy?.name || 'Sistema'
            };
        });

        res.json({
            account: { code: account.code, name: account.name, type: account.type, nature: account.nature },
            entries: razaoEntries,
            closingBalance: fmt(runningBalance)
        });

    } catch (error) {
        console.error('getRazao error:', error);
        res.status(500).json({ error: 'Falha ao obter Razão.' });
    }
};

// ─────────────────────────────────────────────────────────
// DRE (Demonstração de Resultados)
// ─────────────────────────────────────────────────────────

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

        const accountBalances = {};
        accounts.forEach(acc => {
            accountBalances[acc._id.toString()] = {
                ...acc.toObject(), periodDebit: 0, periodCredit: 0, movement: 0
            };
        });

        transactions.forEach(tx => {
            tx.items.forEach(item => {
                const accId = item.account.toString();
                if (accountBalances[accId]) {
                    accountBalances[accId].periodDebit += (item.debit || 0);
                    accountBalances[accId].periodCredit += (item.credit || 0);
                }
            });
        });

        const revenues = [];
        const expenses = [];
        let totalRevenue = 0;
        let totalExpenses = 0;

        Object.values(accountBalances).forEach(acc => {
            if (acc.type === 'expense' || String(acc.code).startsWith('6')) {
                acc.movement = fmt(acc.periodDebit - acc.periodCredit);
                if (acc.movement > 0 || acc.periodDebit > 0) {
                    expenses.push(acc);
                    totalExpenses += acc.movement;
                }
            } else if (acc.type === 'revenue' || String(acc.code).startsWith('7')) {
                acc.movement = fmt(acc.periodCredit - acc.periodDebit);
                if (acc.movement > 0 || acc.periodCredit > 0) {
                    revenues.push(acc);
                    totalRevenue += acc.movement;
                }
            }
        });

        res.json({
            revenues,
            expenses,
            totalRevenue: fmt(totalRevenue),
            totalExpenses: fmt(totalExpenses),
            netIncome: fmt(totalRevenue - totalExpenses),
            period: { startDate, endDate }
        });

    } catch (error) {
        console.error('getDRE error:', error);
        res.status(500).json({ error: 'Falha ao gerar Demonstração de Resultados.' });
    }
};

// ─────────────────────────────────────────────────────────
// IVA REPORT (Apuramento de IVA)
// ─────────────────────────────────────────────────────────

export const getIVAReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const restaurantId = req.restaurant._id;

        const query = { restaurant: restaurantId, status: 'posted' };
        if (startDate && endDate) {
            query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const transactions = await AccountingTransaction.find(query).populate('items.account');

        let ivaLiquidado = 0;
        let ivaDedutivel = 0;

        transactions.forEach(tx => {
            tx.items.forEach(item => {
                if (!item.account) return;
                const code = String(item.account.code);

                if (code === '2433') { // IVA Liquidado (credit=increase)
                    ivaLiquidado += (item.credit - item.debit);
                } else if (code === '2432') { // IVA Dedutível (debit=increase)
                    ivaDedutivel += (item.debit - item.credit);
                }
            });
        });

        const ivaAPagar = Math.max(0, ivaLiquidado - ivaDedutivel);
        const ivaARecuperar = Math.max(0, ivaDedutivel - ivaLiquidado);

        res.json({
            ivaLiquidado: fmt(ivaLiquidado),
            ivaDedutivel: fmt(ivaDedutivel),
            ivaAPagar: fmt(ivaAPagar),
            ivaARecuperar: fmt(ivaARecuperar),
            ivaRate: `${(IVA_RATE * 100).toFixed(0)}%`,
            period: { startDate, endDate }
        });

    } catch (error) {
        console.error('getIVAReport error:', error);
        res.status(500).json({ error: 'Falha ao gerar Apuramento de IVA.' });
    }
};

export default {
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
};
