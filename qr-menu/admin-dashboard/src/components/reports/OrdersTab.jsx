
import React from 'react';
import { 
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { ShoppingBag, Globe, Phone, QrCode, ClipboardList } from 'lucide-react';

const cardStyle = {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
    border: '1px solid rgba(0,0,0,0.02)',
};

export default function OrdersTab({ data, loading }) {
    if (!data || loading) return null;

    const { byStatus, bySource, byType, total } = data;

    const STATUS_COLORS = {
        completed: '#10b981',
        cancelled: '#ef4444',
        pending: '#f59e0b',
        preparing: '#3b82f6',
        ready: '#8b5cf6',
        served: '#059669'
    };

    const SOURCE_COLORS = {
        'qr-menu': '#3b82f6',
        'waiter': '#10b981',
        'phone': '#f59e0b',
        'delivery': '#8b5cf6'
    };

    const TYPE_COLORS = {
        'dine-in': '#10b981',
        'takeaway': '#f59e0b',
        'delivery': '#3b82f6',
        'room-service': '#8b5cf6'
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* KPI Summary */}
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div style={{ ...cardStyle, flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>Total de Pedidos</span>
                        <div style={{ padding: '8px', background: '#eff6ff', borderRadius: '8px', color: '#3b82f6' }}>
                            <ShoppingBag size={20} />
                        </div>
                    </div>
                    <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b', marginTop: '12px' }}>{total}</h3>
                </div>

                <div style={{ ...cardStyle, flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>Taxa de Conclusão</span>
                        <div style={{ padding: '8px', background: '#ecfdf5', borderRadius: '8px', color: '#10b981' }}>
                            <ClipboardList size={20} />
                        </div>
                    </div>
                    <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#10b981', marginTop: '12px' }}>
                        {total > 0 ? ((byStatus.find(s => s._id === 'completed')?.count || 0) / total * 100).toFixed(1) : 0}%
                    </h3>
                </div>

                <div style={{ ...cardStyle, flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>Taxa de Cancelamento</span>
                        <div style={{ padding: '8px', background: '#fef2f2', borderRadius: '8px', color: '#ef4444' }}>
                            <ClipboardList size={20} />
                        </div>
                    </div>
                    <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#ef4444', marginTop: '12px' }}>
                        {total > 0 ? ((byStatus.find(s => s._id === 'cancelled')?.count || 0) / total * 100).toFixed(1) : 0}%
                    </h3>
                </div>
            </div>

            {/* Charts Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
                
                {/* Orders by Status */}
                <div style={cardStyle}>
                    <h4 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '24px' }}>Pedidos por Estado</h4>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={byStatus}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="_id" axisLine={false} tickLine={false} fontSize={10} tick={{ fill: '#64748b' }} />
                                <YAxis axisLine={false} tickLine={false} fontSize={12} tick={{ fill: '#64748b' }} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Pedidos">
                                    {byStatus.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry._id] || '#cbd5e1'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Orders by Source */}
                <div style={cardStyle}>
                    <h4 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '24px' }}>Origem dos Pedidos</h4>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={bySource}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="count"
                                    nameKey="_id"
                                >
                                    {bySource.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={SOURCE_COLORS[entry._id] || '#cbd5e1'} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                <Legend verticalAlign="bottom" height={36}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Orders by Type */}
                <div style={cardStyle}>
                    <h4 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '24px' }}>Tipo de Pedido</h4>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={byType}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="count"
                                    nameKey="_id"
                                >
                                    {byType.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={TYPE_COLORS[entry._id] || '#cbd5e1'} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                <Legend verticalAlign="bottom" height={36}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Source Icons legend */}
            <div style={{ ...cardStyle, display: 'flex', gap: '40px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ padding: '6px', background: '#eff6ff', borderRadius: '4px', color: '#3b82f6' }}><QrCode size={16}/></div>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Menu QR</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ padding: '6px', background: '#ecfdf5', borderRadius: '4px', color: '#10b981' }}><ClipboardList size={16}/></div>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Garçom</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ padding: '6px', background: '#fffbeb', borderRadius: '4px', color: '#f59e0b' }}><Phone size={16}/></div>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Telefone</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ padding: '6px', background: '#f5f3ff', borderRadius: '4px', color: '#8b5cf6' }}><Globe size={16}/></div>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Delivery</span>
                </div>
            </div>
        </div>
    );
}
