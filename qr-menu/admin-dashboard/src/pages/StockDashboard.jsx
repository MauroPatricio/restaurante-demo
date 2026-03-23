import React, { useState, useEffect } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { analyticsAPI, menuAPI, stockAPI } from '../services/api';
import { useCurrency } from '../contexts/CurrencyContext';
import {
    Package, AlertTriangle, TrendingUp, DollarSign,
    RefreshCw, Save, Edit2, X, Box, Boxes, TrendingDown,
    PlusCircle, MinusCircle, History
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';
import { useTranslation } from 'react-i18next';

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
    const { t, i18n } = useTranslation();
    const { convertAndFormat } = useCurrency();
    const [data, setData] = useState({ summary: {}, items: [] });
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState(0);
    const [adjustType, setAdjustType] = useState('add'); // 'add' or 'set'

    // History Tab State
    const [activeTab, setActiveTab] = useState('overview');
    const [movements, setMovements] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyFilters, setHistoryFilters] = useState({ type: '', page: 1 });
    const [totalPages, setTotalPages] = useState(1);

    const restaurantId = user?.restaurant?._id || user?.restaurant;

    useEffect(() => {
        if (restaurantId) {
            fetchStockData();
            if (activeTab === 'history') fetchMovements();
        }
    }, [restaurantId, activeTab, historyFilters.page, historyFilters.type]);

    const fetchMovements = async () => {
        try {
            setHistoryLoading(true);
            const { data } = await stockAPI.getMovements(restaurantId, {
                page: historyFilters.page,
                limit: 20,
                type: historyFilters.type || undefined
            });
            setMovements(data.movements || []);
            setTotalPages(data.pagination?.pages || 1);
        } catch (error) {
            console.error('Failed to fetch movements:', error);
        } finally {
            setHistoryLoading(false);
        }
    };

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
        setEditValue(0);
        setAdjustType('add');
    };

    const handleSaveStock = async (id, item) => {
        try {
            const val = parseInt(editValue);
            if (isNaN(val)) return;

            if (adjustType === 'add') {
                // Use restock or adjust API
                if (val > 0) {
                    await stockAPI.restock({
                        menuItemId: id,
                        quantity: val,
                        reason: 'stock_manual_adjustment',
                        unitCost: item.costPrice
                    });
                } else if (val < 0) {
                    await stockAPI.adjust({
                        menuItemId: id,
                        quantity: val,
                        type: 'waste',
                        reason: 'stock_manual_correction'
                    });
                }
            } else {
                // Set absolute value (direct update - use adjust with diff)
                const diff = val - item.stock;
                if (diff !== 0) {
                    await stockAPI.adjust({
                        menuItemId: id,
                        quantity: diff,
                        type: 'adjustment',
                        reason: 'stock_manual_override'
                    });
                }
            }

            setEditingId(null);
            fetchStockData();
        } catch (error) {
            console.error('Failed to update stock:', error);
            alert(t('stock_update_error'));
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px', gap: '16px', minHeight: '100vh', background: '#f8fafc' }}>
                <LoadingSpinner size={48} />
                <span style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>{t('stock_loading')}</span>
            </div>
        );
    }

    const chartData = data.items.slice(0, 10).map(i => ({
        name: i.name,
        value: i.totalValue
    }));

    // Calculate profit margins
    const itemsWithMargins = data.items.map(item => {
        const cost = item.costPrice || 0;
        const price = item.price || 0;
        const margin = price - cost;
        const marginPercent = price > 0 ? (margin / price) * 100 : 0;
        return { ...item, margin, marginPercent };
    });

    return (
        <div style={{ padding: '24px', maxWidth: '100vw', minHeight: 'calc(100vh - 64px)', backgroundColor: '#f8fafc' }}>
            {/* Header */}
            <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                        {t('stock_title')}
                    </h1>
                    <p style={{ color: '#64748b', marginTop: '8px', fontSize: '16px' }}>
                        {t('stock_subtitle')}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
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
                    >
                        <RefreshCw size={16} />
                        {t('refresh')}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '24px', gap: '32px' }}>
                <button
                    onClick={() => setActiveTab('overview')}
                    style={{
                        padding: '12px 0',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'overview' ? '2px solid #6366f1' : '2px solid transparent',
                        color: activeTab === 'overview' ? '#6366f1' : '#64748b',
                        fontWeight: activeTab === 'overview' ? '600' : '500',
                        fontSize: '15px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <Package size={18} /> {t('stock_overview_tab')}
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    style={{
                        padding: '12px 0',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'history' ? '2px solid #6366f1' : '2px solid transparent',
                        color: activeTab === 'history' ? '#6366f1' : '#64748b',
                        fontWeight: activeTab === 'history' ? '600' : '500',
                        fontSize: '15px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <History size={18} /> {t('stock_history_tab')}
                </button>
            </div>

            {activeTab === 'overview' ? (
                <div>
                    {/* KPI Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                        <div style={statCardStyle}>
                            <div>
                                <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                                    {t('stock_items_kpi')}
                                </p>
                                <h3 style={{ fontSize: '36px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                                    {data.summary.totalItems}
                                </h3>
                            </div>
                            <div style={iconBoxStyle('#3b82f6', '#eff6ff')}>
                                <Package size={24} />
                            </div>
                        </div>

                        <div style={statCardStyle}>
                            <div>
                                <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                                    {t('stock_total_value_kpi')}
                                </p>
                                <h3 style={{ fontSize: '36px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                                    {convertAndFormat(data.summary.totalValue)}
                                </h3>
                            </div>
                            <div style={iconBoxStyle('#10b981', '#ecfdf5')}>
                                <DollarSign size={24} />
                            </div>
                        </div>

                        <div style={statCardStyle}>
                            <div>
                                <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                                    {t('stock_low_stock_kpi')}
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
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                            <div style={cardStyle}>
                                <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                                        {t('stock_table_title')}
                                    </h3>
                                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>* {t('stock_margin_note')}</span>
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>{t('stock_col_product')}</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>{t('stock_col_status')}</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>{t('stock_col_stock')}</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>{t('stock_col_unit')}</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>{t('stock_col_min')}</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>{t('stock_col_price')}</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>{t('stock_col_cost')}</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>{t('stock_col_margin')}</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>{t('stock_col_value')}</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>{t('stock_col_actions')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {itemsWithMargins.map((item, index) => (
                                                <tr key={item._id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s ease' }}>
                                                    <td style={{ padding: '16px', fontWeight: '600', color: '#1e293b' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            {item.imageUrl && (
                                                                <img src={item.imageUrl} alt="" style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }} />
                                                            )}
                                                            <div>
                                                                <div style={{ fontSize: '14px' }}>{item.name}</div>
                                                                <div style={{ fontSize: '11px', color: '#94a3b8' }}>{item.category?.name || t('no_category')}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '16px' }}>
                                                        <span style={{
                                                            padding: '4px 8px',
                                                            borderRadius: '6px',
                                                            fontSize: '11px',
                                                            fontWeight: '700',
                                                            background: item.stockControlled ? '#e0e7ff' : '#f1f5f9',
                                                            color: item.stockControlled ? '#4338ca' : '#94a3b8',
                                                            textTransform: 'uppercase'
                                                        }}>
                                                            {item.stockControlled ? t('stock_controlled') : t('stock_uncontrolled')}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '16px' }}>
                                                        {editingId === item._id ? (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1', width: 'fit-content' }}>
                                                                    <button
                                                                        onClick={() => setAdjustType('add')}
                                                                        style={{ padding: '4px 8px', border: 'none', background: adjustType === 'add' ? '#3b82f6' : 'white', color: adjustType === 'add' ? 'white' : '#64748b', fontSize: '11px', fontWeight: 'bold' }}
                                                                    >{t('stock_entry')}</button>
                                                                    <button
                                                                        onClick={() => setAdjustType('set')}
                                                                        style={{ padding: '4px 8px', border: 'none', background: adjustType === 'set' ? '#3b82f6' : 'white', color: adjustType === 'set' ? 'white' : '#64748b', fontSize: '11px', fontWeight: 'bold' }}
                                                                    >{t('stock_set')}</button>
                                                                </div>
                                                                <input
                                                                    type="number"
                                                                    value={editValue}
                                                                    onChange={e => setEditValue(e.target.value)}
                                                                    autoFocus
                                                                    style={{
                                                                        width: '100px',
                                                                        padding: '8px 12px',
                                                                        border: '1px solid #cbd5e1',
                                                                        borderRadius: '8px',
                                                                        fontSize: '14px'
                                                                    }}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <span style={{
                                                                padding: '4px 10px',
                                                                borderRadius: '8px',
                                                                background: !item.stockControlled ? '#f8fafc' : (item.stock <= (item.stockMin || 5) ? '#fef2f2' : '#f0fdf4'),
                                                                fontWeight: '700',
                                                                color: !item.stockControlled ? '#94a3b8' : (item.stock <= (item.stockMin || 5) ? '#ef4444' : '#10b981')
                                                            }}>
                                                                {item.stockControlled ? item.stock : '--'}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '16px', color: '#64748b', fontSize: '13px' }}>
                                                        {item.unit || 'Un.'}
                                                    </td>
                                                    <td style={{ padding: '16px', color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>
                                                        {item.stockControlled ? (item.stockMin || 0) : '--'}
                                                    </td>
                                                    <td style={{ padding: '16px', color: '#475569', fontWeight: '500' }}>{convertAndFormat(item.price)}</td>
                                                    <td style={{ padding: '16px', color: '#64748b' }}>{convertAndFormat(item.costPrice)}</td>
                                                    <td style={{ padding: '16px' }}>
                                                        <span style={{
                                                            fontWeight: '700',
                                                            color: item.marginPercent > 50 ? '#10b981' : item.marginPercent > 20 ? '#f59e0b' : '#ef4444'
                                                        }}>
                                                            {item.marginPercent.toFixed(1)}%
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '16px', fontWeight: '600', color: '#1e293b' }}>
                                                        {convertAndFormat(item.stock * item.costPrice)}
                                                    </td>
                                                    <td style={{ padding: '16px', textAlign: 'right' }}>
                                                        {editingId === item._id ? (
                                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                                <button
                                                                    onClick={() => handleSaveStock(item._id, item)}
                                                                    style={{
                                                                        padding: '8px',
                                                                        background: '#10b981',
                                                                        border: 'none',
                                                                        borderRadius: '8px',
                                                                        color: 'white',
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
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px',
                                                                    marginLeft: 'auto'
                                                                }}
                                                            >
                                                                <PlusCircle size={16} /> <span>{t('stock_col_stock')}</span>
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
                                {/* Top Value Items Chart */}
                                <div style={cardStyle}>
                                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '24px' }}>
                                        {t('stock_chart_title')}
                                    </h3>
                                    <div style={{ height: '400px' }}>
                                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
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
                                                    formatter={(value) => [convertAndFormat(value), t('stock_total_value_label')]}
                                                />
                                                <Bar dataKey="value" fill="#6366f1" radius={[0, 8, 8, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <p style={{ fontSize: '12px', textAlign: 'center', color: '#94a3b8', marginTop: '16px' }}>
                                        {t('stock_chart_note')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div style={cardStyle}>
                    <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                            {t('stock_movements_title')}
                        </h3>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <select
                                value={historyFilters.type}
                                onChange={e => setHistoryFilters(prev => ({ ...prev, type: e.target.value, page: 1 }))}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    fontSize: '14px',
                                    color: '#475569',
                                    outline: 'none'
                                }}
                            >
                                <option value="">{t('stock_all_types')}</option>
                                <option value="sale">{t('stock_type_sale')}</option>
                                <option value="restock">{t('stock_type_restock')}</option>
                                <option value="waste">{t('stock_type_waste')}</option>
                                <option value="adjustment">{t('stock_type_adjustment')}</option>
                            </select>
                        </div>
                    </div>

                    {historyLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
                            <LoadingSpinner size={32} />
                        </div>
                    ) : movements.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
                            <History size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
                            <p>{t('stock_no_movements')}</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>{t('stock_col_date')}</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>{t('stock_col_product')}</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>{t('stock_col_type')}</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>{t('stock_col_prev')}</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>{t('stock_col_change')}</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>{t('stock_col_current')}</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>{t('stock_col_ref')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {movements.map((mov) => {
                                        let typeColor, typeBg, typeLabel;
                                        switch (mov.type) {
                                            case 'sale': typeColor = '#3b82f6'; typeBg = '#eff6ff'; typeLabel = t('stock_type_sale'); break;
                                            case 'restock': typeColor = '#10b981'; typeBg = '#ecfdf5'; typeLabel = t('stock_type_restock'); break;
                                            case 'waste': typeColor = '#ef4444'; typeBg = '#fef2f2'; typeLabel = t('stock_type_waste'); break;
                                            default: typeColor = '#f59e0b'; typeBg = '#fffbeb'; typeLabel = t('stock_type_adjustment'); break;
                                        }

                                        return (
                                            <tr key={mov._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '16px', color: '#64748b', fontSize: '13px' }}>
                                                    {new Date(mov.createdAt).toLocaleString(i18n.language)}
                                                </td>
                                                <td style={{ padding: '16px', fontWeight: '600', color: '#1e293b' }}>
                                                    {mov.menuItem?.name || t('stock_deleted_product')}
                                                </td>
                                                <td style={{ padding: '16px' }}>
                                                    <span style={{ padding: '4px 8px', borderRadius: '6px', background: typeBg, color: typeColor, fontSize: '12px', fontWeight: '600' }}>
                                                        {typeLabel}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '16px', textAlign: 'right', color: '#64748b' }}>
                                                    {mov.quantityBefore}
                                                </td>
                                                <td style={{ padding: '16px', textAlign: 'right', fontWeight: '700', color: mov.quantity > 0 ? '#10b981' : '#ef4444' }}>
                                                    {mov.quantity > 0 ? '+' : ''}{mov.quantity}
                                                </td>
                                                <td style={{ padding: '16px', textAlign: 'right', fontWeight: '600', color: '#1e293b' }}>
                                                    {mov.quantityAfter}
                                                </td>
                                                <td style={{ padding: '16px', color: '#64748b', fontSize: '13px' }}>
                                                    {mov.reason ? (
                                                        mov.reason.startsWith('stock_') ? t(mov.reason) : mov.reason
                                                    ) : (
                                                        mov.order ? `${t('order_id')} ${mov.order.orderNumber || 'ref'}` : t('manual')
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
                                    <button
                                        onClick={() => setHistoryFilters(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
                                        disabled={historyFilters.page === 1}
                                        style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: historyFilters.page === 1 ? 'not-allowed' : 'pointer', color: historyFilters.page === 1 ? '#cbd5e1' : '#475569' }}
                                    >
                                        {t('previous')}
                                    </button>
                                    <span style={{ padding: '8px 16px', fontSize: '14px', color: '#64748b' }}>
                                        {t('page_of', { page: historyFilters.page, total: totalPages })}
                                    </span>
                                    <button
                                        onClick={() => setHistoryFilters(p => ({ ...p, page: Math.min(totalPages, p.page + 1) }))}
                                        disabled={historyFilters.page === totalPages}
                                        style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: historyFilters.page === totalPages ? 'not-allowed' : 'pointer', color: historyFilters.page === totalPages ? '#cbd5e1' : '#475569' }}
                                    >
                                        {t('next')}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
