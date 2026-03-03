import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { accountingAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
    Wallet, Lock, Unlock, ArrowRight,
    Plus, History, AlertCircle, CheckCircle,
    User, Calendar, TrendingUp, TrendingDown,
    Activity, ArrowUpCircle, ArrowDownCircle
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

export default function CashManagement() {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showOpenModal, setShowOpenModal] = useState(false);
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [openingBalance, setOpeningBalance] = useState(0);
    const [actualBalance, setActualBalance] = useState(0);
    const [activeSession, setActiveSession] = useState(null);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            setLoading(true);
            const res = await accountingAPI.getCashSessions();
            setSessions(res.data.sessions);
            const open = res.data.sessions.find(s => s.status === 'open' && s.operator?._id === user?._id);
            setActiveSession(open);
        } catch (error) {
            console.error('Failed to fetch sessions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenSession = async () => {
        try {
            await accountingAPI.openCashSession(openingBalance);
            setShowOpenModal(false);
            fetchSessions();
        } catch (error) {
            alert(error.response?.data?.error || t('error_generic'));
        }
    };

    const handleCloseSession = async () => {
        try {
            await accountingAPI.closeCashSession(activeSession._id, { actualBalance, notes });
            setShowCloseModal(false);
            setActiveSession(null);
            fetchSessions();
        } catch (error) {
            alert(error.response?.data?.error || t('error_generic'));
        }
    };

    if (loading) return <div className="p-12"><LoadingSpinner /></div>;

    const currency = user?.restaurant?.settings?.currency || 'MT';

    return (
        <div style={{ padding: '32px' }}>
            {/* Header */}
            <div style={{ marginBottom: '48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', margin: 0 }}>{t('cash_management')}</h2>
                    <p style={{ color: '#94a3b8', fontWeight: '700' }}>{t('cash_management_subtitle')}</p>
                </div>
                {!activeSession ? (
                    <button
                        onClick={() => setShowOpenModal(true)}
                        style={{ padding: '16px 32px', borderRadius: '24px', background: '#0f172a', color: 'white', border: 'none', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', boxShadow: '0 20px 40px -8px rgba(0,0,0,0.2)' }}
                    >
                        <Unlock size={20} /> {t('open_new_shift_btn')}
                    </button>
                ) : (
                    <button
                        onClick={() => setShowCloseModal(true)}
                        style={{ padding: '16px 32px', borderRadius: '24px', background: '#ef4444', color: 'white', border: 'none', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', boxShadow: '0 20px 40px -8px rgba(239, 68, 68, 0.2)' }}
                    >
                        <Lock size={20} /> {t('start_closing_btn')}
                    </button>
                )}
            </div>

            {/* Active Session Status */}
            {activeSession && (
                <div style={{
                    background: 'white', padding: '32px', borderRadius: '32px', marginBottom: '48px',
                    border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', gap: '32px' }}>
                        <div style={{ padding: '20px', background: '#ecfdf5', borderRadius: '24px', color: '#10b981' }}>
                            <Activity size={32} />
                        </div>
                        <div>
                            <span style={{ fontSize: '10px', fontWeight: '900', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('active_session_label')}</span>
                            <h3 style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', margin: '4px 0' }}>{t('operator_label')}: {user.name}</h3>
                            <p style={{ color: '#94a3b8', fontWeight: '600', fontSize: '13px' }}>{t('started_at_label')} {new Date(activeSession.startTime).toLocaleTimeString()}</p>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '48px' }}>
                        <div>
                            <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase' }}>{t('initial_fund_label')}</p>
                            <p style={{ fontSize: '20px', fontWeight: '900', color: '#1e293b' }}>{activeSession.openingBalance?.toLocaleString()} {currency}</p>
                        </div>
                        <div>
                            <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase' }}>{t('recorded_sales_label')}</p>
                            <p style={{ fontSize: '20px', fontWeight: '900', color: '#6366f1' }}>
                                {activeSession.transactions?.reduce((sum, tx) => sum + (tx.type === 'sale' ? tx.amount : 0), 0).toLocaleString()} {currency}
                            </p>
                        </div>
                        <div>
                            <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase' }}>{t('expected_balance_label')}</p>
                            <p style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a' }}>
                                {(activeSession.openingBalance + activeSession.transactions?.reduce((sum, tx) => {
                                    if (tx.type === 'sale' || tx.type === 'entry') return sum + tx.amount;
                                    if (tx.type === 'exit' || tx.type === 'refund') return sum - tx.amount;
                                    return sum;
                                }, 0)).toLocaleString()} {currency}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Past Sessions List */}
            <div style={{ background: 'white', borderRadius: '32px', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '900', margin: 0 }}>{t('shift_history_title')}</h3>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: '#f8fafc' }}>
                        <tr>
                            <th style={{ padding: '20px 24px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>{t('period_col')}</th>
                            <th style={{ padding: '20px 24px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>{t('operator_col')}</th>
                            <th style={{ padding: '20px 24px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>{t('expected_balance_col')}</th>
                            <th style={{ padding: '20px 24px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>{t('actual_balance_col')}</th>
                            <th style={{ padding: '20px 24px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>{t('difference_col')}</th>
                            <th style={{ padding: '20px 24px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>{t('status_col')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sessions.map((s) => (
                            <tr key={s._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '20px 24px' }}>
                                    <div style={{ fontSize: '14px', fontWeight: '700' }}>{new Date(s.startTime).toLocaleDateString()}</div>
                                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                                        {new Date(s.startTime).toLocaleTimeString()} - {s.endTime ? new Date(s.endTime).toLocaleTimeString() : t('in_progress')}
                                    </div>
                                </td>
                                <td style={{ padding: '20px 24px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <User size={14} style={{ color: '#6366f1' }} />
                                        </div>
                                        <span style={{ fontSize: '14px', fontWeight: '700' }}>{s.operator?.name}</span>
                                    </div>
                                </td>
                                <td style={{ padding: '20px 24px', fontSize: '14px', fontWeight: '700' }}>{s.closingBalance?.toLocaleString() || '-'}</td>
                                <td style={{ padding: '20px 24px', fontSize: '14px', fontWeight: '700' }}>{s.actualBalance?.toLocaleString() || '-'}</td>
                                <td style={{ padding: '20px 24px' }}>
                                    {s.status === 'closed' && (
                                        <span style={{
                                            fontSize: '14px', fontWeight: '900',
                                            color: s.difference > 0 ? '#10b981' : s.difference < 0 ? '#ef4444' : '#64748b'
                                        }}>
                                            {s.difference > 0 ? '+' : ''}{s.difference?.toLocaleString()}
                                        </span>
                                    )}
                                </td>
                                <td style={{ padding: '20px 24px' }}>
                                    <span style={{
                                        padding: '6px 14px', borderRadius: '10px', fontSize: '11px', fontWeight: '900',
                                        background: s.status === 'open' ? '#ecfdf5' : '#f8fafc',
                                        color: s.status === 'open' ? '#10b981' : '#94a3b8'
                                    }}>
                                        {s.status === 'open' ? t('status_open') : t('status_closed')}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal: Abertura */}
            {showOpenModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', padding: '48px', borderRadius: '40px', width: '450px', boxShadow: '0 32px 64px rgba(0,0,0,0.2)' }}>
                        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                            <div style={{ width: '80px', height: '80px', background: '#f8fafc', borderRadius: '30px', margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                                <Unlock size={40} />
                            </div>
                            <h3 style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', margin: '0 0 8px' }}>{t('open_shift')}</h3>
                            <p style={{ color: '#64748b', fontWeight: '600' }}>{t('confirm_initial_fund_desc')}</p>
                        </div>
                        <div style={{ marginBottom: '32px' }}>
                            <label style={{ fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '12px' }}>{t('starting_value_label')} ({currency})</label>
                            <input
                                type="number"
                                value={openingBalance}
                                onChange={(e) => setOpeningBalance(parseFloat(e.target.value))}
                                style={{ width: '100%', padding: '20px 24px', borderRadius: '20px', border: '2px solid #f1f5f9', outline: 'none', fontSize: '24px', fontWeight: '900', textAlign: 'center' }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '16px' }}>
                            <button onClick={() => setShowOpenModal(false)} style={{ flex: 1, padding: '18px', borderRadius: '20px', background: '#f8fafc', color: '#94a3b8', fontWeight: '800', border: 'none', cursor: 'pointer' }}>{t('cancel')}</button>
                            <button onClick={handleOpenSession} style={{ flex: 1, padding: '18px', borderRadius: '20px', background: '#0f172a', color: 'white', fontWeight: '800', border: 'none', cursor: 'pointer' }}>{t('confirm')}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Fechamento */}
            {showCloseModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', padding: '48px', borderRadius: '40px', width: '500px', boxShadow: '0 32px 64px rgba(0,0,0,0.2)' }}>
                        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                            <div style={{ width: '80px', height: '80px', background: '#fef2f2', borderRadius: '30px', margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                                <Lock size={40} />
                            </div>
                            <h3 style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', margin: '0 0 8px' }}>{t('close_shift')}</h3>
                            <p style={{ color: '#64748b', fontWeight: '600' }}>{t('declare_physical_cash_desc')}</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '32px' }}>
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>{t('counted_value_label')} ({currency})</label>
                                <input
                                    type="number"
                                    value={actualBalance}
                                    onChange={(e) => setActualBalance(parseFloat(e.target.value))}
                                    style={{ width: '100%', padding: '20px 24px', borderRadius: '20px', border: '2px solid #f1f5f9', outline: 'none', fontSize: '24px', fontWeight: '900', textAlign: 'center' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>{t('notes_label')}</label>
                                <textarea
                                    placeholder={t('notes_placeholder')}
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    style={{ width: '100%', height: '100px', padding: '16px', borderRadius: '16px', border: '1px solid #f1f5f9', outline: 'none', resize: 'none' }}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '16px' }}>
                            <button onClick={() => setShowCloseModal(false)} style={{ flex: 1, padding: '18px', borderRadius: '20px', background: '#f8fafc', color: '#94a3b8', fontWeight: '800', border: 'none', cursor: 'pointer' }}>{t('back_btn') || t('cancel')}</button>
                            <button onClick={handleCloseSession} style={{ flex: 1, padding: '18px', borderRadius: '20px', background: '#ef4444', color: 'white', fontWeight: '800', border: 'none', cursor: 'pointer' }}>{t('finish_shift_btn')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
