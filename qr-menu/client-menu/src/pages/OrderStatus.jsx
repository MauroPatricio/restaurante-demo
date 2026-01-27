import React, { useEffect, useState } from 'react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Clock, ChefHat, Truck, ArrowLeft, RefreshCw, AlertCircle, Star, Copy, CheckCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { API_URL, SOCKET_URL } from '../config/api';
import { formatTime } from '../utils/dateUtils';
import { getMenuUrl } from '../utils/navigation';

const OrderStatus = () => {
    const { restaurantId, orderId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { t } = useTranslation();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
    const location = useLocation();
    const [justSubmitted, setJustSubmitted] = useState(location.state?.justSubmitted || false);
    const [copied, setCopied] = useState(false);

    // Initial Fetch
    useEffect(() => {
        const fetchOrder = async () => {
            try {
                // Remove API_URL as api service has baseURL
                const res = await api.get(`/orders/${orderId}`);
                setOrder(res.data.order);
                setLoading(false);
            } catch (err) {
                console.error(err);
                setError('Failed to load order status');
                setLoading(false);
            }
        };
        fetchOrder();
    }, [orderId]);

    // Socket Connection
    useEffect(() => {
        if (!orderId) return;

        const socket = io(SOCKET_URL);

        socket.on('connect', () => {
            console.log('Connected to socket server');
            socket.emit('join-order', orderId);
        });

        socket.on('order-updated', (updatedOrder) => {
            console.log('Order updated:', updatedOrder);
            setOrder(updatedOrder);
        });

        return () => {
            socket.disconnect();
        };
    }, [orderId]);

    const submitFeedback = async () => {
        try {
            await api.post('/feedback', {
                restaurant: restaurantId,
                orderId: orderId,
                rating,
                comment,
                customerName: order.customerName || 'Guest'
            });
            setFeedbackSubmitted(true);
        } catch (error) {
            console.error('Feedback failed:', error);
            setError('Failed to submit feedback');
        }
    };

    // Removed fullscreen loader - loads in background for better UX
    if (loading) return null;

    if (error) return (
        <div className="flex h-screen items-center justify-center text-red-500 gap-2 bg-gray-50 flex-col p-4 text-center">
            <AlertCircle size={48} className="mb-2 opacity-50" />
            <p>{error}</p>
            <button onClick={() => navigate(getMenuUrl(restaurantId, searchParams))} className="mt-4 text-primary-600 underline">{t('back_to_menu')}</button>
        </div>
    );

    const steps = [
        { status: 'pending', label: t('order_status_pending'), icon: Clock },
        { status: 'preparing', label: t('order_status_preparing'), icon: ChefHat },
        { status: 'ready', label: t('order_status_ready'), icon: Check },
        { status: 'completed', label: t('order_status_delivered'), icon: Truck },
    ];

    const currentStepIndex = steps.findIndex(s => s.status === order?.status) || 0;
    const isCompleted = order?.status === 'completed';

    return (
        <div className="min-h-screen bg-gray-50 font-sans pb-10">
            {/* Header */}
            <div className="bg-white p-4 sticky top-0 z-10 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(`/menu/${restaurantId}`)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft size={24} className="text-gray-600" />
                    </button>
                    <h1 className="text-lg font-bold text-gray-900">{t('order_status')}</h1>
                </div>
                <button onClick={() => window.location.reload()} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-primary-600">
                    <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                </button>
            </div>

            <div className="max-w-md mx-auto p-4 space-y-6">

                {/* Success Message for New Orders */}
                <AnimatePresence>
                    {justSubmitted && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: -20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: -20 }}
                            className="bg-green-600 text-white p-4 rounded-2xl shadow-lg mb-6 flex items-start gap-4"
                        >
                            <div className="bg-white/20 p-2 rounded-full">
                                <Check size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg leading-tight">{t('order_success_msg')}</h3>
                                <p className="text-white/80 text-sm mt-1">{t('order_id_desc', { id: order?._id.slice(-6).toUpperCase() })}</p>
                                <button
                                    onClick={() => setJustSubmitted(false)}
                                    className="mt-2 text-xs font-bold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-lg"
                                >
                                    {t('got_it')}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Status Card */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
                    <div className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-50 text-primary-600">
                        {steps[currentStepIndex]?.icon && React.createElement(steps[currentStepIndex].icon, { size: 32 })}
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1 capitalize">
                        {order.status === 'pending' ? t('order_status_pending') : t(`order_status_${order.status}`)}
                    </h2>
                    <p className="text-gray-500 text-sm">
                        {t('estimated_ready')}: {formatTime(order.estimatedReadyTime)}
                    </p>
                </div>

                {/* Stepper */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="relative">
                        {/* Connecting Line */}
                        <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-gray-100"></div>

                        <div className="space-y-8 relative">
                            {steps.map((step, index) => {
                                const isActive = index <= currentStepIndex;
                                const isCurrent = index === currentStepIndex;
                                const Icon = step.icon;

                                return (
                                    <div key={step.status} className="flex items-center gap-4">
                                        <div className={clsx(
                                            "w-12 h-12 rounded-full flex items-center justify-center z-10 transition-colors duration-500",
                                            isActive ? "bg-primary-500 text-white shadow-lg shadow-primary-500/30" : "bg-gray-100 text-gray-400"
                                        )}>
                                            <Icon size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className={clsx("font-bold text-sm", isActive ? "text-gray-900" : "text-gray-400")}>{step.label}</h3>
                                            {isCurrent && !isCompleted && (
                                                <p className="text-xs text-primary-600 font-medium animate-pulse">In Progress...</p>
                                            )}
                                        </div>
                                        {isActive && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="text-primary-500"
                                            >
                                                <Check size={16} />
                                            </motion.div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Order Summary */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">{t('order_id_label')}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-mono font-bold text-gray-900 bg-gray-50 px-3 py-1 rounded-lg border border-gray-200">
                                #{order._id.slice(-6).toUpperCase()}
                            </span>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(`#${order._id.slice(-6).toUpperCase()}`);
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 2000);
                                }}
                                className={clsx(
                                    "p-2 rounded-lg transition-all",
                                    copied ? "bg-green-50 text-green-600" : "bg-gray-50 text-gray-400 hover:text-gray-600"
                                )}
                            >
                                {copied ? <CheckCheck size={18} /> : <Copy size={18} />}
                            </button>
                        </div>
                    </div>
                    <div className="flex justify-between items-center border-t border-gray-100 pt-3 mt-1">
                        <span className="font-bold text-gray-900">{t('total')}</span>
                        <span className="font-bold text-primary-600 text-lg">{order.total} {t('currency')}</span>
                    </div>
                </div>

                {/* Feedback Section */}
                {['ready', 'completed'].includes(order.status) && !feedbackSubmitted && (
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
                        <h3 className="font-bold text-gray-900 mb-4">{t('rate_experience')}</h3>

                        <div className="flex justify-center gap-2 mb-4">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    onClick={() => setRating(star)}
                                    className="transition-transform hover:scale-110 focus:outline-none"
                                >
                                    <Star
                                        size={32}
                                        fill={star <= rating ? "#FCD34D" : "none"}
                                        stroke={star <= rating ? "#FCD34D" : "#D1D5DB"}
                                    />
                                </button>
                            ))}
                        </div>

                        <textarea
                            className="w-full p-3 border border-gray-200 rounded-xl mb-4 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none"
                            placeholder={t('leave_comment')}
                            rows={3}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                        />

                        <button
                            onClick={submitFeedback}
                            disabled={rating === 0}
                            className="w-full py-3 bg-primary-600 text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-700 transition-colors"
                        >
                            {t('submit_feedback')}
                        </button>
                    </div>
                )}

                {feedbackSubmitted && (
                    <div className="bg-green-50 text-green-700 p-4 rounded-xl text-center border border-green-100">
                        <p className="font-bold">{t('thank_you')}</p>
                        <p className="text-sm">{t('feedback_help_msg')}</p>
                    </div>
                )}

                <button
                    onClick={() => window.location.reload()}
                    className="w-full py-3 text-sm font-medium text-gray-500 hover:text-gray-900 flex items-center justify-center gap-2"
                >
                    <RefreshCw size={16} /> {t('tap_to_refresh')}
                </button>

            </div>
        </div>
    );
};

export default OrderStatus;
