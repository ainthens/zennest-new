// HomeStays.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getPublishedListings, getUserFavorites, toggleFavorite, getGuestProfile } from "../services/firestoreService";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";
import HomeStayCard from "../components/HomeStayCard";
import Filters from "../components/Filters";
import Hero from "../components/Hero";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import useAuth from "../hooks/useAuth";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FaSearch, FaMapMarkerAlt, FaCalendarAlt, FaUsers } from "react-icons/fa";

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }
  }
};

// Animated component wrappers
const AnimatedSection = ({ children, className = "" }) => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.05,
    rootMargin: "0px 0px -50px 0px"
  });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={fadeInUp}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const AnimatedGrid = ({ children, className = "" }) => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.05,
    rootMargin: "0px 0px -100px 0px"
  });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={staggerContainer}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const AnimatedCard = ({ children, className = "", delay = 0 }) => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.05,
    rootMargin: "0px 0px -50px 0px"
  });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={scaleIn}
      transition={{ duration: 0.3, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const HomeStays = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState([]);
  const [previousBookings, setPreviousBookings] = useState([]);
  const [filters, setFilters] = useState({ location: "", guests: 0, locationSelect: "" });
  const [searchInputs, setSearchInputs] = useState({ location: "", guests: 0 });
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [priceRange, setPriceRange] = useState("all");
  const [favorites, setFavorites] = useState(() => new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // DATE RANGE
  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;

  // ADD THESE MISSING STATES
  const [isSearching, setIsSearching] = useState(false);
  const [suggestedListings, setSuggestedListings] = useState([]);
  const [listingsNearYou, setListingsNearYou] = useState([]);
  const [userProvince, setUserProvince] = useState('');

  // Guests dropdown
  const [showGuestsDropdown, setShowGuestsDropdown] = useState(false);
  const [lockGuestsDropdown, setLockGuestsDropdown] = useState(false);
  const guestsDropdownRef = useRef(null);

  // Small helper to check availability across a range
  const isRangeUnavailable = (list = [], s, e) => {
    if (!s || !e) return false;
    const cur = new Date(s);
    const end = new Date(e);
    while (cur <= end) {
      const d = cur.toISOString().split("T")[0];
      if (list.includes(d)) return true;
      cur.setDate(cur.getDate() + 1);
    }
    return false;
  };

  // Handle URL search params from Hero search (accept both start/end and startDate/endDate)
  useEffect(() => {
    const locationParam = searchParams.get('location');
    const startParam = searchParams.get('start') || searchParams.get('startDate');
    const endParam = searchParams.get('end') || searchParams.get('endDate');
    const guestsParam = searchParams.get('guests');

    const parsedStart = startParam ? new Date(startParam) : null;
    const parsedEnd = endParam ? new Date(endParam) : null;

    if (locationParam || startParam || endParam || guestsParam) {
      setFilters(prev => ({
        ...prev,
        location: locationParam || '',
        guests: guestsParam ? parseInt(guestsParam) : 0,
        startDate: parsedStart,
        endDate: parsedEnd
      }));
      setSearchInputs({
        location: locationParam || '',
        guests: guestsParam ? parseInt(guestsParam) : 0
      });
      if (parsedStart || parsedEnd) {
        setDateRange([parsedStart, parsedEnd]);
      }
    }
  }, [searchParams]);

  // Real-time search: whenever inputs or date range change, update filters and search mode
  // MODIFIED: Don't run when guests dropdown is locked
  useEffect(() => {
    if (lockGuestsDropdown) return; // Skip when dropdown is open
    
    const [s, e] = dateRange;
    setFilters(prev => ({
      ...prev,
      location: (searchInputs.location || "").trim(),
      guests: Number(searchInputs.guests || 0),
      startDate: s || null,
      endDate: e || null
    }));

    setIsSearching(
      (searchInputs.location?.trim() !== "") ||
      (Number(searchInputs.guests) > 0) ||
      (s && e)
    );

    setCurrentPage(1);
  }, [searchInputs, dateRange, lockGuestsDropdown]);

  // Close guests dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (guestsDropdownRef.current && !guestsDropdownRef.current.contains(event.target)) {
        setShowGuestsDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch user profile to get province
  useEffect(() => {
    const fetchUserProvince = async () => {
      if (!user?.uid) {
        console.log('ℹ️ No user found - skipping province fetch');
        return;
      }

      try {
        console.log('🔍 Fetching user province for user:', user.uid);
        const result = await getGuestProfile(user.uid);
        console.log('📋 getGuestProfile result:', result);
        
        if (result.success && result.data) {
          const province = (result.data.province || '').trim();
          console.log('📍 User province from profile:', province);
          if (province) {
            setUserProvince(province);
            console.log('✅ User province set to:', province);
          } else {
            console.log('⚠️ User profile found but province is empty');
            setUserProvince('');
          }
        } else {
          console.log('⚠️ Failed to fetch user profile or no data');
          setUserProvince('');
        }
      } catch (error) {
        console.error('❌ Error fetching user province:', error);
        setUserProvince('');
      }
    };

    fetchUserProvince();
  }, [user]);

  // Fetch previous bookings for recommendations
  useEffect(() => {
    const fetchPreviousBookings = async () => {
      if (!user?.uid) return;

      try {
        const bookingsRef = collection(db, 'bookings');
        const q = query(
          bookingsRef,
          where('guestId', '==', user.uid),
          where('status', 'in', ['completed', 'confirmed'])
        );
        const querySnapshot = await getDocs(q);
        
        const bookings = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.listingId) {
            bookings.push({
              listingId: data.listingId,
              location: data.listingLocation || '',
              category: data.category || 'home'
            });
          }
        });
        
        setPreviousBookings(bookings);
      } catch (error) {
        console.error('Error fetching previous bookings:', error);
      }
    };

    fetchPreviousBookings();
  }, [user]);

  // Fetch published listings from Firestore
  useEffect(() => {
    const fetchListings = async () => {
      try {
        setLoading(true);
        console.log('Fetching published home listings...');
        const result = await getPublishedListings('home');
        
        if (result && result.success && result.data) {
          console.log(`✅ Found ${result.data.length} published listings`);
          
          // SAFETY: Normalize listings with safe defaults - never exclude listings due to missing province/coords
          // All published listings should be visible even if province or coords are missing
          const normalizedListings = result.data.map(listing => {
            // Convert unavailableDates from Firestore Timestamps to date strings (YYYY-MM-DD)
            let unavailableDates = [];
            if (listing.unavailableDates && Array.isArray(listing.unavailableDates)) {
              unavailableDates = listing.unavailableDates.map(date => {
                if (date?.toDate) {
                  // Firestore Timestamp
                  const dateObj = date.toDate();
                  const year = dateObj.getFullYear();
                  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                  const day = String(dateObj.getDate()).padStart(2, '0');
                  return `${year}-${month}-${day}`;
                } else if (date instanceof Date) {
                  // Date object
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  return `${year}-${month}-${day}`;
                } else if (typeof date === 'string') {
                  // Already a string (YYYY-MM-DD format)
                  return date;
                }
                return null;
              }).filter(Boolean);
            }
            
            return {
              id: listing.id,
              title: listing.title || 'Untitled Listing',
              location: listing.location || 'Location not specified',
              pricePerNight: listing.rate || 0,
              discount: listing.discount || 0,
              rating: listing.rating || 0,
              image: listing.images && listing.images.length > 0 ? listing.images[0] : null,
              guests: listing.guests || 1,
              bedrooms: listing.bedrooms || 0,
              bathrooms: listing.bathrooms || 0,
              description: listing.description || '',
              images: listing.images || [],
              hostId: listing.hostId,
              unavailableDates: unavailableDates,
              // Include new fields with safe defaults - never exclude listings for missing fields
              completedBookingsCount: listing.completedBookingsCount || 0,
              province: (listing.province || '').trim(), // Empty string if missing
              coords: listing.coords || null, // null if missing
              status: listing.status || 'published', // Default to published
              archived: listing.archived || false // Exclude archived listings
            };
          }).filter(l => l.status === 'published' && !l.archived); // Only show published, non-archived listings
          
          setListings(normalizedListings);
          console.log(`✅ Mapped ${normalizedListings.length} published listings (excluding archived)`);
          console.log(`📊 Listings with province: ${normalizedListings.filter(l => l.province).length}, without: ${normalizedListings.filter(l => !l.province).length}`);

          // Calculate Suggested Bookings (Top 3 by completedBookingsCount) - only published listings
          const suggested = normalizedListings
            .slice() // Copy array
            .sort((a, b) => (b.completedBookingsCount || 0) - (a.completedBookingsCount || 0))
            .slice(0, 3);
          setSuggestedListings(suggested);
          console.log(`✅ Calculated ${suggested.length} suggested listings`);

          // SECTION 2: Calculate Listings Near You (province-based)
          // These listings will ALSO appear in "List of All Bookings" - no filtering
          if (userProvince) {
            const normalizedUserProvince = userProvince.toLowerCase().trim();
            console.log(`🔍 Filtering listings for province: "${userProvince}" (normalized: "${normalizedUserProvince}")`);
            
            // Get all unique provinces from listings for debugging
            const allProvinces = [...new Set(normalizedListings.map(l => (l.province || '').toLowerCase().trim()).filter(Boolean))];
            console.log(`📊 Available provinces in listings:`, allProvinces);
            console.log(`📊 Total listings: ${normalizedListings.length}, Listings with province: ${normalizedListings.filter(l => l.province).length}`);
            
            const near = normalizedListings.filter(l => {
              const listingProvince = (l.province || '').toLowerCase().trim();
              // Exact match
              const exactMatch = listingProvince && listingProvince === normalizedUserProvince;
              // Also check if location string contains the province (fallback)
              const locationMatch = l.location && l.location.toLowerCase().includes(normalizedUserProvince);
              const matches = exactMatch || locationMatch;
              
              // Debug logging for first few listings
              if (normalizedListings.indexOf(l) < 3) {
                console.log(`  Listing "${l.title}": province="${l.province}" (normalized: "${listingProvince}"), location="${l.location}", exactMatch: ${exactMatch}, locationMatch: ${locationMatch}, final: ${matches}`);
              }
              
              return matches;
            });
            
            // Limit to 3 listings maximum
            setListingsNearYou(near.slice(0, 3));
            console.log(`✅ Found ${near.length} listings near you in ${userProvince} (showing up to 3)`);
            
            if (near.length === 0 && normalizedListings.filter(l => l.province).length > 0) {
              console.warn(`⚠️ No matches found! User province: "${normalizedUserProvince}", Available provinces:`, allProvinces);
            }
          } else {
            setListingsNearYou([]);
            console.log('ℹ️ User province not set - skipping Listings Near You section');
          }

          // Generate recommendations based on previous bookings
          if (previousBookings.length > 0 && normalizedListings.length > 0) {
            const recommendedLocations = [...new Set(previousBookings.map(b => b.location).filter(Boolean))];
            const recommended = normalizedListings
              .filter(listing => {
                // Recommend listings in similar locations
                return recommendedLocations.some(loc => 
                  listing.location.toLowerCase().includes(loc.toLowerCase()) ||
                  loc.toLowerCase().includes(listing.location.toLowerCase())
                );
              })
              .sort((a, b) => (b.rating || 0) - (a.rating || 0))
              .slice(0, 6);
            
            setRecommendations(recommended);
          }
        } else {
          console.warn('No listings data returned:', result);
          setListings([]);
        }
      } catch (error) {
        console.error('❌ Error fetching listings:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          stack: error.stack
        });
        // Set empty listings but don't crash the app
        setListings([]);
        setSuggestedListings([]);
        setListingsNearYou([]);
        // Optionally show a user-friendly error message
        // You can add a toast notification here if needed
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, [previousBookings, userProvince]);

  // Fetch user favorites from Firestore
  useEffect(() => {
    const fetchFavorites = async () => {
      if (user?.uid) {
        try {
          const result = await getUserFavorites(user.uid);
          if (result.success && result.data) {
            setFavorites(new Set(result.data));
          }
        } catch (error) {
          console.error('Error fetching favorites:', error);
        }
      }
    };

    fetchFavorites();
  }, [user]);

  // compute unique locations for filter dropdown
  const locations = useMemo(() => {
    return Array.from(new Set(listings.map((h) => h.location).filter(Boolean)));
  }, [listings]);

  // Extract categories from listings
  const categories = useMemo(() => {
    const cats = new Set();
    listings.forEach(listing => {
      // Extract category from title or description
      const title = (listing.title || '').toLowerCase();
      const desc = (listing.description || '').toLowerCase();
      
      if (title.includes('apartment') || desc.includes('apartment')) {
        cats.add('apartment');
      } else if (title.includes('villa') || desc.includes('villa')) {
        cats.add('villa');
      } else if (title.includes('condo') || desc.includes('condo')) {
        cats.add('condo');
      } else if (title.includes('studio') || desc.includes('studio')) {
        cats.add('studio');
      } else if (title.includes('house') || desc.includes('house') || desc.includes('home')) {
        cats.add('house');
      } else {
        cats.add('other');
      }
    });
    return Array.from(cats);
  }, [listings]);

  // Filter listings for search results (only used when isSearching is true)
  const searchedListings = useMemo(() => {
    if (!isSearching) return [];
    const searchQuery = (filters.location || '').toLowerCase().trim();
    if (!searchQuery && filters.guests === 0 && !startDate && !endDate) return [];

    return listings.filter((listing) => {
      const titleMatch = listing.title?.toLowerCase().includes(searchQuery);
      const provinceMatch = listing.province?.toLowerCase().includes(searchQuery);
      const locationMatch = listing.location?.toLowerCase().includes(searchQuery);
      if (searchQuery && !titleMatch && !provinceMatch && !locationMatch) return false;

      if (filters.guests > 0 && listing.guests && listing.guests < filters.guests) return false;

      if (isRangeUnavailable(listing.unavailableDates || [], startDate, endDate)) return false;

      return true;
    });
  }, [listings, filters, startDate, endDate, isSearching]);

  const filtered = useMemo(() => {
    let results = listings.filter((h) => {
      if (filters.location && !h.location.toLowerCase().includes(filters.location.toLowerCase())) return false;
      if (filters.locationSelect && h.location !== filters.locationSelect) return false;
      if (filters.guests && h.guests < filters.guests) return false;

      if (isRangeUnavailable(h.unavailableDates || [], startDate, endDate)) return false;

      if (selectedCategory !== 'all') {
        const title = (h.title || '').toLowerCase();
        const desc = (h.description || '').toLowerCase();
        let listingCategory = 'other';
        if (title.includes('apartment') || desc.includes('apartment')) listingCategory = 'apartment';
        else if (title.includes('villa') || desc.includes('villa')) listingCategory = 'villa';
        else if (title.includes('condo') || desc.includes('condo')) listingCategory = 'condo';
        else if (title.includes('studio') || desc.includes('studio')) listingCategory = 'studio';
        else if (title.includes('house') || desc.includes('house') || desc.includes('home')) listingCategory = 'house';
        if (listingCategory !== selectedCategory) return false;
      }

      if (priceRange !== 'all') {
        const price = h.pricePerNight || 0;
        switch (priceRange) {
          case 'low':
            if (price >= 1000) return false; break;
          case 'medium':
            if (price < 1000 || price > 3000) return false; break;
          case 'high':
            if (price <= 3000) return false; break;
        }
      }

      return true;
    });

    return results;
  }, [listings, filters, startDate, endDate, selectedCategory, priceRange]);

  // Determine which listings to display: search results when searching, otherwise filtered listings
  const displayListings = isSearching ? searchedListings : filtered;
  
  // Pagination calculations
  const totalPages = Math.ceil(displayListings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedListings = displayListings.slice(startIndex, endIndex);

  // Reset to page 1 when filters change or search mode changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, startDate, endDate, selectedCategory, priceRange, isSearching]);

  // Reset isSearching when search inputs are cleared
  useEffect(() => {
    const hasSearchQuery = searchInputs.location.trim().length > 0 || searchInputs.guests > 0 || (startDate && endDate);
    if (!hasSearchQuery && isSearching) {
      setIsSearching(false);
    }
  }, [searchInputs, startDate, endDate, isSearching]);

  const handleToggleFavorite = async (id) => {
    if (!user?.uid) {
      // If not logged in, show message or redirect to login
      if (window.confirm('Please sign in to save favorites. Would you like to sign in?')) {
        navigate('/login');
      }
      return;
    }

    try {
      const result = await toggleFavorite(user.uid, id);
      if (result.success) {
        setFavorites(prev => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
      } else {
        console.error('Failed to toggle favorite:', result.error);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleViewDetails = (stay) => {
    navigate(`/listing/${stay.id}`);
  };

  const clearAllFilters = () => {
    setFilters({ location: "", guests: 0, locationSelect: "", startDate: null, endDate: null });
    setSearchInputs({ location: "", guests: 0 });
    setSelectedCategory("all");
    setPriceRange("all");
    setDateRange([null, null]);
    setIsSearching(false);
  };

  // Date input (no manual open/close, DatePicker controls it)
  const CustomDateInput = React.forwardRef(({ value, onClick, placeholder = "Check-in — Check-out" }, ref) => (
    <div className="relative w-full">
      <input
        ref={ref}
        onClick={onClick}
        value={value}
        placeholder={placeholder}
        readOnly
        className="w-full pl-10 pr-4 py-3 text-sm focus:outline-none cursor-pointer hover:bg-gray-50 transition-colors border-0"
      />
      <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none" />
    </div>
  ));

  return (
    <main id="homestays" className="min-h-screen bg-slate-100">
      <Hero />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pt-6 sm:pt-8 md:pt-12">
        {/* Header Section */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 mb-3 sm:mb-4">
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span className="text-xs sm:text-sm font-medium text-emerald-700">Premium Stays</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-emerald-900 mb-3 sm:mb-4 px-2">Discover Your Perfect Home Stay</h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto px-4 mb-8">
            Curated hand-picked accommodations that feel like home. Filter by location, guest count and save your favorites.
          </p>

          {/* Airbnb-style Search Bar */}
          <AnimatedSection className="mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white rounded-2xl sm:rounded-full shadow-xl border border-gray-200 p-2 sm:p-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-0 sm:gap-0 max-w-5xl mx-auto overflow-hidden"
            >
              {/* Where */}
              <div className="flex-1 min-w-0 border-b sm:border-b-0 border-gray-200">
                <label className="block text-xs font-semibold text-gray-900 mb-1 px-4 pt-2">Where</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search destinations"
                    value={searchInputs.location}
                    onChange={(e) => setSearchInputs({ ...searchInputs, location: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 text-sm focus:outline-none focus:bg-gray-50 transition-colors border-0 rounded-none"
                  />
                  <FaMapMarkerAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm pointer-events-none" />
                </div>
              </div>

              {/* Divider */}
              <div className="hidden sm:block w-px h-12 bg-gray-200 mx-1"></div>

              {/* Date (Stable range picker) */}
              <div className="flex-1 min-w-0 border-b sm:border-b-0 border-gray-200">
                <label className="block text-xs font-semibold text-gray-900 mb-1 px-4 pt-2">Date</label>
                <DatePicker
                  selectsRange
                  startDate={dateRange[0]}
                  endDate={dateRange[1]}
                  onChange={(update) => setDateRange(update)}
                  isClearable
                  minDate={new Date()}
                  customInput={<CustomDateInput />}
                  wrapperClassName="w-full"
                  popperClassName="z-40"
                  popperPlacement="bottom-start"
                />
              </div>

              <div className="hidden sm:block w-px h-12 bg-gray-200 mx-1"></div>

              {/* Who (Guests) - FIXED dropdown */}
              <div
                className="flex-1 min-w-0 relative"
                ref={guestsDropdownRef}
                onClick={(e) => e.stopPropagation()}
              >
                <label className="block text-xs font-semibold text-gray-900 mb-1 px-4 pt-2">Who</label>
                <button
                  type="button"
                  aria-haspopup="true"
                  aria-expanded={showGuestsDropdown}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowGuestsDropdown(!showGuestsDropdown);
                    if (!showGuestsDropdown) {
                      setLockGuestsDropdown(true); // Lock when opening
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setShowGuestsDropdown((open) => {
                        if (!open) setLockGuestsDropdown(true);
                        return !open;
                      });
                    }
                  }}
                  className="w-full pl-4 pr-4 py-3 text-sm text-left focus:outline-none hover:bg-gray-50 transition-colors flex items-center justify-between border-0 rounded-none cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2">
                    <FaUsers className="text-gray-400 text-sm" />
                    <span className={searchInputs.guests > 0 ? 'text-gray-900' : 'text-gray-400'}>
                      {searchInputs.guests > 0
                        ? `${searchInputs.guests} ${searchInputs.guests === 1 ? 'guest' : 'guests'}`
                        : 'Add guests'}
                    </span>
                  </div>
                  <svg
                    className={`w-4 h-4 text-gray-400 transform transition-transform duration-200 ${showGuestsDropdown ? 'rotate-180' : 'rotate-0'}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Guests Dropdown */}
                {showGuestsDropdown && (
                  <div
                    className="absolute top-full left-0 right-0 sm:left-auto sm:right-0 sm:w-80 mt-2 bg-white rounded-2xl shadow-xl border border-gray-200 p-6 z-[9999]"
                    onClick={(e) => e.stopPropagation()}
                    role="dialog"
                    aria-label="Select guests"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-gray-900">Adults</div>
                          <div className="text-sm text-gray-500">Ages 13+</div>
                        </div>
                        <div className="flex items-center gap-4">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSearchInputs((prev) => ({ ...prev, guests: Math.max(0, Number(prev.guests) - 1) }));
                            }}
                            disabled={Number(searchInputs.guests) <= 0}
                            className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            <span className="text-gray-600">−</span>
                          </button>
                          <span className="w-8 text-center font-semibold">{searchInputs.guests}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSearchInputs((prev) => ({ ...prev, guests: Number(prev.guests) + 1 }));
                            }}
                            className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            <span className="text-gray-600">+</span>
                          </button>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { 
                        e.preventDefault(); 
                        e.stopPropagation(); 
                        setShowGuestsDropdown(false);
                        setLockGuestsDropdown(false); // Unlock when closing
                      }}
                      className="mt-4 w-full text-left text-sm font-semibold text-emerald-600 hover:text-emerald-700 focus:outline-none"
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatedSection>
        </div>

        {/* Filters Section - Category and Price Range Only */}
        <AnimatedSection id="filters-section" className="mb-6 sm:mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                >
                  <option value="all">All Categories</option>
                  {(Array.isArray(categories) && categories.length > 0 ? categories : homeStayCategories).map((cat) => (
                    <option key={cat} value={cat}>
                      {categoryLabels[cat] || cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
                <select
                  value={priceRange}
                  onChange={(e) => setPriceRange(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                >
                  {priceRangeOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active Filters Count */}
            {(filters.location || filters.guests > 0 || startDate || endDate || selectedCategory !== 'all' || priceRange !== 'all') && (
              <div className="mt-4 flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  Showing {isSearching ? searchedListings.length : filtered.length} of {listings.length} homestays
                </div>
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </AnimatedSection>

        {/* SECTION 1: Suggested Bookings - Top 3 by completedBookingsCount */}
        {/* Only show when NOT searching */}
        {!isSearching && suggestedListings.length > 0 && (
          <AnimatedSection className="mb-6 sm:mb-8">
            <div className="mb-4">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Suggested Bookings</h2>
              <p className="text-sm text-gray-600">Most popular stays based on completed bookings</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {suggestedListings.map((stay, index) => (
                <AnimatedCard key={stay.id} delay={index * 0.1}>
                  <HomeStayCard
                    stay={stay}
                    onView={handleViewDetails}
                    isFavorite={favorites.has(stay.id)}
                    onToggleFavorite={() => handleToggleFavorite(stay.id)}
                  />
                </AnimatedCard>
              ))}
            </div>
          </AnimatedSection>
        )}

        {/* SECTION 2: Bookings Near Your Place - Province-based with slider if >3 */}
        {/* Only show when NOT searching */}
        {!isSearching && userProvince && (
          <AnimatedSection className="mb-6 sm:mb-8">
            <div className="mb-4">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Bookings near your place</h2>
              <p className="text-sm text-gray-600">Stays in {userProvince}</p>
            </div>
            
            {listingsNearYou.length === 0 ? (
              <div className="bg-gray-50 rounded-xl p-8 text-center border border-gray-200">
                <p className="text-gray-600">No nearby home stays found based on your location.</p>
              </div>
            ) : (
              // Grid layout - always shows up to 3 listings
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {listingsNearYou.map((stay, index) => (
                  <AnimatedCard key={stay.id} delay={index * 0.1}>
                    <HomeStayCard
                      stay={stay}
                      onView={handleViewDetails}
                      isFavorite={favorites.has(stay.id)}
                      onToggleFavorite={() => handleToggleFavorite(stay.id)}
                    />
                  </AnimatedCard>
                ))}
              </div>
            )}
          </AnimatedSection>
        )}

        {/* Recommendations Section - Keep for backward compatibility */}
        {recommendations.length > 0 && user && (
          <AnimatedSection className="mb-6 sm:mb-8">
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl shadow-sm border border-emerald-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Recommended for You</h3>
                  <p className="text-sm text-gray-600">Based on your previous bookings</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendations.map((stay, index) => (
                  <AnimatedCard key={stay.id} delay={index * 0.1}>
                    <HomeStayCard
                      stay={stay}
                      onView={handleViewDetails}
                      isFavorite={favorites.has(stay.id)}
                      onToggleFavorite={() => handleToggleFavorite(stay.id)}
                    />
                  </AnimatedCard>
                ))}
              </div>
            </div>
          </AnimatedSection>
        )}

        {/* SECTION 3: List of All Bookings - Shows ALL listings (including duplicates from sections 1 & 2) */}
        {/* When searching, show filtered results. When not searching, show all listings */}
        <div className="mb-4">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            {isSearching ? 'Search Results' : 'List of all bookings'}
          </h2>
          <p className="text-sm text-gray-600">
            {isSearching 
              ? `Found ${searchedListings.length} ${searchedListings.length === 1 ? 'result' : 'results'} for your search`
              : 'Browse all available home stays'}
          </p>
          {/* Dev info - unhide to debug */}
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-gray-400 mt-2" id="dev-listing-counts">
              Debug: total={listings.length}, suggested={suggestedListings.length}, nearYou={listingsNearYou.length}, filtered={filtered.length}, searched={searchedListings.length}, isSearching={isSearching ? 'true' : 'false'}
            </div>
          )}
        </div>

        {/* Home Stays Grid */}
        <AnimatedGrid id="homestays-list" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {loading ? (
            <div className="col-span-full text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading homestays...</p>
            </div>
          ) : displayListings.length === 0 ? (
            <div className="col-span-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl shadow-inner p-16 text-center border-2 border-dashed border-gray-300">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-full shadow-lg mb-4">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No homestays found</h3>
              <p className="text-gray-600 max-w-md mx-auto mb-6">
                {filters?.location || filters?.guests > 0 || filters?.locationSelect
                  ? 'Try adjusting your filters to see more results.'
                  : "We're adding amazing homestays for you. Check back soon for cozy stays!"}
              </p>
              {(filters?.location || filters?.guests > 0 || filters?.locationSelect) && (
                <button
                  onClick={clearAllFilters}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            paginatedListings.map((stay, index) => (
              <AnimatedCard key={stay.id} delay={index * 0.1}>
                <HomeStayCard
                  stay={stay}
                  onView={handleViewDetails}
                  isFavorite={favorites.has(stay.id)}
                  onToggleFavorite={() => handleToggleFavorite(stay.id)}
                />
              </AnimatedCard>
            ))
          )}
        </AnimatedGrid>

        {/* Pagination */}
        {displayListings.length > itemsPerPage && (
          <div className="flex items-center justify-center gap-2 sm:gap-2 mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-gray-200 overflow-x-auto pb-2 sm:pb-0">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1 sm:gap-2 text-sm sm:text-base touch-manipulation"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">Previous</span>
              <span className="sm:hidden">Prev</span>
            </button>
            
            <div className="flex items-center gap-1 sm:gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                // Show first page, last page, current page, and pages around current
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition-colors touch-manipulation ${
                        currentPage === page
                          ? 'bg-emerald-600 text-white'
                          : 'border border-gray-300 text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  );
                } else if (page === currentPage - 2 || page === currentPage + 2) {
                  return <span key={page} className="px-1 sm:px-2 text-gray-400 text-sm">...</span>;
                }
                return null;
              })}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1 sm:gap-2 text-sm sm:text-base touch-manipulation"
            >
              <span className="hidden sm:inline">Next</span>
              <span className="sm:hidden">Next</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        {/* Results info */}
        {displayListings.length > 0 && (
          <div className="text-center mt-4 text-sm text-gray-600">
            Showing {startIndex + 1} - {Math.min(endIndex, displayListings.length)} of {displayListings.length} home stays
          </div>
        )}
      </div>
    </main>
  );
};

export default HomeStays;

// ADD: fallback categories and labels (prevents ReferenceError)
const homeStayCategories = [
  'apartment',
  'villa',
  'condo',
  'studio',
  'house',
  'other'
];

const categoryLabels = {
  apartment: 'Apartment',
  villa: 'Villa',
  condo: 'Condo',
  studio: 'Studio',
  house: 'House',
  other: 'Other'
};

// ADD: fallback price range options (prevents ReferenceError)
const priceRangeOptions = [
  { value: "all", label: "All Prices" },
  { value: "low", label: "₱0 - ₱999" },
  { value: "medium", label: "₱1,000 - ₱3,000" },
  { value: "high", label: "₱3,001+" },
];