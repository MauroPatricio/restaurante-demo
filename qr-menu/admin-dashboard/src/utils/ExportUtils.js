import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

/**
 * Shared utility for exporting accounting reports.
 */

// --- PDF EXPORTS ---

export const exportToPDF = ({ title, subtitle, columns, data, filename, orientation = 'portrait', totals = null, currency = 'MT' }) => {
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

export const exportToExcel = ({ title, columns, data, filename, totals = null, currency = 'MT' }) => {
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
