// src/pages/admin/DashboardOverview/SuggestionsList.jsx
import { useState } from 'react';
import SectionHeader from '../components/SectionHeader';
import { FaInfoCircle, FaFilePdf, FaPrint } from 'react-icons/fa';
import { generatePDFReport, printReport } from '../lib/reportUtils';
import { motion } from 'framer-motion';

const SuggestionsList = ({ suggestions, showToast }) => {
  const handleExportPDF = () => {
    try {
      const columns = [
        { key: 'guestName', label: 'Guest', width: 2 },
        { key: 'listingTitle', label: 'Listing', width: 2 },
        { key: 'suggestion', label: 'Suggestion', width: 4 },
        { key: 'createdAt', label: 'Date', width: 2 }
      ];

      const rows = suggestions.map(s => ({
        guestName: s.guestName || 'Guest',
        listingTitle: s.listingTitle || 'Unknown',
        suggestion: s.suggestion || '',
        createdAt: s.createdAt ? new Date(s.createdAt).toLocaleDateString() : 'N/A'
      }));

      generatePDFReport({
        type: 'suggestions',
        title: 'Guest Suggestions Report',
        rows,
        columns,
        meta: {
          generatedBy: 'Admin Dashboard'
        }
      });

      showToast('PDF report generated successfully');
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
            onClick={handleExportPDF}
            className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold text-xs sm:text-sm flex items-center justify-center gap-2"
          >
            <FaFilePdf className="text-xs sm:text-sm" />
            <span className="hidden sm:inline">Export PDF</span>
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
    </div>
  );
};

export default SuggestionsList;

