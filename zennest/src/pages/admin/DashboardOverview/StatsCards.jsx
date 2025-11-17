// src/pages/admin/DashboardOverview/StatsCards.jsx
import StatCard from '../components/StatCard';
import { FaUsers, FaHome, FaCheckCircle, FaMoneyBillWave, FaBook, FaExclamationTriangle } from 'react-icons/fa';

const StatsCards = ({ stats, loading }) => {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={FaUsers}
          title="Total Hosts"
          value={stats.totalHosts}
          trend={12}
          loading={loading}
        />
        <StatCard
          icon={FaHome}
          title="Total Guests"
          value={`${stats.totalGuests}+`}
          trend={8}
          loading={loading}
        />
        <StatCard
          icon={FaCheckCircle}
          title="Active Listings"
          value={stats.activeListings}
          trend={5}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={FaMoneyBillWave}
          title="Total Revenue"
          value={`₱${(stats.totalRevenue / 1000).toFixed(0)}K`}
          trend={15}
          loading={loading}
        />
        <StatCard
          icon={FaBook}
          title="Total Bookings"
          value={stats.totalBookings}
          trend={22}
          loading={loading}
        />
        <StatCard
          icon={FaExclamationTriangle}
          title="Pending Reports"
          value={stats.pendingReports}
          trend={-3}
          loading={loading}
        />
      </div>
    </>
  );
};

export default StatsCards;

