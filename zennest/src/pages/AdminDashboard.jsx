// src/pages/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useAuth from '../hooks/useAuth';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import jsPDF from 'jspdf';

import {
  FaChartLine,
  FaDollarSign,
  FaGavel,
  FaExclamationTriangle,
  FaWallet,
  FaDownload,
  FaBars,
  FaTimes,
  FaSignOutAlt,
  FaShieldAlt,
  FaUsers,
  FaHome,
  FaCheckCircle,
  FaTimesCircle,
  FaCog,
  FaSearch,
  FaBell,
  FaChevronDown,
  FaBook,
  FaFileContract,
  FaClipboard,
  FaMoneyBillWave,
  FaInfoCircle,
  FaArrowUp,
  FaArrowDown,
  FaSpinner,
  FaStar,
  FaMedal,
  FaCalendarAlt,
  FaFilePdf,
  FaPrint,
  FaEdit,
  FaSave,
  FaPercent
} from 'react-icons/fa';

// Loading Skeleton Component
const SkeletonLoader = ({ count = 3, height = 'h-12' }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className={`${height} bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg animate-pulse`} />
    ))}
  </div>
);

// Stat Card Component
const StatCard = ({ icon: Icon, title, value, trend, loading = false }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-6 border border-gray-100"
  >
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
        {loading ? (
          <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
        ) : (
          <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        )}
      </div>
      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
        <Icon className="text-emerald-600 text-lg" />
      </div>
    </div>
    {trend && !loading && (
      <div className={`flex items-center gap-1 mt-3 text-xs font-semibold ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
        {trend > 0 ? <FaArrowUp /> : <FaArrowDown />}
        {Math.abs(trend)}% vs last month
      </div>
    )}
  </motion.div>
);

// Section Header Component
const SectionHeader = ({ icon: Icon, title, description }) => (
  <div className="mb-6">
    <div className="flex items-center gap-3 mb-2">
      {Icon && <Icon className="text-emerald-600 text-xl" />}
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
    </div>
    {description && <p className="text-sm text-gray-600 ml-8">{description}</p>}
  </div>
);

// Modal Component
const Modal = ({ isOpen, title, children, onClose, primaryAction, primaryLabel = "Save" }) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-6 flex items-center justify-between">
              <h3 className="text-lg font-bold">{title}</h3>
              <button
                onClick={onClose}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <FaTimes className="text-lg" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">{children}</div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-medium text-sm"
              >
                Cancel
              </button>
              {primaryAction && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={primaryAction}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm"
                >
                  {primaryLabel}
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

// Toast Notification Component
const Toast = ({ message, type = 'success', isVisible }) => (
  <AnimatePresence>
    {isVisible && (
      <motion.div
        initial={{ opacity: 0, y: 20, x: 20 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        exit={{ opacity: 0, y: 20, x: 20 }}
        className={`fixed bottom-6 right-6 px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 ${
          type === 'success' 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}
      >
        {type === 'success' ? (
          <FaCheckCircle className="text-green-600" />
        ) : (
          <FaTimesCircle className="text-red-600" />
        )}
        <span className={type === 'success' ? 'text-green-900' : 'text-red-900'}>
          {message}
        </span>
      </motion.div>
    )}
  </AnimatePresence>
);

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State Management
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState('overview');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const [stats, setStats] = useState({
    totalHosts: 0,
    totalGuests: 0,
    totalBookings: 0,
    totalRevenue: 0,
    activeListings: 0,
    pendingReports: 0
  });

  const [serviceFee, setServiceFee] = useState(5);
  const [editingFee, setEditingFee] = useState(false);
  const [policies, setPolicies] = useState({
    cancellation: 'Users may cancel up to 48 hours before booking.',
    platformRules: 'All listings must comply with local regulations.',
    termsOfService: 'By using this platform, you agree to our terms.'
  });
  const [editingPolicy, setEditingPolicy] = useState(null);

  // New state for enhanced features
  const [hosts, setHosts] = useState([]);
  const [guests, setGuests] = useState([]);
  const [hostSubscriptions, setHostSubscriptions] = useState([]);
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [editingTerms, setEditingTerms] = useState(false);
  const [adminFeePercentage, setAdminFeePercentage] = useState(5);
  const [adminBalance, setAdminBalance] = useState(0);
  const [ratings, setRatings] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [contractTemplate, setContractTemplate] = useState('');
  const [showContractModal, setShowContractModal] = useState(false);
  const [reportData, setReportData] = useState({
    listingsThisMonth: [],
    subscribers: [],
    cancelledBookings: [],
    upcomingBookings: []
  });
  const [reportFilter, setReportFilter] = useState('all'); // 'all', 'completed', 'cancelled', 'upcoming'
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [termsContent, setTermsContent] = useState('');
  const [savingTerms, setSavingTerms] = useState(false);

  // ADD MISSING STATE VARIABLES (fixes ReferenceError)
  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState([]);
  const [bookings, setBookings] = useState([]);

  // ✅ FIXED: REMOVED all admin authentication checks
  // AdminRoute.jsx handles access control - this component assumes it only renders when admin is verified

  // ✅ FIXED: Only check session timeout on a schedule (optional)
  useEffect(() => {
    const sessionCheckInterval = setInterval(() => {
      const isAdmin = localStorage.getItem('isAdmin');
      const adminLoginTime = localStorage.getItem('adminLoginTime');
      
      if (!isAdmin || !adminLoginTime) {
        console.log('🚪 Admin session missing - logging out');
        handleLogout();
        return;
      }

      // Check if session is older than 24 hours
      const sessionAge = Date.now() - parseInt(adminLoginTime);
      const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

      if (sessionAge > SESSION_TIMEOUT) {
        console.log('⏰ Admin session expired (24+ hours) - logging out');
        handleLogout();
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(sessionCheckInterval);
  }, [navigate]);

  // ✅ FIXED: Load dashboard data on mount, independent of auth checks
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Fetch report data when reports section is active
  useEffect(() => {
    if (activeSection === 'reports') {
      fetchReportData();
    }
  }, [activeSection]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      console.log('📊 Fetching admin dashboard data...');
      
      // Fetch real data from Firestore
      const [hostsSnapshot, guestsSnapshot, listingsSnapshot, bookingsSnapshot] = await Promise.all([
        getDocs(collection(db, 'hosts')),
        getDocs(collection(db, 'users')),
        getDocs(query(collection(db, 'listings'), where('status', '==', 'published'))),
        getDocs(collection(db, 'bookings'))
      ]);

      const hostsCount = hostsSnapshot.size;
      const guestsCount = guestsSnapshot.size;
      const listingsCount = listingsSnapshot.size;
      const bookingsCount = bookingsSnapshot.size;
      
      // Calculate total revenue from bookings
      let totalRevenue = 0;
      bookingsSnapshot.forEach(doc => {
        const booking = doc.data();
        if (booking.total) totalRevenue += booking.total;
      });
      
      setStats({
        totalHosts: hostsCount,
        totalGuests: guestsCount,
        totalBookings: bookingsCount,
        totalRevenue: totalRevenue,
        activeListings: listingsCount,
        pendingReports: 12 // TODO: Implement reports collection
      });
      
      // Fetch additional data
      await Promise.all([
        fetchHostsAndGuests(),
        fetchSubscriptions(),
        fetchTermsAndConditions(),
        fetchAdminSettings(),
        fetchRatingsAndSuggestions()
      ]);
      
      console.log('✅ Dashboard data loaded');
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      showToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch hosts and guests with rankings
  const fetchHostsAndGuests = async () => {
    try {
      const [hostsSnapshot, guestsSnapshot, bookingsSnapshot] = await Promise.all([
        getDocs(collection(db, 'hosts')),
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'bookings'))
      ]);

      // Process hosts with rankings
      const hostsData = [];
      const bookingsByHost = {};
      
      bookingsSnapshot.forEach(doc => {
        const booking = doc.data();
        const hostId = booking.hostId;
        if (hostId) {
          bookingsByHost[hostId] = (bookingsByHost[hostId] || 0) + 1;
        }
      });

      hostsSnapshot.forEach(doc => {
        const hostData = doc.data();
        hostsData.push({
          id: doc.id,
          ...hostData,
          totalBookings: bookingsByHost[doc.id] || 0,
          ranking: 0 // Will be calculated after sorting
        });
      });

      // Sort by total bookings and assign rankings
      hostsData.sort((a, b) => b.totalBookings - a.totalBookings);
      hostsData.forEach((host, index) => {
        host.ranking = index + 1;
      });

      setHosts(hostsData);

      // Process guests
      const guestsData = [];
      const bookingsByGuest = {};
      
      bookingsSnapshot.forEach(doc => {
        const booking = doc.data();
        const guestId = booking.guestId;
        if (guestId) {
          bookingsByGuest[guestId] = (bookingsByGuest[guestId] || 0) + 1;
        }
      });

      guestsSnapshot.forEach(doc => {
        const guestData = doc.data();
        guestsData.push({
          id: doc.id,
          ...guestData,
          totalBookings: bookingsByGuest[doc.id] || 0,
          ranking: 0
        });
      });

      guestsData.sort((a, b) => b.totalBookings - a.totalBookings);
      guestsData.forEach((guest, index) => {
        guest.ranking = index + 1;
      });

      setGuests(guestsData);
    } catch (error) {
      console.error('Error fetching hosts and guests:', error);
    }
  };

  // Fetch host subscriptions
  const fetchSubscriptions = async () => {
    try {
      const hostsSnapshot = await getDocs(collection(db, 'hosts'));
      const subscriptions = [];

      hostsSnapshot.forEach(doc => {
        const hostData = doc.data();
        if (hostData.subscriptionStatus === 'active' && hostData.subscriptionStartDate) {
          subscriptions.push({
            id: doc.id,
            hostName: `${hostData.firstName || ''} ${hostData.lastName || ''}`.trim() || hostData.email || 'Unknown',
            email: hostData.email || '',
            plan: hostData.subscriptionPlan || 'basic',
            status: hostData.subscriptionStatus || 'inactive',
            startDate: hostData.subscriptionStartDate?.toDate ? hostData.subscriptionStartDate.toDate() : 
                      (hostData.subscriptionStartDate instanceof Date ? hostData.subscriptionStartDate : null),
            endDate: hostData.subscriptionEndDate?.toDate ? hostData.subscriptionEndDate.toDate() : 
                    (hostData.subscriptionEndDate instanceof Date ? hostData.subscriptionEndDate : null)
          });
        }
      });

      setHostSubscriptions(subscriptions);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    }
  };

  // Fetch terms and conditions
  const fetchTermsAndConditions = async () => {
    try {
      const termsDoc = await getDoc(doc(db, 'admin', 'termsAndConditions'));
      if (termsDoc.exists()) {
        setTermsContent(termsDoc.data().content || '');
      }
    } catch (error) {
      console.error('Error fetching terms:', error);
    }
  };

  // KEEP ONLY THIS VERSION - Save Terms and Conditions (HTML version)
  const handleSaveTerms = async () => {
    if (!termsContent.trim()) {
      showToast('Terms content cannot be empty', 'error');
      return;
    }

    setSavingTerms(true);
    try {
      // Save RAW HTML to Firestore (no sanitization)
      await setDoc(doc(db, 'admin', 'termsAndConditions'), {
        content: termsContent, // Store HTML exactly as typed
        lastUpdated: new Date().toISOString(),
        updatedBy: user?.uid || 'admin'
      });
      showToast('Terms & Conditions updated successfully');
      setEditingTerms(false);
    } catch (error) {
      console.error('Error saving terms:', error);
      showToast('Failed to save terms', 'error');
    } finally {
      setSavingTerms(false);
    }
  };

  // Fetch admin settings (fee percentage and balance)
  const fetchAdminSettings = async () => {
    try {
      const adminRef = doc(db, 'admin', 'settings');
      const adminSnap = await getDoc(adminRef);
      
      if (adminSnap.exists()) {
        const data = adminSnap.data();
        setAdminFeePercentage(data.feePercentage || 5);
        setAdminBalance(data.balance || 0);
      }
    } catch (error) {
      console.error('Error fetching admin settings:', error);
    }
  };

  // REPLACED: Fetch ratings and suggestions (source of truth: bookings + listing.reviews[])
  const fetchRatingsAndSuggestions = async () => {
    try {
      // Step A: Get all bookings
      const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
      
      // Build user map for guest names (optional enhancement)
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const userMap = {};
      usersSnapshot.forEach(u => {
        const d = u.data();
        userMap[u.id] =
          (d.firstName && d.lastName) ? `${d.firstName} ${d.lastName}` :
          d.displayName || d.name || (d.email ? d.email.split('@')[0] : 'Guest');
      });

      // Step B: Suggestions from bookings
      const suggestions = [];
      bookingsSnapshot.forEach(docSnap => {
        const b = docSnap.data();
        if (b.suggestion) {
          suggestions.push({
            id: docSnap.id,
            bookingId: docSnap.id,
            listingId: b.listingId || '',
            listingTitle: b.listingTitle || 'Unknown',
            guestId: b.guestId || '',
            guestName: userMap[b.guestId] || 'Guest',
            suggestion: b.suggestion,
            createdAt: b.suggestionCreatedAt?.toDate
              ? b.suggestionCreatedAt.toDate()
              : (b.suggestionCreatedAt instanceof Date
                  ? b.suggestionCreatedAt
                  : new Date())
          });
        }
      });

      // Step C: Reviews from listings.reviews[]
      const listingsSnapshot = await getDocs(collection(db, 'listings'));
      const ratings = [];
      listingsSnapshot.forEach(listingDoc => {
        const listingData = listingDoc.data();
        const reviewsArr = Array.isArray(listingData.reviews) ? listingData.reviews : [];
        reviewsArr.forEach(r => {
          ratings.push({
            id: `${listingDoc.id}-${r.bookingId || r.guestId || Math.random().toString(36).slice(2)}`,
            bookingId: r.bookingId || '',
            listingId: listingDoc.id,
            listingTitle: listingData.title || listingData.listingTitle || 'Unknown',
            guestId: r.guestId || r.userId || '',
            guestName: r.reviewerName || userMap[r.guestId] || 'Guest',
            rating: r.rating || null,
            cleanliness: r.cleanliness,
            accuracy: r.accuracy,
            communication: r.communication,
            location: r.location,
            checkin: r.checkin,
            value: r.value,
            comment: r.comment || '',
            createdAt: r.createdAt?.toDate
              ? r.createdAt.toDate()
              : (r.createdAt instanceof Date
                  ? r.createdAt
                  : new Date())
          });
        });
      });

      // Sort newest first
      ratings.sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));
      suggestions.sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));

      setRatings(ratings);
      setSuggestions(suggestions);
    } catch (error) {
      console.error('❌ Error fetching ratings/suggestions:', error);
    }
  };

  // Fetch report data
  const fetchReportData = async () => {
    try {
      const [usersSnapshot, listingsSnapshot, bookingsSnapshot] = await Promise.all([
        getDocs(collection(db, 'users')),

        getDocs(collection(db, 'listings')),

        getDocs(collection(db, 'bookings'))
      ]);

      const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const listingsData = listingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const bookingsData = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Categorize bookings
      const now = new Date();
      const completedBookings = bookingsData.filter(b => b.status === 'completed');
      const cancelledBookings = bookingsData.filter(b => b.status === 'cancelled');
      const upcomingBookings = bookingsData.filter(b => {
        if (b.status !== 'confirmed') return false;
        const checkIn = b.checkIn?.toDate ? b.checkIn.toDate() : new Date(b.checkIn);
        return checkIn > now;
      });

      setUsers(usersData);
      setListings(listingsData);
      setBookings(bookingsData);
      setFilteredBookings(bookingsData); // Default to all

      console.log('📊 Report categories:', {
        total: bookingsData.length,
        completed: completedBookings.length,
        cancelled: cancelledBookings.length,
        upcoming: upcomingBookings.length
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
    }
  };

  // Filter bookings based on selected filter
  useEffect(() => {
    if (!bookings.length) return;

    const now = new Date();
    let filtered = [];

    switch (reportFilter) {
      case 'completed':
        filtered = bookings.filter(b => b.status === 'completed');
        break;
      case 'cancelled':
        filtered = bookings.filter(b => b.status === 'cancelled');
        break;
      case 'upcoming':
        filtered = bookings.filter(b => {
          if (b.status !== 'confirmed') return false;
          const checkIn = b.checkIn?.toDate ? b.checkIn.toDate() : new Date(b.checkIn);
          return checkIn > now;
        });
        break;
      default:
        filtered = bookings;
    }

    setFilteredBookings(filtered);
  }, [reportFilter, bookings]);

  // Toast Helper
  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      console.log('🚪 Admin logout initiated');
      
      // Clear admin flag
      localStorage.removeItem('isAdmin');
      localStorage.removeItem('adminLoginTime');
      
      console.log('✅ Admin session cleared');
      
      // Navigate to admin login
      navigate('/admin/login', { replace: true });
    } catch (error) {
      console.error('❌ Logout error:', error);
      
      // Still clear and redirect even if there's an error
      localStorage.removeItem('isAdmin');
      localStorage.removeItem('adminLoginTime');
      
      navigate('/admin/login', { replace: true });
    }
  };

  // Handle Service Fee Update
  const handleUpdateServiceFee = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      showToast(`Service fee updated to ${serviceFee}%`);
      setEditingFee(false);
    } catch (error) {
      showToast('Failed to update service fee', 'error');
    }
  };

  // Handle Policy Update
  const handleUpdatePolicy = async (policyType) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      showToast(`${policyType} policy updated successfully`);
      setEditingPolicy(null);
    } catch (error) {
      showToast('Failed to update policy', 'error');
    }
  };

  // Update Admin Fee Percentage
  const handleUpdateAdminFee = async () => {
    try {
      const adminRef = doc(db, 'admin', 'settings');
      await setDoc(adminRef, {
        feePercentage: adminFeePercentage,
        updatedAt: serverTimestamp()
      }, { merge: true });
      showToast(`Admin fee percentage updated to ${adminFeePercentage}%`);
    } catch (error) {
      console.error('Error updating admin fee:', error);
      showToast('Failed to update admin fee', 'error');
    }
  };

  // Generate PDF Report
  const generatePDFReport = (reportType) => {
    try {
      const pdf = new jsPDF();
      let yPos = 20;
      
      pdf.setFontSize(18);
      pdf.text('Zennest Admin Report', 20, yPos);
      yPos += 10;
      
      pdf.setFontSize(12);
      pdf.text(`Report Type: ${reportType}`, 20, yPos);
      yPos += 10;
      pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, yPos);
      yPos += 15;

      pdf.setFontSize(14);
      
      if (reportType === 'listings') {
        pdf.text('Listings Created This Month', 20, yPos);
        yPos += 10;
        reportData.listingsThisMonth.forEach((listing, index) => {
          if (yPos > 280) {
            pdf.addPage();
            yPos = 20;
          }
          pdf.setFontSize(10);
          pdf.text(`${index + 1}. ${listing.title || 'Untitled'} - ${listing.location || 'N/A'}`, 20, yPos);
          yPos += 7;
        });
      } else if (reportType === 'subscribers') {
        pdf.text('Active Subscribers', 20, yPos);
        yPos += 10;
        reportData.subscribers.forEach((sub, index) => {
          if (yPos > 280) {
            pdf.addPage();
            yPos = 20;
          }
          pdf.setFontSize(10);
          pdf.text(`${index + 1}. ${sub.email || 'N/A'} - Plan: ${sub.subscriptionPlan || 'N/A'}`, 20, yPos);
          yPos += 7;
        });
      } else if (reportType === 'cancelled') {
        pdf.text('Cancelled Bookings', 20, yPos);
        yPos += 10;
        reportData.cancelledBookings.forEach((booking, index) => {
          if (yPos > 280) {
            pdf.addPage();
            yPos = 20;
          }
          pdf.setFontSize(10);
          pdf.text(`${index + 1}. ${booking.listingTitle || 'N/A'} - Amount: ₱${booking.total || 0}`, 20, yPos);
          yPos += 7;
        });
      } else if (reportType === 'upcoming') {
        pdf.text('Upcoming Bookings', 20, yPos);
        yPos += 10;
        reportData.upcomingBookings.forEach((booking, index) => {
          if (yPos > 280) {
            pdf.addPage();
            yPos = 20;
          }
          pdf.setFontSize(10);
          const checkIn = booking.checkIn instanceof Date ? booking.checkIn.toLocaleDateString() : 'N/A';
          pdf.text(`${index + 1}. ${booking.listingTitle || 'N/A'} - Check-in: ${checkIn}`, 20, yPos);
          yPos += 7;
        });
      }

      pdf.save(`zennest-${reportType}-report-${Date.now()}.pdf`);
      showToast('PDF report generated successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      showToast('Failed to generate PDF report', 'error');
    }
  };

  // Print Report
  const printReport = (reportType) => {
    const printWindow = window.open('', '_blank');
    let content = `
      <html>
        <head>
          <title>Zennest ${reportType} Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #10b981; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #10b981; color: white; }
          </style>
        </head>
        <body>
          <h1>Zennest Admin Report</h1>
          <p><strong>Report Type:</strong> ${reportType}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          <table>
    `;

    if (reportType === 'listings') {
      content += '<tr><th>#</th><th>Title</th><th>Location</th><th>Created</th></tr>';
      reportData.listingsThisMonth.forEach((listing, index) => {
        const created = listing.createdAt instanceof Date ? listing.createdAt.toLocaleDateString() : 'N/A';
        content += `<tr><td>${index + 1}</td><td>${listing.title || 'Untitled'}</td><td>${listing.location || 'N/A'}</td><td>${created}</td></tr>`;
      });
    } else if (reportType === 'subscribers') {
      content += '<tr><th>#</th><th>Email</th><th>Plan</th><th>Status</th></tr>';
      reportData.subscribers.forEach((sub, index) => {
        content += `<tr><td>${index + 1}</td><td>${sub.email || 'N/A'}</td><td>${sub.subscriptionPlan || 'N/A'}</td><td>${sub.subscriptionStatus || 'N/A'}</td></tr>`;
      });
    } else if (reportType === 'cancelled') {
      content += '<tr><th>#</th><th>Listing</th><th>Amount</th><th>Status</th></tr>';
      reportData.cancelledBookings.forEach((booking, index) => {
        content += `<tr><td>${index + 1}</td><td>${booking.listingTitle || 'N/A'}</td><td>₱${booking.total || 0}</td><td>${booking.status || 'N/A'}</td></tr>`;
      });
    } else if (reportType === 'upcoming') {
      content += '<tr><th>#</th><th>Listing</th><th>Check-in</th><th>Amount</th></tr>';
      reportData.upcomingBookings.forEach((booking, index) => {
        const checkIn = booking.checkIn instanceof Date ? booking.checkIn.toLocaleDateString() : 'N/A';
        content += `<tr><td>${index + 1}</td><td>${booking.listingTitle || 'N/A'}</td><td>${checkIn}</td><td>₱${booking.total || 0}</td></tr>`;
      });
    }

    content += '</table></body></html>';
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
  };

  // Generate Contract PDF
  const generateContractPDF = (contractData) => {
    try {
      const pdf = new jsPDF();
      let yPos = 20;
      
      pdf.setFontSize(18);
      pdf.text('Zennest Booking Contract', 20, yPos);
      yPos += 15;
      
      pdf.setFontSize(12);
      pdf.text(`Contract Date: ${new Date().toLocaleDateString()}`, 20, yPos);
      yPos += 10;
      
      if (contractTemplate) {
        const lines = contractTemplate.split('\n');
        pdf.setFontSize(10);
        lines.forEach(line => {
          if (yPos > 280) {
            pdf.addPage();
            yPos = 20;
          }
          pdf.text(line, 20, yPos);
          yPos += 7;
        });
      } else {
        pdf.text('Contract terms and conditions...', 20, yPos);
      }

      pdf.save(`zennest-contract-${Date.now()}.pdf`);
      showToast('Contract PDF generated successfully');
    } catch (error) {
      console.error('Error generating contract PDF:', error);
      showToast('Failed to generate contract PDF', 'error');
    }
  };

  // ✅ FIXED: Only show data loading state, not access verification
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading dashboard data...</p>
        </motion.div>
      </div>
    );
  }

  // Menu items
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: FaChartLine },
    { id: 'hosts-guests', label: 'Hosts & Guests', icon: FaUsers },
    { id: 'subscriptions', label: 'Subscriptions', icon: FaCalendarAlt },
    { id: 'terms', label: 'Terms & Conditions', icon: FaFileContract },
    { id: 'reports', label: 'Reports', icon: FaClipboard },
    { id: 'admin-fees', label: 'Admin Fees', icon: FaPercent },
    { id: 'ratings', label: 'Ratings & Suggestions', icon: FaStar },
    { id: 'contracts', label: 'Contracts', icon: FaFilePdf },
    { id: 'service-fees', label: 'Service Fees', icon: FaDollarSign },
    { id: 'policies', label: 'Policies', icon: FaGavel },
    { id: 'payments', label: 'Payments', icon: FaWallet },
  ];

  // ✅ FIXED: Render full dashboard UI - AdminRoute guarantees admin access
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex">
      {/* ==================== SIDEBAR ==================== */}
      <motion.aside
        animate={{ x: sidebarOpen ? 0 : '-100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={`fixed lg:static inset-y-0 left-0 w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white shadow-2xl z-50 flex flex-col overflow-hidden`}
      >
        {/* Logo & Branding */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
              <FaShieldAlt className="text-white text-lg" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Zennest</h1>
              <p className="text-xs text-slate-400">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;

            return (
              <motion.button
                key={item.id}
                whileHover={{ x: 4 }}
                onClick={() => {
                  setActiveSection(item.id);
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-lg'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                }`}
              >
                <Icon className="text-lg" />
                <span className="font-medium text-sm">{item.label}</span>
                {isActive && (
                  <div className="ml-auto w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                )}
              </motion.button>
            );
          })}
        </nav>

        {/* Admin Info & Logout */}
        <div className="p-4 border-t border-slate-700 space-y-3">
          <div className="bg-slate-700/50 rounded-lg p-3">
            <p className="text-xs text-slate-300 mb-1">Logged in as Admin</p>
            <p className="text-sm font-semibold text-white">Admin Dashboard</p>
            <p className="text-xs text-emerald-400 mt-1">✓ Admin Access</p>
          </div>

          {/* Logout Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 hover:text-red-200 rounded-lg transition-all font-semibold text-sm"
          >
            <FaSignOutAlt />
            <span>Logout</span>
          </motion.button>
        </div>
      </motion.aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && window.innerWidth < 1024 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* ==================== MAIN CONTENT ==================== */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* ===== TOPBAR ===== */}
        <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
          <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
            {/* Left: Menu & Search */}
            <div className="flex items-center gap-4 flex-1">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {sidebarOpen ? (
                  <FaTimes className="text-xl text-gray-600" />
                ) : (
                  <FaBars className="text-xl text-gray-600" />
                )}
              </motion.button>

              {/* Search Bar */}
              <div className="hidden sm:flex flex-1 max-w-md items-center gap-3 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:border-emerald-300 transition-colors">
                <FaSearch className="text-gray-400 text-sm" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="flex-1 bg-transparent outline-none text-sm placeholder-gray-500"
                />
              </div>
            </div>

            {/* Right: Notifications & Profile */}
            <div className="flex items-center gap-3">
              {/* Notifications */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FaBell className="text-lg text-gray-600" />
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
              </motion.button>

              {/* User Menu Trigger */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowLogoutConfirm(true)}
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                  A
                </div>
                <FaChevronDown className="text-xs text-gray-600" />
              </motion.button>
            </div>
          </div>
        </header>

        {/* ===== CONTENT AREA ===== */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <AnimatePresence mode="wait">
              {/* ===== OVERVIEW SECTION ===== */}
              {activeSection === 'overview' && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="space-y-8"
                >
                  {/* Header */}
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
                    <p className="text-gray-600 mt-1">Welcome back, Admin! Here's what's happening.</p>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <StatCard
                      icon={FaUsers}
                      title="Total Hosts"
                      value={stats.totalHosts}
                      trend={12}
                    />
                    <StatCard
                      icon={FaHome}
                      title="Total Guests"
                      value={`${stats.totalGuests}+`}
                      trend={8}
                    />
                    <StatCard
                      icon={FaCheckCircle}
                      title="Active Listings"
                      value={stats.activeListings}
                      trend={5}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <StatCard
                      icon={FaMoneyBillWave}
                      title="Total Revenue"
                      value={`₱${(stats.totalRevenue / 1000).toFixed(0)}K`}
                      trend={15}
                    />
                    <StatCard
                      icon={FaBook}
                      title="Total Bookings"
                      value={stats.totalBookings}
                      trend={22}
                    />
                    <StatCard
                      icon={FaExclamationTriangle}
                      title="Pending Reports"
                      value={stats.pendingReports}
                      trend={-3}
                    />
                  </div>

                  {/* Analytics Section */}
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <SectionHeader
                      icon={FaChartLine}
                      title="Platform Analytics"
                      description="Monthly performance metrics and trends"
                    />
                    <div className="h-64 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center text-gray-500">
                      <p>Chart integration (Recharts) goes here</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ===== SERVICE FEES SECTION ===== */}
              {activeSection === 'service-fees' && (
                <motion.div
                  key="service-fees"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="space-y-6"
                >
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Service Fees Management</h1>
                    <p className="text-gray-600 mt-1">Configure platform fees and revenue settings.</p>
                  </div>

                  {/* Current Fee Card */}
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <SectionHeader icon={FaDollarSign} title="Current Service Fee" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Platform Fee Percentage</p>
                        <div className="flex items-end gap-2">
                          <input
                            type="number"
                            value={serviceFee}
                            onChange={(e) => setServiceFee(Number(e.target.value))}
                            disabled={!editingFee}
                            className={`flex-1 text-4xl font-bold outline-none ${
                              editingFee
                                ? 'bg-emerald-50 border-2 border-emerald-600 px-3 py-2 rounded-lg'
                                : 'bg-transparent'
                            }`}
                          />
                          <span className="text-3xl font-bold text-gray-600">%</span>
                        </div>
                      </div>
                      <div className="flex flex-col justify-end gap-3">
                        {!editingFee ? (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setEditingFee(true)}
                            className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold"
                          >
                            Edit Fee
                          </motion.button>
                        ) : (
                          <div className="flex gap-3">
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setEditingFee(false)}
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-semibold"
                            >
                              Cancel
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={handleUpdateServiceFee}
                              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold"
                            >
                              Save Changes
                            </motion.button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Fee Structure Info */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                    <div className="flex gap-4">
                      <FaInfoCircle className="text-blue-600 text-lg flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="font-semibold text-blue-900 mb-2">How Service Fees Work</h3>
                        <ul className="text-sm text-blue-800 space-y-1">
                          <li>• Service fee is applied to every booking transaction</li>
                          <li>• Fee is deducted from the host's earnings</li>
                          <li>• Changes take effect immediately for new bookings</li>
                          <li>• Current pending transactions use the previous fee rate</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ===== POLICIES SECTION ===== */}
              {activeSection === 'policies' && (
                <motion.div
                  key="policies"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="space-y-6"
                >
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Policies & Compliance</h1>
                    <p className="text-gray-600 mt-1">Manage platform policies and terms.</p>
                  </div>

                  {/* Policy Cards */}
                  {[
                    { key: 'cancellation', title: 'Cancellation Policy', icon: FaTimesCircle },
                    { key: 'platformRules', title: 'Platform Rules', icon: FaGavel },
                    { key: 'termsOfService', title: 'Terms of Service', icon: FaFileContract }
                  ].map((policy) => (
                    <div key={policy.key} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                      <SectionHeader icon={policy.icon} title={policy.title} />
                      <div className="space-y-4">
                        <textarea
                          value={policies[policy.key]}
                          onChange={(e) =>
                            setPolicies({ ...policies, [policy.key]: e.target.value })
                          }
                          disabled={editingPolicy !== policy.key}
                          className={`w-full p-4 border rounded-lg outline-none transition-all ${
                            editingPolicy === policy.key
                              ? 'border-emerald-600 focus:ring-2 focus:ring-emerald-200'
                              : 'border-gray-200 bg-gray-50'
                          }`}
                          rows={6}
                        />
                        <div className="flex gap-3">
                          {editingPolicy !== policy.key ? (
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setEditingPolicy(policy.key)}
                              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold"
                            >
                              Edit Policy
                            </motion.button>
                          ) : (
                            <>
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setEditingPolicy(null)}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-semibold"
                              >
                                Cancel
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleUpdatePolicy(policy.title)}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold"
                              >
                                Save Changes
                              </motion.button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {/* ===== HOSTS & GUESTS SECTION ===== */}
              {activeSection === 'hosts-guests' && (
                <motion.div
                  key="hosts-guests"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="space-y-6"
                >
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Hosts & Guests Management</h1>
                    <p className="text-gray-600 mt-1">View all hosts and guests with their rankings.</p>
                  </div>

                  {/* Hosts Table */}
                  <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                    <div className="p-6 border-b border-gray-200">
                      <SectionHeader icon={FaUsers} title="Hosts Ranking" />
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Rank</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Total Bookings</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {hosts.slice(0, 50).map((host) => (
                            <tr key={host.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4">
                                {host.ranking <= 3 ? (
                                  <span className="flex items-center gap-2">
                                    <FaMedal className={`text-lg ${
                                      host.ranking === 1 ? 'text-yellow-500' :
                                      host.ranking === 2 ? 'text-gray-400' :
                                      'text-amber-600'
                                    }`} />
                                    <span className="font-bold">{host.ranking}</span>
                                  </span>
                                ) : (
                                  <span className="font-semibold">{host.ranking}</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                {host.firstName && host.lastName ? `${host.firstName} ${host.lastName}` : host.email || 'Unknown'}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">{host.email || 'N/A'}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{host.totalBookings || 0}</td>
                              <td className="px-6 py-4 text-sm">
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                  host.subscriptionStatus === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {host.subscriptionStatus || 'inactive'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Guests Table */}
                  <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                    <div className="p-6 border-b border-gray-200">
                      <SectionHeader icon={FaUsers} title="Guests Ranking" />
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Rank</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Total Bookings</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {guests.slice(0, 50).map((guest) => (
                            <tr key={guest.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4">
                                {guest.ranking <= 3 ? (
                                  <span className="flex items-center gap-2">
                                    <FaMedal className={`text-lg ${
                                      guest.ranking === 1 ? 'text-yellow-500' :
                                      guest.ranking === 2 ? 'text-gray-400' :
                                      'text-amber-600'
                                    }`} />
                                    <span className="font-bold">{guest.ranking}</span>
                                  </span>
                                ) : (
                                  <span className="font-semibold">{guest.ranking}</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                {guest.firstName && guest.lastName ? `${guest.firstName} ${guest.lastName}` : guest.email || 'Unknown'}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">{guest.email || 'N/A'}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{guest.totalBookings || 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ===== SUBSCRIPTIONS SECTION ===== */}
              {activeSection === 'subscriptions' && (
                <motion.div
                  key="subscriptions"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="space-y-6"
                >
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Host Subscriptions</h1>
                    <p className="text-gray-600 mt-1">View all active host subscriptions with start and end dates.</p>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                    <div className="p-6 border-b border-gray-200">
                      <SectionHeader icon={FaCalendarAlt} title="Active Subscriptions" />
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Host Name</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Plan</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Start Date</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">End Date</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {hostSubscriptions.map((sub) => (
                            <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 text-sm font-medium text-gray-900">{sub.hostName}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{sub.email}</td>
                              <td className="px-6 py-4 text-sm">
                                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold capitalize">
                                  {sub.plan}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                {sub.startDate ? sub.startDate.toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                {sub.endDate ? sub.endDate.toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="px-6 py-4 text-sm">
                                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                                  {sub.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ===== TERMS & CONDITIONS SECTION ===== */}
              {activeSection === 'terms' && (
                <motion.div
                  key="terms"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="space-y-6"
                >
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Terms & Conditions</h1>
                    <p className="text-gray-600 mt-1">Create and manage HTML-formatted terms that appear on host registration.</p>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                      <SectionHeader icon={FaFileContract} title="Terms & Conditions Editor" />
                      {!editingTerms ? (
                        <button
                          onClick={() => setEditingTerms(true)}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold flex items-center gap-2"
                        >
                          <FaEdit />
                          Edit Terms
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveTerms}
                            disabled={savingTerms}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold disabled:opacity-50"
                          >
                            {savingTerms ? (
                              <>
                                <FaSpinner className="inline animate-spin mr-2" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <FaSave className="inline mr-2" />
                                Save Changes
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setEditingTerms(false);
                              fetchTermsAndConditions();
                            }}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Info Banner */}
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
                      <div className="flex gap-3">
                        <FaInfoCircle className="text-blue-600 text-lg flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-800">
                          <p className="font-semibold mb-1">HTML Editing Enabled</p>
                          <p>You can use HTML tags like <code className="bg-blue-100 px-1 rounded">&lt;h1&gt;</code>, <code className="bg-blue-100 px-1 rounded">&lt;p&gt;</code>, <code className="bg-blue-100 px-1 rounded">&lt;ul&gt;</code>, <code className="bg-blue-100 px-1 rounded">&lt;strong&gt;</code>, etc.</p>
                          <p className="mt-1">The formatted version will be displayed to hosts during registration.</p>
                        </div>
                      </div>
                    </div>

                    {editingTerms ? (
                      /* HTML Editor Mode */
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            HTML Content (Edit Mode)
                          </label>
                          <textarea
                            value={termsContent}
                            onChange={(e) => setTermsContent(e.target.value)}
                            className="w-full p-4 border-2 border-emerald-600 rounded-lg outline-none focus:ring-2 focus:ring-emerald-200 font-mono text-sm min-h-[500px]"
                            placeholder="<h1>Zennest Terms and Conditions</h1>&#10;<p>Welcome to Zennest...</p>&#10;<ul>&#10;  <li>Point 1</li>&#10;  <li>Point 2</li>&#10;</ul>"
                          />
                          <p className="text-xs text-gray-500 mt-2">
                            💡 Raw HTML is saved exactly as typed. No sanitization applied.
                          </p>
                        </div>
                      </div>
                    ) : (
                      /* Preview Mode */
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Formatted Preview (How hosts will see it)
                          </label>
                          <div className="border-2 border-gray-200 rounded-lg p-6 bg-gray-50 min-h-[500px] overflow-auto">
                            {termsContent ? (
                              <div 
                                className="prose max-w-none"
                                dangerouslySetInnerHTML={{ __html: termsContent }}
                              />
                            ) : (
                              <p className="text-gray-400 italic">No terms content available. Click "Edit Terms" to add content.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ===== REPORTS SECTION ===== */}
              {activeSection === 'reports' && (
                <motion.div
                  key="reports"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900">Reports Generation</h1>
                      <p className="text-gray-600 mt-1">Generate and print reports for listings, subscribers, bookings, and more.</p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={fetchReportData}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold flex items-center gap-2"
                    >
                      <FaDownload />
                      Refresh Data
                    </motion.button>
                  </div>

                  {/* Report Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Listings This Month */}
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                      <SectionHeader icon={FaHome} title="Listings This Month" />
                      <p className="text-sm text-gray-600 mb-4">Total: {reportData.listingsThisMonth.length}</p>
                      <div className="flex gap-3">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => generatePDFReport('listings')}
                          className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold flex items-center justify-center gap-2"
                        >
                          <FaFilePdf />
                          Download PDF
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => printReport('listings')}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-semibold flex items-center justify-center gap-2"
                        >
                          <FaPrint />
                          Print
                        </motion.button>
                      </div>
                    </div>

                    {/* Subscribers */}
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                      <SectionHeader icon={FaUsers} title="Active Subscribers" />
                      <p className="text-sm text-gray-600 mb-4">Total: {reportData.subscribers.length}</p>
                      <div className="flex gap-3">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => generatePDFReport('subscribers')}
                          className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold flex items-center justify-center gap-2"
                        >
                          <FaFilePdf />
                          Download PDF
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => printReport('subscribers')}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-semibold flex items-center justify-center gap-2"
                        >
                          <FaPrint />
                          Print
                        </motion.button>
                      </div>
                    </div>

                    {/* Cancelled Bookings */}
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                      <SectionHeader icon={FaTimesCircle} title="Cancelled Bookings" />
                      <p className="text-sm text-gray-600 mb-4">Total: {reportData.cancelledBookings.length}</p>
                      <div className="flex gap-3">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => generatePDFReport('cancelled')}
                          className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold flex items-center justify-center gap-2"
                        >
                          <FaFilePdf />
                          Download PDF
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => printReport('cancelled')}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-semibold flex items-center justify-center gap-2"
                        >
                          <FaPrint />
                          Print
                        </motion.button>
                      </div>
                    </div>

                    {/* Upcoming Bookings */}
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                      <SectionHeader icon={FaCalendarAlt} title="Upcoming Bookings" />
                      <p className="text-sm text-gray-600 mb-4">Total: {reportData.upcomingBookings.length}</p>
                      <div className="flex gap-3">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => generatePDFReport('upcoming')}
                          className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold flex items-center justify-center gap-2"
                        >
                          <FaFilePdf />
                          Download PDF
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => printReport('upcoming')}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-semibold flex items-center justify-center gap-2"
                        >
                          <FaPrint />
                          Print
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ===== ADMIN FEES SECTION ===== */}
              {activeSection === 'admin-fees' && (
                <motion.div
                  key="admin-fees"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="space-y-6"
                >
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Admin Fee Management</h1>
                    <p className="text-gray-600 mt-1">Set the percentage for admin fees charged from host and guest transactions.</p>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <SectionHeader icon={FaPercent} title="Admin Fee Configuration" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Admin Fee Percentage</p>
                        <div className="flex items-end gap-2">
                          <input
                            type="number"
                            value={adminFeePercentage}
                            onChange={(e) => setAdminFeePercentage(Number(e.target.value))}
                            className="flex-1 text-4xl font-bold outline-none bg-emerald-50 border-2 border-emerald-600 px-3 py-2 rounded-lg"
                            min="0"
                            max="100"
                          />
                          <span className="text-3xl font-bold text-gray-600">%</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">This percentage will be charged from all transactions</p>
                      </div>
                      <div className="flex flex-col justify-end gap-3">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleUpdateAdminFee}
                          className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold"
                        >
                          Save Fee Percentage
                        </motion.button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <SectionHeader icon={FaWallet} title="Admin Balance" />
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg">
                        <span className="text-lg font-semibold text-gray-700">Current Balance:</span>
                        <span className="text-3xl font-bold text-emerald-600">₱{adminBalance.toLocaleString()}</span>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <FaInfoCircle className="text-blue-600 text-lg mb-2" />
                        <p className="text-sm text-blue-800">
                          Admin fees are automatically credited to this balance from all transactions. You can withdraw your balance when needed.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ===== RATINGS & SUGGESTIONS SECTION ===== */}
              {activeSection === 'ratings' && (
                <motion.div
                  key="ratings"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="space-y-6"
                >
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Ratings & Suggestions</h1>
                    <p className="text-gray-600 mt-1">View all ratings and guest suggestions from completed bookings.</p>
                  </div>

                  {/* Ratings Table */}
                  <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                    <div className="p-6 border-b border-gray-200">
                      <SectionHeader icon={FaStar} title="All Ratings" />
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Listing</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Overall Rating</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Cleanliness</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Communication</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Comment</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {ratings.map((rating) => (
                            <tr key={rating.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 text-sm font-medium text-gray-900">{rating.listingTitle}</td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-1">
                                  <FaStar className="text-yellow-400" />
                                  <span className="font-semibold">{rating.rating || 'N/A'}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">{rating.cleanliness || 'N/A'}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{rating.communication || 'N/A'}</td>
                              <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{rating.comment || 'No comment'}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                {rating.createdAt ? rating.createdAt.toLocaleDateString() : 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Suggestions Table */}
                  <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                    <div className="p-6 border-b border-gray-200">
                      <SectionHeader icon={FaInfoCircle} title="Guest Suggestions & Feedback" />
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Listing</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Guest</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Suggestion/Feedback</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {suggestions.map((sug) => (
                            <tr key={sug.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 text-sm font-medium text-gray-900">{sug.listingTitle}</td>
                              <td className="px-6 py-4 text-sm text-gray-700">{sug.guestName || 'Guest'}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{sug.suggestion || 'No suggestion'}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                {sug.createdAt ? new Date(sug.createdAt).toLocaleString() : 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ===== CONTRACTS SECTION ===== */}
              {activeSection === 'contracts' && (
                <motion.div
                  key="contracts"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="space-y-6"
                >
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Contract Management</h1>
                    <p className="text-gray-600 mt-1">Create and manage contracts that can be printed and downloaded as PDF.</p>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <SectionHeader icon={FaFileContract} title="Contract Template" />
                    <div className="space-y-4">
                      <textarea
                        value={contractTemplate}
                        onChange={(e) => setContractTemplate(e.target.value)}
                        className="w-full p-4 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-600 min-h-[400px]"
                        placeholder="Enter contract template content here. You can use placeholders like {hostName}, {guestName}, {listingTitle}, {checkIn}, {checkOut}, {amount}, etc."
                      />
                      <div className="flex gap-3">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => generateContractPDF()}
                          className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold flex items-center gap-2"
                        >
                          <FaFilePdf />
                          Generate & Download PDF
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => window.print()}
                          className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-semibold flex items-center gap-2"
                        >
                          <FaPrint />
                          Print Contract
                        </motion.button>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <FaInfoCircle className="text-blue-600 text-lg mb-2" />
                        <p className="text-sm text-blue-800">
                          <strong>Available placeholders:</strong> {'{hostName}'}, {'{guestName}'}, {'{listingTitle}'}, {'{checkIn}'}, {'{checkOut}'}, {'{amount}'}, {'{bookingId}'}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ===== PAYMENTS SECTION ===== */}
              {activeSection === 'payments' && (
                <motion.div
                  key="payments"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="space-y-6"
                >
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Payment Management</h1>
                    <p className="text-gray-600 mt-1">Monitor transactions and manage payouts.</p>
                  </div>

                  {/* Payment Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard
                      icon={FaMoneyBillWave}
                      title="Total Revenue"
                      value={`₱${(stats.totalRevenue / 1000).toFixed(0)}K`}
                    />
                    <StatCard
                      icon={FaWallet}
                      title="Pending Payouts"
                      value="₱125,000"
                    />
                    <StatCard
                      icon={FaCheckCircle}
                      title="Completed Payouts"
                      value="₱325,000"
                    />
                  </div>

                  {/* Payment Table */}
                  <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                    <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                      <SectionHeader icon={FaWallet} title="Recent Transactions" />
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold text-sm"
                      >
                        <FaDownload />
                        Export
                      </motion.button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Host</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <tr key={i} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 text-sm text-gray-600">2024-01-{20 - i}</td>
                              <td className="px-6 py-4 text-sm font-medium text-gray-900">Host {i + 1}</td>
                              <td className="px-6 py-4 text-sm font-semibold text-emerald-600">
                                ₱{(15000 + i * 5000).toLocaleString()}
                              </td>
                              <td className="px-6 py-4 text-sm">
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                    i < 2
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-blue-100 text-blue-800'
                                  }`}
                                >
                                  {i < 2 ? 'Completed' : 'Processing'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* ==================== MODALS & NOTIFICATIONS ==================== */}

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={showLogoutConfirm}
        title="Confirm Logout"
        onClose={() => setShowLogoutConfirm(false)}
        primaryAction={handleLogout}
        primaryLabel="Logout"
      >
        <p className="text-gray-600 mb-4">Are you sure you want to logout from the admin dashboard?</p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-3">
          <FaInfoCircle className="text-blue-600 text-lg flex-shrink-0" />
          <p className="text-sm text-blue-800">You will need to log in again with admin credentials.</p>
        </div>
      </Modal>

      {/* Toast Notification */}
      <Toast message={toast.message} type={toast.type} isVisible={toast.visible} />
    </div>
  );
};

export default AdminDashboard;