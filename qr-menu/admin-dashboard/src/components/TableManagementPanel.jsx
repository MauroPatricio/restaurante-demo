import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale/pt';
import { X, Plus, History, Info, Users, MapPin, ChevronRight, ArrowRight, UtensilsCrossed, Edit, Trash2, Maximize2, Clock } from 'lucide-react';
import TableOrderHistory from './TableOrderHistory';
import TableStatusSelector from './TableStatusSelector';
import { tableAPI } from '../services/api';
import { useSocket } from '../contexts/SocketContext';

const TableManagementPanel = ({ table: initialTable, onClose }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { socket } = useSocket();
    const [activeTab, setActiveTab] = useState('history');
    const [table, setTable] = useState(initialTable);

    useEffect(() => {
        if (!socket || !table?._id) return;

        const handleTableStatusUpdate = (data) => {
            const incomingTableId = data.table?._id || data.tableId;
            if (incomingTableId === table._id) {
                setTable(prev => ({ 
                    ...prev, 
                    ...(data.table || {}),
                    status: data.table?.status || data.status, 
                    lastStatusChange: data.timestamp 
                }));
            }
        };

        socket.on('table:status-updated', handleTableStatusUpdate);
        socket.on('table:update', handleTableStatusUpdate);

        return () => {
            socket.off('table:status-updated', handleTableStatusUpdate);
            socket.off('table:update', handleTableStatusUpdate);
        };
    }, [socket, table?._id]);

    const handleStatusUpdate = async (updatedTable) => {
        setTable(updatedTable);
        try {
            const { data } = await tableAPI.get(table._id);
            setTable(data.table);
        } catch (error) {
            console.error('Failed to refresh table:', error);
        }
    };

    const handleCreateOrder = () => {
        navigate(`/dashboard/waiter/order/${table._id}`);
        onClose();
    };

    const statusConfig = {
        free: { bg: 'bg-green-500', light: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800' },
        occupied: { bg: 'bg-red-500', light: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800' },
        reserved: { bg: 'bg-purple-500', light: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
        cleaning: { bg: 'bg-blue-500', light: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
    };
    const cfg = statusConfig[table?.status] || statusConfig.free;

    const tabs = [
        { id: 'history', icon: History, label: t('order_history') || 'Histórico' },
        { id: 'status', icon: Info, label: t('table_status') || 'Estado' },
    ];

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-50 flex flex-col items-center p-4 sm:p-6 overflow-y-auto animate-fade-in-fast"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="glass-panel rounded-3xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-slide-up-fast my-auto"
                style={{ maxHeight: '90vh', background: 'var(--surface)', flexShrink: 0 }}>

                {/* ── Header ── */}
                <div className={`${cfg.light} px-5 py-3 flex items-center justify-between flex-shrink-0 border-b border-white/20`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg ${cfg.bg} text-white flex items-center justify-center font-black text-base shadow-lg`}>
                            {table?.number}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-900 text-gray-900 dark:text-white tracking-tight">
                                    {t('table') || 'Mesa'} {table?.number}
                                </h2>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-900 uppercase tracking-wider ${cfg.light} ${cfg.text}`}>
                                    {t(table?.status) || table?.status}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                                {table?.location && (
                                    <span className="flex items-center gap-1"><MapPin size={12} />{table.location}</span>
                                )}
                                {table?.capacity && (
                                    <span className="flex items-center gap-1"><Users size={12} />{table.capacity} {t('seats')}</span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* ── Create Order CTA ── */}
                <div className="px-5 pt-3 pb-2 flex-shrink-0">
                    <button
                        onClick={handleCreateOrder}
                        className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2.5 px-5 rounded-xl font-800 text-sm shadow-premium flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    >
                        <Plus size={20} strokeWidth={3} />
                        {t('create_new_order') || 'Criar Novo Pedido'}
                    </button>
                </div>

                {/* ── Tabs ── */}
                <div className="flex border-b border-gray-100 dark:border-gray-800 mx-6 flex-shrink-0">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-4 px-4 flex items-center justify-center gap-2 text-sm font-bold transition-all relative
                                ${activeTab === tab.id
                                    ? 'text-primary-600'
                                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                        >
                            <tab.icon size={18} strokeWidth={2.5} />
                            {tab.label}
                            {activeTab === tab.id && (
                                <span className="absolute bottom-0 left-0 right-0 h-1 bg-primary-600 rounded-full" />
                            )}
                        </button>
                    ))}
                </div>

                {/* ── Tab Content (scrollable) ── */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {activeTab === 'history' && (
                        <div className="p-5">
                            <p className="text-[10px] font-700 text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <ArrowRight size={12} />
                                {t('tap_order_details')}
                            </p>
                            <TableOrderHistory tableId={table._id} />
                        </div>
                    )}

                    {activeTab === 'status' && (
                        <div className="p-5 space-y-5">
                            <TableStatusSelector
                                table={table}
                                onStatusUpdate={handleStatusUpdate}
                            />

                            {/* Info card */}
                            <div className="glass-card p-5">
                                <h4 className="text-[10px] font-900 text-gray-400 uppercase tracking-widest mb-4">
                                    {t('table_information') || 'Informações da Mesa'}
                                </h4>
                                <div className="space-y-3.5 text-sm">
                                    {[
                                        { label: t('table_number'), value: `Mesa ${table.number}` },
                                        table.status === 'occupied' && { label: t('occupation_time', 'Tempo de Ocupação'), value: (table.lastStatusChange || table.updatedAt) ? formatDistanceToNow(new Date(table.lastStatusChange || table.updatedAt), { locale: pt }) : '-' },
                                        table.capacity && { label: t('capacity'), value: `${table.capacity} ${t('people')}` },
                                        table.location && { label: t('location'), value: table.location },
                                        table.type && { label: t('type'), value: table.type },
                                    ].filter(Boolean).map(({ label, value }) => (
                                        <div key={label} className="flex justify-between items-center">
                                            <span className="font-600 text-gray-500">{label}</span>
                                            <span className="font-800 text-gray-900 dark:text-white">{value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TableManagementPanel;
