
import React from 'react';
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
    if (!data || loading) return null;

    const { revenue, cogs, grossProfit, otherExpenses, netProfit, profitMargin } = data;

    const COLORS = ['#10b981', '#f59e0b', '#ef4444'];
    
    const pieData = [
        { name: 'Lucro Líquido', value: Math.max(0, netProfit) },
        { name: 'COGS (Custo Prod)', value: cogs },
        { name: 'Despesas Op', value: otherExpenses }
    ];

    const barData = [
        { name: 'Receita', value: revenue },
        { name: 'Custo Prod (COGS)', value: cogs },
        { name: 'Margem Bruta', value: grossProfit },
        { name: 'Despesas Op', value: otherExpenses },
        { name: 'Lucro Líquido', value: netProfit }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* KPI Cards */}
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div style={{ ...cardStyle, flex: 1, minWidth: '240px', borderLeft: '4px solid #10b981' }}>
                    <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase' }}>Margem de Lucro</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                        <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b', margin: 0 }}>{profitMargin}%</h3>
                        <div style={{ padding: '4px 8px', borderRadius: '20px', background: '#ecfdf5', color: '#10b981', fontSize: '12px', fontWeight: '700' }}>
                            <TrendingUp size={14} style={{ marginRight: '4px' }}/>
                            Saudável
                        </div>
                    </div>
                </div>

                <div style={{ ...cardStyle, flex: 1, minWidth: '240px' }}>
                    <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase' }}>Lucro Bruto</p>
                    <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b', marginTop: '12px' }}>{grossProfit?.toLocaleString()} MT</h3>
                    <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Receita - COGS</p>
                </div>

                <div style={{ ...cardStyle, flex: 1, minWidth: '240px' }}>
                    <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase' }}>Lucro Líquido</p>
                    <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#10b981', marginTop: '12px' }}>{netProfit?.toLocaleString()} MT</h3>
                    <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Final após despesas</p>
                </div>
            </div>

            {/* Analysis Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
                
                {/* Breakdown Chart */}
                <div style={cardStyle}>
                    <h4 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '24px' }}>Estrutura de Custos vs Lucro</h4>
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
                                    formatter={(value) => `${value.toLocaleString()} MT`}
                                />
                                <Legend verticalAlign="bottom" height={36}/>
                            </PieChart>
                        </ResponsiveContainer>
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                            <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Receita Total</p>
                            <h4 style={{ fontSize: '20px', fontWeight: '800', color: '#1e293b', margin: 0 }}>{revenue?.toLocaleString()} MT</h4>
                        </div>
                    </div>
                </div>

                {/* Growth/Comparison Bar Chart */}
                <div style={cardStyle}>
                    <h4 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '24px' }}>Fluxo Financeiro Resumido</h4>
                    <div style={{ width: '100%', height: 350 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData} layout="vertical" margin={{ left: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={12} tick={{ fill: '#64748b' }} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                    formatter={(value) => `${value.toLocaleString()} MT`}
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
                        <span style={{ opacity: 0.7, fontSize: '13px', fontWeight: '600', textTransform: 'uppercase' }}>Receita de Pedidos</span>
                        <h4 style={{ fontSize: '24px', fontWeight: '800', margin: '8px 0' }}>{revenue?.toLocaleString()} MT</h4>
                        <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: '100%', height: '100%', background: '#3b82f6' }}></div>
                        </div>
                    </div>
                    <div>
                        <span style={{ opacity: 0.7, fontSize: '13px', fontWeight: '600', textTransform: 'uppercase' }}>Custo Total (Produtos)</span>
                        <h4 style={{ fontSize: '24px', fontWeight: '800', margin: '8px 0' }}>{cogs?.toLocaleString()} MT</h4>
                        <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${(cogs/revenue)*100}%`, height: '100%', background: '#f59e0b' }}></div>
                        </div>
                    </div>
                    <div>
                        <span style={{ opacity: 0.7, fontSize: '13px', fontWeight: '600', textTransform: 'uppercase' }}>Despesas Operacionais</span>
                        <h4 style={{ fontSize: '24px', fontWeight: '800', margin: '8px 0' }}>{otherExpenses?.toLocaleString()} MT</h4>
                        <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${(otherExpenses/revenue)*100}%`, height: '100%', background: '#ef4444' }}></div>
                        </div>
                    </div>
                    <div>
                        <span style={{ opacity: 0.7, fontSize: '13px', fontWeight: '600', textTransform: 'uppercase' }}>Lucro Final</span>
                        <h4 style={{ fontSize: '24px', fontWeight: '800', color: '#10b981', margin: '8px 0' }}>{netProfit?.toLocaleString()} MT</h4>
                        <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${(netProfit/revenue)*100}%`, height: '100%', background: '#10b981' }}></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
