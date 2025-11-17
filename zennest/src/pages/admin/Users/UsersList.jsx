// src/pages/admin/Users/UsersList.jsx
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import SectionHeader from '../components/SectionHeader';
import { FaUsers, FaFilePdf, FaPrint } from 'react-icons/fa';
import { generatePDFReport, printReport } from '../lib/reportUtils';
import HostRow from './HostRow';
import GuestRow from './GuestRow';

const UsersList = ({ hosts, guests, showToast }) => {
  const [activeTab, setActiveTab] = useState('guests');
  const [searchQuery, setSearchQuery] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState('all');

  // Filter guests
  const filteredGuests = useMemo(() => {
    let filtered = guests;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(guest => 
        (guest.firstName && guest.firstName.toLowerCase().includes(query)) ||
        (guest.lastName && guest.lastName.toLowerCase().includes(query)) ||
        (guest.email && guest.email.toLowerCase().includes(query)) ||
        (guest.displayName && guest.displayName.toLowerCase().includes(query))
      );
    }

    if (verifiedFilter !== 'all') {
      const isVerified = verifiedFilter === 'verified';
      filtered = filtered.filter(guest => {
        // Assuming verified status is stored in guest.emailVerified or similar
        const verified = guest.emailVerified || guest.verified || false;
        return verified === isVerified;
      });
    }

    return filtered;
  }, [guests, searchQuery, verifiedFilter]);

  // Filter hosts
  const filteredHosts = useMemo(() => {
    let filtered = hosts;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(host => 
        (host.firstName && host.firstName.toLowerCase().includes(query)) ||
        (host.lastName && host.lastName.toLowerCase().includes(query)) ||
        (host.email && host.email.toLowerCase().includes(query))
      );
    }

    if (verifiedFilter !== 'all') {
      const isVerified = verifiedFilter === 'verified';
      filtered = filtered.filter(host => {
        const verified = host.emailVerified || host.verified || false;
        return verified === isVerified;
      });
    }

    return filtered;
  }, [hosts, searchQuery, verifiedFilter]);

  const handleExportPDF = () => {
    try {
      const data = activeTab === 'guests' ? filteredGuests : filteredHosts;
      const type = activeTab === 'guests' ? 'guests' : 'hosts';

      const columns = activeTab === 'guests' ? [
        { key: 'ranking', label: 'Rank', width: 0.5 },
        { key: 'name', label: 'Name', width: 2 },
        { key: 'email', label: 'Email', width: 2 },
        { key: 'accountCreated', label: 'Account Created', width: 1 },
        { key: 'verified', label: 'Verified', width: 1 },
        { key: 'totalBookings', label: 'Total Bookings', width: 1 }
      ] : [
        { key: 'ranking', label: 'Rank', width: 0.5 },
        { key: 'name', label: 'Name', width: 2 },
        { key: 'email', label: 'Email', width: 2 },
        { key: 'createdAt', label: 'Created', width: 1 },
        { key: 'verified', label: 'Verified', width: 1 },
        { key: 'subscriptionPlan', label: 'Plan', width: 1 },
        { key: 'subscriptionStatus', label: 'Status', width: 1 },
        { key: 'totalEarnings', label: 'Total Earnings', width: 1 },
        { key: 'nextBillingDate', label: 'Next Billing Date', width: 1 }
      ];

      const rows = data.map(item => {
        if (activeTab === 'guests') {
          return {
            ranking: item.ranking || '—',
            name: `${item.firstName || ''} ${item.lastName || ''}`.trim() || item.email || 'Unknown',
            email: item.email || 'N/A',
            accountCreated: item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : 'N/A',
            verified: (item.emailVerified || item.verified) ? 'Yes' : 'No',
            totalBookings: item.totalBookings || 0
          };
        } else {
          // Get next billing date
          let nextBillingDate = 'N/A';
          if (item.subscriptionStatus === 'active' && item.subscriptionEndDate) {
            try {
              const endDate = item.subscriptionEndDate?.toDate 
                ? item.subscriptionEndDate.toDate() 
                : (item.subscriptionEndDate instanceof Date 
                    ? item.subscriptionEndDate 
                    : new Date(item.subscriptionEndDate));
              nextBillingDate = endDate.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              });
            } catch (error) {
              console.error('Error formatting billing date:', error);
            }
          }
          
          return {
            ranking: item.ranking || '—',
            name: `${item.firstName || ''} ${item.lastName || ''}`.trim() || item.email || 'Unknown',
            email: item.email || 'N/A',
            createdAt: item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : 'N/A',
            verified: (item.emailVerified || item.verified) ? 'Yes' : 'No',
            subscriptionPlan: item.subscriptionPlan || 'N/A',
            subscriptionStatus: item.subscriptionStatus || 'N/A',
            totalEarnings: `₱${(item.totalEarnings || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            nextBillingDate: nextBillingDate
          };
        }
      });

      generatePDFReport({
        type,
        title: `${activeTab === 'guests' ? 'Guests' : 'Hosts'} Report`,
        rows,
        columns,
        meta: {
          generatedBy: 'Admin Dashboard'
        }
      });

      showToast('PDF report generated successfully');
    } catch (error) {
      console.error('Error exporting users PDF:', error);
      showToast('Failed to generate PDF report', 'error');
    }
  };

  const handlePrint = () => {
    try {
      const data = activeTab === 'guests' ? filteredGuests : filteredHosts;
      const type = activeTab === 'guests' ? 'guests' : 'hosts';

      const headers = activeTab === 'guests' 
        ? '<tr><th>Rank</th><th>Name</th><th>Email</th><th>Account Created</th><th>Verified</th><th>Total Bookings</th></tr>'
        : '<tr><th>Rank</th><th>Name</th><th>Email</th><th>Created</th><th>Verified</th><th>Plan</th><th>Status</th><th>Total Earnings</th><th>Next Billing Date</th></tr>';

      const rows = data.map(item => {
        if (activeTab === 'guests') {
          return `<tr>
            <td>${item.ranking || '—'}</td>
            <td>${`${item.firstName || ''} ${item.lastName || ''}`.trim() || item.email || 'Unknown'}</td>
            <td>${item.email || 'N/A'}</td>
            <td>${item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : 'N/A'}</td>
            <td>${(item.emailVerified || item.verified) ? 'Yes' : 'No'}</td>
            <td>${item.totalBookings || 0}</td>
          </tr>`;
        } else {
          // Get next billing date
          let nextBillingDate = 'N/A';
          if (item.subscriptionStatus === 'active' && item.subscriptionEndDate) {
            try {
              const endDate = item.subscriptionEndDate?.toDate 
                ? item.subscriptionEndDate.toDate() 
                : (item.subscriptionEndDate instanceof Date 
                    ? item.subscriptionEndDate 
                    : new Date(item.subscriptionEndDate));
              nextBillingDate = endDate.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              });
            } catch (error) {
              console.error('Error formatting billing date:', error);
            }
          }
          
          return `<tr>
            <td>${item.ranking || '—'}</td>
            <td>${`${item.firstName || ''} ${item.lastName || ''}`.trim() || item.email || 'Unknown'}</td>
            <td>${item.email || 'N/A'}</td>
            <td>${item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : 'N/A'}</td>
            <td>${(item.emailVerified || item.verified) ? 'Yes' : 'No'}</td>
            <td>${item.subscriptionPlan || 'N/A'}</td>
            <td>${item.subscriptionStatus || 'N/A'}</td>
            <td>₱${(item.totalEarnings || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td>${nextBillingDate}</td>
          </tr>`;
        }
      }).join('');

      const htmlContent = `<table><thead>${headers}</thead><tbody>${rows}</tbody></table>`;

      printReport({
        title: `${activeTab === 'guests' ? 'Guests' : 'Hosts'} Report`,
        htmlContent
      });
    } catch (error) {
      console.error('Error printing users:', error);
      showToast('Failed to print report', 'error');
    }
  };

  return (
    <motion.div
      key="hosts-guests"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Guest and Host Management</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          Guests ranked by total bookings • Hosts ranked by total earnings from bookings
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('guests')}
              className={`flex-1 px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold transition-colors ${
                activeTab === 'guests'
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Guests
            </button>
            <button
              onClick={() => setActiveTab('hosts')}
              className={`flex-1 px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold transition-colors ${
                activeTab === 'hosts'
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Hosts
            </button>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 items-stretch sm:items-end">
            <div className="flex-1 min-w-full sm:min-w-[200px]">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Search</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-600"
              />
            </div>
            <div className="min-w-full sm:min-w-[150px]">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Verified</label>
              <select
                value={verifiedFilter}
                onChange={(e) => setVerifiedFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-600"
              >
                <option value="all">All</option>
                <option value="verified">Verified</option>
                <option value="unverified">Unverified</option>
              </select>
            </div>
            <div className="flex gap-2 flex-wrap">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleExportPDF}
                className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold text-xs sm:text-sm flex items-center justify-center gap-2"
              >
                <FaFilePdf className="text-xs sm:text-sm" />
                <span className="hidden sm:inline">Export PDF</span>
                <span className="sm:hidden">PDF</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handlePrint}
                className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-xs sm:text-sm flex items-center justify-center gap-2"
              >
                <FaPrint className="text-xs sm:text-sm" />
                <span className="hidden sm:inline">Print</span>
                <span className="sm:hidden">Print</span>
              </motion.button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-gray-50">
              {activeTab === 'guests' ? (
                <tr>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600">Rank</th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600">Name</th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600">Email</th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600 hidden md:table-cell">Account Created</th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600">Verified</th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600 hidden lg:table-cell">Total Bookings</th>
                </tr>
              ) : (
                <tr>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600">Rank</th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600">Name</th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600 hidden md:table-cell">Email</th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600 hidden lg:table-cell">Created</th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600">Verified</th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600 hidden xl:table-cell">Plan</th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600 hidden lg:table-cell">Total Earnings</th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600 hidden xl:table-cell">Next Billing</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-gray-200">
              {activeTab === 'guests' ? (
                filteredGuests.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                      No guests found
                    </td>
                  </tr>
                ) : (
                  filteredGuests.map((guest) => (
                    <GuestRow key={guest.id} guest={guest} />
                  ))
                )
              ) : (
                filteredHosts.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-8 text-center text-gray-500">
                      No hosts found
                    </td>
                  </tr>
                ) : (
                  filteredHosts.map((host) => (
                    <HostRow key={host.id} host={host} />
                  ))
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

export default UsersList;

