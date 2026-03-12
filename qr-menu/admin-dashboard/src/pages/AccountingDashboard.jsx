import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { accountingAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
    TrendingUp, TrendingDown, Landmark, Receipt,
    FileText, Calculator, History, Plus,
    ArrowRight, Wallet, CheckCircle, AlertCircle,
    ArrowUpRight, ArrowDownRight, Printer, Search,
    Filter, X, ShieldCheck, PieChart, MoreVertical, Clock,
    CheckSquare, Activity, Percent, Scale, BarChart3,
    ShoppingCart, Banknote, CreditCard
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { SkeletonGrid } from '../components/Skeleton';
import TransactionModal from '../components/TransactionModal';

const MetricCard = ({ title, value, subValue, icon: Icon, color, trend }) => (
    <div style={{
        background: 'white',
        borderRadius: '32px',
        padding: '32px',
        boxShadow: '0 20px 40px -12px rgba(0,0,0,0.05)',
        border: '1px solid rgba(255,255,255,0.8)',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
    }} className="hover-scale group">
        <div style={{
            position: 'absolute', top: 0, right: 0, width: '120px', height: '120px',
            background: `${color}08`, borderRadius: '50%', filter: 'blur(32px)',
            marginRight: '-40px', marginTop: '-40px'
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div style={{
                padding: '16px', background: `${color}10`, color: color,
                borderRadius: '16px', transition: 'all 0.5s ease'
            }} className="group-hover:scale-110">
                <Icon size={24} />
            </div>
            {trend && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    padding: '6px 12px', borderRadius: '12px',
                    fontSize: '11px', fontWeight: '900',
                    background: trend > 0 ? '#ecfdf5' : '#fef2f2',
                    color: trend > 0 ? '#10b981' : '#ef4444'
                }}>
                    {trend > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {Math.abs(trend)}%
                </div>
            )}
        </div>

        <div>
            <p style={{ fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '8px' }}>
                {title}
            </p>
            <h3 style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.04em', margin: 0 }}>
                {value}
            </h3>
            {subValue && (
                <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '4px', height: '4px', background: color, borderRadius: '50%' }} />
                    {subValue}
                </p>
            )}
        </div>
    </div>
);

const NavCard = ({ title, description, icon: Icon, color, onClick }) => {
    const { t } = useTranslation();
    return (
        <div
            onClick={onClick}
            style={{
                background: 'white',
                borderRadius: '28px',
                padding: '24px',
                border: '1px solid #f1f5f9',
                cursor: 'pointer',
                transition: 'all 0.4s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '20px'
            }}
            className="hover:shadow-xl hover:translate-y-[-4px] hover:border-indigo-100 group"
        >
            <div style={{
                padding: '14px', borderRadius: '18px', background: `${color} 12`, color: color,
                transition: 'all 0.4s ease'
            }} className="group-hover:scale-110 group-hover:rotate-3">
                <Icon size={20} />
            </div>
            <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: '15px', fontWeight: '900', color: '#1e293b', margin: 0 }}>{title}</h4>
                <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', fontWeight: '600' }}>{description}</p>
            </div>
            <ArrowRight size={16} style={{ color: '#cbd5e1' }} className="group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
        </div>
    );
};

export default function AccountingDashboard() {
    const { user } = useAuth();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await accountingAPI.getStats();
                setStats(res.data);
            } catch (error) {
                console.error('Failed to fetch accounting stats:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return (
        <div className="p-8">
            <div style={{ height: '80px', width: '400px', background: '#f1f5f9', borderRadius: '12px', marginBottom: '48px' }} className="animate-pulse" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '48px' }}>
                {[1, 2, 3, 4].map(i => <div key={i} style={{ height: '180px', background: '#f8fafc', borderRadius: '32px' }} className="animate-pulse" />)}
            </div>
            <SkeletonGrid items={3} columns={3} height="200px" />
        </div>
    );

    const currency = user?.restaurant?.settings?.currency || 'MT';

    return (
        <div style={{ padding: '32px', maxWidth: '1600px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '48px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <div style={{ padding: '8px', background: 'white', boxShadow: '0 10px 20px rgba(0,0,0,0.05)', borderRadius: '10px', color: '#6366f1' }}>
                            <Landmark size={18} />
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#4f46e5' }}>
                            {t('fiscal_financial_mgmt')}
                        </span>
                    </div>
                    <h1 style={{ fontSize: '42px', fontWeight: '900', color: '#0f172a', margin: 0, letterSpacing: '-0.04em', lineHeight: 1 }}>
                        {t('accounting_hub').split(' ')[0]} <span style={{ color: '#6366f1' }}>{t('accounting_hub').split(' ')[1] || 'Hub'}</span>
                    </h1>
                    <p style={{ color: '#94a3b8', fontWeight: '700', fontSize: '14px', margin: 0 }}>
                        {t('accounting_hub_desc')}
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button style={{
                        padding: '14px 24px', borderRadius: '20px', background: 'white', border: '1px solid #f1f5f9',
                        color: '#1e293b', fontWeight: '800', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                    }}>
                        <Printer size={18} />
                        {t('generate_report')}
                    </button>
                    <button
                        onClick={() => setIsTransactionModalOpen(true)}
                        style={{
                            padding: '14px 28px', borderRadius: '20px', background: '#0f172a', color: 'white',
                            fontWeight: '800', fontSize: '13px', border: 'none', boxShadow: '0 20px 40px -8px rgba(15,23,42,0.3)',
                            display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer'
                        }}>
                        <Calculator size={18} />
                        {t('new_transaction') || 'Nova Transação'}
                    </button>
                </div>
            </div>

            {/* Metrics – Row 1: Key Financial KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                <MetricCard
                    title="Faturação de Hoje"
                    value={`${(stats?.todayBilling || 0).toLocaleString()} ${currency}`}
                    subValue="Rendimentos gerados hoje"
                    icon={TrendingUp}
                    color="#4f46e5"
                    trend={null}
                />
                <MetricCard
                    title="Compras do Dia"
                    value={`${(stats?.totalPurchases || 0).toLocaleString()} ${currency}`}
                    subValue="Gastos registados hoje"
                    icon={ShoppingCart}
                    color="#ef4444"
                    trend={null}
                />
                <MetricCard
                    title="IVA a Pagar (16%)"
                    value={`${(stats?.taxPayable || 0).toLocaleString()} ${currency}`}
                    subValue="IVA Liquidado – IVA Dedutível"
                    icon={Landmark}
                    color="#f59e0b"
                />
                <MetricCard
                    title="Saldo de Caixa"
                    value={`${(stats?.cashBalance || 0).toLocaleString()} ${currency}`}
                    subValue="Caixa + Bancos + M-Pesa"
                    icon={Banknote}
                    color="#10b981"
                />
            </div>
            {/* Metrics – Row 2: Period Totals */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '48px' }}>
                <MetricCard
                    title={t('gross_sales')}
                    value={`${(stats?.revenue || 0).toLocaleString()} ${currency}`}
                    subValue="Total acumulado de rendimentos"
                    icon={TrendingUp}
                    color="#4f46e5"
                    trend={null}
                />
                <MetricCard
                    title={t('actual_expenses')}
                    value={`${(stats?.expenses || 0).toLocaleString()} ${currency}`}
                    subValue="Total acumulado de gastos"
                    icon={TrendingDown}
                    color="#ef4444"
                    trend={null}
                />
                <MetricCard
                    title={t('net_profit')}
                    value={`${(stats?.netProfit || 0).toLocaleString()} ${currency}`}
                    subValue="Rendimentos – Gastos do período"
                    icon={Wallet}
                    color={stats?.netProfit >= 0 ? '#10b981' : '#ef4444'}
                    trend={null}
                />
                <MetricCard
                    title="IVA Liquidado"
                    value={`${(stats?.ivaLiquidado || 0).toLocaleString()} ${currency}`}
                    subValue={`IVA Dedutível: ${(stats?.ivaDedutivel || 0).toLocaleString()} ${currency}`}
                    icon={Percent}
                    color="#8b5cf6"
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '48px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
                    <section>
                        <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#1e293b', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Landmark size={20} style={{ color: '#6366f1' }} />
                            {t('priority_actions')}
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                            <NavCard
                                title={t('fiscal_invoices')}
                                description={t('fiscal_invoices_desc')}
                                icon={Receipt}
                                color="#6366f1"
                                onClick={() => navigate('/dashboard/accounting/invoices')}
                            />
                            <NavCard
                                title={t('plan_of_accounts')}
                                description={t('plan_of_accounts_desc')}
                                icon={FileText}
                                color="#8b5cf6"
                                onClick={() => navigate('/dashboard/accounting/accounts')}
                            />
                            <NavCard
                                title={t('cash_management')}
                                description={t('cash_management_desc')}
                                icon={Wallet}
                                color="#10b981"
                                onClick={() => navigate('/dashboard/accounting/cash')}
                            />
                            <NavCard
                                title={t('general_ledger')}
                                description={t('general_ledger_subtitle')}
                                icon={History}
                                color="#f97316"
                                onClick={() => navigate('/dashboard/accounting/ledger')}
                            />
                            <NavCard
                                title="Pendentes em Lote"
                                description="Processar múltiplos pedidos de uma vez"
                                icon={CheckSquare}
                                color="#8b5cf6"
                                onClick={() => navigate('/dashboard/accounting/batch')}
                            />
                            <NavCard
                                title="Razão"
                                description="Extrato de movimentos por conta"
                                icon={Activity}
                                color="#ec4899"
                                onClick={() => navigate('/dashboard/accounting/razao')}
                            />
                            <NavCard
                                title="Dem. de Resultados"
                                description="Receitas, despesas e lucro (DRE)"
                                icon={TrendingUp}
                                color="#0ea5e9"
                                onClick={() => navigate('/dashboard/accounting/dre')}
                            />
                            <NavCard
                                title="Apuramento de IVA"
                                description="IVA Liquidado vs Dedutível (16%)"
                                icon={Percent}
                                color="#ef4444"
                                onClick={() => navigate('/dashboard/accounting/iva')}
                            />
                            <NavCard
                                title="Balancete"
                                description="Movimentos débito/crédito por período"
                                icon={BarChart3}
                                color="#0891b2"
                                onClick={() => navigate('/dashboard/accounting/balancete')}
                            />
                            <NavCard
                                title="Balanço Patrimonial"
                                description="Activos, Passivos e Capital Próprio"
                                icon={Scale}
                                color="#7c3aed"
                                onClick={() => navigate('/dashboard/accounting/balance-sheet')}
                            />
                        </div>
                    </section>

                    <section style={{
                        background: 'white',
                        borderRadius: '32px',
                        padding: '32px',
                        border: '1px solid #f1f5f9',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#1e293b', margin: 0 }}>{t('recent_invoices')}</h3>
                            <button
                                onClick={() => navigate('/dashboard/accounting/invoices')}
                                style={{ fontSize: '11px', fontWeight: '900', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.1em', background: 'none', border: 'none', cursor: 'pointer' }}>
                                {t('view_all')}
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ padding: '16px', borderRadius: '16px', border: '1px dashed #e2e8f0', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                                {t('loading_data')}
                            </div>
                        </div>
                    </section>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                        borderRadius: '32px',
                        padding: '32px',
                        color: 'white',
                        boxShadow: '0 20px 40px -12px rgba(15,23,42,0.4)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            position: 'absolute', top: 0, right: 0, width: '150px', height: '150px',
                            background: 'rgba(99,102,241,0.2)', borderRadius: '50%', filter: 'blur(40px)',
                            marginRight: '-50px', marginTop: '-50px'
                        }} />

                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                <ShieldCheck size={20} style={{ color: '#818cf8' }} />
                                <span style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#818cf8' }}>{t('compliance_status')}</span>
                            </div>
                            <h4 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px' }}>{t('certified_sales')}</h4>
                            <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6, marginBottom: '24px' }}>
                                {t('certified_sales_desc')}
                            </p>
                            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <CheckCircle size={18} style={{ color: '#10b981' }} />
                                <span style={{ fontSize: '12px', fontWeight: '700' }}>{t('secure_encrypted_data')}</span>
                            </div>
                        </div>
                    </div>

                    <div style={{ padding: '32px', background: '#f8fafc', borderRadius: '32px', border: '1px solid #f1f5f9' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '900', color: '#1e293b', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('integrity_alerts')}</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <div style={{ width: '2px', background: '#ef4444', borderRadius: '2px' }} />
                                <div>
                                    <p style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b', margin: 0 }}>{t('no_cash_session_open')}</p>
                                    <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>{t('recent_sales_no_shift')}</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <div style={{ width: '2px', background: '#10b981', borderRadius: '2px' }} />
                                <div>
                                    <p style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b', margin: 0 }}>{t('invoice_sequence_ok')}</p>
                                    <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>{t('integrity_verified_until', { invoice: 'FT 2024/0012' })}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <TransactionModal
                isOpen={isTransactionModalOpen}
                onClose={() => setIsTransactionModalOpen(false)}
                onSuccess={() => {
                    // Refetch stats and data after a short delay
                    setIsTransactionModalOpen(false);
                    setLoading(true);
                    accountingAPI.getStats()
                        .then(res => setStats(res.data))
                        .catch(err => console.error(err))
                        .finally(() => setLoading(false));
                }}
            />
        </div>
    );
}
