import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Search, ShoppingBag, Plus, Minus, X,
    ArrowLeft, User, Phone, CheckCircle, ChefHat, ChevronDown, Star,
    Wifi, WifiOff, LogOut, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

import api, { tableAPI, menuAPI, categoryAPI } from '../../services/api';

const AssistedOrder = () => {
    const { tableId } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();

    // -- State --
    const [restaurantId, setRestaurantId] = useState(null);
    const [table, setTable] = useState(null);

    // Data
    const [categories, setCategories] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);

    // UI
    const [activeCategory, setActiveCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [showCustomerModal, setShowCustomerModal] = useState(true);
    const [showMobileCart, setShowMobileCart] = useState(false); // For mobile only

    // Order Data
    const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '' });
    const [cart, setCart] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initial Load
    useEffect(() => {
        const init = async () => {
            try {
                const { data: tableData } = await tableAPI.get(tableId);
                const fetchedTable = tableData.table;
                setTable(fetchedTable);
                const rId = fetchedTable.restaurant._id || fetchedTable.restaurant;
                setRestaurantId(rId);

                const [menuRes, catRes] = await Promise.all([
                    menuAPI.getAll(rId, { available: true }),
                    categoryAPI.getAll(rId)
                ]);

                setMenuItems(menuRes.data.items || []);
                const cats = catRes.data.categories || [];
                setCategories(['All', ...cats]);

                setLoading(false);
            } catch (error) {
                console.error("Failed to load data", error);
                toast.error(t('failed_load_data') || "Erro ao carregar dados");
            }
        };

        if (tableId) init();
    }, [tableId, t]);

    // -- Cart Logic --
    const triggerHaptic = () => {
        if (navigator.vibrate) navigator.vibrate(50);
    };

    const addToCart = (item) => {
        triggerHaptic();
        setCart(prev => {
            const existingIdx = prev.findIndex(i => i._id === item._id && (!i.customizations || i.customizations.length === 0));
            if (existingIdx >= 0) {
                const newCart = [...prev];
                newCart[existingIdx].qty += 1;
                return newCart;
            }
            return [...prev, { ...item, qty: 1 }];
        });
        toast.success(`${item.name} ${t('added_to_cart') || 'adicionado'}`, { icon: '🛒', position: 'bottom-center' });
    };

    const updateQty = (index, delta) => {
        triggerHaptic();
        setCart(prev => {
            const newCart = [...prev];
            newCart[index].qty += delta;
            if (newCart[index].qty <= 0) {
                newCart.splice(index, 1);
            }
            return newCart;
        });
    };

    const clearCart = () => {
        if (window.confirm(t('confirm_clear_cart') || 'Limpar carrinho?')) {
            setCart([]);
            setShowMobileCart(false);
        }
    };

    const cartTotal = useMemo(() => cart.reduce((acc, item) => acc + (item.price * item.qty), 0), [cart]);
    const cartCount = useMemo(() => cart.reduce((acc, item) => acc + item.qty, 0), [cart]);

    // -- Submit Logic --
    const handleSubmitOrder = async () => {
        if (cart.length === 0) return;

        // Auto-fill customer info for waiter orders
        const autoCustomerName = `Garçom Mesa ${table?.number || tableId}`;
        const autoCustomerPhone = '000000000';

        setIsSubmitting(true);
        try {
            const payload = {
                restaurant: restaurantId,
                table: tableId,
                items: cart.map(i => ({
                    item: i._id,
                    qty: i.qty,
                    customizations: i.customizations
                })),
                customerName: autoCustomerName,
                phone: autoCustomerPhone,
                orderType: 'dine-in',
                source: 'waiter'
            };

            await api.post('/orders', payload);
            toast.success(t('order_created_success') || "Pedido criado com sucesso!");
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]); // Success pattern
            navigate('/dashboard/waiter');

        } catch (error) {
            console.error("Order submission failed", error);
            const msg = error.response?.data?.message || t('order_create_error') || "Falha ao criar pedido";
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    // -- Filter Logic --
    const filteredItems = useMemo(() => {
        return menuItems.filter(item => {
            const matchesCat = activeCategory === 'All' ||
                (typeof item.category === 'object' ? item.category?._id === activeCategory : item.category === activeCategory) ||
                (typeof item.category === 'object' ? item.category?.name === activeCategory : false);

            const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));

            return matchesCat && matchesSearch;
        });
    }, [menuItems, activeCategory, searchQuery]);

    // -- Components --
    const CartContent = () => (
        <div className="flex flex-col h-full bg-white dark:bg-gray-800 shadow-xl lg:shadow-none lg:border-l lg:border-gray-100 dark:lg:border-gray-700">
            {/* Cart Header */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50">
                <h2 className="font-bold text-lg dark:text-white flex items-center gap-2">
                    <ShoppingBag size={20} className="text-primary-600" />
                    {t('order_summary') || 'Pedido'}
                </h2>
                {cart.length > 0 && (
                    <button onClick={clearCart} className="text-red-500 hover:text-red-600 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <Trash2 size={18} />
                    </button>
                )}
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-3 opacity-60">
                        <ShoppingBag size={48} strokeWidth={1} />
                        <p className="text-sm font-medium">{t('cart_empty') || "Carrinho vazio"}</p>
                    </div>
                ) : (
                    cart.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-3 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700/50 rounded-xl p-1.5 shadow-md">
                                <button
                                    onClick={() => updateQty(idx, -1)}
                                    className="h-9 w-9 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all"
                                >
                                    <Minus size={18} strokeWidth={3} />
                                </button>
                                <span className="font-bold text-lg text-gray-900 dark:text-white min-w-[28px] text-center tabular-nums px-1.5">{item.qty}</span>
                                <button
                                    onClick={() => updateQty(idx, 1)}
                                    className="h-9 w-9 bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all"
                                >
                                    <Plus size={18} strokeWidth={3} />
                                </button>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-gray-800 dark:text-white truncate">{item.name}</h4>
                                <p className="text-xs text-gray-500 font-medium">{(item.price * item.qty).toLocaleString()} MT</p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Cart Footer */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-500 dark:text-gray-400 font-medium">{t('total') || 'Total'}</span>
                    <span className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{cartTotal.toLocaleString()} <span className="text-sm font-normal text-gray-500">MT</span></span>
                </div>
                <button
                    onClick={handleSubmitOrder}
                    disabled={isSubmitting || cart.length === 0}
                    className="w-full py-3.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-lg shadow-green-500/30 flex items-center justify-center gap-2 transition-all hover:translate-y-[-1px] active:translate-y-[1px]"
                >
                    {isSubmitting ? <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span> : <><CheckCircle size={20} /> {t('confirm_order') || 'Confirmar'}</>}
                </button>
            </div>
        </div>
    );

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
    );

    return (
        <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden font-sans">
            {/* Header (Unified) */}
            <header className="bg-white dark:bg-gray-800 shadow-sm z-20 px-4 py-3 flex items-center justify-between shrink-0 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/dashboard/waiter')}
                        className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-600 dark:text-gray-300"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <h1 className="text-base font-bold text-gray-800 dark:text-white leading-none">
                                {t('table') || 'Mesa'} {table?.number}
                            </h1>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${table?.status === 'free' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {table?.status === 'free' ? (t('free') || 'Livre') : (t('occupied') || 'Ocupada')}
                            </span>
                        </div>
                        {customerInfo.name && (
                            <span className="text-xs text-primary-600 font-medium flex items-center gap-1 cursor-pointer hover:underline mt-0.5" onClick={() => setShowCustomerModal(true)}>
                                <User size={10} /> {customerInfo.name}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Tablet: Logout/Home shortcut could go here */}
                </div>
            </header>

            {/* Main Layout Area */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left Column: Menu Items */}
                <div className="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-gray-900 relative">
                    {/* Sticky Categories & Search */}
                    <div className="sticky top-0 z-10 bg-gray-50/95 dark:bg-gray-900/90 p-3 pb-2 backdrop-blur-md">
                        <div className="relative mb-3 max-w-2xl mx-auto lg:mx-0">
                            <Search className="absolute left-3 top-2.5 text-gray-400 h-4 w-4" />
                            <input
                                type="text"
                                placeholder={t('search_placeholder') || "Buscar item..."}
                                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all placeholder:text-gray-400 dark:text-white"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {categories.map(cat => {
                                const cName = typeof cat === 'string' ? cat : cat.name;
                                const cId = typeof cat === 'string' ? cat : cat._id;
                                return (
                                    <button
                                        key={cId}
                                        onClick={() => setActiveCategory(cId)}
                                        className={`
                                            px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-300
                                            ${activeCategory === cId
                                                ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30 ring-2 ring-primary-600/20'
                                                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'}
                                        `}
                                    >
                                        {cName === 'All' ? (t('all') || 'Todos') : cName}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Scrollable Menu Grid */}
                    <div className="flex-1 overflow-y-auto p-4 content-start">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 pb-24 lg:pb-4">
                            <AnimatePresence mode='popLayout'>
                                {filteredItems.map((item, index) => (
                                    <motion.div
                                        key={item._id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.2 }}
                                        className="bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-sm border border-gray-100/50 dark:border-gray-700 flex gap-3 active:scale-[0.98] transition-all hover:shadow-md cursor-pointer group"
                                        onClick={() => addToCart(item)}
                                    >
                                        {/* Image */}
                                        <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0 relative group-hover:brightness-105 transition-all">
                                            {(item.imageUrl || item.image) ? (
                                                <img
                                                    src={item.imageUrl || item.image}
                                                    alt={item.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50 dark:bg-gray-800">
                                                    <ChefHat size={32} strokeWidth={1.5} />
                                                </div>
                                            )}
                                            {item.popular && (
                                                <div className="absolute top-1 left-1 bg-yellow-400 text-[10px] font-bold px-1.5 py-0.5 rounded-md text-yellow-900 flex items-center gap-0.5 shadow-sm">
                                                    <Star size={8} fill="currentColor" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0">
                                            <div>
                                                <h3 className="font-bold text-gray-800 dark:text-white text-base leading-tight mb-1 truncate group-hover:text-primary-600 transition-colors">{item.name}</h3>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">{item.description}</p>
                                            </div>

                                            <div className="flex items-center justify-between mt-2">
                                                <div className="flex items-baseline gap-1">
                                                    <span className="font-bold text-gray-900 dark:text-gray-100 text-lg tabular-nums">{item.price}</span>
                                                    <span className="text-xs text-gray-400 font-medium">MT</span>
                                                </div>

                                                {/* Action Button */}
                                                <button
                                                    className="h-11 w-11 bg-gradient-to-br from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-xl flex items-center justify-center transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                                                >
                                                    <Plus size={22} strokeWidth={3} />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>

                        {filteredItems.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                    <Search className="text-gray-400" size={24} />
                                </div>
                                <h3 className="text-gray-900 dark:text-white font-semibold">Nenhum item encontrado</h3>
                                <p className="text-gray-500 text-sm">Tente buscar por outro termo.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Cart (Desktop/Tablet) */}
                <div className="hidden lg:block w-[320px] xl:w-[380px] shrink-0 h-full z-20">
                    <CartContent />
                </div>
            </div>

            {/* Mobile Bottom Floating Cart Bar */}
            <AnimatePresence>
                {cartCount > 0 && !showMobileCart && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-4 left-4 right-4 z-30 lg:hidden"
                    >
                        <button
                            onClick={() => setShowMobileCart(true)}
                            className="w-full bg-gray-900 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between active:scale-[0.98] transition-all"
                        >
                            <div className="flex items-center gap-3">
                                <div className="bg-primary-500 text-white px-3 py-1 rounded-lg text-sm font-bold">{cartCount}</div>
                                <span className="text-sm font-medium text-gray-200">{t('view_order') || 'Ver Pedido'}</span>
                            </div>
                            <span className="font-bold text-lg">{cartTotal.toLocaleString()} MT</span>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mobile Cart Modal */}
            <AnimatePresence>
                {showMobileCart && (
                    <div className="fixed inset-0 z-50 lg:hidden">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setShowMobileCart(false)}
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="absolute bottom-0 left-0 right-0 h-[85vh] bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl overflow-hidden flex flex-col"
                        >
                            <div className="flex items-center justify-center p-2">
                                <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full" />
                            </div>
                            <div className="flex-1 overflow-hidden relative">
                                <button
                                    onClick={() => setShowMobileCart(false)}
                                    className="absolute top-2 right-4 p-2 bg-gray-100 dark:bg-gray-800 rounded-full z-10"
                                >
                                    <ChevronDown size={20} />
                                </button>
                                <CartContent />
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default AssistedOrder;
