import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { orderAPI } from '../services/api';
import { Search, Filter, CheckCircle, XCircle, FileText, Download, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Payments() {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterMethod, setFilterMethod] = useState('all');
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);

    useEffect(() => {
        if (user?.restaurant) {
            fetchOrders();
        }
    }, [user]);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await orderAPI.getAll(user.restaurant._id || user.restaurant, { limit: 100 });
            setOrders(response.data.orders || []);
        } catch (error) {
            console.error('Failed to fetch orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyParams = (order) => {
        setSelectedOrder(order);
        setShowVerifyModal(true);
    };

    const handleVerifyAction = async (approved) => {
        try {
            // Update order status/payment status
            const statusUpdate = approved ?
                { paymentStatus: 'paid', status: 'confirmed' } :
                { paymentStatus: 'failed' };

            await orderAPI.updateStatus(selectedOrder._id, statusUpdate.status, statusUpdate.paymentStatus);

            fetchOrders(); // Refresh
            setShowVerifyModal(false);
            setSelectedOrder(null);
        } catch (error) {
            alert('Failed to update payment status');
        }
    };

    const exportCSV = () => {
        const headers = ["Order ID", "Date", "Customer", "Amount", "Method", "Payment Status"];
        const rows = filteredOrders.map(o => [
            o._id,
            format(new Date(o.createdAt), 'yyyy-MM-dd HH:mm'),
            o.customerName || 'Walk-in',
            o.total,
            o.paymentMethod,
            o.paymentStatus
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "transactions.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredOrders = orders.filter(o => {
        if (filterStatus !== 'all' && o.paymentStatus !== filterStatus) return false;
        if (filterMethod !== 'all' && o.paymentMethod !== filterMethod) return false;
        return true;
    });

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px', gap: '16px', minHeight: '50vh' }}>
            <LoadingSpinner size={48} />
            <span style={{ color: '#64748b', fontSize: '14px' }}>{t('loading')}</span>
        </div>
    );

    return (
        <div className="payments-page">
            <div className="page-header">
                <div>
                    <h2>{t('payments_title')}</h2>
                    <p>{t('payments_desc')}</p>
                </div>
                <button onClick={exportCSV} className="btn-secondary">
                    <Download size={18} />
                    {t('export_csv')}
                </button>
            </div>

            {/* Filters */}
            <div className="card filters-bar" style={{ marginBottom: '20px', padding: '15px', display: 'flex', gap: '15px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>{t('status')}</label>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="all">{t('all')}</option>
                        <option value="pending">{t('pending_validation')}</option>
                        <option value="paid">{t('verified')}</option>
                    </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>{t('method')}</label>
                    <select value={filterMethod} onChange={e => setFilterMethod(e.target.value)}>
                        <option value="all">{t('all')}</option>
                        <option value="mpesa">M-Pesa</option>
                        <option value="emola">e-Mola</option>
                        <option value="pos">POS</option>
                        <option value="cash">Cash</option>
                        <option value="transfer">Bank Transfer</option>
                    </select>
                </div>
            </div>

            <div className="card table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>{t('order_id')}</th>
                            <th>{t('date')}</th>
                            <th>{t('customer')}</th>
                            <th>{t('total')}</th>
                            <th>{t('method')}</th>
                            <th>{t('status')}</th>
                            <th>{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOrders.map(order => (
                            <tr key={order._id}>
                                <td>#{order._id.slice(-6).toUpperCase()}</td>
                                <td>{format(new Date(order.createdAt), 'PP p')}</td>
                                <td>{order.customerName || 'Walk-in'}</td>
                                <td>{order.total} MT</td>
                                <td><span className="badge">{t(`method_${order.paymentMethod}`) || order.paymentMethod}</span></td>
                                <td>
                                    <span className={`status-badge ${order.paymentStatus || 'pending'}`}>
                                        {t(`status_${order.paymentStatus || 'pending'}`) || order.paymentStatus}
                                    </span>
                                </td>
                                <td>
                                    {order.paymentStatus === 'pending' && (
                                        <button
                                            onClick={() => {
                                                setSelectedOrder(order);
                                                setShowVerifyModal(true);
                                            }}
                                            className="btn-small btn-confirm"
                                            style={{
                                                background: '#10b981',
                                                color: 'white',
                                                border: 'none',
                                                padding: '6px 12px',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                fontWeight: '600'
                                            }}
                                        >
                                            <CheckCircle size={16} />
                                            {t('confirm_payment')}
                                        </button>
                                    )}
                                    {order.paymentMethod === 'transfer' && order.paymentStatus !== 'paid' && (
                                        <button onClick={() => handleVerifyParams(order)} className="btn-small">
                                            <Eye size={16} />
                                            {t('verify_receipt')}
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Verify Modal */}
            {showVerifyModal && selectedOrder && (
                <div className="modal-overlay" onClick={() => setShowVerifyModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{t('verify_receipt')} #{selectedOrder._id.slice(-6)}</h3>
                            <button onClick={() => setShowVerifyModal(false)} className="icon-btn"><XCircle size={24} /></button>
                        </div>

                        <div className="receipt-preview" style={{ margin: '20px 0', textAlign: 'center', background: '#f9f9f9', padding: '20px', borderRadius: '12px', border: '1px border #f1f5f9' }}>
                            {/* Order Details Grid */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, 1fr)',
                                gap: '16px',
                                textAlign: 'left',
                                marginBottom: '24px',
                                padding: '16px',
                                background: 'white',
                                borderRadius: '8px',
                                border: '1px solid #e2e8f0'
                            }}>
                                <div>
                                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>Hora do Pedido</div>
                                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>{format(new Date(selectedOrder.createdAt), 'PP p')}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>Mesa / Local</div>
                                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                                        {selectedOrder.orderType === 'room-service' ? `🛏️ Quarto ${selectedOrder.roomService?.roomNumber || '—'}` : `🪑 Mesa ${selectedOrder.table?.number || selectedOrder.tableNumber || '—'}`}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>Atendente</div>
                                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                                        {selectedOrder.createdByWaiter?.name || (selectedOrder.source === 'qr-menu' ? 'Cliente (QR Menu)' : 'Sistema')}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>Estado Atual</div>
                                    <div style={{ fontSize: '14px', fontWeight: '600' }}>
                                        <span className={`status-badge ${selectedOrder.status}`} style={{ margin: 0 }}>
                                            {t(`status_${selectedOrder.status}`) || selectedOrder.status}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>Cliente</div>
                                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>{selectedOrder.customerName || '—'}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>Contacto</div>
                                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>{selectedOrder.phone || '—'}</div>
                                </div>
                            </div>

                            <div style={{ marginBottom: '15px' }}>
                                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px' }}>Comprovativo</div>
                                {selectedOrder.receiptUrl ? (
                                    <img src={selectedOrder.receiptUrl} alt="Receipt" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                                ) : (
                                    <div style={{ padding: '30px', color: '#94a3b8', background: 'white', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                                        <FileText size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                                        <p style={{ fontSize: '13px' }}>Nenhuma imagem de recibo carregada</p>
                                    </div>
                                )}
                            </div>

                            <div style={{
                                marginTop: '15px',
                                padding: '12px',
                                background: '#1e293b',
                                color: 'white',
                                borderRadius: '8px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <span style={{ fontWeight: '500', fontSize: '14px' }}>Total a Confirmar:</span>
                                <span style={{ fontWeight: '800', fontSize: '18px' }}>{selectedOrder.total} MT</span>
                            </div>
                        </div>

                        <div className="modal-actions" style={{ justifyContent: 'center', gap: '15px' }}>
                            <button onClick={() => handleVerifyAction(false)} className="btn-danger">
                                <XCircle size={18} style={{ marginRight: '8px' }} />
                                {t('reject')}
                            </button>
                            <button onClick={() => handleVerifyAction(true)} className="btn-success" style={{ background: '#16a34a', color: 'white' }}>
                                <CheckCircle size={18} style={{ marginRight: '8px' }} />
                                {t('approve')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
