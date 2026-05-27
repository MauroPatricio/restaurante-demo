import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { orderAPI } from '../services/api';
import { format } from 'date-fns';
import { Eye, RefreshCw, Printer, X, Activity, Filter, Clock, Users, Hash, CreditCard } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '../components/LoadingSpinner';
import { SkeletonList } from '../components/Skeleton';
import { useSocket } from '../contexts/SocketContext';
import { useSound } from '../hooks/useSound';
import ReceiptModal from '../components/ReceiptModal';
import { useCurrency } from '../contexts/CurrencyContext';
import { motion, AnimatePresence } from 'framer-motion';
import './Orders.css';
import { formatOrderNumber } from '../utils/orderUtils';

export default function Orders() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { socket } = useSocket();
    const { convertAndFormat } = useCurrency();
    const [orders, setOrders] = useState([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [newOrderIds, setNewOrderIds] = useState(new Set());
    const { play: playNewOrder } = useSound('/sounds/glass.mp3');

    useEffect(() => {
        if (user?.restaurant) {
            fetchOrders();
        }
    }, [user, filter]);

    useEffect(() => {
        if (!socket) return;

        const handleNewOrder = (newOrder) => {
            if (filter === 'all' || filter === 'pending') {
                setOrders(prev => {
                    const orderId = newOrder._id || newOrder.orderId;
                    if (prev.find(o => o._id === orderId)) return prev;
                    return [newOrder, ...prev];
                });

                playNewOrder();
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
            setOrders(prev => {
                const index = prev.findIndex(o => o._id === updatedOrder._id);
                if (index === -1) return prev;
                if (filter !== 'all' && updatedOrder.status !== filter) {
                    return prev.filter(o => o._id !== updatedOrder._id);
                }
                const newOrders = [...prev];
                newOrders[index] = { ...newOrders[index], ...updatedOrder };
                return newOrders;
            });
        };

        socket.on('order:new', handleNewOrder);
        socket.on('room:order:new', handleNewOrder);
        socket.on('order-updated', handleOrderUpdate);

        return () => {
            socket.off('order:new', handleNewOrder);
            socket.off('room:order:new', handleNewOrder);
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
            setOrders(prev => {
                if (filter !== 'all' && newStatus !== filter) {
                    return prev.filter(o => o._id !== orderId);
                }
                return prev.map(o => o._id === orderId ? { ...o, status: newStatus } : o);
            });
            await orderAPI.updateStatus(orderId, newStatus);
        } catch (error) {
            console.error('Failed to update order:', error);
            fetchOrders();
        }
    };

    const statusConfig = {
        pending: { color: '#f59e0b', bg: '#fffbeb' },
        confirmed: { color: '#3b82f6', bg: '#eff6ff' },
        preparing: { color: '#8b5cf6', bg: '#f5f3ff' },
        almost_ready: { color: '#6366f1', bg: '#eef2ff' },
        ready: { color: '#f97316', bg: '#fff7ed' },
        served: { color: '#10b981', bg: '#ecfdf5' },
        completed: { color: '#10b981', bg: '#ecfdf5' },
        cancelled: { color: '#ef4444', bg: '#fef2f2' }
    };

    const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState(null);

    return (
        <div className="orders-page">
            {/* ── Header ── */}
            <header className="orders-header">
                <div className="orders-title-section">
                    <div className="flex items-center gap-2 mb-1">
                        <Activity size={16} className="text-primary-600" />
                        <span className="text-[10px] font-900 uppercase tracking-widest text-primary-600">{t('monitoring')}</span>
                    </div>
                    <h2>{t('orders_management') || 'Gestão de Pedidos'}</h2>
                    <p>{t('orders_management_desc') || 'Veja e gira todos os pedidos em tempo real'}</p>
                </div>
                
                <button onClick={fetchOrders} className="btn-modern-outline flex items-center gap-2">
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    <span>{t('refresh_btn') || 'Actualizar'}</span>
                </button>
            </header>

            {/* ── Filters ── */}
            <nav className="orders-filters-container">
                {['all', 'pending', 'confirmed', 'preparing', 'almost_ready', 'ready', 'completed'].map(status => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`filter-tab ${filter === status ? 'active' : ''}`}
                    >
                        {status === 'all' ? t('all_filter') : t(status)}
                    </button>
                ))}
            </nav>

            {/* ── Content ── */}
            {loading ? (
                <div className="space-y-4">
                    <SkeletonList items={8} height="72px" gap="12px" borderRadius="16px" />
                </div>
            ) : (
                <div className="w-full">
                    {/* Desktop Table View */}
                    <div className="hidden lg:block orders-table-wrapper">
                        <table className="orders-table">
                            <thead>
                                <tr>
                                    <th>{t('order_id_label') || 'ID'}</th>
                                    <th>{t('date_time_label') || 'Data e Hora'}</th>
                                    <th>{t('customer_label') || 'Cliente'}</th>
                                    <th>{t('table_label') || 'Mesa'}</th>
                                    <th>{t('total') || 'Total'}</th>
                                    <th>{t('status') || 'Estado'}</th>
                                    <th className="text-right">{t('actions') || 'Acções'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <AnimatePresence mode="popLayout">
                                    {orders.map(order => (
                                        <motion.tr 
                                            layout
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            key={order._id}
                                            className={`order-row ${newOrderIds.has(order._id) ? 'new-highlight' : ''}`}
                                        >
                                            <td className="order-id-cell">#{formatOrderNumber()}</td>
                                            <td className="text-sm font-700 text-gray-500">
                                                <div className="flex items-center gap-2">
                                                    <Clock size={14} className="text-gray-300" />
                                                    {format(new Date(order.createdAt), 'dd MMM, HH:mm')}
                                                </div>
                                            </td>
                                            <td className="customer-cell">
                                                <h4>{order.customerName || t('guest')}</h4>
                                                <p>{order.phone}</p>
                                            </td>
                                            <td>
                                                <span className="table-badge">
                                                    {order.orderType === 'room-service' ? `🛏️ ${order.roomService?.roomNumber}` : `🪑 ${order.tableNumber || order.table?.number || order.table || '-'}`}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="price-text">{convertAndFormat(order.total, order.currency)}</span>
                                            </td>
                                            <td>
                                                <span className="status-pill" style={{ 
                                                    color: statusConfig[order.status]?.color, 
                                                    background: statusConfig[order.status]?.bg 
                                                }}>
                                                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: statusConfig[order.status]?.color }} />
                                                    {t(`status_${order.status}`) || order.status}
                                                </span>
                                            </td>
                                            <td className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => setSelectedOrderForReceipt(order)} className="action-btn" title={t('print')}>
                                                        <Printer size={18} />
                                                    </button>
                                                    
                                                    {/* Actions based on status */}
                                                    {order.status === 'pending' && (
                                                        <div className="flex gap-2">
                                                            <button onClick={() => updateOrderStatus(order._id, 'confirmed')} className="btn-confirm">
                                                                {t('confirm_btn')}
                                                            </button>
                                                            <button onClick={() => updateOrderStatus(order._id, 'cancelled')} className="btn-cancel">
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    )}

                                                    {order.status === 'confirmed' && (
                                                        <button onClick={() => updateOrderStatus(order._id, 'preparing')} className="btn-modern-primary py-1.5 px-4 text-xs font-900 uppercase tracking-widest">
                                                            {t('start_preparing_btn')}
                                                        </button>
                                                    )}

                                                    {order.status === 'preparing' && (
                                                        <button onClick={() => updateOrderStatus(order._id, 'ready')} className="bg-orange-500 text-white py-1.5 px-4 text-xs font-900 uppercase tracking-widest rounded-lg">
                                                            {t('mark_ready_btn')}
                                                        </button>
                                                    )}

                                                    {order.status === 'ready' && (
                                                        <button onClick={() => updateOrderStatus(order._id, 'completed')} className="bg-emerald-500 text-white py-1.5 px-4 text-xs font-900 uppercase tracking-widest rounded-lg">
                                                            {t('complete_btn')}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="lg:hidden space-y-4">
                        {orders.map(order => (
                            <motion.div
                                layout
                                key={order._id}
                                className={`glass-card order-mobile-card ${newOrderIds.has(order._id) ? 'border-primary-600 ring-4 ring-primary-600/5' : ''}`}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <span className="text-[10px] font-900 text-gray-300 uppercase tracking-widest mb-1 block">#{formatOrderNumber()}</span>
                                        <h3 className="text-lg font-900 text-gray-900 uppercase">{order.customerName || t('guest')}</h3>
                                        <p className="text-xs font-700 text-gray-400">{order.phone}</p>
                                    </div>
                                    <span className="status-pill" style={{ 
                                        color: statusConfig[order.status]?.color, 
                                        background: statusConfig[order.status]?.bg 
                                    }}>
                                        {t(`status_${order.status}`) || order.status}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-4 py-4 border-y border-dashed border-gray-100 mb-4">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-900 text-gray-400 uppercase tracking-widest">{t('table_label')}</span>
                                        <span className="font-900 text-primary-600">{order.orderType === 'room-service' ? `🛏️ ${order.roomService?.roomNumber}` : `🪑 ${order.table?.number || order.table || '-'}`}</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-900 text-gray-400 uppercase tracking-widest">{t('total')}</span>
                                        <span className="font-900 text-gray-900">{convertAndFormat(order.total, order.currency)}</span>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button onClick={() => setSelectedOrderForReceipt(order)} className="action-btn h-12 w-12 flex items-center justify-center">
                                        <Printer size={20} />
                                    </button>
                                    
                                    {order.status === 'pending' && (
                                        <button onClick={() => updateOrderStatus(order._id, 'confirmed')} className="flex-1 btn-modern-primary h-12 uppercase tracking-widest font-900 text-xs">
                                            {t('confirm_btn')}
                                        </button>
                                    )}
                                    {order.status === 'confirmed' && (
                                        <button onClick={() => updateOrderStatus(order._id, 'preparing')} className="flex-1 bg-indigo-600 text-white rounded-xl h-12 uppercase tracking-widest font-900 text-xs">
                                            {t('start_preparing_btn')}
                                        </button>
                                    )}
                                    {order.status === 'ready' && (
                                        <button onClick={() => updateOrderStatus(order._id, 'completed')} className="flex-1 bg-emerald-500 text-white rounded-xl h-12 uppercase tracking-widest font-900 text-xs">
                                            {t('complete_btn')}
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {orders.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-24 glass-card border-dashed">
                             <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center text-gray-200 mb-6">
                                <Activity size={40} strokeWidth={1.5} />
                             </div>
                            <p className="text-gray-400 font-900 uppercase tracking-[0.2em] text-[10px]">{t('no_orders_found')}</p>
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
