import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { analyticsAPI, menuAPI } from '../services/api';
import {
    Package, AlertTriangle, TrendingUp, DollarSign,
    RefreshCw, Save, Edit2, X, Box, Boxes, TrendingDown
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';

// Modern styles matching Kitchen.jsx
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

export default function StockDashboard() {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [data, setData] = useState({ summary: {}, items: [] });
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState(0);

    const restaurantId = user?.restaurant?._id || user?.restaurant;

    useEffect(() => {
        if (restaurantId) fetchStockData();
    }, [restaurantId]);

    const fetchStockData = async () => {
        try {
            const { data } = await analyticsAPI.getInventory(restaurantId);
            setData(data);
        } catch (error) {
            console.error('Failed to fetch stock data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (item) => {
        setEditingId(item._id);
        setEditValue(item.stock);
    };

    const handleSaveStock = async (id) => {
        try {
            await menuAPI.update(id, { stock: parseInt(editValue) });
            setEditingId(null);
            fetchStockData();
        } catch (error) {
            console.error('Failed to update stock:', error);
            alert('Failed to update stock');
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px', gap: '16px', minHeight: '100vh', background: '#f8fafc' }}>
                <LoadingSpinner size={48} />
                <span style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>{t('preparing_dashboard') || 'Loading Inventory Data...'}</span>
            </div>
        );
    }

    const chartData = data.items.slice(0, 10).map(i => ({
        name: i.name,
        value: i.totalValue
    }));

    const statusData = [
        { name: 'In Stock', value: data.summary.totalItems - data.summary.lowStockCount, color: '#10b981' },
        { name: 'Low Stock', value: data.summary.lowStockCount, color: '#ef4444' }
    ];

    return (
        <div style={{ padding: '24px', maxWidth: '100vw', minHeight: 'calc(100vh - 64px)', backgroundColor: '#f8fafc' }}>
            {/* Header */}
            <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                        Stock & Costs
                    </h1>
                    <p style={{ color: '#64748b', marginTop: '8px', fontSize: '16px' }}>
                        Inventory management and valuation
                    </p>
                </div>
                <button
                    onClick={fetchStockData}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 20px',
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        color: '#475569',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }}
                >
                    <RefreshCw size={16} />
                    Refresh
                </button>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                {/* Total Items Card */}
                <div style={statCardStyle}>
                    <div>
                        <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                            Total Items
                        </p>
                        <h3 style={{ fontSize: '36px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                            {data.summary.totalItems}
                        </h3>
                    </div>
                    <div style={iconBoxStyle('#3b82f6', '#eff6ff')}>
                        <Package size={24} />
                    </div>
                </div>

                {/* Inventory Value Card */}
                <div style={statCardStyle}>
                    <div>
                        <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                            Inventory Value
                        </p>
                        <h3 style={{ fontSize: '36px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                            {data.summary.totalValue?.toLocaleString()} <span style={{ fontSize: '20px', color: '#64748b' }}>MT</span>
                        </h3>
                    </div>
                    <div style={iconBoxStyle('#10b981', '#ecfdf5')}>
                        <DollarSign size={24} />
                    </div>
                </div>

                {/* Low Stock Alerts Card */}
                <div style={statCardStyle}>
                    <div>
                        <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                            Low Stock Alerts
                        </p>
                        <h3 style={{
                            fontSize: '36px',
                            fontWeight: '700',
                            color: data.summary.lowStockCount > 0 ? '#ef4444' : '#1e293b',
                            margin: 0
                        }}>
                            {data.summary.lowStockCount}
                        </h3>
                    </div>
                    <div style={iconBoxStyle(
                        data.summary.lowStockCount > 0 ? '#ef4444' : '#94a3b8',
                        data.summary.lowStockCount > 0 ? '#fef2f2' : '#f1f5f9'
                    )}>
                        <AlertTriangle size={24} />
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                    {/* Stock Table */}
                    <div style={cardStyle}>
                        <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                                Inventory Levels
                            </h3>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Item</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Stock</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Cost/Unit</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Total Value</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.items.map((item, index) => (
                                        <tr key={item._id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s ease' }}
                                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            <td style={{ padding: '16px', fontWeight: '500', color: '#1e293b' }}>{item.name}</td>
                                            <td style={{ padding: '16px' }}>
                                                {editingId === item._id ? (
                                                    <input
                                                        type="number"
                                                        value={editValue}
                                                        onChange={e => setEditValue(e.target.value)}
                                                        style={{
                                                            width: '80px',
                                                            padding: '8px 12px',
                                                            border: '1px solid #cbd5e1',
                                                            borderRadius: '8px',
                                                            fontSize: '14px'
                                                        }}
                                                    />
                                                ) : (
                                                    <span style={{
                                                        fontWeight: '600',
                                                        color: item.stock < 10 ? '#ef4444' : '#475569'
                                                    }}>
                                                        {item.stock}
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ padding: '16px', color: '#64748b' }}>{item.costPrice} MT</td>
                                            <td style={{ padding: '16px', fontFamily: 'monospace', fontWeight: '600', color: '#1e293b' }}>
                                                {item.totalValue.toLocaleString()} MT
                                            </td>
                                            <td style={{ padding: '16px' }}>
                                                {item.stock < 10 ? (
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        padding: '4px 12px',
                                                        borderRadius: '20px',
                                                        fontSize: '12px',
                                                        fontWeight: '600',
                                                        backgroundColor: '#fef2f2',
                                                        color: '#dc2626',
                                                        border: '1px solid #fecaca'
                                                    }}>
                                                        Low
                                                    </span>
                                                ) : (
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        padding: '4px 12px',
                                                        borderRadius: '20px',
                                                        fontSize: '12px',
                                                        fontWeight: '600',
                                                        backgroundColor: '#ecfdf5',
                                                        color: '#059669',
                                                        border: '1px solid #d1fae5'
                                                    }}>
                                                        OK
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ padding: '16px', textAlign: 'right' }}>
                                                {editingId === item._id ? (
                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                        <button
                                                            onClick={() => handleSaveStock(item._id)}
                                                            style={{
                                                                padding: '8px',
                                                                background: '#ecfdf5',
                                                                border: 'none',
                                                                borderRadius: '8px',
                                                                color: '#059669',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            <Save size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingId(null)}
                                                            style={{
                                                                padding: '8px',
                                                                background: '#f1f5f9',
                                                                border: 'none',
                                                                borderRadius: '8px',
                                                                color: '#64748b',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleEditClick(item)}
                                                        style={{
                                                            padding: '8px',
                                                            background: '#eff6ff',
                                                            border: 'none',
                                                            borderRadius: '8px',
                                                            color: '#3b82f6',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Top Value Items Chart */}
                    <div style={cardStyle}>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '24px' }}>
                            Top Value Items
                        </h3>
                        <div style={{ height: '400px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} layout="vertical" margin={{ left: 40 }}>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11, fill: '#64748b' }} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'white',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '12px',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                        }}
                                    />
                                    <Bar dataKey="value" fill="#6366f1" radius={[0, 8, 8, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <p style={{ fontSize: '12px', textAlign: 'center', color: '#94a3b8', marginTop: '16px' }}>
                            Calculated by Stock Quantity × Cost Price
                        </p>
                    </div>
                </div>
            </div>

            <style>{`
            `}</style>
        </div>
    );
}
