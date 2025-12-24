import { Package, AlertCircle, DollarSign, TrendingDown } from 'lucide-react';

// Modern Card Styles (matching SalesTab)
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

export default function InventoryTab({ data, loading }) {
    if (loading) return <div className="p-4 text-center">Loading inventory data...</div>;
    if (!data) return <div className="p-4 text-center">No inventory data available.</div>;

    const {
        summary = { totalValue: 0, lowStockCount: 0, totalItems: 0 },
        items = []
    } = data;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

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
                            Total Inventory Value
                        </p>
                        <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b', margin: '8px 0 0 0' }}>
                            {summary.totalValue?.toLocaleString()} MT
                        </h3>
                    </div>
                    <div style={iconBoxStyle('#10b981', '#ecfdf5')}>
                        <DollarSign size={24} strokeWidth={2.5} />
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
                            Low Stock Items
                        </p>
                        <h3 style={{ fontSize: '32px', fontWeight: '800', color: summary.lowStockCount > 0 ? '#ef4444' : '#1e293b', margin: '8px 0 0 0' }}>
                            {summary.lowStockCount}
                        </h3>
                        {summary.lowStockCount > 0 && (
                            <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: '600' }}>
                                Requires attention
                            </p>
                        )}
                    </div>
                    <div style={iconBoxStyle(summary.lowStockCount > 0 ? '#ef4444' : '#f59e0b', summary.lowStockCount > 0 ? '#fef2f2' : '#fffbeb')}>
                        <AlertCircle size={24} strokeWidth={2.5} />
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
                            Total Items Tracked
                        </p>
                        <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b', margin: '8px 0 0 0' }}>
                            {summary.totalItems}
                        </h3>
                    </div>
                    <div style={iconBoxStyle('#3b82f6', '#eff6ff')}>
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
                            Stock Health
                        </p>
                        <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b', margin: '8px 0 0 0' }}>
                            {summary.totalItems > 0 ? ((1 - summary.lowStockCount / summary.totalItems) * 100).toFixed(0) : 100}%
                        </h3>
                        <p style={{ fontSize: '12px', color: '#10b981', marginTop: '4px', fontWeight: '600' }}>
                            {summary.totalItems - summary.lowStockCount} items OK
                        </p>
                    </div>
                    <div style={iconBoxStyle('#8b5cf6', '#f5f3ff')}>
                        <TrendingDown size={24} strokeWidth={2.5} />
                    </div>
                </div>
            </div>

            {/* Inventory Table */}
            <div style={cardStyle}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '16px' }}>
                    Stock Levels
                </h3>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '14px', textAlign: 'left' }}>
                        <thead style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <tr>
                                <th style={{ padding: '12px 24px' }}>Item Name</th>
                                <th style={{ padding: '12px 24px', textAlign: 'right' }}>Cost Price</th>
                                <th style={{ padding: '12px 24px', textAlign: 'right' }}>Stock Qty</th>
                                <th style={{ padding: '12px 24px', textAlign: 'right' }}>Total Value</th>
                                <th style={{ padding: '12px 24px', textAlign: 'center' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, idx) => (
                                <tr key={idx} style={{ background: 'white', borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                >
                                    <td style={{ padding: '16px 24px', fontWeight: '600', color: '#1e293b' }}>
                                        {item.name}
                                    </td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right', color: '#64748b' }}>
                                        {(item.costPrice || 0).toLocaleString()} MT
                                    </td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: '600' }}>
                                        {item.stock || 0}
                                    </td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right', color: '#64748b' }}>
                                        {(item.totalValue || 0).toLocaleString()} MT
                                    </td>
                                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                                        {item.status === 'Low' ? (
                                            <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                padding: '4px 12px',
                                                borderRadius: '9999px',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                background: '#fef2f2',
                                                color: '#ef4444'
                                            }}>
                                                Low Stock
                                            </span>
                                        ) : (
                                            <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                padding: '4px 12px',
                                                borderRadius: '9999px',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                background: '#ecfdf5',
                                                color: '#10b981'
                                            }}>
                                                OK
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {items.length === 0 && (
                                <tr>
                                    <td colSpan="5" style={{ padding: '32px 24px', textAlign: 'center', color: '#94a3b8' }}>
                                        No items found. Ensure Items have stock tracking enabled.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
