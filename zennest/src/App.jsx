// src/App.jsx
import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

// Hooks
import useAuth from "./hooks/useAuth";

// Components
import Header from "./components/Header";
import Footer from "./components/Footer";
import RouteErrorBoundary from "./components/RouteErrorBoundary";
import AdminRoute from "./components/AdminRoute";
import Loading from "./components/Loading";
//adding a new comment to push
// Pages
import LandingPage from "./pages/LandingPage";
import HomeStays from "./pages/HomeStays";
import ListingDetails from "./pages/ListingDetails";
// ✅ FIXED: Import Login from components folder
import Login from "./components/Login";
import Register from "./components/Register";
import EmailVerifyPage from "./pages/EmailVerifyPage";
import RequireVerified from "./components/RequireVerified";
import RequireHostAuth from "./components/RequireHostAuth";
import RequireGuestAuth from "./components/RequireGuestAuth";
import Experiences from "./pages/Experiences";
import Services from "./pages/Services";
import HostDashboard from "./pages/HostDashboard";
import HostDashboardOverview from "./pages/HostDashboardOverview";
import HostListings from "./pages/HostListings";
import HostListingForm from "./pages/HostListingForm";
import HostMessages from "./pages/HostMessages";
import HostCalendar from "./pages/HostCalendar";
import HostPaymentsReceiving from "./pages/HostPaymentsReceiving";
import HostSettings from "./pages/HostSettings";
import HostRewards from "./pages/HostRewards";
import Reservation from "./pages/Reservation";
import HostRegistration from "./pages/HostRegistration";
import HostOnboarding from "./pages/HostOnboarding";
import HostEmailVerifyPage from "./pages/HostEmailVerifyPage";
import UserSettings from "./pages/UserSettings";
import UserFavorites from "./pages/UserFavorites";
import UserMessages from "./pages/UserMessages";
import UserBookings from "./pages/UserBookings";
import BookingDetails from "./pages/BookingDetails";
import UserWallet from "./pages/UserWallet";
import UserPoints from "./pages/UserPoints";
import GuestVouchers from "./pages/GuestVouchers";
import HostVouchers from "./pages/HostVouchers";
import Chat from "./pages/Chat";
import PaymentProcessing from "./pages/PaymentProcessing";
import PayPalReturn from "./pages/PayPalReturn";
import PayPalCancel from "./pages/PayPalCancel";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminDebug from "./pages/AdminDebug";

// PayPal Configuration
const PAYPAL_CONFIG = {
  clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID || 'Aa1d32EXWKMFsgmQqm_Xri-h9FP6wDDQ4qqg2oLz2jjogpBxgBDLFdyksTZwooCQWVIy6qMXQwvULw-o',
  currency: 'PHP',
};

// Loading component for better UX
const RouteLoading = () => <Loading message="Loading..." size="large" fullScreen={true} />;

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔧 PayPal Configuration Check:', {
      clientId: PAYPAL_CONFIG.clientId ? PAYPAL_CONFIG.clientId.substring(0, 20) + '...' : 'Not set',
      fromEnv: !!import.meta.env.VITE_PAYPAL_CLIENT_ID,
      mode: import.meta.env.MODE
    });
    
    if (PAYPAL_CONFIG.clientId) {
      console.log('✅ PayPal Client ID is configured and ready to use');
    } else {
      console.error('❌ PayPal Client ID is missing! Check your .env file.');
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
      console.log('✅ App initialization complete');
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <RouteLoading />;
  }

  return (
    <Router>
      <AppContent />
    </Router>
  );
}

// Component that has access to router context
const AppContent = () => {
  const location = useLocation();
  const { user, loading } = useAuth();
  
  console.log('📍 Current path:', location.pathname);
  
  // Determine which routes should hide header/footer
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isLoginRoute = location.pathname === '/login';
  const isRegisterRoute = location.pathname === '/register';
  const isHostRoute = location.pathname.startsWith('/host');

  useEffect(() => {
    const handleUserProfile = async () => {
      if (!user || loading) return;
      
      try {
        const { getGuestProfile } = await import("./services/firestoreService");
        const guestResult = await getGuestProfile(user.uid);
        
        if (!guestResult.success || !guestResult.data) {
          console.log('📝 Creating user profile for new user:', user.uid);
          
          const { createUserProfile } = await import("./services/firestoreService");
          
          const displayNameParts = user.displayName?.split(' ') || [];
          const firstName = displayNameParts[0] || user.email?.split('@')[0] || '';
          const lastName = displayNameParts.slice(1).join(' ') || '';
          
          await createUserProfile(user.uid, {
            firstName: firstName,
            lastName: lastName,
            email: user.email || '',
            displayName: user.displayName || `${firstName} ${lastName}`.trim() || '',
            profilePicture: user.photoURL || '',
            emailVerified: user.emailVerified || false
          });
          
          console.log('✅ User profile created for:', user.uid);
        }
      } catch (err) {
        console.error('❌ Error handling user profile:', err);
      }
    };

    handleUserProfile();
  }, [user, loading]);

  useEffect(() => {
    const handleError = (event) => {
      console.error('🔴 Global Error:', event.error);
    };

    const handleUnhandledRejection = (event) => {
      console.error('🔴 Unhandled Promise Rejection:', event.reason);
      event.preventDefault();
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <>
      {/* Only show Header if NOT on admin, login, register, or host routes */}
      {!isAdminRoute && !isLoginRoute && !isRegisterRoute && !isHostRoute && <Header />}

      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Default Route - Landing Page */}
          <Route 
            path="/" 
            element={
              <RouteErrorBoundary>
                {user && !loading ? (
                  <Navigate to="/homestays" replace />
                ) : (
                  <LandingPage />
                )}
              </RouteErrorBoundary>
            }
          />
          
          {/* Home Stays Route */}
          <Route 
            path="/homestays" 
            element={
              <RouteErrorBoundary>
                <HomeStays />
              </RouteErrorBoundary>
            } 
          />
          
          {/* Listing Details Route */}
          <Route 
            path="/listing/:id" 
            element={
              <RouteErrorBoundary>
                <ListingDetails />
              </RouteErrorBoundary>
            } 
          />
          
          {/* ✅ FIXED: Login Route - Using actual Login component */}
          <Route 
            path="/login" 
            element={
              <RouteErrorBoundary>
                <Login />
              </RouteErrorBoundary>
            } 
          />
          
          {/* Register Route */}
          <Route 
            path="/register" 
            element={
              <RouteErrorBoundary>
                <Register />
              </RouteErrorBoundary>
            } 
          />
          
          {/* Email Verification Route */}
          <Route 
            path="/verify-email" 
            element={
              <RouteErrorBoundary>
                <EmailVerifyPage />
              </RouteErrorBoundary>
            } 
          />

          {/* Experiences Route */}
          <Route 
            path="/experiences" 
            element={
              <RouteErrorBoundary>
                <Experiences />
              </RouteErrorBoundary>
            } 
          />

          {/* Services Route */}
          <Route 
            path="/services" 
            element={
              <RouteErrorBoundary>
                <Services />
              </RouteErrorBoundary>
            } 
          />

          {/* Protected Routes */}
          <Route 
            path="/dashboard" 
            element={
              <RouteErrorBoundary>
                <RequireVerified>
                  <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                      <h2 className="text-3xl font-bold text-emerald-700 mb-4">
                        Welcome to the Dashboard
                      </h2>
                      <p className="text-gray-600">
                        This content is only available for verified users.
                      </p>
                    </div>
                  </div>
                </RequireVerified>
              </RouteErrorBoundary>
            } 
          />
        
          {/* Guest/User Routes */}
          <Route
            path="/favorites"
            element={
              <RouteErrorBoundary>
                <RequireGuestAuth>
                  <UserFavorites />
                </RequireGuestAuth>
              </RouteErrorBoundary>
            }
          />
          <Route
            path="/bookings"
            element={
              <RouteErrorBoundary>
                <RequireGuestAuth>
                  <UserBookings />
                </RequireGuestAuth>
              </RouteErrorBoundary>
            }
          />
          <Route
            path="/booking/:id"
            element={
              <RouteErrorBoundary>
                <RequireGuestAuth>
                  <BookingDetails />
                </RequireGuestAuth>
              </RouteErrorBoundary>
            }
          />
          <Route
            path="/payment"
            element={
              <RouteErrorBoundary>
                <RequireGuestAuth>
                  <PaymentProcessing />
                </RequireGuestAuth>
              </RouteErrorBoundary>
            }
          />
          <Route
            path="/payment/paypal-return"
            element={
              <RouteErrorBoundary>
                <RequireGuestAuth>
                  <PayPalReturn />
                </RequireGuestAuth>
              </RouteErrorBoundary>
            }
          />
          <Route
            path="/payment/paypal-cancel"
            element={
              <RouteErrorBoundary>
                <RequireGuestAuth>
                  <PayPalCancel />
                </RequireGuestAuth>
              </RouteErrorBoundary>
            }
          />
          <Route
            path="/wallet"
            element={
              <RouteErrorBoundary>
                <RequireGuestAuth>
                  <UserWallet />
                </RequireGuestAuth>
              </RouteErrorBoundary>
            }
          />
          <Route
            path="/points"
            element={
              <RouteErrorBoundary>
                <RequireGuestAuth>
                  <UserPoints />
                </RequireGuestAuth>
              </RouteErrorBoundary>
            }
          />
          <Route
            path="/vouchers"
            element={
              <RouteErrorBoundary>
                <RequireGuestAuth>
                  <GuestVouchers />
                </RequireGuestAuth>
              </RouteErrorBoundary>
            }
          />
          <Route
            path="/messages"
            element={
              <RouteErrorBoundary>
                <RequireGuestAuth>
                  <UserMessages />
                </RequireGuestAuth>
              </RouteErrorBoundary>
            }
          />
          <Route
            path="/messages/:conversationId"
            element={
              <RouteErrorBoundary>
                <RequireGuestAuth>
                  <Chat />
                </RequireGuestAuth>
              </RouteErrorBoundary>
            }
          />
          <Route
            path="/settings"
            element={
              <RouteErrorBoundary>
                <RequireGuestAuth>
                  <UserSettings />
                </RequireGuestAuth>
              </RouteErrorBoundary>
            }
          />
          <Route
            path="/account"
            element={
              <RouteErrorBoundary>
                <RequireGuestAuth>
                  <UserSettings />
                </RequireGuestAuth>
              </RouteErrorBoundary>
            }
          />

          {/* Host Dashboard Routes */}
          <Route 
            path="/host" 
            element={
              <RouteErrorBoundary>
                <RequireHostAuth>
                  <HostDashboard />
                </RequireHostAuth>
              </RouteErrorBoundary>
            }
          >
            <Route index element={<Navigate to="/host/dashboard" replace />} />
            <Route path="dashboard" element={<HostDashboardOverview />} />
            <Route path="listings" element={<HostListings />} />
            <Route path="listings/new" element={<HostListingForm />} />
            <Route path="listings/:id/edit" element={<HostListingForm />} />
            <Route path="reservations" element={<Reservation />} />
            <Route path="calendar" element={<HostCalendar />} />
            <Route path="messages" element={<HostMessages />} />
            <Route path="payments" element={<HostPaymentsReceiving />} />
            <Route path="rewards" element={<HostRewards />} />
            <Route path="vouchers" element={<HostVouchers />} />
            <Route path="settings" element={<HostSettings />} />
          </Route>
          <Route 
            path="/host/register" 
            element={
              <RouteErrorBoundary>
                <HostRegistration />
              </RouteErrorBoundary>
            } 
          />
          <Route 
            path="/host/onboarding" 
            element={
              <RouteErrorBoundary>
                <HostOnboarding />
              </RouteErrorBoundary>
            } 
          />
          <Route 
            path="/host/verify-email" 
            element={
              <RouteErrorBoundary>
                <HostEmailVerifyPage />
              </RouteErrorBoundary>
            } 
          />

          {/* Admin Portal Routes */}
          <Route 
            path="/admin/login" 
            element={
              <RouteErrorBoundary>
                <AdminLogin />
              </RouteErrorBoundary>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <RouteErrorBoundary>
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              </RouteErrorBoundary>
            } 
          />
          <Route 
            path="/admin/debug" 
            element={
              <RouteErrorBoundary>
                <AdminDebug />
              </RouteErrorBoundary>
            } 
          />

          {/* 404 - Not Found Route */}
          <Route 
            path="*" 
            element={
              <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center p-8">
                  <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
                  <h2 className="text-2xl font-semibold text-gray-600 mb-4">Page Not Found</h2>
                  <p className="text-gray-500 mb-8">
                    The page you're looking for doesn't exist or has been moved.
                  </p>
                  <div className="space-x-4">
                    <button 
                      onClick={() => window.location.href = '/'}
                      className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition"
                    >
                      Go Home
                    </button>
                    <button 
                      onClick={() => window.history.back()}
                      className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition"
                    >
                      Go Back
                    </button>
                  </div>
                </div>
              </div>
            } 
          />
        </Routes>
      </AnimatePresence>

      {/* Only show Footer if NOT on admin, login, register, or host routes */}
      {!isAdminRoute && !isLoginRoute && !isRegisterRoute && !isHostRoute && <Footer />}
    </>
  );
};

export default App;