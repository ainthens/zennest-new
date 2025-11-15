// Experiences.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { useNavigate } from "react-router-dom";
import experiencesHero from "../assets/experiences-hero-section.png";
import { getPublishedListings, getGuestProfile } from "../services/firestoreService";
import { FaBullseye, FaStar, FaMapMarkerAlt, FaMagic, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import Filters from "../components/Filters";
import Loading from "../components/Loading";
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

// Optimized animated component wrapper
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

const Experiences = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const videoRef = useRef(null);
  const [heroRef, heroInView] = useInView({
    triggerOnce: true,
    threshold: 0.2,
  });

  // Get Cloudinary configuration
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const experiencesHeroVideoPublicId = 'Experiences_rveir0';

  // Construct optimized Cloudinary video URL
  const getOptimizedVideoUrl = () => {
    if (!cloudName) {
      console.warn('Cloudinary cloud name not configured. Check your .env file.');
      return null;
    }
    
    // Remove any existing extension from public ID if present
    const publicId = experiencesHeroVideoPublicId.replace(/\.(mp4|webm|mov)$/i, '');
    
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

  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [priceRange, setPriceRange] = useState('all');
  const [sortBy, setSortBy] = useState('featured');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  
  // New state for suggested experiences and experiences near you
  const [userProvince, setUserProvince] = useState('');
  const [suggestedExperiences, setSuggestedExperiences] = useState([]);
  const [experiencesNearYou, setExperiencesNearYou] = useState([]);
  
  // Slider state for "Experiences Near Your Place"
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

  // Fetch published experience listings from Firestore
  useEffect(() => {
    const fetchExperiences = async () => {
      try {
        setLoading(true);
        const result = await getPublishedListings('experience');
        if (result.success && result.data) {
          // SAFETY: Normalize experiences with safe defaults - never exclude experiences due to missing province/coords
          const normalizedExperiences = result.data.map((listing, index) => {
            const colors = [
              { bg: 'from-emerald-500 to-emerald-600', button: 'bg-emerald-600', hover: 'hover:bg-emerald-700', text: 'text-emerald-600' },
              { bg: 'from-emerald-400 to-emerald-500', button: 'bg-emerald-500', hover: 'hover:bg-emerald-600', text: 'text-emerald-500' },
              { bg: 'from-emerald-600 to-emerald-700', button: 'bg-emerald-700', hover: 'hover:bg-emerald-800', text: 'text-emerald-700' },
              { bg: 'from-teal-500 to-emerald-500', button: 'bg-teal-600', hover: 'hover:bg-teal-700', text: 'text-teal-600' },
              { bg: 'from-green-500 to-emerald-500', button: 'bg-green-600', hover: 'hover:bg-green-700', text: 'text-green-600' },
              { bg: 'from-emerald-500 to-teal-500', button: 'bg-emerald-600', hover: 'hover:bg-emerald-700', text: 'text-emerald-600' }
            ];
            const color = colors[index % colors.length];
            
            return {
              id: listing.id,
              title: listing.title || 'Untitled Experience',
              description: listing.description || '',
              duration: listing.promo || '2.5 hours · Guided',
              price: listing.rate || 0,
              discount: listing.discount || 0,
              image: listing.images && listing.images.length > 0 ? listing.images[0] : null,
              color: color.bg,
              buttonColor: color.button,
              hoverColor: color.hover,
              textColor: color.text,
              delay: index * 0.1,
              location: listing.location || '',
              rating: listing.rating || 0,
              guests: listing.guests || 0,
              hostId: listing.hostId,
              // Include new fields with safe defaults
              completedBookingsCount: listing.completedBookingsCount || 0,
              province: (listing.province || '').trim(), // Empty string if missing
              coords: listing.coords || null, // null if missing
              status: listing.status || 'published',
              archived: listing.archived || false
            };
          }).filter(e => e.status === 'published' && !e.archived);
          
          setExperiences(normalizedExperiences);
          console.log(`✅ Mapped ${normalizedExperiences.length} published experiences (excluding archived)`);
          console.log(`📊 Experiences with province: ${normalizedExperiences.filter(e => e.province).length}, without: ${normalizedExperiences.filter(e => !e.province).length}`);

          // SECTION 1: Calculate Suggested Experiences (Top 3 by completedBookingsCount)
          // These experiences will ALSO appear in "List of All Experiences" - no filtering
          const suggested = normalizedExperiences
            .slice() // Copy array
            .sort((a, b) => (b.completedBookingsCount || 0) - (a.completedBookingsCount || 0))
            .slice(0, 3);
          setSuggestedExperiences(suggested);
          console.log(`✅ Calculated ${suggested.length} suggested experiences`);

          // SECTION 2: Calculate Experiences Near You (province-based)
          // These experiences will ALSO appear in "List of All Experiences" - no filtering
          if (userProvince) {
            const normalizedUserProvince = userProvince.toLowerCase().trim();
            console.log(`🔍 Filtering experiences for province: "${userProvince}" (normalized: "${normalizedUserProvince}")`);
            
            // Get all unique provinces from experiences for debugging
            const allProvinces = [...new Set(normalizedExperiences.map(e => (e.province || '').toLowerCase().trim()).filter(Boolean))];
            console.log(`📊 Available provinces in experiences:`, allProvinces);
            console.log(`📊 Total experiences: ${normalizedExperiences.length}, Experiences with province: ${normalizedExperiences.filter(e => e.province).length}`);
            
            const near = normalizedExperiences.filter(e => {
              const experienceProvince = (e.province || '').toLowerCase().trim();
              // Exact match
              const exactMatch = experienceProvince && experienceProvince === normalizedUserProvince;
              // Also check if location string contains the province (fallback)
              const locationMatch = e.location && e.location.toLowerCase().includes(normalizedUserProvince);
              const matches = exactMatch || locationMatch;
              
              // Debug logging for first few experiences
              if (normalizedExperiences.indexOf(e) < 3) {
                console.log(`  Experience "${e.title}": province="${e.province}" (normalized: "${experienceProvince}"), location="${e.location}", exactMatch: ${exactMatch}, locationMatch: ${locationMatch}, final: ${matches}`);
              }
              
              return matches;
            });
            
            setExperiencesNearYou(near);
            console.log(`✅ Found ${near.length} experiences near you in ${userProvince}`);
            
            if (near.length === 0 && normalizedExperiences.filter(e => e.province).length > 0) {
              console.warn(`⚠️ No matches found! User province: "${normalizedUserProvince}", Available provinces:`, allProvinces);
            }
          } else {
            setExperiencesNearYou([]);
            console.log('ℹ️ User province not set - skipping Experiences Near You section');
          }
        }
      } catch (error) {
        console.error('Error fetching experiences:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchExperiences();
  }, [userProvince]);

  // Extract unique categories and locations from experiences
  const experienceCategories = useMemo(() => {
    const cats = new Set();
    experiences.forEach(exp => {
      // Extract category from description or title
      if (exp.description?.toLowerCase().includes('tour') || exp.title?.toLowerCase().includes('tour')) {
        cats.add('tours');
      } else if (exp.description?.toLowerCase().includes('workshop') || exp.title?.toLowerCase().includes('workshop')) {
        cats.add('workshops');
      } else if (exp.description?.toLowerCase().includes('adventure') || exp.description?.toLowerCase().includes('outdoor') || exp.title?.toLowerCase().includes('adventure')) {
        cats.add('adventure');
      } else if (exp.description?.toLowerCase().includes('culture') || exp.description?.toLowerCase().includes('cultural') || exp.title?.toLowerCase().includes('culture')) {
        cats.add('cultural');
      } else {
        cats.add('other');
      }
    });
    return Array.from(cats);
  }, [experiences]);

  const locations = useMemo(() => {
    return Array.from(new Set(experiences.map(e => e.location).filter(Boolean))).sort();
  }, [experiences]);

  // Filter and sort experiences
  // CRITICAL: Do NOT filter out experiences that appear in Suggested or Near You sections
  // All experiences must appear in "List of All Experiences" regardless of where else they appear
  const filteredExperiences = useMemo(() => {
    let results = experiences.filter(experience => {
      // Category filter
      if (selectedCategory !== 'all') {
        const expCat = experience.description?.toLowerCase().includes('tour') || experience.title?.toLowerCase().includes('tour') ? 'tours' :
          experience.description?.toLowerCase().includes('workshop') || experience.title?.toLowerCase().includes('workshop') ? 'workshops' :
          experience.description?.toLowerCase().includes('adventure') || experience.description?.toLowerCase().includes('outdoor') || experience.title?.toLowerCase().includes('adventure') ? 'adventure' :
          experience.description?.toLowerCase().includes('culture') || experience.description?.toLowerCase().includes('cultural') || experience.title?.toLowerCase().includes('culture') ? 'cultural' : 'other';
        if (expCat !== selectedCategory) return false;
      }

      // Location filter
      if (selectedLocation !== 'all' && experience.location !== selectedLocation) return false;

      // Price range filter
      if (priceRange !== 'all') {
        const price = experience.price || 0;
        switch (priceRange) {
          case 'low':
            if (price > 2000) return false;
            break;
          case 'medium':
            if (price < 2000 || price > 5000) return false;
            break;
          case 'high':
            if (price < 5000) return false;
            break;
        }
      }

      // Search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!experience.title?.toLowerCase().includes(query) && 
            !experience.description?.toLowerCase().includes(query) &&
            !experience.location?.toLowerCase().includes(query)) {
          return false;
        }
      }

      return true;
    });

    // Apply sorting
    switch (sortBy) {
      case 'price-low':
        results.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price-high':
        results.sort((a, b) => (b.price || 0) - (a.price || 0));
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
  }, [experiences, selectedCategory, selectedLocation, priceRange, sortBy, searchQuery]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredExperiences.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedExperiences = filteredExperiences.slice(startIndex, endIndex);

  // Reset to page 1 when filters or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedLocation, priceRange, sortBy, searchQuery]);

  const handleViewDetails = (experience) => {
    navigate(`/listing/${experience.id}`);
  };

  const categoryLabels = {
    tours: '🚶 Tours & Walks',
    workshops: '🎨 Workshops',
    adventure: '🏔️ Adventure',
    cultural: '🏛️ Cultural',
    other: '✨ Other Experiences'
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
                src={experiencesHero}
                alt="Experiences background"
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
              style={{ backgroundImage: `url(${experiencesHero})` }}
            ></motion.div>
          )}
        </div>
        
        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/20 to-black/20 z-0"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/20 via-transparent to-purple-900/20 z-0"></div>
        
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
            className="absolute bottom-20 left-20 w-96 h-96 bg-purple-400 rounded-full blur-3xl"
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
                <span className="text-xs sm:text-sm font-medium">Curated Experiences</span>
              </motion.div>

              <motion.h1 
                initial={{ opacity: 0, y: 30 }}
                animate={heroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-semibold mb-4 sm:mb-6 leading-tight"
              >
                Discover Amazing
                <motion.span 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={heroInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.6, delay: 0.8 }}
                  className="block bg-gradient-to-r from-emerald-400 via-emerald-300 to-emerald-500 bg-clip-text text-transparent mt-1 sm:mt-2"
                >
                  Experiences
                </motion.span>
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={heroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.8, delay: 0.7 }}
                className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-200 mb-6 sm:mb-8 leading-relaxed"
              >
                Immerse yourself in authentic local culture through handpicked tours, workshops, and adventures that create lasting memories.
              </motion.p>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={heroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.8, delay: 0.9 }}
                className="grid grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8"
              >
                <div>
                  <div className="text-xl sm:text-2xl font-semibold text-emerald-400">{experiences.length > 0 ? experiences.length : '50+'}</div>
                  <div className="text-xs sm:text-sm text-gray-300">Experiences</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-semibold text-emerald-400">4.8</div>
                  <div className="text-xs sm:text-sm text-gray-300">Avg Rating</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-semibold text-emerald-400">100+</div>
                  <div className="text-xs sm:text-sm text-gray-300">Happy Guests</div>
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
                  Explore All Activities
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

            {/* Right Column - Feature Cards */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={heroInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="grid grid-cols-2 gap-2 sm:gap-3 mt-6 lg:mt-0"
            >
              {[
                { icon: FaBullseye, title: "Curated", desc: "Handpicked by locals", color: "text-purple-300" },
                { icon: FaStar, title: "Rated", desc: "Top quality experiences", color: "text-yellow-300" },
                { icon: FaMapMarkerAlt, title: "Local", desc: "Authentic culture", color: "text-emerald-300" },
                { icon: FaMagic, title: "Memorable", desc: "Unforgettable moments", color: "text-pink-300" },
              ].map((feature, idx) => {
                const IconComponent = feature.icon;
                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 30 }}
                    animate={heroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                    transition={{ duration: 0.6, delay: 0.8 + idx * 0.1 }}
                    whileHover={{ scale: 1.05, y: -5 }}
                    className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center hover:bg-white/15 transition-all"
                  >
                    <motion.div 
                      className={`mb-1.5 sm:mb-2 flex justify-center ${feature.color || "text-white"}`}
                      whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <IconComponent className="w-6 h-6 sm:w-8 sm:h-8" />
                    </motion.div>
                    <div className="text-white font-medium mb-0.5 text-xs sm:text-sm">{feature.title}</div>
                    <div className="text-[10px] sm:text-xs text-gray-300">{feature.desc}</div>
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

      {/* Experiences Grid Section */}
      <div className="w-full bg-slate-100">
        <section className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-8 sm:py-12 lg:py-16 xl:py-24">
          {/* Featured Experiences Header */}
          <AnimatedSection className="text-center mb-6 sm:mb-8 lg:mb-12">
            <motion.h2 
              variants={fadeInUp}
              className="text-xl sm:text-2xl md:text-3xl font-semibold text-emerald-900 mb-2 sm:mb-3"
            >
              Featured Experiences
            </motion.h2>
            <motion.p 
              variants={fadeInUp}
              className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto px-2"
            >
              Handpicked activities and tours that showcase the best of local culture and adventure
            </motion.p>
          </AnimatedSection>

          {/* SEARCH BAR - MOVED TO TOP */}
          <AnimatedSection className="mb-8 sm:mb-12">
            <Filters
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              selectedLocation={selectedLocation}
              setSelectedLocation={setSelectedLocation}
              priceRange={priceRange}
              setPriceRange={setPriceRange}
              sortBy={sortBy}
              setSortBy={setSortBy}
              categories={experienceCategories}
              categoryLabels={categoryLabels}
              locations={locations}
              filteredCount={filteredExperiences.length}
              totalCount={experiences.length}
              priceRangeOptions={[
                { value: 'low', label: 'Under ₱2,000' },
                { value: 'medium', label: '₱2,000 - ₱5,000' },
                { value: 'high', label: 'Over ₱5,000' }
              ]}
              sortOptions={[
                { value: 'featured', label: 'Featured' },
                { value: 'price-low', label: 'Price: Low to High' },
                { value: 'price-high', label: 'Price: High to Low' },
                { value: 'rating', label: 'Highest Rated' },
                { value: 'name', label: 'Name A-Z' }
              ]}
              searchPlaceholder="Search experiences..."
              itemLabel="experiences"
            />
          </AnimatedSection>

          {/* SECTION 1: Suggested Experiences - Top 3 by completedBookingsCount */}
          {suggestedExperiences.length > 0 && (
            <AnimatedSection className="mb-12 sm:mb-16">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Suggested Experiences</h2>
                <p className="text-sm text-gray-600">Most popular experiences based on completed bookings</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {suggestedExperiences.map((experience, index) => (
                  <AnimatedCard key={experience.id} delay={index * 0.1}>
                    <motion.div 
                      whileHover={{ y: -8, scale: 1.02 }}
                      onClick={() => handleViewDetails(experience)}
                      className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200/60 hover:border-emerald-200 group cursor-pointer h-full flex flex-col relative"
                    >
                      <div className="relative h-40 sm:h-48 md:h-52 lg:h-56 w-full overflow-hidden bg-gradient-to-r from-emerald-500 to-emerald-600">
                        {experience.image ? (
                          <>
                            <img 
                              src={experience.image} 
                              alt={experience.title}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          </>
                        ) : (
                          <div className={`absolute inset-0 bg-gradient-to-br ${experience.color || 'from-emerald-500 to-emerald-600'}`}></div>
                        )}
                        
                        {experience.rating > 0 && (
                          <div className="absolute left-2 sm:left-3 bottom-2 sm:bottom-3 bg-white/95 backdrop-blur-sm text-gray-800 text-xs sm:text-sm font-semibold px-2 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-sm border border-gray-200/60 flex items-center gap-1 z-10">
                            <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                              <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                            </svg>
                            <span>{experience.rating.toFixed(1)}</span>
                          </div>
                        )}

                        {experience.discount > 0 && (
                          <div className="absolute top-2 sm:top-3 right-2 sm:right-3 bg-gradient-to-r from-red-500 to-red-600 text-white text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg shadow-lg z-10 border-2 border-white/50">
                            {experience.discount}% OFF
                          </div>
                        )}

                        {experience.location && (
                          <div className="absolute top-2 sm:top-3 left-2 sm:left-3 bg-white/95 backdrop-blur-sm text-gray-900 rounded-lg px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold shadow-sm border border-gray-200/60 flex items-center gap-1 sm:gap-1.5 z-10">
                            <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                            <span className="truncate max-w-[80px] sm:max-w-[100px]">{experience.location}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="p-3 sm:p-4 lg:p-5 flex-1 flex flex-col">
                        <div className="mb-2 sm:mb-3">
                          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 line-clamp-2 leading-tight mb-1.5 sm:mb-2 group-hover:text-emerald-700 transition-colors">
                            {experience.title}
                          </h2>
                        </div>

                        <p className="text-gray-600 text-xs sm:text-sm leading-relaxed line-clamp-2 mb-2 sm:mb-3 flex-1">
                          {experience.description}
                        </p>

                        {experience.guests > 0 && (
                          <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-gray-600 mb-2 sm:mb-3">
                            <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <span className="font-semibold text-gray-900">Up to {experience.guests}</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-600">{experience.guests === 1 ? 'guest' : 'guests'}</span>
                          </div>
                        )}

                        <div className="mt-auto pt-3 sm:pt-4 border-t border-gray-100">
                          <div className="flex items-center justify-between gap-2 sm:gap-3">
                            <div className="min-w-0 flex-1">
                              {experience.discount > 0 ? (
                                <div>
                                  <div className="flex items-baseline gap-1.5 sm:gap-2 mb-0.5 sm:mb-1 flex-wrap">
                                    <span className="text-lg sm:text-xl font-bold text-emerald-600">
                                      ₱{((experience.price || 0) * (1 - experience.discount / 100)).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                    </span>
                                    <span className="text-xs sm:text-sm text-gray-400 line-through font-medium">
                                      ₱{(experience.price || 0).toLocaleString()}
                                    </span>
                                    <span className="text-[10px] sm:text-xs text-red-600 font-bold bg-red-50 px-1.5 sm:px-2 py-0.5 rounded">
                                      -{experience.discount}%
                                    </span>
                                  </div>
                                  <p className="text-[10px] sm:text-xs text-gray-500 whitespace-nowrap">per person</p>
                                </div>
                              ) : (
                                <div>
                                  <span className="text-lg sm:text-xl font-bold text-emerald-600">₱{(experience.price || 0).toLocaleString()}</span>
                                  <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1 whitespace-nowrap">per person</p>
                                </div>
                              )}
                            </div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetails(experience);
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
                    </motion.div>
                  </AnimatedCard>
                ))}
              </div>
            </AnimatedSection>
          )}

          {/* SECTION 2: Experiences Near Your Place - Province-based with slider if >3 */}
          {userProvince && (
            <AnimatedSection className="mb-12 sm:mb-16">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Experiences near your place</h2>
                <p className="text-sm text-gray-600">Experiences in {userProvince}</p>
              </div>
              
              {experiencesNearYou.length === 0 ? (
                <div className="bg-gray-50 rounded-xl p-8 text-center border border-gray-200">
                  <p className="text-gray-600">No nearby experiences found based on your location.</p>
                </div>
              ) : experiencesNearYou.length > 3 ? (
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
                      const maxIndex = Math.ceil(experiencesNearYou.length / 3) - 1;
                      const currentIndex = Math.round(scrollLeft / clientWidth);
                      if (currentIndex !== nearYouSlideIndex && currentIndex <= maxIndex) {
                        setNearYouSlideIndex(currentIndex);
                      }
                    }}
                  >
                    {experiencesNearYou.map((experience, index) => (
                      <div
                        key={experience.id}
                        className="min-w-[calc(33.333%-1rem)] sm:min-w-[calc(33.333%-1rem)] flex-shrink-0 snap-start"
                      >
                        <AnimatedCard delay={index * 0.05}>
                          <motion.div 
                            whileHover={{ y: -8, scale: 1.02 }}
                            onClick={() => handleViewDetails(experience)}
                            className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200/60 hover:border-emerald-200 group cursor-pointer h-full flex flex-col relative"
                          >
                            <div className="relative h-40 sm:h-48 md:h-52 lg:h-56 w-full overflow-hidden bg-gradient-to-r from-emerald-500 to-emerald-600">
                              {experience.image ? (
                                <>
                                  <img 
                                    src={experience.image} 
                                    alt={experience.title}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                </>
                              ) : (
                                <div className={`absolute inset-0 bg-gradient-to-br ${experience.color || 'from-emerald-500 to-emerald-600'}`}></div>
                              )}
                              
                              {experience.rating > 0 && (
                                <div className="absolute left-2 sm:left-3 bottom-2 sm:bottom-3 bg-white/95 backdrop-blur-sm text-gray-800 text-xs sm:text-sm font-semibold px-2 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-sm border border-gray-200/60 flex items-center gap-1 z-10">
                                    <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                                    </svg>
                                    <span>{experience.rating.toFixed(1)}</span>
                                </div>
                              )}

                              {experience.discount > 0 && (
                                <div className="absolute top-2 sm:top-3 right-2 sm:right-3 bg-gradient-to-r from-red-500 to-red-600 text-white text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg shadow-lg z-10 border-2 border-white/50">
                                    {experience.discount}% OFF
                                </div>
                              )}

                              {experience.location && (
                                <div className="absolute top-2 sm:top-3 left-2 sm:left-3 bg-white/95 backdrop-blur-sm text-gray-900 rounded-lg px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold shadow-sm border border-gray-200/60 flex items-center gap-1 sm:gap-1.5 z-10">
                                    <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                    </svg>
                                    <span className="truncate max-w-[80px] sm:max-w-[100px]">{experience.location}</span>
                                </div>
                              )}
                            </div>
                            
                            <div className="p-3 sm:p-4 lg:p-5 flex-1 flex flex-col">
                              <div className="mb-2 sm:mb-3">
                                <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 line-clamp-2 leading-tight mb-1.5 sm:mb-2 group-hover:text-emerald-700 transition-colors">
                                  {experience.title}
                                </h2>
                              </div>

                              <p className="text-gray-600 text-xs sm:text-sm leading-relaxed line-clamp-2 mb-2 sm:mb-3 flex-1">
                                {experience.description}
                              </p>

                              {experience.guests > 0 && (
                                <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-gray-600 mb-2 sm:mb-3">
                                    <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    <span className="font-semibold text-gray-900">Up to {experience.guests}</span>
                                    <span className="text-gray-400">•</span>
                                    <span className="text-gray-600">{experience.guests === 1 ? 'guest' : 'guests'}</span>
                                </div>
                              )}

                              <div className="mt-auto pt-3 sm:pt-4 border-t border-gray-100">
                                <div className="flex items-center justify-between gap-2 sm:gap-3">
                                  <div className="min-w-0 flex-1">
                                    {experience.discount > 0 ? (
                                      <div>
                                        <div className="flex items-baseline gap-1.5 sm:gap-2 mb-0.5 sm:mb-1 flex-wrap">
                                          <span className="text-lg sm:text-xl font-bold text-emerald-600">
                                            ₱{((experience.price || 0) * (1 - experience.discount / 100)).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                          </span>
                                          <span className="text-xs sm:text-sm text-gray-400 line-through font-medium">
                                            ₱{(experience.price || 0).toLocaleString()}
                                          </span>
                                          <span className="text-[10px] sm:text-xs text-red-600 font-bold bg-red-50 px-1.5 sm:px-2 py-0.5 rounded">
                                            -{experience.discount}%
                                          </span>
                                        </div>
                                        <p className="text-[10px] sm:text-xs text-gray-500 whitespace-nowrap">per person</p>
                                      </div>
                                    ) : (
                                      <div>
                                        <span className="text-lg sm:text-xl font-bold text-emerald-600">₱{(experience.price || 0).toLocaleString()}</span>
                                        <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1 whitespace-nowrap">per person</p>
                                      </div>
                                    )}
                                  </div>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewDetails(experience);
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
                          </motion.div>
                        </AnimatedCard>
                      </div>
                    ))}
                  </div>

                  {experiencesNearYou.length > 3 && 
                   nearYouSlideIndex < Math.ceil(experiencesNearYou.length / 3) - 1 && (
                    <button
                      onClick={() => {
                        const maxIndex = Math.ceil(experiencesNearYou.length / 3) - 1;
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
                  {experiencesNearYou.map((experience, index) => (
                    <AnimatedCard key={experience.id} delay={index * 0.1}>
                      <motion.div 
                        whileHover={{ y: -8, scale: 1.02 }}
                        onClick={() => handleViewDetails(experience)}
                        className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200/60 hover:border-emerald-200 group cursor-pointer h-full flex flex-col relative"
                      >
                        <div className="relative h-40 sm:h-48 md:h-52 lg:h-56 w-full overflow-hidden bg-gradient-to-r from-emerald-500 to-emerald-600">
                          {experience.image ? (
                            <>
                              <img 
                                src={experience.image} 
                                alt={experience.title}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            </>
                          ) : (
                            <div className={`absolute inset-0 bg-gradient-to-br ${experience.color || 'from-emerald-500 to-emerald-600'}`}></div>
                          )}
                          
                          {experience.rating > 0 && (
                            <div className="absolute left-2 sm:left-3 bottom-2 sm:bottom-3 bg-white/95 backdrop-blur-sm text-gray-800 text-xs sm:text-sm font-semibold px-2 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-sm border border-gray-200/60 flex items-center gap-1 z-10">
                              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                              </svg>
                              <span>{experience.rating.toFixed(1)}</span>
                            </div>
                          )}

                          {experience.discount > 0 && (
                            <div className="absolute top-2 sm:top-3 right-2 sm:right-3 bg-gradient-to-r from-red-500 to-red-600 text-white text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg shadow-lg z-10 border-2 border-white/50">
                              {experience.discount}% OFF
                            </div>
                          )}

                          {experience.location && (
                            <div className="absolute top-2 sm:top-3 left-2 sm:left-3 bg-white/95 backdrop-blur-sm text-gray-900 rounded-lg px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold shadow-sm border border-gray-200/60 flex items-center gap-1 sm:gap-1.5 z-10">
                              <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                              </svg>
                              <span className="truncate max-w-[80px] sm:max-w-[100px]">{experience.location}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="p-3 sm:p-4 lg:p-5 flex-1 flex flex-col">
                          <div className="mb-2 sm:mb-3">
                            <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 line-clamp-2 leading-tight mb-1.5 sm:mb-2 group-hover:text-emerald-700 transition-colors">
                              {experience.title}
                            </h2>
                          </div>

                          <p className="text-gray-600 text-xs sm:text-sm leading-relaxed line-clamp-2 mb-2 sm:mb-3 flex-1">
                            {experience.description}
                          </p>

                          {experience.guests > 0 && (
                            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-gray-600 mb-2 sm:mb-3">
                              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              <span className="font-semibold text-gray-900">Up to {experience.guests}</span>
                              <span className="text-gray-400">•</span>
                              <span className="text-gray-600">{experience.guests === 1 ? 'guest' : 'guests'}</span>
                            </div>
                          )}

                          <div className="mt-auto pt-3 sm:pt-4 border-t border-gray-100">
                            <div className="flex items-center justify-between gap-2 sm:gap-3">
                              <div className="min-w-0 flex-1">
                                {experience.discount > 0 ? (
                                  <div>
                                    <div className="flex items-baseline gap-1.5 sm:gap-2 mb-0.5 sm:mb-1 flex-wrap">
                                      <span className="text-lg sm:text-xl font-bold text-emerald-600">
                                        ₱{((experience.price || 0) * (1 - experience.discount / 100)).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                      </span>
                                      <span className="text-xs sm:text-sm text-gray-400 line-through font-medium">
                                        ₱{(experience.price || 0).toLocaleString()}
                                      </span>
                                      <span className="text-[10px] sm:text-xs text-red-600 font-bold bg-red-50 px-1.5 sm:px-2 py-0.5 rounded">
                                        -{experience.discount}%
                                      </span>
                                    </div>
                                    <p className="text-[10px] sm:text-xs text-gray-500 whitespace-nowrap">per person</p>
                                  </div>
                                ) : (
                                  <div>
                                    <span className="text-lg sm:text-xl font-bold text-emerald-600">₱{(experience.price || 0).toLocaleString()}</span>
                                    <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1 whitespace-nowrap">per person</p>
                                  </div>
                                )}
                              </div>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewDetails(experience);
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
                      </motion.div>
                    </AnimatedCard>
                  ))}
                </div>
              )}
            </AnimatedSection>
          )}

          {/* SECTION 3: List of All Experiences - Shows ALL experiences (including duplicates from sections 1 & 2) */}
          <AnimatedSection className="mb-8">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">List of all experiences</h2>
              <p className="text-sm text-gray-600">Browse all available experiences</p>
            </div>

            {/* Experiences Grid */}
            <AnimatedGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
              {loading ? (
                <div className="col-span-full">
                  <Loading message="Loading experiences..." size="medium" fullScreen={false} />
                </div>
              ) : filteredExperiences.length === 0 ? (
                <div className="col-span-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl sm:rounded-2xl shadow-inner p-8 sm:p-12 lg:p-16 text-center border-2 border-dashed border-gray-300">
                  <div className="mb-4 sm:mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-white rounded-full shadow-lg mb-3 sm:mb-4">
                      <svg className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1.5 sm:mb-2">No experiences found</h3>
                  <p className="text-sm sm:text-base text-gray-600 max-w-md mx-auto mb-4 sm:mb-6 px-2">
                    {searchQuery || selectedCategory !== 'all' || selectedLocation !== 'all' || priceRange !== 'all' 
                      ? 'Try adjusting your filters to see more results.'
                      : "We're curating amazing local experiences for you. Check back soon for adventures!"}
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
                paginatedExperiences.map((experience) => (
                  <AnimatedCard key={experience.id} delay={experience.delay}>
                    <motion.div 
                      whileHover={{ y: -8, scale: 1.02 }}
                      onClick={() => handleViewDetails(experience)}
                      className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200/60 hover:border-emerald-200 group cursor-pointer h-full flex flex-col relative"
                    >
                      {/* Experience Image */}
                      <div className="relative h-40 sm:h-48 md:h-52 lg:h-56 w-full overflow-hidden bg-gradient-to-r from-emerald-500 to-emerald-600">
                        {experience.image ? (
                          <>
                            <img 
                              src={experience.image} 
                              alt={experience.title}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          </>
                        ) : (
                          <div className={`absolute inset-0 bg-gradient-to-br ${experience.color || 'from-emerald-500 to-emerald-600'}`}></div>
                        )}
                        
                        {/* Rating Badge */}
                        {experience.rating > 0 && (
                          <div className="absolute left-2 sm:left-3 bottom-2 sm:bottom-3 bg-white/95 backdrop-blur-sm text-gray-800 text-xs sm:text-sm font-semibold px-2 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-sm border border-gray-200/60 flex items-center gap-1 z-10">
                            <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                              <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                            </svg>
                            <span>{experience.rating.toFixed(1)}</span>
                          </div>
                        )}

                        {/* Discount Badge */}
                        {experience.discount > 0 && (
                          <div className="absolute top-2 sm:top-3 right-2 sm:right-3 bg-gradient-to-r from-red-500 to-red-600 text-white text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg shadow-lg z-10 border-2 border-white/50">
                            {experience.discount}% OFF
                          </div>
                        )}

                        {/* Location Badge */}
                        {experience.location && (
                          <div className="absolute top-2 sm:top-3 left-2 sm:left-3 bg-white/95 backdrop-blur-sm text-gray-900 rounded-lg px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold shadow-sm border border-gray-200/60 flex items-center gap-1 sm:gap-1.5 z-10">
                            <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                            <span className="truncate max-w-[80px] sm:max-w-[100px]">{experience.location}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Experience Content */}
                      <div className="p-3 sm:p-4 lg:p-5 flex-1 flex flex-col">
                        {/* Title */}
                        <div className="mb-2 sm:mb-3">
                          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 line-clamp-2 leading-tight mb-1.5 sm:mb-2 group-hover:text-emerald-700 transition-colors">
                            {experience.title}
                          </h2>
                        </div>

                        {/* Description */}
                        <p className="text-gray-600 text-xs sm:text-sm leading-relaxed line-clamp-2 mb-2 sm:mb-3 flex-1">
                          {experience.description}
                        </p>

                        {/* Guests Badge */}
                        {experience.guests > 0 && (
                          <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-gray-600 mb-2 sm:mb-3">
                            <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <span className="font-semibold text-gray-900">Up to {experience.guests}</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-600">{experience.guests === 1 ? 'guest' : 'guests'}</span>
                          </div>
                        )}

                        {/* Price and CTA */}
                        <div className="mt-auto pt-3 sm:pt-4 border-t border-gray-100">
                          <div className="flex items-center justify-between gap-2 sm:gap-3">
                            <div className="min-w-0 flex-1">
                              {experience.discount > 0 ? (
                                <div>
                                  <div className="flex items-baseline gap-1.5 sm:gap-2 mb-0.5 sm:mb-1 flex-wrap">
                                    <span className="text-lg sm:text-xl font-bold text-emerald-600">
                                      ₱{((experience.price || 0) * (1 - experience.discount / 100)).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                    </span>
                                    <span className="text-xs sm:text-sm text-gray-400 line-through font-medium">
                                      ₱{(experience.price || 0).toLocaleString()}
                                    </span>
                                    <span className="text-[10px] sm:text-xs text-red-600 font-bold bg-red-50 px-1.5 sm:px-2 py-0.5 rounded">
                                      -{experience.discount}%
                                    </span>
                                  </div>
                                  <p className="text-[10px] sm:text-xs text-gray-500 whitespace-nowrap">per person</p>
                                </div>
                              ) : (
                                <div>
                                  <span className="text-lg sm:text-xl font-bold text-emerald-600">₱{(experience.price || 0).toLocaleString()}</span>
                                  <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1 whitespace-nowrap">per person</p>
                                </div>
                              )}
                            </div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetails(experience);
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
                    </motion.div>
                  </AnimatedCard>
                ))
              )}
            </AnimatedGrid>

            {/* Pagination */}
            {filteredExperiences.length > itemsPerPage && (
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
            {filteredExperiences.length > 0 && (
              <div className="text-center mt-3 sm:mt-4 text-xs sm:text-sm text-gray-600">
                Showing {startIndex + 1} - {Math.min(endIndex, filteredExperiences.length)} of {filteredExperiences.length} experiences
              </div>
            )}
          </AnimatedSection>
        </section>
      </div>
    </main>
  );
};

export default Experiences;