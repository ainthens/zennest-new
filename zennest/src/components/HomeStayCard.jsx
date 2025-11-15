import React from "react";
import { FaHeart, FaRegHeart, FaStar, FaMapMarkerAlt, FaUserFriends } from "react-icons/fa";

const HomeStayCard = ({ stay, onView, isFavorite, onToggleFavorite }) => {
  const handleCardClick = (e) => {
    // Don't trigger if clicking on buttons or interactive elements
    if (e.target.closest('button')) {
      return;
    }
    if (onView) {
      onView(stay);
    }
  };

  return (
    <article 
      onClick={handleCardClick}
      className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200/60 hover:border-emerald-200 w-full cursor-pointer"
    >
      <div className="relative h-48 sm:h-52 md:h-56 w-full overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
        {stay.image ? (
          <img
            src={stay.image}
            alt={stay.title}
            className="w-min h-min object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl text-gray-400 mb-2">🏠</div>
              <p className="text-xs text-gray-500">No image available</p>
            </div>
          </div>
        )}
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Favorite button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          aria-label={isFavorite ? "Remove favorite" : "Add to favorites"}
          className="absolute top-2.5 sm:top-3 right-2.5 sm:right-3 z-20 p-2 sm:p-2.5 rounded-xl bg-white/90 backdrop-blur-sm border border-gray-200/80 text-gray-600 hover:bg-white hover:text-pink-500 hover:border-pink-200 hover:shadow-lg active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-offset-2 touch-manipulation"
        >
          {isFavorite ? (
            <FaHeart className="text-pink-500 text-sm sm:text-base" />
          ) : (
            <FaRegHeart className="text-current text-sm sm:text-base" />
          )}
        </button>

        {/* Rating badge */}
        {stay.rating > 0 && (
          <div className="absolute left-2.5 sm:left-3 bottom-2.5 sm:bottom-3 bg-white/95 backdrop-blur-sm text-gray-800 text-xs sm:text-sm font-semibold px-2 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-sm border border-gray-200/60 flex items-center gap-1 z-10">
            <FaStar className="text-yellow-400 fill-current text-xs" />
            <span>{stay.rating.toFixed(1)}</span>
          </div>
        )}

        {/* Discount badge */}
        {stay.discount > 0 && (
          <div className="absolute top-2.5 sm:top-3 left-2.5 sm:left-3 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg shadow-lg z-10 border-2 border-white/50">
            {stay.discount}% OFF
          </div>
        )}

        {/* Featured badge - only show if no discount */}
        {(!stay.discount || stay.discount === 0) && (
          <div className="absolute top-2.5 sm:top-3 left-2.5 sm:left-3 bg-emerald-600 text-white text-xs font-medium px-2 py-1 rounded-lg shadow-sm z-10">
            Featured
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5">
        <h3 className="text-base sm:text-md md:text-md font-bold text-gray-900 line-clamp-2 leading-tight mb-2 sm:mb-3 group-hover:text-emerald-700 transition-colors">
          {stay.title}
        </h3>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
          <div className="flex items-center gap-1 min-w-0">
            <FaMapMarkerAlt className="text-emerald-500 text-xs flex-shrink-0" />
            <span className="line-clamp-1 truncate">{stay.location || 'Location not specified'}</span>
          </div>
          <div className="flex items-center gap-1">
            <FaUserFriends className="text-emerald-500 text-xs flex-shrink-0" />
            <span className="whitespace-nowrap">{stay.guests} guests</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mt-4 sm:mt-4 pt-4 border-t border-gray-100">
          <div className="min-w-0 flex-1">
            {stay.discount > 0 ? (
              <div>
                {/* Discounted price on top */}
                <div className="flex items-baseline gap-1.5 mb-1">
                  <span className="text-lg sm:text-xl font-bold text-emerald-600">
                    ₱{((stay.pricePerNight || 0) * (1 - stay.discount / 100)).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  </span>
                  <span className="text-xs sm:text-sm text-gray-500">/ night</span>
                </div>
                
                {/* Original price with discount badge below */}
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs sm:text-sm text-gray-400 line-through font-medium">
                    ₱{(stay.pricePerNight || 0).toLocaleString()}
                  </span>
                  <span className="inline-flex items-center text-[9px] sm:text-[10px] text-white font-semibold bg-red-500 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                    -{stay.discount}%
                  </span>
                </div>
                
                <div className="text-xs text-gray-400 mt-0.5 sm:mt-1">Includes taxes & fees</div>
              </div>
            ) : (
              <div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-lg sm:text-xl font-bold text-emerald-600 truncate">
                    ₱{(stay.pricePerNight || 0).toLocaleString()}
                  </span>
                  <span className="text-xs sm:text-sm text-gray-500">/ night</span>
                </div>
                <div className="text-xs text-gray-400 mt-0.5 sm:mt-1">Includes taxes & fees</div>
              </div>
            )}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onView) {
                onView(stay);
              }
            }}
            className="bg-emerald-600 text-white py-2.5 sm:py-2.5 px-4 sm:px-5 rounded-xl text-xs sm:text-sm font-medium hover:bg-emerald-700 active:bg-emerald-800 transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 whitespace-nowrap flex items-center justify-center gap-2 sm:ml-4 flex-shrink-0 w-full sm:w-auto"
          >
            View Details
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Hover effect border */}
      <div className="absolute inset-0 border-2 border-transparent group-hover:border-emerald-200 rounded-2xl pointer-events-none transition-all duration-300" />
    </article>
  );
};

export default HomeStayCard;