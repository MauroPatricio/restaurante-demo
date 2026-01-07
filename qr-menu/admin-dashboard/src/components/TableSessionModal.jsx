import { X, Clock, DollarSign, ShoppingBag, Users } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import '../styles/TableSessionModal.css';

export default function TableSessionModal({ table, session, orders, stats, onClose, onFreeTable, canFree }) {
    if (!table) return null;

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-MZ', {
            style: 'currency',
            currency: 'MZN'
        }).format(value);
    };

    const formatDuration = (minutes) => {
        if (minutes < 60) return `${minutes}min`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}min`;
    };

    const getStatusBadge = (status) => {
        const statusColors = {
            pending: 'badge-warning',
            confirmed: 'badge-info',
            preparing: 'badge-info',
            ready: 'badge-success',
            served: 'badge-success',
            completed: 'badge-secondary',
            cancelled: 'badge-danger'
        };
        return statusColors[status] || 'badge-secondary';
    };

    const handleFreeTable = () => {
        if (window.confirm('Tem certeza que deseja liberar esta mesa? A sessão atual será encerrada.')) {
            onFreeTable(table._id);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Mesa {table.number} - Sessão Atual</h2>
                    <button onClick={onClose} className="modal-close">
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-body">
                    {/* Table Info */}
                    <div className="session-info-card">
                        <div className="session-info-grid">
                            <div className="info-item">
                                <span className="info-label">Status:</span>
                                <span className={`badge ${table.status === 'occupied' ? 'badge-success' : 'badge-secondary'}`}>
                                    {table.status === 'occupied' ? 'Ocupada' : 'Livre'}
                                </span>
                            </div>
                            {table.location && (
                                <div className="info-item">
                                    <span className="info-label">Localização:</span>
                                    <span>{table.location}</span>
                                </div>
                            )}
                            <div className="info-item">
                                <span className="info-label">Capacidade:</span>
                                <Users size={16} style={{ marginRight: '4px' }} />
                                <span>{table.capacity} pessoas</span>
                            </div>
                        </div>
                    </div>

                    {/* Session Stats */}
                    {session && (
                        <>
                            <div className="session-stats">
                                <div className="stat-card">
                                    <Clock size={24} />
                                    <div className="stat-content">
                                        <span className="stat-value">{formatDuration(stats.sessionDuration)}</span>
                                        <span className="stat-label">Duração</span>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <ShoppingBag size={24} />
                                    <div className="stat-content">
                                        <span className="stat-value">{stats.orderCount}</span>
                                        <span className="stat-label">Pedidos</span>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <DollarSign size={24} />
                                    <div className="stat-content">
                                        <span className="stat-value">{formatCurrency(stats.totalRevenue)}</span>
                                        <span className="stat-label">Total</span>
                                    </div>
                                </div>
                            </div>

                            {/* Session Details */}
                            <div className="session-details">
                                <h3>Informações da Sessão</h3>
                                <div className="details-grid">
                                    <div>
                                        <strong>Início:</strong> {format(new Date(session.startedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                    </div>
                                    {session.startedBy && (
                                        <div>
                                            <strong>Iniciado por:</strong> {session.startedBy.name || 'Cliente'}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Orders List */}
                            <div className="orders-section">
                                <h3>Pedidos da Sessão</h3>
                                {orders && orders.length > 0 ? (
                                    <div className="orders-list">
                                        {orders.map((order) => (
                                            <div key={order._id} className="order-item">
                                                <div className="order-header">
                                                    <span className="order-time">
                                                        {format(new Date(order.createdAt), 'HH:mm', { locale: ptBR })}
                                                    </span>
                                                    <span className={`badge ${getStatusBadge(order.status)}`}>
                                                        {order.status}
                                                    </span>
                                                </div>
                                                <div className="order-items">
                                                    {order.items.map((item, idx) => (
                                                        <div key={idx} className="order-item-row">
                                                            <span>{item.qty}x {item.item?.name || 'Item'}</span>
                                                            <span>{formatCurrency(item.subtotal)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="order-total">
                                                    <strong>Total:</strong>
                                                    <strong>{formatCurrency(order.total)}</strong>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="no-orders">Nenhum pedido nesta sessão</p>
                                )}
                            </div>
                        </>
                    )}

                    {!session && table.status === 'free' && (
                        <div className="empty-state">
                            <p>Esta mesa está livre. Não há sessão ativa no momento.</p>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button onClick={onClose} className="btn-secondary">
                        Fechar
                    </button>
                    {canFree && table.status === 'occupied' && (
                        <button onClick={handleFreeTable} className="btn-danger">
                            Liberar Mesa
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
