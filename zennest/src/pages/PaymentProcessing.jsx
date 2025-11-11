// PaymentProcessing.jsx - Multi-step payment flow
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { doc, getDoc, setDoc, collection, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
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

const PaymentProcessing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get booking data from location state or sessionStorage
  const getBookingData = () => {
    // First try location state
    if (location.state?.bookingData) {
      console.log('📦 Booking data from location state:', location.state.bookingData);
      return location.state.bookingData;
    }
    // Fallback to sessionStorage
    try {
      const stored = sessionStorage.getItem('bookingData');
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('💾 Booking data from sessionStorage:', parsed);
        return parsed;
      }
    } catch (error) {
      console.error('❌ Error reading booking data from sessionStorage:', error);
    }
    console.warn('⚠️ No booking data found in state or sessionStorage');
    return null;
  };
  
  const bookingData = getBookingData();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [listing, setListing] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [pendingBookingId, setPendingBookingId] = useState(null); // Store booking ID for PayPal flow
  
  // Step 1: Choose when to pay
  const [paymentTiming, setPaymentTiming] = useState('now'); // 'now' or 'later'
  
  // Step 2: Payment method
  const [paymentMethod, setPaymentMethod] = useState('wallet'); // 'wallet', 'paypal', or 'creditcard'
  const [paypalEmail, setPaypalEmail] = useState('');
  
  // Step 3: Message to host
  const [messageToHost, setMessageToHost] = useState('');
  
  // Promo code
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromoCode, setAppliedPromoCode] = useState(null);
  const [promoCodeError, setPromoCodeError] = useState('');
  const [validatingPromoCode, setValidatingPromoCode] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);
  
  // Step 4: Review (calculated values)
  const [totalAmount, setTotalAmount] = useState(0);
  const [serviceFee, setServiceFee] = useState(0);
  const [finalTotal, setFinalTotal] = useState(0);

  useEffect(() => {
    // RequireGuestAuth already handles authentication, but ensure user is available before fetching
    if (!user?.uid) {
      return;
    }

    // Try to get booking data from state first, then from sessionStorage as fallback
    let finalBookingData = bookingData;
    
    if (!finalBookingData) {
      try {
        const storedData = sessionStorage.getItem('bookingData');
        if (storedData) {
          finalBookingData = JSON.parse(storedData);
        }
      } catch (error) {
        console.error('Error reading booking data from sessionStorage:', error);
      }
    }

    // Only fetch data if we have booking data and user is available, otherwise let the component render the error message
    if (finalBookingData && finalBookingData.listingId && user?.uid) {
      fetchData(finalBookingData);
    } else if (!finalBookingData || !finalBookingData.listingId) {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const fetchData = async (dataToUse = null) => {
    try {
      setLoading(true);
      
      // Ensure user is available
      if (!user?.uid) {
        console.error('User not available when fetching data');
        setLoading(false);
        return;
      }
      
      // Use provided data or fallback to bookingData from state
      const data = dataToUse || bookingData || (() => {
        try {
          const stored = sessionStorage.getItem('bookingData');
          return stored ? JSON.parse(stored) : null;
        } catch {
          return null;
        }
      })();
      
      if (!data || !data.listingId) {
        console.error('Missing booking data:', { data, listingId: data?.listingId });
        setLoading(false);
        return;
      }
      
      // Fetch listing details
      const listingRef = doc(db, 'listings', data.listingId);
      const listingSnap = await getDoc(listingRef);
      
      if (!listingSnap.exists()) {
        console.error('Listing not found:', data.listingId);
        alert('Listing not found. Please try again.');
        setLoading(false);
        navigate('/homestays');
        return;
      }
      
      const listingData = { id: listingSnap.id, ...listingSnap.data() };
      setListing(listingData);
      
      // Fetch wallet balance
      try {
        const walletRef = doc(db, 'wallets', user.uid);
        const walletSnap = await getDoc(walletRef);
        if (walletSnap.exists()) {
          setWalletBalance(walletSnap.data().balance || 0);
        } else {
          // Create wallet if it doesn't exist
          await setDoc(walletRef, {
            userId: user.uid,
            balance: 0,
            currency: 'PHP',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          setWalletBalance(0);
        }
      } catch (walletError) {
        console.error('Error fetching/creating wallet:', walletError);
        // Don't block the flow if wallet fails, just set balance to 0
        setWalletBalance(0);
      }

      // Calculate totals
      calculateTotals(data, listingData);
    } catch (error) {
      console.error('Error fetching data:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      alert(`Failed to load booking information: ${error.message || 'Please try again.'}`);
      setLoading(false);
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
    
    // Apply promo code discount
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
          const stored = sessionStorage.getItem('bookingData');
          return stored ? JSON.parse(stored) : null;
        } catch {
          return null;
        }
      })();

      if (!currentBookingData) {
        setPromoCodeError('Booking data not found');
        setValidatingPromoCode(false);
        return;
      }

      // Calculate current subtotal
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
        calculateTotals(currentBookingData, listing, result.discountAmount);
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
        const stored = sessionStorage.getItem('bookingData');
        return stored ? JSON.parse(stored) : null;
      } catch {
        return null;
      }
    })();
    if (currentBookingData && listing) {
      calculateTotals(currentBookingData, listing, 0);
    }
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // Validate payment method
      if ((paymentMethod === 'paypal' || paymentMethod === 'creditcard') && !paypalEmail.trim()) {
        alert(paymentMethod === 'creditcard' ? 'Please enter your email address for payment confirmation' : 'Please enter your PayPal email address');
        return;
      }
      if (paymentMethod === 'wallet' && walletBalance < finalTotal) {
        alert('Insufficient wallet balance. Please top up your wallet or use another payment method.');
        return;
      }
      // Credit card and PayPal both use PayPal payment processor
      // No additional validation needed for credit card
      // Recalculate totals when moving to next step to ensure promo code is still valid
      if (appliedPromoCode) {
        const currentBookingData = bookingData || (() => {
          try {
            const stored = sessionStorage.getItem('bookingData');
            return stored ? JSON.parse(stored) : null;
          } catch {
            return null;
          }
        })();
        if (currentBookingData && listing) {
          await handleApplyPromoCode();
        }
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigate(-1);
    }
  };

  const createBooking = async () => {
    const finalBookingData = currentBookingData || bookingData;
    
    if (!user?.uid || !listing || !finalBookingData) {
      throw new Error('Missing booking information. Please try again.');
    }

    // Create booking document
    const bookingsRef = collection(db, 'bookings');
    const bookingDoc = {
      guestId: user.uid,
      hostId: listing.hostId,
      listingId: listing.id,
      listingTitle: listing.title,
      listingCategory: listing.category,
      status: paymentTiming === 'now' ? 'pending' : 'reserved',
      paymentStatus: paymentTiming === 'now' ? 'pending' : 'scheduled',
      paymentMethod: paymentMethod === 'creditcard' ? 'paypal' : paymentMethod, // Credit card uses PayPal processor
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
    // Deduct from wallet
    const walletRef = doc(db, 'wallets', user.uid);
    const newBalance = walletBalance - finalTotal;
    await updateDoc(walletRef, {
      balance: newBalance,
      updatedAt: serverTimestamp()
    });

    // Create transaction record
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

    // Update booking status
    const bookingRef = doc(db, 'bookings', bookingId);
    await updateDoc(bookingRef, {
      paymentStatus: 'completed',
      status: 'confirmed',
      updatedAt: serverTimestamp()
    });
  };

  const handlePayPalSuccess = async (paymentId) => {
    try {
      setProcessing(true);
      
      if (!pendingBookingId) {
        throw new Error('Booking ID not found');
      }

      // Update booking status
      const bookingRef = doc(db, 'bookings', pendingBookingId);
      await updateDoc(bookingRef, {
        paymentStatus: 'completed',
        status: 'confirmed',
        paypalPaymentId: paymentId,
        updatedAt: serverTimestamp()
      });

      // Update promo code usage if applied
      if (appliedPromoCode && appliedPromoCode.id) {
        try {
          await updateCoupon(appliedPromoCode.id, {
            usageCount: (appliedPromoCode.usageCount || 0) + 1
          });
        } catch (error) {
          console.error('Error updating promo code usage:', error);
        }
      }

      // Create transaction record
      const transactionsRef = collection(db, 'transactions');
      await addDoc(transactionsRef, {
        userId: user.uid,
        type: 'payment',
        amount: finalTotal,
        status: 'completed',
        description: `Booking payment for ${listing.title}`,
        paymentMethod: 'paypal',
        bookingId: pendingBookingId,
        paypalPaymentId: paymentId,
        createdAt: serverTimestamp()
      });

      // Transfer payment to host (subtract service fee)
      const hostAmount = totalAmount - promoDiscount; // Host receives subtotal minus promo discount
      try {
        await transferPaymentToHost(listing.hostId, hostAmount, pendingBookingId, listing.title);
        console.log('✅ Payment transferred to host');
      } catch (transferError) {
        console.error('❌ Error transferring payment to host:', transferError);
        // Don't block the flow if transfer fails - can be handled manually
      }

      // Send booking confirmation emails
      await sendBookingConfirmationEmails(pendingBookingId);

      // Send message to host if provided
      await sendMessageToHost(pendingBookingId);

      // Success - redirect to bookings page
      navigate('/bookings', { 
        state: { 
          success: true, 
          message: 'Booking confirmed! Payment processed successfully.' 
        } 
      });
    } catch (error) {
      console.error('Error completing PayPal payment:', error);
      alert('Payment processed but failed to confirm booking. Please contact support.');
    } finally {
      setProcessing(false);
    }
  };

  const sendMessageToHost = async (bookingId) => {
    if (!messageToHost.trim() || !listing || !user?.uid) return;

    try {
      const bookingRef = doc(db, 'bookings', bookingId);
      const bookingSnap = await getDoc(bookingRef);
      if (!bookingSnap.exists()) return;

      const bookingData = bookingSnap.data();
      
      // Create or get conversation
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

      // Send message
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

      // Update conversation
      await updateDoc(conversationRef, {
        lastMessage: messageToHost.trim(),
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        [`unreadCount.${listing.hostId}`]: (conversationSnap.data()?.unreadCount?.[listing.hostId] || 0) + 1
      });
    } catch (error) {
      console.error('Error sending message to host:', error);
      // Don't block the flow if message fails
    }
  };

  // Send booking confirmation emails to guest and host
  const sendBookingConfirmationEmails = async (bookingId) => {
    try {
      const finalBookingData = currentBookingData || bookingData;
      
      // Get booking details
      const bookingRef = doc(db, 'bookings', bookingId);
      const bookingSnap = await getDoc(bookingRef);
      if (!bookingSnap.exists()) return;

      const booking = bookingSnap.data();

      // Get guest email (from Firebase Auth user)
      const guestEmail = user?.email || '';
      const guestName = user?.displayName || user?.email?.split('@')[0] || 'Guest';

      // Get host email and name
      let hostEmail = '';
      let hostName = '';
      try {
        const hostResult = await getHostProfile(listing.hostId);
        if (hostResult.success && hostResult.data) {
          const hostData = hostResult.data;
          hostEmail = hostData.email || '';
          hostName = hostData.firstName && hostData.lastName 
            ? `${hostData.firstName} ${hostData.lastName}` 
            : hostData.firstName || hostData.email?.split('@')[0] || 'Host';
        }
      } catch (error) {
        console.error('Error fetching host profile for email:', error);
      }

      // Prepare email data
      const emailData = {
        guestEmail,
        guestName,
        hostEmail,
        hostName,
        listingTitle: listing.title || 'Listing',
        listingLocation: listing.location || 'Location not specified',
        checkIn: finalBookingData.checkIn ? new Date(finalBookingData.checkIn) : null,
        checkOut: finalBookingData.checkOut ? new Date(finalBookingData.checkOut) : null,
        guests: finalBookingData.guests || 1,
        nights: finalBookingData.nights || 0,
        totalAmount: finalTotal,
        bookingId: bookingId,
        category: listing.category || 'booking'
      };

      // Send emails (non-blocking)
      sendBookingConfirmationEmail(emailData).catch(error => {
        console.error('Error sending booking confirmation email:', error);
        // Don't block the flow if email fails
      });
    } catch (error) {
      console.error('Error preparing booking confirmation emails:', error);
      // Don't block the flow if email fails
    }
  };

  const handleCompleteBooking = async () => {
    const finalBookingData = currentBookingData || bookingData;
    
    if (!user?.uid || !listing || !finalBookingData) {
      alert('Missing booking information. Please try again.');
      return;
    }

    // Validate payment
    if (paymentMethod === 'wallet' && walletBalance < finalTotal) {
      alert('Insufficient wallet balance. Please top up your wallet.');
      return;
    }

    // For PayPal or Credit Card, create booking first and show PayPal buttons
    if ((paymentMethod === 'paypal' || paymentMethod === 'creditcard') && paymentTiming === 'now') {
      try {
        setProcessing(true);
        const bookingId = await createBooking();
        setPendingBookingId(bookingId);
        setProcessing(false);
        // PayPalButtons will handle the payment
        return;
      } catch (error) {
        console.error('Error creating booking:', error);
        alert('Failed to create booking. Please try again.');
        setProcessing(false);
        return;
      }
    }

    // For wallet payment or pay later, process immediately
    try {
      setProcessing(true);

      const bookingId = await createBooking();

      // Process payment if paying now
      if (paymentTiming === 'now' && paymentMethod === 'wallet') {
        await completeWalletPayment(bookingId);

        // Transfer payment to host (subtract service fee)
        const hostAmount = totalAmount - promoDiscount; // Host receives subtotal minus promo discount
        try {
          await transferPaymentToHost(listing.hostId, hostAmount, bookingId, listing.title);
          console.log('✅ Payment transferred to host');
        } catch (transferError) {
          console.error('❌ Error transferring payment to host:', transferError);
          // Don't block the flow if transfer fails - can be handled manually
        }
      }

      // Update promo code usage if applied
      if (appliedPromoCode && appliedPromoCode.id) {
        try {
          await updateCoupon(appliedPromoCode.id, {
            usageCount: (appliedPromoCode.usageCount || 0) + 1
          });
        } catch (error) {
          console.error('Error updating promo code usage:', error);
          // Don't fail the booking if promo code update fails
        }
      }

      // Send booking confirmation emails (only if payment completed now)
      if (paymentTiming === 'now' && paymentMethod === 'wallet') {
        await sendBookingConfirmationEmails(bookingId);
      }

      // Send message to host if provided
      await sendMessageToHost(bookingId);

      // Success - redirect to bookings page
      navigate('/bookings', { 
        state: { 
          success: true, 
          message: paymentTiming === 'now' 
            ? 'Booking confirmed! Payment processed successfully.' 
            : 'Booking reserved! Payment will be processed on the scheduled date.' 
        } 
      });
    } catch (error) {
      console.error('Error completing booking:', error);
      alert('Failed to complete booking. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const createPayPalOrder = (data, actions) => {
    try {
      if (!pendingBookingId) {
        throw new Error('Booking not created yet');
      }
      
      if (!finalTotal || finalTotal <= 0) {
        throw new Error('Invalid payment amount');
      }
      
      console.log('Creating PayPal order:', {
        bookingId: pendingBookingId,
        amount: finalTotal,
        currency: 'PHP',
        listing: listing.title
      });
      
      return actions.order.create({
        purchase_units: [{
          amount: {
            value: finalTotal.toFixed(2),
            currency_code: 'PHP'
          },
          description: `Booking payment for ${listing.title}`,
          custom_id: pendingBookingId,
          item_list: {
            items: [{
              name: listing.title,
              quantity: '1',
              unit_amount: {
                value: finalTotal.toFixed(2),
                currency_code: 'PHP'
              }
            }]
          }
        }],
        application_context: {
          brand_name: 'Zennest',
          landing_page: 'BILLING',
          user_action: 'PAY_NOW'
          // Note: With PayPal SDK, payment is handled in-page via onApprove callback
          // No need for return_url/cancel_url as the SDK handles the flow automatically
        }
      });
    } catch (error) {
      console.error('Error creating PayPal order:', error);
      alert(error.message || 'Failed to create payment order. Please try again.');
      return Promise.reject(error);
    }
  };

  const onApprovePayPalOrder = (data, actions) => {
    return actions.order.capture().then((details) => {
      console.log('PayPal payment approved:', details);
      console.log('Payment details:', JSON.stringify(details, null, 2));
      
      if (details.status === 'COMPLETED') {
        // Verify payment amount matches
        const purchaseUnit = details.purchase_units?.[0];
        const amount = purchaseUnit?.amount;
        const paidAmount = amount?.value ? parseFloat(amount.value) : finalTotal;
        const currency = amount?.currency_code || 'PHP';
        
        console.log('Payment verification:', {
          expected: finalTotal,
          received: paidAmount,
          currency: currency,
          paymentId: details.id,
          orderId: data.orderID
        });
        
        // Verify amount is close to expected (allow small rounding differences)
        if (Math.abs(paidAmount - finalTotal) > 0.01) {
          console.warn(`Payment amount mismatch: Expected ${finalTotal}, received ${paidAmount}`);
          // Still proceed but log the discrepancy
        }
        
        handlePayPalSuccess(details.id);
      } else {
        console.error('Payment status not completed:', details.status);
        setProcessing(false);
        alert(`Payment was not completed. Status: ${details.status}. Please try again.`);
      }
    }).catch((error) => {
      console.error('PayPal payment error:', error);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      setProcessing(false);
      alert(`Payment failed: ${error.message || 'Please try again or contact support.'}`);
    });
  };

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

  // Get current booking data (might have been loaded from sessionStorage)
  const currentBookingData = bookingData || (() => {
    try {
      const stored = sessionStorage.getItem('bookingData');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
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

  const steps = [
    { number: 1, title: 'Payment Timing', icon: FaCalendar },
    { number: 2, title: 'Payment Method', icon: FaCreditCard },
    { number: 3, title: 'Message Host', icon: FaEnvelope },
    { number: 4, title: 'Review', icon: FaCheckCircle }
  ];

  return (
    <>
      <SettingsHeader />
      <div className="min-h-screen bg-slate-50 pt-20 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              {/* Step 1: Choose Payment Timing */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">When would you like to pay?</h2>
                    <p className="text-gray-600">Choose your preferred payment timing</p>
                  </div>

                  <div className="space-y-4">
                    <button
                      onClick={() => setPaymentTiming('now')}
                      className={`w-full p-6 rounded-xl border-2 transition-all text-left ${
                        paymentTiming === 'now'
                          ? 'border-emerald-600 bg-emerald-50'
                          : 'border-gray-200 hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
                          paymentTiming === 'now' ? 'border-emerald-600 bg-emerald-600' : 'border-gray-300'
                        }`}>
                          {paymentTiming === 'now' && <FaCheckCircle className="w-4 h-4 text-white" />}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 mb-1">Pay Now</h3>
                          <p className="text-sm text-gray-600">
                            Complete your payment immediately. Your booking will be confirmed right away.
                          </p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setPaymentTiming('later')}
                      className={`w-full p-6 rounded-xl border-2 transition-all text-left ${
                        paymentTiming === 'later'
                          ? 'border-emerald-600 bg-emerald-50'
                          : 'border-gray-200 hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
                          paymentTiming === 'later' ? 'border-emerald-600 bg-emerald-600' : 'border-gray-300'
                        }`}>
                          {paymentTiming === 'later' && <FaCheckCircle className="w-4 h-4 text-white" />}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 mb-1">Pay Later</h3>
                          <p className="text-sm text-gray-600">
                            Reserve your booking now. Payment will be processed automatically before check-in.
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Payment Method */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">Select Payment Method</h2>
                    <p className="text-sm text-gray-600">Choose how you'd like to pay</p>
                  </div>

                  {/* Promo Code Section */}
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
                          onChange={(e) => {
                            setPromoCode(e.target.value.toUpperCase());
                            setPromoCodeError('');
                          }}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleApplyPromoCode();
                            }
                          }}
                          placeholder="Enter promo code"
                          className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-500 focus:outline-none text-sm uppercase"
                          disabled={validatingPromoCode}
                        />
                        <button
                          onClick={handleApplyPromoCode}
                          disabled={validatingPromoCode || !promoCode.trim()}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {validatingPromoCode ? '...' : 'Apply'}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-emerald-300">
                        <div className="flex items-center gap-2">
                          <FaCheckCircle className="text-emerald-600" />
                          <span className="font-mono font-semibold text-emerald-700">{appliedPromoCode.code}</span>
                          <span className="text-sm text-gray-600">
                            - {appliedPromoCode.discount}{appliedPromoCode.discountType === 'percentage' ? '%' : '₱'} off
                          </span>
                        </div>
                        <button
                          onClick={handleRemovePromoCode}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                          title="Remove promo code"
                        >
                          <FaTimes className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {promoCodeError && (
                      <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                        <FaTimes className="w-3 h-3" />
                        {promoCodeError}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={() => setPaymentMethod('wallet')}
                      className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                        paymentMethod === 'wallet'
                          ? 'border-emerald-600 bg-emerald-50'
                          : 'border-gray-200 hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          paymentMethod === 'wallet' ? 'border-emerald-600 bg-emerald-600' : 'border-gray-300'
                        }`}>
                          {paymentMethod === 'wallet' && <FaCheckCircle className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                              <FaWallet className="text-emerald-600" />
                              Wallet
                            </h3>
                            <span className="text-xs font-semibold text-gray-700">
                              ₱{walletBalance.toLocaleString()} available
                            </span>
                          </div>
                          <p className="text-xs text-gray-600">
                            Use your wallet balance to pay instantly
                          </p>
                          {walletBalance < finalTotal && paymentMethod === 'wallet' && (
                            <div className="mt-1.5 p-1.5 bg-yellow-50 border border-yellow-200 rounded text-xs">
                              <p className="text-yellow-800 flex items-center gap-1">
                                <FaInfoCircle className="w-3 h-3" />
                                Need ₱{(finalTotal - walletBalance).toLocaleString()} more
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setPaymentMethod('paypal')}
                      className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                        paymentMethod === 'paypal'
                          ? 'border-emerald-600 bg-emerald-50'
                          : 'border-gray-200 hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          paymentMethod === 'paypal' ? 'border-emerald-600 bg-emerald-600' : 'border-gray-300'
                        }`}>
                          {paymentMethod === 'paypal' && <FaCheckCircle className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm mb-1">
                            <FaPaypal className="text-yellow-500" />
                            PayPal
                          </h3>
                          <p className="text-xs text-gray-600">
                            Pay securely with PayPal
                          </p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setPaymentMethod('creditcard')}
                      className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                        paymentMethod === 'creditcard'
                          ? 'border-emerald-600 bg-emerald-50'
                          : 'border-gray-200 hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          paymentMethod === 'creditcard' ? 'border-emerald-600 bg-emerald-600' : 'border-gray-300'
                        }`}>
                          {paymentMethod === 'creditcard' && <FaCheckCircle className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm mb-1">
                            <FaCreditCard className="text-gray-700" />
                            Credit Card
                          </h3>
                          <p className="text-xs text-gray-600">
                            Pay with Visa, Mastercard, or other cards
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>

                  {(paymentMethod === 'paypal' || paymentMethod === 'creditcard') && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3"
                    >
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        {paymentMethod === 'creditcard' ? 'Email Address' : 'PayPal Email Address'}
                      </label>
                      <input
                        type="email"
                        value={paypalEmail}
                        onChange={(e) => setPaypalEmail(e.target.value)}
                        placeholder="your.email@example.com"
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-500 focus:outline-none text-sm"
                      />
                      {paymentMethod === 'creditcard' && (
                        <p className="mt-2 text-xs text-blue-600 flex items-start gap-1">
                          <FaInfoCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span>Credit card payments are processed securely through PayPal. You'll complete payment in the next step.</span>
                        </p>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* Step 3: Message to Host */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">Message to Host</h2>
                    <p className="text-sm text-gray-600">Let your host know about your stay (optional)</p>
                  </div>

                  <div>
                    <textarea
                      value={messageToHost}
                      onChange={(e) => setMessageToHost(e.target.value)}
                      placeholder="Hi! I'm looking forward to staying at your place. I'll be arriving around 3 PM..."
                      rows={5}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-500 focus:outline-none resize-none text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1.5">
                      {messageToHost.length} characters
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Review */}
              {currentStep === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">Review Your Booking</h2>
                    <p className="text-sm text-gray-600">Please review all details before confirming</p>
                  </div>

                  {/* Listing Summary */}
                  <div className="bg-slate-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex gap-3 mb-3">
                      {listing.images && listing.images[0] && (
                        <img
                          src={listing.images[0]}
                          alt={listing.title}
                          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 mb-0.5 text-sm truncate">{listing.title}</h3>
                        <p className="text-xs text-gray-600 truncate">{listing.location}</p>
                        <p className="text-xs text-gray-500 mt-0.5 capitalize">{listing.category}</p>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-3 border-t border-gray-200">
                      {listing.category === 'home' && currentBookingData.checkIn && currentBookingData.checkOut && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Check-in</span>
                            <span className="font-medium text-gray-900">
                              {new Date(currentBookingData.checkIn).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Check-out</span>
                            <span className="font-medium text-gray-900">
                              {new Date(currentBookingData.checkOut).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Nights</span>
                            <span className="font-medium text-gray-900">{currentBookingData.nights || 0}</span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Guests</span>
                        <span className="font-medium text-gray-900">{currentBookingData.guests || 1}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Summary */}
                  <div className="bg-slate-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-3 text-sm">Payment Summary</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="font-medium text-gray-900">₱{totalAmount.toLocaleString()}</span>
                      </div>
                      {appliedPromoCode && promoDiscount > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600 flex items-center gap-1">
                            <FaTag className="text-emerald-600" />
                            Promo Code ({appliedPromoCode.code})
                          </span>
                          <span className="font-medium text-emerald-600">-₱{promoDiscount.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Service fee</span>
                        <span className="font-medium text-gray-900">₱{serviceFee.toLocaleString()}</span>
                      </div>
                      <div className="pt-2 border-t border-gray-300 flex justify-between">
                        <span className="font-bold text-gray-900 text-sm">Total</span>
                        <span className="font-bold text-emerald-600 text-base">₱{finalTotal.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div className="bg-slate-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-3 text-sm">Payment Details</h3>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Payment Timing</span>
                        <span className="font-medium text-gray-900 capitalize">
                          {paymentTiming === 'now' ? 'Pay Now' : 'Pay Later'}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Payment Method</span>
                        <span className="font-medium text-gray-900 capitalize flex items-center gap-1.5">
                          {paymentMethod === 'wallet' ? (
                            <>
                              <FaWallet className="text-emerald-600 w-3 h-3" />
                              Wallet
                            </>
                          ) : paymentMethod === 'creditcard' ? (
                            <>
                              <FaCreditCard className="text-gray-700 w-3 h-3" />
                              Credit Card
                            </>
                          ) : (
                            <>
                              <FaPaypal className="text-yellow-500 w-3 h-3" />
                              PayPal
                            </>
                          )}
                        </span>
                      </div>
                      {(paymentMethod === 'paypal' || paymentMethod === 'creditcard') && paypalEmail && (
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">{paymentMethod === 'creditcard' ? 'Email' : 'PayPal Email'}</span>
                          <span className="font-medium text-gray-900 truncate ml-2">{paypalEmail}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Message Preview */}
                  {messageToHost.trim() && (
                    <div className="bg-slate-50 rounded-lg p-4 border border-gray-200">
                      <h3 className="font-semibold text-gray-900 mb-2 text-sm">Message to Host</h3>
                      <p className="text-xs text-gray-700 whitespace-pre-wrap">{messageToHost}</p>
                    </div>
                  )}

                  {/* Security Notice */}
                  <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <FaShieldAlt className="text-emerald-600 mt-0.5 flex-shrink-0 w-4 h-4" />
                    <div>
                      <p className="text-xs font-semibold text-emerald-900">Secure Payment</p>
                      <p className="text-xs text-emerald-700 mt-0.5">
                        Your payment information is encrypted and secure.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
              >
                <FaChevronLeft className="w-3 h-3" />
                Back
              </button>

              {currentStep < 4 ? (
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm"
                >
                  Continue
                  <FaChevronRight className="w-3 h-3" />
                </button>
              ) : (
                <>
                  {(paymentMethod === 'paypal' || paymentMethod === 'creditcard') && paymentTiming === 'now' && pendingBookingId ? (
                    <div className="w-full">
                      {import.meta.env.VITE_PAYPAL_CLIENT_ID && import.meta.env.VITE_PAYPAL_CLIENT_ID !== 'your-paypal-client-id-here' ? (
                        <PayPalScriptProvider
                          options={{
                            'client-id': import.meta.env.VITE_PAYPAL_CLIENT_ID,
                            currency: 'PHP',
                            intent: 'capture',
                            components: 'buttons,card'
                            // PayPal automatically detects sandbox vs live based on client ID
                            // Sandbox client IDs have specific patterns that PayPal recognizes
                          }}
                        >
                          <PayPalButtons
                            createOrder={createPayPalOrder}
                            onApprove={onApprovePayPalOrder}
                            onError={(err) => {
                              console.error('PayPal error:', err);
                              setProcessing(false);
                              alert(`Payment failed: ${err.message || 'Please try again.'}`);
                            }}
                            onCancel={(data) => {
                              console.log('PayPal payment cancelled:', data);
                              setProcessing(false);
                              setPendingBookingId(null);
                            }}
                            style={{
                              layout: 'vertical',
                              shape: 'rect',
                              label: paymentMethod === 'creditcard' ? 'pay' : 'paypal',
                              color: 'gold',
                              height: 45
                            }}
                            fundingSource={paymentMethod === 'creditcard' ? undefined : 'paypal'}
                          />
                        </PayPalScriptProvider>
                      ) : (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                          <p className="text-sm font-semibold text-yellow-800 mb-2">
                            ⚠️ PayPal Client ID not configured
                          </p>
                          <p className="text-xs text-yellow-700 mb-2">
                            Please add VITE_PAYPAL_CLIENT_ID to your environment variables.
                          </p>
                          <p className="text-xs text-yellow-600">
                            For Netlify: Go to Site settings → Environment variables → Add VITE_PAYPAL_CLIENT_ID
                          </p>
                        </div>
                      )}
                      <button
                        onClick={() => {
                          setPendingBookingId(null);
                          setProcessing(false);
                        }}
                        className="w-full mt-3 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
                      >
                        Cancel Payment
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleCompleteBooking}
                      disabled={processing || (paymentMethod === 'wallet' && walletBalance < finalTotal)}
                      className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <FaLock className="w-3.5 h-3.5" />
                          Confirm Booking
                        </>
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PaymentProcessing;

