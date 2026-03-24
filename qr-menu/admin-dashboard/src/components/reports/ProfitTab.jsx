
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../../contexts/CurrencyContext';
import { 
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { DollarSign, TrendingUp, CreditCard, ChevronDown, Percent } from 'lucide-react';

const cardStyle = {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
    border: '1px solid rgba(0,0,0,0.02)',
};

export default function ProfitTab({ data, loading }) {
    const { t } = useTranslation();
    const { convertAndFormat } = useCurrency();

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', color: '#64748b' }}>
            <p>{t('loading_profit_data') || 'Loading profit data...'}</p>
        </div>
    );

    if (!data) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', color: '#64748b' }}>
            <p>{t('no_profit_data') || 'No profit data available.'}</p>
        </div>
    );

    const { 
        revenue = 0, 
        cogs = 0, 
        grossProfit = 0, 
        otherExpenses = 0, 
        netProfit = 0, 
        profitMargin = 0 
    } = data || {};

    const COLORS = ['#10b981', '#f59e0b', '#ef4444'];
    
    const pieData = [
        { name: t('net_profit'), value: Math.max(0, netProfit) },
        { name: t('cogs'), value: cogs },
        { name: t('op_expenses'), value: otherExpenses }
    ];

    const barData = [
        { name: t('revenue'), value: revenue },
        { name: t('cogs'), value: cogs },
        { name: t('gross_margin'), value: grossProfit },
        { name: t('op_expenses'), value: otherExpenses },
        { name: t('net_profit'), value: netProfit }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* KPI Cards */}
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div style={{ ...cardStyle, flex: 1, minWidth: '240px', borderLeft: '4px solid #10b981' }}>
                    <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase' }}>{t('profit_margin')}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                        <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b', margin: 0 }}>{profitMargin}%</h3>
                        <div style={{ padding: '4px 8px', borderRadius: '20px', background: '#ecfdf5', color: '#10b981', fontSize: '12px', fontWeight: '700' }}>
                            <TrendingUp size={14} style={{ marginRight: '4px' }}/>
                            {t('healthy')}
                        </div>
                    </div>
                </div>

                <div style={{ ...cardStyle, flex: 1, minWidth: '240px' }}>
                    <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase' }}>{t('gross_profit')}</p>
                    <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b', marginTop: '12px' }}>{convertAndFormat(grossProfit || 0, 'MZN')}</h3>
                    <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{t('revenue_minus_cogs')}</p>
                </div>

                <div style={{ ...cardStyle, flex: 1, minWidth: '240px' }}>
                    <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase' }}>{t('net_profit')}</p>
                    <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#10b981', marginTop: '12px' }}>{convertAndFormat(netProfit || 0, 'MZN')}</h3>
                    <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{t('final_after_expenses')}</p>
                </div>
            </div>

            {/* Analysis Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
                
                {/* Breakdown Chart */}
                <div style={cardStyle}>
                    <h4 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '24px' }}>{t('cost_structure_profit')}</h4>
                    <div style={{ width: '100%', height: 350 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={120}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                    formatter={(value) => convertAndFormat(value, 'MZN')}
                                />
                                <Legend verticalAlign="bottom" height={36}/>
                            </PieChart>
                        </ResponsiveContainer>
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                            <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>{t('total_revenue')}</p>
                            <h4 style={{ fontSize: '20px', fontWeight: '800', color: '#1e293b', margin: 0 }}>{convertAndFormat(revenue, 'MZN')}</h4>
                        </div>
                    </div>
                </div>

                {/* Growth/Comparison Bar Chart */}
                <div style={cardStyle}>
                    <h4 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '24px' }}>{t('financial_flow_summary')}</h4>
                    <div style={{ width: '100%', height: 350 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData} layout="vertical" margin={{ left: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={12} tick={{ fill: '#64748b' }} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                    formatter={(value) => convertAndFormat(value, 'MZN')}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                    {barData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.value < 0 ? '#ef4444' : (index === 0 ? '#3b82f6' : (index === 4 ? '#10b981' : '#f59e0b'))} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Financial Summary Box */}
            <div style={{ ...cardStyle, background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', color: 'white' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '40px' }}>
                    <div>
                        <span style={{ opacity: 0.7, fontSize: '13px', fontWeight: '600', textTransform: 'uppercase' }}>{t('order_revenue')}</span>
                        <h4 style={{ fontSize: '24px', fontWeight: '800', margin: '8px 0' }}>{convertAndFormat(revenue || 0, 'MZN')}</h4>
                        <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: '100%', height: '100%', background: '#3b82f6' }}></div>
                        </div>
                    </div>
                    <div>
                        <span style={{ opacity: 0.7, fontSize: '13px', fontWeight: '600', textTransform: 'uppercase' }}>{t('total_product_cost')}</span>
                        <h4 style={{ fontSize: '24px', fontWeight: '800', margin: '8px 0' }}>{convertAndFormat(cogs || 0, 'MZN')}</h4>
                        <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${revenue > 0 ? (cogs/revenue)*100 : 0}%`, height: '100%', background: '#f59e0b' }}></div>
                        </div>
                    </div>
                    <div>
                        <span style={{ opacity: 0.7, fontSize: '13px', fontWeight: '600', textTransform: 'uppercase' }}>{t('operational_expenses')}</span>
                        <h4 style={{ fontSize: '24px', fontWeight: '800', margin: '8px 0' }}>{convertAndFormat(otherExpenses || 0, 'MZN')}</h4>
                        <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${revenue > 0 ? (otherExpenses/revenue)*100 : 0}%`, height: '100%', background: '#ef4444' }}></div>
                        </div>
                    </div>
                    <div>
                        <span style={{ opacity: 0.7, fontSize: '13px', fontWeight: '600', textTransform: 'uppercase' }}>{t('final_profit')}</span>
                        <h4 style={{ fontSize: '24px', fontWeight: '800', color: '#10b981', margin: '8px 0' }}>{convertAndFormat(netProfit || 0, 'MZN')}</h4>
                        <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${revenue > 0 ? (netProfit/revenue)*100 : 0}%`, height: '100%', background: '#10b981' }}></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
