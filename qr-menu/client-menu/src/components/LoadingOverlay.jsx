import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const LoadingOverlay = () => {
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl flex flex-col items-center max-w-sm w-full text-center"
            >
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="mb-4 text-primary-600 dark:text-primary-400"
                >
                    <Loader2 size={48} />
                </motion.div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">A processar...</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Por favor, aguarde enquanto processamos sua solicitação.</p>
            </motion.div>
        </div>
    );
};

export default LoadingOverlay;
