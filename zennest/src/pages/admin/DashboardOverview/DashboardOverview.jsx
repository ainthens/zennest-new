// src/pages/admin/DashboardOverview/DashboardOverview.jsx
import { motion } from 'framer-motion';
import StatsCards from './StatsCards';
import SuggestionsList from './SuggestionsList';
import RecentBookingsList from './RecentBookingsList';
import TopRatedList from './TopRatedList';
import SectionHeader from '../components/SectionHeader';
import { FaChartLine } from 'react-icons/fa';

const DashboardOverview = ({ stats, suggestions, bookings, ratings, loading, showToast }) => {
  return (
    <motion.div
      key="overview"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-50 to-white rounded-xl p-4 sm:p-6 border border-emerald-100">
        <div className="flex items-center gap-2 sm:gap-3 mb-2">
          <div className="p-1.5 sm:p-2 bg-emerald-100 rounded-lg">
            <FaChartLine className="text-emerald-600 text-xl sm:text-2xl" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard Overview</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Welcome back, Admin! Here's what's happening.</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <StatsCards stats={stats} loading={loading} />

      {/* Suggestions List */}
      <SuggestionsList suggestions={suggestions} showToast={showToast} />

      {/* Recent Bookings */}
      <RecentBookingsList bookings={bookings} showToast={showToast} />

      {/* Top Rated Listings */}
      <TopRatedList ratings={ratings} limit={10} />

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
  );
};

export default DashboardOverview;

