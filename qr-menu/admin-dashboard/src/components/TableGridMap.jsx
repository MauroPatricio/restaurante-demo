import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Timer, Users, Coffee, ArrowRight, Clock, AlertCircle } from 'lucide-react';
import '../styles/TableGridMap.css';

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

    return (
        <div className="table-map-grid">
            {tables.map(table => {
                const config = getStatusConfig(table.status);
                const Icon = config.icon;
                const StatusIcon = config.statusIcon;

                return (
                    <div 
                        key={table._id} 
                        className={`table-map-card ${config.class}`}
                        onClick={() => onTableClick(table)}
                    >
                        <div className="card-top-icon">
                            <Icon size={20} />
                        </div>
                        
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
                                    table.currentSession ? (
                                        `${t('order', 'Pedido')} #${(typeof table.currentSession === 'string' ? table.currentSession : table.currentSession._id || '').slice(-4)}`
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
