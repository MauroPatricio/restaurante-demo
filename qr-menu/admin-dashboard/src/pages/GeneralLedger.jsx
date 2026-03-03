import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { accountingAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
    History, Search, Filter, Calendar,
    ArrowLeft, Download, FileText,
    ArrowUpCircle, ArrowDownCircle, Info
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

export default function GeneralLedger() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchLedger();
    }, []);

    const fetchLedger = async () => {
        try {
            setLoading(true);
            const res = await accountingAPI.getLedger();
            setTransactions(res.data.transactions);
        } catch (error) {
            console.error('Failed to fetch ledger:', error);
        } finally {
            setLoading(false);
        }
    };

    const currency = user?.restaurant?.settings?.currency || 'MT';

    if (loading) return <div className="p-12"><LoadingSpinner /></div>;

    const filteredTransactions = transactions.filter(tx =>
        tx.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ padding: '32px' }}>
            {/* Header */}
            <div style={{ marginBottom: '48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', margin: 0 }}>{t('general_ledger')}</h2>
                    <p style={{ color: '#94a3b8', fontWeight: '700' }}>{t('general_ledger_subtitle')}</p>
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <Search style={{ position: 'absolute', left: '16px', color: '#94a3b8' }} size={18} />
                        <input
                            type="text"
                            placeholder={t('search_ledger_placeholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                padding: '12px 16px 12px 48px', borderRadius: '16px', border: '1px solid #e2e8f0',
                                width: '300px', outline: 'none', fontWeight: '600'
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Transactions List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {filteredTransactions.map((tx) => (
                    <div key={tx._id} style={{
                        background: 'white', borderRadius: '24px', padding: '24px',
                        border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid #f8fafc', paddingBottom: '16px' }}>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '14px', color: '#6366f1' }}>
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <p style={{ fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                        {new Date(tx.date).toLocaleDateString()} • {tx.sourceType || tx.referenceType} • Utilizador: {tx.createdBy?.name || 'Sistema'}
                                    </p>
                                    <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b', margin: '4px 0' }}>{tx.description}</h4>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span style={{
                                    padding: '6px 12px', borderRadius: '8px', fontSize: '10px', fontWeight: '900',
                                    background: tx.status === 'posted' ? '#ecfdf5' : '#fef2f2',
                                    color: tx.status === 'posted' ? '#10b981' : '#ef4444',
                                    textTransform: 'uppercase'
                                }}>
                                    {tx.status}
                                </span>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            <div>
                                <p style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '12px' }}>{t('debit_entries')}</p>
                                {tx.items.filter(i => i.debit > 0).map((item, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '12px', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>{item.account?.code} {item.account?.name}</span>
                                        <span style={{ fontSize: '13px', fontWeight: '900', color: '#1e293b' }}>{item.debit.toLocaleString()} {currency}</span>
                                    </div>
                                ))}
                            </div>
                            <div>
                                <p style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '12px' }}>{t('credit_entries')}</p>
                                {tx.items.filter(i => i.credit > 0).map((item, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '12px', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>{item.account?.code} {item.account?.name}</span>
                                        <span style={{ fontSize: '13px', fontWeight: '900', color: '#1e293b' }}>{item.credit.toLocaleString()} {currency}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}

                {filteredTransactions.length === 0 && (
                    <div style={{ padding: '64px', textAlign: 'center', background: '#f8fafc', borderRadius: '32px', border: '2px dashed #e2e8f0' }}>
                        <History size={48} style={{ color: '#cbd5e1', marginBottom: '16px' }} />
                        <h4 style={{ color: '#64748b', fontWeight: '800' }}>{t('no_transactions_found')}</h4>
                    </div>
                )}
            </div>
        </div>
    );
}
