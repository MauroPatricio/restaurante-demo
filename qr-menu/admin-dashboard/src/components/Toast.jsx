import React from 'react';
import { X, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';

const Toast = ({ type = 'info', message, onClose, persistent = false }) => {
    const config = {
        success: {
            bg: '#ecfdf5',
            border: '#10b981',
            text: '#065f46',
            icon: CheckCircle,
            iconColor: '#10b981'
        },
        error: {
            bg: '#fef2f2',
            border: '#ef4444',
            text: '#991b1b',
            icon: XCircle,
            iconColor: '#ef4444'
        },
        warning: {
            bg: '#fffbeb',
            border: '#f59e0b',
            text: '#92400e',
            icon: AlertCircle,
            iconColor: '#f59e0b'
        },
        info: {
            bg: '#eff6ff',
            border: '#3b82f6',
            text: '#1e40af',
            icon: Info,
            iconColor: '#3b82f6'
        }
    };

    const { bg, border, text, icon: Icon, iconColor } = config[type] || config.info;

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                background: bg,
                border: `1px solid ${border}`,
                borderLeft: `4px solid ${border}`,
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                minWidth: '320px',
                maxWidth: '400px',
                animation: 'slideIn 0.3s ease-out',
                position: 'relative'
            }}
        >
            <Icon size={20} color={iconColor} strokeWidth={2.5} />
            <p style={{
                flex: 1,
                margin: 0,
                fontSize: '14px',
                fontWeight: '500',
                color: text,
                lineHeight: '1.4'
            }}>
                {message}
            </p>
            {!persistent && (
                <button
                    onClick={onClose}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '4px',
                        transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                    <X size={16} color={text} />
                </button>
            )}
            <style>{`
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOut {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
            `}</style>
        </div>
    );
};

export default Toast;
