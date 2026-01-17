import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const LoadingSpinner = ({ size = 24, className = "", message = "" }) => {
    return (
        <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="text-primary-600 dark:text-primary-400"
            >
                <Loader2 size={size} />
            </motion.div>
            {message && (
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 animate-pulse">
                    {message}
                </p>
            )}
        </div>
    );
};

export default LoadingSpinner;
