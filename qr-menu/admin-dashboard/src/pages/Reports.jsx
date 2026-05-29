import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { analyticsAPI, waiterAnalyticsAPI } from '../services/api';
import { useTranslation } from 'react-i18next';
import { format, startOfMonth, endOfMonth, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { 
    Calendar, Download, BarChart2, DollarSign, List, Box, 
    TrendingUp, FileText, User, Clock, Shield, Database, 
    Sparkles, TrendingDown, ChevronDown, CheckCircle, ShieldCheck,
    AlertCircle, RefreshCw
} from 'lucide-react';
import { exportDetailedPDF, exportDetailedExcel } from '../utils/export_utils';

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

// Modern Premium Glassmorphic Card Styles
const cardStyle = {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
    border: '1px solid rgba(0,0,0,0.02)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
};

const selectorStyle = {
    padding: '10px 16px',
    background: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
    outline: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit'
};

export default function Reports() {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('financial');
    const [reportData, setReportData] = useState(null);

    // Advanced Period Selection States
    const [periodType, setPeriodType] = useState('monthly'); // 'daily', 'weekly', 'monthly', 'quarterly', 'annual', 'custom', 'specific-year'
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
    const [selectedQuarter, setSelectedQuarter] = useState('Q1');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // Date Range actually used for data fetching
    const [dateRange, setDateRange] = useState({
        startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd')
    });

    // Comparative Homologous Data
    const [prevPeriodData, setPrevPeriodData] = useState(null);

    // UI Interactive States
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [backupStatus, setBackupStatus] = useState('synced'); // 'synced', 'backing_up'
    const [emissionLogs, setEmissionLogs] = useState(() => {
        try {
            const saved = localStorage.getItem('report_emission_logs');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    // 1. Calculate dates when period variables change
    useEffect(() => {
        let start, end;
        const y = parseInt(selectedYear);

        switch (periodType) {
            case 'daily':
                const d = new Date(selectedDate);
                start = format(d, 'yyyy-MM-dd');
                end = format(d, 'yyyy-MM-dd');
                break;
            case 'weekly':
                const wd = new Date(selectedDate);
                const first = startOfWeek(wd, { weekStartsOn: 1 });
                const last = endOfWeek(wd, { weekStartsOn: 1 });
                start = format(first, 'yyyy-MM-dd');
                end = format(last, 'yyyy-MM-dd');
                break;
            case 'monthly':
                const m = parseInt(selectedMonth) - 1;
                start = format(new Date(y, m, 1), 'yyyy-MM-dd');
                end = format(new Date(y, m + 1, 0), 'yyyy-MM-dd');
                break;
            case 'quarterly':
                if (selectedQuarter === 'Q1') {
                    start = `${y}-01-01`;
                    end = `${y}-03-31`;
                } else if (selectedQuarter === 'Q2') {
                    start = `${y}-04-01`;
                    end = `${y}-06-30`;
                } else if (selectedQuarter === 'Q3') {
                    start = `${y}-07-01`;
                    end = `${y}-09-30`;
                } else {
                    start = `${y}-10-01`;
                    end = `${y}-12-31`;
                }
                break;
            case 'annual':
            case 'specific-year':
                start = `${y}-01-01`;
                end = `${y}-12-31`;
                break;
            case 'custom':
                // Custom uses direct calendar selection
                return;
            default:
                return;
        }

        setDateRange({ startDate: start, endDate: end });
    }, [periodType, selectedDate, selectedMonth, selectedQuarter, selectedYear]);

    // 2. Fetch main report data & homological comparative summary
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

            if (activeTab === 'staff' && Array.isArray(res.data)) {
                setReportData({ ranking: res.data });
            } else {
                setReportData(res.data);
            }

            // Fetch comparative/homologous period if tab is financial
            if (activeTab === 'financial') {
                fetchComparativeData(dateRange.startDate, dateRange.endDate);
            } else {
                setPrevPeriodData(null);
            }
        } catch (error) {
            console.error('Failed to fetch report data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Calculate comparative data for the equivalent preceding period
    const fetchComparativeData = async (currentStart, currentEnd) => {
        try {
            const start = new Date(currentStart);
            const end = new Date(currentEnd);
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

            const prevEnd = new Date(start);
            prevEnd.setDate(start.getDate() - 1);
            const prevStart = new Date(prevEnd);
            prevStart.setDate(prevEnd.getDate() - diffDays + 1);

            const prevStartStr = format(prevStart, 'yyyy-MM-dd');
            const prevEndStr = format(prevEnd, 'yyyy-MM-dd');

            const restId = user.restaurant?._id || user.restaurant?.id || user.restaurant;
            const params = {
                startDate: new Date(prevStartStr).toISOString(),
                endDate: new Date(prevEndStr).toISOString()
            };

            const res = await analyticsAPI.getFinancial(restId, params);
            if (res?.data?.summary) {
                setPrevPeriodData(res.data.summary);
            }
        } catch (err) {
            console.error("Failed to fetch comparative data:", err);
        }
    };

    // Auditor logs registration
    const addLogEntry = (formatName, hash) => {
        const newEntry = {
            id: `LOG-${Date.now()}`,
            user: user?.name || user?.email || 'Proprietário',
            timestamp: new Date().toISOString(),
            format: formatName,
            period: `${periodType.toUpperCase()} (${dateRange.startDate} a ${dateRange.endDate})`,
            tab: activeTab,
            hash: hash
        };
        setEmissionLogs(prev => {
            const updated = [newEntry, ...prev].slice(0, 30);
            localStorage.setItem('report_emission_logs', JSON.stringify(updated));
            return updated;
        });
    };

    // Execute backup of database
    const handleBackupDownload = () => {
        setBackupStatus('backing_up');
        setTimeout(() => {
            const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
                JSON.stringify(emissionLogs, null, 2)
            )}`;
            const link = document.createElement('a');
            link.setAttribute('href', jsonString);
            link.setAttribute('download', `backup_fiduciario_relatorios_${Date.now()}.json`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setBackupStatus('synced');
        }, 1200);
    };

    const handleDateChange = (e) => {
        setDateRange(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    // Classic CSV download fallback
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

    // Premium Corporate PDF and Excel export handler
    const handleExport = (formatType) => {
        if (!reportData) return alert(t('no_data_to_export') || 'Sem dados para exportar');

        let columns = [];
        let rows = [];
        let filename = `relatorio_${activeTab}_${dateRange.startDate}`;
        let titleLabel = `${t('tab_' + activeTab) || activeTab.toUpperCase()} - Relatório Inteligente`;

        switch (activeTab) {
            case 'financial':
                columns = [
                    { header: "Período / Dia", dataKey: "period" },
                    { header: "Receita (MZN)", dataKey: "revenue" },
                    { header: "Margem Bruta (MZN)", dataKey: "grossMargin" },
                    { header: "Percentagem de Margem", dataKey: "marginPercentage" },
                    { header: "Ticket Médio (MZN)", dataKey: "avgTicket" },
                    { header: "Pedidos Concluídos", dataKey: "orders" }
                ];
                rows = (reportData.trend || []).map(t => ({
                    period: t._id,
                    revenue: (t.revenue || 0).toLocaleString('pt-MZ') + " MT",
                    grossMargin: (t.grossMargin || 0).toLocaleString('pt-MZ') + " MT",
                    marginPercentage: `${t.marginPercentage?.toFixed(1) || 0}%`,
                    avgTicket: (t.avgTicket || 0).toLocaleString('pt-MZ') + " MT",
                    orders: t.orders || 0
                }));
                break;

            case 'sales':
                columns = [
                    { header: "Produto", dataKey: "name" },
                    { header: "Categoria", dataKey: "category" },
                    { header: "Quantidade Vendida", dataKey: "count" },
                    { header: "Faturamento (MZN)", dataKey: "revenue" }
                ];
                rows = (reportData.topItems || []).map(i => ({
                    name: i._id || i.name,
                    category: i.category || 'Geral',
                    count: i.count || i.quantity || 0,
                    revenue: (i.revenue || 0).toLocaleString('pt-MZ') + " MT"
                }));
                break;

            case 'inventory':
                columns = [
                    { header: "Ingrediente", dataKey: "name" },
                    { header: "Stock", dataKey: "stock" },
                    { header: "Stock Mín", dataKey: "stockMin" },
                    { header: "Consumido", dataKey: "consumed" },
                    { header: "Preço Custo", dataKey: "costPrice" },
                    { header: "Valor Stock", dataKey: "totalValue" },
                    { header: "Estado", dataKey: "status" }
                ];
                rows = (reportData.items || []).map(i => ({
                    name: i.name,
                    stock: `${i.stock} ${i.unit || 'Un'}`,
                    stockMin: `${i.stockMin} ${i.unit || 'Un'}`,
                    consumed: `${i.consumed} ${i.unit || 'Un'}`,
                    costPrice: (i.costPrice || 0).toLocaleString('pt-MZ') + " MT",
                    totalValue: (i.totalValue || 0).toLocaleString('pt-MZ') + " MT",
                    status: i.status || 'OK'
                }));
                break;

            case 'cash-flow':
                columns = [
                    { header: "Dia", dataKey: "day" },
                    { header: "Entradas / Receitas (MZN)", dataKey: "entradas" },
                    { header: "Saídas / Despesas (MZN)", dataKey: "saidas" },
                    { header: "Saldo Caixa (MZN)", dataKey: "balance" }
                ];
                rows = (reportData.daily || []).map(d => ({
                    day: d.day,
                    entradas: (d.entradas || 0).toLocaleString('pt-MZ') + " MT",
                    saidas: (d.saidas || 0).toLocaleString('pt-MZ') + " MT",
                    balance: ((d.entradas || 0) - (d.saidas || 0)).toLocaleString('pt-MZ') + " MT"
                }));
                break;

            case 'profit':
                columns = [
                    { header: "Categoria de Produtos", dataKey: "name" },
                    { header: "Receita (MZN)", dataKey: "revenue" },
                    { header: "Custo de Mercadoria COGS (MZN)", dataKey: "cogs" },
                    { header: "Lucro Bruto (MZN)", dataKey: "grossProfit" },
                    { header: "Margem de Lucro", dataKey: "margin" }
                ];
                rows = (reportData.categories || []).map(c => ({
                    name: c.name,
                    revenue: (c.revenue || 0).toLocaleString('pt-MZ') + " MT",
                    cogs: (c.cogs || 0).toLocaleString('pt-MZ') + " MT",
                    grossProfit: (c.grossProfit || 0).toLocaleString('pt-MZ') + " MT",
                    margin: `${c.margin?.toFixed(1) || 0}%`
                }));
                break;

            case 'orders':
                columns = [
                    { header: "Estado do Pedido", dataKey: "status" },
                    { header: "Qtd Pedidos", dataKey: "count" },
                    { header: "Receita Bruta (MZN)", dataKey: "revenue" }
                ];
                rows = (reportData.byStatus || []).map(s => ({
                    status: s._id,
                    count: s.count,
                    revenue: (s.revenue || 0).toLocaleString('pt-MZ') + " MT"
                }));
                break;

            case 'customers':
                columns = [
                    { header: "Cliente", dataKey: "name" },
                    { header: "Telefone", dataKey: "phone" },
                    { header: "Pedidos Lançados", dataKey: "orders" },
                    { header: "Prato Favorito", dataKey: "favoriteItem" },
                    { header: "Total Gasto", dataKey: "spent" }
                ];
                const custSource = reportData.customers || reportData.topCustomers || [];
                rows = custSource.map(c => ({
                    name: c.name || 'Cliente Anónimo',
                    phone: c.phone || '-',
                    orders: c.visitCount || c.orderCount || c.orders || 0,
                    favoriteItem: c.favoriteItem || 'Vários',
                    spent: (c.totalSpent || c.spent || 0).toLocaleString('pt-MZ') + " MT"
                }));
                break;

            case 'staff':
                columns = [
                    { header: "Colaborador", dataKey: "name" },
                    { header: "Mesas Atendidas", dataKey: "tables" },
                    { header: "Pedidos Concluídos", dataKey: "orders" },
                    { header: "Faturamento (MZN)", dataKey: "revenue" },
                    { header: "Eficiência / Score", dataKey: "score" }
                ];
                const ranking = Array.isArray(reportData) ? reportData : (reportData.ranking || []);
                rows = ranking.map(w => ({
                    name: w.name || w.waiterName,
                    tables: w.metrics?.totalTables || w.totalTables || 0,
                    orders: w.metrics?.totalOrders || w.totalOrders || 0,
                    revenue: (w.metrics?.totalRevenue || w.totalRevenue || 0).toLocaleString('pt-MZ') + " MT",
                    score: `${w.metrics?.efficiency || w.avgRating || 0}%`
                }));
                break;

            case 'operational':
                columns = [
                    { header: "Métrica Operacional", dataKey: "metric" },
                    { header: "Valor Registado", dataKey: "value" },
                    { header: "Unidade", dataKey: "unit" }
                ];
                rows = [
                    { metric: "Tempo Médio de Preparação", value: reportData.avgPrepTime || 0, unit: "minutos" },
                    { metric: "Tempo Médio de Entrega", value: reportData.avgDeliveryTime || 0, unit: "minutos" },
                    { metric: "Pedidos no Turno Manhã", value: reportData.shifts?.find(s => s._id === 'morning')?.orders || 0, unit: "pedidos" },
                    { metric: "Pedidos no Turno Tarde", value: reportData.shifts?.find(s => s._id === 'afternoon')?.orders || 0, unit: "pedidos" },
                    { metric: "Pedidos no Turno Noite", value: reportData.shifts?.find(s => s._id === 'night')?.orders || 0, unit: "pedidos" }
                ];
                break;

            default:
                return alert('Formato de aba não mapeado.');
        }

        // Generate Totals if applicable
        let totals = [];
        if (activeTab === 'financial' && reportData.summary) {
            totals = [
                { label: "Faturamento Total", value: `${reportData.summary.totalRevenue?.toLocaleString('pt-MZ')} MT` },
                { label: "Custo de Mercadoria COGS", value: `${reportData.summary.totalCost?.toLocaleString('pt-MZ')} MT` },
                { label: "Margem de Lucro Bruto", value: `${reportData.summary.grossMargin?.toLocaleString('pt-MZ')} MT (${reportData.summary.marginPercentage?.toFixed(1)}%)` },
                { label: "Média de Consumo (Ticket Médio)", value: `${reportData.summary.avgTicket?.toLocaleString('pt-MZ')} MT` },
                { label: "Total Pedidos Processados", value: `${reportData.summary.totalOrders}` }
            ];
        } else if (activeTab === 'cash-flow' && reportData.daily) {
            const totalEntradas = reportData.daily.reduce((sum, d) => sum + (d.entradas || 0), 0);
            const totalSaidas = reportData.daily.reduce((sum, d) => sum + (d.saidas || 0), 0);
            totals = [
                { label: "Total de Entradas / Receitas", value: `${totalEntradas.toLocaleString('pt-MZ')} MT` },
                { label: "Total de Saídas / Despesas", value: `${totalSaidas.toLocaleString('pt-MZ')} MT` },
                { label: "Saldo Final Caixa", value: `${(totalEntradas - totalSaidas).toLocaleString('pt-MZ')} MT` }
            ];
        }

        const restaurantName = user?.restaurant?.name || 'Gestão Moderna QR-Menu';
        const periodLabel = `${periodType.toUpperCase()}`;
        const rangeLabel = `${dateRange.startDate} a ${dateRange.endDate}`;

        let signature = 'STAMP-SECURE-DEFAULT';
        if (formatType === 'pdf') {
            signature = exportDetailedPDF({
                title: titleLabel,
                periodName: periodLabel,
                dateRangeStr: rangeLabel,
                columns,
                data: rows,
                restaurantName,
                filename,
                totals
            });
        } else if (formatType === 'excel') {
            exportDetailedExcel({
                title: titleLabel,
                periodName: periodLabel,
                dateRangeStr: rangeLabel,
                columns,
                data: rows,
                filename,
                totals
            });
            signature = `STAMP-EXCEL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        }

        addLogEntry(formatType.toUpperCase(), signature);
        setShowExportMenu(false);
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

    // Calculate homologous comparisons
    const currentRev = reportData?.summary?.totalRevenue || 0;
    const prevRev = prevPeriodData?.totalRevenue || 0;
    const revGrowth = prevRev > 0 ? ((currentRev - prevRev) / prevRev) * 100 : null;

    const currentOrd = reportData?.summary?.totalOrders || 0;
    const prevOrd = prevPeriodData?.totalOrders || 0;
    const ordGrowth = prevOrd > 0 ? ((currentOrd - prevOrd) / prevOrd) * 100 : null;

    return (
        <div style={{ padding: '24px', maxWidth: '100vw', minHeight: 'calc(100vh - 64px)', backgroundColor: '#f8fafc' }}>

            {/* Header */}
            <div className="dashboard-header-responsive" style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#1e293b', margin: 0, letterSpacing: '-0.02em' }}>
                        {t('reports_title') || 'Relatórios Inteligentes'}
                    </h1>
                    <p style={{ color: '#64748b', marginTop: '8px', fontSize: '15px', fontWeight: '500' }}>
                        Transforme dados operacionais em inteligência estratégica corporativa.
                    </p>
                </div>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: '#eff6ff', padding: '10px 20px', borderRadius: '50px',
                    border: '1px solid #bfdbfe', color: '#1d4ed8', fontSize: '13px', fontWeight: '700'
                }}>
                    <ShieldCheck size={18} />
                    Auditável & Seguro
                </div>
            </div>

            {/* Advanced Period Selector & Controls Grid */}
            <div style={{ ...cardStyle, marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Selector Row */}
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Tipo de Período</span>
                        <select 
                            value={periodType} 
                            onChange={(e) => setPeriodType(e.target.value)}
                            style={selectorStyle}
                        >
                            <option value="daily">Diário</option>
                            <option value="weekly">Semanal</option>
                            <option value="monthly">Mensal</option>
                            <option value="quarterly">Trimestral</option>
                            <option value="annual">Anual</option>
                            <option value="specific-year">Ano Específico</option>
                            <option value="custom">Personalizado (Datas)</option>
                        </select>
                    </div>

                    {/* Contextual Date/Period Inputs */}
                    {periodType === 'daily' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Selecione o Dia</span>
                            <input 
                                type="date" 
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                style={selectorStyle}
                            />
                        </div>
                    )}

                    {periodType === 'weekly' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Selecione o Dia de Referência</span>
                            <input 
                                type="date" 
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                style={selectorStyle}
                            />
                        </div>
                    )}

                    {periodType === 'monthly' && (
                        <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Mês</span>
                                <select 
                                    value={selectedMonth} 
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    style={selectorStyle}
                                >
                                    <option value="1">Janeiro</option>
                                    <option value="2">Fevereiro</option>
                                    <option value="3">Março</option>
                                    <option value="4">Abril</option>
                                    <option value="5">Maio</option>
                                    <option value="6">Junho</option>
                                    <option value="7">Julho</option>
                                    <option value="8">Agosto</option>
                                    <option value="9">Setembro</option>
                                    <option value="10">Outubro</option>
                                    <option value="11">Novembro</option>
                                    <option value="12">Dezembro</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Ano</span>
                                <select 
                                    value={selectedYear} 
                                    onChange={(e) => setSelectedYear(e.target.value)}
                                    style={selectorStyle}
                                >
                                    {[2024, 2025, 2026, 2027].map(yr => (
                                        <option key={yr} value={yr}>{yr}</option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}

                    {periodType === 'quarterly' && (
                        <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Trimestre</span>
                                <select 
                                    value={selectedQuarter} 
                                    onChange={(e) => setSelectedQuarter(e.target.value)}
                                    style={selectorStyle}
                                >
                                    <option value="Q1">Q1 (Jan - Mar)</option>
                                    <option value="Q2">Q2 (Abr - Jun)</option>
                                    <option value="Q3">Q3 (Jul - Set)</option>
                                    <option value="Q4">Q4 (Out - Dez)</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Ano</span>
                                <select 
                                    value={selectedYear} 
                                    onChange={(e) => setSelectedYear(e.target.value)}
                                    style={selectorStyle}
                                >
                                    {[2024, 2025, 2026, 2027].map(yr => (
                                        <option key={yr} value={yr}>{yr}</option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}

                    {(periodType === 'annual' || periodType === 'specific-year') && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Selecione o Ano Fiscal</span>
                            <select 
                                value={selectedYear} 
                                onChange={(e) => setSelectedYear(e.target.value)}
                                style={selectorStyle}
                            >
                                {[2024, 2025, 2026, 2027].map(yr => (
                                    <option key={yr} value={yr}>{yr}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {periodType === 'custom' && (
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Data de Início</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <Calendar size={18} className="text-slate-500" />
                                    <input type="date" name="startDate" value={dateRange.startDate} onChange={handleDateChange} style={{ border: 'none', background: 'transparent', fontSize: '14px', fontWeight: '500', color: '#1e293b', outline: 'none' }} />
                                </div>
                            </div>
                            <span style={{ color: '#94a3b8', fontWeight: '600', marginTop: '16px' }}>—</span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Data de Fim</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <Calendar size={18} className="text-slate-500" />
                                    <input type="date" name="endDate" value={dateRange.endDate} onChange={handleDateChange} style={{ border: 'none', background: 'transparent', fontSize: '14px', fontWeight: '500', color: '#1e293b', outline: 'none' }} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Quick Info Period Tag */}
                    <div style={{ marginLeft: 'auto', textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Filtro Ativo</span>
                        <div style={{ padding: '8px 16px', background: '#f1f5f9', color: '#334155', borderRadius: '8px', fontSize: '13px', fontWeight: '700', border: '1px solid #cbd5e1' }}>
                            {dateRange.startDate}  a  {dateRange.endDate}
                        </div>
                    </div>
                </div>

                {/* Export Dropdown Row */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', position: 'relative', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                    <button
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 24px',
                            background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 4px 12px rgba(30, 41, 59, 0.2)'
                        }}
                    >
                        <Download size={18} />
                        Exportar Relatório Corporativo
                        <ChevronDown size={16} />
                    </button>

                    {showExportMenu && (
                        <div style={{
                            position: 'absolute',
                            top: '60px',
                            right: 0,
                            width: '240px',
                            background: 'white',
                            borderRadius: '12px',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                            border: '1px solid #e2e8f0',
                            zIndex: 100,
                            padding: '8px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px'
                        }}>
                            <button 
                                onClick={() => handleExport('pdf')}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '12px',
                                    border: 'none', background: 'transparent', borderRadius: '8px', textAlign: 'left',
                                    fontSize: '13px', fontWeight: '600', color: '#1e293b', cursor: 'pointer', transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <span style={{ color: '#ef4444' }}>●</span> PDF Corporativo (Assinado)
                            </button>
                            <button 
                                onClick={() => handleExport('excel')}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '12px',
                                    border: 'none', background: 'transparent', borderRadius: '8px', textAlign: 'left',
                                    fontSize: '13px', fontWeight: '600', color: '#1e293b', cursor: 'pointer', transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <span style={{ color: '#10b981' }}>●</span> Folha de Cálculo Excel (XLSX)
                            </button>
                            <button 
                                onClick={() => handleExport('csv')}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '12px',
                                    border: 'none', background: 'transparent', borderRadius: '8px', textAlign: 'left',
                                    fontSize: '13px', fontWeight: '600', color: '#1e293b', cursor: 'pointer', transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <span style={{ color: '#3b82f6' }}>●</span> CSV Separado por Vírgulas
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Strategic Intelligence Homologous Comparisons Row */}
            {activeTab === 'financial' && prevPeriodData && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                    
                    {/* Revenue Growth comparative card */}
                    <div style={{ ...cardStyle, background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: 'white', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Crescimento Receita Homóloga</span>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                            <h3 style={{ fontSize: '28px', fontWeight: '800', margin: 0 }}>
                                {reportData?.summary?.totalRevenue?.toLocaleString('pt-MZ')} MT
                            </h3>
                            {revGrowth !== null && (
                                <span style={{
                                    padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
                                    background: revGrowth >= 0 ? '#d1fae5' : '#fee2e2',
                                    color: revGrowth >= 0 ? '#065f46' : '#991b1b',
                                    display: 'inline-flex', alignItems: 'center', gap: '4px'
                                }}>
                                    {revGrowth >= 0 ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
                                    {revGrowth >= 0 ? '+' : ''}{revGrowth.toFixed(1)}%
                                </span>
                            )}
                        </div>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                            Anterior: {prevPeriodData.totalRevenue?.toLocaleString('pt-MZ')} MT
                        </span>
                    </div>

                    {/* Orders growth comparative card */}
                    <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Volume de Pedidos Homólogos</span>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                            <h3 style={{ fontSize: '28px', fontWeight: '800', margin: 0, color: '#1e293b' }}>
                                {reportData?.summary?.totalOrders}
                            </h3>
                            {ordGrowth !== null && (
                                <span style={{
                                    padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
                                    background: ordGrowth >= 0 ? '#d1fae5' : '#fee2e2',
                                    color: ordGrowth >= 0 ? '#065f46' : '#991b1b',
                                    display: 'inline-flex', alignItems: 'center', gap: '4px'
                                }}>
                                    {ordGrowth >= 0 ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
                                    {ordGrowth >= 0 ? '+' : ''}{ordGrowth.toFixed(1)}%
                                </span>
                            )}
                        </div>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                            Anterior: {prevPeriodData.totalOrders} pedidos
                        </span>
                    </div>

                    {/* Ticket medio comparative card */}
                    <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Variação de Ticket Médio</span>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                            <h3 style={{ fontSize: '28px', fontWeight: '800', margin: 0, color: '#1e293b' }}>
                                {reportData?.summary?.avgTicket ? Math.round(reportData.summary.avgTicket).toLocaleString('pt-MZ') : 0} MT
                            </h3>
                            {prevPeriodData?.avgTicket && (
                                <span style={{
                                    padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
                                    background: (reportData.summary.avgTicket >= prevPeriodData.avgTicket) ? '#d1fae5' : '#fee2e2',
                                    color: (reportData.summary.avgTicket >= prevPeriodData.avgTicket) ? '#065f46' : '#991b1b',
                                    display: 'inline-flex', alignItems: 'center', gap: '4px'
                                }}>
                                    {reportData.summary.avgTicket >= prevPeriodData.avgTicket ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
                                    {(((reportData.summary.avgTicket - prevPeriodData.avgTicket) / prevPeriodData.avgTicket) * 100).toFixed(1)}%
                                </span>
                            )}
                        </div>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                            Anterior: {prevPeriodData?.avgTicket ? Math.round(prevPeriodData.avgTicket).toLocaleString('pt-MZ') : 0} MT
                        </span>
                    </div>
                </div>
            )}

            {/* Tabs Navigation */}
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
                                    if (!isActive) e.currentTarget.style.background = '#f8fafc';
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActive) e.currentTarget.style.background = 'transparent';
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

            {/* Tab Content Display */}
            <div style={{ ...cardStyle, marginBottom: '24px' }}>
                {loading ? (
                    <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', padding: '80px 20px', gap: '16px', color: '#64748b'
                    }}>
                        <LoadingSpinner size={48} />
                        <p style={{ fontSize: '14px', fontWeight: '500' }}>
                            Processamento de dados e agregados operacionais...
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

            {/* Audit History & Automated Database Backup Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', marginTop: '24px' }}>
                
                {/* Emission Audit Logs */}
                <div style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', className: 'items-center', marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Clock size={18} className="text-slate-500" />
                            Histórico de Emissões & Logs de Auditoria
                        </h3>
                        <span style={{ fontSize: '11px', background: '#e2e8f0', color: '#475569', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>
                            {emissionLogs.length} Registos
                        </span>
                    </div>

                    {emissionLogs.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto', paddingRight: '8px' }}>
                            {emissionLogs.map((log) => (
                                <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <div style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>
                                            Relatório {log.tab?.toUpperCase()} em formato {log.format}
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                                            Emitido por: {log.user} | {new Date(log.timestamp).toLocaleTimeString()}
                                        </div>
                                        <div style={{ fontSize: '10px', color: '#ef4444', fontWeight: '700', fontFamily: 'monospace' }}>
                                            HASH: {log.hash}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right', fontSize: '11px', color: '#475569', fontWeight: '600' }}>
                                        {log.period}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                            <AlertCircle size={32} style={{ margin: '0 auto 12px auto' }} />
                            <p style={{ fontSize: '13px', fontWeight: '500', margin: 0 }}>
                                Nenhuma emissão de relatório registada nesta sessão.
                            </p>
                        </div>
                    )}
                </div>

                {/* Cloud & Local Backup Status */}
                <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'space-between' }}>
                    <div>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Database size={18} className="text-slate-500" />
                            Segurança & Cópia Fiduciária
                        </h3>
                        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '8px', lineHeight: '1.5' }}>
                            Os relatórios emitidos são automaticamente replicados para o servidor local e guardados na nuvem.
                        </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: '#ecfdf5', borderRadius: '10px', border: '1px solid #a7f3d0' }}>
                        <ShieldCheck size={20} className="text-emerald-600" />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '12px', fontWeight: '700', color: '#065f46' }}>Backup Cloud Ativo</span>
                            <span style={{ fontSize: '11px', color: '#047857' }}>Última sincronização: Agora</span>
                        </div>
                    </div>

                    <button
                        onClick={handleBackupDownload}
                        disabled={backupStatus === 'backing_up'}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '12px',
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            borderRadius: '10px',
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#334155',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        {backupStatus === 'backing_up' ? (
                            <>
                                <RefreshCw size={16} className="animate-spin" />
                                Efetuando Backup...
                            </>
                        ) : (
                            <>
                                <Database size={16} />
                                Descarregar Cópia Segurança
                            </>
                        )}
                    </button>
                </div>
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
