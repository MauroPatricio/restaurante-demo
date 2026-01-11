import React, { useState, useEffect } from 'react';
import { X, User, Clock, CheckCircle, Coffee, MessageSquare, AlertTriangle, UserCheck, LayoutGrid, List, DollarSign, Calendar, ShoppingBag, Loader2 } from 'lucide-react';
import { analyticsAPI, tableAPI } from '../services/api';
import { format, formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale/pt';

export default function TableDetailsModal({ isOpen, onClose, table, restaurantId, onUpdate }) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && table && restaurantId) {
            fetchHistory();
        }
    }, [isOpen, table, restaurantId]);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const response = await analyticsAPI.getTableHistory(restaurantId, table._id);
            setHistory(Array.isArray(response.data) ? response.data : []);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch table history:', err);
            setError('Falha ao carregar histórico da mesa.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (newStatus) => {
        if (updating || table.status === newStatus) return;

        try {
            setUpdating(true);
            await tableAPI.update(table._id, { status: newStatus });
            if (onUpdate) onUpdate();
            // We don't close the modal, the user might want to see history too
        } catch (err) {
            console.error('Failed to update table status:', err);
            alert('Erro ao atualizar estado da mesa.');
        } finally {
            setUpdating(false);
        }
    };

    if (!isOpen) return null;

    // Design Tokens - Emerald/Slate Palette
    const tokens = {
        primary: '#10b981',
        primaryDark: '#059669',
        secondary: '#0f172a',
        accent: '#f59e0b',
        danger: '#ef4444',
        info: '#3b82f6',
        slate50: '#f8fafc',
        slate100: '#f1f5f9',
        slate200: '#e2e8f0',
        slate400: '#94a3b8',
        slate600: '#475569',
        slate800: '#1e293b',
        glassBg: 'rgba(255, 255, 255, 0.85)',
        glassBorder: 'rgba(255, 255, 255, 0.6)',
        shadow: '0 40px 100px -20px rgba(0,0,0,0.15)',
    };

    const statusOptions = [
        { id: 'free', label: 'Livre', icon: CheckCircle, color: tokens.primary, bg: '#ecfdf5' },
        { id: 'occupied', label: 'Ocupado', icon: Timer, color: tokens.danger, bg: '#fef2f2' },
        { id: 'cleaning', label: 'Em Limpeza', icon: ShoppingBag, color: tokens.info, bg: '#eff6ff' }
    ];

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px', overflow: 'hidden'
        }}>
            {/* Backdrop with intense blur */}
            <div
                onClick={onClose}
                style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(15, 23, 42, 0.3)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                }}
            />

            {/* Modal Container */}
            <div style={{
                position: 'relative', width: '100%', maxWidth: '900px',
                maxHeight: '85vh', background: tokens.glassBg,
                backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
                borderRadius: '40px', border: `1px solid ${tokens.glassBorder}`,
                boxShadow: tokens.shadow, display: 'flex', flexDirection: 'column',
                overflow: 'hidden', animation: 'modalScaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>

                {/* Header Section */}
                <div style={{
                    padding: '32px 40px', borderBottom: '1px solid rgba(0,0,0,0.04)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'linear-gradient(to right, rgba(16, 185, 129, 0.04), transparent)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{
                            width: '56px', height: '56px',
                            background: `linear-gradient(135deg, ${tokens.secondary}, ${tokens.secondary})`,
                            borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', boxShadow: '0 8px 16px -4px rgba(15, 23, 42, 0.3)'
                        }}>
                            <LayoutGrid size={28} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '24px', fontWeight: '900', color: tokens.secondary, margin: 0, letterSpacing: '-0.02em' }}>
                                Mesa {table?.number < 10 ? `0${table?.number}` : table?.number}
                            </h2>
                            <span style={{ fontSize: '10px', fontWeight: '800', color: tokens.slate400, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '4px', display: 'block' }}>
                                Gestão de Estado e Histórico
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        style={{
                            width: '44px', height: '44px', border: 'none',
                            background: 'white', color: tokens.slate400,
                            borderRadius: '14px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.03)'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body Content */}
                <div style={{
                    overflowY: 'auto', padding: '32px 40px', flexGrow: 1,
                    background: 'rgba(255, 255, 255, 0.4)'
                }} className="custom-scrollbar">

                    {/* Status Toggle Section */}
                    <div style={{ marginBottom: '40px' }}>
                        <h4 style={{ fontSize: '12px', fontWeight: '900', color: tokens.slate400, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '20px' }}>
                            Estado da Unidade
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                            {statusOptions.map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => handleUpdateStatus(opt.id)}
                                    disabled={updating}
                                    style={{
                                        padding: '20px',
                                        borderRadius: '24px',
                                        border: table.status === opt.id ? `2px solid ${opt.color}` : '1px solid rgba(0,0,0,0.02)',
                                        background: table.status === opt.id ? opt.bg : 'white',
                                        cursor: updating ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '12px',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        opacity: updating && table.status !== opt.id ? 0.5 : 1,
                                        boxShadow: table.status === opt.id ? `0 12px 24px -8px ${opt.color}40` : '0 4px 12px rgba(0,0,0,0.02)'
                                    }}
                                    className="status-card-hover"
                                >
                                    <div style={{
                                        width: '40px', height: '40px',
                                        borderRadius: '14px', background: table.status === opt.id ? 'white' : opt.bg,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: opt.color, boxShadow: table.status === opt.id ? '0 4px 10px rgba(0,0,0,0.05)' : 'none'
                                    }}>
                                        {updating && table.status === opt.id ? (
                                            <Loader2 size={24} className="animate-spin" />
                                        ) : (
                                            <opt.icon size={24} strokeWidth={2.5} />
                                        )}
                                    </div>
                                    <span style={{
                                        fontSize: '14px', fontWeight: '900',
                                        color: table.status === opt.id ? opt.color : tokens.slate400,
                                        textTransform: 'uppercase', letterSpacing: '0.05em'
                                    }}>
                                        {opt.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* History Section */}
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '100px 0' }}>
                            <div style={{
                                width: '40px', height: '40px', border: '3px solid #f3f3f3',
                                borderTop: `3px solid ${tokens.primary}`, borderRadius: '50%',
                                margin: '0 auto 20px auto', animation: 'spinAround 0.8s linear infinite'
                            }} />
                            <p style={{ fontSize: '14px', fontWeight: '700', color: tokens.slate400 }}>Recuperando registros...</p>
                        </div>
                    ) : error ? (
                        <div style={{ textAlign: 'center', padding: '60px', background: '#fff1f2', borderRadius: '32px', border: '1px solid #ffe4e6' }}>
                            <AlertTriangle size={40} color={tokens.danger} style={{ marginBottom: '16px' }} />
                            <p style={{ fontWeight: '800', color: '#be123c', marginBottom: '16px' }}>{error}</p>
                            <button onClick={fetchHistory} style={{
                                padding: '12px 24px', background: 'white', border: '1px solid #ffe4e6',
                                borderRadius: '14px', fontWeight: '800', color: tokens.danger, cursor: 'pointer'
                            }}>Tentar novamente</button>
                        </div>
                    ) : history.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '100px 0' }}>
                            <div style={{
                                width: '72px', height: '72px', background: 'white', borderRadius: '24px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto',
                                boxShadow: '0 8px 30px rgba(0,0,0,0.03)'
                            }}>
                                <User size={36} color={tokens.slate200} />
                            </div>
                            <h3 style={{ fontSize: '22px', fontWeight: '900', color: tokens.secondary, margin: '0 0 8px 0' }}>Sem Histórico</h3>
                            <p style={{ color: tokens.slate400, fontWeight: '600', maxWidth: '320px', margin: '0 auto', lineHeight: '1.5' }}>Nenhum cliente foi registrado nesta mesa ainda.</p>
                        </div>
                    ) : (
                        <>
                            <h4 style={{ fontSize: '12px', fontWeight: '900', color: tokens.slate400, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '20px' }}>
                                Histórico de Clientes
                            </h4>
                            <div style={{
                                background: 'white', borderRadius: '28px', border: '1px solid rgba(0,0,0,0.03)',
                                overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
                            }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead style={{ background: '#f8fafc' }}>
                                        <tr>
                                            <th style={thStyle}>Cliente</th>
                                            <th style={{ ...thStyle, textAlign: 'center' }}>Pedidos</th>
                                            <th style={{ ...thStyle, textAlign: 'center' }}>Total Gasto</th>
                                            <th style={{ ...thStyle, textAlign: 'right' }}>Última Visita</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {history.map((record, index) => (
                                            <tr key={index} style={{ borderBottom: '1px solid #f8fafc' }} className="table-row-hover">
                                                <td style={tdStyle}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <div style={{
                                                            width: '36px', height: '36px', background: tokens.slate100, color: tokens.slate600,
                                                            borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                        }}>
                                                            <User size={18} />
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                            <span style={{ fontSize: '14px', fontWeight: '900', color: tokens.slate800 }}>{record.name || 'Visitante'}</span>
                                                            <span style={{ fontSize: '10px', color: tokens.slate400, fontWeight: '800', textTransform: 'uppercase' }}>{record.phone || 'S/ Contato'}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ ...tdStyle, textAlign: 'center' }}>
                                                    <span style={{
                                                        padding: '5px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '900',
                                                        background: tokens.slate100, color: tokens.secondary
                                                    }}>
                                                        {record.orderCount}
                                                    </span>
                                                </td>
                                                <td style={{ ...tdStyle, textAlign: 'center' }}>
                                                    <span style={{ fontSize: '14px', fontWeight: '900', color: tokens.primaryDark }}>
                                                        {record.totalSpent.toLocaleString()} <span style={{ fontSize: '10px' }}>MT</span>
                                                    </span>
                                                </td>
                                                <td style={{ ...tdStyle, textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                        <span style={{ fontSize: '12px', fontWeight: '800', color: tokens.slate600 }}>
                                                            {format(new Date(record.lastVisit), "dd MMM yyyy", { locale: pt })}
                                                        </span>
                                                        <span style={{ fontSize: '10px', fontWeight: '700', color: tokens.slate400, textTransform: 'uppercase' }}>
                                                            {formatDistanceToNow(new Date(record.lastVisit), { addSuffix: true, locale: pt })}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer Status */}
                <div style={{
                    padding: '24px 40px', borderTop: '1px solid rgba(0,0,0,0.03)',
                    background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'flex-end'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '12px 32px', background: tokens.secondary, color: 'white',
                            borderRadius: '16px', border: 'none', fontWeight: '900', fontSize: '14px',
                            cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 8px 20px rgba(15, 23, 42, 0.2)'
                        }}
                        className="interact-btn"
                    >
                        Fechar
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes modalScaleIn {
                    from { transform: scale(0.9) translateY(20px); opacity: 0; }
                    to { transform: scale(1) translateY(0); opacity: 1; }
                }
                @keyframes spinAround {
                    to { transform: rotate(360deg); }
                }
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .table-row-hover:hover { background: #fbfcfd !important; }
                .interact-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 24px rgba(15, 23, 42, 0.3) !important; filter: brightness(1.1); }
                .status-card-hover:hover:not(:disabled) { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.08); }
            `}</style>
        </div>
    );
}

const thStyle = {
    padding: '16px 24px', fontSize: '9px', fontWeight: '900', color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid #f1f5f9'
};

const tdStyle = {
    padding: '16px 24px', verticalAlign: 'middle'
};

const Timer = ({ size, ...props }) => (
    <Clock size={size} {...props} />
);
