import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Plus, Trash2, Save, AlertCircle, FileText, ShoppingBag, Users, FileSignature } from 'lucide-react';
import { accountingAPI, usersAPI } from '../services/api';

const SOURCE_TYPES = {
    MANUAL: 'manual',
    ORDER: 'order',
    PAYROLL: 'payroll',
    EXPENSE: 'expense'
};

const TEMPLATES = [
    { label: 'Venda do dia', value: 'Venda do dia' },
    { label: 'Pagamento de salário', value: 'Pagamento de salário' },
    { label: 'Compra a fornecedor', value: 'Compra a fornecedor' },
    { label: 'Ajuste de caixa', value: 'Ajuste de caixa' }
];

const TransactionModal = ({ isOpen, onClose, onSuccess }) => {
    const { t } = useTranslation();
    const [accounts, setAccounts] = useState([]);
    const [pendingOrders, setPendingOrders] = useState([]);
    const [employees, setEmployees] = useState([]);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const [sourceType, setSourceType] = useState(SOURCE_TYPES.MANUAL);
    const [selectedOrderId, setSelectedOrderId] = useState('');
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [description, setDescription] = useState('');
    const [costCenter, setCostCenter] = useState('Geral');
    const [items, setItems] = useState([
        { id: 1, account: '', debit: '', credit: '' },
        { id: 2, account: '', debit: '', credit: '' }
    ]);

    useEffect(() => {
        if (isOpen) {
            fetchAccounts();
            fetchPendingOrders();
            // Reset form
            setSourceType(SOURCE_TYPES.MANUAL);
            setSelectedOrderId('');
            setSelectedEmployeeId('');
            setDescription('');
            setCostCenter('Geral');
            setItems([
                { id: Date.now(), account: '', debit: '', credit: '' },
                { id: Date.now() + 1, account: '', debit: '', credit: '' }
            ]);
            setError(null);
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && sourceType === SOURCE_TYPES.PAYROLL) {
            fetchEmployees();
        }
    }, [isOpen, sourceType]);

    const fetchAccounts = async () => {
        try {
            setLoading(true);
            const res = await accountingAPI.getAccounts();
            setAccounts(res.data.accounts || []);
        } catch (err) {
            console.error('Failed to fetch accounts', err);
            setError(t('failed_to_load_accounts') || 'Falha ao carregar contas.');
        } finally {
            setLoading(false);
        }
    };

    const fetchPendingOrders = async () => {
        try {
            const res = await accountingAPI.getPendingOrders();
            setPendingOrders(res.data.pendingOrders || []);
        } catch (err) {
            console.error('Failed to fetch pending orders', err);
        }
    };

    const fetchEmployees = async () => {
        try {
            const res = await usersAPI.getAll();
            setEmployees(res.data.users || []);
        } catch (err) {
            console.error('Failed to fetch employees', err);
        }
    };

    const handleSourceTypeSelect = (type) => {
        setSourceType(type);
        setItems([
            { id: Date.now(), account: '', debit: '', credit: '' },
            { id: Date.now() + 1, account: '', debit: '', credit: '' }
        ]);
        setSelectedOrderId('');
        if (type === SOURCE_TYPES.ORDER) {
            setDescription('Venda Automática - Pedido...');
        } else if (type === SOURCE_TYPES.PAYROLL) {
            setDescription('Pagamento de salário');
        } else {
            setDescription('');
        }
    };

    const handleOrderSelect = (orderId) => {
        setSelectedOrderId(orderId);
        const order = pendingOrders.find(o => o._id === orderId);
        if (order) {
            setDescription(`Venda Automática - Pedido #${order.orderNumber || order._id.toString().slice(-6)}`);

            // PGC-NIRF Auto-fill logic
            const getAcc = (code) => accounts.find(a => a.code === code)?._id || '';
            const accSales = getAcc('711') || getAcc('71');
            const accTax = getAcc('2433');

            let accDebitCode = '111'; // Caixa default
            const method = (order.paymentMethod || '').toLowerCase();
            if (order.paymentStatus !== 'completed') {
                accDebitCode = '211'; // Clientes
            } else if (['m-pesa', 'mpesa', 'e-mola', 'emola', 'pos', 'transfer', 'visa'].includes(method)) {
                accDebitCode = '121'; // Bancos
            }
            const accDebit = getAcc(accDebitCode) || getAcc('12');

            // 17% IVA logic
            let netRevenue = order.total;
            let vatAmount = 0;
            if (accTax) {
                netRevenue = Number((order.total / 1.17).toFixed(2));
                vatAmount = Number((order.total - netRevenue).toFixed(2));
            }

            const newItems = [];

            // Debit Asset (Total)
            newItems.push({ id: Date.now() + 1, account: accDebit, debit: order.total.toFixed(2), credit: '' });

            // Credit Sales (Net)
            newItems.push({ id: Date.now() + 2, account: accSales, debit: '', credit: netRevenue.toFixed(2) });

            // Credit Tax (IVA Liquidado)
            if (vatAmount > 0 && accTax) {
                newItems.push({ id: Date.now() + 3, account: accTax, debit: '', credit: vatAmount.toFixed(2) });
            }

            setItems(newItems);
        }
    };

    const handleEmployeeSelect = (empId) => {
        setSelectedEmployeeId(empId);
        const emp = employees.find(e => e._id === empId);
        if (emp) {
            setDescription(`Pagamento de salário - ${emp.name}`);
            const getAcc = (code) => accounts.find(a => a.code === code)?._id || '';
            const accExpense = getAcc('62') || getAcc('63'); // Gastos com pessoal
            const accCash = getAcc('121') || getAcc('111'); // Banco/Caixa
            setItems([
                { id: Date.now() + 1, account: accExpense, debit: (emp.salary || 0).toFixed(2), credit: '' },
                { id: Date.now() + 2, account: accCash, debit: '', credit: (emp.salary || 0).toFixed(2) }
            ]);
        }
    };

    const handleAddItem = () => {
        setItems([...items, { id: Date.now(), account: '', debit: '', credit: '' }]);
    };

    const handleRemoveItem = (id) => {
        if (items.length <= 2) return; // Keep at least 2 lines
        setItems(items.filter(item => item.id !== id));
    };

    const handleItemChange = (id, field, value) => {
        setItems(items.map(item => {
            if (item.id === id) {
                const updated = { ...item, [field]: value };
                // Mutual exclusivity
                if (field === 'debit' && value) updated.credit = '';
                if (field === 'credit' && value) updated.debit = '';
                return updated;
            }
            return item;
        }));
    };

    const totalDebit = items.reduce((sum, item) => sum + (parseFloat(item.debit) || 0), 0);
    const totalCredit = items.reduce((sum, item) => sum + (parseFloat(item.credit) || 0), 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
    const progressPercent = totalDebit > 0 ? Math.min(100, (totalCredit / totalDebit) * 100) : 0;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!description.trim()) {
            setError(t('description_required') || 'A descrição é obrigatória.');
            return;
        }

        const validItems = items.filter(i => i.account && (parseFloat(i.debit) > 0 || parseFloat(i.credit) > 0));

        if (validItems.length < 2) {
            setError(t('min_transaction_lines') || 'São necessárias pelo menos duas linhas válidas.');
            return;
        }

        if (!isBalanced) {
            setError(t('transaction_not_balanced') || 'A transação não está balanceada (Débitos ≠ Créditos).');
            return;
        }

        try {
            setSaving(true);
            const payload = {
                description,
                costCenter,
                sourceType,
                sourceId: selectedOrderId || undefined,
                employee: selectedEmployeeId || undefined,
                items: validItems.map(i => ({
                    account: i.account,
                    debit: parseFloat(i.debit) || 0,
                    credit: parseFloat(i.credit) || 0
                }))
            };
            await accountingAPI.createTransaction(payload);
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            console.error('Failed to create transaction', err);
            setError(err.response?.data?.error || t('failed_create_transaction') || 'Falha ao criar transação.');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    const sourceOptions = [
        { id: SOURCE_TYPES.MANUAL, label: 'Manual', icon: FileSignature },
        { id: SOURCE_TYPES.ORDER, label: 'Pedido Pago', icon: ShoppingBag },
        { id: SOURCE_TYPES.PAYROLL, label: 'Pagamento de Salário', icon: Users },
        { id: SOURCE_TYPES.EXPENSE, label: 'Compra / Fornecedor', icon: FileText },
    ];

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
            zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px'
        }}>
            <div style={{
                background: 'white', borderRadius: '24px',
                width: '100%', maxWidth: '850px',
                maxHeight: '90vh', overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                display: 'flex', flexDirection: 'column'
            }}>
                {/* Header */}
                <div style={{
                    padding: '24px 32px', borderBottom: '1px solid #f1f5f9',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: '#f8fafc'
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
                            {t('new_transaction')}
                        </h2>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                            {t('new_transaction_desc') || 'Lançamento manual no Diário Geral'}
                        </p>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px',
                        padding: '8px', cursor: 'pointer', color: '#64748b', transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '32px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {error && (
                        <div style={{
                            padding: '16px', background: '#fef2f2', border: '1px solid #fecaca',
                            borderRadius: '12px', color: '#ef4444', display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '14px'
                        }}>
                            <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Source Selection */}
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>
                            Origem do Lançamento
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                            {sourceOptions.map(opt => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => handleSourceTypeSelect(opt.id)}
                                    style={{
                                        padding: '12px', borderRadius: '12px', display: 'flex', flexDirection: 'column',
                                        alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s',
                                        border: sourceType === opt.id ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                                        background: sourceType === opt.id ? '#eef2ff' : 'white',
                                        color: sourceType === opt.id ? '#4f46e5' : '#64748b',
                                        boxShadow: sourceType === opt.id ? '0 4px 6px -1px rgba(79, 70, 229, 0.1)' : 'none'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (sourceType !== opt.id) {
                                            e.currentTarget.style.background = '#f8fafc';
                                            e.currentTarget.style.borderColor = '#cbd5e1';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (sourceType !== opt.id) {
                                            e.currentTarget.style.background = 'white';
                                            e.currentTarget.style.borderColor = '#e2e8f0';
                                        }
                                    }}
                                >
                                    <opt.icon size={24} />
                                    <span style={{ fontSize: '12px', fontWeight: '700' }}>{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Order Selection (If source is Order) */}
                    {sourceType === SOURCE_TYPES.ORDER && (
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
                                Selecionar Pedido Pendente *
                            </label>
                            <select
                                value={selectedOrderId}
                                onChange={(e) => handleOrderSelect(e.target.value)}
                                style={{
                                    width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid #cbd5e1',
                                    fontSize: '14px', outline: 'none', background: 'white'
                                }}
                            >
                                <option value="">-- Selecione o Pedido Pago --</option>
                                {pendingOrders.map(order => (
                                    <option key={order._id} value={order._id}>
                                        Pedido #{order.orderNumber || order._id.toString().slice(-6)} - {new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(order.total)} ({order.paymentMethod})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Employee Selection (If source is Payroll) */}
                    {sourceType === SOURCE_TYPES.PAYROLL && (
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
                                Selecionar Trabalhador / Funcionário *
                            </label>
                            <select
                                value={selectedEmployeeId}
                                onChange={(e) => {
                                    setSelectedEmployeeId(e.target.value);
                                    if (e.target.options[e.target.selectedIndex].text) {
                                        setDescription(`Pagamento de salário - ${e.target.options[e.target.selectedIndex].text}`);
                                    }
                                }}
                                style={{
                                    width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid #cbd5e1',
                                    fontSize: '14px', outline: 'none', background: 'white'
                                }}
                            >
                                <option value="">-- Selecione o Favorecido --</option>
                                {employees.map(emp => (
                                    <option key={emp._id} value={emp._id}>
                                        {emp.name} {emp.role?.name ? `(${emp.role.name})` : ''} - {emp.email}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Employee Selection (If source is Payroll) */}
                    {sourceType === SOURCE_TYPES.PAYROLL && (
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
                                Selecionar Trabalhador / Funcionário *
                            </label>
                            <select
                                value={selectedEmployeeId}
                                onChange={(e) => handleEmployeeSelect(e.target.value)}
                                style={{
                                    width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid #cbd5e1',
                                    fontSize: '14px', outline: 'none', background: 'white'
                                }}
                            >
                                <option value="">-- Selecione o Favorecido --</option>
                                {employees.map(emp => (
                                    <option key={emp._id} value={emp._id}>
                                        {emp.name} {emp.role?.name ? `(${emp.role.name})` : ''} - {emp.email}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Cost Center / Centro de Custo Selection */}
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
                            Centro de Custo *
                        </label>
                        <select
                            value={costCenter}
                            onChange={(e) => setCostCenter(e.target.value)}
                            style={{
                                width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid #cbd5e1',
                                fontSize: '14px', outline: 'none', background: 'white'
                            }}
                        >
                            <option value="Geral">Geral</option>
                            <option value="Restaurante">Restaurante</option>
                            <option value="Clínica">Clínica</option>
                            <option value="Microcrédito">Microcrédito</option>
                        </select>
                    </div>

                    {/* Description Templates & Input */}
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
                            {t('description')} *
                        </label>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                            {TEMPLATES.map(tmpl => (
                                <button
                                    type="button"
                                    key={tmpl.value}
                                    onClick={() => setDescription(tmpl.value)}
                                    style={{
                                        padding: '6px 14px', borderRadius: '16px', fontSize: '12px', fontWeight: '600',
                                        background: description === tmpl.value ? '#1e293b' : '#f1f5f9',
                                        color: description === tmpl.value ? 'white' : '#475569',
                                        border: '1px solid transparent', cursor: 'pointer', transition: 'all 0.2s',
                                        boxShadow: description === tmpl.value ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                                    }}
                                    onMouseEnter={(e) => { if (description !== tmpl.value) e.currentTarget.style.background = '#e2e8f0'; }}
                                    onMouseLeave={(e) => { if (description !== tmpl.value) e.currentTarget.style.background = '#f1f5f9'; }}
                                >
                                    {tmpl.label}
                                </button>
                            ))}
                        </div>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t('transaction_desc_placeholder') || 'Ex: Pagamento de renda, Ajuste de saldo...'}
                            style={{
                                width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid #cbd5e1',
                                fontSize: '14px', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s'
                            }}
                            onFocus={(e) => { e.currentTarget.style.borderColor = '#4f46e5'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)'; }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.boxShadow = 'none'; }}
                        />
                    </div>

                    {/* Ledger Entries */}
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}>
                        <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>
                                {t('ledger_entries') || 'Linhas do Lançamento'}
                            </span>
                            <button
                                type="button"
                                onClick={handleAddItem}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    background: '#e0e7ff', border: 'none', color: '#4f46e5',
                                    padding: '6px 12px', borderRadius: '8px', fontSize: '12px',
                                    fontWeight: '700', cursor: 'pointer'
                                }}
                            >
                                <Plus size={16} />
                                {t('add_line') || 'Adicionar'}
                            </button>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr>
                                    <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>{t('account')}</th>
                                    <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', width: '140px' }}>{t('debit')}</th>
                                    <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', width: '140px' }}>{t('credit')}</th>
                                    <th style={{ padding: '12px 16px', width: '60px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, index) => (
                                    <tr key={item.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '12px 16px' }}>
                                            <select
                                                value={item.account}
                                                onChange={(e) => handleItemChange(item.id, 'account', e.target.value)}
                                                style={{
                                                    width: '100%', padding: '12px 14px', borderRadius: '8px',
                                                    border: !item.account ? '1px solid #fca5a5' : '1px solid #cbd5e1',
                                                    fontSize: '14px', outline: 'none', background: 'white',
                                                    transition: 'border-color 0.2s, box-shadow 0.2s'
                                                }}
                                                onFocus={(e) => { e.currentTarget.style.borderColor = '#4f46e5'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)'; }}
                                                onBlur={(e) => { e.currentTarget.style.borderColor = !item.account ? '#fca5a5' : '#cbd5e1'; e.currentTarget.style.boxShadow = 'none'; }}
                                            >
                                                <option value="">{t('select_account') || '-- Selecionar --'}</option>
                                                {accounts.filter(a => !a.isGroup).map(acc => (
                                                    <option key={acc._id} value={acc._id}>
                                                        {acc.code} - {acc.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <input
                                                type="number" step="0.01" min="0" value={item.debit}
                                                onChange={(e) => handleItemChange(item.id, 'debit', e.target.value)}
                                                placeholder="0.00"
                                                style={{
                                                    width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #cbd5e1',
                                                    fontSize: '14px', outline: 'none', textAlign: 'right',
                                                    transition: 'border-color 0.2s, box-shadow 0.2s'
                                                }}
                                                onFocus={(e) => { e.currentTarget.style.borderColor = '#4f46e5'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)'; }}
                                                onBlur={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.boxShadow = 'none'; }}
                                            />
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <input
                                                type="number" step="0.01" min="0" value={item.credit}
                                                onChange={(e) => handleItemChange(item.id, 'credit', e.target.value)}
                                                placeholder="0.00"
                                                style={{
                                                    width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #cbd5e1',
                                                    fontSize: '14px', outline: 'none', textAlign: 'right',
                                                    transition: 'border-color 0.2s, box-shadow 0.2s'
                                                }}
                                                onFocus={(e) => { e.currentTarget.style.borderColor = '#4f46e5'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)'; }}
                                                onBlur={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.boxShadow = 'none'; }}
                                            />
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveItem(item.id)}
                                                disabled={items.length <= 2}
                                                style={{
                                                    background: 'none', border: 'none', cursor: items.length <= 2 ? 'not-allowed' : 'pointer',
                                                    color: items.length <= 2 ? '#cbd5e1' : '#ef4444', padding: '8px'
                                                }}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Balance Progress Bar */}
                        <div style={{ height: '4px', background: '#e2e8f0', width: '100%' }}>
                            <div style={{
                                height: '100%',
                                width: `${progressPercent}%`,
                                background: isBalanced && totalDebit > 0 ? '#10b981' : '#f59e0b',
                                transition: 'width 0.3s ease-out, background-color 0.3s'
                            }} />
                        </div>

                        <div style={{ padding: '16px 20px', background: isBalanced && totalDebit > 0 ? '#f0fdf4' : '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: '40px' }}>
                            <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Total Débitos</span>
                                <span style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>{totalDebit.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Total Créditos</span>
                                <span style={{ fontSize: '18px', fontWeight: '800', color: isBalanced ? '#10b981' : '#ef4444' }}>{totalCredit.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div style={{
                    padding: '24px 32px', borderTop: '1px solid #f1f5f9', background: 'white',
                    display: 'flex', justifyContent: 'flex-end', gap: '16px'
                }}>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        style={{
                            padding: '12px 24px', borderRadius: '12px', background: 'white',
                            border: '1px solid #cbd5e1', color: '#475569', fontSize: '14px',
                            fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {t('cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={saving || !isBalanced || totalDebit === 0 || items.some(i => !i.account)}
                        style={{
                            padding: '12px 28px', borderRadius: '12px',
                            background: (saving || !isBalanced || totalDebit === 0 || items.some(i => !i.account)) ? '#e2e8f0' : '#4f46e5',
                            border: 'none', color: (saving || !isBalanced || totalDebit === 0 || items.some(i => !i.account)) ? '#94a3b8' : 'white', fontSize: '14px',
                            fontWeight: '700', cursor: (saving || !isBalanced || totalDebit === 0 || items.some(i => !i.account)) ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: '8px',
                            transition: 'all 0.2s',
                            boxShadow: (saving || !isBalanced || totalDebit === 0 || items.some(i => !i.account)) ? 'none' : '0 4px 6px -1px rgba(79, 70, 229, 0.3)'
                        }}
                        onMouseEnter={(e) => { if (!saving && isBalanced && totalDebit > 0 && !items.some(i => !i.account)) e.currentTarget.style.background = '#4338ca'; }}
                        onMouseLeave={(e) => { if (!saving && isBalanced && totalDebit > 0 && !items.some(i => !i.account)) e.currentTarget.style.background = '#4f46e5'; }}
                    >
                        <Save size={18} />
                        {saving ? t('saving') : t('save')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TransactionModal;
