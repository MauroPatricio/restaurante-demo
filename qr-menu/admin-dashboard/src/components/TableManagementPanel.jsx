import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { X, Plus, History, Info, Users, MapPin, ChevronRight, UtensilsCrossed, Edit, Trash2, Maximize2 } from 'lucide-react';
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
            if (data.tableId === table._id) {
                setTable(prev => ({ ...prev, status: data.status, lastStatusChange: data.timestamp }));
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
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden"
                style={{ maxHeight: 'calc(100dvh - 32px)' }}>

                {/* ── Header ── */}
                <div className={`${cfg.light} ${cfg.border} border-b px-5 py-4 flex items-center justify-between flex-shrink-0`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${cfg.bg} text-white flex items-center justify-center font-black text-lg shadow-sm`}>
                            {table?.number}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">
                                    {t('table') || 'Mesa'} {table?.number}
                                </h2>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${cfg.light} ${cfg.text}`}>
                                    {t(table?.status) || table?.status}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                {table?.location && (
                                    <span className="flex items-center gap-1"><MapPin size={11} />{table.location}</span>
                                )}
                                {table?.capacity && (
                                    <span className="flex items-center gap-1"><Users size={11} />{table.capacity} {t('seats') || 'lugares'}</span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* ── Create Order CTA ── */}
                <div className="px-5 pt-4 pb-3 flex-shrink-0">
                    <button
                        onClick={handleCreateOrder}
                        className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 px-4 rounded-xl font-bold text-sm shadow-md shadow-green-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    >
                        <Plus size={18} strokeWidth={2.5} />
                        {t('create_new_order') || 'Criar Novo Pedido'}
                    </button>
                </div>

                {/* ── Tabs ── */}
                <div className="flex border-b border-gray-100 dark:border-gray-800 mx-5 flex-shrink-0">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 text-sm font-semibold transition-colors relative
                                ${activeTab === tab.id
                                    ? 'text-primary-600 dark:text-primary-400'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                        >
                            <tab.icon size={15} />
                            {tab.label}
                            {activeTab === tab.id && (
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-full" />
                            )}
                        </button>
                    ))}
                </div>

                {/* ── Tab Content (scrollable) ── */}
                <div className="flex-1 overflow-y-auto">
                    {activeTab === 'history' && (
                        <div className="p-5">
                            <p className="text-xs text-gray-400 dark:text-gray-500 mb-3 flex items-center gap-1">
                                <ChevronRight size={12} />
                                {t('tap_order_details') || 'Toque num pedido para ver os detalhes'}
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
                            <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                                <h4 className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                                    {t('table_information') || 'Informações da Mesa'}
                                </h4>
                                <div className="space-y-2.5 text-sm">
                                    {[
                                        { label: t('table_number') || 'Número', value: `Mesa ${table.number}` },
                                        table.capacity && { label: t('capacity') || 'Capacidade', value: `${table.capacity} ${t('people') || 'pessoas'}` },
                                        table.location && { label: t('location') || 'Localização', value: table.location },
                                        table.type && { label: t('type') || 'Tipo', value: table.type },
                                    ].filter(Boolean).map(({ label, value }) => (
                                        <div key={label} className="flex justify-between items-center">
                                            <span className="text-gray-500 dark:text-gray-400">{label}</span>
                                            <span className="font-semibold text-gray-900 dark:text-white">{value}</span>
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
