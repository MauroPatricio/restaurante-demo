import crypto from 'crypto';
import Account from '../models/Account.js';
import AccountingTransaction from '../models/AccountingTransaction.js';
import FiscalInvoice from '../models/FiscalInvoice.js';
import CashSession from '../models/CashSession.js';
import Order from '../models/Order.js';
import MenuItem from '../models/MenuItem.js';

// IVA Rate – 16% conforme Lei 32/2007 de Moçambique
export const IVA_RATE = 0.16;
export const IVA_DIVISOR = 1 + IVA_RATE; // 1.16

/**
 * Setup default PGC-NIRF Chart of Accounts for a restaurant
 * (Basic set – use seed_pgc_nirf.js for the full PGC)
 */
export const setupDefaultAccounts = async (restaurantId) => {
    const defaultAccounts = [
        // Classe 1: Meios Financeiros
        { code: '11', name: 'Caixa', type: 'asset', nature: 'debit', class: 1, isGroup: true },
        { code: '111', name: 'Caixa Central', type: 'asset', nature: 'debit', class: 1, parentCode: '11' },
        { code: '12', name: 'Bancos', type: 'asset', nature: 'debit', class: 1, isGroup: true },
        { code: '121', name: 'Depósitos à Ordem', type: 'asset', nature: 'debit', class: 1, parentCode: '12' },
        { code: '13', name: 'Carteiras Móveis (M-Pesa / e-Mola)', type: 'asset', nature: 'debit', class: 1 },

        // Classe 2: Terceiros e IVA
        { code: '21', name: 'Clientes', type: 'asset', nature: 'debit', class: 2, isGroup: true },
        { code: '211', name: 'Clientes c/c', type: 'asset', nature: 'debit', class: 2, parentCode: '21' },
        { code: '22', name: 'Fornecedores', type: 'liability', nature: 'credit', class: 2, isGroup: true },
        { code: '221', name: 'Fornecedores c/c', type: 'liability', nature: 'credit', class: 2, parentCode: '22' },
        { code: '24', name: 'Estado', type: 'liability', nature: 'credit', class: 2, isGroup: true },
        { code: '243', name: 'IVA (16%)', type: 'liability', nature: 'credit', class: 2, isGroup: true, parentCode: '24' },
        { code: '2432', name: 'IVA Dedutível', type: 'asset', nature: 'debit', class: 2, isTaxAccount: true, parentCode: '243', description: 'IVA suportado nas compras' },
        { code: '2433', name: 'IVA Liquidado', type: 'liability', nature: 'credit', class: 2, isTaxAccount: true, parentCode: '243', description: 'IVA cobrado nas vendas' },
        { code: '2435', name: 'IVA a Pagar', type: 'liability', nature: 'credit', class: 2, isTaxAccount: true, parentCode: '243', description: 'IVA apurado a entregar ao Estado' },

        // Classe 3: Inventários
        { code: '31', name: 'Mercadorias', type: 'asset', nature: 'debit', class: 3, description: 'Stock de mercadorias' },
        { code: '32', name: 'Matérias-Primas', type: 'asset', nature: 'debit', class: 3, description: 'Ingredientes de cozinha' },

        // Classe 5: Capital Próprio
        { code: '51', name: 'Capital Social', type: 'equity', nature: 'credit', class: 5 },
        { code: '59', name: 'Resultado Líquido do Exercício', type: 'equity', nature: 'credit', class: 5 },

        // Classe 6: Gastos
        { code: '61', name: 'Custo das Mercadorias Vendidas (CMV)', type: 'expense', nature: 'debit', class: 6 },
        { code: '62', name: 'Gastos com Pessoal', type: 'expense', nature: 'debit', class: 6, description: 'Salários e encargos sociais' },
        { code: '63', name: 'Fornecimentos e Serviços de Terceiros', type: 'expense', nature: 'debit', class: 6 },

        // Classe 7: Rendimentos
        { code: '71', name: 'Vendas', type: 'revenue', nature: 'credit', class: 7, isGroup: true },
        { code: '711', name: 'Venda de Refeições / Restaurante', type: 'revenue', nature: 'credit', class: 7, parentCode: '71' },
        { code: '712', name: 'Venda de Bebidas', type: 'revenue', nature: 'credit', class: 7, parentCode: '71' },
        { code: '72', name: 'Prestações de Serviços', type: 'revenue', nature: 'credit', class: 7, isGroup: true },
        { code: '721', name: 'Serviço de Delivery', type: 'revenue', nature: 'credit', class: 7, parentCode: '72' },
    ];

    const createdAccounts = {};
    const results = [];

    for (const acc of defaultAccounts) {
        let parentId = null;
        if (acc.parentCode && createdAccounts[acc.parentCode]) {
            parentId = createdAccounts[acc.parentCode];
        }
        const existing = await Account.findOne({ restaurant: restaurantId, code: acc.code });
        if (!existing) {
            const created = await Account.create({
                ...acc,
                restaurant: restaurantId,
                parent: parentId,
                active: true,
                costCenter: 'Geral'
            });
            createdAccounts[acc.code] = created._id;
            results.push(created);
        } else {
            createdAccounts[acc.code] = existing._id;
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

    const existing = await FiscalInvoice.findOne({ order: orderId });
    if (existing) return existing;

    const restaurantId = order.restaurant._id;
    const series = new Date().getFullYear().toString();

    const lastInvoice = await FiscalInvoice.findOne({ restaurant: restaurantId, series }).sort({ sequence: -1 });
    const sequence = lastInvoice ? lastInvoice.sequence + 1 : 1;
    const invoiceNumber = `FT ${series}/${sequence.toString().padStart(4, '0')}`;

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
            nuit: customerInfo.nuit || '999999999',
            address: customerInfo.address || ''
        },
        items: (order.items || []).map(i => ({
            name: i.item?.name || 'Item',
            qty: i.qty || 1,
            price: i.itemPrice || 0,
            taxAmount: Number(((i.subtotal || 0) * IVA_RATE / IVA_DIVISOR).toFixed(2)),
            total: i.subtotal || 0
        })),
        // Derive subtotal and tax from total if not explicitly set
        subtotal: order.subtotal || Number((order.total / IVA_DIVISOR).toFixed(2)),
        taxTotal: order.tax || Number((order.total - order.total / IVA_DIVISOR).toFixed(2)),
        total: order.total,
        paymentMethod: order.paymentMethod || 'cash',
        hash,
        prevHash
    });

    await recordSaleTransaction(invoice, order);
    return invoice;
};

/**
 * Record accounting transaction for a sale (via fiscal invoice)
 */
const recordSaleTransaction = async (invoice, order) => {
    const restaurantId = invoice.restaurant;

    const accounts = await Account.find({
        restaurant: restaurantId,
        code: { $in: ['111', '11', '2433', '711', '71', '211', '21'] }
    });

    const getAccount = (codes) => {
        const codeList = Array.isArray(codes) ? codes : [codes];
        for (const c of codeList) {
            const found = accounts.find(a => a.code === c);
            if (found) return found;
        }
        return null;
    };

    const accSales = getAccount(['711', '71']);
    const accTax = getAccount('2433');
    const accCash = getAccount(['111', '11']);
    const accClients = getAccount(['211', '21']);

    if (!accSales || !accCash || !accClients) {
        throw new Error('Contas contabilísticas (711, 111/211) não configuradas para este restaurante');
    }

    const transactionItems = [];
    transactionItems.push({ account: accSales._id, credit: order.subtotal, debit: 0 });

    if (order.tax > 0 && accTax) {
        transactionItems.push({ account: accTax._id, credit: order.tax, debit: 0 });
    }

    const targetAccount = order.paymentStatus === 'completed' ? accCash : accClients;
    transactionItems.push({ account: targetAccount._id, debit: order.total, credit: 0 });

    await AccountingTransaction.create({
        restaurant: restaurantId,
        description: `Venda – Fatura ${invoice.invoiceNumber}`,
        referenceType: 'order',
        referenceId: order._id,
        items: transactionItems,
        vatAmount: order.tax || 0,
        status: 'posted'
    });

    for (const item of transactionItems) {
        await Account.findByIdAndUpdate(item.account, {
            $inc: { balance: item.debit - item.credit }
        });
    }
};

/**
 * Void an invoice (creates reversal entry)
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
            description: `ESTORNO – Fatura ${invoice.invoiceNumber} – Motivo: ${reason}`,
            referenceType: 'order',
            referenceId: invoice.order,
            items: revertItems,
            status: 'voided',
            createdBy: userId
        });

        for (const item of revertItems) {
            await Account.findByIdAndUpdate(item.account, {
                $inc: { balance: item.debit - item.credit }
            });
        }
    }

    return invoice;
};

/**
 * Post a manual or automated accounting transaction (double-entry)
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
    status = 'posted',
    vatAmount = 0
}) => {
    if (!restaurantId || !description || !referenceType || !items || !items.length) {
        throw new Error('Campos obrigatórios em falta na transacção');
    }

    const totalDebit = items.reduce((sum, item) => sum + (Number(item.debit) || 0), 0);
    const totalCredit = items.reduce((sum, item) => sum + (Number(item.credit) || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error(`Débitos (${totalDebit.toFixed(2)}) ≠ Créditos (${totalCredit.toFixed(2)}) – Lançamento desequilibrado`);
    }

    const documentNumber = `DOC-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 999).toString().padStart(3, '0')}`;

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
        vatAmount,
        date: new Date()
    });

    if (status === 'posted') {
        for (const item of transaction.items) {
            await Account.findByIdAndUpdate(item.account, {
                $inc: { balance: item.debit - item.credit }
            });
        }
    }

    return transaction;
};

/**
 * Void / Estornar a posted transaction
 * Creates a reversal entry – never deletes confirmed entries
 */
export const voidTransaction = async (transactionId, reason, userId) => {
    const tx = await AccountingTransaction.findById(transactionId);
    if (!tx) throw new Error('Lançamento não encontrado');
    if (tx.status === 'voided') throw new Error('Lançamento já estornado');
    if (tx.isLocked) throw new Error('Lançamento bloqueado – não pode ser estornado');

    tx.status = 'voided';
    tx.voidReason = reason;
    await tx.save();

    // Reversal items (swap debit/credit)
    const revertItems = tx.items.map(i => ({
        account: i.account,
        debit: i.credit,
        credit: i.debit
    }));

    const reversal = await postTransaction({
        restaurantId: tx.restaurant,
        description: `ESTORNO – ${tx.description} – Motivo: ${reason}`,
        referenceType: tx.referenceType,
        referenceId: tx.referenceId,
        sourceType: tx.sourceType,
        items: revertItems,
        userId,
        status: 'posted'
    });

    return { voided: tx, reversal };
};

/**
 * Automate accounting entry for a paid sales order
 * Generates: Debit Cash/Bank/Client → Credit Revenue + IVA Liquidado
 * IVA: 16% (Lei 32/2007 – Moçambique)
 */
export const processPaidOrderEntry = async (restaurantId, order, userId) => {
    const accounts = await Account.find({ restaurant: restaurantId });
    const getAccount = (codes) => {
        const list = Array.isArray(codes) ? codes : [codes];
        for (const c of list) {
            const f = accounts.find(a => a.code === c);
            if (f) return f;
        }
        return null;
    };

    const accSales = getAccount(['711', '71']);
    const accTax = getAccount('2433'); // IVA Liquidado

    // Determine debit account based on payment method
    let accDebit;
    if (order.paymentStatus !== 'completed') {
        accDebit = getAccount(['211', '21']); // Clients C/C
    } else {
        switch ((order.paymentMethod || '').toLowerCase()) {
            case 'm-pesa': case 'mpesa': case 'e-mola': case 'emola':
                accDebit = getAccount('13'); // Carteiras Móveis
                break;
            case 'pos': case 'transfer': case 'visa':
                accDebit = getAccount(['121', '12']); // Bancos
                break;
            case 'cash': default:
                accDebit = getAccount(['111', '11']); // Caixa
                break;
        }
    }

    if (!accSales || !accDebit) {
        throw new Error('Contas PGC-NIRF obrigatórias (711, 111/121/211) não encontradas. Execute o seed do Plano de Contas.');
    }

    // IVA calculation: extract 16% from gross total (inclusive)
    let netRevenue = order.total;
    let vatAmount = 0;

    if (accTax && order.total > 0) {
        netRevenue = Number((order.total / IVA_DIVISOR).toFixed(2));
        vatAmount = Number((order.total - netRevenue).toFixed(2));
    }

    const items = [
        // Debit: Cash / Bank / Client (total received)
        { account: accDebit._id, debit: order.total, credit: 0 },
        // Credit: Revenue (net of VAT)
        { account: accSales._id, debit: 0, credit: netRevenue }
    ];

    if (vatAmount > 0 && accTax) {
        items.push({ account: accTax._id, debit: 0, credit: vatAmount });
    }

    // CMV (Cost of Goods Sold) – if product costs are available
    const accCMV = getAccount('61');
    const accInventory = getAccount(['32', '31']);
    let totalCost = 0;

    if (order.items && order.items.length > 0) {
        const itemIds = order.items.map(i => i.item);
        const menuItems = await MenuItem.find({ _id: { $in: itemIds } }).select('_id costPrice');

        for (const orderItem of order.items) {
            const menuItem = menuItems.find(m => m._id.equals(orderItem.item));
            if (menuItem && menuItem.costPrice > 0) {
                totalCost += menuItem.costPrice * orderItem.qty;
            }
        }
    }

    if (totalCost > 0 && accCMV && accInventory) {
        items.push({ account: accCMV._id, debit: totalCost, credit: 0 });
        items.push({ account: accInventory._id, debit: 0, credit: totalCost });
    }

    return await postTransaction({
        restaurantId,
        description: `Venda Automática – Pedido #${order.orderNumber || order._id.toString().slice(-6)} (IVA 16%)`,
        referenceType: 'order',
        referenceId: order._id,
        sourceType: 'order',
        sourceId: order._id,
        items,
        userId,
        vatAmount,
        status: 'posted'
    });
};

/**
 * Automate accounting entry for a PURCHASE (stock restock)
 * Generates: Debit Purchases/Inventory + IVA Dedutível → Credit Cash/Supplier
 * IVA: 16% (Lei 32/2007 – Moçambique)
 *
 * @param {*} restaurantId
 * @param {Object} purchaseData { supplierId, paymentMethod, totalAmount, ivaIncluded, description, items[] }
 * @param {*} userId
 */
export const processPurchaseEntry = async (restaurantId, purchaseData, userId) => {
    const accounts = await Account.find({ restaurant: restaurantId });
    const getAccount = (codes) => {
        const list = Array.isArray(codes) ? codes : [codes];
        for (const c of list) {
            const f = accounts.find(a => a.code === c);
            if (f) return f;
        }
        return null;
    };

    const { totalAmount, ivaIncluded = true, description, supplierId, paymentMethod } = purchaseData;

    // Inventory/Purchases account
    const accInventory = getAccount(['32', '31']); // Matérias-Primas or Mercadorias
    const accIVADed = getAccount('2432');       // IVA Dedutível

    // Credit account (who we pay)
    let accCredit;
    if (supplierId || (paymentMethod || '').toLowerCase() === 'credit') {
        accCredit = getAccount(['221', '22']); // Fornecedores
    } else if ((paymentMethod || '').toLowerCase() === 'mpesa' || (paymentMethod || '').toLowerCase() === 'emola') {
        accCredit = getAccount('13'); // Mobile wallets
    } else if ((paymentMethod || '').toLowerCase() === 'bank' || (paymentMethod || '').toLowerCase() === 'transfer') {
        accCredit = getAccount(['121', '12']); // Banco
    } else {
        accCredit = getAccount(['111', '11']); // Caixa (default)
    }

    if (!accInventory || !accCredit) {
        throw new Error('Contas PGC-NIRF obrigatórias (31/32, 111/221) não encontradas para lançar a compra.');
    }

    // Calculate net cost and IVA (16%)
    let netCost = totalAmount;
    let vatAmount = 0;

    if (ivaIncluded && accIVADed) {
        netCost = Number((totalAmount / IVA_DIVISOR).toFixed(2));
        vatAmount = Number((totalAmount - netCost).toFixed(2));
    }

    const items = [
        // Debit: Inventory / Purchases (net cost)
        { account: accInventory._id, debit: netCost, credit: 0 }
    ];

    if (vatAmount > 0 && accIVADed) {
        // Debit: IVA Dedutível (recoverable purchase tax)
        items.push({ account: accIVADed._id, debit: vatAmount, credit: 0 });
    }

    // Credit: Cash or Supplier (total paid/owed)
    items.push({ account: accCredit._id, debit: 0, credit: totalAmount });

    return await postTransaction({
        restaurantId,
        description: description || `Compra de Stock (IVA 16%) – ${new Date().toLocaleDateString('pt-MZ')}`,
        referenceType: 'expense',
        sourceType: 'manual',
        items,
        userId,
        vatAmount,
        status: 'posted'
    });
};

/**
 * Automate accounting entry for Payroll
 */
export const processPayrollEntry = async (restaurantId, payroll, userId) => {
    const accounts = await Account.find({ restaurant: restaurantId });
    const getAccount = (codes) => {
        const list = Array.isArray(codes) ? codes : [codes];
        for (const c of list) {
            const f = accounts.find(a => a.code === c);
            if (f) return f;
        }
        return null;
    };

    const accExpense = getAccount(['621', '62']); // Remunerações / Gastos com Pessoal
    const accCash = getAccount(['121', '111']); // Bancos ou Caixa
    const accSalPayable = getAccount('25'); // Trabalhadores – Remunerações a Pagar

    if (!accExpense || !accCash) {
        throw new Error('Contas PGC obrigatórias (62, 121/111) não encontradas para processamento da folha de salários.');
    }

    const items = [];

    if (accSalPayable) {
        // Two-step: recognise liability then pay it
        // Step 1: Debit Expense → Credit Salary Payable
        items.push({ account: accExpense._id, debit: payroll.amount, credit: 0 });
        items.push({ account: accSalPayable._id, debit: 0, credit: payroll.amount });

        const recognise = await postTransaction({
            restaurantId,
            description: `Reconhecimento de Salário – ${payroll.employeeName || 'Funcionário'}`,
            referenceType: 'expense',
            sourceType: 'payroll',
            employee: payroll.employeeId,
            items,
            userId,
            status: 'posted'
        });

        // Step 2: Debit Salary Payable → Credit Bank/Cash (payment)
        const payItems = [
            { account: accSalPayable._id, debit: payroll.amount, credit: 0 },
            { account: accCash._id, debit: 0, credit: payroll.amount }
        ];

        const payment = await postTransaction({
            restaurantId,
            description: `Pagamento de Salário – ${payroll.employeeName || 'Funcionário'}`,
            referenceType: 'expense',
            sourceType: 'payroll',
            sourceId: payroll._id,
            employee: payroll.employeeId,
            items: payItems,
            userId,
            status: 'posted'
        });

        return { recognise, payment };
    } else {
        // Simple single-entry (expense → cash)
        items.push({ account: accExpense._id, debit: payroll.amount, credit: 0 });
        items.push({ account: accCash._id, debit: 0, credit: payroll.amount });

        return await postTransaction({
            restaurantId,
            description: `Pagamento de Salário – ${payroll.employeeName || 'Funcionário'}`,
            referenceType: 'expense',
            sourceType: 'payroll',
            sourceId: payroll._id,
            employee: payroll.employeeId,
            items,
            userId,
            status: 'posted'
        });
    }
};

/**
 * Automate accounting entry for Stock Waste / Quebras
 * Generates: Debit CMV (61) → Credit Inventory (31/32)
 */
export const processWasteEntry = async (restaurantId, wasteData, userId) => {
    const accounts = await Account.find({ restaurant: restaurantId });
    const getAccount = (codes) => {
        const list = Array.isArray(codes) ? codes : [codes];
        for (const c of list) {
            const f = accounts.find(a => a.code === c);
            if (f) return f;
        }
        return null;
    };

    const { totalCost, description, menuItemId } = wasteData;

    if (totalCost <= 0) return null; // Nothing to post if cost is 0

    const accCMV = getAccount('61');
    const accInventory = getAccount(['32', '31']);

    if (!accCMV || !accInventory) {
        throw new Error('Contas PGC obrigatórias (61, 31/32) não encontradas para lançar a quebra de stock.');
    }

    const items = [
        { account: accCMV._id, debit: totalCost, credit: 0 },
        { account: accInventory._id, debit: 0, credit: totalCost }
    ];

    return await postTransaction({
        restaurantId,
        description: description || 'Quebra de Stock / Desperdício',
        referenceType: 'expense',
        sourceType: 'stock_waste',
        sourceId: menuItemId,
        items,
        userId,
        status: 'posted'
    });
};

export default {
    IVA_RATE,
    IVA_DIVISOR,
    setupDefaultAccounts,
    generateFiscalInvoice,
    voidInvoice,
    voidTransaction,
    postTransaction,
    processPaidOrderEntry,
    processPurchaseEntry,
    processPayrollEntry,
    processWasteEntry
};
