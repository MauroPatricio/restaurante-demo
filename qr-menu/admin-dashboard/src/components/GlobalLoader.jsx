import React from 'react';
import { motion } from 'framer-motion';
import { RotateCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * GlobalLoader - Componente unificado de loading para todo o sistema
 * Estilo Premium com ícone de rotação azul/índigo e mensagem i18n
 */
const GlobalLoader = ({
    mode = 'inline',
    size = 'md',
    message = '',
    color = '#6366f1', // Beautiful Indigo-Blue from screenshot
    className = '',
    spinDuration = '0.8s'
}) => {
    const { t } = useTranslation();

    const getIconSize = () => {
        if (typeof size === 'number') return size;

        const sizeMap = {
            'sm': 18,
            'md': 32,
            'lg': 48
        };

        return sizeMap[size] || 32;
    };

    const iconSize = getIconSize();
    const loadingMessage = message || t('processing', 'Processando...');

    // Fullscreen Mode - Centered backdrop loading
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
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(8px)',
                }}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '16px',
                        textAlign: 'center'
                    }}
                >
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                        style={{
                            color: color,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <RotateCw size={48} strokeWidth={2.5} />
                    </motion.div>

                    <h3 style={{
                        fontSize: '16px',
                        fontWeight: '700',
                        color: '#475569',
                        margin: 0,
                        letterSpacing: '-0.01em'
                    }}>
                        {loadingMessage}
                    </h3>
                </motion.div>
            </motion.div>
        );
    }

    // Discrete Mode - Top-right float loading
    if (mode === 'discrete') {
        return (
            <motion.div
                key="discrete-loader-overlay"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="global-loader-discrete"
                style={{
                    position: 'fixed',
                    top: '24px',
                    right: '24px',
                    zIndex: 9998,
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: 'white',
                    padding: '8px 16px',
                    borderRadius: '16px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                    border: '1px solid #f1f5f9'
                }}
            >
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                    style={{
                        color: color,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <RotateCw size={18} strokeWidth={2.5} />
                </motion.div>

                <span style={{
                    fontSize: '13px',
                    fontWeight: '700',
                    color: '#475569'
                }}>
                    {loadingMessage}
                </span>
            </motion.div>
        );
    }

    // Inline Mode (Default) - Used inside dashboard and components
    return (
        <div
            className={`global-loader-inline ${className}`}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
                padding: '40px 20px',
                width: '100%'
            }}
        >
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: color,
                }}
            >
                <RotateCw size={iconSize} strokeWidth={2.5} />
            </motion.div>

            {loadingMessage && (
                <div
                    style={{
                        fontSize: '15px',
                        fontWeight: '700',
                        color: '#475569',
                        textAlign: 'center',
                        letterSpacing: '-0.01em'
                    }}
                >
                    {loadingMessage}
                </div>
            )}
        </div>
    );
};

export default GlobalLoader;
