import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area
} from 'recharts';
import { DollarSign, TrendingUp, CreditCard, ShoppingBag } from 'lucide-react';

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

export default function FinancialTab({ data, loading }) {
    if (loading) return <div className="p-4 text-center">Loading financial data...</div>;
    if (!data) return <div className="p-4 text-center">No financial data available.</div>;

    const {
        summary = {
            totalRevenue: 0,
            grossMargin: 0,
            marginPercentage: 0,
            avgTicket: 0,
            totalOrders: 0
        },
        trend = []
    } = data;

    const cards = [
        {
            title: 'Total Revenue',
            value: `${summary.totalRevenue?.toLocaleString()} MT`,
            icon: DollarSign,
            color: '#10b981',
            bg: '#ecfdf5'
        },
        {
            title: 'Gross Margin',
            value: `${summary.grossMargin?.toLocaleString()} MT`,
            sub: `${summary.marginPercentage?.toFixed(1)}%`,
            icon: TrendingUp,
            color: '#8b5cf6',
            bg: '#f5f3ff'
        },
        {
            title: 'Avg Ticket',
            value: `${summary.avgTicket?.toFixed(2)} MT`,
            icon: CreditCard,
            color: '#3b82f6',
            bg: '#eff6ff'
        },
        {
            title: 'Total Orders',
            value: summary.totalOrders,
            icon: ShoppingBag,
            color: '#f59e0b',
            bg: '#fffbeb'
        }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* KPI Cards */}
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', width: '100%' }}>
                {cards.map((card, idx) => (
                    <div key={idx} style={statCardStyle} onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.1)';
                    }} onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.05)';
                    }}>
                        <div>
                            <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {card.title}
                            </p>
                            <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b', margin: '8px 0 0 0' }}>
                                {card.value}
                            </h3>
                            {card.sub && <p style={{ fontSize: '12px', color: '#10b981', marginTop: '4px', fontWeight: '600' }}>{card.sub}</p>}
                        </div>
                        <div style={iconBoxStyle(card.color, card.bg)}>
                            <card.icon size={24} strokeWidth={2.5} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Revenue Trend Chart */}
            <div style={cardStyle}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '24px' }}>
                    Revenue Trend
                </h3>
                {trend.length > 0 ? (
                    <div style={{ width: '100%', height: 350 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trend}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                />
                                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '350px', color: '#cbd5e1' }}>
                        <p>No trend data available</p>
                    </div>
                )}
            </div>
        </div>
    );
}
