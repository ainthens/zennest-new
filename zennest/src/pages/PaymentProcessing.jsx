// PaymentProcessing.jsx - Multi-step payment flow
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, getDoc, setDoc, collection, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
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
  FaInfoCircle
} from 'react-icons/fa';

const PaymentProcessing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get booking data from location state or sessionStorage
  const getBookingData = () => {
    if (location.state?.bookingData) {
      return location.state.bookingData;
    }
    try {
      const stored = sessionStorage.getItem('bookingData');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  };
  
  const bookingData = getBookingData();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [listing, setListing] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  
  // Step 1: Choose when to pay
  const [paymentTiming, setPaymentTiming] = useState('now'); // 'now' or 'later'
  
  // Step 2: Payment method
  const [paymentMethod, setPaymentMethod] = useState('wallet'); // 'wallet' or 'paypal'
  const [paypalEmail, setPaypalEmail] = useState('');
  
  // Step 3: Message to host
  const [messageToHost, setMessageToHost] = useState('');
  
  // Step 4: Review (calculated values)
  const [totalAmount, setTotalAmount] = useState(0);
  const [serviceFee, setServiceFee] = useState(0);
  const [finalTotal, setFinalTotal] = useState(0);

  useEffect(() => {
    if (!user?.uid) {
      navigate('/login');
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

    if (!finalBookingData || !finalBookingData.listingId) {
      console.error('No booking data found. State:', location.state?.bookingData, 'SessionStorage:', sessionStorage.getItem('bookingData'));
      alert('Booking information is missing. Please try again from the listing page.');
      navigate('/homestays');
      return;
    }

    fetchData(finalBookingData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const fetchData = async (dataToUse = null) => {
    try {
      setLoading(true);
      
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
        alert('Booking information is missing. Please try again from the listing page.');
        navigate('/homestays');
        return;
      }
      
      // Fetch listing details
      const listingRef = doc(db, 'listings', data.listingId);
      const listingSnap = await getDoc(listingRef);
      if (listingSnap.exists()) {
        const listingData = { id: listingSnap.id, ...listingSnap.data() };
        setListing(listingData);
        
        // Fetch wallet balance
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

        // Calculate totals
        calculateTotals(data, listingData);
      } else {
        alert('Listing not found. Please try again.');
        navigate('/homestays');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to load booking information. Please try again.');
      navigate('/homestays');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = (data, listingData = null) => {
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
    
    const fee = Math.round(subtotal * 0.05);
    const total = subtotal + fee;
    
    setTotalAmount(subtotal);
    setServiceFee(fee);
    setFinalTotal(total);
  };

  const handleNext = () => {
    if (currentStep === 1) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // Validate payment method
      if (paymentMethod === 'paypal' && !paypalEmail.trim()) {
        alert('Please enter your PayPal email address');
        return;
      }
      if (paymentMethod === 'wallet' && walletBalance < finalTotal) {
        alert('Insufficient wallet balance. Please top up your wallet or use PayPal.');
        return;
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

    try {
      setProcessing(true);

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
        paymentMethod: paymentMethod,
        paymentTiming: paymentTiming,
        paypalEmail: paymentMethod === 'paypal' ? paypalEmail : null,
        checkIn: finalBookingData.checkIn || null,
        checkOut: finalBookingData.checkOut || null,
        guests: finalBookingData.guests || 1,
        nights: finalBookingData.nights || 0,
        subtotal: totalAmount,
        serviceFee: serviceFee,
        total: finalTotal,
        messageToHost: messageToHost.trim() || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const bookingRef = await addDoc(bookingsRef, bookingDoc);

      // Process payment if paying now
      if (paymentTiming === 'now') {
        if (paymentMethod === 'wallet') {
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
            bookingId: bookingRef.id,
            createdAt: serverTimestamp()
          });

          // Update booking status
          await updateDoc(bookingRef, {
            paymentStatus: 'completed',
            status: 'confirmed'
          });
        } else if (paymentMethod === 'paypal') {
          // In a real app, you would integrate with PayPal API here
          // For now, we'll mark it as pending and update later
          await updateDoc(bookingRef, {
            paymentStatus: 'pending_paypal'
          });
        }
      }

      // Send message to host if provided
      if (messageToHost.trim()) {
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
      }

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
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between">
              {steps.map((step, idx) => (
                <React.Fragment key={step.number}>
                  <div className="flex flex-col items-center flex-1">
                    <div className={`
                      w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm transition-all
                      ${currentStep >= step.number 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-gray-200 text-gray-500'
                      }
                    `}>
                      {currentStep > step.number ? (
                        <FaCheckCircle className="w-6 h-6" />
                      ) : (
                        <step.icon className="w-6 h-6" />
                      )}
                    </div>
                    <span className={`text-xs mt-2 font-medium ${
                      currentStep >= step.number ? 'text-emerald-600' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </span>
                  </div>
                  {idx < steps.length - 1 && (
                    <div className={`flex-1 h-1 mx-2 ${
                      currentStep > step.number ? 'bg-emerald-600' : 'bg-gray-200'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 lg:p-8">
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
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Payment Method</h2>
                    <p className="text-gray-600">Choose how you'd like to pay</p>
                  </div>

                  <div className="space-y-4">
                    <button
                      onClick={() => setPaymentMethod('wallet')}
                      className={`w-full p-6 rounded-xl border-2 transition-all text-left ${
                        paymentMethod === 'wallet'
                          ? 'border-emerald-600 bg-emerald-50'
                          : 'border-gray-200 hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
                          paymentMethod === 'wallet' ? 'border-emerald-600 bg-emerald-600' : 'border-gray-300'
                        }`}>
                          {paymentMethod === 'wallet' && <FaCheckCircle className="w-4 h-4 text-white" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                              <FaWallet className="text-emerald-600" />
                              Wallet
                            </h3>
                            <span className="text-sm font-semibold text-gray-700">
                              ₱{walletBalance.toLocaleString()} available
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            Use your wallet balance to pay instantly
                          </p>
                          {walletBalance < finalTotal && paymentMethod === 'wallet' && (
                            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <p className="text-xs text-yellow-800 flex items-center gap-2">
                                <FaInfoCircle />
                                Insufficient balance. You need ₱{(finalTotal - walletBalance).toLocaleString()} more.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setPaymentMethod('paypal')}
                      className={`w-full p-6 rounded-xl border-2 transition-all text-left ${
                        paymentMethod === 'paypal'
                          ? 'border-emerald-600 bg-emerald-50'
                          : 'border-gray-200 hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
                          paymentMethod === 'paypal' ? 'border-emerald-600 bg-emerald-600' : 'border-gray-300'
                        }`}>
                          {paymentMethod === 'paypal' && <FaCheckCircle className="w-4 h-4 text-white" />}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-1">
                            <FaPaypal className="text-blue-600" />
                            PayPal
                          </h3>
                          <p className="text-sm text-gray-600">
                            Pay securely with PayPal
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>

                  {paymentMethod === 'paypal' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-4"
                    >
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        PayPal Email Address
                      </label>
                      <input
                        type="email"
                        value={paypalEmail}
                        onChange={(e) => setPaypalEmail(e.target.value)}
                        placeholder="your.email@example.com"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-emerald-500 focus:outline-none"
                      />
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
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Message to Host</h2>
                    <p className="text-gray-600">Let your host know about your stay (optional)</p>
                  </div>

                  <div>
                    <textarea
                      value={messageToHost}
                      onChange={(e) => setMessageToHost(e.target.value)}
                      placeholder="Hi! I'm looking forward to staying at your place. I'll be arriving around 3 PM..."
                      rows={6}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-emerald-500 focus:outline-none resize-none"
                    />
                    <p className="text-xs text-gray-500 mt-2">
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
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Your Booking</h2>
                    <p className="text-gray-600">Please review all details before confirming</p>
                  </div>

                  {/* Listing Summary */}
                  <div className="bg-slate-50 rounded-xl p-6 border border-gray-200">
                    <div className="flex gap-4 mb-4">
                      {listing.images && listing.images[0] && (
                        <img
                          src={listing.images[0]}
                          alt={listing.title}
                          className="w-24 h-24 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 mb-1">{listing.title}</h3>
                        <p className="text-sm text-gray-600">{listing.location}</p>
                        <p className="text-xs text-gray-500 mt-1 capitalize">{listing.category}</p>
                      </div>
                    </div>

                    <div className="space-y-2 pt-4 border-t border-gray-200">
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
                  <div className="bg-slate-50 rounded-xl p-6 border border-gray-200">
                    <h3 className="font-bold text-gray-900 mb-4">Payment Summary</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="font-medium text-gray-900">₱{totalAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Service fee</span>
                        <span className="font-medium text-gray-900">₱{serviceFee.toLocaleString()}</span>
                      </div>
                      <div className="pt-3 border-t border-gray-300 flex justify-between">
                        <span className="font-bold text-gray-900">Total</span>
                        <span className="font-bold text-emerald-600 text-lg">₱{finalTotal.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div className="bg-slate-50 rounded-xl p-6 border border-gray-200">
                    <h3 className="font-bold text-gray-900 mb-4">Payment Details</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Payment Timing</span>
                        <span className="font-medium text-gray-900 capitalize">
                          {paymentTiming === 'now' ? 'Pay Now' : 'Pay Later'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Payment Method</span>
                        <span className="font-medium text-gray-900 capitalize flex items-center gap-2">
                          {paymentMethod === 'wallet' ? (
                            <>
                              <FaWallet className="text-emerald-600" />
                              Wallet
                            </>
                          ) : (
                            <>
                              <FaPaypal className="text-blue-600" />
                              PayPal
                            </>
                          )}
                        </span>
                      </div>
                      {paymentMethod === 'paypal' && paypalEmail && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">PayPal Email</span>
                          <span className="font-medium text-gray-900">{paypalEmail}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Message Preview */}
                  {messageToHost.trim() && (
                    <div className="bg-slate-50 rounded-xl p-6 border border-gray-200">
                      <h3 className="font-bold text-gray-900 mb-2">Message to Host</h3>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{messageToHost}</p>
                    </div>
                  )}

                  {/* Security Notice */}
                  <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <FaShieldAlt className="text-emerald-600 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-900">Secure Payment</p>
                      <p className="text-xs text-emerald-700 mt-1">
                        Your payment information is encrypted and secure. We never store your full payment details.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
              >
                <FaChevronLeft className="w-4 h-4" />
                Back
              </button>

              {currentStep < 4 ? (
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-semibold"
                >
                  Continue
                  <FaChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleCompleteBooking}
                  disabled={processing || (paymentMethod === 'wallet' && walletBalance < finalTotal)}
                  className="flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <FaLock className="w-4 h-4" />
                      Confirm Booking
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PaymentProcessing;

