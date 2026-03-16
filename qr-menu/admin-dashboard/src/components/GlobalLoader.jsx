import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * GlobalLoader - Componente unificado de loading para todo o sistema
 * Versão Admin-Dashboard com framer-motion para estabilidade
 */
const GlobalLoader = ({
    mode = 'inline',
    size = 'md',
    message = '',
    color = '#2563eb',
    className = '',
    spinDuration = '0.6s'
}) => {
    const { t } = useTranslation();

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
            <motion.div
                key="fullscreen-loader-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
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
                }}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    style={{
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
                    }}
                >
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 0.6, ease: 'linear' }}
                        style={{
                            marginBottom: (message || t('processing')) ? '16px' : '0',
                            color: color,
                        }}
                    >
                        <Loader2 size={iconSize} />
                    </motion.div>

                    <h3 style={{
                        fontSize: '1.25rem',
                        fontWeight: 'bold',
                        color: '#111827',
                        marginBottom: '8px',
                        margin: 0
                    }}>
                        {message || t('processing')}
                    </h3>
                    <p style={{
                        color: '#6b7280',
                        fontSize: '0.875rem',
                        margin: 0,
                        marginTop: '8px'
                    }}>
                        {t('please_wait')}
                    </p>
                </motion.div>
            </motion.div>
        );
    }

    // Modo Discrete - Loading no canto superior direito
    if (mode === 'discrete') {
        return (
            <motion.div
                key="discrete-loader-overlay"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
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
                }}
            >
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.6, ease: 'linear' }}
                    style={{
                        color: color,
                    }}
                >
                    <Loader2 size={iconSize} />
                </motion.div>

                {(message || t('processing')) && (
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
                        {message || t('processing')}
                    </span>
                )}
            </motion.div>
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
                padding: (message || t('processing')) ? '20px' : '10px'
            }}
        >
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.6, ease: 'linear' }}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: color,
                }}
            >
                <Loader2 size={iconSize} />
            </motion.div>

            {(message || t('processing')) && (
                <div
                    style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#64748b',
                        textAlign: 'center'
                    }}
                >
                    {message || t('processing')}
                </div>
            )}
        </div>
    );
};

export default GlobalLoader;
