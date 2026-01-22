import React, { useRef, useState } from 'react';
import { X, Printer, Download, Share2, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { analyticsAPI } from '../services/api';
// We'll use a simple window.print approach for now, focusing on CSS print media queries

const ReceiptModal = ({ order, onClose }) => {
    const { t } = useTranslation();
    const [sending, setSending] = useState(false);
    const receiptRef = useRef();

    if (!order) return null;

    const handlePrint = async () => {
        // Log print action
        try {
            await analyticsAPI.generateReceipt(order._id, { type: 'print' });
        } catch (e) { console.error('Log error', e); }

        window.print();
    };

    const handleWhatsApp = async () => {
        try {
            await analyticsAPI.generateReceipt(order._id, { type: 'whatsapp' });

            await analyticsAPI.generateReceipt(order._id, { type: 'whatsapp' });

            const text = `${t('receipt_title', { context: 'whatsapp' }) || 'Recibo Pedido'} #${order.orderNumber || order._id.toString().slice(-6)}\n${t('total')}: ${new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(order.total)}`;
            const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
            window.open(url, '_blank');
        } catch (e) { console.error('Log error', e); }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} className="receipt-modal-overlay">
            <div style={{
                background: 'white', borderRadius: '12px',
                width: '100%', maxWidth: '400px',
                maxHeight: '90vh', overflowY: 'auto',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}>
                {/* Header Actions */}
                <div style={{
                    padding: '16px', borderBottom: '1px solid #e2e8f0',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }} className="no-print">
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>{t('receipt_preview') || 'Recibo'}</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <X size={20} color="#64748b" />
                    </button>
                </div>

                {/* Receipt Content - optimize for 80mm or standard receipt paper */}
                <div ref={receiptRef} className="receipt-content" style={{ padding: '20px', fontFamily: '"Courier New", Courier, monospace', fontSize: '14px', lineHeight: '1.4' }}>
                    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 5px 0' }}>{order.restaurant?.name || 'Restaurante'}</h2>
                        <p style={{ margin: 0, fontSize: '12px' }}>{order.restaurant?.address?.street || order.restaurant?.address}</p>
                        <p style={{ margin: 0, fontSize: '12px' }}>{order.restaurant?.phone}</p>
                    </div>

                    <div style={{ borderBottom: '1px dashed #000', paddingBottom: '10px', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>{t('date')}:</span>
                            <span>{new Date(order.createdAt).toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>{t('order_id')}:</span>
                            <span>{order.orderNumber || order._id.toString().slice(-6).toUpperCase()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>{t('table')}:</span>
                            <span>{order.tableNumber}</span>
                        </div>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #000' }}>
                                <th style={{ textAlign: 'left', padding: '5px 0' }}>{t('qty')}</th>
                                <th style={{ textAlign: 'left', padding: '5px 0' }}>{t('item')}</th>
                                <th style={{ textAlign: 'right', padding: '5px 0' }}>{t('total')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {order.items?.map((item, idx) => (
                                <tr key={idx}>
                                    <td style={{ padding: '5px 0', verticalAlign: 'top' }}>{item.qty}x</td>
                                    <td style={{ padding: '5px 0' }}>{item.item?.name || 'Item'}</td>
                                    <td style={{ padding: '5px 0', textAlign: 'right' }}>
                                        {new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(item.subtotal || 0)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div style={{ borderTop: '1px dashed #000', paddingTop: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '16px' }}>
                            <span>TOTAL:</span>
                            <span>{new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(order.total)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '5px' }}>
                            <span>{t('payment_label')}:</span>
                            <span style={{ textTransform: 'uppercase' }}>{order.paymentMethod}</span>
                        </div>
                    </div>

                    <div style={{ textAlign: 'center', marginTop: '30px', fontSize: '12px' }}>
                        <p>{t('receipt_thanks') || 'Obrigado pela preferência!'}</p>
                        <p>{t('receipt_come_back') || 'Volte sempre!'}</p>
                    </div>
                </div>

                {/* Footer Tools */}
                <div style={{
                    padding: '16px', borderTop: '1px solid #e2e8f0', background: '#f8fafc',
                    display: 'flex', gap: '10px', justifyContent: 'center'
                }} className="no-print">
                    <button onClick={handlePrint} className="btn-secondary" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <Printer size={18} />
                        {t('print')}
                    </button>
                    <button onClick={handleWhatsApp} className="btn-secondary" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <Share2 size={18} />
                        WhatsApp
                    </button>
                    {/* Placeholder for Download/Email */}
                </div>
            </div>

            <style>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .receipt-modal-overlay, .receipt-modal-overlay * {
                        visibility: visible;
                    }
                    .receipt-modal-overlay {
                        position: absolute;
                        left: 0;
                        top: 0;
                        background: white;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .receipt-content {
                        width: 100%;
                        max-width: none;
                        padding: 0;
                        box-shadow: none;
                    }
                }
            `}</style>
        </div>
    );
};

export default ReceiptModal;
