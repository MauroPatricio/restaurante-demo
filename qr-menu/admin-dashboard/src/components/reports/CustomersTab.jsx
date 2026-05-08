import { useTranslation } from 'react-i18next';
import { useCurrency } from '../../contexts/CurrencyContext';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { Users, UserCheck, Star, Calendar, MapPin } from 'lucide-react';

const cardStyle = {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
    border: '1px solid rgba(0,0,0,0.02)',
};
export default function CustomersTab({ data, loading }) {
    const { t } = useTranslation();
    const { convertAndFormat } = useCurrency();
    
    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', color: '#64748b' }}>
            <p>{t('loading_customers_data') || 'Loading customers data...'}</p>
        </div>
    );

    if (!data) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', color: '#64748b' }}>
            <p>{t('no_customers_data') || 'No customers data available.'}</p>
        </div>
    );

    const { summary = {}, customers = [] } = data || {};

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    const loyaltyData = [
        { name: t('recurring_customers'), value: summary.recurringCustomers || 0 },
        { name: t('new_customers'), value: (summary.totalCustomers || 0) - (summary.recurringCustomers || 0) }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* KPI Summary */}
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div style={{ ...cardStyle, flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>{t('total_customers')}</span>
                        <div style={{ padding: '8px', background: '#eff6ff', borderRadius: '8px', color: '#3b82f6' }}>
                            <Users size={20} />
                        </div>
                    </div>
                    <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b', marginTop: '12px' }}>{summary.totalCustomers || 0}</h3>
                </div>

                <div style={{ ...cardStyle, flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>{t('recurring_customers_kpi')}</span>
                        <div style={{ padding: '8px', background: '#ecfdf5', borderRadius: '8px', color: '#10b981' }}>
                            <UserCheck size={20} />
                        </div>
                    </div>
                    <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#10b981', marginTop: '12px' }}>{summary.recurringCustomers || 0}</h3>
                </div>

                <div style={{ ...cardStyle, flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>{t('loyalty_rate')}</span>
                        <div style={{ padding: '8px', background: '#fffbeb', borderRadius: '8px', color: '#f59e0b' }}>
                            <Star size={20} />
                        </div>
                    </div>
                    <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#f59e0b', marginTop: '12px' }}>{summary.loyaltyRate || 0}%</h3>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
                
                {/* Loyalty Chart */}
                <div style={cardStyle}>
                    <h4 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '24px' }}>{t('new_vs_recurring')}</h4>
                    <div style={{ width: '100%', height: 300, minWidth: 0 }}>
                        <ResponsiveContainer width="100%" height={350} debounce={50}>
                            <PieChart>
                                <Pie
                                    data={loyaltyData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {loyaltyData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#3b82f6'} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                <Legend verticalAlign="bottom" height={36}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Customers Table */}
                <div style={cardStyle}>
                    <h4 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '24px' }}>{t('top_customers_ranking')}</h4>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #f1f5f9', textAlign: 'left' }}>
                                    <th style={{ padding: '12px', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>{t('customer')}</th>
                                    <th style={{ padding: '12px', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>{t('visits_label')}</th>
                                    <th style={{ padding: '12px', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>{t('orders')}</th>
                                    <th style={{ padding: '12px', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>{t('total_spent')}</th>
                                    <th style={{ padding: '12px', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>{t('favorite_label')}</th>
                                    <th style={{ padding: '12px', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>{t('last_visit_label')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customers.slice(0, 10).map((c, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
                                        <td style={{ padding: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ 
                                                    width: '32px', height: '32px', borderRadius: '50%', background: '#f1f5f9', 
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: '#475569', fontSize: '12px' 
                                                }}>
                                                    {c.name ? c.name.charAt(0).toUpperCase() : 'C'}
                                                </div>
                                                <div>
                                                    <p style={{ margin: 0, fontWeight: '700', fontSize: '14px', color: '#1e293b' }}>{c.name || t('customer')}</p>
                                                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>{c.phone}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px', fontSize: '14px', color: '#10b981', fontWeight: '700' }}>{c.visitCount || c.orders || 1}</td>
                                        <td style={{ padding: '12px', fontSize: '14px', color: '#1e293b', fontWeight: '600' }}>{c.orderCount || c.orders}</td>
                                        <td style={{ padding: '12px', fontSize: '14px', color: '#10b981', fontWeight: '700' }}>{convertAndFormat(c.totalSpent || 0, 'MZN')}</td>
                                        <td style={{ padding: '12px', fontSize: '14px', color: '#3b82f6', fontWeight: '500' }}>{c.favoriteItem || '-'}</td>
                                        <td style={{ padding: '12px', fontSize: '14px', color: '#64748b' }}>
                                            {c.lastVisit ? new Date(c.lastVisit).toLocaleDateString() : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

