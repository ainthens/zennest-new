// src/pages/admin/DashboardOverview/RecentBookingsList.jsx
import { useState, useEffect, useMemo } from 'react';
import SectionHeader from '../components/SectionHeader';
import { FaCalendarAlt, FaFilePdf, FaPrint } from 'react-icons/fa';
import { generatePDFReport, printReport } from '../lib/reportUtils';
import { motion } from 'framer-motion';
import { parseDate } from '../../../utils/dateUtils';

const RecentBookingsList = ({ bookings, showToast }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [datePreset, setDatePreset] = useState('all');

  // Apply date presets
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (datePreset) {
      case 'today':
        setStartDate(today.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
        break;
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        setStartDate(yesterday.toISOString().split('T')[0]);
        setEndDate(yesterday.toISOString().split('T')[0]);
        break;
      case 'thisWeek':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        setStartDate(weekStart.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
        break;
      case 'thisMonth':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        setStartDate(monthStart.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
        break;
      default:
        setStartDate('');
        setEndDate('');
    }
  }, [datePreset]);

  // Filter bookings by date range
  const filteredBookings = useMemo(() => {
    if (!startDate && !endDate) return bookings;

    return bookings.filter(booking => {
      const bookingDate = parseDate(booking.createdAt);
      if (!bookingDate) return false;

      const bookingDateOnly = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate());
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      if (start && bookingDateOnly < start) return false;
      if (end) {
        const endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        endDateOnly.setHours(23, 59, 59, 999);
        if (bookingDateOnly > endDateOnly) return false;
      }
      return true;
    });
  }, [bookings, startDate, endDate]);

  const handleExportPDF = () => {
    try {
      const columns = [
        { key: 'date', label: 'Date', width: 1 },
        { key: 'status', label: 'Status', width: 1 },
        { key: 'total', label: 'Total', width: 1 },
        { key: 'listingTitle', label: 'Listing', width: 2 }
      ];

      const rows = filteredBookings.map(b => ({
        date: b.createdAt ? parseDate(b.createdAt)?.toLocaleDateString() : 'N/A',
        status: b.status || 'N/A',
        total: `₱${(b.total || 0).toLocaleString()}`,
        listingTitle: b.listingTitle || 'Unknown'
      }));

      generatePDFReport({
        type: 'recent-bookings',
        title: 'Recent Bookings Report',
        rows,
        columns,
        meta: {
          dateFrom: startDate,
          dateTo: endDate,
          generatedBy: 'Admin Dashboard'
        }
      });

      showToast('PDF report generated successfully');
    } catch (error) {
      console.error('Error exporting bookings PDF:', error);
      showToast('Failed to generate PDF report', 'error');
    }
  };

  const handlePrint = () => {
    try {
      const htmlContent = `
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Status</th>
              <th>Total</th>
              <th>Listing</th>
            </tr>
          </thead>
          <tbody>
            ${filteredBookings.map(b => `
              <tr>
                <td>${b.createdAt ? parseDate(b.createdAt)?.toLocaleDateString() : 'N/A'}</td>
                <td>${b.status || 'N/A'}</td>
                <td>₱${(b.total || 0).toLocaleString()}</td>
                <td>${b.listingTitle || 'Unknown'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;

      printReport({
        title: 'Recent Bookings Report',
        htmlContent
      });
    } catch (error) {
      console.error('Error printing bookings:', error);
      showToast('Failed to print report', 'error');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <SectionHeader icon={FaCalendarAlt} title="Recent Bookings" />
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

        {/* Date Filters */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-end">
          <div className="flex-1 min-w-full sm:min-w-[120px]">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Quick Presets</label>
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-600"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="thisWeek">This Week</option>
              <option value="thisMonth">This Month</option>
            </select>
          </div>
          <div className="flex-1 min-w-full sm:min-w-[120px]">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDatePreset('custom');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-600"
            />
          </div>
          <div className="flex-1 min-w-full sm:min-w-[120px]">
            <label className="block text-xs font-semibold text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDatePreset('custom');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-600"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600">Date</th>
              <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600">Status</th>
              <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600">Total</th>
              <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600 hidden md:table-cell">Listing</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredBookings.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-3 sm:px-6 py-6 sm:py-8 text-center text-gray-500 text-xs sm:text-sm">
                  No bookings found for selected date range
                </td>
              </tr>
            ) : (
              filteredBookings.slice(0, 20).map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600">
                    {booking.createdAt ? parseDate(booking.createdAt)?.toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm">
                    <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${
                      booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                      booking.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                      booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {booking.status || 'N/A'}
                    </span>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-gray-900">
                    ₱{(booking.total || 0).toLocaleString()}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600 hidden md:table-cell">{booking.listingTitle || 'Unknown'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecentBookingsList;

