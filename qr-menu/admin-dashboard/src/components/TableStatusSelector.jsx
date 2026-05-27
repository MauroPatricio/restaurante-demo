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
        { value: 'free', label: t('free') || 'Livre', color: '#22c55e', bgLight: '#dcfce7', icon: '✓' },
        { value: 'occupied', label: t('occupied') || 'Ocupada', color: '#ef4444', bgLight: '#fee2e2', icon: '🔴' },
        { value: 'reserved', label: t('reserved') || 'Reservada', color: '#a855f7', bgLight: '#f3e8ff', icon: '📅' },
        { value: 'cleaning', label: t('cleaning') || 'Em Limpeza', color: '#3b82f6', bgLight: '#dbeafe', icon: '🧹' },
        { value: 'closed', label: t('closed') || 'Fechada', color: '#64748b', bgLight: '#f1f5f9', icon: '🚫' }
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

            if (navigator.vibrate) navigator.vibrate(50);

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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>
                    {t('update_table_status') || 'Atualizar Estado da Mesa'}
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
                    {statuses.map((status) => {
                        const isActive = table?.status === status.value;
                        const isUpdating = updating && selectedStatus === status.value;

                        return (
                            <button
                                key={status.value}
                                onClick={() => handleStatusSelect(status.value)}
                                disabled={updating || isActive}
                                style={{
                                    position: 'relative', padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: '600',
                                    display: 'flex', alignItems: 'center', gap: '8px', border: '2px solid', transition: 'all 0.2s', cursor: (updating || isActive) ? 'not-allowed' : 'pointer',
                                    backgroundColor: isActive ? status.color : '#ffffff',
                                    color: isActive ? '#ffffff' : '#475569',
                                    borderColor: isActive ? status.color : '#e2e8f0',
                                    opacity: updating ? 0.5 : 1
                                }}
                            >
                                {isUpdating ? (
                                    <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                ) : (
                                    <span style={{ fontSize: '16px' }}>{status.icon}</span>
                                )}
                                <span>{status.label}</span>
                                {isActive && <Check size={16} style={{ marginLeft: 'auto' }} />}
                            </button>
                        );
                    })}
                </div>

                {/* Current Status Display */}
                <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '600' }}>{t('current_status') || 'Estado Atual'}:</span>
                    <span style={{ 
                        padding: '6px 12px', borderRadius: '8px', color: '#ffffff', fontSize: '13px', fontWeight: '700',
                        backgroundColor: statuses.find(s => s.value === table?.status)?.color || '#64748b' 
                    }}>
                        {statuses.find(s => s.value === table?.status)?.label || table?.status}
                    </span>
                </div>
            </div>

            {/* Reason Modal */}
            {showReasonModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                    <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', width: '100%', maxWidth: '450px', padding: '32px' }}>
                        <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '16px', margin: 0 }}>
                            {t('reason_for_change') || 'Motivo da Mudança'}
                        </h3>

                        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px', margin: '0 0 24px 0', lineHeight: 1.5 }}>
                            {t('optional_reason_description') || 'Adicione um motivo opcional para esta mudança de estado (será registado no histórico)'}
                        </p>

                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder={t('enter_reason') || 'Ex: Manutenção agendada, cliente especial, etc.'}
                            rows="4"
                            style={{
                                width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '15px',
                                outline: 'none', resize: 'none', backgroundColor: '#f8fafc', color: '#0f172a', marginBottom: '24px', boxSizing: 'border-box'
                            }}
                        />

                        <div style={{ display: 'flex', gap: '16px' }}>
                            <button
                                onClick={() => {
                                    setShowReasonModal(false);
                                    setReason('');
                                    setSelectedStatus(null);
                                }}
                                style={{ flex: 1, padding: '14px', backgroundColor: '#f1f5f9', color: '#475569', borderRadius: '12px', fontSize: '15px', fontWeight: '700', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                                <X size={18} />
                                {t('cancel') || 'Cancelar'}
                            </button>
                            <button
                                onClick={handleReasonSubmit}
                                disabled={updating}
                                style={{ flex: 1, padding: '14px', backgroundColor: '#4f46e5', color: '#ffffff', borderRadius: '12px', fontSize: '15px', fontWeight: '700', border: 'none', cursor: updating ? 'not-allowed' : 'pointer', opacity: updating ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                                {updating ? (
                                    <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
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
