import React from "react";

const Filters = ({ 
  // HomeStays props
  filters, 
  setFilters, 
  // HomeStays additional props
  selectedCategory,
  setSelectedCategory,
  priceRange,
  setPriceRange,
  sortBy,
  setSortBy,
  categories,
  categoryLabels,
  priceRangeOptions,
  sortOptions,
  // Experiences/Services props
  searchQuery,
  setSearchQuery,
  selectedLocation,
  setSelectedLocation,
  locations,
  filteredCount,
  totalCount,
  searchPlaceholder,
  itemLabel = "home stays",
  hideSearch = false
}) => {
  // Determine if using HomeStays mode or Experiences/Services mode
  const isHomeStaysMode = filters !== undefined && setFilters !== undefined;
  
  // HomeStays handlers
  const handleResetHomeStays = () => {
    if (setFilters) {
      // Also clear date window when present
      setFilters({ location: "", guests: 0, locationSelect: "", startDate: null, endDate: null });
    }
    if (setSelectedCategory) setSelectedCategory('all');
    if (setPriceRange) setPriceRange('all');
    if (setSortBy) setSortBy('featured');
  };

  // Experiences/Services handlers
  const handleResetExperiences = () => {
    if (setSearchQuery) setSearchQuery('');
    if (setSelectedCategory) setSelectedCategory('all');
    if (setSelectedLocation) setSelectedLocation('all');
    if (setPriceRange) setPriceRange('all');
    if (setSortBy) setSortBy('featured');
  };

  const handleReset = isHomeStaysMode ? handleResetHomeStays : handleResetExperiences;

  // HomeStays active filters check
  const hasActiveFiltersHomeStays = filters && (
    filters.location || 
    filters.guests > 0 || 
    filters.locationSelect || 
    (selectedCategory && selectedCategory !== 'all') ||
    (priceRange && priceRange !== 'all') ||
    (sortBy && sortBy !== 'featured')
  );
  
  // Experiences/Services active filters check
  const hasActiveFiltersExperiences = searchQuery !== undefined && 
    (selectedCategory !== 'all' || selectedLocation !== 'all' || priceRange !== 'all' || searchQuery);
  
  const hasActiveFilters = isHomeStaysMode ? hasActiveFiltersHomeStays : hasActiveFiltersExperiences;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 w-full">
      {/* Search Bar */}
      {!hideSearch && (
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder={isHomeStaysMode ? "Search location..." : (searchPlaceholder || "Search...")}
              value={isHomeStaysMode ? (filters?.location || "") : (searchQuery || "")}
              onChange={(e) => {
                if (isHomeStaysMode) {
                  setFilters({ ...filters, location: e.target.value });
                } else {
                  setSearchQuery(e.target.value);
                }
              }}
              className="w-full px-4 py-3 pl-12 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
            />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      )}

      {/* Filter Row */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isHomeStaysMode && categories && priceRangeOptions && sortOptions ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4`}>
        {isHomeStaysMode ? (
          <>
            {/* Category Filter - HomeStays mode */}
            {categories && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={selectedCategory || 'all'}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all duration-200"
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{categoryLabels?.[cat] || cat}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Guests Filter - HomeStays mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Guests
              </label>
              <select
                value={filters.guests || 0}
                onChange={(e) => setFilters({ ...filters, guests: Number(e.target.value) })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all duration-200"
              >
                <option value={0}>Any guests</option>
                <option value={1}>1+ guest</option>
                <option value={2}>2+ guests</option>
                <option value={3}>3+ guests</option>
                <option value={4}>4+ guests</option>
                <option value={5}>5+ guests</option>
                <option value={6}>6+ guests</option>
              </select>
            </div>

            {/* Location Dropdown - HomeStays mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <select
                value={filters.locationSelect || ""}
                onChange={(e) => setFilters({ ...filters, locationSelect: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all duration-200"
              >
                <option value="">All locations</option>
                {locations && locations.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* Price Range Filter - HomeStays mode */}
            {priceRangeOptions && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price Range
                </label>
                <select
                  value={priceRange || 'all'}
                  onChange={(e) => setPriceRange(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all duration-200"
                >
                  <option value="all">All Prices</option>
                  {priceRangeOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Sort Filter - HomeStays mode */}
            {sortOptions && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <select
                  value={sortBy || 'featured'}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all duration-200"
                >
                  {sortOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Category Filter - Experiences/Services mode */}
            {categories && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={selectedCategory || 'all'}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all duration-200"
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{categoryLabels?.[cat] || cat}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Location Filter - Experiences/Services mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <select
                value={selectedLocation || 'all'}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all duration-200"
              >
                <option value="all">All Locations</option>
                {locations && locations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* Price Range Filter - Experiences/Services mode */}
            {priceRangeOptions && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price Range
                </label>
                <select
                  value={priceRange || 'all'}
                  onChange={(e) => setPriceRange(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all duration-200"
                >
                  <option value="all">All Prices</option>
                  {priceRangeOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Sort Filter - Experiences/Services mode */}
            {sortOptions && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <select
                  value={sortBy || 'featured'}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all duration-200"
                >
                  {sortOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}
      </div>

      {/* Active Filters Count */}
      {hasActiveFilters && (
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="text-sm text-gray-600">
            Showing {filteredCount || 0} of {totalCount || 0} {itemLabel}
          </div>
          <button
            onClick={handleReset}
            className="text-sm text-emerald-600 hover:text-emerald-700 active:text-emerald-800 font-medium transition-colors text-left sm:text-right hover:underline"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};

export default Filters;