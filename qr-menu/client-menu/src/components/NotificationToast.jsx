import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCircle, ChefHat, Clock, X, Info } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

const statusConfig = {
    pending: { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-50', label: 'Pendente' },
    confirmed: { icon: CheckCircle, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Confirmado' },
    preparing: { icon: ChefHat, color: 'text-purple-500', bg: 'bg-purple-50', label: 'Em Preparação' },
    ready: { icon: Bell, color: 'text-green-500', bg: 'bg-green-50', label: 'Pronto para Entrega' },
    served: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', label: 'Entregue' },
    completed: { icon: CheckCircle, color: 'text-gray-500', bg: 'bg-gray-100', label: 'Finalizado' },
    cancelled: { icon: X, color: 'text-red-500', bg: 'bg-red-50', label: 'Cancelado' },
};

export default function NotificationToast({ notification, onClose }) {
    const navigate = useNavigate();
    const { restaurantId } = useParams();

    if (!notification) return null;

    const { orderId, status, message } = notification;
    const config = statusConfig[status] || { icon: Info, color: 'text-primary-500', bg: 'bg-primary-50', label: status };
    const Icon = config.icon;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -100, x: '-50%' }}
                animate={{ opacity: 1, y: 20, x: '-50%' }}
                exit={{ opacity: 0, scale: 0.95, y: -20, x: '-50%' }}
                className="fixed top-0 left-1/2 -translate-x-1/2 z-[9999] w-[90%] max-w-sm"
            >
                <div
                    onClick={() => {
                        if (orderId && restaurantId) navigate(`/menu/${restaurantId}/status/${orderId}`);
                        onClose();
                    }}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-4 cursor-pointer active:scale-95 transition-all overflow-hidden relative"
                >
                    {/* Progress pulse bar */}
                    <motion.div
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 5, ease: 'linear' }}
                        className={`absolute bottom-0 left-0 h-1 ${config.bg.replace('bg-', 'bg-')}`}
                        style={{ backgroundColor: 'currentColor', opacity: 0.2 }}
                    />

                    <div className="flex gap-4 items-start">
                        <div className={`p-3 rounded-xl ${config.bg} ${config.color}`}>
                            <Icon size={24} />
                        </div>
                        <div className="flex-1 pr-6">
                            <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                                Atualização do Pedido #{orderId?.slice(-6).toUpperCase()}
                            </h4>
                            <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 leading-relaxed">
                                {message || `Seu pedido está agora: ${config.label}`}
                            </p>
                            <div className="mt-2 text-[10px] font-bold text-primary-600 uppercase tracking-wider">
                                Toque para ver detalhes
                            </div>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                            }}
                            className="text-gray-400 hover:text-gray-600 p-1"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
