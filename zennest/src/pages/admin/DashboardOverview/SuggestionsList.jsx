// src/pages/admin/DashboardOverview/SuggestionsList.jsx
import { useState } from 'react';
import SectionHeader from '../components/SectionHeader';
import { FaInfoCircle, FaFilePdf, FaPrint } from 'react-icons/fa';
import { generatePDFReport, printReport } from '../lib/reportUtils';
import { motion } from 'framer-motion';
import ReportDateRangeModal from '../../../components/modals/ReportDateRangeModal';

const SuggestionsList = ({ suggestions, showToast }) => {
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportRange, setReportRange] = useState({
    startDate: null,
    endDate: null,
    enabled: false
  });

  const handleExportPDF = (range = null) => {
    try {
      // Helper function to normalize dates
      const normalizeDateForFilter = (date) => {
        if (!date) return null;
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d;
      };

      // Helper function to check if suggestion createdAt falls within report date range
      const isWithinReportDateRange = (suggestion) => {
        if (!range || !range.enabled) return true;
        if (!range.startDate && !range.endDate) return true;

        const createdAt = suggestion.createdAt ? new Date(suggestion.createdAt) : null;
        if (!createdAt) return false;

        const itemDate = normalizeDateForFilter(createdAt);
        const startDate = range.startDate ? normalizeDateForFilter(range.startDate) : null;
        const endDate = range.endDate ? normalizeDateForFilter(range.endDate) : null;

        if (startDate && !endDate) {
          return itemDate >= startDate;
        }

        if (!startDate && endDate) {
          return itemDate <= endDate;
        }

        if (startDate && endDate) {
          return itemDate >= startDate && itemDate <= endDate;
        }

        return true;
      };

      // Filter suggestions based on report date range if enabled
      let dataToExport = [...suggestions];
      if (range && range.enabled) {
        dataToExport = suggestions.filter(suggestion => isWithinReportDateRange(suggestion));
      }

      // Build date range label for report
      let reportDateRangeLabel = '';
      if (range && range.enabled && (range.startDate || range.endDate)) {
        const formatDate = (date) => {
          if (!date) return 'Any';
          const d = new Date(date);
          return d.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          });
        };
        const startLabel = range.startDate ? formatDate(range.startDate) : 'Any';
        const endLabel = range.endDate ? formatDate(range.endDate) : 'Any';
        reportDateRangeLabel = ` (${startLabel} to ${endLabel})`;
      }

      const columns = [
        { key: 'guestName', label: 'Guest', width: 2 },
        { key: 'listingTitle', label: 'Listing', width: 2 },
        { key: 'suggestion', label: 'Suggestion', width: 4 },
        { key: 'createdAt', label: 'Date', width: 2 }
      ];

      const rows = dataToExport.map(s => ({
        guestName: s.guestName || 'Guest',
        listingTitle: s.listingTitle || 'Unknown',
        suggestion: s.suggestion || '',
        createdAt: s.createdAt ? new Date(s.createdAt).toLocaleDateString() : 'N/A'
      }));

      generatePDFReport({
        type: 'suggestions',
        title: `Guest Suggestions Report${reportDateRangeLabel}`,
        rows,
        columns,
        meta: {
          generatedBy: 'Admin Dashboard',
          dateRange: reportDateRangeLabel,
          totalRecords: dataToExport.length
        }
      });

      showToast(`PDF report generated successfully (${dataToExport.length} ${dataToExport.length !== 1 ? 'records' : 'record'})`);
    } catch (error) {
      console.error('Error exporting suggestions PDF:', error);
      showToast('Failed to generate PDF report', 'error');
    }
  };

  const handlePrint = () => {
    try {
      const htmlContent = `
        <table>
          <thead>
            <tr>
              <th>Guest</th>
              <th>Listing</th>
              <th>Suggestion</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${suggestions.map(s => `
              <tr>
                <td>${s.guestName || 'Guest'}</td>
                <td>${s.listingTitle || 'Unknown'}</td>
                <td>${s.suggestion || ''}</td>
                <td>${s.createdAt ? new Date(s.createdAt).toLocaleDateString() : 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;

      printReport({
        title: 'Guest Suggestions Report',
        htmlContent
      });
    } catch (error) {
      console.error('Error printing suggestions:', error);
      showToast('Failed to print report', 'error');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
      <div className="p-4 sm:p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <SectionHeader icon={FaInfoCircle} title="Guest Suggestions & Feedback" />
        <div className="flex gap-2 flex-wrap">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowReportModal(true)}
            className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold text-xs sm:text-sm flex items-center justify-center gap-2"
          >
            <FaFilePdf className="text-xs sm:text-sm" />
            <span className="hidden sm:inline">Generate PDF Report</span>
            <span className="sm:hidden">PDF</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handlePrint}
            className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-xs sm:text-sm flex items-center justify-center gap-2"
          >
            <FaPrint className="text-xs sm:text-sm" />
            <span className="hidden sm:inline">Print</span>
            <span className="sm:hidden">Print</span>
          </motion.button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600">Listing</th>
              <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600 hidden md:table-cell">Guest</th>
              <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600">Suggestion/Feedback</th>
              <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600 hidden lg:table-cell">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {suggestions.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-3 sm:px-6 py-6 sm:py-8 text-center text-gray-500 text-xs sm:text-sm">
                  No suggestions available
                </td>
              </tr>
            ) : (
              suggestions.map((sug) => (
                <tr key={sug.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium text-gray-900">{sug.listingTitle}</td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-700 hidden md:table-cell">{sug.guestName || 'Guest'}</td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600">
                    <div className="max-w-xs sm:max-w-md truncate">{sug.suggestion || 'No suggestion'}</div>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600 hidden lg:table-cell">
                    {sug.createdAt ? new Date(sug.createdAt).toLocaleString() : 'N/A'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Report Date Range Modal */}
      <ReportDateRangeModal
        isOpen={showReportModal}
        initialRange={reportRange}
        onClose={() => setShowReportModal(false)}
        onGenerate={(range) => {
          // Validate date range if enabled
          if (range.enabled && range.startDate && range.endDate) {
            const start = new Date(range.startDate);
            const end = new Date(range.endDate);
            start.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);
            
            if (start > end) {
              showToast('End date cannot be before start date', 'error');
              return;
            }
          }
          
          setReportRange(range);
          handleExportPDF(range);
          setShowReportModal(false);
        }}
      />
    </div>
  );
};

export default SuggestionsList;

