import crypto from 'crypto';
import Account from '../models/Account.js';
import AccountingTransaction from '../models/AccountingTransaction.js';
import FiscalInvoice from '../models/FiscalInvoice.js';
import CashSession from '../models/CashSession.js';
import Order from '../models/Order.js';
import MenuItem from '../models/MenuItem.js';

/**
 * Setup default PGC-PE Chart of Accounts for a restaurant
 */
export const setupDefaultAccounts = async (restaurantId) => {
    const defaultAccounts = [
        // Classe 1: Meios Financeiros
        { code: '1.1', name: 'Caixa', type: 'asset', isGroup: false },
        { code: '1.2', name: 'Depósitos à Ordem', type: 'asset', isGroup: false },

        // Classe 2: Inventários e Activos Biológicos
        { code: '2.2', name: 'Mercadorias', type: 'asset', isGroup: false },

        // Classe 4: Terceiros
        { code: '4.1', name: 'Clientes', type: 'asset', isGroup: false },
        { code: '4.2', name: 'Fornecedores', type: 'liability', isGroup: false },
        { code: '4.4', name: 'Estado (Impostos/IVA)', type: 'liability', isGroup: false },

        // Classe 5: Capital Próprio
        { code: '5.1', name: 'Capital', type: 'equity', isGroup: false },

        // Classe 6: Gastos
        { code: '6.1', name: 'Custo das Existências Vendidas e Consumidas (CMVC)', type: 'expense', isGroup: false },
        { code: '6.2', name: 'Fornecimentos e Serviços de Terceiros (FST)', type: 'expense', isGroup: false },
        { code: '6.3', name: 'Gastos com o Pessoal', type: 'expense', isGroup: false },

        // Classe 7: Rendimentos
        { code: '7.1', name: 'Vendas e Prestações de Serviços', type: 'revenue', isGroup: false }
    ];

    const results = [];
    for (const acc of defaultAccounts) {
        const existing = await Account.findOne({ restaurant: restaurantId, code: acc.code });
        if (!existing) {
            results.push(await Account.create({ ...acc, restaurant: restaurantId }));
        }
    }
    return results;
};

/**
 * Generate a fiscal invoice for an order
 */
export const generateFiscalInvoice = async (orderId, customerInfo = {}) => {
    const order = await Order.findById(orderId).populate('items.item').populate('restaurant');
    if (!order) throw new Error('Order not found');

    // Check if invoice already exists
    const existing = await FiscalInvoice.findOne({ order: orderId });
    if (existing) return existing;

    const restaurantId = order.restaurant._id;
    const series = new Date().getFullYear().toString();

    // Get next sequence number
    const lastInvoice = await FiscalInvoice.findOne({
        restaurant: restaurantId,
        series
    }).sort({ sequence: -1 });

    const sequence = lastInvoice ? lastInvoice.sequence + 1 : 1;
    const invoiceNumber = `FT ${series}/${sequence.toString().padStart(4, '0')}`;

    // Calculate Hash for Fiscal Seal (Integrity)
    const prevHash = lastInvoice ? lastInvoice.hash : '0';
    const hashData = `${prevHash}|${orderId}|${order.total}|${invoiceNumber}`;
    const hash = crypto.createHash('sha256').update(hashData).digest('hex');

    const invoice = await FiscalInvoice.create({
        restaurant: restaurantId,
        order: orderId,
        invoiceNumber,
        series,
        sequence,
        customer: {
            name: customerInfo.name || order.customerName || 'Consumidor Final',
            nuit: customerInfo.nuit || '999999999', // Default NUIT
            address: customerInfo.address || ''
        },
        items: order.items.map(i => ({
            name: i.item.name,
            qty: i.qty,
            price: i.itemPrice,
            taxAmount: (i.subtotal * (order.restaurant.settings.taxRate || 0)) / 100,
            total: i.subtotal
        })),
        subtotal: order.subtotal,
        taxTotal: order.tax,
        total: order.total,
        paymentMethod: order.paymentMethod,
        hash,
        prevHash
    });

    // Automatically record accounting transaction
    await recordSaleTransaction(invoice, order);

    return invoice;
};

/**
 * Record accounting transaction for a sale
 */
const recordSaleTransaction = async (invoice, order) => {
    const restaurantId = invoice.restaurant;

    // Find necessary accounts
    const accounts = await Account.find({
        restaurant: restaurantId,
        code: { $in: ['1.1', '7.1', '4.4', '4.1'] }
    });

    const getAccount = (code) => accounts.find(a => a.code === code);

    const accSales = getAccount('7.1');
    const accTax = getAccount('4.4');
    const accCash = getAccount('1.1');
    const accClients = getAccount('4.1');

    if (!accSales || !accTax || !accCash || !accClients) {
        throw new Error('Accounting accounts (7.1, 4.4, 1.1, 4.1) not properly configured for this restaurant');
    }

    const transactionItems = [];

    // Credit Revenue (Exclude Tax)
    transactionItems.push({
        account: accSales._id,
        credit: order.subtotal,
        debit: 0
    });

    // Credit IVA (Liability)
    if (order.tax > 0) {
        transactionItems.push({
            account: accTax._id,
            credit: order.tax,
            debit: 0
        });
    }

    // Debit Asset (Cash or Clients)
    const targetAccount = order.paymentStatus === 'completed' ? accCash : accClients;
    transactionItems.push({
        account: targetAccount._id,
        debit: order.total,
        credit: 0
    });

    await AccountingTransaction.create({
        restaurant: restaurantId,
        description: `Venda - Fatura ${invoice.invoiceNumber}`,
        referenceType: 'order',
        referenceId: order._id,
        items: transactionItems,
        status: 'posted'
    });

    // Update account balances
    for (const item of transactionItems) {
        await Account.findByIdAndUpdate(item.account, {
            $inc: { balance: item.debit - item.credit }
        });
    }
};

/**
 * Void an invoice
 */
export const voidInvoice = async (invoiceId, reason, userId) => {
    const invoice = await FiscalInvoice.findById(invoiceId);
    if (!invoice) throw new Error('Invoice not found');
    if (invoice.status === 'voided') throw new Error('Invoice already voided');

    invoice.status = 'voided';
    invoice.voidReason = reason;
    invoice.voidedAt = new Date();
    invoice.voidedBy = userId;
    await invoice.save();

    // Revert accounting transaction (Credit what was debited, Debit what was credited)
    const originalTx = await AccountingTransaction.findOne({
        referenceId: invoice.order,
        referenceType: 'order',
        status: 'posted'
    });

    if (originalTx) {
        const revertItems = originalTx.items.map(item => ({
            account: item.account,
            debit: item.credit,
            credit: item.debit
        }));

        await AccountingTransaction.create({
            restaurant: invoice.restaurant,
            description: `ESTORNO - Fatura ${invoice.invoiceNumber} - Motivo: ${reason}`,
            referenceType: 'order',
            referenceId: invoice.order,
            items: revertItems,
            status: 'voided',
            createdBy: userId
        });

        // Update account balances (Inverse of before)
        for (const item of revertItems) {
            await Account.findByIdAndUpdate(item.account, {
                $inc: { balance: item.debit - item.credit }
            });
        }
    }

    return invoice;
};

/**
 * Post a manual or automated accounting transaction
 */
export const postTransaction = async ({
    restaurantId,
    description,
    referenceType,
    referenceId,
    sourceType = 'manual',
    sourceId,
    employee,
    costCenter = 'Geral',
    items,
    userId,
    status = 'posted'
}) => {
    // Validate inputs
    if (!restaurantId || !description || !referenceType || !items || !items.length) {
        throw new Error('Missing required transaction fields');
    }

    // Calculate total debits and credits
    const totalDebit = items.reduce((sum, item) => sum + (Number(item.debit) || 0), 0);
    const totalCredit = items.reduce((sum, item) => sum + (Number(item.credit) || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.001) {
        throw new Error(`Total debits (${totalDebit}) must equal total credits (${totalCredit})`);
    }

    // Generate a secure transaction document number for the PGC-NIRF audit trail
    const documentNumber = `TC-${new Date().getTime().toString().slice(-6)}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

    // Calculate generic VAT from lines if any 243x accounts are hit
    let vatAmount = 0;

    // Create the transaction
    const transaction = await AccountingTransaction.create({
        restaurant: restaurantId,
        documentNumber,
        costCenter,
        description,
        referenceType,
        referenceId,
        sourceType,
        sourceId,
        employee,
        items: items.map(item => ({
            account: item.account,
            debit: Number(item.debit) || 0,
            credit: Number(item.credit) || 0
        })),
        createdBy: userId,
        status,
        date: new Date()
    });

    // Update account balances
    if (status === 'posted') {
        for (const item of transaction.items) {
            // Debit increases asset/expense, decreases liability/equity/revenue
            await Account.findByIdAndUpdate(item.account, {
                $inc: { balance: item.debit - item.credit }
            });
        }
    }

    return transaction;
};

/**
 * Automate accounting entry for a paid order
 */
export const processPaidOrderEntry = async (restaurantId, order, userId) => {
    // 1. Fetch relevant PGC-NIRF accounts
    const accounts = await Account.find({ restaurant: restaurantId });
    const getAccount = (code) => accounts.find(a => a.code === code);

    const accSales = getAccount('711') || getAccount('71'); // Vendas
    const accTax = getAccount('2433'); // IVA Liquidado

    // Determine Debit Account based on Payment Method or Status
    let accDebit;
    if (order.paymentStatus !== 'completed') {
        accDebit = getAccount('211') || getAccount('21'); // Clientes C/C
    } else {
        switch ((order.paymentMethod || '').toLowerCase()) {
            case 'm-pesa':
            case 'mpesa':
            case 'e-mola':
            case 'emola':
                accDebit = getAccount('13') || getAccount('12'); // Carteiras Móveis / Bancos
                break;
            case 'pos':
            case 'transfer':
            case 'visa':
                accDebit = getAccount('121') || getAccount('12'); // Depósitos à Ordem
                break;
            case 'cash':
            default:
                accDebit = getAccount('111') || getAccount('11'); // Caixa Central
                break;
        }
    }

    if (!accSales || !accDebit) {
        throw new Error('Required PGC-NIRF accounts (711, 111/121/211) not found for automation.');
    }

    const items = [];

    // Calculate 17% IVA from the total (assuming order.total is VAT INCLUSIVE)
    // Formula: Net = Total / 1.17, VAT = Total - Net
    let netRevenue = order.total;
    let vatAmount = 0;

    if (accTax) {
        netRevenue = Number((order.total / 1.17).toFixed(2));
        vatAmount = Number((order.total - netRevenue).toFixed(2));
    }

    // Debit Asset/Receivable (Total amount received or owed)
    items.push({
        account: accDebit._id,
        debit: order.total,
        credit: 0
    });

    // Credit Revenue (Net amount)
    items.push({
        account: accSales._id,
        debit: 0,
        credit: netRevenue
    });

    // Credit Tax (IVA Liquidado)
    if (vatAmount > 0 && accTax) {
        items.push({
            account: accTax._id,
            debit: 0,
            credit: vatAmount
        });
    }

    // 2. Inventory Accounting (CMV) - Requires Product Cost
    const accCMV = getAccount('61');
    const accInventory = getAccount('31') || getAccount('33');
    let totalCost = 0;

    if (order.items && order.items.length > 0) {
        const itemIds = order.items.map(i => i.item);
        const menuItems = await MenuItem.find({ _id: { $in: itemIds } }).select('_id costPrice');

        for (const orderItem of order.items) {
            const menuItem = menuItems.find(m => m._id.equals(orderItem.item));
            if (menuItem && menuItem.costPrice > 0) {
                totalCost += (menuItem.costPrice * orderItem.qty);
            }
        }
    }

    if (totalCost > 0 && accCMV && accInventory) {
        items.push({ account: accCMV._id, debit: totalCost, credit: 0 });
        items.push({ account: accInventory._id, debit: 0, credit: totalCost });
    }

    // Ensure the main transaction is balanced
    return await postTransaction({
        restaurantId,
        description: `Venda Automática (C/ IVA) - Pedido #${order.orderNumber || order._id.toString().slice(-6)}`,
        referenceType: 'order',
        referenceId: order._id,
        sourceType: 'order',
        sourceId: order._id,
        items,
        userId,
        status: 'posted'
    });
};

/**
 * Automate accounting entry for Payroll
 */
export const processPayrollEntry = async (restaurantId, payroll, userId) => {
    const accounts = await Account.find({ restaurant: restaurantId });
    const getAccount = (code) => accounts.find(a => a.code === code);

    const accExpense = getAccount('62') || getAccount('63'); // Gastos com Pessoal
    const accCash = getAccount('121') || getAccount('111'); // Bancos ou Caixa

    if (!accExpense || !accCash) {
        throw new Error('Required PGC accounts (62, 121/111) not found for payroll automation.');
    }

    const items = [
        { account: accExpense._id, debit: payroll.amount, credit: 0 },
        { account: accCash._id, debit: 0, credit: payroll.amount }
    ];

    return await postTransaction({
        restaurantId,
        description: `Pagamento de Salário - ${payroll.employeeName || 'Funcionário'}`,
        referenceType: 'expense',
        sourceType: 'payroll',
        sourceId: payroll._id, // if available
        employee: payroll.employeeId, // if available
        items,
        userId,
        status: 'posted'
    });
};

export default {
    setupDefaultAccounts,
    generateFiscalInvoice,
    voidInvoice,
    postTransaction,
    processPaidOrderEntry,
    processPayrollEntry
};
