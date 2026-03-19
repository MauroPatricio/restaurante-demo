import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../context/CurrencyContext';
import { useNotification } from '../context/NotificationContext';
import { ShoppingBag, ChevronDown, Plus, Minus, Search, AlertCircle, Star, ChefHat, User, MessageCircle, AlertTriangle, X, ArrowLeft, History, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { API_URL } from '../config/api';
import ThemeToggle from '../components/ThemeToggle';
import LanguageSwitcher from '../components/LanguageSwitcher';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatTime, formatDate } from '../utils/dateUtils';

/* ─── Helpers ─────────────────────────────────────────── */
const HISTORY_KEY = (restaurantId, roomId) => `rs_orders_${restaurantId}_${roomId}`;

function saveOrderToHistory(restaurantId, roomId, order) {
    try {
        const key = HISTORY_KEY(restaurantId, roomId);
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        if (!existing.find(o => o.id === order.id)) {
            existing.unshift(order);
            localStorage.setItem(key, JSON.stringify(existing.slice(0, 20)));
        }
    } catch { }
}

function loadHistory(restaurantId, roomId) {
    try {
        return JSON.parse(localStorage.getItem(HISTORY_KEY(restaurantId, roomId)) || '[]');
    } catch { return []; }
}

const STATUS_CONFIG = {
    pending: { key: 'status_pending', color: 'text-amber-500 bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30', icon: '📋' },
    confirmed: { key: 'status_confirmed', color: 'text-blue-500 bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30', icon: '✅' },
    preparing: { key: 'status_preparing', color: 'text-purple-500 bg-purple-50 border-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-900/30', icon: '👨‍🍳' },
    ready: { key: 'status_ready', color: 'text-emerald-500 bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30', icon: '🚀' },
    served: { key: 'status_served', color: 'text-emerald-500 bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30', icon: '🎉' },
    completed: { key: 'status_completed', color: 'text-slate-500 bg-slate-50 border-slate-100 dark:bg-slate-700/30 dark:text-slate-400 dark:border-slate-700', icon: '✔️' },
    cancelled: { key: 'status_cancelled', color: 'text-rose-500 bg-rose-50 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/30', icon: '❌' },
};

/* ─── Order History Screen ──────────────────────────────── */
function OrderHistoryScreen({ restaurantId, roomId, token, orders, onBack, navigate }) {
    const { formatPrice } = useCurrency();
    const { t, i18n } = useTranslation();
    const [liveOrders, setLiveOrders] = useState(orders);

    useEffect(() => {
        let alive = true;
        (async () => {
            const updated = await Promise.all(
                orders.map(async (o) => {
                    try {
                        const res = await fetch(`${API_URL}/public/room/order/${o.id}`);
                        if (!res.ok) return o;
                        const data = await res.json();
                        return { ...o, status: data.order.status, total: data.order.total };
                    } catch { return o; }
                })
            );
            if (alive) setLiveOrders(updated);
        })();
        return () => { alive = false; };
    }, [orders]);

    return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen max-w-5xl mx-auto shadow-2xl transition-colors duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-6 text-white shadow-lg">
                <button 
                    onClick={onBack} 
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all font-bold text-xs mb-4"
                >
                    <ArrowLeft size={16} /> {t('back_to_menu')}
                </button>
                <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                        <History size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold leading-tight">{t('my_orders')}</h1>
                        <p className="text-sm text-primary-100 font-medium">{t('room')} {roomId}</p>
                    </div>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {liveOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 border border-gray-200 dark:border-gray-700">
                            <Package size={32} className="text-gray-300 dark:text-gray-600" />
                        </div>
                        <p className="text-gray-800 dark:text-white font-bold text-lg mb-1">{t('no_orders_yet')}</p>
                        <button 
                            onClick={onBack} 
                            className="mt-4 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-primary-500/30 text-sm"
                        >
                            {t('view_menu')}
                        </button>
                    </div>
                ) : (
                    liveOrders.map((order, index) => {
                        const meta = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                        const isDone = ['served', 'completed', 'cancelled'].includes(order.status);
                        
                        return (
                            <motion.div 
                                key={order.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-4"
                            >
                                <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-700 pb-3">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">#{order.id.slice(-6).toUpperCase()}</span>
                                            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                            <span className="text-[10px] text-gray-500 font-bold uppercase">
                                                {new Date(order.placedAt).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className="font-bold text-gray-800 dark:text-white text-sm line-clamp-1">
                                            {order.itemsSummary}
                                        </p>
                                    </div>
                                    <span className={clsx(
                                        'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border whitespace-nowrap',
                                        meta.color
                                    )}>
                                        {t(meta.key)}
                                    </span>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                    <span className="text-lg font-black text-gray-900 dark:text-white">
                                        {formatPrice(order.total, order.currency)}
                                    </span>
                                    
                                    {!isDone && (
                                        <button
                                            onClick={() => navigate(`/room/${restaurantId}/track/${order.id}?room=${roomId}&token=${encodeURIComponent(token)}`)}
                                            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-primary-500/20 flex items-center gap-2"
                                        >
                                            <Search size={14} /> {t('track_order_realtime')}
                                        </button>
                                    )}
                                    
                                    {isDone && (
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                            {order.status === 'cancelled' ? (
                                                <AlertTriangle size={14} className="text-rose-500" />
                                            ) : (
                                                <X size={14} className="text-gray-400" />
                                            )}
                                            {order.status === 'cancelled' ? t('order_status_cancelled') : t('order_status_completed')}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════ */
export default function RoomMenuPage() {
    const { restaurantId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { formatPrice } = useCurrency();

    const roomId = searchParams.get('room');
    const token = searchParams.get('token');

    const [phase, setPhase] = useState('validating');
    const [errorMsg, setErrorMsg] = useState('');
    const [restaurant, setRestaurant] = useState(null);
    const [room, setRoom] = useState(null);
    const [menuItems, setMenuItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [activeCategory, setActiveCategory] = useState('__all__');
    const [searchQuery, setSearchQuery] = useState('');
    const [cart, setCart] = useState([]);
    const [customerName, setCustomerName] = useState('');
    const [notes, setNotes] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('room_account');
    const [submitting, setSubmitting] = useState(false);
    const [orderId, setOrderId] = useState(null);
    const [history, setHistory] = useState([]);
    const [waiterCalling, setWaiterCalling] = useState(false);
    const [waiterCalled, setWaiterCalled] = useState(false);
    const { t } = useTranslation();
    const searchRef = useRef(null);

    /* ── Step 1: Validate QR ── */
    useEffect(() => {
        if (!restaurantId || !roomId || !token) {
            setErrorMsg(t('qr_code_invalid'));
            setPhase('error');
            return;
        }
        setHistory(loadHistory(restaurantId, roomId));
        (async () => {
            try {
                const res = await fetch(
                    `${API_URL}/public/room/validate?r=${restaurantId}&room=${roomId}&token=${encodeURIComponent(token)}`
                );
                const data = await res.json();
                if (!res.ok || !data.valid) { setErrorMsg(data.message || t('qr_code_invalid')); setPhase('error'); return; }
                setRestaurant(data.restaurant);
                setRoom(data.room);
                setPhase('loading-menu');
            } catch {
                setErrorMsg(t('no_connection'));
                setPhase('error');
            }
        })();
    }, [restaurantId, roomId, token, t]);

    /* ── Step 2: Load Menu ── */
    useEffect(() => {
        if (phase !== 'loading-menu') return;
        (async () => {
            try {
                const res = await fetch(
                    `${API_URL}/public/room/menu/${restaurantId}?room=${roomId}&token=${encodeURIComponent(token)}`
                );
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || t('error_loading_menu'));
                setMenuItems(data.items || []);
                setCategories(data.categories || []);
                setPhase('menu');
            } catch (e) {
                setErrorMsg(e.message || t('error_loading_menu'));
                setPhase('error');
            }
        })();
    }, [phase, restaurantId, roomId, token]);

    /* ── Cart helpers ── */
    const addItem = (item) => setCart(prev => {
        const ex = prev.find(c => c.item._id === item._id);
        if (ex) return prev.map(c => c.item._id === item._id ? { ...c, qty: c.qty + 1 } : c);
        return [...prev, { item, qty: 1 }];
    });
    const removeItem = (id) => setCart(prev => {
        const ex = prev.find(c => c.item._id === id);
        if (!ex) return prev;
        if (ex.qty === 1) return prev.filter(c => c.item._id !== id);
        return prev.map(c => c.item._id === id ? { ...c, qty: c.qty - 1 } : c);
    });
    const getQty = (id) => cart.find(c => c.item._id === id)?.qty || 0;
    const totalQty = cart.reduce((s, c) => s + c.qty, 0);
    const cartCurrency = cart.length > 0 
        ? (cart[0].item.currency || restaurant?.settings?.currency || 'MZN') 
        : (restaurant?.settings?.currency || 'MZN');
    const totalPrice = cart.reduce((s, c) => s + c.qty * (c.item.price || 0), 0);
    const isKitchenOpen = restaurant?.settings?.isKitchenOpen !== false;

    /* ── Submit order ── */
    const submitOrder = async () => {
        setSubmitting(true);
        try {
            const res = await fetch(`${API_URL}/public/room/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    restaurantId, roomId, token,
                    items: cart.map(c => ({ item: c.item._id, qty: c.qty })),
                    customerName: customerName.trim() || `${t('room')} ${room?.number}`,
                    notes,
                    paymentMethod,
                    currency: cartCurrency
                })
            });
            const data = await res.json();
            if (!res.ok) { setErrorMsg(data.error || data.message || t('error_submitting_order')); setPhase('error'); return; }

            // ── Save to history ──
            const newEntry = {
                id: data.order._id,
                status: data.order.status || 'pending',
                total: data.order.total,
                currency: data.order.currency || cartCurrency,
                itemsSummary: cart.map(c => `${c.qty}× ${c.item.name}`).join(', '),
                placedAt: new Date().toISOString(),
            };
            saveOrderToHistory(restaurantId, roomId, newEntry);
            setHistory(loadHistory(restaurantId, roomId));
            setOrderId(data.order._id);
            setPhase('success');
        } catch {
            alert(t('no_connection'));
        } finally {
            setSubmitting(false);
        }
    };

    /* ── Waiter Call ── */
    const callWaiter = async () => {
        if (waiterCalling || waiterCalled) return;
        setWaiterCalling(true);
        try {
            await fetch(`${API_URL}/public/room/waiter-call`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ restaurantId, roomId, token, roomNumber: room?.number })
            });
            setWaiterCalled(true);
            setTimeout(() => setWaiterCalled(false), 30000); // reset after 30s
        } catch {
            alert(t('waiter_call_error'));
        } finally {
            setWaiterCalling(false);
        }
    };

    /* ── Filtered items ── */
    const filtered = menuItems.filter(it => {
        const catId = typeof it.category === 'object' ? it.category?._id : it.category;
        const matchCat = activeCategory === '__all__' || catId === activeCategory;
        const searchLower = (searchQuery || '').toLowerCase();
        const matchSearch = !searchQuery || (it.name || '').toLowerCase().includes(searchLower);
        return matchCat && matchSearch;
    });

    /* ────────────────── SCREENS ─── */

    if (phase === 'validating' || phase === 'loading-menu') return (
        <div className="flex h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
            <LoadingSpinner 
                size={48} 
                message={phase === 'validating' ? t('verifying_qr') : t('loading_menu')} 
            />
        </div>
    );

    if (phase === 'error') return (
        <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 transition-colors duration-200">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl text-center max-w-sm w-full border border-gray-100 dark:border-gray-700"
            >
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                    <AlertTriangle size={32} />
                </div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">{t('error')}</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">{errorMsg}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-primary-500/30"
                >
                    {t('try_again')}
                </button>
            </motion.div>
        </div>
    );

    if (phase === 'success') return (
        <div className="flex h-screen items-center justify-center bg-gradient-to-br from-emerald-600 to-teal-700 p-4">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/20 text-center max-w-sm w-full shadow-2xl"
            >
                <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 12 }}
                    className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl"
                >
                    <Package size={40} className="text-emerald-600" />
                </motion.div>
                <h2 className="text-2xl font-bold text-white mb-2">{t('order_sent')}</h2>
                <p className="text-emerald-100 mb-8 text-sm leading-relaxed">
                    {t('order_being_prepared', { room: room?.number })}
                </p>
                
                <div className="space-y-3">
                    <button
                        onClick={() => navigate(`/room/${restaurantId}/track/${orderId}?room=${roomId}&token=${encodeURIComponent(token)}`)}
                        className="w-full py-3.5 bg-white text-emerald-700 rounded-2xl font-bold transition-all shadow-lg hover:bg-emerald-50 active:scale-95 flex items-center justify-center gap-2"
                    >
                        <Search size={18} /> {t('track_order_realtime')}
                    </button>
                    <button
                        onClick={() => setPhase('history')}
                        className="w-full py-3.5 bg-white/10 hover:bg-white/20 text-white border border-white/30 rounded-2xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <History size={18} /> {t('view_all_orders')}
                    </button>
                    <button
                        onClick={() => { setCart([]); setNotes(''); setCustomerName(''); setPhase('menu'); }}
                        className="w-full py-3 text-emerald-100 font-bold hover:text-white transition-all text-sm"
                    >
                        + {t('make_another_order')}
                    </button>
                </div>
            </motion.div>
        </div>
    );

    if (phase === 'history') return (
        <OrderHistoryScreen
            restaurantId={restaurantId}
            roomId={roomId}
            token={token}
            orders={history}
            onBack={() => setPhase('menu')}
            navigate={navigate}
        />
    );

    /* ── MENU ── */
    if (phase === 'menu') return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen pb-32 max-w-5xl mx-auto shadow-2xl overflow-hidden relative font-sans transition-colors duration-200">
            
            {/* Kitchen Closed Banner Overlay */}
            {!isKitchenOpen && (
                <div className="sticky top-0 z-[60] bg-rose-600 text-white px-4 py-2.5 flex items-center justify-center gap-3 shadow-lg animate-pulse">
                    <AlertTriangle size={20} className="flex-shrink-0" />
                    <span className="text-xs font-black uppercase tracking-widest text-center">
                        {t('kitchen_closed_warning') || 'Cozinha temporariamente indisponível para pedidos'}
                    </span>
                </div>
            )}

            {/* Enhanced Hero Section */}
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
                            <div className="flex items-center gap-3 ml-2">
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/20 backdrop-blur-md border border-white/10">
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-[9px] font-bold text-white/50 uppercase tracking-tighter">Live</span>
                                </div>
                                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${isKitchenOpen ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                                    <span className="text-[9px] font-black uppercase tracking-widest">
                                        {isKitchenOpen ? t('kitchen_open') : t('kitchen_closed')}
                                    </span>
                                </div>
                            </div>
                        )}
                    </motion.h1>

                    {/* Room and Waiter Info */}
                    <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/20 backdrop-blur-sm border border-white/20">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            <span className="text-white font-bold text-sm">{t('room')} {room?.number}</span>
                            {room?.label && (
                                <span className="text-white/60 text-xs ml-1 border-l border-white/20 pl-2">{room.label}</span>
                            )}
                        </div>
                        
                        {/* Waiter Call / History Quick Actions */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={callWaiter}
                                disabled={waiterCalling}
                                className={clsx(
                                    "p-2.5 rounded-xl transition-all active:scale-95 shadow-lg",
                                    waiterCalled 
                                        ? "bg-emerald-500 text-white shadow-emerald-500/30" 
                                        : "bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20"
                                )}
                                title={t('call_waiter')}
                            >
                                {waiterCalling ? <LoadingSpinner size={16} hideMessage /> : <MessageCircle size={18} />}
                            </button>
                            <button
                                onClick={() => setPhase('history')}
                                className="p-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl shadow-lg hover:bg-white/20 transition-all active:scale-95 relative"
                                title={t('my_orders')}
                            >
                                <History size={18} />
                                {history.length > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white/20 shadow-sm animate-bounce">
                                        {history.length}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Header with Search & Filters */}
            <div className="sticky top-0 z-20 glass dark:bg-gray-900/90 dark:border-gray-800 shadow-sm transition-colors duration-200">
                <div className="p-3 pb-0">
                    <LanguageSwitcher />
                </div>
                
                <div className="p-3 flex items-center gap-2 pt-2">
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

                <div className="flex gap-2 overflow-x-auto px-3 pb-3 scrollbar-none hide-scrollbar">
                    <button
                        onClick={() => setActiveCategory('__all__')}
                        className={clsx(
                            "px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-300",
                            activeCategory === '__all__'
                                ? "bg-primary-600 text-white shadow-lg shadow-primary-500/30 scale-105"
                                : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                        )}
                    >
                        {t('all_items')}
                    </button>
                    {categories.map(cat => {
                        const catId = cat._id || cat;
                        const catName = cat.name || cat;

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

            {/* Menu List */}
            <div className="p-3 space-y-4">
                <AnimatePresence mode='popLayout'>
                    {filtered.map((item, index) => {
                        const qty = getQty(item._id);
                        return (
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
                                            <Star size={8} fill="currentColor" /> {t('popular')}
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 flex flex-col justify-between py-0.5">
                                    <div>
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-bold text-gray-800 dark:text-white text-base leading-tight">{item.name}</h3>
                                        </div>
                                        {item.description && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">{item.description}</p>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between mt-2">
                                        <span className="font-bold text-gray-900 dark:text-gray-100 text-lg tabular-nums">
                                            {formatPrice(item.price || 0, item.currency || cartCurrency)}
                                        </span>

                                        <div className="flex items-center gap-3">
                                            {qty > 0 ? (
                                                <div className="flex items-center gap-3 bg-primary-50 dark:bg-primary-900/20 rounded-full p-1 border border-primary-100 dark:border-primary-800">
                                                    <motion.button
                                                        whileTap={{ scale: 0.8 }}
                                                        onClick={() => removeItem(item._id)}
                                                        className="h-8 w-8 bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center shadow-sm"
                                                    >
                                                        <Minus size={14} strokeWidth={3} />
                                                    </motion.button>
                                                    <span className="font-black text-primary-700 dark:text-primary-300 min-w-[20px] text-center">{qty}</span>
                                                    <motion.button
                                                        whileTap={{ scale: 0.8 }}
                                                        onClick={() => addItem(item)}
                                                        className="h-8 w-8 bg-primary-600 text-white rounded-full flex items-center justify-center shadow-md shadow-primary-500/20"
                                                    >
                                                        <Plus size={14} strokeWidth={3} />
                                                    </motion.button>
                                                </div>
                                            ) : (
                                                <motion.button
                                                    whileTap={isKitchenOpen ? { scale: 0.9 } : {}}
                                                    onClick={() => isKitchenOpen && addItem(item)}
                                                    className={clsx(
                                                        "h-9 w-9 rounded-full flex items-center justify-center transition-all shadow-sm",
                                                        isKitchenOpen 
                                                            ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 hover:bg-primary-600 hover:text-white dark:hover:bg-primary-500 dark:hover:text-white' 
                                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed border border-gray-200 dark:border-gray-700'
                                                    )}
                                                    title={!isKitchenOpen ? t('kitchen_closed') : ''}
                                                >
                                                    {isKitchenOpen ? <Plus size={18} strokeWidth={2.5} /> : <X size={16} />}
                                                </motion.button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {filtered.length === 0 && (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Search className="text-gray-300" size={24} />
                        </div>
                        <p className="text-gray-500 font-medium dark:text-gray-400">{t('no_items_found')}</p>
                    </div>
                )}
            </div>

            {/* Floating Cart Button */}
            <AnimatePresence>
                {totalQty > 0 && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-6 left-4 right-4 z-40 max-w-md mx-auto"
                    >
                        <button
                            onClick={() => setPhase('cart')}
                            className="w-full bg-gray-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between hover:scale-[1.02] active:scale-[0.98] transition-all border border-white/10"
                        >
                            <div className="flex items-center gap-3">
                                <div className="bg-primary-500 text-white px-3 py-1 rounded-lg text-sm font-bold shadow-lg shadow-primary-500/20">{totalQty}</div>
                                <span className="text-sm font-medium text-gray-200">{t('total')}</span>
                            </div>
                            <span className="font-bold text-lg flex items-center gap-1">
                                {formatPrice(totalPrice, cartCurrency)} <ChevronDown className="rotate-[-90deg]" size={18} />
                            </span>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );

    /* ── CART ── */
    if (phase === 'cart') return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen pb-32 max-w-5xl mx-auto shadow-2xl transition-colors duration-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-6 text-white shadow-lg sticky top-0 z-50">
                <button 
                    onClick={() => setPhase('menu')} 
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all font-bold text-xs mb-4"
                >
                    <ArrowLeft size={16} /> {t('back_to_menu')}
                </button>
                <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm shadow-inner">
                        <ShoppingBag size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold leading-tight">{t('confirm_order')}</h1>
                        <p className="text-sm text-primary-100 font-medium">{t('room')} {room?.number}</p>
                    </div>
                </div>
            </div>
            
            <div className="p-4 space-y-6 overflow-y-auto">
                {/* Cart items */}
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Package size={14} /> {t('items_in_cart')}
                    </h3>
                    <div className="space-y-4">
                        {cart.map((c, idx) => (
                            <div key={c.item._id} className={clsx(
                                "flex items-center justify-between transition-all duration-300",
                                idx !== cart.length - 1 && "border-b border-gray-50 dark:border-gray-700/50 pb-4"
                            )}>
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 bg-gray-50 dark:bg-gray-900 rounded-xl flex items-center justify-center font-bold text-primary-600 border border-gray-100 dark:border-gray-700 flex-shrink-0">
                                        {c.qty}x
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-bold text-gray-800 dark:text-white text-sm line-clamp-1">{c.item.name}</p>
                                        <p className="text-[10px] text-gray-400 font-medium">{formatPrice(c.item.price, c.item.currency)} {t('each')}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 ml-2 flex-shrink-0">
                                    <span className="font-bold text-gray-900 dark:text-white text-sm whitespace-nowrap">
                                        {formatPrice(c.item.price * c.qty, c.item.currency)}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => removeItem(c.item._id)} className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors">
                                            <Minus size={14} />
                                        </button>
                                        <button onClick={() => addItem(c.item)} className="p-1.5 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors">
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-4 mt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                        <span className="text-gray-500 dark:text-gray-400 font-bold">{t('total')}</span>
                        <span className="text-xl font-black text-primary-600 dark:text-primary-400">
                            {formatPrice(totalPrice, cartCurrency)}
                        </span>
                    </div>
                </div>

                {/* Payment Method Picker */}
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        💳 {t('payment_method')}
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { id: 'room_account', icon: '🛏️', label: t('pay_room') },
                            { id: 'cash', icon: '💵', label: t('pay_cash') },
                            { id: 'mpesa', icon: '📱', label: 'M-Pesa' },
                            { id: 'emola', icon: '📲', label: 'e-Mola' },
                            { id: 'visa', icon: '💳', label: t('pay_card') },
                        ].map(m => (
                            <button
                                key={m.id}
                                onClick={() => setPaymentMethod(m.id)}
                                className={clsx(
                                    "flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all active:scale-95 relative overflow-hidden",
                                    paymentMethod === m.id
                                        ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 text-emerald-700 dark:text-emerald-400 shadow-md shadow-emerald-500/10"
                                        : "bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-emerald-200"
                                )}
                            >
                                <span className="text-xl">{m.icon}</span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-center leading-tight">{m.label}</span>
                                {paymentMethod === m.id && (
                                    <div className="absolute top-1 right-1">
                                        <div className="bg-emerald-500 text-white p-0.5 rounded-full ring-2 ring-white dark:ring-gray-800">
                                            <Plus size={8} className="rotate-45" />
                                        </div>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                    <div className="bg-gray-50/50 dark:bg-gray-900/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700 flex gap-3 items-center">
                         <AlertCircle size={14} className="text-primary-500 flex-shrink-0" />
                         <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 leading-relaxed italic">
                            {paymentMethod === 'room_account' ? t('pay_desc_room') :
                             paymentMethod === 'cash' ? t('pay_desc_cash') :
                             paymentMethod === 'mpesa' ? t('pay_desc_mpesa') :
                             paymentMethod === 'emola' ? t('pay_desc_emola') :
                             t('pay_desc_card')}
                         </p>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-3xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 ml-1">
                            {t('your_name_optional')}
                        </label>
                        <input 
                            value={customerName} 
                            onChange={e => setCustomerName(e.target.value)} 
                            className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all dark:text-white placeholder:text-gray-400"
                            placeholder={`${t('room')} ${room?.number}`}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 ml-1">
                            {t('notes_allergies')}
                        </label>
                        <textarea 
                            value={notes} 
                            onChange={e => setNotes(e.target.value)} 
                            rows={3}
                            className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all dark:text-white placeholder:text-gray-400 resize-none"
                            placeholder={t('notes_placeholder')}
                        />
                    </div>
                </div>
            </div>

            {/* Sticky Action Button */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 z-50">
                <div className="max-w-md mx-auto">
                    <button 
                        onClick={submitOrder} 
                        disabled={submitting || cart.length === 0 || !isKitchenOpen} 
                        className={clsx(
                            "w-full py-4 rounded-2xl font-bold text-base transition-all shadow-xl flex items-center justify-center gap-3 active:scale-[0.98]",
                            isKitchenOpen && cart.length > 0
                                ? "bg-primary-600 hover:bg-primary-700 text-white shadow-primary-500/30" 
                                : "bg-gray-400 cursor-not-allowed text-white shadow-none opacity-80"
                        )}
                    >
                        {submitting ? (
                            <div className="flex items-center gap-2 animate-pulse">
                                <LoadingSpinner size={20} hideMessage /> <span>{t('submitting')}</span>
                            </div>
                        ) : !isKitchenOpen ? (
                            <div className="flex items-center gap-2">
                                <AlertTriangle size={18} /> {t('kitchen_closed')}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <ShoppingBag size={18} /> {t('confirm_order')}
                            </div>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );

    return null;
}
