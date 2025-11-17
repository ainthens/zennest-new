// src/pages/admin/ServiceFees/ServiceFees.jsx
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SectionHeader from '../components/SectionHeader';
import { FaDollarSign, FaFilePdf, FaPrint, FaWallet, FaPaypal, FaSpinner, FaCheckCircle, FaExclamationCircle, FaTimes, FaMoneyBillWave, FaSync } from 'react-icons/fa';
import { fetchTransactions, calculateAdminBalanceFromTransactions } from '../lib/dataFetchers';
import { generatePDFReport, printReport } from '../lib/reportUtils';
import CashoutModal from './CashoutModal';
import TransactionRow from './TransactionRow';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { parseDate } from '../../../utils/dateUtils';

const ServiceFees = ({ adminBalance, adminFeePercentage, showToast }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calculatedBalance, setCalculatedBalance] = useState(adminBalance);
  const [showCashoutModal, setShowCashoutModal] = useState(false);
  const [showWithdrawalSuccessModal, setShowWithdrawalSuccessModal] = useState(false);
  const [withdrawalDetails, setWithdrawalDetails] = useState(null);
  const [processingCashOut, setProcessingCashOut] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [statusFilter, setStatusFilter] = useState('all');
  const [hostFilter, setHostFilter] = useState('');
  const [localLoading, setLocalLoading] = useState(false);

  useEffect(() => {
    loadTransactions();
    calculateBalance();
  }, [dateRange.startDate, dateRange.endDate, statusFilter, hostFilter, adminFeePercentage]);

  const calculateBalance = async () => {
    try {
      const balance = await calculateAdminBalanceFromTransactions(adminFeePercentage);
      setCalculatedBalance(balance);
    } catch (error) {
      console.error('Error calculating balance:', error);
      // Fallback to provided adminBalance
      setCalculatedBalance(adminBalance);
    }
  };

  // Helper function to normalize dates (remove time component)
  const normalizeDate = (date) => {
    if (!date) return null;
    const d = new Date(date);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  };

  // Helper function to check if transaction falls within date range
  const isWithinDateRange = (transaction) => {
    if (!dateRange.startDate && !dateRange.endDate) return true;
    
    const transactionDate = transaction.date ? normalizeDate(transaction.date) : null;
    if (!transactionDate) return false;

    const startDate = dateRange.startDate ? normalizeDate(dateRange.startDate) : null;
    const endDate = dateRange.endDate ? normalizeDate(dateRange.endDate) : null;

    // Case 1: Only start date provided - show transactions on or after start date
    if (startDate && !endDate) {
      return transactionDate >= startDate;
    }

    // Case 2: Only end date provided - show transactions on or before end date
    if (!startDate && endDate) {
      return transactionDate <= endDate;
    }

    // Case 3: Both dates provided - show transactions within the range
    if (startDate && endDate) {
      return transactionDate >= startDate && transactionDate <= endDate;
    }

    return true;
  };

  const loadTransactions = async () => {
    setLocalLoading(true);
    try {
      const data = await fetchTransactions({
        dateFrom: dateRange.startDate || null,
        dateTo: dateRange.endDate || null,
        status: statusFilter !== 'all' ? statusFilter : null,
        hostId: hostFilter || null,
        adminFeePercentage: adminFeePercentage || null
      });
      
      // Apply client-side date range filtering for accuracy
      let filteredData = data;
      if (dateRange.startDate || dateRange.endDate) {
        filteredData = data.filter(transaction => isWithinDateRange(transaction));
      }
      
      setTransactions(filteredData);
    } catch (error) {
      console.error('Error loading transactions:', error);
      showToast('Failed to load transactions', 'error');
    } finally {
      setLocalLoading(false);
      setLoading(false);
    }
  };

  // Get PayPal OAuth access token using client credentials
  const getPayPalAccessToken = async () => {
    try {
      const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || '';
      const clientSecret = import.meta.env.VITE_PAYPAL_CLIENT_SECRET || import.meta.env.VITE_PAYPAL_SECRET_KEY || '';

      if (!clientId || !clientSecret) {
        throw new Error('PayPal credentials not configured. Please set VITE_PAYPAL_CLIENT_ID and VITE_PAYPAL_SECRET_KEY (or VITE_PAYPAL_CLIENT_SECRET) in your .env file and restart the dev server.');
      }

      const tokenUrl = 'https://api-m.sandbox.paypal.com/v1/oauth2/token';
      const credentials = btoa(`${clientId}:${clientSecret}`);
      
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Language': 'en_US',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`
        },
        body: 'grant_type=client_credentials'
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('PayPal OAuth error:', errorText);
        throw new Error(`Failed to get PayPal access token: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.access_token;
    } catch (error) {
      console.error('Error getting PayPal access token:', error);
      throw error;
    }
  };

  // Process PayPal payout directly via PayPal Sandbox API
  const processPayPalPayoutDirect = async (paypalEmail, amount) => {
    try {
      console.log('🔐 Getting PayPal OAuth token...');
      const accessToken = await getPayPalAccessToken();
      console.log('✅ PayPal OAuth token obtained');

      const payoutUrl = 'https://api-m.sandbox.paypal.com/v1/payments/payouts';
      const senderBatchId = `ADMIN-PAYOUT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const payoutData = {
        sender_batch_header: {
          sender_batch_id: senderBatchId,
          email_subject: 'You have a payout from ZenNest Admin',
          email_message: `You have received a payout of ₱${amount.toFixed(2)} from ZenNest Admin.`
        },
        items: [
          {
            recipient_type: 'EMAIL',
            amount: {
              value: amount.toFixed(2),
              currency: 'PHP'
            },
            receiver: paypalEmail,
            note: 'Admin payout from ZenNest',
            sender_item_id: `ADMIN-PAYOUT-ITEM-${Date.now()}`
          }
        ]
      };

      console.log('💰 Creating PayPal payout:', {
        paypalEmail,
        amount,
        senderBatchId
      });

      const response = await fetch(payoutUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(payoutData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('PayPal Payout API error:', errorData);
        throw new Error(errorData.message || errorData.name || `PayPal payout failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ PayPal payout created:', result);

      return {
        success: true,
        payoutBatchId: result.batch_header?.payout_batch_id || senderBatchId,
        status: result.batch_header?.batch_status || 'PROCESSING',
        transactionId: result.items?.[0]?.transaction_id || null,
        links: result.links || []
      };
    } catch (error) {
      console.error('Error processing PayPal payout:', error);
      throw error;
    }
  };

  const handleCashout = async ({ amount, receiver_email }) => {
    try {
      setProcessingCashOut(true);
      showToast('Processing payout...', 'info');

      console.log('🚀 Starting admin cashout process:', {
        email: receiver_email,
        amount: amount,
        currency: 'PHP'
      });

      // Process PayPal payout directly via PayPal Sandbox API
      let payoutResult;
      try {
        payoutResult = await processPayPalPayoutDirect(receiver_email, amount);
        console.log('✅ Payout API response:', payoutResult);
      } catch (payoutError) {
        console.error('❌ Payout API error:', payoutError);
        throw new Error(payoutError.message || 'Failed to process payout with PayPal');
      }

      if (!payoutResult || !payoutResult.success) {
        const errorMsg = payoutResult?.error || payoutResult?.message || 'Failed to process payout';
        console.error('❌ Payout failed:', errorMsg);
        throw new Error(errorMsg);
      }

      // Calculate remaining balance after cashout
      const remainingBalance = Math.max(0, calculatedBalance - amount);

      // Determine transaction status based on PayPal response
      const paypalStatus = payoutResult.status || 'PROCESSING';
      const isCompleted = paypalStatus === 'SUCCESS' || paypalStatus === 'PENDING' || paypalStatus === 'COMPLETED';
      const transactionStatus = isCompleted ? 'completed' : 'processing';

      console.log('📊 Transaction Status:', {
        paypalStatus,
        transactionStatus,
        isCompleted
      });

      // Record payout in admin/settings/payouts collection
      const adminSettingsRef = doc(db, 'admin', 'settings');
      const payoutsRef = collection(adminSettingsRef, 'payouts');
      
      const payoutRecord = await addDoc(payoutsRef, {
        amount: amount,
        currency: 'PHP',
        status: transactionStatus,
        paymentMethod: 'paypal',
        paypalEmail: receiver_email,
        payoutBatchId: payoutResult.payoutBatchId,
        transactionId: payoutResult.transactionId,
        remainingBalance: remainingBalance,
        paypalStatus: paypalStatus,
        description: `Admin cashout to PayPal - ${receiver_email}`,
        createdAt: serverTimestamp(),
        processedAt: isCompleted ? serverTimestamp() : null,
        payoutResult: payoutResult
      });

      // Update admin balance in settings
      const adminSettingsDoc = await getDoc(adminSettingsRef);
      const currentBalance = adminSettingsDoc.exists() ? (adminSettingsDoc.data().balance || 0) : 0;
      const newBalance = Math.max(0, currentBalance - amount);
      
      await updateDoc(adminSettingsRef, {
        balance: newBalance,
        updatedAt: serverTimestamp()
      });

      // Refresh balance calculation
      await calculateBalance();

      // Store withdrawal details for success modal
      setWithdrawalDetails({
        amount: amount,
        paypalEmail: receiver_email,
        payoutBatchId: payoutResult.payoutBatchId,
        status: payoutResult.status,
        transactionId: payoutResult.transactionId
      });

      // Close cashout modal
      setShowCashoutModal(false);
      
      // Show withdrawal success modal
      setShowWithdrawalSuccessModal(true);
      
      showToast(`Payout of ₱${amount.toLocaleString()} processed successfully`, 'success');
    } catch (error) {
      console.error('❌ Error processing cash out:', {
        message: error.message,
        stack: error.stack,
        error: error
      });
      
      const errorMessage = error.message || 'Failed to process cash out. Please try again.';
      showToast(errorMessage, 'error');
      throw error;
    } finally {
      setProcessingCashOut(false);
    }
  };

  const handleExportPDF = () => {
    try {
      const columns = [
        { key: 'date', label: 'Date', width: 1 },
        { key: 'bookingId', label: 'Booking ID', width: 1 },
        { key: 'guest', label: 'Guest', width: 1 },
        { key: 'host', label: 'Host', width: 1 },
        { key: 'subtotal', label: 'Subtotal', width: 1 },
        { key: 'adminFee', label: 'Admin Fee', width: 1 },
        { key: 'hostPayout', label: 'Host Payout', width: 1 },
        { key: 'status', label: 'Status', width: 1 }
      ];

      const dateRangeLabel = dateRange.startDate || dateRange.endDate ? 
        ` (${dateRange.startDate ? new Date(dateRange.startDate).toLocaleDateString() : 'Any'} to ${dateRange.endDate ? new Date(dateRange.endDate).toLocaleDateString() : 'Any'})` : 
        '';

      const rows = transactions.map(t => ({
        date: t.date ? new Date(t.date).toLocaleDateString() : 'N/A',
        bookingId: t.bookingId?.substring(0, 8) || 'N/A',
        guest: t.guestName || 'Guest',
        host: t.hostName || 'Host',
        subtotal: `₱${(t.subtotal || 0).toLocaleString()}`,
        adminFee: `₱${(t.adminFee || 0).toLocaleString()}`,
        hostPayout: `₱${(t.hostPayout || 0).toLocaleString()}`,
        status: t.status || 'N/A'
      }));

      generatePDFReport({
        type: 'service-fees',
        title: `Service Fees Report${dateRangeLabel}`,
        rows,
        columns,
        meta: {
          dateFrom: dateRange.startDate,
          dateTo: dateRange.endDate,
          generatedBy: 'Admin Dashboard',
          totalRecords: transactions.length
        }
      });

      showToast('PDF report generated successfully');
    } catch (error) {
      console.error('Error exporting transactions PDF:', error);
      showToast('Failed to generate PDF report', 'error');
    }
  };

  const handlePrint = () => {
    try {
      const dateRangeLabel = dateRange.startDate || dateRange.endDate ? 
        ` (${dateRange.startDate ? new Date(dateRange.startDate).toLocaleDateString() : 'Any'} to ${dateRange.endDate ? new Date(dateRange.endDate).toLocaleDateString() : 'Any'})` : 
        '';

      const htmlContent = `
        <div style="margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 24px; font-weight: bold;">Service Fees Report${dateRangeLabel}</h2>
          <p style="margin: 5px 0; color: #666;">Total Records: ${transactions.length}</p>
          <p style="margin: 5px 0; color: #666;">Date Range: ${dateRange.startDate ? new Date(dateRange.startDate).toLocaleDateString() : 'Any'} to ${dateRange.endDate ? new Date(dateRange.endDate).toLocaleDateString() : 'Any'}</p>
          <p style="margin: 5px 0; color: #666;">Generated: ${new Date().toLocaleString()}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Date</th>
              <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Booking ID</th>
              <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Guest</th>
              <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Host</th>
              <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Subtotal</th>
              <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Admin Fee</th>
              <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Host Payout</th>
              <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${transactions.map(t => `
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd;">${t.date ? new Date(t.date).toLocaleDateString() : 'N/A'}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${t.bookingId?.substring(0, 8) || 'N/A'}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${t.guestName || 'Guest'}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${t.hostName || 'Host'}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">₱${(t.subtotal || 0).toLocaleString()}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">₱${(t.adminFee || 0).toLocaleString()}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">₱${(t.hostPayout || 0).toLocaleString()}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${t.status || 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;

      printReport({
        title: `Service Fees Report${dateRangeLabel}`,
        htmlContent
      });
    } catch (error) {
      console.error('Error printing transactions:', error);
      showToast('Failed to print report', 'error');
    }
  };

  const clearDateRange = () => {
    setDateRange({ startDate: '', endDate: '' });
  };

  const handleDateChange = (type, value) => {
    setDateRange(prev => ({
      ...prev,
      [type]: value
    }));
  };

  const isFetching = loading || localLoading;

  return (
    <motion.div
      key="service-fees"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Service Fees Management</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Monitor transactions and manage payouts.</p>
      </div>

      {/* Balance Card */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
        <SectionHeader icon={FaWallet} title="Admin Balance" />
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 p-4 bg-emerald-50 rounded-lg">
            <span className="text-base sm:text-lg font-semibold text-gray-700">Current Balance:</span>
            <span className="text-2xl sm:text-3xl font-bold text-emerald-600">₱{calculatedBalance.toLocaleString()}</span>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Calculated from {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} 
            {transactions.length > 0 && ` (Admin fee: ${adminFeePercentage}%)`}
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCashoutModal(true)}
            className="w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold text-sm flex items-center justify-center gap-2"
          >
            <FaWallet className="text-sm" />
            <span className="hidden sm:inline">Withdraw via PayPal</span>
            <span className="sm:hidden">Withdraw</span>
          </motion.button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Date Range Filter */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-2">Date Range</label>
            <div className="flex gap-2 items-end">
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => handleDateChange('startDate', e.target.value)}
                  disabled={isFetching}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Start date"
                />
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => handleDateChange('endDate', e.target.value)}
                  disabled={isFetching}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="End date"
                />
              </div>
              {(dateRange.startDate || dateRange.endDate) && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={clearDateRange}
                  disabled={isFetching}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold text-xs sm:text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear Dates
                </motion.button>
              )}
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              disabled={isFetching}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="all">All</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          {/* Export/Print Buttons */}
          <div className="flex gap-2 items-end">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleExportPDF}
              disabled={isFetching}
              className="flex-1 px-3 sm:px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaFilePdf className="text-xs sm:text-sm" />
              <span className="hidden sm:inline">Export PDF</span>
              <span className="sm:hidden">PDF</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handlePrint}
              disabled={isFetching}
              className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaPrint className="text-xs sm:text-sm" />
              <span className="hidden sm:inline">Print</span>
              <span className="sm:hidden">Print</span>
            </motion.button>
          </div>
        </div>

        {/* Active Filters Info */}
        {(dateRange.startDate || dateRange.endDate) && (
          <div className="mt-4 p-2 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-700 flex items-center gap-2">
              {isFetching && <FaSync className="animate-spin" />}
              Showing transactions from <strong>{dateRange.startDate ? new Date(dateRange.startDate).toLocaleDateString() : 'any date'}</strong> to <strong>{dateRange.endDate ? new Date(dateRange.endDate).toLocaleDateString() : 'any date'}</strong>
            </p>
          </div>
        )}
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <SectionHeader icon={FaDollarSign} title="Transactions" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600">Date</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600">Booking ID</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600 hidden md:table-cell">Guest</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600 hidden lg:table-cell">Host</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600">Subtotal</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600">Admin Fee</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600 hidden xl:table-cell">Host Payout</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isFetching ? (
                <tr>
                  <td colSpan="8" className="px-3 sm:px-6 py-6 sm:py-8 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-emerald-600 mx-auto mb-2"></div>
                    <p className="text-xs sm:text-sm text-gray-600">Loading transactions...</p>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-3 sm:px-6 py-6 sm:py-8 text-center text-gray-500 text-xs sm:text-sm">
                    No transactions found
                    {(dateRange.startDate || dateRange.endDate || statusFilter !== 'all') && ' with current filters'}
                  </td>
                </tr>
              ) : (
                <>
                  {transactions.map((transaction) => (
                    <TransactionRow key={transaction.id} transaction={transaction} />
                  ))}
                  {/* Summary Row */}
                  <tr className="bg-emerald-50 font-semibold">
                    <td colSpan="4" className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900">
                      Total ({transactions.length} transaction{transactions.length !== 1 ? 's' : ''})
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900">
                      ₱{transactions.reduce((sum, t) => sum + (t.subtotal || 0), 0).toLocaleString()}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-emerald-700">
                      ₱{transactions.reduce((sum, t) => sum + (t.adminFee || 0), 0).toLocaleString()}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900 hidden xl:table-cell">
                      ₱{transactions.reduce((sum, t) => sum + (t.hostPayout || 0), 0).toLocaleString()}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600">
                      {transactions.filter(t => t.status === 'completed').length} completed
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CashoutModal
        isOpen={showCashoutModal}
        onClose={() => setShowCashoutModal(false)}
        adminBalance={calculatedBalance}
        onCashout={handleCashout}
        processingCashOut={processingCashOut}
      />

      {/* Withdrawal Successful Modal */}
      <AnimatePresence>
        {showWithdrawalSuccessModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowWithdrawalSuccessModal(false);
                setWithdrawalDetails(null);
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl max-w-md w-full p-4 sm:p-6 mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                  <FaCheckCircle className="text-3xl sm:text-4xl text-emerald-600" />
                </div>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 text-center mb-2">
                Withdrawal Successful
              </h2>

              <p className="text-sm sm:text-base text-gray-600 text-center mb-4 sm:mb-6">
                Your admin earnings have been transferred to your PayPal Sandbox account.
              </p>

              {withdrawalDetails && (
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 space-y-2 sm:space-y-3">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                    <span className="text-xs sm:text-sm text-gray-600">Amount:</span>
                    <span className="text-base sm:text-lg font-semibold text-gray-900">
                      ₱{withdrawalDetails.amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                    <span className="text-xs sm:text-sm text-gray-600">PayPal Email:</span>
                    <span className="text-xs sm:text-sm font-medium text-gray-900 break-all text-right sm:text-left">
                      {withdrawalDetails.paypalEmail}
                    </span>
                  </div>
                  {withdrawalDetails.payoutBatchId && (
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                      <span className="text-xs sm:text-sm text-gray-600">Batch ID:</span>
                      <span className="text-xs font-mono text-gray-600 break-all text-right sm:text-left">
                        {withdrawalDetails.payoutBatchId.substring(0, 20)}...
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                    <span className="text-xs sm:text-sm text-gray-600">Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      withdrawalDetails.status === 'SUCCESS' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {withdrawalDetails.status}
                    </span>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
                <p className="text-xs sm:text-sm text-blue-800 text-center">
                  <strong>Note:</strong> Check your PayPal Sandbox account balance to confirm the transfer.
                  Processing typically takes a few moments in PayPal Sandbox.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowWithdrawalSuccessModal(false);
                  setWithdrawalDetails(null);
                }}
                className="w-full bg-emerald-600 text-white py-2.5 sm:py-3 rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm flex items-center justify-center gap-2"
              >
                <FaCheckCircle className="text-sm" />
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ServiceFees;