import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getGuestProfile, createUserProfile, updateUserProfile } from '../services/firestoreService';
import { uploadImageToCloudinary } from '../config/cloudinary';
import useAuth from '../hooks/useAuth';
import SettingsHeader from '../components/SettingsHeader';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { reauthenticateWithCredential, updatePassword, EmailAuthProvider } from 'firebase/auth';
import {
  FaUser,
  FaEdit,
  FaSave,
  FaTimes,
  FaCheckCircle,
  FaCamera,
  FaPhone,
  FaMapMarkerAlt,
  FaFileAlt,
  FaLock,
  FaBell,
  FaExclamationCircle,
  FaInfoCircle,
  FaChevronDown,
  FaShieldAlt,
  FaCreditCard,
  FaSignOutAlt,
  FaTrash,
  FaCheck,
  FaSpinner,
  FaEye,
  FaEyeSlash
} from 'react-icons/fa';

const UserSettings = () => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    profile: true,
    contact: true,
    preferences: false,
    security: false
  });

  // Image crop state
  const [showImageCrop, setShowImageCrop] = useState(false);
  const [cropImage, setCropImage] = useState(null);
  const [crop, setCrop] = useState({ unit: '%', width: 50, aspect: 1 / 1 });
  const [completedCrop, setCompletedCrop] = useState(null);
  const imgRef = useRef(null);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    bio: '',
    address: '',
    province: '',
    profilePicture: '',
    emailNotifications: true,
    smsNotifications: false,
    marketingEmails: false,
    twoFactorEnabled: false
  });

  const [originalData, setOriginalData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordTouched, setPasswordTouched] = useState({});
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // Auto-hide notifications
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      if (!user?.uid) {
        setError('User not authenticated. Please log in again.');
        setLoading(false);
        return;
      }

      const result = await getGuestProfile(user.uid);

      if (result.success && result.data) {
        const data = result.data;
        const newFormData = {
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || user.email || '',
          phone: data.phone || '',
          bio: data.bio || '',
          address: data.address || '',
          province: data.province || '',
          profilePicture: data.profilePicture || '',
          emailNotifications: data.emailNotifications !== false,
          smsNotifications: data.smsNotifications || false,
          marketingEmails: data.marketingEmails || false,
          twoFactorEnabled: data.twoFactorEnabled || false
        };
        setFormData(newFormData);
        setOriginalData(newFormData);
      } else {
        await createUserProfile(user.uid, {
          firstName: user.displayName?.split(' ')[0] || '',
          lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
          email: user.email || '',
          profilePicture: user.photoURL || ''
        });

        const newResult = await getGuestProfile(user.uid);
        if (newResult.success && newResult.data) {
          const data = newResult.data;
          const newFormData = {
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            email: data.email || user.email || '',
            phone: data.phone || '',
            bio: data.bio || '',
            address: data.address || '',
            province: data.province || '',
            profilePicture: data.profilePicture || user.photoURL || '',
            emailNotifications: data.emailNotifications !== false,
            smsNotifications: data.smsNotifications || false,
            marketingEmails: data.marketingEmails || false,
            twoFactorEnabled: data.twoFactorEnabled || false
          };
          setFormData(newFormData);
          setOriginalData(newFormData);
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setError('Failed to load settings. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const validateField = (name, value) => {
    if (!touchedFields[name]) return '';

    switch (name) {
      case 'firstName':
      case 'lastName':
        if (!value?.trim()) return `${name === 'firstName' ? 'First' : 'Last'} name is required`;
        if (!/^[A-Za-z\s]+$/.test(value)) return 'Only letters and spaces allowed';
        return '';
      case 'email':
        if (!value?.trim()) return 'Email is required';
        if (!/\S+@\S+\.\S+/.test(value)) return 'Invalid email address';
        return '';
      case 'phone':
        if (value && !/^\+?[\d\s()-]+$/.test(value)) return 'Invalid phone number';
        return '';
      case 'bio':
        if (value && value.length > 500) return 'Bio must be less than 500 characters';
        return '';
      default:
        return '';
    }
  };

  const handleFieldChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    setTouchedFields(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    setFieldErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleFieldBlur = (name) => {
    setTouchedFields(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, formData[name]);
    setFieldErrors(prev => ({ ...prev, [name]: error }));
  };

  // Image crop functions
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCropImage(reader.result);
      setShowImageCrop(true);
    };
    reader.readAsDataURL(file);
  };

  const getCroppedImage = async () => {
    if (!completedCrop || !imgRef.current) return null;

    const image = imgRef.current;
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const pixelRatio = window.devicePixelRatio || 1;

    canvas.width = completedCrop.width * pixelRatio * scaleX;
    canvas.height = completedCrop.height * pixelRatio * scaleY;

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 0.95);
    });
  };

  const handleUploadCroppedImage = async () => {
    setUploadingPicture(true);
    try {
      const blob = await getCroppedImage();
      if (!blob) throw new Error('Failed to crop image');

      const file = new File([blob], 'profile-picture.jpg', { type: 'image/jpeg' });
      const result = await uploadImageToCloudinary(file);

      if (result.success && result.url) {
        setFormData(prev => ({ ...prev, profilePicture: result.url }));
        setShowImageCrop(false);
        setCropImage(null);
        setSuccess('Profile picture updated successfully!');

        // Auto-save profile picture
        await updateUserProfile(user.uid, { profilePicture: result.url });
      } else {
        setError(result.error || 'Failed to upload profile picture');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      setError('Failed to upload profile picture. Please try again.');
    } finally {
      setUploadingPicture(false);
    }
  };

  const handleSave = async () => {
    // Validate all fields
    const newFieldErrors = {};
    Object.keys(formData).forEach(key => {
      if (['firstName', 'lastName', 'email', 'phone', 'bio'].includes(key)) {
        const error = validateField(key, formData[key]);
        if (error) newFieldErrors[key] = error;
      }
    });

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      setError('Please fix the errors before saving');
      return;
    }

    setSaving(true);
    try {
      const updateData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone?.trim() || '',
        bio: formData.bio?.trim() || '',
        address: formData.address?.trim() || '',
        province: formData.province?.trim() || '',
        emailNotifications: formData.emailNotifications,
        smsNotifications: formData.smsNotifications,
        marketingEmails: formData.marketingEmails,
        twoFactorEnabled: formData.twoFactorEnabled
      };

      const result = await updateUserProfile(user.uid, updateData);

      if (result?.success) {
        setSuccess('Profile updated successfully!');
        setError('');
        setOriginalData(formData);
        setIsEditing(false);
        setTouchedFields({});
        setFieldErrors({});
      } else {
        setError(result?.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setError('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(originalData);
    setIsEditing(false);
    setTouchedFields({});
    setFieldErrors({});
    setError('');
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalData);

  // Password validation
  const validatePasswordField = (name, value, allPasswordData = passwordData) => {
    if (!passwordTouched[name]) return '';

    switch (name) {
      case 'currentPassword':
        if (!value.trim()) return 'Current password is required';
        return '';
      case 'newPassword':
        if (!value.trim()) return 'New password is required';
        if (value.length < 6) return 'Password must be at least 6 characters';
        if (allPasswordData.currentPassword && value === allPasswordData.currentPassword) {
          return 'New password must be different from current password';
        }
        return '';
      case 'confirmPassword':
        if (!value.trim()) return 'Please confirm your new password';
        if (value !== allPasswordData.newPassword) return 'Passwords do not match';
        return '';
      default:
        return '';
    }
  };

  const handlePasswordFieldChange = (name, value) => {
    const newPasswordData = { ...passwordData, [name]: value };
    setPasswordData(newPasswordData);
    setPasswordTouched(prev => ({ ...prev, [name]: true }));
    
    // Validate the changed field with updated data
    const error = validatePasswordField(name, value, newPasswordData);
    setPasswordErrors(prev => ({ ...prev, [name]: error }));
    
    // If newPassword changed, re-validate confirmPassword if it's been touched
    if (name === 'newPassword' && passwordTouched.confirmPassword) {
      const confirmError = validatePasswordField('confirmPassword', newPasswordData.confirmPassword, newPasswordData);
      setPasswordErrors(prev => ({ ...prev, confirmPassword: confirmError }));
    }
  };

  const handlePasswordFieldBlur = (name) => {
    setPasswordTouched(prev => ({ ...prev, [name]: true }));
    const error = validatePasswordField(name, passwordData[name]);
    setPasswordErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleChangePassword = async () => {
    // Mark all fields as touched
    setPasswordTouched({
      currentPassword: true,
      newPassword: true,
      confirmPassword: true
    });

    // Validate all fields
    const newPasswordErrors = {};
    Object.keys(passwordData).forEach(key => {
      const error = validatePasswordField(key, passwordData[key]);
      if (error) newPasswordErrors[key] = error;
    });

    setPasswordErrors(newPasswordErrors);

    if (Object.keys(newPasswordErrors).length > 0) {
      setError('Please fix the errors before changing password');
      return;
    }

    // Check if user is authenticated with email/password
    if (!user || !user.email) {
      setError('User not authenticated or email not available');
      return;
    }

    // Check if user signed in with email/password (not Google OAuth)
    const providerData = user.providerData?.[0];
    if (providerData?.providerId !== 'password') {
      setError('Password change is only available for email/password accounts. If you signed in with Google, you need to change your password through Google.');
      return;
    }

    setChangingPassword(true);
    setError('');
    setSuccess('');

    try {
      // Reauthenticate user with current password
      const credential = EmailAuthProvider.credential(user.email, passwordData.currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, passwordData.newPassword);

      setSuccess('Password changed successfully!');
      
      // Reset password form
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setPasswordTouched({});
      setPasswordErrors({});
    } catch (error) {
      console.error('Error changing password:', error);
      let errorMessage = 'Failed to change password. Please try again.';
      
      switch (error.code) {
        case 'auth/wrong-password':
          errorMessage = 'Current password is incorrect. Please try again.';
          break;
        case 'auth/weak-password':
          errorMessage = 'New password is too weak. Please use a stronger password.';
          break;
        case 'auth/requires-recent-login':
          errorMessage = 'For security reasons, please log out and log back in before changing your password.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your internet connection and try again.';
          break;
        default:
          errorMessage = error.message || 'Failed to change password. Please try again.';
      }
      
      setError(errorMessage);
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pt-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-200 border-t-emerald-600 mx-auto mb-4"></div>
              <p className="text-gray-600 text-lg" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Loading your settings...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SettingsHeader />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pt-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-4xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Settings
            </h1>
            <p className="text-gray-600 text-lg" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Manage your account, preferences, and security
            </p>
          </motion.div>

          {/* Success/Error Notifications */}
          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-6 bg-gradient-to-r from-emerald-50 to-emerald-50 border-l-4 border-emerald-600 rounded-lg shadow-sm overflow-hidden"
              >
                <div className="px-4 sm:px-6 py-4 flex items-start gap-3">
                  <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.6 }}>
                    <FaCheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  </motion.div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-emerald-900" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      Success
                    </h3>
                    <p className="text-sm text-emerald-800 mt-0.5" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      {success}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-6 bg-gradient-to-r from-red-50 to-red-50 border-l-4 border-red-600 rounded-lg shadow-sm overflow-hidden"
              >
                <div className="px-4 sm:px-6 py-4 flex items-start gap-3">
                  <FaExclamationCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-red-900" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      Error
                    </h3>
                    <p className="text-sm text-red-800 mt-0.5" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      {error}
                    </p>
                  </div>
                  <button
                    onClick={() => setError('')}
                    className="text-red-600 hover:text-red-700"
                  >
                    <FaTimes className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Sidebar Navigation */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-1"
            >
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden sticky top-24">
                <nav className="space-y-1 p-4">
                  {[
                    { id: 'profile', label: 'Profile', icon: FaUser },
                    { id: 'contact', label: 'Contact Info', icon: FaPhone },
                    { id: 'preferences', label: 'Preferences', icon: FaBell },
                    { id: 'security', label: 'Security', icon: FaShieldAlt }
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setActiveTab(id)}
                      className={`
                        w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium text-sm
                        ${activeTab === id
                          ? 'bg-emerald-100 text-emerald-700 border-l-4 border-emerald-600'
                          : 'text-gray-600 hover:bg-gray-100'
                        }
                      `}
                      style={{ fontFamily: 'Poppins, sans-serif' }}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{label}</span>
                    </button>
                  ))}
                </nav>

                <div className="border-t border-gray-200 p-4 space-y-2">
                  <button
                    onClick={() => logout()}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-all font-medium text-sm"
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                  >
                    <FaSignOutAlt className="w-5 h-5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Main Content */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-2 space-y-6"
            >
              {/* Profile Section */}
              {(activeTab === 'profile' || activeTab === 'profile') && (
                <>
                  {/* Profile Picture Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
                  >
                    <div className="px-6 sm:px-8 py-6 space-y-6">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                          <FaCamera className="w-5 h-5 text-emerald-600" />
                          Profile Picture
                        </h2>
                        {!isEditing && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsEditing(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg transition-colors font-medium text-sm"
                            style={{ fontFamily: 'Poppins, sans-serif' }}
                          >
                            <FaEdit className="w-4 h-4" />
                            Edit
                          </motion.button>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                        {/* Avatar */}
                        <div className="relative group">
                          {formData.profilePicture ? (
                            <img
                              src={formData.profilePicture}
                              alt="Profile"
                              className="w-32 h-32 rounded-2xl object-cover border-4 border-emerald-200 shadow-lg"
                            />
                          ) : (
                            <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-4xl font-semibold border-4 border-emerald-200 shadow-lg">
                              {formData.firstName && formData.lastName ? (
                                `${formData.firstName.charAt(0)}${formData.lastName.charAt(0)}`
                              ) : (
                                <FaUser className="w-16 h-16" />
                              )}
                            </div>
                          )}
                          {isEditing && (
                            <div className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <FaCamera className="w-8 h-8 text-white" />
                            </div>
                          )}
                        </div>

                        {/* Upload Info */}
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                            {formData.profilePicture ? 'Update Your Photo' : 'Add a Profile Photo'}
                          </h3>
                          <p className="text-sm text-gray-600 mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
                            Upload a high-quality photo in JPG, PNG, or WebP format. Recommended size: 500x500px.
                          </p>
                          {isEditing && (
                            <motion.label
                              whileHover={{ scale: 1.02 }}
                              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-lg transition-all cursor-pointer font-medium shadow-lg"
                              style={{ fontFamily: 'Poppins, sans-serif' }}
                            >
                              {uploadingPicture ? (
                                <>
                                  <FaSpinner className="w-5 h-5 animate-spin" />
                                  <span>Uploading...</span>
                                </>
                              ) : (
                                <>
                                  <FaCamera className="w-5 h-5" />
                                  <span>Choose Photo</span>
                                </>
                              )}
                              <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                accept="image/jpeg,image/jpg,image/png,image/webp"
                                onChange={handleImageSelect}
                                disabled={uploadingPicture}
                              />
                            </motion.label>
                          )}
                          {!isEditing && formData.profilePicture && (
                            <div className="inline-flex items-center gap-2 text-emerald-600 font-medium">
                              <FaCheck className="w-5 h-5" />
                              <span style={{ fontFamily: 'Poppins, sans-serif' }}>Photo uploaded</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Image Crop Modal */}
                      <AnimatePresence>
                        {showImageCrop && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                          >
                            <motion.div
                              initial={{ scale: 0.95, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.95, opacity: 0 }}
                              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-4"
                            >
                              <h3 className="text-xl font-semibold text-gray-900" style={{ fontFamily: 'Poppins, sans-serif' }}>
                                Crop Your Photo
                              </h3>
                              <div className="w-full max-h-[60vh] overflow-hidden rounded-lg bg-gray-100 flex items-center justify-center">
                                <ReactCrop
                                  crop={crop}
                                  onChange={(c) => setCrop(c)}
                                  onComplete={(c) => setCompletedCrop(c)}
                                  aspect={1}
                                  circularCrop
                                  className="max-w-full max-h-full"
                                >
                                  <img
                                    ref={imgRef}
                                    alt="Crop preview"
                                    src={cropImage}
                                    style={{
                                      maxWidth: '100%',
                                      maxHeight: '60vh',
                                      width: 'auto',
                                      height: 'auto',
                                      objectFit: 'contain',
                                      display: 'block'
                                    }}
                                  />
                                </ReactCrop>
                              </div>

                              <div className="flex gap-3">
                                <motion.button
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => {
                                    setShowImageCrop(false);
                                    setCropImage(null);
                                  }}
                                  className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition-colors"
                                  style={{ fontFamily: 'Poppins, sans-serif' }}
                                >
                                  Cancel
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={handleUploadCroppedImage}
                                  disabled={uploadingPicture}
                                  className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                                  style={{ fontFamily: 'Poppins, sans-serif' }}
                                >
                                  {uploadingPicture ? 'Uploading...' : 'Save Photo'}
                                </motion.button>
                              </div>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>

                  {/* Profile Information Card */}
                  <CollapsibleSection
                    title="Personal Information"
                    icon={FaUser}
                    isOpen={expandedSections.profile}
                    onToggle={() => toggleSection('profile')}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <FormField
                        label="First Name"
                        value={formData.firstName}
                        onChange={(value) => handleFieldChange('firstName', value)}
                        onBlur={() => handleFieldBlur('firstName')}
                        error={fieldErrors.firstName}
                        disabled={!isEditing}
                        required
                      />
                      <FormField
                        label="Last Name"
                        value={formData.lastName}
                        onChange={(value) => handleFieldChange('lastName', value)}
                        onBlur={() => handleFieldBlur('lastName')}
                        error={fieldErrors.lastName}
                        disabled={!isEditing}
                        required
                      />
                      <FormField
                        label="Email Address"
                        type="email"
                        value={formData.email}
                        error={fieldErrors.email}
                        disabled
                        info="Email cannot be changed"
                      />

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                          Bio
                        </label>
                        <textarea
                          value={formData.bio}
                          onChange={(e) => handleFieldChange('bio', e.target.value)}
                          onBlur={() => handleFieldBlur('bio')}
                          disabled={!isEditing}
                          rows={4}
                          placeholder="Tell us about yourself..."
                          maxLength={500}
                          className={`
                            w-full px-4 py-3 border-2 rounded-xl resize-none transition-all
                            ${fieldErrors.bio
                              ? 'border-red-500 focus:border-red-600 bg-red-50'
                              : isEditing
                              ? 'border-gray-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100'
                              : 'border-gray-200 bg-gray-50'
                            }
                            disabled:opacity-50 disabled:cursor-not-allowed
                            focus:outline-none
                          `}
                          style={{ fontFamily: 'Poppins, sans-serif' }}
                        />
                        <div className="mt-2 flex items-center justify-between">
                          {fieldErrors.bio && (
                            <p className="text-xs text-red-600 flex items-center gap-1">
                              <FaExclamationCircle className="w-3.5 h-3.5" />
                              {fieldErrors.bio}
                            </p>
                          )}
                          <p className={`text-xs ml-auto ${formData.bio.length > 450 ? 'text-orange-600' : 'text-gray-500'}`} style={{ fontFamily: 'Poppins, sans-serif' }}>
                            {formData.bio.length}/500
                          </p>
                        </div>
                      </div>
                    </div>
                  </CollapsibleSection>
                </>
              )}

              {/* Contact Section */}
              {activeTab === 'contact' && (
                <CollapsibleSection
                  title="Contact Information"
                  icon={FaPhone}
                  isOpen={expandedSections.contact}
                  onToggle={() => toggleSection('contact')}
                >
                  <div className="grid grid-cols-1 gap-6">
                    <FormField
                      label="Phone Number"
                      type="tel"
                      value={formData.phone}
                      onChange={(value) => handleFieldChange('phone', value)}
                      onBlur={() => handleFieldBlur('phone')}
                      error={fieldErrors.phone}
                      disabled={!isEditing}
                      placeholder="+63 (XXX) XXX-XXXX"
                      icon={FaPhone}
                    />
                    <FormField
                      label="Address"
                      value={formData.address}
                      onChange={(value) => handleFieldChange('address', value)}
                      onBlur={() => handleFieldBlur('address')}
                      disabled={!isEditing}
                      placeholder="Street address, City..."
                      icon={FaMapMarkerAlt}
                    />
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                        Province
                      </label>
                      <select
                        value={formData.province}
                        onChange={(e) => handleFieldChange('province', e.target.value)}
                        onBlur={() => handleFieldBlur('province')}
                        disabled={!isEditing}
                        className={`
                          w-full px-4 py-3 border-2 rounded-xl transition-all
                          ${fieldErrors.province
                            ? 'border-red-500 focus:border-red-600 bg-red-50'
                            : isEditing
                            ? 'border-gray-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100'
                            : 'border-gray-200 bg-gray-50'
                          }
                          disabled:opacity-50 disabled:cursor-not-allowed
                          focus:outline-none
                        `}
                        style={{ fontFamily: 'Poppins, sans-serif' }}
                      >
                        <option value="">Select Province</option>
                        <option value="Metro Manila">Metro Manila</option>
                        <option value="Bulacan">Bulacan</option>
                        <option value="Cavite">Cavite</option>
                        <option value="Laguna">Laguna</option>
                        <option value="Rizal">Rizal</option>
                        <option value="Pampanga">Pampanga</option>
                        <option value="Batangas">Batangas</option>
                        <option value="Quezon">Quezon</option>
                        <option value="Nueva Ecija">Nueva Ecija</option>
                        <option value="Tarlac">Tarlac</option>
                        <option value="Zambales">Zambales</option>
                        <option value="Bataan">Bataan</option>
                        <option value="Aurora">Aurora</option>
                        <option value="Albay">Albay</option>
                        <option value="Cebu">Cebu</option>
                        <option value="Davao del Sur">Davao del Sur</option>
                        <option value="Iloilo">Iloilo</option>
                        <option value="Negros Occidental">Negros Occidental</option>
                        <option value="Pangasinan">Pangasinan</option>
                        <option value="Other">Other</option>
                      </select>
                      {fieldErrors.province && (
                        <p className="mt-2 text-xs text-red-600 flex items-center gap-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
                          <FaExclamationCircle className="w-3.5 h-3.5" />
                          {fieldErrors.province}
                        </p>
                      )}
                    </div>
                  </div>
                </CollapsibleSection>
              )}

              {/* Preferences Section */}
              {activeTab === 'preferences' && (
                <CollapsibleSection
                  title="Notifications & Preferences"
                  icon={FaBell}
                  isOpen={expandedSections.preferences}
                  onToggle={() => toggleSection('preferences')}
                >
                  <div className="space-y-4">
                    <ToggleField
                      label="Email Notifications"
                      description="Receive notifications about messages and bookings"
                      value={formData.emailNotifications}
                      onChange={(value) => setFormData(prev => ({ ...prev, emailNotifications: value }))}
                      disabled={!isEditing}
                    />
                    <ToggleField
                      label="SMS Notifications"
                      description="Receive SMS alerts for important updates"
                      value={formData.smsNotifications}
                      onChange={(value) => setFormData(prev => ({ ...prev, smsNotifications: value }))}
                      disabled={!isEditing}
                    />
                    <ToggleField
                      label="Marketing Emails"
                      description="Receive promotional offers and updates"
                      value={formData.marketingEmails}
                      onChange={(value) => setFormData(prev => ({ ...prev, marketingEmails: value }))}
                      disabled={!isEditing}
                    />
                  </div>
                </CollapsibleSection>
              )}

              {/* Security Section */}
              {activeTab === 'security' && (
                <CollapsibleSection
                  title="Security Settings"
                  icon={FaShieldAlt}
                  isOpen={expandedSections.security}
                  onToggle={() => toggleSection('security')}
                >
                  <div className="space-y-6">
                    {/* Change Password Section */}
                    <div className="border-b border-gray-200 pb-6">
                      <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                        <FaLock className="w-4 h-4 text-emerald-600" />
                        Change Password
                      </h4>
                      <div className="space-y-4">
                        {/* Current Password */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                            Current Password <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type={showPasswords.current ? 'text' : 'password'}
                              value={passwordData.currentPassword}
                              onChange={(e) => handlePasswordFieldChange('currentPassword', e.target.value)}
                              onBlur={() => handlePasswordFieldBlur('currentPassword')}
                              placeholder="Enter your current password"
                              className={`
                                w-full px-4 py-3 pr-12 border-2 rounded-xl transition-all
                                ${passwordErrors.currentPassword
                                  ? 'border-red-500 focus:border-red-600 bg-red-50'
                                  : 'border-gray-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100'
                                }
                                focus:outline-none
                              `}
                              style={{ fontFamily: 'Poppins, sans-serif' }}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                            >
                              {showPasswords.current ? <FaEyeSlash className="w-5 h-5" /> : <FaEye className="w-5 h-5" />}
                            </button>
                          </div>
                          {passwordErrors.currentPassword && (
                            <p className="mt-2 text-xs text-red-600 flex items-center gap-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
                              <FaExclamationCircle className="w-3.5 h-3.5" />
                              {passwordErrors.currentPassword}
                            </p>
                          )}
                        </div>

                        {/* New Password */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                            New Password <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type={showPasswords.new ? 'text' : 'password'}
                              value={passwordData.newPassword}
                              onChange={(e) => handlePasswordFieldChange('newPassword', e.target.value)}
                              onBlur={() => handlePasswordFieldBlur('newPassword')}
                              placeholder="Enter your new password"
                              className={`
                                w-full px-4 py-3 pr-12 border-2 rounded-xl transition-all
                                ${passwordErrors.newPassword
                                  ? 'border-red-500 focus:border-red-600 bg-red-50'
                                  : 'border-gray-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100'
                                }
                                focus:outline-none
                              `}
                              style={{ fontFamily: 'Poppins, sans-serif' }}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                            >
                              {showPasswords.new ? <FaEyeSlash className="w-5 h-5" /> : <FaEye className="w-5 h-5" />}
                            </button>
                          </div>
                          {passwordErrors.newPassword && (
                            <p className="mt-2 text-xs text-red-600 flex items-center gap-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
                              <FaExclamationCircle className="w-3.5 h-3.5" />
                              {passwordErrors.newPassword}
                            </p>
                          )}
                          {!passwordErrors.newPassword && passwordTouched.newPassword && (
                            <p className="mt-2 text-xs text-gray-500" style={{ fontFamily: 'Poppins, sans-serif' }}>
                              Password must be at least 6 characters
                            </p>
                          )}
                        </div>

                        {/* Confirm New Password */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                            Confirm New Password <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type={showPasswords.confirm ? 'text' : 'password'}
                              value={passwordData.confirmPassword}
                              onChange={(e) => handlePasswordFieldChange('confirmPassword', e.target.value)}
                              onBlur={() => handlePasswordFieldBlur('confirmPassword')}
                              placeholder="Re-enter your new password"
                              className={`
                                w-full px-4 py-3 pr-12 border-2 rounded-xl transition-all
                                ${passwordErrors.confirmPassword
                                  ? 'border-red-500 focus:border-red-600 bg-red-50'
                                  : 'border-gray-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100'
                                }
                                focus:outline-none
                              `}
                              style={{ fontFamily: 'Poppins, sans-serif' }}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                            >
                              {showPasswords.confirm ? <FaEyeSlash className="w-5 h-5" /> : <FaEye className="w-5 h-5" />}
                            </button>
                          </div>
                          {passwordErrors.confirmPassword && (
                            <p className="mt-2 text-xs text-red-600 flex items-center gap-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
                              <FaExclamationCircle className="w-3.5 h-3.5" />
                              {passwordErrors.confirmPassword}
                            </p>
                          )}
                        </div>

                        {/* Change Password Button */}
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleChangePassword}
                          disabled={changingPassword}
                          className={`
                            w-full px-6 py-3 rounded-xl transition-all font-semibold flex items-center justify-center gap-2
                            ${changingPassword
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg'
                            }
                          `}
                          style={{ fontFamily: 'Poppins, sans-serif' }}
                        >
                          {changingPassword ? (
                            <>
                              <FaSpinner className="w-5 h-5 animate-spin" />
                              <span>Changing Password...</span>
                            </>
                          ) : (
                            <>
                              <FaLock className="w-5 h-5" />
                              <span>Change Password</span>
                            </>
                          )}
                        </motion.button>
                      </div>
                    </div>

                    <ToggleField
                      label="Two-Factor Authentication"
                      description="Add an extra layer of security to your account"
                      value={formData.twoFactorEnabled}
                      onChange={(value) => setFormData(prev => ({ ...prev, twoFactorEnabled: value }))}
                      disabled={!isEditing}
                    />

                    <div className="border-t border-gray-200 pt-6">
                      <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                        <FaCreditCard className="w-4 h-4 text-emerald-600" />
                        Payment Methods
                      </h4>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full px-4 py-3 border-2 border-dashed border-gray-300 hover:border-emerald-500 text-gray-600 hover:text-emerald-600 rounded-xl transition-all font-medium"
                        style={{ fontFamily: 'Poppins, sans-serif' }}
                      >
                        Add Payment Method
                      </motion.button>
                    </div>

                    <div className="border-t border-gray-200 pt-6">
                      <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                        <FaTrash className="w-4 h-4 text-red-600" />
                        Danger Zone
                      </h4>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full px-4 py-3 bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 border-2 border-red-200 rounded-xl transition-all font-medium"
                        style={{ fontFamily: 'Poppins, sans-serif' }}
                      >
                        Delete Account
                      </motion.button>
                    </div>
                  </div>
                </CollapsibleSection>
              )}

              {/* Action Buttons */}
              {isEditing && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="sticky bottom-0 bg-gradient-to-t from-slate-100 to-transparent pt-6 pb-4 flex gap-3 sm:flex-row flex-col-reverse"
                >
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCancel}
                    className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-xl transition-colors font-semibold"
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSave}
                    disabled={saving || !hasChanges}
                    className={`
                      flex-1 px-6 py-3 rounded-xl transition-all font-semibold flex items-center justify-center gap-2
                      ${saving || !hasChanges
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg'
                      }
                    `}
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                  >
                    {saving ? (
                      <>
                        <FaSpinner className="w-5 h-5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <FaSave className="w-5 h-5" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </motion.button>
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
};

// Reusable Components

const FormField = ({
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  disabled,
  required,
  placeholder,
  info,
  icon: Icon
}) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <div className="relative">
      {Icon && (
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Icon className={`w-4 h-4 ${error ? 'text-red-500' : 'text-gray-400'}`} />
        </div>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        placeholder={placeholder}
        className={`
          w-full ${Icon ? 'pl-10' : 'px-4'} pr-4 py-3 border-2 rounded-xl transition-all
          ${error
            ? 'border-red-500 focus:border-red-600 bg-red-50'
            : disabled
            ? 'border-gray-200 bg-gray-50'
            : 'border-gray-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
          focus:outline-none
        `}
        style={{ fontFamily: 'Poppins, sans-serif' }}
      />
    </div>
    {error && (
      <p className="mt-2 text-xs text-red-600 flex items-center gap-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
        <FaExclamationCircle className="w-3.5 h-3.5" />
        {error}
      </p>
    )}
    {info && !error && (
      <p className="mt-2 text-xs text-gray-500 flex items-center gap-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
        <FaInfoCircle className="w-3.5 h-3.5" />
        {info}
      </p>
    )}
  </div>
);

const ToggleField = ({ label, description, value, onChange, disabled }) => (
  <div className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
    <div>
      <h4 className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Poppins, sans-serif' }}>
        {label}
      </h4>
      <p className="text-xs text-gray-600 mt-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
        {description}
      </p>
    </div>
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => onChange(!value)}
      disabled={disabled}
      className={`
        relative inline-flex h-8 w-14 items-center rounded-full transition-all
        ${value ? 'bg-emerald-600' : 'bg-gray-300'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <motion.span
        layout
        className="inline-block h-6 w-6 transform rounded-full bg-white shadow-lg"
        animate={{ x: value ? 28 : 4 }}
      />
    </motion.button>
  </div>
);

const CollapsibleSection = ({ title, icon: Icon, isOpen, onToggle, children }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
  >
    <button
      onClick={onToggle}
      className="w-full px-6 sm:px-8 py-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
    >
      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-3" style={{ fontFamily: 'Poppins, sans-serif' }}>
        <Icon className="w-5 h-5 text-emerald-600" />
        {title}
      </h2>
      <motion.div
        animate={{ rotate: isOpen ? 180 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <FaChevronDown className="w-5 h-5 text-gray-400" />
      </motion.div>
    </button>

    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="border-t border-gray-200 px-6 sm:px-8 py-6"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  </motion.div>
);

export default UserSettings;  