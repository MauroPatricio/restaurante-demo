import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { analyticsAPI } from '../services/api';
import {
    Search, Download, Users, Phone, Calendar,
    DollarSign, UserCheck, Star, ArrowUpRight
} from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale/pt';
import { useTranslation } from 'react-i18next';

export default function Clients() {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [data, setData] = useState({ summary: {}, customers: [] });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (user?.restaurant) {
            fetchClients();
        }
    }, [user]);

    const fetchClients = async () => {
        try {
            setLoading(true);
            const restaurantId = user.restaurant._id || user.restaurant;
            const response = await analyticsAPI.getCustomers(restaurantId);
            setData(response.data || { summary: {}, customers: [] });
        } catch (error) {
            console.error('Failed to fetch clients:', error);
        } finally {
            setLoading(false);
        }
    };

    const clients = data.customers || [];
    const summary = data.summary || {};

    const filteredClients = clients.filter(client =>
        client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone?.includes(searchTerm)
    );

    const exportCSV = () => {
        const headers = ["Nome", "Telefone", "Total Gasto", "Pedidos", "Favorito", "Ultima Visita"];
        const rows = filteredClients.map(c => [
            c.name || 'Cliente',
            c.phone,
            c.totalSpent,
            c.orderCount,
            c.favoriteItem || 'N/A',
            format(new Date(c.lastVisit), 'yyyy-MM-dd')
        ]);

        const csvContent = "data:text/csv;charset=utf-8,\ufeff"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `clientes_${format(new Date(), 'yyyy-MM-dd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const cardStyle = {
        background: 'white',
        borderRadius: '20px',
        padding: '24px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        border: '1px solid #f1f5f9',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    };

    if (loading) return (
        <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
    );

    return (
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
            <div className="page-header" style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#1e293b', margin: 0 }}>
                        Dashboard de Clientes
                    </h2>
                    <p style={{ color: '#64748b', marginTop: '4px' }}>
                        Analise o comportamento e fidelidade dos seus clientes
                    </p>
                </div>
                <button
                    onClick={exportCSV}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        background: '#f8fafc', color: '#475569', padding: '10px 18px',
                        borderRadius: '12px', border: '1px solid #e2e8f0', fontWeight: '600',
                        cursor: 'pointer', transition: 'all 0.2s'
                    }}
                >
                    <Download size={18} />
                    Exportar Base
                </button>
            </div>

            {/* KPI Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                <div style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div style={{ background: '#eff6ff', color: '#3b82f6', padding: '10px', borderRadius: '12px' }}>
                            <Users size={24} />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#10b981', display: 'flex', alignItems: 'center' }}>
                            <ArrowUpRight size={14} /> Ativos
                        </span>
                    </div>
                    <div>
                        <p style={{ fontSize: '14px', fontWeight: '600', color: '#64748b', margin: 0 }}>Total de Clientes</p>
                        <h3 style={{ fontSize: '28px', fontWeight: '800', color: '#1e293b', margin: '4px 0 0 0' }}>{summary.totalCustomers || 0}</h3>
                    </div>
                </div>

                <div style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div style={{ background: '#f0fdf4', color: '#22c55e', padding: '10px', borderRadius: '12px' }}>
                            <UserCheck size={24} />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#22c55e', background: '#dcfce7', padding: '2px 8px', borderRadius: '20px' }}>
                            {summary.loyaltyRate}% Taxa
                        </span>
                    </div>
                    <div>
                        <p style={{ fontSize: '14px', fontWeight: '600', color: '#64748b', margin: 0 }}>Clientes Recorrentes</p>
                        <h3 style={{ fontSize: '28px', fontWeight: '800', color: '#1e293b', margin: '4px 0 0 0' }}>{summary.recurringCustomers || 0}</h3>
                    </div>
                </div>

                <div style={cardStyle}>
                    <div style={{ background: '#fef2f2', color: '#ef4444', width: 'fit-content', padding: '10px', borderRadius: '12px' }}>
                        <Star size={24} />
                    </div>
                    <div>
                        <p style={{ fontSize: '14px', fontWeight: '600', color: '#64748b', margin: 0 }}>Preferência Média</p>
                        <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#1e293b', margin: '4px 0 0 0' }}>
                            {filteredClients[0]?.favoriteItem || '---'}
                        </h3>
                    </div>
                </div>
            </div>

            {/* List & Search */}
            <div style={{ background: 'white', borderRadius: '24px', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
                        <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou contato..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%', padding: '12px 12px 12px 44px', borderRadius: '14px',
                                border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none',
                                transition: 'border-color 0.2s'
                            }}
                        />
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                                <th style={{ padding: '16px 24px', color: '#64748b', fontWeight: '600', fontSize: '13px' }}>CLIENTE</th>
                                <th style={{ padding: '16px 24px', color: '#64748b', fontWeight: '600', fontSize: '13px' }}>VALOR VIDA</th>
                                <th style={{ padding: '16px 24px', color: '#64748b', fontWeight: '600', fontSize: '13px' }}>PEDIDOS</th>
                                <th style={{ padding: '16px 24px', color: '#64748b', fontWeight: '600', fontSize: '13px' }}>FAVORITO</th>
                                <th style={{ padding: '16px 24px', color: '#64748b', fontWeight: '600', fontSize: '13px' }}>ÚLTIMA VISITA</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredClients.map(client => (
                                <tr key={client._id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} className="hover:bg-slate-50">
                                    <td style={{ padding: '20px 24px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{
                                                width: '40px', height: '40px', borderRadius: '12px',
                                                background: client.isRecurring ? '#dcfce7' : '#f1f5f9',
                                                color: client.isRecurring ? '#166534' : '#64748b',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontWeight: 'bold', fontSize: '16px'
                                            }}>
                                                {(client.name || 'C').charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: '700', color: '#1e293b' }}>{client.name || 'Cliente'}</div>
                                                <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Phone size={12} /> {client.phone}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '20px 24px' }}>
                                        <div style={{ fontWeight: '700', color: '#10b981' }}>
                                            {client.totalSpent.toLocaleString()} MT
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>Média: {Math.round(client.totalSpent / client.orderCount).toLocaleString()} MT</div>
                                    </td>
                                    <td style={{ padding: '20px 24px' }}>
                                        <span style={{
                                            background: client.isRecurring ? '#eff6ff' : '#f8fafc',
                                            color: client.isRecurring ? '#3b82f6' : '#64748b',
                                            padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '700'
                                        }}>
                                            {client.orderCount} visitas
                                        </span>
                                    </td>
                                    <td style={{ padding: '20px 24px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#475569', fontWeight: '500' }}>
                                            <Star size={14} className="text-amber-400 fill-amber-400" />
                                            {client.favoriteItem}
                                        </div>
                                    </td>
                                    <td style={{ padding: '20px 24px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: '500' }}>
                                                {format(new Date(client.lastVisit), 'dd MMM yyyy', { locale: pt })}
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                                                Desde {format(new Date(client.firstVisit), 'MMM yyyy', { locale: pt })}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
