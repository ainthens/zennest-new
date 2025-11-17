// src/pages/admin/AdminDashboardPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useAuth from '../../hooks/useAuth';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import Toast from './components/Toast';
import DashboardOverview from './DashboardOverview/DashboardOverview';
import ReservationsList from './Reservations/ReservationsList';
import UsersList from './Users/UsersList';
import ServiceFees from './ServiceFees/ServiceFees';
import TermsEditor from './Policies/TermsEditor';
import {
  fetchDashboardStats,
  fetchHostsAndGuests,
  fetchRatingsAndSuggestions,
  fetchAdminSettings,
  updateAdminFeePercentage,
  calculateAdminBalanceFromTransactions
} from './lib/dataFetchers';

const AdminDashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State Management
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  // Data State
  const [stats, setStats] = useState({
    totalHosts: 0,
    totalGuests: 0,
    totalBookings: 0,
    totalRevenue: 0,
    activeListings: 0,
    pendingReports: 0
  });
  const [hosts, setHosts] = useState([]);
  const [guests, setGuests] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [adminFeePercentage, setAdminFeePercentage] = useState(5);
  const [adminBalance, setAdminBalance] = useState(0);
  const [calculatedBalance, setCalculatedBalance] = useState(0);
  const [balanceLoading, setBalanceLoading] = useState(false);

  // Toast Helper
  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      console.log('🚪 Admin logout initiated');
      localStorage.removeItem('isAdmin');
      localStorage.removeItem('adminLoginTime');
      console.log('✅ Admin session cleared');
      navigate('/admin/login', { replace: true });
    } catch (error) {
      console.error('❌ Logout error:', error);
      localStorage.removeItem('isAdmin');
      localStorage.removeItem('adminLoginTime');
      navigate('/admin/login', { replace: true });
    }
  };

  // Load dashboard data
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      console.log('📊 Fetching admin dashboard data...');
      
      const [
        statsData,
        { hosts: hostsData, guests: guestsData },
        { ratings: ratingsData, suggestions: suggestionsData },
        adminSettings
      ] = await Promise.all([
        fetchDashboardStats(),
        fetchHostsAndGuests(),
        fetchRatingsAndSuggestions(),
        fetchAdminSettings()
      ]);

      setStats(statsData);
      setHosts(hostsData);
      setGuests(guestsData);
      setRatings(ratingsData);
      setSuggestions(suggestionsData);
      setAdminFeePercentage(adminSettings.feePercentage);
      setAdminBalance(adminSettings.balance);

      // Calculate actual balance from transactions
      try {
        const balance = await calculateAdminBalanceFromTransactions(adminSettings.feePercentage);
        setCalculatedBalance(balance);
      } catch (error) {
        console.error('Error calculating balance:', error);
        setCalculatedBalance(adminSettings.balance);
      }

      // Fetch bookings for dashboard
      try {
        const { fetchReportData } = await import('./lib/dataFetchers');
        const reportData = await fetchReportData();
        setBookings(reportData.bookings || []);
      } catch (error) {
        console.error('Error fetching bookings:', error);
      }

      console.log('✅ Dashboard data loaded');
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      showToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle Admin Fee Update
  const handleUpdateAdminFee = async () => {
    try {
      await updateAdminFeePercentage(adminFeePercentage);
      showToast(`Admin fee percentage updated to ${adminFeePercentage}%`);
      
      // Recalculate balance with new fee percentage
      setBalanceLoading(true);
      try {
        const balance = await calculateAdminBalanceFromTransactions(adminFeePercentage);
        setCalculatedBalance(balance);
      } catch (error) {
        console.error('Error recalculating balance:', error);
      } finally {
        setBalanceLoading(false);
      }
    } catch (error) {
      console.error('Error updating admin fee:', error);
      showToast('Failed to update admin fee', 'error');
    }
  };

  // Refresh balance
  const handleRefreshBalance = async () => {
    setBalanceLoading(true);
    try {
      const balance = await calculateAdminBalanceFromTransactions(adminFeePercentage);
      setCalculatedBalance(balance);
      showToast('Balance refreshed successfully');
    } catch (error) {
      console.error('Error refreshing balance:', error);
      showToast('Failed to refresh balance', 'error');
    } finally {
      setBalanceLoading(false);
    }
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex relative">
      {/* Sidebar - Fixed, non-scrollable */}
      <Sidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onLogout={handleLogout}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

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

      {/* Main Content - Scrollable */}
      <main className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        {/* Topbar */}
        <Topbar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          onLogout={handleLogout}
        />

        {/* Content Area - This is the scrollable area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
            <AnimatePresence mode="wait">
              {/* Dashboard Overview */}
              {activeSection === 'overview' && (
                <DashboardOverview
                  stats={stats}
                  suggestions={suggestions}
                  bookings={bookings}
                  ratings={ratings}
                  loading={loading}
                  showToast={showToast}
                />
              )}

              {/* Reservations */}
              {activeSection === 'reservations' && (
                <ReservationsList showToast={showToast} />
              )}

              {/* Hosts & Guests */}
              {activeSection === 'hosts-guests' && (
                <UsersList
                  hosts={hosts}
                  guests={guests}
                  showToast={showToast}
                />
              )}

              {/* Service Fees */}
              {activeSection === 'service-fees' && (
                <ServiceFees
                  adminBalance={adminBalance}
                  adminFeePercentage={adminFeePercentage}
                  showToast={showToast}
                />
              )}

              {/* Terms & Conditions */}
              {activeSection === 'terms' && (
                <TermsEditor showToast={showToast} />
              )}

              {/* Admin Fees */}
              {activeSection === 'admin-fees' && (
                <motion.div
                  key="admin-fees"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="space-y-6"
                >
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Admin Fee Management</h1>
                    <p className="text-sm sm:text-base text-gray-600 mt-1">Set the percentage for admin fees charged from host and guest transactions.</p>
                  </div>

                  {/* Admin Fee Percentage Card */}
                  <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <span className="text-emerald-600 text-lg sm:text-xl">⚙️</span>
                      Fee Percentage Settings
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                          Admin Fee Percentage
                        </label>
                        <div className="flex items-end gap-2">
                          <input
                            type="number"
                            value={adminFeePercentage}
                            onChange={(e) => setAdminFeePercentage(Number(e.target.value))}
                            className="flex-1 text-2xl sm:text-3xl md:text-4xl font-bold outline-none bg-emerald-50 border-2 border-emerald-600 px-3 sm:px-4 py-2 sm:py-3 rounded-lg focus:ring-2 focus:ring-emerald-500"
                            min="0"
                            max="100"
                            step="0.1"
                          />
                          <span className="text-2xl sm:text-3xl font-bold text-gray-600 mb-1">%</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          This percentage will be automatically deducted from all completed transactions
                        </p>
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-xs text-blue-800">
                            <strong>Example:</strong> For a ₱10,000 booking with {adminFeePercentage}% fee, 
                            the admin earns ₱{(10000 * adminFeePercentage / 100).toLocaleString()} 
                            and the host receives ₱{(10000 * (1 - adminFeePercentage / 100)).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col justify-end gap-3">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleUpdateAdminFee}
                          className="w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold text-sm flex items-center justify-center gap-2"
                        >
                          <span>💾</span>
                          <span className="hidden sm:inline">Save Fee Percentage</span>
                          <span className="sm:hidden">Save</span>
                        </motion.button>
                        <p className="text-xs text-gray-500 text-center">
                          Changes will apply to all future transactions
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Admin Balance Card */}
                  <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
                      <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <span className="text-emerald-600 text-lg sm:text-xl">💰</span>
                        Admin Balance
                      </h2>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleRefreshBalance}
                        disabled={balanceLoading}
                        className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {balanceLoading ? (
                          <>
                            <span className="animate-spin">⟳</span>
                            <span className="hidden sm:inline">Refreshing...</span>
                            <span className="sm:hidden">Loading</span>
                          </>
                        ) : (
                          <>
                            <span>🔄</span>
                            Refresh
                          </>
                        )}
                      </motion.button>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="p-4 sm:p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border-2 border-emerald-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-base sm:text-lg font-semibold text-gray-700">Calculated Balance:</span>
                          {balanceLoading && (
                            <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-2 border-emerald-600 border-t-transparent"></div>
                          )}
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-emerald-600">
                            ₱{calculatedBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <p className="text-xs text-emerald-700 mt-2">
                          Calculated from all completed transactions (Admin fee: {adminFeePercentage}%)
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-xs sm:text-sm text-gray-600 mb-1">Stored Balance</p>
                          <p className="text-xl sm:text-2xl font-bold text-gray-900">
                            ₱{adminBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">From admin settings</p>
                        </div>
                        <div className="p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-xs sm:text-sm text-blue-700 mb-1">Difference</p>
                          <p className={`text-xl sm:text-2xl font-bold ${calculatedBalance - adminBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            {calculatedBalance - adminBalance >= 0 ? '+' : ''}
                            ₱{(calculatedBalance - adminBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-blue-600 mt-1">Calculated vs Stored</p>
                        </div>
                      </div>

                      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          <strong>ℹ️ Note:</strong> The calculated balance is computed from all completed bookings with payment. 
                          This is the most accurate representation of your earnings. The stored balance may not reflect recent transactions.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Placeholder for other sections */}
              {!['overview', 'reservations', 'hosts-guests', 'service-fees', 'terms', 'admin-fees'].includes(activeSection) && (
                <motion.div
                  key={activeSection}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="space-y-6"
                >
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Section: {activeSection}</h1>
                    <p className="text-gray-600 mt-1">This section is coming soon.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Toast Notification */}
      <Toast message={toast.message} type={toast.type} isVisible={toast.visible} />
    </div>
  );
};

export default AdminDashboardPage;

