// src/pages/HostVouchers.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { createVoucher, getVouchers, deleteVoucher } from '../services/firestoreService';
import useAuth from '../hooks/useAuth';
import Loading from '../components/Loading';
import {
  FaTicketAlt,
  FaPlus,
  FaTrash,
  FaCopy,
  FaCheckCircle,
  FaTimesCircle,
  FaCalendarAlt,
  FaPercent,
  FaTag,
  FaTimes,
  FaExclamationTriangle,
  FaInfoCircle
} from 'react-icons/fa';

const HostVouchers = () => {
  const { user } = useAuth();
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null);
  
  // Form state
  const [discountPercentage, setDiscountPercentage] = useState(10);
  const [startDate, setStartDate] = useState(null); // Start date of voucher availability
  const [endDate, setEndDate] = useState(null); // End date of voucher availability
  const [usageLimit, setUsageLimit] = useState(1);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (user) {
      fetchVouchers();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchVouchers = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!user?.uid) {
        setVouchers([]);
        setLoading(false);
        return;
      }

      const result = await getVouchers(user.uid, 'host');
      
      if (result.success) {
        setVouchers(result.data || []);
      } else {
        setError(result.error || 'Failed to fetch vouchers');
        setVouchers([]);
      }
    } catch (err) {
      console.error('Error fetching vouchers:', err);
      setError('Failed to fetch vouchers');
      setVouchers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVoucher = async (e) => {
    e.preventDefault();
    setFormError('');
    setCreating(true);

    try {
      // Validate discount percentage
      if (discountPercentage <= 0 || discountPercentage > 50) {
        setFormError('Discount percentage must be between 1% and 50%');
        setCreating(false);
        return;
      }

      // Validate date range (required)
      if (!startDate || !endDate) {
        setFormError('Both start date and end date are required');
        setCreating(false);
        return;
      }
      
      // Sort dates to ensure start is before end
      let start = startDate instanceof Date ? new Date(startDate) : new Date(startDate);
      let end = endDate instanceof Date ? new Date(endDate) : new Date(endDate);
      
      // Swap if end is before start
      if (end < start) {
        [start, end] = [end, start];
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      
      if (start < today) {
        setFormError('Start date must be today or in the future');
        setCreating(false);
        return;
      }
      
      if (end < start) {
        setFormError('End date must be after start date');
        setCreating(false);
        return;
      }

      // Validate usage limit
      if (usageLimit < 1) {
        setFormError('Usage limit must be at least 1');
        setCreating(false);
        return;
      }

      // Use sorted dates for saving
      const voucherData = {
        discountPercentage: parseFloat(discountPercentage),
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        expirationDate: end.toISOString().split('T')[0], // Keep for backward compatibility
        usageLimit: parseInt(usageLimit) || 1
      };

      const result = await createVoucher(user.uid, voucherData);
      
      if (result.success) {
        setSuccess(`Voucher ${result.code} created successfully!`);
        setDiscountPercentage(10);
        setStartDate(null);
        setEndDate(null);
        setUsageLimit(1);
        setShowCreateModal(false);
        fetchVouchers();
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          setSuccess('');
        }, 5000);
      } else {
        setFormError(result.error || 'Failed to create voucher');
      }
    } catch (err) {
      console.error('Error creating voucher:', err);
      setFormError(err.message || 'Failed to create voucher');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteVoucher = async (voucherId) => {
    if (!window.confirm('Are you sure you want to delete this voucher? This action cannot be undone.')) {
      return;
    }

    setDeleting(voucherId);
    setError('');

    try {
      const result = await deleteVoucher(voucherId, user.uid);
      
      if (result.success) {
        setSuccess('Voucher deleted successfully');
        fetchVouchers();
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccess('');
        }, 3000);
      } else {
        setError(result.error || 'Failed to delete voucher');
      }
    } catch (err) {
      console.error('Error deleting voucher:', err);
      setError(err.message || 'Failed to delete voucher');
    } finally {
      setDeleting(null);
    }
  };

  const copyVoucherCode = (code) => {
    navigator.clipboard.writeText(code);
    setSuccess(`Voucher code ${code} copied to clipboard!`);
    setTimeout(() => {
      setSuccess('');
    }, 2000);
  };

  const formatDate = (date) => {
    if (!date) return 'No date';
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return 'Invalid date';
    return dateObj.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatDateRange = (voucher) => {
    // Support both new date range format and old expiration date format
    if (voucher.startDate && voucher.endDate) {
      return `${formatDate(voucher.startDate)} - ${formatDate(voucher.endDate)}`;
    } else if (voucher.expirationDate) {
      // Fallback to old format
      return `Until ${formatDate(voucher.expirationDate)}`;
    }
    return 'No expiration';
  };

  const isExpired = (voucher) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    // Check new date range format first
    if (voucher.startDate && voucher.endDate) {
      const endDate = voucher.endDate instanceof Date ? voucher.endDate : new Date(voucher.endDate);
      endDate.setHours(0, 0, 0, 0);
      return endDate < now;
    }
    
    // Fallback to old expiration date format
    if (voucher.expirationDate) {
      const expDate = voucher.expirationDate instanceof Date ? voucher.expirationDate : new Date(voucher.expirationDate);
      expDate.setHours(0, 0, 0, 0);
      return expDate < now;
    }
    
    return false;
  };

  const isActive = (voucher) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    // Check new date range format
    if (voucher.startDate && voucher.endDate) {
      const startDate = voucher.startDate instanceof Date ? voucher.startDate : new Date(voucher.startDate);
      const endDate = voucher.endDate instanceof Date ? voucher.endDate : new Date(voucher.endDate);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      return now >= startDate && now <= endDate;
    }
    
    // Fallback: if only expiration date exists, consider it active if not expired
    if (voucher.expirationDate) {
      const expDate = voucher.expirationDate instanceof Date ? voucher.expirationDate : new Date(voucher.expirationDate);
      expDate.setHours(0, 0, 0, 0);
      return expDate >= now;
    }
    
    return false;
  };

  const isUsed = (voucher) => {
    return voucher.isUsed || voucher.usageCount >= (voucher.usageLimit || 1);
  };

  const getVoucherStatus = (voucher) => {
    if (isUsed(voucher)) return { label: 'Used', color: 'gray', icon: FaCheckCircle };
    if (isExpired(voucher)) return { label: 'Expired', color: 'red', icon: FaTimesCircle };
    if (!isActive(voucher) && !isExpired(voucher)) return { label: 'Not Started', color: 'yellow', icon: FaInfoCircle };
    if (voucher.isClaimed) return { label: 'Claimed', color: 'blue', icon: FaInfoCircle };
    return { label: 'Available', color: 'green', icon: FaCheckCircle };
  };


  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <FaTicketAlt className="text-emerald-600" />
              Vouchers & Discounts
            </h1>
            <p className="text-gray-600">Create and manage discount vouchers for your listings</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-semibold shadow-lg hover:shadow-xl"
          >
            <FaPlus className="w-5 h-5" />
            Create Voucher
          </button>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 flex items-center gap-2"
          >
            <FaCheckCircle className="w-5 h-5" />
            <span>{success}</span>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2"
          >
            <FaExclamationTriangle className="w-5 h-5" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Vouchers Grid */}
        {vouchers.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
            <FaTicketAlt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No vouchers yet</h3>
            <p className="text-gray-600 mb-6">Create your first discount voucher to attract more guests</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-semibold"
            >
              Create Voucher
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vouchers.map((voucher) => {
              const status = getVoucherStatus(voucher);
              const StatusIcon = status.icon;
              
              return (
                <motion.div
                  key={voucher.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-6 hover:shadow-lg transition-shadow"
                >
                  {/* Voucher Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FaTag className="text-emerald-600" />
                        <span className="font-mono font-bold text-lg text-gray-900">{voucher.code}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <FaPercent className="text-emerald-600" />
                        <span className="text-2xl font-bold text-gray-900">{voucher.discountPercentage}%</span>
                        <span className="text-gray-600">off</span>
                      </div>
                    </div>
                    <button
                      onClick={() => copyVoucherCode(voucher.code)}
                      className="p-2 text-gray-400 hover:text-emerald-600 transition-colors"
                      title="Copy code"
                    >
                      <FaCopy className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Voucher Details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FaCalendarAlt className="w-4 h-4" />
                      <span>Valid: {formatDateRange(voucher)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FaInfoCircle className="w-4 h-4" />
                      <span>Usage: {voucher.usageCount || 0} / {voucher.usageLimit || 1}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusIcon className={`w-4 h-4 text-${status.color}-600`} />
                      <span className={`text-sm font-semibold text-${status.color}-600`}>
                        {status.label}
                      </span>
                    </div>
                    {voucher.claimedBy && (
                      <div className="text-xs text-gray-500">
                        Claimed by guest
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t border-gray-200">
                    {!isUsed(voucher) && (
                      <button
                        onClick={() => handleDeleteVoucher(voucher.id)}
                        disabled={deleting === voucher.id}
                        className="flex-1 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {deleting === voucher.id ? (
                          <>
                            <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <FaTrash className="w-4 h-4" />
                            Delete
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Create Voucher Modal */}
        <AnimatePresence>
          {showCreateModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => !creating && setShowCreateModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Create New Voucher</h3>
                  <button
                    onClick={() => !creating && setShowCreateModal(false)}
                    disabled={creating}
                    className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FaTimes className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateVoucher} className="space-y-4">
                  {/* Discount Percentage */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Discount Percentage (1% - 50%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={discountPercentage}
                        onChange={(e) => setDiscountPercentage(parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-lg font-semibold"
                        required
                        disabled={creating}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">%</span>
                    </div>
                  </div>

                  {/* Date Range with Calendar Picker */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Voucher Availability Period <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-3">
                      {/* Combined Range Display */}
                      <div className="relative">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Select Date Range
                        </label>
                        <DatePicker
                          selected={startDate}
                          onChange={(dates) => {
                            if (!dates) {
                              setStartDate(null);
                              setEndDate(null);
                              return;
                            }

                            const [start, end] = dates;
                            setStartDate(start || null);
                            setEndDate(end || null);
                          }}
                          startDate={startDate}
                          endDate={endDate}
                          selectsRange
                          minDate={new Date()}
                          dateFormat="MMM dd, yyyy"
                          placeholderText="Click to select date range"
                          className="w-full px-4 py-3 pr-12 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer"
                          disabled={creating}
                          calendarClassName="z-50"
                          popperPlacement="bottom-start"
                          showPopperArrow={false}
                          popperModifiers={[
                            {
                              name: "offset",
                              options: {
                                offset: [0, 8],
                              },
                            },
                          ]}
                          wrapperClassName="w-full"
                          isClearable
                          shouldCloseOnSelect={false}
                        />
                        <div className="absolute right-3 top-9 -translate-y-1/2 pointer-events-none">
                          <FaCalendarAlt className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>

                      {/* Display Selected Range */}
                      {(startDate || endDate) && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                          <div className="flex items-center gap-2 text-sm">
                            <FaCalendarAlt className="text-emerald-600 flex-shrink-0" />
                            <div className="flex-1">
                              {startDate && endDate ? (
                                <span className="text-emerald-800 font-medium">
                                  {formatDate(startDate)} - {formatDate(endDate)}
                                </span>
                              ) : startDate ? (
                                <span className="text-emerald-800 font-medium">
                                  Start: {formatDate(startDate)} - <span className="text-emerald-600">Select end date</span>
                                </span>
                              ) : null}
                            </div>
                            {(startDate || endDate) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setStartDate(null);
                                  setEndDate(null);
                                }}
                                className="text-emerald-600 hover:text-emerald-800 transition-colors"
                                disabled={creating}
                              >
                                <FaTimes className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Click the calendar to select a date range. First click selects the start date, second click selects the end date.
                    </p>
                    
                    {/* Tip Section */}
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
                      <FaInfoCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-800">
                        <strong>Tip:</strong> Creating vouchers is completely free! Use them to attract more guests and increase your bookings. The voucher will only be valid during the selected date range.
                      </p>
                    </div>
                  </div>

                  {/* Usage Limit */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Usage Limit (Number of times voucher can be used)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={usageLimit}
                      onChange={(e) => setUsageLimit(parseInt(e.target.value) || 1)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      required
                      disabled={creating}
                    />
                  </div>

                  {/* Form Error */}
                  {formError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                      <FaExclamationTriangle className="w-4 h-4" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => !creating && setShowCreateModal(false)}
                      disabled={creating}
                      className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creating || !startDate || !endDate}
                      className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {creating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <FaPlus className="w-4 h-4" />
                          Create Voucher
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default HostVouchers;

