import React, { useState, useEffect, useLayoutEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaShieldAlt, FaLock, FaEnvelope, FaEye, FaEyeSlash, FaExclamationCircle, FaCheckCircle } from 'react-icons/fa';
import zennestLogo from '../assets/zennest-logo-v3.svg';

/**
 * AdminLogin - Dedicated secure admin authentication portal
 * Uses NEW system: localStorage.isAdmin and localStorage.adminLoginTime
 */
const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Predefined admin credentials
  const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'zennest@admin.com';
  const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'Admin@123';

  // State
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showErrorNotification, setShowErrorNotification] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimeRemaining, setLockTimeRemaining] = useState(0);

  // Hide header for this page
  useLayoutEffect(() => {
    document.body.classList.add('hide-header');
    return () => document.body.classList.remove('hide-header');
  }, [location]);

  // ✅ Check if there's an existing admin session (NEW keys)
  useEffect(() => {
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    const adminLoginTime = localStorage.getItem('adminLoginTime');

    console.log('🔍 AdminLogin: Checking existing session...');
    console.log('📋 isAdmin:', isAdmin);
    console.log('⏰ adminLoginTime:', adminLoginTime);

    if (isAdmin && adminLoginTime) {
      const sessionAge = Date.now() - parseInt(adminLoginTime);
      const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

      if (sessionAge < SESSION_TIMEOUT) {
        console.log('✅ AdminLogin: Valid session found - redirecting to dashboard');
        navigate('/admin', { replace: true });
      } else {
        console.log('⏰ AdminLogin: Session expired - clearing old session');
        localStorage.removeItem('isAdmin');
        localStorage.removeItem('adminLoginTime');
      }
    }
  }, [navigate]);

  // Handle lockout timer
  useEffect(() => {
    if (!isLocked) return;

    const timer = setInterval(() => {
      setLockTimeRemaining(prev => {
        if (prev <= 1) {
          setIsLocked(false);
          setAttemptCount(0);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isLocked]);

  // Validation
  const validateField = (name, value) => {
    if (!touched[name]) return '';

    switch (name) {
      case 'email':
        if (!value.trim()) return 'Email is required';
        if (!/\S+@\S+\.\S+/.test(value)) return 'Please enter a valid email address';
        return '';
      case 'password':
        if (!value.trim()) return 'Password is required';
        if (value.length < 6) return 'Password must be at least 6 characters';
        return '';
      default:
        return '';
    }
  };

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (touched[name]) {
      const fieldError = validateField(name, value);
      setErrors(prev => ({
        ...prev,
        [name]: fieldError
      }));
    }

    if (error) {
      setError('');
      setShowErrorNotification(false);
    }
  };

  // Handle blur
  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));

    const fieldError = validateField(name, value);
    setErrors(prev => ({
      ...prev,
      [name]: fieldError
    }));
  };

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Check if account is locked
    if (isLocked) {
      setError(`Account locked. Please try again in ${lockTimeRemaining} seconds.`);
      return;
    }

    // Validate all fields
    setTouched({
      email: true,
      password: true
    });

    const emailError = validateField('email', formData.email);
    const passwordError = validateField('password', formData.password);

    setErrors({
      email: emailError,
      password: passwordError
    });

    if (emailError || passwordError) {
      setError('Please fix the errors before submitting');
      return;
    }

    setLoading(true);

    try {
      const trimmedEmail = formData.email.trim().toLowerCase();
      const trimmedPassword = formData.password.trim();

      console.log('🔐 AdminLogin: Attempting authentication');

      // ✅ Validate against predefined admin credentials
      if (trimmedEmail === ADMIN_EMAIL.toLowerCase() && trimmedPassword === ADMIN_PASSWORD) {
        console.log('✅ AdminLogin: Credentials verified');

        // ✅ NEW SYSTEM: Set admin session using NEW keys
        try {
          const loginTime = Date.now();
          localStorage.setItem('isAdmin', 'true');
          localStorage.setItem('adminLoginTime', loginTime.toString());
          console.log('💾 AdminLogin: Session stored in localStorage');
          console.log('📋 isAdmin:', localStorage.getItem('isAdmin'));
          console.log('⏰ adminLoginTime:', localStorage.getItem('adminLoginTime'));
        } catch (storageError) {
          console.error('❌ AdminLogin: Failed to store session', storageError);
          setError('Failed to establish session. Please try again.');
          setLoading(false);
          return;
        }

        // Reset form
        setFormData({ email: '', password: '' });
        setAttemptCount(0);
        setError('');

        console.log('🚀 AdminLogin: Navigating to dashboard');

        // Navigate with minimal delay
        setTimeout(() => {
          navigate('/admin', { replace: true });
        }, 100);

        return;
      }

      // Invalid credentials
      console.warn('❌ AdminLogin: Invalid credentials');

      // Increment attempt count
      const newAttemptCount = attemptCount + 1;
      setAttemptCount(newAttemptCount);

      // Lock after 5 failed attempts
      if (newAttemptCount >= 5) {
        console.warn('⚠️ AdminLogin: Account locked after 5 failed attempts');
        setIsLocked(true);
        setLockTimeRemaining(300); // 5 minutes
        setError('Too many failed attempts. Account locked for 5 minutes.');
      } else {
        const remainingAttempts = 5 - newAttemptCount;
        setError(`Invalid admin credentials. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`);
      }

      // Clear password for security
      setFormData(prev => ({
        ...prev,
        password: ''
      }));

    } catch (err) {
      console.error('❌ AdminLogin: Authentication error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
      setShowErrorNotification(true);
    }
  };

  // Auto-hide error notification
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setShowErrorNotification(false);
        setTimeout(() => setError(''), 300);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center relative overflow-hidden p-4">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -z-10" />

      {/* Main container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo and header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="flex flex-col items-center justify-center gap-4 mb-6"
          >
            <div className="flex items-center justify-center gap-3">
              <img 
                src={zennestLogo} 
                alt="Zennest Logo" 
                className="h-16 w-auto object-contain drop-shadow-lg"
              />
              <div className="text-left">
                <h1 className="text-3xl font-bold text-white">Zennest</h1>
                <p className="text-sm text-slate-300">Admin Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
              <FaShieldAlt className="text-emerald-400 text-sm" />
              <span className="text-xs text-emerald-300 font-medium">Secure Administrative Access</span>
            </div>
          </motion.div>
        </div>

        {/* Error notification */}
        {showErrorNotification && error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3"
          >
            <FaExclamationCircle className="text-red-400 text-lg flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-200">{error}</p>
          </motion.div>
        )}

        {/* Login form */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 shadow-2xl"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email field */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-200 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaEnvelope className={`w-4 h-4 ${errors.email && touched.email ? 'text-red-400' : 'text-slate-500'}`} />
                </div>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="admin@example.com"
                  disabled={isLocked}
                  className={`w-full pl-12 pr-4 py-3 rounded-lg border-2 transition-all focus:outline-none text-white ${
                    errors.email && touched.email
                      ? 'border-red-500 bg-red-500/10 focus:border-red-600 focus:ring-red-500/20'
                      : 'border-slate-600 bg-slate-700/50 focus:border-emerald-500 focus:ring-emerald-500/20 focus:ring-2'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                />
              </div>
              {errors.email && touched.email && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-red-400 mt-1.5 flex items-center gap-1"
                >
                  <FaExclamationCircle className="w-3 h-3" />
                  {errors.email}
                </motion.p>
              )}
            </div>

            {/* Password field */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-200 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaLock className={`w-4 h-4 ${errors.password && touched.password ? 'text-red-400' : 'text-slate-500'}`} />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Enter password"
                  disabled={isLocked}
                  className={`w-full pl-12 pr-12 py-3 rounded-lg border-2 transition-all focus:outline-none text-white ${
                    errors.password && touched.password
                      ? 'border-red-500 bg-red-500/10 focus:border-red-600 focus:ring-red-500/20'
                      : 'border-slate-600 bg-slate-700/50 focus:border-emerald-500 focus:ring-emerald-500/20 focus:ring-2'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLocked}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {showPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && touched.password && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-red-400 mt-1.5 flex items-center gap-1"
                >
                  <FaExclamationCircle className="w-3 h-3" />
                  {errors.password}
                </motion.p>
              )}
            </div>

            {/* Attempt counter */}
            {attemptCount > 0 && attemptCount < 5 && !isLocked && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-amber-400 text-center"
              >
                {5 - attemptCount} attempt{5 - attemptCount !== 1 ? 's' : ''} remaining
              </motion.div>
            )}

            {/* Submit button */}
            <motion.button
              whileHover={{ scale: isLocked || loading ? 1 : 1.02 }}
              whileTap={{ scale: isLocked || loading ? 1 : 0.98 }}
              type="submit"
              disabled={loading || isLocked}
              className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2 mt-6 ${
                isLocked
                  ? 'bg-slate-600 cursor-not-allowed opacity-60'
                  : loading
                  ? 'bg-emerald-600/70 cursor-wait'
                  : 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-lg hover:shadow-xl'
              }`}
            >
              {loading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                  />
                  <span>Verifying...</span>
                </>
              ) : isLocked ? (
                <>
                  <FaLock className="w-4 h-4" />
                  <span>Account Locked ({lockTimeRemaining}s)</span>
                </>
              ) : (
                <>
                  <FaShieldAlt className="w-4 h-4" />
                  <span>Access Admin Portal</span>
                </>
              )}
            </motion.button>
          </form>
        </motion.div>

        {/* Footer info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 p-4 rounded-lg bg-slate-800/30 border border-slate-700/30"
        >
          <div className="flex items-start gap-3">
            <FaCheckCircle className="text-emerald-400 text-lg flex-shrink-0 mt-0.5" />
            <div className="text-sm text-slate-300">
              <p className="font-semibold text-slate-200 mb-1">Secure Portal</p>
              <p className="text-xs">This portal is restricted to administrators only. Unauthorized access attempts are logged and monitored.</p>
            </div>
          </div>
        </motion.div>

        {/* Back to home link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-6"
        >
          <button
            onClick={() => navigate('/')}
            className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            ← Back to Home
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;