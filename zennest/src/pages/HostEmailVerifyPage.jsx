import React, { useState, useLayoutEffect, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { createHostProfile, getHostProfile, updateUserProfile, getGuestProfile } from '../services/firestoreService';
import { verifyOTP, resendOTP } from '../services/emailService';
import { getAuthErrorMessage } from '../utils/firebaseErrors';
import Logo from '../assets/zennest-logo-v2.svg';
import {
  FaEnvelope,
  FaArrowLeft,
  FaCheckCircle,
  FaClock,
  FaShieldAlt,
  FaHome,
  FaHeadset,
  FaExclamationCircle,
  FaTimes,
  FaLock,
  FaStar,
  FaChartLine,
  FaUsers
} from 'react-icons/fa';

const HostEmailVerifyPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { firstName, lastName, email, password, phone, subscriptionPlan, otp, userName, paymentCompleted } = location.state || {};

  const [inputOtp, setInputOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('idle');
  const [resending, setResending] = useState(false);
  const [showErrorNotification, setShowErrorNotification] = useState(false);
  const [progress, setProgress] = useState(100);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);

  // Check subscription status if paymentCompleted flag is set or user is logged in
  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      // If paymentCompleted flag is passed, show congratulations
      if (paymentCompleted) {
        setStatus('completed');
        return;
      }

      // If user is logged in, check their subscription status
      const user = auth.currentUser;
      if (user) {
        try {
          const hostResult = await getHostProfile(user.uid);
          if (hostResult.success && hostResult.data) {
            const status = hostResult.data.subscriptionStatus;
            setSubscriptionStatus(status);
            // If subscription is active, show congratulations screen
            if (status === 'active') {
              setStatus('completed');
            }
          }
        } catch (error) {
          console.error('Error checking subscription status:', error);
        }
      }
    };

    checkSubscriptionStatus();
  }, [paymentCompleted]);

  // Auto-hide error notification
  React.useEffect(() => {
    if (error) {
      setShowErrorNotification(true);
      setProgress(100);
      
      const duration = 5000;
      const interval = 16;
      const decrement = (100 / duration) * interval;
      
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          const next = prev - decrement;
          return next <= 0 ? 0 : next;
        });
      }, interval);

      const timer = setTimeout(() => {
        setShowErrorNotification(false);
        setTimeout(() => {
          setError("");
          setProgress(100);
        }, 300);
      }, duration);

      return () => {
        clearTimeout(timer);
        clearInterval(progressInterval);
      };
    }
  }, [error]);

  useLayoutEffect(() => {
    document.body.classList.add("hide-header");
    return () => document.body.classList.remove("hide-header");
  }, []);

  // Handle OTP input with auto-focus
  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...inputOtp];
    newOtp[index] = value;
    setInputOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !inputOtp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = pastedData.split('').concat(Array(6).fill('')).slice(0, 6);
    setInputOtp(newOtp);
    
    // Focus last filled input or first empty
    const lastIndex = Math.min(pastedData.length, 5);
    const targetInput = document.getElementById(`otp-${lastIndex}`);
    if (targetInput) targetInput.focus();
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setStatus('verifying');
    
    const otpValue = inputOtp.join('');
    
    if (otpValue.length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      setStatus('idle');
      return;
    }
    // Use email from state or fallback to logged-in user's email
    const emailToVerify = email || (auth.currentUser?.email || '');
    if (!emailToVerify) {
      setError('Missing email address. Please register again.');
      setStatus('idle');
      return;
    }
    try {
      const otpResult = verifyOTP(emailToVerify, otpValue);
      if (!otpResult.success) {
        setError(otpResult.error);
        setStatus('idle');
        return;
      }
      let user = auth.currentUser;
      if (user) {
        // Already logged in! Use this uid.
        const guestResult = await getGuestProfile(user.uid);
        let profileData = guestResult.success && guestResult.data ? guestResult.data : {};
        const finalFirstName = typeof firstName !== 'undefined' && firstName !== null ? firstName : (profileData.firstName || '');
        const finalLastName = typeof lastName !== 'undefined' && lastName !== null ? lastName : (profileData.lastName || '');
        const finalPhone = typeof phone !== 'undefined' && phone !== null ? phone : (profileData.phone || '');
        const finalPlan = typeof subscriptionPlan !== 'undefined' && subscriptionPlan !== null ? subscriptionPlan : (profileData.subscriptionPlan || 'basic');
        await updateUserProfile(user.uid, { role: 'host' });
      await createHostProfile(user.uid, {
        firstName: finalFirstName,
        lastName: finalLastName,
        email: emailToVerify,
        phone: finalPhone,
        subscriptionPlan: finalPlan,
        role: 'host',
        emailVerified: true,
        otpVerified: true
      });
      setStatus('verified');
      setTimeout(() => {
        navigate('/host/register', { 
          state: { 
            step: 2, 
            email: emailToVerify, 
            firstName: finalFirstName,
            lastName: finalLastName,
            phone: finalPhone,
            subscriptionPlan: finalPlan, 
            fromVerification: true 
          }, 
          replace: true 
        });
      }, 2000);
        return;
      }
      // Fallback for non-authenticated users: sign up with password
      if (!password) {
        setError('Missing password for new registration. Please register again.');
        setStatus('idle');
        return;
      }
      let userCredential;
      try {
        const { createUserWithEmailAndPassword } = await import('firebase/auth');
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        user = userCredential.user;
      } catch (firebaseErr) {
        if (firebaseErr.code === 'auth/email-already-in-use') {
          // Try to sign-in for legacy/edge case users
          const { signInWithEmailAndPassword } = await import('firebase/auth');
          userCredential = await signInWithEmailAndPassword(auth, email, password);
          user = userCredential.user;
        } else {
          throw firebaseErr;
        }
      }
      // Repeat upgrade/new host logic for non-logged in
      const guestResult = await getGuestProfile(user.uid);
      if (guestResult.success && guestResult.data) {
        await updateUserProfile(user.uid, { role: 'host' });
        await createHostProfile(user.uid, {
          firstName: firstName || guestResult.data.firstName || '',
          lastName: lastName || guestResult.data.lastName || '',
          email: email,
          phone: phone || guestResult.data.phone || '',
          subscriptionPlan: subscriptionPlan,
          role: 'host',
          emailVerified: true,
          otpVerified: true
        });
      } else {
        await createHostProfile(user.uid, {
          firstName: firstName,
          lastName: lastName,
          email: email,
          phone: phone,
          subscriptionPlan: subscriptionPlan,
          role: 'host',
          emailVerified: true,
          otpVerified: true
        });
      }
      setStatus('verified');
      setTimeout(() => {
        navigate('/host/register', { 
          state: { 
            step: 2, 
            email, 
            firstName,
            lastName,
            phone,
            subscriptionPlan, 
            fromVerification: true 
          }, 
          replace: true 
        });
      }, 2000);
    } catch (err) {
      console.error('Host registration error:', err);
      setError(getAuthErrorMessage(err.code) || 'Account creation failed. Please try again.');
      setStatus('idle');
    }
  };

  const handleResendOTP = async () => {
    setResending(true);
    setError('');
    
    try {
      const emailToResend = email || (auth.currentUser?.email || '');
      const userNameToUse = userName || (auth.currentUser?.displayName || 'User');
      await resendOTP(emailToResend, userNameToUse, true);
      setInputOtp(['', '', '', '', '', '']);
      const firstInput = document.getElementById('otp-0');
      if (firstInput) firstInput.focus();
    } catch (err) {
      setError('Failed to resend verification code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  // Allow access if email exists OR if user is logged in (for guest-to-host upgrade)
  const isLoggedIn = auth.currentUser !== null;
  if (!email && !isLoggedIn) {
    return (
      <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-gray-100"
        >
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaExclamationCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Registration Required
          </h2>
          <p className="text-gray-600 text-sm mb-6 leading-relaxed">
            Please complete your host registration first to verify your email address.
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/host/register')}
            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white py-3 rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
          >
            <FaHome className="w-4 h-4" />
            <span>Go to Host Registration</span>
          </motion.button>
        </motion.div>
      </section>
    );
  }
  
  // For logged-in users without email in state, use their auth email
  const emailToDisplay = email || (isLoggedIn ? auth.currentUser?.email : '');

  return (
    <section className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-6xl">
        {/* Back Button - Hide on completed status */}
        {status !== 'completed' && (
          <motion.button
            onClick={() => navigate('/host/register')}
            whileHover={{ x: -4 }}
            className="mb-6 flex items-center gap-2 text-gray-600 hover:text-emerald-700 transition-colors group"
          >
            <FaArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back to Registration</span>
          </motion.button>
        )}

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Left Column - Info Section */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {/* Logo & Welcome */}
            <div>
              <motion.img
                src={Logo}
                alt="Zennest Logo"
                className="h-12 mb-4"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              />
              <h1 className="text-3xl font-bold text-gray-900 mb-3">
                Join Our Host Community
              </h1>
              <p className="text-gray-600 text-base leading-relaxed">
                Start earning by listing your property on Zennest. Reach thousands of travelers and grow your hospitality business.
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mb-3">
                  <FaStar className="w-5 h-5 text-amber-600" />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1">Premium Visibility</h3>
                <p className="text-xs text-gray-600">Get featured to more guests</p>
              </div>

              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mb-3">
                  <FaChartLine className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1">Analytics Dashboard</h3>
                <p className="text-xs text-gray-600">Track your performance</p>
              </div>

              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                  <FaUsers className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1">Host Community</h3>
                <p className="text-xs text-gray-600">Connect with other hosts</p>
              </div>

              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
                  <FaHeadset className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1">Dedicated Support</h3>
                <p className="text-xs text-gray-600">24/7 assistance available</p>
              </div>
            </div>

            {/* Trust Indicators */}
            <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-xl p-5 border border-emerald-200">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-emerald-200 rounded-full flex items-center justify-center">
                  <FaShieldAlt className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-emerald-900 mb-1">
                    Secure & Verified Platform
                  </h3>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    All communications are encrypted and your data is protected with industry-standard security measures.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column - Verification Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Enhanced Error Notification */}
            <AnimatePresence>
              {showErrorNotification && error && (
                <motion.div
                  initial={{ opacity: 0, y: -20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  className="mb-4 relative bg-red-50 border-l-4 border-red-500 rounded-lg overflow-hidden shadow-sm"
                >
                  <motion.div
                    className="absolute bottom-0 left-0 h-1 bg-red-500"
                    initial={{ width: "100%" }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.1, ease: "linear" }}
                  />
                  
                  <div className="px-4 py-3 flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                      <FaExclamationCircle className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="text-sm font-medium text-red-800">{error}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowErrorNotification(false);
                        setTimeout(() => {
                          setError("");
                          setProgress(100);
                        }, 300);
                      }}
                      className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
                    >
                      <FaTimes className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {status === 'completed' ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.6, type: 'spring' }}
                  className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"
                >
                  <FaCheckCircle className="w-12 h-12 text-white" />
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-3xl font-bold text-gray-900 mb-4"
                >
                  Congratulations! 🎉
                </motion.h2>
                
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-lg text-gray-700 mb-2 font-semibold"
                >
                  You are now a part of Zennest Hosting Service!
                </motion.p>
                
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-gray-600 text-sm mb-8 leading-relaxed max-w-md mx-auto"
                >
                  Your account has been successfully verified and your subscription is active. 
                  You can now start listing your properties and welcoming guests!
                </motion.p>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/host/dashboard')}
                    className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white py-4 rounded-xl font-bold text-base shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3"
                  >
                    <FaHome className="w-5 h-5" />
                    <span>Take Me to My Dashboard</span>
                  </motion.button>
                </motion.div>

                {/* Success Features */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="mt-8 pt-6 border-t border-gray-200 grid grid-cols-2 gap-4"
                >
                  <div className="text-center">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                      <FaStar className="w-5 h-5 text-emerald-600" />
                    </div>
                    <p className="text-xs text-gray-600 font-medium">Start Listing</p>
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                      <FaChartLine className="w-5 h-5 text-emerald-600" />
                    </div>
                    <p className="text-xs text-gray-600 font-medium">Track Performance</p>
                  </div>
                </motion.div>
              </motion.div>
            ) : status === 'verified' ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.6, type: 'spring' }}
                  className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5"
                >
                  <FaCheckCircle className="w-10 h-10 text-emerald-600" />
                </motion.div>

                <h2 className="text-2xl font-bold text-emerald-700 mb-3">
                  Email Verified Successfully!
                </h2>
                
                <p className="text-gray-600 text-sm mb-6 leading-relaxed">
                  Your host account has been created. Taking you to the next step...
                </p>
                
                <div className="flex items-center justify-center gap-2 text-emerald-700">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-600"></div>
                  <span className="text-sm font-medium">Redirecting...</span>
                </div>
              </motion.div>
            ) : (
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
                {/* Header */}
                <div className="text-center mb-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5, type: 'spring' }}
                    className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4"
                  >
                    <FaEnvelope className="w-8 h-8 text-emerald-600" />
                  </motion.div>
                  
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Verify Your Email
                  </h2>
                  
                  <p className="text-gray-600 text-sm mb-3">
                    We sent a 6-digit code to
                  </p>
                  
                  <p className="text-emerald-700 font-semibold text-sm break-all px-4">
                    {emailToDisplay}
                  </p>
                  
                  <p className="text-gray-500 text-xs mt-2">
                    Please check your inbox and spam folder
                  </p>
                </div>

                <form onSubmit={handleVerify} className="space-y-6">
                  {/* OTP Input */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 text-center mb-4">
                      Enter Verification Code
                    </label>
                    <div className="flex justify-center gap-2 mb-2">
                      {inputOtp.map((digit, index) => (
                        <input
                          key={index}
                          id={`otp-${index}`}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleChange(index, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(index, e)}
                          onPaste={index === 0 ? handlePaste : undefined}
                          disabled={status === 'verifying'}
                          className="w-12 h-14 text-center text-xl font-bold border-2 border-gray-300 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                          autoFocus={index === 0}
                        />
                      ))}
                    </div>
                    <p className="text-center text-xs text-gray-500">
                      {inputOtp.filter(d => d).length}/6 digits entered
                    </p>
                  </div>

                  {/* Submit Button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={status === 'verifying' || inputOtp.join('').length !== 6}
                    className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white py-3.5 rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {status === 'verifying' ? (
                      <>
                        <FaClock className="w-4 h-4 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <FaShieldAlt className="w-4 h-4" />
                        <span>Verify & Continue</span>
                      </>
                    )}
                  </motion.button>

                  {/* Resend OTP */}
                  <div className="text-center pt-4 border-t border-gray-200">
                    <p className="text-gray-600 text-sm mb-2">
                      Didn't receive the code?
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={handleResendOTP}
                      disabled={resending}
                      className="text-emerald-700 hover:text-emerald-800 font-semibold text-sm transition disabled:opacity-50 flex items-center justify-center gap-2 mx-auto hover:underline"
                    >
                      {resending ? (
                        <>
                          <FaClock className="w-4 h-4 animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <FaEnvelope className="w-4 h-4" />
                          <span>Resend Code</span>
                        </>
                      )}
                    </motion.button>
                  </div>
                </form>

                {/* Security Badges */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-center gap-6 text-xs text-gray-600">
                    <div className="flex items-center gap-2">
                      <FaLock className="w-4 h-4 text-emerald-600" />
                      <span>Secure</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FaShieldAlt className="w-4 h-4 text-emerald-600" />
                      <span>Encrypted</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FaCheckCircle className="w-4 h-4 text-emerald-600" />
                      <span>Verified</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Help Section */}
            {status !== 'verified' && status !== 'completed' && (
              <div className="mt-6 bg-white rounded-xl shadow-md border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <FaHeadset className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-sm font-bold text-gray-900">
                    Need Help?
                  </h3>
                </div>
                <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                  Our support team is here to assist you with your host registration
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <a
                    href="mailto:support@zennest.com"
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-xs font-semibold text-gray-700"
                  >
                    <FaEnvelope className="w-3.5 h-3.5" />
                    <span>Email Us</span>
                  </a>
                  <a
                    href="/help"
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-xs font-semibold text-gray-700"
                  >
                    <FaCheckCircle className="w-3.5 h-3.5" />
                    <span>Help Center</span>
                  </a>
                </div>
              </div>
            )}

            {/* Footer - Hide on completed status */}
            {status !== 'completed' && (
              <div className="mt-6 text-center">
                <p className="text-xs text-gray-500 leading-relaxed">
                  By verifying your email, you agree to our{" "}
                  <a href="/terms" className="text-emerald-700 hover:underline font-medium">Host Terms</a>
                  {" "}and{" "}
                  <a href="/privacy" className="text-emerald-700 hover:underline font-medium">Privacy Policy</a>
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HostEmailVerifyPage;