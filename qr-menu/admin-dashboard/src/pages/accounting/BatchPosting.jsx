import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { accountingAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
    CheckSquare, Square, ShoppingBag, Clock,
    ArrowRight, CheckCircle2, AlertCircle, RefreshCw
} from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useConnectivity } from '../../contexts/ConnectivityContext';

export default function BatchPosting() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { addToast } = useConnectivity();

    const [pendingOrders, setPendingOrders] = useState([]);
    const [selectedOrders, setSelectedOrders] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchPendingOrders();
    }, []);

    const fetchPendingOrders = async () => {
        try {
            setLoading(true);
            const res = await accountingAPI.getPendingOrders();
            setPendingOrders(res.data.orders || []);
            setSelectedOrders(new Set()); // Reset selections
        } catch (error) {
            console.error('Failed to fetch pending orders:', error);
            addToast('Erro ao buscar pedidos pendentes.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAll = () => {
        if (selectedOrders.size === pendingOrders.length) {
            setSelectedOrders(new Set()); // Deselect all
        } else {
            setSelectedOrders(new Set(pendingOrders.map(o => o._id))); // Select all
        }
    };

    const toggleSelectOrder = (orderId) => {
        const newSelected = new Set(selectedOrders);
        if (newSelected.has(orderId)) {
            newSelected.delete(orderId);
        } else {
            newSelected.add(orderId);
        }
        setSelectedOrders(newSelected);
    };

    const handleBatchProcess = async () => {
        if (selectedOrders.size === 0) return;

        try {
            setProcessing(true);
            const orderIds = Array.from(selectedOrders);
            const res = await accountingAPI.postBatchTransactions(orderIds);

            addToast(`Lançamento em Lote concluído. ${res.data.results?.filter(r => r.status === 'success').length} sucessos, ${res.data.results?.filter(r => r.status === 'error').length} falhas.`, 'success');

            await fetchPendingOrders(); // Refresh list
        } catch (error) {
            console.error('Batch process failed:', error);
            addToast('Ocorreu um erro ao processar os lançamentos em lote.', 'error');
        } finally {
            setProcessing(false);
        }
    };

    const currency = user?.restaurant?.settings?.currency || 'MT';
    const totalSelectedAmount = pendingOrders
        .filter(o => selectedOrders.has(o._id))
        .reduce((sum, o) => sum + o.total, 0);

    return (
        <div style={{ padding: '32px' }}>
            {/* Header */}
            <div style={{ marginBottom: '48px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h2 style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', margin: 0 }}>Lançamentos em Lote</h2>
                    <p style={{ color: '#94a3b8', fontWeight: '700' }}>Processar Pedidos Pagos para o Diário Geral</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={fetchPendingOrders}
                        disabled={loading || processing}
                        style={{
                            padding: '12px', borderRadius: '16px', background: 'white', border: '1px solid #e2e8f0',
                            color: '#475569', cursor: (loading || processing) ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                    >
                        <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                    </button>
                    <button
                        onClick={handleBatchProcess}
                        disabled={selectedOrders.size === 0 || processing}
                        style={{
                            padding: '12px 24px', borderRadius: '16px',
                            background: selectedOrders.size === 0 ? '#e2e8f0' : '#4f46e5',
                            color: selectedOrders.size === 0 ? '#94a3b8' : 'white',
                            border: 'none', fontWeight: '800', fontSize: '14px',
                            display: 'flex', alignItems: 'center', gap: '8px',
                            cursor: (selectedOrders.size === 0 || processing) ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: selectedOrders.size > 0 ? '0 4px 12px rgba(79, 70, 229, 0.3)' : 'none'
                        }}
                    >
                        {processing ? <LoadingSpinner size="sm" color="white" /> : <ArrowRight size={18} />}
                        Lançar Selecionados ({selectedOrders.size})
                    </button>
                </div>
            </div>

            {loading && !processing ? (
                <div className="py-12"><LoadingSpinner /></div>
            ) : pendingOrders.length === 0 ? (
                <div style={{ padding: '64px', textAlign: 'center', background: '#f8fafc', borderRadius: '32px', border: '2px dashed #e2e8f0' }}>
                    <CheckCircle2 size={48} style={{ color: '#10b981', marginBottom: '16px', marginInline: 'auto' }} />
                    <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Tudo em Dia!</h3>
                    <p style={{ color: '#64748b', fontWeight: '600', marginTop: '8px' }}>Não há pedidos pagos pendentes de lançamento contábil.</p>
                </div>
            ) : (
                <div style={{ background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    {/* Bulk Selection Header */}
                    <div style={{ padding: '20px 32px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <button
                                onClick={handleSelectAll}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: selectedOrders.size === pendingOrders.length ? '#4f46e5' : '#94a3b8' }}
                            >
                                {selectedOrders.size === pendingOrders.length && pendingOrders.length > 0 ? <CheckSquare size={24} /> : <Square size={24} />}
                            </button>
                            <span style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>
                                Selecionar Todos ({pendingOrders.length} Pendentes)
                            </span>
                        </div>
                        {selectedOrders.size > 0 && (
                            <div style={{ fontSize: '16px', fontWeight: '900', color: '#10b981' }}>
                                Total a Lançar: {totalSelectedAmount.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} {currency}
                            </div>
                        )}
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: '#f1f5f9' }}>
                                <th style={{ padding: '16px 24px', width: '40px' }}></th>
                                <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>Pedido</th>
                                <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>Data / Hora</th>
                                <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>Método</th>
                                <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>Valor Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingOrders.map((order) => {
                                const isSelected = selectedOrders.has(order._id);
                                return (
                                    <tr
                                        key={order._id}
                                        onClick={() => toggleSelectOrder(order._id)}
                                        style={{
                                            borderBottom: '1px solid #f1f5f9',
                                            background: isSelected ? '#eef2ff' : 'white',
                                            cursor: 'pointer', transition: 'background-color 0.2s'
                                        }}
                                        className="hover:bg-slate-50"
                                    >
                                        <td style={{ padding: '16px 24px' }}>
                                            <div style={{ color: isSelected ? '#4f46e5' : '#cbd5e1' }}>
                                                {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <ShoppingBag size={16} style={{ color: '#64748b' }} />
                                                <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                                                    #{order.orderNumber || order._id.toString().slice(-6)}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Clock size={16} style={{ color: '#64748b' }} />
                                                <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>
                                                    {new Date(order.createdAt).toLocaleString()}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <span style={{
                                                fontSize: '11px', fontWeight: '800', color: '#475569',
                                                background: '#f1f5f9', padding: '4px 8px', borderRadius: '8px', textTransform: 'uppercase'
                                            }}>
                                                {order.paymentMethod || 'N/A'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px 24px', fontSize: '16px', fontWeight: '900', color: '#10b981', textAlign: 'right' }}>
                                            {order.total.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} {currency}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
