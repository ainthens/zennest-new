// src/pages/HostListingForm.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { createListing, updateListing, updateHostPoints } from '../services/firestoreService';
import { uploadImageToCloudinary } from '../config/cloudinary';
import useAuth from '../hooks/useAuth';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  FaHome,
  FaStar,
  FaClock,
  FaMapMarkerAlt,
  FaImage,
  FaSave,
  FaEye,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaCalendarAlt,
  FaWifi,
  FaParking,
  FaSwimmingPool,
  FaUtensils,
  FaTv,
  FaCar,
  FaSnowflake,
  FaHotTub,
  FaDumbbell,
  FaDog,
  FaSmokingBan,
  FaPlus,
  FaCheckCircle,
  FaHeart,
  FaUser,
  FaUtensils as FaChef,
  FaCamera,
  FaMusic,
  FaImage as FaArt,
  FaBaby,
  FaGraduationCap,
  FaWrench,
  FaLaptop,
  FaPlane,
  FaSpa,
  FaBriefcase,
  FaDumbbell as FaFitness,
  FaCar as FaTransport,
  FaHome as FaCleaning,
  FaTv as FaEntertainment
} from 'react-icons/fa';

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Component to handle map click events
function LocationMarker({ position, setPosition, onLocationSet }) {
  useMapEvents({
    click(e) {
      const newPosition = [e.latlng.lat, e.latlng.lng];
      setPosition(newPosition);
      if (onLocationSet) {
        onLocationSet(newPosition);
      }
    },
  });

  return position === null ? null : (
    <Marker position={position}>
      <Popup>Listing Location</Popup>
    </Marker>
  );
}

const HostListingForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showErrorNotification, setShowErrorNotification] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [progress, setProgress] = useState(100);
  const [successProgress, setSuccessProgress] = useState(100);
  const [originalData, setOriginalData] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    category: 'home',
    serviceCategory: '',
    description: '',
    location: '',
    province: '',
    coords: { lat: null, lng: null },
    rate: '',
    discount: '',
    promo: '',
    images: [],
    status: 'draft',
    bedrooms: '',
    bathrooms: '',
    guests: '',
    amenities: [],
    unavailableDates: []
  });
  
  // Calendar state for availability management
  const [showAvailabilityCalendar, setShowAvailabilityCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Amenities management
  const [newAmenity, setNewAmenity] = useState('');
  const [mapPosition, setMapPosition] = useState([14.5995, 120.9842]); // Default to Manila
  const [mapZoom, setMapZoom] = useState(13);
  
  // Common amenities for quick selection
  const commonAmenities = [
    { name: 'WiFi', icon: FaWifi },
    { name: 'Parking', icon: FaParking },
    { name: 'TV', icon: FaTv },
    { name: 'Kitchen', icon: FaUtensils },
    { name: 'Pool', icon: FaSwimmingPool },
    { name: 'Air Conditioning', icon: FaSnowflake },
    { name: 'Hot Tub', icon: FaHotTub },
    { name: 'Gym', icon: FaDumbbell },
    { name: 'Pet Friendly', icon: FaDog },
    { name: 'No Smoking', icon: FaSmokingBan },
    { name: 'Car Rental', icon: FaCar }
  ];

  // Service categories with icons
  const serviceCategories = [
    { value: 'chef', label: 'Chef / Cooking', icon: FaChef },
    { value: 'photography', label: 'Photography', icon: FaCamera },
    { value: 'music', label: 'Music / DJ', icon: FaMusic },
    { value: 'art', label: 'Art / Painting', icon: FaArt },
    { value: 'beauty', label: 'Beauty / Hair', icon: FaUser },
    { value: 'childcare', label: 'Childcare', icon: FaBaby },
    { value: 'tutoring', label: 'Tutoring / Education', icon: FaGraduationCap },
    { value: 'repair', label: 'Repair / Maintenance', icon: FaWrench },
    { value: 'technology', label: 'Technology / IT', icon: FaLaptop },
    { value: 'travel', label: 'Travel / Tour Guide', icon: FaPlane },
    { value: 'spa', label: 'Spa / Wellness', icon: FaSpa },
    { value: 'caregiving', label: 'Caregiving', icon: FaHeart },
    { value: 'business', label: 'Business / Consulting', icon: FaBriefcase },
    { value: 'fitness', label: 'Fitness / Personal Training', icon: FaFitness },
    { value: 'transport', label: 'Transportation', icon: FaTransport },
    { value: 'cleaning', label: 'Cleaning', icon: FaCleaning },
    { value: 'entertainment', label: 'Entertainment', icon: FaEntertainment },
    { value: 'other', label: 'Other', icon: FaClock }
  ];

  useEffect(() => {
    if (isEdit && id) {
      fetchListing();
    }
  }, [id, isEdit]);

  // Helper function to extract province from address components
  const extractProvince = (addressComponents) => {
    // Common Philippine province patterns
    const provincePatterns = [
      'Metro Manila', 'Bulacan', 'Cavite', 'Laguna', 'Rizal', 'Pampanga',
      'Batangas', 'Quezon', 'Nueva Ecija', 'Tarlac', 'Zambales', 'Bataan',
      'Aurora', 'Albay', 'Cebu', 'Davao del Sur', 'Iloilo', 'Negros Occidental',
      'Pangasinan'
    ];
    
    // Try to find province in address components
    const addressString = JSON.stringify(addressComponents).toLowerCase();
    for (const province of provincePatterns) {
      if (addressString.includes(province.toLowerCase())) {
        return province;
      }
    }
    
    // Try to extract from display_name
    if (addressComponents.display_name) {
      for (const province of provincePatterns) {
        if (addressComponents.display_name.toLowerCase().includes(province.toLowerCase())) {
          return province;
        }
      }
    }
    
    return '';
  };

  // Reverse geocode when map position is clicked
  const handleMapLocationSet = async (position) => {
    const [lat, lng] = position;
    try {
      // Reverse geocode to get address and province
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`
      );
      const data = await response.json();
      
      if (data && data.address) {
        const province = extractProvince(data);
        const addressString = data.display_name || `${data.address.city || ''}, ${data.address.state || ''}`.trim();
        
        // Update formData with location, province, and coords
        setFormData(prev => ({
          ...prev,
          location: addressString || prev.location,
          province: province || prev.province,
          coords: { lat, lng }
        }));
      } else {
        // If reverse geocode fails, just update coords
        setFormData(prev => ({
          ...prev,
          coords: { lat, lng }
        }));
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      // Still update coords even if reverse geocode fails
      setFormData(prev => ({
        ...prev,
        coords: { lat, lng }
      }));
    }
  };

  // Geocode location when it changes
  useEffect(() => {
    if (formData.location && formData.location.trim()) {
      const geocodeLocation = async () => {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.location)}&limit=1`
          );
          const data = await response.json();
          
          if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);
            setMapPosition([lat, lon]);
            setMapZoom(13);
            
            // Extract province from geocoded data
            const province = extractProvince(data[0]);
            
            // Update formData with province and coords
            setFormData(prev => ({
              ...prev,
              province: province || prev.province, // Keep existing if not found
              coords: { lat, lng: lon }
            }));
          }
        } catch (error) {
          console.error('Error geocoding location:', error);
        }
      };

      // Debounce geocoding
      const timeoutId = setTimeout(() => {
        geocodeLocation();
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [formData.location]);

  // Auto-hide error notification after 5 seconds with progress animation
  useEffect(() => {
    if (error) {
      setShowErrorNotification(true);
      setProgress(100);
      
      // Animate progress bar
      const duration = 5000; // 5 seconds
      const interval = 16; // ~60fps
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

  // Auto-hide success notification after 5 seconds with progress animation
  useEffect(() => {
    if (success) {
      setShowSuccessNotification(true);
      setSuccessProgress(100);
      
      // Animate progress bar
      const duration = 5000; // 5 seconds
      const interval = 16; // ~60fps
      const decrement = (100 / duration) * interval;
      
      const progressInterval = setInterval(() => {
        setSuccessProgress((prev) => {
          const next = prev - decrement;
          return next <= 0 ? 0 : next;
        });
      }, interval);

      const timer = setTimeout(() => {
        setShowSuccessNotification(false);
        setTimeout(() => {
          setSuccess("");
          setSuccessProgress(100);
        }, 300);
      }, duration);

      return () => {
        clearTimeout(timer);
        clearInterval(progressInterval);
      };
    }
  }, [success]);

  // Check if form data has changed from original (for edit mode)
  const hasChanges = () => {
    if (!isEdit || !originalData) return true; // For new listings, always allow submit
    
    // Compare all fields
    const normalizedFormData = {
      title: (formData.title || '').trim(),
      category: formData.category || 'home',
      serviceCategory: formData.serviceCategory || '',
      description: (formData.description || '').trim(),
      location: (formData.location || '').trim(),
      rate: formData.rate || '',
      discount: formData.discount || '',
      promo: (formData.promo || '').trim(),
      bedrooms: formData.bedrooms || '',
      bathrooms: formData.bathrooms || '',
      guests: formData.guests || '',
      images: formData.images || [],
      amenities: formData.amenities || [],
      unavailableDates: formData.unavailableDates || []
    };

    const normalizedOriginal = {
      title: (originalData.title || '').trim(),
      category: originalData.category || 'home',
      serviceCategory: originalData.serviceCategory || '',
      description: (originalData.description || '').trim(),
      location: (originalData.location || '').trim(),
      rate: originalData.rate || '',
      discount: originalData.discount || '',
      promo: (originalData.promo || '').trim(),
      bedrooms: originalData.bedrooms || '',
      bathrooms: originalData.bathrooms || '',
      guests: originalData.guests || '',
      images: originalData.images || [],
      amenities: originalData.amenities || [],
      unavailableDates: originalData.unavailableDates || []
    };

    // Deep compare objects
    return JSON.stringify(normalizedFormData) !== JSON.stringify(normalizedOriginal);
  };

  const fetchListing = async () => {
    try {
      const listingRef = doc(db, 'listings', id);
      const listingSnap = await getDoc(listingRef);
      if (listingSnap.exists()) {
        const data = listingSnap.data();
        
        // Convert unavailableDates from Firestore Timestamps to date strings
        let unavailableDates = [];
        if (data.unavailableDates && Array.isArray(data.unavailableDates)) {
          unavailableDates = data.unavailableDates.map(date => {
            if (date?.toDate) {
              return date.toDate().toISOString().split('T')[0];
            } else if (date instanceof Date) {
              return date.toISOString().split('T')[0];
            } else if (typeof date === 'string') {
              return date;
            }
            return null;
          }).filter(Boolean);
        }
        
        const formattedData = {
          title: data.title || '',
          category: data.category || 'home',
          serviceCategory: data.serviceCategory || '',
          description: data.description || '',
          location: data.location || '',
          province: data.province || '',
          coords: data.coords || { lat: null, lng: null },
          rate: data.rate || '',
          discount: data.discount || '',
          promo: data.promo || '',
          images: data.images || [],
          status: data.status || 'draft',
          bedrooms: data.bedrooms || '',
          bathrooms: data.bathrooms || '',
          guests: data.guests || '',
          amenities: data.amenities || [],
          unavailableDates: unavailableDates
        };
        
        // Set map position if coords exist
        if (formattedData.coords && formattedData.coords.lat && formattedData.coords.lng) {
          setMapPosition([formattedData.coords.lat, formattedData.coords.lng]);
        }
        setFormData(formattedData);
        // Store original data for comparison
        setOriginalData(formattedData);
      }
    } catch (error) {
      console.error('Error fetching listing:', error);
      setError('Failed to load listing. Please try again.');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const inputType = e.target.type;
    
    // For number inputs, only allow numeric values (including decimals for bathrooms)
    if (inputType === 'number') {
      // Allow empty string for clearing the field
      if (value === '' || value === null) {
        setFormData(prev => ({
          ...prev,
          [name]: ''
        }));
        return;
      }
      
      // For bedrooms and guests (integer only), strip any non-digit characters
      if (name === 'bedrooms' || name === 'guests') {
        const numericValue = value.replace(/[^0-9]/g, '');
        if (numericValue !== value) {
          // If value was changed, update with cleaned value
          setFormData(prev => ({
            ...prev,
            [name]: numericValue
          }));
          return;
        }
      }
      
      // For bathrooms (can have decimals), allow numbers and one decimal point
      if (name === 'bathrooms') {
        const numericValue = value.replace(/[^0-9.]/g, '').replace(/\.(?=.*\.)/g, ''); // Remove multiple decimal points
        if (numericValue !== value) {
          setFormData(prev => ({
            ...prev,
            [name]: numericValue
          }));
          return;
        }
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    setError('');
    
    try {
      console.log(`Uploading ${files.length} image(s) to Cloudinary...`);
      
      const uploadPromises = files.map(async (file) => {
        console.log(`Uploading file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
        const result = await uploadImageToCloudinary(file);
        if (!result.success) {
          console.error(`Failed to upload ${file.name}:`, result.error);
        }
        return result;
      });
      
      const results = await Promise.all(uploadPromises);
      
      const successfulUploads = results
        .filter(r => r.success)
        .map(r => r.url);
      
      const failedUploads = results.filter(r => !r.success);

      if (successfulUploads.length > 0) {
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, ...successfulUploads]
        }));
        console.log(`✅ Successfully uploaded ${successfulUploads.length} image(s)`);
        
        if (failedUploads.length > 0) {
          const failedErrors = failedUploads.map(r => r.error).filter(Boolean).join(', ');
          setError(prev => {
            const message = `${failedUploads.length} image(s) failed to upload. ${failedErrors}`;
            return prev ? `${prev}\n${message}` : message;
          });
        }
      } else {
        const allErrors = failedUploads.map(r => r.error).filter(Boolean).join(', ');
        setError(`All images failed to upload. ${allErrors || 'Please check your Cloudinary configuration.'}`);
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      setError(`Failed to upload images: ${error.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
      // Clear file input
      e.target.value = '';
    }
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const addAmenity = (amenityName) => {
    if (!amenityName || !amenityName.trim()) return;
    const trimmed = amenityName.trim();
    if (!formData.amenities.includes(trimmed)) {
      setFormData(prev => ({
        ...prev,
        amenities: [...prev.amenities, trimmed]
      }));
    }
    setNewAmenity('');
  };

  const removeAmenity = (amenityName) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.filter(a => a !== amenityName)
    }));
  };

  const handleSubmit = async (e, publish = false) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Check if user is authenticated
    if (!user || !user.uid) {
      setError('You must be logged in to create a listing');
      setLoading(false);
      return;
    }

    // Validation only required when publishing
    // Draft saves can be empty - allow saving without any fields filled
    if (publish) {
      // Basic validation required for publishing
      if (!formData.title.trim()) {
        setError('Please enter a title for your listing');
        setLoading(false);
        return;
      }
      if (!formData.location.trim()) {
        setError('Please enter a location for your listing');
        setLoading(false);
        return;
      }
      if (!formData.rate || parseFloat(formData.rate) <= 0) {
        const rateLabel = formData.category === 'home' 
          ? 'rate per night' 
          : formData.category === 'service'
          ? 'price'
          : 'price per person';
        setError(`Please enter a valid ${rateLabel}`);
        setLoading(false);
        return;
      }
      if (!formData.description.trim()) {
        setError('Please enter a description for your listing');
        setLoading(false);
        return;
      }
      // For service category, validate serviceCategory
      if (formData.category === 'service') {
        if (!formData.serviceCategory || formData.serviceCategory.trim() === '') {
          setError('Please select a service type');
          setLoading(false);
          return;
        }
      }
      // For home category, validate bedrooms, bathrooms, and guests
      if (formData.category === 'home') {
        if (!formData.bedrooms || parseInt(formData.bedrooms) <= 0) {
          setError('Please enter the number of bedrooms');
          setLoading(false);
          return;
        }
        if (!formData.bathrooms || parseFloat(formData.bathrooms) <= 0) {
          setError('Please enter the number of bathrooms');
          setLoading(false);
          return;
        }
        if (!formData.guests || parseInt(formData.guests) <= 0) {
          setError('Please enter the maximum number of guests');
          setLoading(false);
          return;
        }
      } else {
        // For experience and service, validate guests
        if (!formData.guests || parseInt(formData.guests) <= 0) {
          setError(`Please enter the maximum ${formData.category === 'experience' ? 'participants' : 'capacity'}`);
          setLoading(false);
          return;
        }
      }
    }

    try {
      // Clean up the data - allow empty strings for draft saves
      // Convert unavailableDates to Firestore Timestamps
      const unavailableDatesTimestamps = (formData.unavailableDates || []).map(dateStr => {
        const date = new Date(dateStr);
        return Timestamp.fromDate(date);
      });
      
      // SAFETY: Never delete listings due to missing location/province/coords
      // All fields are optional - listings remain valid even if province or coords are missing
      // Build listing data - allow empty fields for drafts
      const listingData = {
        title: (formData.title || '').trim(),
        category: formData.category || 'home',
        serviceCategory: formData.category === 'service' ? (formData.serviceCategory || 'other') : null,
        description: (formData.description || '').trim(),
        location: (formData.location || '').trim(), // Can be empty for drafts
        // Province and coords are optional - listing is valid without them
        province: (formData.province || '').trim(), // Empty string if missing - listing still valid
        coords: formData.coords && formData.coords.lat && formData.coords.lng 
          ? { lat: formData.coords.lat, lng: formData.coords.lng }
          : null, // null if missing - listing still valid
        hostId: user.uid,
        rate: formData.rate ? parseFloat(formData.rate) : 0,
        discount: formData.discount ? parseFloat(formData.discount) : 0,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : 0,
        bathrooms: formData.bathrooms ? parseFloat(formData.bathrooms) : 0,
        guests: formData.guests ? parseInt(formData.guests) : 0,
        images: formData.images || [],
        promo: (formData.promo || '').trim(),
        amenities: formData.amenities || [],
        unavailableDates: unavailableDatesTimestamps,
        // NOTE: completedBookingsCount should be maintained by a Cloud Function
        // Recommended Cloud Function: onBookingStatusChange
        // Trigger: bookings/{bookingId}.onWrite
        // Logic: When booking status changes to 'completed', increment listings/{listingId}.completedBookingsCount
        //        When booking status changes from 'completed', decrement completedBookingsCount
        // This keeps query performance optimal. If Cloud Function is not available, use client-side aggregation
        // but note performance implications for large datasets.
        completedBookingsCount: 0, // Initialize to 0, will be maintained by Cloud Function
        status: publish ? 'published' : 'draft' // Explicitly set to 'draft' when not publishing
      };

      console.log('Saving listing with data:', listingData);
      console.log('User ID:', user.uid);

      let result;
      let wasDraftToPublished = false;
      
      if (isEdit) {
        console.log('Updating listing:', id);
        // Check if listing was previously a draft and is now being published
        if (originalData && originalData.status === 'draft' && publish) {
          wasDraftToPublished = true;
        }
        result = await updateListing(id, listingData);
        console.log('Update result:', result);
        if (!result || !result.success) {
          throw new Error(result?.error || 'Update failed - no success response');
        }
        setSuccess(publish ? 'Listing published successfully!' : 'Listing saved as draft!');
      } else {
        console.log('Creating new listing...');
        result = await createListing(listingData);
        console.log('Create result:', result);
        if (!result || !result.success) {
          throw new Error(result?.error || 'Creation failed - no success response');
        }
        wasDraftToPublished = publish; // New listing being published
        setSuccess(publish ? 'Listing created and published successfully!' : 'Listing saved as draft!');
      }

      // Award points for publishing a listing (only if newly published, not if already published)
      if (publish && wasDraftToPublished) {
        try {
          await updateHostPoints(user.uid, 50, 'Published a listing');
          console.log('✅ Points awarded for publishing listing');
        } catch (pointsError) {
          console.error('Error awarding points:', pointsError);
          // Don't fail the listing save if points fail
        }
      }

      // Log for debugging
      console.log('Listing saved successfully with status:', listingData.status);
      console.log('Listing ID:', result.id);
      
      setLoading(false);

      // For drafts, navigate immediately to listings page
      // For published listings, show success notification first
      if (!publish) {
        // Draft saved - navigate immediately with refresh flag
        navigate('/host/listings', { state: { refresh: true } });
      } else {
        // Published - show success notification, then navigate
        if (isEdit) {
          // For edits, update original data to reflect current state
          setOriginalData({
            title: listingData.title,
            category: listingData.category,
            serviceCategory: formData.serviceCategory || '',
            description: listingData.description,
            location: listingData.location,
            rate: listingData.rate.toString(),
            discount: listingData.discount.toString(),
            promo: listingData.promo,
            bedrooms: listingData.bedrooms.toString(),
            bathrooms: listingData.bathrooms.toString(),
            guests: listingData.guests.toString(),
            images: listingData.images,
            amenities: listingData.amenities,
            unavailableDates: formData.unavailableDates
          });
        }
        
        // Auto-navigate after 3 seconds (giving time to see the success notification)
        setTimeout(() => {
          navigate('/host/listings', { state: { refresh: true } });
        }, 3000);
      }
    } catch (error) {
      console.error('Error saving listing:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      
      // Extract more detailed error message
      let errorMessage = 'Failed to save listing. Please try again.';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.code) {
        switch (error.code) {
          case 'permission-denied':
            errorMessage = 'Permission denied. Please check your account status.';
            break;
          case 'unavailable':
            errorMessage = 'Service unavailable. Please check your internet connection and try again.';
            break;
          default:
            errorMessage = `Error: ${error.code}`;
        }
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  const categories = [
    { value: 'home', label: 'Home', icon: FaHome },
    { value: 'experience', label: 'Experience', icon: FaStar },
    { value: 'service', label: 'Service', icon: FaClock }
  ];

  // Calendar helper functions for availability
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const isDateUnavailable = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return formData.unavailableDates.includes(dateStr);
  };

  const isDateInPast = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const toggleDateAvailability = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    setFormData(prev => {
      const currentDates = prev.unavailableDates || [];
      if (currentDates.includes(dateStr)) {
        return {
          ...prev,
          unavailableDates: currentDates.filter(d => d !== dateStr)
        };
      } else {
        return {
          ...prev,
          unavailableDates: [...currentDates, dateStr].sort()
        };
      }
    });
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    const today = new Date();
    const prevMonthDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    if (prevMonthDate >= new Date(today.getFullYear(), today.getMonth(), 1)) {
      setCurrentMonth(prevMonthDate);
    }
  };

  const renderAvailabilityCalendar = () => {
    const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth);
    const days = [];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="aspect-square" />);
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isUnavailable = isDateUnavailable(date);
      const isPast = isDateInPast(date);

      days.push(
        <button
          key={day}
          type="button"
          onClick={() => !isPast && toggleDateAvailability(date)}
          disabled={isPast}
          className={`
            aspect-square p-1 text-xs font-medium rounded transition-all relative
            ${isPast 
              ? 'text-gray-300 cursor-not-allowed bg-gray-50' 
              : isUnavailable
              ? 'bg-red-100 text-red-700 hover:bg-red-200 cursor-pointer border border-red-400'
              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer border border-transparent hover:border-emerald-300'
            }
          `}
          title={isPast ? 'Cannot select past dates' : isUnavailable ? 'Click to make available' : 'Click to mark unavailable'}
        >
          {day}
          {isUnavailable && (
            <div className="absolute inset-0 flex items-center justify-center">
              <FaTimes className="w-2 h-2 text-red-600" />
            </div>
          )}
        </button>
      );
    }

    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-4 max-w-md">
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={prevMonth}
            disabled={currentMonth <= new Date(new Date().getFullYear(), new Date().getMonth(), 1)}
            className="p-1.5 hover:bg-gray-100 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <FaChevronLeft className="w-4 h-4 text-gray-700" />
          </button>
          <h3 className="text-sm font-bold text-gray-900">
            {monthNames[month]} {year}
          </h3>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
          >
            <FaChevronRight className="w-4 h-4 text-gray-700" />
          </button>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
            <div key={day} className="text-center text-[10px] font-semibold text-gray-500 uppercase">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1 mb-3">
          {days}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 pt-3 border-t border-gray-200 text-[10px]">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-emerald-50 border border-emerald-300" />
            <span className="text-gray-600">Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-red-100 border border-red-400 relative">
              <FaTimes className="w-1.5 h-1.5 text-red-600 absolute inset-0 m-auto" />
            </div>
            <span className="text-gray-600">Unavailable</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-gray-50" />
            <span className="text-gray-600">Past</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-3 border-t border-gray-200 mt-3">
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, unavailableDates: [] }))}
            className="flex-1 px-3 py-1.5 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-xs font-medium"
          >
            Clear All
          </button>
          <button
            type="button"
            onClick={() => setShowAvailabilityCalendar(false)}
            className="flex-1 px-3 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors text-xs font-medium"
          >
            Done
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isEdit ? 'Edit Listing' : 'Create New Listing'}
          </h1>
          <p className="text-gray-600">
            {isEdit ? 'Update your listing details' : 'Add a new property, experience, or service'}
          </p>
        </div>
        <button
          onClick={() => navigate('/host/listings')}
          className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          ← Back to Listings
        </button>
      </div>

      {/* Success Notification - Same style as Login page */}
      <AnimatePresence>
        {showSuccessNotification && success && (
          <motion.div
            initial={{ opacity: 0, x: 400, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 400, scale: 0.9 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 25,
              duration: 0.4 
            }}
            className="fixed top-4 right-4 z-50 w-full max-w-sm"
          >
            <div className="relative bg-white rounded-xl shadow-2xl border-l-4 border-emerald-500 overflow-hidden">
              {/* Progress Bar */}
              <motion.div
                className="absolute bottom-0 left-0 h-1.5 bg-emerald-500"
                initial={{ width: "100%" }}
                animate={{ width: `${successProgress}%` }}
                transition={{ duration: 0.1, ease: "linear" }}
              />
              
              <div className="px-5 py-4 flex items-start gap-3">
                {/* Success Icon */}
                <div className="flex-shrink-0 w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-emerald-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                
                {/* Message */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="font-medium text-gray-900 text-sm leading-relaxed" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    {success}
                  </p>
                </div>
                
                {/* Close Button */}
                <button
                  onClick={() => {
                    setShowSuccessNotification(false);
                    setTimeout(() => {
                      setSuccess("");
                      setSuccessProgress(100);
                    }, 300);
                  }}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded hover:bg-gray-100"
                  aria-label="Close notification"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Notification - Same style as Login page */}
      <AnimatePresence>
        {showErrorNotification && error && (
          <motion.div
            initial={{ opacity: 0, x: 400, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 400, scale: 0.9 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 25,
              duration: 0.4 
            }}
            className="fixed top-4 right-4 z-50 w-full max-w-sm"
          >
            <div className="relative bg-white rounded-xl shadow-2xl border-l-4 border-red-500 overflow-hidden">
              {/* Progress Bar */}
              <motion.div
                className="absolute bottom-0 left-0 h-1.5 bg-red-500"
                initial={{ width: "100%" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.1, ease: "linear" }}
              />
              
              <div className="px-5 py-4 flex items-start gap-3">
                {/* Error Icon */}
                <div className="flex-shrink-0 w-11 h-11 rounded-full bg-red-100 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                
                {/* Message */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="font-medium text-gray-900 text-sm leading-relaxed" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    {error}
                  </p>
                </div>
                
                {/* Close Button */}
                <button
                  onClick={() => {
                    setShowErrorNotification(false);
                    setTimeout(() => {
                      setError("");
                      setProgress(100);
                    }, 300);
                  }}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded hover:bg-gray-100"
                  aria-label="Close notification"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <form 
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(e, false);
        }} 
        noValidate // Disable HTML5 validation to allow empty drafts
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 space-y-8"
      >
        {/* Category Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Category *
          </label>
          <div className="grid grid-cols-3 gap-4">
            {categories.map(cat => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      category: cat.value,
                      // Reset serviceCategory if switching away from service
                      serviceCategory: cat.value === 'service' ? prev.serviceCategory : ''
                    }));
                  }}
                  className={`
                    p-4 border-2 rounded-lg transition-all
                    ${formData.category === cat.value
                      ? 'border-emerald-600 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className={`text-2xl mx-auto mb-2 ${
                    formData.category === cat.value ? 'text-emerald-600' : 'text-gray-400'
                  }`} />
                  <p className={`font-medium ${
                    formData.category === cat.value ? 'text-emerald-700' : 'text-gray-700'
                  }`}>
                    {cat.label}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Title <span className="text-xs text-gray-500 font-normal">(Required for publishing)</span>
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Enter listing title"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Location <span className="text-xs text-gray-500 font-normal">(Required for publishing)</span>
          </label>
          <div className="relative">
            <FaMapMarkerAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="Enter location (e.g., Manila, Philippines)"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          {/* Leaflet Map Preview */}
          {formData.location && formData.location.trim() && (
            <div className="mt-4 rounded-lg overflow-hidden border border-gray-200 shadow-sm" style={{ height: '256px', zIndex: 0 }}>
              <MapContainer
                center={mapPosition}
                zoom={mapZoom}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationMarker position={mapPosition} setPosition={setMapPosition} onLocationSet={handleMapLocationSet} />
              </MapContainer>
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description <span className="text-xs text-gray-500 font-normal">(Required for publishing)</span>
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={6}
            placeholder="Describe your listing in detail..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        {/* Property Details - Home */}
        {formData.category === 'home' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bedrooms <span className="text-xs text-gray-500 font-normal">(Required for publishing)</span>
              </label>
              <input
                type="number"
                name="bedrooms"
                value={formData.bedrooms}
                onChange={handleChange}
                onKeyDown={(e) => {
                  // Prevent non-numeric keys except: backspace, delete, tab, escape, enter, and arrow keys
                  const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
                  const isNumber = /[0-9]/.test(e.key);
                  const isAllowedKey = allowedKeys.includes(e.key) || (e.ctrlKey && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase()));
                  
                  if (!isNumber && !isAllowedKey) {
                    e.preventDefault();
                  }
                }}
                onPaste={(e) => {
                  e.preventDefault();
                  const paste = (e.clipboardData || window.clipboardData).getData('text');
                  const numericValue = paste.replace(/[^0-9]/g, '');
                  if (numericValue) {
                    setFormData(prev => ({
                      ...prev,
                      bedrooms: numericValue
                    }));
                  }
                }}
                min="0"
                placeholder="0"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bathrooms <span className="text-xs text-gray-500 font-normal">(Required for publishing)</span>
              </label>
              <input
                type="number"
                name="bathrooms"
                value={formData.bathrooms}
                onChange={handleChange}
                min="0"
                step="0.5"
                placeholder="0"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Guests <span className="text-xs text-gray-500 font-normal">(Required for publishing)</span>
              </label>
              <input
                type="number"
                name="guests"
                value={formData.guests}
                onChange={handleChange}
                min="1"
                placeholder="1"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
        )}

        {/* Service Category Selection - Only for Services */}
        {formData.category === 'service' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Service Type *
              <span className="text-xs text-gray-500 ml-2">(Select the type of service you offer)</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {serviceCategories.map((service) => {
                const Icon = service.icon;
                const isSelected = formData.serviceCategory === service.value;
                return (
                  <button
                    key={service.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, serviceCategory: service.value }))}
                    className={`
                      p-4 border-2 rounded-lg transition-all text-left
                      ${isSelected
                        ? 'border-emerald-600 bg-emerald-50'
                        : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50'
                      }
                    `}
                  >
                    <div className="flex flex-col items-center text-center">
                      <Icon className={`text-2xl mb-2 ${
                        isSelected ? 'text-emerald-600' : 'text-gray-400'
                      }`} />
                      <p className={`text-xs font-medium ${
                        isSelected ? 'text-emerald-700' : 'text-gray-700'
                      }`}>
                        {service.label}
                      </p>
                      {isSelected && (
                        <FaCheckCircle className="text-emerald-600 text-sm mt-1" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            {!formData.serviceCategory && (
              <p className="mt-2 text-xs text-red-600">Please select a service type</p>
            )}
          </div>
        )}

        {/* Details for Services and Experiences */}
        {(formData.category === 'service' || formData.category === 'experience') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {formData.category === 'experience' ? 'Max Participants' : 'Max Capacity'}
              </label>
              <input
                type="number"
                name="guests"
                value={formData.guests}
                onChange={handleChange}
                min="1"
                placeholder="1"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {formData.category === 'experience' ? 'Duration' : 'Service Duration'}
              </label>
              <input
                type="text"
                name="promo"
                value={formData.promo}
                onChange={handleChange}
                placeholder={formData.category === 'experience' ? 'e.g., 2.5 hours · Guided' : 'e.g., 1 hour session'}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">
                {formData.category === 'experience' 
                  ? 'Duration of the experience (e.g., "2 hours", "Full day")'
                  : 'How long the service takes (e.g., "1 hour", "per session")'}
              </p>
            </div>
          </div>
        )}

        {/* Rate and Pricing */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {formData.category === 'home' 
                ? 'Rate per Night (₱)'
                : formData.category === 'service'
                ? 'Price (₱)'
                : 'Price per Person (₱)'}
              <span className="text-xs text-gray-500 font-normal ml-1">(Required for publishing)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg">₱</span>
              <input
                type="number"
                name="rate"
                value={formData.rate}
                onChange={handleChange}
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {formData.category === 'home' 
                ? 'Price per night'
                : formData.category === 'service'
                ? 'Price for the service'
                : 'Price per person for this experience'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Discount (%)
            </label>
            <input
              type="number"
              name="discount"
              value={formData.discount}
              onChange={handleChange}
              min="0"
              max="100"
              placeholder="0"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">Optional discount percentage</p>
          </div>
        </div>

        {/* Images */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Images
            <span className="text-xs text-gray-500 ml-2">(Upload multiple images)</span>
          </label>
          <div className="space-y-4">
            <div className="flex items-center justify-center w-full">
              <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg transition-colors ${
                uploading 
                  ? 'border-emerald-300 bg-emerald-50 cursor-wait' 
                  : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-emerald-400 cursor-pointer'
              }`}>
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mb-3"></div>
                      <p className="mb-2 text-sm text-emerald-600 font-semibold">Uploading images...</p>
                      <p className="text-xs text-gray-500">Please wait</p>
                    </>
                  ) : (
                    <>
                      <FaImage className="w-10 h-10 mb-3 text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG, GIF, WebP up to 10MB each</p>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  className="hidden"
                  multiple
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
              </label>
            </div>


            {formData.images.length > 0 && (
              <div className="grid grid-cols-3 gap-4">
                {formData.images.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={image}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <FaTimes className="text-xs" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Amenities Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            What this place offers
            <span className="text-xs text-gray-500 ml-2">(Add amenities and features)</span>
          </label>
          
          {/* Common Amenities Quick Select */}
          <div className="mb-4">
            <p className="text-xs text-gray-600 mb-2 font-medium">Quick Add:</p>
            <div className="flex flex-wrap gap-2">
              {commonAmenities.map((amenity) => {
                const Icon = amenity.icon;
                const isSelected = formData.amenities.includes(amenity.name);
                return (
                  <button
                    key={amenity.name}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        removeAmenity(amenity.name);
                      } else {
                        addAmenity(amenity.name);
                      }
                    }}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm
                      ${isSelected
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:border-emerald-400 hover:bg-emerald-50'
                      }
                    `}
                  >
                    <Icon className={isSelected ? 'text-emerald-600' : 'text-gray-500'} />
                    <span>{amenity.name}</span>
                    {isSelected && <FaCheckCircle className="text-emerald-600 text-xs" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Amenity Input */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newAmenity}
              onChange={(e) => setNewAmenity(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addAmenity(newAmenity);
                }
              }}
              placeholder="Add custom amenity (e.g., Beach Access, Fireplace)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => addAmenity(newAmenity)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
            >
              <FaPlus />
              Add
            </button>
          </div>

          {/* Selected Amenities Display */}
          {formData.amenities.length > 0 && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600 mb-2 font-semibold">
                Selected Amenities ({formData.amenities.length}):
              </p>
              <div className="flex flex-wrap gap-2">
                {formData.amenities.map((amenity) => (
                  <span
                    key={amenity}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700"
                  >
                    {amenity}
                    <button
                      type="button"
                      onClick={() => removeAmenity(amenity)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <FaTimes className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Availability Calendar - Only for home listings */}
        {formData.category === 'home' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Availability Calendar
              <span className="text-xs text-gray-500 ml-2">(Mark dates as unavailable)</span>
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAvailabilityCalendar(!showAvailabilityCalendar)}
                className="w-full border-2 border-gray-300 rounded-lg p-4 hover:border-emerald-500 focus:border-emerald-500 transition-colors text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FaCalendarAlt className="text-emerald-600 text-xl" />
                    <div>
                      <p className="font-semibold text-gray-900">
                        {formData.unavailableDates.length === 0 
                          ? 'All dates available' 
                          : `${formData.unavailableDates.length} date${formData.unavailableDates.length === 1 ? '' : 's'} marked unavailable`}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Click to manage availability
                      </p>
                    </div>
                  </div>
                  <FaChevronRight className={`text-gray-400 transition-transform ${showAvailabilityCalendar ? 'rotate-90' : ''}`} />
                </div>
              </button>

              {/* Calendar Dropdown */}
              <AnimatePresence>
                {showAvailabilityCalendar && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 mt-2 z-50"
                  >
                    {renderAvailabilityCalendar()}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {formData.unavailableDates.length > 0 && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-2 font-semibold">Unavailable dates:</p>
                <div className="flex flex-wrap gap-2">
                  {formData.unavailableDates.slice(0, 5).map((dateStr) => (
                    <span
                      key={dateStr}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium"
                    >
                      {new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            unavailableDates: prev.unavailableDates.filter(d => d !== dateStr)
                          }));
                        }}
                        className="hover:text-red-900"
                      >
                        <FaTimes className="w-2 h-2" />
                      </button>
                    </span>
                  ))}
                  {formData.unavailableDates.length > 5 && (
                    <span className="inline-flex items-center px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs font-medium">
                      +{formData.unavailableDates.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={loading || (isEdit && !hasChanges())}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-colors font-medium ${
              (isEdit && !hasChanges())
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50'
            }`}
            title={isEdit && !hasChanges() ? 'No changes to save' : ''}
          >
            <FaSave />
            {loading ? 'Saving...' : isEdit ? 'Update Draft' : 'Save as Draft'}
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e, true)}
            disabled={loading || (isEdit && !hasChanges())}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-colors font-medium ${
              (isEdit && !hasChanges())
                ? 'bg-gray-300 text-gray-400 cursor-not-allowed'
                : 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50'
            }`}
            title={isEdit && !hasChanges() ? 'No changes to publish' : ''}
          >
            <FaEye />
            {loading ? 'Publishing...' : isEdit ? 'Update & Publish' : 'Publish Listing'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default HostListingForm;

