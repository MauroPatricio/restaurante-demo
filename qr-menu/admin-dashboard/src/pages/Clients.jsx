import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { clientAPI } from '../services/api';
import { Search, Download, Users, Phone, Calendar, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

export default function Clients() {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [clients, setClients] = useState([]);
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
            const response = await clientAPI.getAll(restaurantId);
            setClients(response.data.clients || []);
        } catch (error) {
            console.error('Failed to fetch clients:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredClients = clients.filter(client =>
        client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone?.includes(searchTerm)
    );

    const exportCSV = () => {
        const headers = ["Name", "Phone", "Total Spent", "Last Visit", "Order Count"];
        const rows = filteredClients.map(c => [
            c.name || 'Unknown',
            c.phone,
            c.totalSpent,
            format(new Date(c.lastOrderDate), 'yyyy-MM-dd HH:mm'),
            c.orderCount
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "clients.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) return <div>{t('loading') || 'Carregando...'}</div>;

    return (
        <div className="clients-page">
            <div className="page-header">
                <div>
                    <h2>{t('clients') || 'Clientes'}</h2>
                    <p>{t('clients_desc') || 'Gerencie a base de clientes do seu restaurante'}</p>
                </div>
                <button onClick={exportCSV} className="btn-secondary">
                    <Download size={18} />
                    {t('export_csv')}
                </button>
            </div>

            <div className="card filters-bar" style={{ marginBottom: '20px', padding: '15px' }}>
                <div className="search-box" style={{ maxWidth: '400px' }}>
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder={t('search_clients') || "Buscar por nome ou telefone..."}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="card table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>{t('contact') || 'Contato'}</th>
                            <th>{t('total_spent') || 'Total Gasto'}</th>
                            <th>{t('orders') || 'Pedidos'}</th>
                            <th>{t('last_visit') || 'Última Visita'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredClients.map(client => (
                            <tr key={client._id}>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ background: '#eff6ff', padding: '8px', borderRadius: '50%', color: '#3b82f6' }}>
                                            <Users size={18} />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '600', color: '#1e293b' }}>{client.name || 'Cliente'}</div>
                                            <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Phone size={12} /> {client.phone}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div style={{ fontWeight: '700', color: '#10b981' }}>
                                        {client.totalSpent.toLocaleString()} MT
                                    </div>
                                </td>
                                <td>
                                    <span className="badge">{client.orderCount} pedidos</span>
                                </td>
                                <td>
                                    <div style={{ color: '#64748b' }}>
                                        {format(new Date(client.lastOrderDate), 'PP p')}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredClients.length === 0 && (
                            <tr>
                                <td colSpan="4" style={{ textAlign: 'center', padding: '40px' }}>
                                    Nenhum cliente encontrado.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
