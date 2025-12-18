import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
// import { orderAPI, feedbackAPI } from '../services/api'; 
import { analyticsAPI as analyticsService } from '../services/analytics';
import { useTranslation } from 'react-i18next';
import {
    ShoppingBag,
    DollarSign,
    ChefHat,
    Star
} from 'lucide-react';

export default function Dashboard() {
    const { user } = useAuth();
    const { t } = useTranslation();
    
    // Hardcoded stats for visual verification since fetch is disabled
    const stats = {
        totalOrders: 150,
        totalRevenue: 25000,
        avgPrepTime: 12,
        averageRating: 4.5
    };

    return (
        <div className="page-content space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">{t('overview')}</h2>
            
            {/* KPI Stats Grid */}
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="stat-card bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">{t('total_revenue')}</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-2">
                            {stats.totalRevenue.toLocaleString()} MT
                        </h3>
                    </div>
                    <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                        <DollarSign size={24} />
                    </div>
                </div>

                <div className="stat-card bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">{t('total_orders')}</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-2">
                            {stats.totalOrders}
                        </h3>
                    </div>
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                        <ShoppingBag size={24} />
                    </div>
                </div>

                <div className="stat-card bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between">
                     <div>
                        <p className="text-sm font-medium text-gray-500">Kitchen Prep Time</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-2">
                            {stats.avgPrepTime} min
                        </h3>
                    </div>
                    <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
                        <ChefHat size={24} />
                    </div>
                </div>

                <div className="stat-card bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">{t('average_rating')}</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-2">
                             {stats.averageRating}
                        </h3>
                    </div>
                    <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg">
                        <Star size={24} />
                    </div>
                </div>
            </div>

            <div className="p-4 bg-yellow-50 text-yellow-800 rounded border border-yellow-200">
                <p><strong>Note:</strong> Charts are temporarily disabled due to compatibility issues.</p>
            </div>
        </div>
    );
}
