import { X, Clock, DollarSign, ShoppingBag, Users, CheckCircle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { getCurrencySymbol } from '../utils/currencyUtils';
import '../styles/TableSessionModal.css';

export default function TableSessionModal({
    table,
    session,
    orders,
    stats,
    onClose,
    onFreeTable,
    onUpdateStatus,
    onRefresh,
    canFree
}) {
    const { user } = useAuth();
    const { t } = useTranslation();

    if (!table) return null;

    const formatCurrency = (value) => {
        const symbol = getCurrencySymbol(
            user?.restaurant?.settings?.currency || 'MZN'
        );

        return `${(value || 0).toLocaleString()} ${symbol}`;
    };

    const formatDuration = (minutes) => {
        if (!minutes && minutes !== 0) return '0min';

        if (minutes < 60) {
            return `${minutes}${t('min', 'min')}`;
        }

        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;

        return `${hours}h ${mins}${t('min', 'min')}`;
    };

    const handleFreeTable = () => {
        if (
            window.confirm(
                t(
                    'session_confirm_free',
                    'Tem certeza que deseja liberar esta mesa? A sessão atual será encerrada.'
                )
            )
        ) {
            onFreeTable(table._id);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-container animate-slide-up"
                onClick={(e) => e.stopPropagation()}
            >
                {/* HEADER ACTIONS */}
                <div className="modal-actions-row">
                    <button
                        onClick={onRefresh}
                        className="btn-action-circle"
                        title={t('btn_update', 'Actualizar')}
                    >
                        <RefreshCw
                            size={18}
                            color="#475569"
                            strokeWidth={2.5}
                        />
                    </button>

                    <button
                        onClick={onClose}
                        className="btn-action-circle close-top-btn"
                        aria-label={t('close', 'Fechar')}
                    >
                        <X
                            size={20}
                            color="#ef4444"
                            strokeWidth={2.8}
                        />
                    </button>
                </div>

                {/* HEADER */}
                <div className="modal-header">
                    <div className="flex items-center gap-3">
                        <div className="header-icon-box">
                            <Users size={18} />
                        </div>

                        <div>
                            <span className="header-restaurant-name">
                                {user?.restaurant?.name || 'Golden Plate'}
                            </span>

                            <h2>
                                {t('session_modal_title', {
                                    number: table.number,
                                    defaultValue: `Mesa ${table.number}`
                                })}
                            </h2>

                            <span className="header-subtitle">
                                {t('session_current', 'Sessão Atual')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* BODY */}
                <div className="modal-body">
                    {/* STATUS */}
                    <div className="status-selection-container">
                        <span className="section-title-small">
                            {t('unit_status', 'Estado da Unidade')}
                        </span>

                        <div className="status-cards-grid">
                            <div
                                className={`status-selection-card free ${
                                    table.status === 'free' ? 'active' : ''
                                }`}
                                onClick={() =>
                                    onUpdateStatus(table._id, 'free')
                                }
                            >
                                <div className="status-icon-circle">
                                    <CheckCircle size={20} />
                                </div>

                                <span>
                                    {t('status_free', 'LIVRE')}
                                </span>
                            </div>

                            <div
                                className={`status-selection-card occupied ${
                                    table.status === 'occupied'
                                        ? 'active'
                                        : ''
                                }`}
                                onClick={() =>
                                    onUpdateStatus(table._id, 'occupied')
                                }
                            >
                                <div className="status-icon-circle">
                                    <Clock size={20} />
                                </div>

                                <span>
                                    {t('status_occupied', 'OCUPADO')}
                                </span>
                            </div>

                            <div
                                className={`status-selection-card cleaning ${
                                    table.status === 'cleaning'
                                        ? 'active'
                                        : ''
                                }`}
                                onClick={() =>
                                    onUpdateStatus(table._id, 'cleaning')
                                }
                            >
                                <div className="status-icon-circle">
                                    <ShoppingBag size={20} />
                                </div>

                                <span>
                                    {t('status_cleaning', 'EM LIMPEZA')}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* INFO */}
                    <div className="info-grid-compact">
                        {table.location && (
                            <div className="info-pill">
                                <span className="pill-label">
                                    {t('location', 'Localização')}
                                </span>

                                <span className="pill-value">
                                    {table.location}
                                </span>
                            </div>
                        )}

                        <div className="info-pill">
                            <span className="pill-label">
                                {t('capacity', 'Capacidade')}
                            </span>

                            <span className="pill-value flex items-center gap-1">
                                <Users size={12} />
                                {table.capacity}
                            </span>
                        </div>
                    </div>

                    {/* SESSION + STATS */}
                    {session && stats && (
                        <>
                            <div className="premium-stats-row">
                                <div className="p-stat-card">
                                    <div className="p-stat-icon duration">
                                        <Clock size={20} />
                                    </div>

                                    <div className="p-stat-info">
                                        <span className="p-stat-value">
                                            {formatDuration(
                                                stats.sessionDuration
                                            )}
                                        </span>

                                        <span className="p-stat-label">
                                            {t(
                                                'stat_duration',
                                                'Duração'
                                            )}
                                        </span>
                                    </div>
                                </div>

                                <div className="p-stat-card">
                                    <div className="p-stat-icon orders">
                                        <ShoppingBag size={20} />
                                    </div>

                                    <div className="p-stat-info">
                                        <span className="p-stat-value">
                                            {stats.orderCount || 0}
                                        </span>

                                        <span className="p-stat-label">
                                            {t(
                                                'stat_orders',
                                                'Pedidos'
                                            )}
                                        </span>
                                    </div>
                                </div>

                                <div className="p-stat-card">
                                    <div className="p-stat-icon total">
                                        <DollarSign size={20} />
                                    </div>

                                    <div className="p-stat-info">
                                        <span className="p-stat-value">
                                            {formatCurrency(
                                                stats.totalRevenue
                                            )}
                                        </span>

                                        <span className="p-stat-label">
                                            {t('stat_total', 'Total')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* DETAILS */}
                            <div className="section-divider">
                                <span>
                                    {t(
                                        'session_details',
                                        'Detalhes da Sessão'
                                    )}
                                </span>
                            </div>

                            <div className="session-time-info">
                                <div className="time-item">
                                    <Clock
                                        size={14}
                                        className="text-primary"
                                    />

                                    <span>
                                        <strong>
                                            {t(
                                                'time_start',
                                                'Início'
                                            )}
                                            :
                                        </strong>{' '}
                                        {session.startedAt
                                            ? format(
                                                  new Date(
                                                      session.startedAt
                                                  ),
                                                  "dd/MM/yyyy 'às' HH:mm",
                                                  {
                                                      locale: ptBR
                                                  }
                                              )
                                            : '--'}
                                    </span>
                                </div>

                                {session.startedBy && (
                                    <div className="time-item">
                                        <Users
                                            size={14}
                                            className="text-primary"
                                        />

                                        <span>
                                            <strong>
                                                {t(
                                                    'time_waiter',
                                                    'Garçom'
                                                )}
                                                :
                                            </strong>{' '}
                                            {session.startedBy.name ||
                                                t(
                                                    'guest',
                                                    'Cliente'
                                                )}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* ORDERS */}
                            <div className="section-divider">
                                <span>
                                    {t(
                                        'session_orders',
                                        'Pedidos Realizados'
                                    )}
                                </span>
                            </div>

                            {orders && orders.length > 0 ? (
                                <div className="premium-orders-list">
                                    {orders.map((order) => (
                                        <div
                                            key={order._id}
                                            className="p-order-card"
                                        >
                                            <div className="p-order-header">
                                                <div className="flex items-center gap-2">
                                                    <span className="p-order-time">
                                                        {format(
                                                            new Date(
                                                                order.createdAt
                                                            ),
                                                            'HH:mm',
                                                            {
                                                                locale:
                                                                    ptBR
                                                            }
                                                        )}
                                                    </span>

                                                    <span
                                                        className={`p-order-badge status-${
                                                            order.status ||
                                                            'pending'
                                                        }`}
                                                    >
                                                        {t(
                                                            `order_status_${
                                                                order.status ||
                                                                'pending'
                                                            }`,
                                                            order.status ||
                                                                'pending'
                                                        )}
                                                    </span>
                                                </div>

                                                <span className="p-order-id">
                                                    #
                                                    {order._id
                                                        ? order._id
                                                              .slice(-4)
                                                              .toUpperCase()
                                                        : '----'}
                                                </span>
                                            </div>

                                            <div className="p-order-items">
                                                {(order.items || []).map(
                                                    (item, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="p-order-row"
                                                        >
                                                            <span className="item-details">
                                                                <span className="item-qty">
                                                                    {
                                                                        item.qty
                                                                    }
                                                                    x
                                                                </span>

                                                                <span className="item-name">
                                                                    {item
                                                                        .item
                                                                        ?.name ||
                                                                        t(
                                                                            'item',
                                                                            'Item'
                                                                        )}
                                                                </span>
                                                            </span>

                                                            <span className="item-price">
                                                                {formatCurrency(
                                                                    item.subtotal
                                                                )}
                                                            </span>
                                                        </div>
                                                    )
                                                )}
                                            </div>

                                            <div className="p-order-footer">
                                                <span>
                                                    {t(
                                                        'order_subtotal',
                                                        'Subtotal'
                                                    )}
                                                </span>

                                                <span className="footer-total">
                                                    {formatCurrency(
                                                        order.total
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-orders-container">
                                    <ShoppingBag size={40} />

                                    <p>
                                        {t(
                                            'session_no_orders',
                                            'Nenhum pedido registrado'
                                        )}
                                    </p>
                                </div>
                            )}
                        </>
                    )}

                    {/* EMPTY */}
                    {(!session || !stats) &&
                        table.status === 'free' && (
                            <div className="empty-state-container">
                                <Clock size={48} />

                                <p>
                                    {t(
                                        'session_table_free_desc',
                                        'Mesa disponível para novos clientes.'
                                    )}
                                </p>
                            </div>
                        )}
                </div>

                {/* FOOTER */}
                <div className="modal-footer-premium">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onClose();
                        }}
                        className="btn-close-premium"
                    >
                        <X size={18} strokeWidth={3} />
                        <span>
                            {t('btn_close', 'Fechar')}
                        </span>
                    </button>

                    {canFree &&
                        table.status === 'occupied' && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleFreeTable();
                                }}
                                className="btn-free-premium"
                            >
                                <CheckCircle
                                    size={18}
                                    strokeWidth={2.8}
                                />

                                <span>
                                    {t(
                                        'btn_free_table',
                                        'Encerrar Sessão & Liberar'
                                    )}
                                </span>
                            </button>
                        )}
                </div>
            </div>
        </div>
    );
}