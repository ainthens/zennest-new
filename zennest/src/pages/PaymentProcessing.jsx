// PaymentProcessing.jsx - Multi-step payment flow (fixed PayPal integration)
//
// Key fixes:
// - Removed manual PayPal SDK injection (no double-loading)
// - Use PayPalScriptProvider only
// - Always use PHP (Philippine Peso) currency - no fallback to other currencies
// - Tolerant Client ID resolution (ENV or window global)
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PayPalScriptProvider,
  PayPalButtons,
  usePayPalScriptReducer
} from '@paypal/react-paypal-js';
import { doc, getDoc, setDoc, collection, addDoc, serverTimestamp, updateDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { validatePromoCode, updateCoupon, transferPaymentToHost, getHostProfile } from '../services/firestoreService';
import { sendBookingConfirmationEmail } from '../services/emailService';
import useAuth from '../hooks/useAuth';
import SettingsHeader from '../components/SettingsHeader';
import Loading from '../components/Loading';
import {
  FaCreditCard,
  FaWallet,
  FaPaypal,
  FaCheckCircle,
  FaChevronLeft,
  FaChevronRight,
  FaCalendar,
  FaUser,
  FaEnvelope,
  FaHome,
  FaShieldAlt,
  FaLock,
  FaTimes,
  FaInfoCircle,
  FaTag,
  FaCheck
} from 'react-icons/fa';

/**
 * PayPalButtonsWrapper
 * - Renders PayPalButtons
 * - Watches PayPal script loading state via usePayPalScriptReducer
 * - Always uses PHP (Philippine Peso) currency - shows error if PHP is not supported
 */
const PayPalButtonsWrapper = ({
  createOrder,
  onApprove,
  onError,
  onCancel,
  style = { layout: 'vertical' },
  forceReinitKey,
  currency,
  onCurrencyFallback
}) => {
  const [{ options, isPending, isResolved, isRejected }, dispatch] = usePayPalScriptReducer();

  // When the script fails to load, loadingStatus becomes 'REJECTED'
  useEffect(() => {
    if (isRejected) {
      console.error('❌ PayPal SDK script loading REJECTED for options:', options);
      
      // Always use PHP (Philippine Peso) - show error if PHP is not supported
      // Don't fallback to USD/EUR as user specifically wants PHP
      if (options.currency !== 'PHP' && currency !== 'PHP') {
        console.warn('⚠️ PayPal currency is not PHP. Attempting to use PHP.');
        // Try to reset to PHP
        dispatch({
          type: 'resetOptions',
          value: {
            ...options,
            currency: 'PHP',
            components: 'buttons'
          }
        });
      } else {
        console.error('❌ PayPal SDK failed to load with PHP currency. Please check your PayPal account settings to ensure PHP is supported.');
      }
    }
  }, [isRejected, options, dispatch, currency]);

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (isRejected) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
        <p className="font-semibold mb-2">Failed to load PayPal with PHP (Philippine Peso) currency.</p>
        <p className="text-xs">Please ensure your PayPal account supports PHP transactions, or try using a different payment method (Wallet).</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden relative z-0" style={{ isolation: 'isolate' }}>
      <div className="w-full max-w-full min-w-[200px] relative z-0">
        <PayPalButtons
          style={style}
          createOrder={createOrder}
          onApprove={onApprove}
          onCancel={onCancel}
          onError={(err) => {
            console.error('PayPal Buttons onError:', err);
            if (onError) onError(err);
          }}
          // key ensures re-render when our forceReinitKey changes (e.g., currency switched)
          key={forceReinitKey}
        />
      </div>
      <style>{`
        /* Ensure PayPal iframe doesn't overlap navigation */
        [id*="paypal-button-container"],
        [id*="paypal-button"],
        iframe[title*="PayPal"],
        iframe[src*="paypal"],
        div[id*="paypal"] {
          position: relative !important;
          z-index: 1 !important;
        }
        
        /* Ensure header stays above PayPal elements */
        header.fixed {
          z-index: 50 !important;
        }
        
        /* Prevent any PayPal elements from appearing above header */
        body header {
          z-index: 9999 !important;
        }
      `}</style>
    </div>
  );
};

const PaymentProcessing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Utility: get booking data from location state or sessionStorage
  const getBookingData = () => {
    if (location.state?.bookingData) {
      console.log('📦 Booking data from location state:', location.state.bookingData);
      return location.state.bookingData;
    }
    try {
      const stored = sessionStorage.getItem('bookingData');
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('💾 Booking data from sessionStorage:', parsed);
        return parsed;
      }
    } catch (error) {
      console.error('❌ Error parsing bookingData from sessionStorage:', error);
    }
    console.warn('⚠️ No booking data found in state or sessionStorage');
    return null;
  };

  const bookingData = getBookingData();

  // Component state
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [listing, setListing] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [pendingBookingId, setPendingBookingId] = useState(null);

  const [paymentTiming, setPaymentTiming] = useState('now'); // now | later
  const [paymentMethod, setPaymentMethod] = useState('wallet'); // wallet | paypal | creditcard
  const [paypalEmail, setPaypalEmail] = useState('');

  const [messageToHost, setMessageToHost] = useState('');

  const [promoCode, setPromoCode] = useState('');
  const [appliedPromoCode, setAppliedPromoCode] = useState(null);
  const [promoCodeError, setPromoCodeError] = useState('');
  const [validatingPromoCode, setValidatingPromoCode] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);

  const [totalAmount, setTotalAmount] = useState(0);
  const [serviceFee, setServiceFee] = useState(0);
  const [finalTotal, setFinalTotal] = useState(0);

  // PayPal config
  // Prefer env var, but allow fallback to window.PAYPAL_CLIENT_ID (in case provided directly)
  const envClientId = (import.meta && import.meta.env && import.meta.env.VITE_PAYPAL_CLIENT_ID) || null;
  const globalClientId = typeof window !== 'undefined' && window.PAYPAL_CLIENT_ID ? window.PAYPAL_CLIENT_ID : null;
  const paypalClientId = (envClientId && envClientId.trim()) || (globalClientId && globalClientId.trim()) || '';

  // Currency: Always use PHP (Philippine Peso) as requested
  const PAYPAL_CURRENCY = 'PHP'; // Always use PHP (Philippine Peso)

  const [paypalError, setPaypalError] = useState(null);
  const [forceReinitKey, setForceReinitKey] = useState(0); // bump to force reinit of PayPalButtons

  // Validate client id on mount
  useEffect(() => {
    if (!paypalClientId) {
      console.error('❌ PayPal Client ID is missing. Provide VITE_PAYPAL_CLIENT_ID or window.PAYPAL_CLIENT_ID');
      setPaypalError('PayPal client ID is not configured. Please set VITE_PAYPAL_CLIENT_ID in your environment or window.PAYPAL_CLIENT_ID for runtime.');
      return;
    }

    // basic validation (sandbox client ids often start with 'A' but we won't enforce too strictly)
    if (paypalClientId.length < 10) {
      console.warn('⚠️ PayPal Client ID seems unusually short:', paypalClientId);
    }

    // Clear any previous currency settings to ensure PHP is used
    sessionStorage.removeItem('paypalCurrency');
    console.log('✅ PayPal Client ID available. Using currency: PHP (Philippine Peso)');
  }, [paypalClientId]);

  // Fetch initial listing, wallet, calculate totals
  useEffect(() => {
    if (!user?.uid) {
      return;
    }

    let finalBookingData = bookingData;
    if (!finalBookingData) {
      try {
        const stored = sessionStorage.getItem('bookingData');
        if (stored) finalBookingData = JSON.parse(stored);
      } catch (err) {
        console.error('Error reading bookingData from sessionStorage', err);
      }
    }

    if (finalBookingData && finalBookingData.listingId && user?.uid) {
      fetchData(finalBookingData);
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const fetchData = async (dataToUse = null) => {
    try {
      setLoading(true);
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      const data = dataToUse || bookingData || (() => {
        try {
          const s = sessionStorage.getItem('bookingData');
          return s ? JSON.parse(s) : null;
        } catch {
          return null;
        }
      })();

      if (!data || !data.listingId) {
        setLoading(false);
        return;
      }

      // fetch listing
      const listingRef = doc(db, 'listings', data.listingId);
      const listingSnap = await getDoc(listingRef);
      if (!listingSnap.exists()) {
        alert('Listing not found.');
        setLoading(false);
        navigate('/homestays');
        return;
      }
      const listingData = { id: listingSnap.id, ...listingSnap.data() };
      setListing(listingData);

      // wallet
      try {
        const walletRef = doc(db, 'wallets', user.uid);
        const walletSnap = await getDoc(walletRef);
        if (walletSnap.exists()) {
          setWalletBalance(walletSnap.data().balance || 0);
        } else {
          await setDoc(walletRef, {
            userId: user.uid,
            balance: 0,
            currency: 'PHP',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          setWalletBalance(0);
        }
      } catch (err) {
        console.error('Error fetching wallet:', err);
        setWalletBalance(0);
      }

      // calculate totals
      calculateTotals(data, listingData);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to load booking information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = (data, listingData = null, promoDiscountAmount = 0) => {
    const listingToUse = listingData || listing;
    if (!listingToUse) return;

    const baseRate = listingToUse.discount > 0
      ? (listingToUse.rate || 0) * (1 - listingToUse.discount / 100)
      : (listingToUse.rate || 0);

    let subtotal = 0;
    if (listingToUse.category === 'home') {
      const nights = data.nights || 0;
      subtotal = nights > 0 ? baseRate * nights * (data.guests || 1) : baseRate;
    } else {
      subtotal = baseRate * (data.guests || 1);
    }

    const subtotalAfterPromo = Math.max(0, subtotal - promoDiscountAmount);
    const fee = Math.round(subtotalAfterPromo * 0.05);
    const total = subtotalAfterPromo + fee;

    setTotalAmount(subtotal);
    setServiceFee(fee);
    setFinalTotal(total);
    setPromoDiscount(promoDiscountAmount);
  };

  const handleApplyPromoCode = async () => {
    if (!promoCode.trim()) {
      setPromoCodeError('Please enter a promo code');
      return;
    }
    if (!listing || !user?.uid) {
      setPromoCodeError('Unable to validate promo code');
      return;
    }

    setValidatingPromoCode(true);
    setPromoCodeError('');

    try {
      const currentBookingData = bookingData || (() => {
        try {
          const s = sessionStorage.getItem('bookingData');
          return s ? JSON.parse(s) : null;
        } catch { return null; }
      })();

      if (!currentBookingData) {
        setPromoCodeError('Booking data not found');
        setValidatingPromoCode(false);
        return;
      }

      const baseRate = listing.discount > 0
        ? (listing.rate || 0) * (1 - listing.discount / 100)
        : (listing.rate || 0);

      let subtotal = 0;
      if (listing.category === 'home') {
        const nights = currentBookingData.nights || 0;
        subtotal = nights > 0 ? baseRate * nights * (currentBookingData.guests || 1) : baseRate;
      } else {
        subtotal = baseRate * (currentBookingData.guests || 1);
      }

      const result = await validatePromoCode(
        promoCode.trim(),
        listing.id,
        listing.hostId,
        subtotal
      );

      if (result.success) {
        setAppliedPromoCode(result.coupon);
        setPromoCodeError('');
        calculateTotals(currentBookingData, listing, result.discountAmount || 0);
      } else {
        setPromoCodeError(result.error || 'Invalid promo code');
        setAppliedPromoCode(null);
        calculateTotals(currentBookingData, listing, 0);
      }
    } catch (error) {
      console.error('Error validating promo code:', error);
      setPromoCodeError('Failed to validate promo code. Please try again.');
      setAppliedPromoCode(null);
    } finally {
      setValidatingPromoCode(false);
    }
  };

  const handleRemovePromoCode = () => {
    setPromoCode('');
    setAppliedPromoCode(null);
    setPromoCodeError('');
    const currentBookingData = bookingData || (() => {
      try {
        const s = sessionStorage.getItem('bookingData');
        return s ? JSON.parse(s) : null;
      } catch { return null; }
    })();
    if (currentBookingData && listing) {
      calculateTotals(currentBookingData, listing, 0);
    }
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if ((paymentMethod === 'paypal' || paymentMethod === 'creditcard') && !paypalEmail.trim()) {
        alert(paymentMethod === 'creditcard' ? 'Please enter your email address for payment confirmation' : 'Please enter your PayPal email address');
        return;
      }
      if (paymentMethod === 'wallet' && walletBalance < finalTotal) {
        alert('Insufficient wallet balance. Please top up your wallet or use another payment method.');
        return;
      }

      if (appliedPromoCode) {
        await handleApplyPromoCode();
      }

      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
    else navigate(-1);
  };

  const createBooking = async () => {
    const finalBookingData = bookingData || (() => {
      try { const s = sessionStorage.getItem('bookingData'); return s ? JSON.parse(s) : null; } catch { return null; }
    })();

    if (!user?.uid || !listing || !finalBookingData) {
      throw new Error('Missing booking information. Please try again.');
    }

    const bookingsRef = collection(db, 'bookings');
    const bookingDoc = {
      guestId: user.uid,
      hostId: listing.hostId,
      listingId: listing.id,
      listingTitle: listing.title,
      listingCategory: listing.category,
      status: 'pending_approval', // All bookings start as pending approval
      paymentStatus: paymentTiming === 'now' ? 'pending' : 'scheduled',
      paymentMethod: paymentMethod === 'creditcard' ? 'paypal' : paymentMethod,
      paymentTiming: paymentTiming,
      paypalEmail: (paymentMethod === 'paypal' || paymentMethod === 'creditcard') ? paypalEmail : null,
      checkIn: finalBookingData.checkIn || null,
      checkOut: finalBookingData.checkOut || null,
      guests: finalBookingData.guests || 1,
      nights: finalBookingData.nights || 0,
      subtotal: totalAmount,
      promoCode: appliedPromoCode?.code || null,
      promoCodeId: appliedPromoCode?.id || null,
      promoDiscount: promoDiscount,
      serviceFee: serviceFee,
      total: finalTotal,
      messageToHost: messageToHost.trim() || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const bookingRef = await addDoc(bookingsRef, bookingDoc);
    return bookingRef.id;
  };

  const completeWalletPayment = async (bookingId) => {
    const walletRef = doc(db, 'wallets', user.uid);
    const newBalance = walletBalance - finalTotal;
    await updateDoc(walletRef, {
      balance: newBalance,
      updatedAt: serverTimestamp()
    });

    const transactionsRef = collection(db, 'transactions');
    await addDoc(transactionsRef, {
      userId: user.uid,
      type: 'payment',
      amount: finalTotal,
      status: 'completed',
      description: `Booking payment for ${listing.title}`,
      paymentMethod: 'wallet',
      bookingId: bookingId,
      createdAt: serverTimestamp()
    });

    const bookingRef = doc(db, 'bookings', bookingId);
    await updateDoc(bookingRef, {
      paymentStatus: 'completed',
      status: 'pending_approval', // Status remains pending_approval until host approves
      updatedAt: serverTimestamp()
    });
  };

  const handlePayPalSuccess = async (paymentId, paymentDetails = {}) => {
    try {
      setProcessing(true);
      setPaypalError(null);

      const { orderId, paidAmount, currency, bookingId: bookingIdFromPayment, payer } = paymentDetails;
      const bookingIdToUse = bookingIdFromPayment || pendingBookingId;

      if (!bookingIdToUse) {
        throw new Error('Booking ID not found. Please contact support.');
      }

      // Get booking
      const bookingRef = doc(db, 'bookings', bookingIdToUse);
      const bookingSnap = await getDoc(bookingRef);
      if (!bookingSnap.exists()) throw new Error('Booking not found. Please contact support.');

      const bookingDataSnap = bookingSnap.data();

      // Check duplicates
      if (bookingDataSnap.paymentStatus === 'completed' && bookingDataSnap.status === 'confirmed') {
        console.warn('⚠️ Booking already confirmed. Payment may be duplicate.');
      }

      const bookingTotal = parseFloat(bookingDataSnap.total || finalTotal);
      if (paidAmount && Math.abs(paidAmount - bookingTotal) > 0.10) {
        throw new Error('Payment amount does not match booking amount. Please contact support.');
      }

      await updateDoc(bookingRef, {
        paymentStatus: 'completed',
        status: 'pending_approval', // Status remains pending_approval until host approves
        paypalPaymentId: paymentId,
        paypalOrderId: orderId || null,
        paidAmount: paidAmount || finalTotal,
        paidCurrency: 'PHP', // Always use PHP (Philippine Peso)
        paidAt: serverTimestamp(),
        payerEmail: payer?.email_address || paypalEmail || null,
        payerName: payer?.name?.given_name && payer?.name?.surname
          ? `${payer.name.given_name} ${payer.name.surname}`
          : payer?.name?.given_name || null,
        updatedAt: serverTimestamp()
      });

      if (appliedPromoCode && appliedPromoCode.id) {
        try {
          await updateCoupon(appliedPromoCode.id, {
            usageCount: (appliedPromoCode.usageCount || 0) + 1,
            lastUsedAt: serverTimestamp()
          });
        } catch (err) {
          console.error('Error updating coupon usage', err);
        }
      }

      const transactionsRef = collection(db, 'transactions');
      await addDoc(transactionsRef, {
        userId: user.uid,
        type: 'payment',
        amount: paidAmount || finalTotal,
        currency: 'PHP', // Always use PHP (Philippine Peso)
        status: 'completed',
        description: `Booking payment for ${listing.title}`,
        paymentMethod: paymentMethod === 'creditcard' ? 'creditcard' : 'paypal',
        bookingId: bookingIdToUse,
        paypalPaymentId: paymentId,
        paypalOrderId: orderId || null,
        promoCode: appliedPromoCode?.code || null,
        promoDiscount: promoDiscount || 0,
        createdAt: serverTimestamp(),
        completedAt: serverTimestamp()
      });

      // Don't transfer payment until booking is approved
      // Payment transfer will happen after host approves the booking
      
      // non-blocking operations - send message to host only (no confirmation email yet)
      sendMessageToHost(bookingIdToUse).catch(e => console.error('Message error', e));

      // Clear sessionStorage
      sessionStorage.removeItem('pendingPaypalBookingId');
      sessionStorage.removeItem('paypalCurrency'); // Ensure PHP is always used

      // Small wait
      await new Promise(res => setTimeout(res, 300));

      navigate('/bookings', {
        state: {
          success: true,
          message: 'Booking request submitted! Payment processed successfully. Waiting for host approval.',
          bookingId: bookingIdToUse
        }
      });
    } catch (error) {
      console.error('Error completing PayPal payment:', error);
      setPaypalError(error.message || 'Payment processed but failed to confirm booking. Please contact support.');
      setProcessing(false);
      alert(`Payment Error: ${error.message || 'Payment processed but failed to confirm booking. Please contact support.'}`);
    }
  };

  const sendMessageToHost = async (bookingId) => {
    if (!messageToHost.trim() || !listing || !user?.uid) return;
    try {
      const bookingRef = doc(db, 'bookings', bookingId);
      const bookingSnap = await getDoc(bookingRef);
      if (!bookingSnap.exists()) return;

      const conversationId = `${user.uid}_${listing.hostId}_${listing.id}`;
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationSnap = await getDoc(conversationRef);

      if (!conversationSnap.exists()) {
        await setDoc(conversationRef, {
          guestId: user.uid,
          hostId: listing.hostId,
          listingId: listing.id,
          listingTitle: listing.title,
          participants: [user.uid, listing.hostId],
          lastMessage: messageToHost.trim(),
          lastMessageAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          unreadCount: { [user.uid]: 0, [listing.hostId]: 1 }
        });
      }

      const messagesRef = collection(db, 'conversations', conversationId, 'messages');
      await addDoc(messagesRef, {
        senderId: user.uid,
        senderName: user.displayName || user.email?.split('@')[0] || 'Guest',
        senderType: 'guest',
        text: messageToHost.trim(),
        read: false,
        createdAt: serverTimestamp(),
        listingId: listing.id,
        listingTitle: listing.title
      });

      await updateDoc(conversationRef, {
        lastMessage: messageToHost.trim(),
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Error sending message to host:', err);
    }
  };

  const sendBookingConfirmationEmails = async (bookingId) => {
    try {
      const bookingRef = doc(db, 'bookings', bookingId);
      const bookingSnap = await getDoc(bookingRef);
      if (!bookingSnap.exists()) return;

      const booking = bookingSnap.data();
      const finalBookingDataLocal = bookingData || (() => {
        try { const s = sessionStorage.getItem('bookingData'); return s ? JSON.parse(s) : null; } catch { return null; }
      })();

      const checkIn = booking.checkIn?.toDate?.() || (finalBookingDataLocal?.checkIn ? new Date(finalBookingDataLocal.checkIn) : null);
      const checkOut = booking.checkOut?.toDate?.() || (finalBookingDataLocal?.checkOut ? new Date(finalBookingDataLocal.checkOut) : null);
      const guests = booking.guests || finalBookingDataLocal?.guests || 1;
      const nights = booking.nights || finalBookingDataLocal?.nights || 0;

      const guestEmail = user?.email || '';
      const guestName = user?.displayName || user?.email?.split('@')[0] || 'Guest';

      let hostEmail = '';
      let hostName = '';
      try {
        const hostResult = await getHostProfile(listing.hostId);
        if (hostResult.success && hostResult.data) {
          const hostData = hostResult.data;
          hostEmail = hostData.email || '';
          hostName = hostData.firstName && hostData.lastName ? `${hostData.firstName} ${hostData.lastName}` : hostData.firstName || hostData.email?.split('@')[0] || 'Host';
        }
      } catch (err) {
        console.error('Error fetching host profile for email:', err);
      }

      const emailData = {
        guestEmail,
        guestName,
        hostEmail,
        hostName,
        listingTitle: listing.title || 'Listing',
        listingLocation: listing.location || 'Location',
        checkIn,
        checkOut,
        guests,
        nights,
        totalAmount: booking.total || finalTotal,
        bookingId,
        category: listing.category || 'booking'
      };

      sendBookingConfirmationEmail(emailData).catch(err => console.error('Email sending error', err));
    } catch (err) {
      console.error('Error preparing booking emails:', err);
    }
  };

  const handleCompleteBooking = async () => {
    const finalBookingData = bookingData || (() => {
      try { const s = sessionStorage.getItem('bookingData'); return s ? JSON.parse(s) : null; } catch { return null; }
    })();

    if (!user?.uid || !listing || !finalBookingData) {
      alert('Missing booking information. Please try again.');
      return;
    }

    if (paymentMethod === 'wallet' && walletBalance < finalTotal) {
      alert('Insufficient wallet balance. Please top up your wallet.');
      return;
    }

    if ((paymentMethod === 'paypal' || paymentMethod === 'creditcard') && paymentTiming === 'now') {
      console.log('PayPal flow selected; use PayPal button to complete payment.');
      return;
    }

    try {
      setProcessing(true);
      const bookingId = await createBooking();

      if (paymentTiming === 'now' && paymentMethod === 'wallet') {
        await completeWalletPayment(bookingId);
        // Don't transfer payment until booking is approved
        // Payment transfer will happen after host approves the booking
        // Don't send confirmation email until host approves
      }

      if (appliedPromoCode && appliedPromoCode.id) {
        try {
          await updateCoupon(appliedPromoCode.id, {
            usageCount: (appliedPromoCode.usageCount || 0) + 1
          });
        } catch (err) {
          console.error('Error updating promo usage', err);
        }
      }

      await sendMessageToHost(bookingId);

      navigate('/bookings', {
        state: {
          success: true,
          message: paymentTiming === 'now' ? 'Booking request submitted! Payment processed successfully. Waiting for host approval.' : 'Booking request submitted! Payment will be processed on the scheduled date. Waiting for host approval.'
        }
      });
    } catch (err) {
      console.error('Error completing booking', err);
      alert('Failed to complete booking. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // createPayPalOrder & onApprove handlers used by PayPalButtons
  const createPayPalOrder = async (data, actions) => {
    try {
      if (!finalTotal || finalTotal <= 0) {
        throw new Error('Invalid total amount');
      }

      // Create booking BEFORE PayPal payment is initiated
      // This ensures we have a booking ID to track the payment
      if (!pendingBookingId) {
        try {
          setProcessing(true);
          const bookingId = await createBooking();
          setPendingBookingId(bookingId);
          // Store in sessionStorage for cancel handler
          sessionStorage.setItem('pendingPaypalBookingId', bookingId);
          console.log('✅ Booking created before PayPal payment:', bookingId);
        } catch (bookingError) {
          console.error('❌ Error creating booking before PayPal payment:', bookingError);
          setPaypalError('Failed to create booking. Please try again.');
          setProcessing(false);
          throw new Error('Failed to create booking. Please try again.');
        } finally {
          setProcessing(false);
        }
      }

      // Always use PHP (Philippine Peso) currency
      const value = Number(finalTotal).toFixed(2);
      return await actions.order.create({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: 'PHP', // Always use PHP (Philippine Peso)
              value
            }
          }
        ]
      });
    } catch (e) {
      console.error('createPayPalOrder error:', e);
      setPaypalError(e?.message || 'Failed to initialize PayPal order.');
      throw e;
    }
  };

  const onApprovePayPalOrder = async (data, actions) => {
    try {
      const details = await actions.order.capture();
      // Extract capture info defensively
      const pu = details?.purchase_units?.[0];
      const cap = pu?.payments?.captures?.[0];
      const amount = cap?.amount?.value || pu?.amount?.value;
      const currency = 'PHP'; // Always use PHP (Philippine Peso) regardless of what PayPal returns

      console.log('✅ PayPal capture details:', { orderId: details?.id, captureId: cap?.id, status: cap?.status, amount, currency: 'PHP (Philippine Peso)' });

      await handlePayPalSuccess(details?.id, {
        orderId: details?.id,
        captureId: cap?.id,
        status: cap?.status,
        payerEmail: details?.payer?.email_address,
        payer: details?.payer,
        paidAmount: parseFloat(amount),
        amount: parseFloat(amount),
        currency,
        raw: details,
        bookingId: pendingBookingId
      });
    } catch (e) {
      console.error('onApprovePayPalOrder error:', e);
      setPaypalError(e?.message || 'PayPal approval failed.');
    }
  };

  const onCancelPayPalOrder = () => {
    console.log('❌ PayPal payment cancelled by user');
    // Navigate to cancel page with booking ID if available
    const bookingId = pendingBookingId || sessionStorage.getItem('pendingPaypalBookingId');
    if (bookingId) {
      navigate(`/paypal-cancel?bookingId=${bookingId}`);
    } else {
      navigate('/paypal-cancel');
    }
  };

  // Handle currency issues - always use PHP, don't fallback to other currencies
  const handleCurrencyFallback = useCallback((newCurrency) => {
    // Don't allow currency fallback - always use PHP
    console.warn('⚠️ Currency fallback requested but PHP (Philippine Peso) is required. Keeping PHP.');
    // Force reinit with PHP
    setForceReinitKey((k) => k + 1);
  }, []);

  if (loading) {
    return (
      <>
        <SettingsHeader />
        <div className="min-h-screen bg-slate-50 pt-20">
          <Loading message="Loading payment information..." size="large" fullScreen={false} className="pt-20" />
        </div>
      </>
    );
  }

  const currentBookingData = bookingData || (() => {
    try { const s = sessionStorage.getItem('bookingData'); return s ? JSON.parse(s) : null; } catch { return null; }
  })();

  if (!currentBookingData || !listing) {
    return (
      <>
        <SettingsHeader />
        <div className="min-h-screen flex items-center justify-center bg-slate-50 pt-20">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="text-6xl mb-4">😕</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Booking Information Missing</h2>
            <p className="text-gray-600 mb-6">Please go back and try again.</p>
            <button
              onClick={() => navigate('/homestays')}
              className="px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium"
            >
              Back to Home Stays
            </button>
          </div>
        </div>
      </>
    );
  }

  // steps array and rendering (unchanged)
  const steps = [
    { number: 1, title: 'Payment Timing', icon: FaCalendar },
    { number: 2, title: 'Payment Method', icon: FaCreditCard },
    { number: 3, title: 'Message Host', icon: FaEnvelope },
    { number: 4, title: 'Review', icon: FaCheckCircle }
  ];

  return (
    <PayPalScriptProvider
      options={{
        clientId: paypalClientId,
        currency: 'PHP', // Always use PHP (Philippine Peso)
        components: 'buttons',
        intent: 'capture',
        locale: 'en_PH' // Set locale to Philippines for better PHP support
      }}
      key={`paypal-php-${forceReinitKey}`} // Force reinit if needed
    >
      <SettingsHeader />
      <div className="min-h-screen bg-slate-50 pt-20 pb-12 relative z-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-0">
          {/* Progress Steps */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between">
              {steps.map((step, idx) => (
                <React.Fragment key={step.number}>
                  <div className="flex flex-col items-center flex-1">
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all
                      ${currentStep >= step.number 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-gray-200 text-gray-500'
                      }
                    `}>
                      {currentStep > step.number ? (
                        <FaCheckCircle className="w-5 h-5" />
                      ) : (
                        <step.icon className="w-5 h-5" />
                      )}
                    </div>
                    <span className={`text-[10px] mt-1.5 font-medium ${
                      currentStep >= step.number ? 'text-emerald-600' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </span>
                  </div>
                  {idx < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1.5 ${
                      currentStep > step.number ? 'bg-emerald-600' : 'bg-gray-200'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 lg:p-6">
            <AnimatePresence mode="wait">
              {/* Step 1 */}
              {currentStep === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">When would you like to pay?</h2>
                    <p className="text-gray-600">Choose your preferred payment timing</p>
                  </div>

                  <div className="space-y-4">
                    <button onClick={() => setPaymentTiming('now')} className={`w-full p-6 rounded-xl border-2 transition-all text-left ${paymentTiming === 'now' ? 'border-emerald-600 bg-emerald-50' : 'border-gray-200 hover:border-emerald-300'}`}>
                      <div className="flex items-start gap-4">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 ${paymentTiming === 'now' ? 'border-emerald-600 bg-emerald-600' : 'border-gray-300'}`}>
                          {paymentTiming === 'now' && <FaCheckCircle className="w-4 h-4 text-white" />}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 mb-1">Pay Now</h3>
                          <p className="text-sm text-gray-600">Complete your payment immediately. Your booking will be confirmed right away.</p>
                        </div>
                      </div>
                    </button>

                    <button onClick={() => setPaymentTiming('later')} className={`w-full p-6 rounded-xl border-2 transition-all text-left ${paymentTiming === 'later' ? 'border-emerald-600 bg-emerald-50' : 'border-gray-200 hover:border-emerald-300'}`}>
                      <div className="flex items-start gap-4">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 ${paymentTiming === 'later' ? 'border-emerald-600 bg-emerald-600' : 'border-gray-300'}`}>
                          {paymentTiming === 'later' && <FaCheckCircle className="w-4 h-4 text-white" />}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 mb-1">Pay Later</h3>
                          <p className="text-sm text-gray-600">Reserve your booking now. Payment will be processed automatically before check-in.</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 2 */}
              {currentStep === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">Select Payment Method</h2>
                    <p className="text-sm text-gray-600">Choose how you'd like to pay</p>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <FaTag className="inline mr-2 text-emerald-600" />
                      Promo Code
                    </label>
                    {!appliedPromoCode ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={promoCode}
                          onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoCodeError(''); }}
                          onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleApplyPromoCode(); } }}
                          placeholder="Enter promo code"
                          className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-500 focus:outline-none text-sm uppercase"
                          disabled={validatingPromoCode}
                        />
                        <button onClick={handleApplyPromoCode} disabled={validatingPromoCode || !promoCode.trim()} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                          {validatingPromoCode ? '...' : 'Apply'}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-emerald-300">
                        <div className="flex items-center gap-2">
                          <FaCheckCircle className="text-emerald-600" />
                          <span className="font-mono font-semibold text-emerald-700">{appliedPromoCode.code}</span>
                          <span className="text-sm text-gray-600">- {appliedPromoCode.discount}{appliedPromoCode.discountType === 'percentage' ? '%' : '₱'} off</span>
                        </div>
                        <button onClick={handleRemovePromoCode} className="text-gray-400 hover:text-red-600 transition-colors" title="Remove promo code">
                          <FaTimes className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {promoCodeError && (<p className="mt-2 text-xs text-red-600 flex items-center gap-1"><FaTimes className="w-3 h-3" />{promoCodeError}</p>)}
                  </div>

                  <div className="space-y-3">
                    <button onClick={() => setPaymentMethod('wallet')} className={`w-full p-4 rounded-lg border-2 transition-all text-left ${paymentMethod === 'wallet' ? 'border-emerald-600 bg-emerald-50' : 'border-gray-200 hover:border-emerald-300'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${paymentMethod === 'wallet' ? 'border-emerald-600 bg-emerald-600' : 'border-gray-300'}`}>
                          {paymentMethod === 'wallet' && <FaCheckCircle className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm"><FaWallet className="text-emerald-600" /> Wallet</h3>
                            <span className="text-xs font-semibold text-gray-700">₱{walletBalance.toLocaleString()} available</span>
                          </div>
                          <p className="text-xs text-gray-600">Use your wallet balance to pay instantly</p>
                          {walletBalance < finalTotal && paymentMethod === 'wallet' && (<div className="mt-1.5 p-1.5 bg-yellow-50 border border-yellow-200 rounded text-xs"><p className="text-yellow-800 flex items-center gap-1"><FaInfoCircle className="w-3 h-3" />Need ₱{(finalTotal - walletBalance).toLocaleString()} more</p></div>)}
                        </div>
                      </div>
                    </button>

                    <button onClick={() => setPaymentMethod('paypal')} className={`w-full p-4 rounded-lg border-2 transition-all text-left ${paymentMethod === 'paypal' ? 'border-emerald-600 bg-emerald-50' : 'border-gray-200 hover:border-emerald-300'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${paymentMethod === 'paypal' ? 'border-emerald-600 bg-emerald-600' : 'border-gray-300'}`}>
                          {paymentMethod === 'paypal' && <FaCheckCircle className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm mb-1"><FaPaypal className="text-yellow-500" /> PayPal</h3>
                          <p className="text-xs text-gray-600">Pay securely with PayPal</p>
                        </div>
                      </div>
                    </button>

                    <button onClick={() => setPaymentMethod('creditcard')} className={`w-full p-4 rounded-lg border-2 transition-all text-left ${paymentMethod === 'creditcard' ? 'border-emerald-600 bg-emerald-50' : 'border-gray-200 hover:border-emerald-300'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${paymentMethod === 'creditcard' ? 'border-emerald-600 bg-emerald-600' : 'border-gray-300'}`}>
                          {paymentMethod === 'creditcard' && <FaCheckCircle className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm mb-1"><FaCreditCard className="text-gray-700" /> Credit Card</h3>
                          <p className="text-xs text-gray-600">Pay with Visa, Mastercard, or other cards</p>
                        </div>
                      </div>
                    </button>
                  </div>

                  {(paymentMethod === 'paypal' || paymentMethod === 'creditcard') && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3">
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        {paymentMethod === 'creditcard' ? 'Email Address' : 'PayPal Email Address'}
                      </label>
                      <input type="email" value={paypalEmail} onChange={(e) => setPaypalEmail(e.target.value)} placeholder="your.email@example.com" className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-500 focus:outline-none text-sm" />
                      {paymentMethod === 'creditcard' && (<p className="mt-2 text-xs text-blue-600 flex items-start gap-1"><FaInfoCircle className="w-3 h-3 mt-0.5 flex-shrink-0" /><span>Credit card payments are processed securely through PayPal. You'll complete payment in the next step.</span></p>)}
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* Step 3 */}
              {currentStep === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">Message to Host</h2>
                    <p className="text-sm text-gray-600">Let your host know about your stay (optional)</p>
                  </div>

                  <div>
                    <textarea value={messageToHost} onChange={(e) => setMessageToHost(e.target.value)} placeholder="Hi! I'm looking forward to staying at your place. I'll be arriving around 3 PM..." rows={5} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-500 focus:outline-none resize-none text-sm" />
                    <p className="text-xs text-gray-500 mt-1.5">{messageToHost.length} characters</p>
                  </div>
                </motion.div>
              )}

              {/* Step 4 (Review) */}
              {currentStep === 4 && (
                <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">Review Your Booking</h2>
                    <p className="text-sm text-gray-600">Please review all details before confirming</p>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex gap-3 mb-3">
                      {listing.images && listing.images[0] && (<img src={listing.images[0]} alt={listing.title} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />)}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 mb-0.5 text-sm truncate">{listing.title}</h3>
                        <p className="text-xs text-gray-600 truncate">{listing.location}</p>
                        <p className="text-xs text-gray-500 mt-0.5 capitalize">{listing.category}</p>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-3 border-t border-gray-200">
                      {listing.category === 'home' && currentBookingData.checkIn && currentBookingData.checkOut && (
                        <>
                          <div className="flex justify-between text-sm"><span className="text-gray-600">Check-in</span><span className="font-medium text-gray-900">{new Date(currentBookingData.checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></div>
                          <div className="flex justify-between text-sm"><span className="text-gray-600">Check-out</span><span className="font-medium text-gray-900">{new Date(currentBookingData.checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></div>
                          <div className="flex justify-between text-sm"><span className="text-gray-600">Nights</span><span className="font-medium text-gray-900">{currentBookingData.nights || 0}</span></div>
                        </>
                      )}
                      <div className="flex justify-between text-sm"><span className="text-gray-600">Guests</span><span className="font-medium text-gray-900">{currentBookingData.guests || 1}</span></div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-3 text-sm">Payment Summary</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs"><span className="text-gray-600">Subtotal</span><span className="font-medium text-gray-900">₱{totalAmount.toLocaleString()}</span></div>
                      {appliedPromoCode && promoDiscount > 0 && (<div className="flex justify-between text-xs"><span className="text-gray-600 flex items-center gap-1"><FaTag className="text-emerald-600" /> Promo Code ({appliedPromoCode.code})</span><span className="font-medium text-emerald-600">-₱{promoDiscount.toLocaleString()}</span></div>)}
                      <div className="flex justify-between text-xs"><span className="text-gray-600">Service fee</span><span className="font-medium text-gray-900">₱{serviceFee.toLocaleString()}</span></div>
                      <div className="pt-2 border-t border-gray-300 flex justify-between"><span className="font-bold text-gray-900 text-sm">Total</span><span className="font-bold text-emerald-600 text-base">₱{finalTotal.toLocaleString()}</span></div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-3 text-sm">Payment Details</h3>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs"><span className="text-gray-600">Payment Timing</span><span className="font-medium text-gray-900 capitalize">{paymentTiming === 'now' ? 'Pay Now' : 'Pay Later'}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-gray-600">Payment Method</span><span className="font-medium text-gray-900 capitalize flex items-center gap-1.5">{paymentMethod === 'wallet' ? (<><FaWallet className="text-emerald-600 w-3 h-3" /> Wallet</>) : paymentMethod === 'creditcard' ? (<><FaCreditCard className="text-gray-700 w-3 h-3" /> Credit Card</>) : (<><FaPaypal className="text-yellow-500 w-3 h-3" /> PayPal</>)}</span></div>
                      {(paymentMethod === 'paypal' || paymentMethod === 'creditcard') && paypalEmail && (<div className="flex justify-between text-xs"><span className="text-gray-600">{paymentMethod === 'creditcard' ? 'Email' : 'PayPal Email'}</span><span className="font-medium text-gray-900 truncate ml-2">{paypalEmail}</span></div>)}
                    </div>
                  </div>

                  {messageToHost.trim() && (<div className="bg-slate-50 rounded-lg p-4 border border-gray-200"><h3 className="font-semibold text-gray-900 mb-2 text-sm">Message to Host</h3><p className="text-xs text-gray-700 whitespace-pre-wrap">{messageToHost}</p></div>)}

                  {/* PayPal Buttons - Show when PayPal/Credit Card is selected and payment timing is "now" */}
                  {currentStep === 4 && paymentTiming === 'now' && (paymentMethod === 'paypal' || paymentMethod === 'creditcard') && (
                    <div className="bg-slate-50 rounded-lg p-4 border border-gray-200">
                      <h3 className="font-semibold text-gray-900 mb-3 text-sm">Complete Payment</h3>
                      {paypalError && (
                        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-xs text-red-700">{paypalError}</p>
                        </div>
                      )}
                      <PayPalButtonsWrapper
                        createOrder={createPayPalOrder}
                        onApprove={onApprovePayPalOrder}
                        onCancel={onCancelPayPalOrder}
                        onError={(err) => {
                          console.error('PayPal error:', err);
                          setPaypalError(err.message || 'Payment failed. Please try again.');
                        }}
                        currency="PHP" // Always use PHP (Philippine Peso)
                        forceReinitKey={forceReinitKey}
                        onCurrencyFallback={handleCurrencyFallback}
                        style={{ layout: 'vertical' }}
                      />
                    </div>
                  )}

                  <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <FaShieldAlt className="text-emerald-600 mt-0.5 flex-shrink-0 w-4 h-4" />
                    <div>
                      <p className="text-xs font-semibold text-emerald-900">Secure Payment</p>
                      <p className="text-xs text-emerald-700 mt-0.5">Your payment information is encrypted and secure.</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
              <button onClick={handleBack} className="flex items-center gap-2 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm">
                <FaChevronLeft className="w-3 h-3" /> Back
              </button>

              {currentStep < 4 ? (
                <button onClick={handleNext} className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm">
                  Continue <FaChevronRight className="w-3 h-3" />
                </button>
              ) : (
                // Only show "Complete Booking" button if NOT using PayPal/Credit Card with "Pay Now"
                // For PayPal/Credit Card with "Pay Now", the PayPal buttons handle the payment
                !(paymentTiming === 'now' && (paymentMethod === 'paypal' || paymentMethod === 'creditcard')) && (
                  <button
                    onClick={handleCompleteBooking}
                    disabled={processing || (paymentMethod === 'wallet' && walletBalance < finalTotal)}
                    className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing ? 'Processing...' : 'Complete Booking'}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </PayPalScriptProvider>
  );
};

export default PaymentProcessing;
