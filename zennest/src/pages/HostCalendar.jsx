// src/pages/HostCalendar.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getHostBookings, getHostListings } from '../services/firestoreService';
import useAuth from '../hooks/useAuth';
import { 
  FaCalendarAlt, 
  FaCheck, 
  FaTimes, 
  FaHome, 
  FaStar, 
  FaClock,
  FaChevronLeft,
  FaChevronRight
} from 'react-icons/fa';
import Loading from '../components/Loading';

const HostCalendar = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [listings, setListings] = useState([]);
  const [selectedListing, setSelectedListing] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState('month'); // 'month', 'list'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [bookingsResult, listingsResult] = await Promise.all([
        getHostBookings(user.uid),
        getHostListings(user.uid)
      ]);

      setBookings(bookingsResult.data || []);
      setListings(listingsResult.data || []);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create a map of listingId to listing data for quick lookup
  const listingsMap = listings.reduce((acc, listing) => {
    acc[listing.id] = listing;
    return acc;
  }, {});

  const filteredBookings = bookings.filter(booking => {
    if (selectedListing !== 'all' && booking.listingId !== selectedListing) {
      return false;
    }
    return true;
  });

  // Helper to convert Firestore timestamp to Date
  const toDate = (timestamp) => {
    if (!timestamp) return null;
    if (timestamp.toDate) return timestamp.toDate();
    if (timestamp instanceof Date) return timestamp;
    return new Date(timestamp);
  };

  // Calculate booking duration in days
  const getBookingDuration = (booking) => {
    const checkIn = toDate(booking.checkIn);
    const checkOut = toDate(booking.checkOut);
    if (!checkIn || !checkOut) return 0;
    const diffTime = Math.abs(checkOut - checkIn);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays || 1; // At least 1 day
  };

  // Get all bookings that span a given date (including check-in, check-out, and days in between)
  const getBookingsForDate = (date) => {
    if (!date) return [];
    
    const dateStr = date.toISOString().split('T')[0];
    
    return filteredBookings.filter(booking => {
      const checkIn = toDate(booking.checkIn);
      const checkOut = toDate(booking.checkOut);
      
      if (!checkIn) return false;
      
      // For experiences/services without checkOut, only show on checkIn date
      if (!checkOut) {
        return checkIn.toISOString().split('T')[0] === dateStr;
      }
      
      // Check if date falls within the booking range (inclusive of check-in, exclusive of check-out)
      const checkInStr = checkIn.toISOString().split('T')[0];
      const checkOutStr = checkOut.toISOString().split('T')[0];
      
      return dateStr >= checkInStr && dateStr < checkOutStr;
    });
  };

  // Get category icon
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'home': return FaHome;
      case 'experience': return FaStar;
      case 'service': return FaClock;
      default: return FaHome;
    }
  };

  // Get category color
  const getCategoryColor = (category) => {
    switch (category) {
      case 'home': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'experience': return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'service': return 'bg-orange-100 text-orange-700 border-orange-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const calendarDays = getDaysInMonth(selectedDate);

  // Navigation functions
  const nextMonth = () => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1));
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <FaCalendarAlt className="text-emerald-600" />
            Calendar
          </h1>
          <p className="text-gray-600">Manage your listing availability</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView('month')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              view === 'month'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Month View
          </button>
          <button
            onClick={() => setView('list')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              view === 'list'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            List View
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Listing:</label>
          <select
            value={selectedListing}
            onChange={(e) => setSelectedListing(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Listings</option>
            {listings.map(listing => (
              <option key={listing.id} value={listing.id}>
                {listing.title}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Previous month"
          >
            <FaChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <div className="px-4 py-2 text-sm font-semibold text-gray-900 min-w-[150px] text-center">
            {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
          </div>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Next month"
          >
            <FaChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Calendar View */}
      {view === 'month' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-7 border-b border-gray-200">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-3 text-center font-semibold text-gray-700 bg-gray-50 text-sm">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {calendarDays.map((date, index) => {
              const dayBookings = date ? getBookingsForDate(date) : [];
              const isToday = date && date.toDateString() === new Date().toDateString();
              const isPast = date && date < new Date() && !isToday;
              
              return (
                <div
                  key={index}
                  className={`
                    min-h-[120px] border-r border-b border-gray-200 p-2 relative
                    ${date ? 'bg-white' : 'bg-gray-50'}
                    ${isToday ? 'bg-emerald-50 border-emerald-300 border-2' : ''}
                    ${isPast ? 'opacity-60' : ''}
                  `}
                >
                  {date && (
                    <>
                      <div className={`
                        text-sm font-semibold mb-2 flex items-center justify-between
                        ${isToday ? 'text-emerald-700' : isPast ? 'text-gray-400' : 'text-gray-900'}
                      `}>
                        <span>{date.getDate()}</span>
                        {dayBookings.length > 0 && (
                          <span className="text-xs font-normal bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                            {dayBookings.length}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        {dayBookings.slice(0, 3).map((booking, idx) => {
                          const listing = listingsMap[booking.listingId] || {};
                          const category = listing.category || 'home';
                          const CategoryIcon = getCategoryIcon(category);
                          const duration = getBookingDuration(booking);
                          const checkIn = toDate(booking.checkIn);
                          const isCheckInDay = checkIn && checkIn.toISOString().split('T')[0] === date.toISOString().split('T')[0];
                          
                          return (
                            <div
                              key={idx}
                              className={`
                                text-xs px-2 py-1.5 rounded border-l-2 truncate
                                ${getCategoryColor(category)}
                                ${isCheckInDay ? 'font-semibold' : 'opacity-90'}
                              `}
                              title={`${booking.guestName || 'Guest'} - ${booking.listingTitle || 'Listing'} (${duration} ${duration === 1 ? 'day' : 'days'})`}
                            >
                              <div className="flex items-center gap-1.5">
                                <CategoryIcon className="w-2.5 h-2.5 flex-shrink-0" />
                                <span className="truncate">{booking.guestName || 'Guest'}</span>
                                {isCheckInDay && duration > 1 && (
                                  <span className="text-[10px] opacity-75">({duration}d)</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {dayBookings.length > 3 && (
                          <div className="text-xs text-gray-500 font-medium px-2 py-1 bg-gray-100 rounded">
                            +{dayBookings.length - 3} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Legend */}
          <div className="p-4 bg-gray-50 border-t border-gray-200">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <span className="font-semibold text-gray-700">Categories:</span>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-100 text-blue-700 rounded border border-blue-300">
                <FaHome className="w-3 h-3" />
                <span>Home</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-purple-100 text-purple-700 rounded border border-purple-300">
                <FaStar className="w-3 h-3" />
                <span>Experience</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-orange-100 text-orange-700 rounded border border-orange-300">
                <FaClock className="w-3 h-3" />
                <span>Service</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-200">
            {filteredBookings
              .sort((a, b) => {
                const dateA = a.checkIn?.toDate ? a.checkIn.toDate() : new Date(a.checkIn);
                const dateB = b.checkIn?.toDate ? b.checkIn.toDate() : new Date(b.checkIn);
                return dateA - dateB;
              })
              .map((booking, index) => {
                const listing = listingsMap[booking.listingId] || {};
                const category = listing.category || 'home';
                const CategoryIcon = getCategoryIcon(category);
                const duration = getBookingDuration(booking);
                const checkIn = toDate(booking.checkIn);
                const checkOut = toDate(booking.checkOut);
                
                return (
                  <motion.div
                    key={booking.id || index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 hover:bg-gray-50 transition-colors border-l-4"
                    style={{ borderLeftColor: category === 'home' ? '#3b82f6' : category === 'experience' ? '#a855f7' : '#f97316' }}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={`
                          p-3 rounded-lg flex-shrink-0
                          ${category === 'home' ? 'bg-blue-100' : category === 'experience' ? 'bg-purple-100' : 'bg-orange-100'}
                        `}>
                          <CategoryIcon className={`
                            w-5 h-5
                            ${category === 'home' ? 'text-blue-600' : category === 'experience' ? 'text-purple-600' : 'text-orange-600'}
                          `} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-gray-900 truncate">
                              {booking.listingTitle || 'Listing'}
                            </p>
                            <span className={`
                              px-2 py-0.5 rounded text-xs font-medium flex-shrink-0
                              ${getCategoryColor(category)}
                            `}>
                              {category.charAt(0).toUpperCase() + category.slice(1)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            Guest: {booking.guestName || 'Unknown'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 flex-wrap">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Check-in</p>
                          <p className="font-medium text-gray-900 text-sm">
                            {checkIn ? checkIn.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                          </p>
                        </div>
                        {checkOut && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Check-out</p>
                            <p className="font-medium text-gray-900 text-sm">
                              {checkOut.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Duration</p>
                          <p className="font-semibold text-emerald-700">
                            {duration} {duration === 1 ? 'day' : 'days'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Amount</p>
                          <p className="font-semibold text-emerald-700">
                            ₱{(booking.total || booking.totalAmount || 0).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Status</p>
                          <span className={`
                            px-3 py-1 rounded-full text-xs font-medium inline-block
                            ${booking.status === 'confirmed'
                              ? 'bg-emerald-100 text-emerald-700'
                              : booking.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-700'
                              : booking.status === 'completed'
                              ? 'bg-blue-100 text-blue-700'
                              : booking.status === 'cancelled'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                            }
                          `}>
                            {booking.status || 'pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
          </div>

          {filteredBookings.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              <FaCalendarAlt className="text-5xl mx-auto mb-4 text-gray-300" />
              <p>No bookings found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HostCalendar;

