import React, { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Trash2, ArrowLeft, ArrowRight, Minus, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_URL, SOCKET_URL } from '../config/api';

const Cart = () => {
    const { restaurantId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { cart, removeFromCart, updateQty, cartTotal, clearCart } = useCart();
    const { t } = useTranslation();

    // Idempotency lock
    const submitLock = React.useRef(false);

    // Get table from URL or localStorage
    const tableNumber = searchParams.get('table') || localStorage.getItem(`table-ref-${restaurantId}`);

    const [customerName, setCustomerName] = useState('');
    const [phone, setPhone] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('mpesa');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleCheckout = async (e) => {
        e.preventDefault();

        // Prevent double submission
        if (loading || submitLock.current) return;

        submitLock.current = true;
        setLoading(true);
        setError('');

        try {
            const orderData = {
                restaurant: restaurantId,
                items: cart.map(item => ({
                    item: item._id,
                    qty: item.qty,
                    customizations: item.customizations,
                    itemPrice: item.price
                })),
                total: cartTotal,
                customerName,
                phone,
                paymentMethod,
                orderType: 'dine-in'
            };

            // Add table if available
            if (tableNumber) {
                orderData.table = tableNumber;
                console.log('📍 Sending order with table ID:', tableNumber);
            } else {
                console.warn('⚠️ No table number found!');
            }

            console.log('📦 Order data being sent:', orderData);
            const res = await axios.post(`${API_URL}/orders`, orderData);

            setSuccess(true);
            setTimeout(() => {
                clearCart();
                navigate(`/menu/${restaurantId}/status/${res.data.order.id}`);
            }, 1000);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Failed to place order');
        } finally {
            setLoading(false);
            submitLock.current = false;
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Placed!</h1>
                <p className="text-gray-500 mb-8">Your order has been sent to the kitchen/bar.</p>
                <button
                    onClick={() => navigate(`/menu/${restaurantId}`)}
                    className="bg-blue-600 text-white px-8 py-3 rounded-full font-bold hover:bg-blue-700 transition-colors"
                >
                    Back to Menu
                </button>
            </div>
        );
    }

    if (cart.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
                <h2 className="text-xl font-semibold text-gray-400 mb-4">Your cart is empty</h2>
                <button
                    onClick={() => navigate(`/menu/${restaurantId}`)}
                    className="text-blue-600 font-medium flex items-center gap-2"
                >
                    <ArrowLeft size={20} /> Browse Menu
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Header */}
            <div className="bg-white p-4 sticky top-0 z-10 shadow-sm flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft size={24} className="text-gray-600" />
                </button>
                <h1 className="text-lg font-bold text-gray-900">{t('cart')}</h1>
            </div>

            <div className="p-4 space-y-4">
                {/* Cart Items */}
                <div className="space-y-3">
                    {cart.map((item, index) => (
                        <div key={index} className="bg-white p-4 rounded-xl shadow-sm flex gap-4">
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900">{item.name}</h3>
                                <p className="text-blue-600 font-semibold">{item.price} MT</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => updateQty(index, -1)}
                                    className="p-1 rounded-full bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600"
                                >
                                    <Minus size={16} />
                                </button>
                                <span className="font-medium w-4 text-center">{item.qty}</span>
                                <button
                                    onClick={() => updateQty(index, 1)}
                                    className="p-1 rounded-full bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                            <button
                                onClick={() => removeFromCart(index)}
                                className="text-red-400 hover:text-red-600 ml-2"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Totals */}
                <div className="bg-white p-4 rounded-xl shadow-sm space-y-2">
                    <div className="flex justify-between text-gray-600">
                        <span>Subtotal</span>
                        <span>{cartTotal} {t('currency')}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg pt-2 border-t text-gray-900">
                        <span>{t('total')}</span>
                        <span>{cartTotal} {t('currency')}</span>
                    </div>
                </div>

                {/* Guest Details Form */}
                <div className="space-y-3">
                    <h3 className="font-bold text-gray-900 text-sm">Details</h3>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                        <form id="checkout-form" onSubmit={handleCheckout} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Payment Method</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {['mpesa', 'emola', 'visa', 'cash'].map((method) => (
                                        <button
                                            key={method}
                                            type="button"
                                            onClick={() => setPaymentMethod(method)}
                                            className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${paymentMethod === method
                                                ? 'border-primary-500 bg-primary-50 text-primary-700 ring-2 ring-primary-500/20'
                                                : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                                                }`}
                                        >
                                            <span className="capitalize font-bold text-sm">{method === 'visa' ? 'VISA / Card' : method}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={customerName}
                                    onChange={e => setCustomerName(e.target.value)}
                                    placeholder="John Doe"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                <input
                                    type="tel"
                                    required
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    placeholder="84 123 4567"
                                />
                            </div>
                            {error && <p className="text-red-500 text-sm">{error}</p>}
                        </form>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-20">
                    <button
                        form="checkout-form"
                        disabled={loading}
                        className="w-full max-w-md mx-auto bg-black text-white p-4 rounded-xl font-bold flex items-center justify-between hover:bg-gray-900 transition-colors disabled:opacity-70 disabled:cursor-wait"
                    >
                        <span>{loading ? t('scanning') : t('confirm_order')}</span>
                        <span>{cartTotal} {t('currency')} <ArrowRight className="inline ml-1" size={18} /></span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Cart;
