import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { accountingAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
    TrendingUp, TrendingDown, DollarSign,
    Calendar, Download, Activity, FileText
} from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import { exportToPDF, exportToExcel } from '../../utils/ExportUtils';

export default function DRE() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [dreData, setDreData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Dates filters
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        // Default to current month
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        setStartDate(start);
        setEndDate(end);
    }, []);

    useEffect(() => {
        if (startDate && endDate) {
            fetchDRE();
        }
    }, [startDate, endDate]);

    const fetchDRE = async () => {
        try {
            setLoading(true);
            const res = await accountingAPI.getDRE({ startDate, endDate });
            setDreData(res.data);
        } catch (error) {
            console.error('Failed to fetch DRE:', error);
        } finally {
            setLoading(false);
        }
    };

    const currency = user?.restaurant?.settings?.currency || 'MT';
    const formatCurrency = (val) => val.toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + currency;

    const handleExportPDF = () => {
        if (!dreData) return;
        const columns = [
            { header: 'Estrutura da DRE', dataKey: 'description' },
            { header: `Valor (${currency})`, dataKey: 'value' }
        ];

        const data = [
            { description: '1. Receita Bruta de Vendas e Serviços', value: formatCurrency(dreData.totalRevenue) },
            ...dreData.revenues.map(r => ({ description: `   ${r.code} - ${r.name}`, value: formatCurrency(r.movement) })),
            { description: '2. Custos e Despesas Operacionais', value: `- ${formatCurrency(dreData.totalExpenses)}` },
            ...dreData.expenses.map(e => ({ description: `   ${e.code} - ${e.name}`, value: formatCurrency(e.movement) }))
        ];

        exportToPDF({
            title: 'Demonstração de Resultados (DRE)',
            subtitle: `Período: ${startDate} a ${endDate}`,
            columns,
            data,
            totals: [
                { label: dreData.netIncome >= 0 ? 'Lucro Líquido' : 'Prejuízo Líquido', value: Math.abs(dreData.netIncome).toLocaleString('pt-MZ', { minimumFractionDigits: 2 }) }
            ],
            filename: `DRE_${startDate}_${endDate}`,
            currency
        });
    };

    const handleExportExcel = () => {
        if (!dreData) return;
        const columns = [
            { header: 'Estrutura da DRE', dataKey: 'description' },
            { header: `Valor`, dataKey: 'value' }
        ];

        const data = [
            { description: '1. Receita Bruta de Vendas e Serviços', value: dreData.totalRevenue },
            ...dreData.revenues.map(r => ({ description: `${r.code} - ${r.name}`, value: r.movement })),
            { description: '2. Custos e Despesas Operacionais', value: -dreData.totalExpenses },
            ...dreData.expenses.map(e => ({ description: `${e.code} - ${e.name}`, value: -e.movement }))
        ];

        exportToExcel({
            title: 'Demonstração de Resultados (DRE)',
            columns,
            data,
            totals: [
                { label: dreData.netIncome >= 0 ? 'Lucro Líquido' : 'Prejuízo Líquido', value: Math.abs(dreData.netIncome) }
            ],
            filename: `DRE_${startDate}_${endDate}`,
            currency
        });
    };

    return (
        <div style={{ padding: '32px' }}>
            {/* Header */}
            <div style={{ marginBottom: '48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', margin: 0 }}>Demonstração de Resultados</h2>
                    <p style={{ color: '#94a3b8', fontWeight: '700' }}>DRE - Análise de Receitas e Despesas do Exercício</p>
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'white', padding: '4px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <Calendar style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} size={16} />
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                style={{
                                    padding: '8px 12px 8px 36px', borderRadius: '8px', border: 'none',
                                    outline: 'none', fontWeight: '600', color: '#475569', fontSize: '14px', background: 'transparent'
                                }}
                            />
                        </div>
                        <span style={{ color: '#cbd5e1', fontWeight: '800' }}>-</span>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                style={{
                                    padding: '8px 12px 8px 12px', borderRadius: '8px', border: 'none',
                                    outline: 'none', fontWeight: '600', color: '#475569', fontSize: '14px', background: 'transparent'
                                }}
                            />
                        </div>
                    </div>

                    {dreData && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={handleExportPDF}
                                style={{
                                    padding: '10px 16px', borderRadius: '12px', background: 'white', border: '1px solid #e2e8f0',
                                    color: '#475569', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px',
                                    cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }}>
                                <FileText size={16} style={{ color: '#ef4444' }} />
                                PDF
                            </button>
                            <button
                                onClick={handleExportExcel}
                                style={{
                                    padding: '10px 16px', borderRadius: '12px', background: 'white', border: '1px solid #e2e8f0',
                                    color: '#475569', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px',
                                    cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }}>
                                <Download size={16} style={{ color: '#10b981' }} />
                                Excel
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {loading && <div className="py-12"><LoadingSpinner /></div>}

            {!loading && dreData && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                    {/* Top KPI Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                        <div style={{ background: 'white', borderRadius: '24px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                <div>
                                    <p style={{ margin: 0, fontSize: '12px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Receita Bruta (Vendas)</p>
                                    <h3 style={{ margin: '8px 0 0 0', fontSize: '28px', fontWeight: '900', color: '#1e293b' }}>
                                        {formatCurrency(dreData.totalRevenue)}
                                    </h3>
                                </div>
                                <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '16px', color: '#10b981' }}>
                                    <TrendingUp size={24} />
                                </div>
                            </div>
                        </div>

                        <div style={{ background: 'white', borderRadius: '24px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                <div>
                                    <p style={{ margin: 0, fontSize: '12px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Despesas Operacionais</p>
                                    <h3 style={{ margin: '8px 0 0 0', fontSize: '28px', fontWeight: '900', color: '#1e293b' }}>
                                        {formatCurrency(dreData.totalExpenses)}
                                    </h3>
                                </div>
                                <div style={{ background: '#fef2f2', padding: '12px', borderRadius: '16px', color: '#ef4444' }}>
                                    <TrendingDown size={24} />
                                </div>
                            </div>
                        </div>

                        <div style={{ background: dreData.netIncome >= 0 ? '#4f46e5' : '#ef4444', borderRadius: '24px', padding: '24px', boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.3)', color: 'white' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                <div>
                                    <p style={{ margin: 0, fontSize: '12px', fontWeight: '900', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        {dreData.netIncome >= 0 ? 'Lucro Líquido' : 'Prejuízo Líquido'}
                                    </p>
                                    <h3 style={{ margin: '8px 0 0 0', fontSize: '32px', fontWeight: '900' }}>
                                        {formatCurrency(Math.abs(dreData.netIncome))}
                                    </h3>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '12px', borderRadius: '16px' }}>
                                    <Activity size={24} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* DRE Structure Table */}
                    <div style={{ background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead style={{ background: '#1e293b' }}>
                                <tr>
                                    <th style={{ padding: '20px 32px', fontSize: '13px', fontWeight: '800', color: 'white', textTransform: 'uppercase' }}>Estrutura da DRE</th>
                                    <th style={{ padding: '20px 32px', fontSize: '13px', fontWeight: '800', color: 'white', textTransform: 'uppercase', textAlign: 'right', width: '250px' }}>Valor ({currency})</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* 1. Receitas */}
                                <tr style={{ background: '#f8fafc' }}>
                                    <td style={{ padding: '16px 32px', fontSize: '16px', fontWeight: '900', color: '#0f172a' }}>1. Receita Bruta de Vendas e Serviços</td>
                                    <td style={{ padding: '16px 32px', fontSize: '16px', fontWeight: '900', color: '#10b981', textAlign: 'right' }}>{formatCurrency(dreData.totalRevenue)}</td>
                                </tr>
                                {dreData.revenues.map(rev => (
                                    <tr key={rev._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '12px 32px 12px 56px', fontSize: '14px', fontWeight: '600', color: '#475569' }}>
                                            {rev.code} - {rev.name}
                                        </td>
                                        <td style={{ padding: '12px 32px', fontSize: '14px', fontWeight: '700', color: '#1e293b', textAlign: 'right' }}>
                                            {formatCurrency(rev.movement)}
                                        </td>
                                    </tr>
                                ))}

                                {/* Padding row */}
                                <tr><td colSpan="2" style={{ padding: '8px' }}></td></tr>

                                {/* 2. Despesas */}
                                <tr style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '16px 32px', fontSize: '16px', fontWeight: '900', color: '#0f172a' }}>2. Custos e Despesas Operacionais</td>
                                    <td style={{ padding: '16px 32px', fontSize: '16px', fontWeight: '900', color: '#ef4444', textAlign: 'right' }}>- {formatCurrency(dreData.totalExpenses)}</td>
                                </tr>
                                {dreData.expenses.map(exp => (
                                    <tr key={exp._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '12px 32px 12px 56px', fontSize: '14px', fontWeight: '600', color: '#475569' }}>
                                            {exp.code} - {exp.name}
                                        </td>
                                        <td style={{ padding: '12px 32px', fontSize: '14px', fontWeight: '700', color: '#1e293b', textAlign: 'right' }}>
                                            {formatCurrency(exp.movement)}
                                        </td>
                                    </tr>
                                ))}

                                {/* Padding row */}
                                <tr><td colSpan="2" style={{ padding: '8px' }}></td></tr>

                                {/* 3. Resultado Líquido */}
                                <tr style={{ background: dreData.netIncome >= 0 ? '#e0e7ff' : '#fee2e2', borderTop: '2px solid #cbd5e1' }}>
                                    <td style={{ padding: '24px 32px', fontSize: '20px', fontWeight: '900', color: dreData.netIncome >= 0 ? '#4338ca' : '#b91c1c', textTransform: 'uppercase' }}>
                                        3. Resultado Líquido do Exercício
                                    </td>
                                    <td style={{ padding: '24px 32px', fontSize: '24px', fontWeight: '900', color: dreData.netIncome >= 0 ? '#4338ca' : '#b91c1c', textAlign: 'right' }}>
                                        {formatCurrency(Math.abs(dreData.netIncome))}
                                        {dreData.netIncome < 0 && ' (Prejuízo)'}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
