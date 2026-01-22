import React from 'react';
import { Loader2 } from 'lucide-react';

const DiscreteLoader = () => {
    return (
        <div style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 9998, // Slightly below 9999 (Full Loader)
            pointerEvents: 'none', // Don't block clicks
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.7,
            transition: 'opacity 0.3s ease'
        }}>
            <div style={{
                color: '#64748b', // Neutral slate-500
                animation: 'spin 1s linear infinite'
            }}>
                <Loader2 size={24} />
            </div>
            <style>
                {`
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                `}
            </style>
        </div>
    );
};

export default DiscreteLoader;
