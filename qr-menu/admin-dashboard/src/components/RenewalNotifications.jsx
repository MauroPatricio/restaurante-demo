import { useState, useRef, useEffect } from 'react';
import { Bell, Check, X, ShieldCheck, CreditCard, LayoutGrid } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';
import { useTranslation } from 'react-i18next';
import api from '../services/api';

const RenewalNotifications = () => {
    const { t } = useTranslation();
    const { pendingRenewals, removeRenewal } = useSocket();
    const [isOpen, setIsOpen] = useState(false);
    const [processing, setProcessing] = useState(null);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAction = async (requestId, status) => {
        setProcessing(requestId);
        try {
            await api.patch(`/subscriptions/admin/transactions/${requestId}/review`, { status });
            // removeRenewal is handled via socket event 'subscription:activated' or 'subscription:rejected'
            // but for safety we can also call it here after a successful API response
            removeRenewal(requestId);
        } catch (error) {
            console.error(`Failed to process renewal ${requestId}:`, error);
            alert('Falha ao processar renovação. Tente novamente.');
        } finally {
            setProcessing(null);
        }
    };

    if (pendingRenewals.length === 0 && !isOpen) {
        return (
            <div className="renewal-notif-container" style={{ position: 'relative' }}>
                <button
                    className="notif-btn"
                    onClick={() => setIsOpen(!isOpen)}
                    style={{ position: 'relative', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '8px' }}
                >
                    <Bell size={20} />
                </button>
            </div>
        );
    }

    return (
        <div className="renewal-notif-container" style={{ position: 'relative' }} ref={dropdownRef}>
            <button
                className={`notif-btn ${pendingRenewals.length > 0 ? 'has-notif' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    position: 'relative',
                    background: 'none',
                    border: 'none',
                    color: pendingRenewals.length > 0 ? '#ef4444' : '#64748b',
                    cursor: 'pointer',
                    padding: '8px',
                    transition: 'all 0.2s ease'
                }}
            >
                <Bell size={20} />
                {pendingRenewals.length > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        borderRadius: '50%',
                        width: '16px',
                        height: '16px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 0 0 2px white'
                    }}>
                        {pendingRenewals.length}
                    </span>
                )}
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    width: '320px',
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                    zIndex: 1000,
                    marginTop: '12px',
                    overflow: 'hidden',
                    border: '1px solid #e2e8f0'
                }}>
                    <div style={{
                        padding: '16px',
                        backgroundColor: '#f8fafc',
                        borderBottom: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#1e293b', fontWeight: '600' }}>
                            Renovações Pendentes
                        </h4>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {pendingRenewals.length} novas
                        </span>
                    </div>

                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {pendingRenewals.length === 0 ? (
                            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                                Nenhuma renovação pendente
                            </div>
                        ) : (
                            pendingRenewals.map((renewal) => (
                                <div key={renewal._id || renewal.requestId} style={{
                                    padding: '16px',
                                    borderBottom: '1px solid #f1f5f9',
                                    transition: 'background 0.2s ease'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '8px',
                                            backgroundColor: '#eef2ff',
                                            color: '#4f46e5',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <CreditCard size={16} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#1e293b' }}>
                                                {renewal.restaurantName || (renewal.restaurant?.name) || 'Restaurante'}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                Plano {renewal.plan || 'Standard'} • {renewal.amount || '8,000'} MT
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                        <button
                                            disabled={processing === (renewal._id || renewal.requestId)}
                                            onClick={() => handleAction(renewal._id || renewal.requestId, 'approved')}
                                            style={{
                                                flex: 1,
                                                padding: '6px 12px',
                                                backgroundColor: '#10b981',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                fontSize: '0.8rem',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '4px'
                                            }}
                                        >
                                            <Check size={14} />
                                            ATIVAR
                                        </button>
                                        <button
                                            disabled={processing === (renewal._id || renewal.requestId)}
                                            onClick={() => handleAction(renewal._id || renewal.requestId, 'rejected')}
                                            style={{
                                                padding: '6px 12px',
                                                backgroundColor: 'white',
                                                color: '#ef4444',
                                                border: '1px solid #fecaca',
                                                borderRadius: '6px',
                                                fontSize: '0.8rem',
                                                fontWeight: '600',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div style={{
                        padding: '12px',
                        textAlign: 'center',
                        backgroundColor: '#f8fafc',
                        borderTop: '1px solid #e2e8f0'
                    }}>
                        <a href="/dashboard/subscriptions" style={{ fontSize: '0.8rem', color: '#4f46e5', textDecoration: 'none', fontWeight: '500' }}>
                            Ver todas as subscrições
                        </a>
                    </div>
                </div>
            )}

            <style>{`
                .notif-btn.has-notif {
                    animation: bell-swing 2s infinite ease-in-out;
                }
                @keyframes bell-swing {
                    0% { transform: rotate(0); }
                    10% { transform: rotate(15deg); }
                    20% { transform: rotate(-15deg); }
                    30% { transform: rotate(10deg); }
                    40% { transform: rotate(-10deg); }
                    50% { transform: rotate(0); }
                    100% { transform: rotate(0); }
                }
            `}</style>
        </div>
    );
};

export default RenewalNotifications;
