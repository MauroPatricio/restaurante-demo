import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

/**
 * Shared utility for exporting accounting reports.
 */

// --- PDF EXPORTS ---

export const exportToPDF = ({ title, subtitle, columns, data, filename, orientation = 'portrait', totals = null, currency = 'USD' }) => {
    const doc = new jsPDF(orientation, 'pt', 'a4');

    // Header
    doc.setFontSize(18);
    doc.text(title, 40, 40);

    if (subtitle) {
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(subtitle, 40, 60);
    }

    doc.autoTable({
        startY: subtitle ? 80 : 60,
        head: [columns.map(c => c.header)],
        body: data.map(row => columns.map(c => row[c.dataKey])),
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: [30, 41, 59] }, // Slate-800
        alternateRowStyles: { fillColor: [248, 250, 252] }, // Slate-50
    });

    // Add totals if provided
    if (totals) {
        const finalY = doc.lastAutoTable.finalY || 80;
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42); // Slate-900
        let yPos = finalY + 20;

        totals.forEach(totalItem => {
            doc.text(`${totalItem.label}: ${totalItem.value} ${currency}`, 40, yPos);
            yPos += 15;
        });
    }

    // Footer with timestamp
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
            `Gerado em: ${new Date().toLocaleString()} | Página ${i} de ${pageCount}`,
            40,
            doc.internal.pageSize.height - 20
        );
    }

    doc.save(`${filename}.pdf`);
};

// --- EXCEL EXPORTS ---

export const exportToExcel = ({ title, columns, data, filename, totals = null, currency = 'USD' }) => {
    // Format data for excel based on columns
    const excelData = data.map(row => {
        const formattedRow = {};
        columns.forEach(col => {
            formattedRow[col.header] = row[col.dataKey];
        });
        return formattedRow;
    });

    if (totals) {
        excelData.push({}); // Empty row
        totals.forEach(t => {
            excelData.push({ [columns[0].header]: t.label, [columns[1].header]: `${t.value} ${currency}` });
        });
    }

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${filename}.xlsx`);
};

// ============================================================
// STAFF ANALYTICS EXPORTS
// ============================================================

/**
 * Export any array of objects to CSV and trigger download
 */
export function exportToCSV(rows, filename = 'export.csv') {
    if (!rows || rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csvContent = [
        headers.join(','),
        ...rows.map(row =>
            headers.map(h => {
                const val = row[h] ?? '';
                const str = String(val).replace(/"/g, '""');
                return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
            }).join(',')
        )
    ].join('\r\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/** Format waiter list for CSV export */
export function formatWaiterReportForExport(waiters, period) {
    return waiters.map((w, i) => ({
        'Rank': i + 1,
        'Nome': w.waiterName,
        'Email': w.waiterEmail || '',
        'Activo': w.active ? 'Sim' : 'Não',
        'Total Pedidos': w.metrics.totalOrders,
        'Total Mesas': w.metrics.totalTables,
        'Total Pratos': w.metrics.totalDishes,
        'Receita Total': w.metrics.totalRevenue,
        'Chamadas Resolvidas': w.metrics.callsResolved,
        'Tempo Médio Serviço (min)': w.metrics.avgServiceTime,
        'Eficiência (%)': w.metrics.efficiency,
        'Período': period
    }));
}

/** Format kitchen dish stats for CSV export */
export function formatKitchenDishReportForExport(dishes, period) {
    return dishes.map(d => ({
        'Prato': d.name,
        'Categoria': d.category,
        'Qtd Preparada': d.totalQuantity,
        'Receita Total': d.totalRevenue,
        'Pedidos': d.orderCount,
        'Tempo Médio Prep (min)': d.avgPrepTime ?? 'N/A',
        'Tempo Mín (min)': d.minPrepTime ?? 'N/A',
        'Tempo Máx (min)': d.maxPrepTime ?? 'N/A',
        'Gargalo': d.isBottleneck ? 'Sim' : 'Não',
        'Período': period
    }));
}

/** Format kitchen shift report for CSV export */
export function formatKitchenShiftReportForExport(shifts) {
    return shifts.map(s => ({
        'Turno': s.label,
        'Total Pedidos': s.totalOrders,
        'Pedidos Concluídos': s.completedOrders,
        'Receita Total': s.totalRevenue,
        'Tempo Médio Prep (min)': s.avgPrepTime,
        'Pedidos Atrasados': s.delayedOrders,
        'Eficiência (%)': s.efficiency
    }));
}

/** Format waiter table history for CSV export */
export function formatWaiterTableHistoryForExport(tables, waiterName) {
    const rows = [];
    for (const table of tables) {
        for (const order of table.orders) {
            rows.push({
                'Garçom': waiterName,
                'Mesa': table.tableNumber,
                'Localização': table.tableLocation || '',
                'Data/Hora': new Date(order.createdAt).toLocaleString('pt-MZ'),
                'Status': order.status,
                'Total': order.total,
                'Pratos': order.dishes.map(d => `${d.qty}x ${d.name}`).join(' | ')
            });
        }
    }
    return rows;
}

