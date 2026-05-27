import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Package, DollarSign, ChevronDown, ChevronUp, Receipt } from 'lucide-react';
import { tableAPI } from '../services/api';
import { format } from 'date-fns';
import { useSocket } from '../contexts/SocketContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { formatOrderNumber } from '../utils/orderUtils';

const TableOrderHistory = ({ tableId }) => {
    const { t } = useTranslation();
    const { socket } = useSocket();
    const { convertAndFormat } = useCurrency();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedOrder, setExpandedOrder] = useState(null);

    useEffect(() => {
        loadOrders();
    }, [tableId]);

    // Socket.IO real-time updates
    useEffect(() => {
        if (!socket || !tableId) return;

        const handleOrderUpdate = (data) => {
            // Refresh if order belongs to this table
            if (data.tableId === tableId || data.table === tableId) {
                loadOrders();
            }
        };

        socket.on('order:new', handleOrderUpdate);
        socket.on('order-updated', handleOrderUpdate);
        socket.on('order:new:full', handleOrderUpdate);

        return () => {
            socket.off('order:new', handleOrderUpdate);
            socket.off('order-updated', handleOrderUpdate);
            socket.off('order:new:full', handleOrderUpdate);
        };
    }, [socket, tableId]);

    const loadOrders = async () => {
        try {
            setLoading(true);
            const { data } = await tableAPI.getOrders(tableId, { limit: 20 });
            setOrders(data.orders || []);
        } catch (error) {
            console.error('❌ Failed to load table orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            pending: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
            confirmed: { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
            preparing: { bg: '#f3e8ff', text: '#6b21a8', border: '#d8b4fe' },
            ready: { bg: '#ffedd5', text: '#9a3412', border: '#fdba74' },
            completed: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
            cancelled: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' }
        };
        return colors[status] || { bg: '#f3f4f6', text: '#1f2937', border: '#d1d5db' };
    };

    const toggleOrderExpand = (orderId) => {
        setExpandedOrder(expandedOrder === orderId ? null : orderId);
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[1, 2, 3].map(i => (
                    <div key={i} style={{ backgroundColor: '#f1f5f9', borderRadius: '12px', height: '64px', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
                ))}
            </div>
        );
    }

    if (orders.length === 0) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', color: '#94a3b8' }}>
                <Receipt size={48} strokeWidth={1} style={{ marginBottom: '12px' }} />
                <p style={{ fontSize: '14px', fontWeight: '500', margin: 0 }}>{t('no_orders_yet') || 'Nenhum pedido ainda'}</p>
                <p style={{ fontSize: '12px', marginTop: '4px', margin: 0 }}>{t('orders_will_appear_here') || 'Os pedidos aparecerão aqui'}</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {orders.map((order, index) => {
                const statusStyle = getStatusColor(order.status);
                const isExpanded = expandedOrder === order._id;
                
                return (
                    <div
                        key={order._id}
                        style={{
                            backgroundColor: '#ffffff',
                            borderRadius: '16px',
                            transition: 'all 0.2s'
                        }}
                    >
                        {/* Order Header - clickable to expand */}
                        <div
                            style={{ padding: '8px 0', cursor: 'pointer', userSelect: 'none' }}
                            onClick={() => toggleOrderExpand(order._id)}
                        >
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                                        <span style={{ fontWeight: '900', color: '#0f172a', fontSize: '15px' }}>
                                            #{formatOrderNumber(order.orderNumber)}
                                        </span>
                                        <span style={{ 
                                            padding: '4px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: '800', 
                                            backgroundColor: statusStyle.bg, color: statusStyle.text, textTransform: 'capitalize'
                                        }}>
                                            {t(order.status) || order.status}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Clock size={12} />
                                            {format(new Date(order.createdAt), 'HH:mm · dd/MM/yy')}
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Package size={12} />
                                            {order.items?.length || 0} {t('items') || 'Items'}
                                        </span>
                                    </div>
                                    {!isExpanded && (
                                        <p style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                                            <ChevronDown size={12} />
                                            {t('tap_to_expand') || 'Tap to see details'}
                                        </p>
                                    )}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: '900', fontSize: '18px', color: '#0f172a' }}>
                                            {convertAndFormat(order.total, order.currency)}
                                        </div>
                                    </div>
                                    {isExpanded ? (
                                        <ChevronUp size={20} color="#cbd5e1" />
                                    ) : (
                                        <ChevronDown size={20} color="#cbd5e1" />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && (
                            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {order.items?.map((item, idx) => (
                                        <div
                                            key={idx}
                                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                                <span style={{ fontWeight: '800', color: '#4f46e5' }}>
                                                    {item.qty}x
                                                </span>
                                                <span style={{ color: '#475569', fontWeight: '600' }}>
                                                    {item.item?.name || 'Item'}
                                                </span>
                                            </div>
                                            <span style={{ fontWeight: '700', color: '#0f172a' }}>
                                                {convertAndFormat((item.item?.price || 0) * item.qty, order.currency || item.item?.currency)}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* Order Summary */}
                                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                        <span style={{ color: '#64748b', fontWeight: '600' }}>{t('subtotal') || 'Subtotal'}</span>
                                        <span style={{ fontWeight: '700', color: '#0f172a' }}>
                                            {convertAndFormat(order.subtotal, order.currency)}
                                        </span>
                                    </div>
                                    {order.tax > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                            <span style={{ color: '#64748b', fontWeight: '600' }}>{t('tax') || 'Tax'}</span>
                                            <span style={{ fontWeight: '700', color: '#0f172a' }}>
                                                {convertAndFormat(order.tax, order.currency)}
                                            </span>
                                        </div>
                                    )}
                                    {order.discount > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#16a34a' }}>
                                            <span style={{ fontWeight: '600' }}>{t('discount') || 'Discount'}</span>
                                            <span style={{ fontWeight: '700' }}>-{convertAndFormat(order.discount, order.currency)}</span>
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '900', paddingTop: '12px', borderTop: '1px solid #f1f5f9', marginTop: '4px' }}>
                                        <span style={{ color: '#0f172a' }}>{t('total') || 'Total'}</span>
                                        <span style={{ color: '#0f172a' }}>
                                            {convertAndFormat(order.total, order.currency)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default TableOrderHistory;
