import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { accountingAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { FileText, Calculator, Download, Calendar, ArrowRight, TrendingUp, TrendingDown, Percent } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { exportToPDF, exportToExcel } from '../../utils/export_utils';
import { useCurrency } from '../../contexts/CurrencyContext';

const ApuramentoIVA = () => {
    const { t } = useTranslation();
    const { convertAndFormat, systemCurrency } = useCurrency();

    const { user } = useAuth();
    const currentRestaurant = user?.restaurant;

    // Default to current month
    const currentDate = new Date();
    const [dateRange, setDateRange] = useState({
        startDate: format(startOfMonth(currentDate), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(currentDate), 'yyyy-MM-dd')
    });

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        const restaurantId = currentRestaurant?._id || currentRestaurant;
        if (!restaurantId) return;
        setLoading(true);
        try {
            const res = await accountingAPI.getIVAReport({
                startDate: dateRange.startDate,
                endDate: dateRange.endDate
            });
            setData(res.data);
        } catch (error) {
            console.error('Failed to fetch IVA report:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [currentRestaurant, dateRange.startDate, dateRange.endDate]);


    const handleExportPDF = () => {
        if (!data) return;
        const columns = ['Descrição', `Valor (${systemCurrency})` || 'Valor'];
        const rows = [
            ['IVA Liquidado (Vendas)', convertAndFormat(data.ivaLiquidado)],
            ['IVA Dedutível (Compras)', convertAndFormat(data.ivaDedutivel)],
            ['IVA a Pagar / (A Recuperar)', convertAndFormat(data.ivaAPagar)]
        ];
        exportToPDF({
            title: 'Apuramento Mensal de IVA (PGC-NIRF)',
            subtitle: `Período: ${dateRange.startDate} a ${dateRange.endDate}`,
            columns: columns.map((col, idx) => ({ header: col, dataKey: idx === 0 ? 'desc' : 'val' })),
            data: rows.map(r => ({ desc: r[0], val: r[1] })),
            filename: `Apuramento_IVA_${dateRange.startDate}_${dateRange.endDate}`,
            currency: systemCurrency
        });
    };

    const handleExportExcel = () => {
        if (!data) return;
        const exportData = [
            { 'Descrição': 'IVA Liquidado (Vendas)', [`Valor (${systemCurrency})`]: data.ivaLiquidado },
            { 'Descrição': 'IVA Dedutível (Compras)', [`Valor (${systemCurrency})`]: data.ivaDedutivel },
            { 'Descrição': 'IVA a Pagar / (A Recuperar)', [`Valor (${systemCurrency})`]: data.ivaAPagar }
        ];
        exportToExcel({
            title: 'Apuramento Mensal de IVA (PGC-NIRF)',
            columns: [
                { header: 'Descrição', dataKey: 'desc' },
                { header: `Valor (${systemCurrency})`, dataKey: 'val' }
            ],
            data: exportData.map(d => ({
                desc: d['Descrição'],
                val: d[`Valor (${systemCurrency})`]
            })),
            filename: `Apuramento_IVA_${dateRange.startDate}_${dateRange.endDate}`,
            currency: systemCurrency
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Calculator className="w-8 h-8 text-primary" />
                        Apuramento de IVA
                    </h1>
                    <p className="text-gray-500 mt-1">Classificação Fiscal Baseada no PGC-NIRF</p>
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center space-x-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        <input
                            type="date"
                            value={dateRange.startDate}
                            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                            className="bg-transparent border-none focus:ring-0 text-sm font-medium"
                        />
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                        <input
                            type="date"
                            value={dateRange.endDate}
                            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                            className="bg-transparent border-none focus:ring-0 text-sm font-medium"
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            ) : data ? (
                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Resumo de IVA</h2>
                                <p className="text-sm text-gray-500">Período Fiscal Selecionado</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleExportPDF}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                                >
                                    <FileText className="w-4 h-4" /> PDF
                                </button>
                                <button
                                    onClick={handleExportExcel}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                                >
                                    <Download className="w-4 h-4" /> Excel
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Liquidado */}
                            <div className="flex items-center justify-between p-4 bg-red-50/50 rounded-xl border border-red-100">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                                        <TrendingUp className="w-6 h-6 text-red-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-medium text-red-900">IVA Liquidado (Vendas)</h3>
                                        <p className="text-xs text-red-600">Conta 2433 - Imposto a entregar ao Estado</p>
                                    </div>
                                </div>
                                <span className="text-xl font-bold text-red-900">{convertAndFormat(data.ivaLiquidado)}</span>
                            </div>

                            {/* Dedutível */}
                            <div className="flex items-center justify-between p-4 bg-green-50/50 rounded-xl border border-green-100">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                                        <TrendingDown className="w-6 h-6 text-green-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-medium text-green-900">IVA Dedutível (Compras)</h3>
                                        <p className="text-xs text-green-600">Conta 2432 - Imposto a recuperar do Estado</p>
                                    </div>
                                </div>
                                <span className="text-xl font-bold text-green-900">{convertAndFormat(data.ivaDedutivel)}</span>
                            </div>

                            <div className="h-px bg-gray-200 w-full my-4"></div>

                            {/* A Pagar */}
                            <div className={`flex items-center justify-between p-6 rounded-xl border ${data.ivaAPagar >= 0 ? 'bg-primary/5 border-primary/20' : 'bg-blue-50 border-blue-200'}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center ${data.ivaAPagar >= 0 ? 'bg-primary/20 text-primary' : 'bg-blue-200 text-blue-700'}`}>
                                        <Percent className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <h3 className={`text-lg font-bold ${data.ivaAPagar >= 0 ? 'text-gray-900' : 'text-blue-900'}`}>
                                            {data.ivaAPagar >= 0 ? 'IVA a Pagar' : 'IVA a Recuperar'}
                                        </h3>
                                        <p className={`text-sm ${data.ivaAPagar >= 0 ? 'text-gray-600' : 'text-blue-700'}`}>
                                            Conta 2436 - Apuramento
                                        </p>
                                    </div>
                                </div>
                                <span className={`text-3xl font-black ${data.ivaAPagar >= 0 ? 'text-primary' : 'text-blue-700'}`}>
                                    {convertAndFormat(Math.abs(data.ivaAPagar))}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-20 text-gray-500">Nenhum dado encontrado para o período.</div>
            )}
        </div>
    );
};

export default ApuramentoIVA;

