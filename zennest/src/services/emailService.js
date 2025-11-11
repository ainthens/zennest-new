// src/services/emailService.js
import emailjs from '@emailjs/browser';
import { emailjsConfig } from '../config/emailjs';

// Generate a 6-digit OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Store OTPs temporarily (in production, use a database)
const otpStorage = new Map();

export const sendVerificationEmail = async (userEmail, otp, userName = '') => {
  try {
    // Use registration account (OLD ACCOUNT) for guest registration
    const config = emailjsConfig.registration || {
      publicKey: emailjsConfig.publicKey,
      serviceId: emailjsConfig.serviceId,
      templateId: emailjsConfig.templateId
    };

    // Validate configuration before proceeding
    if (!config.publicKey || config.publicKey.trim() === '') {
      console.error('❌ EmailJS Registration Public Key is missing');
      return { 
        success: false, 
        error: 'Email service not configured. Please contact support.' 
      };
    }

    if (!config.serviceId || config.serviceId.trim() === '') {
      console.error('❌ EmailJS Registration Service ID is missing');
      return { 
        success: false, 
        error: 'Email service not configured. Please contact support.' 
      };
    }

    if (!config.templateId || config.templateId.trim() === '') {
      console.error('❌ EmailJS Registration Template ID is missing');
      return { 
        success: false, 
        error: 'Email template not configured. Please contact support.' 
      };
    }

    console.log('🔧 EmailJS Configuration Check (Registration Account):', {
      serviceId: config.serviceId,
      templateId: config.templateId,
      publicKey: config.publicKey ? '✅ Set' : '❌ Missing'
    });

    // Initialize EmailJS with registration account public key
    try {
      emailjs.init(config.publicKey);
    } catch (initError) {
      console.error('❌ EmailJS initialization failed:', initError);
      return { 
        success: false, 
        error: 'Failed to initialize email service. Please try again.' 
      };
    }

    // Calculate expiration time (15 minutes from now)
    const expirationTime = new Date(Date.now() + 15 * 60 * 1000);
    const formattedTime = expirationTime.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    // Parameters for the beautiful new template
    // NOTE: The regular template likely uses 'user_email' as the recipient field
    // Make sure your EmailJS service "To Email" is mapped to 'user_email'
    const templateParams = {
      // User information (EmailJS service should map 'user_email' to "To Email")
      user_name: userName || userEmail.split('@')[0],
      user_email: userEmail,  // This is likely mapped to "To Email" in your service
      
      // OTP information
      otp_code: otp,                    // The 6-digit OTP code
      expiry_time: formattedTime,       // Formatted expiration time
      
      // App information
      app_name: 'Zennest',
      app_link: window.location.origin + '/verify-email',
      website_link: window.location.origin,
      
      // Additional
      current_year: new Date().getFullYear(),
    };

    console.log('📧 Sending beautiful email with parameters:', {
      user_name: templateParams.user_name,
      user_email: templateParams.user_email,
      otp_code: templateParams.otp_code,
      expiry_time: templateParams.expiry_time
    });

    const result = await emailjs.send(
      config.serviceId,
      config.templateId,
      templateParams,
      config.publicKey
    );

    console.log('✅ Beautiful email sent successfully!', result.status, result.text);

    // Store OTP with timestamp (valid for 15 minutes)
    otpStorage.set(userEmail, {
      otp: otp,
      timestamp: Date.now(),
      expiresAt: Date.now() + 15 * 60 * 1000 // 15 minutes
    });

    return { success: true, result };
  } catch (error) {
    console.error('❌ Email sending failed:', {
      status: error.status,
      text: error.text,
      message: error.message
    });
    
    return { 
      success: false, 
      error: `Failed to send verification email: ${error.text || 'Please try again.'}` 
    };
  }
};

// Verify OTP
export const verifyOTP = (userEmail, enteredOTP) => {
  const storedData = otpStorage.get(userEmail);
  
  if (!storedData) {
    return { success: false, error: 'OTP not found or expired. Please request a new one.' };
  }

  if (Date.now() > storedData.expiresAt) {
    otpStorage.delete(userEmail);
    return { success: false, error: 'OTP has expired. Please request a new one.' };
  }

  if (storedData.otp === enteredOTP) {
    otpStorage.delete(userEmail);
    return { success: true };
  }

  return { success: false, error: 'Invalid OTP. Please check and try again.' };
};

// Send host registration OTP email
export const sendHostVerificationEmail = async (userEmail, otp, userName = '') => {
  try {
    // Validate email
    if (!userEmail || typeof userEmail !== 'string' || !userEmail.includes('@')) {
      console.error('❌ Invalid email address:', userEmail);
      return { 
        success: false, 
        error: 'Invalid email address. Please check your email and try again.' 
      };
    }

    // Use registration account (OLD ACCOUNT) for host registration
    const config = emailjsConfig.registration || {
      publicKey: emailjsConfig.publicKey,
      serviceId: emailjsConfig.serviceId,
      hostTemplateId: emailjsConfig.hostTemplateId
    };

    // Validate template configuration
    if (!config.hostTemplateId || config.hostTemplateId.trim() === '' || config.hostTemplateId === 'template_xxxxx') {
      console.error('❌ Host template ID not configured');
      return { 
        success: false, 
        error: 'Email template not configured. Please contact support.' 
      };
    }

    // Validate configuration before proceeding
    if (!config.publicKey || config.publicKey.trim() === '') {
      console.error('❌ EmailJS Registration Public Key is missing');
      return { 
        success: false, 
        error: 'Email service not configured. Please contact support.' 
      };
    }

    if (!config.serviceId || config.serviceId.trim() === '') {
      console.error('❌ EmailJS Registration Service ID is missing');
      return { 
        success: false, 
        error: 'Email service not configured. Please contact support.' 
      };
    }

    console.log('🔧 Sending Host Registration OTP Email (Registration Account):', {
      userEmail,
      userName,
      otp,
      serviceId: config.serviceId,
      templateId: config.hostTemplateId,
      publicKey: config.publicKey ? '✅ Set' : '❌ Missing'
    });

    // Initialize EmailJS with registration account public key
    try {
      emailjs.init(config.publicKey);
    } catch (initError) {
      console.error('❌ EmailJS initialization failed:', initError);
      return { 
        success: false, 
        error: 'Failed to initialize email service. Please try again.' 
      };
    }

    // Calculate expiration time (15 minutes from now)
    const expirationTime = new Date(Date.now() + 15 * 60 * 1000);
    const formattedTime = expirationTime.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    // Parameters for host registration template
    // IMPORTANT: EmailJS template must have recipient field mapped in EmailJS service settings
    // Common field names: to_email, user_email, email, reply_to
    // Make sure your EmailJS service "To Email" field is mapped to one of these
    const templateParams = {
      to_email: userEmail,      // Primary recipient field (check EmailJS service mapping)
      user_email: userEmail,    // Backup recipient field
      email: userEmail,         // Another common recipient field name
      user_name: userName || userEmail.split('@')[0],
      otp_code: otp,
      expiry_time: formattedTime,
      app_name: 'Zennest',
      app_link: window.location.origin + '/host/verify-email',
      website_link: window.location.origin,
      current_year: new Date().getFullYear(),
    };

    console.log('📧 Sending host verification email with parameters:', {
      to_email: templateParams.to_email,
      user_name: templateParams.user_name,
      user_email: templateParams.user_email,
      otp_code: templateParams.otp_code
    });

    const result = await emailjs.send(
      config.serviceId,
      config.hostTemplateId, // Use host-specific template
      templateParams,
      config.publicKey
    );

    console.log('✅ Host verification email sent successfully!', result.status, result.text);

    // Store OTP with timestamp (valid for 15 minutes)
    otpStorage.set(userEmail, {
      otp: otp,
      timestamp: Date.now(),
      expiresAt: Date.now() + 15 * 60 * 1000 // 15 minutes
    });

    return { success: true, result };
  } catch (error) {
    console.error('❌ Host email sending failed:', {
      status: error.status,
      text: error.text,
      message: error.message
    });
    
    return { 
      success: false, 
      error: `Failed to send verification email: ${error.text || 'Please try again.'}` 
    };
  }
};

// Resend OTP
export const resendOTP = async (userEmail, userName = '', isHost = false) => {
  const newOTP = generateOTP();
  if (isHost) {
    return await sendHostVerificationEmail(userEmail, newOTP, userName);
  }
  return await sendVerificationEmail(userEmail, newOTP, userName);
};

// Send booking confirmation email
export const sendBookingConfirmationEmail = async (bookingData) => {
  try {
    // Use booking account (NEW ACCOUNT) for booking emails
    const config = emailjsConfig.booking || {
      publicKey: emailjsConfig.publicKey,
      serviceId: emailjsConfig.serviceId,
      bookingConfirmationTemplateId: emailjsConfig.bookingConfirmationTemplateId
    };

    if (!config.bookingConfirmationTemplateId || config.bookingConfirmationTemplateId.trim() === '') {
      console.warn('⚠️ Booking confirmation template ID not configured. Skipping email.');
      return { success: false, error: 'Email template not configured' };
    }

    // Initialize EmailJS with booking account public key
    emailjs.init(config.publicKey);

    const {
      guestEmail,
      guestName,
      hostEmail,
      hostName,
      listingTitle,
      listingLocation,
      checkIn,
      checkOut,
      guests,
      nights,
      totalAmount,
      bookingId,
      category
    } = bookingData;

    // Format dates
    const formatDate = (date) => {
      if (!date) return 'N/A';
      const dateObj = date instanceof Date ? date : new Date(date);
      if (isNaN(dateObj.getTime())) return 'N/A';
      return dateObj.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    };

    // Send email to guest
    const guestTemplateParams = {
      user_email: guestEmail,
      user_name: guestName || guestEmail?.split('@')[0] || 'Guest',
      booking_id: bookingId || 'N/A',
      listing_title: listingTitle || 'Listing',
      listing_location: listingLocation || 'Location not specified',
      check_in: checkIn ? formatDate(checkIn) : 'N/A',
      check_out: checkOut ? formatDate(checkOut) : 'N/A',
      guests: guests || 1,
      nights: nights || 0,
      total_amount: `₱${(totalAmount || 0).toLocaleString()}`,
      category: category || 'booking',
      host_name: hostName || 'Host',
      app_name: 'Zennest',
      website_link: window.location.origin,
      booking_link: `${window.location.origin}/booking/${bookingId}`,
      current_year: new Date().getFullYear(),
    };

    // Send email to host
    const hostTemplateParams = {
      user_email: hostEmail,
      user_name: hostName || hostEmail?.split('@')[0] || 'Host',
      booking_id: bookingId || 'N/A',
      listing_title: listingTitle || 'Listing',
      listing_location: listingLocation || 'Location not specified',
      check_in: checkIn ? formatDate(checkIn) : 'N/A',
      check_out: checkOut ? formatDate(checkOut) : 'N/A',
      guests: guests || 1,
      nights: nights || 0,
      total_amount: `₱${(totalAmount || 0).toLocaleString()}`,
      category: category || 'booking',
      guest_name: guestName || 'Guest',
      app_name: 'Zennest',
      website_link: window.location.origin,
      booking_link: `${window.location.origin}/host/bookings`,
      current_year: new Date().getFullYear(),
    };

    // Send to guest
    if (guestEmail) {
      try {
        await emailjs.send(
          config.serviceId,
          config.bookingConfirmationTemplateId,
          guestTemplateParams,
          config.publicKey
        );
        console.log('✅ Booking confirmation email sent to guest:', guestEmail);
      } catch (error) {
        console.error('❌ Failed to send email to guest:', error);
      }
    }

    // Send to host
    if (hostEmail) {
      try {
        await emailjs.send(
          config.serviceId,
          config.bookingConfirmationTemplateId,
          hostTemplateParams,
          config.publicKey
        );
        console.log('✅ Booking confirmation email sent to host:', hostEmail);
      } catch (error) {
        console.error('❌ Failed to send email to host:', error);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Error sending booking confirmation email:', error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
};

// Send booking cancellation email
export const sendBookingCancellationEmail = async (bookingData) => {
  try {
    // Use booking account (NEW ACCOUNT) for booking emails
    const config = emailjsConfig.booking || {
      publicKey: emailjsConfig.publicKey,
      serviceId: emailjsConfig.serviceId,
      bookingCancellationTemplateId: emailjsConfig.bookingCancellationTemplateId
    };

    if (!config.bookingCancellationTemplateId || config.bookingCancellationTemplateId.trim() === '') {
      console.warn('⚠️ Booking cancellation template ID not configured. Skipping email.');
      return { success: false, error: 'Email template not configured' };
    }

    // Initialize EmailJS with booking account public key
    emailjs.init(config.publicKey);

    const {
      guestEmail,
      guestName,
      hostEmail,
      hostName,
      listingTitle,
      listingLocation,
      checkIn,
      checkOut,
      guests,
      nights,
      totalAmount,
      bookingId,
      category,
      cancelledBy
    } = bookingData;

    // Format dates
    const formatDate = (date) => {
      if (!date) return 'N/A';
      const dateObj = date instanceof Date ? date : new Date(date);
      if (isNaN(dateObj.getTime())) return 'N/A';
      return dateObj.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    };

    // Send email to guest
    const guestTemplateParams = {
      user_email: guestEmail,
      user_name: guestName || guestEmail?.split('@')[0] || 'Guest',
      booking_id: bookingId || 'N/A',
      listing_title: listingTitle || 'Listing',
      listing_location: listingLocation || 'Location not specified',
      check_in: checkIn ? formatDate(checkIn) : 'N/A',
      check_out: checkOut ? formatDate(checkOut) : 'N/A',
      guests: guests || 1,
      nights: nights || 0,
      total_amount: `₱${(totalAmount || 0).toLocaleString()}`,
      category: category || 'booking',
      host_name: hostName || 'Host',
      cancelled_by: cancelledBy || 'You',
      app_name: 'Zennest',
      website_link: window.location.origin,
      current_year: new Date().getFullYear(),
    };

    // Send email to host
    const hostTemplateParams = {
      user_email: hostEmail,
      user_name: hostName || hostEmail?.split('@')[0] || 'Host',
      booking_id: bookingId || 'N/A',
      listing_title: listingTitle || 'Listing',
      listing_location: listingLocation || 'Location not specified',
      check_in: checkIn ? formatDate(checkIn) : 'N/A',
      check_out: checkOut ? formatDate(checkOut) : 'N/A',
      guests: guests || 1,
      nights: nights || 0,
      total_amount: `₱${(totalAmount || 0).toLocaleString()}`,
      category: category || 'booking',
      guest_name: guestName || 'Guest',
      cancelled_by: cancelledBy || 'Guest',
      app_name: 'Zennest',
      website_link: window.location.origin,
      current_year: new Date().getFullYear(),
    };

    // Send to guest
    if (guestEmail) {
      try {
        await emailjs.send(
          config.serviceId,
          config.bookingCancellationTemplateId,
          guestTemplateParams,
          config.publicKey
        );
        console.log('✅ Booking cancellation email sent to guest:', guestEmail);
      } catch (error) {
        console.error('❌ Failed to send cancellation email to guest:', error);
      }
    }

    // Send to host
    if (hostEmail) {
      try {
        await emailjs.send(
          config.serviceId,
          config.bookingCancellationTemplateId,
          hostTemplateParams,
          config.publicKey
        );
        console.log('✅ Booking cancellation email sent to host:', hostEmail);
      } catch (error) {
        console.error('❌ Failed to send cancellation email to host:', error);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Error sending booking cancellation email:', error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
};

// Initialize EmailJS
// Note: EmailJS will be initialized per-request with the correct account
// This function initializes the registration account by default (for backwards compatibility)
export const initEmailJS = () => {
  try {
    // Initialize with registration account (OLD ACCOUNT) by default
    const config = emailjsConfig.registration || {
      publicKey: emailjsConfig.publicKey
    };

    if (!config.publicKey) {
      console.error('❌ EmailJS public key is missing');
      return false;
    }
    
    emailjs.init(config.publicKey);
    console.log('✅ EmailJS initialized successfully (Registration Account)');
    return true;
  } catch (error) {
    console.error('❌ EmailJS initialization failed:', error);
    return false;
  }
};