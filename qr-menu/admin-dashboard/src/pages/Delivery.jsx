
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { orderAPI, usersAPI } from '../services/api';
import {
    Truck, MapPin, Phone, User, CheckCircle,
    Navigation, Clock, Package, Users
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Modern Card Styles (matching FinancialTab)
const cardStyle = {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
    border: '1px solid rgba(0,0,0,0.02)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
};

const statCardStyle = {
    ...cardStyle,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    cursor: 'pointer',
    flex: 1,
    minWidth: '200px'
};

const iconBoxStyle = (color, bg) => ({
    padding: '12px',
    borderRadius: '12px',
    color: color,
    background: bg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
});

export default function DeliveryDashboard() {
    const { user } = useAuth();
    const [orders, setOrders] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);

    const restaurantId = user?.restaurant?._id || user?.restaurant;

    useEffect(() => {
        if (restaurantId) {
            fetchData();
        }
    }, [restaurantId]);

    const fetchData = async () => {
        try {
            const orderRes = await orderAPI.getAll(restaurantId, { type: 'delivery' });
            const deliveryOrders = (orderRes.data.orders || orderRes.data || []).filter(o => o.orderType === 'delivery');
            setOrders(deliveryOrders);

            const userRes = await usersAPI.getAll();
            const driverList = (userRes.data.users || userRes.data || []).filter(u => u.role === 'driver' || u.role?.name === 'Driver');
            setDrivers(driverList);
        } catch (error) {
            console.error('Failed to fetch delivery data:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (orderId, status) => {
        try {
            await orderAPI.updateStatus(orderId, status);
            fetchData();
        } catch (error) {
            console.error('Failed to update status');
        }
    };

    const assignDriver = async (orderId, driverId) => {
        alert(`Integration pending: Assign driver ${driverId} to order ${orderId}`);
    };

    const columns = {
        ready: { title: 'Ready for Pickup', color: '#f59e0b', bg: '#fffbeb' },
        out_for_delivery: { title: 'In Transit', color: '#3b82f6', bg: '#eff6ff' },
        delivered: { title: 'Delivered', color: '#10b981', bg: '#ecfdf5' }
    };

    // Calculate stats
    const readyCount = orders.filter(o => o.status === 'ready').length;
    const transitCount = orders.filter(o => o.status === 'out_for_delivery').length;
    const deliveredCount = orders.filter(o => o.status === 'delivered').length;
    const activeDrivers = drivers.filter(d => d.isOnline).length;

    if (loading) return <div className="p-8">Loading Delivery Manager...</div>;

    return (
        <div style={{ padding: '32px', background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Header */}
            <div>
                <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Truck style={{ color: '#3b82f6' }} /> Delivery Dispatch
                </h1>
                <p style={{ color: '#64748b', marginTop: '8px', fontSize: '14px' }}>
                    Manage outgoing orders and fleet
                </p>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', width: '100%' }}>
                <div style={statCardStyle} onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.1)';
                }} onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.05)';
                }}>
                    <div>
                        <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Ready for Pickup
                        </p>
                        <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b', margin: '8px 0 0 0' }}>
                            {readyCount}
                        </h3>
                    </div>
                    <div style={iconBoxStyle('#f59e0b', '#fffbeb')}>
                        <Package size={24} strokeWidth={2.5} />
                    </div>
                </div>

                <div style={statCardStyle} onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.1)';
                }} onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.05)';
                }}>
                    <div>
                        <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            In Transit
                        </p>
                        <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b', margin: '8px 0 0 0' }}>
                            {transitCount}
                        </h3>
                    </div>
                    <div style={iconBoxStyle('#3b82f6', '#eff6ff')}>
                        <Truck size={24} strokeWidth={2.5} />
                    </div>
                </div>

                <div style={statCardStyle} onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.1)';
                }} onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.05)';
                }}>
                    <div>
                        <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Delivered
                        </p>
                        <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b', margin: '8px 0 0 0' }}>
                            {deliveredCount}
                        </h3>
                    </div>
                    <div style={iconBoxStyle('#10b981', '#ecfdf5')}>
                        <CheckCircle size={24} strokeWidth={2.5} />
                    </div>
                </div>

                <div style={statCardStyle} onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.1)';
                }} onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.05)';
                }}>
                    <div>
                        <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Active Drivers
                        </p>
                        <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b', margin: '8px 0 0 0' }}>
                            {activeDrivers}/{drivers.length}
                        </h3>
                        <p style={{ fontSize: '12px', color: '#10b981', marginTop: '4px', fontWeight: '600' }}>
                            {activeDrivers} online now
                        </p>
                    </div>
                    <div style={iconBoxStyle('#8b5cf6', '#f5f3ff')}>
                        <Users size={24} strokeWidth={2.5} />
                    </div>
                </div>
            </div>

            {/* Kanban Board */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
                {Object.entries(columns).map(([status, config]) => (
                    <div key={status} style={cardStyle}>
                        <div style={{
                            padding: '12px 16px',
                            borderRadius: '8px',
                            fontWeight: '700',
                            marginBottom: '16px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            color: config.color,
                            background: config.bg
                        }}>
                            {config.title}
                            <span style={{ background: 'rgba(255,255,255,0.5)', padding: '2px 8px', borderRadius: '4px', fontSize: '14px' }}>
                                {orders.filter(o => o.status === status).length}
                            </span>
                        </div>

                        <div style={{ maxHeight: 'calc(100vh - 450px)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {orders.filter(o => o.status === status).map(order => (
                                <div key={order._id} style={{
                                    background: '#f8fafc',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    border: '1px solid #e2e8f0',
                                    transition: 'all 0.2s'
                                }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'white';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = '#f8fafc';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                                        <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>
                                            #{order.orderNumber || order._id.slice(-4)}
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Clock size={12} />
                                            {formatDistanceToNow(new Date(order.createdAt))} ago
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'start', gap: '8px', marginBottom: '12px' }}>
                                        <MapPin size={14} style={{ color: '#94a3b8', marginTop: '2px' }} />
                                        <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.4' }}>
                                            {order.deliveryAddress || "Test Address, Maputo"}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '13px', color: '#64748b' }}>
                                        <User size={14} />
                                        {order.customerName || "Guest"}
                                        <span style={{ color: '#cbd5e1' }}>|</span>
                                        <Phone size={14} />
                                        {order.customerPhone || "N/A"}
                                    </div>

                                    <div style={{ fontSize: '12px', color: '#64748b', background: 'white', padding: '8px', borderRadius: '6px', marginBottom: '12px' }}>
                                        {order.items.length} items • Total: {order.total} MT
                                    </div>

                                    {/* Action Area */}
                                    <div style={{ paddingTop: '12px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '8px' }}>
                                        {status === 'ready' && (
                                            <>
                                                <select
                                                    style={{ flex: 1, fontSize: '13px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px' }}
                                                    onChange={(e) => assignDriver(order._id, e.target.value)}
                                                >
                                                    <option value="">Assign Driver...</option>
                                                    {drivers.map(d => (
                                                        <option key={d._id} value={d._id}>{d.name}</option>
                                                    ))}
                                                </select>
                                                <button
                                                    onClick={() => updateStatus(order._id, 'out_for_delivery')}
                                                    style={{
                                                        padding: '8px',
                                                        background: '#3b82f6',
                                                        color: 'white',
                                                        borderRadius: '8px',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                    title="Dispatch"
                                                >
                                                    <Navigation size={18} />
                                                </button>
                                            </>
                                        )}
                                        {status === 'out_for_delivery' && (
                                            <button
                                                onClick={() => updateStatus(order._id, 'delivered')}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px',
                                                    background: '#10b981',
                                                    color: 'white',
                                                    borderRadius: '8px',
                                                    fontWeight: '600',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '8px',
                                                    fontSize: '13px'
                                                }}
                                            >
                                                <CheckCircle size={16} /> Mark Delivered
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {orders.filter(o => o.status === status).length === 0 && (
                                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#cbd5e1', fontSize: '13px', fontStyle: 'italic' }}>
                                    No orders {config.title.toLowerCase()}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
