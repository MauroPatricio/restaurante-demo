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
            style={{
                position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
                zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', overflowY: 'auto'
            }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div 
                style={{
                    backgroundColor: '#ffffff', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column', overflow: 'hidden',
                    margin: 'auto', flexShrink: 0
                }}
            >
                {/* Header */}
                <div style={{ backgroundColor: cfg.light, padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{
                            width: '52px', height: '52px', borderRadius: '12px', backgroundColor: cfg.bg, color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '900',
                            boxShadow: `0 8px 16px ${cfg.bg}40`
                        }}>
                            {table?.number}
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', margin: 0, lineHeight: 1 }}>
                                    {t('table', 'Table')} {table?.number}
                                </h2>
                                <span style={{ fontSize: '11px', fontWeight: '800', color: cfg.text, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {t(table?.status)}
                                </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px', fontSize: '13px', fontWeight: '600', color: '#64748b' }}>
                                {table?.location && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={14} />{table.location}</span>
                                )}
                                {table?.capacity && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Users size={14} />{table.capacity} {t('seats', 'Seats')}</span>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <button onClick={onClose} style={{
                        background: '#fff', border: '1px solid #e2e8f0', borderRadius: '50%', width: '40px', height: '40px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                    }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Create Order CTA */}
                <div style={{ padding: '24px 24px 16px 24px' }}>
                    <button
                        onClick={handleCreateOrder}
                        style={{
                            width: '100%', backgroundColor: '#4f46e5', color: '#ffffff', border: 'none', padding: '16px',
                            borderRadius: '12px', fontSize: '15px', fontWeight: '800', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 8px 16px rgba(79, 70, 229, 0.25)'
                        }}
                    >
                        <Plus size={20} strokeWidth={3} />
                        {t('create_new_order') || 'Create New Order'}
                    </button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', padding: '0 24px', borderBottom: '2px solid #f1f5f9', gap: '24px' }}>
                    {tabs.map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    flex: 1, padding: '16px 0', border: 'none', background: 'transparent', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    fontSize: '14px', fontWeight: '800', color: isActive ? '#4f46e5' : '#94a3b8',
                                    borderBottom: isActive ? '3px solid #4f46e5' : '3px solid transparent',
                                    marginBottom: '-2px', transition: 'all 0.2s'
                                }}
                            >
                                <tab.icon size={18} strokeWidth={2.5} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Tab Content (scrollable) */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px', backgroundColor: '#ffffff' }}>
                    {activeTab === 'history' && (
                        <div>
                            <p style={{
                                fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase',
                                letterSpacing: '0.05em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px'
                            }}>
                                <ArrowRight size={14} />
                                {t('tap_order_details')}
                            </p>
                            <TableOrderHistory tableId={table._id} />
                        </div>
                    )}
                    {activeTab === 'status' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <TableStatusSelector
                                table={table}
                                onStatusUpdate={handleStatusUpdate}
                            />

                            {/* Info card */}
                            <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                <h4 style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
                                    {t('table_information') || 'Informações da Mesa'}
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '14px' }}>
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
