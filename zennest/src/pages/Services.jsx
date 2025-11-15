// Services.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { useNavigate } from "react-router-dom";
import { getPublishedListings, getGuestProfile } from "../services/firestoreService";
import { FaUtensils, FaSpa, FaCamera, FaEllipsisH, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import useAuth from "../hooks/useAuth";

// Optimized animation variants - faster and smoother
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
      staggerChildren: 0.08
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

// Optimized animated component wrappers - reduced threshold for faster triggers
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

const Services = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const videoRef = useRef(null);
  const [heroRef, heroInView] = useInView({
    triggerOnce: true,
    threshold: 0.2,
  });

  // Get Cloudinary configuration
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const servicesHeroVideoPublicId = 'services-hero_1_dsesh8';

  // Construct optimized Cloudinary video URL
  const getOptimizedVideoUrl = () => {
    if (!cloudName) {
      console.warn('Cloudinary cloud name not configured. Check your .env file.');
      return null;
    }
    
    // Remove any existing extension from public ID if present
    const publicId = servicesHeroVideoPublicId.replace(/\.(mp4|webm|mov)$/i, '');
    
    // Add transformations for optimization
    const transformations = [
      'q_auto:best',      // High quality with automatic optimization
      'w_1920',           // Full HD width
      'h_1080',           // Full HD height
      'c_fill',           // Fill area while maintaining aspect ratio
      'f_auto'            // Automatic format selection
    ].join(',');
    
    return `https://res.cloudinary.com/${cloudName}/video/upload/${transformations}/${publicId}`;
  };

  const videoUrl = getOptimizedVideoUrl();

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [priceRange, setPriceRange] = useState('all');
  const [sortBy, setSortBy] = useState('featured');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  
  // New state for suggested services and services near you
  const [userProvince, setUserProvince] = useState('');
  const [suggestedServices, setSuggestedServices] = useState([]);
  const [servicesNearYou, setServicesNearYou] = useState([]);
  
  // Slider state for "Services Near Your Place"
  const [nearYouSlideIndex, setNearYouSlideIndex] = useState(0);
  const nearYouScrollRef = useRef(null);

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

  // Fetch published service listings from Firestore
  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);
        const result = await getPublishedListings('service');
        if (result.success && result.data) {
          // SAFETY: Normalize services with safe defaults - never exclude services due to missing province/coords
          const normalizedServices = result.data.map((listing, index) => ({
            id: listing.id,
            title: listing.title || 'Untitled Service',
            description: listing.description || '',
            price: `₱${(listing.rate || 0).toLocaleString()}`,
            duration: listing.promo || 'per session',
            image: listing.images && listing.images.length > 0 ? listing.images[0] : null,
            rating: listing.rating || 0,
            reviews: listing.bookings || 0,
            color: ['from-emerald-500 to-emerald-600', 'from-emerald-400 to-emerald-500', 'from-emerald-600 to-emerald-700', 'from-teal-500 to-emerald-500', 'from-green-500 to-emerald-500', 'from-emerald-500 to-teal-500'][index % 6],
            buttonColor: ['bg-emerald-600 hover:bg-emerald-700', 'bg-emerald-500 hover:bg-emerald-600', 'bg-emerald-700 hover:bg-emerald-800', 'bg-teal-600 hover:bg-teal-700', 'bg-green-600 hover:bg-green-700', 'bg-emerald-600 hover:bg-emerald-700'][index % 6],
            icon: ['👨‍🍳', '💆‍♀️', '📸', '💄', '🍳', '🧘‍♀️'][index % 6],
            delay: index * 0.1,
            rate: listing.rate || 0,
            discount: listing.discount || 0,
            location: listing.location || '',
            hostId: listing.hostId,
            // Include new fields with safe defaults
            completedBookingsCount: listing.completedBookingsCount || 0,
            province: (listing.province || '').trim(), // Empty string if missing
            coords: listing.coords || null, // null if missing
            status: listing.status || 'published',
            archived: listing.archived || false
          })).filter(s => s.status === 'published' && !s.archived);
          
          setServices(normalizedServices);
          console.log(`✅ Mapped ${normalizedServices.length} published services (excluding archived)`);
          console.log(`📊 Services with province: ${normalizedServices.filter(s => s.province).length}, without: ${normalizedServices.filter(s => !s.province).length}`);

          // SECTION 1: Calculate Suggested Services (Top 3 by completedBookingsCount)
          // These services will ALSO appear in "List of All Services" - no filtering
          const suggested = normalizedServices
            .slice() // Copy array
            .sort((a, b) => (b.completedBookingsCount || 0) - (a.completedBookingsCount || 0))
            .slice(0, 3);
          setSuggestedServices(suggested);
          console.log(`✅ Calculated ${suggested.length} suggested services`);

          // SECTION 2: Calculate Services Near You (province-based)
          // These services will ALSO appear in "List of All Services" - no filtering
          if (userProvince) {
            const normalizedUserProvince = userProvince.toLowerCase().trim();
            console.log(`🔍 Filtering services for province: "${userProvince}" (normalized: "${normalizedUserProvince}")`);
            
            // Get all unique provinces from services for debugging
            const allProvinces = [...new Set(normalizedServices.map(s => (s.province || '').toLowerCase().trim()).filter(Boolean))];
            console.log(`📊 Available provinces in services:`, allProvinces);
            console.log(`📊 Total services: ${normalizedServices.length}, Services with province: ${normalizedServices.filter(s => s.province).length}`);
            
            const near = normalizedServices.filter(s => {
              const serviceProvince = (s.province || '').toLowerCase().trim();
              // Exact match
              const exactMatch = serviceProvince && serviceProvince === normalizedUserProvince;
              // Also check if location string contains the province (fallback)
              const locationMatch = s.location && s.location.toLowerCase().includes(normalizedUserProvince);
              const matches = exactMatch || locationMatch;
              
              // Debug logging for first few services
              if (normalizedServices.indexOf(s) < 3) {
                console.log(`  Service "${s.title}": province="${s.province}" (normalized: "${serviceProvince}"), location="${s.location}", exactMatch: ${exactMatch}, locationMatch: ${locationMatch}, final: ${matches}`);
              }
              
              return matches;
            });
            
            setServicesNearYou(near);
            console.log(`✅ Found ${near.length} services near you in ${userProvince}`);
            
            if (near.length === 0 && normalizedServices.filter(s => s.province).length > 0) {
              console.warn(`⚠️ No matches found! User province: "${normalizedUserProvince}", Available provinces:`, allProvinces);
            }
          } else {
            setServicesNearYou([]);
            console.log('ℹ️ User province not set - skipping Services Near You section');
          }
        }
      } catch (error) {
        console.error('Error fetching services:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [userProvince]);

  // Extract unique categories and locations from services
  const serviceCategories = useMemo(() => {
    const cats = new Set();
    services.forEach(service => {
      // Extract category from description or use a default
      if (service.description?.toLowerCase().includes('chef') || service.title?.toLowerCase().includes('chef')) {
        cats.add('food');
      } else if (service.description?.toLowerCase().includes('spa') || service.description?.toLowerCase().includes('massage') || service.description?.toLowerCase().includes('wellness')) {
        cats.add('wellness');
      } else if (service.description?.toLowerCase().includes('photo') || service.title?.toLowerCase().includes('photo')) {
        cats.add('photography');
      } else if (service.description?.toLowerCase().includes('beauty') || service.title?.toLowerCase().includes('beauty')) {
        cats.add('beauty');
      } else {
        cats.add('other');
      }
    });
    return Array.from(cats);
  }, [services]);

  const locations = useMemo(() => {
    return Array.from(new Set(services.map(s => s.location).filter(Boolean))).sort();
  }, [services]);

  // Filter and sort services
  // CRITICAL: Do NOT filter out services that appear in Suggested or Near You sections
  // All services must appear in "List of All Services" regardless of where else they appear
  const filteredServices = useMemo(() => {
    let results = services.filter(service => {
      // Category filter
      if (selectedCategory !== 'all') {
        const serviceCat = service.description?.toLowerCase().includes('chef') || service.title?.toLowerCase().includes('chef') ? 'food' :
          service.description?.toLowerCase().includes('spa') || service.description?.toLowerCase().includes('massage') || service.description?.toLowerCase().includes('wellness') ? 'wellness' :
          service.description?.toLowerCase().includes('photo') || service.title?.toLowerCase().includes('photo') ? 'photography' :
          service.description?.toLowerCase().includes('beauty') || service.title?.toLowerCase().includes('beauty') ? 'beauty' : 'other';
        if (serviceCat !== selectedCategory) return false;
      }

      // Location filter
      if (selectedLocation !== 'all' && service.location !== selectedLocation) return false;

      // Price range filter
      if (priceRange !== 'all') {
        const price = service.rate || 0;
        switch (priceRange) {
          case 'low':
            if (price > 1000) return false;
            break;
          case 'medium':
            if (price < 1000 || price > 3000) return false;
            break;
          case 'high':
            if (price < 3000) return false;
            break;
        }
      }

      // Search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!service.title?.toLowerCase().includes(query) && 
            !service.description?.toLowerCase().includes(query) &&
            !service.location?.toLowerCase().includes(query)) {
          return false;
        }
      }

      return true;
    });

    // Apply sorting
    switch (sortBy) {
      case 'price-low':
        results.sort((a, b) => (a.rate || 0) - (b.rate || 0));
        break;
      case 'price-high':
        results.sort((a, b) => (b.rate || 0) - (a.rate || 0));
        break;
      case 'rating':
        results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'name':
        results.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        break;
      default: // 'featured'
        break;
    }

    return results;
  }, [services, selectedCategory, selectedLocation, priceRange, sortBy, searchQuery]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredServices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedServices = filteredServices.slice(startIndex, endIndex);

  // Reset to page 1 when filters or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedLocation, priceRange, sortBy, searchQuery]);

  const handleViewDetails = (service) => {
    navigate(`/listing/${service.id}`);
  };

  const categoryLabels = {
    food: '🍽️ Food & Dining',
    wellness: '💆 Wellness & Spa',
    photography: '📸 Photography',
    beauty: '💄 Beauty & Care',
    other: '✨ Other Services'
  };

  return (
    <main className="pt-0">
      {/* Enhanced Hero Section */}
      <motion.section 
        ref={heroRef}
        initial={{ opacity: 0 }}
        animate={heroInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.6 }}
        className="relative min-h-[85vh] sm:min-h-screen flex items-center justify-center overflow-hidden"
      >
        {/* Background Video from Cloudinary */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          {videoUrl ? (
            <video
              ref={videoRef}
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                transform: heroInView ? 'scale(1)' : 'scale(1.15)',
                transition: 'transform 1.2s ease-out'
              }}
            >
              <source src={videoUrl} type="video/mp4" />
              <source src={videoUrl.replace('f_auto', 'f_webm')} type="video/webm" />
              {/* Fallback image if video doesn't load */}
              <img
                src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
                alt="Services background"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </video>
          ) : (
            // Fallback to image if Cloudinary is not configured
            <motion.div 
              initial={{ scale: 1.15 }}
              animate={heroInView ? { scale: 1 } : { scale: 1.15 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: "url('https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80')"
              }}
            ></motion.div>
          )}
        </div>
        
        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/30 to-black/40 z-0"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/20 via-transparent to-emerald-900/20 z-0"></div>
        
        {/* Animated Background Elements */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.2, 0.1],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute top-20 right-20 w-72 h-72 bg-emerald-400 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.1, 0.15, 0.1],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2
            }}
            className="absolute bottom-20 left-20 w-96 h-96 bg-emerald-500 rounded-full blur-3xl"
          />
        </div>
        
        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto w-full px-3 sm:px-4 md:px-6 lg:px-12 py-8 sm:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-center">
            {/* Left Column - Main Content */}
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              animate={heroInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-white"
            >
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={heroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="inline-flex items-center gap-1.5 sm:gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 mb-4 sm:mb-6"
              >
                <svg className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-xs sm:text-sm font-medium">Premium Services</span>
              </motion.div>

              <motion.h1 
                initial={{ opacity: 0, y: 30 }}
                animate={heroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-semibold mb-4 sm:mb-6 leading-tight"
              >
                Discover Local
                <motion.span 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={heroInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.6, delay: 0.8 }}
                  className="block bg-gradient-to-r from-emerald-400 via-emerald-300 to-emerald-500 bg-clip-text text-transparent mt-1 sm:mt-2"
                >
                  Services
                </motion.span>
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={heroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.8, delay: 0.7 }}
                className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-200 mb-6 sm:mb-8 leading-relaxed"
              >
                Elevate your stay with premium services from trusted local professionals. From personal chefs to wellness treatments, we've got you covered.
              </motion.p>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={heroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.8, delay: 0.9 }}
                className="grid grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8"
              >
                <div>
                  <div className="text-xl sm:text-2xl font-semibold text-emerald-400">{services.length > 0 ? services.length : '30+'}</div>
                  <div className="text-xs sm:text-sm text-gray-300">Services</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-semibold text-emerald-400">4.9</div>
                  <div className="text-xs sm:text-sm text-gray-300">Avg Rating</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-semibold text-emerald-400">500+</div>
                  <div className="text-xs sm:text-sm text-gray-300">Bookings</div>
                </div>
              </motion.div>

              {/* CTA Buttons */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={heroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.8, delay: 1.1 }}
                className="flex flex-col sm:flex-row gap-2 sm:gap-3"
              >
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 bg-emerald-600 text-white font-medium rounded-lg sm:rounded-xl hover:bg-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl text-xs sm:text-sm"
                >
                  Explore Services
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/host/register')}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 border-2 border-white text-white font-medium rounded-lg sm:rounded-xl hover:bg-white/10 transition-all duration-300 backdrop-blur-sm text-xs sm:text-sm"
                >
                  Become a Host
                </motion.button>
              </motion.div>
            </motion.div>

            {/* Right Column - Service Categories */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={heroInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="grid grid-cols-2 gap-2 sm:gap-3 mt-6 lg:mt-0"
            >
              {[
                { icon: FaUtensils, title: "Food", desc: "Private chefs & dining", color: "text-orange-300" },
                { icon: FaSpa, title: "Wellness", desc: "Spa & relaxation", color: "text-pink-300" },
                { icon: FaCamera, title: "Photography", desc: "Capture memories", color: "text-blue-300" },
                { icon: FaEllipsisH, title: "More", desc: "Many more options", color: "text-emerald-300" },
              ].map((service, idx) => {
                const IconComponent = service.icon;
                return (
                  <motion.div
                    key={service.title}
                    initial={{ opacity: 0, y: 30 }}
                    animate={heroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                    transition={{ duration: 0.6, delay: 0.1 + idx * 0.1 }}
                    whileHover={{ scale: 1.05, y: -5 }}
                    className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center hover:bg-white/15 transition-all"
                  >
                    <motion.div 
                      className={`mb-1.5 sm:mb-2 flex justify-center ${service.color || "text-white"}`}
                      whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <IconComponent className="w-6 h-6 sm:w-8 sm:h-8" />
                    </motion.div>
                    <div className="text-white font-medium mb-0.5 text-xs sm:text-sm">{service.title}</div>
                    <div className="text-[10px] sm:text-xs text-gray-300">{service.desc}</div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={heroInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 1, delay: 1.2 }}
          className="absolute bottom-4 sm:bottom-8 left-1/2 transform -translate-x-1/2 z-10"
        >
          <motion.img
            src="/src/assets/zennest-loading-icon.svg"
            alt="Scroll"
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-6 h-6 sm:w-7 sm:h-7 md:w-14 md:h-14"
          />
        </motion.div>
      </motion.section>

      {/* Services Grid Section */}
      <div className="w-full bg-slate-100">
        <section className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-8 sm:py-12 lg:py-16 xl:py-24">
          {/* Featured Services Header */}
          <AnimatedSection className="text-center mb-6 sm:mb-8 lg:mb-12">
            <motion.h2 
              variants={fadeInUp}
              className="text-xl sm:text-2xl md:text-3xl font-semibold text-emerald-900 mb-2 sm:mb-3"
            >
              Popular Services
            </motion.h2>
            <motion.p 
              variants={fadeInUp}
              className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto px-2"
            >
              Handpicked services to make your stay unforgettable
            </motion.p>
          </AnimatedSection>

          {/* SEARCH BAR - MOVED TO TOP */}
          <AnimatedSection className="mb-8 sm:mb-12">
            <div className="bg-white rounded-lg sm:rounded-xl lg:rounded-2xl shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6">
              {/* Search Bar */}
              <div className="mb-3 sm:mb-4 lg:mb-6">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search services..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 lg:py-3 pl-9 sm:pl-10 lg:pl-12 text-xs sm:text-sm lg:text-base border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  <svg className="absolute left-2.5 sm:left-3 lg:left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Filter Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 lg:gap-4">
                {/* Category Filter */}
                <div>
                  <label className="block text-[10px] sm:text-xs lg:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5 lg:mb-2">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 lg:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-xs sm:text-sm"
                  >
                    <option value="all">All Categories</option>
                    {serviceCategories.map(cat => (
                      <option key={cat} value={cat}>{categoryLabels[cat] || cat}</option>
                    ))}
                  </select>
                </div>

                {/* Location Filter */}
                <div>
                  <label className="block text-[10px] sm:text-xs lg:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5 lg:mb-2">Location</label>
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="w-full px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 lg:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-xs sm:text-sm"
                  >
                    <option value="all">All Locations</option>
                    {locations.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>

                {/* Price Range Filter */}
                <div>
                  <label className="block text-[10px] sm:text-xs lg:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5 lg:mb-2">Price Range</label>
                  <select
                    value={priceRange}
                    onChange={(e) => setPriceRange(e.target.value)}
                    className="w-full px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 lg:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-xs sm:text-sm"
                  >
                    <option value="all">All Prices</option>
                    <option value="low">Under ₱1,000</option>
                    <option value="medium">₱1,000 - ₱3,000</option>
                    <option value="high">Over ₱3,000</option>
                  </select>
                </div>

                {/* Sort Filter */}
                <div>
                  <label className="block text-[10px] sm:text-xs lg:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5 lg:mb-2">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 lg:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-xs sm:text-sm"
                  >
                    <option value="featured">Featured</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="rating">Highest Rated</option>
                    <option value="name">Name A-Z</option>
                  </select>
                </div>
              </div>

              {/* Active Filters Count */}
              {(selectedCategory !== 'all' || selectedLocation !== 'all' || priceRange !== 'all' || searchQuery) && (
                <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                  <div className="text-[10px] sm:text-xs lg:text-sm text-gray-600">
                    Showing {filteredServices.length} of {services.length} services
                  </div>
                  <button
                    onClick={() => {
                      setSelectedCategory('all');
                      setSelectedLocation('all');
                      setPriceRange('all');
                      setSearchQuery('');
                      setSortBy('featured');
                    }}
                    className="text-[10px] sm:text-xs lg:text-sm text-emerald-600 hover:text-emerald-700 active:text-emerald-800 font-medium transition-colors text-left sm:text-right"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
          </AnimatedSection>

          {/* SECTION 1: Suggested Services - Top 3 by completedBookingsCount */}
          {suggestedServices.length > 0 && (
            <AnimatedSection className="mb-12 sm:mb-16">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Suggested Services</h2>
                <p className="text-sm text-gray-600">Most popular services based on completed bookings</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {suggestedServices.map((service, index) => (
                  <AnimatedCard key={service.id} delay={index * 0.1}>
                    <div 
                      onClick={(e) => {
                        if (e.target.closest('button')) return;
                        handleViewDetails(service);
                      }}
                      className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200/60 hover:border-emerald-200 group h-full flex flex-col cursor-pointer relative w-full"
                    >
                      <div className="relative h-40 sm:h-48 md:h-52 lg:h-56 w-full overflow-hidden bg-gradient-to-r from-emerald-500 to-emerald-600">
                        {service.image ? (
                          <>
                            <img 
                              src={service.image} 
                              alt={service.title}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          </>
                        ) : (
                          <div className={`absolute inset-0 bg-gradient-to-br ${service.color || 'from-emerald-500 to-emerald-600'}`}></div>
                        )}
                        
                        <div className="absolute top-2 sm:top-3 left-2 sm:left-3 bg-white/95 backdrop-blur-sm rounded-lg sm:rounded-xl p-2 sm:p-2.5 shadow-sm border border-gray-200/60 z-10">
                          <span className="text-lg sm:text-xl lg:text-2xl">{service.icon || '✨'}</span>
                        </div>
                        
                        {service.rating > 0 && (
                          <div className="absolute left-2 sm:left-3 bottom-2 sm:bottom-3 bg-white/95 backdrop-blur-sm text-gray-800 text-xs sm:text-sm font-semibold px-2 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-sm border border-gray-200/60 flex items-center gap-1 z-10">
                            <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                              <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                            </svg>
                            <span>{service.rating.toFixed(1)}</span>
                          </div>
                        )}

                        {service.discount > 0 && (
                          <div className="absolute top-2 sm:top-3 right-2 sm:right-3 bg-gradient-to-r from-red-500 to-red-600 text-white text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg shadow-lg z-10 border-2 border-white/50">
                            {service.discount}% OFF
                          </div>
                        )}
                      </div>
                      
                      <div className="p-3 sm:p-4 lg:p-5 flex-1 flex flex-col">
                        <div className="mb-3 sm:mb-4 flex-1">
                          <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 line-clamp-2 leading-tight mb-1.5 sm:mb-2 group-hover:text-emerald-700 transition-colors">
                            {service.title}
                          </h3>
                          
                          {service.location && (
                            <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">
                              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                              </svg>
                              <span className="line-clamp-1">{service.location}</span>
                            </div>
                          )}
                          
                          <p className="text-gray-600 text-xs sm:text-sm leading-relaxed line-clamp-2 mb-2 sm:mb-3">
                            {service.description}
                          </p>

                          {service.reviews > 0 && (
                            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-gray-600">
                              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-500 fill-current" viewBox="0 0 20 20">
                                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                              </svg>
                              <span className="font-semibold text-gray-900">{service.rating.toFixed(1)}</span>
                              <span className="text-gray-400">•</span>
                              <span className="text-gray-600">{service.reviews} {service.reviews === 1 ? 'booking' : 'bookings'}</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-auto pt-3 sm:pt-4 border-t border-gray-100">
                          <div className="flex items-center justify-between gap-2 sm:gap-3">
                            <div className="min-w-0 flex-1">
                              {service.discount > 0 ? (
                                <div>
                                  <div className="flex items-baseline gap-1.5 sm:gap-2 mb-0.5 sm:mb-1 flex-wrap">
                                    <span className="text-lg sm:text-xl font-bold text-emerald-600">
                                      ₱{((service.rate || 0) * (1 - service.discount / 100)).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                    </span>
                                    <span className="text-xs sm:text-sm text-gray-400 line-through font-medium">
                                      ₱{(service.rate || 0).toLocaleString()}
                                    </span>
                                    <span className="text-[10px] sm:text-xs text-red-600 font-bold bg-red-50 px-1.5 sm:px-2 py-0.5 rounded">
                                      -{service.discount}%
                                    </span>
                                  </div>
                                  <p className="text-[10px] sm:text-xs text-gray-500 whitespace-nowrap">{service.duration}</p>
                                </div>
                              ) : (
                                <div>
                                  <span className="text-lg sm:text-xl font-bold text-emerald-600">₱{(service.rate || 0).toLocaleString()}</span>
                                  <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1 whitespace-nowrap">{service.duration}</p>
                                </div>
                              )}
                            </div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetails(service);
                              }}
                              className="bg-emerald-600 text-white py-2 sm:py-2.5 px-3 sm:px-5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium hover:bg-emerald-700 transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 whitespace-nowrap flex items-center gap-1.5 sm:gap-2 flex-shrink-0"
                            >
                              Book
                              <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="absolute inset-0 border-2 border-transparent group-hover:border-emerald-200 rounded-2xl pointer-events-none transition-all duration-300"></div>
                    </div>
                  </AnimatedCard>
                ))}
              </div>
            </AnimatedSection>
          )}

          {/* SECTION 2: Services Near Your Place - Province-based with slider if >3 */}
          {userProvince && (
            <AnimatedSection className="mb-12 sm:mb-16">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Services near your place</h2>
                <p className="text-sm text-gray-600">Services in {userProvince}</p>
              </div>
              
              {servicesNearYou.length === 0 ? (
                <div className="bg-gray-50 rounded-xl p-8 text-center border border-gray-200">
                  <p className="text-gray-600">No nearby services found based on your location.</p>
                </div>
              ) : servicesNearYou.length > 3 ? (
                <div className="relative">
                  {nearYouSlideIndex > 0 && (
                    <button
                      onClick={() => {
                        const newIndex = nearYouSlideIndex - 1;
                        setNearYouSlideIndex(newIndex);
                        if (nearYouScrollRef.current) {
                          nearYouScrollRef.current.scrollTo({
                            left: newIndex * nearYouScrollRef.current.clientWidth,
                            behavior: "smooth",
                          });
                        }
                      }}
                      className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full shadow-lg p-3 hover:bg-gray-50 transition-colors border border-gray-200"
                      aria-label="Previous"
                    >
                      <FaChevronLeft className="w-5 h-5 text-gray-700" />
                    </button>
                  )}

                  <div
                    ref={nearYouScrollRef}
                    className="flex overflow-x-auto scroll-smooth snap-x snap-mandatory gap-6 pb-4 no-scrollbar"
                    style={{
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none'
                    }}
                    onScroll={(e) => {
                      const scrollLeft = e.target.scrollLeft;
                      const clientWidth = e.target.clientWidth;
                      const maxIndex = Math.ceil(servicesNearYou.length / 3) - 1;
                      const currentIndex = Math.round(scrollLeft / clientWidth);
                      if (currentIndex !== nearYouSlideIndex && currentIndex <= maxIndex) {
                        setNearYouSlideIndex(currentIndex);
                      }
                    }}
                  >
                    {servicesNearYou.map((service, index) => (
                      <div
                        key={service.id}
                        className="min-w-[calc(33.333%-1rem)] sm:min-w-[calc(33.333%-1rem)] flex-shrink-0 snap-start"
                      >
                        <AnimatedCard delay={index * 0.05}>
                          <div 
                            onClick={(e) => {
                              if (e.target.closest('button')) return;
                              handleViewDetails(service);
                            }}
                            className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200/60 hover:border-emerald-200 group h-full flex flex-col cursor-pointer relative w-full"
                          >
                            <div className="relative h-40 sm:h-48 md:h-52 lg:h-56 w-full overflow-hidden bg-gradient-to-r from-emerald-500 to-emerald-600">
                              {service.image ? (
                                <>
                                  <img 
                                    src={service.image} 
                                    alt={service.title}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                </>
                              ) : (
                                <div className={`absolute inset-0 bg-gradient-to-br ${service.color || 'from-emerald-500 to-emerald-600'}`}></div>
                              )}
                              
                              <div className="absolute top-2 sm:top-3 left-2 sm:left-3 bg-white/95 backdrop-blur-sm rounded-lg sm:rounded-xl p-2 sm:p-2.5 shadow-sm border border-gray-200/60 z-10">
                                <span className="text-lg sm:text-xl lg:text-2xl">{service.icon || '✨'}</span>
                              </div>
                              
                              {service.rating > 0 && (
                                <div className="absolute left-2 sm:left-3 bottom-2 sm:bottom-3 bg-white/95 backdrop-blur-sm text-gray-800 text-xs sm:text-sm font-semibold px-2 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-sm border border-gray-200/60 flex items-center gap-1 z-10">
                                  <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                                  </svg>
                                  <span>{service.rating.toFixed(1)}</span>
                                </div>
                              )}

                              {service.discount > 0 && (
                                <div className="absolute top-2 sm:top-3 right-2 sm:right-3 bg-gradient-to-r from-red-500 to-red-600 text-white text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg shadow-lg z-10 border-2 border-white/50">
                                    {service.discount}% OFF
                                </div>
                              )}
                            </div>
                            
                            <div className="p-3 sm:p-4 lg:p-5 flex-1 flex flex-col">
                              <div className="mb-3 sm:mb-4 flex-1">
                                <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 line-clamp-2 leading-tight mb-1.5 sm:mb-2 group-hover:text-emerald-700 transition-colors">
                                  {service.title}
                                </h3>
                                
                                {service.location && (
                                  <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">
                                    <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                    </svg>
                                    <span className="line-clamp-1">{service.location}</span>
                                  </div>
                                )}
                                
                                <p className="text-gray-600 text-xs sm:text-sm leading-relaxed line-clamp-2 mb-2 sm:mb-3">
                                  {service.description}
                                </p>

                                {service.reviews > 0 && (
                                  <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-gray-600">
                                    <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-500 fill-current" viewBox="0 0 20 20">
                                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                                    </svg>
                                    <span className="font-semibold text-gray-900">{service.rating.toFixed(1)}</span>
                                    <span className="text-gray-400">•</span>
                                    <span className="text-gray-600">{service.reviews} {service.reviews === 1 ? 'booking' : 'bookings'}</span>
                                  </div>
                                )}
                              </div>

                              <div className="mt-auto pt-3 sm:pt-4 border-t border-gray-100">
                                <div className="flex items-center justify-between gap-2 sm:gap-3">
                                  <div className="min-w-0 flex-1">
                                    {service.discount > 0 ? (
                                      <div>
                                        <div className="flex items-baseline gap-1.5 sm:gap-2 mb-0.5 sm:mb-1 flex-wrap">
                                          <span className="text-lg sm:text-xl font-bold text-emerald-600">
                                            ₱{((service.rate || 0) * (1 - service.discount / 100)).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                          </span>
                                          <span className="text-xs sm:text-sm text-gray-400 line-through font-medium">
                                            ₱{(service.rate || 0).toLocaleString()}
                                          </span>
                                          <span className="text-[10px] sm:text-xs text-red-600 font-bold bg-red-50 px-1.5 sm:px-2 py-0.5 rounded">
                                            -{service.discount}%
                                          </span>
                                        </div>
                                        <p className="text-[10px] sm:text-xs text-gray-500 whitespace-nowrap">{service.duration}</p>
                                      </div>
                                    ) : (
                                      <div>
                                        <span className="text-lg sm:text-xl font-bold text-emerald-600">₱{(service.rate || 0).toLocaleString()}</span>
                                        <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1 whitespace-nowrap">{service.duration}</p>
                                      </div>
                                    )}
                                  </div>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewDetails(service);
                                    }}
                                    className="bg-emerald-600 text-white py-2 sm:py-2.5 px-3 sm:px-5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium hover:bg-emerald-700 transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 whitespace-nowrap flex items-center gap-1.5 sm:gap-2 flex-shrink-0"
                                  >
                                    Book
                                    <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="absolute inset-0 border-2 border-transparent group-hover:border-emerald-200 rounded-2xl pointer-events-none transition-all duration-300"></div>
                          </div>
                        </AnimatedCard>
                      </div>
                    ))}
                  </div>

                  {servicesNearYou.length > 3 && 
                   nearYouSlideIndex < Math.ceil(servicesNearYou.length / 3) - 1 && (
                    <button
                      onClick={() => {
                        const maxIndex = Math.ceil(servicesNearYou.length / 3) - 1;
                        if (nearYouSlideIndex < maxIndex) {
                          const newIndex = nearYouSlideIndex + 1;
                          setNearYouSlideIndex(newIndex);
                          if (nearYouScrollRef.current) {
                            nearYouScrollRef.current.scrollTo({
                              left: newIndex * nearYouScrollRef.current.clientWidth,
                              behavior: "smooth",
                            });
                          }
                        }
                      }}
                      className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full shadow-lg p-3 hover:bg-gray-50 transition-colors border border-gray-200"
                      aria-label="Next"
                    >
                      <FaChevronRight className="w-5 h-5 text-gray-700" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {servicesNearYou.map((service, index) => (
                    <AnimatedCard key={service.id} delay={index * 0.1}>
                      {/* Reuse same card structure as suggested services */}
                      <div 
                        onClick={(e) => {
                          if (e.target.closest('button')) return;
                          handleViewDetails(service);
                        }}
                        className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200/60 hover:border-emerald-200 group h-full flex flex-col cursor-pointer relative w-full"
                      >
                        <div className="relative h-40 sm:h-48 md:h-52 lg:h-56 w-full overflow-hidden bg-gradient-to-r from-emerald-500 to-emerald-600">
                          {service.image ? (
                            <>
                              <img 
                                src={service.image} 
                                alt={service.title}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            </>
                          ) : (
                            <div className={`absolute inset-0 bg-gradient-to-br ${service.color || 'from-emerald-500 to-emerald-600'}`}></div>
                          )}
                          
                          <div className="absolute top-2 sm:top-3 left-2 sm:left-3 bg-white/95 backdrop-blur-sm rounded-lg sm:rounded-xl p-2 sm:p-2.5 shadow-sm border border-gray-200/60 z-10">
                            <span className="text-lg sm:text-xl lg:text-2xl">{service.icon || '✨'}</span>
                          </div>
                          
                          {service.rating > 0 && (
                            <div className="absolute left-2 sm:left-3 bottom-2 sm:bottom-3 bg-white/95 backdrop-blur-sm text-gray-800 text-xs sm:text-sm font-semibold px-2 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-sm border border-gray-200/60 flex items-center gap-1 z-10">
                              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                              </svg>
                              <span>{service.rating.toFixed(1)}</span>
                            </div>
                          )}

                          {service.discount > 0 && (
                            <div className="absolute top-2 sm:top-3 right-2 sm:right-3 bg-gradient-to-r from-red-500 to-red-600 text-white text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg shadow-lg z-10 border-2 border-white/50">
                                {service.discount}% OFF
                            </div>
                          )}
                        </div>
                        
                        <div className="p-3 sm:p-4 lg:p-5 flex-1 flex flex-col">
                          <div className="mb-3 sm:mb-4 flex-1">
                            <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 line-clamp-2 leading-tight mb-1.5 sm:mb-2 group-hover:text-emerald-700 transition-colors">
                              {service.title}
                            </h3>
                            
                            {service.location && (
                              <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">
                                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                </svg>
                                <span className="line-clamp-1">{service.location}</span>
                              </div>
                            )}
                            
                            <p className="text-gray-600 text-xs sm:text-sm leading-relaxed line-clamp-2 mb-2 sm:mb-3">
                              {service.description}
                            </p>

                            {service.reviews > 0 && (
                              <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-gray-600">
                                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-500 fill-current" viewBox="0 0 20 20">
                                  <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                                </svg>
                                <span className="font-semibold text-gray-900">{service.rating.toFixed(1)}</span>
                                <span className="text-gray-400">•</span>
                                <span className="text-gray-600">{service.reviews} {service.reviews === 1 ? 'booking' : 'bookings'}</span>
                              </div>
                            )}
                          </div>

                          <div className="mt-auto pt-3 sm:pt-4 border-t border-gray-100">
                            <div className="flex items-center justify-between gap-2 sm:gap-3">
                              <div className="min-w-0 flex-1">
                                {service.discount > 0 ? (
                                  <div>
                                    <div className="flex items-baseline gap-1.5 sm:gap-2 mb-0.5 sm:mb-1 flex-wrap">
                                      <span className="text-lg sm:text-xl font-bold text-emerald-600">
                                        ₱{((service.rate || 0) * (1 - service.discount / 100)).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                      </span>
                                      <span className="text-xs sm:text-sm text-gray-400 line-through font-medium">
                                        ₱{(service.rate || 0).toLocaleString()}
                                      </span>
                                      <span className="text-[10px] sm:text-xs text-red-600 font-bold bg-red-50 px-1.5 sm:px-2 py-0.5 rounded">
                                        -{service.discount}%
                                      </span>
                                    </div>
                                    <p className="text-[10px] sm:text-xs text-gray-500 whitespace-nowrap">{service.duration}</p>
                                  </div>
                                ) : (
                                  <div>
                                    <span className="text-lg sm:text-xl font-bold text-emerald-600">₱{(service.rate || 0).toLocaleString()}</span>
                                    <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1 whitespace-nowrap">{service.duration}</p>
                                  </div>
                                )}
                              </div>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewDetails(service);
                                }}
                                className="bg-emerald-600 text-white py-2 sm:py-2.5 px-3 sm:px-5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium hover:bg-emerald-700 transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 whitespace-nowrap flex items-center gap-1.5 sm:gap-2 flex-shrink-0"
                              >
                                Book
                                <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="absolute inset-0 border-2 border-transparent group-hover:border-emerald-200 rounded-2xl pointer-events-none transition-all duration-300"></div>
                      </div>
                    </AnimatedCard>
                  ))}
                </div>
              )}
            </AnimatedSection>
          )}

          {/* SECTION 3: List of All Services - Shows ALL services (including duplicates from sections 1 & 2) */}
          <AnimatedSection className="mb-8">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">List of all services</h2>
              <p className="text-sm text-gray-600">Browse all available services</p>
            </div>

            {/* Services Grid */}
            <AnimatedGrid className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 xl:gap-8">
              {loading ? (
                <div className="col-span-full text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading services...</p>
                </div>
              ) : filteredServices.length === 0 ? (
                <div className="col-span-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl sm:rounded-2xl shadow-inner p-8 sm:p-12 lg:p-16 text-center border-2 border-dashed border-gray-300">
                  <div className="mb-4 sm:mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-white rounded-full shadow-lg mb-3 sm:mb-4">
                      <svg className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1.5 sm:mb-2">No services found</h3>
                  <p className="text-sm sm:text-base text-gray-600 max-w-md mx-auto mb-4 sm:mb-6 px-2">
                    {searchQuery || selectedCategory !== 'all' || selectedLocation !== 'all' || priceRange !== 'all' 
                      ? 'Try adjusting your filters to see more results.'
                      : "We're working on bringing you amazing local services. Check back soon!"}
                  </p>
                  {(searchQuery || selectedCategory !== 'all' || selectedLocation !== 'all' || priceRange !== 'all') && (
                    <button
                      onClick={() => {
                        setSelectedCategory('all');
                        setSelectedLocation('all');
                        setPriceRange('all');
                        setSearchQuery('');
                      }}
                      className="px-4 sm:px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-xs sm:text-sm"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              ) : (
                paginatedServices.map((service) => (
                <AnimatedCard key={service.id} delay={service.delay}>
                  <div 
                    onClick={(e) => {
                      // Don't trigger if clicking on buttons
                      if (e.target.closest('button')) {
                        return;
                      }
                      handleViewDetails(service);
                    }}
                    className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200/60 hover:border-emerald-200 group h-full flex flex-col cursor-pointer relative w-full"
                  >
                    {/* Service Image/Header */}
                    <div className="relative h-40 sm:h-48 md:h-52 lg:h-56 w-full overflow-hidden bg-gradient-to-r from-emerald-500 to-emerald-600">
                      {service.image ? (
                        <>
                          <img 
                            src={service.image} 
                            alt={service.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </>
                      ) : (
                        <div className={`absolute inset-0 bg-gradient-to-br ${service.color || 'from-emerald-500 to-emerald-600'}`}></div>
                      )}
                      
                      {/* Icon Badge */}
                      <div className="absolute top-2 sm:top-3 left-2 sm:left-3 bg-white/95 backdrop-blur-sm rounded-lg sm:rounded-xl p-2 sm:p-2.5 shadow-sm border border-gray-200/60 z-10">
                        <span className="text-lg sm:text-xl lg:text-2xl">{service.icon || '✨'}</span>
                      </div>
                      
                      {/* Rating Badge */}
                      {service.rating > 0 && (
                        <div className="absolute left-2 sm:left-3 bottom-2 sm:bottom-3 bg-white/95 backdrop-blur-sm text-gray-800 text-xs sm:text-sm font-semibold px-2 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-sm border border-gray-200/60 flex items-center gap-1 z-10">
                          <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                          </svg>
                          <span>{service.rating.toFixed(1)}</span>
                        </div>
                      )}

                      {/* Discount Badge */}
                      {service.discount > 0 && (
                        <div className="absolute top-2 sm:top-3 right-2 sm:right-3 bg-gradient-to-r from-red-500 to-red-600 text-white text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg shadow-lg z-10 border-2 border-white/50">
                          {service.discount}% OFF
                        </div>
                      )}
                    </div>
                    
                    <div className="p-3 sm:p-4 lg:p-5 flex-1 flex flex-col">
                      {/* Service Info */}
                      <div className="mb-3 sm:mb-4 flex-1">
                        <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 line-clamp-2 leading-tight mb-1.5 sm:mb-2 group-hover:text-emerald-700 transition-colors">
                          {service.title}
                        </h3>
                        
                        {/* Location */}
                        {service.location && (
                          <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">
                            <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                            <span className="line-clamp-1">{service.location}</span>
                          </div>
                        )}
                        
                        <p className="text-gray-600 text-xs sm:text-sm leading-relaxed line-clamp-2 mb-2 sm:mb-3">
                          {service.description}
                        </p>

                        {/* Reviews & Bookings */}
                        {service.reviews > 0 && (
                          <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-gray-600">
                            <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-500 fill-current" viewBox="0 0 20 20">
                              <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                            </svg>
                            <span className="font-semibold text-gray-900">{service.rating.toFixed(1)}</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-600">{service.reviews} {service.reviews === 1 ? 'booking' : 'bookings'}</span>
                          </div>
                        )}
                      </div>

                      {/* Price and CTA */}
                      <div className="mt-auto pt-3 sm:pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between gap-2 sm:gap-3">
                          <div className="min-w-0 flex-1">
                            {service.discount > 0 ? (
                              <div>
                                <div className="flex items-baseline gap-1.5 sm:gap-2 mb-0.5 sm:mb-1 flex-wrap">
                                  <span className="text-lg sm:text-xl font-bold text-emerald-600">
                                    ₱{((service.rate || 0) * (1 - service.discount / 100)).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                  </span>
                                  <span className="text-xs sm:text-sm text-gray-400 line-through font-medium">
                                    ₱{(service.rate || 0).toLocaleString()}
                                  </span>
                                  <span className="text-[10px] sm:text-xs text-red-600 font-bold bg-red-50 px-1.5 sm:px-2 py-0.5 rounded">
                                    -{service.discount}%
                                  </span>
                                </div>
                                <p className="text-[10px] sm:text-xs text-gray-500 whitespace-nowrap">{service.duration}</p>
                              </div>
                            ) : (
                              <div>
                                <span className="text-lg sm:text-xl font-bold text-emerald-600">₱{(service.rate || 0).toLocaleString()}</span>
                                <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1 whitespace-nowrap">{service.duration}</p>
                              </div>
                            )}
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetails(service);
                            }}
                            className="bg-emerald-600 text-white py-2 sm:py-2.5 px-3 sm:px-5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium hover:bg-emerald-700 transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 whitespace-nowrap flex items-center gap-1.5 sm:gap-2 flex-shrink-0"
                          >
                            Book
                            <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Hover effect border */}
                    <div className="absolute inset-0 border-2 border-transparent group-hover:border-emerald-200 rounded-2xl pointer-events-none transition-all duration-300"></div>
                  </div>
                </AnimatedCard>
                ))
              )}
            </AnimatedGrid>

            {/* Pagination */}
            {filteredServices.length > itemsPerPage && (
              <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-gray-200">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="hidden sm:inline">Previous</span>
                  <span className="sm:hidden">Prev</span>
                </button>
                
                <div className="flex items-center gap-1 sm:gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-colors text-xs sm:text-sm ${
                            currentPage === page
                              ? 'bg-emerald-600 text-white'
                              : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return <span key={page} className="px-1 sm:px-2 text-gray-400 text-xs sm:text-sm">...</span>;
                    }
                    return null;
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
                >
                  <span className="hidden sm:inline">Next</span>
                  <span className="sm:hidden">Next</span>
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}

            {/* Results info */}
            {filteredServices.length > 0 && (
              <div className="text-center mt-3 sm:mt-4 text-xs sm:text-sm text-gray-600">
                Showing {startIndex + 1} - {Math.min(endIndex, filteredServices.length)} of {filteredServices.length} services
              </div>
            )}
          </AnimatedSection>
        </section>
      </div>
    </main>
  );
};

export default Services;