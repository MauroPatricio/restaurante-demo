import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../context/NotificationContext';
import { useCart } from '../context/CartContext';
import { ShoppingBag, ChevronDown, Plus, Minus, Search, AlertCircle, Star, ChefHat, User, MessageCircle, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '../config/api';
import ThemeToggle from '../components/ThemeToggle';
import WaiterCallButton from '../components/WaiterCallButton';
import ReactionButtons from '../components/ReactionButtons';
import { createWaiterCall, createClientReaction } from '../services/waiterCallAPI';
import { formatDate, formatTime } from '../utils/dateUtils';

const Menu = () => {
    const { restaurantId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { t } = useTranslation();

    // Logic: Get table from URL OR LocalStorage
    // Support both 't' (short) and 'table' (long)
    const tableNumber = searchParams.get('t') || searchParams.get('table') || localStorage.getItem(`table-ref-${restaurantId}`);
    const token = searchParams.get('token');

    useEffect(() => {
        const tParam = searchParams.get('t') || searchParams.get('table');
        const tokenParam = searchParams.get('token');
        if (tParam) {
            localStorage.setItem(`table-ref-${restaurantId}`, tParam);
        }
        if (tokenParam) {
            localStorage.setItem(`token-ref-${restaurantId}`, tokenParam);
        }
    }, [searchParams, restaurantId]);

    const scrollRef = useRef(null);

    const { cart, addToCart, updateQty, cartCount, checkRestaurant } = useCart();

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

    // Valid Session State
    const [sessionValid, setSessionValid] = useState(false);
    const [validating, setValidating] = useState(true);
    const [validationError, setValidationError] = useState(null);

    // Initial Token Validation for Deep Links
    useEffect(() => {
        const validateSession = async () => {
            if (!restaurantId || !tableNumber || !token) {
                setValidating(false);
                return;
            }

            // If satisfied from previous QRRedirect logic
            const sessionData = JSON.parse(sessionStorage.getItem('qr_validation') || '{}');
            if (sessionData.token === token && String(sessionData.table) === String(tableNumber)) {
                setSessionValid(true);
                setValidating(false);
                return;
            }

            try {
                const response = await axios.get(
                    `${API_URL}/public/menu/validate?r=${restaurantId}&t=${tableNumber}&token=${token}`
                );

                if (response.data.valid) {
                    setSessionValid(true);
                    sessionStorage.setItem('qr_validation', JSON.stringify({
                        restaurant: response.data.restaurant,
                        table: response.data.table._id || response.data.table,
                        token,
                        timestamp: Date.now()
                    }));

                    // Persist for reloads
                    localStorage.setItem(`table-ref-${restaurantId}`, String(tableNumber));
                    localStorage.setItem(`token-ref-${restaurantId}`, token);
                } else {
                    // This part is actually almost unreachable due to backend throwing 403
                    setValidationError(t('invalid_qr'));
                }
            } catch (err) {
                console.error('Validation error:', err);
                const errorData = err.response?.data;
                const msg = errorData?.message || errorData?.error || err.message;

                // If it's specifically an invalid token, use translation but keep the technical reason visible
                if (err.response?.status === 403 && (errorData?.error?.includes('token') || errorData?.error?.includes('QR'))) {
                    setValidationError(`${t('invalid_qr')} (${msg})`);
                } else {
                    setValidationError(msg);
                }
            } finally {
                setValidating(false);
            }
        };

        validateSession();
    }, [restaurantId, tableNumber, token]);


    // Real-time Context
    const { joinRestaurantRoom, joinTableRoom, lastMenuUpdate, lastTableUpdate, isOnline } = useNotification();

    // Join Rooms
    useEffect(() => {
        if (restaurantId) joinRestaurantRoom(restaurantId);
        if (tableNumber) joinTableRoom(tableNumber);
    }, [restaurantId, tableNumber, joinRestaurantRoom, joinTableRoom]);

    // Fetch Menu (Re-fetches on lastMenuUpdate)
    useEffect(() => {
        const fetchMenu = async () => {
            if (!sessionValid) return; // Wait for valid session

            try {
                setLoading(true);
                const t = Date.now(); // Cache buster
                const [restRes, menuRes, catRes] = await Promise.all([
                    axios.get(`${API_URL}/restaurants/${restaurantId}`),
                    axios.get(`${API_URL}/menu/${restaurantId}?available=true&_t=${t}`),
                    axios.get(`${API_URL}/menu/${restaurantId}/categories`)
                ]);

                setRestaurant(restRes.data.restaurant);
                setMenuItems(menuRes.data.items);
                setCategories(['All', ...(catRes.data.categories || [])]);
                checkRestaurant(restaurantId);
            } catch (err) {
                console.error(err);
                setError('Failed to load menu. Please scan QR Code again.');
            } finally {
                setLoading(false);
            }
        };

        if (restaurantId && sessionValid) fetchMenu();
    }, [restaurantId, lastMenuUpdate, sessionValid]);

    // Separate Table Fetch (Re-fetches on lastTableUpdate)
    useEffect(() => {
        const fetchTableInfo = async () => {
            if (tableNumber) {
                try {
                    const tableRes = await axios.get(`${API_URL}/tables/${tableNumber}?_t=${Date.now()}`);
                    setTableInfo(tableRes.data.table);
                } catch (e) {
                    console.warn("Table not found or err", e);
                }
            }
        };
        fetchTableInfo();
    }, [tableNumber, lastTableUpdate]);

    const filteredItems = menuItems.filter(item => {
        // Get the category ID from the item (handle both string and object)
        const itemCategoryId = typeof item.category === 'object' ? item.category._id : item.category;
        // Get the active category ID (handle both string 'All' and object)
        const activeCatId = typeof activeCategory === 'object' ? activeCategory._id : activeCategory;

        const matchesCategory = activeCatId === 'All' || itemCategoryId === activeCatId;
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
            if (type === 'call') {
                const customerName = localStorage.getItem(`customer-name-${restaurantId}`) || '';
                await createWaiterCall(tableInfo._id, 'call', customerName);
                setAlertMessage('Garçom a caminho');
            } else if (type === 'emotion') {
                const reactionType = value === 'happy' ? 'satisfied' : 'dissatisfied';
                await createClientReaction(tableInfo._id, reactionType, msg);
                setAlertMessage(t('feedback_sent') || 'Obrigado pelo feedback!');
            }

            setShowReactions(false);
            setTimeout(() => setAlertMessage(null), 3000);
        } catch (e) {
            console.error('Action failed:', e);
            const errorMsg = e.response?.data?.error || e.message;

            if (e.response?.status === 409) {
                setAlertMessage(t('already_called') || 'Aguarde um momento...');
            } else {
                setAlertMessage(`Failed: ${errorMsg}`);
            }
            setTimeout(() => setAlertMessage(null), 5000);
        }
    };

    if (validating) return (
        <div className="flex h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mb-4"
            />
            <p className="text-gray-500 dark:text-gray-400 font-medium">Validando sua mesa...</p>
        </div>
    );

    if (validationError) return (
        <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl text-center max-w-sm w-full border border-gray-100 dark:border-gray-700">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                    <AlertTriangle size={32} />
                </div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">{t('access_denied') || 'Acesso Negado'}</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">{validationError}</p>

                {/* Debug Info */}
                <div className="mb-6 p-3 bg-gray-100 dark:bg-gray-900/50 rounded text-[10px] text-left overflow-auto max-h-32 text-gray-500 font-mono border border-gray-200 dark:border-gray-700">
                    <p><strong>Diagnostic Info:</strong></p>
                    <p>Restaurant: {restaurantId}</p>
                    <p>Table Found: {tableNumber ? 'YES' : 'NO'}</p>
                    <p>Table ID: {tableNumber}</p>
                    <p>Token Found: {token ? 'YES' : 'NO'}</p>
                    <p>API URL: {API_URL}</p>
                    <p>Host: {window.location.host}</p>
                </div>

                <button
                    onClick={() => navigate('/')}
                    className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-primary-500/30"
                >
                    {t('scan_again') || 'Escanear Novamente'}
                </button>
            </div>
        </div>
    );

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"
            />
        </div>
    );

    if (error) return (
        <div className="flex h-screen items-center justify-center text-red-500 gap-2 bg-gray-50 dark:bg-gray-900 flex-col p-4 text-center">
            <AlertCircle size={48} className="mb-2 opacity-50" />
            <p>{t('failed_to_load')}</p>
        </div>
    );

    return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen pb-32 max-w-md mx-auto shadow-2xl overflow-hidden relative font-sans transition-colors duration-200">

            {/* Enhanced Hero Section with Table Info */}
            <div className="relative h-56 bg-gray-900">
                <img
                    src={restaurant?.logo || "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80"}
                    alt="Restaurant"
                    className="w-full h-full object-cover opacity-60"
                    loading="eager"
                    decoding="async"
                />
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent pt-16">
                    <motion.h1
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-2xl font-bold text-white leading-tight mb-2 flex items-center gap-3"
                    >
                        {restaurant?.name}
                        {restaurant && (
                            <span
                                className={`w-2 h-2 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)] ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}
                                title={isOnline ? 'Conectado' : 'Desconectado'}
                            />
                        )}
                    </motion.h1>

                    {/* Table and Waiter Info */}
                    {tableInfo && (
                        <div className="flex items-center gap-3 mb-3">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/20 backdrop-blur-sm border border-white/20">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                <span className="text-white font-bold text-sm">{t('table')} {tableInfo.number}</span>
                                <span className="text-white/60 text-xs ml-1 border-l border-white/20 pl-2">Estado: {t(tableInfo.status) || tableInfo.status}</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10 min-w-[140px]">
                                {tableInfo.waiterPhoto ? (
                                    <img src={tableInfo.waiterPhoto} alt="Waiter" className="w-8 h-8 rounded-full object-cover border-2 border-white/20" loading="lazy" decoding="async" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                                        <User size={16} className="text-white/80" />
                                    </div>
                                )}
                                <div className="flex flex-col leading-tight">
                                    <span className="text-white/60 text-[10px] uppercase font-bold flex items-center gap-1.5">
                                        {t('waiter')}
                                        {tableInfo.assignedWaiter && (
                                            <span className={`w-1.5 h-1.5 rounded-full ${tableInfo.waiterStatus === 'online' ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]' : 'bg-gray-400'}`}></span>
                                        )}
                                    </span>
                                    <span className="text-white font-bold text-xs truncate max-w-[100px]">
                                        {tableInfo.assignedWaiter || "Não atribuído"}
                                    </span>
                                </div>
                            </div>

                            {/* Inline Call Waiter Button */}
                            <WaiterCallButton
                                tableId={tableInfo._id}
                                variant="inline"
                                className="!py-1.5 !px-3 !text-xs !bg-white/10 !backdrop-blur-sm !border !border-white/10 hover:!bg-white/20 !shadow-none"
                            />
                        </div>
                    )}

                    {/* Quick Action Buttons - REMOVED per requirements */}
                    {/* Floating Orders Button */}
                    <button
                        onClick={() => navigate(`/menu/${restaurantId}/history`)}
                        className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-full shadow-lg hover:shadow-xl transition-all active:scale-95 border border-white/20"
                        title={t('my_orders')}
                    >
                        <ShoppingBag size={20} className="text-gray-700" />
                    </button>
                </div>
            </div>



            {/* Sticky Header with Search & Filters */}
            <div className="sticky top-0 z-20 glass dark:bg-gray-900/90 dark:border-gray-800 shadow-sm pb-2 transition-colors duration-200">
                <div className="p-3 flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 text-gray-400 h-4 w-4" />
                        <input
                            type="text"
                            placeholder={t('search_placeholder')}
                            className="w-full bg-gray-100/50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all placeholder:text-gray-400 dark:text-white"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <ThemeToggle />
                </div>

                <div className="flex gap-2 overflow-x-auto px-3 pb-2 scrollbar-none hide-scrollbar">
                    {categories.map(cat => {
                        const catId = cat._id || cat;
                        const catName = cat.name || (cat === 'All' ? t('filter_all') : cat);

                        return (
                            <button
                                key={catId}
                                onClick={() => setActiveCategory(catId)}
                                className={clsx(
                                    "px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-300",
                                    activeCategory === catId
                                        ? "bg-primary-600 text-white shadow-lg shadow-primary-500/30 scale-105"
                                        : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                                )}
                            >
                                {catName}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Reaction Buttons - REMOVED contextually, now in Cart/Payment */}

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
                            className="bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-sm border border-gray-100/50 dark:border-gray-700 flex gap-3 active:scale-[0.98] transition-all"
                        >
                            <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0 relative">
                                {(item.imageUrl || item.image || item.photo) ? (
                                    <img
                                        src={item.imageUrl || item.image || item.photo}
                                        alt={item.name}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                        decoding="async"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50 dark:bg-gray-800">
                                        <ChefHat size={32} strokeWidth={1.5} />
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
                                        <h3 className="font-bold text-gray-800 dark:text-white text-base leading-tight">{item.name}</h3>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">{item.description}</p>
                                </div>

                                <div className="flex items-center justify-between mt-2">
                                    <div className="flex items-baseline gap-1">
                                        <span className="font-bold text-gray-900 dark:text-gray-100 text-lg">{item.price}</span>
                                        <span className="text-xs text-gray-400 font-medium">MT</span>
                                    </div>

                                    {(() => {
                                        // Find if this specific item (without customizations for now) is in cart
                                        const cartItemIndex = cart.findIndex(i => i._id === item._id && (!i.customizations || i.customizations.length === 0));
                                        const cartItem = cartItemIndex > -1 ? cart[cartItemIndex] : null;

                                        if (cartItem) {
                                            return (
                                                <div className="flex items-center gap-3 bg-primary-50 dark:bg-primary-900/20 rounded-full p-1 border border-primary-100 dark:border-primary-800">
                                                    <motion.button
                                                        whileTap={{ scale: 0.8 }}
                                                        onClick={() => updateQty(cartItemIndex, -1)}
                                                        className="h-8 w-8 bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center shadow-sm"
                                                    >
                                                        <Minus size={14} strokeWidth={3} />
                                                    </motion.button>
                                                    <span className="font-black text-primary-700 dark:text-primary-300 min-w-[20px] text-center">{cartItem.qty}</span>
                                                    <motion.button
                                                        whileTap={{ scale: 0.8 }}
                                                        onClick={() => updateQty(cartItemIndex, 1)}
                                                        className="h-8 w-8 bg-primary-600 text-white rounded-full flex items-center justify-center shadow-md shadow-primary-500/20"
                                                    >
                                                        <Plus size={14} strokeWidth={3} />
                                                    </motion.button>
                                                </div>
                                            );
                                        }

                                        return (
                                            <motion.button
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => addToCart(item)}
                                                className="h-9 w-9 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center hover:bg-primary-600 hover:text-white dark:hover:bg-primary-500 dark:hover:text-white transition-colors shadow-sm"
                                            >
                                                <Plus size={18} strokeWidth={2.5} />
                                            </motion.button>
                                        );
                                    })()}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {filteredItems.length === 0 && (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Search className="text-gray-300" size={24} />
                        </div>
                        <p className="text-gray-500 font-medium dark:text-gray-400">{t('no_items_found')}</p>
                        <p className="text-xs text-gray-400 mt-1">{t('try_changing_search')}</p>
                    </div>
                )}
            </div>

            {/* Floating Cart Button */}
            < AnimatePresence >
                {cartCount > 0 && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-6 left-4 right-4 z-30 max-w-md mx-auto"
                    >
                        <button
                            onClick={() => navigate(`/menu/${restaurantId}/cart${window.location.search}`)}
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


            {/* Waiter Call Floating Button - REMOVED: Now in header */}

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
                            className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl w-full max-w-xl max-h-[85vh] overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="sticky top-0 bg-gradient-to-r from-primary-600 to-primary-700 text-white p-5 shadow-lg z-10">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                                            <ShoppingBag size={22} className="text-white" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold leading-tight">{t('my_orders')}</h2>
                                            <p className="text-xs text-primary-100 font-medium">Histórico de pedidos</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowOrdersModal(false)}
                                        className="p-2 hover:bg-white/20 rounded-full transition-colors active:scale-95"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Content */}
                            <div className="overflow-y-auto max-h-[calc(85vh-88px)] p-5 bg-gray-50 dark:bg-gray-900">
                                {loadingOrders ? (
                                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                            className="rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-500"
                                        />
                                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Carregando pedidos...</p>
                                    </div>
                                ) : customerOrders.length === 0 ? (
                                    <div className="text-center py-12 px-4">
                                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-200 dark:border-gray-700">
                                            <ShoppingBag size={32} className="text-gray-300 dark:text-gray-600" />
                                        </div>
                                        <p className="text-gray-800 dark:text-white font-bold text-lg mb-1">{t('no_orders_yet')}</p>
                                        <p className="text-sm text-gray-400 dark:text-gray-500 max-w-[200px] mx-auto leading-relaxed">{t('make_first_order')}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4 pb-4">
                                        {customerOrders.map((order) => (
                                            <motion.div
                                                key={order._id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover:border-primary-200 dark:hover:border-primary-700 transition-colors"
                                            >
                                                {/* Order Header */}
                                                <div className="flex items-start justify-between mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">#{order._id.slice(-6).toUpperCase()}</span>
                                                            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                                                {formatTime(order.createdAt)}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-400">
                                                            {formatDate(order.createdAt, { day: 'numeric', month: 'short' })}
                                                        </p>
                                                    </div>
                                                    <span className={clsx(
                                                        'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border',
                                                        order.status === 'pending' && 'bg-yellow-50 text-yellow-700 border-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-900/30',
                                                        order.status === 'preparing' && 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30',
                                                        order.status === 'ready' && 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30',
                                                        order.status === 'delivered' && 'bg-gray-50 text-gray-600 border-gray-100 dark:bg-gray-700/30 dark:text-gray-400 dark:border-gray-700'
                                                    )}>
                                                        {t(`order_status_${order.status}`)}
                                                    </span>
                                                </div>

                                                {/* Order Items */}
                                                <div className="space-y-3 mb-4">
                                                    {order.items?.map((item, idx) => (
                                                        <div key={idx} className="flex items-start gap-3 text-sm">
                                                            <span className="w-5 h-5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                                                                {item.qty}x
                                                            </span>
                                                            <div className="flex-1">
                                                                <span className="text-gray-700 dark:text-gray-200 font-medium leading-tight block">{item.item?.name || 'Item'}</span>
                                                                {item.customizations?.length > 0 && (
                                                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                                                        {item.customizations.map(c => c.name).join(', ')}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <span className="text-gray-900 dark:text-white font-bold text-xs tabular-nums">
                                                                {item.itemPrice?.toFixed(2)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Order Total & Tracking Link */}
                                                <div className="flex items-center justify-between pt-3 border-t border-dashed border-gray-200 dark:border-gray-700">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/menu/${restaurantId}/status/${order._id}`);
                                                        }}
                                                        className="text-[10px] font-bold text-primary-600 uppercase tracking-widest hover:underline"
                                                    >
                                                        Acompanhar Pedido
                                                    </button>
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-lg font-black text-gray-900 dark:text-white">
                                                            {order.total?.toFixed(2)}
                                                        </span>
                                                        <span className="text-xs font-bold text-gray-400">MT</span>
                                                    </div>
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
            {/* Floating Call Waiter Button - Contextually accessible */}
            {tableInfo && (
                <div className="fixed bottom-24 right-4 z-40">
                    <WaiterCallButton tableId={tableInfo._id} />
                </div>
            )}

            {/* Institutional Footer Only */}
            <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md p-4 z-10 border-t border-gray-200 dark:border-gray-800 transition-colors duration-200">
                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium text-center mb-1">
                    Última atualização do menu: {formatTime(lastMenuUpdate)}
                </p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 font-semibold text-center uppercase tracking-widest">
                    Desenvolvido por Nhiquela Serviços e Consultoria, LDA
                </p>
            </div>
        </div>
    );
};

export default Menu;
