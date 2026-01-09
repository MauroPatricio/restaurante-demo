import React, { useState, useEffect } from 'react';
import { X, User, Clock, CheckCircle, Coffee, MessageSquare, AlertTriangle, UserCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale/pt';
import { waiterCallAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';

export default function WaiterCallsModal({ isOpen, onClose, restaurantId }) {
    const { user } = useAuth();
    const { socket } = useSocket();
    const [calls, setCalls] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const isWaiter = user?.role?.name === 'Waiter' || user?.role === 'waiter';
    const isOwnerOrManager = ['Owner', 'Manager'].includes(user?.role?.name) || ['owner', 'manager'].includes(user?.role);

    useEffect(() => {
        if (isOpen && restaurantId) {
            fetchCalls();
        }
    }, [isOpen, restaurantId]);

    useEffect(() => {
        if (!socket || !isOpen) return;

        const handleUpdate = () => {
            fetchCalls();
        };

        socket.on('waiter:call', handleUpdate);
        socket.on('waiter:call:acknowledged', handleUpdate);
        socket.on('waiter:call:resolved', handleUpdate);

        return () => {
            socket.off('waiter:call', handleUpdate);
            socket.off('waiter:call:acknowledged', handleUpdate);
            socket.off('waiter:call:resolved', handleUpdate);
        };
    }, [socket, isOpen]);

    const fetchCalls = async () => {
        setLoading(true);
        try {
            // If waiter, we might want to filter or see all available/assigned
            // User request: "Waiter: visualiza apenas as chamadas atribuídas a si ou disponíveis."
            // For now, let's fetch all active and filter in JS for simplicity or send waiterId to API
            const waiterId = isWaiter ? user._id : null;
            const res = await waiterCallAPI.getActive(restaurantId, waiterId);
            setCalls(Array.isArray(res.data?.calls) ? res.data.calls : []);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch waiter calls:', err);
            setError('Falha ao carregar solicitações.');
        } finally {
            setLoading(false);
        }
    };

    const handleAttend = async (callId) => {
        try {
            await waiterCallAPI.resolve(callId);
            // Socket event will trigger refresh
        } catch (err) {
            console.error('Failed to attend call:', err);
            alert('Erro ao atender mesa.');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop with intense blur */}
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity duration-300"
                onClick={onClose}
            ></div>

            {/* Modal Container */}
            <div className="relative bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in slide-in-from-bottom-8 duration-500 border border-white/20">

                {/* Decorative Header Gradient */}
                <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-red-500/10 via-amber-500/5 to-transparent pointer-events-none"></div>

                {/* Header */}
                <div className="relative p-8 border-b border-slate-100/50 flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <div className="bg-gradient-to-tr from-red-500 to-amber-500 p-4 rounded-2xl text-white shadow-lg shadow-red-500/20 ring-4 ring-red-50/50">
                            <Coffee size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Solicitações Ativas</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                                <p className="text-sm font-bold text-slate-500 uppercase letter-spacing-widest">
                                    {calls.length} chamadas esperando
                                </p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 transition-all active:scale-90"
                    >
                        <X size={28} />
                    </button>
                </div>

                {/* Body */}
                <div className="max-h-[65vh] overflow-y-auto p-8 custom-scrollbar">
                    {loading && calls.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="relative">
                                <div className="h-16 w-16 rounded-full border-4 border-slate-100 border-t-red-500 animate-spin"></div>
                                <Coffee className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-500" size={24} />
                            </div>
                            <p className="mt-6 font-bold text-slate-400 text-lg">Sincronizando com as mesas...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-16 bg-amber-50/50 rounded-3xl border border-amber-100">
                            <AlertTriangle className="mx-auto text-amber-500 mb-6" size={56} />
                            <p className="text-slate-800 font-bold text-lg mb-2">{error}</p>
                            <button
                                onClick={fetchCalls}
                                className="mt-4 px-8 py-3 bg-white border-2 border-amber-200 text-amber-700 font-black rounded-2xl hover:bg-amber-100 transition-all active:scale-95"
                            >
                                Tentar novamente
                            </button>
                        </div>
                    ) : calls.length === 0 ? (
                        <div className="text-center py-24">
                            <div className="bg-gradient-to-tr from-slate-50 to-slate-100 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
                                <CheckCircle className="text-slate-300" size={48} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-700 mb-3">Tudo Sob Controle!</h3>
                            <p className="text-slate-500 font-medium max-w-xs mx-auto">Não há nenhuma chamada pendente. Seus clientes estão satisfeitos.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {calls.map((call) => (
                                <div
                                    key={call._id}
                                    className={`group relative overflow-hidden p-6 rounded-[2rem] transition-all duration-500 border-2 ${call.status === 'acknowledged'
                                        ? 'bg-blue-50/40 border-blue-200/50'
                                        : 'bg-white border-slate-100 hover:border-red-200 hover:shadow-[0_20px_40px_-12px_rgba(239,68,68,0.12)]'
                                        }`}
                                >
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="bg-slate-900 text-white px-5 py-2 rounded-2xl font-black text-lg shadow-lg shadow-slate-900/20">
                                                    Mesa {call.metadata?.tableNumber || '?'}
                                                </div>
                                                <div className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest border ${call.type === 'payment_request'
                                                    ? 'bg-amber-100 text-amber-600 border-amber-200'
                                                    : 'bg-red-100 text-red-600 border-red-200'
                                                    }`}>
                                                    {call.type === 'payment_request' ? 'PAGAMENTO' : 'CHAMADA'}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-slate-100 rounded-lg text-slate-400 group-hover:text-red-500 transition-colors">
                                                        <User size={16} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase">Cliente</span>
                                                        <span className="text-sm font-bold text-slate-700">{call.metadata?.customerName || 'Visitante'}</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-slate-100 rounded-lg text-slate-400 group-hover:text-amber-500 transition-colors">
                                                        <UserCheck size={16} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase">Solicitado</span>
                                                        <span className="text-sm font-bold text-slate-700">{call.metadata?.waiterName || 'Todos'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-4 flex items-center gap-2 text-slate-400">
                                                <Clock size={14} />
                                                <span className="text-xs font-bold uppercase tracking-wider">
                                                    Há {formatDistanceToNow(new Date(call.createdAt), { locale: pt })}
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleAttend(call._id)}
                                            className="group/btn relative overflow-hidden px-8 py-4 bg-slate-900 hover:bg-red-600 text-white rounded-2xl font-black text-sm transition-all shadow-xl hover:shadow-red-500/40 active:scale-95 flex items-center justify-center gap-3"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite]"></div>
                                            <CheckCircle size={20} className="group-hover:rotate-12 transition-transform" />
                                            <span>Atender Mesa</span>
                                        </button>
                                    </div>

                                    {call.status === 'acknowledged' && (
                                        <div className="absolute top-0 right-0 h-full w-2 bg-blue-500"></div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-8 bg-slate-50/50 backdrop-blur-sm border-t border-slate-100 flex items-center justify-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <p className="text-xs text-slate-400 font-black uppercase tracking-widest">
                        Monitoramento em Tempo Real Ativo
                    </p>
                </div>
            </div>

            <style>{`
                @keyframes shimmer {
                    100% { transform: translateX(100%); }
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #cbd5e1;
                }
            `}</style>
        </div>
    );
}
