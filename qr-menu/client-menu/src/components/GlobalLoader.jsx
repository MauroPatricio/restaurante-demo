import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

/**
 * GlobalLoader - Componente unificado de loading para todo o sistema
 * Inspirado no estilo visual da área do Garçom
 * Versão Client-Menu com framer-motion
 * 
 * @param {Object} props
 * @param {'fullscreen' | 'discrete' | 'inline'} props.mode - Modo de exibição do loader
 * @param {number | 'sm' | 'md' | 'lg'} props.size - Tamanho do ícone (padrão: 'md')
 * @param {string} props.message - Mensagem opcional a exibir
 * @param {string} props.color - Cor do loader (padrão: primary)
 * @param {string} props.className - Classes CSS adicionais
 */
const GlobalLoader = ({
    mode = 'inline',
    size = 'md',
    message = '',
    color = '',
    className = ''
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
    const colorClass = color || 'text-primary-600 dark:text-primary-400';

    // Modo Fullscreen - Overlay completo com backdrop blur
    if (mode === 'fullscreen') {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl flex flex-col items-center max-w-sm w-full text-center"
                >
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 0.6, ease: 'linear' }}
                        className={`mb-4 ${colorClass}`}
                    >
                        <Loader2 size={iconSize} />
                    </motion.div>

                    {message ? (
                        <>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{message}</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm animate-pulse">
                                Por favor, aguarde...
                            </p>
                        </>
                    ) : (
                        <>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">A processar...</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm animate-pulse">
                                Por favor, aguarde enquanto processamos sua solicitação.
                            </p>
                        </>
                    )}
                </motion.div>
            </div>
        );
    }

    // Modo Discrete - Loading no canto superior direito
    if (mode === 'discrete') {
        return (
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 0.8, x: 0 }}
                className="fixed top-6 right-6 z-[9998] pointer-events-none flex items-center gap-2"
            >
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.6, ease: 'linear' }}
                    className={colorClass}
                >
                    <Loader2 size={iconSize} />
                </motion.div>

                {message && (
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg shadow-md pointer-events-auto">
                        {message}
                    </span>
                )}
            </motion.div>
        );
    }

    // Modo Inline - Loading embutido em cards, botões, listas
    return (
        <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.6, ease: 'linear' }}
                className={colorClass}
            >
                <Loader2 size={iconSize} />
            </motion.div>

            {message && (
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 animate-pulse">
                    {message}
                </p>
            )}
        </div>
    );
};

export default GlobalLoader;
