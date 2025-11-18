// src/pages/admin/Reservations/ReservationsList.jsx
import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import SectionHeader from '../components/SectionHeader';
import { FaBook, FaFilePdf, FaPrint, FaChevronLeft, FaChevronRight, FaFilter, FaSync, FaCalendarAlt } from 'react-icons/fa';
import { useReservationsPagination } from './useReservationsPagination';
import ReservationRow from './ReservationRow';
import { generatePDFReport, printReport } from '../lib/reportUtils';
import { parseDate } from '../../../utils/dateUtils';
import ReportDateRangeModal from '../../../components/modals/ReportDateRangeModal';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const ReservationsList = ({ showToast }) => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [calendarDateRange, setCalendarDateRange] = useState([null, null]);
  const [localLoading, setLocalLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportRange, setReportRange] = useState({
    startDate: null,
    endDate: null,
    enabled: false
  });
  
  const {
    bookings,
    page,
    hasMore,
    loading,
    error,
    fetchNext,
    fetchPrevious,
    reset
  } = useReservationsPagination({ pageSize: 10 });

  useEffect(() => {
    reset();
  }, [reset]);

  // Effect to handle date range changes and fetch data
  useEffect(() => {
    // Validate dates if both are provided
    if (dateRange.startDate && dateRange.endDate) {
      const start = parseDate(dateRange.startDate);
      const end = parseDate(dateRange.endDate);
      
      if (start && end && start > end) {
        showToast('End date cannot be before start date', 'error');
        return;
      }
    }

    // Trigger reset to fetch data when date range changes (either date)
    // The filtering happens client-side in filteredBookings
    if (dateRange.startDate || dateRange.endDate) {
      setLocalLoading(true);
      reset().finally(() => {
        setLocalLoading(false);
      });
    }
  }, [dateRange.startDate, dateRange.endDate, reset, showToast]);

  // Helper function to format dates
  // Uses parseDate utility to handle Firestore Timestamps, Date objects, and date strings
  const formatDate = (dateValue) => {
    if (!dateValue) return 'N/A';
    const dateObj = parseDate(dateValue);
    if (!dateObj || isNaN(dateObj.getTime())) return 'N/A';
    return dateObj.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Helper function to normalize dates (remove time component)
  // Properly handles Firestore Timestamps, Date objects, and date strings
  const normalizeDate = (dateValue) => {
    if (!dateValue) return null;
    
    // Use parseDate utility to handle Firestore Timestamps, Date objects, ISO strings, etc.
    const parsed = parseDate(dateValue);
    if (!parsed) return null;
    
    // Normalize to start of day (midnight) for accurate date-only comparisons
    // This avoids timezone issues when comparing dates
    const year = parsed.getFullYear();
    const month = parsed.getMonth();
    const day = parsed.getDate();
    return new Date(year, month, day, 0, 0, 0, 0);
  };

  // Helper function to normalize end dates to end of day (23:59:59)
  const normalizeEndDate = (dateValue) => {
    if (!dateValue) return null;
    
    const parsed = parseDate(dateValue);
    if (!parsed) return null;
    
    // Normalize to end of day for inclusive end date comparisons
    const year = parsed.getFullYear();
    const month = parsed.getMonth();
    const day = parsed.getDate();
    return new Date(year, month, day, 23, 59, 59, 999);
  };

  // Helper function to check if booking falls within date range
  const isWithinDateRange = (booking) => {
    if (!dateRange.startDate && !dateRange.endDate) return true;
    
    // Parse booking dates using the parseDate utility
    const checkIn = booking.checkIn ? normalizeDate(booking.checkIn) : null;
    const checkOut = booking.checkOut ? normalizeEndDate(booking.checkOut) : null;
    
    if (!checkIn) return false;

    // Parse filter dates
    const startDate = dateRange.startDate ? normalizeDate(dateRange.startDate) : null;
    const endDate = dateRange.endDate ? normalizeEndDate(dateRange.endDate) : null;

    // Case 1: Only start date provided - show bookings with check-in on or after start date
    if (startDate && !endDate) {
      return checkIn >= startDate;
    }

    // Case 2: Only end date provided - show bookings that start on or before end date
    // (bookings that have started by the end date)
    if (!startDate && endDate) {
      // Booking starts on or before the end date
      return checkIn <= endDate;
    }

    // Case 3: Both dates provided - show bookings that overlap with the date range
    if (startDate && endDate) {
      const bookingEndDate = checkOut || checkIn;
      
      // Check if booking overlaps with the date range
      // Booking overlaps if:
      // - Check-in is within the range [startDate, endDate] OR
      // - Check-out is within the range [startDate, endDate] OR  
      // - Booking spans the entire range (check-in <= startDate AND bookingEndDate >= endDate)
      // Overlap logic: booking starts before range ends AND booking ends after range starts
      return (
        checkIn <= endDate && bookingEndDate >= startDate
      );
    }

    return true;
  };

  // Helper function to determine payment status
  // Simplified to match the 3 main statuses: completed, pending (for upcoming), cancelled
  const getPaymentStatus = (booking) => {
    // If booking is cancelled or refunded, payment status is also cancelled
    if (booking.status === 'cancelled' || booking.status === 'refunded') {
      return 'cancelled';
    }
    
    // Check if booking is upcoming (check-in date is in the future)
    // If upcoming, payment status should always be pending, even if payment was processed
    if (booking.checkIn) {
      const checkInDate = parseDate(booking.checkIn);
      const now = new Date();
      if (checkInDate && now < checkInDate) {
        return 'pending'; // Always pending for upcoming bookings
      }
    }
    
    // Payment is "completed" if paymentStatus is 'completed' or paidAmount exists
    if (booking.paymentStatus === 'completed' || booking.paidAmount !== undefined) {
      return 'completed';
    }
    
    // For all other cases (pending, scheduled), payment is pending
    return 'pending';
  };

  // Helper function to determine booking status
  // Simplified to 3 statuses: completed, upcoming, cancelled
  const getBookingStatus = (booking) => {
    // First check: If booking is cancelled or refunded, status is cancelled
    if (booking.status === 'cancelled' || booking.status === 'refunded') {
      return 'cancelled';
    }
    
    // Get payment status
    const paymentStatus = getPaymentStatus(booking);
    
    // Handle bookings without dates (services/experiences)
    if (!booking.checkIn || !booking.checkOut) {
      // For services without dates, check payment status
      if (paymentStatus === 'completed') {
        return 'completed';
      } else if (paymentStatus === 'cancelled') {
        return 'cancelled';
      } else {
        return 'upcoming'; // Pending payment = upcoming
      }
    }
    
    const now = new Date();
    const checkIn = parseDate(booking.checkIn);
    const checkOut = parseDate(booking.checkOut);
    
    if (!checkIn || !checkOut) {
      // Invalid dates - use payment status to determine
      if (paymentStatus === 'completed') {
        return 'completed';
      } else if (paymentStatus === 'cancelled') {
        return 'cancelled';
      } else {
        return 'upcoming';
      }
    }

    // Determine status based on dates and payment
    if (now < checkIn) {
      // Check-in is in the future = upcoming (payment should be pending)
      return 'upcoming';
    } else if (now >= checkIn && now <= checkOut) {
      // Currently between check-in and check-out
      // If payment completed = completed, otherwise upcoming (pending payment)
      return paymentStatus === 'completed' ? 'completed' : 'upcoming';
    } else {
      // Check-out has passed
      // Only completed if payment is also completed
      return paymentStatus === 'completed' ? 'completed' : 'upcoming';
    }
  };

  // Filter bookings based on selected status and date range
  // Only filters by: completed, upcoming, cancelled
  const filteredBookings = useMemo(() => {
    let filtered = [...bookings];

    // Filter by status (only 3 statuses: completed, upcoming, cancelled)
    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => {
        const bookingStatus = getBookingStatus(booking);
        return bookingStatus === statusFilter;
      });
    }

    // Filter by date range
    if (dateRange.startDate || dateRange.endDate) {
      filtered = filtered.filter(booking => isWithinDateRange(booking));
    }

    return filtered;
  }, [bookings, statusFilter, dateRange]);

  const handleExportPDF = (range = null) => {
    try {
      // Helper function to normalize dates (remove time component)
      const normalizeDateForFilter = (date) => {
        if (!date) return null;
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d;
      };

      // Helper function to check if booking createdAt falls within report date range
      const isWithinReportDateRange = (booking) => {
        if (!range || !range.enabled) return true;
        if (!range.startDate && !range.endDate) return true;

        const createdAt = booking.createdAt ? 
          (booking.createdAt?.toDate ? booking.createdAt.toDate() : new Date(booking.createdAt)) : 
          null;
        
        if (!createdAt) return false;

        const bookingDate = normalizeDateForFilter(createdAt);
        const startDate = range.startDate ? normalizeDateForFilter(range.startDate) : null;
        const endDate = range.endDate ? normalizeDateForFilter(range.endDate) : null;

        // Case 1: Only start date provided
        if (startDate && !endDate) {
          return bookingDate >= startDate;
        }

        // Case 2: Only end date provided
        if (!startDate && endDate) {
          return bookingDate <= endDate;
        }

        // Case 3: Both dates provided
        if (startDate && endDate) {
          return bookingDate >= startDate && bookingDate <= endDate;
        }

        return true;
      };

      // Filter bookings based on report date range if enabled
      let dataToExport = [...filteredBookings];
      if (range && range.enabled) {
        dataToExport = filteredBookings.filter(booking => isWithinReportDateRange(booking));
      }

      const columns = [
        { key: 'bookingId', label: 'Booking ID', width: 1.2 },
        { key: 'guestName', label: 'Guest', width: 2.5 },
        { key: 'listingTitle', label: 'Listing Title', width: 2.5 },
        { key: 'checkIn', label: 'Check-in Date', width: 1.3 },
        { key: 'checkOut', label: 'Check-out Date', width: 1.3 },
        { key: 'status', label: 'Status', width: 1.2 },
        { key: 'paymentStatus', label: 'Payment Status', width: 1.5 },
        { key: 'createdAt', label: 'Created At', width: 1.3 }
      ];

      // Helper function to capitalize status
      const capitalizeStatus = (status) => {
        if (!status || status === 'N/A') return 'N/A';
        return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
      };

      // Build date range label for report
      let reportDateRangeLabel = '';
      if (range && range.enabled && (range.startDate || range.endDate)) {
        const startLabel = range.startDate ? formatDate(range.startDate) : 'Any';
        const endLabel = range.endDate ? formatDate(range.endDate) : 'Any';
        reportDateRangeLabel = ` (${startLabel} to ${endLabel})`;
      }

      const displayDateRangeLabel = dateRange.startDate || dateRange.endDate ? 
        ` (${dateRange.startDate ? formatDate(dateRange.startDate) : 'Any'} to ${dateRange.endDate ? formatDate(dateRange.endDate) : 'Any'})` : 
        '';

      const rows = dataToExport.map(b => {
        const paymentStatus = getPaymentStatus(b);
        return {
          bookingId: b.id?.substring(0, 8) || 'N/A',
          guestName: `${b.guestName || 'Guest'}${b.guestEmail ? `\n${b.guestEmail}` : ''}`,
          listingTitle: b.listingTitle || 'Unknown',
          checkIn: formatDate(b.checkIn),
          checkOut: formatDate(b.checkOut),
          status: capitalizeStatus(b.status),
          paymentStatus: capitalizeStatus(paymentStatus),
          createdAt: formatDate(b.createdAt)
        };
      });

      const filterLabel = statusFilter === 'all' ? 'All Reservations' : 
                          statusFilter === 'upcoming' ? 'Upcoming Reservations (with Pending Payment)' :
                          statusFilter === 'active' ? 'Active Reservations' :
                          statusFilter === 'completed' ? 'Completed Reservations' :
                          statusFilter === 'cancelled' ? 'Cancelled Reservations' :
                          `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Reservations`;

      // Use report date range label if provided, otherwise use display date range label
      const finalDateRangeLabel = reportDateRangeLabel || displayDateRangeLabel;

      generatePDFReport({
        type: 'reservations',
        title: `${filterLabel}${finalDateRangeLabel}`,
        rows,
        columns,
        meta: {
          generatedBy: 'Admin Dashboard',
          filter: filterLabel,
          dateRange: finalDateRangeLabel,
          totalRecords: dataToExport.length
        }
      });

      showToast(`PDF report generated successfully (${dataToExport.length} ${dataToExport.length !== 1 ? 'records' : 'record'})`);
    } catch (error) {
      console.error('Error exporting reservations PDF:', error);
      showToast('Failed to generate PDF report', 'error');
    }
  };

  const handlePrint = () => {
    try {
      const filterLabel = statusFilter === 'all' ? 'All Reservations' : 
                          statusFilter === 'upcoming' ? 'Upcoming Reservations (with Pending Payment)' :
                          statusFilter === 'active' ? 'Active Reservations' :
                          statusFilter === 'completed' ? 'Completed Reservations' :
                          statusFilter === 'cancelled' ? 'Cancelled Reservations' :
                          `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Reservations`;

      const dateRangeLabel = dateRange.startDate || dateRange.endDate ? 
        ` (${dateRange.startDate ? formatDate(dateRange.startDate) : 'Any'} to ${dateRange.endDate ? formatDate(dateRange.endDate) : 'Any'})` : 
        '';

      const htmlContent = `
        <div style="margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 24px; font-weight: bold;">${filterLabel}${dateRangeLabel}</h2>
          <p style="margin: 5px 0; color: #666;">Total Records: ${filteredBookings.length}</p>
          <p style="margin: 5px 0; color: #666;">Date Range: ${dateRange.startDate ? formatDate(dateRange.startDate) : 'Any'} to ${dateRange.endDate ? formatDate(dateRange.endDate) : 'Any'}</p>
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
              <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Payment</th>
              <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Created</th>
            </tr>
          </thead>
          <tbody>
            ${filteredBookings.map(b => {
              const paymentStatus = getPaymentStatus(b);
              return `
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd;">${b.id?.substring(0, 8) || 'N/A'}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">
                  ${b.guestName || 'Guest'}
                  ${b.guestEmail ? `<br><small style="color: #666;">${b.guestEmail}</small>` : ''}
                </td>
                <td style="padding: 10px; border: 1px solid #ddd;">${b.listingTitle || 'Unknown'}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${formatDate(b.checkIn)}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${formatDate(b.checkOut)}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${b.status || 'N/A'}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${paymentStatus || 'N/A'}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${formatDate(b.createdAt)}</td>
              </tr>
            `;
            }).join('')}
          </tbody>
        </table>
      `;

      printReport({
        title: `${filterLabel}${dateRangeLabel}`,
        htmlContent
      });
    } catch (error) {
      console.error('Error printing reservations:', error);
      showToast('Failed to print report', 'error');
    }
  };

  const clearDateRange = () => {
    setDateRange({ startDate: '', endDate: '' });
    setCalendarDateRange([null, null]);
    setLocalLoading(true);
    reset().finally(() => {
      setLocalLoading(false);
    });
  };

  const handleDateChange = (type, value) => {
    setDateRange(prev => ({
      ...prev,
      [type]: value
    }));
  };

  // Handle calendar date range change
  const handleCalendarDateChange = (dates) => {
    const [start, end] = dates || [null, null];
    setCalendarDateRange([start, end]);
    
    // Update the dateRange state to match
    if (start) {
      const startDateStr = start.toISOString().split('T')[0];
      setDateRange(prev => ({
        ...prev,
        startDate: startDateStr
      }));
    } else {
      setDateRange(prev => ({
        ...prev,
        startDate: ''
      }));
    }
    
    if (end) {
      const endDateStr = end.toISOString().split('T')[0];
      setDateRange(prev => ({
        ...prev,
        endDate: endDateStr
      }));
    } else {
      setDateRange(prev => ({
        ...prev,
        endDate: ''
      }));
    }
  };

  const isFetching = loading || localLoading;

  return (
    <motion.div
      key="reservations"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Reservations</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">View and manage all bookings.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowReportModal(true)}
            disabled={isFetching}
            className="px-3 sm:px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold text-xs sm:text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaFilePdf className="text-xs sm:text-sm" />
            <span className="hidden sm:inline">Generate PDF Report</span>
            <span className="sm:hidden">PDF</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handlePrint}
            disabled={isFetching}
            className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-xs sm:text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaPrint className="text-xs sm:text-sm" />
            <span className="hidden sm:inline">Print</span>
            <span className="sm:hidden">Print</span>
          </motion.button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">Filter by Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              disabled={isFetching}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="all">All Reservations</option>
              <option value="completed">Completed (payment completed)</option>
              <option value="upcoming">Upcoming (payment pending)</option>
              <option value="cancelled">Cancelled (payment cancelled)</option>
            </select>
          </div>

          {/* Date Range Filter with Calendar */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-2">Date Range</label>
            <div className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <DatePicker
                  selected={calendarDateRange[0]}
                  onChange={handleCalendarDateChange}
                  startDate={calendarDateRange[0]}
                  endDate={calendarDateRange[1]}
                  selectsRange
                  dateFormat="MMM dd, yyyy"
                  placeholderText="Click to select date range"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isFetching}
                  calendarClassName="z-50"
                  popperPlacement="bottom-start"
                  showPopperArrow={false}
                  popperModifiers={[
                    {
                      name: "offset",
                      options: {
                        offset: [0, 8],
                      },
                    },
                  ]}
                  wrapperClassName="w-full"
                  isClearable
                  shouldCloseOnSelect={false}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <FaCalendarAlt className="w-4 h-4 text-gray-400" />
                </div>
              </div>
              {(dateRange.startDate || dateRange.endDate) && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={clearDateRange}
                  disabled={isFetching}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold text-xs sm:text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear Dates
                </motion.button>
              )}
            </div>
            {(dateRange.startDate || dateRange.endDate) && (
              <p className="mt-2 text-xs text-gray-500">
                {dateRange.startDate && dateRange.endDate
                  ? `${formatDate(dateRange.startDate)} - ${formatDate(dateRange.endDate)}`
                  : dateRange.startDate
                  ? `From ${formatDate(dateRange.startDate)}`
                  : `Until ${formatDate(dateRange.endDate)}`}
              </p>
            )}
          </div>
        </div>

        {/* Active Filters Info */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="text-xs sm:text-sm text-gray-600">
            Showing {filteredBookings.length} of {bookings.length} reservation{bookings.length !== 1 ? 's' : ''}
            {statusFilter === 'completed' && (
              <span className="block sm:inline sm:ml-2 text-emerald-600 font-medium">
                (payment completed)
              </span>
            )}
            {statusFilter === 'upcoming' && (
              <span className="block sm:inline sm:ml-2 text-emerald-600 font-medium">
                (payment pending)
              </span>
            )}
            {statusFilter === 'cancelled' && (
              <span className="block sm:inline sm:ml-2 text-emerald-600 font-medium">
                (payment cancelled)
              </span>
            )}
          </div>
          
          {(dateRange.startDate || dateRange.endDate) && (
            <div className="p-2 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-700 flex items-center gap-2">
                {isFetching && <FaSync className="animate-spin" />}
                Showing bookings from <strong>{dateRange.startDate ? formatDate(dateRange.startDate) : 'any date'}</strong> to <strong>{dateRange.endDate ? formatDate(dateRange.endDate) : 'any date'}</strong>
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="p-6 border-b border-gray-200">
          <SectionHeader icon={FaBook} title="All Reservations" />
        </div>

        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 m-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {isFetching && bookings.length === 0 ? (
          <div className="p-6 sm:p-8 text-center">
            <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-emerald-600 mx-auto mb-2"></div>
            <p className="text-xs sm:text-sm text-gray-600">Loading reservations...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600">Booking ID</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600">Guest Name & Email</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600 hidden md:table-cell">Listing</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600 hidden lg:table-cell">Check-in</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600 hidden lg:table-cell">Check-out</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600 hidden md:table-cell">Payment</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600 hidden xl:table-cell">Created</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-3 sm:px-6 py-6 sm:py-8 text-center text-gray-500 text-xs sm:text-sm">
                        {bookings.length === 0 
                          ? 'No reservations found' 
                          : `No ${statusFilter === 'all' ? '' : statusFilter} reservations found`}
                        {dateRange.startDate || dateRange.endDate ? ' for the selected date range' : ''}
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.map((booking) => (
                      <ReservationRow key={booking.id} booking={booking} />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-3 sm:p-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
              <div className="text-xs sm:text-sm text-gray-600">
                Page {page + 1}
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={fetchPrevious}
                  disabled={page === 0 || isFetching}
                  className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaChevronLeft className="text-xs" />
                  <span className="hidden sm:inline">Previous</span>
                  <span className="sm:hidden">Prev</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={fetchNext}
                  disabled={!hasMore || isFetching}
                  className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="hidden sm:inline">Next</span>
                  <span className="sm:hidden">Next</span>
                  <FaChevronRight className="text-xs" />
                </motion.button>
              </div>
            </div>
          </>
        )}
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
    </motion.div>
  );
};

export default ReservationsList;