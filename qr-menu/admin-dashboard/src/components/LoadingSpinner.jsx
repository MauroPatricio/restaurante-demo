import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingSpinner = ({ fullScreen = true, message = 'Loading...' }) => {
    if (fullScreen) {
        return (
            <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in fade-in duration-200">
                <Loader2 className="h-12 w-12 text-indigo-600 animate-spin mb-4" />
                <p className="text-slate-600 font-medium text-lg animate-pulse">{message}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mb-3" />
            <span className="text-sm text-slate-500 font-medium">{message}</span>
        </div>
    );
};

export default LoadingSpinner;
