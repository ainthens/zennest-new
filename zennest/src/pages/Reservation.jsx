// src/pages/Reservation.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getHostBookings, 
  approveBooking, 
  rejectBooking, 
  approveCancellation, 
  rejectCancellation,
  getHostProfile,
  getListingById,
  getGuestProfile
} from '../services/firestoreService';
import { sendBookingConfirmationEmail, sendBookingCancellationEmail } from '../services/emailService';
import useAuth from '../hooks/useAuth';
import Loading from '../components/Loading';
import {
  FaCalendarCheck,
  FaMapMarkerAlt,
  FaBed,
  FaUsers,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaCalendarAlt,
  FaInfoCircle,
  FaHourglassHalf,
  FaExclamationTriangle,
  FaCheck,
  FaBan,
  FaTimes
} from 'react-icons/fa';
import { parseDate, formatDate as formatDateUtil } from '../utils/dateUtils';

const Reservation = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // pending, all, approved, rejected, cancelled
  const [processing, setProcessing] = useState(null); // bookingId being processed
  const [error, setError] = useState('');
  
  // Modal states
  const [showApproveBookingModal, setShowApproveBookingModal] = useState(false);
  const [showRejectBookingModal, setShowRejectBookingModal] = useState(false);
  const [showApproveCancellationModal, setShowApproveCancellationModal] = useState(false);
  const [showRejectCancellationModal, setShowRejectCancellationModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (user) {
      fetchReservations();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!user?.uid) {
        setBookings([]);
        setLoading(false);
        return;
      }

      // Get all bookings for this host
      const result = await getHostBookings(user.uid);
      
      if (!result.success) {
        setError(result.error || 'Failed to fetch reservations');
        setBookings([]);
        return;
      }

      // Fetch additional details for each booking (listing, guest info)
      const bookingsWithDetails = await Promise.all(
        result.data.map(async (booking) => {
          let listing = null;
          let guest = null;

          // Fetch listing details
          if (booking.listingId) {
            try {
              const listingResult = await getListingById(booking.listingId);
              if (listingResult.success) {
                listing = listingResult.data;
              }
            } catch (error) {
              console.error('Error fetching listing:', error);
            }
          }

          // Fetch guest info
          if (booking.guestId) {
            try {
              const guestResult = await getGuestProfile(booking.guestId);
              if (guestResult.success && guestResult.data) {
                guest = guestResult.data;
              }
            } catch (error) {
              console.error('Error fetching guest profile:', error);
            }
          }

          // Convert dates using utility function for consistent parsing
          const checkInDate = parseDate(booking.checkIn);
          const checkOutDate = parseDate(booking.checkOut);
          const createdAtDate = parseDate(booking.createdAt) || new Date();

          return {
            ...booking,
            listing,
            guest,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            createdAt: createdAtDate
          };
        })
      );

      setBookings(bookingsWithDetails);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      setError('Failed to fetch reservations. Please try again.');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveBookingClick = (bookingId) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (booking) {
      setSelectedBooking(booking);
      setShowApproveBookingModal(true);
    }
  };

  const handleApproveBooking = async () => {
    if (!user?.uid || !selectedBooking) return;

    try {
      setProcessing(selectedBooking.id);
      setError('');
      setSuccessMessage('');

      // Approve booking
      const result = await approveBooking(selectedBooking.id, user.uid);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to approve booking');
      }

      // Send confirmation emails
      try {
        await sendBookingConfirmationEmails({ id: selectedBooking.id, ...result.booking });
      } catch (emailError) {
        console.error('Error sending confirmation emails:', emailError);
        // Don't block the approval if email fails
      }

      // Close modal
      setShowApproveBookingModal(false);
      setSelectedBooking(null);

      // Refresh reservations
      await fetchReservations();
      setSuccessMessage('Booking approved successfully! Confirmation emails have been sent.');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('Error approving booking:', error);
      setError(error.message || 'Failed to approve booking. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const handleRejectBookingClick = (bookingId) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (booking) {
      setSelectedBooking(booking);
      setRejectionReason('');
      setShowRejectBookingModal(true);
    }
  };

  const handleRejectBooking = async () => {
    if (!user?.uid || !selectedBooking) return;

    try {
      setProcessing(selectedBooking.id);
      setError('');
      setSuccessMessage('');

      // Reject booking
      const result = await rejectBooking(selectedBooking.id, user.uid, rejectionReason.trim() || null);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to reject booking');
      }

      // Close modal
      setShowRejectBookingModal(false);
      setSelectedBooking(null);
      setRejectionReason('');

      // Refresh reservations
      await fetchReservations();
      setSuccessMessage('Booking rejected successfully.');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('Error rejecting booking:', error);
      setError(error.message || 'Failed to reject booking. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const handleApproveCancellationClick = (bookingId) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (booking) {
      setSelectedBooking(booking);
      setShowApproveCancellationModal(true);
    }
  };

  const handleApproveCancellation = async () => {
    if (!user?.uid || !selectedBooking) return;

    try {
      setProcessing(selectedBooking.id);
      setError('');
      setSuccessMessage('');

      // Approve cancellation
      const result = await approveCancellation(selectedBooking.id, user.uid);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to approve cancellation');
      }

      // Send cancellation emails
      try {
        await sendCancellationEmails({ id: selectedBooking.id, ...result.booking });
      } catch (emailError) {
        console.error('Error sending cancellation emails:', emailError);
        // Don't block the approval if email fails
      }

      // Close modal
      setShowApproveCancellationModal(false);
      setSelectedBooking(null);

      // Refresh reservations
      await fetchReservations();
      setSuccessMessage('Cancellation approved successfully! Cancellation emails have been sent.');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('Error approving cancellation:', error);
      setError(error.message || 'Failed to approve cancellation. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const handleRejectCancellationClick = (bookingId) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (booking) {
      setSelectedBooking(booking);
      setRejectionReason('');
      setShowRejectCancellationModal(true);
    }
  };

  const handleRejectCancellation = async () => {
    if (!user?.uid || !selectedBooking) return;

    try {
      setProcessing(selectedBooking.id);
      setError('');
      setSuccessMessage('');

      // Reject cancellation
      const result = await rejectCancellation(selectedBooking.id, user.uid, rejectionReason.trim() || null);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to reject cancellation');
      }

      // Close modal
      setShowRejectCancellationModal(false);
      setSelectedBooking(null);
      setRejectionReason('');

      // Refresh reservations
      await fetchReservations();
      setSuccessMessage('Cancellation rejected successfully.');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('Error rejecting cancellation:', error);
      setError(error.message || 'Failed to reject cancellation. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  // Send booking confirmation emails
  const sendBookingConfirmationEmails = async (bookingData) => {
    try {
      // Get guest email from guest profile
      let guestEmail = '';
      let guestName = 'Guest';
      if (bookingData.guestId) {
        try {
          const guestResult = await getGuestProfile(bookingData.guestId);
          if (guestResult.success && guestResult.data) {
            const guestData = guestResult.data;
            guestEmail = guestData.email || '';
            guestName = guestData.firstName && guestData.lastName 
              ? `${guestData.firstName} ${guestData.lastName}` 
              : guestData.firstName || guestData.displayName || guestData.email?.split('@')[0] || 'Guest';
          }
        } catch (error) {
          console.error('Error fetching guest profile for email:', error);
        }
      }

      // Get host email and name
      let hostEmail = '';
      let hostName = '';
      if (user?.uid) {
        try {
          const hostResult = await getHostProfile(user.uid);
          if (hostResult.success && hostResult.data) {
            const hostData = hostResult.data;
            hostEmail = hostData.email || '';
            hostName = hostData.firstName && hostData.lastName 
              ? `${hostData.firstName} ${hostData.lastName}` 
              : hostData.firstName || hostData.email?.split('@')[0] || 'Host';
          }
        } catch (error) {
          console.error('Error fetching host profile for email:', error);
        }
      }

      // Get listing details
      let listing = null;
      if (bookingData.listingId) {
        try {
          const listingResult = await getListingById(bookingData.listingId);
          if (listingResult.success) {
            listing = listingResult.data;
          }
        } catch (error) {
          console.error('Error fetching listing for email:', error);
        }
      }

      // Get listing details
      let listingData = null;
      if (bookingData.listingId) {
        try {
          const listingResult = await getListingById(bookingData.listingId);
          if (listingResult.success) {
            listingData = listingResult.data;
          }
        } catch (error) {
          console.error('Error fetching listing for email:', error);
        }
      }

      // Format dates using utility function for consistent parsing
      const checkInDate = parseDate(bookingData.checkIn);
      const checkOutDate = parseDate(bookingData.checkOut);

      // Prepare email data
      const emailData = {
        guestEmail,
        guestName,
        hostEmail,
        hostName,
        listingTitle: listingData?.title || bookingData.listingTitle || 'Listing',
        listingLocation: listingData?.location || 'Location not specified',
        checkIn: checkInDate,
        checkOut: checkOutDate,
        guests: bookingData.guests || 1,
        nights: bookingData.nights || 0,
        totalAmount: bookingData.total || bookingData.totalAmount || 0,
        bookingId: bookingData.id || bookingData.bookingId,
        category: listingData?.category || bookingData.listingCategory || 'booking'
      };

      // Send emails (non-blocking)
      if (guestEmail) {
        sendBookingConfirmationEmail(emailData).catch(error => {
          console.error('Error sending confirmation email:', error);
        });
      } else {
        console.warn('⚠️ Guest email not found. Skipping confirmation email.');
      }
    } catch (error) {
      console.error('Error preparing confirmation emails:', error);
    }
  };

  // Send cancellation emails
  const sendCancellationEmails = async (bookingData) => {
    try {
      // Get guest email from guest profile
      let guestEmail = '';
      let guestName = 'Guest';
      if (bookingData.guestId) {
        try {
          const guestResult = await getGuestProfile(bookingData.guestId);
          if (guestResult.success && guestResult.data) {
            const guestData = guestResult.data;
            guestEmail = guestData.email || '';
            guestName = guestData.firstName && guestData.lastName 
              ? `${guestData.firstName} ${guestData.lastName}` 
              : guestData.firstName || guestData.displayName || guestData.email?.split('@')[0] || 'Guest';
          }
        } catch (error) {
          console.error('Error fetching guest profile for email:', error);
        }
      }

      // Get host email and name
      let hostEmail = '';
      let hostName = '';
      if (user?.uid) {
        try {
          const hostResult = await getHostProfile(user.uid);
          if (hostResult.success && hostResult.data) {
            const hostData = hostResult.data;
            hostEmail = hostData.email || '';
            hostName = hostData.firstName && hostData.lastName 
              ? `${hostData.firstName} ${hostData.lastName}` 
              : hostData.firstName || hostData.email?.split('@')[0] || 'Host';
          }
        } catch (error) {
          console.error('Error fetching host profile for email:', error);
        }
      }

      // Get listing details if not already fetched
      let listingData = null;
      if (bookingData.listingId) {
        try {
          const listingResult = await getListingById(bookingData.listingId);
          if (listingResult.success) {
            listingData = listingResult.data;
          }
        } catch (error) {
          console.error('Error fetching listing for email:', error);
        }
      }

      // Format dates using utility function for consistent parsing
      const checkInDate = parseDate(bookingData.checkIn);
      const checkOutDate = parseDate(bookingData.checkOut);

      // Prepare email data
      const emailData = {
        guestEmail,
        guestName,
        hostEmail,
        hostName,
        listingTitle: listingData?.title || bookingData.listingTitle || 'Listing',
        listingLocation: listingData?.location || 'Location not specified',
        checkIn: checkInDate,
        checkOut: checkOutDate,
        guests: bookingData.guests || 1,
        nights: bookingData.nights || 0,
        totalAmount: bookingData.total || bookingData.totalAmount || 0,
        bookingId: bookingData.id || bookingData.bookingId,
        category: listingData?.category || bookingData.listingCategory || 'booking',
        cancelledBy: 'Guest',
        cancellationReason: bookingData.cancellationReason || 'Not specified'
      };

      // Send emails (non-blocking)
      if (guestEmail) {
        sendBookingCancellationEmail(emailData).catch(error => {
          console.error('Error sending cancellation email:', error);
        });
      } else {
        console.warn('⚠️ Guest email not found. Skipping cancellation email.');
      }
    } catch (error) {
      console.error('Error preparing cancellation emails:', error);
    }
  };

  // Use utility function for consistent date formatting
  const formatDate = formatDateUtil;

  const getStatusInfo = (status) => {
    switch (status) {
      case 'pending_approval':
        return { 
          label: 'Pending Approval', 
          color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
          icon: FaHourglassHalf 
        };
      case 'pending_cancellation':
        return { 
          label: 'Pending Cancellation', 
          color: 'bg-orange-100 text-orange-700 border-orange-300',
          icon: FaHourglassHalf 
        };
      case 'confirmed':
        return { 
          label: 'Confirmed', 
          color: 'bg-green-100 text-green-700 border-green-300',
          icon: FaCheckCircle 
        };
      case 'rejected':
        return { 
          label: 'Rejected', 
          color: 'bg-red-100 text-red-700 border-red-300',
          icon: FaTimesCircle 
        };
      case 'cancelled':
        return { 
          label: 'Cancelled', 
          color: 'bg-red-100 text-red-700 border-red-300',
          icon: FaTimesCircle 
        };
      default:
        return { 
          label: status || 'Unknown', 
          color: 'bg-gray-100 text-gray-700 border-gray-300',
          icon: FaInfoCircle 
        };
    }
  };

  const filteredBookings = bookings.filter(booking => {
    if (filter === 'all') return true;
    if (filter === 'pending') {
      return booking.status === 'pending_approval' || booking.status === 'pending_cancellation';
    }
    return booking.status === filter;
  });

  const pendingBookings = bookings.filter(b => b.status === 'pending_approval');
  const pendingCancellations = bookings.filter(b => b.status === 'pending_cancellation');

  if (loading) {
    return <Loading message="Loading reservations..." size="large" fullScreen={false} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Reservations</h1>
          <p className="text-sm text-gray-600">
            Manage booking requests and cancellation requests
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <FaExclamationTriangle className="text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <FaCheckCircle className="text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-700">{successMessage}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Pending Bookings</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingBookings.length}</p>
              </div>
              <FaHourglassHalf className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Pending Cancellations</p>
                <p className="text-2xl font-bold text-orange-600">{pendingCancellations.length}</p>
              </div>
              <FaExclamationTriangle className="w-8 h-8 text-orange-600" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Reservations</p>
                <p className="text-2xl font-bold text-gray-900">{bookings.length}</p>
              </div>
              <FaCalendarCheck className="w-8 h-8 text-gray-600" />
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-4 flex flex-wrap gap-2">
          {[
            { value: 'pending', label: 'Pending' },
            { value: 'all', label: 'All Reservations' },
            { value: 'confirmed', label: 'Confirmed' },
            { value: 'rejected', label: 'Rejected' },
            { value: 'cancelled', label: 'Cancelled' }
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === value
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Reservations List */}
        {filteredBookings.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <FaCalendarCheck className="w-16 h-16 text-gray-300 mx-auto mb-3" />
            <h2 className="text-xl font-semibold text-gray-900 mb-1.5">
              No reservations found
            </h2>
            <p className="text-sm text-gray-600">
              {filter === 'pending' 
                ? 'You don\'t have any pending booking or cancellation requests at the moment.'
                : `You don't have any ${filter} reservations.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => {
              const statusInfo = getStatusInfo(booking.status);
              const StatusIcon = statusInfo.icon;

              return (
                <div
                  key={booking.id}
                  className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-gray-200"
                >
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {booking.listing?.title || booking.listingTitle || 'Booking'}
                        </h3>
                        {booking.listing?.location && (
                          <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            <FaMapMarkerAlt className="text-emerald-600 w-3.5 h-3.5" />
                            <span>{booking.listing.location}</span>
                          </div>
                        )}
                      </div>
                      <div className={`px-3 py-1 rounded-full border flex items-center gap-2 ${statusInfo.color}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        <span className="text-xs font-semibold">{statusInfo.label}</span>
                      </div>
                    </div>

                    {/* Booking Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {booking.checkIn && (
                        <div className="flex items-start gap-2">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                            <FaCalendarAlt className="w-3.5 h-3.5 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-0.5">Check-in</p>
                            <p className="text-sm font-semibold text-gray-900">{formatDate(booking.checkIn)}</p>
                          </div>
                        </div>
                      )}

                      {booking.checkOut && (
                        <div className="flex items-start gap-2">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <FaCalendarAlt className="w-3.5 h-3.5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-0.5">Check-out</p>
                            <p className="text-sm font-semibold text-gray-900">{formatDate(booking.checkOut)}</p>
                          </div>
                        </div>
                      )}

                      {booking.guests && (
                        <div className="flex items-start gap-2">
                          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                            <FaUsers className="w-3.5 h-3.5 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-0.5">Guests</p>
                            <p className="text-sm font-semibold text-gray-900">{booking.guests} {booking.guests === 1 ? 'guest' : 'guests'}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-start gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                          <FaClock className="w-3.5 h-3.5 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">Total Amount</p>
                          <p className="text-sm font-semibold text-gray-900">₱{(booking.total || booking.totalAmount || 0).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    {/* Cancellation Reason (if pending cancellation) */}
                    {booking.status === 'pending_cancellation' && booking.cancellationReason && (
                      <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <p className="text-xs font-semibold text-orange-800 mb-1">Cancellation Reason:</p>
                        <p className="text-sm text-orange-700">{booking.cancellationReason}</p>
                      </div>
                    )}

                    {/* Message to Host (if exists) */}
                    {booking.messageToHost && (
                      <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <p className="text-xs font-semibold text-gray-700 mb-1">Message from Guest:</p>
                        <p className="text-sm text-gray-600">{booking.messageToHost}</p>
                      </div>
                    )}

                    {/* Actions */}
                    {booking.status === 'pending_approval' && (
                      <div className="flex gap-3 pt-4 border-t border-gray-200">
                        <button
                          onClick={() => handleApproveBookingClick(booking.id)}
                          disabled={processing === booking.id}
                          className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <FaCheck className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectBookingClick(booking.id)}
                          disabled={processing === booking.id}
                          className="flex-1 px-4 py-2.5 border-2 border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <FaBan className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    )}

                    {booking.status === 'pending_cancellation' && (
                      <div className="flex gap-3 pt-4 border-t border-gray-200">
                        <button
                          onClick={() => handleApproveCancellationClick(booking.id)}
                          disabled={processing === booking.id}
                          className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <FaCheck className="w-4 h-4" />
                          Approve Cancellation
                        </button>
                        <button
                          onClick={() => handleRejectCancellationClick(booking.id)}
                          disabled={processing === booking.id}
                          className="flex-1 px-4 py-2.5 border-2 border-orange-300 text-orange-600 rounded-lg hover:bg-orange-50 transition-colors font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <FaTimesCircle className="w-4 h-4" />
                          Reject Cancellation
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Approve Booking Modal */}
      <AnimatePresence>
        {showApproveBookingModal && selectedBooking && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!processing) {
                  setShowApproveBookingModal(false);
                  setSelectedBooking(null);
                }
              }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                      <FaCheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Approve Booking</h3>
                      <p className="text-xs text-gray-600">Confirm booking approval</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (!processing) {
                        setShowApproveBookingModal(false);
                        setSelectedBooking(null);
                      }
                    }}
                    disabled={processing}
                    className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FaTimes className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-700 mb-2">
                    <span className="font-semibold">Listing:</span> {selectedBooking.listing?.title || selectedBooking.listingTitle || 'N/A'}
                  </p>
                  {selectedBooking.checkIn && selectedBooking.checkOut && (
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Dates:</span> {formatDate(selectedBooking.checkIn)} - {formatDate(selectedBooking.checkOut)}
                    </p>
                  )}
                  <p className="text-sm text-gray-700 mt-2">
                    <span className="font-semibold">Total:</span> ₱{(selectedBooking.total || selectedBooking.totalAmount || 0).toLocaleString()}
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-xs text-blue-800 flex items-start gap-2">
                    <FaInfoCircle className="text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>Approving this booking will send confirmation emails to the guest and update the booking status to "Confirmed".</span>
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      if (!processing) {
                        setShowApproveBookingModal(false);
                        setSelectedBooking(null);
                      }
                    }}
                    disabled={processing}
                    className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApproveBooking}
                    disabled={processing === selectedBooking.id}
                    className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {processing === selectedBooking.id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <FaCheck className="w-4 h-4" />
                        Approve Booking
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Reject Booking Modal */}
      <AnimatePresence>
        {showRejectBookingModal && selectedBooking && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!processing) {
                  setShowRejectBookingModal(false);
                  setSelectedBooking(null);
                  setRejectionReason('');
                }
              }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                      <FaBan className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Reject Booking</h3>
                      <p className="text-xs text-gray-600">Provide rejection reason (optional)</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (!processing) {
                        setShowRejectBookingModal(false);
                        setSelectedBooking(null);
                        setRejectionReason('');
                      }
                    }}
                    disabled={processing}
                    className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FaTimes className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-700 mb-2">
                    <span className="font-semibold">Listing:</span> {selectedBooking.listing?.title || selectedBooking.listingTitle || 'N/A'}
                  </p>
                  {selectedBooking.checkIn && selectedBooking.checkOut && (
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Dates:</span> {formatDate(selectedBooking.checkIn)} - {formatDate(selectedBooking.checkOut)}
                    </p>
                  )}
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Rejection Reason (Optional)
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows="4"
                    placeholder="Enter reason for rejecting this booking..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm resize-none"
                    disabled={processing}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      if (!processing) {
                        setShowRejectBookingModal(false);
                        setSelectedBooking(null);
                        setRejectionReason('');
                      }
                    }}
                    disabled={processing}
                    className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRejectBooking}
                    disabled={processing === selectedBooking.id}
                    className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {processing === selectedBooking.id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <FaBan className="w-4 h-4" />
                        Reject Booking
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Approve Cancellation Modal */}
      <AnimatePresence>
        {showApproveCancellationModal && selectedBooking && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!processing) {
                  setShowApproveCancellationModal(false);
                  setSelectedBooking(null);
                }
              }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                      <FaCheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Approve Cancellation</h3>
                      <p className="text-xs text-gray-600">Confirm cancellation approval</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (!processing) {
                        setShowApproveCancellationModal(false);
                        setSelectedBooking(null);
                      }
                    }}
                    disabled={processing}
                    className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FaTimes className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-700 mb-2">
                    <span className="font-semibold">Listing:</span> {selectedBooking.listing?.title || selectedBooking.listingTitle || 'N/A'}
                  </p>
                  {selectedBooking.checkIn && selectedBooking.checkOut && (
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Dates:</span> {formatDate(selectedBooking.checkIn)} - {formatDate(selectedBooking.checkOut)}
                    </p>
                  )}
                  {selectedBooking.cancellationReason && (
                    <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-xs font-semibold text-orange-800 mb-1">Cancellation Reason:</p>
                      <p className="text-sm text-orange-700">{selectedBooking.cancellationReason}</p>
                    </div>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-xs text-blue-800 flex items-start gap-2">
                    <FaInfoCircle className="text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>Approving this cancellation will send cancellation emails to the guest and update the booking status to "Cancelled".</span>
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      if (!processing) {
                        setShowApproveCancellationModal(false);
                        setSelectedBooking(null);
                      }
                    }}
                    disabled={processing}
                    className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApproveCancellation}
                    disabled={processing === selectedBooking.id}
                    className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {processing === selectedBooking.id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <FaCheck className="w-4 h-4" />
                        Approve Cancellation
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Reject Cancellation Modal */}
      <AnimatePresence>
        {showRejectCancellationModal && selectedBooking && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!processing) {
                  setShowRejectCancellationModal(false);
                  setSelectedBooking(null);
                  setRejectionReason('');
                }
              }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                      <FaTimesCircle className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Reject Cancellation</h3>
                      <p className="text-xs text-gray-600">Provide rejection reason (optional)</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (!processing) {
                        setShowRejectCancellationModal(false);
                        setSelectedBooking(null);
                        setRejectionReason('');
                      }
                    }}
                    disabled={processing}
                    className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FaTimes className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-700 mb-2">
                    <span className="font-semibold">Listing:</span> {selectedBooking.listing?.title || selectedBooking.listingTitle || 'N/A'}
                  </p>
                  {selectedBooking.checkIn && selectedBooking.checkOut && (
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Dates:</span> {formatDate(selectedBooking.checkIn)} - {formatDate(selectedBooking.checkOut)}
                    </p>
                  )}
                  {selectedBooking.cancellationReason && (
                    <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-xs font-semibold text-orange-800 mb-1">Guest's Cancellation Reason:</p>
                      <p className="text-sm text-orange-700">{selectedBooking.cancellationReason}</p>
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Rejection Reason (Optional)
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows="4"
                    placeholder="Enter reason for rejecting this cancellation request..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm resize-none"
                    disabled={processing}
                  />
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <p className="text-xs text-yellow-800 flex items-start gap-2">
                    <FaExclamationTriangle className="text-yellow-600 mt-0.5 flex-shrink-0" />
                    <span>Rejecting this cancellation will restore the booking to its previous status. The guest's cancellation request will be declined.</span>
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      if (!processing) {
                        setShowRejectCancellationModal(false);
                        setSelectedBooking(null);
                        setRejectionReason('');
                      }
                    }}
                    disabled={processing}
                    className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRejectCancellation}
                    disabled={processing === selectedBooking.id}
                    className="flex-1 px-4 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {processing === selectedBooking.id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <FaTimesCircle className="w-4 h-4" />
                        Reject Cancellation
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Reservation;

