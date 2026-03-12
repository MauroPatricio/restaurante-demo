import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { accountingAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
    ArrowLeft, RefreshCw, Printer, CheckCircle, AlertCircle,
    BarChart3, Calendar, Download
} from 'lucide-react';

const fmt = (val) =>
    Number(val || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const NATURE_LABEL = { debit: 'D', credit: 'C' };
const TYPE_COLORS = {
    asset: '#6366f1',
    liability: '#ef4444',
    equity: '#10b981',
    revenue: '#0ea5e9',
    expense: '#f97316'
};
const TYPE_BG = {
    asset: '#eef2ff',
    liability: '#fef2f2',
    equity: '#f0fdf4',
    revenue: '#f0f9ff',
    expense: '#fff7ed'
};

const periodOptions = [
    { label: 'Este Mês', value: 'month' },
    { label: 'Este Trimestre', value: 'quarter' },
    { label: 'Este Ano', value: 'year' },
    { label: 'Personalizado', value: 'custom' }
];

function getDateRange(period) {
    const now = new Date();
    let start, end;
    end = new Date(now);
    end.setHours(23, 59, 59, 999);

    if (period === 'month') {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'quarter') {
        const q = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), q * 3, 1);
    } else if (period === 'year') {
        start = new Date(now.getFullYear(), 0, 1);
    } else {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0]
    };
}

export default function Balancete() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const currency = user?.restaurant?.settings?.currency || 'MT';

    const [period, setPeriod] = useState('month');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    const load = async (customStart, customEnd) => {
        setLoading(true);
        setError(null);
        try {
            const range = period === 'custom'
                ? { startDate: customStart || startDate, endDate: customEnd || endDate }
                : getDateRange(period);

            const res = await accountingAPI.getTrialBalance(range);
            setData(res.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Falha ao carregar balancete');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [period]);

    const rows = (data?.trialBalance || []).filter(
        row => row.periodDebit > 0 || row.periodCredit > 0
    );

    const grandDebit = data?.grandDebit || 0;
    const grandCredit = data?.grandCredit || 0;
    const balanced = data?.balanced ?? false;

    return (
        <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
                <div>
                    <button
                        onClick={() => navigate('/dashboard/accounting')}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: '#6366f1', fontWeight: '700', cursor: 'pointer', marginBottom: '12px', fontSize: '13px' }}
                    >
                        <ArrowLeft size={16} /> Voltar
                    </button>
                    <h1 style={{ fontSize: '36px', fontWeight: '900', color: '#0f172a', margin: 0, letterSpacing: '-0.03em' }}>
                        Balancete <span style={{ color: '#6366f1' }}>Analítico</span>
                    </h1>
                    <p style={{ color: '#64748b', marginTop: '6px', fontWeight: '600' }}>
                        Movimentos de débito e crédito por período – PGC-NIRF
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => window.print()}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 18px', borderRadius: '14px', background: 'white', border: '1px solid #e2e8f0', color: '#475569', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}
                    >
                        <Printer size={15} />
                    </button>
                    <button
                        onClick={() => load()}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '14px', background: '#6366f1', color: 'white', border: 'none', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}
                    >
                        <RefreshCw size={15} /> Actualizar
                    </button>
                </div>
            </div>

            {/* Period Filter */}
            <div style={{
                background: 'white', borderRadius: '20px', padding: '20px 24px',
                marginBottom: '24px', border: '1px solid #f1f5f9',
                display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap'
            }}>
                <Calendar size={18} style={{ color: '#6366f1' }} />
                <span style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>Período:</span>

                <div style={{ display: 'flex', gap: '8px' }}>
                    {periodOptions.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => setPeriod(opt.value)}
                            style={{
                                padding: '8px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: '700',
                                background: period === opt.value ? '#6366f1' : '#f8fafc',
                                color: period === opt.value ? 'white' : '#64748b',
                                border: `1px solid ${period === opt.value ? '#6366f1' : '#e2e8f0'}`,
                                cursor: 'pointer'
                            }}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>

                {period === 'custom' && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                            style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: '600' }}
                        />
                        <span style={{ color: '#94a3b8' }}>→</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                            style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: '600' }}
                        />
                        <button
                            onClick={() => load(startDate, endDate)}
                            style={{ padding: '8px 16px', borderRadius: '10px', background: '#6366f1', color: 'white', border: 'none', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
                        >
                            Aplicar
                        </button>
                    </div>
                )}
            </div>

            {/* Balance Status */}
            {!loading && data && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '12px 20px', borderRadius: '14px', marginBottom: '20px',
                    background: balanced ? '#f0fdf4' : '#fef2f2',
                    border: `1px solid ${balanced ? '#86efac' : '#fca5a5'}`
                }}>
                    {balanced
                        ? <CheckCircle size={16} style={{ color: '#16a34a' }} />
                        : <AlertCircle size={16} style={{ color: '#dc2626' }} />
                    }
                    <span style={{ fontWeight: '700', fontSize: '13px', color: balanced ? '#15803d' : '#b91c1c' }}>
                        {balanced
                            ? `Balancete equilibrado – Total Débitos = Total Créditos = ${fmt(grandDebit)} ${currency}`
                            : `Atenção: Débitos (${fmt(grandDebit)}) ≠ Créditos (${fmt(grandCredit)}) ${currency}`
                        }
                    </span>
                </div>
            )}

            {/* Table */}
            <div style={{ background: 'white', borderRadius: '24px', overflow: 'hidden', border: '1px solid #f1f5f9', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                            {['Código', 'Conta', 'Tipo', 'Nat.', 'Débito do Período', 'Crédito do Período', 'Saldo'].map(h => (
                                <th key={h} style={{
                                    padding: '14px 16px', textAlign: h === 'Código' || h === 'Nat.' ? 'center' : h.startsWith('D') || h.startsWith('C') || h === 'Saldo' ? 'right' : 'left',
                                    fontSize: '11px', fontWeight: '900', color: '#64748b',
                                    textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap'
                                }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7} style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>A carregar...</td></tr>
                        ) : error ? (
                            <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>{error}</td></tr>
                        ) : rows.length === 0 ? (
                            <tr><td colSpan={7} style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontWeight: '600' }}>
                                Sem movimentos no período seleccionado.
                            </td></tr>
                        ) : rows.map((row, i) => {
                            const color = TYPE_COLORS[row.type] || '#64748b';
                            const bg = TYPE_BG[row.type] || '#f8fafc';
                            const saldo = row.periodDebit - row.periodCredit;

                            return (
                                <tr key={row._id} style={{
                                    borderBottom: '1px solid #f1f5f9',
                                    background: i % 2 === 0 ? 'white' : '#fafafa'
                                }}>
                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                        <span style={{ fontSize: '12px', fontWeight: '700', color, fontFamily: 'monospace', background: bg, padding: '3px 8px', borderRadius: '6px' }}>
                                            {row.code}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
                                        {row.isGroup
                                            ? <strong>{row.name}</strong>
                                            : row.name
                                        }
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: '700', color, background: bg, padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>
                                            {row.type === 'asset' ? 'Activo' : row.type === 'liability' ? 'Passivo' : row.type === 'equity' ? 'Cap. Próprio' : row.type === 'revenue' ? 'Rendimento' : 'Gasto'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                        <span style={{ fontSize: '11px', fontWeight: '900', color: row.nature === 'debit' ? '#6366f1' : '#ef4444', background: row.nature === 'debit' ? '#eef2ff' : '#fef2f2', padding: '3px 8px', borderRadius: '6px' }}>
                                            {NATURE_LABEL[row.nature] || '–'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontSize: '13px', fontWeight: '700', color: '#6366f1' }}>
                                        {row.periodDebit > 0 ? fmt(row.periodDebit) : '–'}
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontSize: '13px', fontWeight: '700', color: '#ef4444' }}>
                                        {row.periodCredit > 0 ? fmt(row.periodCredit) : '–'}
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontSize: '13px', fontWeight: '800', color: saldo >= 0 ? '#10b981' : '#ef4444' }}>
                                        {saldo >= 0 ? '+' : ''}{fmt(saldo)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    {!loading && !error && rows.length > 0 && (
                        <tfoot>
                            <tr style={{ background: '#0f172a', borderTop: '2px solid #334155' }}>
                                <td colSpan={4} style={{ padding: '14px 16px', color: '#94a3b8', fontWeight: '800', fontSize: '12px', textTransform: 'uppercase' }}>
                                    TOTAIS DO PERÍODO
                                </td>
                                <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'monospace', fontSize: '15px', fontWeight: '900', color: '#818cf8' }}>
                                    {fmt(grandDebit)} {currency}
                                </td>
                                <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'monospace', fontSize: '15px', fontWeight: '900', color: '#f87171' }}>
                                    {fmt(grandCredit)} {currency}
                                </td>
                                <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'monospace', fontSize: '15px', fontWeight: '900', color: balanced ? '#34d399' : '#fbbf24' }}>
                                    {fmt(grandDebit - grandCredit)} {currency}
                                </td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
}
