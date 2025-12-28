
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCart } from '../context/CartContext';
import { ShoppingBag, ChevronDown, Plus, Minus, Search, AlertCircle, Star, ChefHat, User, MessageCircle, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '../config/api';

const Menu = () => {
    const { restaurantId } = useParams();
    const [searchParams] = useSearchParams();
    const { t } = useTranslation();

    // Logic: Get table from URL OR LocalStorage
    // This allows refresh to keep the session alive
    const tableNumber = searchParams.get('table') || localStorage.getItem(`table-ref-${restaurantId}`);

    useEffect(() => {
        if (searchParams.get('table')) {
            localStorage.setItem(`table-ref-${restaurantId}`, searchParams.get('table'));
        }
    }, [searchParams, restaurantId]);

    const scrollRef = useRef(null);

    const { addToCart, cartCount, checkRestaurant } = useCart();

    const [restaurant, setRestaurant] = useState(null);
    const [categories, setCategories] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeCategory, setActiveCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [tableInfo, setTableInfo] = useState(null);
    const [showReactions, setShowReactions] = useState(false);
    const [alertMessage, setAlertMessage] = useState(null);
    const [showOrdersModal, setShowOrdersModal] = useState(false);
    const [customerOrders, setCustomerOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(false);

    useEffect(() => {
        const fetchMenu = async () => {
            try {
                setLoading(true);
                const [restRes, menuRes, catRes] = await Promise.all([
                    axios.get(`${API_URL}/restaurants/${restaurantId}`),
                    axios.get(`${API_URL}/menu/${restaurantId}?available=true`),
                    axios.get(`${API_URL}/menu/${restaurantId}/categories`)
                ]);

                setRestaurant(restRes.data.restaurant);
                setMenuItems(menuRes.data.items);
                setCategories(catRes.data.categories); // Assuming this was intended to be here
                checkRestaurant(restaurantId);

                if (tableNumber) {
                    try {
                        // tableNumber from URL is actually the table ID
                        const tableRes = await axios.get(`${API_URL}/tables/${tableNumber}`);
                        setTableInfo(tableRes.data.table);
                    } catch (e) {
                        console.warn("Table not found or err", e);
                    }
                }
            } catch (err) {
                console.error(err);
                setError('Failed to load menu. Please scan QR Code again.');
            } finally {
                setLoading(false);
            }
        };

        if (restaurantId) fetchMenu();
    }, [restaurantId]);

    const filteredItems = menuItems.filter(item => {
        const matchesCategory = activeCategory === 'All' || item.category === activeCategory || item.category?._id === activeCategory;
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.description?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    // Fetch customer orders based on stored phone
    const fetchCustomerOrders = async () => {
        const savedPhone = localStorage.getItem(`customer-phone-${restaurantId}`);
        if (!savedPhone) {
            setCustomerOrders([]);
            return;
        }

        setLoadingOrders(true);
        try {
            const response = await axios.get(`${API_URL}/orders/restaurant/${restaurantId}`, {
                params: { phone: savedPhone }
            });
            // Filter orders by phone on client side if API doesn't support it
            const filteredOrders = (response.data.orders || []).filter(order => order.phone === savedPhone);
            setCustomerOrders(filteredOrders);
        } catch (error) {
            console.error('Failed to fetch customer orders:', error);
            setCustomerOrders([]);
        } finally {
            setLoadingOrders(false);
        }
    };

    // Open orders modal
    const openOrdersModal = () => {
        setShowOrdersModal(true);
        fetchCustomerOrders();
    };

    const handleReaction = async (type, value, msg) => {
        if (!tableInfo) return;
        try {
            await axios.post(`${API_URL}/tables/${tableInfo._id}/alert`, {
                type,
                value,
                message: msg
            });
            setShowReactions(false);
            setAlertMessage('Request Sent! The waiter will be with you shortly.');
            setTimeout(() => setAlertMessage(null), 3000);
        } catch (e) {
            console.error(e);
            setAlertMessage('Failed to send request.');
        }
    };



    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-gray-50">
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"
            />
        </div>
    );

    if (error) return (
        <div className="flex h-screen items-center justify-center text-red-500 gap-2 bg-gray-50 flex-col p-4 text-center">
            <AlertCircle size={48} className="mb-2 opacity-50" />
            <p>{t('failed_to_load')}</p>
        </div>
    );

    return (
        <div className="bg-gray-50 min-h-screen pb-32 max-w-md mx-auto shadow-2xl overflow-hidden relative font-sans">

            {/* Enhanced Hero Section with Table Info */}
            <div className="relative h-56 bg-gray-900">
                <img
                    src={restaurant?.logo || "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80"}
                    alt="Restaurant"
                    className="w-full h-full object-cover opacity-60"
                />
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent pt-16">
                    <motion.h1
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-2xl font-bold text-white leading-tight mb-2"
                    >
                        {restaurant?.name}
                    </motion.h1>

                    {/* Table and Waiter Info */}
                    {tableInfo && (
                        <div className="flex items-center gap-3 mb-3">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/20 backdrop-blur-sm border border-white/20">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                <span className="text-white font-bold text-sm">Mesa {tableInfo.number}</span>
                            </div>
                            {tableInfo.assignedWaiter && (
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10">
                                    <User size={14} className="text-white/80" />
                                    <span className="text-white/70 text-xs font-medium">{t('waiter')}:</span>
                                    <span className="text-white/90 text-xs font-bold">{tableInfo.assignedWaiter}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Quick Action Buttons */}
                    {tableInfo && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleReaction('call', 'general', 'Customer called waiter')}
                                className="flex-1 flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg transition-all active:scale-95"
                            >
                                <ChefHat size={16} />
                                {t('call_waiter')}
                            </button>
                            <button
                                onClick={() => handleReaction('emotion', 'happy', 'Customer is satisfied')}
                                className="flex items-center justify-center bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg font-bold text-xl shadow-lg transition-all active:scale-95"
                                title={t('satisfied')}
                            >
                                😊
                            </button>
                            <button
                                onClick={() => handleReaction('emotion', 'angry', 'Customer is dissatisfied')}
                                className="flex items-center justify-center bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg font-bold text-xl shadow-lg transition-all active:scale-95"
                                title={t('dissatisfied')}
                            >
                                😞
                            </button>
                        </div>
                    )}

                    {/* Floating Orders Button */}
                    <button
                        onClick={openOrdersModal}
                        className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-full shadow-lg hover:shadow-xl transition-all active:scale-95 border border-white/20"
                        title={t('my_orders')}
                    >
                        <ShoppingBag size={20} className="text-gray-700" />
                        {customerOrders.length > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                                {customerOrders.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Sticky Header with Search & Filters */}
            <div className="sticky top-0 z-20 glass shadow-sm pb-2">
                <div className="p-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-gray-400 h-4 w-4" />
                        <input
                            type="text"
                            placeholder={t('search_placeholder')}
                            className="w-full bg-gray-100/50 border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all placeholder:text-gray-400"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex gap-2 overflow-x-auto px-3 pb-2 scrollbar-none hide-scrollbar">
                    {categories.map(cat => (
                        <button
                            key={cat._id || cat}
                            onClick={() => setActiveCategory(cat._id || cat)}
                            className={clsx(
                                "px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-300",
                                activeCategory === (cat._id || cat)
                                    ? "bg-primary-600 text-white shadow-lg shadow-primary-500/30 scale-105"
                                    : "bg-white text-gray-800 border border-gray-100 hover:bg-gray-50"
                            )}
                        >
                            {cat.name || (cat === 'All' ? t('filter_all') : cat)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Menu List */}
            <div className="p-3 space-y-4">
                <AnimatePresence mode='popLayout'>
                    {filteredItems.map((item, index) => (
                        <motion.div
                            key={item._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100/50 flex gap-3 active:scale-[0.98] transition-transform"
                        >
                            <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 relative">
                                {item.image ? (
                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50">
                                        <ShoppingBag size={20} />
                                    </div>
                                )}
                                {item.popular && (
                                    <div className="absolute top-1 left-1 bg-yellow-400 text-[10px] font-bold px-1.5 py-0.5 rounded-md text-yellow-900 flex items-center gap-0.5 shadow-sm">
                                        <Star size={8} fill="currentColor" /> POPULAR
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 flex flex-col justify-between py-0.5">
                                <div>
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-gray-800 text-base leading-tight">{item.name}</h3>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{item.description}</p>
                                </div>

                                <div className="flex items-center justify-between mt-2">
                                    <div className="flex items-baseline gap-1">
                                        <span className="font-bold text-gray-900 text-lg">{item.price}</span>
                                        <span className="text-xs text-gray-400 font-medium">MT</span>
                                    </div>

                                    <motion.button
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => addToCart(item)}
                                        className="h-9 w-9 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center hover:bg-primary-600 hover:text-white transition-colors shadow-sm"
                                    >
                                        <Plus size={18} strokeWidth={2.5} />
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {filteredItems.length === 0 && (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Search className="text-gray-300" size={24} />
                        </div>
                        <p className="text-gray-500 font-medium">{t('no_items_found')}</p>
                        <p className="text-xs text-gray-400 mt-1">{t('try_changing_search')}</p>
                    </div>
                )}
            </div>

            {/* Floating Cart Button */}
            <AnimatePresence>
                {cartCount > 0 && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-6 left-4 right-4 z-30 max-w-md mx-auto"
                    >
                        <button
                            onClick={() => window.location.href = `/menu/${restaurantId}/cart`}
                            className="w-full bg-gray-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between hover:scale-[1.02] active:scale-[0.98] transition-all border border-white/10"
                        >
                            <div className="flex items-center gap-3">
                                <div className="bg-primary-500 text-white px-3 py-1 rounded-lg text-sm font-bold shadow-lg shadow-primary-500/20">{cartCount}</div>
                                <span className="text-sm font-medium text-gray-200">{t('total')}</span>
                            </div>
                            <span className="font-bold text-lg flex items-center gap-1">
                                {t('checkout')} <ChevronDown className="rotate-[-90deg]" size={18} />
                            </span>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Alert Notification Toast */}
            <AnimatePresence>
                {alertMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className="fixed top-24 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-xl z-50 text-sm font-bold flex items-center gap-2"
                    >
                        <MessageCircle size={16} /> {alertMessage}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Orders History Modal */}
            <AnimatePresence>
                {showOrdersModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
                        onClick={() => setShowOrdersModal(false)}
                    >
                        <motion.div
                            initial={{ y: '100%', opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: '100%', opacity: 0 }}
                            transition={{ type: 'spring', damping: 25 }}
                            className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="sticky top-0 bg-gradient-to-r from-primary-500 to-primary-600 text-white p-6 shadow-lg">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <ShoppingBag size={24} />
                                        <h2 className="text-xl font-bold">{t('my_orders')}</h2>
                                    </div>
                                    <button
                                        onClick={() => setShowOrdersModal(false)}
                                        className="p-2 hover:bg-white/20 rounded-full transition-colors"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>

                            {/* Modal Content */}
                            <div className="overflow-y-auto max-h-[calc(80vh-88px)] p-6">
                                {loadingOrders ? (
                                    <div className="flex items-center justify-center py-12">
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                            className="rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"
                                        />
                                    </div>
                                ) : customerOrders.length === 0 ? (
                                    <div className="text-center py-12">
                                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <ShoppingBag size={32} className="text-gray-300" />
                                        </div>
                                        <p className="text-gray-600 font-semibold mb-1">{t('no_orders_yet')}</p>
                                        <p className="text-sm text-gray-400">{t('make_first_order')}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {customerOrders.map((order) => (
                                            <motion.div
                                                key={order._id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200 hover:border-primary-300 transition-colors"
                                            >
                                                {/* Order Header */}
                                                <div className="flex items-start justify-between mb-3">
                                                    <div>
                                                        <p className="text-xs text-gray-500 mb-1">
                                                            {t('order_id')} #{order._id.slice(-6).toUpperCase()}
                                                        </p>
                                                        <p className="text-sm font-semibold text-gray-700">
                                                            {new Date(order.createdAt).toLocaleString('pt-PT', {
                                                                day: '2-digit',
                                                                month: 'short',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </p>
                                                    </div>
                                                    <span className={clsx(
                                                        'px-3 py-1 rounded-full text-xs font-bold',
                                                        order.status === 'pending' && 'bg-yellow-100 text-yellow-700',
                                                        order.status === 'preparing' && 'bg-blue-100 text-blue-700',
                                                        order.status === 'ready' && 'bg-green-100 text-green-700',
                                                        order.status === 'delivered' && 'bg-gray-100 text-gray-700'
                                                    )}>
                                                        {t(`order_status_${order.status}`)}
                                                    </span>
                                                </div>

                                                {/* Order Items */}
                                                <div className="space-y-2 mb-3">
                                                    {order.items?.slice(0, 3).map((item, idx) => (
                                                        <div key={idx} className="flex items-center gap-2 text-sm">
                                                            <span className="w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold">
                                                                {item.qty}
                                                            </span>
                                                            <span className="text-gray-700">{item.item?.name || 'Item'}</span>
                                                        </div>
                                                    ))}
                                                    {order.items?.length > 3 && (
                                                        <p className="text-xs text-gray-500 pl-8">
                                                            +{order.items.length - 3} {t('items')}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Order Total */}
                                                <div className="flex items-center justify-between pt-3 border-t border-gray-300">
                                                    <span className="text-sm font-semibold text-gray-600">{t('total')}</span>
                                                    <span className="text-lg font-bold text-primary-600">
                                                        {order.total?.toFixed(2)} {t('currency')}
                                                    </span>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Menu;
