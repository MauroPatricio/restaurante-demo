import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Package, DollarSign, ChevronDown, ChevronUp, Receipt } from 'lucide-react';
import { tableAPI } from '../services/api';
import { format } from 'date-fns';
import { useSocket } from '../contexts/SocketContext';

const TableOrderHistory = ({ tableId }) => {
    const { t } = useTranslation();
    const { socket } = useSocket();
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
            console.log('🔍 Loading orders for tableId:', tableId);
            const { data } = await tableAPI.getOrders(tableId, { limit: 20 });
            console.log('✅ Orders loaded:', data);
            setOrders(data.orders || []);
        } catch (error) {
            console.error('❌ Failed to load table orders:', error);
            console.error('Error details:', error.response?.data || error.message);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
            confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
            preparing: 'bg-purple-100 text-purple-800 border-purple-300',
            ready: 'bg-orange-100 text-orange-800 border-orange-300',
            completed: 'bg-green-100 text-green-800 border-green-300',
            cancelled: 'bg-red-100 text-red-800 border-red-300'
        };
        return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
    };

    const toggleOrderExpand = (orderId) => {
        setExpandedOrder(expandedOrder === orderId ? null : orderId);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (orders.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Receipt size={48} strokeWidth={1} className="mb-3" />
                <p className="text-sm font-medium">{t('no_orders_yet') || 'Nenhum pedido ainda'}</p>
                <p className="text-xs mt-1">{t('orders_will_appear_here') || 'Os pedidos aparecerão aqui'}</p>
            </div>
        );
    }

    return (
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {orders.map((order, index) => (
                <div
                    key={order._id}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden transition-all hover:shadow-md"
                >
                    {/* Order Header */}
                    <div
                        className="p-4 cursor-pointer"
                        onClick={() => toggleOrderExpand(order._id)}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="font-bold text-gray-900 dark:text-white">
                                        #{order.orderNumber || order._id.slice(-6).toUpperCase()}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(order.status)}`}>
                                        {t(order.status) || order.status}
                                    </span>
                                </div>

                                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                                    <div className="flex items-center gap-1">
                                        <Clock size={12} />
                                        <span>{format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm')}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Package size={12} />
                                        <span>{order.items?.length || 0} {t('items') || 'itens'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <div className="font-bold text-lg text-gray-900 dark:text-white">
                                        {order.total?.toLocaleString() || 0} MT
                                    </div>
                                </div>
                                {expandedOrder === order._id ? (
                                    <ChevronUp size={20} className="text-gray-400" />
                                ) : (
                                    <ChevronDown size={20} className="text-gray-400" />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedOrder === order._id && (
                        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-4">
                            <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-3">
                                {t('order_items') || 'Itens do Pedido'}
                            </h4>
                            <div className="space-y-2">
                                {order.items?.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="flex justify-between items-center text-sm"
                                    >
                                        <div className="flex items-center gap-2 flex-1">
                                            <span className="font-semibold text-primary-600 dark:text-primary-400">
                                                {item.qty}x
                                            </span>
                                            <span className="text-gray-700 dark:text-gray-300">
                                                {item.item?.name || 'Item'}
                                            </span>
                                        </div>
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {((item.item?.price || 0) * item.qty).toLocaleString()} MT
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Order Summary */}
                            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-1">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">{t('subtotal') || 'Subtotal'}</span>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                        {order.subtotal?.toLocaleString() || 0} MT
                                    </span>
                                </div>
                                {order.tax > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600 dark:text-gray-400">{t('tax') || 'Taxa'}</span>
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {order.tax?.toLocaleString() || 0} MT
                                        </span>
                                    </div>
                                )}
                                {order.discount > 0 && (
                                    <div className="flex justify-between text-sm text-green-600">
                                        <span>{t('discount') || 'Desconto'}</span>
                                        <span className="font-medium">-{order.discount?.toLocaleString() || 0} MT</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-200 dark:border-gray-700">
                                    <span className="text-gray-900 dark:text-white">{t('total') || 'Total'}</span>
                                    <span className="text-gray-900 dark:text-white">
                                        {order.total?.toLocaleString() || 0} MT
                                    </span>
                                </div>
                            </div>

                            {/* Customer Info */}
                            {order.customerName && (
                                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                    <div className="text-xs text-gray-600 dark:text-gray-400">
                                        <span className="font-semibold">{t('customer') || 'Cliente'}:</span> {order.customerName}
                                        {order.phone && <span> • {order.phone}</span>}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default TableOrderHistory;
