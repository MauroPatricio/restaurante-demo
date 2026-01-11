import React, { useState, useEffect } from 'react';
import { X, User, Calendar, DollarSign, ShoppingBag, Clock } from 'lucide-react';
import { analyticsAPI } from '../services/api';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

export default function TableDetailsModal({ isOpen, onClose, table, restaurantId }) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && table && restaurantId) {
            fetchHistory();
        }
    }, [isOpen, table, restaurantId]);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const response = await analyticsAPI.getTableHistory(restaurantId, table._id);
            setHistory(response.data || []);
        } catch (error) {
            console.error('Failed to fetch table history:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={onClose}
            ></div>

            <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Detalhes da Unidade</div>
                        <h2 className="text-3xl font-black text-slate-800">Mesa {table?.number < 10 ? `0${table?.number}` : table?.number}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 hover:bg-white rounded-2xl text-slate-400 shadow-sm transition-all"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-8">
                    <div className="mb-8">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Clock size={20} className="text-primary" />
                            Histórico de Clientes
                        </h3>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                                <p className="mt-4 text-slate-500 font-medium">Carregando histórico...</p>
                            </div>
                        ) : history.length === 0 ? (
                            <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                                <User size={48} className="mx-auto text-slate-300 mb-3" />
                                <p className="text-slate-500 font-bold">Nenhum histórico encontrado para esta mesa.</p>
                            </div>
                        ) : (
                            <div className="overflow-hidden bg-white border border-slate-100 rounded-3xl shadow-sm">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50">
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Pedidos</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Total Gasto</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Última Visita</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {history.map((record, index) => (
                                            <tr key={index} className="hover:bg-slate-50/30 transition-colors group">
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                                            <User size={20} />
                                                        </div>
                                                        <div>
                                                            <div className="font-black text-slate-800 text-sm">{record.name || 'Visitante'}</div>
                                                            <div className="text-[11px] text-slate-400 font-bold">{record.phone}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <span className="inline-flex items-center justify-center px-3 py-1 bg-slate-100 rounded-lg text-xs font-black text-slate-600">
                                                        {record.orderCount}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <div className="font-black text-emerald-600 text-sm">
                                                        {record.totalSpent.toLocaleString()} <span className="text-[10px]">MT</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <div className="text-xs font-bold text-slate-600">
                                                        {format(new Date(record.lastVisit), "dd MMM yyyy", { locale: pt })}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 font-medium">
                                                        {formatDistanceToNow(new Date(record.lastVisit), { addSuffix: true, locale: pt })}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-slate-800 text-white font-black rounded-2xl hover:bg-slate-900 transition-all active:scale-95 shadow-lg shadow-slate-200"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
}
