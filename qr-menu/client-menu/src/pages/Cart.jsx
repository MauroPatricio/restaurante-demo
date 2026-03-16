import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import { useNotification } from '../context/NotificationContext';
import { Trash2, ArrowLeft, ArrowRight, Minus, Plus, ShoppingBag, CreditCard, Wallet, Smartphone, ShieldCheck, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { API_URL } from '../config/api';
import WaiterCallButton from '../components/WaiterCallButton';
import ReactionButtons from '../components/ReactionButtons';
import { useSound } from '../hooks/useSound';
import bellSound from '../sound/bell.mp3';
import LoadingSpinner from '../components/LoadingSpinner';
import { loadingManager } from '../utils/loadingManager';
import { getMenuUrl } from '../utils/navigation';
import LanguageSwitcher from '../components/LanguageSwitcher';

const Cart = () => {
    const { restaurantId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { cart, removeFromCart, updateQty, cartTotal, clearCart, cartCurrency } = useCart();
    const { t, i18n } = useTranslation();
    const { formatPrice, currency: preferredCurrency } = useCurrency();
    const { joinOrderRoom } = useNotification();

    const locale = i18n.language === 'pt' ? 'pt-MZ' : i18n.language;

    // Idempotency lock
    const submitLock = useRef(false);

    // Get table from URL or localStorage
    const tableNumber = searchParams.get('t') || searchParams.get('table') || localStorage.getItem(`table-ref-${restaurantId}`);
    const tokenFromUrl = searchParams.get('token');
    const tokenFromStorage = localStorage.getItem(`token-ref-${restaurantId}`);
    const tokenFromSession = JSON.parse(sessionStorage.getItem('qr_validation') || '{}')?.token;

    const [customerName, setCustomerName] = useState('');
    const [phone, setPhone] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Sound notification for successful order submission
    const { play: playSuccessSound } = useSound(bellSound);

    // Auto-redirect if cart is empty
    useEffect(() => {
        if (!loading && cart.length === 0 && !success) {
            navigate(`/menu/${restaurantId}${window.location.search}`, { replace: true });
        }
    }, [cart.length, success, loading, navigate, restaurantId]);

    const handleCheckout = async (e) => {
        e.preventDefault();
        if (submitLock.current) return;

        if (!customerName.trim()) {
            setError(t('please_enter_name'));
            return;
        }

        if (!phone.trim()) {
            setError(t('please_enter_phone'));
            return;
        }

        const token = tokenFromUrl || tokenFromStorage || tokenFromSession;

        if (!tableNumber || !token) {
            setError(t('error_missing_session'));
            return;
        }

        setLoading(true);
        setError('');
        submitLock.current = true;

        try {
            const itemsPayload = cart.map(item => ({
                item: item._id,
                name: item.name,
                price: item.price,
                quantity: item.qty, // Using 'quantity' as publicRoutes.js expects
                customizations: item.customizations || []
            }));

            const payload = {
                restaurantId,
                tableId: tableNumber,
                token,
                items: itemsPayload,
                customerName: customerName.trim(),
                phone: phone.trim(),
                paymentMethod,
                notes: '',
                currency: cartCurrency
            };

            console.log('🚀 ENVIANDO PEDIDO AO SERVIDOR:', {
                url: `${API_URL}/public/orders`,
                itemsCount: itemsPayload.length,
                total: cartTotal,
                data: payload
            });

            // Use centralized API
            const response = await api.post('/public/orders', payload);

            if (response.status === 201) {
                const orderData = response.data.order;

                // Play success sound
                playSuccessSound();

                // Store details for history lookup
                localStorage.setItem(`customer-name-${restaurantId}`, customerName.trim());
                if (phone.trim()) {
                    localStorage.setItem(`customer-phone-${restaurantId}`, phone.trim());
                }

                // Subscribe to real-time updates for this order
                joinOrderRoom(orderData._id);

                // Clear cart before redirecting
                clearCart();

                // Safety: force stop any active global loaders before navigating
                loadingManager.reset();

                // Redirect to Order Status page with state to show confirmation message
                // Use replace: true to prevent back button loop
                navigate(`/menu/${restaurantId}/status/${orderData._id}`, {
                    state: { justSubmitted: true },
                    replace: true
                });
            }
        } catch (err) {
            console.error('Checkout error:', err);
            const msg = err.response?.data?.message || err.response?.data?.error || t('error_checkout_generic');
            setError(msg);
            submitLock.current = false;
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center justify-center p-6 text-center transition-colors duration-200">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6 border border-green-200 dark:border-green-800">
                    <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('order_placed')}</h1>
                <p className="text-gray-500 dark:text-gray-400 mb-8">{t('order_sent_msg')}</p>

                {/* Feedback state presented at the end of service (checkout/payment success) */}
                <div className="w-full max-w-sm mb-8">
                    <ReactionButtons tableId={tableNumber} />
                </div>

                <button
                    onClick={() => navigate(getMenuUrl(restaurantId, searchParams))}
                    className="bg-blue-600 text-white px-8 py-3 rounded-full font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 mb-8"
                >
                    {t('browse_menu')}
                </button>

                <p className="text-[11px] text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-widest mt-auto pb-4">
                    {t('developed_by')}
                </p>
            </div>
        );
    }

    if (cart.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-6 transition-colors duration-200">
                <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <ShoppingBag size={40} className="text-gray-300 dark:text-gray-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">{t('cart_empty')}</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-8 text-center max-w-xs">{t('cart_empty_msg')}</p>
                <button
                    onClick={() => navigate(getMenuUrl(restaurantId, searchParams))}
                    className="text-primary-600 dark:text-primary-400 font-bold flex items-center gap-2 hover:underline"
                >
                    <ArrowLeft size={20} /> {t('browse_menu')}
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 flex flex-col items-center w-full">
            {/* Header - Matches Menu width pattern */}
            <div className="w-full bg-white dark:bg-gray-900 dark:border-gray-800 sticky top-0 z-30 shadow-sm border-b border-gray-100 transition-colors duration-200">
                <div className="max-w-5xl mx-auto p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-600 dark:text-gray-300 transition-colors">
                            <ArrowLeft size={24} />
                        </button>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('cart')}</h1>
                    </div>
                </div>
            </div>

            <div className="w-full max-w-5xl mx-auto p-3 space-y-3 flex-1 flex flex-col">
                {/* Cart Items - More compact */}
                <div className="space-y-2">
                    {cart.map((item, index) => (
                        <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex gap-4 transition-colors overflow-hidden">
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900 dark:text-white text-lg leading-tight">{item.name}</h3>
                                <p className="text-primary-600 dark:text-primary-400 font-extrabold text-base mt-1">
                                    {formatPrice(item.price * item.qty, item.currency)}
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl p-1 border border-gray-100 dark:border-gray-700">
                                    <button
                                        onClick={() => updateQty(index, -1)}
                                        className="w-10 h-10 flex items-center justify-center rounded-lg bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 shadow-sm disabled:opacity-30"
                                        disabled={item.qty <= 1}
                                    >
                                        <Minus size={16} strokeWidth={3} />
                                    </button>
                                    <span className="font-bold text-lg w-4 text-center text-gray-900 dark:text-white">{item.qty}</span>
                                    <button
                                        onClick={() => updateQty(index, 1)}
                                        className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary-600 text-white"
                                    >
                                        <Plus size={16} strokeWidth={3} />
                                    </button>
                                </div>
                                <button
                                    onClick={() => removeFromCart(index)}
                                    className="text-gray-300 hover:text-red-500 dark:text-gray-600 transition-colors p-2"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Totals - Smaller */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center transition-colors">
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{t('total')}</span>
                    <span className="text-2xl font-black text-primary-600 dark:text-primary-400">
                        {formatPrice(cartTotal)}
                    </span>
                </div>

                {/* Form Section - Compacted */}
                <form id="checkout-form" onSubmit={handleCheckout} className="space-y-3 flex flex-col flex-1">
                    {/* Payment Method - Compact Grid */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">{t('payment_method_label')}</label>
                        <div className="grid grid-cols-4 gap-2">
                            {['mpesa', 'emola', 'visa', 'cash'].map((method) => (
                                <button
                                    key={method}
                                    type="button"
                                    onClick={() => setPaymentMethod(method)}
                                    className={`relative flex flex-col items-center justify-center py-4 rounded-xl border-2 transition-all ${
                                        paymentMethod === method 
                                            ? 'bg-primary-50 dark:bg-primary-900/10 border-primary-500 text-primary-700 dark:text-primary-400' 
                                            : 'bg-gray-50/30 dark:bg-gray-900/20 border-gray-100 dark:border-gray-700 text-gray-400'
                                    }`}
                                >
                                    <div className="mb-1.5">
                                        {method === 'mpesa' && <Smartphone size={20} />}
                                        {method === 'emola' && <Smartphone size={20} />}
                                        {method === 'visa' && <CreditCard size={20} />}
                                        {method === 'cash' && <Wallet size={20} />}
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-tight">
                                        {t(`payment_${method}`)}
                                    </span>
                                    {paymentMethod === method && (
                                        <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-primary-500 flex items-center justify-center text-white">
                                            <ShieldCheck size={8} strokeWidth={4} />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Customer Info - Combined and Slimmer */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('your_name_label')}</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-xl outline-none text-gray-900 dark:text-white placeholder:text-gray-300 text-base font-semibold"
                                    value={customerName}
                                    onChange={e => setCustomerName(e.target.value)}
                                    placeholder={t('name_placeholder')}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('phone_label')}</label>
                                <input
                                    type="tel"
                                    required
                                    className="w-full p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-xl outline-none text-gray-900 dark:text-white placeholder:text-gray-300 text-base font-semibold"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    placeholder={t('phone_placeholder')}
                                    inputMode="tel"
                                />
                            </div>
                        </div>

                        {error && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-500 text-[10px] font-bold py-1 flex items-center gap-1">
                                <div className="w-1 h-1 rounded-full bg-red-500 animate-pulse"></div>
                                {error}
                            </motion.div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl h-[64px] font-black flex items-center justify-between px-6 hover:scale-[1.01] active:scale-[0.99] transition-all shadow-lg disabled:opacity-70 disabled:cursor-not-allowed group overflow-hidden mt-2"
                        >
                            <div className="flex items-center gap-3">
                                {loading ? <LoadingSpinner size={20} color={i18n.language === 'pt' ? 'white' : 'black'} /> : <ArrowRight size={20} className="text-primary-500 transition-transform group-hover:translate-x-1" />}
                                <span className="text-sm uppercase tracking-[0.2em]">{loading ? t('scanning') : t('confirm_order')}</span>
                            </div>
                            <span className="text-xl font-black">
                                {cartTotal} {cartCurrency === 'MZN' ? 'MT' : (cartCurrency || 'MT')}
                            </span>
                        </button>
                    </div>
                </form>

                <div className="py-2 mt-auto">
                    <p className="text-[9px] text-gray-400 dark:text-gray-600 font-bold text-center uppercase tracking-[0.2em] opacity-40">
                        {t('developed_by')}
                    </p>
                </div>
            </div>
        </div>



    );
};

export default Cart;
