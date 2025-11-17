// src/pages/admin/DashboardOverview/TopRatedList.jsx
import SectionHeader from '../components/SectionHeader';
import { FaStar } from 'react-icons/fa';

const TopRatedList = ({ ratings, limit = 10 }) => {
  // Calculate average rating for each listing
  const listingRatings = {};
  
  ratings.forEach(rating => {
    if (!listingRatings[rating.listingId]) {
      listingRatings[rating.listingId] = {
        listingId: rating.listingId,
        listingTitle: rating.listingTitle,
        ratings: [],
        averageRating: 0
      };
    }
    if (rating.rating) {
      listingRatings[rating.listingId].ratings.push(rating.rating);
    }
  });

  // Calculate averages and sort
  const topRated = Object.values(listingRatings)
    .map(listing => {
      if (listing.ratings.length > 0) {
        listing.averageRating = listing.ratings.reduce((sum, r) => sum + r, 0) / listing.ratings.length;
      }
      return listing;
    })
    .filter(listing => listing.averageRating > 0)
    .sort((a, b) => b.averageRating - a.averageRating)
    .slice(0, limit);

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <SectionHeader icon={FaStar} title="Top Rated Listings" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[500px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600">Rank</th>
              <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600">Listing</th>
              <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600">Average Rating</th>
              <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600 hidden sm:table-cell">Total Reviews</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {topRated.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-3 sm:px-6 py-6 sm:py-8 text-center text-gray-500 text-xs sm:text-sm">
                  No ratings available
                </td>
              </tr>
            ) : (
              topRated.map((listing, index) => (
                <tr key={listing.listingId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                    <span className="font-bold text-base sm:text-lg">#{index + 1}</span>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium text-gray-900">{listing.listingTitle}</td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                    <div className="flex items-center gap-1">
                      <FaStar className="text-yellow-400 text-sm sm:text-base" />
                      <span className="font-semibold text-xs sm:text-sm">{listing.averageRating.toFixed(1)}</span>
                      <span className="sm:hidden text-xs text-gray-500 ml-1">({listing.ratings.length})</span>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600 hidden sm:table-cell">{listing.ratings.length} reviews</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TopRatedList;

