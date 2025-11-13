// src/pages/Reservation.jsx
import React, { useState, useEffect } from 'react';
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
  FaBan
} from 'react-icons/fa';

const Reservation = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // pending, all, approved, rejected, cancelled
  const [processing, setProcessing] = useState(null); // bookingId being processed
  const [error, setError] = useState('');

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

          // Convert dates
          const checkInDate = booking.checkIn?.toDate 
            ? booking.checkIn.toDate() 
            : booking.checkIn 
              ? new Date(booking.checkIn) 
              : null;
          
          const checkOutDate = booking.checkOut?.toDate 
            ? booking.checkOut.toDate() 
            : booking.checkOut 
              ? new Date(booking.checkOut) 
              : null;
          
          const createdAtDate = booking.createdAt?.toDate 
            ? booking.createdAt.toDate() 
            : booking.createdAt 
              ? new Date(booking.createdAt) 
              : new Date();

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

  const handleApproveBooking = async (bookingId) => {
    if (!user?.uid) return;

    try {
      setProcessing(bookingId);
      setError('');

      // Approve booking
      const result = await approveBooking(bookingId, user.uid);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to approve booking');
      }

      // Send confirmation emails
      try {
        await sendBookingConfirmationEmails({ id: bookingId, ...result.booking });
      } catch (emailError) {
        console.error('Error sending confirmation emails:', emailError);
        // Don't block the approval if email fails
      }

      // Refresh reservations
      await fetchReservations();
      alert('Booking approved successfully! Confirmation emails have been sent.');
    } catch (error) {
      console.error('Error approving booking:', error);
      setError(error.message || 'Failed to approve booking. Please try again.');
      alert(`Failed to approve booking: ${error.message || 'Please try again.'}`);
    } finally {
      setProcessing(null);
    }
  };

  const handleRejectBooking = async (bookingId) => {
    if (!user?.uid) return;

    const reason = window.prompt('Please provide a reason for rejecting this booking (optional):');
    if (reason === null) return; // User cancelled

    try {
      setProcessing(bookingId);
      setError('');

      // Reject booking
      const result = await rejectBooking(bookingId, user.uid, reason || null);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to reject booking');
      }

      // Refresh reservations
      await fetchReservations();
      alert('Booking rejected successfully.');
    } catch (error) {
      console.error('Error rejecting booking:', error);
      setError(error.message || 'Failed to reject booking. Please try again.');
      alert(`Failed to reject booking: ${error.message || 'Please try again.'}`);
    } finally {
      setProcessing(null);
    }
  };

  const handleApproveCancellation = async (bookingId) => {
    if (!user?.uid) return;

    try {
      setProcessing(bookingId);
      setError('');

      // Approve cancellation
      const result = await approveCancellation(bookingId, user.uid);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to approve cancellation');
      }

      // Send cancellation emails
      try {
        await sendCancellationEmails({ id: bookingId, ...result.booking });
      } catch (emailError) {
        console.error('Error sending cancellation emails:', emailError);
        // Don't block the approval if email fails
      }

      // Refresh reservations
      await fetchReservations();
      alert('Cancellation approved successfully! Cancellation emails have been sent.');
    } catch (error) {
      console.error('Error approving cancellation:', error);
      setError(error.message || 'Failed to approve cancellation. Please try again.');
      alert(`Failed to approve cancellation: ${error.message || 'Please try again.'}`);
    } finally {
      setProcessing(null);
    }
  };

  const handleRejectCancellation = async (bookingId) => {
    if (!user?.uid) return;

    const reason = window.prompt('Please provide a reason for rejecting this cancellation (optional):');
    if (reason === null) return; // User cancelled

    try {
      setProcessing(bookingId);
      setError('');

      // Reject cancellation
      const result = await rejectCancellation(bookingId, user.uid, reason || null);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to reject cancellation');
      }

      // Refresh reservations
      await fetchReservations();
      alert('Cancellation rejected successfully.');
    } catch (error) {
      console.error('Error rejecting cancellation:', error);
      setError(error.message || 'Failed to reject cancellation. Please try again.');
      alert(`Failed to reject cancellation: ${error.message || 'Please try again.'}`);
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

      // Format dates
      const checkInDate = bookingData.checkIn?.toDate 
        ? bookingData.checkIn.toDate() 
        : bookingData.checkIn 
          ? (bookingData.checkIn instanceof Date ? bookingData.checkIn : new Date(bookingData.checkIn))
          : null;
      
      const checkOutDate = bookingData.checkOut?.toDate 
        ? bookingData.checkOut.toDate() 
        : bookingData.checkOut 
          ? (bookingData.checkOut instanceof Date ? bookingData.checkOut : new Date(bookingData.checkOut))
          : null;

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

      // Format dates
      const checkInDate = bookingData.checkIn?.toDate 
        ? bookingData.checkIn.toDate() 
        : bookingData.checkIn 
          ? (bookingData.checkIn instanceof Date ? bookingData.checkIn : new Date(bookingData.checkIn))
          : null;
      
      const checkOutDate = bookingData.checkOut?.toDate 
        ? bookingData.checkOut.toDate() 
        : bookingData.checkOut 
          ? (bookingData.checkOut instanceof Date ? bookingData.checkOut : new Date(bookingData.checkOut))
          : null;

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

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return 'Invalid Date';
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

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
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
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
                          onClick={() => handleApproveBooking(booking.id)}
                          disabled={processing === booking.id}
                          className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {processing === booking.id ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <FaCheck className="w-4 h-4" />
                              Approve
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleRejectBooking(booking.id)}
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
                          onClick={() => handleApproveCancellation(booking.id)}
                          disabled={processing === booking.id}
                          className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {processing === booking.id ? (
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
                        <button
                          onClick={() => handleRejectCancellation(booking.id)}
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
    </div>
  );
};

export default Reservation;

