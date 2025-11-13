import React, { useEffect, useState, useRef } from "react";
import ZennestLogo from "../assets/zennest-logo.svg";
import ZennestLogoV2 from "../assets/zennest-logo-v3.svg";
import { useNavigate, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import useUserRole from "../hooks/useUserRole";
import {
  FaBars,
  FaTimes,
  FaHeart,
  FaCog,
  FaSignOutAlt,
  FaEnvelope,
  FaHome,
  FaCheckCircle,
  FaChevronRight,
  FaShieldAlt,
  FaWallet,
  FaCalendarCheck,
  FaStar,
  FaUser,
  FaArrowLeft,
  FaChevronLeft,
  FaTicketAlt,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { getGuestProfile, getHostProfile } from "../services/firestoreService";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebase";

const SettingsHeader = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [mobileHighlightedIndex, setMobileHighlightedIndex] = useState(-1);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { role, isHost, isGuest } = useUserRole();
  const menuRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const mobileProfileRef = useRef(null);
  const logoutModalRef = useRef(null);
  const dropdownRef = useRef(null);
  const mobileDropdownRef = useRef(null);
  const [userProfile, setUserProfile] = useState(null);

  // Fetch user profile picture from Firestore with real-time updates
  useEffect(() => {
    if (!user?.uid) {
      setUserProfile(null);
      return;
    }

    let unsubscribe = null;

    try {
      if (isHost) {
        // Set up real-time listener for host profile
        const hostRef = doc(db, 'hosts', user.uid);
        unsubscribe = onSnapshot(
          hostRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data();
              console.log('✅ Host profile updated in real-time (SettingsHeader):', {
                hasProfilePicture: !!data.profilePicture,
                firstName: data.firstName,
                lastName: data.lastName
              });
              setUserProfile(data);
            } else {
              console.warn('⚠️ Host profile does not exist');
              setUserProfile(null);
            }
          },
          (error) => {
            console.error('❌ Error listening to host profile:', error);
            // Fallback to one-time fetch on error
            getHostProfile(user.uid).then(result => {
              if (result.success && result.data) {
                setUserProfile(result.data);
              }
            });
          }
        );
      } else if (isGuest) {
        // Set up real-time listener for guest profile
        const userRef = doc(db, 'users', user.uid);
        unsubscribe = onSnapshot(
          userRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data();
              console.log('✅ Guest profile updated in real-time (SettingsHeader):', {
                hasProfilePicture: !!data.profilePicture,
                firstName: data.firstName,
                lastName: data.lastName
              });
              setUserProfile(data);
            } else {
              console.warn('⚠️ Guest profile does not exist');
              setUserProfile(null);
            }
          },
          (error) => {
            console.error('❌ Error listening to guest profile:', error);
            // Fallback to one-time fetch on error
            getGuestProfile(user.uid).then(result => {
              if (result.success && result.data) {
                setUserProfile(result.data);
              }
            });
          }
        );
      }
    } catch (error) {
      console.error("Error setting up profile listener:", error);
      // Fallback to one-time fetch
      if (isHost) {
        getHostProfile(user.uid).then(result => {
          if (result.success && result.data) {
            setUserProfile(result.data);
          }
        });
      } else if (isGuest) {
        getGuestProfile(user.uid).then(result => {
          if (result.success && result.data) {
            setUserProfile(result.data);
          }
        });
      }
    }

    // Cleanup function to unsubscribe when component unmounts or dependencies change
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user?.uid, isHost, isGuest]);

  // Keyboard navigation for dropdown menu
  useEffect(() => {
    if (!menuOpen) return;

    const handleKeyDown = (event) => {
      const menuItems = dropdownRef.current?.querySelectorAll("button[role='menuitem']");
      const itemCount = menuItems?.length || 0;

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setHighlightedIndex((prev) =>
            prev < itemCount - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          event.preventDefault();
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : itemCount - 1
          );
          break;
        case "Enter":
          event.preventDefault();
          menuItems?.[highlightedIndex]?.click();
          break;
        case "Escape":
          event.preventDefault();
          setMenuOpen(false);
          setHighlightedIndex(-1);
          break;
        default:
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen, highlightedIndex]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
        setHighlightedIndex(-1);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setMobileMenuOpen(false);
      }
      if (mobileProfileRef.current && !mobileProfileRef.current.contains(event.target)) {
        setMobileProfileOpen(false);
        setMobileHighlightedIndex(-1);
      }
      if (logoutModalRef.current && !logoutModalRef.current.contains(event.target)) {
        setShowLogoutConfirm(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Check active route
  const isActiveRoute = (path) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
    setMenuOpen(false);
    setMobileMenuOpen(false);
    setMobileProfileOpen(false);
  };

  const handleConfirmLogout = async () => {
    await logout();
    setShowLogoutConfirm(false);
    navigate("/login");
  };

  const handleCancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const handleNavigation = (path) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    navigate(path);
    setMenuOpen(false);
    setMobileMenuOpen(false);
    setMobileProfileOpen(false);
    setHighlightedIndex(-1);
    setMobileHighlightedIndex(-1);
  };

  const handleBackClick = () => {
    navigate(-1);
  };

  return (
    <>
      <header className="fixed top-0 left-0 w-full z-50">
        <div
          className="bg-emerald-900 rounded-t-none rounded-b-[10px] border border-emerald-800 transform transition-all duration-500 ease-out"
          style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.2) inset" }}
        >
          <div className="max-w-7xl mx-auto flex justify-between items-center px-4 sm:px-6 md:px-12 py-3 sm:py-4">
            {/* Desktop Logo */}
            <div className="hidden md:flex items-center cursor-pointer" onClick={() => handleNavigation("/")}>
              <img
                src={ZennestLogoV2}
                alt="Zennest Logo"
                className="h-8 sm:h-10 w-auto"
              />
            </div>

            {/* Mobile Layout: Back Button - Logo - Profile */}
            <div className="md:hidden flex items-center justify-between w-full">
              {/* Back Button */}
              <motion.button
                onClick={handleBackClick}
                className="text-white p-2 rounded-lg border border-white/50 hover:bg-white/10 transition flex items-center gap-2"
                aria-label="Go back"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FaChevronLeft size={18} />
              </motion.button>

              {/* Centered Logo */}
              <div className="absolute left-1/2 transform -translate-x-1/2">
                <img
                  src={ZennestLogoV2}
                  alt="Zennest Logo"
                  className="h-8 w-auto"
                  onClick={() => handleNavigation("/")}
                />
              </div>

              {/* Profile Button */}
              {user && (
                <div className="relative" ref={mobileProfileRef}>
                  <motion.button
                    onClick={() => setMobileProfileOpen(!mobileProfileOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-full border border-white/50 hover:bg-white/10 transition"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <img
                      src={
                        userProfile?.profilePicture ||
                        user.photoURL ||
                        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect fill='%23d1d5db' width='40' height='40'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='14' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3E%3C/text%3E%3C/svg%3E"
                      }
                      alt="Profile"
                      className="w-7 h-7 rounded-full object-cover"
                    />
                  </motion.button>

                  {/* Mobile Profile Dropdown */}
                  <AnimatePresence>
                    {mobileProfileOpen && (
                      <motion.div
                        ref={mobileDropdownRef}
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden"
                      >
                        {/* Mobile User Info */}
                        <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 p-2.5 border-b border-emerald-200">
                          <div className="flex items-center gap-2">
                            <img
                              src={
                                userProfile?.profilePicture ||
                                user.photoURL ||
                                "https://via.placeholder.com/32"
                              }
                              alt="Profile"
                              className="w-9 h-9 rounded-lg border-2 border-white object-cover"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-gray-900 truncate">
                                {user.displayName || "User"}
                              </p>
                              <p className="text-[10px] text-gray-600 truncate">
                                {isHost ? "Host" : "Guest"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Mobile Menu Items */}
                        <div className="py-1">
                          {isHost ? (
                            <>
                              <MobileMenuItem
                                icon={FaHome}
                                label="Dashboard"
                                onClick={() => handleNavigation("/host/dashboard")}
                                index={0}
                                highlighted={mobileHighlightedIndex === 0}
                                onHover={() => setMobileHighlightedIndex(0)}
                              />
                              <MobileMenuItem
                                icon={FaCog}
                                label="Settings"
                                onClick={() => handleNavigation("/host/settings")}
                                index={1}
                                highlighted={mobileHighlightedIndex === 1}
                                onHover={() => setMobileHighlightedIndex(1)}
                              />
                              <div className="h-px bg-gray-200 my-1"></div>
                              <MobileMenuItem
                                icon={FaSignOutAlt}
                                label="Log out"
                                onClick={handleLogoutClick}
                                index={2}
                                highlighted={mobileHighlightedIndex === 2}
                                onHover={() => setMobileHighlightedIndex(2)}
                                danger
                              />
                            </>
                          ) : (
                            <>
                              <MobileMenuItem
                                icon={FaHeart}
                                label="Favorites"
                                onClick={() => handleNavigation("/favorites")}
                                index={0}
                                highlighted={mobileHighlightedIndex === 0}
                                onHover={() => setMobileHighlightedIndex(0)}
                              />
                              <MobileMenuItem
                                icon={FaCalendarCheck}
                                label="Bookings"
                                onClick={() => handleNavigation("/bookings")}
                                index={1}
                                highlighted={mobileHighlightedIndex === 1}
                                onHover={() => setMobileHighlightedIndex(1)}
                              />
                              <MobileMenuItem
                                icon={FaEnvelope}
                                label="Messages"
                                onClick={() => handleNavigation("/messages")}
                                index={2}
                                highlighted={mobileHighlightedIndex === 2}
                                onHover={() => setMobileHighlightedIndex(2)}
                              />
                              <MobileMenuItem
                                icon={FaTicketAlt}
                                label="Vouchers"
                                onClick={() => handleNavigation("/vouchers")}
                                index={3}
                                highlighted={mobileHighlightedIndex === 3}
                                onHover={() => setMobileHighlightedIndex(3)}
                              />
                              <MobileMenuItem
                                icon={FaUser}
                                label="Profile"
                                onClick={() => handleNavigation("/profile")}
                                index={4}
                                highlighted={mobileHighlightedIndex === 4}
                                onHover={() => setMobileHighlightedIndex(4)}
                              />
                              <MobileMenuItem
                                icon={FaWallet}
                                label="Wallet"
                                onClick={() => handleNavigation("/wallet")}
                                index={5}
                                highlighted={mobileHighlightedIndex === 5}
                                onHover={() => setMobileHighlightedIndex(5)}
                              />
                              <MobileMenuItem
                                icon={FaCog}
                                label="Settings"
                                onClick={() => handleNavigation("/settings")}
                                index={6}
                                highlighted={mobileHighlightedIndex === 6}
                                onHover={() => setMobileHighlightedIndex(6)}
                              />
                              <div className="h-px bg-gray-200 my-1"></div>
                              <MobileMenuItem
                                icon={FaSignOutAlt}
                                label="Log out"
                                onClick={handleLogoutClick}
                                index={7}
                                highlighted={mobileHighlightedIndex === 7}
                                onHover={() => setMobileHighlightedIndex(7)}
                                danger
                              />
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Placeholder for non-logged in users */}
              {!user && <div className="w-9"></div>}
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-6 lg:space-x-8">
              <button
                onClick={() => handleNavigation("/homestays")}
                className="relative inline-block font-medium text-sm transition-transform duration-200 ease-out transform hover:-translate-y-0.5"
              >
                <span
                  className={
                    isActiveRoute("/homestays")
                      ? "text-white"
                      : "text-gray-200 hover:text-white"
                  }
                >
                  Home Stays
                </span>
                <span
                  className={`absolute left-0 -bottom-1 h-[2px] rounded-full transition-all duration-200 ${
                    isActiveRoute("/homestays")
                      ? "w-full bg-white/90"
                      : "w-0 bg-white group-hover:w-full"
                  }`}
                ></span>
              </button>

              <button
                onClick={() => handleNavigation("/experiences")}
                className="relative inline-block font-medium text-sm transition-all duration-200 ease-out transform hover:-translate-y-0.5 group"
              >
                <span
                  className={
                    isActiveRoute("/experiences")
                      ? "text-white"
                      : "text-gray-200 hover:text-white"
                  }
                >
                  Experiences
                </span>
                <span
                  className={`absolute left-0 -bottom-1 h-[2px] rounded-full transition-all duration-200 ${
                    isActiveRoute("/experiences")
                      ? "w-full bg-white/90"
                      : "w-0 bg-white group-hover:w-full"
                  }`}
                ></span>
              </button>

              <button
                onClick={() => handleNavigation("/services")}
                className="relative inline-block font-medium text-sm transition-all duration-200 ease-out transform hover:-translate-y-0.5 group"
              >
                <span
                  className={
                    isActiveRoute("/services")
                      ? "text-white"
                      : "text-gray-200 hover:text-white"
                  }
                >
                  Services
                </span>
                <span
                  className={`absolute left-0 -bottom-1 h-[2px] rounded-full transition-all duration-200 ${
                    isActiveRoute("/services")
                      ? "w-full bg-white/90"
                      : "w-0 bg-white group-hover:w-full"
                  }`}
                ></span>
              </button>
            </nav>

            {/* Desktop Auth Section */}
            <div className="hidden md:block">
              {!user ? (
                <div className="flex items-center space-x-3">
                  <button
                    className="text-white text-sm font-medium py-2 px-4 sm:px-5 rounded-lg border border-white/50 hover:bg-white/10 hover:border-white/70 transition transform hover:-translate-y-0.5 shadow-sm"
                    aria-label="Log in to your account"
                    style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.5) inset" }}
                    onClick={() => navigate("/login")}
                  >
                    Log in
                  </button>
                  <button
                    className="bg-white text-emerald-700 hover:bg-gray-100 text-sm font-medium py-2 px-4 sm:px-5 rounded-lg transition"
                    aria-label="Create a new account"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate("/register");
                    }}
                  >
                    Register
                  </button>
                </div>
              ) : (
                <div className="relative" ref={menuRef}>
                  {/* Profile Button */}
                  <motion.button
                    onClick={() => {
                      setMenuOpen((prev) => !prev);
                      setHighlightedIndex(-1);
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-full border border-white/50 hover:bg-white/10 transition focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-emerald-900"
                    aria-label={`Profile menu for ${user.displayName || user.email}`}
                    aria-expanded={menuOpen}
                    aria-haspopup="menu"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <img
                      src={
                        userProfile?.profilePicture ||
                        user.photoURL ||
                        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect fill='%23d1d5db' width='40' height='40'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='14' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3E%3C/text%3E%3C/svg%3E"
                      }
                      alt="Your profile picture"
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover"
                    />
                    <span className="hidden lg:inline text-white font-medium text-xs truncate max-w-[100px]">
                      {user.displayName || user.email?.split("@")[0]}
                    </span>
                  </motion.button>

                  {/* Desktop Dropdown Modal */}
                  <AnimatePresence>
                    {menuOpen && (
                      <motion.div
                        ref={dropdownRef}
                        role="menu"
                        aria-label="Account menu"
                        initial={{ opacity: 0, scale: 0.92, y: -15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: -15 }}
                        transition={{ duration: 0.2, type: "spring", stiffness: 300 }}
                        className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
                      >
                        {/* Account Summary Section */}
                        <div className="relative bg-gradient-to-r from-emerald-50 to-emerald-100 p-3 border-b border-emerald-200">
                          <div className="flex items-start gap-3">
                            <motion.img
                              src={
                                userProfile?.profilePicture ||
                                user.photoURL ||
                                "https://via.placeholder.com/40"
                              }
                              alt="Your profile"
                              className="w-11 h-11 rounded-xl object-cover shadow-md border-2 border-white flex-shrink-0"
                              whileHover={{ scale: 1.05 }}
                            />
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-bold text-gray-900 truncate">
                                {user.displayName || "User"}
                              </h3>
                              <p className="text-xs text-gray-600 truncate mb-1.5">
                                {user.email}
                              </p>
                              <div className="flex items-center gap-1.5">
                                <FaCheckCircle className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                                <span className="text-xs font-semibold text-emerald-700">
                                  {isHost ? "Host Account" : "Guest Account"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Quick Actions Section */}
                        <div className="p-1.5">
                          {isHost ? (
                            <>
                              <DesktopMenuItem
                                icon={FaHome}
                                label="Host Dashboard"
                                description="Manage your listings"
                                onClick={() => handleNavigation("/host/dashboard")}
                                index={0}
                                highlighted={highlightedIndex === 0}
                                onHover={() => setHighlightedIndex(0)}
                              />
                              <DesktopMenuItem
                                icon={FaCog}
                                label="Host Settings"
                                description="Profile & preferences"
                                onClick={() => handleNavigation("/host/settings")}
                                index={1}
                                highlighted={highlightedIndex === 1}
                                onHover={() => setHighlightedIndex(1)}
                              />
                            </>
                          ) : (
                            <>
                              <DesktopMenuItem
                                icon={FaHeart}
                                label="Favorites"
                                description="Saved listings"
                                onClick={() => handleNavigation("/favorites")}
                                index={0}
                                highlighted={highlightedIndex === 0}
                                onHover={() => setHighlightedIndex(0)}
                                color="red"
                              />
                              <DesktopMenuItem
                                icon={FaCalendarCheck}
                                label="Bookings"
                                description="Your reservations"
                                onClick={() => handleNavigation("/bookings")}
                                index={1}
                                highlighted={highlightedIndex === 1}
                                onHover={() => setHighlightedIndex(1)}
                                color="blue"
                              />
                              <DesktopMenuItem
                                icon={FaEnvelope}
                                label="Messages"
                                description="Your conversations"
                                onClick={() => handleNavigation("/messages")}
                                index={2}
                                highlighted={highlightedIndex === 2}
                                onHover={() => setHighlightedIndex(2)}
                                color="purple"
                              />
                              <DesktopMenuItem
                                icon={FaTicketAlt}
                                label="Vouchers"
                                description="Discount vouchers"
                                onClick={() => handleNavigation("/vouchers")}
                                index={3}
                                highlighted={highlightedIndex === 3}
                                onHover={() => setHighlightedIndex(3)}
                                color="emerald"
                              />
                              <DesktopMenuItem
                                icon={FaUser}
                                label="Profile"
                                description="Personal information"
                                onClick={() => handleNavigation("/profile")}
                                index={4}
                                highlighted={highlightedIndex === 4}
                                onHover={() => setHighlightedIndex(4)}
                                color="indigo"
                              />
                              <DesktopMenuItem
                                icon={FaWallet}
                                label="Wallet"
                                description="Top up & manage balance"
                                onClick={() => handleNavigation("/wallet")}
                                index={5}
                                highlighted={highlightedIndex === 5}
                                onHover={() => setHighlightedIndex(5)}
                                color="emerald"
                                gradient
                              />
                              <DesktopMenuItem
                                icon={FaCog}
                                label="Settings"
                                description="Preferences & security"
                                onClick={() => handleNavigation("/settings")}
                                index={6}
                                highlighted={highlightedIndex === 6}
                                onHover={() => setHighlightedIndex(6)}
                                color="gray"
                              />
                            </>
                          )}
                        </div>

                        <div className="h-px bg-gray-200"></div>

                        <div className="p-1.5">
                          <DesktopMenuItem
                            icon={FaSignOutAlt}
                            label="Log out"
                            description="Sign out of your account"
                            onClick={handleLogoutClick}
                            index={isHost ? 2 : 7}
                            highlighted={highlightedIndex === (isHost ? 2 : 7)}
                            onHover={() => setHighlightedIndex(isHost ? 2 : 7)}
                            danger
                          />
                        </div>

                        <div className="hidden sm:block px-3 py-2 bg-gray-50 border-t border-gray-200">
                          <p className="text-xs text-gray-500 text-center">
                            <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs font-semibold">
                              ↑↓
                            </kbd>
                            <span className="mx-1">Navigate</span>
                            <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs font-semibold">
                              Esc
                            </kbd>
                            <span className="mx-1">Close</span>
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

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
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-100"
              role="alertdialog"
              aria-labelledby="logout-title"
              aria-describedby="logout-desc"
            >
              <h3
                id="logout-title"
                className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2"
              >
                <FaShieldAlt className="text-orange-600 w-5 h-5" />
                Confirm Log out
              </h3>
              <p
                id="logout-desc"
                className="text-sm text-gray-600 mb-6"
              >
                Are you sure you want to log out? You will need to sign in again
                to access your account and saved information.
              </p>

              <div className="flex justify-end gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCancelLogout}
                  className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition font-medium"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleConfirmLogout}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition font-medium flex items-center gap-2"
                >
                  <FaSignOutAlt className="w-4 h-4" />
                  Log out
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

// Desktop Menu Item Component
const DesktopMenuItem = ({ icon: Icon, label, description, onClick, index, highlighted, onHover, color = "emerald", danger = false, gradient = false }) => {
  const colorClasses = {
    red: "bg-red-100 text-red-600 group-hover:bg-red-200",
    blue: "bg-blue-100 text-blue-600 group-hover:bg-blue-200",
    purple: "bg-purple-100 text-purple-600 group-hover:bg-purple-200",
    amber: "bg-amber-100 text-amber-600 group-hover:bg-amber-200",
    indigo: "bg-indigo-100 text-indigo-600 group-hover:bg-indigo-200",
    emerald: "bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200",
    gray: "bg-gray-100 text-gray-600 group-hover:bg-gray-200",
  };

  const highlightClasses = {
    red: "bg-red-100",
    blue: "bg-blue-100",
    purple: "bg-purple-100",
    amber: "bg-amber-100",
    indigo: "bg-indigo-100",
    emerald: "bg-emerald-100",
    gray: "bg-gray-100",
  };

  return (
    <motion.button
      role="menuitem"
      tabIndex={highlighted ? 0 : -1}
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={() => {}}
      className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg transition-all duration-150 group ${
        highlighted
          ? danger
            ? "bg-red-100 shadow-md"
            : gradient
            ? "bg-gradient-to-r from-emerald-100 to-green-100 shadow-md"
            : `${highlightClasses[color]} shadow-md`
          : danger
          ? "hover:bg-red-50"
          : gradient
          ? "hover:bg-gradient-to-r hover:from-emerald-50 hover:to-green-50"
          : "hover:bg-gray-50"
      }`}
      whileHover={{ x: 4 }}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
        danger
          ? "bg-red-100 group-hover:bg-red-200"
          : gradient
          ? "bg-gradient-to-br from-emerald-500 to-green-600 group-hover:shadow-lg"
          : colorClasses[color]
      }`}>
        <Icon className={`w-3.5 h-3.5 ${gradient ? "text-white" : danger ? "text-red-600" : ""}`} />
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className={`text-sm font-semibold ${danger ? "text-red-700" : "text-gray-900"}`}>
          {label}
        </p>
        <p className={`text-xs ${danger ? "text-red-600" : "text-gray-500"}`}>
          {description}
        </p>
      </div>
      <FaChevronRight className={`w-3.5 h-3.5 flex-shrink-0 ${danger ? "text-red-300" : "text-gray-300"}`} />
    </motion.button>
  );
};

// Mobile Menu Item Component (Compact)
const MobileMenuItem = ({ icon: Icon, label, onClick, index, highlighted, onHover, danger = false }) => (
  <motion.button
    onClick={onClick}
    onMouseEnter={onHover}
    className={`flex items-center gap-2.5 w-full px-2.5 py-2 text-xs transition-colors ${
      highlighted
        ? danger
          ? "bg-red-50 text-red-700"
          : "bg-emerald-50 text-emerald-700"
        : danger
        ? "text-red-600 hover:bg-red-50"
        : "text-gray-700 hover:bg-gray-50"
    }`}
    whileHover={{ x: 2 }}
  >
    <Icon className={`w-3.5 h-3.5 ${danger ? "text-red-600" : "text-gray-500"}`} />
    <span className="font-medium flex-1 text-left">{label}</span>
  </motion.button>
);

export default SettingsHeader;