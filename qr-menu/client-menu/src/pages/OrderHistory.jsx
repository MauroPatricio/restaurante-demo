import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Clock, DollarSign, ShoppingBag, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../config/api';
import { formatDateTime } from '../utils/dateUtils';

const OrderHistory = () => {
    const { restaurantId } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Get phone from localStorage
    const customerPhone = localStorage.getItem(`customer-phone-${restaurantId}`);

    useEffect(() => {
        const fetchHistory = async () => {
            if (!customerPhone) {
                setLoading(false);
                return;
            }

            try {
                const res = await axios.get(`${API_URL}/public/orders/history`, {
                    params: {
                        restaurant: restaurantId,
                        phone: customerPhone
                    }
                });
                setOrders(res.data.orders);
            } catch (err) {
                console.error(err);
                setError('Failed to load history');
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [restaurantId, customerPhone]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'preparing': return 'bg-blue-100 text-blue-800';
            case 'ready': return 'bg-green-100 text-green-800';
            case 'completed': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) return <div className="p-4 text-center">{t('loading')}</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white p-4 sticky top-0 z-10 shadow-sm flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft size={24} className="text-gray-600" />
                </button>
                <h1 className="text-lg font-bold text-gray-900">{t('order_history') || 'Order History'}</h1>
            </div>

            <div className="p-4 space-y-4">
                {!customerPhone ? (
                    <div className="text-center py-10 text-gray-500">
                        <ShoppingBag size={48} className="mx-auto mb-4 opacity-30" />
                        <p>No phone number found.</p>
                        <p className="text-sm">Place an order first to see your history.</p>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">
                        <p>No past orders found.</p>
                    </div>
                ) : (
                    orders.map(order => (
                        <div
                            key={order._id}
                            onClick={() => navigate(`/menu/${restaurantId}/status/${order._id}`)}
                            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 active:scale-98 transition-transform cursor-pointer"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                                            #{order._id.slice(-6).toUpperCase()}
                                        </span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${getStatusColor(order.status)}`}>
                                            {t(`order_status_${order.status}`) || order.status}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-gray-400 flex items-center gap-1 font-medium">
                                        <Clock size={10} />
                                        {formatDateTime(order.createdAt)}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="font-black text-gray-900">{order.total} {t('currency') || 'MT'}</span>
                                </div>
                            </div>

                            <div className="text-xs text-gray-500 line-clamp-1 bg-gray-50/50 p-2 rounded-lg border border-gray-50 italic">
                                {order.items.map(i => `${i.qty}x ${i.item?.name || 'Item'}`).join(', ')}
                            </div>

                            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center text-primary-600 text-xs font-bold uppercase tracking-wider">
                                <span>Acompanhar Pedido</span>
                                <ChevronRight size={14} />
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default OrderHistory;
