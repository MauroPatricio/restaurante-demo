import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { accountingAPI } from '../services/api';
import {
    Search, Filter, Printer, XCircle, Eye,
    ArrowLeft, Calendar, Download, ShieldCheck,
    Hash, AlertTriangle, CheckCircle, Info, FileText
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

export default function FiscalInvoices() {
    const { t } = useTranslation();
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [showVoidModal, setShowVoidModal] = useState(false);
    const [voidReason, setVoidReason] = useState('');
    const [voiding, setVoiding] = useState(false);

    useEffect(() => {
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const res = await accountingAPI.getInvoices();
            setInvoices(res.data.invoices);
        } catch (error) {
            console.error('Failed to fetch invoices:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleVoid = async () => {
        if (!voidReason) return alert(t('void_reason_required'));
        try {
            setVoiding(true);
            await accountingAPI.voidInvoice(selectedInvoice._id, voidReason);
            setShowVoidModal(false);
            setVoidReason('');
            fetchInvoices();
            alert(t('void_success'));
        } catch (error) {
            alert(error.response?.data?.error || t('error_generic'));
        } finally {
            setVoiding(false);
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'active': return { bg: '#ecfdf5', text: '#10b981', label: t('status_active') };
            case 'voided': return { bg: '#fef2f2', text: '#ef4444', label: t('status_voided') };
            case 'rectified': return { bg: '#eff6ff', text: '#3b82f6', label: t('status_rectified') };
            default: return { bg: '#f8fafc', text: '#64748b', label: status };
        }
    };

    if (loading) return <div className="p-12"><LoadingSpinner /></div>;

    const filteredInvoices = invoices.filter(inv =>
        inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ padding: '32px' }}>
            {/* Header */}
            <div style={{ marginBottom: '48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', margin: 0 }}>{t('fiscal_invoices')}</h2>
                    <p style={{ color: '#94a3b8', fontWeight: '700' }}>{t('fiscal_invoices_subtitle')}</p>
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <Search style={{ position: 'absolute', left: '16px', color: '#94a3b8' }} size={18} />
                        <input
                            type="text"
                            placeholder={t('search_invoices_placeholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                padding: '12px 16px 12px 48px', borderRadius: '16px', border: '1px solid #e2e8f0',
                                width: '300px', outline: 'none', fontWeight: '600'
                            }}
                        />
                    </div>
                    <button style={{ padding: '12px 24px', borderRadius: '16px', background: 'white', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800' }}>
                        <Filter size={18} /> {t('filters')}
                    </button>
                </div>
            </div>

            {/* Table */}
            <div style={{ background: 'white', borderRadius: '32px', border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                        <tr>
                            <th style={{ padding: '20px 24px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>{t('date')}</th>
                            <th style={{ padding: '20px 24px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>{t('invoice_number_col')}</th>
                            <th style={{ padding: '20px 24px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>{t('client_col')}</th>
                            <th style={{ padding: '20px 24px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>{t('total')}</th>
                            <th style={{ padding: '20px 24px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>{t('state_col')}</th>
                            <th style={{ padding: '20px 24px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>{t('actions_col')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredInvoices.map((inv) => {
                            const status = getStatusStyle(inv.status);
                            return (
                                <tr key={inv._id} style={{ borderBottom: '1px solid #f1f5f9' }} className="hover:bg-slate-50 transition-colors">
                                    <td style={{ padding: '20px 24px', fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>
                                        {new Date(inv.createdAt).toLocaleDateString()}
                                    </td>
                                    <td style={{ padding: '20px 24px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <FileText size={16} style={{ color: '#6366f1' }} />
                                            <span style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>{inv.invoiceNumber}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '20px 24px' }}>
                                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#475569' }}>{inv.customerName || t('final_consumer')}</span>
                                        {inv.customerNUIT && <div style={{ fontSize: '11px', color: '#94a3b8' }}>NUIT: {inv.customerNUIT}</div>}
                                    </td>
                                    <td style={{ padding: '20px 24px', fontSize: '14px', fontWeight: '900', color: '#0f172a' }}>
                                        {inv.total?.toLocaleString()} MT
                                    </td>
                                    <td style={{ padding: '20px 24px' }}>
                                        <span style={{
                                            padding: '6px 14px', borderRadius: '10px', fontSize: '11px', fontWeight: '900',
                                            background: status.bg, color: status.text
                                        }}>
                                            {status.label}
                                        </span>
                                    </td>
                                    <td style={{ padding: '20px 24px' }}>
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <button
                                                onClick={() => setSelectedInvoice(inv)}
                                                style={{ padding: '8px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', color: '#64748b' }}
                                                className="hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedInvoice(inv);
                                                    setTimeout(() => window.print(), 100);
                                                }}
                                                style={{ padding: '8px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', color: '#64748b' }}
                                                className="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                                            >
                                                <Printer size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Sidebar Detalhe da Fatura */}
            {selectedInvoice && (
                <div style={{
                    position: 'fixed', top: 0, right: 0, width: '500px', height: '100vh',
                    background: 'white', boxShadow: '-20px 0 60px rgba(0,0,0,0.1)', zIndex: 1000,
                    display: 'flex', flexDirection: 'column', animation: 'slideIn 0.4s ease'
                }}>
                    <div style={{ padding: '32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <span style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('document_details_title')}</span>
                            <h3 style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', margin: '4px 0' }}>{selectedInvoice.invoiceNumber}</h3>
                        </div>
                        <button
                            onClick={() => setSelectedInvoice(null)}
                            style={{ padding: '12px', borderRadius: '16px', background: '#f8fafc', border: 'none', cursor: 'pointer' }}
                        >
                            <ArrowLeft size={20} />
                        </button>
                    </div>

                    <div id="print-area" style={{ padding: '32px', flex: 1, overflowY: 'auto' }}>
                        {/* Status Alert for Voided */}
                        {selectedInvoice.status === 'voided' && (
                            <div style={{ padding: '20px', borderRadius: '20px', background: '#fef2f2', border: '1px solid #fee2e2', marginBottom: '32px', display: 'flex', gap: '16px' }}>
                                <AlertTriangle style={{ color: '#ef4444', flexShrink: 0 }} />
                                <div>
                                    <p style={{ fontSize: '14px', fontWeight: '800', color: '#991b1b', margin: 0 }}>{t('voided_invoice_alert')}</p>
                                    <p style={{ fontSize: '12px', color: '#b91c1c', marginTop: '4px' }}>{t('void_reason_label')}{selectedInvoice.voidReason}</p>
                                </div>
                            </div>
                        )}

                        {/* Fiscal Integrity Box */}
                        <div style={{ padding: '24px', borderRadius: '24px', background: '#f8fafc', border: '1px solid #f1f5f9', marginBottom: '32px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                <ShieldCheck size={20} style={{ color: '#10b981' }} />
                                <span style={{ fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', color: '#10b981' }}>{t('fiscal_integrity_verified')}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>{t('hash_label')}</label>
                                    <div style={{ fontSize: '11px', color: '#475569', wordBreak: 'break-all', fontFamily: 'monospace', marginTop: '4px', background: 'white', padding: '8px', borderRadius: '8px' }}>
                                        {selectedInvoice.hash}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '16px' }}>
                                    <div>
                                        <label style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>{t('series_label')}</label>
                                        <div style={{ fontSize: '14px', fontWeight: '700' }}>{selectedInvoice.series}</div>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>{t('sequence_label')}</label>
                                        <div style={{ fontSize: '14px', fontWeight: '700' }}>{selectedInvoice.sequence}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Content Placeholder */}
                        <div style={{ padding: '24px', border: '1px solid #f1f5f9', borderRadius: '24px', marginBottom: '32px' }}>
                            <h4 style={{ fontSize: '14px', fontWeight: '800', marginBottom: '16px' }}>{t('invoice_items_title')}</h4>
                            {selectedInvoice.items?.map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
                                    <span style={{ fontSize: '13px' }}>{item.quantity}x {item.name}</span>
                                    <span style={{ fontSize: '13px', fontWeight: '700' }}>{item.price * item.quantity} MT</span>
                                </div>
                            ))}
                            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '2px solid #f8fafc', display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: '900' }}>{t('TOTAL')}</span>
                                <span style={{ fontWeight: '900', color: '#6366f1' }}>{selectedInvoice.total} MT</span>
                            </div>
                        </div>

                        {/* Actions */}
                        {selectedInvoice.status !== 'voided' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <button
                                    onClick={() => window.print()}
                                    style={{
                                        width: '100%', padding: '16px', borderRadius: '18px', background: '#e0e7ff',
                                        color: '#4f46e5', fontWeight: '800', border: 'none', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                    }}
                                >
                                    <Printer size={20} /> {t('print_invoice_btn')}
                                </button>
                                <button
                                    onClick={() => setShowVoidModal(true)}
                                    style={{
                                        width: '100%', padding: '16px', borderRadius: '18px', background: '#fef2f2',
                                        color: '#ef4444', fontWeight: '800', border: 'none', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                    }}
                                >
                                    <XCircle size={20} /> {t('void_invoice_btn')}
                                </button>
                            </div>
                        )}

                        <style>{`
                            @media print {
                                body * { visibility: hidden; }
                                #print-area, #print-area * { visibility: visible; }
                                #print-area { position: absolute; left: 0; top: 0; width: 100%; }
                                .no-print { display: none !important; }
                            }
                        `}</style>
                    </div>
                </div>
            )}

            {/* Void Modal */}
            {showVoidModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', padding: '40px', borderRadius: '32px', width: '500px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '16px' }}>{t('void_invoice_modal_title')}</h3>
                        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
                            {t('void_invoice_modal_desc')}
                        </p>
                        <textarea
                            placeholder={t('void_reason_placeholder')}
                            value={voidReason}
                            onChange={(e) => setVoidReason(e.target.value)}
                            style={{ width: '100%', height: '100px', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '24px', outline: 'none', resize: 'none' }}
                        />
                        <div style={{ display: 'flex', gap: '16px' }}>
                            <button
                                onClick={() => setShowVoidModal(false)}
                                style={{ flex: 1, padding: '14px', borderRadius: '16px', background: '#f1f5f9', color: '#64748b', fontWeight: '800', border: 'none', cursor: 'pointer' }}
                            >
                                {t('cancel')}
                            </button>
                            <button
                                onClick={handleVoid}
                                disabled={voiding}
                                style={{ flex: 1, padding: '14px', borderRadius: '16px', background: '#ef4444', color: 'white', fontWeight: '800', border: 'none', cursor: 'pointer' }}
                            >
                                {voiding ? <LoadingSpinner size="sm" /> : t('confirm_void_btn')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
