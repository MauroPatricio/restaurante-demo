import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { accountingAPI } from '../services/api';
import {
    Search, Filter, FolderTree, FileText,
    ChevronDown, ChevronRight, Plus, Download,
    Briefcase, LayoutGrid, Info
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

export default function PlanOfAccounts() {
    const { t } = useTranslation();
    const [accounts, setAccounts] = useState([]);
    const [trialBalance, setTrialBalance] = useState([]);
    const [viewMode, setViewMode] = useState('chart'); // 'chart' or 'trial'
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedGroups, setExpandedGroups] = useState(new Set(['1', '2', '3', '4', '5', '6', '7']));

    useEffect(() => {
        if (viewMode === 'chart') {
            fetchAccounts();
        } else {
            fetchTrialBalance();
        }
    }, [viewMode]);

    const fetchAccounts = async () => {
        try {
            setLoading(true);
            const res = await accountingAPI.getAccounts();
            setAccounts(res.data.accounts);
        } catch (error) {
            console.error('Failed to fetch accounts:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTrialBalance = async () => {
        try {
            setLoading(true);
            const res = await accountingAPI.getTrialBalance();
            setTrialBalance(res.data.trialBalance);
        } catch (error) {
            console.error('Failed to fetch trial balance:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleGroup = (code) => {
        const newExpanded = new Set(expandedGroups);
        if (newExpanded.has(code)) newExpanded.delete(code);
        else newExpanded.add(code);
        setExpandedGroups(newExpanded);
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'asset': return '#3b82f6';
            case 'liability': return '#ef4444';
            case 'equity': return '#8b5cf6';
            case 'revenue': return '#10b981';
            case 'expense': return '#f59e0b';
            default: return '#64748b';
        }
    };

    if (loading) return <div className="p-12"><LoadingSpinner /></div>;

    const currentData = viewMode === 'chart' ? accounts : trialBalance;
    const filteredData = currentData.filter(acc =>
        acc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.code.includes(searchTerm)
    );

    return (
        <div style={{ padding: '32px' }}>
            <div style={{ marginBottom: '48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', margin: 0 }}>
                        {viewMode === 'chart' ? t('plan_of_accounts') : t('trial_balance')}
                    </h2>
                    <p style={{ color: '#94a3b8', fontWeight: '700' }}>
                        {viewMode === 'chart' ? t('pgc_pe_structure') : t('trial_balance_desc')}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '16px', gap: '4px' }}>
                        <button
                            onClick={() => setViewMode('chart')}
                            style={{
                                padding: '10px 20px', borderRadius: '12px', border: 'none',
                                background: viewMode === 'chart' ? 'white' : 'transparent',
                                color: viewMode === 'chart' ? '#0f172a' : '#64748b',
                                fontWeight: '800', fontSize: '12px', cursor: 'pointer',
                                boxShadow: viewMode === 'chart' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
                                transition: 'all 0.2s'
                            }}
                        >
                            {t('plan_of_accounts')}
                        </button>
                        <button
                            onClick={() => setViewMode('trial')}
                            style={{
                                padding: '10px 20px', borderRadius: '12px', border: 'none',
                                background: viewMode === 'trial' ? 'white' : 'transparent',
                                color: viewMode === 'trial' ? '#0f172a' : '#64748b',
                                fontWeight: '800', fontSize: '12px', cursor: 'pointer',
                                boxShadow: viewMode === 'trial' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
                                transition: 'all 0.2s'
                            }}
                        >
                            {t('balancete_btn') || t('trial_balance')}
                        </button>
                    </div>

                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <Search style={{ position: 'absolute', left: '16px', color: '#94a3b8' }} size={18} />
                        <input
                            type="text"
                            placeholder={t('search_account_placeholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                padding: '12px 16px 12px 48px', borderRadius: '16px', border: '1px solid #e2e8f0',
                                width: '350px', outline: 'none', fontWeight: '600'
                            }}
                        />
                    </div>
                </div>
            </div>

            <div style={{ background: 'white', borderRadius: '32px', border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                <div style={{
                    padding: '24px 32px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9',
                    display: 'grid',
                    gridTemplateColumns: viewMode === 'chart'
                        ? '150px 1fr 150px 180px'
                        : '120px 1fr 120px 120px 120px 120px',
                    gap: '24px'
                }}>
                    <span style={{ fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>{t('code')}</span>
                    <span style={{ fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>{t('account_description')}</span>

                    {viewMode === 'chart' ? (
                        <>
                            <span style={{ fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>{t('account_type')}</span>
                            <span style={{ fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right' }}>{t('current_balance')}</span>
                        </>
                    ) : (
                        <>
                            <span style={{ fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right' }}>{t('opening_balance')}</span>
                            <span style={{ fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right' }}>{t('debit_movement')}</span>
                            <span style={{ fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right' }}>{t('credit_movement')}</span>
                            <span style={{ fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right' }}>{t('closing_balance')}</span>
                        </>
                    )}
                </div>

                <div style={{ maxHeight: 'calc(100vh - 350px)', overflowY: 'auto' }}>
                    {filteredData.map((acc) => {
                        const level = acc.code.split('.').length;
                        const hasChildren = currentData.some(a => a.code.startsWith(acc.code + '.') && a.code !== acc.code);
                        const isExpanded = expandedGroups.has(acc.code);

                        return (
                            <div
                                key={acc._id}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: viewMode === 'chart'
                                        ? '150px 1fr 150px 180px'
                                        : '120px 1fr 120px 120px 120px 120px',
                                    gap: '24px',
                                    padding: '16px 32px', borderBottom: '1px solid #f8fafc',
                                    alignItems: 'center', transition: 'background 0.2s',
                                    marginLeft: `${(level - 1) * 24}px`
                                }}
                                className="hover:bg-slate-50"
                            >
                                <span style={{ fontSize: '14px', fontWeight: '900', color: '#0f172a' }}>{acc.code}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    {hasChildren ? (
                                        <button
                                            onClick={() => toggleGroup(acc.code)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#64748b' }}
                                        >
                                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                        </button>
                                    ) : (
                                        <div style={{ width: '16px' }} />
                                    )}
                                    <span style={{ fontSize: '14px', fontWeight: level === 1 ? '900' : '600', color: level === 1 ? '#0f172a' : '#475569' }}>
                                        {acc.name}
                                    </span>
                                </div>

                                {viewMode === 'chart' ? (
                                    <>
                                        <div>
                                            <span style={{
                                                padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: '900',
                                                textTransform: 'uppercase', color: getTypeColor(acc.type), background: `${getTypeColor(acc.type)}10`
                                            }}>
                                                {t(`account_type_${acc.type}`)}
                                            </span>
                                        </div>
                                        <div style={{ textAlign: 'right', fontSize: '14px', fontWeight: '900', color: acc.balance < 0 ? '#ef4444' : '#0f172a' }}>
                                            {acc.balance?.toLocaleString()} MT
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div style={{ textAlign: 'right', fontSize: '13px', fontWeight: '700', color: '#64748b' }}>
                                            {(acc.balance - (acc.periodDebit || 0) + (acc.periodCredit || 0)).toLocaleString()}
                                        </div>
                                        <div style={{ textAlign: 'right', fontSize: '13px', fontWeight: '800', color: '#10b981' }}>
                                            {acc.periodDebit?.toLocaleString() || '0'}
                                        </div>
                                        <div style={{ textAlign: 'right', fontSize: '13px', fontWeight: '800', color: '#ef4444' }}>
                                            {acc.periodCredit?.toLocaleString() || '0'}
                                        </div>
                                        <div style={{ textAlign: 'right', fontSize: '14px', fontWeight: '900', color: acc.balance < 0 ? '#ef4444' : '#0f172a' }}>
                                            {acc.balance?.toLocaleString()}
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div style={{ marginTop: '32px', display: 'flex', gap: '24px' }}>
                <div style={{ flex: 1, padding: '24px', borderRadius: '24px', background: '#f8fafc', border: '1px solid #f1f5f9', display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ padding: '12px', background: 'white', borderRadius: '12px', color: '#6366f1' }}>
                        <Info size={20} />
                    </div>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                        {viewMode === 'chart' ? t('account_class_hint') : t('trial_balance_hint') || t('account_class_hint')}
                    </p>
                </div>
                <button style={{
                    padding: '16px 32px', borderRadius: '24px', background: 'white', border: '1px solid #e2e8f0',
                    color: '#1e293b', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '12px'
                }}>
                    <Download size={20} /> {viewMode === 'chart' ? t('export_plan_pdf') : t('export_trial_pdf') || t('export_plan_pdf')}
                </button>
            </div>
        </div>
    );
}
