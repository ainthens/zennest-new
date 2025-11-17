import React, { useState, useLayoutEffect, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import useAuth from "../hooks/useAuth";
import { getAuthErrorMessage } from "../utils/firebaseErrors";
import { sendVerificationEmail, generateOTP } from "../services/emailService";
import Logo from "../assets/zennest-logo-v2.svg";
import SideImage from "../assets/login-side.jpg";
import LightRays from "./LightRays";
import {
  FaEye,
  FaEyeSlash,
  FaLock,
  FaEnvelope,
  FaUser,
  FaShieldAlt,
  FaCheckCircle,
  FaExclamationCircle,
  FaArrowLeft,
  FaUserTie,
  FaSpinner,
  FaTimes,
  FaCheck,
  FaAward
} from "react-icons/fa";
import { getAuth, fetchSignInMethodsForEmail } from "firebase/auth";
import { checkEmailExists } from "../services/firestoreService";
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// Google Logo SVG
const GoogleLogo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C33.3 7.6 28.9 6 24 6 12.9 6 4 14.9 4 26s8.9 20 20 20c11 0 20-9 20-20 0-1.3-.1-2.5-.4-3.7z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.4 16.1 18.9 14 24 14c3 0 5.7 1.1 7.8 2.9l5.7-5.7C33.3 7.6 28.9 6 24 6c-7.3 0-13.7 3.3-17.7 8.7z"/>
    <path fill="#4CAF50" d="M24 46c5.1 0 9.6-1.7 13.2-4.6l-6.1-5.1C29.7 37.6 27 38.7 24 38.7c-5.3 0-9.7-3.4-11.3-8H6.3l-6.6 5.1C10.3 42.7 16.6 46 24 46z"/>
    <path fill="#1976D2" d="M43.6 20.5h-1.9V20H24v8h11.3c-1 3-3.1 5.5-6.2 6.9l.1.1 6.1 5.1C39.1 36.6 44 31 44 24c0-1.3-.1-2.5-.4-3.7z"/>
  </svg>
);

const Register = () => {
  const [form, setForm] = useState({ 
    firstName: "", 
    lastName: "", 
    email: "", 
    password: "", 
    confirm: "" 
  });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirm: ""
  });
  const [touched, setTouched] = useState({
    firstName: false,
    lastName: false,
    email: false,
    password: false,
    confirm: false
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showErrorNotification, setShowErrorNotification] = useState(false);
  const [progress, setProgress] = useState(100);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    label: "",
    color: "",
    feedback: []
  });
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [hasViewedTerms, setHasViewedTerms] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // ADD: terms HTML state
  const [termsHTML, setTermsHTML] = useState('');
  const [termsLoading, setTermsLoading] = useState(true);
  const [termsError, setTermsError] = useState('');

  const navigate = useNavigate();
  const location = useLocation();
  const { signInWithGoogle } = useAuth();

  // Auto-hide error notification
  useEffect(() => {
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
    if (location.pathname === "/register") document.body.classList.add("hide-header");
    return () => document.body.classList.remove("hide-header");
  }, [location]);

  // Password strength calculator
  const calculatePasswordStrength = (password) => {
    if (!password) {
      return { score: 0, label: "", color: "", feedback: [] };
    }

    let score = 0;
    const feedback = [];

    if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push("At least 8 characters");
    }

    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push("One uppercase letter");
    }

    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push("One lowercase letter");
    }

    if (/[0-9]/.test(password)) {
      score += 1;
    } else {
      feedback.push("One number");
    }

    if (/[^A-Za-z0-9]/.test(password)) {
      score += 1;
    } else {
      feedback.push("One special character");
    }

    let label, color;
    if (score <= 1) {
      label = "Weak";
      color = "bg-red-500";
    } else if (score <= 2) {
      label = "Fair";
      color = "bg-orange-500";
    } else if (score <= 3) {
      label = "Good";
      color = "bg-yellow-500";
    } else if (score <= 4) {
      label = "Strong";
      color = "bg-emerald-500";
    } else {
      label = "Very Strong";
      color = "bg-emerald-600";
    }

    return { score, label, color, feedback };
  };

  const validateName = (name, fieldName) => {
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      return `${fieldName} is required`;
    }
    
    if (!/^[A-Z]/.test(trimmedName)) {
      return `${fieldName} must start with an uppercase letter`;
    }
    
    if (!/^[A-Za-z\s]+$/.test(trimmedName)) {
      return `${fieldName} can only contain letters`;
    }
    
    return "";
  };

  const validateField = (name, value) => {
    if (!touched[name]) return "";

    switch (name) {
      case "firstName":
        return validateName(value, "First name");
      case "lastName":
        return validateName(value, "Last name");
      case "email":
        if (!value.trim()) return "Email is required";
        if (!/\S+@\S+\.\S+/.test(value)) return "Please enter a valid email";
        return "";
      case "password":
        if (!value) return "Password is required";
        if (value.length < 6) return "Password must be at least 6 characters";
        return "";
      case "confirm":
        if (!value) return "Please confirm your password";
        if (value !== form.password) return "Passwords do not match";
        return "";
      default:
        return "";
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });

    if (touched[name]) {
      const error = validateField(name, value);
      setFieldErrors({ ...fieldErrors, [name]: error });
    }

    if (name === "password") {
      setPasswordStrength(calculatePasswordStrength(value));
      
      if (touched.confirm && form.confirm) {
        const confirmError = form.confirm !== value ? "Passwords do not match" : "";
        setFieldErrors({ ...fieldErrors, password: "", confirm: confirmError });
      }
    }

    if (name === "confirm" && touched.confirm) {
      const confirmError = value !== form.password ? "Passwords do not match" : "";
      setFieldErrors({ ...fieldErrors, confirm: confirmError });
    }

    if (error) {
      setShowErrorNotification(false);
      setTimeout(() => {
        setError("");
        setProgress(100);
      }, 300);
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched({ ...touched, [name]: true });
    const error = validateField(name, value);
    setFieldErrors({ ...fieldErrors, [name]: error });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      password: true,
      confirm: true
    });

    const errors = {
      firstName: validateName(form.firstName, "First name"),
      lastName: validateName(form.lastName, "Last name"),
      email: !form.email.trim() ? "Email is required" : 
             !/\S+@\S+\.\S+/.test(form.email) ? "Please enter a valid email" : "",
      password: !form.password ? "Password is required" :
                form.password.length < 6 ? "Password must be at least 6 characters" : "",
      confirm: !form.confirm ? "Please confirm your password" :
               form.confirm !== form.password ? "Passwords do not match" : ""
    };

    setFieldErrors(errors);

    if (Object.values(errors).some(error => error !== "")) {
      setError("Please fix the errors before submitting");
      return;
    }

    if (!acceptedTerms) {
      setError("You must accept the Terms and Conditions to continue");
      return;
    }

    setError("");
    setLoading(true);

    try {
      // Check if email is already registered in Firebase Auth AND Firestore
      const auth = getAuth();
      const trimmedEmail = form.email.trim();
      
      console.log('Checking if email is already registered:', trimmedEmail);
      
      // Check Firebase Auth sign-in methods
      let signInMethods = [];
      try {
        signInMethods = await fetchSignInMethodsForEmail(auth, trimmedEmail);
        console.log('Sign in methods found:', signInMethods);
      } catch (checkError) {
        console.error('Error checking sign in methods:', checkError);
        // Continue to Firestore check even if Auth check fails
      }
      
      // Check Firestore for existing email (users or hosts)
      let firestoreCheck = { exists: false };
      try {
        firestoreCheck = await checkEmailExists(trimmedEmail);
        console.log('Firestore email check:', firestoreCheck);
      } catch (firestoreError) {
        console.error('Error checking Firestore:', firestoreError);
        // Continue with Auth check result
      }
      
      // Check if email has any sign-in methods (already registered in Firebase Auth)
      // OR if email exists in Firestore (already registered)
      if ((Array.isArray(signInMethods) && signInMethods.length > 0) || 
          (firestoreCheck.success && firestoreCheck.exists === true)) {
        console.log('Email already registered, preventing navigation');
        setLoading(false);
        setError("This email is already registered. Please sign in or use a different email.");
        return; // Exit early - do NOT navigate to verify-email
      }

      console.log('Email not registered, proceeding with OTP generation');
      // Only proceed with OTP and registration if email is NOT registered
      const otp = generateOTP();
      const userName = `${form.firstName} ${form.lastName}`.trim();

      const emailResult = await sendVerificationEmail(trimmedEmail, otp, userName);
      console.log('Email sending result:', emailResult);

      // Only navigate if email was sent successfully AND we're sure email is not registered
      if (emailResult && emailResult.success) {
        // Final safety check before navigation
        try {
          const finalCheck = await fetchSignInMethodsForEmail(auth, trimmedEmail);
          if (Array.isArray(finalCheck) && finalCheck.length > 0) {
            console.log('Email became registered during process, preventing navigation');
            setLoading(false);
            setError("This email is already registered. Please sign in or use a different email.");
            return;
          }
        } catch (finalCheckError) {
          console.error('Final check error:', finalCheckError);
          // Don't block navigation if final check fails - email was already verified
        }
        
        console.log('Email sent successfully, navigating to verify-email');
        navigate("/verify-email", {
          state: {
            ...form,
            otp,
            userName
          },
        });
      } else {
        const errorMessage = emailResult?.error || "Failed to send verification email. Please try again.";
        setError(errorMessage);
        setLoading(false);
      }
    } catch (err) {
      console.error('Registration error:', err);
      // Check if error is about email already existing
      if (err.code === 'auth/email-already-in-use' || 
          err.code === 'auth/email-already-exists' ||
          err.message?.toLowerCase().includes('already') ||
          err.message?.toLowerCase().includes('exists')) {
        setError("This email is already registered. Please sign in or use a different email.");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
      setLoading(false);
      // Make sure we don't navigate on error
      return;
    }
  };

  const handleGoogleRegister = async () => {
    try {
      await signInWithGoogle();
      navigate("/");
    } catch (err) {
      setError(getAuthErrorMessage(err.code));
    }
  };

  // FETCH TERMS (raw HTML from Firestore admin/termsAndConditions)
  useEffect(() => {
    const fetchTerms = async () => {
      setTermsLoading(true);
      try {
        const ref = doc(db, 'admin', 'termsAndConditions');
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setTermsHTML(data.content || '<p>Terms & Conditions will be available soon.</p>');
        } else {
          setTermsHTML('<p>No Terms & Conditions have been published yet.</p>');
        }
      } catch (err) {
        console.error('Terms fetch error:', err);
        setTermsError('Failed to load Terms & Conditions.');
        setTermsHTML('<p style="color:red;">Failed to load Terms & Conditions.</p>');
      } finally {
        setTermsLoading(false);
      }
    };
    fetchTerms();
  }, []);

  return (
    <section 
      className="relative min-h-screen flex overflow-hidden bg-gray-50" 
      style={{ fontFamily: 'Poppins, sans-serif' }}
    >
      {/* Left side: Background Image */}
      <div className="hidden md:block w-1/2 relative">
        <img src={SideImage} alt="Zennest Experience" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent">
          <LightRays
            raysOrigin="top-center"
            raysColor="#FBEC5D"
            raysSpeed={2}
            lightSpread={30}
            rayLength={100}
            followMouse={true}
            mouseInfluence={0.1}
            noiseAmount={0.1}
            distortion={0.05}
          />
        </div>
        
        {/* Overlay Content */}
        <div className="absolute bottom-0 left-0 right-0 p-12 text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-3xl font-bold mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Join Our Community
            </h2>
            <p className="text-base text-white/90 mb-5 max-w-md" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Start your journey with Zennest today. Discover amazing stays and experiences across the Philippines.
            </p>
            <div className="flex items-center gap-5 text-xs" style={{ fontFamily: 'Poppins, sans-serif' }}>
              <div className="flex items-center gap-2">
                <FaCheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Verified Listings</span>
              </div>
              <div className="flex items-center gap-2">
                <FaCheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Secure Bookings</span>
              </div>
              <div className="flex items-center gap-2">
                <FaCheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>24/7 Support</span>
              </div>
            </div>
          </motion.div>
        </div>

        <p className="absolute bottom-4 right-6 text-[10px] text-white/80" style={{ fontFamily: 'Poppins, sans-serif' }}>
          © Zennest {new Date().getFullYear()}
        </p>
      </div>

      {/* Right side: Registration Form */}
      <div className="flex flex-col justify-center items-center w-full md:w-1/2 px-6 py-12 z-20 bg-white md:bg-transparent overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, type: "spring", bounce: 0.15 }}
          className="w-full max-w-md"
        >

          {/* Logo & Title */}
          <div className="text-center mb-6">
            <motion.img
              src={Logo}
              alt="Zennest Logo"
              className="h-12 mx-auto mb-3"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            />
            <h1 className="text-2xl font-bold text-gray-900 mb-1.5" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Create Your Account
            </h1>
            <p className="text-gray-600 text-xs" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Join thousands of travelers discovering unique stays
            </p>
          </div>


          {/* Registration Form Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-3">
                {/* First Name */}
                <div>
                  <label htmlFor="firstName" className="block text-xs font-semibold text-gray-700 mb-1.5" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    First Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaUser className={`w-3.5 h-3.5 ${fieldErrors.firstName && touched.firstName ? 'text-red-500' : 'text-gray-400'}`} />
                    </div>
                    <input
                      id="firstName"
                      type="text"
                      name="firstName"
                      value={form.firstName}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Juan"
                      autoComplete="given-name"
                      style={{ fontFamily: 'Poppins, sans-serif' }}
                      className={`w-full pl-10 pr-3 py-2.5 text-sm border-2 rounded-xl transition-all focus:outline-none ${
                        fieldErrors.firstName && touched.firstName
                          ? 'border-red-500 focus:border-red-600 bg-red-50'
                          : 'border-gray-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100'
                      }`}
                    />
                    {!fieldErrors.firstName && touched.firstName && form.firstName && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <FaCheck className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                    )}
                  </div>
                  <AnimatePresence>
                    {fieldErrors.firstName && touched.firstName && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mt-1.5 text-[10px] text-red-600 flex items-center gap-1"
                        style={{ fontFamily: 'Poppins, sans-serif' }}
                      >
                        <FaExclamationCircle className="w-2.5 h-2.5" />
                        {fieldErrors.firstName}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Last Name */}
                <div>
                  <label htmlFor="lastName" className="block text-xs font-semibold text-gray-700 mb-1.5" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    Last Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaUser className={`w-3.5 h-3.5 ${fieldErrors.lastName && touched.lastName ? 'text-red-500' : 'text-gray-400'}`} />
                    </div>
                    <input
                      id="lastName"
                      type="text"
                      name="lastName"
                      value={form.lastName}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Dela Cruz"
                      autoComplete="family-name"
                      style={{ fontFamily: 'Poppins, sans-serif' }}
                      className={`w-full pl-10 pr-3 py-2.5 text-sm border-2 rounded-xl transition-all focus:outline-none ${
                        fieldErrors.lastName && touched.lastName
                          ? 'border-red-500 focus:border-red-600 bg-red-50'
                          : 'border-gray-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100'
                      }`}
                    />
                    {!fieldErrors.lastName && touched.lastName && form.lastName && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <FaCheck className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                    )}
                  </div>
                  <AnimatePresence>
                    {fieldErrors.lastName && touched.lastName && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mt-1.5 text-[10px] text-red-600 flex items-center gap-1"
                        style={{ fontFamily: 'Poppins, sans-serif' }}
                      >
                        <FaExclamationCircle className="w-2.5 h-2.5" />
                        {fieldErrors.lastName}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-gray-700 mb-1.5" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaEnvelope className={`w-3.5 h-3.5 ${fieldErrors.email && touched.email ? 'text-red-500' : 'text-gray-400'}`} />
                  </div>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="juandelacruz@example.com"
                    autoComplete="email"
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                    className={`w-full pl-10 pr-3 py-2.5 text-sm border-2 rounded-xl transition-all focus:outline-none ${
                      fieldErrors.email && touched.email
                        ? 'border-red-500 focus:border-red-600 bg-red-50'
                        : 'border-gray-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100'
                    }`}
                  />
                  {!fieldErrors.email && touched.email && form.email && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <FaCheck className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                  )}
                </div>
                <AnimatePresence>
                  {fieldErrors.email && touched.email && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-1.5 text-[10px] text-red-600 flex items-center gap-1"
                      style={{ fontFamily: 'Poppins, sans-serif' }}
                    >
                      <FaExclamationCircle className="w-2.5 h-2.5" />
                      {fieldErrors.email}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Password Field with Strength Indicator */}
              <div>
                <label htmlFor="password" className="block text-xs font-semibold text-gray-700 mb-1.5" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaLock className={`w-3.5 h-3.5 ${fieldErrors.password && touched.password ? 'text-red-500' : 'text-gray-400'}`} />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Create a strong password"
                    autoComplete="new-password"
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                    className={`w-full pl-10 pr-11 py-2.5 text-sm border-2 rounded-xl transition-all focus:outline-none ${
                      fieldErrors.password && touched.password
                        ? 'border-red-500 focus:border-red-600 bg-red-50'
                        : 'border-gray-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {form.password && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-medium text-gray-700" style={{ fontFamily: 'Poppins, sans-serif' }}>Password Strength:</span>
                      <span className={`text-[10px] font-bold ${
                        passwordStrength.score <= 1 ? 'text-red-600' :
                        passwordStrength.score <= 2 ? 'text-orange-600' :
                        passwordStrength.score <= 3 ? 'text-yellow-600' :
                        'text-emerald-600'
                      }`} style={{ fontFamily: 'Poppins, sans-serif' }}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                        className={`h-full ${passwordStrength.color} transition-all duration-300`}
                      />
                    </div>
                    {passwordStrength.feedback.length > 0 && (
                      <div className="mt-1.5 space-y-0.5">
                        {passwordStrength.feedback.map((item, index) => (
                          <p key={index} className="text-[10px] text-gray-600 flex items-center gap-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
                            <span className="text-gray-400">•</span>
                            {item}
                          </p>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                <AnimatePresence>
                  {fieldErrors.password && touched.password && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-1.5 text-[10px] text-red-600 flex items-center gap-1"
                      style={{ fontFamily: 'Poppins, sans-serif' }}
                    >
                      <FaExclamationCircle className="w-2.5 h-2.5" />
                      {fieldErrors.password}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Confirm Password Field */}
              <div>
                <label htmlFor="confirm" className="block text-xs font-semibold text-gray-700 mb-1.5" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaLock className={`w-3.5 h-3.5 ${fieldErrors.confirm && touched.confirm ? 'text-red-500' : 'text-gray-400'}`} />
                  </div>
                  <input
                    id="confirm"
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirm"
                    value={form.confirm}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                    className={`w-full pl-10 pr-11 py-2.5 text-sm border-2 rounded-xl transition-all focus:outline-none ${
                      fieldErrors.confirm && touched.confirm
                        ? 'border-red-500 focus:border-red-600 bg-red-50'
                        : !fieldErrors.confirm && touched.confirm && form.confirm && form.password === form.confirm
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Match Indicator */}
                {!fieldErrors.confirm && touched.confirm && form.confirm && form.password === form.confirm && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-1.5 text-[10px] text-emerald-600 flex items-center gap-1"
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                  >
                    <FaCheckCircle className="w-2.5 h-2.5" />
                    Passwords match!
                  </motion.p>
                )}

                <AnimatePresence>
                  {fieldErrors.confirm && touched.confirm && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-1.5 text-[10px] text-red-600 flex items-center gap-1"
                      style={{ fontFamily: 'Poppins, sans-serif' }}
                    >
                      <FaExclamationCircle className="w-2.5 h-2.5" />
                      {fieldErrors.confirm}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Terms and Conditions Checkbox */}
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <input
                    type="checkbox"
                    id="termsCheckbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    disabled={!hasViewedTerms}
                    className="mt-0.5 w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 focus:ring-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <label htmlFor="termsCheckbox" className="flex-1 text-xs text-gray-700 leading-relaxed cursor-pointer" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    I have read and agree to the{' '}
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="text-emerald-600 hover:text-emerald-700 font-semibold underline inline-flex items-center gap-1"
                    >
                      Terms and Conditions
                    </button>
                    <span className="text-rose-500 ml-1">*</span>
                    {!hasViewedTerms && (
                      <span className="block text-[10px] text-amber-600 mt-1">
                        Please read the Terms and Conditions before accepting
                      </span>
                    )}
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                style={{ fontFamily: 'Poppins, sans-serif' }}
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white py-3 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <FaSpinner className="w-4 h-4 animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <FaUserTie className="w-3.5 h-3.5" />
                    <span>Create Account</span>
                  </>
                )}
              </motion.button>
            </form>

            {/* Security Badges */}
            <div className="mt-5 pt-5 border-t border-gray-200">
              <div className="flex items-center justify-center gap-3 text-[10px] text-gray-600" style={{ fontFamily: 'Poppins, sans-serif' }}>
                <div className="flex items-center gap-1">
                  <FaShieldAlt className="w-3 h-3 text-emerald-600" />
                  <span>SSL Encrypted</span>
                </div>
                <div className="w-1 h-1 rounded-full bg-gray-300" />
                <div className="flex items-center gap-1">
                  <FaCheckCircle className="w-3 h-3 text-emerald-600" />
                  <span>Verified Hosts</span>
                </div>
                <div className="w-1 h-1 rounded-full bg-gray-300" />
                <div className="flex items-center gap-1">
                  <FaAward className="w-3 h-3 text-emerald-600" />
                  <span>Secure Payments</span>
                </div>
              </div>
            </div>

            {/* Login Link */}
            <p className="mt-5 text-center text-xs text-gray-600" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="font-semibold text-emerald-700 hover:text-emerald-800 hover:underline transition-colors"
              >
                Sign in
              </button>
            </p>
          </div>

          {/* Social Login */}
          <div className="mt-6">
            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-white md:bg-transparent text-gray-500 font-medium" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  Or sign up with
                </span>
              </div>
            </div>

            {/* Social Buttons */}
            <div className="mt-5">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={handleGoogleRegister}
                disabled={loading}
                style={{ fontFamily: 'Poppins, sans-serif' }}
                className="w-full flex items-center justify-center gap-2.5 px-5 py-3 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <GoogleLogo />
                <span className="font-semibold text-gray-700 text-xs">Continue with Google</span>
              </motion.button>
            </div>
          </div>

          {/* Become a Host CTA */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => navigate("/host/register")}
            disabled={loading}
            style={{ fontFamily: 'Poppins, sans-serif' }}
            className="mt-5 w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-xs"
          >
            <FaUserTie className="w-4 h-4" />
            <span>Become a Host Instead</span>
          </motion.button>

          {/* Trust Message */}
          <div className="mt-6 text-center">
            <p className="text-[10px] text-gray-500 leading-relaxed" style={{ fontFamily: 'Poppins, sans-serif' }}>
              By creating an account, you agree to our{" "}
              <a href="/terms" className="text-emerald-700 hover:underline">Terms of Service</a>
              {" "}and{" "}
              <a href="/privacy" className="text-emerald-700 hover:underline">Privacy Policy</a>
            </p>
          </div>
        </motion.div>
      </div>

      {/* Sliding Error Notification Overlay */}
      <AnimatePresence>
        {showErrorNotification && error && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] w-full max-w-md mx-4"
          >
            <div className="relative bg-white border-l-4 border-red-500 rounded-xl overflow-hidden shadow-2xl">
              {/* Progress bar */}
              <motion.div
                className="absolute bottom-0 left-0 h-1 bg-red-500"
                initial={{ width: "100%" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.1, ease: "linear" }}
              />
              
              <div className="px-4 py-3.5 flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                  <FaExclamationCircle className="w-4 h-4 text-red-600" />
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="text-sm font-semibold text-red-800 mb-0.5" style={{ fontFamily: 'Poppins, sans-serif' }}>Error</p>
                  <p className="text-xs text-red-700" style={{ fontFamily: 'Poppins, sans-serif' }}>{error}</p>
                </div>
                <button
                  onClick={() => {
                    setShowErrorNotification(false);
                    setTimeout(() => {
                      setError("");
                      setProgress(100);
                    }, 300);
                  }}
                  className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors p-1 hover:bg-red-50 rounded"
                  aria-label="Close notification"
                >
                  <FaTimes className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Terms and Conditions Modal */}
      <AnimatePresence>
        {showTermsModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowTermsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-6 flex items-center justify-between z-10">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                    <FaShieldAlt />
                    Terms and Conditions
                  </h2>
                  <p className="text-xs text-emerald-100 mt-1">
                    {termsLoading
                      ? 'Loading...'
                      : termsError
                        ? 'Error loading terms'
                        : 'Published Terms'}
                  </p>
                </div>
                <button
                  onClick={() => setShowTermsModal(false)}
                  className="p-2 hover:bg-emerald-800 rounded-lg transition-colors"
                  aria-label="Close modal"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>

              {/* Content */}
              <div className="overflow-y-auto max-h-[calc(85vh-200px)] p-6">
                {termsLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="text-center">
                      <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-xs text-gray-600">Fetching Terms & Conditions...</p>
                    </div>
                  </div>
                ) : (
                  <div
                    className="prose prose-sm max-w-none"
                    // Render RAW HTML (unsanitized as requested)
                    dangerouslySetInnerHTML={{ __html: termsHTML }}
                  />
                )}
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-gray-50 p-6 border-t border-gray-200 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    setHasViewedTerms(true);
                    setAcceptedTerms(true);
                    setShowTermsModal(false);
                  }}
                  disabled={termsLoading}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-3 px-5 rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 font-semibold text-sm shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <FaCheck className="text-sm" />
                  I Accept the Terms
                </button>
                <button
                  onClick={() => setShowTermsModal(false)}
                  className="flex-1 bg-white text-gray-700 py-3 px-5 rounded-lg border-2 border-gray-300 hover:bg-gray-50 transition-all duration-200 font-semibold text-sm"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default Register;