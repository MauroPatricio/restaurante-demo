import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Timer, Users, Coffee, ArrowRight, Clock, AlertCircle } from 'lucide-react';
import '../styles/TableGridMap.css';
import { formatOrderNumber } from '../utils/orderUtils';

const OccupationTimer = ({ startTime }) => {
    const [elapsed, setElapsed] = React.useState('');

    React.useEffect(() => {
        if (!startTime) return;
        const updateTimer = () => {
            const diff = Math.floor((new Date() - new Date(startTime)) / 1000);
            if (diff < 0) {
                setElapsed('00:00');
                return;
            }
            const m = Math.floor(diff / 60);
            const s = diff % 60;
            const h = Math.floor(m / 60);
            const rm = m % 60;
            if (h > 0) {
                setElapsed(`${h.toString().padStart(2, '0')}:${rm.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
            } else {
                setElapsed(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
            }
        };
        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [startTime]);

    return <span style={{ fontFamily: 'monospace', fontWeight: 800 }}>{elapsed || '--:--'}</span>;
};

const TableGridMap = ({ tables, onTableClick }) => {
    const { t } = useTranslation();

    const getStatusConfig = (status) => {
        const configs = {
            free: {
                class: 'status-free',
                label: t('free', 'Livre'),
                footerLabel: t('available', 'Disponível'),
                icon: CheckCircle,
                statusIcon: CheckCircle,
                color: '#10b981'
            },
            occupied: {
                class: 'status-occupied',
                label: t('occupied', 'Ocupada'),
                footerLabel: t('order_active', 'Pedido em curso'),
                icon: Coffee,
                statusIcon: Users,
                color: '#ef4444'
            },
            reserved: {
                class: 'status-reserved',
                label: t('reserved', 'Reservada'),
                footerLabel: '19:30', // Mock for now
                icon: Clock,
                statusIcon: Clock,
                color: '#f59e0b'
            },
            cleaning: {
                class: 'status-cleaning',
                label: t('cleaning', 'Limpeza'),
                footerLabel: t('clean', 'Limpa'),
                icon: Coffee,
                statusIcon: AlertCircle,
                color: '#3b82f6'
            }
        };
        return configs[status] || configs.free;
    };

    const sortedTables = [...tables].sort((a, b) => {
        const statusOrder = {
            'occupied': 1,
            'reserved': 2,
            'cleaning': 2,
            'free': 3
        };
        const orderA = statusOrder[a.status] || 4;
        const orderB = statusOrder[b.status] || 4;
        
        if (orderA !== orderB) {
            return orderA - orderB;
        }
        return (a.number || 0) - (b.number || 0);
    });

    return (
        <div className="table-map-grid">
            {sortedTables.map(table => {
                const config = getStatusConfig(table.status);
                const Icon = config.icon;
                const StatusIcon = config.statusIcon;

                return (
                    <div 
                        key={table._id} 
                        className={`table-map-card ${config.class}`}
                        onClick={() => onTableClick(table)}
                    >
                        {table.status === 'occupied' ? (
                            <div className="card-top-header" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', position: 'absolute', top: '12px', left: '12px', right: '12px', paddingRight: '24px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 900, color: '#ef4444', backgroundColor: '#fef2f2', padding: '2px 6px', borderRadius: '4px' }}>
                                    #{formatOrderNumber(table.currentSession || table.currentSessionId)}
                                </span>
                                <span style={{ fontSize: '11px', fontWeight: 900, color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Timer size={12} />
                                    <OccupationTimer startTime={table.occupiedAt || (table.currentSession && table.currentSession.startedAt) || table.updatedAt} />
                                </span>
                            </div>
                        ) : (
                            <div className="card-top-icon">
                                <Icon size={20} />
                            </div>
                        )}
                        
                        {table.status === 'free' && <CheckCircle className="status-check-icon" size={20} />}
                        {table.status === 'occupied' && <Users className="card-occupied-icon" size={20} />}
                        {table.status === 'reserved' && <Clock className="card-reserved-icon" size={20} />}

                        <span className="table-number">
                            {table.number < 10 ? `0${table.number}` : table.number}
                        </span>

                        <span className="table-status-label">{config.label}</span>

                        <div className="table-capacity">
                            <Users size={14} />
                            <span>{table.capacity} {t('places', 'lugares')}</span>
                        </div>

                        <div className="card-footer-status">
                            {table.status === 'reserved' ? <Clock size={14} /> : (table.status === 'free' ? <CheckCircle size={14} /> : null)}
                            <span>
                                {table.status === 'occupied' ? (
                                    (table.currentSession || table.currentSessionId) ? (
                                        `${t('order', 'Pedido')} #${formatOrderNumber(table.currentSession || table.currentSessionId)}`
                                    ) : t('order_active', 'Pedido em curso')
                                ) : config.footerLabel}
                            </span>
                            {table.status === 'occupied' && <ArrowRight size={14} className="footer-arrow" />}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default TableGridMap;
