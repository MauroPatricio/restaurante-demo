import React from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../../contexts/CurrencyContext';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend
} from 'recharts';
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp } from 'lucide-react';

const cardStyle = {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
    border: '1px solid rgba(0,0,0,0.02)',
};

export default function CashFlowTab({ data, loading }) {
    const { t } = useTranslation();
    const { convertAndFormat } = useCurrency();

    if (!data || loading) return null;

    const { daily = [], summary = {} } = data || {};

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* KPI Cards */}
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div style={{ ...cardStyle, flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>{t('total_entries')}</span>
                        <div style={{ padding: '8px', background: '#ecfdf5', borderRadius: '8px', color: '#10b981' }}>
                            <ArrowUpRight size={20} />
                        </div>
                    </div>
                    <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b', marginTop: '12px' }}>
                        {convertAndFormat(summary.totalEntradas || 0, 'MZN')}
                    </h3>
                </div>

                <div style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>{t('total_exits')}</span>
                        <div style={{ padding: '8px', background: '#fef2f2', borderRadius: '8px', color: '#ef4444' }}>
                            <ArrowDownRight size={20} />
                        </div>
                    </div>
                    <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#ef4444', marginTop: '12px' }}>
                        {convertAndFormat(summary.totalSaidas || 0, 'MZN')}
                    </h3>
                </div>

                <div style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>{t('net_balance')}</span>
                        <div style={{ padding: '8px', background: '#ecfdf5', borderRadius: '8px', color: '#10b981' }}>
                            <TrendingUp size={20} />
                        </div>
                    </div>
                    <h3 style={{ fontSize: '32px', fontWeight: '800', color: (summary.netBalance || 0) >= 0 ? '#10b981' : '#ef4444', marginTop: '12px' }}>
                        {convertAndFormat(summary.netBalance || 0, 'MZN')}
                    </h3>
                </div>
            </div>

            {/* Charts Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
                
                {/* Daily Entries vs Exits */}
                <div style={cardStyle}>
                    <h4 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '24px' }}>
                        {t('daily_entries_exits')}
                    </h4>
                    <div style={{ width: '100%', height: 300, minWidth: 0 }}>
                        <ResponsiveContainer width="100%" height={350} debounce={50}>
                            <BarChart data={daily}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} fontSize={12} tick={{ fill: '#64748b' }} />
                                <YAxis axisLine={false} tickLine={false} fontSize={12} tick={{ fill: '#64748b' }} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                />
                                <Legend verticalAlign="top" height={36}/>
                                <Bar dataKey="entradas" fill="#10b981" radius={[4, 4, 0, 0]} name={t('entries')} />
                                <Bar dataKey="saidas" fill="#ef4444" radius={[4, 4, 0, 0]} name={t('exits')} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Balance Trend */}
                <div style={cardStyle}>
                    <h4 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '24px' }}>
                        {t('balance_trend')}
                    </h4>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={daily}>
                                <defs>
                                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} fontSize={12} tick={{ fill: '#64748b' }} />
                                <YAxis axisLine={false} tickLine={false} fontSize={12} tick={{ fill: '#64748b' }} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="balance" 
                                    stroke="#3b82f6" 
                                    strokeWidth={3}
                                    fillOpacity={1} 
                                    fill="url(#colorBalance)" 
                                    name={t('accumulated_balance')}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Daily Table */}
            <div style={cardStyle}>
                <h4 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '24px' }}>
                    {t('daily_records')}
                </h4>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #f1f5f9', textAlign: 'left' }}>
                                <th style={{ padding: '12px', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>{t('date')}</th>
                                <th style={{ padding: '12px', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>{t('entries')}</th>
                                <th style={{ padding: '12px', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>{t('exits')}</th>
                                <th style={{ padding: '12px', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>{t('daily_profit')}</th>
                                <th style={{ padding: '12px', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>{t('accumulated_balance')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {daily.map((row, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
                                    <td style={{ padding: '12px', fontSize: '14px', color: '#1e293b' }}>{row.date}</td>
                                    <td style={{ padding: '12px', fontSize: '14px', color: '#10b981', fontWeight: '600' }}>+{convertAndFormat(row.entradas, 'MZN')}</td>
                                    <td style={{ padding: '12px', fontSize: '14px', color: '#ef4444', fontWeight: '600' }}>-{convertAndFormat(row.saidas, 'MZN')}</td>
                                    <td style={{ padding: '12px', fontSize: '14px', color: (row.entradas - row.saidas) >= 0 ? '#10b981' : '#ef4444', fontWeight: '600' }}>
                                        {convertAndFormat(row.entradas - row.saidas, 'MZN')}
                                    </td>
                                    <td style={{ padding: '12px', fontSize: '14px', color: '#1e293b', fontWeight: '700' }}>{convertAndFormat(row.balance, 'MZN')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

