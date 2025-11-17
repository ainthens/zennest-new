// src/pages/admin/Reservations/ReservationsList.jsx
import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import SectionHeader from '../components/SectionHeader';
import { FaBook, FaFilePdf, FaPrint, FaChevronLeft, FaChevronRight, FaFilter } from 'react-icons/fa';
import { useReservationsPagination } from './useReservationsPagination';
import ReservationRow from './ReservationRow';
import { generatePDFReport, printReport } from '../lib/reportUtils';
import { parseDate } from '../../../utils/dateUtils';

const ReservationsList = ({ showToast }) => {
  const [statusFilter, setStatusFilter] = useState('all');
  
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

  // Helper function to determine booking status
  const getBookingStatus = (booking) => {
    if (booking.status === 'cancelled') return 'cancelled';
    if (booking.status === 'pending_approval') return 'pending_approval';
    if (booking.status === 'pending_cancellation') return 'pending_cancellation';
    if (booking.status === 'rejected') return 'rejected';
    
    // Handle bookings without dates (services/experiences)
    if (!booking.checkIn || !booking.checkOut) {
      if (booking.status === 'confirmed' || booking.status === 'completed') return 'active';
      if (booking.status === 'pending' || booking.status === 'reserved') return 'upcoming';
      return 'completed';
    }
    
    const now = new Date();
    const checkIn = parseDate(booking.checkIn);
    const checkOut = parseDate(booking.checkOut);
    
    if (!checkIn || !checkOut) {
      if (booking.status === 'confirmed' || booking.status === 'completed') return 'active';
      if (booking.status === 'pending' || booking.status === 'reserved') return 'upcoming';
      return 'completed';
    }

    if (now < checkIn) return 'upcoming';
    if (now >= checkIn && now <= checkOut) return 'active';
    return 'completed';
  };

  // Helper function to determine payment status
  const getPaymentStatus = (booking) => {
    // Payment is "completed" if paymentStatus is 'completed' or paidAmount exists
    if (booking.paymentStatus === 'completed' || booking.paidAmount !== undefined) {
      return 'completed';
    }
    
    // Payment is "pending" if paymentStatus is 'pending' or 'scheduled'
    if (booking.paymentStatus === 'pending' || booking.paymentStatus === 'scheduled') {
      return 'pending';
    }
    
    // If booking status is upcoming (check-in in future), payment is also upcoming
    const bookingStatus = getBookingStatus(booking);
    if (bookingStatus === 'upcoming') {
      return 'upcoming';
    }
    
    // Default to pending if no payment status
    return booking.paymentStatus || 'pending';
  };

  // Filter bookings based on selected status (considering both booking and payment status)
  const filteredBookings = useMemo(() => {
    if (statusFilter === 'all') return bookings;
    
    return bookings.filter(booking => {
      const bookingStatus = getBookingStatus(booking);
      const paymentStatus = getPaymentStatus(booking);
      
      // For "upcoming" filter: booking must be upcoming AND payment should be upcoming/pending (not completed)
      if (statusFilter === 'upcoming') {
        return bookingStatus === 'upcoming' && paymentStatus !== 'completed';
      }
      
      // For other filters, match the booking status
      return bookingStatus === statusFilter;
    });
  }, [bookings, statusFilter]);

  const handleExportPDF = () => {
    try {
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

      // Helper function to format dates properly
      const formatDate = (date) => {
        if (!date) return 'N/A';
        const dateObj = date?.toDate ? date.toDate() : new Date(date);
        if (isNaN(dateObj.getTime())) return 'N/A';
        return dateObj.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        });
      };

      // Helper function to capitalize status
      const capitalizeStatus = (status) => {
        if (!status || status === 'N/A') return 'N/A';
        return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
      };

      const rows = filteredBookings.map(b => {
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

      generatePDFReport({
        type: 'reservations',
        title: filterLabel,
        rows,
        columns,
        meta: {
          generatedBy: 'Admin Dashboard',
          filter: filterLabel,
          totalRecords: filteredBookings.length
        }
      });

      showToast(`PDF report generated successfully (${filteredBookings.length} ${filteredBookings.length === 1 ? 'record' : 'records'})`);
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
                <td style="padding: 10px; border: 1px solid #ddd;">${b.checkIn?.toDate ? b.checkIn.toDate().toLocaleDateString() : 'N/A'}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${b.checkOut?.toDate ? b.checkOut.toDate().toLocaleDateString() : 'N/A'}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${b.status || 'N/A'}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${paymentStatus || 'N/A'}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${b.createdAt?.toDate ? b.createdAt.toDate().toLocaleDateString() : 'N/A'}</td>
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
      console.error('Error printing reservations:', error);
      showToast('Failed to print report', 'error');
    }
  };

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
            onClick={handleExportPDF}
            className="px-3 sm:px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold text-xs sm:text-sm flex items-center gap-2"
          >
            <FaFilePdf className="text-xs sm:text-sm" />
            <span className="hidden sm:inline">Export PDF</span>
            <span className="sm:hidden">PDF</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handlePrint}
            className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-xs sm:text-sm flex items-center gap-2"
          >
            <FaPrint className="text-xs sm:text-sm" />
            <span className="hidden sm:inline">Print</span>
            <span className="sm:hidden">Print</span>
          </motion.button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <FaFilter className="text-gray-600 text-sm" />
            <label className="text-xs sm:text-sm font-medium text-gray-700">Filter by Status:</label>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs sm:text-sm font-medium"
          >
            <option value="all">All Reservations</option>
            <option value="upcoming">Upcoming (with pending payment)</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="rejected">Rejected</option>
          </select>
          <div className="text-xs sm:text-sm text-gray-600">
            Showing {filteredBookings.length} of {bookings.length} reservation{bookings.length !== 1 ? 's' : ''}
            {statusFilter === 'upcoming' && (
              <span className="block sm:inline sm:ml-2 text-emerald-600 font-medium">
                (upcoming bookings with pending/upcoming payment)
              </span>
            )}
          </div>
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

        {loading && bookings.length === 0 ? (
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
                                  : `No ${statusFilter === 'all' ? '' : statusFilter === 'upcoming' ? 'upcoming (with pending payment) ' : statusFilter.replace('_', ' ')} reservations found`}
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
                  disabled={page === 0 || loading}
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
                  disabled={!hasMore || loading}
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
    </motion.div>
  );
};

export default ReservationsList;

