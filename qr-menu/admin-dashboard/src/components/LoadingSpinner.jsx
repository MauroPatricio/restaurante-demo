import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingSpinner = ({ size = 24, className = "", message = "" }) => {
    const iconSize = typeof size === 'number' ? size : (size === 'sm' ? 16 : size === 'lg' ? 48 : 24);

    return (
        <div
            className={className}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px'
            }}
        >
            <div
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#2563eb', // primary-600
                    animation: 'spin 1s linear infinite'
                }}
            >
                <Loader2 size={iconSize} />
            </div>

            {message && (
                <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#64748b',
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                }}>
                    {message}
                </div>
            )}

            <style>
                {`
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: .5; }
                    }
                `}
            </style>
        </div>
    );
};

export default LoadingSpinner;
