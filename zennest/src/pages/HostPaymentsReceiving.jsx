// src/pages/HostPaymentsReceiving.jsx
/**
 * Host Payments & Earnings Page
 * 
 * Earnings Flow:
 * 1. Estimated Earnings: Upcoming/Confirmed bookings (projection only)
 *    - Shows what the host will earn once bookings are completed
 *    - NOT included in total earnings balance
 * 
 * 2. Total Earnings: Completed bookings minus 5% admin fee
 *    - Only bookings with status 'completed' are included
 *    - Admin fee (5%) is automatically deducted from each completed booking
 *    - Example: ₱10,000 booking → ₱500 admin fee → ₱9,500 host earnings
 * 
 * 3. Available Balance: Total Earnings minus cashed out amounts
 *    - This is the amount available for manual cashout
 *    - Updated when cashouts are processed
 * 
 * 4. Manual Cashout: Host can manually cash out available balance via PayPal Sandbox
 *    - Cashout is only triggered when host clicks "Cash Out" button
 *    - No automatic payouts
 *    - Cashout transactions are recorded in transaction history
 *    - Remaining balance is tracked after each cashout
 * 
 * Booking Status Flow:
 * - "confirmed" → Estimated Earnings (projection only)
 * - "completed" → Total Earnings (with 5% admin fee deducted)
 * 
 * Cashout Process:
 * 1. Host clicks "Cash Out" button
 * 2. System checks available balance
 * 3. PayPal Sandbox payout is processed
 * 4. Cashout record is created in Firestore
 * 5. Transaction history is updated
 * 6. Available balance is updated (total earnings minus cashed out)
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getHostBookings } from '../services/firestoreService';
import useAuth from '../hooks/useAuth';
import {
  PayPalScriptProvider
} from '@paypal/react-paypal-js';
import {
  FaPaypal,
  FaWallet,
  FaClock,
  FaCheckCircle,
  FaMoneyBillWave,
  FaArrowRight,
  FaHistory,
  FaChartLine,
  FaExclamationCircle,
  FaTimes,
  FaSpinner,
  FaGift
} from 'react-icons/fa';
import { collection, addDoc, query, where, orderBy, getDocs, updateDoc, doc, serverTimestamp, getDoc, limit } from 'firebase/firestore';
import { db } from '../config/firebase';


const HostPaymentsReceiving = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [showCashOutModal, setShowCashOutModal] = useState(false);
  const [earnings, setEarnings] = useState({
    estimatedEarnings: 0, // Upcoming/confirmed bookings (projection only)
    totalEarnings: 0, // Completed bookings minus admin fee
    adminFeesTotal: 0, // Total admin fees deducted (5% of completed bookings)
    availableBalance: 0, // Available for cashout (totalEarnings minus totalCashedOut)
    totalCashedOut: 0, // Total amount cashed out
    thisMonthEarnings: 0, // This month's completed earnings
    thisMonthEstimated: 0 // This month's estimated earnings
  });
  const [cashOutHistory, setCashOutHistory] = useState([]);
  const [cashOutAmount, setCashOutAmount] = useState('');
  const [paypalEmail, setPaypalEmail] = useState(''); // PayPal email input
  const [processingCashOut, setProcessingCashOut] = useState(false);
  const [cashOutError, setCashOutError] = useState('');
  const [cashOutSuccess, setCashOutSuccess] = useState('');
  const [showWithdrawalSuccessModal, setShowWithdrawalSuccessModal] = useState(false);
  const [withdrawalDetails, setWithdrawalDetails] = useState(null); // Store withdrawal success details
  const [showClaimCreditModal, setShowClaimCreditModal] = useState(false);
  const [creditCode, setCreditCode] = useState('');
  const [claimingCredit, setClaimingCredit] = useState(false);
  const [creditError, setCreditError] = useState('');
  const [creditSuccess, setCreditSuccess] = useState('');
  const [transactionHistory, setTransactionHistory] = useState([]);

  useEffect(() => {
    if (user) {
      fetchEarnings();
      fetchCashOutHistory();
      fetchTransactionHistory();
      setLoading(false);
    }
  }, [user]);

  // Debug: Log environment variable (for troubleshooting)
  useEffect(() => {
    // The Client ID is provided by the wrapper component via PayPalScriptProvider
    // So we don't need to check it here - it's already configured
    console.log('🔍 [HostPaymentsReceiving] Earnings available:', earnings.availableBalance);
    console.log('🔍 [HostPaymentsReceiving] Estimated earnings:', earnings.estimatedEarnings);
    console.log('🔍 [HostPaymentsReceiving] Total earnings:', earnings.totalEarnings);
    console.log('🔍 [HostPaymentsReceiving] Admin fees:', earnings.adminFeesTotal);
  }, [earnings]);


  const fetchEarnings = async () => {
    try {
      if (!user || !user.uid) {
        console.warn('No user available for fetching earnings');
        return;
      }
      const bookingsResult = await getHostBookings(user.uid);
      const bookings = bookingsResult.data || [];

      // Admin fee percentage (5%)
      const ADMIN_FEE_PERCENTAGE = 0.05; // 5%

      // Helper function to calculate host earnings after admin fee
      const calculateHostEarnings = (bookingTotal) => {
        const adminFee = bookingTotal * ADMIN_FEE_PERCENTAGE;
        const hostEarnings = bookingTotal - adminFee;
        return { adminFee, hostEarnings };
      };

      // Helper function to get booking date
      const getBookingDate = (booking) => {
        if (!booking.checkIn) return null;
        if (booking.checkIn.toDate && typeof booking.checkIn.toDate === 'function') {
          return booking.checkIn.toDate();
        }
        if (booking.checkIn instanceof Date) {
          return booking.checkIn;
        }
        return new Date(booking.checkIn);
      };

      // Helper function to get checkout date
      const getCheckOutDate = (booking) => {
        if (!booking.checkOut) return null;
        if (booking.checkOut.toDate && typeof booking.checkOut.toDate === 'function') {
          return booking.checkOut.toDate();
        }
        if (booking.checkOut instanceof Date) {
          return booking.checkOut;
        }
        return new Date(booking.checkOut);
      };

      // Helper function to check if booking is completed
      // A booking is completed if:
      // 1. Status is explicitly 'completed', OR
      // 2. Status is 'confirmed' AND checkout date has passed
      const isBookingCompleted = (booking) => {
        // Explicitly completed
        if (booking.status === 'completed') {
          return true;
        }
        
        // Implicitly completed: confirmed booking where checkout date has passed
        if (booking.status === 'confirmed') {
          const checkOutDate = getCheckOutDate(booking);
          if (checkOutDate) {
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            checkOutDate.setHours(0, 0, 0, 0);
            // Booking is completed if checkout date has passed
            return now > checkOutDate;
          }
          
          // For bookings without checkout date (services/experiences), consider confirmed as completed
          // Only if they don't have dates
          if (!booking.checkIn && !booking.checkOut) {
            return true;
          }
        }
        
        return false;
      };

      // Helper function to check if booking is still upcoming (not completed yet)
      // A booking is upcoming if:
      // 1. Status is 'confirmed' AND checkout date hasn't passed yet
      const isBookingUpcoming = (booking) => {
        if (booking.status !== 'confirmed') {
          return false;
        }
        
        // If booking has checkout date, check if it's in the future
        const checkOutDate = getCheckOutDate(booking);
        if (checkOutDate) {
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          checkOutDate.setHours(0, 0, 0, 0);
          // Booking is upcoming if checkout date hasn't passed yet
          return now <= checkOutDate;
        }
        
        // For bookings without checkout date but with check-in date
        // Check if check-in date is in the future
        const checkInDate = getBookingDate(booking);
        if (checkInDate) {
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          checkInDate.setHours(0, 0, 0, 0);
          return now < checkInDate;
        }
        
        // If no dates at all and status is confirmed, consider it upcoming
        return true;
      };

      // Calculate Estimated Earnings (Upcoming/Confirmed bookings - projection only)
      // These are bookings that are confirmed but not yet completed (checkout date hasn't passed)
      // This is just a projection and should NOT be included in total earnings
      const estimatedEarnings = bookings
        .filter(b => isBookingUpcoming(b))
        .reduce((sum, b) => {
          const bookingTotal = b.total || b.totalAmount || 0;
          return sum + bookingTotal;
        }, 0);

      // Calculate Total Earnings (Completed bookings minus admin fee)
      // These are the actual earnings from completed bookings
      // Includes:
      // 1. Bookings with status 'completed'
      // 2. Bookings with status 'confirmed' where checkout date has passed
      // Admin fee (5%) is automatically deducted
      let totalEarnings = 0;
      let adminFeesTotal = 0;

      bookings
        .filter(b => isBookingCompleted(b))
        .forEach(b => {
          const bookingTotal = b.total || b.totalAmount || 0;
          const { adminFee, hostEarnings } = calculateHostEarnings(bookingTotal);
          totalEarnings += hostEarnings;
          adminFeesTotal += adminFee;
        });

      // Calculate total cashed out amount
      // This is the sum of all successful cashouts
      let totalCashedOut = 0;
      try {
        // Fetch all cashouts for this host
        const cashOutQuery = query(
          collection(db, 'cashOuts'),
          where('hostId', '==', user.uid)
        );
        const cashOutSnapshot = await getDocs(cashOutQuery);
        cashOutSnapshot.forEach((doc) => {
          const cashOut = doc.data();
          // Include completed and processing cashouts (exclude failed)
          if (cashOut.status === 'completed' || cashOut.status === 'processing') {
            totalCashedOut += cashOut.amount || 0;
          }
        });
      } catch (error) {
        console.error('Error fetching cashout history for earnings calculation:', error);
        // If query fails (e.g., missing index), try fetching all and filtering client-side
        try {
          const cashOutQuery = query(
            collection(db, 'cashOuts'),
            where('hostId', '==', user.uid)
          );
          const cashOutSnapshot = await getDocs(cashOutQuery);
          cashOutSnapshot.forEach((doc) => {
            const cashOut = doc.data();
            if (cashOut.status === 'completed' || cashOut.status === 'processing') {
              totalCashedOut += cashOut.amount || 0;
            }
          });
        } catch (fallbackError) {
          console.error('Error in fallback cashout query:', fallbackError);
        }
      }

      // Calculate total credits claimed (E-wallet credits)
      let totalCredits = 0;
      try {
        const creditsQuery = query(
          collection(db, 'transactions'),
          where('userId', '==', user.uid),
          where('type', '==', 'credit'),
          where('status', '==', 'completed')
        );
        const creditsSnapshot = await getDocs(creditsQuery);
        creditsSnapshot.forEach((doc) => {
          const credit = doc.data();
          totalCredits += credit.amount || 0;
        });
      } catch (error) {
        console.error('Error fetching credits:', error);
      }

      // Calculate available balance (total earnings + credits minus cashed out amounts)
      const availableBalance = Math.max(0, totalEarnings + totalCredits - totalCashedOut);

      // Calculate this month's earnings (completed)
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      firstDayOfMonth.setHours(0, 0, 0, 0);
      
      let thisMonthEarnings = 0;
      bookings
        .filter(b => {
          // Only include completed bookings
          if (!isBookingCompleted(b)) return false;
          
          // Use checkout date if available, otherwise use check-in date
          const bookingDate = getCheckOutDate(b) || getBookingDate(b);
          if (!bookingDate) return false;
          
          // Normalize date for comparison
          const normalizedDate = new Date(bookingDate);
          normalizedDate.setHours(0, 0, 0, 0);
          
          // Check if booking was completed this month
          return normalizedDate >= firstDayOfMonth;
        })
        .forEach(b => {
          const bookingTotal = b.total || b.totalAmount || 0;
          const { hostEarnings } = calculateHostEarnings(bookingTotal);
          thisMonthEarnings += hostEarnings;
        });

      // Calculate this month's estimated earnings (confirmed but not completed yet)
      let thisMonthEstimated = 0;
      bookings
        .filter(b => {
          // Only include upcoming bookings
          if (!isBookingUpcoming(b)) return false;
          
          // Use check-in date for estimated earnings
          const bookingDate = getBookingDate(b);
          if (!bookingDate) return false;
          
          // Normalize date for comparison
          const normalizedDate = new Date(bookingDate);
          normalizedDate.setHours(0, 0, 0, 0);
          
          // Check if booking is this month
          return normalizedDate >= firstDayOfMonth;
        })
        .forEach(b => {
          const bookingTotal = b.total || b.totalAmount || 0;
          thisMonthEstimated += bookingTotal;
        });

      // Debug logging for earnings calculation
      console.log('💰 Earnings Calculation:', {
        totalBookings: bookings.length,
        completedBookings: bookings.filter(b => isBookingCompleted(b)).length,
        upcomingBookings: bookings.filter(b => isBookingUpcoming(b)).length,
        totalEarnings,
        estimatedEarnings,
        adminFeesTotal,
        totalCashedOut,
        availableBalance
      });
      
      // Log individual bookings for debugging
      bookings.forEach((booking, idx) => {
        console.log(`Booking ${idx + 1}:`, {
          id: booking.id,
          status: booking.status,
          total: booking.total || booking.totalAmount || 0,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          isCompleted: isBookingCompleted(booking),
          isUpcoming: isBookingUpcoming(booking)
        });
      });

      setEarnings({
        estimatedEarnings,
        totalEarnings,
        adminFeesTotal,
        availableBalance, // Available for cashout (total earnings minus cashed out)
        totalCashedOut, // Total amount cashed out
        thisMonthEarnings,
        thisMonthEstimated
      });
    } catch (error) {
      console.error('Error fetching earnings:', error);
    }
  };

  const fetchCashOutHistory = async () => {
    try {
      if (!user || !user.uid) {
        console.warn('No user available for fetching cashout history');
        setCashOutHistory([]);
        return;
      }
      const cashOutQuery = query(
        collection(db, 'cashOuts'),
        where('hostId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(cashOutQuery);
      const history = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCashOutHistory(history);
    } catch (error) {
      console.error('Error fetching cash out history:', error);
      
      // If index error, try fetching without orderBy as fallback
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        console.warn('Index not found, fetching without orderBy as fallback');
        try {
          // Fallback: fetch without orderBy and sort client-side
          const fallbackQuery = query(
            collection(db, 'cashOuts'),
            where('hostId', '==', user.uid)
          );
          const fallbackSnapshot = await getDocs(fallbackQuery);
          const history = fallbackSnapshot.docs
            .map(doc => ({
              id: doc.id,
              ...doc.data()
            }))
            .sort((a, b) => {
              // Sort by createdAt descending (client-side)
              const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
              const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
              return bTime - aTime;
            });
          setCashOutHistory(history);
        } catch (fallbackError) {
          console.error('Error in fallback cashout query:', fallbackError);
          // Set empty array if both queries fail
          setCashOutHistory([]);
        }
      } else {
        // For other errors, just set empty array
        setCashOutHistory([]);
      }
    }
  };

  const fetchTransactionHistory = async () => {
    try {
      if (!user || !user.uid) {
        console.warn('No user available for fetching transaction history');
        setTransactionHistory([]);
        return;
      }

      const transactions = [];

      // Get all bookings for this host
      const bookingsResult = await getHostBookings(user.uid);
      const bookings = bookingsResult.data || [];

      // Admin fee percentage (5%)
      const ADMIN_FEE_PERCENTAGE = 0.05;

      // Helper function to calculate host earnings after admin fee
      const calculateHostEarnings = (bookingTotal) => {
        const adminFee = bookingTotal * ADMIN_FEE_PERCENTAGE;
        const hostEarnings = bookingTotal - adminFee;
        return { adminFee, hostEarnings };
      };

      // Helper function to get booking date
      const getBookingDate = (booking) => {
        if (!booking.checkIn) return null;
        if (booking.checkIn.toDate && typeof booking.checkIn.toDate === 'function') {
          return booking.checkIn.toDate();
        }
        if (booking.checkIn instanceof Date) {
          return booking.checkIn;
        }
        return new Date(booking.checkIn);
      };

      // Helper function to get checkout date
      const getCheckOutDate = (booking) => {
        if (!booking.checkOut) return null;
        if (booking.checkOut.toDate && typeof booking.checkOut.toDate === 'function') {
          return booking.checkOut.toDate();
        }
        if (booking.checkOut instanceof Date) {
          return booking.checkOut;
        }
        return new Date(booking.checkOut);
      };

      // Helper function to check if booking is completed
      const isBookingCompleted = (booking) => {
        if (booking.status === 'completed') {
          return true;
        }
        
        if (booking.status === 'confirmed') {
          const checkOutDate = getCheckOutDate(booking);
          if (checkOutDate) {
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            checkOutDate.setHours(0, 0, 0, 0);
            return now > checkOutDate;
          }
          
          if (!booking.checkIn && !booking.checkOut) {
            return true;
          }
        }
        
        return false;
      };

      // Filter completed bookings and create transaction history
      const bookingTransactions = bookings
        .filter(b => isBookingCompleted(b))
        .map(booking => {
          const bookingTotal = booking.total || booking.totalAmount || 0;
          const { adminFee, hostEarnings } = calculateHostEarnings(bookingTotal);
          const completionDate = getCheckOutDate(booking) || getBookingDate(booking) || booking.updatedAt || booking.createdAt;
          
          return {
            id: booking.id || `booking-${Date.now()}`,
            type: 'booking',
            bookingId: booking.id,
            listingTitle: booking.listingTitle || 'Unknown Listing',
            guestId: booking.guestId,
            checkIn: getBookingDate(booking),
            checkOut: getCheckOutDate(booking),
            bookingTotal: bookingTotal,
            adminFee: adminFee,
            earnings: hostEarnings,
            status: 'completed',
            completedAt: completionDate,
            createdAt: booking.createdAt || booking.updatedAt
          };
        });

      transactions.push(...bookingTransactions);

      // Fetch credit transactions (reward claims)
      try {
        // Try with orderBy first (requires composite index)
        let creditSnapshot;
      try {
        const creditTransactionsQuery = query(
          collection(db, 'transactions'),
          where('userId', '==', user.uid),
          where('type', '==', 'credit'),
          where('status', '==', 'completed'),
          orderBy('createdAt', 'desc')
        );
          creditSnapshot = await getDocs(creditTransactionsQuery);
        } catch (orderByError) {
          // If index error, fetch without orderBy and sort in memory
          if (orderByError.code === 'failed-precondition' || orderByError.message?.includes('index')) {
            console.warn('Firestore index not found for credit transactions. Fetching without orderBy as fallback');
            const creditTransactionsQuery = query(
              collection(db, 'transactions'),
              where('userId', '==', user.uid),
              where('type', '==', 'credit'),
              where('status', '==', 'completed')
            );
            creditSnapshot = await getDocs(creditTransactionsQuery);
          } else {
            throw orderByError;
          }
        }
        
        // Get reward names from valid codes collection
        const validCodesRef = collection(db, 'valid codes');
        const codesQuery = query(
          validCodesRef,
          where('hostId', '==', user.uid),
          where('redeemed', '==', true)
        );
        const codesSnapshot = await getDocs(codesQuery);
        
        // Create a map of code to reward name
        const codeToRewardMap = new Map();
        codesSnapshot.forEach((doc) => {
          const codeData = doc.data();
          if (codeData.code && codeData.reward) {
            codeToRewardMap.set(codeData.code, codeData.reward);
          }
        });

        const creditTransactions = [];
        creditSnapshot.forEach((doc) => {
          const creditData = doc.data();
          const rewardName = creditData.code ? codeToRewardMap.get(creditData.code) : null;
          
          creditTransactions.push({
            id: doc.id,
            type: 'credit',
            amount: creditData.amount || 0,
            rewardName: rewardName || creditData.description || 'E-wallet Credit',
            code: creditData.code || null,
            createdAt: creditData.createdAt,
            completedAt: creditData.createdAt // Use createdAt as completion date
          });
        });

        // Sort by createdAt descending if we fetched without orderBy
        creditTransactions.sort((a, b) => {
          const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 
                       (a.createdAt instanceof Date ? a.createdAt.getTime() : 0);
          const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 
                       (b.createdAt instanceof Date ? b.createdAt.getTime() : 0);
          return bTime - aTime; // Descending order
        });

        transactions.push(...creditTransactions);
      } catch (creditError) {
        console.error('Error fetching credit transactions:', creditError);
        // Error already handled in try-catch above, continue with other transactions
      }

      // Fetch wallet transactions (payouts/withdrawals)
          try {
        const walletTransactionsQuery = query(
          collection(db, 'walletTransactions'),
              where('userId', '==', user.uid),
          where('type', '==', 'payout')
            );
        const walletSnapshot = await getDocs(walletTransactionsQuery);
            
        walletSnapshot.forEach((doc) => {
          const walletData = doc.data();
              transactions.push({
                id: doc.id,
            type: 'payout',
            amount: walletData.amount || 0,
            currency: walletData.currency || 'PHP',
            status: walletData.status || 'processing',
            paymentMethod: walletData.paymentMethod || 'paypal',
            paypalEmail: walletData.paypalEmail || '',
            payoutBatchId: walletData.payoutBatchId || null,
            description: walletData.description || 'Cash out to PayPal',
            createdAt: walletData.createdAt,
            completedAt: walletData.status === 'completed' ? walletData.updatedAt : walletData.createdAt
              });
            });
      } catch (walletError) {
        console.error('Error fetching wallet transactions:', walletError);
        // Continue even if wallet transactions fail
      }

      // Sort all transactions by date descending (most recent first)
      transactions.sort((a, b) => {
        const aTime = a.completedAt?.toDate ? a.completedAt.toDate().getTime() : 
                     (a.completedAt instanceof Date ? a.completedAt.getTime() : 
                     (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0));
        const bTime = b.completedAt?.toDate ? b.completedAt.toDate().getTime() : 
                     (b.completedAt instanceof Date ? b.completedAt.getTime() : 
                     (b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0));
        return bTime - aTime;
      });

      setTransactionHistory(transactions);
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      setTransactionHistory([]);
    }
  };

  // Get PayPal OAuth access token using client credentials
  const getPayPalAccessToken = async () => {
    try {
      // Access env vars directly (Vite exposes them at build time)
      // Use the same method as App.jsx which successfully reads them
      const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || '';
      // Support both VITE_PAYPAL_CLIENT_SECRET and VITE_PAYPAL_SECRET_KEY for compatibility
      const clientSecret = import.meta.env.VITE_PAYPAL_CLIENT_SECRET || import.meta.env.VITE_PAYPAL_SECRET_KEY || '';

      // Debug: Log what we found
      console.log('🔍 PayPal Credentials Check:', {
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
        clientIdLength: clientId.length,
        clientSecretLength: clientSecret.length,
        clientIdPreview: clientId ? clientId.substring(0, 20) + '...' : 'NOT FOUND',
        secretPreview: clientSecret ? clientSecret.substring(0, 10) + '...' : 'NOT FOUND',
        allEnvKeys: Object.keys(import.meta.env || {}).filter(k => k.includes('PAYPAL'))
      });

      if (!clientId || !clientSecret) {
        throw new Error('PayPal credentials not configured. Please set VITE_PAYPAL_CLIENT_ID and VITE_PAYPAL_SECRET_KEY (or VITE_PAYPAL_CLIENT_SECRET) in your .env file and restart the dev server.');
      }

      // PayPal Sandbox OAuth endpoint
      const tokenUrl = 'https://api-m.sandbox.paypal.com/v1/oauth2/token';
      
      // Create Basic Auth header
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

      // PayPal Sandbox Payouts API endpoint
      const payoutUrl = 'https://api-m.sandbox.paypal.com/v1/payments/payouts';
      
      // Generate unique batch ID
      const senderBatchId = `PAYOUT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const payoutData = {
        sender_batch_header: {
          sender_batch_id: senderBatchId,
          email_subject: 'You have a payout from ZenNest',
          email_message: `You have received a payout of ₱${amount.toFixed(2)} from ZenNest.`
        },
        items: [
          {
            recipient_type: 'EMAIL',
            amount: {
              value: amount.toFixed(2),
              currency: 'PHP'
            },
            receiver: paypalEmail,
            note: 'Payout from ZenNest',
            sender_item_id: `PAYOUT-ITEM-${Date.now()}`
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

  // Process cashout with PayPal email and amount
  const processCashOut = async (email, amount) => {
    try {
      setProcessingCashOut(true);
      setCashOutError('');
      setCashOutSuccess('');

      console.log('🚀 Starting cashout process:', {
        email: email,
        amount: amount,
        currency: 'PHP'
      });

      // Process PayPal payout directly via PayPal Sandbox API
      let payoutResult;
      try {
        payoutResult = await processPayPalPayoutDirect(email, amount);
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
      const remainingBalance = Math.max(0, earnings.availableBalance - amount);

      // Determine transaction status based on PayPal response
      // PENDING and SUCCESS both mean the payout was successfully initiated and will be processed
      const paypalStatus = payoutResult.status || 'PROCESSING';
      const isCompleted = paypalStatus === 'SUCCESS' || paypalStatus === 'PENDING' || paypalStatus === 'COMPLETED';
      const transactionStatus = isCompleted ? 'completed' : 'processing';

      console.log('📊 Transaction Status:', {
        paypalStatus,
        transactionStatus,
        isCompleted
      });

      // Record transaction in walletTransactions collection
      const walletTransactionRef = await addDoc(collection(db, 'walletTransactions'), {
        userId: user.uid,
        type: 'payout',
        amount: amount,
        currency: 'PHP',
        status: transactionStatus,
        paymentMethod: 'paypal',
        paypalEmail: email,
        payoutBatchId: payoutResult.payoutBatchId,
        transactionId: payoutResult.transactionId,
        remainingBalance: remainingBalance,
        description: `Cash out to PayPal - ${email}`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Also create a cash out record in Firestore for backward compatibility
      const cashOutRef = await addDoc(collection(db, 'cashOuts'), {
        hostId: user.uid,
        amount: amount,
        currency: 'PHP',
        paymentMethod: {
          type: 'paypal',
          accountName: email.split('@')[0],
          paypalEmail: email,
          paypalAccountId: '',
          paypalName: ''
        },
        payoutBatchId: payoutResult.payoutBatchId,
        status: transactionStatus,
        paypalStatus: paypalStatus,
        remainingBalance: remainingBalance,
        createdAt: serverTimestamp(),
        processedAt: isCompleted ? serverTimestamp() : null,
        payoutResult: payoutResult,
        walletTransactionId: walletTransactionRef.id
      });

      // Also create a transaction record for history tracking (backward compatibility)
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        type: 'cashout',
        amount: amount,
        currency: 'PHP',
        status: transactionStatus,
        paymentMethod: 'paypal',
        paypalEmail: email,
        payoutBatchId: payoutResult.payoutBatchId,
        remainingBalance: remainingBalance,
        description: `Cash out to PayPal - ${email}`,
        cashOutId: cashOutRef.id,
        walletTransactionId: walletTransactionRef.id,
        createdAt: serverTimestamp()
      });

      // Refresh earnings after successful cashout
      await fetchEarnings();
      await fetchCashOutHistory();
      await fetchTransactionHistory();

      // Store withdrawal details for success modal
      setWithdrawalDetails({
        amount: amount,
        paypalEmail: email,
        payoutBatchId: payoutResult.payoutBatchId,
        status: payoutResult.status,
        transactionId: payoutResult.transactionId
      });

      // Close cashout modal
      setShowCashOutModal(false);
      
      // Show withdrawal success modal
      setShowWithdrawalSuccessModal(true);
      
      // Clear form data
      setCashOutAmount('');
      setPaypalEmail('');
      setCashOutSuccess('');
    } catch (error) {
      console.error('❌ Error processing cash out:', {
        message: error.message,
        stack: error.stack,
        error: error
      });
      
      const errorMessage = error.message || 'Failed to process cash out. Please try again.';
      setCashOutError(errorMessage);
      
      // Keep error visible longer for debugging
      setTimeout(() => setCashOutError(''), 10000);
    } finally {
      setProcessingCashOut(false);
    }
  };

  const handleCashOut = async () => {
    // Validate PayPal email
    if (!paypalEmail || !paypalEmail.trim()) {
      setCashOutError('Please enter your PayPal email address');
      setTimeout(() => setCashOutError(''), 5000);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(paypalEmail.trim())) {
      setCashOutError('Please enter a valid email address');
      setTimeout(() => setCashOutError(''), 5000);
      return;
    }

    // Validate amount
    if (!cashOutAmount || parseFloat(cashOutAmount) <= 0) {
      setCashOutError('Please enter a valid amount');
      setTimeout(() => setCashOutError(''), 5000);
      return;
    }

    const amount = parseFloat(cashOutAmount);
    if (amount > earnings.availableBalance) {
      setCashOutError('Insufficient available balance');
      setTimeout(() => setCashOutError(''), 5000);
      return;
    }
    
    // Validate minimum amount
    if (amount < 100) {
      setCashOutError('Minimum cash out amount is ₱100');
      setTimeout(() => setCashOutError(''), 5000);
      return;
    }

    // Process cashout directly with email and amount
    await processCashOut(paypalEmail.trim(), amount);
  };

  const getMethodIcon = (type) => {
    // Only PayPal is supported now, but keep function flexible for historical records
    if (type === 'paypal') {
      return <FaPaypal className="text-2xl text-blue-600" />;
    }
    // Fallback for any other payment method types (e.g., bank accounts from old records)
    return <FaPaypal className="text-2xl text-blue-600" />;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'processing':
        return 'bg-blue-100 text-blue-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const handleClaimCredit = async () => {
    // Validate code input
    if (!creditCode || !creditCode.trim()) {
      setCreditError('Please enter a valid code');
      setTimeout(() => setCreditError(''), 5000);
      return;
    }

    const code = creditCode.trim().toUpperCase();

    try {
      setClaimingCredit(true);
      setCreditError('');
      setCreditSuccess('');

      // Query the "valid codes" collection for the code
      const validCodesRef = collection(db, 'valid codes');
      const codeQuery = query(
        validCodesRef,
        where('code', '==', code),
        limit(1)
      );
      const codeSnapshot = await getDocs(codeQuery);

      if (codeSnapshot.empty) {
        setCreditError('Invalid code. Please check and try again.');
        setTimeout(() => setCreditError(''), 5000);
        return;
      }

      const codeDoc = codeSnapshot.docs[0];
      const codeData = codeDoc.data();

      // Check if code is already redeemed
      if (codeData.redeemed) {
        setCreditError('This code has already been redeemed.');
        setTimeout(() => setCreditError(''), 5000);
        return;
      }

      // Check if code status is active
      if (codeData.status !== 'active') {
        setCreditError('This code is no longer valid.');
        setTimeout(() => setCreditError(''), 5000);
        return;
      }

      // Get credit value (default to 200 if not set)
      const creditValue = codeData.creditValue || 200;

      // Update the code document to mark it as redeemed
      await updateDoc(doc(db, 'valid codes', codeDoc.id), {
        redeemed: true,
        redeemedAt: serverTimestamp(),
        redeemedBy: user.uid,
        status: 'redeemed'
      });

      // Add credit to host's earnings by creating a special transaction
      // We'll add it directly to available balance by creating a credit transaction
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        type: 'credit',
        amount: creditValue,
        currency: 'PHP',
        status: 'completed',
        paymentMethod: 'e-wallet',
        description: `E-wallet credit claimed - Code: ${code}`,
        code: code,
        createdAt: serverTimestamp()
      });

      // Refresh earnings to update available balance
      await fetchEarnings();
      await fetchTransactionHistory();

      // Show success message
      setCreditSuccess(`Successfully claimed ₱${creditValue.toLocaleString()} credit!`);
      
      // Clear the code input
      setCreditCode('');

      // Close modal after 2 seconds
      setTimeout(() => {
        setShowClaimCreditModal(false);
        setCreditSuccess('');
      }, 2000);
    } catch (error) {
      console.error('Error claiming credit:', error);
      setCreditError('Failed to claim credit. Please try again.');
      setTimeout(() => setCreditError(''), 5000);
    } finally {
      setClaimingCredit(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <FaWallet className="text-emerald-600" />
          Payments & Earnings
        </h1>
        <p className="text-gray-600">Manage your earnings and cash out via PayPal</p>
      </div>

      {/* Earnings Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg p-6 text-white"
        >
          <div className="flex items-center justify-between mb-3">
            <FaWallet className="text-3xl opacity-80" />
            <FaCheckCircle className="text-xl opacity-60" />
          </div>
          <p className="text-emerald-100 text-sm font-medium mb-1">Available Balance</p>
          <p className="text-3xl font-bold mb-2">₱{earnings.availableBalance.toLocaleString()}</p>
          <p className="text-xs text-emerald-200 mb-1">Available for cashout</p>
          {earnings.totalCashedOut > 0 && (
            <p className="text-xs text-emerald-300 mb-2">₱{earnings.totalCashedOut.toLocaleString()} cashed out</p>
          )}
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setShowCashOutModal(true)}
              disabled={earnings.availableBalance === 0}
              className="flex-1 bg-white text-emerald-600 py-2 px-4 rounded-lg font-semibold hover:bg-emerald-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <FaMoneyBillWave />
              Cash Out
            </button>
            <button
              onClick={() => setShowClaimCreditModal(true)}
              className="flex-1 bg-white text-blue-600 py-2 px-4 rounded-lg font-semibold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
            >
              <FaGift />
              Claim Credit
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between mb-3">
            <FaClock className="text-3xl text-blue-500" />
          </div>
          <p className="text-gray-600 text-sm font-medium mb-1">Estimated Earnings</p>
          <p className="text-3xl font-bold text-gray-900 mb-2">₱{earnings.estimatedEarnings.toLocaleString()}</p>
          <p className="text-xs text-gray-500">From upcoming/confirmed bookings</p>
          <p className="text-xs text-blue-600 mt-1 font-medium">Projection only</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between mb-3">
            <FaChartLine className="text-3xl text-purple-500" />
          </div>
          <p className="text-gray-600 text-sm font-medium mb-1">This Month</p>
          <p className="text-3xl font-bold text-gray-900 mb-2">₱{earnings.thisMonthEarnings.toLocaleString()}</p>
          <p className="text-xs text-gray-500">Completed earnings</p>
          {earnings.thisMonthEstimated > 0 && (
            <p className="text-xs text-blue-600 mt-1">+₱{earnings.thisMonthEstimated.toLocaleString()} estimated</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between mb-3">
            <FaTimes className="text-3xl text-red-500" />
          </div>
          <p className="text-gray-600 text-sm font-medium mb-1">Admin Fees</p>
          <p className="text-3xl font-bold text-gray-900 mb-2">₱{earnings.adminFeesTotal.toLocaleString()}</p>
          <p className="text-xs text-gray-500">5% fee on completed bookings</p>
        </motion.div>
      </div>

      {/* Transaction History */}
      {transactionHistory.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <FaHistory className="text-emerald-600" />
              Transaction History
            </h2>
            <p className="text-sm text-gray-500">Completed bookings, reward claims, and earnings</p>
          </div>
          <div className="divide-y divide-gray-200">
            {transactionHistory.slice(0, 10).map((transaction, index) => {
              const completionDate = transaction.completedAt?.toDate 
                ? transaction.completedAt.toDate() 
                : (transaction.completedAt instanceof Date 
                  ? transaction.completedAt 
                  : (transaction.createdAt?.toDate 
                    ? transaction.createdAt.toDate() 
                    : new Date()));
              
              // Handle booking transactions
              if (transaction.type === 'booking') {
                const checkInDate = transaction.checkIn?.toDate 
                  ? transaction.checkIn.toDate() 
                  : (transaction.checkIn instanceof Date 
                    ? transaction.checkIn 
                    : null);
                
                const checkOutDate = transaction.checkOut?.toDate 
                  ? transaction.checkOut.toDate() 
                  : (transaction.checkOut instanceof Date 
                    ? transaction.checkOut 
                    : null);

                return (
                  <motion.div
                    key={transaction.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="p-3 bg-emerald-100 rounded-lg">
                        <FaCheckCircle className="text-2xl text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{transaction.listingTitle}</p>
                        <p className="text-sm text-gray-600">
                          Booking Completed
                          {checkInDate && checkOutDate && (
                            <span className="ml-2">
                              • {checkInDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {checkOutDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          )}
                        </p>
                        <div className="flex items-center gap-4 mt-1">
                          <p className="text-xs text-gray-500">
                            Completed: {completionDate.toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                          <p className="text-xs text-gray-500">
                            Booking Total: ₱{transaction.bookingTotal.toLocaleString()}
                          </p>
                          <p className="text-xs text-red-500">
                            Admin Fee (5%): -₱{transaction.adminFee.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-2xl font-bold text-emerald-600">
                        +₱{transaction.earnings.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Earnings</p>
                    </div>
                  </motion.div>
                );
              }

              // Handle credit transactions (reward claims)
              if (transaction.type === 'credit') {
                return (
                  <motion.div
                    key={transaction.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <FaGift className="text-2xl text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{transaction.rewardName}</p>
                        <p className="text-sm text-gray-600">
                          Reward Credit Claimed
                          {transaction.code && (
                            <span className="ml-2">• Code: {transaction.code}</span>
                          )}
                        </p>
                        <div className="flex items-center gap-4 mt-1">
                          <p className="text-xs text-gray-500">
                            Claimed: {completionDate.toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                          <p className="text-xs text-blue-600 font-medium">
                            Added to wallet
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-2xl font-bold text-blue-600">
                        +₱{transaction.amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Credit</p>
                    </div>
                  </motion.div>
                );
              }

              return null;
            })}
          </div>
          {transactionHistory.length > 10 && (
            <div className="p-4 bg-gray-50 text-center">
              <p className="text-sm text-gray-600">
                Showing 10 of {transactionHistory.length} transactions
              </p>
            </div>
          )}
        </div>
      )}

      {/* Cash Out History */}
      {cashOutHistory.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <FaHistory className="text-emerald-600" />
              Cash Out History
            </h2>
          </div>
          <div className="divide-y divide-gray-200">
            {cashOutHistory.slice(0, 5).map((cashOut, index) => (
              <motion.div
                key={cashOut.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-100 rounded-lg">
                    {getMethodIcon(cashOut.paymentMethod.type)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">₱{cashOut.amount.toLocaleString()}</p>
                    <p className="text-sm text-gray-600 capitalize">
                      {cashOut.paymentMethod.type === 'bank' 
                        ? `${cashOut.paymentMethod.bankName || 'Bank'} ${cashOut.paymentMethod.accountNumber || ''}`
                        : cashOut.paymentMethod.paypalEmail || cashOut.paymentMethod.type
                      }
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {cashOut.createdAt?.toDate ? cashOut.createdAt.toDate().toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'N/A'}
                    </p>
                    {cashOut.remainingBalance !== undefined && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Remaining: ₱{cashOut.remainingBalance.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${getStatusColor(cashOut.status || cashOut.paypalStatus || 'completed')}`}>
                    {cashOut.status || cashOut.paypalStatus || 'processing'}
                  </span>
                  {cashOut.paypalStatus && cashOut.paypalStatus !== cashOut.status && (
                    <p className="text-xs text-gray-500 mt-1">
                      PayPal: {cashOut.paypalStatus}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}


      {/* Cash Out Modal */}
      <AnimatePresence>
        {showCashOutModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget && !processingCashOut) {
                setShowCashOutModal(false);
                setCashOutAmount('');
                setPaypalEmail('');
                setCashOutError('');
                setCashOutSuccess('');
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <FaMoneyBillWave className="text-emerald-600" />
                  Cash Out to PayPal
                </h2>
                {!processingCashOut && (
                  <button
                    onClick={() => {
                      setShowCashOutModal(false);
                      setCashOutAmount('');
                      setPaypalEmail('');
                      setCashOutError('');
                      setCashOutSuccess('');
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <FaTimes className="text-xl" />
                  </button>
                )}
              </div>

              {cashOutError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 flex items-center gap-2">
                    <FaExclamationCircle />
                    {cashOutError}
                  </p>
                </div>
              )}

              {cashOutSuccess && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <p className="text-sm text-emerald-700 flex items-center gap-2">
                    <FaCheckCircle />
                    {cashOutSuccess}
                  </p>
                </div>
              )}

              {!cashOutSuccess && (
                <>
                  <div className="mb-6">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
                      <p className="text-sm text-emerald-700 font-medium mb-1">Available Balance</p>
                      <p className="text-3xl font-bold text-emerald-600">₱{earnings.availableBalance.toLocaleString()}</p>
                      <p className="text-xs text-emerald-600 mt-1">After 5% admin fee deduction</p>
                      {earnings.totalCashedOut > 0 && (
                        <p className="text-xs text-emerald-600 mt-1">
                          Total cashed out: ₱{earnings.totalCashedOut.toLocaleString()}
                        </p>
                      )}
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        PayPal Email Address *
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                          <FaPaypal className="text-blue-600" />
                        </span>
                        <input
                          type="email"
                          value={paypalEmail}
                          onChange={(e) => setPaypalEmail(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          placeholder="your-email@example.com"
                          disabled={processingCashOut}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Enter your PayPal Sandbox personal account email
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount to Cash Out *
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₱</span>
                        <input
                          type="number"
                          value={cashOutAmount}
                          onChange={(e) => setCashOutAmount(e.target.value)}
                          className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          placeholder="0.00"
                          min="0"
                          max={earnings.availableBalance}
                          step="0.01"
                          disabled={processingCashOut}
                        />
                      </div>
                      <button
                        onClick={() => setCashOutAmount(earnings.availableBalance.toString())}
                        disabled={processingCashOut}
                        className="text-sm text-emerald-600 hover:text-emerald-700 font-medium mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cash out full amount
                      </button>
                    </div>

                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800 mb-2 font-semibold">
                        <strong>Cash Out Information:</strong>
                      </p>
                      <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                        <li>Funds will be sent directly to your PayPal Sandbox account</li>
                        <li>Make sure you enter the correct PayPal email address</li>
                        <li>Processing typically takes a few moments in PayPal Sandbox</li>
                        <li>Currency: Philippine Peso (₱)</li>
                        <li>Minimum cash out amount: ₱100</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleCashOut}
                      disabled={
                        processingCashOut || 
                        !paypalEmail || 
                        !paypalEmail.trim() ||
                        !cashOutAmount || 
                        parseFloat(cashOutAmount) <= 0 || 
                        parseFloat(cashOutAmount) < 100 ||
                        parseFloat(cashOutAmount) > earnings.availableBalance
                      }
                      className="flex-1 bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {processingCashOut ? (
                        <>
                          <FaSpinner className="animate-spin text-white" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <FaPaypal className="text-white" />
                          Process Cash Out
                        </>
                      )}
                    </button>
                    {!processingCashOut && (
                      <button
                        onClick={() => {
                          setShowCashOutModal(false);
                          setCashOutAmount('');
                          setCashOutError('');
                          setCashOutSuccess('');
                        }}
                        className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </>
              )}

              {cashOutSuccess && (
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setShowCashOutModal(false);
                      setCashOutAmount('');
                      setCashOutError('');
                      setCashOutSuccess('');
                      setPaypalLoginData(null);
                    }}
                    className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                  >
                    Close
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                  <FaCheckCircle className="text-4xl text-emerald-600" />
                </div>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
                Withdrawal Successful
              </h2>

              <p className="text-gray-600 text-center mb-6">
                Your earnings have been transferred to your PayPal Sandbox account.
              </p>

              {withdrawalDetails && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Amount:</span>
                    <span className="text-lg font-semibold text-gray-900">
                      ₱{withdrawalDetails.amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">PayPal Email:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {withdrawalDetails.paypalEmail}
                    </span>
                  </div>
                  {withdrawalDetails.payoutBatchId && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Batch ID:</span>
                      <span className="text-xs font-mono text-gray-600">
                        {withdrawalDetails.payoutBatchId.substring(0, 20)}...
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Status:</span>
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

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800 text-center">
                  <strong>Note:</strong> Check your PayPal Sandbox account balance to confirm the transfer.
                  Processing typically takes a few moments in PayPal Sandbox.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowWithdrawalSuccessModal(false);
                  setWithdrawalDetails(null);
                }}
                className="w-full bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <FaCheckCircle />
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Claim Credit Modal */}
      <AnimatePresence>
        {showClaimCreditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget && !claimingCredit) {
                setShowClaimCreditModal(false);
                setCreditCode('');
                setCreditError('');
                setCreditSuccess('');
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <FaGift className="text-blue-600" />
                  Claim E-wallet Credit
                </h2>
                {!claimingCredit && (
                  <button
                    onClick={() => {
                      setShowClaimCreditModal(false);
                      setCreditCode('');
                      setCreditError('');
                      setCreditSuccess('');
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <FaTimes className="text-xl" />
                  </button>
                )}
              </div>

              {creditError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 flex items-center gap-2">
                    <FaExclamationCircle />
                    {creditError}
                  </p>
                </div>
              )}

              {creditSuccess && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <p className="text-sm text-emerald-700 flex items-center gap-2">
                    <FaCheckCircle />
                    {creditSuccess}
                  </p>
                </div>
              )}

              {!creditSuccess && (
                <>
                  <div className="mb-6">
                    <p className="text-gray-600 text-sm mb-4">
                      Enter your E-wallet credit code to claim the credit value. The credit will be added to your available balance.
                    </p>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Credit Code *
                      </label>
                      <input
                        type="text"
                        value={creditCode}
                        onChange={(e) => setCreditCode(e.target.value.toUpperCase())}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase font-mono"
                        placeholder="Enter code (e.g., ABC12345)"
                        disabled={claimingCredit}
                        maxLength={8}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Enter the 8-character code you received when redeeming the E-wallet Credit reward
                      </p>
                    </div>

                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800 mb-2 font-semibold">
                        <strong>How to get a code:</strong>
                      </p>
                      <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                        <li>Go to Points & Rewards page</li>
                        <li>Redeem "E-wallet Credit (₱200)" for 30 points</li>
                        <li>Copy the code from the alert message</li>
                        <li>Enter it here to claim your credit</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleClaimCredit}
                      disabled={
                        claimingCredit || 
                        !creditCode || 
                        !creditCode.trim()
                      }
                      className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {claimingCredit ? (
                        <>
                          <FaSpinner className="animate-spin text-white" />
                          Claiming...
                        </>
                      ) : (
                        <>
                          <FaGift />
                          Claim Credit
                        </>
                      )}
                    </button>
                    {!claimingCredit && (
                      <button
                        onClick={() => {
                          setShowClaimCreditModal(false);
                          setCreditCode('');
                          setCreditError('');
                          setCreditSuccess('');
                        }}
                        className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </>
              )}

              {creditSuccess && (
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setShowClaimCreditModal(false);
                      setCreditCode('');
                      setCreditError('');
                      setCreditSuccess('');
                    }}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Close
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Wrap the component with PayPalScriptProvider
const HostPaymentsReceivingWrapper = () => {
  // Get PayPal Client ID from environment variables
  // In Vite, use import.meta.env (process.env is not available in browser)
  // Access directly without optional chaining to match App.jsx behavior
  const paypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || 
                         'Aa1d32EXWKMFsgmQqm_Xri-h9FP6wDDQ4qqg2oLz2jjogpBxgBDLFdyksTZwooCQWVIy6qMXQwvULw-o';
  
  // Debug: Log the client ID (remove in production)
  useEffect(() => {
    const envClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
    console.log('🔍 [HostPaymentsReceivingWrapper] PayPal Client ID:', paypalClientId ? `✅ Found (${paypalClientId.substring(0, 10)}...)` : '❌ Not found');
    console.log('🔍 [HostPaymentsReceivingWrapper] Client ID source:', {
      fromImportMeta: !!envClientId,
      envClientIdValue: envClientId ? envClientId.substring(0, 10) + '...' : 'NOT FOUND',
      usingFallback: paypalClientId === 'Aa1d32EXWKMFsgmQqm_Xri-h9FP6wDDQ4qqg2oLz2jjogpBxgBDLFdyksTZwooCQWVIy6qMXQwvULw-o',
      allEnvKeys: Object.keys(import.meta.env || {}).filter(key => key.includes('PAYPAL'))
    });
    if (!envClientId) {
      console.warn('⚠️ PayPal Client ID not found in environment. Using fallback value.');
      console.warn('   To fix: Add VITE_PAYPAL_CLIENT_ID to your .env file and restart the dev server.');
    }
  }, [paypalClientId]);

  // If no client ID, show warning but still render the component
  // This allows users to see the page even if PayPal is not configured
  if (!paypalClientId) {
    console.warn('⚠️ PayPal Client ID not found. Please set VITE_PAYPAL_CLIENT_ID in .env file');
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <FaWallet className="text-emerald-600" />
            Payments & Earnings
          </h1>
          <p className="text-gray-600">Manage your earnings and payment methods</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FaExclamationCircle className="text-yellow-600 text-xl mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-yellow-800 mb-1">
                PayPal Client ID Not Configured
              </p>
              <p className="text-sm text-yellow-700 mb-2">
                Please configure VITE_PAYPAL_CLIENT_ID in your .env file to use PayPal features.
              </p>
              <p className="text-xs text-yellow-600">
                Make sure to restart your development server after adding the environment variable.
              </p>
            </div>
          </div>
        </div>
        <HostPaymentsReceiving />
      </div>
    );
  }

  return (
    <PayPalScriptProvider
      options={{
        'client-id': paypalClientId,  // Use 'client-id' format (matches working components)
        currency: 'PHP',
        intent: 'capture',
        components: 'buttons'
      }}
    >
      <HostPaymentsReceiving />
    </PayPalScriptProvider>
  );
};

export default HostPaymentsReceivingWrapper;

