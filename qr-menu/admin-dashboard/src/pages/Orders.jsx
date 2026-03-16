import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { orderAPI } from '../services/api';
import { format } from 'date-fns';
import { Eye, RefreshCw, Printer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '../components/LoadingSpinner';
import { SkeletonList } from '../components/Skeleton';
import { useSocket } from '../contexts/SocketContext';
import { useSound } from '../hooks/useSound';
import ReceiptModal from '../components/ReceiptModal';

export default function Orders() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { socket } = useSocket();
    const [orders, setOrders] = useState([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [newOrderIds, setNewOrderIds] = useState(new Set()); // For highlighting
    const { play: playNewOrder } = useSound('/sounds/glass.mp3');

    useEffect(() => {
        if (user?.restaurant) {
            fetchOrders();
        }
    }, [user, filter]);

    // Socket listeners for real-time updates
    useEffect(() => {
        if (!socket) return;

        const handleNewOrder = (newOrder) => {
            console.log('OrdersPage: New order received', newOrder);

            // Only add if it matches current filter or filter is 'all'
            if (filter === 'all' || filter === 'pending') {
                setOrders(prev => {
                    // Check if already exists
                    if (prev.find(o => o._id === newOrder._id || o._id === newOrder.orderId)) return prev;

                    // Add to list (at the top since it's most recent)
                    return [newOrder, ...prev];
                });

                // Play sound
                playNewOrder();

                // Highlight briefly
                const orderId = newOrder._id || newOrder.orderId;
                setNewOrderIds(prev => new Set([...prev, orderId]));
                setTimeout(() => {
                    setNewOrderIds(prev => {
                        const next = new Set(prev);
                        next.delete(orderId);
                        return next;
                    });
                }, 5000);
            }
        };

        const handleOrderUpdate = (updatedOrder) => {
            console.log('OrdersPage: Order updated', updatedOrder);

            setOrders(prev => {
                const index = prev.findIndex(o => o._id === updatedOrder._id);
                if (index === -1) {
                    // If not in list but now matches filter, maybe we should fetch?
                    // For now, only update if already present
                    return prev;
                }

                // If filter is active and new status doesn't match, remove it
                if (filter !== 'all' && updatedOrder.status !== filter) {
                    return prev.filter(o => o._id !== updatedOrder._id);
                }

                const newOrders = [...prev];
                newOrders[index] = { ...newOrders[index], ...updatedOrder };
                return newOrders;
            });
        };

        socket.on('order:new', handleNewOrder);
        socket.on('order-updated', handleOrderUpdate);

        return () => {
            socket.off('order:new', handleNewOrder);
            socket.off('order-updated', handleOrderUpdate);
        };
    }, [socket, filter, playNewOrder]);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const params = filter !== 'all' ? { status: filter } : {};
            const response = await orderAPI.getAll(user.restaurant._id || user.restaurant, params);
            setOrders(response.data.orders || []);
        } catch (error) {
            console.error('Failed to fetch orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateOrderStatus = async (orderId, newStatus) => {
        try {
            // Optimistic Update
            setOrders(prev => prev.map(o =>
                o._id === orderId ? { ...o, status: newStatus } : o
            ));

            await orderAPI.updateStatus(orderId, newStatus);
            // No need to fetchOrders(), socket or optimistic update handled it
        } catch (error) {
            console.error('Failed to update order:', error);
            alert(t('error_update_order') || 'Failed to update order status');
            fetchOrders(); // Rollback on error
        }
    };

    const statusColors = {
        pending: 'yellow',
        confirmed: 'blue',
        preparing: 'purple',
        ready: 'orange',
        served: 'green',
        completed: 'green',
        cancelled: 'red'
    };

    const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState(null);

    return (
        <div className="orders-page">
            <div className="page-header">
                <div>
                    <h2>{t('orders_management')}</h2>
                    <p>{t('orders_management_desc')}</p>
                </div>
                <button onClick={fetchOrders} className="btn-secondary">
                    <RefreshCw size={18} />
                    {t('refresh_btn')}
                </button>
            </div>

            {/* Filters */}
            <div className="filters">
                {['all', 'pending', 'confirmed', 'preparing', 'ready', 'completed'].map(status => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`filter-btn ${filter === status ? 'active' : ''}`}
                    >
                        {status === 'all' ? t('all_filter') : t(status)}
                    </button>
                ))}
            </div>

            {/* Orders Table */}
            {loading ? (
                <div className="p-6">
                    <div className="mb-6">
                        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2"></div>
                        <div className="h-4 w-64 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                    <SkeletonList items={8} height="100px" gap="16px" />
                </div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>{t('order_id_label')}</th>
                                <th>{t('date_time_label')}</th>
                                <th>{t('customer_label')}</th>
                                <th>{t('order_type_label')}</th>
                                <th>{t('table_label')}</th>
                                <th>{t('items_label')}</th>
                                <th>{t('total')}</th>
                                <th>{t('payment_label')}</th>
                                <th>{t('status')}</th>
                                <th>{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map(order => (
                                <tr
                                    key={order._id}
                                    style={{
                                        transition: 'all 0.5s ease',
                                        backgroundColor: newOrderIds.has(order._id) ? '#fff7ed' : 'transparent',
                                        borderLeft: newOrderIds.has(order._id) ? '4px solid #f97316' : 'none'
                                    }}
                                >
                                    <td className="font-mono">#{order._id.slice(-6).toUpperCase()}</td>
                                    <td>{format(new Date(order.createdAt), 'MMM dd, yyyy HH:mm')}</td>
                                    <td>
                                        <div>
                                            <div className="font-semibold">{order.customerName || 'Guest'}</div>
                                            <div className="text-sm text-gray">{order.phone}</div>
                                        </div>
                                    </td>
                                    <td><span className="badge">{order.orderType}</span></td>
                                    <td>
                                        {order.orderType === 'room-service' ? (
                                            <span className="font-semibold" style={{ color: '#7c3aed' }}>
                                                🛏️ Quarto {order.roomService?.roomNumber || '—'}
                                            </span>
                                        ) : order.table ? (
                                            <span className="font-semibold" style={{ color: '#2563eb' }}>
                                                🪑 {t('table_label')} {order.table.number || order.table}
                                            </span>
                                        ) : (() => {
                                            // Fallback: extract number from customerName (e.g. "Garçom Mesa 17")
                                            const match = order.customerName?.match(/mesa\s*(\d+)/i);
                                            return match ? (
                                                <span className="font-semibold" style={{ color: '#2563eb' }}>
                                                    🪑 {t('table_label')} {match[1]}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            );
                                        })()}
                                    </td>
                                    <td>{order.items?.length || 0} {t('items')}</td>
                                    <td className="font-semibold">{order.total} MT</td>
                                    <td>
                                        <span className={`status-badge ${order.paymentStatus}`}>
                                            {t(`payment_status_${order.paymentStatus}`) || order.paymentStatus}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`status-badge ${statusColors[order.status]}`}>
                                            {t(`status_${order.status}`) || order.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button
                                                onClick={() => setSelectedOrderForReceipt(order)}
                                                className="btn-small"
                                                style={{ marginRight: '8px', background: '#f1f5f9', color: '#475569', border: 'none' }}
                                                title={t('issue_receipt') || "Emitir Recibo"}
                                            >
                                                <Printer size={16} />
                                            </button>
                                            {order.status === 'pending' && (
                                                <>
                                                    <button
                                                        onClick={() => updateOrderStatus(order._id, 'confirmed')}
                                                        className="btn-small btn-primary"
                                                    >
                                                        {t('confirm_btn')}
                                                    </button>
                                                    <button
                                                        onClick={() => updateOrderStatus(order._id, 'cancelled')}
                                                        className="btn-small btn-danger"
                                                        style={{ marginLeft: '8px', background: '#ef4444', color: 'white', border: 'none' }}
                                                    >
                                                        {t('cancel_btn')}
                                                    </button>
                                                </>
                                            )}
                                            {order.status === 'confirmed' && (
                                                <>
                                                    <button
                                                        onClick={() => updateOrderStatus(order._id, 'preparing')}
                                                        className="btn-small btn-primary"
                                                    >
                                                        {t('start_preparing_btn')}
                                                    </button>
                                                    <button
                                                        onClick={() => updateOrderStatus(order._id, 'cancelled')}
                                                        className="btn-small btn-danger"
                                                        style={{ marginLeft: '8px', background: '#ef4444', color: 'white', border: 'none' }}
                                                    >
                                                        {t('cancel_btn')}
                                                    </button>
                                                </>
                                            )}
                                            {order.status === 'preparing' && (
                                                <button
                                                    onClick={() => updateOrderStatus(order._id, 'ready')}
                                                    className="btn-small btn-primary"
                                                >
                                                    {t('mark_ready_btn')}
                                                </button>
                                            )}
                                            {order.status === 'ready' && (
                                                <button
                                                    onClick={() => updateOrderStatus(order._id, 'completed')}
                                                    className="btn-small btn-primary"
                                                >
                                                    {t('complete_btn')}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {orders.length === 0 && (
                        <div className="empty-state">
                            <p>{t('no_orders_found')}</p>
                        </div>
                    )}
                </div>
            )}

            {selectedOrderForReceipt && (
                <ReceiptModal
                    order={selectedOrderForReceipt}
                    onClose={() => setSelectedOrderForReceipt(null)}
                />
            )}
        </div>
    );
}
