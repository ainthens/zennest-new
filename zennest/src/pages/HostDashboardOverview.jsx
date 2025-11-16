// src/pages/HostDashboardOverview.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getHostProfile, getHostBookings, getHostListings } from '../services/firestoreService';
import useAuth from '../hooks/useAuth';
import {
  FaHome,
  FaCalendarCheck,
  FaStar,
  FaEye,
  FaChevronRight,
  FaCheckCircle,
  FaClock,
  FaWallet,
  FaArrowUp,
  FaArrowDown,
  FaPlus,
  FaShare,
  FaChartLine
} from 'react-icons/fa';
import { onSnapshot, collection, addDoc, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

const HostDashboardOverview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalListings: 0,
    publishedListings: 0,
    draftListings: 0,
    todayBookings: 0,
    upcomingBookings: 0,
    totalEarnings: 0,
    averageRating: 0,
    totalViews: 0
  });
  const [todayBookings, setTodayBookings] = useState([]);
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Get host profile
      const profileResult = await getHostProfile(user.uid);
      const profile = profileResult.data || {};

      // Get listings
      const listingsResult = await getHostListings(user.uid);
      const listings = listingsResult.data || [];
      
      const publishedListings = listings.filter(l => l.status === 'published');
      const draftListings = listings.filter(l => l.status === 'draft');
      const totalViews = listings.reduce((sum, l) => sum + (l.views || 0), 0);
      
      // NEW: Debug logging to see what's in listings
      console.log('🔍 DEBUG: Total listings:', listings.length);
      listings.forEach((listing, idx) => {
        console.log(`📝 Listing ${idx + 1}:`, {
          id: listing.id,
          title: listing.title,
          hasReviews: !!listing.reviews,
          reviewsType: typeof listing.reviews,
          reviewsIsArray: Array.isArray(listing.reviews),
          reviewsLength: listing.reviews?.length || 0,
          reviews: listing.reviews,
          allKeys: Object.keys(listing)
        });
      });
      
      // Calculate average rating from listing reviews AND bookings
      let totalRatingSum = 0;
      let totalReviewCount = 0;
      
      // Method 1: Check listings.reviews[]
      listings.forEach(listing => {
        if (Array.isArray(listing.reviews) && listing.reviews.length > 0) {
          listing.reviews.forEach(review => {
            if (review.rating && typeof review.rating === 'number') {
              console.log('✅ Found review in listing.reviews:', {
                listingId: listing.id,
                rating: review.rating,
                guestId: review.guestId
              });
              totalRatingSum += review.rating;
              totalReviewCount++;
            }
          });
        }
      });

      // Method 2: Also check bookings for reviews (fallback)
      const bookingsResult = await getHostBookings(user.uid);
      const bookings = bookingsResult.data || [];
      
      console.log('🔍 DEBUG: Total bookings:', bookings.length);
      bookings.forEach((booking, idx) => {
        if (booking.rating && typeof booking.rating === 'number') {
          console.log('✅ Found review in booking:', {
            bookingId: booking.id,
            listingId: booking.listingId,
            rating: booking.rating,
            guestId: booking.guestId
          });
          totalRatingSum += booking.rating;
          totalReviewCount++;
        }
      });
      
      const avgRating = totalReviewCount > 0 ? totalRatingSum / totalReviewCount : 0;
      
      console.log('📊 Rating Calculation:', {
        totalListings: listings.length,
        totalBookings: bookings.length,
        totalReviews: totalReviewCount,
        totalRatingSum,
        averageRating: avgRating
      });

      // Helper function to normalize dates to start of day (local time)
      const normalizeDate = (date) => {
        if (!date) return null;
        
        // Handle Firestore Timestamp
        if (date && typeof date.toDate === 'function') {
          date = date.toDate();
        }
        // Handle date strings (format: "YYYY-MM-DD" or ISO string)
        else if (typeof date === 'string') {
          // If it's in "YYYY-MM-DD" format, parse it carefully to avoid timezone issues
          if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            const [year, month, day] = date.split('-').map(Number);
            // Create Date at midnight in local timezone (month is 0-indexed)
            date = new Date(year, month - 1, day);
          } else {
            // Otherwise, try to parse as ISO string or other format
            date = new Date(date);
          }
        }
        // Handle Date objects
        if (!(date instanceof Date) || isNaN(date.getTime())) {
          return null;
        }
        // Create a new Date object normalized to local midnight
        const year = date.getFullYear();
        const month = date.getMonth();
        const day = date.getDate();
        const normalized = new Date(year, month, day, 0, 0, 0, 0);
        return normalized;
      };
      
      // Get today's date normalized to midnight (local time)
      const today = normalizeDate(new Date());
      
      // Debug: Log bookings and dates
      console.log('📅 Today:', today);
      console.log('📅 All bookings:', bookings.length);
      
      // Filter bookings for today - include confirmed and completed bookings
      const todayBookingsList = bookings.filter(booking => {
        if (!booking.checkIn) {
          return false;
        }
        // Only include confirmed or completed bookings
        if (booking.status !== 'confirmed' && booking.status !== 'completed') {
          return false;
        }
        
        const checkInDate = normalizeDate(booking.checkIn);
        if (!checkInDate || !today) {
          return false;
        }
        
        const isToday = checkInDate.getTime() === today.getTime();
        // Compare dates (both normalized to midnight)
        return isToday;
      });
      
      console.log('📅 Today bookings:', todayBookingsList.length);

      // Filter upcoming bookings - include confirmed and completed bookings
      const upcomingBookingsList = bookings
        .filter(booking => {
          if (!booking.checkIn) return false;
          // Only include confirmed or completed bookings
          if (booking.status !== 'confirmed' && booking.status !== 'completed') {
            return false;
          }
          
          const checkInDate = normalizeDate(booking.checkIn);
          if (!checkInDate || !today) return false;
          
          // Check if checkIn is after today
          return checkInDate.getTime() > today.getTime();
        })
        .sort((a, b) => {
          const dateA = normalizeDate(a.checkIn);
          const dateB = normalizeDate(b.checkIn);
          if (!dateA || !dateB) return 0;
          return dateA.getTime() - dateB.getTime(); // Ascending order (earliest first)
        })
        .slice(0, 5);

      const totalEarnings = bookings
        .filter(b => b.status === 'completed' || b.status === 'confirmed')
        .reduce((sum, b) => sum + (b.total || b.totalAmount || 0), 0);

      setStats({
        totalListings: listings.length,
        publishedListings: publishedListings.length,
        draftListings: draftListings.length,
        todayBookings: todayBookingsList.length,
        upcomingBookings: upcomingBookingsList.length,
        totalEarnings: totalEarnings,
        averageRating: avgRating,
        totalReviews: totalReviewCount,
        totalViews: totalViews
      });

      setTodayBookings(todayBookingsList);
      setUpcomingBookings(upcomingBookingsList);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const handleCardClick = (cardTitle) => {
    switch(cardTitle) {
      case 'Published Listings':
      case 'Draft Listings':
        navigate('/host/listings');
        break;
      case 'Today\'s Check-ins':
        navigate('/host/calendar');
        break;
      case 'Total Earnings':
        navigate('/host/payments');
        break;
      case 'Average Rating':
        navigate('/host/listings');
        break;
      case 'Total Views':
        navigate('/host/listings');
        break;
      default:
        break;
    }
  };

  const statCards = [
    {
      title: 'Published Listings',
      value: stats.publishedListings,
      icon: FaHome,
      color: 'emerald',
      bgGradient: 'from-emerald-500 to-emerald-600',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      change: stats.publishedListings > 0 ? { value: '+2', trend: 'up' } : null,
      subtitle: `${stats.draftListings} drafts`,
      cta: stats.publishedListings === 0 ? { text: 'Create Listing', icon: FaPlus, action: () => navigate('/host/listings/new') } : null,
      clickable: true
    },
    {
      title: 'Draft Listings',
      value: stats.draftListings,
      icon: FaClock,
      color: 'yellow',
      bgGradient: 'from-yellow-500 to-amber-600',
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      change: null,
      subtitle: 'Pending completion',
      cta: stats.draftListings > 0 ? { text: 'Complete Drafts', icon: FaChartLine, action: () => navigate('/host/listings') } : null,
      clickable: true
    },
    {
      title: 'Today\'s Check-ins',
      value: stats.todayBookings,
      icon: FaCalendarCheck,
      color: 'blue',
      bgGradient: 'from-blue-500 to-blue-600',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      change: null,
      subtitle: `${stats.upcomingBookings} upcoming`,
      cta: stats.todayBookings === 0 && stats.upcomingBookings === 0 ? { text: 'Boost Visibility', icon: FaShare, action: () => navigate('/host/listings') } : null,
      clickable: true
    },
    {
      title: 'Total Earnings',
      value: `₱${stats.totalEarnings.toLocaleString()}`,
      icon: FaWallet,
      color: 'green',
      bgGradient: 'from-green-500 to-emerald-600',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      change: stats.totalEarnings > 0 ? { value: '+12%', trend: 'up' } : null,
      subtitle: 'This month',
      cta: stats.totalEarnings === 0 ? { text: 'View Payment Settings', icon: FaWallet, action: () => navigate('/host/payments') } : null,
      clickable: true
    },
    {
      title: 'Average Rating',
      value: stats.averageRating > 0 ? stats.averageRating.toFixed(1) : 'N/A',
      icon: FaStar,
      color: 'orange',
      bgGradient: 'from-orange-500 to-orange-600',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      change: stats.averageRating > 4.5 ? { value: '+0.2', trend: 'up' } : stats.averageRating > 0 ? { value: '0.0', trend: 'neutral' } : null,
      subtitle: stats.totalReviews > 0 ? `${stats.totalReviews} review${stats.totalReviews === 1 ? '' : 's'}` : 'No reviews yet',
      cta: stats.averageRating === 0 ? { text: 'Get Your First Review', icon: FaShare, action: () => navigate('/host/listings') } : null,
      clickable: true
    },
    {
      title: 'Total Views',
      value: stats.totalViews,
      icon: FaEye,
      color: 'purple',
      bgGradient: 'from-purple-500 to-purple-600',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      change: stats.totalViews > 100 ? { value: '+24%', trend: 'up' } : stats.totalViews > 0 ? { value: '+5%', trend: 'up' } : null,
      subtitle: 'All listings',
      cta: stats.totalViews === 0 ? { text: 'Share Listing', icon: FaShare, action: () => navigate('/host/listings') } : null,
      clickable: true
    }
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Dashboard Overview</h1>
        <p className="text-xs sm:text-sm text-gray-600">Welcome back! Here's what's happening with your listings.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          const TrendIcon = stat.change?.trend === 'up' ? FaArrowUp : stat.change?.trend === 'down' ? FaArrowDown : null;
          const CtaIcon = stat.cta?.icon;

          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => stat.clickable && handleCardClick(stat.title)}
              className={`bg-white rounded-lg sm:rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-3 sm:p-4 md:p-6 border border-gray-100 hover:border-gray-200 group overflow-hidden relative ${
                stat.clickable ? 'cursor-pointer active:scale-[0.98]' : ''
              }`}
              role={stat.clickable ? 'button' : 'article'}
              tabIndex={stat.clickable ? 0 : undefined}
              onKeyDown={(e) => {
                if (stat.clickable && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  handleCardClick(stat.title);
                }
              }}
              aria-label={`${stat.title}: ${stat.value}. ${stat.clickable ? 'Click for details' : ''}`}
            >
              {/* Decorative gradient background */}
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.bgGradient} opacity-5 rounded-full -mr-16 -mt-16 group-hover:opacity-10 transition-opacity`}></div>
              
              {/* Click indicator */}
              {stat.clickable && (
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <FaChevronRight className="text-gray-400 text-xs" />
                </div>
              )}
              
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2.5 rounded-lg ${stat.iconBg} shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`text-lg ${stat.iconColor}`} />
                  </div>
                  {stat.change && TrendIcon && (
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      stat.change.trend === 'up' 
                        ? 'bg-green-100 text-green-700' 
                        : stat.change.trend === 'down'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {TrendIcon && <TrendIcon className="text-[9px]" />}
                      <span>{stat.change.value}</span>
                    </div>
                  )}
                </div>
                
                <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">{stat.title}</h3>
                <p className="text-2xl font-bold text-gray-900 mb-0.5">{stat.value}</p>
                {stat.subtitle && (
                  <p className="text-[10px] text-gray-500 font-medium">{stat.subtitle}</p>
                )}

                {/* CTA Button for empty states */}
                {stat.cta && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      stat.cta.action();
                    }}
                    className={`mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                      stat.color === 'emerald' || stat.color === 'green'
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                        : stat.color === 'blue'
                        ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                        : stat.color === 'yellow'
                        ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200'
                        : stat.color === 'orange'
                        ? 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200'
                        : stat.color === 'purple'
                        ? 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {CtaIcon && <CtaIcon className="text-xs" />}
                    <span>{stat.cta.text}</span>
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Today's Bookings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FaCheckCircle className="text-emerald-600 text-base" />
            Today's Check-ins
          </h2>
        </div>
        <div className="p-4">
          {todayBookings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FaCalendarCheck className="text-3xl mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium text-gray-700 mb-1">No check-ins scheduled for today</p>
              <p className="text-xs text-gray-500 mb-4">Check your calendar for upcoming bookings</p>
              <button
                onClick={() => navigate('/host/calendar')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <FaCalendarCheck className="text-xs" />
                View Calendar
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {todayBookings.map((booking, index) => (
                <motion.div
                  key={booking.id || index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{booking.guestName || 'Guest'}</p>
                    <p className="text-xs text-gray-600">{booking.listingTitle || 'Listing'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm text-emerald-700">₱{(booking.total || booking.totalAmount || 0).toLocaleString()}</p>
                    <p className="text-[10px] text-gray-500">
                      {booking.checkIn ? (
                        booking.checkIn instanceof Date 
                          ? booking.checkIn.toLocaleDateString() 
                          : booking.checkIn.toDate 
                          ? booking.checkIn.toDate().toLocaleDateString()
                          : new Date(booking.checkIn).toLocaleDateString()
                      ) : 'Today'}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Bookings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FaCalendarCheck className="text-blue-600 text-base" />
            Upcoming Bookings
          </h2>
        </div>
        <div className="p-4">
          {upcomingBookings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FaCalendarCheck className="text-3xl mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium text-gray-700 mb-1">No upcoming bookings</p>
              <p className="text-xs text-gray-500 mb-4">Promote your listings to get more bookings</p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => navigate('/host/listings')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  <FaShare className="text-xs" />
                  Share Listings
                </button>
                <button
                  onClick={() => navigate('/host/listings/new')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FaPlus className="text-xs" />
                  Add Listing
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingBookings.map((booking, index) => (
                <motion.div
                  key={booking.id || index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{booking.guestName || 'Guest'}</p>
                    <p className="text-xs text-gray-600">{booking.listingTitle || 'Listing'}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {booking.checkIn ? (
                        booking.checkIn instanceof Date 
                          ? booking.checkIn.toLocaleDateString() 
                          : booking.checkIn.toDate 
                          ? booking.checkIn.toDate().toLocaleDateString()
                          : new Date(booking.checkIn).toLocaleDateString()
                      ) : ''}
                      {booking.checkIn && booking.checkOut ? ' - ' : ''}
                      {booking.checkOut ? (
                        booking.checkOut instanceof Date 
                          ? booking.checkOut.toLocaleDateString() 
                          : booking.checkOut.toDate 
                          ? booking.checkOut.toDate().toLocaleDateString()
                          : new Date(booking.checkOut).toLocaleDateString()
                      ) : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm text-emerald-700">₱{(booking.total || booking.totalAmount || 0).toLocaleString()}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <FaChevronRight className="text-[10px] text-gray-400" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HostDashboardOverview;

