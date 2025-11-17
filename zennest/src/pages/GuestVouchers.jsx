// src/pages/GuestVouchers.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getAvailableVouchers, getClaimedVouchers, claimVoucher } from '../services/firestoreService';
import useAuth from '../hooks/useAuth';
import SettingsHeader from '../components/SettingsHeader';
import Loading from '../components/Loading';
import {
  FaTicketAlt,
  FaGift,
  FaCheckCircle,
  FaTimesCircle,
  FaCalendarAlt,
  FaPercent,
  FaTag,
  FaInfoCircle,
  FaExclamationTriangle,
  FaSpinner,
  FaCopy
} from 'react-icons/fa';

const GuestVouchers = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [availableVouchers, setAvailableVouchers] = useState([]);
  const [claimedVouchers, setClaimedVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available'); // 'available' or 'claimed'
  const [claiming, setClaiming] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
        setAvailableVouchers([]);
        setClaimedVouchers([]);
        setLoading(false);
        return;
      }

      // Fetch available vouchers
      const availableResult = await getAvailableVouchers();
      if (availableResult.success) {
        setAvailableVouchers(availableResult.data || []);
      }

      // Fetch claimed vouchers
      const claimedResult = await getClaimedVouchers(user.uid);
      if (claimedResult.success) {
        setClaimedVouchers(claimedResult.data || []);
      }
    } catch (err) {
      console.error('Error fetching vouchers:', err);
      setError('Failed to fetch vouchers');
    } finally {
      setLoading(false);
    }
  };

  const handleClaimVoucher = async (voucherId) => {
    if (!user?.uid) {
      if (window.confirm('Please sign in to claim vouchers. Would you like to sign in?')) {
        navigate('/login');
      }
      return;
    }

    setClaiming(voucherId);
    setError('');
    setSuccess('');

    try {
      const result = await claimVoucher(voucherId, user.uid);
      
      if (result.success) {
        setSuccess(`Voucher ${result.voucher.code} claimed successfully!`);
        fetchVouchers();
        
        // Switch to claimed tab after claiming
        setTimeout(() => {
          setActiveTab('claimed');
          setSuccess('');
        }, 2000);
      } else {
        setError(result.error || 'Failed to claim voucher');
      }
    } catch (err) {
      console.error('Error claiming voucher:', err);
      setError(err.message || 'Failed to claim voucher');
    } finally {
      setClaiming(null);
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
    if (!date) return 'No expiration';
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return 'Invalid date';
    return dateObj.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const isExpired = (voucher) => {
    if (!voucher.expirationDate) return false;
    const expDate = voucher.expirationDate instanceof Date ? voucher.expirationDate : new Date(voucher.expirationDate);
    return expDate < new Date();
  };

  const isUsed = (voucher) => {
    return voucher.isUsed || voucher.usageCount >= (voucher.usageLimit || 1);
  };

  const getVoucherStatus = (voucher) => {
    if (isUsed(voucher)) return { label: 'Used', color: 'gray', icon: FaCheckCircle };
    if (isExpired(voucher)) return { label: 'Expired', color: 'red', icon: FaTimesCircle };
    if (voucher.isClaimed) return { label: 'Claimed', color: 'blue', icon: FaInfoCircle };
    return { label: 'Available', color: 'green', icon: FaCheckCircle };
  };

  if (!user) {
    return (
      <>
        <SettingsHeader />
        <div className="min-h-screen bg-slate-50 pt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
              <FaTicketAlt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Please Sign In</h2>
              <p className="text-gray-600 mb-6">Sign in to view and claim vouchers</p>
              <button
                onClick={() => navigate('/login')}
                className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <SettingsHeader />
        <div className="min-h-screen bg-slate-50 pt-20">
          <Loading message="Loading vouchers..." size="large" fullScreen={false} className="pt-20" />
        </div>
      </>
    );
  }

  return (
    <>
      <SettingsHeader />
      <div className="min-h-screen bg-slate-50 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <FaTicketAlt className="text-emerald-600" />
              Vouchers & Discounts
            </h1>
            <p className="text-gray-600">Claim vouchers and save on your next booking</p>
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

          {/* Tabs */}
          <div className="mb-6 flex gap-4 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('available')}
              className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
                activeTab === 'available'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Available ({availableVouchers.length})
            </button>
            <button
              onClick={() => setActiveTab('claimed')}
              className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
                activeTab === 'claimed'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              My Vouchers ({claimedVouchers.length})
            </button>
          </div>

          {/* Available Vouchers */}
          {activeTab === 'available' && (
            <div>
              {availableVouchers.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
                  <FaGift className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No available vouchers</h3>
                  <p className="text-gray-600">Check back later for new discount vouchers from hosts</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {availableVouchers.map((voucher) => {
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
                          <div className={`p-3 rounded-lg border-2 ${
                            isExpired(voucher) 
                              ? 'bg-red-50 border-red-200' 
                              : 'bg-emerald-50 border-emerald-200'
                          }`}>
                            <div className="flex items-center gap-2 mb-1">
                              <FaCalendarAlt className={`w-4 h-4 ${
                                isExpired(voucher) ? 'text-red-600' : 'text-emerald-600'
                              }`} />
                              <span className={`text-xs font-semibold ${
                                isExpired(voucher) ? 'text-red-700' : 'text-emerald-700'
                              }`}>
                                {isExpired(voucher) ? 'EXPIRED' : 'EXPIRES'}
                              </span>
                            </div>
                            <div className={`text-sm font-bold ${
                              isExpired(voucher) ? 'text-red-900' : 'text-emerald-900'
                            }`}>
                              {formatDate(voucher.expirationDate)}
                            </div>
                            {!isExpired(voucher) && voucher.expirationDate && (
                              <div className="text-xs text-emerald-600 mt-1">
                                {(() => {
                                  const expDate = voucher.expirationDate instanceof Date 
                                    ? voucher.expirationDate 
                                    : new Date(voucher.expirationDate);
                                  const today = new Date();
                                  const diffTime = expDate - today;
                                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                  if (diffDays <= 7) {
                                    return `⚠️ Expires in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
                                  }
                                  return null;
                                })()}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusIcon className={`w-4 h-4 text-${status.color}-600`} />
                            <span className={`text-sm font-semibold text-${status.color}-600`}>
                              {status.label}
                            </span>
                          </div>
                        </div>

                        {/* Claim Button */}
                        <button
                          onClick={() => handleClaimVoucher(voucher.id)}
                          disabled={claiming === voucher.id || isUsed(voucher) || isExpired(voucher)}
                          className="w-full px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {claiming === voucher.id ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Claiming...
                            </>
                          ) : isUsed(voucher) ? (
                            'Used'
                          ) : isExpired(voucher) ? (
                            'Expired'
                          ) : (
                            <>
                              <FaGift className="w-4 h-4" />
                              Claim Voucher
                            </>
                          )}
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Claimed Vouchers */}
          {activeTab === 'claimed' && (
            <div>
              {claimedVouchers.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
                  <FaTicketAlt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No claimed vouchers</h3>
                  <p className="text-gray-600 mb-6">Claim vouchers from the Available tab to use them on your bookings</p>
                  <button
                    onClick={() => setActiveTab('available')}
                    className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                  >
                    View Available Vouchers
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {claimedVouchers.map((voucher) => {
                    const status = getVoucherStatus(voucher);
                    const StatusIcon = status.icon;
                    
                    return (
                      <motion.div
                        key={voucher.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`bg-white rounded-2xl shadow-sm border-2 p-6 hover:shadow-lg transition-shadow ${
                          isUsed(voucher) || isExpired(voucher)
                            ? 'border-gray-300 opacity-75'
                            : 'border-emerald-200'
                        }`}
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
                          <div className={`p-3 rounded-lg border-2 ${
                            isExpired(voucher) 
                              ? 'bg-red-50 border-red-200' 
                              : isUsed(voucher)
                              ? 'bg-gray-50 border-gray-200'
                              : 'bg-emerald-50 border-emerald-200'
                          }`}>
                            <div className="flex items-center gap-2 mb-1">
                              <FaCalendarAlt className={`w-4 h-4 ${
                                isExpired(voucher) 
                                  ? 'text-red-600' 
                                  : isUsed(voucher)
                                  ? 'text-gray-600'
                                  : 'text-emerald-600'
                              }`} />
                              <span className={`text-xs font-semibold ${
                                isExpired(voucher) 
                                  ? 'text-red-700' 
                                  : isUsed(voucher)
                                  ? 'text-gray-700'
                                  : 'text-emerald-700'
                              }`}>
                                {isExpired(voucher) ? 'EXPIRED' : 'EXPIRES'}
                              </span>
                            </div>
                            <div className={`text-sm font-bold ${
                              isExpired(voucher) 
                                ? 'text-red-900' 
                                : isUsed(voucher)
                                ? 'text-gray-900'
                                : 'text-emerald-900'
                            }`}>
                              {formatDate(voucher.expirationDate)}
                            </div>
                            {!isExpired(voucher) && !isUsed(voucher) && voucher.expirationDate && (
                              <div className="text-xs text-emerald-600 mt-1">
                                {(() => {
                                  const expDate = voucher.expirationDate instanceof Date 
                                    ? voucher.expirationDate 
                                    : new Date(voucher.expirationDate);
                                  const today = new Date();
                                  const diffTime = expDate - today;
                                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                  if (diffDays <= 7) {
                                    return `⚠️ Expires in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
                                  }
                                  return null;
                                })()}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusIcon className={`w-4 h-4 text-${status.color}-600`} />
                            <span className={`text-sm font-semibold text-${status.color}-600`}>
                              {status.label}
                            </span>
                          </div>
                          {voucher.claimedAt && (
                            <div className="text-xs text-gray-500">
                              Claimed: {formatDate(voucher.claimedAt)}
                            </div>
                          )}
                        </div>

                        {/* Status Badge */}
                        {isUsed(voucher) && (
                          <div className="p-3 bg-gray-50 rounded-lg text-center text-sm text-gray-600">
                            This voucher has been used
                          </div>
                        )}
                        {isExpired(voucher) && !isUsed(voucher) && (
                          <div className="p-3 bg-red-50 rounded-lg text-center text-sm text-red-600">
                            This voucher has expired
                          </div>
                        )}
                        {!isUsed(voucher) && !isExpired(voucher) && (
                          <div className="p-3 bg-emerald-50 rounded-lg text-center text-sm text-emerald-700 font-semibold">
                            Ready to use on your next booking
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default GuestVouchers;

