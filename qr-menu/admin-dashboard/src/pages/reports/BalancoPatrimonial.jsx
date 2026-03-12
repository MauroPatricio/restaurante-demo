import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { accountingAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
    Scale, TrendingUp, TrendingDown, Landmark, ArrowLeft,
    RefreshCw, Printer, AlertCircle, CheckCircle,
    Building2, Wallet, Shield
} from 'lucide-react';

const fmt = (val, currency = 'MT') =>
    `${Number(val || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;

const SectionCard = ({ title, icon: Icon, color, items, total, totalLabel }) => (
    <div style={{
        background: 'white',
        borderRadius: '24px',
        padding: '28px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        border: `1px solid ${color}20`
    }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ padding: '10px', background: `${color}15`, borderRadius: '14px', color }}>
                <Icon size={20} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b', margin: 0 }}>{title}</h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            {items.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '16px' }}>
                    Sem movimentos neste conjunto de contas.
                </p>
            ) : items.map(acc => (
                <div key={acc.code} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: '#f8fafc',
                    transition: 'background 0.2s'
                }}
                    onMouseEnter={e => e.currentTarget.style.background = `${color}08`}
                    onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
                >
                    <div>
                        <span style={{ fontSize: '11px', fontWeight: '700', color, marginRight: '8px', fontFamily: 'monospace' }}>
                            {acc.code}
                        </span>
                        <span style={{ fontSize: '13px', color: '#475569', fontWeight: '600' }}>{acc.name}</span>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b', fontFamily: 'monospace' }}>
                        {fmt(Math.abs(acc.balance))}
                    </span>
                </div>
            ))}
        </div>

        <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '14px 16px', background: `${color}10`, borderRadius: '14px',
            borderTop: `2px solid ${color}30`
        }}>
            <span style={{ fontSize: '13px', fontWeight: '900', color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {totalLabel}
            </span>
            <span style={{ fontSize: '18px', fontWeight: '900', color, fontFamily: 'monospace' }}>
                {fmt(total)}
            </span>
        </div>
    </div>
);

export default function BalancoPatrimonial() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const currency = user?.restaurant?.settings?.currency || 'MT';

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await accountingAPI.getBalanceSheet();
            setData(res.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Falha ao carregar balanço');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const balanced = data?.totals?.balanced;
    const totalAssets = data?.totals?.totalAssets || 0;
    const totalLiabilities = data?.totals?.totalLiabilities || 0;
    const totalEquity = data?.totals?.totalEquity || 0;

    // Filter out zero-balance accounts for display
    const filterActive = (arr) => (arr || []).filter(a => Math.abs(a.balance || 0) > 0.001);

    return (
        <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
                <div>
                    <button
                        onClick={() => navigate('/dashboard/accounting')}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: '#6366f1', fontWeight: '700', cursor: 'pointer', marginBottom: '12px', fontSize: '13px' }}
                    >
                        <ArrowLeft size={16} /> Voltar à Contabilidade
                    </button>
                    <h1 style={{ fontSize: '36px', fontWeight: '900', color: '#0f172a', margin: 0, letterSpacing: '-0.03em' }}>
                        Balanço <span style={{ color: '#6366f1' }}>Patrimonial</span>
                    </h1>
                    <p style={{ color: '#64748b', marginTop: '6px', fontWeight: '600' }}>
                        Activos, Passivos e Capital Próprio – PGC-NIRF Moçambique
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => window.print()}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '16px', background: 'white', border: '1px solid #e2e8f0', color: '#475569', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}
                    >
                        <Printer size={16} /> Imprimir
                    </button>
                    <button
                        onClick={load}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '16px', background: '#6366f1', color: 'white', border: 'none', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}
                    >
                        <RefreshCw size={16} /> Actualizar
                    </button>
                </div>
            </div>

            {/* Balance check banner */}
            {!loading && data && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '16px 24px', borderRadius: '16px', marginBottom: '32px',
                    background: balanced ? '#f0fdf4' : '#fef2f2',
                    border: `1px solid ${balanced ? '#86efac' : '#fca5a5'}`
                }}>
                    {balanced
                        ? <CheckCircle size={20} style={{ color: '#16a34a' }} />
                        : <AlertCircle size={20} style={{ color: '#dc2626' }} />
                    }
                    <div>
                        <p style={{ margin: 0, fontWeight: '800', color: balanced ? '#15803d' : '#b91c1c', fontSize: '14px' }}>
                            {balanced ? 'Balanço Equilibrado ✓' : 'Balanço Desequilibrado – Verifique os lançamentos'}
                        </p>
                        <p style={{ margin: 0, fontSize: '12px', color: balanced ? '#4ade80' : '#f87171', marginTop: '2px' }}>
                            Activos: {fmt(totalAssets, currency)} | Passivos + Capital: {fmt(totalLiabilities + totalEquity, currency)}
                        </p>
                    </div>
                </div>
            )}

            {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} style={{ height: '400px', background: '#f8fafc', borderRadius: '24px' }} className="animate-pulse" />
                    ))}
                </div>
            ) : error ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444', background: '#fef2f2', borderRadius: '20px' }}>
                    <AlertCircle size={32} style={{ marginBottom: '12px' }} />
                    <p style={{ fontWeight: '700' }}>{error}</p>
                    <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '8px' }}>
                        Execute o seed do Plano de Contas para inicializar as contas contabilísticas.
                    </p>
                </div>
            ) : (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                        <SectionCard
                            title="ACTIVO"
                            icon={Building2}
                            color="#6366f1"
                            items={filterActive(data?.assets)}
                            total={totalAssets}
                            totalLabel="Total do Activo"
                        />
                        <SectionCard
                            title="PASSIVO"
                            icon={TrendingDown}
                            color="#ef4444"
                            items={filterActive(data?.liabilities)}
                            total={totalLiabilities}
                            totalLabel="Total do Passivo"
                        />
                        <SectionCard
                            title="CAPITAL PRÓPRIO"
                            icon={Shield}
                            color="#10b981"
                            items={filterActive(data?.equity)}
                            total={totalEquity}
                            totalLabel="Total Capital Próprio"
                        />
                    </div>

                    {/* Equation Summary */}
                    <div style={{
                        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                        borderRadius: '24px', padding: '28px', color: 'white',
                        display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr', alignItems: 'center', gap: '16px'
                    }}>
                        {[
                            { label: 'Activo Total', value: totalAssets, color: '#818cf8' },
                            { symbol: '=', color: '#64748b' },
                            { label: 'Passivo Total', value: totalLiabilities, color: '#f87171' },
                            { symbol: '+', color: '#64748b' },
                            { label: 'Capital Próprio', value: totalEquity, color: '#34d399' }
                        ].map((item, i) => (
                            item.symbol ? (
                                <div key={i} style={{ textAlign: 'center', fontSize: '32px', fontWeight: '900', color: item.color }}>
                                    {item.symbol}
                                </div>
                            ) : (
                                <div key={i} style={{ textAlign: 'center' }}>
                                    <p style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#94a3b8', margin: 0 }}>
                                        {item.label}
                                    </p>
                                    <p style={{ fontSize: '22px', fontWeight: '900', color: item.color, margin: '6px 0 0', fontFamily: 'monospace' }}>
                                        {fmt(item.value, currency)}
                                    </p>
                                </div>
                            )
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
