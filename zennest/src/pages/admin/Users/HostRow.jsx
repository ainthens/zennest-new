// src/pages/admin/Users/HostRow.jsx
import { FaTrophy, FaCalendarAlt } from 'react-icons/fa';
import { parseDate } from '../../../utils/dateUtils';

const HostRow = ({ host }) => {
  const createdAt = parseDate(host.createdAt);
  const isVerified = host.emailVerified || host.verified || false;
  const ranking = host.ranking || 0;
  const totalEarnings = host.totalEarnings || 0;
  
  // Get next billing date (subscription end date)
  const nextBillingDate = parseDate(host.subscriptionEndDate);
  const isActive = host.subscriptionStatus === 'active';
  const isExpired = nextBillingDate && nextBillingDate < new Date();
  const isExpiringSoon = nextBillingDate && !isExpired && (nextBillingDate.getTime() - new Date().getTime()) < (7 * 24 * 60 * 60 * 1000); // Within 7 days

  // Determine ranking badge color
  const getRankingBadgeClass = (rank) => {
    if (rank === 1) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (rank === 2) return 'bg-gray-100 text-gray-800 border-gray-300';
    if (rank === 3) return 'bg-orange-100 text-orange-800 border-orange-300';
    if (rank <= 10) return 'bg-blue-100 text-blue-800 border-blue-300';
    return 'bg-gray-50 text-gray-600 border-gray-200';
  };

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm">
        {/* Ranking Badge */}
        {ranking > 0 ? (
          <div className={`flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 font-bold text-xs sm:text-sm ${getRankingBadgeClass(ranking)}`}>
            {ranking === 1 && <FaTrophy className="text-yellow-600 text-xs sm:text-sm" />}
            {ranking !== 1 && <span>{ranking}</span>}
          </div>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
      <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm font-medium text-gray-900">
        {host.firstName && host.lastName 
          ? `${host.firstName} ${host.lastName}` 
          : host.email || 'Unknown'}
      </td>
      <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-600 hidden md:table-cell">{host.email || 'N/A'}</td>
      <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-600 hidden lg:table-cell">
        {createdAt ? createdAt.toLocaleDateString() : 'N/A'}
      </td>
      <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm">
        <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${
          isVerified ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {isVerified ? 'Verified' : 'Unverified'}
        </span>
      </td>
      <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm hidden xl:table-cell">
        <span className="px-2 sm:px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold capitalize">
          {host.subscriptionPlan || 'N/A'}
          {host.subscriptionPlan === 'pro' && (
            <span className="ml-1 text-orange-600">★</span>
          )}
        </span>
      </td>
      <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm">
        <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${
          host.subscriptionStatus === 'active' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {host.subscriptionStatus || 'inactive'}
        </span>
      </td>
      <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm hidden lg:table-cell">
        <div className="flex flex-col gap-1">
          <span className="font-bold text-emerald-600">₱{totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span className="text-xs text-gray-500">Earnings</span>
        </div>
      </td>
      <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm hidden xl:table-cell">
        {isActive && nextBillingDate ? (
          <div className="flex items-center gap-1 sm:gap-2">
            <FaCalendarAlt className={`text-xs ${isExpired ? 'text-red-500' : isExpiringSoon ? 'text-amber-500' : 'text-emerald-600'}`} />
            <span className={`font-medium text-xs sm:text-sm ${
              isExpired 
                ? 'text-red-600' 
                : isExpiringSoon 
                ? 'text-amber-600' 
                : 'text-gray-700'
            }`}>
              {nextBillingDate.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              })}
            </span>
            {isExpired && (
              <span className="text-xs text-red-600 font-semibold hidden sm:inline">(Expired)</span>
            )}
            {isExpiringSoon && !isExpired && (
              <span className="text-xs text-amber-600 font-semibold hidden sm:inline">(Soon)</span>
            )}
          </div>
        ) : (
          <span className="text-gray-400 text-xs sm:text-sm">—</span>
        )}
      </td>
    </tr>
  );
};

export default HostRow;

