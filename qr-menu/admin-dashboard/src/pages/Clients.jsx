import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { analyticsAPI } from '../services/api';
import {
    Search, Download, Users, Phone, Calendar,
    UserCheck, Star, ArrowUpRight, RefreshCcw
} from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale/pt';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '../components/LoadingSpinner';
import { useCurrency } from '../contexts/CurrencyContext';
import { motion, AnimatePresence } from 'framer-motion';
import './Clients.css';

export default function Clients() {
    const { user } = useAuth();
    const { t } = useTranslation();
    const { convertAndFormat } = useCurrency();
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
        (client.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
        (client.phone || '').includes(searchTerm)
    );

    const exportCSV = () => {
        const headers = [t('clients_col_client'), t('clients_col_lifetime'), t('visits_label'), t('clients_col_orders'), t('clients_col_favorite'), t('clients_col_tables'), t('clients_col_last_visit')];
        const rows = filteredClients.map(c => [
            c.name || t('client'),
            c.phone,
            c.totalSpent,
            c.visitCount || 1,
            c.orderCount || c.orders,
            c.favoriteItem || 'N/A',
            (c.tables || []).join(', ') || 'N/A',
            format(new Date(c.lastVisit), 'yyyy-MM-dd')
        ]);

        const csvContent = "\ufeff" + [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `clientes_${format(new Date(), 'yyyy-MM-dd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) return (
        <div className="clients-loading-state">
            <LoadingSpinner size={48} />
            <span>{t('loading', 'Carregando...')}</span>
        </div>
    );

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="clients-container"
        >
            <div className="page-header">
                <div className="header-title">
                    <h2>{t('clients_title', 'Dashboard de Clientes')}</h2>
                    <p>{t('clients_subtitle', 'Analise o comportamento e fidelidade dos seus clientes')}</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={fetchClients} className="btn-modern-outline" title={t('refresh', 'Refresh')}>
                        <RefreshCcw size={20} />
                    </button>
                    <button onClick={exportCSV} className="btn-export">
                        <Download size={18} />
                        {t('clients_export', 'Exportar Base')}
                    </button>
                </div>
            </div>

            {/* KPI Section */}
            <div className="kpi-grid">
                <motion.div whileHover={{ scale: 1.02 }} className="kpi-card">
                    <div className="kpi-icon-wrapper" style={{ background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))' }}>
                        <Users size={26} />
                    </div>
                    <div className="kpi-badge" style={{ color: '#10b981', background: '#dcfce7' }}>
                        <ArrowUpRight size={14} /> {t('clients_active', 'Ativos')}
                    </div>
                    <div className="kpi-info">
                        <p>{t('clients_total', 'Total de Clientes')}</p>
                        <h3>{summary.totalCustomers || 0}</h3>
                    </div>
                </motion.div>

                <motion.div whileHover={{ scale: 1.02 }} className="kpi-card">
                    <div className="kpi-icon-wrapper" style={{ background: '#f0fdf4', color: '#22c55e' }}>
                        <UserCheck size={26} />
                    </div>
                    <div className="kpi-badge" style={{ color: '#22c55e', background: '#dcfce7' }}>
                        {summary.loyaltyRate}% {t('clients_loyalty_rate', 'Taxa')}
                    </div>
                    <div className="kpi-info">
                        <p>{t('clients_recurring', 'Clientes Recorrentes')}</p>
                        <h3>{summary.recurringCustomers || 0}</h3>
                    </div>
                </motion.div>

                <motion.div whileHover={{ scale: 1.02 }} className="kpi-card">
                    <div className="kpi-icon-wrapper" style={{ background: '#fffbeb', color: '#f59e0b' }}>
                        <Star size={26} />
                    </div>
                    <div className="kpi-info">
                        <p>{t('clients_avg_preference', 'Preferência Média')}</p>
                        <h3 style={{ fontSize: '24px' }}>
                            {filteredClients[0]?.favoriteItem || '---'}
                        </h3>
                    </div>
                </motion.div>
            </div>

            {/* List & Search */}
            <div className="content-area">
                <div className="search-container">
                    <div className="search-wrapper">
                        <Search className="search-icon" size={20} />
                        <input
                            type="text"
                            placeholder={t('clients_search_placeholder', 'Buscar por nome ou contato...')}
                            className="search-input"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="table-wrapper">
                    <table className="premium-table">
                        <thead>
                            <tr>
                                <th>{t('clients_col_client').toUpperCase()}</th>
                                <th>{t('clients_col_lifetime').toUpperCase()}</th>
                                <th>{t('visits_label').toUpperCase()}</th>
                                <th>{t('clients_col_orders').toUpperCase()}</th>
                                <th>{t('clients_col_favorite').toUpperCase()}</th>
                                <th>{t('clients_col_tables').toUpperCase()}</th>
                                <th style={{ textAlign: 'right' }}>{t('clients_col_last_visit').toUpperCase()}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence>
                                {filteredClients.map((client, index) => (
                                    <motion.tr 
                                        key={client._id}
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="client-row"
                                    >
                                        <td>
                                            <div className="client-cell">
                                                <div className="client-avatar" style={{
                                                    background: client.isRecurring ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--muted))',
                                                    color: client.isRecurring ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'
                                                }}>
                                                    {(client.name || 'C').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="client-name">{client.name || t('client', 'Cliente')}</div>
                                                    <div className="client-phone">
                                                        <Phone size={12} /> {client.phone}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="value-amount">
                                                {convertAndFormat(client.totalSpent)}
                                            </div>
                                            <div className="value-avg">{t('clients_avg', 'Média')}: {convertAndFormat(client.totalSpent / (client.orderCount || 1))}</div>
                                        </td>
                                        <td>
                                            <span className="status-badge" style={{
                                                background: (client.visitCount || 1) > 1 ? '#dcfce7' : 'hsl(var(--muted) / 0.5)',
                                                color: (client.visitCount || 1) > 1 ? '#166534' : 'hsl(var(--muted-foreground))'
                                            }}>
                                                {client.visitCount || 1} {t('visits_label', 'Visitas')}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="status-badge" style={{
                                                background: client.isRecurring ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--muted) / 0.5)',
                                                color: client.isRecurring ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'
                                            }}>
                                                {client.orderCount || client.orders} {t('orders', 'Pedidos')}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="favorite-item">
                                                <Star size={14} className="favorite-icon" />
                                                {client.favoriteItem || '---'}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="date-primary" style={{ fontWeight: 600 }}>
                                                {(client.tables || [])
                                                    .filter(t => t !== null && t !== undefined)
                                                    .sort((a, b) => a - b)
                                                    .join(', ') || '---'}
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div className="flex flex-col gap-0.5">
                                                <div className="date-primary">
                                                    {format(new Date(client.lastVisit), 'dd/MM/yyyy', { locale: pt })}
                                                </div>
                                                <div className="date-secondary">
                                                    {t('clients_since', 'Desde')} {format(new Date(client.firstVisit), 'dd/MM/yyyy', { locale: pt })}
                                                </div>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </div>
        </motion.div>
    );
}
