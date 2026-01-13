import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { tableAPI, orderAPI, usersAPI } from '../services/api';

import { Plus, Trash2, QrCode, X, Printer, RefreshCw, Maximize, Edit2, Users, Receipt, UtensilsCrossed, Armchair, MapPin, BadgeCheck, User, Bell, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import TableSessionModal from '../components/TableSessionModal';
import '../styles/TableSessionModal.css';

export default function Tables() {
    const { user } = useAuth();
    const { t } = useTranslation();
    const { activeCalls, removeCall } = useSocket();
    const [tables, setTables] = useState([]);
    const [activeOrders, setActiveOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showQRModal, setShowQRModal] = useState(false);
    const [selectedTable, setSelectedTable] = useState(null);
    const [showSessionModal, setShowSessionModal] = useState(false);
    const [sessionData, setSessionData] = useState(null);

    const [editingTable, setEditingTable] = useState(null); // ID of table being edited
    const [waiters, setWaiters] = useState([]); // List of available waiters

    // Initial Form State
    const initialFormState = {
        number: '',
        capacity: 4,
        location: 'Salão',
        type: 'Square',
        status: 'free',
        accessibility: false,
        joinable: false,
        assignedWaiter: '', // Legacy - keep for compatibility
        assignedWaiterId: '', // New field for User reference
        minConsumption: 0
    };
    const [formData, setFormData] = useState(initialFormState);

    useEffect(() => {
        if (user?.restaurant) {
            fetchTables();
            fetchActiveOrders();
            fetchWaiters(); // Load waiters for ID lookup
            const interval = setInterval(fetchActiveOrders, 30000); // Poll every 30s

            return () => {
                clearInterval(interval);
            };
        }
    }, [user]);

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

    const fetchWaiters = async () => {
        try {
            const restaurantId = user.restaurant._id || user.restaurant;
            const { data } = await usersAPI.getByRestaurant(restaurantId, { role: 'Waiter', active: 'true' });
            setWaiters(data.users || []);
        } catch (error) {
            console.error('Failed to fetch waiters:', error);
            setWaiters([]);
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
        fetchWaiters(); // Load waiters when opening modal
        setShowModal(true);
    };

    const handleOpenEdit = (table) => {
        setEditingTable(table._id);

        // Robust ID extraction handles populated objects or direct IDs
        const existingWaiterId = (typeof table.assignedWaiter === 'object' ? table.assignedWaiter?._id : table.assignedWaiter)
            || table.assignedWaiterId
            || '';

        setFormData({
            number: table.number,
            capacity: table.capacity,
            location: table.location || 'Salão',
            type: table.type || 'Square',
            status: table.status || 'free',
            accessibility: table.accessibility || false,
            joinable: table.joinable || false,
            assignedWaiter: existingWaiterId, // Sync legacy
            assignedWaiterId: existingWaiterId, // New field
            minConsumption: table.minConsumption || 0
        });
        fetchWaiters(); // Load waiters when opening modal
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                restaurant: user.restaurant._id || user.restaurant,
                ...formData,
                // Ensure both fields are synced to avoid legacy issues
                assignedWaiter: formData.assignedWaiterId,
                assignedWaiterId: formData.assignedWaiterId
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
        const printWindow = window.open('', '', 'height=800,width=600');
        printWindow.document.write(`
            <html>
            <head>
                <title>Print QR Code - Mesa ${selectedTable.number}</title>
                <style>
                    @page {
                        margin: 20mm;
                        size: A4 portrait;
                    }
                    body {
                        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                        text-align: center;
                        padding: 40px 20px;
                        margin: 0;
                        background: white;
                    }
                    .qr-container {
                        max-width: 500px;
                        margin: 0 auto;
                    }
                    .qr-image {
                        width: 280px;
                        height: 280px;
                        margin: 20px auto;
                        display: block;
                    }
                    .table-name {
                        font-size: 1.2rem;
                        color: #64748b;
                        margin: 20px 0 10px;
                        font-weight: 500;
                    }
                    .table-number {
                        font-size: 3rem;
                        font-weight: 900;
                        color: #0f172a;
                        margin: 15px 0;
                        letter-spacing: 0.05em;
                    }
                    .code-section {
                        background: #f8fafc;
                        padding: 20px;
                        border-radius: 12px;
                        margin: 30px auto;
                        max-width: 350px;
                    }
                    .code-label {
                        font-size: 0.85rem;
                        color: #64748b;
                        text-transform: uppercase;
                        font-weight: 600;
                        margin-bottom: 8px;
                    }
                    .code-value {
                        font-size: 2.5rem;
                        font-weight: 900;
                        color: #0f172a;
                        letter-spacing: 0.3rem;
                        font-family: 'Courier New', monospace;
                        margin: 10px 0;
                    }
                    .code-hint {
                        font-size: 0.75rem;
                        color: #94a3b8;
                        font-style: italic;
                        margin-top: 8px;
                    }
                    .footer {
                        font-size: 0.7rem;
                        color: #94a3b8;
                        font-style: italic;
                        margin-top: 40px;
                        padding-top: 20px;
                        border-top: 1px solid #e2e8f0;
                    }
                    @media print {
                        body { padding: 0; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="qr-container">
                    <img src="${selectedTable.qrCode}" alt="QR Code" class="qr-image" />
                    <p class="table-name">${selectedTable.location || 'Mesa'} - ${selectedTable.type}</p>
                    <h1 class="table-number">MESA ${selectedTable.number}</h1>
                    
                    <div class="code-section">
                        <p class="code-label">Código de Acesso Manual</p>
                        <p class="code-value">${selectedTable.numericCode || '------'}</p>
                        <p class="code-hint">Use este código se a câmera não funcionar</p>
                    </div>
                    
                    <div class="footer">
                        Desenvolvido por Nhiquela Serviços e Consultoria, LDA
                    </div>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();

        // Wait for images to load before printing
        printWindow.onload = function () {
            setTimeout(() => {
                printWindow.print();
            }, 250);
        };
    };

    const handleViewSession = async (table) => {
        try {
            // Check for any active calls for this table and dismiss them
            const call = activeCalls.find(c => c.tableNumber === table.number || c.tableNumber === String(table.number));
            if (call) {
                removeCall(call.callId);
            }

            const response = await tableAPI.getCurrentSession(table._id);
            setSelectedTable(table);
            setSessionData(response.data);
            setShowSessionModal(true);
        } catch (error) {
            console.error('Failed to fetch session:', error);
            alert('Failed to load table session');
        }
    };

    const handleFreeTable = async (tableId) => {
        try {
            await tableAPI.freeTable(tableId);
            alert('Mesa liberada com sucesso!');
            setShowSessionModal(false);
            fetchTables();
            fetchActiveOrders();
        } catch (error) {
            console.error('Failed to free table:', error);
            alert(error.response?.data?.message || 'Failed to free table');
        }
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
                    const badgeClass = `status-badge ${statusKey}`;

                    // Check if this table has a pending global alert
                    const call = activeCalls.find(a =>
                        Number(a.tableNumber) === Number(table.number)
                    );
                    const hasAlert = !!call;

                    return (
                        <div
                            key={table._id}
                            className={`stat-card ${hasAlert ? 'blink-urgent' : ''}`}
                            onClick={() => hasAlert && removeCall(call.callId)}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                minHeight: '200px',
                                position: 'relative',
                                cursor: hasAlert ? 'pointer' : 'default',
                                transition: 'all 0.3s'
                            }}
                        >
                            {hasAlert && (
                                <div className="emotion-badge urgent-badge">
                                    📦
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.5em', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '8px', color: '#000' }}>
                                        {t('table')} {table.number}
                                        {table.accessibility && <Armchair size={16} title={t('accessibility')} color="#4f46e5" />}
                                    </h3>
                                    <p style={{ color: '#666', fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Users size={14} /> {table.capacity} | {table.type}
                                    </p>
                                    <p style={{ color: '#888', fontSize: '0.85em', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <MapPin size={14} /> {table.location || '-'}
                                    </p>
                                    <p style={{ fontSize: '0.85em', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ fontWeight: 600, color: '#666' }}>Estado: </span>
                                        <span className={`badge ${table.status === 'occupied' ? 'badge-danger' :
                                            table.status === 'free' ? 'badge-success' : 'badge-warning'
                                            }`} style={{ padding: '2px 6px', fontSize: '0.75rem' }}>
                                            {t(table.status) || table.status}
                                        </span>
                                    </p>
                                    <p style={{ color: '#4f46e5', fontSize: '0.85em', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <User size={14} />
                                        {table.assignedWaiter ? (
                                            typeof table.assignedWaiter === 'object'
                                                ? table.assignedWaiter.name
                                                : (waiters.find(w => w._id === table.assignedWaiter)?.name || table.assignedWaiter)
                                        ) : (
                                            <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>{t('no_waiter') || 'Sem Garçom'}</span>
                                        )}
                                    </p>
                                </div>
                                <div className={badgeClass} style={{ textTransform: 'capitalize' }}>
                                    {t(statusKey) || statusKey}
                                </div>
                            </div>

                            <div className="table-actions" style={{ display: 'flex', gap: '8px', marginTop: '15px' }}>
                                <button onClick={() => handleViewSession(table)} className="btn-small" style={{ flex: 1, justifyContent: 'center' }} title="Ver Pedidos">
                                    <Eye size={16} />
                                </button>
                                <button onClick={() => openQR(table)} className="btn-small" style={{ flex: 1, justifyContent: 'center' }} title={t('show_qr')}>
                                    <Maximize size={16} />
                                </button>
                                <button onClick={() => handleOpenEdit(table)} className="btn-small" style={{ flex: 1, justifyContent: 'center' }} title={t('edit')}>
                                    <Edit2 size={16} />
                                </button>
                                <button onClick={() => handleDelete(table._id)} className="btn-small btn-danger" style={{ flex: 0, padding: '0 10px' }} title={t('delete')}>
                                    <Trash2 size={16} color="#dc2626" />
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
                                <label>{t('waiter') || 'Atendente'}</label>
                                <select
                                    value={formData.assignedWaiterId}
                                    onChange={e => setFormData({ ...formData, assignedWaiterId: e.target.value })}
                                >
                                    <option value="">{t('select_waiter') || 'Selecione um atendente'}</option>
                                    {waiters.map(waiter => (
                                        <option key={waiter._id} value={waiter._id}>
                                            {waiter.name}
                                        </option>
                                    ))}
                                </select>
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

            {/* QR Modal - Enhanced Layout */}
            {showQRModal && selectedTable && (
                <div className="modal-overlay" onClick={() => setShowQRModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ textAlign: 'center', maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h3>QR Code - Mesa {selectedTable.number}</h3>
                            <button onClick={() => setShowQRModal(false)} className="icon-btn"><X size={20} /></button>
                        </div>
                        <div style={{ padding: '30px 20px' }}>
                            {/* QR Code Image */}
                            <img
                                src={selectedTable.qrCode}
                                alt="QR Code"
                                style={{
                                    width: '280px',
                                    height: '280px',
                                    display: 'block',
                                    margin: '0 auto 20px'
                                }}
                            />

                            {/* Table Name */}
                            <p style={{
                                fontSize: '1rem',
                                color: '#64748b',
                                marginBottom: '8px',
                                fontWeight: '500'
                            }}>
                                {selectedTable.location || 'Mesa'} - {selectedTable.type}
                            </p>

                            {/* Table Number - Prominent */}
                            <h2 style={{
                                fontSize: '2.5rem',
                                fontWeight: '900',
                                color: '#0f172a',
                                margin: '10px 0 30px',
                                letterSpacing: '0.05em'
                            }}>
                                MESA {selectedTable.number}
                            </h2>

                            {/* Numeric Code Section */}
                            <div style={{
                                background: '#f8fafc',
                                padding: '20px',
                                borderRadius: '12px',
                                margin: '0 auto 25px',
                                maxWidth: '350px',
                                border: '1px solid #e2e8f0'
                            }}>
                                <p style={{
                                    fontSize: '0.85rem',
                                    color: '#64748b',
                                    marginBottom: '8px',
                                    fontWeight: '600',
                                    textTransform: 'uppercase'
                                }}>
                                    Código de Acesso Manual
                                </p>
                                <p style={{
                                    fontSize: '2.2rem',
                                    fontWeight: '900',
                                    color: '#0f172a',
                                    letterSpacing: '0.3rem',
                                    fontFamily: 'monospace',
                                    margin: '12px 0'
                                }}>
                                    {selectedTable.numericCode || '------'}
                                </p>
                                <p style={{
                                    fontSize: '0.75rem',
                                    color: '#94a3b8',
                                    fontStyle: 'italic',
                                    margin: '8px 0 0'
                                }}>
                                    Use este código se a câmera não funcionar
                                </p>
                            </div>

                            {/* Footer */}
                            <div style={{
                                fontSize: '0.7rem',
                                color: '#94a3b8',
                                fontStyle: 'italic',
                                paddingTop: '20px',
                                borderTop: '1px solid #e2e8f0'
                            }}>
                                Desenvolvido por Nhiquela Serviços e Consultoria, LDA
                            </div>
                        </div>

                        <div className="modal-actions" style={{ justifyContent: 'center', padding: '0 20px 20px' }}>
                            <button onClick={printQR} className="btn-primary" style={{ minWidth: '150px' }}>
                                <Printer size={18} />
                                {t('print_qr') || 'Imprimir'}
                            </button>
                        </div>
                    </div>
                </div>
            )
            }

            {/* Table Session Modal */}
            {
                showSessionModal && sessionData && (
                    <TableSessionModal
                        table={sessionData.table}
                        session={sessionData.session}
                        orders={sessionData.orders}
                        stats={sessionData.stats}
                        onClose={() => setShowSessionModal(false)}
                        onFreeTable={handleFreeTable}
                        canFree={['manager', 'waiter', 'owner'].includes(user?.role)}
                    />
                )
            }
        </div >
    );
}
