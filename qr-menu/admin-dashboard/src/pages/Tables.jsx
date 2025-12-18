import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { tableAPI, orderAPI } from '../services/api';

import { Plus, Trash2, QrCode, X, Printer, RefreshCw, Maximize, Edit2, Users, Receipt, UtensilsCrossed, Armchair, MapPin, BadgeCheck, User, Bell } from 'lucide-react';
import { io } from 'socket.io-client';
import { useTranslation } from 'react-i18next';

const SOCKET_URL = 'http://localhost:4001'; // Should be env var in production
const ALERT_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

export default function Tables() {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [tables, setTables] = useState([]);
    const [activeOrders, setActiveOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showQRModal, setShowQRModal] = useState(false);
    const [selectedTable, setSelectedTable] = useState(null);

    const [editingTable, setEditingTable] = useState(null); // ID of table being edited
    const [activeAlerts, setActiveAlerts] = useState({}); // { [tableId]: { type, value, timestamp } }
    const audioRef = useState(new Audio(ALERT_SOUND_URL))[0]; // Singleton audio instance

    // Initial Form State
    const initialFormState = {
        number: '',
        capacity: 4,
        location: 'Salão',
        type: 'Square',
        status: 'free',
        accessibility: false,
        joinable: false,
        assignedWaiter: '',
        minConsumption: 0
    };
    const [formData, setFormData] = useState(initialFormState);

    useEffect(() => {
        if (user?.restaurant) {
            fetchTables();
            fetchActiveOrders();
            const interval = setInterval(fetchActiveOrders, 30000); // Poll every 30s

            // Socket Setup
            const socket = io(SOCKET_URL);
            socket.emit('join-restaurant', user.restaurant._id || user.restaurant);

            socket.on('new-order', (data) => {
                const orderTableId = typeof data.order.table === 'object' ? data.order.table._id : data.order.table;
                if (orderTableId) {
                    setActiveAlerts(prev => ({
                        ...prev,
                        [orderTableId]: { type: 'order', value: 'New Order', timestamp: new Date() }
                    }));
                    fetchActiveOrders(); // Refresh orders
                }
            });

            socket.on('table-alert', (data) => {
                // data: { tableId, type, value, ... }
                setActiveAlerts(prev => ({
                    ...prev,
                    [data.tableId]: { type: data.type, value: data.value, timestamp: new Date() }
                }));
            });

            return () => {
                clearInterval(interval);
                socket.disconnect();
            };
        }
    }, [user]);

    // Sound Effect Logic
    useEffect(() => {
        const hasAlerts = Object.keys(activeAlerts).length > 0;
        if (hasAlerts) {
            audioRef.loop = true;
            // Interaction might block auto-play, usually admins click somewhere first
            audioRef.play().catch(e => console.warn("Audio play blocked", e));
        } else {
            audioRef.pause();
            audioRef.currentTime = 0;
        }
    }, [activeAlerts]);

    const handleAcknowledge = (tableId) => {
        const newAlerts = { ...activeAlerts };
        delete newAlerts[tableId];
        setActiveAlerts(newAlerts);
        // Optional: Call API to mark alert as handled if needed
    };

    const fetchTables = async () => {
        try {
            const response = await tableAPI.getAll(user.restaurant._id || user.restaurant);
            setTables(response.data.tables || []);
        } catch (error) {
            console.error('Failed to fetch tables:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchActiveOrders = async () => {
        try {
            const statuses = ['pending', 'confirmed', 'preparing', 'ready'];
            const requests = statuses.map(status =>
                orderAPI.getAll(user.restaurant._id || user.restaurant, { status })
            );
            const responses = await Promise.all(requests);
            const allActive = responses.flatMap(r => r.data.orders || []);
            setActiveOrders(allActive);
        } catch (error) {
            console.error('Failed to fetch active orders:', error);
            // Don't block UI if order fetch fails
        }
    };

    const handleOpenCreate = () => {
        setEditingTable(null);
        setFormData(initialFormState);
        setShowModal(true);
    };

    const handleOpenEdit = (table) => {
        setEditingTable(table._id);
        setFormData({
            number: table.number,
            capacity: table.capacity,
            location: table.location || 'Salão',
            type: table.type || 'Square',
            status: table.status || 'free',
            accessibility: table.accessibility || false,
            joinable: table.joinable || false,
            assignedWaiter: table.assignedWaiter || '',
            minConsumption: table.minConsumption || 0
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                restaurant: user.restaurant._id || user.restaurant,
                ...formData
            };

            if (editingTable) {
                await tableAPI.update(editingTable, payload);
            } else {
                await tableAPI.create(payload);
            }

            setShowModal(false);
            fetchTables();
            if (editingTable) alert(t('save_success') || 'Updated successfully');
        } catch (error) {
            console.error('Save failed:', error);
            alert('Failed to save table.');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm(t('confirm_delete') || 'Are you sure?')) return;
        try {
            await tableAPI.delete(id);
            fetchTables();
        } catch (error) {
            alert('Failed to delete table');
        }
    };

    const openQR = (table) => {
        setSelectedTable(table);
        setShowQRModal(true);
    };

    const printQR = () => {
        const printWindow = window.open('', '', 'height=600,width=800');
        printWindow.document.write('<html><head><title>Print QR Code</title>');
        printWindow.document.write('</head><body style="text-align:center;">');
        printWindow.document.write(`<h1>${t('table')} ${selectedTable.number}</h1>`);
        printWindow.document.write(`<img src="${selectedTable.qrCode}" style="width:300px;height:300px;"/>`);
        printWindow.document.write(`<p>${selectedTable.location || ''}</p>`);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.print();
    };

    const getTableStatus = (table) => {
        // Prioritize "Ready" orders as they need immediate attention
        const orders = activeOrders.filter(o => o.table?._id === table._id || o.table === table._id);
        if (orders.some(o => o.status === 'ready')) return 'ready';

        // Otherwise, trust the manual status from DB (including manually set 'occupied')
        // Only if it's 'free' do we check if there are pending orders to auto-switch to occupied
        if (table.status === 'free') {
            if (orders.length > 0) return 'occupied';
            return 'free';
        }

        return table.status;
    };

    const getStatusColor = (statusKey) => {
        switch (statusKey) {
            case 'free': return 'green';
            case 'occupied': return 'red'; // or orange
            case 'ready': return 'green'; // blinking? handled by badge class usually
            case 'reserved': return 'purple'; // customized below
            case 'cleaning': return 'blue';
            case 'closed': return 'gray';
            default: return 'gray';
        }
    };

    if (loading) return <div>{t('loading')}</div>;

    return (
        <div className="page-content">
            <div className="page-header">
                <div>
                    <h2>{t('manage_tables')}</h2>
                    <p>{t('manage_tables_desc')}</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => { fetchTables(); fetchActiveOrders(); }} className="btn-secondary">
                        <RefreshCw size={18} />
                    </button>
                    <button onClick={handleOpenCreate} className="btn-primary">
                        <Plus size={18} />
                        {t('add_table')}
                    </button>
                </div>
            </div>

            <div className="stats-grid">
                {tables.map(table => {
                    const statusKey = getTableStatus(table);
                    const badgeClass = `status-badge ${statusKey}`; // map to css classes

                    const alert = activeAlerts[table._id];
                    const isBlinking = !!alert;
                    const alertClass = alert?.type === 'order' ? 'table-alert-green' : (alert ? 'table-alert-red' : '');

                    const getEmotionIcon = (val) => {
                        if (val === 'happy') return '😋';
                        if (val === 'waiting') return '✋';
                        if (val === 'angry') return '😠';
                        if (val === 'payment') return '💰';
                        return '🔔';
                    };

                    return (
                        <div
                            key={table._id}
                            className={`stat-card ${isBlinking ? alertClass : ''}`}
                            onClick={() => isBlinking && handleAcknowledge(table._id)} // Click to ack
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                minHeight: '200px',
                                position: 'relative',
                                cursor: isBlinking ? 'pointer' : 'default',
                                transition: 'all 0.3s'
                            }}
                        >
                            {alert && (
                                <div className="emotion-badge">
                                    {alert.type === 'order' ? '📦' : getEmotionIcon(alert.value)}
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.5em', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {t('table')} {table.number}
                                        {table.accessibility && <Armchair size={16} title={t('accessibility')} color="#4f46e5" />}
                                    </h3>
                                    <p style={{ color: '#666', fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Users size={14} /> {table.capacity} | {table.type}
                                    </p>
                                    <p style={{ color: '#888', fontSize: '0.85em', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <MapPin size={14} /> {table.location || '-'}
                                    </p>
                                    {table.assignedWaiter && (
                                        <p style={{ color: '#4f46e5', fontSize: '0.85em', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <User size={14} /> {table.assignedWaiter}
                                        </p>
                                    )}
                                </div>
                                <div className={badgeClass} style={{ textTransform: 'capitalize' }}>
                                    {t(statusKey) || statusKey}
                                </div>
                            </div>

                            <div className="table-actions" style={{ display: 'flex', gap: '8px', marginTop: '15px' }}>
                                <button onClick={() => openQR(table)} className="btn-small" style={{ flex: 1, justifyContent: 'center' }} title={t('show_qr')}>
                                    <Maximize size={16} />
                                </button>
                                <button onClick={() => handleOpenEdit(table)} className="btn-small" style={{ flex: 1, justifyContent: 'center' }} title={t('edit')}>
                                    <Edit2 size={16} />
                                </button>
                                <button onClick={() => handleDelete(table._id)} className="btn-small btn-danger" style={{ flex: 0, padding: '0 10px' }} title={t('delete')}>
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <div style={{ fontSize: '0.7em', color: '#ccc', marginTop: '8px', textAlign: 'right' }}>
                                ID: {table._id.slice(-6)}
                            </div>
                        </div>
                    );
                })}
            </div>

            {tables.length === 0 && (
                <div className="empty-state">
                    <p>{t('no_items') || 'No tables found.'}</p>
                </div>
            )}

            {/* Create/Edit Table Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%', padding: '20px' }}>
                        <div className="modal-header">
                            <h3>{editingTable ? t('edit') : t('add_table')}</h3>
                            <button onClick={() => setShowModal(false)} className="icon-btn"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            {/* Number */}
                            <div className="form-group">
                                <label>{t('table_number')}</label>
                                <input
                                    type="number"
                                    value={formData.number}
                                    onChange={e => setFormData({ ...formData, number: e.target.value })}
                                    required
                                />
                            </div>
                            {/* Capacity */}
                            <div className="form-group">
                                <label>{t('seats') || 'Capacity'}</label>
                                <input
                                    type="number"
                                    value={formData.capacity}
                                    onChange={e => setFormData({ ...formData, capacity: e.target.value })}
                                    required
                                />
                            </div>
                            {/* Location */}
                            <div className="form-group">
                                <label>{t('location')}</label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                                    placeholder="e.g. Varanda"
                                />
                            </div>
                            {/* Type */}
                            <div className="form-group">
                                <label>{t('table_type')}</label>
                                <select
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option value="Square">Square</option>
                                    <option value="Round">Round</option>
                                    <option value="Booth">Booth</option>
                                    <option value="High Top">High Top</option>
                                </select>
                            </div>
                            {/* Status */}
                            <div className="form-group">
                                <label>{t('status')}</label>
                                <select
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                                >
                                    <option value="free">{t('free')}</option>
                                    <option value="occupied">{t('occupied')}</option>
                                    <option value="reserved">{t('reserved')}</option>
                                    <option value="cleaning">{t('cleaning')}</option>
                                    <option value="closed">{t('closed')}</option>
                                </select>
                            </div>
                            {/* Waiter */}
                            <div className="form-group">
                                <label>{t('waiter')}</label>
                                <input
                                    type="text"
                                    value={formData.assignedWaiter}
                                    onChange={e => setFormData({ ...formData, assignedWaiter: e.target.value })}
                                    placeholder="Name or ID"
                                />
                            </div>
                            {/* Min Consumption */}
                            <div className="form-group">
                                <label>{t('min_consumption')}</label>
                                <input
                                    type="number"
                                    value={formData.minConsumption}
                                    onChange={e => setFormData({ ...formData, minConsumption: e.target.value })}
                                    min="0"
                                />
                            </div>

                            {/* Checkboxes */}
                            <div className="form-group" style={{ gridColumn: 'span 2', display: 'flex', gap: '20px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.accessibility}
                                        onChange={e => setFormData({ ...formData, accessibility: e.target.checked })}
                                    />
                                    {t('accessibility')}
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.joinable}
                                        onChange={e => setFormData({ ...formData, joinable: e.target.checked })}
                                    />
                                    {t('joinable')}
                                </label>
                            </div>

                            <div className="modal-actions" style={{ gridColumn: 'span 2', marginTop: '10px' }}>
                                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
                                <button type="submit" className="btn-primary">{editingTable ? t('update') : t('add_table')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* QR Modal - same as before */}
            {showQRModal && selectedTable && (
                <div className="modal-overlay" onClick={() => setShowQRModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
                        <div className="modal-header">
                            <h3>{t('table')} {selectedTable.number} - QR Code</h3>
                            <button onClick={() => setShowQRModal(false)} className="icon-btn"><X size={20} /></button>
                        </div>
                        <div style={{ padding: '20px' }}>
                            <img src={selectedTable.qrCode} alt="QR Code" style={{ maxWidth: '100%', maxHeight: '300px' }} />
                        </div>
                        <p style={{ marginBottom: '1rem' }}>
                            {selectedTable.location ? `${selectedTable.location} - ` : ''}
                            {selectedTable.type}
                        </p>
                        <div className="modal-actions" style={{ justifyContent: 'center' }}>
                            <button onClick={printQR} className="btn-primary">
                                <Printer size={18} />
                                {t('print_qr')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
