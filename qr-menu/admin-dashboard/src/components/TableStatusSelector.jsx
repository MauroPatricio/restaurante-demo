import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X, Loader } from 'lucide-react';
import { tableAPI } from '../services/api';
import { toast } from 'react-hot-toast';

const TableStatusSelector = ({ table, onStatusUpdate }) => {
    const { t } = useTranslation();
    const [updating, setUpdating] = useState(false);
    const [showReasonModal, setShowReasonModal] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState(null);
    const [reason, setReason] = useState('');

    const statuses = [
        { value: 'free', label: t('free') || 'Livre', color: 'bg-green-500', icon: '✓' },
        { value: 'occupied', label: t('occupied') || 'Ocupada', color: 'bg-red-500', icon: '🔴' },
        { value: 'reserved', label: t('reserved') || 'Reservada', color: 'bg-purple-500', icon: '📅' },
        { value: 'cleaning', label: t('cleaning') || 'Em Limpeza', color: 'bg-blue-500', icon: '🧹' },
        { value: 'closed', label: t('closed') || 'Fechada', color: 'bg-gray-500', icon: '🚫' }
    ];

    const handleStatusSelect = (status) => {
        if (status === table?.status) {
            toast(t('table_already_status') || 'Mesa já está neste estado', { icon: 'ℹ️' });
            return;
        }

        // For certain status changes, show reason modal
        if (status === 'closed' || status === 'cleaning') {
            setSelectedStatus(status);
            setShowReasonModal(true);
        } else {
            confirmStatusChange(status);
        }
    };

    const confirmStatusChange = async (status, reasonText = '') => {
        try {
            setUpdating(true);
            const { data } = await tableAPI.updateStatus(table._id, status, reasonText);

            toast.success(
                t('table_status_updated') || `Mesa atualizada para ${statuses.find(s => s.value === status)?.label}`,
                { icon: '✅' }
            );

            // Trigger haptic feedback if available
            if (navigator.vibrate) navigator.vibrate(50);

            // Call parent callback to refresh
            if (onStatusUpdate) {
                onStatusUpdate(data.table);
            }

            setShowReasonModal(false);
            setReason('');
            setSelectedStatus(null);
        } catch (error) {
            console.error('Failed to update table status:', error);
            toast.error(
                error.response?.data?.message || t('failed_update_status') || 'Erro ao atualizar estado',
                { icon: '❌' }
            );
        } finally {
            setUpdating(false);
        }
    };

    const handleReasonSubmit = () => {
        if (selectedStatus) {
            confirmStatusChange(selectedStatus, reason || `Changed to ${selectedStatus}`);
        }
    };

    return (
        <>
            <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-2">
                    {t('update_table_status') || 'Atualizar Estado da Mesa'}
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {statuses.map((status) => {
                        const isActive = table?.status === status.value;
                        const isUpdating = updating && selectedStatus === status.value;

                        return (
                            <button
                                key={status.value}
                                onClick={() => handleStatusSelect(status.value)}
                                disabled={updating || isActive}
                                className={`
                                    relative px-3 py-2.5 rounded-lg font-medium text-sm transition-all
                                    border-2 flex items-center justify-center gap-2
                                    ${isActive
                                        ? `${status.color} text-white border-transparent ring-2 ring-offset-2 ring-gray-300`
                                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                                    }
                                    ${updating ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
                                `}
                            >
                                {isUpdating ? (
                                    <Loader size={16} className="animate-spin" />
                                ) : (
                                    <span className="text-base">{status.icon}</span>
                                )}
                                <span>{status.label}</span>
                                {isActive && <Check size={14} className="ml-auto" />}
                            </button>
                        );
                    })}
                </div>

                {/* Current Status Display */}
                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-600 dark:text-gray-400">{t('current_status') || 'Estado Atual'}:</span>
                        <span className={`px-2 py-1 rounded-md text-white font-semibold ${statuses.find(s => s.value === table?.status)?.color || 'bg-gray-500'}`}>
                            {statuses.find(s => s.value === table?.status)?.label || table?.status}
                        </span>
                    </div>
                </div>
            </div>

            {/* Reason Modal */}
            {showReasonModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                            {t('reason_for_change') || 'Motivo da Mudança'}
                        </h3>

                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            {t('optional_reason_description') || 'Adicione um motivo opcional para esta mudança de estado (será registado no histórico)'}
                        </p>

                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder={t('enter_reason') || 'Ex: Manutenção agendada, cliente especial, etc.'}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                            rows="3"
                        />

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowReasonModal(false);
                                    setReason('');
                                    setSelectedStatus(null);
                                }}
                                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                            >
                                <X size={18} />
                                {t('cancel') || 'Cancelar'}
                            </button>
                            <button
                                onClick={handleReasonSubmit}
                                disabled={updating}
                                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {updating ? (
                                    <Loader size={18} className="animate-spin" />
                                ) : (
                                    <Check size={18} />
                                )}
                                {t('confirm') || 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default TableStatusSelector;
