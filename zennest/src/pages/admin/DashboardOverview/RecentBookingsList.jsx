// src/pages/admin/DashboardOverview/RecentBookingsList.jsx
import { useState, useMemo } from 'react';
import SectionHeader from '../components/SectionHeader';
import { FaCalendarAlt, FaFilePdf, FaPrint } from 'react-icons/fa';
import { generatePDFReport, printReport } from '../lib/reportUtils';
import { motion } from 'framer-motion';
import { parseDate } from '../../../utils/dateUtils';

const RecentBookingsList = ({ bookings, showToast }) => {
  const [statusFilter, setStatusFilter] = useState('all');

  // NEW: Date range filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Helper: robust date parser that falls back to multiple formats
  const toDate = (value) => {
    if (!value) return null;

    // If it's already a Date
    if (value instanceof Date && !isNaN(value)) return value;

    // Try user's parseDate utility first
    try {
      const parsed = parseDate(value);
      if (parsed instanceof Date && !isNaN(parsed)) return parsed;
    } catch (e) {
      // ignore and try next
    }

    // Try ISO / standard parsing
    const d1 = new Date(value);
    if (!isNaN(d1)) return d1;

    // Try dd/mm/yyyy (common localized format shown in screenshot)
    const ddmmyyyy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
    const m = String(value).trim().match(ddmmyyyy);
    if (m) {
      const day = parseInt(m[1], 10);
      const month = parseInt(m[2], 10) - 1;
      const year = parseInt(m[3], 10);
      const d2 = new Date(year, month, day);
      if (!isNaN(d2)) return d2;
    }

    return null;
  };

  // Normalize to start of day (00:00:00) or end of day (23:59:59)
  const startOfDay = (d) => {
    const dt = new Date(d);
    dt.setHours(0, 0, 0, 0);
    return dt;
  };
  const endOfDay = (d) => {
    const dt = new Date(d);
    dt.setHours(23, 59, 59, 999);
    return dt;
  };

  // Format dates for display
  const formatDate = (date) => {
    if (!date) return 'N/A';
    const dateObj = toDate(date);
    if (!dateObj) return 'N/A';
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Check if booking is upcoming
  const isUpcoming = (booking) => {
    if (!booking?.checkIn) return false;
    const checkInDate = toDate(booking.checkIn);
    if (!checkInDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkInOnly = new Date(checkInDate.getFullYear(), checkInDate.getMonth(), checkInDate.getDate());
    return checkInOnly > today && (booking.status === 'confirmed' || booking.status === 'pending' || booking.status === 'pending_approval');
  };

  // MAIN FILTERING LOGIC (Status + Date Range) — now uses overlap logic
  const filteredBookings = useMemo(() => {
    let filtered = Array.isArray(bookings) ? [...bookings] : [];

    // --- Status Filter ---
    if (statusFilter !== 'all') {
      if (statusFilter === 'upcoming') {
        filtered = filtered.filter(booking => isUpcoming(booking));
      } else {
        filtered = filtered.filter(booking => booking?.status === statusFilter);
      }
    }

    // --- Date Range Filter ---
    if (startDate || endDate) {
      const start = startDate ? startOfDay(toDate(startDate)) : null;
      const end = endDate ? endOfDay(toDate(endDate)) : null;

      filtered = filtered.filter((booking) => {
        const rawCheckIn = booking?.checkIn;
        const rawCheckOut = booking?.checkOut;

        const checkIn = rawCheckIn ? startOfDay(toDate(rawCheckIn)) : null;
        const checkOut = rawCheckOut ? endOfDay(toDate(rawCheckOut)) : null;

        // If we can't parse check-in at all, exclude it
        if (!checkIn) return false;

        // If only start specified: include when booking.checkIn >= start OR booking.checkOut >= start (booking starts after or ends after)
        if (start && !end) {
          // booking that starts on or after start OR booking that is ongoing and ends after start
          return checkIn >= start || (checkOut && checkOut >= start);
        }

        // If only end specified: include when booking.checkIn <= end (booking starts on or before end)
        if (!start && end) {
          return checkIn <= end;
        }

        // If both start and end specified: include bookings that overlap the [start, end] range
        if (start && end) {
          // Overlap condition: booking.start <= rangeEnd && booking.end >= rangeStart
          // If booking has no checkOut, treat it as same-day booking (use checkIn)
          const bookingEnd = checkOut || checkIn;
          return (checkIn <= end) && (bookingEnd >= start);
        }

        // default include
        return true;
      });
    }

    // --- Sort (Newest First) ---
    return filtered.sort((a, b) => {
      const dateA = toDate(a.createdAt || a.checkIn);
      const dateB = toDate(b.createdAt || b.checkIn);
      if (!dateA || !dateB) return 0;
      return dateB.getTime() - dateA.getTime();
    });
  }, [bookings, statusFilter, startDate, endDate]); // re-run when these change

  // Export PDF
  const handleExportPDF = () => {
    try {
      const filterLabel =
        statusFilter === 'all' ? 'All Bookings' :
        statusFilter === 'completed' ? 'Completed Bookings' :
        statusFilter === 'cancelled' ? 'Cancelled Bookings' :
        statusFilter === 'pending' ? 'Pending Bookings' :
        statusFilter === 'upcoming' ? 'Upcoming Bookings' :
        `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Bookings`;

      const columns = [
        { key: 'bookingId', label: 'Booking ID', width: 1.2 },
        { key: 'guestName', label: 'Guest', width: 2 },
        { key: 'listingTitle', label: 'Listing', width: 2 },
        { key: 'checkIn', label: 'Check-in', width: 1.3 },
        { key: 'checkOut', label: 'Check-out', width: 1.3 },
        { key: 'status', label: 'Status', width: 1.2 },
        { key: 'total', label: 'Total', width: 1.2 }
      ];

      const rows = filteredBookings.map(b => {
        const guestName = b.guestName || b.guestEmail || 'Guest';
        const guestEmail = b.guestEmail ? `\n${b.guestEmail}` : '';
        return {
          bookingId: b.id?.substring(0, 8) || 'N/A',
          guestName: `${guestName}${guestEmail}`,
          listingTitle: b.listingTitle || 'Unknown',
          checkIn: formatDate(b.checkIn),
          checkOut: formatDate(b.checkOut),
          status: b.status ? b.status.charAt(0).toUpperCase() + b.status.slice(1).replace('_', ' ') : 'N/A',
          total: `₱${(b.total || b.totalAmount || 0).toLocaleString()}`
        };
      });

      generatePDFReport({
        type: 'admin-recent-bookings',
        title: filterLabel,
        rows,
        columns,
        meta: {
          generatedBy: 'Admin Dashboard',
          filter: filterLabel,
          totalRecords: filteredBookings.length
        }
      });

      showToast('PDF report generated successfully');
    } catch (error) {
      console.error('Error exporting bookings PDF:', error);
      showToast('Failed to generate PDF report', 'error');
    }
  };

  // Print Logic
  const handlePrint = () => {
    try {
      const filterLabel =
        statusFilter === 'all' ? 'All Bookings' :
        statusFilter === 'completed' ? 'Completed Bookings' :
        statusFilter === 'cancelled' ? 'Cancelled Bookings' :
        statusFilter === 'pending' ? 'Pending Bookings' :
        statusFilter === 'upcoming' ? 'Upcoming Bookings' :
        `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Bookings`;

      const htmlContent = `
        <div style="margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 24px; font-weight: bold;">${filterLabel}</h2>
          <p style="margin: 5px 0; color: #666;">Total Records: ${filteredBookings.length}</p>
          <p style="margin: 5px 0; color: #666;">Generated: ${new Date().toLocaleString()}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Booking ID</th>
              <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Guest</th>
              <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Listing</th>
              <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Check-in</th>
              <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Check-out</th>
              <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Status</th>
              <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${filteredBookings.map(b => {
              const guestName = b.guestName || b.guestEmail || 'Guest';
              const guestEmail = b.guestEmail ? `<br><small style="color: #666;">${b.guestEmail}</small>` : '';
              return `
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd;">${b.id?.substring(0, 8) || 'N/A'}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">
                  ${guestName}${guestEmail}
                </td>
                <td style="padding: 10px; border: 1px solid #ddd;">${b.listingTitle || 'Unknown'}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${formatDate(b.checkIn)}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${formatDate(b.checkOut)}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${b.status || 'N/A'}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">₱${(b.total || b.totalAmount || 0).toLocaleString()}</td>
              </tr>
            `;
            }).join('')}
          </tbody>
        </table>
      `;

      printReport({
        title: filterLabel,
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

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">

          {/* Status Filter */}
          <div className="flex-1 min-w-full sm:min-w-[200px]">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Filter by Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-600"
            >
              <option value="all">All Bookings</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="pending">Pending</option>
              <option value="upcoming">Upcoming</option>
              <option value="confirmed">Confirmed</option>
              <option value="active">Active</option>
            </select>
          </div>
        </div>

        {/* NEW: Date Range Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mt-3">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Start Date (Check-in)</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-600"
            />
          </div>

          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-700 mb-1">End Date (Check-out)</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-600"
            />
          </div>
        </div>

      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600">Booking ID</th>
              <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600">Guest</th>
              <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600 hidden md:table-cell">Listing</th>
              <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600">Check-in</th>
              <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600 hidden lg:table-cell">Check-out</th>
              <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600">Status</th>
              <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredBookings.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-3 sm:px-6 py-6 sm:py-8 text-center text-gray-500 text-xs sm:text-sm">
                  No bookings found
                  {statusFilter !== 'all' ? ` with status "${statusFilter}"` : ''}
                  {(startDate || endDate) ? ' in selected date range' : ''}
                </td>
              </tr>
            ) : (
              filteredBookings.slice(0, 20).map((booking) => {
                const guestName = booking.guestName || booking.guestEmail || 'Guest';
                return (
                  <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium text-gray-900">
                      {booking.id?.substring(0, 8) || 'N/A'}
                    </td>

                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm">
                      <div>
                        <div className="font-medium text-gray-900">{guestName}</div>
                        {booking.guestEmail && (
                          <div className="text-[10px] text-gray-500">{booking.guestEmail}</div>
                        )}
                      </div>
                    </td>

                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600 hidden md:table-cell">
                      {booking.listingTitle || 'Unknown'}
                    </td>

                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600">
                      {formatDate(booking.checkIn)}
                    </td>

                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600 hidden lg:table-cell">
                      {formatDate(booking.checkOut)}
                    </td>

                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm">
                      <span
                        className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${
                          booking.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : booking.status === 'confirmed'
                            ? 'bg-blue-100 text-blue-800'
                            : booking.status === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : booking.status === 'pending' || booking.status === 'pending_approval'
                            ? 'bg-yellow-100 text-yellow-800'
                            : booking.status === 'active'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {booking.status
                          ? booking.status.charAt(0).toUpperCase() +
                            booking.status.slice(1).replace('_', ' ')
                          : 'N/A'}
                      </span>
                    </td>

                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-emerald-700">
                      ₱{(booking.total || booking.totalAmount || 0).toLocaleString()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecentBookingsList;
