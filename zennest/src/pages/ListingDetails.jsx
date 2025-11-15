// ListingDetails.jsx - Enhanced Version
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getHostProfile, getUserFavorites, toggleFavorite, getOrCreateConversation, updateHostPoints } from '../services/firestoreService';
import useAuth from '../hooks/useAuth';
import SettingsHeader from '../components/SettingsHeader';
import Loading from '../components/Loading';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  FaHeart,
  FaRegHeart,
  FaStar,
  FaMapMarkerAlt,
  FaUsers,
  FaBed,
  FaBath,
  FaWifi,
  FaParking,
  FaSwimmingPool,
  FaUtensils,
  FaTv,
  FaCar,
  FaChevronLeft,
  FaChevronRight,
  FaShare,
  FaCalendar,
  FaCheckCircle,
  FaUser,
  FaPhone,
  FaEnvelope,
  FaGlobe,
  FaClock,
  FaTimes,
  FaShieldAlt,
  FaAward,
  FaMedal,
  FaRegCalendarAlt,
  FaFacebook,
  FaTwitter,
  FaWhatsapp,
  FaLink,
  FaInstagram,
  FaCalendarAlt,
  FaCalendarCheck,
  FaCheck
} from 'react-icons/fa';

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const ListingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [listing, setListing] = useState(null);
  const [host, setHost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingHost, setLoadingHost] = useState(false);
  const [error, setError] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);
  const [nights, setNights] = useState(0);
  const [bounceKey, setBounceKey] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // New state for calendar
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState({ start: null, end: null });
  const [hoverDate, setHoverDate] = useState(null);
  const [calendarMode, setCalendarMode] = useState('checkIn'); // 'checkIn' or 'checkOut'

  // Unavailable dates from listing data and existing bookings
  const [unavailableDates, setUnavailableDates] = useState([]);
  const [bookedDates, setBookedDates] = useState([]); // Dates from existing bookings
  const [reviews, setReviews] = useState([]);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [mapPosition, setMapPosition] = useState([14.5995, 120.9842]); // Default to Manila
  const [mapZoom, setMapZoom] = useState(13);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    cleanliness: 5,
    accuracy: 5,
    communication: 5,
    location: 5,
    checkin: 5,
    value: 5,
    comment: ''
  });

  useEffect(() => {
    const fetchListing = async () => {
      try {
        setLoading(true);
        const listingRef = doc(db, 'listings', id);
        const listingSnap = await getDoc(listingRef);

        if (listingSnap.exists()) {
          const data = listingSnap.data();
          const listingData = {
            id: listingSnap.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
          };
          setListing(listingData);

          // Process reviews
          if (data.reviews && Array.isArray(data.reviews) && data.reviews.length > 0) {
            const processedReviews = data.reviews.map(review => ({
              ...review,
              createdAt: review.createdAt?.toDate 
                ? review.createdAt.toDate() 
                : review.createdAt instanceof Date
                  ? review.createdAt
                  : review.createdAt
                    ? new Date(review.createdAt)
                    : new Date()
            })).sort((a, b) => {
              const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
              const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
              return dateB - dateA; // Most recent first
            });
            setReviews(processedReviews);
            
            // Check if user has reviewed after reviews are loaded
            if (user?.uid) {
              const userHasReviewed = processedReviews.some(review => 
                (review.guestId === user.uid || review.userId === user.uid)
              );
              setHasReviewed(userHasReviewed);
              // Update canReview if we already checked bookings
              if (canReview) {
                setCanReview(!userHasReviewed);
              }
            }
          } else {
            setReviews([]);
          }

          // Convert unavailableDates from Firestore Timestamps to Date objects
          let unavailableDatesArray = [];
          if (data.unavailableDates && Array.isArray(data.unavailableDates)) {
            unavailableDatesArray = data.unavailableDates.map(date => {
              if (date?.toDate) {
                return date.toDate();
              } else if (date instanceof Date) {
                return date;
              } else if (typeof date === 'string') {
                return new Date(date);
              }
              return null;
            }).filter(Boolean);
          }
          console.log('📅 Loaded unavailable dates:', unavailableDatesArray);
          setUnavailableDates(unavailableDatesArray);

          if (listingData.hostId) {
            fetchHostProfile(listingData.hostId);
          }
          
          // Fetch existing bookings for this listing
          if (listingData.id) {
            fetchBookedDates(listingData.id);
            // Check if user can review this listing
            if (user?.uid) {
              checkCanReview(listingData.id, user.uid);
            }
          }

          // Geocode location for map
          if (listingData.location) {
            geocodeLocation(listingData.location);
          }
        } else {
          setError('Listing not found');
        }
      } catch (error) {
        console.error('Error fetching listing:', error);
        setError('Failed to load listing details');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchListing();
    }
  }, [id]);

  useEffect(() => {
    const checkFavorite = async () => {
      if (user?.uid && id) {
        try {
          const result = await getUserFavorites(user.uid);
          if (result.success && result.data) {
            setIsFavorite(result.data.includes(id));
          }
        } catch (error) {
          console.error('Error checking favorite:', error);
        }
      }
    };

    checkFavorite();
  }, [user, id]);

  useEffect(() => {
    if (checkIn && checkOut) {
      const start = new Date(checkIn);
      const end = new Date(checkOut);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setNights(diffDays);
    } else {
      setNights(0);
    }
  }, [checkIn, checkOut]);

  const fetchHostProfile = async (hostId) => {
    try {
      setLoadingHost(true);
      const result = await getHostProfile(hostId);
      if (result.success && result.data) {
        // Add uid to host object for easy access
        setHost({ ...result.data, uid: hostId });
      }
    } catch (error) {
      console.error('Error fetching host profile:', error);
    } finally {
      setLoadingHost(false);
    }
  };

  // Check if user can review this listing (has completed booking)
  const checkCanReview = async (listingId, userId) => {
    try {
      const bookingsRef = collection(db, 'bookings');
      const q = query(
        bookingsRef,
        where('listingId', '==', listingId),
        where('guestId', '==', userId)
      );
      const querySnapshot = await getDocs(q);
      
      let hasCompletedBooking = false;
      
      querySnapshot.forEach((doc) => {
        const booking = doc.data();
        
        // Check if booking is completed (past checkout date or status is completed/confirmed)
        if (booking.status === 'cancelled') return;
        
        if (booking.checkIn && booking.checkOut) {
          const checkOut = booking.checkOut?.toDate 
            ? booking.checkOut.toDate() 
            : new Date(booking.checkOut);
          const now = new Date();
          
          // Booking is completed if checkout date has passed
          if (now > checkOut) {
            hasCompletedBooking = true;
          }
        } else {
          // For services/experiences without dates, check status
          if (booking.status === 'confirmed' || booking.status === 'completed') {
            hasCompletedBooking = true;
          }
        }
      });
      
      // Check if user has already reviewed (check in listing data)
      const listingRef = doc(db, 'listings', listingId);
      const listingSnap = await getDoc(listingRef);
      
      if (listingSnap.exists()) {
        const listingData = listingSnap.data();
        const listingReviews = Array.isArray(listingData.reviews) ? listingData.reviews : [];
        const userHasReviewed = listingReviews.some(review => 
          (review.guestId === userId || review.userId === userId)
        );
        setHasReviewed(userHasReviewed);
        setCanReview(hasCompletedBooking && !userHasReviewed);
      } else {
        setCanReview(hasCompletedBooking);
      }
    } catch (error) {
      console.error('Error checking if user can review:', error);
      setCanReview(false);
    }
  };

  // Fetch existing bookings to mark dates as unavailable
  const fetchBookedDates = async (listingId) => {
    try {
      const bookingsRef = collection(db, 'bookings');
      
      // Try with status filter first
      let querySnapshot;
      try {
        const q = query(
          bookingsRef,
          where('listingId', '==', listingId),
          where('status', 'in', ['pending', 'confirmed', 'reserved'])
        );
        querySnapshot = await getDocs(q);
      } catch (error) {
        // If query fails (e.g., missing index), try without status filter
        console.warn('⚠️ Status filter query failed, fetching all bookings:', error);
        const q = query(
          bookingsRef,
          where('listingId', '==', listingId)
        );
        querySnapshot = await getDocs(q);
      }
      
      const bookedDatesArray = [];
      
      querySnapshot.forEach((doc) => {
        const booking = doc.data();
        // Only include confirmed, pending, or reserved bookings
        if (booking.status && ['pending', 'confirmed', 'reserved'].includes(booking.status)) {
          if (booking.checkIn && booking.checkOut) {
            // Convert Firestore Timestamps to Date objects
            const checkIn = booking.checkIn?.toDate ? booking.checkIn.toDate() : new Date(booking.checkIn);
            const checkOut = booking.checkOut?.toDate ? booking.checkOut.toDate() : new Date(booking.checkOut);
            
            // Add all dates between checkIn and checkOut (inclusive)
            const currentDate = new Date(checkIn);
            currentDate.setHours(0, 0, 0, 0);
            const endDate = new Date(checkOut);
            endDate.setHours(0, 0, 0, 0);
            
            while (currentDate <= endDate) {
              bookedDatesArray.push(new Date(currentDate));
              currentDate.setDate(currentDate.getDate() + 1);
            }
          }
        }
      });
      
      console.log('📅 Loaded booked dates:', bookedDatesArray);
      setBookedDates(bookedDatesArray);
    } catch (error) {
      console.error('Error fetching booked dates:', error);
      // If query fails completely, continue without blocking
      setBookedDates([]);
    }
  };

  const nextImage = () => {
    if (listing?.images && listing.images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % listing.images.length);
    }
  };

  const prevImage = () => {
    if (listing?.images && listing.images.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + listing.images.length) % listing.images.length);
    }
  };

  const handleToggleFavorite = async () => {
    if (!user?.uid) {
      if (window.confirm('Please sign in to save favorites. Would you like to sign in?')) {
        navigate('/login');
      }
      return;
    }

    try {
      setBounceKey(prev => prev + 1); // Trigger animation
      const result = await toggleFavorite(user.uid, id);
      if (result.success) {
        setIsFavorite(!isFavorite);
      } else {
        console.error('Failed to toggle favorite:', result.error);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleShare = () => {
    setShowShareModal(true);
    setLinkCopied(false);
  };

  const shareToFacebook = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
    setShowShareModal(false);
  };

  const shareToInstagram = async () => {
    // Instagram doesn't support direct URL sharing from web
    // Copy link to clipboard for user to paste in Instagram
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      setTimeout(() => {
        setLinkCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = window.location.href;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setLinkCopied(true);
      setTimeout(() => {
        setLinkCopied(false);
      }, 2000);
    }
  };

  const shareToWhatsApp = () => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`${listing?.title || 'Check out this listing!'} - ${window.location.href}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
    setShowShareModal(false);
  };

  const shareToX = () => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(listing?.title || 'Check out this listing!');
    window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank');
    setShowShareModal(false);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      setTimeout(() => {
        setLinkCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = window.location.href;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setLinkCopied(true);
      setTimeout(() => {
        setLinkCopied(false);
      }, 2000);
    }
  };

  const calculateTotal = () => {
    if (!listing) return 0;
    const baseRate = listing.discount > 0 
      ? (listing.rate || 0) * (1 - listing.discount / 100)
      : (listing.rate || 0);
    
    if (listing.category === 'home') {
      return nights > 0 ? baseRate * nights * guests : baseRate;
    }
    return baseRate * guests;
  };

  const handleContactHost = async () => {
    if (!user?.uid) {
      if (window.confirm('Please sign in to contact the host. Would you like to sign in?')) {
        navigate('/login');
      }
      return;
    }

    // Use listing.hostId as fallback if host object doesn't have uid
    const hostId = host?.uid || listing?.hostId;
    
    if (!hostId) {
      alert('Host information not available');
      return;
    }

    if (!listing?.id) {
      alert('Listing information not available');
      return;
    }

    try {
      const result = await getOrCreateConversation(
        user.uid, 
        hostId, 
        listing.id, 
        listing.title || 'Listing'
      );
      if (result.success && result.data?.id) {
        navigate(`/messages/${result.data.id}`);
      } else {
        console.error('Failed to create conversation:', result.error);
        alert('Failed to start conversation. Please try again.');
      }
    } catch (error) {
      console.error('Error contacting host:', error);
      alert('An error occurred. Please try again.');
    }
  };

  // Calendar helper functions
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek, year, month };
  };

  // Helper function to format dates as local YYYY-MM-DD strings (avoids UTC timezone issues)
  // Use this instead of toISOString() when formatting user-selected dates
  const formatLocalDate = (d) => {
    if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper function to normalize dates consistently
  // CRITICAL: This function ensures dates are compared correctly regardless of timezone
  const normalizeDateForComparison = (dateValue) => {
    if (!dateValue) return null;
    
    let date;
    
    // Handle ISO date strings (YYYY-MM-DD format) - parse as local date to avoid timezone issues
    if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      // Parse manually to ensure it's treated as local date, not UTC
      const [year, month, day] = dateValue.split('-').map(Number);
      date = new Date(year, month - 1, day, 0, 0, 0, 0); // Creates date at midnight LOCAL time
    } else if (dateValue instanceof Date) {
      // If it's already a Date object, create a new one to avoid mutating the original
      date = new Date(dateValue);
      // If the date was created from an ISO string, it might be in UTC
      // Check if it's a UTC date and convert to local
      const year = date.getFullYear();
      const month = date.getMonth();
      const day = date.getDate();
      // Recreate as local date to avoid timezone shifts
      date = new Date(year, month, day, 0, 0, 0, 0);
    } else {
      // Try to parse as date string or number
      date = new Date(dateValue);
      // If parsing resulted in a valid date, normalize it
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = date.getMonth();
        const day = date.getDate();
        date = new Date(year, month, day, 0, 0, 0, 0);
      }
    }
    
    // Final validation
    if (isNaN(date.getTime())) {
      console.warn('⚠️ Invalid date value:', dateValue);
      return null;
    }
    
    return date;
  };

  const isDateUnavailable = (date) => {
    const normalizedDate = normalizeDateForComparison(date);
    
    // Check host-marked unavailable dates
    if (unavailableDates && unavailableDates.length > 0) {
      const isHostUnavailable = unavailableDates.some(unavailableDate => {
        const normalizedUnavailable = normalizeDateForComparison(unavailableDate);
        return normalizedUnavailable.getTime() === normalizedDate.getTime();
      });
      
      if (isHostUnavailable) return true;
    }
    
    // Check booked dates
    if (bookedDates && bookedDates.length > 0) {
      return bookedDates.some(bookedDate => {
        const normalizedBooked = normalizeDateForComparison(bookedDate);
        return normalizedBooked.getTime() === normalizedDate.getTime();
      });
    }
    
    return false;
  };
  
  // Check if any date in a range is unavailable
  // Note: Check-out date is excluded (you check out on that day, so you don't sleep there that night)
  const hasUnavailableDatesInRange = (startDate, endDate) => {
    if (!startDate || !endDate) {
      console.log('📅 Missing start or end date');
      return false;
    }
    
    const start = normalizeDateForComparison(startDate);
    const end = normalizeDateForComparison(endDate);
    
    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      console.error('📅 Invalid date format:', { startDate, endDate });
      return false;
    }
    
    // Check-out date should be after check-in date
    if (end <= start) {
      console.log('📅 Check-out date must be after check-in date');
      return false;
    }
    
    // Check each day in the range (EXCLUDING check-out date)
    // For example: check-in Nov 25, check-out Nov 27 means you stay Nov 25 and Nov 26
    // So we only check Nov 25 (check-in) and Nov 26 (night before check-out)
    const datesToCheck = [];
    const currentDate = new Date(start);
    
    while (currentDate < end) { // Use < instead of <= to exclude check-out date
      const normalizedCurrent = normalizeDateForComparison(currentDate);
      datesToCheck.push(normalizedCurrent.toISOString().split('T')[0]);
      
      if (isDateUnavailable(normalizedCurrent)) {
        console.log('❌ Found unavailable date in range:', {
          unavailableDate: normalizedCurrent.toISOString().split('T')[0],
          checkIn: start.toISOString().split('T')[0],
          checkOut: end.toISOString().split('T')[0],
          datesChecked: datesToCheck,
          unavailableDates: unavailableDates.map(d => {
            const normalized = normalizeDateForComparison(d);
            return normalized.toISOString().split('T')[0];
          }),
          bookedDates: bookedDates.map(d => {
            const normalized = normalizeDateForComparison(d);
            return normalized.toISOString().split('T')[0];
          })
        });
        return true;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    console.log('✅ No unavailable dates in range:', {
      checkIn: start.toISOString().split('T')[0],
      checkOut: end.toISOString().split('T')[0],
      datesChecked: datesToCheck,
      unavailableDates: unavailableDates.map(d => {
        const normalized = normalizeDateForComparison(d);
        return normalized.toISOString().split('T')[0];
      }),
      bookedDates: bookedDates.map(d => {
        const normalized = normalizeDateForComparison(d);
        return normalized.toISOString().split('T')[0];
      })
    });
    return false;
  };

  const isDateInPast = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const isDateInRange = (date) => {
    if (!selectedDates.start || !selectedDates.end) return false;
    // Normalize all dates for accurate comparison
    const normalizedDate = normalizeDateForComparison(date);
    const normalizedStart = normalizeDateForComparison(selectedDates.start);
    const normalizedEnd = normalizeDateForComparison(selectedDates.end);
    
    if (!normalizedDate || !normalizedStart || !normalizedEnd) return false;
    
    // Check if date is between start and end (inclusive)
    return normalizedDate.getTime() >= normalizedStart.getTime() && 
           normalizedDate.getTime() <= normalizedEnd.getTime();
  };

  const isDateInHoverRange = (date) => {
    if (!selectedDates.start || !hoverDate || selectedDates.end) return false;
    // Normalize all dates for accurate comparison
    const normalizedDate = normalizeDateForComparison(date);
    const normalizedStart = normalizeDateForComparison(selectedDates.start);
    const normalizedEnd = normalizeDateForComparison(hoverDate);
    
    if (!normalizedDate || !normalizedStart || !normalizedEnd) return false;
    
    const startTime = normalizedStart.getTime();
    const endTime = normalizedEnd.getTime();
    const dateTime = normalizedDate.getTime();
    
    return dateTime >= Math.min(startTime, endTime) && 
           dateTime <= Math.max(startTime, endTime);
  };

  const handleDateClick = (date) => {
    if (isDateUnavailable(date) || isDateInPast(date)) return;

    // Normalize the clicked date to ensure consistent storage
    const normalizedClickedDate = normalizeDateForComparison(date);
    if (!normalizedClickedDate) {
      console.error('Invalid date clicked:', date);
      return;
    }

    if (calendarMode === 'checkIn' || !selectedDates.start) {
      // Set check-in date (normalized)
      setSelectedDates({ start: normalizedClickedDate, end: null });
      setCheckIn(formatLocalDate(normalizedClickedDate));
      setCalendarMode('checkOut');
      setCheckOut('');
    } else if (calendarMode === 'checkOut') {
      // Normalize the start date for comparison
      const normalizedStart = normalizeDateForComparison(selectedDates.start);
      if (!normalizedStart) {
        console.error('Invalid start date:', selectedDates.start);
        return;
      }
      
      // If clicked date is before start date, make it the new start date
      if (normalizedClickedDate.getTime() < normalizedStart.getTime()) {
        setSelectedDates({ start: normalizedClickedDate, end: null });
        setCheckIn(formatLocalDate(normalizedClickedDate));
        setCheckOut('');
      } else {
        // Check if check-in and check-out are the same date (same day)
        if (normalizedClickedDate.getTime() === normalizedStart.getTime()) {
          alert('Check-out date must be at least 1 day after check-in date. Please select a different check-out date.');
          return;
        }
        
        // Check if any unavailable dates are in the range
        // This only checks dates you'll actually stay (excludes check-out date)
        if (hasUnavailableDatesInRange(normalizedStart, normalizedClickedDate)) {
          alert('Selected range contains unavailable dates. Please select a different range.');
          return;
        }
        
        // Set check-out date (normalized)
        setSelectedDates({ start: normalizedStart, end: normalizedClickedDate });
        setCheckOut(formatLocalDate(normalizedClickedDate));
        setShowCalendar(false);
      }
    }
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    const today = new Date();
    const prevMonthDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    if (prevMonthDate >= new Date(today.getFullYear(), today.getMonth(), 1)) {
      setCurrentMonth(prevMonthDate);
    }
  };

  const formatDateDisplay = (dateString) => {
    if (!dateString) return 'Add date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatReviewDate = (date) => {
    if (!date) return '';
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return '';
    return dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getInitials = (name) => {
    if (!name) return 'G';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const calculateCategoryRatings = () => {
    if (!reviews || reviews.length === 0) return {};
    
    const categories = ['cleanliness', 'accuracy', 'communication', 'location', 'checkin', 'value'];
    const categoryRatings = {};
    
    categories.forEach(category => {
      const ratings = reviews
        .filter(review => review[category] && review[category] > 0)
        .map(review => review[category]);
      
      if (ratings.length > 0) {
        categoryRatings[category] = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
      } else {
        categoryRatings[category] = 0;
      }
    });
    
    return categoryRatings;
  };

  const getCategoryLabel = (category) => {
    const labels = {
      cleanliness: 'Cleanliness',
      accuracy: 'Accuracy',
      communication: 'Communication',
      location: 'Location',
      checkin: 'Check-in',
      value: 'Value'
    };
    return labels[category] || category;
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    
    if (!user?.uid) {
      alert('Please sign in to submit a review');
      return;
    }
    
    if (!reviewForm.comment.trim()) {
      alert('Please write a review comment');
      return;
    }
    
    try {
      setSubmittingReview(true);
      
      // Get user's name
      const userName = user.displayName || user.email?.split('@')[0] || 'Guest';
      
      // Create review object
      const newReview = {
        guestId: user.uid,
        userId: user.uid,
        reviewerName: userName,
        guestName: userName,
        rating: reviewForm.rating,
        overallRating: reviewForm.rating,
        cleanliness: reviewForm.cleanliness,
        accuracy: reviewForm.accuracy,
        communication: reviewForm.communication,
        location: reviewForm.location,
        checkin: reviewForm.checkin,
        value: reviewForm.value,
        comment: reviewForm.comment.trim(),
        text: reviewForm.comment.trim(),
        review: reviewForm.comment.trim(),
        createdAt: Timestamp.now()
      };
      
      // Get current listing data
      const listingRef = doc(db, 'listings', listing.id);
      const listingSnap = await getDoc(listingRef);
      
      if (!listingSnap.exists()) {
        throw new Error('Listing not found');
      }
      
      const currentData = listingSnap.data();
      const currentReviews = Array.isArray(currentData.reviews) ? currentData.reviews : [];
      
      // Check if user already reviewed
      const alreadyReviewed = currentReviews.some(r => 
        (r.guestId === user.uid || r.userId === user.uid)
      );
      
      if (alreadyReviewed) {
        alert('You have already reviewed this listing');
        setHasReviewed(true);
        setCanReview(false);
        setSubmittingReview(false);
        return;
      }
      
      // Add new review
      const updatedReviews = [...currentReviews, newReview];
      
      // Calculate new average rating
      const totalRating = updatedReviews.reduce((sum, r) => sum + (r.rating || r.overallRating || 0), 0);
      const averageRating = updatedReviews.length > 0 ? totalRating / updatedReviews.length : 0;
      
      // Update listing with new review and rating
      await updateDoc(listingRef, {
        reviews: updatedReviews,
        rating: parseFloat(averageRating.toFixed(1)),
        updatedAt: serverTimestamp()
      });
      
      // Award points to host for 5-star review
      if (reviewForm.rating === 5 && listing.hostId) {
        try {
          await updateHostPoints(listing.hostId, 25, 'Received 5-star review');
          console.log('✅ Points awarded to host for 5-star review');
        } catch (pointsError) {
          console.error('Error awarding points for review:', pointsError);
          // Don't fail the review submission if points fail
        }
      }
      
      // Update local state
      const processedNewReview = {
        ...newReview,
        createdAt: new Date()
      };
      setReviews([processedNewReview, ...reviews]);
      setListing(prev => ({
        ...prev,
        rating: parseFloat(averageRating.toFixed(1)),
        reviews: updatedReviews
      }));
      
      // Reset form and close
      setReviewForm({
        rating: 5,
        cleanliness: 5,
        accuracy: 5,
        communication: 5,
        location: 5,
        checkin: 5,
        value: 5,
        comment: ''
      });
      setShowReviewForm(false);
      setCanReview(false);
      setHasReviewed(true);
      
      alert('Thank you for your review!');
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const clearDates = () => {
    setCheckIn('');
    setCheckOut('');
    setSelectedDates({ start: null, end: null });
    setCalendarMode('checkIn');
  };

  // Geocode location string to coordinates
  const geocodeLocation = async (locationString) => {
    try {
      // Use Nominatim (OpenStreetMap) geocoding service
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationString)}&limit=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setMapPosition([lat, lon]);
        setMapZoom(13);
      }
    } catch (error) {
      console.error('Error geocoding location:', error);
      // Keep default position if geocoding fails
    }
  };

  const renderCalendar = () => {
    const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth);
    const days = [];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="aspect-square" />);
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const normalizedDate = normalizeDateForComparison(date);
      const isUnavailable = isDateUnavailable(date);
      const isPast = isDateInPast(date);
      
      // Use normalized date comparison for accurate start/end detection
      const normalizedStart = selectedDates.start ? normalizeDateForComparison(selectedDates.start) : null;
      const normalizedEnd = selectedDates.end ? normalizeDateForComparison(selectedDates.end) : null;
      
      const isStart = normalizedDate && normalizedStart && 
                      normalizedDate.getTime() === normalizedStart.getTime();
      const isEnd = normalizedDate && normalizedEnd && 
                    normalizedDate.getTime() === normalizedEnd.getTime();
      
      const inRange = isDateInRange(date);
      const inHoverRange = isDateInHoverRange(date);
      const isDisabled = isUnavailable || isPast;
      
      // Determine rounded corners for range styling (Airbnb style)
      const prevDay = new Date(date);
      prevDay.setDate(prevDay.getDate() - 1);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      
      const isRangeStart = isStart || (inRange && !isDateInRange(prevDay));
      const isRangeEnd = isEnd || (inRange && !isDateInRange(nextDay));

      days.push(
        <button
          key={day}
          onClick={() => handleDateClick(date)}
          onMouseEnter={() => !isDisabled && setHoverDate(date)}
          onMouseLeave={() => setHoverDate(null)}
          disabled={isDisabled}
          className={`
            relative aspect-square flex items-center justify-center text-sm font-medium
            transition-all duration-150 ease-in-out
            ${isDisabled 
              ? 'text-gray-300 cursor-not-allowed' 
              : 'text-gray-700 hover:bg-gray-100 cursor-pointer'
            }
            ${isStart || isEnd
              ? 'bg-black text-white hover:bg-black font-semibold rounded-full z-10'
              : ''
            }
            ${inRange && !isStart && !isEnd
              ? 'bg-gray-200 text-gray-900'
              : ''
            }
            ${inHoverRange && !isStart && !isEnd && !isDisabled && selectedDates.start && !selectedDates.end
              ? 'bg-gray-100 text-gray-900'
              : ''
            }
            ${isRangeStart && inRange && !isStart
              ? 'rounded-l-full'
              : ''
            }
            ${isRangeEnd && inRange && !isEnd
              ? 'rounded-r-full'
              : ''
            }
          `}
          title={isDisabled ? (isPast ? 'Past date' : 'Unavailable') : ''}
        >
          {day}
          {isUnavailable && !isPast && (
            <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-red-500 rounded-full" />
          )}
        </button>
      );
    }

    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 max-w-md mx-auto">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={prevMonth}
            disabled={currentMonth <= new Date(new Date().getFullYear(), new Date().getMonth(), 1)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <FaChevronLeft className="w-4 h-4 text-gray-700" />
          </button>
          <h3 className="text-base font-semibold text-gray-900">
            {monthNames[month]} {year}
          </h3>
          <button
            type="button"
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <FaChevronRight className="w-4 h-4 text-gray-700" />
          </button>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {days}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 pt-4 mt-4 border-t border-gray-200 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-black" />
            <span className="text-gray-600">Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-gray-200" />
            <span className="text-gray-600">In range</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full relative">
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-red-500 rounded-full" />
            </div>
            <span className="text-gray-600">Unavailable</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-200 mt-4">
          <button
            type="button"
            onClick={clearDates}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
          >
            Clear dates
          </button>
          <button
            type="button"
            onClick={() => setShowCalendar(false)}
            className="flex-1 px-4 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm"
          >
            Done
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <>
        <SettingsHeader />
        <div className="min-h-screen bg-slate-50 pt-20">
          <Loading message="Loading listing details..." size="large" fullScreen={false} className="pt-20" />
        </div>
      </>
    );
  }

  if (error || !listing) {
    return (
      <>
        <SettingsHeader />
        <div className="min-h-screen flex items-center justify-center bg-slate-50 pt-20">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="text-6xl mb-4">😕</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Listing Not Found</h2>
            <p className="text-gray-600 mb-6">{error || 'The listing you\'re looking for doesn\'t exist.'}</p>
            <button
              onClick={() => navigate('/homestays')}
              className="px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium"
            >
              Back to Home Stays
            </button>
          </div>
        </div>
      </>
    );
  }

  const images = listing.images || [];
  const amenities = listing.amenities || [];
  const defaultAmenities = [
    { icon: FaWifi, name: 'WiFi', default: true },
    { icon: FaParking, name: 'Parking', default: true },
    { icon: FaTv, name: 'TV', default: true },
    { icon: FaSwimmingPool, name: 'Pool', default: listing.category === 'home' },
    { icon: FaUtensils, name: 'Kitchen', default: listing.category === 'home' }
  ];

  const allAmenities = [...defaultAmenities.filter(a => a.default), ...amenities.map(a => ({ name: a, default: false }))];
  const topAmenities = allAmenities.slice(0, 5);
  const displayedAmenities = showAllAmenities ? allAmenities : allAmenities.slice(0, 8);

  return (
    <>
      <SettingsHeader />
      <div className="min-h-screen bg-slate-50 pt-16">

        {/* Hero Image Gallery - Larger and More Prominent */}
        <div className="bg-white border-b border-gray-200">
          {images.length > 0 ? (
            <div className="max-w-7xl mx-auto px-0 sm:px-4 lg:px-8 py-0 sm:py-6 relative">
              {/* Desktop Layout - Conditional based on image count */}
              <div className="hidden md:block">
                {images.length === 1 ? (
                  // Single image - full width
                  <div className="rounded-none sm:rounded-2xl overflow-hidden">
                    <button
                      onClick={() => { setCurrentImageIndex(0); setShowImageModal(true); }}
                      className="w-full relative group overflow-hidden"
                    >
                      <img
                        src={images[0]}
                        alt={listing.title}
                        className="w-full h-[500px] object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </button>
                  </div>
                ) : images.length === 2 ? (
                  // Two images - side by side
                  <div className="grid grid-cols-2 gap-2 h-[500px] rounded-none sm:rounded-2xl overflow-hidden">
                    {images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => { setCurrentImageIndex(idx); setShowImageModal(true); }}
                        className="relative group overflow-hidden"
                      >
                        <img
                          src={img}
                          alt={`${listing.title} ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      </button>
                    ))}
                  </div>
                ) : (
                  // Three or more images - grid layout
                  <div className="grid grid-cols-4 grid-rows-2 gap-2 h-[500px] rounded-none sm:rounded-2xl overflow-hidden">
                    {/* Main large image */}
                    <button
                      onClick={() => { setCurrentImageIndex(0); setShowImageModal(true); }}
                      className="col-span-2 row-span-2 relative group overflow-hidden"
                    >
                      <img
                        src={images[0]}
                        alt={listing.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </button>
                    
                    {/* Smaller images - show up to 4 more */}
                    {images.slice(1, 5).map((img, idx) => (
                      <button
                        key={idx + 1}
                        onClick={() => { setCurrentImageIndex(idx + 1); setShowImageModal(true); }}
                        className="relative group overflow-hidden"
                      >
                        <img
                          src={img}
                          alt={`${listing.title} ${idx + 2}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                        {/* Show "+X more" overlay on the last visible thumbnail if there are more images */}
                        {idx === 3 && images.length > 5 && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-semibold text-sm">
                            +{images.length - 5} more
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Mobile Carousel */}
              <div className="md:hidden relative h-[300px] sm:h-[400px] bg-gray-900">
                {images.length === 1 ? (
                  // Single image - no carousel controls
                  <button
                    onClick={() => setShowImageModal(true)}
                    className="w-full h-full relative group"
                  >
                    <img
                      src={images[0]}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  </button>
                ) : (
                  <>
                    <motion.img
                      key={currentImageIndex}
                      src={images[currentImageIndex]}
                      alt={listing.title}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="w-full h-full object-cover"
                    />
                    
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/95 text-gray-800 p-3 rounded-full hover:bg-white shadow-lg z-10"
                    >
                      <FaChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/95 text-gray-800 p-3 rounded-full hover:bg-white shadow-lg z-10"
                    >
                      <FaChevronRight className="w-5 h-5" />
                    </button>
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm font-medium">
                      {currentImageIndex + 1} / {images.length}
                    </div>

                    <button
                      onClick={() => setShowImageModal(true)}
                      className="absolute bottom-4 right-4 bg-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 shadow-lg"
                    >
                      Show all photos
                    </button>
                  </>
                )}
              </div>

              {/* Show all photos button for desktop - only show if more than 1 image */}
              {images.length > 1 && (
                <button
                  onClick={() => setShowImageModal(true)}
                  className="hidden md:block absolute bottom-6 right-6 bg-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-gray-50 shadow-lg border border-gray-300 z-10"
                >
                  Show all {images.length} photos
                </button>
              )}
            </div>
          ) : (
            <div className="h-[400px] bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
              <div className="text-center text-white">
                <FaBed className="w-20 h-20 mx-auto mb-4 opacity-50" />
                <p className="text-xl font-semibold">No images available</p>
              </div>
            </div>
          )}
        </div>

        {/* Main Content Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Title Section with Actions */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 lg:p-8">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                      {listing.title || 'Untitled Listing'}
                    </h1>
                    <div className="flex flex-wrap items-center gap-4 text-gray-600">
                      <div className="flex items-center gap-2">
                        <FaMapMarkerAlt className="text-emerald-600" />
                        <span className="font-medium">{listing.location || 'Location not specified'}</span>
                      </div>
                      {listing.rating > 0 && (
                        <div className="flex items-center gap-2">
                          <FaStar className="text-yellow-400 fill-current" />
                          <span className="font-bold">{listing.rating.toFixed(1)}</span>
                          <span className="text-gray-400">·</span>
                          <span className="underline cursor-pointer hover:text-gray-900">
                            {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleShare}
                      className="flex items-center gap-2 px-4 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors border border-gray-300"
                    >
                      <FaShare className="w-4 h-4" />
                      <span className="hidden sm:inline font-medium">Share</span>
                    </button>
                    <motion.button
                      key={bounceKey}
                      onClick={handleToggleFavorite}
                      animate={{ 
                        scale: [1, 1.2, 0.9, 1.1, 1],
                      }}
                      transition={{ 
                        duration: 0.5,
                        ease: "easeInOut"
                      }}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-colors border ${
                        isFavorite
                          ? 'text-pink-600 bg-pink-50 border-pink-200'
                          : 'text-gray-700 hover:bg-gray-100 border-gray-300'
                      }`}
                    >
                      {isFavorite ? <FaHeart className="w-4 h-4" /> : <FaRegHeart className="w-4 h-4" />}
                      <span className="hidden sm:inline font-medium">
                        {isFavorite ? "Added" : "Favorite"}
                      </span>
                    </motion.button>
                  </div>
                </div>

                {/* Quick Amenities Overview with Icons */}
                {topAmenities.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="flex flex-wrap gap-4">
                      {topAmenities.map((amenity, idx) => {
                        const Icon = amenity.icon || FaCheckCircle;
                        return (
                          <div key={idx} className="flex items-center gap-2 text-gray-700">
                            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                              <Icon className="w-4 h-4 text-emerald-600" />
                            </div>
                            <span className="font-medium text-sm">{amenity.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Booking Card - Shown early on mobile */}
              <div className="lg:hidden">
                <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-5 mb-6">
                  {/* Pricing Header */}
                  <div className="mb-6 pb-6 border-b-2 border-gray-200">
                    {listing.discount > 0 ? (
                      <div>
                        <div className="flex items-baseline gap-2 mb-2">
                          <span className="text-2xl font-semibold text-gray-900">
                            ₱{((listing.rate || 0) * (1 - listing.discount / 100)).toFixed(0).toLocaleString()}
                          </span>
                          <span className="text-base text-gray-400 line-through font-medium">
                            ₱{(listing.rate || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-gradient-to-r from-red-500 to-red-600 text-white px-2.5 py-1 rounded-full text-xs font-semibold">
                            {listing.discount}% OFF
                          </span>
                          <span className="text-sm text-gray-600 font-medium">
                            {listing.category === 'service' 
                              ? listing.promo || 'per session'
                              : listing.category === 'experience'
                              ? listing.promo || 'per person'
                              : 'per night'
                            }
                          </span>
                        </div>
                        {listing.category === 'home' && nights > 0 && (
                          <p className="text-xs text-gray-500">
                            ₱{((listing.rate || 0) * (1 - listing.discount / 100)).toFixed(0).toLocaleString()} x {nights} {nights === 1 ? 'night' : 'nights'}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-baseline gap-2 mb-2">
                          <span className="text-2xl font-semibold text-gray-900">
                            ₱{(listing.rate || 0).toLocaleString()}
                          </span>
                          <span className="text-sm text-gray-600 font-medium">
                            {listing.category === 'service' 
                              ? listing.promo || 'per session'
                              : listing.category === 'experience'
                              ? listing.promo || 'per person'
                              : 'per night'
                            }
                          </span>
                        </div>
                        {listing.category === 'home' && nights > 0 && (
                          <p className="text-xs text-gray-500">
                            ₱{(listing.rate || 0).toLocaleString()} x {nights} {nights === 1 ? 'night' : 'nights'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Booking Form */}
                  <div className="space-y-4 mb-6">
                    {listing.category === 'home' ? (
                      <>
                        <div className="relative">
                          <button
                            onClick={() => {
                              setShowCalendar(!showCalendar);
                              setCalendarMode('checkIn');
                            }}
                            className="w-full border-2 border-gray-300 rounded-xl p-4 hover:border-emerald-500 focus:border-emerald-500 transition-colors text-left"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                                  Check-in → Checkout
                                </label>
                                <div className="flex items-center gap-2 text-sm text-gray-900 font-medium">
                                  <FaCalendarCheck className="text-emerald-600" />
                                  <span>
                                    {checkIn && checkOut
                                      ? `${formatDateDisplay(checkIn)} - ${formatDateDisplay(checkOut)}`
                                      : checkIn
                                      ? `${formatDateDisplay(checkIn)} - Add checkout`
                                      : 'Select your dates'
                                    }
                                  </span>
                                </div>
                              </div>
                              <FaChevronRight className={`text-gray-400 transition-transform ${showCalendar ? 'rotate-90' : ''}`} />
                            </div>
                            {nights > 0 && (
                              <p className="text-xs text-gray-500 mt-2">
                                {nights} {nights === 1 ? 'night' : 'nights'}
                              </p>
                            )}
                          </button>

                          {/* Calendar Dropdown */}
                          <AnimatePresence>
                            {showCalendar && (
                              <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute top-full left-0 right-0 mt-2 z-50"
                              >
                                {renderCalendar()}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        <div className="border-2 border-gray-300 rounded-xl p-4 hover:border-emerald-500 focus-within:border-emerald-500 transition-colors">
                          <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                            Guests
                          </label>
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => setGuests(Math.max(1, guests - 1))}
                              className="w-10 h-10 rounded-full border-2 border-gray-300 hover:border-emerald-500 text-gray-700 font-semibold flex items-center justify-center transition-colors"
                            >
                              −
                            </button>
                            <span className="text-base font-semibold text-gray-900">{guests} {guests === 1 ? 'guest' : 'guests'}</span>
                            <button
                              onClick={() => setGuests(Math.min(listing.guests || 10, guests + 1))}
                              className="w-10 h-10 rounded-full border-2 border-gray-300 hover:border-emerald-500 text-gray-700 font-semibold flex items-center justify-center transition-colors"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {listing.category === 'experience' && (
                          <div className="border-2 border-gray-300 rounded-xl p-4 hover:border-emerald-500 focus-within:border-emerald-500 transition-colors">
                            <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                              Date
                            </label>
                            <input
                              type="date"
                              className="w-full text-sm text-gray-900 font-medium focus:outline-none"
                              min={new Date().toISOString().split('T')[0]}
                            />
                          </div>
                        )}
                        <div className="border-2 border-gray-300 rounded-xl p-4 hover:border-emerald-500 focus-within:border-emerald-500 transition-colors">
                          <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                            {listing.category === 'experience' ? 'Participants' : 'Quantity'}
                          </label>
                          <input
                            type="number"
                            min="1"
                            max={listing.guests || 10}
                            value={guests}
                            onChange={(e) => setGuests(parseInt(e.target.value) || 1)}
                            className="w-full text-sm text-gray-900 font-medium focus:outline-none"
                          />
                        </div>
                        {listing.category === 'service' && (
                          <div className="border-2 border-gray-300 rounded-xl p-4 hover:border-emerald-500 focus-within:border-emerald-500 transition-colors">
                            <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                              Date & Time
                            </label>
                            <input
                              type="datetime-local"
                              className="w-full text-sm text-gray-900 font-medium focus:outline-none"
                              min={new Date().toISOString().slice(0, 16)}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Price Breakdown */}
                  {(listing.category === 'home' && nights > 0) || listing.category !== 'home' ? (
                    <div className="mb-6 pb-6 border-b-2 border-gray-200 space-y-3">
                      <div className="flex justify-between text-sm text-gray-700">
                        <span className="underline">
                          ₱{((listing.rate || 0) * (1 - (listing.discount || 0) / 100)).toFixed(0).toLocaleString()} 
                          {listing.category === 'home' ? ` x ${nights} ${nights === 1 ? 'night' : 'nights'}` : ` x ${guests} ${guests === 1 ? 'guest' : 'guests'}`}
                        </span>
                        <span className="font-medium">
                          ₱{(((listing.rate || 0) * (1 - (listing.discount || 0) / 100)) * (listing.category === 'home' ? nights : guests)).toFixed(0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-700">
                        <span className="underline">Service fee</span>
                        <span className="font-medium">₱{Math.round(calculateTotal() * 0.05).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold text-gray-900 pt-3 border-t border-gray-200">
                        <span>Total</span>
                        <span>₱{(calculateTotal() + Math.round(calculateTotal() * 0.05)).toLocaleString()}</span>
                      </div>
                    </div>
                  ) : null}

                  {/* Large Reserve Button */}
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      if (!user?.uid) {
                        if (window.confirm('Please sign in to make a reservation. Would you like to sign in?')) {
                          navigate('/login');
                        }
                        return;
                      }
                      
                      // Validate required fields
                      if (listing.category === 'home' && (!checkIn || !checkOut)) {
                        alert('Please select check-in and check-out dates');
                        return;
                      }
                      
                      // Validate that check-in and check-out are not the same date
                      if (listing.category === 'home' && checkIn && checkOut) {
                        // Use normalization function to handle ISO date strings correctly
                        const checkInDate = normalizeDateForComparison(checkIn);
                        const checkOutDate = normalizeDateForComparison(checkOut);
                        
                        if (!checkInDate || !checkOutDate) {
                          alert('Invalid date format. Please select dates again.');
                          return;
                        }
                        
                        if (checkInDate.getTime() === checkOutDate.getTime()) {
                          alert('Check-out date must be at least 1 day after check-in date. Please select different dates.');
                          return;
                        }
                        
                        // Check if check-out is before or equal to check-in
                        if (checkOutDate <= checkInDate) {
                          alert('Check-out date must be after check-in date. Please select different dates.');
                          return;
                        }
                        
                        // Validate that selected dates don't include unavailable dates
                        // Only checks check-in date and nights before check-out (excludes check-out date)
                        if (hasUnavailableDatesInRange(checkIn, checkOut)) {
                          alert('Your selected dates include unavailable dates. Please select different dates.');
                          return;
                        }
                      }
                      
                      // Validate listing ID exists
                      if (!listing?.id) {
                        console.error('Listing ID is missing:', listing);
                        alert('Listing information is incomplete. Please refresh the page and try again.');
                        return;
                      }
                      
                      // Prepare booking data
                      const bookingDataToPass = {
                        listingId: listing.id,
                        checkIn: checkIn || null,
                        checkOut: checkOut || null,
                        guests: guests || 1,
                        nights: nights || 0,
                        category: listing.category || 'home'
                      };
                      
                      console.log('🚀 Navigating to payment with booking data:', bookingDataToPass);
                      
                      // Store in sessionStorage as backup (in case state is lost)
                      try {
                        sessionStorage.setItem('bookingData', JSON.stringify(bookingDataToPass));
                        console.log('✅ Stored booking data in sessionStorage');
                      } catch (error) {
                        console.error('❌ Failed to store booking data in sessionStorage:', error);
                      }
                      
                      // Navigate to payment page with booking data
                      navigate('/payment', {
                        state: {
                          bookingData: bookingDataToPass
                        }
                      });
                    }}
                    type="button"
                    className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white py-3.5 rounded-xl font-semibold text-sm transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] mb-3"
                  >
                    {listing.category === 'service' && 'Book Service'}
                    {listing.category === 'experience' && 'Book Experience'}
                    {listing.category === 'home' && 'Reserve'}
                    {!listing.category && 'Reserve'}
                  </button>

                  <p className="text-center text-xs text-gray-600 font-medium mb-4">
                    You won't be charged yet
                  </p>

                  {/* Trust Indicators */}
                  <div className="space-y-3 pt-4 border-t border-gray-200">
                    <div className="flex items-start gap-3">
                      <FaCalendar className="text-emerald-600 mt-1 flex-shrink-0 text-base" />
                      <div>
                        <p className="font-semibold text-gray-900 text-xs">Free cancellation</p>
                        <p className="text-xs text-gray-600">Cancel before check-in for a full refund</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <FaCheckCircle className="text-emerald-600 mt-1 flex-shrink-0 text-base" />
                      <div>
                        <p className="font-semibold text-gray-900 text-xs">Instant confirmation</p>
                        <p className="text-xs text-gray-600">Your booking is confirmed immediately</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <FaShieldAlt className="text-emerald-600 mt-1 flex-shrink-0 text-base" />
                      <div>
                        <p className="font-semibold text-gray-900 text-xs">Secure payment</p>
                        <p className="text-xs text-gray-600">Your payment information is protected</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Report Listing Card - Mobile */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center mb-6">
                  <button className="text-gray-600 hover:text-gray-900 text-sm font-medium underline">
                    Report this listing
                  </button>
                </div>
              </div>

              {/* Property Details Section */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 lg:p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
                    <FaBed className="w-4 h-4 text-emerald-600" />
                  </div>
                  Property Highlights
                </h2>
                
                {(() => {
                  const isService = listing.category === 'service';
                  const isExperience = listing.category === 'experience';
                  const isHome = listing.category === 'home';

                  if (isHome) {
                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                        {listing.guests > 0 && (
                          <div className="text-center p-4 bg-slate-50 rounded-xl">
                            <FaUsers className="w-8 h-8 text-emerald-600 mx-auto mb-3" />
                            <p className="text-xl font-bold text-gray-900 mb-1">{listing.guests}</p>
                            <p className="text-xs text-gray-600 font-medium">Guests</p>
                          </div>
                        )}
                        {listing.bedrooms > 0 && (
                          <div className="text-center p-4 bg-slate-50 rounded-xl">
                            <FaBed className="w-8 h-8 text-emerald-600 mx-auto mb-3" />
                            <p className="text-xl font-bold text-gray-900 mb-1">{listing.bedrooms}</p>
                            <p className="text-xs text-gray-600 font-medium">Bedrooms</p>
                          </div>
                        )}
                        {listing.bathrooms > 0 && (
                          <div className="text-center p-4 bg-slate-50 rounded-xl">
                            <FaBath className="w-8 h-8 text-emerald-600 mx-auto mb-3" />
                            <p className="text-xl font-bold text-gray-900 mb-1">{listing.bathrooms}</p>
                            <p className="text-xs text-gray-600 font-medium">Bathrooms</p>
                          </div>
                        )}
                        <div className="text-center p-4 bg-slate-50 rounded-xl">
                          <div className="w-8 h-8 bg-emerald-600 rounded-full mx-auto mb-3 flex items-center justify-center">
                            <span className="text-white text-sm font-bold">
                              {listing.category?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-900 font-bold mb-1 capitalize">{listing.category}</p>
                          <p className="text-xs text-gray-600 font-medium">Category</p>
                        </div>
                      </div>
                    );
                  }

                  if (isService || isExperience) {
                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                        {listing.guests > 0 && (
                          <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl">
                            <FaUsers className="w-8 h-8 text-emerald-600 mx-auto mb-3" />
                            <p className="text-2xl font-bold text-gray-900 mb-1">{listing.guests}</p>
                            <p className="text-sm text-gray-600 font-medium">Max Guests</p>
                          </div>
                        )}
                        {listing.promo && (
                          <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl">
                            <FaClock className="w-8 h-8 text-emerald-600 mx-auto mb-3" />
                            <p className="text-base font-bold text-gray-900 mb-1">{listing.promo}</p>
                            <p className="text-xs text-gray-600 font-medium">Duration</p>
                          </div>
                        )}
                        {listing.rating > 0 && (
                          <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl">
                            <FaStar className="w-8 h-8 text-yellow-400 fill-current mx-auto mb-3" />
                            <p className="text-xl font-bold text-gray-900 mb-1">{listing.rating.toFixed(1)}</p>
                            <p className="text-xs text-gray-600 font-medium">Rating</p>
                          </div>
                        )}
                      </div>
                    );
                  }

                  return null;
                })()}
              </div>

              {/* Description Section */}
              {listing.description && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 lg:p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">About this place</h2>
                  <p className="text-gray-700 leading-relaxed text-base whitespace-pre-line">
                    {listing.description}
                  </p>
                </div>
              )}

              {/* Full Amenities Section */}
              {displayedAmenities.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 lg:p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">What this place offers</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {displayedAmenities.map((amenity, idx) => {
                      const Icon = amenity.icon || FaCheckCircle;
                      return (
                        <div key={idx} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-5 h-5 text-emerald-600" />
                          </div>
                          <span className="text-gray-900 font-medium text-base">{amenity.name}</span>
                        </div>
                      );
                    })}
                  </div>
                  {allAmenities.length > 8 && (
                    <button
                      onClick={() => setShowAllAmenities(!showAllAmenities)}
                      className="mt-6 px-6 py-3 border-2 border-gray-900 text-gray-900 rounded-xl font-semibold hover:bg-gray-900 hover:text-white transition-colors"
                    >
                      {showAllAmenities ? 'Show less' : `Show all ${allAmenities.length} amenities`}
                    </button>
                  )}
                </div>
              )}

              {/* Host Profile Section - Enhanced */}
              {host && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 lg:p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Meet your host</h2>
                  
                  <div className="flex flex-col sm:flex-row gap-6 mb-6 pb-6 border-b border-gray-200">
                    <div className="flex-shrink-0 text-center sm:text-left">
                      {host.profilePicture ? (
                        <img
                          src={host.profilePicture}
                          alt={`${host.firstName || ''} ${host.lastName || ''}`.trim() || 'Host'}
                          className="w-32 h-32 rounded-2xl object-cover border-4 border-emerald-200 shadow-lg mx-auto sm:mx-0"
                        />
                      ) : (
                        <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg mx-auto sm:mx-0">
                          {host.firstName && host.lastName ? (
                            <span>
                              {host.firstName.charAt(0).toUpperCase()}
                              {host.lastName.charAt(0).toUpperCase()}
                            </span>
                          ) : (
                            <FaUser className="w-14 h-14" />
                          )}
                        </div>
                      )}
                      
                      {/* Host Badges */}
                      <div className="mt-4 space-y-2">
                        {host.subscriptionStatus === 'active' && (
                          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-bold border-2 border-emerald-200">
                            <FaShieldAlt className="w-3 h-3" />
                            <span>Verified Host</span>
                          </div>
                        )}
                        {host.totalEarnings > 50000 && (
                          <div className="inline-flex items-center gap-2 bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-full text-xs font-bold border-2 border-yellow-200">
                            <FaAward className="w-3 h-3" />
                            <span>Superhost</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {host.firstName && host.lastName 
                          ? `${host.firstName} ${host.lastName}`
                          : host.email?.split('@')[0] || 'Host'
                        }
                      </h3>
                      
                      {host.createdAt && (
                        <p className="text-gray-600 mb-4">
                          Host since {host.createdAt?.toDate 
                            ? host.createdAt.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
                            : host.createdAt instanceof Date
                              ? host.createdAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
                              : 'Recently'
                          }
                        </p>
                      )}

                      {host.bio && (
                        <p className="text-gray-700 leading-relaxed mb-4">
                          {host.bio}
                        </p>
                      )}

                      {/* Host Stats */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-slate-50 rounded-xl p-3">
                          <p className="text-2xl font-bold text-emerald-600 mb-1">
                            {reviews.length}
                          </p>
                          <p className="text-xs text-gray-500 mb-1 font-medium">Reviews</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-3">
                          <p className="text-2xl font-bold text-emerald-600 mb-1">
                            {listing.rating > 0 ? listing.rating.toFixed(1) : '0.0'}
                          </p>
                          <p className="text-xs text-gray-500 mb-1 font-medium">Rating</p>
                        </div>
                      </div>

                      <button 
                        onClick={handleContactHost}
                        className="w-full px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors shadow-md"
                      >
                        Contact Host
                      </button>
                    </div>
                  </div>

                  {/* Contact Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {host.email && (
                      <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
                        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                          <FaEnvelope className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500 mb-1 font-medium">Email</p>
                          <a 
                            href={`mailto:${host.email}`}
                            className="text-gray-900 font-medium hover:text-emerald-600 transition-colors break-all"
                          >
                            {host.email}
                          </a>
                        </div>
                      </div>
                    )}

                    {host.phone && (
                      <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
                        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                          <FaPhone className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500 mb-1 font-medium">Phone</p>
                          <a 
                            href={`tel:${host.phone}`}
                            className="text-gray-900 font-medium hover:text-emerald-600 transition-colors"
                          >
                            {host.phone}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Reviews Section */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 lg:p-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                    <FaStar className="text-yellow-400 fill-current" />
                    {listing.rating > 0 ? listing.rating.toFixed(1) : reviews.length > 0 ? '0.0' : '0.0'} · {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                  </h2>
                  {canReview && !showReviewForm && (
                    <button
                      onClick={() => setShowReviewForm(true)}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold text-sm"
                    >
                      Write a Review
                    </button>
                  )}
                  {hasReviewed && (
                    <span className="text-sm text-gray-500 font-medium">You've already reviewed this listing</span>
                  )}
                </div>

                {/* Review Form */}
                {showReviewForm && canReview && (
                  <div className="mb-8 p-6 bg-emerald-50 rounded-xl border-2 border-emerald-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Write a Review</h3>
                    <form onSubmit={handleReviewSubmit} className="space-y-4">
                      {/* Overall Rating */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Overall Rating *</label>
                        <div className="flex items-center gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setReviewForm(prev => ({ ...prev, rating: star }))}
                              className="focus:outline-none"
                            >
                              <FaStar 
                                className={`w-8 h-8 transition-colors ${
                                  star <= reviewForm.rating 
                                    ? 'text-yellow-400 fill-current' 
                                    : 'text-gray-300'
                                }`}
                              />
                            </button>
                          ))}
                          <span className="ml-2 text-sm font-medium text-gray-700">{reviewForm.rating} / 5</span>
                        </div>
                      </div>

                      {/* Category Ratings */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {['cleanliness', 'accuracy', 'communication', 'location', 'checkin', 'value'].map((category) => (
                          <div key={category}>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {getCategoryLabel(category)}
                            </label>
                            <div className="flex items-center gap-2">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => setReviewForm(prev => ({ ...prev, [category]: star }))}
                                  className="focus:outline-none"
                                >
                                  <FaStar 
                                    className={`w-5 h-5 transition-colors ${
                                      star <= reviewForm[category] 
                                        ? 'text-yellow-400 fill-current' 
                                        : 'text-gray-300'
                                    }`}
                                  />
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Comment */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Your Review *</label>
                        <textarea
                          value={reviewForm.comment}
                          onChange={(e) => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                          placeholder="Share your experience with this listing..."
                          rows={5}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-emerald-500 focus:outline-none resize-none"
                          required
                        />
                      </div>

                      {/* Submit Buttons */}
                      <div className="flex gap-3 pt-2">
                        <button
                          type="submit"
                          disabled={submittingReview}
                          className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {submittingReview ? 'Submitting...' : 'Submit Review'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowReviewForm(false);
                            setReviewForm({
                              rating: 5,
                              cleanliness: 5,
                              accuracy: 5,
                              communication: 5,
                              location: 5,
                              checkin: 5,
                              value: 5,
                              comment: ''
                            });
                          }}
                          disabled={submittingReview}
                          className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {reviews.length > 0 ? (
                  <>
                    {/* Rating Breakdown */}
                    {(() => {
                      const categoryRatings = calculateCategoryRatings();
                      const categories = ['cleanliness', 'accuracy', 'communication', 'location', 'checkin', 'value'];
                      const categoriesWithRatings = categories.filter(cat => categoryRatings[cat] > 0);
                      
                      if (categoriesWithRatings.length === 0) return null;
                      
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                          {categoriesWithRatings.map((category) => {
                            const rating = categoryRatings[category];
                            const percentage = (rating / 5) * 100;
                            return (
                              <div key={category} className="flex items-center gap-3">
                                <span className="text-sm font-medium text-gray-700 w-32">{getCategoryLabel(category)}</span>
                                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-emerald-600 rounded-full transition-all"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <span className="text-sm font-bold text-gray-900 w-8">{rating.toFixed(1)}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}

                    {/* Reviews List */}
                    <div className="space-y-4">
                      {(showAllReviews ? reviews : reviews.slice(0, 3)).map((review, idx) => {
                        const reviewerName = review.reviewerName || review.guestName || 'Guest';
                        const rating = review.rating || review.overallRating || 5;
                        const comment = review.comment || review.text || review.review || '';
                        const reviewDate = review.createdAt;
                        
                        return (
                          <div key={idx} className="border-t border-gray-200 pt-6 first:border-0 first:pt-0">
                            <div className="flex items-start gap-4 mb-3">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                                {reviewerName ? getInitials(reviewerName) : 'G'}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <h4 className="font-bold text-gray-900">{reviewerName}</h4>
                                  <span className="text-sm text-gray-500">{formatReviewDate(reviewDate)}</span>
                                </div>
                                <div className="flex items-center gap-1 mb-2">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <FaStar 
                                      key={star} 
                                      className={`w-3 h-3 ${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                                    />
                                  ))}
                                </div>
                                {comment && (
                                  <p className="text-gray-700 leading-relaxed">{comment}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {reviews.length > 3 && (
                      <button 
                        onClick={() => setShowAllReviews(!showAllReviews)}
                        className="mt-6 px-6 py-3 border-2 border-gray-900 text-gray-900 rounded-xl font-semibold hover:bg-gray-900 hover:text-white transition-colors"
                      >
                        {showAllReviews ? 'Show less' : `Show all ${reviews.length} reviews`}
                      </button>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <FaStar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No reviews yet</h3>
                    <p className="text-gray-600">Be the first to review this listing!</p>
                  </div>
                )}
              </div>

              {/* Location Section */}
              {listing.location && listing.location.trim() && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 lg:p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Where you'll be</h2>
                  <div className="rounded-xl overflow-hidden border-2 border-gray-200 mb-4" style={{ height: '450px', zIndex: 0 }}>
                    <MapContainer
                      center={mapPosition}
                      zoom={mapZoom}
                      style={{ height: '100%', width: '100%' }}
                      scrollWheelZoom={true}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <Marker position={mapPosition}>
                        <Popup>
                          <div className="text-center">
                            <p className="font-semibold text-gray-900">{listing.title}</p>
                            <p className="text-sm text-gray-600">{listing.location}</p>
                          </div>
                        </Popup>
                      </Marker>
                    </MapContainer>
                  </div>
                  <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <FaMapMarkerAlt className="text-emerald-600 text-xl" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 mb-1 text-base">{listing.location}</p>
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${mapPosition[0]}&mlon=${mapPosition[1]}&zoom=${mapZoom}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 hover:text-emerald-700 font-semibold inline-flex items-center gap-2"
                      >
                        Open in OpenStreetMap
                        <span>→</span>
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Things to Know Section */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 lg:p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Things to know</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h3 className="font-bold text-gray-900 mb-3 text-base">House rules</h3>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-start gap-2">
                        <FaCheckCircle className="text-emerald-600 mt-1 flex-shrink-0" />
                        <span>Check-in: After 2:00 PM</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <FaCheckCircle className="text-emerald-600 mt-1 flex-shrink-0" />
                        <span>Checkout: 11:00 AM</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <FaCheckCircle className="text-emerald-600 mt-1 flex-shrink-0" />
                        <span>Self check-in available</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-3 text-base">Safety & property</h3>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-start gap-2">
                        <FaCheckCircle className="text-emerald-600 mt-1 flex-shrink-0" />
                        <span>Security cameras on property</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <FaCheckCircle className="text-emerald-600 mt-1 flex-shrink-0" />
                        <span>Smoke alarm installed</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <FaCheckCircle className="text-emerald-600 mt-1 flex-shrink-0" />
                        <span>Carbon monoxide alarm</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-3 text-base">Cancellation policy</h3>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-start gap-2">
                        <FaCheckCircle className="text-emerald-600 mt-1 flex-shrink-0" />
                        <span>Free cancellation before check-in</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <FaCheckCircle className="text-emerald-600 mt-1 flex-shrink-0" />
                        <span>Full refund available</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div> {/* <-- This was missing the closing > */}

            {/* Right Column - Enhanced Booking Card (Sticky) - Desktop Only */}
            <div className="hidden lg:block lg:col-span-1">
              <div className="sticky top-24 space-y-4">
                {/* Main Booking Card */}
                <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-5 lg:p-6">
                  {/* Pricing Header */}
                  <div className="mb-6 pb-6 border-b-2 border-gray-200">
                    {listing.discount > 0 ? (
                      <div>
                        <div className="flex items-baseline gap-2 mb-2">
                          <span className="text-2xl font-semibold text-gray-900">
                            ₱{((listing.rate || 0) * (1 - listing.discount / 100)).toFixed(0).toLocaleString()}
                          </span>
                          <span className="text-base text-gray-400 line-through font-medium">
                            ₱{(listing.rate || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-gradient-to-r from-red-500 to-red-600 text-white px-2.5 py-1 rounded-full text-xs font-semibold">
                            {listing.discount}% OFF
                          </span>
                          <span className="text-sm text-gray-600 font-medium">
                            {listing.category === 'service' 
                              ? listing.promo || 'per session'
                              : listing.category === 'experience'
                              ? listing.promo || 'per person'
                              : 'per night'
                            }
                          </span>
                        </div>
                        {listing.category === 'home' && nights > 0 && (
                          <p className="text-xs text-gray-500">
                            ₱{((listing.rate || 0) * (1 - listing.discount / 100)).toFixed(0).toLocaleString()} x {nights} {nights === 1 ? 'night' : 'nights'}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-baseline gap-2 mb-2">
                          <span className="text-2xl font-semibold text-gray-900">
                            ₱{(listing.rate || 0).toLocaleString()}
                          </span>
                          <span className="text-sm text-gray-600 font-medium">
                            {listing.category === 'service' 
                              ? listing.promo || 'per session'
                              : listing.category === 'experience'
                              ? listing.promo || 'per person'
                              : 'per night'
                            }
                          </span>
                        </div>
                        {listing.category === 'home' && nights > 0 && (
                          <p className="text-xs text-gray-500">
                            ₱{(listing.rate || 0).toLocaleString()} x {nights} {nights === 1 ? 'night' : 'nights'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Booking Form */}
                  <div className="space-y-4 mb-6">
                    {listing.category === 'home' ? (
                      <>
                        <div className="relative">
                          <button
                            onClick={() => {
                              setShowCalendar(!showCalendar);
                              setCalendarMode('checkIn');
                            }}
                            className="w-full border-2 border-gray-300 rounded-xl p-4 hover:border-emerald-500 focus:border-emerald-500 transition-colors text-left"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                                  Check-in → Checkout
                                </label>
                                <div className="flex items-center gap-2 text-sm text-gray-900 font-medium">
                                  <FaCalendarCheck className="text-emerald-600" />
                                  <span>
                                    {checkIn && checkOut
                                      ? `${formatDateDisplay(checkIn)} - ${formatDateDisplay(checkOut)}`
                                      : checkIn
                                      ? `${formatDateDisplay(checkIn)} - Add checkout`
                                      : 'Select your dates'
                                    }
                                  </span>
                                </div>
                              </div>
                              <FaChevronRight className={`text-gray-400 transition-transform ${showCalendar ? 'rotate-90' : ''}`} />
                            </div>
                            {nights > 0 && (
                              <p className="text-xs text-gray-500 mt-2">
                                {nights} {nights === 1 ? 'night' : 'nights'}
                              </p>
                            )}
                          </button>

                          {/* Calendar Dropdown */}
                          <AnimatePresence>
                            {showCalendar && (
                              <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute top-full left-0 right-0 mt-2 z-50"
                              >
                                {renderCalendar()}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        <div className="border-2 border-gray-300 rounded-xl p-4 hover:border-emerald-500 focus-within:border-emerald-500 transition-colors">
                          <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                            Guests
                          </label>
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => setGuests(Math.max(1, guests - 1))}
                              className="w-10 h-10 rounded-full border-2 border-gray-300 hover:border-emerald-500 text-gray-700 font-semibold flex items-center justify-center transition-colors"
                            >
                              −
                            </button>
                            <span className="text-base font-semibold text-gray-900">{guests} {guests === 1 ? 'guest' : 'guests'}</span>
                            <button
                              onClick={() => setGuests(Math.min(listing.guests || 10, guests + 1))}
                              className="w-10 h-10 rounded-full border-2 border-gray-300 hover:border-emerald-500 text-gray-700 font-semibold flex items-center justify-center transition-colors"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {listing.category === 'experience' && (

                          <div className="border-2 border-gray-300 rounded-xl p-4 hover:border-emerald-500 focus-within:border-emerald-500 transition-colors">
                            <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                              Date
                            </label>
                            <input
                              type="date"
                              className="w-full text-sm text-gray-900 font-medium focus:outline-none"
                              min={new Date().toISOString().split('T')[0]}
                            />
                          </div>
                        )}
                        <div className="border-2 border-gray-300 rounded-xl p-4 hover:border-emerald-500 focus-within:border-emerald-500 transition-colors">
                          <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                            {listing.category === 'experience' ? 'Participants' : 'Quantity'}
                          </label>
                          <input
                            type="number"
                            min="1"
                            max={listing.guests || 10}
                            value={guests}
                            onChange={(e) => setGuests(parseInt(e.target.value) || 1)}
                            className="w-full text-sm text-gray-900 font-medium focus:outline-none"
                          />
                        </div>
                        {listing.category === 'service' && (
                          <div className="border-2 border-gray-300 rounded-xl p-4 hover:border-emerald-500 focus-within:border-emerald-500 transition-colors">
                            <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                              Date & Time
                            </label>
                            <input
                              type="datetime-local"
                              className="w-full text-sm text-gray-900 font-medium focus:outline-none"
                              min={new Date().toISOString().slice(0, 16)}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Price Breakdown */}
                  {(listing.category === 'home' && nights > 0) || listing.category !== 'home' ? (
                    <div className="mb-6 pb-6 border-b-2 border-gray-200 space-y-3">
                      <div className="flex justify-between text-sm text-gray-700">
                        <span className="underline">
                          ₱{((listing.rate || 0) * (1 - (listing.discount || 0) / 100)).toFixed(0).toLocaleString()} 
                          {listing.category === 'home' ? ` x ${nights} ${nights === 1 ? 'night' : 'nights'}` : ` x ${guests} ${guests === 1 ? 'guest' : 'guests'}`}
                        </span>
                        <span className="font-medium">
                          ₱{(((listing.rate || 0) * (1 - (listing.discount || 0) / 100)) * (listing.category === 'home' ? nights : guests)).toFixed(0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-700">
                        <span className="underline">Service fee</span>
                        <span className="font-medium">₱{Math.round(calculateTotal() * 0.05).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold text-gray-900 pt-3 border-t border-gray-200">
                        <span>Total</span>
                        <span>₱{(calculateTotal() + Math.round(calculateTotal() * 0.05)).toLocaleString()}</span>
                      </div>
                    </div>
                  ) : null}

                  {/* Large Reserve Button */}
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      if (!user?.uid) {
                        if (window.confirm('Please sign in to make a reservation. Would you like to sign in?')) {
                          navigate('/login');
                        }
                        return;
                      }
                      
                      // Validate required fields
                      if (listing.category === 'home' && (!checkIn || !checkOut)) {
                        alert('Please select check-in and check-out dates');
                        return;
                      }
                      
                      // Validate that check-in and check-out are not the same date
                      if (listing.category === 'home' && checkIn && checkOut) {
                        // Use normalization function to handle ISO date strings correctly
                        const checkInDate = normalizeDateForComparison(checkIn);
                        const checkOutDate = normalizeDateForComparison(checkOut);
                        
                        if (!checkInDate || !checkOutDate) {
                          alert('Invalid date format. Please select dates again.');
                          return;
                        }
                        
                        if (checkInDate.getTime() === checkOutDate.getTime()) {
                          alert('Check-out date must be at least 1 day after check-in date. Please select different dates.');
                          return;
                        }
                        
                        // Check if check-out is before or equal to check-in
                        if (checkOutDate <= checkInDate) {
                          alert('Check-out date must be after check-in date. Please select different dates.');
                          return;
                        }
                        
                        // Validate that selected dates don't include unavailable dates
                        // Only checks check-in date and nights before check-out (excludes check-out date)
                        if (hasUnavailableDatesInRange(checkIn, checkOut)) {
                          alert('Your selected dates include unavailable dates. Please select different dates.');
                          return;
                        }
                      }
                      
                      // Validate listing ID exists
                      if (!listing?.id) {
                        console.error('Listing ID is missing:', listing);
                        alert('Listing information is incomplete. Please refresh the page and try again.');
                        return;
                      }
                      
                      // Prepare booking data
                      const bookingDataToPass = {
                        listingId: listing.id,
                        checkIn: checkIn || null,
                        checkOut: checkOut || null,
                        guests: guests || 1,
                        nights: nights || 0,
                        category: listing.category || 'home'
                      };
                      
                      console.log('🚀 Navigating to payment with booking data:', bookingDataToPass);
                      
                      // Store in sessionStorage as backup (in case state is lost)
                      try {
                        sessionStorage.setItem('bookingData', JSON.stringify(bookingDataToPass));
                        console.log('✅ Stored booking data in sessionStorage');
                      } catch (error) {
                        console.error('❌ Failed to store booking data in sessionStorage:', error);
                      }
                      
                      // Navigate to payment page with booking data
                      navigate('/payment', {
                        state: {
                          bookingData: bookingDataToPass
                        }
                      });
                    }}
                    type="button"
                    className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white py-3.5 rounded-xl font-semibold text-sm transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] mb-3"
                  >
                    {listing.category === 'service' && 'Book Service'}
                    {listing.category === 'experience' && 'Book Experience'}
                    {listing.category === 'home' && 'Reserve'}
                    {!listing.category && 'Reserve'}
                  </button>

                  <p className="text-center text-xs text-gray-600 font-medium mb-4">
                    You won't be charged yet
                  </p>

                  {/* Trust Indicators */}
                  <div className="space-y-3 pt-4 border-t border-gray-200">
                    <div className="flex items-start gap-3">
                      <FaCalendar className="text-emerald-600 mt-1 flex-shrink-0 text-base" />
                      <div>
                        <p className="font-semibold text-gray-900 text-xs">Free cancellation</p>
                        <p className="text-xs text-gray-600">Cancel before check-in for a full refund</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <FaCheckCircle className="text-emerald-600 mt-1 flex-shrink-0 text-base" />
                      <div>
                        <p className="font-semibold text-gray-900 text-xs">Instant confirmation</p>
                        <p className="text-xs text-gray-600">Your booking is confirmed immediately</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <FaShieldAlt className="text-emerald-600 mt-1 flex-shrink-0 text-base" />
                      <div>
                        <p className="font-semibold text-gray-900 text-xs">Secure payment</p>
                        <p className="text-xs text-gray-600">Your payment information is protected</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Report Listing Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
                  <button className="text-gray-600 hover:text-gray-900 text-sm font-medium underline">
                    Report this listing
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Image Modal */}
        <AnimatePresence>
          {showImageModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/95 z-50 overflow-y-auto"
            >
              <div className="min-h-screen p-4 lg:p-8">
                <div className="max-w-6xl mx-auto">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6 sticky top-0 bg-black/50 backdrop-blur-sm p-4 rounded-xl">
                    <h3 className="text-white text-xl font-semibold">
                      {currentImageIndex + 1} / {images.length}
                    </h3>
                    <button
                      onClick={() => setShowImageModal(false)}
                      className="text-white hover:bg-white/10 p-3 rounded-full transition-colors"
                    >
                      <FaTimes className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Main Image */}
                  <div className="relative mb-6">
                    <img
                      src={images[currentImageIndex]}
                      alt={`${listing.title} ${currentImageIndex + 1}`}
                      className="w-full h-auto max-h-[70vh] object-contain rounded-xl"
                    />
                    
                    {images.length > 1 && (
                      <>
                        <button
                          onClick={prevImage}
                          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white text-gray-900 p-4 rounded-full hover:bg-gray-100 shadow-xl"
                        >
                          <FaChevronLeft className="w-6 h-6" />
                        </button>
                        <button
                          onClick={nextImage}
                          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white text-gray-900 p-4 rounded-full hover:bg-gray-100 shadow-xl"
                        >
                          <FaChevronRight className="w-6 h-6" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Thumbnail Grid */}
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                    {images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`aspect-square rounded-lg overflow-hidden border-3 transition-all ${
                          currentImageIndex === idx
                            ? 'border-white ring-2 ring-white'
                            : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img 
                          src={img} 
                          alt={`Thumbnail ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Share Modal */}
        <AnimatePresence>
          {showShareModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowShareModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Share Listing</h3>
                  <button
                    onClick={() => setShowShareModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <FaTimes className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  {/* Facebook */}
                  <button
                    onClick={shareToFacebook}
                    className="flex flex-col items-center gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors group"
                  >
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                      <FaFacebook className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" />
                    </div>
                    <span className="font-medium text-gray-700 group-hover:text-blue-600 text-sm">Facebook</span>
                  </button>

                  {/* Instagram */}
                  <button
                    onClick={shareToInstagram}
                    className="flex flex-col items-center gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-pink-500 hover:bg-pink-50 transition-colors group"
                  >
                    <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center group-hover:bg-pink-500 transition-colors">
                      <FaInstagram className="w-6 h-6 text-pink-600 group-hover:text-white transition-colors" />
                    </div>
                    <span className="font-medium text-gray-700 group-hover:text-pink-600 text-sm">Instagram</span>
                  </button>

                  {/* WhatsApp */}
                  <button
                    onClick={shareToWhatsApp}
                    className="flex flex-col items-center gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 transition-colors group"
                  >
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center group-hover:bg-green-500 transition-colors">
                      <FaWhatsapp className="w-6 h-6 text-green-600 group-hover:text-white transition-colors" />
                    </div>
                    <span className="font-medium text-gray-700 group-hover:text-green-600 text-sm">WhatsApp</span>
                  </button>

                  {/* X (Twitter) */}
                  <button
                    onClick={shareToX}
                    className="flex flex-col items-center gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-gray-900 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-gray-900 transition-colors">
                      <FaTwitter className="w-6 h-6 text-gray-700 group-hover:text-white transition-colors" />
                    </div>
                    <span className="font-medium text-gray-700 group-hover:text-gray-900 text-sm">X</span>
                  </button>
                </div>

                {/* Copy Link Button */}
                <button
                  onClick={copyLink}
                  className={`w-full flex items-center justify-center gap-3 p-4 rounded-xl transition-colors font-semibold ${
                    linkCopied
                      ? 'bg-green-100 text-green-700 border-2 border-green-300'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {linkCopied ? (
                    <>
                      <FaCheck className="w-5 h-5" />
                      <span>Link Copied!</span>
                    </>
                  ) : (
                    <>
                      <FaLink className="w-5 h-5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default ListingDetails;