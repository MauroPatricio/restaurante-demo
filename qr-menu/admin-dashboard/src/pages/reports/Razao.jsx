import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { accountingAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
    History, Search, Filter, Calendar,
    ArrowLeft, Download, FileText,
    ArrowUpCircle, ArrowDownCircle, Info, Hash,
    FileImage
} from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import { exportToPDF, exportToExcel } from '../../utils/ExportUtils';

export default function Razao() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [accounts, setAccounts] = useState([]);
    const [selectedAccount, setSelectedAccount] = useState('');
    const [razaoData, setRazaoData] = useState(null);
    const [loading, setLoading] = useState(false);

    // Dates filters (optional)
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        fetchAccounts();
    }, []);

    useEffect(() => {
        if (selectedAccount) {
            fetchRazao();
        } else {
            setRazaoData(null);
        }
    }, [selectedAccount, startDate, endDate]);

    const fetchAccounts = async () => {
        try {
            const res = await accountingAPI.getAccounts();
            setAccounts(res.data.accounts.filter(a => !a.isGroup) || []);
        } catch (error) {
            console.error('Failed to fetch accounts:', error);
        }
    };

    const fetchRazao = async () => {
        try {
            setLoading(true);
            const params = { accountId: selectedAccount };
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;

            const res = await accountingAPI.getRazao(params);
            setRazaoData(res.data);
        } catch (error) {
            console.error('Failed to fetch razao:', error);
        } finally {
            setLoading(false);
        }
    };

    const currency = user?.restaurant?.settings?.currency || 'MT';

    const handleExportPDF = () => {
        if (!razaoData) return;
        const columns = [
            { header: 'Data', dataKey: 'date' },
            { header: 'Descrição', dataKey: 'description' },
            { header: 'Débito', dataKey: 'debit' },
            { header: 'Crédito', dataKey: 'credit' },
            { header: 'Saldo Acumulado', dataKey: 'balance' }
        ];

        const data = razaoData.entries.map(e => ({
            date: new Date(e.date).toLocaleDateString(),
            description: e.description,
            debit: e.debit > 0 ? e.debit.toLocaleString('pt-MZ', { minimumFractionDigits: 2 }) : '-',
            credit: e.credit > 0 ? e.credit.toLocaleString('pt-MZ', { minimumFractionDigits: 2 }) : '-',
            balance: e.balance.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })
        }));

        exportToPDF({
            title: `Razão - ${razaoData.account.code} ${razaoData.account.name}`,
            subtitle: `Extrato de movimentos | Período: Todos os Registos`,
            columns,
            data,
            filename: `Razao_${razaoData.account.code}_${new Date().toISOString().split('T')[0]}`,
            currency
        });
    };

    const handleExportExcel = () => {
        if (!razaoData) return;
        const columns = [
            { header: 'Data', dataKey: 'date' },
            { header: 'Descrição', dataKey: 'description' },
            { header: 'Débito', dataKey: 'debit' },
            { header: 'Crédito', dataKey: 'credit' },
            { header: 'Saldo Acumulado', dataKey: 'balance' }
        ];

        const data = razaoData.entries.map(e => ({
            date: new Date(e.date).toLocaleDateString(),
            description: e.description,
            debit: e.debit || 0,
            credit: e.credit || 0,
            balance: e.balance || 0
        }));

        exportToExcel({
            title: `Razão - ${razaoData.account.code} ${razaoData.account.name}`,
            columns,
            data,
            filename: `Razao_${razaoData.account.code}_${new Date().toISOString().split('T')[0]}`,
            currency
        });
    };

    return (
        <div style={{ padding: '32px' }}>
            {/* Header */}
            <div style={{ marginBottom: '48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', margin: 0 }}>Razão</h2>
                    <p style={{ color: '#94a3b8', fontWeight: '700' }}>Extrato de movimentos por conta contabilística</p>
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <Hash style={{ position: 'absolute', left: '16px', color: '#94a3b8' }} size={18} />
                        <select
                            value={selectedAccount}
                            onChange={(e) => setSelectedAccount(e.target.value)}
                            style={{
                                padding: '12px 16px 12px 48px', borderRadius: '16px', border: '1px solid #e2e8f0',
                                width: '350px', outline: 'none', fontWeight: '600', appearance: 'none', background: 'white'
                            }}
                        >
                            <option value="">Selecione uma conta...</option>
                            {accounts.map(acc => (
                                <option key={acc._id} value={acc._id}>{acc.code} - {acc.name}</option>
                            ))}
                        </select>
                    </div>
                    {razaoData && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={handleExportPDF}
                                style={{
                                    padding: '10px 16px', borderRadius: '12px', background: 'white', border: '1px solid #e2e8f0',
                                    color: '#475569', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px',
                                    cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }}>
                                <FileText size={16} style={{ color: '#ef4444' }} />
                                PDF
                            </button>
                            <button
                                onClick={handleExportExcel}
                                style={{
                                    padding: '10px 16px', borderRadius: '12px', background: 'white', border: '1px solid #e2e8f0',
                                    color: '#475569', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px',
                                    cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }}>
                                <Download size={16} style={{ color: '#10b981' }} />
                                Excel
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {loading && <div className="py-12"><LoadingSpinner /></div>}

            {!loading && !selectedAccount && (
                <div style={{ padding: '64px', textAlign: 'center', background: '#f8fafc', borderRadius: '32px', border: '2px dashed #e2e8f0' }}>
                    <Search size={48} style={{ color: '#cbd5e1', marginBottom: '16px', mx: 'auto' }} />
                    <h4 style={{ color: '#64748b', fontWeight: '800' }}>Selecione uma conta para visualizar o Razão</h4>
                </div>
            )}

            {!loading && selectedAccount && razaoData && (
                <div style={{ background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <div style={{ padding: '24px 32px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <span style={{ fontSize: '12px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Conta selecionada
                            </span>
                            <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '4px 0 0 0' }}>
                                {razaoData.account.code} - {razaoData.account.name}
                            </h3>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '12px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Saldo Atualizado
                            </span>
                            <h3 style={{ fontSize: '24px', fontWeight: '900', color: razaoData.closingBalance >= 0 ? '#10b981' : '#ef4444', margin: '4px 0 0 0' }}>
                                {Math.abs(razaoData.closingBalance).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                                {razaoData.closingBalance >= 0 ? '' : ' (Devedor)'}
                            </h3>
                        </div>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
                            <tr>
                                <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', width: '120px' }}>Data</th>
                                <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>Descrição</th>
                                <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', width: '150px', textAlign: 'right' }}>Débito</th>
                                <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', width: '150px', textAlign: 'right' }}>Crédito</th>
                                <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', width: '150px', textAlign: 'right' }}>Saldo Acumulado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {razaoData.entries.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: '#64748b', fontWeight: '600' }}>
                                        Nenhum movimento encontrado para esta conta.
                                    </td>
                                </tr>
                            ) : (
                                razaoData.entries.map((entry, idx) => (
                                    <tr key={entry.transactionId + idx} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' }} className="hover:bg-slate-50">
                                        <td style={{ padding: '16px 24px', fontSize: '13px', fontWeight: '600', color: '#475569' }}>
                                            {new Date(entry.date).toLocaleDateString()}
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <p style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{entry.description}</p>
                                            <p style={{ margin: '4px 0 0 0', fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase' }}>
                                                Origem: {entry.sourceType || entry.referenceType} | Utilizador: {entry.createdBy}
                                            </p>
                                        </td>
                                        <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: '700', color: '#1e293b', textAlign: 'right' }}>
                                            {entry.debit > 0 ? entry.debit.toLocaleString('pt-MZ', { minimumFractionDigits: 2 }) : '-'}
                                        </td>
                                        <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: '700', color: '#10b981', textAlign: 'right' }}>
                                            {entry.credit > 0 ? entry.credit.toLocaleString('pt-MZ', { minimumFractionDigits: 2 }) : '-'}
                                        </td>
                                        <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: '800', color: entry.balance >= 0 ? '#10b981' : '#ef4444', textAlign: 'right', background: '#f8fafc' }}>
                                            {entry.balance.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
