// src/pages/UserBookings.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, where, getDocs, doc, getDoc, orderBy, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import useAuth from '../hooks/useAuth';
import SettingsHeader from '../components/SettingsHeader';
import Loading from '../components/Loading';
import CancellationReasonModal from '../components/CancellationReasonModal';
import { 
  FaCalendarCheck, 
  FaMapMarkerAlt, 
  FaBed, 
  FaUsers, 
  FaClock,
  FaCheckCircle,
  FaHourglassHalf,
  FaTimesCircle,
  FaCalendarAlt,
  FaInfoCircle,
  FaPhone,
  FaEnvelope,
  FaBan
} from 'react-icons/fa';

const UserBookings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, upcoming, past, cancelled
  const [cancelling, setCancelling] = useState(false);
  const [showCancellationReasonModal, setShowCancellationReasonModal] = useState(false);
  const [pendingCancellationBookingId, setPendingCancellationBookingId] = useState(null);

  useEffect(() => {
    if (user) {
      fetchBookings();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      if (!user?.uid) {
        setBookings([]);
        setLoading(false);
        return;
      }

      console.log('🔍 Fetching bookings for user:', user.uid);

      // Fetch bookings from Firestore
      const bookingsRef = collection(db, 'bookings');
      
      let querySnapshot;
      try {
        // Try with orderBy first (requires index)
        const q = query(
          bookingsRef, 
          where('guestId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        querySnapshot = await getDocs(q);
        console.log('✅ Fetched bookings with orderBy:', querySnapshot.docs.length);
      } catch (orderByError) {
        // If index error, fetch without orderBy and sort in memory
        if (orderByError.code === 'failed-precondition' && orderByError.message?.includes('index')) {
          console.warn('⚠️ Firestore index not found. Fetching without orderBy...');
          console.warn('To create the index, visit:', orderByError.message.match(/https:\/\/[^\s]+/)?.[0] || 'Firebase Console');
          
          const q = query(
            bookingsRef,
            where('guestId', '==', user.uid)
          );
          querySnapshot = await getDocs(q);
          console.log('✅ Fetched bookings without orderBy:', querySnapshot.docs.length);
        } else {
          throw orderByError;
        }
      }
      
      const bookingsData = [];

      for (const docSnap of querySnapshot.docs) {
        const bookingData = docSnap.data();
        console.log('📦 Processing booking:', docSnap.id, bookingData);
        
        // Fetch listing details
        let listingData = null;
        if (bookingData.listingId) {
          try {
            const listingRef = doc(db, 'listings', bookingData.listingId);
            const listingSnap = await getDoc(listingRef);
            if (listingSnap.exists()) {
              listingData = { id: listingSnap.id, ...listingSnap.data() };
            }
          } catch (error) {
            console.error('Error fetching listing:', error);
          }
        }

        // Handle date conversions safely
        const checkInDate = bookingData.checkIn?.toDate 
          ? bookingData.checkIn.toDate() 
          : bookingData.checkIn 
            ? new Date(bookingData.checkIn) 
            : null;
        
        const checkOutDate = bookingData.checkOut?.toDate 
          ? bookingData.checkOut.toDate() 
          : bookingData.checkOut 
            ? new Date(bookingData.checkOut) 
            : null;
        
        const createdAtDate = bookingData.createdAt?.toDate 
          ? bookingData.createdAt.toDate() 
          : bookingData.createdAt 
            ? new Date(bookingData.createdAt) 
            : new Date();

        bookingsData.push({
          id: docSnap.id,
          ...bookingData,
          listing: listingData,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          createdAt: createdAtDate
        });
      }

      // Sort by createdAt descending (newest first)
      bookingsData.sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0);
        const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : (b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0);
        return dateB - dateA; // Descending order (newest first)
      });

      console.log('✅ Total bookings found:', bookingsData.length);
      setBookings(bookingsData);
    } catch (error) {
      console.error('❌ Error fetching bookings:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const getBookingStatus = (booking) => {
    if (booking.status === 'cancelled') return 'cancelled';
    if (booking.status === 'pending_approval') return 'pending_approval';
    if (booking.status === 'pending_cancellation') return 'pending_cancellation';
    if (booking.status === 'rejected') return 'rejected';
    
    // Handle bookings without dates (services/experiences)
    if (!booking.checkIn || !booking.checkOut) {
      if (booking.status === 'confirmed') return 'active';
      if (booking.status === 'pending' || booking.status === 'reserved') return 'upcoming';
      return 'past';
    }
    
    const now = new Date();
    const checkIn = booking.checkIn instanceof Date ? booking.checkIn : new Date(booking.checkIn);
    const checkOut = booking.checkOut instanceof Date ? booking.checkOut : new Date(booking.checkOut);

    if (now < checkIn) return 'upcoming';
    if (now >= checkIn && now <= checkOut) return 'active';
    return 'past';
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'upcoming':
        return { 
          label: 'Upcoming', 
          color: 'bg-blue-100 text-blue-700 border-blue-300',
          icon: FaClock 
        };
      case 'active':
        return { 
          label: 'Active', 
          color: 'bg-green-100 text-green-700 border-green-300',
          icon: FaCheckCircle 
        };
      case 'past':
        return { 
          label: 'Completed', 
          color: 'bg-gray-100 text-gray-700 border-gray-300',
          icon: FaCheckCircle 
        };
      case 'cancelled':
        return { 
          label: 'Cancelled', 
          color: 'bg-red-100 text-red-700 border-red-300',
          icon: FaTimesCircle 
        };
      case 'pending_approval':
        return { 
          label: 'Awaiting Host Approval', 
          color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
          icon: FaHourglassHalf 
        };
      case 'pending_cancellation':
        return { 
          label: 'Cancellation Pending', 
          color: 'bg-orange-100 text-orange-700 border-orange-300',
          icon: FaHourglassHalf 
        };
      case 'rejected':
        return { 
          label: 'Rejected', 
          color: 'bg-red-100 text-red-700 border-red-300',
          icon: FaTimesCircle 
        };
      default:
        return { 
          label: 'Unknown', 
          color: 'bg-gray-100 text-gray-700 border-gray-300',
          icon: FaInfoCircle 
        };
    }
  };

  const filteredBookings = bookings.filter(booking => {
    if (filter === 'all') return true;
    return getBookingStatus(booking) === filter;
  });

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

  const calculateNights = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 0;
    const checkInDate = checkIn instanceof Date ? checkIn : new Date(checkIn);
    const checkOutDate = checkOut instanceof Date ? checkOut : new Date(checkOut);
    const diff = checkOutDate - checkInDate;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // Check if a booking can be cancelled
  const canCancelBooking = (booking) => {
    const status = getBookingStatus(booking);
    // Can cancel upcoming, active, confirmed, pending_approval bookings
    // Cannot cancel already cancelled, past, pending_cancellation, or rejected bookings
    return (status === 'upcoming' || status === 'active' || 
           booking.status === 'confirmed' || booking.status === 'pending_approval') &&
           booking.status !== 'pending_cancellation' &&
           booking.status !== 'cancelled' &&
           booking.status !== 'rejected';
  };

  // Handle cancel booking confirmation - show reason modal
  const handleCancelClick = (bookingId) => {
    setPendingCancellationBookingId(bookingId);
    setShowCancellationReasonModal(true);
  };

  // Submit cancellation request with reason
  const handleCancellationReasonSubmit = async (cancellationReason) => {
    if (!pendingCancellationBookingId) return;

    try {
      setCancelling(true);
      const bookingRef = doc(db, 'bookings', pendingCancellationBookingId);
      const bookingSnap = await getDoc(bookingRef);
      
      if (!bookingSnap.exists()) {
        alert('Booking not found');
        setShowCancellationReasonModal(false);
        setPendingCancellationBookingId(null);
        return;
      }

      const bookingData = bookingSnap.data();
      const currentStatus = bookingData.status;
      
      // Update booking status to pending_cancellation
      await updateDoc(bookingRef, {
        status: 'pending_cancellation',
        previousStatus: currentStatus, // Store previous status for potential rejection
        cancellationReason: cancellationReason,
        cancellationRequestedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log('✅ Cancellation request submitted successfully');
      
      // Don't send cancellation emails yet - wait for host approval
      // Emails will be sent after host approves the cancellation
      
      // Refresh bookings
      await fetchBookings();
      
      // Close modal and show success
      setShowCancellationReasonModal(false);
      setPendingCancellationBookingId(null);
      alert('Cancellation request submitted! Waiting for host approval.');
    } catch (error) {
      console.error('❌ Error submitting cancellation request:', error);
      alert(`Failed to submit cancellation request: ${error.message || 'Please try again.'}`);
    } finally {
      setCancelling(false);
    }
  };


  if (!user) {
    return (
      <>
        <SettingsHeader />
        <div className="min-h-screen bg-slate-100 pt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center">
              <FaCalendarCheck className="w-14 h-14 text-gray-300 mx-auto mb-3" />
              <h2 className="text-xl font-semibold text-gray-900 mb-1.5">Please Sign In</h2>
              <p className="text-sm text-gray-600 mb-4">Sign in to view your bookings</p>
              <button
                onClick={() => navigate('/login')}
                className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SettingsHeader />
      <div className="min-h-screen bg-slate-100 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">My Bookings</h1>
            <p className="text-sm text-gray-600">
              {bookings.length > 0 
                ? `You have ${bookings.length} ${bookings.length === 1 ? 'booking' : 'bookings'}`
                : 'Your bookings will appear here'}
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="mb-4 flex flex-wrap gap-2">
            {[
              { value: 'all', label: 'All Bookings' },
              { value: 'upcoming', label: 'Upcoming' },
              { value: 'active', label: 'Active' },
              { value: 'past', label: 'Completed' },
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

          {/* Content */}
          {loading ? (
            <Loading message="Loading bookings..." size="medium" fullScreen={false} />
          ) : filteredBookings.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <FaCalendarCheck className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <h2 className="text-xl font-semibold text-gray-900 mb-1.5">
                {filter === 'all' ? 'No bookings yet' : `No ${filter} bookings`}
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                {filter === 'all' 
                  ? 'Start exploring and book your next adventure!'
                  : `You don't have any ${filter} bookings at the moment.`}
              </p>
              <button
                onClick={() => navigate('/homestays')}
                className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm"
              >
                Explore Listings
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBookings.map((booking, index) => {
                const status = getBookingStatus(booking);
                const statusInfo = getStatusInfo(status);
                const StatusIcon = statusInfo.icon;
                const nights = calculateNights(booking.checkIn, booking.checkOut);

                return (
                  <motion.div
                    key={booking.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-gray-200/50 cursor-pointer"
                    onClick={() => navigate(`/booking/${booking.id}`)}
                  >
                    <div className="md:flex">
                      {/* Image */}
                      <div className="md:w-1/3 h-40 md:h-auto bg-gradient-to-br from-emerald-400 to-emerald-600 relative overflow-hidden">
                        {booking.listing?.images && booking.listing.images.length > 0 ? (
                          <>
                            <img 
                              src={booking.listing.images[0]} 
                              alt={booking.listing.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                          </>
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-emerald-600"></div>
                        )}
                        
                        {/* Status Badge */}
                        <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full border ${statusInfo.color} backdrop-blur-sm flex items-center gap-1.5`}>
                          <StatusIcon className="w-3 h-3" />
                          <span className="text-[10px] font-semibold">{statusInfo.label}</span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="md:w-2/3 p-4">
                        <div className="flex flex-col h-full">
                          {/* Title and Location */}
                          <div className="mb-3">
                            <h3 className="text-lg font-semibold text-gray-900 mb-1.5">
                              {booking.listing?.title || 'Booking'}
                            </h3>
                            {booking.listing?.location && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                <FaMapMarkerAlt className="text-emerald-600 w-3 h-3" />
                                <span>{booking.listing.location}</span>
                              </div>
                            )}
                          </div>

                          {/* Booking Details */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                            {/* Check-in */}
                            {booking.checkIn && (
                              <div className="flex items-start gap-2">
                                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                  <FaCalendarAlt className="w-3.5 h-3.5 text-emerald-600" />
                                </div>
                                <div>
                                  <p className="text-[10px] text-gray-500 mb-0.5">Check-in</p>
                                  <p className="text-xs font-semibold text-gray-900">{formatDate(booking.checkIn)}</p>
                                </div>
                              </div>
                            )}

                            {/* Check-out */}
                            {booking.checkOut && (
                              <div className="flex items-start gap-2">
                                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                  <FaCalendarAlt className="w-3.5 h-3.5 text-blue-600" />
                                </div>
                                <div>
                                  <p className="text-[10px] text-gray-500 mb-0.5">Check-out</p>
                                  <p className="text-xs font-semibold text-gray-900">{formatDate(booking.checkOut)}</p>
                                </div>
                              </div>
                            )}

                            {/* Guests */}
                            {booking.guests && (
                              <div className="flex items-start gap-2">
                                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                                  <FaUsers className="w-3.5 h-3.5 text-purple-600" />
                                </div>
                                <div>
                                  <p className="text-[10px] text-gray-500 mb-0.5">Guests</p>
                                  <p className="text-xs font-semibold text-gray-900">{booking.guests} {booking.guests === 1 ? 'guest' : 'guests'}</p>
                                </div>
                              </div>
                            )}

                            {/* Nights */}
                            {nights > 0 && (
                              <div className="flex items-start gap-2">
                                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                                  <FaBed className="w-3.5 h-3.5 text-amber-600" />
                                </div>
                                <div>
                                  <p className="text-[10px] text-gray-500 mb-0.5">Duration</p>
                                  <p className="text-xs font-semibold text-gray-900">{nights} {nights === 1 ? 'night' : 'nights'}</p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Footer */}
                          <div className="mt-auto pt-3 border-t border-gray-200">
                            <div className="flex items-center justify-between mb-2.5">
                              <div>
                                <p className="text-[10px] text-gray-500 mb-0.5">Total Amount</p>
                                <p className="text-xl font-bold text-gray-900">₱{(booking.total || booking.totalAmount || 0).toLocaleString()}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {canCancelBooking(booking) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCancelClick(booking.id);
                                  }}
                                  className="flex-1 px-3 py-2 border-2 border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium text-xs flex items-center justify-center gap-1.5"
                                >
                                  <FaBan className="w-3.5 h-3.5" />
                                  Cancel
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/listing/${booking.listingId}`);
                                }}
                                className={`px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-xs ${canCancelBooking(booking) ? 'flex-1' : 'w-full'}`}
                              >
                                View Listing
                              </button>
                            </div>
                            <p className="text-[10px] text-gray-500 text-center mt-1.5">
                              Click anywhere on the card to view full details
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cancellation Reason Modal */}
      <CancellationReasonModal
        isOpen={showCancellationReasonModal}
        onClose={() => {
          setShowCancellationReasonModal(false);
          setPendingCancellationBookingId(null);
        }}
        onSubmit={handleCancellationReasonSubmit}
        isSubmitting={cancelling}
      />
    </>
  );
};

export default UserBookings;
