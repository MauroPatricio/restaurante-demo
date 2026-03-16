import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
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
import { getMenuUrl } from '../utils/navigation';
import { useCurrency } from '../context/CurrencyContext';
import { convertCurrency, formatCurrency } from '../utils/currencyUtils';
import CurrencySwitcher from '../components/CurrencySwitcher';
import LanguageSwitcher from '../components/LanguageSwitcher';

const Cart = () => {
    const { restaurantId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { cart, removeFromCart, updateQty, cartTotal, clearCart } = useCart();
    const { t, i18n } = useTranslation();
    const { joinOrderRoom } = useNotification();
    const { currency: preferredCurrency, rates } = useCurrency();

    const locale = i18n.language === 'pt' ? 'pt-MZ' : i18n.language;

    // Converted total for display
    const convertedTotal = convertCurrency(cartTotal, 'MZN', preferredCurrency, rates);

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
                currency: preferredCurrency
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
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">{t('cart_empty') || 'Seu carrinho está vazio'}</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-8 text-center max-w-xs">{t('cart_empty_msg') || 'Adicione itens deliciosos do menu para começar seu pedido!'}</p>
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
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 flex flex-col items-center">
            {/* Header - Stretches to max-w or full width wrapper */}
            <div className="w-full bg-white dark:bg-gray-900 dark:border-gray-800 sticky top-0 z-30 shadow-sm border-b border-gray-100 transition-colors duration-200">
                <div className="max-w-[480px] mx-auto p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-600 dark:text-gray-300 transition-colors">
                            <ArrowLeft size={24} />
                        </button>
                        <h1 className="text-lg font-bold text-gray-900 dark:text-white">{t('cart')}</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <LanguageSwitcher />
                        <CurrencySwitcher />
                    </div>
                </div>
            </div>

            <div className="w-full max-w-[480px] mx-auto p-4 space-y-6">
                {/* Cart Items */}
                <div className="space-y-3">
                    {cart.map((item, index) => (
                        <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex gap-4 transition-colors overflow-hidden">
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900 dark:text-white text-base leading-tight mb-1">{item.name}</h3>
                                <p className="text-primary-600 dark:text-primary-400 font-extrabold text-sm">
                                    {formatCurrency(
                                        convertCurrency(item.price, item.currency || 'MZN', preferredCurrency, rates),
                                        preferredCurrency,
                                        locale
                                    )}
                                </p>
                                {item.customizations?.length > 0 && (
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 leading-tight">
                                        {item.customizations.map(c => c.name).join(', ')}
                                    </p>
                                )}
                            </div>
                            <div className="flex flex-col items-end justify-between gap-3">
                                <button
                                    onClick={() => removeFromCart(index)}
                                    className="text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                                <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl p-1 border border-gray-100 dark:border-gray-700">
                                    <button
                                        onClick={() => updateQty(index, -1)}
                                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 shadow-sm disabled:opacity-30"
                                        disabled={item.qty <= 1}
                                    >
                                        <Minus size={12} strokeWidth={3} />
                                    </button>
                                    <span className="font-bold text-sm w-4 text-center text-gray-900 dark:text-white">{item.qty}</span>
                                    <button
                                        onClick={() => updateQty(index, 1)}
                                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-primary-600 text-white shadow-md shadow-primary-500/20"
                                    >
                                        <Plus size={12} strokeWidth={3} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Totals */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-3 transition-colors">
                    <div className="flex justify-between text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">
                        <span>{t('subtotal')}</span>
                        <span>{formatCurrency(convertedTotal, preferredCurrency, locale)}</span>
                    </div>
                    <div className="flex justify-between font-black text-2xl pt-3 border-t border-dashed border-gray-100 dark:border-gray-700 text-gray-900 dark:text-white">
                        <span>{t('total')}</span>
                        <span className="text-primary-600 dark:text-primary-400">
                            {formatCurrency(convertedTotal, preferredCurrency, locale)}
                        </span>
                    </div>
                </div>

                {/* Form Section */}
                <div className="space-y-4">
                    <form id="checkout-form" onSubmit={handleCheckout} className="space-y-4">
                        {/* Payment Method - Now part of flow */}
                        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
                            <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-4">{t('payment_method_label')}</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {['mpesa', 'emola', 'visa', 'cash'].map((method) => (
                                    <button
                                        key={method}
                                        type="button"
                                        onClick={() => setPaymentMethod(method)}
                                        className={`group relative flex flex-col items-center justify-center py-4 px-2 rounded-2xl border-2 transition-all duration-300 ${
                                            paymentMethod === method 
                                                ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500 text-primary-700 dark:text-primary-400 shadow-lg shadow-primary-500/10' 
                                                : 'bg-gray-50/50 dark:bg-gray-900/30 border-gray-100 dark:border-gray-700 text-gray-400 dark:text-gray-500'
                                        }`}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 transition-all duration-300 ${
                                            paymentMethod === method ? 'bg-primary-500 text-white scale-110' : 'bg-white dark:bg-gray-800 text-gray-400'
                                        }`}>
                                            {method === 'mpesa' && <Smartphone size={18} />}
                                            {method === 'emola' && <Smartphone size={18} />}
                                            {method === 'visa' && <CreditCard size={18} />}
                                            {method === 'cash' && <Wallet size={18} />}
                                        </div>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-center leading-tight">
                                            {method === 'visa' ? 'VISA/MC' : method}
                                        </span>
                                        {paymentMethod === method && (
                                            <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary-500 flex items-center justify-center text-white shadow-sm">
                                                <ShieldCheck size={10} strokeWidth={4} />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Customer Details */}
                        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-2">{t('your_name_label')}</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-gray-900 dark:text-white placeholder:text-gray-300 text-sm font-medium"
                                    value={customerName}
                                    onChange={e => setCustomerName(e.target.value)}
                                    placeholder={t('name_placeholder')}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-2">{t('phone_label')}</label>
                                <input
                                    type="tel"
                                    required
                                    className="w-full p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-gray-900 dark:text-white placeholder:text-gray-300 text-sm font-medium"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    placeholder={t('phone_placeholder')}
                                    inputMode="tel"
                                />
                            </div>

                            {error && (
                                <motion.div 
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-red-500 text-xs font-bold bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-900/30 flex items-center gap-2"
                                >
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                                    {error}
                                </motion.div>
                            )}

                            {/* Confirm Button - Now internal to form flow */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full mt-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 rounded-[10px] h-[48px] font-black flex items-center justify-between hover:scale-[1.01] active:scale-[0.99] transition-all shadow-xl shadow-black/10 dark:shadow-white/5 disabled:opacity-70 disabled:cursor-not-allowed group overflow-hidden"
                            >
                                <div className="flex items-center gap-3">
                                    {loading ? <LoadingSpinner size={16} color={i18n.language === 'pt' ? 'white' : 'black'} /> : <ArrowRight size={18} className="text-primary-500" />}
                                    <span className="text-xs uppercase tracking-widest">{loading ? t('scanning') : t('confirm_order')}</span>
                                </div>
                                <span className="text-base font-black">
                                    {formatCurrency(convertedTotal, preferredCurrency, locale)}
                                </span>
                            </button>
                        </div>
                    </form>
                </div>

                <div className="py-4">
                    <p className="text-[10px] text-gray-400 dark:text-gray-600 font-bold text-center uppercase tracking-[0.3em] opacity-50">
                        {t('developed_by')}
                    </p>
                </div>
            </div>
        </div>


    );
};

export default Cart;
