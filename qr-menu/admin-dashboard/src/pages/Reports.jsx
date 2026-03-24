import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { analyticsAPI, waiterAnalyticsAPI } from '../services/api';
import { useTranslation } from 'react-i18next';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Calendar, Download, BarChart2, DollarSign, List, Box, TrendingUp, FileText, User } from 'lucide-react';

import FinancialTab from '../components/reports/FinancialTab';
import SalesTab from '../components/reports/SalesTab';
import OperationalTab from '../components/reports/OperationalTab';
import InventoryTab from '../components/reports/InventoryTab';
import StaffTab from '../components/reports/StaffTab';
import CashFlowTab from '../components/reports/CashFlowTab';
import ProfitTab from '../components/reports/ProfitTab';
import OrdersTab from '../components/reports/OrdersTab';
import CustomersTab from '../components/reports/CustomersTab';
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
            const restId = user.restaurant?._id || user.restaurant?.id || user.restaurant;
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
                case 'staff':
                    res = await waiterAnalyticsAPI.getRanking(restId, params);
                    break;
                case 'cash-flow':
                    res = await analyticsAPI.getCashFlow(restId, params);
                    break;
                case 'profit':
                    res = await analyticsAPI.getProfit(restId, params);
                    break;
                case 'orders':
                    res = await analyticsAPI.getOrdersReport(restId, params);
                    break;
                case 'customers':
                    res = await analyticsAPI.getCustomers(restId, params);
                    break;
                default:
                    return;
            }
            // Defensive check for staff ranking structure
            if (activeTab === 'staff' && Array.isArray(res.data)) {
                setReportData({ ranking: res.data });
            } else {
                setReportData(res.data);
            }
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
        if (!reportData) return alert(t('no_data_to_export') || 'Sem dados para exportar');

        let headers = [];
        let rows = [];
        let filename = `report_${activeTab}_${dateRange.startDate}.csv`;

        switch (activeTab) {
            case 'financial':
                headers = ["Period", "Revenue", "Gross Margin", "Margin %", "Avg Ticket", "Orders"];
                rows = (reportData.trend || []).map(t => [
                    t._id,
                    t.revenue || 0,
                    t.grossMargin || 0,
                    t.marginPercentage?.toFixed(1) || 0,
                    t.avgTicket || 0,
                    t.orders || 0
                ]);
                break;

            case 'cash-flow':
                headers = ["Day", "Entries", "Exits", "Balance"];
                rows = (reportData.daily || []).map(d => [
                    d.day,
                    d.entradas || 0,
                    d.saidas || 0,
                    (d.entradas || 0) - (d.saidas || 0)
                ]);
                break;

            case 'profit':
                headers = ["Category", "Total Revenue", "COGS", "Gross Profit", "Margin %"];
                rows = (reportData.categories || []).map(c => [
                    c.name,
                    c.revenue || 0,
                    c.cogs || 0,
                    c.grossProfit || 0,
                    c.margin?.toFixed(1) || 0
                ]);
                break;

            case 'sales':
                headers = ["Product", "Quantity", "Revenue", "Source"];
                rows = (reportData.topItems || []).map(i => [
                    i.name,
                    i.quantity,
                    i.revenue,
                    "General"
                ]);
                break;

            case 'inventory':
                headers = ["Item", "Stock Qty", "Cost Price", "Consumed", "Total Value", "Status"];
                rows = (reportData.items || []).map(i => [
                    i.name,
                    i.stock || 0,
                    i.costPrice || 0,
                    i.consumed || 0,
                    i.totalValue || 0,
                    i.status || 'OK'
                ]);
                break;

            case 'operational':
                headers = ["Metric", "Value", "Unit"];
                rows = [
                    ["Avg Prep Time", reportData.avgPrepTime || 0, "min"],
                    ["Avg Delivery Time", reportData.avgDeliveryTime || 0, "min"],
                    ["Total Orders", reportData.busiestDays?.reduce((sum, d) => sum + d.orders, 0) || 0, "units"]
                ];
                break;

            case 'customers':
                headers = ["Customer Name", "Phone", "Total Orders", "Total Spent", "Last Visit"];
                rows = (reportData.topCustomers || []).map(c => [
                    c.name,
                    c.phone || '-',
                    c.orders,
                    c.spent,
                    c.lastVisit ? new Date(c.lastVisit).toLocaleDateString() : 'N/A'
                ]);
                break;

            case 'staff':
                headers = ["Staff Name", "Tables", "Orders", "Revenue", "Score"];
                const ranking = Array.isArray(reportData) ? reportData : (reportData.ranking || []);
                rows = ranking.map(w => [
                    w.name,
                    w.metrics?.totalTables || 0,
                    w.metrics?.totalOrders || w.totalOrders || 0,
                    w.metrics?.totalRevenue || w.totalRevenue || 0,
                    w.metrics?.efficiency || w.avgRating || 0
                ]);
                break;

            case 'orders':
                headers = ["Status", "Order Count", "Revenue"];
                rows = (reportData.byStatus || []).map(s => [
                    s._id,
                    s.count,
                    s.revenue
                ]);
                break;

            default:
                return alert('Export format not defined for this tab');
        }

        const csvContent = "\uFEFF" + headers.join(",") + "\n"
            + rows.map(r => r.map(cell => `"${cell}"`).join(",")).join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const tabs = [
        { id: 'financial', label: t('tab_financial') || 'Financeiro', icon: DollarSign, color: '#10b981', bg: '#ecfdf5' },
        { id: 'cash-flow', label: t('tab_cashflow') || 'Fluxo de Caixa', icon: TrendingUp, color: '#059669', bg: '#ecfdf5' },
        { id: 'profit', label: t('tab_profit') || 'Lucro & Rentabilidade', icon: TrendingUp, color: '#059669', bg: '#ecfdf5' },
        { id: 'sales', label: t('tab_sales') || 'Vendas & Menu', icon: List, color: '#3b82f6', bg: '#eff6ff' },
        { id: 'orders', label: t('tab_orders') || 'Pedidos', icon: FileText, color: '#6366f1', bg: '#eef2ff' },
        { id: 'operational', label: t('tab_efficiency') || 'Eficiência', icon: BarChart2, color: '#f59e0b', bg: '#fffbeb' },
        { id: 'inventory', label: t('tab_inventory') || 'Stock', icon: Box, color: '#8b5cf6', bg: '#f5f3ff' },
        { id: 'customers', label: t('tab_customers') || 'Clientes', icon: User, color: '#6366f1', bg: '#eef2ff' },
        { id: 'staff', label: t('tab_staff') || 'Equipa', icon: User, color: '#ec4899', bg: '#fdf2f8' }
    ];

    const activeTabData = tabs.find(tab => tab.id === activeTab);

    return (
        <div style={{ padding: '24px', maxWidth: '100vw', minHeight: 'calc(100vh - 64px)', backgroundColor: '#f8fafc' }}>

            {/* Header */}
            <div className="dashboard-header-responsive" style={{ marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                        {t('reports_title')}
                    </h1>
                    <p style={{ color: '#64748b', marginTop: '8px', fontSize: '16px' }}>
                        {t('reports_management_desc')}
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
                        {activeTab === 'staff' && <StaffTab data={reportData} loading={loading} />}
                        {activeTab === 'cash-flow' && <CashFlowTab data={reportData} loading={loading} />}
                        {activeTab === 'profit' && <ProfitTab data={reportData} loading={loading} />}
                        {activeTab === 'orders' && <OrdersTab data={reportData} loading={loading} />}
                        {activeTab === 'customers' && <CustomersTab data={reportData} loading={loading} />}
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
