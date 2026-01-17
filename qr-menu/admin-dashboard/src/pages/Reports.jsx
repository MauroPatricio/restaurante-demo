import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { analyticsAPI } from '../services/api';
import { useTranslation } from 'react-i18next';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Calendar, Download, BarChart2, DollarSign, List, Box, TrendingUp, FileText } from 'lucide-react';

import FinancialTab from '../components/reports/FinancialTab';
import SalesTab from '../components/reports/SalesTab';
import OperationalTab from '../components/reports/OperationalTab';
import InventoryTab from '../components/reports/InventoryTab';
import LoadingSpinner from '../components/LoadingSpinner';

// Modern styles matching Dashboard.jsx
const cardStyle = {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
    border: '1px solid rgba(0,0,0,0.02)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
};

export default function Reports() {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('financial');
    const [reportData, setReportData] = useState(null);

    const [dateRange, setDateRange] = useState({
        startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd')
    });

    useEffect(() => {
        if (user?.restaurant) {
            fetchData();
        }
    }, [user, dateRange, activeTab]);

    const fetchData = async () => {
        setLoading(true);
        setReportData(null);
        try {
            const restId = user.restaurant._id || user.restaurant;
            const params = {
                startDate: new Date(dateRange.startDate).toISOString(),
                endDate: new Date(dateRange.endDate).toISOString()
            };

            let res;
            switch (activeTab) {
                case 'financial':
                    res = await analyticsAPI.getFinancial(restId, params);
                    break;
                case 'sales':
                    res = await analyticsAPI.getSales(restId, params);
                    break;
                case 'operational':
                    res = await analyticsAPI.getOperational(restId, params);
                    break;
                case 'inventory':
                    res = await analyticsAPI.getInventory(restId);
                    break;
                default:
                    return;
            }
            setReportData(res.data);
        } catch (error) {
            console.error('Failed to fetch report data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDateChange = (e) => {
        setDateRange(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const handleDownloadCSV = () => {
        alert('CSV Export coming soon for new reports!');
    };

    const tabs = [
        { id: 'financial', label: t('financial') || 'Financial', icon: DollarSign, color: '#10b981', bg: '#ecfdf5' },
        { id: 'sales', label: t('sales_menu') || 'Sales & Menu', icon: List, color: '#3b82f6', bg: '#eff6ff' },
        { id: 'operational', label: t('operational') || 'Operational', icon: BarChart2, color: '#f59e0b', bg: '#fffbeb' },
        { id: 'inventory', label: t('inventory') || 'Inventory', icon: Box, color: '#8b5cf6', bg: '#f5f3ff' }
    ];

    const activeTabData = tabs.find(tab => tab.id === activeTab);

    return (
        <div style={{ padding: '24px', maxWidth: '100vw', minHeight: 'calc(100vh - 64px)', backgroundColor: '#f8fafc' }}>

            {/* Header */}
            <div className="dashboard-header-responsive" style={{ marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                        {t('reports') || 'reports'}
                    </h1>
                    <p style={{ color: '#64748b', marginTop: '8px', fontSize: '16px' }}>
                        {t('reports_desc') || 'Analyze your business performance'}
                    </p>
                </div>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: '#ecfdf5', padding: '10px 20px', borderRadius: '50px',
                    border: '1px solid #d1fae5', color: '#047857', fontSize: '14px', fontWeight: '600'
                }}>
                    <FileText size={18} />
                    {t('analytics') || 'Analytics'}
                </div>
            </div>

            {/* Date Range & Export Controls */}
            <div style={{ ...cardStyle, marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                {activeTab !== 'inventory' && (
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 16px',
                            background: '#f8fafc',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0'
                        }}>
                            <Calendar size={18} className="text-slate-500" />
                            <input
                                type="date"
                                name="startDate"
                                value={dateRange.startDate}
                                onChange={handleDateChange}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    color: '#1e293b',
                                    outline: 'none',
                                    cursor: 'pointer'
                                }}
                            />
                        </div>
                        <span style={{ color: '#94a3b8', fontWeight: '600' }}>—</span>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 16px',
                            background: '#f8fafc',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0'
                        }}>
                            <Calendar size={18} className="text-slate-500" />
                            <input
                                type="date"
                                name="endDate"
                                value={dateRange.endDate}
                                onChange={handleDateChange}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    color: '#1e293b',
                                    outline: 'none',
                                    cursor: 'pointer'
                                }}
                            />
                        </div>
                    </div>
                )}
                <button
                    onClick={handleDownloadCSV}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '12px 24px',
                        background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(79, 70, 229, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.3)';
                    }}
                >
                    <Download size={18} />
                    {t('export_csv') || 'Exportar CSV'}
                </button>
            </div>

            {/* Modern Tabs Navigation */}
            <div style={{ ...cardStyle, marginBottom: '24px', padding: '12px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '12px 20px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: isActive ? tab.bg : 'transparent',
                                    color: isActive ? tab.color : '#64748b',
                                    fontSize: '14px',
                                    fontWeight: isActive ? '700' : '500',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.background = '#f8fafc';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.background = 'transparent';
                                    }
                                }}
                            >
                                <tab.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                                {tab.label}
                                {isActive && (
                                    <div style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        left: 0,
                                        right: 0,
                                        height: '3px',
                                        background: tab.color,
                                        borderRadius: '3px 3px 0 0'
                                    }} />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tab Content with Modern Card */}
            <div style={cardStyle}>
                {loading ? (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '80px 20px',
                        gap: '16px',
                        color: '#64748b'
                    }}>
                        <LoadingSpinner size={48} />
                        <p style={{ fontSize: '14px', fontWeight: '500' }}>
                            {t('loading') || 'Carregando dados...'}
                        </p>
                    </div>
                ) : (
                    <>
                        {activeTab === 'financial' && <FinancialTab data={reportData} loading={loading} />}
                        {activeTab === 'sales' && <SalesTab data={reportData} loading={loading} />}
                        {activeTab === 'operational' && <OperationalTab data={reportData} loading={loading} />}
                        {activeTab === 'inventory' && <InventoryTab data={reportData} loading={loading} />}
                    </>
                )}
            </div>

            <style>{`
                @media (max-width: 768px) {
                    .dashboard-header-responsive {
                        flex-direction: column;
                        align-items: flex-start !important;
                        gap: 16px;
                    }
                }
            `}</style>
        </div>
    );
}
