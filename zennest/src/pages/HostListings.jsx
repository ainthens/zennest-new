// src/pages/HostListings.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getHostListings, softArchiveListing } from '../services/firestoreService';
import useAuth from '../hooks/useAuth';
import Loading from '../components/Loading';
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaClock,
  FaCheckCircle,
  FaHome,
  FaStar,
  FaImage,
  FaMapMarkerAlt
} from 'react-icons/fa';

const HostListings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'published', 'draft'

  useEffect(() => {
    if (user) {
      fetchListings();
    }
  }, [user]);

  // Refresh listings when returning from edit/create (check location state)
  useEffect(() => {
    if (location.state?.refresh) {
      fetchListings();
      // Clear the refresh flag
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchListings = async () => {
    try {
      setLoading(true);
      const result = await getHostListings(user.uid);
      if (result && result.success && result.data) {
        setListings(result.data);
      } else {
        console.warn('Unexpected result format:', result);
        setListings([]);
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
      // Check if it's an index error and show helpful message
      if (error.code === 'failed-precondition' && error.message?.includes('index')) {
        console.warn('⚠️ Firestore index is being created. The app will work after the index is ready.');
        // Still try to set empty array so UI doesn't break
        setListings([]);
      } else {
        setListings([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // SAFETY: Use soft archive instead of hard delete to preserve data
  // This prevents accidental data loss and allows recovery if needed
  const handleDelete = async (listingId) => {
    if (window.confirm('Are you sure you want to archive this listing? It will be hidden but can be restored if needed.')) {
      try {
        await softArchiveListing(listingId, 'archived-by-host');
        // Remove from local state (listing is archived, not deleted)
        setListings(listings.filter(l => l.id !== listingId));
      } catch (error) {
        console.error('Error archiving listing:', error);
        alert('Failed to archive listing. Please try again.');
      }
    }
  };

  const filteredListings = listings.filter(listing => {
    // Normalize status to lowercase for comparison
    const status = (listing.status || 'draft').toLowerCase();
    if (filter === 'published') return status === 'published';
    if (filter === 'draft') return status === 'draft' || !listing.status;
    return true;
  });

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'home':
        return <FaHome className="text-lg" />;
      case 'experience':
        return <FaStar className="text-lg" />;
      case 'service':
        return <FaClock className="text-lg" />;
      default:
        return <FaHome className="text-lg" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Listings</h1>
          <p className="text-gray-600">Manage your property listings</p>
        </div>
        <button
          onClick={() => navigate('/host/listings/new')}
          className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors font-medium"
        >
          <FaPlus />
          <span>Create New Listing</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { id: 'all', label: 'All Listings', count: listings.length },
          { id: 'published', label: 'Published', count: listings.filter(l => (l.status || '').toLowerCase() === 'published').length },
          { id: 'draft', label: 'Drafts', count: listings.filter(l => (l.status || '').toLowerCase() !== 'published').length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`
              px-4 py-2 border-b-2 font-medium transition-colors
              ${filter === tab.id
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
              }
            `}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Listings Grid */}
      {filteredListings.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <FaHome className="text-6xl text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No listings yet</h3>
          <p className="text-gray-600 mb-6">Start by creating your first listing</p>
          <button
            onClick={() => navigate('/host/listings/new')}
            className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors font-medium"
          >
            <FaPlus />
            <span>Create Listing</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredListings.map((listing, index) => {
            // Normalize status for display
            const status = (listing.status || 'draft').toLowerCase();
            const isPublished = status === 'published';
            
            return (
            <motion.div
              key={listing.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-lg transition-all duration-300 ${
                isPublished ? 'border-emerald-200 hover:border-emerald-300' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Image */}
              <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                {listing.images && listing.images.length > 0 ? (
                  <img
                    src={listing.images[0]}
                    alt={listing.title}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FaImage className="text-4xl text-gray-400" />
                  </div>
                )}
                {/* Status Badge - More prominent design */}
                <div className="absolute top-3 right-3">
                  <span className={`
                    inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-md backdrop-blur-sm
                    ${isPublished
                      ? 'bg-emerald-500/95 text-white border border-emerald-600/30'
                      : 'bg-yellow-500/95 text-white border border-yellow-600/30'
                    }
                  `}>
                    {isPublished ? (
                      <>
                        <FaCheckCircle className="text-xs" />
                        <span>Published</span>
                      </>
                    ) : (
                      <>
                        <FaClock className="text-xs" />
                        <span>Draft</span>
                      </>
                    )}
                  </span>
                </div>
                {/* Category Badge - Top Left */}
                <div className="absolute top-3 left-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-black/50 backdrop-blur-sm text-white rounded-lg text-xs font-medium">
                    {getCategoryIcon(listing.category)}
                    <span className="capitalize">{listing.category || 'home'}</span>
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                {/* Title */}
                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 text-lg">
                  {listing.title || 'Untitled Listing'}
                </h3>
                
                {/* Location */}
                {listing.location && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-600 mb-3">
                    <FaMapMarkerAlt className="text-xs text-gray-400" />
                    <span className="line-clamp-1">{listing.location}</span>
                  </div>
                )}

                {/* Property Details - Only for home category */}
                {listing.category === 'home' && (listing.bedrooms || listing.bathrooms || listing.guests) && (
                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-3 pb-3 border-b border-gray-100">
                    {listing.bedrooms > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="font-medium">{listing.bedrooms}</span>
                        <span>bed{listing.bedrooms > 1 ? 's' : ''}</span>
                      </span>
                    )}
                    {listing.bathrooms > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="font-medium">{listing.bathrooms}</span>
                        <span>bath{listing.bathrooms > 1 ? 's' : ''}</span>
                      </span>
                    )}
                    {listing.guests > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="font-medium">{listing.guests}</span>
                        <span>guest{listing.guests > 1 ? 's' : ''}</span>
                      </span>
                    )}
                  </div>
                )}

                {/* Price and Views */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FaEye className="text-gray-400" />
                    <span className="font-medium">{listing.views || 0}</span>
                    <span className="text-gray-400">views</span>
                  </div>
                  <div className="text-right">
                    {listing.discount > 0 ? (
                      <div className="flex items-baseline gap-2">
                        <span className="font-bold text-emerald-600 text-lg">
                          ₱{((listing.rate || 0) * (1 - (listing.discount || 0) / 100)).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        </span>
                        <span className="text-xs text-gray-400 line-through">
                          ₱{(listing.rate || 0).toLocaleString()}
                        </span>
                      </div>
                    ) : (
                      <span className="font-bold text-emerald-600 text-lg">
                        ₱{(listing.rate || 0).toLocaleString()}
                      </span>
                    )}
                    <p className="text-xs text-gray-500 mt-0.5">per night</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => navigate(`/host/listings/${listing.id}/edit`)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium shadow-sm"
                  >
                    <FaEdit />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(listing.id)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                  >
                    <FaTrash />
                  </button>
                  <button
                    onClick={() => navigate(`/listings/${listing.id}`)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                  >
                    <FaEye />
                    View
                  </button>
                </div>
              </div>
            </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HostListings;

