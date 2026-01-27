import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { orderAPI } from '../services/api';
import { format } from 'date-fns';
import { Eye, RefreshCw, Printer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '../components/LoadingSpinner';
import { SkeletonList } from '../components/Skeleton';
import ReceiptModal from '../components/ReceiptModal';

export default function Orders() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [orders, setOrders] = useState([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.restaurant) {
            fetchOrders();
        }
    }, [user, filter]);

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
            await orderAPI.updateStatus(orderId, newStatus);
            fetchOrders();
        } catch (error) {
            console.error('Failed to update order:', error);
            alert(t('error_update_order') || 'Failed to update order status');
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
                                <tr key={order._id}>
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
                                        {order.table ? (
                                            <span className="font-semibold text-blue-600">
                                                {t('table_label')} {order.table.number || order.table}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400">-</span>
                                        )}
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
