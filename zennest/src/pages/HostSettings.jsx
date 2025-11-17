// src/pages/HostSettings.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getHostProfile, updateHostProfile, cancelSubscription, deleteHostAccount, getSubscriptionListingLimit, canCreateListing } from '../services/firestoreService';
import { uploadImageToCloudinary } from '../config/cloudinary';
import useAuth from '../hooks/useAuth';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, deleteUser } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useNavigate } from 'react-router-dom';
import {
  FaUser,
  FaEdit,
  FaSave,
  FaTimes,
  FaCheckCircle,
  FaImage,
  FaCamera,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaExclamationCircle,
  FaCreditCard,
  FaCrown,
  FaBan,
  FaUserTimes
} from 'react-icons/fa';

const HostSettings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [hostProfile, setHostProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cancellingSubscription, setCancellingSubscription] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [listingInfo, setListingInfo] = useState(null);
  
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    bio: '',
    address: '',
    profilePicture: ''
  });
  const [uploadingPicture, setUploadingPicture] = useState(false);

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!user || !user.uid) {
        setError('User not authenticated. Please log in again.');
        setLoading(false);
        return;
      }

      console.log('🔍 Fetching host settings data for user:', user.uid);
      
      // Fetch profile data
      const profileResult = await getHostProfile(user.uid);
      if (profileResult && profileResult.success && profileResult.data) {
        const data = profileResult.data;
        console.log('✅ Fetched profile data:', { 
          hasProfilePicture: !!data.profilePicture,
          firstName: data.firstName,
          lastName: data.lastName 
        });
        
        setHostProfile(data);
        setProfileData({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || user.email || '',
          phone: data.phone || '',
          bio: data.bio || '',
          address: data.address || '',
          profilePicture: data.profilePicture || ''
        });
      } else {
        const errorMsg = profileResult?.error || 'Host profile not found';
        console.warn('⚠️ Profile fetch issue:', errorMsg);
        setError(`Failed to load profile: ${errorMsg}`);
        
        // Still set empty profile data so form can be used
        setProfileData({
          firstName: '',
          lastName: '',
          email: user.email || '',
          phone: '',
          bio: '',
          address: '',
          profilePicture: ''
        });
      }

      // Get listing info for subscription tab
      if (profileResult && profileResult.success && profileResult.data) {
        const listingCheck = await canCreateListing(user.uid);
        setListingInfo(listingCheck);
      }

      console.log('✅ Settings data loaded');
    } catch (error) {
      console.error('❌ Error fetching settings data:', error);
      setError(`Failed to load data: ${error.message || 'Please refresh the page.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size must be less than 5MB');
      setTimeout(() => setUploadError(''), 5000);
      e.target.value = '';
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Please upload a valid image file (JPG, PNG, or WebP)');
      setTimeout(() => setUploadError(''), 5000);
      e.target.value = '';
      return;
    }

    setUploadingPicture(true);
    setUploadError('');
    
    try {
      const result = await uploadImageToCloudinary(file);
      if (result.success && result.url) {
        setProfileData(prev => ({ ...prev, profilePicture: result.url }));
        // Auto-save profile picture immediately
        await updateHostProfile(user.uid, { profilePicture: result.url });
        await fetchData();
        setSuccess('Profile picture uploaded successfully!');
        setTimeout(() => setSuccess(''), 4000);
      } else {
        setUploadError(result.error || 'Failed to upload profile picture');
        setTimeout(() => setUploadError(''), 5000);
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      setUploadError('Failed to upload profile picture. Please try again.');
      setTimeout(() => setUploadError(''), 5000);
    } finally {
      setUploadingPicture(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleProfileUpdate = async () => {
    // Validation
    if (!profileData.firstName?.trim() || !profileData.lastName?.trim()) {
      alert('Please enter your first and last name');
      return;
    }

    setSaving(true);
    setError('');
    
    try {
      console.log('Updating profile with data:', profileData);
      
      // Prepare clean data - trim strings and remove empty values
      const updateData = {
        firstName: profileData.firstName.trim(),
        lastName: profileData.lastName.trim(),
        phone: profileData.phone?.trim() || '',
        bio: profileData.bio?.trim() || '',
        address: profileData.address?.trim() || '',
        profilePicture: profileData.profilePicture || ''
      };

      console.log('Sending update data:', updateData);
      const result = await updateHostProfile(user.uid, updateData);
      
      console.log('Update result:', result);
      
      if (!result || !result.success) {
        throw new Error(result?.error || 'Update failed - no success response');
      }
      
      // Success - show message and refresh data
      setSuccess('Profile updated successfully!');
      setError('');
      setSaving(false);
      
      // Wait a moment for Firestore to update, then refresh
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Refresh data after successful update
      await fetchData();
      
      // Close edit mode after refresh completes
      setEditingProfile(false);
      
      // Clear success message after 4 seconds
      setTimeout(() => {
        setSuccess('');
      }, 4000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(`Failed to update profile: ${error.message || 'Please try again.'}`);
      setSuccess('');
      setSaving(false);
    }
  };


  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    // Validation
    if (!passwordData.currentPassword) {
      setPasswordError('Please enter your current password');
      return;
    }

    if (!passwordData.newPassword) {
      setPasswordError('Please enter a new password');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      setPasswordError('New password must be different from current password');
      return;
    }

    setChangingPassword(true);

    try {
      // Re-authenticate user with current password
      const credential = EmailAuthProvider.credential(
        user.email,
        passwordData.currentPassword
      );
      
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, passwordData.newPassword);
      
      // Success
      setPasswordSuccess('Password changed successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      setTimeout(() => setPasswordSuccess(''), 4000);
    } catch (error) {
      console.error('Error changing password:', error);
      
      if (error.code === 'auth/wrong-password') {
        setPasswordError('Current password is incorrect');
      } else if (error.code === 'auth/weak-password') {
        setPasswordError('New password is too weak');
      } else if (error.code === 'auth/requires-recent-login') {
        setPasswordError('Please log out and log back in before changing your password');
      } else {
        setPasswordError('Failed to change password. Please try again.');
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription? You will lose access to all premium features and your listings will be unpublished.')) {
      return;
    }

    setCancellingSubscription(true);
    setError('');
    setSuccess('');

    try {
      await cancelSubscription(user.uid);
      setSuccess('Subscription cancelled successfully. Your subscription will remain active until the end of the current billing period.');
      await fetchData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      setError('Failed to cancel subscription. Please try again or contact support.');
    } finally {
      setCancellingSubscription(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    setDeletingAccount(true);
    setError('');
    setSuccess('');

    try {
      // Delete host account (this will delete all listings and profile)
      await deleteHostAccount(user.uid);
      
      // Delete Firebase auth account
      if (auth.currentUser) {
        await deleteUser(auth.currentUser);
      }
      
      // Redirect to home page
      navigate('/');
      window.location.reload();
    } catch (error) {
      console.error('Error deleting account:', error);
      
      if (error.code === 'auth/requires-recent-login') {
        setError('For security reasons, please log out and log back in before deleting your account.');
      } else {
        setError('Failed to delete account. Please try again or contact support.');
      }
      setShowDeleteConfirm(false);
    } finally {
      setDeletingAccount(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: FaUser },
    { id: 'subscription', label: 'Subscription', icon: FaCreditCard },
    { id: 'security', label: 'Security', icon: FaLock }
  ];


  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Enhanced Header Section */}
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Account Settings</h1>
        <p className="text-sm text-gray-600">Manage your profile, subscription, and security preferences</p>
      </div>

      {/* Enhanced Tabs Container with Visual Cards */}
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-gray-200 overflow-hidden">
        {/* Enhanced Tab Navigation */}
        <div className="border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
          <nav className="flex flex-wrap" role="tablist" aria-label="Settings sections">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls={`${tab.id}-panel`}
                  aria-label={`${tab.label} settings`}
                  className={`
                    flex-1 flex items-center justify-center gap-2 px-4 py-3 font-semibold text-sm transition-all duration-200 min-h-[48px] min-w-[100px]
                    ${activeTab === tab.id
                      ? 'bg-white text-emerald-700 border-b-3 border-emerald-600 shadow-md'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-white/50 hover:shadow-sm'
                    }
                  `}
                >
                  <Icon className="text-base" aria-hidden="true" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Enhanced Tab Content with Increased Spacing */}
        <div className="p-6 md:p-8" id={`${activeTab}-panel`} role="tabpanel">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Enhanced Success/Error Messages */}
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  role="alert"
                  aria-live="polite"
                  className="bg-emerald-50 border-l-4 border-emerald-600 text-emerald-900 px-4 py-3 rounded-lg flex items-start gap-2 shadow-md"
                >
                  <FaCheckCircle className="text-emerald-600 text-base mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span className="text-sm font-semibold">{success}</span>
                </motion.div>
              )}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  role="alert"
                  aria-live="assertive"
                  className="bg-red-50 border-l-4 border-red-600 text-red-900 px-4 py-3 rounded-lg flex items-start gap-2 shadow-md"
                >
                  <FaExclamationCircle className="text-red-600 text-base mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <p className="text-sm font-semibold">{error}</p>
                </motion.div>
              )}
              {uploadError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  role="alert"
                  aria-live="assertive"
                  className="bg-red-50 border-l-4 border-red-600 text-red-900 px-4 py-3 rounded-lg flex items-start gap-2 shadow-md"
                >
                  <FaExclamationCircle className="text-red-600 text-base mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <p className="text-sm font-semibold">{uploadError}</p>
                </motion.div>
              )}

              {/* Enhanced Section Header */}
              <div className="space-y-1 border-b border-gray-200 pb-3">
                <h2 className="text-xl font-bold text-gray-900">Profile Information</h2>
                <p className="text-sm text-gray-600">Update your personal details and profile picture</p>
              </div>

              {/* Enhanced Profile Picture Section - Card Style */}
              <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 rounded-xl p-6 border border-emerald-200 shadow-lg">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                  <div className="relative flex-shrink-0">
                    {profileData.profilePicture ? (
                      <div className="relative group">
                        <img
                          src={profileData.profilePicture}
                          alt={`${profileData.firstName} ${profileData.lastName}'s profile picture`}
                          className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-xl ring-2 ring-emerald-300"
                        />
                        {editingProfile && (
                          <label className="absolute inset-0 bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer">
                            <div className="text-center text-white">
                              <FaCamera className="w-6 h-6 mx-auto mb-1" aria-hidden="true" />
                              <span className="text-xs font-semibold">Change</span>
                            </div>
                            <input
                              type="file"
                              className="sr-only"
                              accept="image/jpeg,image/jpg,image/png,image/webp"
                              onChange={handleProfilePictureUpload}
                              disabled={uploadingPicture}
                              aria-label="Upload profile picture"
                            />
                          </label>
                        )}
                      </div>
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-xl ring-2 ring-emerald-300">
                        {profileData.firstName && profileData.lastName ? (
                          <span aria-label={`${profileData.firstName} ${profileData.lastName} initials`}>
                            {profileData.firstName.charAt(0).toUpperCase()}
                            {profileData.lastName.charAt(0).toUpperCase()}
                          </span>
                        ) : (
                          <FaUser className="w-12 h-12" aria-hidden="true" />
                        )}
                      </div>
                    )}
                    {uploadingPicture && (
                      <div className="absolute inset-0 bg-white/95 rounded-full flex items-center justify-center">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-1"></div>
                          <p className="text-xs text-gray-800 font-semibold">Uploading...</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-center md:text-left space-y-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">Profile Picture</h3>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        Upload a professional profile picture to help guests recognize you. 
                        <span className="block mt-1 text-xs text-gray-600">JPG, PNG, or WebP • Max 5MB</span>
                      </p>
                    </div>
                    {editingProfile && !profileData.profilePicture && (
                      <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg cursor-pointer transform hover:scale-105 active:scale-95 min-h-[44px]">
                        {uploadingPicture ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Uploading...</span>
                          </>
                        ) : (
                          <>
                            <FaCamera className="text-base" aria-hidden="true" />
                            <span>Upload Picture</span>
                          </>
                        )}
                        <input
                          type="file"
                          className="sr-only"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={handleProfilePictureUpload}
                          disabled={uploadingPicture}
                          aria-label="Upload profile picture"
                        />
                      </label>
                    )}
                    {!editingProfile && profileData.profilePicture && (
                      <div className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-100 text-emerald-900 rounded-lg text-sm font-semibold shadow-sm border border-emerald-300">
                        <FaCheckCircle className="text-base" aria-hidden="true" />
                        <span>Profile picture uploaded</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Enhanced Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-300">
                {!editingProfile ? (
                  <button
                    onClick={() => setEditingProfile(true)}
                    aria-label="Edit your profile information"
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white font-bold text-sm rounded-lg hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 min-h-[44px]"
                  >
                    <FaEdit className="text-base" aria-hidden="true" />
                    <span>Edit Profile</span>
                  </button>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <button
                      onClick={handleProfileUpdate}
                      disabled={saving}
                      aria-label="Save profile changes"
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white font-bold text-sm rounded-lg hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 disabled:transform-none min-h-[44px]"
                    >
                      <FaSave className="text-base" aria-hidden="true" />
                      <span>{saving ? 'Saving Changes...' : 'Save Changes'}</span>
                    </button>
                    <button
                      onClick={() => {
                        if (hostProfile) {
                          setProfileData({
                            firstName: hostProfile.firstName || '',
                            lastName: hostProfile.lastName || '',
                            email: hostProfile.email || user.email || '',
                            phone: hostProfile.phone || '',
                            bio: hostProfile.bio || '',
                            address: hostProfile.address || '',
                            profilePicture: hostProfile.profilePicture || ''
                          });
                        }
                        setEditingProfile(false);
                        setError('');
                        setSuccess('');
                        setUploadError('');
                      }}
                      aria-label="Cancel editing"
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 bg-gray-300 text-gray-900 font-bold text-sm rounded-lg hover:bg-gray-400 transition-all shadow-sm hover:shadow-md min-h-[44px] transform hover:scale-105 active:scale-95"
                    >
                      <FaTimes className="text-base" aria-hidden="true" />
                      <span>Cancel</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Enhanced Form Fields with Better Typography */}
              <div className="space-y-5">
                <fieldset className="space-y-4 bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm">
                  <legend className="text-lg font-bold text-gray-900 mb-4 px-2">Personal Details</legend>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="firstName" className="block text-xs font-bold text-gray-900 uppercase tracking-wide">
                        First Name <span className="text-red-600" aria-label="required">*</span>
                      </label>
                      <input
                        id="firstName"
                        type="text"
                        value={profileData.firstName}
                        onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                        disabled={!editingProfile}
                        required
                        aria-required="true"
                        className="w-full px-4 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:border-gray-300 transition-all"
                        placeholder="Enter your first name"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="lastName" className="block text-xs font-bold text-gray-900 uppercase tracking-wide">
                        Last Name <span className="text-red-600" aria-label="required">*</span>
                      </label>
                      <input
                        id="lastName"
                        type="text"
                        value={profileData.lastName}
                        onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                        disabled={!editingProfile}
                        required
                        aria-required="true"
                        className="w-full px-4 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:border-gray-300 transition-all"
                        placeholder="Enter your last name"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="email" className="block text-xs font-bold text-gray-900 uppercase tracking-wide">
                        Email Address
                      </label>
                      <input
                        id="email"
                        type="email"
                        value={profileData.email}
                        disabled
                        aria-describedby="email-helper"
                        className="w-full px-4 py-2.5 text-sm border-2 border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                      />
                      <p id="email-helper" className="text-xs text-gray-600 mt-0.5">Email cannot be changed</p>
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="phone" className="block text-xs font-bold text-gray-900 uppercase tracking-wide">
                        Phone Number
                      </label>
                      <input
                        id="phone"
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                        disabled={!editingProfile}
                        aria-describedby="phone-helper"
                        className="w-full px-4 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:border-gray-300 transition-all"
                        placeholder="+63 912 345 6789"
                      />
                      <p id="phone-helper" className="text-xs text-gray-600 mt-0.5">Include country code (e.g., +63)</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="bio" className="block text-xs font-bold text-gray-900 uppercase tracking-wide">
                      Bio
                    </label>
                    <textarea
                      id="bio"
                      value={profileData.bio}
                      onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                      disabled={!editingProfile}
                      rows={4}
                      aria-describedby="bio-helper"
                      className="w-full px-4 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:border-gray-300 transition-all resize-none"
                      placeholder="Tell guests about yourself, your hosting experience, and what makes your property special..."
                    />
                    <p id="bio-helper" className="text-xs text-gray-600 mt-0.5">Help guests get to know you better (100-500 characters recommended)</p>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="address" className="block text-xs font-bold text-gray-900 uppercase tracking-wide">
                      Address
                    </label>
                    <input
                      id="address"
                      type="text"
                      value={profileData.address}
                      onChange={(e) => setProfileData(prev => ({ ...prev, address: e.target.value }))}
                      disabled={!editingProfile}
                      aria-describedby="address-helper"
                      className="w-full px-4 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:border-gray-300 transition-all"
                      placeholder="123 Main Street, City, Province, Postal Code"
                    />
                    <p id="address-helper" className="text-xs text-gray-600 mt-0.5">Your full mailing address</p>
                  </div>
                </fieldset>
              </div>
            </div>
          )}

          {/* Subscription Tab - New */}
          {activeTab === 'subscription' && (
            <div className="space-y-6">
              {/* Success/Error Messages */}
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  role="alert"
                  aria-live="polite"
                  className="bg-emerald-50 border-l-4 border-emerald-600 text-emerald-900 px-4 py-3 rounded-lg flex items-start gap-2 shadow-md"
                >
                  <FaCheckCircle className="text-emerald-600 text-base mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span className="text-sm font-semibold">{success}</span>
                </motion.div>
              )}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  role="alert"
                  aria-live="assertive"
                  className="bg-red-50 border-l-4 border-red-600 text-red-900 px-4 py-3 rounded-lg flex items-start gap-2 shadow-md"
                >
                  <FaExclamationCircle className="text-red-600 text-base mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <p className="text-sm font-semibold">{error}</p>
                </motion.div>
              )}

              {/* Section Header */}
              <div className="space-y-1 border-b border-gray-200 pb-3">
                <h2 className="text-xl font-bold text-gray-900">Subscription & Membership</h2>
                <p className="text-sm text-gray-600">Manage your subscription plan and membership details</p>
              </div>

              {/* Subscription Details Card */}
              {hostProfile && (
                <div className="bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 rounded-xl p-6 border-2 border-emerald-200 shadow-lg">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        hostProfile.subscriptionPlan === 'premium' 
                          ? 'bg-gradient-to-br from-purple-500 to-purple-600' 
                          : hostProfile.subscriptionPlan === 'pro'
                          ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                          : 'bg-gradient-to-br from-gray-500 to-gray-600'
                      }`}>
                        <FaCrown className="text-white text-lg" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">
                          {hostProfile.subscriptionPlan === 'premium' ? 'Premium Plan' :
                           hostProfile.subscriptionPlan === 'pro' ? 'Pro Plan' :
                           hostProfile.subscriptionPlan === 'basic' ? 'Basic Plan' : 'No Plan'}
                        </h3>
                        <p className="text-xs text-gray-600">
                          {hostProfile.subscriptionPlan === 'premium' ? 'Unlimited listings' :
                           hostProfile.subscriptionPlan === 'pro' ? 'Up to 20 listings' :
                           hostProfile.subscriptionPlan === 'basic' ? 'Up to 5 listings' : 'No active plan'}
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide ${
                      hostProfile.subscriptionStatus === 'active'
                        ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-300'
                        : hostProfile.subscriptionStatus === 'cancelled'
                        ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300'
                        : 'bg-gray-100 text-gray-800 border-2 border-gray-300'
                    }`}>
                      {hostProfile.subscriptionStatus || 'inactive'}
                    </span>
                  </div>

                  {/* Subscription Dates */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {hostProfile.subscriptionStartDate && (
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Start Date</p>
                        <p className="text-sm font-bold text-gray-900">
                          {(() => {
                            try {
                              let startDate;
                              if (hostProfile.subscriptionStartDate?.toDate) {
                                startDate = hostProfile.subscriptionStartDate.toDate();
                              } else if (hostProfile.subscriptionStartDate instanceof Date) {
                                startDate = hostProfile.subscriptionStartDate;
                              } else if (typeof hostProfile.subscriptionStartDate === 'string' || typeof hostProfile.subscriptionStartDate === 'number') {
                                startDate = new Date(hostProfile.subscriptionStartDate);
                              } else {
                                return 'Not set';
                              }
                              return startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                            } catch (error) {
                              console.error('Error formatting start date:', error);
                              return 'Invalid date';
                            }
                          })()}
                        </p>
                      </div>
                    )}
                    {hostProfile.subscriptionEndDate && (
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">End Date</p>
                        <p className="text-sm font-bold text-gray-900">
                          {(() => {
                            try {
                              let endDate;
                              if (hostProfile.subscriptionEndDate?.toDate) {
                                endDate = hostProfile.subscriptionEndDate.toDate();
                              } else if (hostProfile.subscriptionEndDate instanceof Date) {
                                endDate = hostProfile.subscriptionEndDate;
                              } else if (typeof hostProfile.subscriptionEndDate === 'string' || typeof hostProfile.subscriptionEndDate === 'number') {
                                endDate = new Date(hostProfile.subscriptionEndDate);
                              } else {
                                return 'Not set';
                              }
                              return endDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                            } catch (error) {
                              console.error('Error formatting end date:', error);
                              return 'Invalid date';
                            }
                          })()}
                        </p>
                        {(() => {
                          try {
                            let endDate;
                            if (hostProfile.subscriptionEndDate?.toDate) {
                              endDate = hostProfile.subscriptionEndDate.toDate();
                            } else if (hostProfile.subscriptionEndDate instanceof Date) {
                              endDate = hostProfile.subscriptionEndDate;
                            } else if (typeof hostProfile.subscriptionEndDate === 'string' || typeof hostProfile.subscriptionEndDate === 'number') {
                              endDate = new Date(hostProfile.subscriptionEndDate);
                            } else {
                              return null;
                            }
                            const now = new Date();
                            const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                            if (daysRemaining < 0) {
                              return <p className="text-xs text-red-600 mt-1 font-semibold">Expired {Math.abs(daysRemaining)} day{Math.abs(daysRemaining) !== 1 ? 's' : ''} ago</p>;
                            } else if (daysRemaining <= 7) {
                              return <p className="text-xs text-yellow-600 mt-1 font-semibold">{daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining</p>;
                            } else {
                              return <p className="text-xs text-gray-500 mt-1">{daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining</p>;
                            }
                          } catch (error) {
                            return null;
                          }
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Listing Usage */}
                  {listingInfo && listingInfo.current !== undefined && listingInfo.limit !== undefined && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200 mb-4">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Listing Usage</p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-gray-700 font-medium whitespace-nowrap">
                          {listingInfo.current} of {listingInfo.limit === -1 ? '∞' : listingInfo.limit} listings used
                        </span>
                        {listingInfo.limit !== -1 && (
                          <div className="flex-1 mx-4 bg-gray-200 rounded-full h-2.5 min-w-[100px]">
                            <div 
                              className={`h-2.5 rounded-full transition-all duration-300 ${
                                listingInfo.current >= listingInfo.limit
                                  ? 'bg-red-500' 
                                  : (listingInfo.current / listingInfo.limit) >= 0.8 
                                  ? 'bg-yellow-500' 
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min((listingInfo.current / listingInfo.limit) * 100, 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                      {listingInfo.remaining !== undefined && (
                        <p className={`text-xs mt-2 font-semibold ${
                          listingInfo.remaining === 0 
                            ? 'text-red-600' 
                            : listingInfo.remaining <= 2 && listingInfo.remaining > 0
                            ? 'text-yellow-600'
                            : 'text-gray-600'
                        }`}>
                          {listingInfo.limit === -1 
                            ? 'Unlimited listings available' 
                            : listingInfo.remaining === 0
                            ? 'No listings remaining - upgrade to create more'
                            : `${listingInfo.remaining} listing${listingInfo.remaining !== 1 ? 's' : ''} remaining`
                          }
                        </p>
                      )}
                      {listingInfo.error && (
                        <p className="text-xs text-red-600 mt-2 font-semibold">{listingInfo.error}</p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-300">
                    {hostProfile.subscriptionStatus === 'active' && (
                      <button
                        onClick={handleCancelSubscription}
                        disabled={cancellingSubscription}
                        aria-label="Cancel subscription"
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-yellow-500 text-white font-bold text-sm rounded-lg hover:bg-yellow-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 disabled:transform-none min-h-[44px]"
                      >
                        <FaBan className="text-base" aria-hidden="true" />
                        <span>{cancellingSubscription ? 'Cancelling...' : 'Cancel Subscription'}</span>
                      </button>
                    )}
                    {hostProfile.subscriptionStatus !== 'active' && (
                      <button
                        onClick={() => navigate('/host/register', { state: { step: 2 } })}
                        aria-label="Upgrade subscription"
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white font-bold text-sm rounded-lg hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 min-h-[44px]"
                      >
                        <FaCreditCard className="text-base" aria-hidden="true" />
                        <span>Upgrade Subscription</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Account Deletion Section */}
              <div className="bg-red-50 rounded-xl p-6 border-2 border-red-200 shadow-md">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-red-900 mb-1 flex items-center gap-2">
                    <FaUserTimes className="text-red-600" aria-hidden="true" />
                    <span>Delete Account</span>
                  </h3>
                  <p className="text-sm text-red-800 leading-relaxed">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                </div>

                {showDeleteConfirm ? (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-red-900">
                      Are you absolutely sure? This will:
                    </p>
                    <ul className="list-disc list-inside text-sm text-red-800 space-y-1 ml-2">
                      <li>Delete all your listings</li>
                      <li>Cancel your subscription</li>
                      <li>Remove all your account data</li>
                      <li>Delete your profile permanently</li>
                    </ul>
                    <div className="flex flex-col sm:flex-row gap-3 pt-3">
                      <button
                        onClick={handleDeleteAccount}
                        disabled={deletingAccount}
                        aria-label="Confirm account deletion"
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white font-bold text-sm rounded-lg hover:bg-red-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 disabled:transform-none min-h-[44px]"
                      >
                        <FaUserTimes className="text-base" aria-hidden="true" />
                        <span>{deletingAccount ? 'Deleting Account...' : 'Yes, Delete My Account'}</span>
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        disabled={deletingAccount}
                        aria-label="Cancel account deletion"
                        className="flex-1 sm:flex-initial px-6 py-3 bg-gray-300 text-gray-900 font-bold text-sm rounded-lg hover:bg-gray-400 transition-all shadow-sm hover:shadow-md min-h-[44px] transform hover:scale-105 active:scale-95"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleDeleteAccount}
                    aria-label="Delete account"
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white font-bold text-sm rounded-lg hover:bg-red-700 transition-all shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 min-h-[44px]"
                  >
                    <FaUserTimes className="text-base" aria-hidden="true" />
                    <span>Delete Account</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Security Tab - New Password Change Section */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* Password Success/Error Messages */}
              {passwordSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  role="alert"
                  aria-live="polite"
                  className="bg-emerald-50 border-l-4 border-emerald-600 text-emerald-900 px-4 py-3 rounded-lg flex items-start gap-2 shadow-md"
                >
                  <FaCheckCircle className="text-emerald-600 text-base mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span className="text-sm font-semibold">{passwordSuccess}</span>
                </motion.div>
              )}
              {passwordError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  role="alert"
                  aria-live="assertive"
                  className="bg-red-50 border-l-4 border-red-600 text-red-900 px-4 py-3 rounded-lg flex items-start gap-2 shadow-md"
                >
                  <FaExclamationCircle className="text-red-600 text-base mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <p className="text-sm font-semibold">{passwordError}</p>
                </motion.div>
              )}

              {/* Section Header */}
              <div className="space-y-1 border-b border-gray-200 pb-3">
                <h2 className="text-xl font-bold text-gray-900">Security Settings</h2>
                <p className="text-sm text-gray-600">Manage your account password and security</p>
              </div>

              {/* Password Change Form - Card Style */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 shadow-md">
                <div className="mb-5">
                  <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                    <FaLock className="text-emerald-600" aria-hidden="true" />
                    <span>Change Password</span>
                  </h3>
                  <p className="text-sm text-gray-600">Update your password to keep your account secure</p>
                </div>

                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="currentPassword" className="block text-xs font-bold text-gray-900 uppercase tracking-wide">
                      Current Password <span className="text-red-600" aria-label="required">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        required
                        aria-required="true"
                        className="w-full px-4 py-2.5 pr-12 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        placeholder="Enter your current password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-900 transition-colors"
                      >
                        {showCurrentPassword ? <FaEyeSlash className="text-base" /> : <FaEye className="text-base" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="newPassword" className="block text-xs font-bold text-gray-900 uppercase tracking-wide">
                      New Password <span className="text-red-600" aria-label="required">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        required
                        aria-required="true"
                        aria-describedby="newPassword-helper"
                        className="w-full px-4 py-2.5 pr-12 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        placeholder="Enter your new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-900 transition-colors"
                      >
                        {showNewPassword ? <FaEyeSlash className="text-base" /> : <FaEye className="text-base" />}
                      </button>
                    </div>
                    <p id="newPassword-helper" className="text-xs text-gray-600 mt-0.5">Must be at least 6 characters</p>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="confirmPassword" className="block text-xs font-bold text-gray-900 uppercase tracking-wide">
                      Confirm New Password <span className="text-red-600" aria-label="required">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        required
                        aria-required="true"
                        className="w-full px-4 py-2.5 pr-12 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        placeholder="Re-enter your new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-900 transition-colors"
                      >
                        {showConfirmPassword ? <FaEyeSlash className="text-base" /> : <FaEye className="text-base" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-300">
                    <button
                      type="submit"
                      disabled={changingPassword}
                      aria-label="Change password"
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white font-bold text-sm rounded-lg hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 disabled:transform-none min-h-[44px]"
                    >
                      <FaLock className="text-base" aria-hidden="true" />
                      <span>{changingPassword ? 'Changing Password...' : 'Change Password'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HostSettings;

