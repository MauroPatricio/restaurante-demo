import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Server, ChefHat, Clock } from 'lucide-react';

const Maintenance = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500"></div>

                <div className="mb-8 relative">
                    <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
                        <ChefHat size={48} className="text-orange-500" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-white p-2 rounded-full shadow-md">
                        <Server size={20} className="text-gray-400" />
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-gray-800 mb-4">
                    {t('maintenance_title')}
                </h1>

                <p className="text-gray-600 mb-8 leading-relaxed">
                    {t('maintenance_message')}
                </p>

                <div className="space-y-4">
                    <button
                        onClick={() => navigate('/')}
                        className="w-full py-3.5 bg-gray-900 text-white rounded-xl font-semibold shadow-lg hover:bg-gray-800 transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2"
                    >
                        <Clock size={18} />
                        {t('retry')}
                    </button>
                </div>

                <div className="mt-8 text-xs text-gray-400">
                    ID: {new Date().getTime().toString().slice(-6)}
                </div>
            </div>
        </div>
    );
};

export default Maintenance;
