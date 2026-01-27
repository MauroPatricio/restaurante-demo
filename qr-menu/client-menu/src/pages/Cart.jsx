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

const Cart = () => {
    const { restaurantId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { cart, removeFromCart, updateQty, cartTotal, clearCart } = useCart();
    const { t } = useTranslation();
    const { joinOrderRoom } = useNotification();

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
            setError('Por favor, informe seu nome');
            return;
        }

        if (!phone.trim()) {
            setError('Por favor, informe seu número de telefone');
            return;
        }

        const token = tokenFromUrl || tokenFromStorage || tokenFromSession;

        if (!tableNumber || !token) {
            setError('Mesa ou sessão não identificada. Por favor, escaneie o QR Code novamente.');
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
                notes: ''
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
                    Desenvolvido por Nhiquela Serviços e Consultoria, LDA
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
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 transition-colors duration-200">
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 dark:border-gray-800 p-4 sticky top-0 z-10 shadow-sm border-b border-gray-100 flex items-center gap-4 transition-colors duration-200">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-600 dark:text-gray-300 transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">{t('cart')}</h1>
            </div>

            <div className="p-4 space-y-4 max-w-md mx-auto">
                {/* Cart Items */}
                <div className="space-y-3">
                    {cart.map((item, index) => (
                        <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex gap-4 transition-colors">
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900 dark:text-white">{item.name}</h3>
                                <p className="text-primary-600 dark:text-primary-400 font-bold mt-1">{item.price} MT</p>
                                {item.customizations?.length > 0 && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {item.customizations.map(c => c.name).join(', ')}
                                    </p>
                                )}
                            </div>
                            <div className="flex flex-col items-end justify-between">
                                <button
                                    onClick={() => removeFromCart(index)}
                                    className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors p-1"
                                >
                                    <Trash2 size={18} />
                                </button>
                                <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700 rounded-lg p-1">
                                    <button
                                        onClick={() => updateQty(index, -1)}
                                        className="p-1 rounded-md bg-white dark:bg-gray-600 text-gray-600 dark:text-gray-200 shadow-sm disabled:opacity-50"
                                        disabled={item.qty <= 1}
                                    >
                                        <Minus size={14} />
                                    </button>
                                    <span className="font-bold text-sm w-4 text-center text-gray-900 dark:text-white">{item.qty}</span>
                                    <button
                                        onClick={() => updateQty(index, 1)}
                                        className="p-1 rounded-md bg-white dark:bg-gray-600 text-gray-600 dark:text-gray-200 shadow-sm"
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Totals */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-3 transition-colors">
                    <div className="flex justify-between text-gray-600 dark:text-gray-400 text-sm">
                        <span>{t('subtotal')}</span>
                        <span>{cartTotal} {t('currency')}</span>
                    </div>
                    <div className="flex justify-between font-bold text-xl pt-3 border-t border-gray-100 dark:border-gray-700 text-gray-900 dark:text-white">
                        <span>{t('total')}</span>
                        <span>{cartTotal} {t('currency')}</span>
                    </div>
                </div>

                {/* Guest Details Form */}
                <div className="space-y-3">
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm ml-1">{t('order_details')}</h3>
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
                        <form id="checkout-form" onSubmit={handleCheckout} className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">{t('payment_method_label')}</label>
                                <div className="grid grid-cols-2 gap-4">
                                    {['mpesa', 'emola', 'visa', 'cash'].map((method) => (
                                        <button
                                            key={method}
                                            type="button"
                                            onClick={() => setPaymentMethod(method)}
                                            style={{
                                                height: '110px',
                                                borderRadius: '24px',
                                                border: '2px solid',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '12px',
                                                transition: 'all 0.3s',
                                                position: 'relative',
                                                overflow: 'hidden',
                                                background: paymentMethod === method ? '#f0fdf4' : 'rgba(248, 250, 252, 0.5)',
                                                borderColor: paymentMethod === method ? '#10b981' : '#e2e8f0',
                                                color: paymentMethod === method ? '#059669' : '#64748b',
                                                boxShadow: paymentMethod === method ? '0 10px 15px -3px rgba(16, 185, 129, 0.1)' : 'none'
                                            }}
                                            className="group relative"
                                        >
                                            <div style={{
                                                width: '44px',
                                                height: '44px',
                                                borderRadius: '14px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                background: paymentMethod === method ? '#10b981' : '#f1f5f9',
                                                color: paymentMethod === method ? 'white' : '#94a3b8',
                                                transition: 'all 0.3s'
                                            }} className="group-hover:scale-110">
                                                {method === 'mpesa' && <Smartphone size={24} />}
                                                {method === 'emola' && <Wallet size={24} />}
                                                {method === 'visa' && <CreditCard size={24} />}
                                                {method === 'cash' && <Wallet size={24} />}
                                            </div>
                                            <span className="capitalize font-black text-xs tracking-widest">{method === 'visa' ? 'VISA / MASTERCARD' : method}</span>
                                            {paymentMethod === method && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '12px',
                                                    right: '12px',
                                                    width: '18px',
                                                    height: '18px',
                                                    borderRadius: '50%',
                                                    background: '#10b981',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'white'
                                                }}>
                                                    <ShieldCheck size={12} strokeWidth={4} />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{t('your_name_label')}</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-gray-900 dark:text-white placeholder:text-gray-400"
                                    value={customerName}
                                    onChange={e => setCustomerName(e.target.value)}
                                    placeholder={t('name_placeholder')}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{t('phone_label')}</label>
                                <input
                                    type="tel"
                                    required
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-gray-900 dark:text-white placeholder:text-gray-400"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    placeholder={t('phone_placeholder')}
                                />
                            </div>
                            {error && <p className="text-red-500 text-sm font-medium bg-red-50 dark:bg-red-900/20 p-2 rounded-lg border border-red-100 dark:border-red-800">{error}</p>}
                        </form>
                    </div>
                </div>

                {/* Bottom Bar with Footer Text */}
                <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 border-t border-gray-100 dark:border-gray-800 p-4 z-20 backdrop-blur-lg transition-colors">
                    <button
                        form="checkout-form"
                        disabled={loading}
                        className="w-full max-w-md mx-auto bg-gray-900 dark:bg-white text-white dark:text-gray-900 p-4 rounded-xl font-bold flex items-center justify-between hover:bg-black dark:hover:bg-gray-200 transition-all active:scale-[0.98] shadow-xl disabled:opacity-70 disabled:cursor-wait mb-4"
                    >
                        <span>
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <LoadingSpinner size={18} color="white" />
                                    <span>{t('scanning')}</span>
                                </div>
                            ) : t('confirm_order')}
                        </span>
                        <span>{cartTotal} {t('currency')} <ArrowRight className="inline ml-1" size={18} /></span>
                    </button>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 font-semibold text-center uppercase tracking-widest">
                        Desenvolvido por Nhiquela Serviços e Consultoria, LDA
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Cart;
