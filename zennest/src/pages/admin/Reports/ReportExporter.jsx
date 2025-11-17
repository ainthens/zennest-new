// src/pages/admin/Reports/ReportExporter.jsx
import { FaFilePdf, FaPrint } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { generatePDFReport, printReport } from '../lib/reportUtils';

const ReportExporter = ({ type, title, columns, rows, meta = {}, showToast }) => {
  const handleExportPDF = () => {
    try {
      if (rows.length > 5000) {
        showToast('Warning: Large dataset. Exporting may take time. Consider using date filters.', 'error');
        return;
      }

      generatePDFReport({
        type,
        title,
        rows,
        columns,
        meta
      });

      showToast('PDF report generated successfully');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      showToast('Failed to generate PDF report', 'error');
    }
  };

  const handlePrint = () => {
    try {
      const headers = `<tr>${columns.map(col => `<th>${col.label}</th>`).join('')}</tr>`;
      const bodyRows = rows.map(row => {
        const cells = columns.map(col => {
          const value = row[col.key] ?? '';
          return `<td>${value}</td>`;
        }).join('');
        return `<tr>${cells}</tr>`;
      }).join('');

      const htmlContent = `<table><thead>${headers}</thead><tbody>${bodyRows}</tbody></table>`;

      printReport({
        title,
        htmlContent
      });
    } catch (error) {
      console.error('Error printing report:', error);
      showToast('Failed to print report', 'error');
    }
  };

  return (
    <div className="flex gap-2">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleExportPDF}
        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold text-sm flex items-center gap-2"
      >
        <FaFilePdf />
        Export PDF
      </motion.button>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handlePrint}
        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-sm flex items-center gap-2"
      >
        <FaPrint />
        Print
      </motion.button>
    </div>
  );
};

export default ReportExporter;

