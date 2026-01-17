import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingOverlay = () => {
    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)'
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '32px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                maxWidth: '24rem',
                width: '100%',
                textAlign: 'center'
            }}>
                <div style={{
                    marginBottom: '16px',
                    color: '#2563eb', // primary-600
                    animation: 'spin 1s linear infinite'
                }}>
                    <Loader2 size={48} />
                </div>
                <h3 style={{
                    fontSize: '1.25rem',
                    fontWeight: 'bold',
                    color: '#111827',
                    marginBottom: '8px'
                }}>
                    Processando...
                </h3>
                <p style={{
                    color: '#6b7280',
                    fontSize: '0.875rem'
                }}>
                    Por favor, aguarde enquanto processamos sua solicitação.
                </p>
                <style>
                    {`
                        @keyframes spin {
                            from { transform: rotate(0deg); }
                            to { transform: rotate(360deg); }
                        }
                    `}
                </style>
            </div>
        </div>
    );
};

export default LoadingOverlay;
