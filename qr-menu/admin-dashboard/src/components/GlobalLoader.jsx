import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * GlobalLoader - Componente unificado de loading para todo o sistema
 * Inspirado no estilo visual da área do Garçom
 * 
 * @param {Object} props
 * @param {'fullscreen' | 'discrete' | 'inline'} props.mode - Modo de exibição do loader
 * @param {number | 'sm' | 'md' | 'lg'} props.size - Tamanho do ícone (padrão: 'md')
 * @param {string} props.message - Mensagem opcional a exibir
 * @param {string} props.color - Cor do loader (padrão: #2563eb)
 * @param {string} props.className - Classes CSS adicionais
 * @param {string} props.spinDuration - Duração da animação de spin (padrão: 0.6s)
 */
const GlobalLoader = ({
    mode = 'inline',
    size = 'md',
    message = '',
    color = '#2563eb',
    className = '',
    spinDuration = '0.6s'
}) => {
    // Converter size para pixels
    const getIconSize = () => {
        if (typeof size === 'number') return size;

        const sizeMap = {
            'sm': 16,
            'md': 24,
            'lg': 48
        };

        return sizeMap[size] || 24;
    };

    const iconSize = getIconSize();

    // Modo Fullscreen - Overlay completo com backdrop blur
    if (mode === 'fullscreen') {
        return (
            <div
                className="global-loader-fullscreen"
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    backdropFilter: 'blur(4px)',
                    animation: 'fade-in-loader 0.2s ease-out'
                }}
            >
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    padding: '32px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    maxWidth: '24rem',
                    width: '90%',
                    textAlign: 'center'
                }}>
                    <div
                        className="global-loader-spin"
                        style={{
                            marginBottom: message ? '16px' : '0',
                            color: color,
                            animationDuration: spinDuration
                        }}
                    >
                        <Loader2 size={iconSize} />
                    </div>

                    {message && (
                        <>
                            <h3 style={{
                                fontSize: '1.25rem',
                                fontWeight: 'bold',
                                color: '#111827',
                                marginBottom: '8px',
                                margin: 0
                            }}>
                                {message}
                            </h3>
                            <p className="global-loader-pulse" style={{
                                color: '#6b7280',
                                fontSize: '0.875rem',
                                margin: 0,
                                marginTop: '8px'
                            }}>
                                Por favor, aguarde...
                            </p>
                        </>
                    )}
                </div>
            </div>
        );
    }

    // Modo Discrete - Loading no canto superior direito
    if (mode === 'discrete') {
        return (
            <div
                className="global-loader-discrete"
                style={{
                    position: 'fixed',
                    top: '24px',
                    right: '24px',
                    zIndex: 9998,
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    opacity: 0.8,
                    transition: 'opacity 0.3s ease',
                    animation: 'fade-in-loader 0.2s ease-out'
                }}
            >
                <div
                    className="global-loader-spin"
                    style={{
                        color: color,
                        animationDuration: spinDuration
                    }}
                >
                    <Loader2 size={iconSize} />
                </div>

                {message && (
                    <span style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#64748b',
                        backgroundColor: 'white',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        pointerEvents: 'auto'
                    }}>
                        {message}
                    </span>
                )}
            </div>
        );
    }

    // Modo Inline - Loading embutido em cards, botões, listas
    return (
        <div
            className={`global-loader-inline ${className}`}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: message ? '20px' : '10px'
            }}
        >
            <div
                className="global-loader-spin"
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: color,
                    animationDuration: spinDuration
                }}
            >
                <Loader2 size={iconSize} />
            </div>

            {message && (
                <div
                    className="global-loader-pulse"
                    style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#64748b',
                        textAlign: 'center'
                    }}
                >
                    {message}
                </div>
            )}
        </div>
    );
};

export default GlobalLoader;
