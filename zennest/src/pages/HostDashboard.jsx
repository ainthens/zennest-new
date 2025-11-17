// src/pages/HostDashboard.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useAuth from '../hooks/useAuth';
import { getHostProfile } from '../services/firestoreService';
import ZennestHotingLogo from '../assets/zennest-hosting-logo.svg';
import Loading from '../components/Loading';
import {
  FaHome,
  FaCalendarAlt,
  FaEnvelope,
  FaCog,
  FaPlus,
  FaChartLine,
  FaGift,
  FaWallet,
  FaList,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaChevronDown,
  FaChevronUp,
  FaUser,
  FaCalendarCheck,
  FaTicketAlt
} from 'react-icons/fa';

const HostDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [hostProfile, setHostProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [mainExpanded, setMainExpanded] = useState(true);
  const [financialExpanded, setFinancialExpanded] = useState(true);
  const [accountExpanded, setAccountExpanded] = useState(true);
  const logoutModalRef = useRef(null);
  const mainContentRef = useRef(null);
  
  // Update active tab based on current location
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/listings')) setActiveTab('listings');
    else if (path.includes('/reservations')) setActiveTab('reservations');
    else if (path.includes('/calendar')) setActiveTab('calendar');
    else if (path.includes('/messages')) setActiveTab('messages');
    else if (path.includes('/payments')) setActiveTab('payments');
    else if (path.includes('/rewards')) setActiveTab('rewards');
    else if (path.includes('/vouchers')) setActiveTab('vouchers');
    else if (path.includes('/settings')) setActiveTab('settings');
    else setActiveTab('dashboard');
  }, [location.pathname]);

  // Scroll to top when route changes
  useEffect(() => {
    // Scroll the main content area to top when route changes
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }, [location.pathname]);

  // Fetch host profile - RequireHostAuth already verified user is a host
  // This is just to get the profile data for display
  useEffect(() => {
    if (!user) {
      return;
    }

    const fetchHostProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getHostProfile(user.uid);
        
        if (result.success && result.data) {
          setHostProfile(result.data);
        } else {
          // This shouldn't happen since RequireHostAuth already checked
          // But if it does, set error state
          console.error('Host profile not found, but user passed RequireHostAuth check');
          setError('Host profile not found. Please contact support.');
        }
      } catch (error) {
        console.error('Error fetching host profile:', error);
        setError('Failed to load host profile. Please try refreshing the page.');
      } finally {
        setLoading(false);
      }
    };

    fetchHostProfile();
  }, [user]);

  // Handle click outside logout modal
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (logoutModalRef.current && !logoutModalRef.current.contains(event.target)) {
        setShowLogoutConfirm(false);
      }
    };

    if (showLogoutConfirm) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showLogoutConfirm]);

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = async () => {
    try {
      await logout();
      setShowLogoutConfirm(false);
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleCancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  // Organized menu items into logical groups
  const coreMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: FaChartLine, path: '/host/dashboard' },
    { id: 'listings', label: 'Listings', icon: FaList, path: '/host/listings' },
    { id: 'reservations', label: 'Reservations', icon: FaCalendarCheck, path: '/host/reservations' },
    { id: 'calendar', label: 'Calendar', icon: FaCalendarAlt, path: '/host/calendar' },
    { id: 'messages', label: 'Messages', icon: FaEnvelope, path: '/host/messages' },
  ];

  const financialMenuItems = [
    { id: 'payments', label: 'Payments', icon: FaWallet, path: '/host/payments' },
    { id: 'rewards', label: 'Points & Rewards', icon: FaGift, path: '/host/rewards' },
    { id: 'vouchers', label: 'Vouchers', icon: FaTicketAlt, path: '/host/vouchers' },
  ];

  const settingsMenuItems = [
    { id: 'settings', label: 'Settings', icon: FaCog, path: '/host/settings' },
  ];

  const handleNavigation = (path) => {
    navigate(path);
    const tabId = path.split('/').pop();
    setActiveTab(tabId);
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  // Show loading state while fetching profile
  if (loading) {
    return <Loading message="Loading dashboard..." size="large" fullScreen={true} />;
  }

  // Show error state if profile fetch failed
  if (error || !hostProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-4">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Unable to Load Dashboard</h2>
          <p className="text-gray-600 mb-6">{error || 'Host profile not found. Please contact support.'}</p>
          <div className="space-x-4">
            <button
              onClick={() => window.location.reload()}
              className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={() => navigate('/host/onboarding')}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Go to Onboarding
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-[260px] sm:w-64 bg-white shadow-lg
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        h-screen overflow-y-auto overflow-x-hidden flex-shrink-0
        max-w-[85vw] lg:max-w-none
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 sm:p-6 border-b-2 border-gray-200 flex-shrink-0 bg-gradient-to-br from-emerald-600 to-emerald-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img 
                  src={ZennestHotingLogo} 
                  alt="Zennest Hosting Logo" 
                  className="h-8 sm:h-10 w-auto brightness-0 invert"
                />
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-white hover:text-emerald-100 transition-colors p-1"
                aria-label="Close sidebar"
              >
                <FaTimes className="text-lg sm:text-xl" />
              </button>
            </div>
            <p className="text-xs text-emerald-100 mt-2 font-medium">Host Portal</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-2 sm:p-3 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <div className="space-y-3 sm:space-y-4">
              {/* Create New Listing Button - Top Priority */}
              <div className="pb-2 sm:pb-3 border-b-2 border-gray-200">
                <button
                  onClick={() => handleNavigation('/host/listings/new')}
                  className="w-full flex items-center justify-center gap-2 px-2 sm:px-3 py-2 sm:py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 font-medium text-xs sm:text-sm shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98] min-h-[44px] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
                  aria-label="Create new listing"
                >
                  <FaPlus className="text-xs sm:text-sm" />
                  <span className="text-xs">Create Listing</span>
                </button>
              </div>

              {/* Core Functions Section - Collapsible */}
              <div className="bg-gray-50/50 rounded-lg p-1.5 sm:p-2 border border-gray-100">
                <button
                  onClick={() => setMainExpanded(!mainExpanded)}
                  className="w-full flex items-center justify-between px-2 pb-1.5 sm:pb-2 mb-1.5 sm:mb-2 group border-b border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 rounded"
                  aria-label={`${mainExpanded ? 'Collapse' : 'Expand'} main navigation section`}
                  aria-expanded={mainExpanded}
                >
                  <h3 className="text-[10px] sm:text-[9px] font-medium text-gray-600 uppercase tracking-wider group-hover:text-emerald-700 transition-colors">
                    Main
                  </h3>
                  {mainExpanded ? (
                    <FaChevronUp className="text-[10px] sm:text-[9px] text-gray-500 group-hover:text-emerald-700 transition-colors" />
                  ) : (
                    <FaChevronDown className="text-[10px] sm:text-[9px] text-gray-500 group-hover:text-emerald-700 transition-colors" />
                  )}
                </button>
                <AnimatePresence>
                  {mainExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-1 overflow-hidden"
                    >
                      {coreMenuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id || location.pathname === item.path;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleNavigation(item.path)}
                            aria-label={`Navigate to ${item.label}`}
                            aria-current={isActive ? 'page' : undefined}
                            className={`
                              w-full flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg
                              transition-all duration-200 min-h-[44px] relative group/item
                              focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1
                              ${isActive
                                ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-medium shadow-lg transform scale-[1.02] border border-emerald-400'
                                : 'text-gray-700 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-emerald-100/50 hover:text-emerald-800 hover:pl-3 sm:hover:pl-4 hover:shadow-sm active:scale-[0.98]'
                              }
                            `}
                          >
                            {isActive && (
                              <>
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-300 rounded-r-full"></div>
                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/10 to-emerald-500/10 rounded-lg"></div>
                              </>
                            )}
                            <Icon className={`text-sm sm:text-base flex-shrink-0 z-10 ${isActive ? 'text-white' : 'text-emerald-600 group-hover/item:text-emerald-700 group-hover/item:scale-110'} transition-all`} />
                            <span className={`text-xs z-10 font-medium truncate`}>{item.label}</span>
                            {isActive && (
                              <div className="ml-auto flex items-center gap-1 z-10 flex-shrink-0">
                                <div className="w-1.5 h-1.5 bg-emerald-200 rounded-full animate-pulse"></div>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Financial & Rewards Section - Collapsible */}
              <div className="bg-gray-50/50 rounded-lg p-1.5 sm:p-2 border border-gray-100">
                <button
                  onClick={() => setFinancialExpanded(!financialExpanded)}
                  className="w-full flex items-center justify-between px-2 pb-1.5 sm:pb-2 mb-1.5 sm:mb-2 group border-b border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 rounded"
                  aria-label={`${financialExpanded ? 'Collapse' : 'Expand'} financial section`}
                  aria-expanded={financialExpanded}
                >
                  <h3 className="text-[10px] sm:text-[9px] font-medium text-gray-600 uppercase tracking-wider group-hover:text-emerald-700 transition-colors">
                    Financial
                  </h3>
                  {financialExpanded ? (
                    <FaChevronUp className="text-[10px] sm:text-[9px] text-gray-500 group-hover:text-emerald-700 transition-colors" />
                  ) : (
                    <FaChevronDown className="text-[10px] sm:text-[9px] text-gray-500 group-hover:text-emerald-700 transition-colors" />
                  )}
                </button>
                <AnimatePresence>
                  {financialExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-1 overflow-hidden"
                    >
                      {financialMenuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id || location.pathname === item.path;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleNavigation(item.path)}
                            aria-label={`Navigate to ${item.label}`}
                            aria-current={isActive ? 'page' : undefined}
                            className={`
                              w-full flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg
                              transition-all duration-200 min-h-[44px] relative group/item
                              focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1
                              ${isActive
                                ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-medium shadow-lg transform scale-[1.02] border border-emerald-400'
                                : 'text-gray-700 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-emerald-100/50 hover:text-emerald-800 hover:pl-3 sm:hover:pl-4 hover:shadow-sm active:scale-[0.98]'
                              }
                            `}
                          >
                            {isActive && (
                              <>
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-300 rounded-r-full"></div>
                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/10 to-emerald-500/10 rounded-lg"></div>
                              </>
                            )}
                            <Icon className={`text-sm sm:text-base flex-shrink-0 z-10 ${isActive ? 'text-white' : 'text-emerald-600 group-hover/item:text-emerald-700 group-hover/item:scale-110'} transition-all`} />
                            <span className={`text-xs z-10 font-medium truncate`}>{item.label}</span>
                            {isActive && (
                              <div className="ml-auto flex items-center gap-1 z-10 flex-shrink-0">
                                <div className="w-1.5 h-1.5 bg-emerald-200 rounded-full animate-pulse"></div>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Settings Section - Collapsible */}
              <div className="bg-gray-50/50 rounded-lg p-1.5 sm:p-2 border border-gray-100">
                <button
                  onClick={() => setAccountExpanded(!accountExpanded)}
                  className="w-full flex items-center justify-between px-2 pb-1.5 sm:pb-2 mb-1.5 sm:mb-2 group border-b border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 rounded"
                  aria-label={`${accountExpanded ? 'Collapse' : 'Expand'} account section`}
                  aria-expanded={accountExpanded}
                >
                  <h3 className="text-[10px] sm:text-[9px] font-medium text-gray-600 uppercase tracking-wider group-hover:text-emerald-700 transition-colors">
                    Account
                  </h3>
                  {accountExpanded ? (
                    <FaChevronUp className="text-[10px] sm:text-[9px] text-gray-500 group-hover:text-emerald-700 transition-colors" />
                  ) : (
                    <FaChevronDown className="text-[10px] sm:text-[9px] text-gray-500 group-hover:text-emerald-700 transition-colors" />
                  )}
                </button>
                <AnimatePresence>
                  {accountExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-1 overflow-hidden"
                    >
                      {settingsMenuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id || location.pathname === item.path;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleNavigation(item.path)}
                            aria-label={`Navigate to ${item.label}`}
                            aria-current={isActive ? 'page' : undefined}
                            className={`
                              w-full flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg
                              transition-all duration-200 min-h-[44px] relative group/item
                              focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1
                              ${isActive
                                ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-medium shadow-lg transform scale-[1.02] border border-emerald-400'
                                : 'text-gray-700 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-emerald-100/50 hover:text-emerald-800 hover:pl-3 sm:hover:pl-4 hover:shadow-sm active:scale-[0.98]'
                              }
                            `}
                          >
                            {isActive && (
                              <>
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-300 rounded-r-full"></div>
                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/10 to-emerald-500/10 rounded-lg"></div>
                              </>
                            )}
                            <Icon className={`text-sm sm:text-base flex-shrink-0 z-10 ${isActive ? 'text-white' : 'text-emerald-600 group-hover/item:text-emerald-700 group-hover/item:scale-110'} transition-all`} />
                            <span className={`text-xs z-10 font-medium truncate`}>{item.label}</span>
                            {isActive && (
                              <div className="ml-auto flex items-center gap-1 z-10 flex-shrink-0">
                                <div className="w-1.5 h-1.5 bg-emerald-200 rounded-full animate-pulse"></div>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </nav>

          {/* User Info & Logout */}
          <div className="p-3 sm:p-4 border-t-2 border-gray-300 flex-shrink-0 bg-gradient-to-b from-white to-gray-50">
            <div className="mb-2 sm:mb-3 p-2.5 sm:p-3 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg sm:rounded-xl border border-emerald-200 shadow-sm">
              <div className="flex items-center gap-2 sm:gap-2.5 mb-2 sm:mb-2.5">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white font-semibold shadow-md flex-shrink-0">
                  {hostProfile.profilePicture ? (
                    <img 
                      src={hostProfile.profilePicture} 
                      alt={`${hostProfile.firstName} ${hostProfile.lastName}`}
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover"
                    />
                  ) : (
                    <FaUser className="text-xs sm:text-sm" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900 truncate">
                    {hostProfile.firstName} {hostProfile.lastName}
                  </p>
                  <p className="text-[10px] text-gray-600 truncate">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1.5 sm:pt-2 border-t border-emerald-200">
                <span className="text-[10px] font-semibold text-gray-600">Points Balance</span>
                <span className="text-xs font-semibold text-emerald-700 bg-white px-2 py-0.5 rounded-md">
                  {hostProfile.points || 0}
                </span>
              </div>
            </div>
            
            <button
              onClick={handleLogoutClick}
              className="w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-all font-semibold text-xs sm:text-sm border-2 border-transparent hover:border-red-200 shadow-sm hover:shadow-md min-h-[44px]"
            >
              <FaSignOutAlt className="text-xs sm:text-sm" />
              <span className="text-xs">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main ref={mainContentRef} className="flex-1 overflow-y-auto h-screen w-full">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white shadow-sm p-3 sm:p-4 flex items-center justify-between flex-shrink-0 sticky top-0 z-40">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-700 hover:text-gray-900 p-1.5 -ml-1.5"
            aria-label="Open sidebar"
          >
            <FaBars className="text-lg sm:text-xl" />
          </button>
          <div className="flex items-center gap-2 flex-1 justify-center">
            <img
              src={ZennestHotingLogo}
              alt="Zennest Hosting Logo"
              className="h-5 sm:h-6 w-auto"
            />
          </div>
          <div className="w-8 sm:w-10"></div>
        </div>

        {/* Page Content */}
        <div className="p-3 sm:p-4 lg:p-6 xl:p-8 w-full max-w-full overflow-x-hidden">
          <Outlet />
        </div>
      </main>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
              ref={logoutModalRef}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-md w-full p-4 sm:p-6"
            >
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Confirm Log out</h3>
              <p className="text-xs sm:text-sm text-gray-600 mb-4">
                Are you sure you want to log out? You will need to sign in again to access your account.
              </p>

              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                <button
                  onClick={handleCancelLogout}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmLogout}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  Log out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HostDashboard;

