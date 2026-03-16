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
        <div className="payments-page p-4 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1">{t('payments_title')}</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">{t('payments_desc')}</p>
                </div>
                <button onClick={exportCSV} className="btn-secondary self-start md:self-auto shadow-sm">
                    <Download size={18} />
                    {t('export_csv')}
                </button>
            </div>

            {/* Filters - Scrollable/Stacked on Mobile */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
                <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[140px]">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{t('status')}</label>
                        <select 
                            value={filterStatus} 
                            onChange={e => setFilterStatus(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary-500 transition-all cursor-pointer"
                        >
                            <option value="all">{t('all')}</option>
                            <option value="pending">{t('pending_validation')}</option>
                            <option value="paid">{t('verified')}</option>
                        </select>
                    </div>
                    <div className="flex-1 min-w-[140px]">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{t('method')}</label>
                        <select 
                            value={filterMethod} 
                            onChange={e => setFilterMethod(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary-500 transition-all cursor-pointer"
                        >
                            <option value="all">{t('all')}</option>
                            <option value="mpesa">M-Pesa</option>
                            <option value="emola">e-Mola</option>
                            <option value="pos">{t('method_pos')}</option>
                            <option value="visa">{t('method_visa')}</option>
                            <option value="mastercard">{t('method_mastercard')}</option>
                            <option value="cash">{t('method_cash')}</option>
                            <option value="transfer">{t('method_transfer')}</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="w-full">
                {/* Desktop View */}
                <div className="hidden lg:block bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900/50 border-bottom border-gray-100 dark:border-gray-700">
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">{t('order_id')}</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">{t('date')}</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">{t('customer')}</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">{t('total')}</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">{t('method')}</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">{t('status')}</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filteredOrders.map(order => (
                                <tr key={order._id} className="group hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors">
                                    <td className="px-6 py-4 font-mono text-xs font-bold text-gray-500">#{order._id.slice(-6).toUpperCase()}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-600 dark:text-gray-300">
                                        {format(new Date(order.createdAt), 'PP p')}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">{order.customerName || 'Walk-in'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-black text-gray-900 dark:text-white">{order.total} MT</td>
                                    <td className="px-6 py-4">
                                        <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold text-[10px] rounded-lg uppercase tracking-wider">
                                            {t(`method_${(order.paymentMethod || '').toLowerCase()}`) || order.paymentMethod}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`status-badge ${order.paymentStatus || 'pending'}`}>
                                            {t(`status_${(order.paymentStatus || 'pending').toLowerCase()}`) || order.paymentStatus}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            {order.paymentStatus === 'pending' && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedOrder(order);
                                                        setShowVerifyModal(true);
                                                    }}
                                                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-emerald-700 shadow-md transition-all active:scale-95"
                                                >
                                                    <CheckCircle size={16} />
                                                    {t('confirm_payment')}
                                                </button>
                                            )}
                                            {order.paymentMethod === 'transfer' && order.paymentStatus !== 'paid' && (
                                                <button 
                                                    onClick={() => handleVerifyParams(order)}
                                                    className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-lg hover:text-primary-600 transition-colors"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile/Tablet View (Cards) */}
                <div className="lg:hidden space-y-4">
                    {filteredOrders.map(order => (
                        <div key={order._id} className="bg-white dark:bg-gray-800 p-5 rounded-[28px] shadow-sm border-2 border-gray-100 dark:border-gray-700">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-gray-400 tracking-[0.2em] mb-1 uppercase">TXN-#{order._id.slice(-6).toUpperCase()}</span>
                                    <h3 className="text-base font-black text-gray-900 dark:text-white uppercase leading-tight">{order.customerName || 'Walk-in'}</h3>
                                    <span className="text-xs font-bold text-gray-400 mt-0.5">{format(new Date(order.createdAt), 'dd MMM, HH:mm')}</span>
                                </div>
                                <span className={`status-badge ${order.paymentStatus || 'pending'}`}>
                                    {t(`status_${(order.paymentStatus || 'pending').toLowerCase()}`) || order.paymentStatus}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 py-4 border-y border-dashed border-gray-100 dark:border-gray-700 mb-5">
                                <div>
                                    <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1.5">{t('method')}</span>
                                    <span className="px-3 py-1 bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-300 font-bold text-[10px] rounded-lg border border-gray-100 dark:border-gray-700 uppercase tracking-wider">
                                        {t(`method_${(order.paymentMethod || '').toLowerCase()}`) || order.paymentMethod}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1.5">{t('total')}</span>
                                    <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 leading-none">{order.total} MT</span>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                {order.paymentStatus === 'pending' && (
                                    <button
                                        onClick={() => {
                                            setSelectedOrder(order);
                                            setShowVerifyModal(true);
                                        }}
                                        className="h-12 flex-1 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                                    >
                                        <CheckCircle size={18} />
                                        {t('confirm_payment')}
                                    </button>
                                )}
                                {order.paymentMethod === 'transfer' && order.paymentStatus !== 'paid' && (
                                    <button 
                                        onClick={() => handleVerifyParams(order)}
                                        className="h-12 px-6 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 active:scale-95 transition-all"
                                    >
                                        <Eye size={18} />
                                        {t('verify_receipt')}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {filteredOrders.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-800 rounded-[32px] border-2 border-dashed border-gray-100 dark:border-gray-700">
                        <FileText size={48} className="text-gray-200 mb-4" />
                        <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-xs">{t('no_orders_found')}</p>
                    </div>
                )}
            </div>

            {/* Verify Modal */}
            {showVerifyModal && selectedOrder && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] p-4 flex items-center justify-center overflow-y-auto" onClick={() => setShowVerifyModal(false)}>
                    <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl transition-all scale-100" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                            <div>
                                <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">{t('verify_receipt')}</h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">#{selectedOrder._id.slice(-6).toUpperCase()}</p>
                            </div>
                            <button onClick={() => setShowVerifyModal(false)} className="h-10 w-10 flex items-center justify-center bg-white dark:bg-gray-800 rounded-xl text-gray-400 hover:text-gray-600 transition-colors shadow-sm">
                                <XCircle size={24} />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                                    <span className="block text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1.5">{t('date')}</span>
                                    <span className="text-xs font-bold text-gray-900 dark:text-white leading-tight">{format(new Date(selectedOrder.createdAt), 'PP p')}</span>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                                    <span className="block text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1.5">{t('table_label')}</span>
                                    <span className="text-xs font-bold text-gray-900 dark:text-white leading-tight text-primary-600 dark:text-primary-400">
                                        {selectedOrder.orderType === 'room-service' ? `🛏️ ${selectedOrder.roomService?.roomNumber}` : `🪑 ${selectedOrder.table?.number || selectedOrder.tableNumber || '-'}`}
                                    </span>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                                    <span className="block text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1.5">{t('customer')}</span>
                                    <span className="text-xs font-bold text-gray-900 dark:text-white leading-tight">{selectedOrder.customerName || '-'}</span>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                                    <span className="block text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1.5">{t('status')}</span>
                                    <span className={`status-badge !text-[9px] !py-0.5 !px-2 ${selectedOrder.status}`}>
                                        {t(`status_${selectedOrder.status}`) || selectedOrder.status}
                                    </span>
                                </div>
                            </div>

                            <div className="mb-6 space-y-2">
                                <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Comprovativo</span>
                                {selectedOrder.receiptUrl ? (
                                    <div className="relative group">
                                        <img src={selectedOrder.receiptUrl} alt="Receipt" className="w-full h-auto max-h-[400px] object-contain rounded-2xl border-4 border-gray-50 dark:border-gray-900 shadow-md" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl">
                                            <a href={selectedOrder.receiptUrl} target="_blank" rel="noreferrer" className="bg-white text-gray-900 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest">Ver Tamanho Real</a>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                                        <div className="h-12 w-12 flex items-center justify-center bg-white dark:bg-gray-800 rounded-full text-gray-300 shadow-sm mb-3">
                                            <FileText size={24} />
                                        </div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{t('no_receipt_image') || 'Nenhuma imagem enviada'}</p>
                                    </div>
                                )}
                            </div>

                            <div className="p-5 bg-emerald-600 dark:bg-emerald-500 rounded-[24px] text-white flex justify-between items-center shadow-lg shadow-emerald-500/20">
                                <span className="font-bold text-xs uppercase tracking-widest opacity-80">Total a Confirmar</span>
                                <span className="text-2xl font-black">{selectedOrder.total} MT</span>
                            </div>
                        </div>

                        <div className="p-6 bg-gray-50/50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button 
                                onClick={() => handleVerifyAction(false)} 
                                className="h-14 flex items-center justify-center gap-3 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-2xl border-2 border-rose-100 dark:border-rose-900/30 font-black text-[10px] uppercase tracking-[0.2em] active:scale-95 transition-all"
                            >
                                <XCircle size={20} />
                                {t('reject')}
                            </button>
                            <button 
                                onClick={() => handleVerifyAction(true)} 
                                className="h-14 flex items-center justify-center gap-3 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-emerald-500/30 active:scale-95 transition-all"
                            >
                                <CheckCircle size={20} />
                                {t('approve')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
