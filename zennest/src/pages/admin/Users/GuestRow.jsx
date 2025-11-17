// src/pages/admin/Users/GuestRow.jsx
import { parseDate } from '../../../utils/dateUtils';
import { FaTrophy } from 'react-icons/fa';

const GuestRow = ({ guest }) => {
  const accountCreated = parseDate(guest.createdAt);
  const isVerified = guest.emailVerified || guest.verified || false;
  const ranking = guest.ranking || 0;
  const totalBookings = guest.totalBookings || 0;

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
        {guest.firstName && guest.lastName 
          ? `${guest.firstName} ${guest.lastName}` 
          : guest.email || 'Unknown'}
      </td>
      <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-600">{guest.email || 'N/A'}</td>
      <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-600 hidden md:table-cell">
        {accountCreated ? accountCreated.toLocaleDateString() : 'N/A'}
      </td>
      <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm">
        <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${
          isVerified ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {isVerified ? 'Verified' : 'Unverified'}
        </span>
      </td>
      <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-600 hidden lg:table-cell">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{totalBookings}</span>
          <span className="text-gray-400 text-xs">booking{totalBookings !== 1 ? 's' : ''}</span>
        </div>
      </td>
    </tr>
  );
};

export default GuestRow;

