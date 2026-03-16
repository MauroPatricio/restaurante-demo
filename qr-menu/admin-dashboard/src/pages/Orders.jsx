import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { orderAPI } from '../services/api';
import { format } from 'date-fns';
import { Eye, RefreshCw, Printer, X, Activity } from 'lucide-react';
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
        <div className="orders-page p-4 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1">{t('orders_management')}</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">{t('orders_management_desc')}</p>
                </div>
                <button onClick={fetchOrders} className="btn-secondary self-start md:self-auto shadow-sm">
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    {t('refresh_btn')}
                </button>
            </div>

            {/* Filters - Scrollable on Mobile */}
            <div className="flex overflow-x-auto pb-4 mb-6 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide gap-2 no-wrap">
                {['all', 'pending', 'confirmed', 'preparing', 'ready', 'completed'].map(status => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-semibold transition-all border
                            ${filter === status 
                                ? 'bg-primary-600 border-primary-600 text-white shadow-md' 
                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-primary-400'}`}
                    >
                        {status === 'all' ? t('all_filter') : t(status)}
                    </button>
                ))}
            </div>

            {/* Content Section */}
            {loading ? (
                <div className="space-y-4">
                    <div className="hidden md:block">
                        <SkeletonList items={8} height="60px" gap="12px" />
                    </div>
                    <div className="md:hidden space-y-4">
                        <SkeletonList items={4} height="180px" gap="16px" />
                    </div>
                </div>
            ) : (
                <div className="w-full">
                    {/* Table View (Desktop) */}
                    <div className="hidden lg:block bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-900/50 border-bottom border-gray-100 dark:border-gray-700">
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">{t('order_id_label')}</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">{t('date_time_label')}</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">{t('customer_label')}</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">{t('table_label')}</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">{t('total')}</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">{t('status')}</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">{t('actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {orders.map(order => (
                                    <tr 
                                        key={order._id}
                                        className={`group hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors ${newOrderIds.has(order._id) ? 'bg-orange-50/50 dark:bg-orange-900/10' : ''}`}
                                    >
                                        <td className="px-6 py-4 font-mono text-xs font-bold text-gray-500">#{order._id.slice(-6).toUpperCase()}</td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-600 dark:text-gray-300">
                                            {format(new Date(order.createdAt), 'dd MMM, HH:mm')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">{order.customerName || 'Guest'}</span>
                                                <span className="text-[10px] text-gray-400 font-bold">{order.phone}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-black text-primary-600 dark:text-primary-400">
                                                {order.orderType === 'room-service' ? `🛏️ ${order.roomService?.roomNumber}` : `🪑 ${order.table?.number || order.table || '-'}`}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-black text-gray-900 dark:text-white">{order.total} {order.currency === 'MZN' ? 'MT' : (order.currency || 'MT')}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`status-badge ${statusColors[order.status]}`}>
                                                {t(`status_${order.status}`) || order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-100 xl:opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => setSelectedOrderForReceipt(order)} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-500 hover:text-primary-600 transition-colors">
                                                    <Printer size={16} />
                                                </button>
                                                
                                                {/* Action logics */}
                                                {order.status === 'pending' && (
                                                    <>
                                                        <button 
                                                            onClick={() => updateOrderStatus(order._id, 'confirmed')}
                                                            className="px-3 py-1 bg-primary-600 text-white text-xs font-bold rounded-lg hover:bg-primary-700 shadow-sm"
                                                        >
                                                            {t('confirm_btn')}
                                                        </button>
                                                        <button 
                                                            onClick={() => updateOrderStatus(order._id, 'cancelled')}
                                                            className="p-1 px-2 bg-red-50 text-red-500 text-xs font-bold rounded-lg hover:bg-red-100"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </>
                                                )}

                                                {order.status === 'confirmed' && (
                                                    <>
                                                        <button 
                                                            onClick={() => updateOrderStatus(order._id, 'preparing')}
                                                            className="px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700"
                                                        >
                                                            {t('start_preparing_btn')}
                                                        </button>
                                                        <button 
                                                            onClick={() => updateOrderStatus(order._id, 'cancelled')}
                                                            className="p-1 px-2 bg-red-50 text-red-500 text-xs font-bold rounded-lg hover:bg-red-100"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </>
                                                )}

                                                {order.status === 'preparing' && (
                                                    <button onClick={() => updateOrderStatus(order._id, 'ready')} className="px-3 py-1 bg-orange-500 text-white text-xs font-bold rounded-lg hover:bg-orange-600">{t('mark_ready_btn')}</button>
                                                )}
                                                {order.status === 'ready' && (
                                                    <button onClick={() => updateOrderStatus(order._id, 'completed')} className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600">{t('complete_btn')}</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Card View (Mobile & Tablet) */}
                    <div className="lg:hidden space-y-4">
                        {orders.map(order => (
                            <div 
                                key={order._id}
                                className={`bg-white dark:bg-gray-800 p-4 rounded-[24px] shadow-sm border-2 transition-all ${newOrderIds.has(order._id) ? 'border-orange-400 ring-4 ring-orange-500/10' : 'border-gray-100 dark:border-gray-700'}`}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-gray-400 tracking-[0.2em] mb-1 uppercase">INV-#{order._id.slice(-6).toUpperCase()}</span>
                                        <h3 className="text-base font-black text-gray-900 dark:text-white uppercase leading-tight">{order.customerName || 'Guest'}</h3>
                                        <span className="text-xs font-bold text-gray-400 mt-0.5">{order.phone}</span>
                                    </div>
                                    <span className={`status-badge ${statusColors[order.status]}`}>
                                        {t(`status_${order.status}`) || order.status}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 py-3 border-y border-dashed border-gray-100 dark:border-gray-700 mb-4">
                                    <div>
                                        <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{t('table_label')}</span>
                                        <span className="font-black text-primary-600 dark:text-primary-400 uppercase text-xs">
                                            {order.orderType === 'room-service' ? `🛏️ ${order.roomService?.roomNumber}` : `🪑 ${order.table?.number || order.table || '-'}`}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{t('items_label')}</span>
                                        <span className="font-black text-gray-900 dark:text-white text-xs">{order.items?.length || 0} {t('items')}</span>
                                    </div>
                                    <div className="col-span-2 lg:col-span-1">
                                        <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 p-2 rounded-xl">
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black text-gray-400 uppercase tracking-tight">{t('payment_label')}</span>
                                                <span className="text-[9px] font-bold text-gray-600 dark:text-gray-300 uppercase">{t(`method_${(order.paymentMethod || 'cash').toLowerCase()}`) || order.paymentMethod}</span>
                                            </div>
                                            <span className={`status-badge !text-[9px] !py-0.5 !px-2 ${order.paymentStatus === 'paid' ? 'green' : 'red'}`}>
                                                {t(`status_${(order.paymentStatus || 'pending').toLowerCase()}`) || order.paymentStatus}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{t('total')}</span>
                                        <span className="text-xl font-black text-primary-600 dark:text-primary-400 leading-none">{order.total} MT</span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <button 
                                        onClick={() => setSelectedOrderForReceipt(order)}
                                        className="h-10 px-4 flex-1 bg-gray-100 dark:bg-gray-700 rounded-xl text-gray-500 font-bold flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <Printer size={16} />
                                        <span className="text-[10px] uppercase tracking-widest">{t('receipt') || 'Recibo'}</span>
                                    </button>

                                    {order.status === 'pending' && (
                                        <>
                                            <button 
                                                onClick={() => updateOrderStatus(order._id, 'confirmed')}
                                                className="h-10 px-6 flex-[2] bg-primary-600 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-primary-500/20"
                                            >
                                                {t('confirm_btn')}
                                            </button>
                                            <button 
                                                onClick={() => updateOrderStatus(order._id, 'cancelled')}
                                                className="h-10 w-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center"
                                            >
                                                <X size={18} strokeWidth={3} />
                                            </button>
                                        </>
                                    )}

                                    {order.status === 'confirmed' && (
                                        <button 
                                            onClick={() => updateOrderStatus(order._id, 'preparing')}
                                            className="h-10 px-6 flex-[2] bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em]"
                                        >
                                            {t('start_preparing_btn')}
                                        </button>
                                    )}

                                    {order.status === 'preparing' && (
                                        <button 
                                            onClick={() => updateOrderStatus(order._id, 'ready')}
                                            className="h-10 px-6 flex-[2] bg-orange-500 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em]"
                                        >
                                            {t('mark_ready_btn')}
                                        </button>
                                    )}

                                    {order.status === 'ready' && (
                                        <button 
                                            onClick={() => updateOrderStatus(order._id, 'completed')}
                                            className="h-10 px-6 flex-[2] bg-green-500 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em]"
                                        >
                                            {t('complete_btn')}
                                        </button>
                                    )}
                                </div>
                                <div className="mt-4 flex justify-between items-center text-[9px] font-bold text-gray-300 uppercase tracking-widest">
                                    <span>{format(new Date(order.createdAt), 'dd MMM yyyy')}</span>
                                    <span>{format(new Date(order.createdAt), 'HH:mm')}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {orders.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-800 rounded-[32px] border-2 border-dashed border-gray-100 dark:border-gray-700">
                             <div className="w-16 h-16 bg-gray-50 dark:bg-gray-900 rounded-2xl flex items-center justify-center text-gray-300 mb-4">
                                <Activity size={32} />
                             </div>
                            <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-xs">{t('no_orders_found')}</p>
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
