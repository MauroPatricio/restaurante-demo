import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { X, Plus, History, Info, Users, MapPin } from 'lucide-react';
import TableOrderHistory from './TableOrderHistory';
import TableStatusSelector from './TableStatusSelector';
import { tableAPI } from '../services/api';
import { useSocket } from '../contexts/SocketContext';

const TableManagementPanel = ({ table: initialTable, onClose }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { socket } = useSocket();
    const [activeTab, setActiveTab] = useState('history'); // 'history' or 'status' or 'info'
    const [table, setTable] = useState(initialTable);

    // Socket.IO real-time updates for table status
    useEffect(() => {
        if (!socket || !table?._id) return;

        const handleTableStatusUpdate = (data) => {
            if (data.tableId === table._id) {
                // Update local table state
                setTable(prev => ({
                    ...prev,
                    status: data.status,
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

    // Refresh table data when status updates
    const handleStatusUpdate = async (updatedTable) => {
        setTable(updatedTable);
        // Could also refresh from API if needed
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

    const getStatusColor = (status) => {
        const colors = {
            free: 'bg-green-500',
            occupied: 'bg-red-500',
            reserved: 'bg-purple-500',
            cleaning: 'bg-blue-500',
            closed: 'bg-gray-500'
        };
        return colors[status] || 'bg-gray-500';
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-6 text-white">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h2 className="text-2xl font-bold">
                                    {t('table') || 'Mesa'} {table?.number}
                                </h2>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(table?.status)} text-white shadow-lg`}>
                                    {t(table?.status) || table?.status}
                                </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-primary-100">
                                {table?.location && (
                                    <div className="flex items-center gap-1">
                                        <MapPin size={14} />
                                        <span>{table.location}</span>
                                    </div>
                                )}
                                {table?.capacity && (
                                    <div className="flex items-center gap-1">
                                        <Users size={14} />
                                        <span>{table.capacity} {t('seats') || 'lugares'}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-full transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <button
                        onClick={handleCreateOrder}
                        className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-3 px-4 rounded-xl font-bold shadow-lg shadow-green-500/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <Plus size={20} strokeWidth={2.5} />
                        {t('create_new_order') || 'Criar Novo Pedido'}
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 py-3 px-4 font-semibold text-sm transition-colors relative ${activeTab === 'history'
                            ? 'text-primary-600 dark:text-primary-400'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                            }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <History size={18} />
                            <span>{t('order_history') || 'Histórico de Pedidos'}</span>
                        </div>
                        {activeTab === 'history' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('status')}
                        className={`flex-1 py-3 px-4 font-semibold text-sm transition-colors relative ${activeTab === 'status'
                            ? 'text-primary-600 dark:text-primary-400'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                            }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <Info size={18} />
                            <span>{t('table_status') || 'Estado da Mesa'}</span>
                        </div>
                        {activeTab === 'status' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400" />
                        )}
                    </button>
                </div>

                {/* Tab switching with instant transition */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'history' && (
                        <div>
                            <TableOrderHistory tableId={table._id} />
                        </div>
                    )}

                    {activeTab === 'status' && (
                        <div>
                            <TableStatusSelector
                                table={table}
                                onStatusUpdate={handleStatusUpdate}
                            />

                            {/* Table Info */}
                            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
                                <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-3">
                                    {t('table_information') || 'Informações da Mesa'}
                                </h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">{t('table_number') || 'Número'}</span>
                                        <span className="font-semibold text-gray-900 dark:text-white">{table.number}</span>
                                    </div>
                                    {table.capacity && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">{t('capacity') || 'Capacidade'}</span>
                                            <span className="font-semibold text-gray-900 dark:text-white">{table.capacity} {t('people') || 'pessoas'}</span>
                                        </div>
                                    )}
                                    {table.location && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">{t('location') || 'Localização'}</span>
                                            <span className="font-semibold text-gray-900 dark:text-white">{table.location}</span>
                                        </div>
                                    )}
                                    {table.type && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">{t('type') || 'Tipo'}</span>
                                            <span className="font-semibold text-gray-900 dark:text-white">{table.type}</span>
                                        </div>
                                    )}
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
