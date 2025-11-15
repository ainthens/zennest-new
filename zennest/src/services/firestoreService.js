// src/services/firestoreService.js
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  addDoc,
  Timestamp,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { parseDate } from '../utils/dateUtils';

// Host profile management
export const createHostProfile = async (userId, hostData) => {
  try {
    // Users can now have both guest and host profiles
    // Check if guest profile exists and copy relevant data if needed
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    let guestData = {};
    if (userSnap.exists()) {
      const guestProfile = userSnap.data();
      // Copy profile picture, name, email if not provided in hostData
      guestData = {
        profilePicture: hostData.profilePicture || guestProfile.profilePicture || '',
        firstName: hostData.firstName || guestProfile.firstName || '',
        lastName: hostData.lastName || guestProfile.lastName || '',
        email: hostData.email || guestProfile.email || '',
      };
    }

    const hostRef = doc(db, 'hosts', userId);
    await setDoc(hostRef, {
      ...hostData,
      ...guestData, // Merge guest profile data
      role: 'host', // Explicitly set role to 'host'
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      subscriptionStatus: hostData.subscriptionStatus || 'pending', // Will be 'active' after payment
      subscriptionStartDate: hostData.subscriptionStatus === 'active' ? serverTimestamp() : null,
      points: 0,
      totalEarnings: 0
    });
    
    // Ensure user profile exists (for guest access)
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        role: 'guest',
        ...guestData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        favorites: []
      });
    }
    
    console.log('✅ Host profile created successfully for user:', userId);
    return { success: true, id: userId };
  } catch (error) {
    console.error('❌ Error creating host profile:', error);
    throw error;
  }
};

export const getHostProfile = async (userId) => {
  try {
    if (!userId) {
      console.error('❌ getHostProfile: User ID is required');
      return { success: false, data: null, error: 'User ID is required' };
    }

    console.log('🔍 Fetching host profile for user:', userId);
    const hostRef = doc(db, 'hosts', userId);
    const hostSnap = await getDoc(hostRef);
    
    if (hostSnap.exists()) {
      const data = hostSnap.data();
      console.log('✅ Host profile found:', { 
        hasProfilePicture: !!data.profilePicture,
        firstName: data.firstName,
        lastName: data.lastName 
      });
      return { success: true, data: data };
    } else {
      console.warn('⚠️ Host profile does not exist for user:', userId);
      return { success: false, data: null, error: 'Host profile not found' };
    }
  } catch (error) {
    console.error('❌ Error getting host profile:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    return { 
      success: false, 
      data: null, 
      error: error.message || 'Failed to fetch host profile',
      code: error.code 
    };
  }
};

export const updateHostProfile = async (userId, updates) => {
  try {
    if (!userId) {
      throw new Error('User ID is required to update host profile');
    }

    console.log('Updating host profile for user:', userId);
    console.log('Update data:', updates);
    
    const hostRef = doc(db, 'hosts', userId);
    
    // Prepare clean update data
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp()
    };
    
    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });
    
    console.log('Sending update to Firestore:', updateData);
    await updateDoc(hostRef, updateData);
    console.log('✅ Host profile updated successfully');
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error updating host profile:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    return {
      success: false,
      error: error.message || 'Failed to update host profile',
      code: error.code
    };
  }
};

// Listing management
export const createListing = async (listingData) => {
  try {
    console.log('createListing called with:', listingData);
    
    // Validate required fields
    if (!listingData.hostId) {
      throw new Error('Host ID is required to create a listing');
    }
    
    // Title is only required for published listings, not drafts
    const isPublished = listingData.status === 'published';
    if (isPublished && (!listingData.title || !listingData.title.trim())) {
      throw new Error('Listing title is required to publish a listing');
    }
    
    // Verify user has a host profile (not just guest profile)
    const hostResult = await getHostProfile(listingData.hostId);
    if (!hostResult.success || !hostResult.data) {
      throw new Error('You must have a host account to create listings. Please register as a host first.');
    }
    
    // Verify the role is actually 'host' in the profile
    if (hostResult.data.role !== 'host') {
      throw new Error('Invalid host profile. Please contact support.');
    }
    
    // Check if host can create more listings (only for published listings)
    // Drafts don't count against listing limits
    if (isPublished) {
      const canCreate = await canCreateListing(listingData.hostId);
      if (!canCreate.success || !canCreate.canCreate) {
        throw new Error(canCreate.error || 'Cannot create listing. Please check your subscription.');
      }
    }
    
    const listingsRef = collection(db, 'listings');
    
    // Prepare the document data - allow empty fields for drafts
    const docData = {
      title: listingData.title?.trim() || '', // Allow empty title for drafts
      category: listingData.category || 'home',
      description: listingData.description?.trim() || '',
      location: listingData.location?.trim() || '',
      hostId: listingData.hostId,
      rate: parseFloat(listingData.rate) || 0,
      discount: parseFloat(listingData.discount) || 0,
      bedrooms: parseInt(listingData.bedrooms) || 0,
      bathrooms: parseFloat(listingData.bathrooms) || 0,
      guests: parseInt(listingData.guests) || 0,
      images: Array.isArray(listingData.images) ? listingData.images : [],
      promo: listingData.promo?.trim() || '',
      amenities: Array.isArray(listingData.amenities) ? listingData.amenities : [],
      unavailableDates: Array.isArray(listingData.unavailableDates) ? listingData.unavailableDates : [],
      status: listingData.status || 'draft', // 'draft' or 'published'
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      views: 0,
      bookings: 0,
      rating: 0,
      reviews: []
    };
    
    console.log('Adding document to Firestore with data:', docData);
    const docRef = await addDoc(listingsRef, docData);
    console.log('✅ Document created successfully with ID:', docRef.id);
    
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('❌ Error creating listing:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    // Return error instead of throwing to allow better error handling in component
    return { 
      success: false, 
      error: error.message || 'Failed to create listing',
      code: error.code 
    };
  }
};

export const updateListing = async (listingId, updates) => {
  try {
    if (!listingId) {
      throw new Error('Listing ID is required to update a listing');
    }
    
    const listingRef = doc(db, 'listings', listingId);
    
    // Prepare clean update data
    const updateData = {
      ...updates,
      // Ensure string fields are trimmed
      title: updates.title?.trim() || updates.title,
      description: updates.description?.trim() || updates.description,
      location: updates.location?.trim() || updates.location,
      promo: updates.promo?.trim() || updates.promo || '',
      // Ensure numeric fields are properly converted
      rate: parseFloat(updates.rate) || 0,
      discount: parseFloat(updates.discount) || 0,
      bedrooms: parseInt(updates.bedrooms) || 0,
      bathrooms: parseFloat(updates.bathrooms) || 0,
      guests: parseInt(updates.guests) || 0,
      // Ensure arrays are arrays
      images: Array.isArray(updates.images) ? updates.images : [],
      amenities: Array.isArray(updates.amenities) ? updates.amenities : [],
      unavailableDates: Array.isArray(updates.unavailableDates) ? updates.unavailableDates : [],
      updatedAt: serverTimestamp()
    };
    
    console.log('Updating listing:', listingId, 'with data:', updateData);
    await updateDoc(listingRef, updateData);
    console.log('✅ Listing updated successfully');
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error updating listing:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    // Return error instead of throwing
    return { 
      success: false, 
      error: error.message || 'Failed to update listing',
      code: error.code 
    };
  }
};

export const getHostListings = async (hostId) => {
  try {
    const listingsRef = collection(db, 'listings');
    
    // Try with orderBy first (requires index)
    try {
      const q = query(listingsRef, where('hostId', '==', hostId), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const listings = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        listings.push({ 
          id: doc.id, 
          ...data,
          // Convert Timestamp to Date for sorting
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt
        });
      });
      return { success: true, data: listings };
    } catch (orderByError) {
      // If index error, fetch without orderBy and sort in memory
      if (orderByError.code === 'failed-precondition' && orderByError.message?.includes('index')) {
        console.warn('Firestore index not found. Fetching without orderBy and sorting in memory...');
        console.warn('To create the index, visit:', orderByError.message.match(/https:\/\/[^\s]+/)?.[0] || 'Firebase Console');
        
        const q = query(listingsRef, where('hostId', '==', hostId));
        const querySnapshot = await getDocs(q);
        const listings = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          listings.push({ 
            id: doc.id, 
            ...data,
            // Convert Timestamp to Date for sorting
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt || new Date(0)
          });
        });
        
        // Sort by createdAt descending in memory
        listings.sort((a, b) => {
          const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
          const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
          return dateB - dateA; // Descending order
        });
        
        return { success: true, data: listings };
      }
      // If it's a different error, throw it
      throw orderByError;
    }
  } catch (error) {
    console.error('Error getting host listings:', error);
    throw error;
  }
};

// Get published listings for guests/users (filtered by category)
export const getPublishedListings = async (category = null) => {
  try {
    const listingsRef = collection(db, 'listings');
    
    // Try with orderBy first (requires index)
    try {
      let q;
      
      if (category) {
        // Get published listings for a specific category
        q = query(
          listingsRef, 
          where('status', '==', 'published'),
          where('category', '==', category),
          orderBy('createdAt', 'desc')
        );
      } else {
        // Get all published listings
        q = query(
          listingsRef, 
          where('status', '==', 'published'),
          orderBy('createdAt', 'desc')
        );
      }
      
      const querySnapshot = await getDocs(q);
      const listings = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // SAFETY: Exclude archived listings from published listings query
        // Never exclude listings due to missing province/coords - they are optional fields
        if (data.archived || data.status === 'archived') {
          return; // Skip archived listings
        }
        listings.push({ 
          id: doc.id, 
          ...data,
          // Handle Timestamp conversion for display
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt || new Date(0),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
          // Include new fields: completedBookingsCount, province, coords
          // All fields have safe defaults - listings are valid even if these are missing
          completedBookingsCount: data.completedBookingsCount || 0,
          province: (data.province || '').trim(), // Empty string if missing
          coords: data.coords || null, // null if missing
          archived: data.archived || false
        });
      });
      return { success: true, data: listings };
    } catch (orderByError) {
      // If index error, fetch without orderBy and sort in memory
      if (orderByError.code === 'failed-precondition' && orderByError.message?.includes('index')) {
        console.warn('Firestore index not found for published listings. Fetching without orderBy and sorting in memory...');
        console.warn('To create the index, visit:', orderByError.message.match(/https:\/\/[^\s]+/)?.[0] || 'Firebase Console');
        
        let q;
        if (category) {
          q = query(
            listingsRef,
            where('status', '==', 'published'),
            where('category', '==', category)
          );
        } else {
          q = query(
            listingsRef,
            where('status', '==', 'published')
          );
        }
        
        const querySnapshot = await getDocs(q);
        const listings = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          // SAFETY: Exclude archived listings from published listings query
          // Never exclude listings due to missing province/coords - they are optional fields
          if (data.archived || data.status === 'archived') {
            return; // Skip archived listings
          }
          listings.push({ 
            id: doc.id, 
            ...data,
            // Handle Timestamp conversion for display
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt || new Date(0),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
            // Include new fields: completedBookingsCount, province, coords
            // All fields have safe defaults - listings are valid even if these are missing
            completedBookingsCount: data.completedBookingsCount || 0,
            province: (data.province || '').trim(), // Empty string if missing
            coords: data.coords || null, // null if missing
            archived: data.archived || false
          });
        });
        
        // Sort by createdAt descending in memory
        listings.sort((a, b) => {
          const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
          const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
          return dateB - dateA; // Descending order
        });
        
        return { success: true, data: listings };
      }
      // If it's a different error, throw it
      throw orderByError;
    }
  } catch (error) {
    console.error('Error getting published listings:', error);
    throw error;
  }
};

// Soft archive a listing instead of deleting it
// This preserves data and allows recovery if needed
export const softArchiveListing = async (listingId, reason = 'archived-by-user') => {
  try {
    const listingRef = doc(db, 'listings', listingId);
    await updateDoc(listingRef, {
      archived: true,
      archivedAt: serverTimestamp(),
      archivedReason: reason,
      status: 'archived' // Change status to archived
    });
    console.log(`✅ Listing ${listingId} soft-archived with reason: ${reason}`);
    return { success: true };
  } catch (error) {
    console.error('Error soft-archiving listing:', error);
    throw error;
  }
};

// Hard delete listing - USE WITH EXTREME CAUTION
// Only use when absolutely necessary (e.g., GDPR compliance, legal requirement)
// Prefer softArchiveListing for normal operations
export const deleteListing = async (listingId, forceDelete = false) => {
  try {
    // SAFETY: Require explicit forceDelete flag to prevent accidental deletions
    if (!forceDelete) {
      console.warn('⚠️ deleteListing called without forceDelete=true. Use softArchiveListing instead.');
      throw new Error('Delete operation requires forceDelete=true. Use softArchiveListing for safe archiving.');
    }
    
    const listingRef = doc(db, 'listings', listingId);
    await deleteDoc(listingRef);
    console.log(`⚠️ Listing ${listingId} permanently deleted (forceDelete=true)`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting listing:', error);
    throw error;
  }
};

// Bookings management
export const getHostBookings = async (hostId, status = null) => {
  try {
    if (!hostId) {
      return { success: false, data: [], error: 'Host ID is required' };
    }

    const bookingsRef = collection(db, 'bookings');
    
    // Try with orderBy first (requires index)
    try {
      let q;
      if (status) {
        q = query(
          bookingsRef, 
          where('hostId', '==', hostId),
          where('status', '==', status),
          orderBy('checkIn', 'desc')
        );
      } else {
        q = query(
          bookingsRef, 
          where('hostId', '==', hostId),
          orderBy('checkIn', 'desc')
        );
      }
      const querySnapshot = await getDocs(q);
      const bookings = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Convert Firestore Timestamps to Date objects using utility function for consistent parsing
        bookings.push({ 
          id: doc.id, 
          ...data,
          checkIn: parseDate(data.checkIn),
          checkOut: parseDate(data.checkOut)
        });
      });
      return { success: true, data: bookings };
    } catch (orderByError) {
      // If index error, fetch without orderBy and sort in memory
      if (orderByError.code === 'failed-precondition' && orderByError.message?.includes('index')) {
        console.warn('Firestore index not found for bookings. Fetching without orderBy...');
        
        let q;
        if (status) {
          q = query(
            bookingsRef,
            where('hostId', '==', hostId),
            where('status', '==', status)
          );
        } else {
          q = query(
            bookingsRef,
            where('hostId', '==', hostId)
          );
        }
        
        const querySnapshot = await getDocs(q);
        const bookings = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          // Convert Firestore Timestamps to Date objects using utility function for consistent parsing
          bookings.push({ 
            id: doc.id, 
            ...data,
            checkIn: parseDate(data.checkIn),
            checkOut: parseDate(data.checkOut)
          });
        });
        
        // Sort by checkIn descending in memory
        bookings.sort((a, b) => {
          const dateA = parseDate(a.checkIn);
          const dateB = parseDate(b.checkIn);
          const timeA = dateA ? dateA.getTime() : 0;
          const timeB = dateB ? dateB.getTime() : 0;
          return timeB - timeA; // Descending order (newest first)
        });
        
        return { success: true, data: bookings };
      }
      throw orderByError;
    }
  } catch (error) {
    console.error('❌ Error getting host bookings:', error);
    return { 
      success: false, 
      data: [], 
      error: error.message || 'Failed to fetch bookings',
      code: error.code 
    };
  }
};

export const updateBookingStatus = async (bookingId, status, hostId = null) => {
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    const bookingSnap = await getDoc(bookingRef);
    
    if (!bookingSnap.exists()) {
      throw new Error('Booking not found');
    }
    
    const bookingData = bookingSnap.data();
    const previousStatus = bookingData.status;
    
    await updateDoc(bookingRef, {
      status,
      updatedAt: serverTimestamp()
    });
    
    // Award points for booking milestones when status changes to completed
    // Note: Points for first booking are awarded when booking is confirmed (in approveBooking)
    // This handles milestones that might be reached when a booking is completed
    if (status === 'completed' && previousStatus !== 'completed' && hostId) {
      try {
        const bookingsRef = collection(db, 'bookings');
        
        // Get all confirmed and completed bookings for this host
        // Count both confirmed and completed as "successful bookings"
        const successfulBookingsQuery = query(
          bookingsRef,
          where('hostId', '==', hostId),
          where('status', 'in', ['confirmed', 'completed'])
        );
        const successfulBookings = await getDocs(successfulBookingsQuery);
        const totalSuccessfulBookings = successfulBookings.size;
        
        // Award points for 10 bookings milestone (250 points)
        // Check if we just reached exactly 10 bookings
        if (totalSuccessfulBookings === 10) {
          await updateHostPoints(hostId, 250, 'Completed 10 bookings');
          console.log('✅ Points awarded for 10 bookings milestone');
        }
        
        // Award points for 50 bookings milestone (1000 points)
        // Check if we just reached exactly 50 bookings
        if (totalSuccessfulBookings === 50) {
          await updateHostPoints(hostId, 1000, 'Completed 50 bookings');
          console.log('✅ Points awarded for 50 bookings milestone');
        }
      } catch (pointsError) {
        console.error('Error awarding points for completed booking:', pointsError);
        // Don't fail the booking update if points fail
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error updating booking status:', error);
    throw error;
  }
};

// Approve booking request
export const approveBooking = async (bookingId, hostId) => {
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    const bookingSnap = await getDoc(bookingRef);
    
    if (!bookingSnap.exists()) {
      throw new Error('Booking not found');
    }
    
    const bookingData = bookingSnap.data();
    
    // Verify this booking belongs to the host
    if (bookingData.hostId !== hostId) {
      throw new Error('Unauthorized: This booking does not belong to you');
    }
    
    // Check if booking is pending approval
    if (bookingData.status !== 'pending_approval') {
      throw new Error('Booking is not pending approval');
    }
    
    // Update booking status to confirmed
    await updateDoc(bookingRef, {
      status: 'confirmed',
      approvedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // Transfer payment to host if payment is completed
    if (bookingData.paymentStatus === 'completed') {
      try {
        const hostAmount = (bookingData.subtotal || 0) - (bookingData.promoDiscount || 0);
        if (hostAmount > 0) {
          await transferPaymentToHost(hostId, hostAmount, bookingId, bookingData.listingTitle || 'Listing');
        }
      } catch (transferError) {
        console.error('Error transferring payment to host:', transferError);
        // Don't fail the approval if transfer fails
      }
    }
    
    // Award points for successful bookings (confirmed or completed)
    // Count both confirmed and completed bookings for milestones
    try {
      const bookingsRef = collection(db, 'bookings');
      
      // Get all confirmed and completed bookings for this host
      const confirmedBookingsQuery = query(
        bookingsRef,
        where('hostId', '==', hostId),
        where('status', 'in', ['confirmed', 'completed'])
      );
      const confirmedBookings = await getDocs(confirmedBookingsQuery);
      const totalSuccessfulBookings = confirmedBookings.size;
      
      // Award points for first booking (100 points)
      if (totalSuccessfulBookings === 1) {
        await updateHostPoints(hostId, 100, 'Completed first booking');
        console.log('✅ Points awarded for first booking');
      }
      
      // Award points for 10 bookings milestone (250 points)
      // Check if we just reached exactly 10 bookings
      if (totalSuccessfulBookings === 10) {
        await updateHostPoints(hostId, 250, 'Completed 10 bookings');
        console.log('✅ Points awarded for 10 bookings milestone');
      }
      
      // Award points for 50 bookings milestone (1000 points)
      // Check if we just reached exactly 50 bookings
      if (totalSuccessfulBookings === 50) {
        await updateHostPoints(hostId, 1000, 'Completed 50 bookings');
        console.log('✅ Points awarded for 50 bookings milestone');
      }
    } catch (pointsError) {
      console.error('Error awarding points for booking confirmation:', pointsError);
      // Don't fail the approval if points fail
    }
    
    // Return booking data for email sending
    return { success: true, booking: { id: bookingId, ...bookingData } };
  } catch (error) {
    console.error('Error approving booking:', error);
    throw error;
  }
};

// Reject booking request
export const rejectBooking = async (bookingId, hostId, rejectionReason = null) => {
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    const bookingSnap = await getDoc(bookingRef);
    
    if (!bookingSnap.exists()) {
      throw new Error('Booking not found');
    }
    
    const bookingData = bookingSnap.data();
    
    // Verify this booking belongs to the host
    if (bookingData.hostId !== hostId) {
      throw new Error('Unauthorized: This booking does not belong to you');
    }
    
    // Check if booking is pending approval
    if (bookingData.status !== 'pending_approval') {
      throw new Error('Booking is not pending approval');
    }
    
    // Update booking status to rejected
    await updateDoc(bookingRef, {
      status: 'rejected',
      rejectedAt: serverTimestamp(),
      rejectionReason: rejectionReason || null,
      updatedAt: serverTimestamp()
    });
    
    // TODO: Handle refund if payment was already processed
    // For now, we'll leave the payment status as is
    
    return { success: true };
  } catch (error) {
    console.error('Error rejecting booking:', error);
    throw error;
  }
};

// Approve cancellation request
export const approveCancellation = async (bookingId, hostId) => {
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    const bookingSnap = await getDoc(bookingRef);
    
    if (!bookingSnap.exists()) {
      throw new Error('Booking not found');
    }
    
    const bookingData = bookingSnap.data();
    
    // Verify this booking belongs to the host
    if (bookingData.hostId !== hostId) {
      throw new Error('Unauthorized: This booking does not belong to you');
    }
    
    // Check if cancellation is pending approval
    if (bookingData.status !== 'pending_cancellation') {
      throw new Error('Cancellation is not pending approval');
    }
    
    // Update booking status to cancelled
    await updateDoc(bookingRef, {
      status: 'cancelled',
      cancelledAt: serverTimestamp(),
      cancellationApprovedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // Return booking data for email sending
    return { success: true, booking: { id: bookingId, ...bookingData } };
  } catch (error) {
    console.error('Error approving cancellation:', error);
    throw error;
  }
};

// Reject cancellation request
export const rejectCancellation = async (bookingId, hostId, rejectionReason = null) => {
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    const bookingSnap = await getDoc(bookingRef);
    
    if (!bookingSnap.exists()) {
      throw new Error('Booking not found');
    }
    
    const bookingData = bookingSnap.data();
    
    // Verify this booking belongs to the host
    if (bookingData.hostId !== hostId) {
      throw new Error('Unauthorized: This booking does not belong to you');
    }
    
    // Check if cancellation is pending approval
    if (bookingData.status !== 'pending_cancellation') {
      throw new Error('Cancellation is not pending approval');
    }
    
    // Revert booking status back to confirmed (or previous status)
    const previousStatus = bookingData.previousStatus || 'confirmed';
    await updateDoc(bookingRef, {
      status: previousStatus,
      cancellationRejectedAt: serverTimestamp(),
      cancellationRejectionReason: rejectionReason || null,
      updatedAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error rejecting cancellation:', error);
    throw error;
  }
};

// Messages & Conversations Management
// Create or get a conversation between guest and host for a listing
export const getOrCreateConversation = async (guestId, hostId, listingId, listingTitle) => {
  try {
    // Create a unique conversation ID based on guest, host, and listing
    const conversationId = `${guestId}_${hostId}_${listingId}`;
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationSnap = await getDoc(conversationRef);

    if (conversationSnap.exists()) {
      return { success: true, data: { id: conversationSnap.id, ...conversationSnap.data() } };
    } else {
      // Create new conversation
      await setDoc(conversationRef, {
        guestId,
        hostId,
        listingId,
        listingTitle: listingTitle || 'Listing',
        participants: [guestId, hostId],
        lastMessage: null,
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        unreadCount: { [guestId]: 0, [hostId]: 0 }
      });
      return { success: true, data: { id: conversationId, guestId, hostId, listingId, listingTitle } };
    }
  } catch (error) {
    console.error('Error getting or creating conversation:', error);
    return { success: false, error: error.message };
  }
};

// Get all conversations for a user (guest or host)
export const getUserConversations = async (userId, userType = 'guest') => {
  try {
    const conversationsRef = collection(db, 'conversations');
    const field = userType === 'guest' ? 'guestId' : 'hostId';
    const q = query(
      conversationsRef,
      where(field, '==', userId),
      orderBy('lastMessageAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const conversations = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      conversations.push({
        id: doc.id,
        ...data,
        lastMessageAt: data.lastMessageAt?.toDate ? data.lastMessageAt.toDate() : data.lastMessageAt
      });
    });
    
    return { success: true, data: conversations };
  } catch (error) {
    console.error('Error getting conversations:', error);
    // Fallback: try without orderBy if index is missing
    try {
      const conversationsRef = collection(db, 'conversations');
      const field = userType === 'guest' ? 'guestId' : 'hostId';
      const q = query(conversationsRef, where(field, '==', userId));
      const querySnapshot = await getDocs(q);
      const conversations = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        conversations.push({
          id: doc.id,
          ...data,
          lastMessageAt: data.lastMessageAt?.toDate ? data.lastMessageAt.toDate() : data.lastMessageAt
        });
      });
      // Sort in memory
      conversations.sort((a, b) => {
        const dateA = a.lastMessageAt ? (a.lastMessageAt instanceof Date ? a.lastMessageAt : a.lastMessageAt.toDate()) : new Date(0);
        const dateB = b.lastMessageAt ? (b.lastMessageAt instanceof Date ? b.lastMessageAt : b.lastMessageAt.toDate()) : new Date(0);
        return dateB - dateA;
      });
      return { success: true, data: conversations };
    } catch (fallbackError) {
      return { success: false, error: fallbackError.message, data: [] };
    }
  }
};

// Send a message in a conversation
export const sendConversationMessage = async (conversationId, senderId, senderName, senderType, messageText, listingId, listingTitle) => {
  try {
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const messageData = {
      senderId,
      senderName: senderName || 'User',
      senderType, // 'guest' or 'host'
      text: messageText,
      read: false,
      createdAt: serverTimestamp(),
      listingId,
      listingTitle
    };
    
    const docRef = await addDoc(messagesRef, messageData);
    
    // Update conversation's last message and timestamp
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationSnap = await getDoc(conversationRef);
    
    if (conversationSnap.exists()) {
      const convData = conversationSnap.data();
      const unreadCount = { ...convData.unreadCount };
      
      // Increment unread count for the recipient
      if (senderType === 'guest') {
        unreadCount[convData.hostId] = (unreadCount[convData.hostId] || 0) + 1;
      } else {
        unreadCount[convData.guestId] = (unreadCount[convData.guestId] || 0) + 1;
      }
      
      await updateDoc(conversationRef, {
        lastMessage: messageText,
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        unreadCount
      });
    }
    
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error sending message:', error);
    return { success: false, error: error.message };
  }
};

// Delete a message
export const deleteMessage = async (conversationId, messageId) => {
  try {
    const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
    await deleteDoc(messageRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting message:', error);
    return { success: false, error: error.message };
  }
};

// Mark messages as read
export const markConversationAsRead = async (conversationId, userId) => {
  try {
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationSnap = await getDoc(conversationRef);
    
    if (conversationSnap.exists()) {
      const convData = conversationSnap.data();
      const unreadCount = { ...convData.unreadCount };
      unreadCount[userId] = 0;
      
      await updateDoc(conversationRef, {
        unreadCount,
        updatedAt: serverTimestamp()
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error marking conversation as read:', error);
    return { success: false, error: error.message };
  }
};

// Delete a conversation
export const deleteConversation = async (conversationId) => {
  try {
    // First delete all messages in subcollection
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const messagesSnapshot = await getDocs(messagesRef);
    
    const deletePromises = messagesSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    // Then delete the conversation
    const conversationRef = doc(db, 'conversations', conversationId);
    await deleteDoc(conversationRef);
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return { success: false, error: error.message };
  }
};

// Real-time listener for conversations (for a user)
export const subscribeToUserConversations = (userId, userType, callback) => {
  try {
    const conversationsRef = collection(db, 'conversations');
    const field = userType === 'guest' ? 'guestId' : 'hostId';
    const q = query(
      conversationsRef,
      where(field, '==', userId)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const conversations = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        conversations.push({
          id: doc.id,
          ...data,
          lastMessageAt: data.lastMessageAt?.toDate ? data.lastMessageAt.toDate() : data.lastMessageAt,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt
        });
      });
      
      // Sort by lastMessageAt
      conversations.sort((a, b) => {
        const dateA = a.lastMessageAt || a.createdAt || new Date(0);
        const dateB = b.lastMessageAt || b.createdAt || new Date(0);
        const dateAObj = dateA instanceof Date ? dateA : (dateA?.toDate ? dateA.toDate() : new Date(dateA));
        const dateBObj = dateB instanceof Date ? dateB : (dateB?.toDate ? dateB.toDate() : new Date(dateB));
        return dateBObj - dateAObj;
      });
      
      callback({ success: true, data: conversations });
    }, (error) => {
      console.error('Error in conversations subscription:', error);
      callback({ success: false, error: error.message, data: [] });
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up conversations subscription:', error);
    callback({ success: false, error: error.message, data: [] });
    return () => {}; // Return empty unsubscribe function
  }
};

// Real-time listener for messages in a conversation
export const subscribeToMessages = (conversationId, callback) => {
  try {
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        messages.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt
        });
      });
      
      callback({ success: true, data: messages });
    }, (error) => {
      console.error('Error in messages subscription:', error);
      callback({ success: false, error: error.message, data: [] });
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up messages subscription:', error);
    callback({ success: false, error: error.message, data: [] });
    return () => {}; // Return empty unsubscribe function
  }
};

// Typing indicator management
export const setTypingStatus = async (conversationId, userId, isTyping) => {
  try {
    const conversationRef = doc(db, 'conversations', conversationId);
    const updateData = {};
    updateData[`typing.${userId}`] = isTyping ? serverTimestamp() : null;
    
    await updateDoc(conversationRef, updateData);
    return { success: true };
  } catch (error) {
    console.error('Error setting typing status:', error);
    return { success: false, error: error.message };
  }
};

// Real-time listener for typing status
export const subscribeToTypingStatus = (conversationId, currentUserId, callback) => {
  try {
    const conversationRef = doc(db, 'conversations', conversationId);
    
    const unsubscribe = onSnapshot(conversationRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const typing = data.typing || {};
        
        // Get all users who are typing (except current user)
        const typingUsers = Object.keys(typing).filter(userId => 
          userId !== currentUserId && typing[userId] !== null
        );
        
        // Check if typing status is recent (within last 3 seconds)
        const now = new Date();
        const recentTypingUsers = typingUsers.filter(userId => {
          const typingTime = typing[userId];
          if (!typingTime) return false;
          const time = typingTime.toDate ? typingTime.toDate() : new Date(typingTime);
          return (now - time) < 3000; // 3 seconds
        });
        
        callback({ success: true, isTyping: recentTypingUsers.length > 0, typingUsers: recentTypingUsers });
      } else {
        callback({ success: true, isTyping: false, typingUsers: [] });
      }
    }, (error) => {
      console.error('Error in typing status subscription:', error);
      callback({ success: false, isTyping: false, typingUsers: [] });
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up typing status subscription:', error);
    callback({ success: false, isTyping: false, typingUsers: [] });
    return () => {};
  }
};

// Legacy functions for backward compatibility (host messages)
export const getHostMessages = async (hostId) => {
  try {
    const result = await getUserConversations(hostId, 'host');
    return result;
  } catch (error) {
    console.error('Error getting host messages:', error);
    return { success: false, data: [], error: error.message };
  }
};

export const sendMessage = async (messageData) => {
  try {
    // Legacy support - try to find or create conversation
    const { guestId, hostId, listingId, senderId, senderName, message, listingTitle } = messageData;
    const senderType = senderId === hostId ? 'host' : 'guest';
    
    const convResult = await getOrCreateConversation(guestId, hostId, listingId, listingTitle);
    if (!convResult.success) {
      throw new Error('Failed to create conversation');
    }
    
    const result = await sendConversationMessage(
      convResult.data.id,
      senderId,
      senderName,
      senderType,
      message,
      listingId,
      listingTitle
    );
    
    return result;
  } catch (error) {
    console.error('Error sending message:', error);
    return { success: false, error: error.message };
  }
};

// Coupons management
export const createCoupon = async (couponData) => {
  try {
    const couponsRef = collection(db, 'coupons');
    const docRef = await addDoc(couponsRef, {
      ...couponData,
      createdAt: serverTimestamp(),
      usageCount: 0,
      active: true
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating coupon:', error);
    throw error;
  }
};

export const updateCoupon = async (couponId, updates) => {
  try {
    if (!couponId) {
      throw new Error('Coupon ID is required to update a coupon');
    }
    
    const couponRef = doc(db, 'coupons', couponId);
    await updateDoc(couponRef, updates);
    return { success: true };
  } catch (error) {
    console.error('Error updating coupon:', error);
    throw error;
  }
};

export const getHostCoupons = async (hostId) => {
  try {
    if (!hostId) {
      return { success: false, data: [], error: 'Host ID is required' };
    }

    const couponsRef = collection(db, 'coupons');
    
    // Try with orderBy first (requires index)
    try {
      const q = query(couponsRef, where('hostId', '==', hostId), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const coupons = [];
      querySnapshot.forEach((doc) => {
        coupons.push({ id: doc.id, ...doc.data() });
      });
      return { success: true, data: coupons };
    } catch (orderByError) {
      // If index error, fetch without orderBy and sort in memory
      if (orderByError.code === 'failed-precondition' && orderByError.message?.includes('index')) {
        console.warn('Firestore index not found for coupons. Fetching without orderBy...');
        
        const q = query(couponsRef, where('hostId', '==', hostId));
        const querySnapshot = await getDocs(q);
        const coupons = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          coupons.push({ 
            id: doc.id, 
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt || new Date(0)
          });
        });
        
        // Sort by createdAt descending in memory
        coupons.sort((a, b) => {
          const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
          const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
          return dateB - dateA;
        });
        
        return { success: true, data: coupons };
      }
      throw orderByError;
    }
  } catch (error) {
    console.error('❌ Error getting host coupons:', error);
    return { 
      success: false, 
      data: [], 
      error: error.message || 'Failed to fetch coupons',
      code: error.code 
    };
  }
};

// Validate and get promo code
export const validatePromoCode = async (code, listingId, hostId, subtotal) => {
  try {
    if (!code || !code.trim()) {
      return { success: false, error: 'Promo code is required' };
    }

    const couponsRef = collection(db, 'coupons');
    const codeUpper = code.trim().toUpperCase();
    
    // Query by code and hostId
    const q = query(
      couponsRef,
      where('code', '==', codeUpper),
      where('hostId', '==', hostId)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return { success: false, error: 'Invalid promo code' };
    }

    const couponDoc = querySnapshot.docs[0];
    const coupon = { id: couponDoc.id, ...couponDoc.data() };

    // Check if coupon is active
    if (!coupon.active) {
      return { success: false, error: 'This promo code is no longer active' };
    }

    // Check validity dates
    const now = new Date();
    if (coupon.validFrom) {
      const validFrom = coupon.validFrom.toDate ? coupon.validFrom.toDate() : new Date(coupon.validFrom);
      if (now < validFrom) {
        return { success: false, error: 'This promo code is not yet valid' };
      }
    }
    
    if (coupon.validUntil) {
      const validUntil = coupon.validUntil.toDate ? coupon.validUntil.toDate() : new Date(coupon.validUntil);
      if (now > validUntil) {
        return { success: false, error: 'This promo code has expired' };
      }
    }

    // Check minimum purchase
    if (coupon.minPurchase && subtotal < coupon.minPurchase) {
      return { 
        success: false, 
        error: `Minimum purchase of ₱${coupon.minPurchase.toLocaleString()} required` 
      };
    }

    // Check max uses
    if (coupon.maxUses && coupon.usageCount >= coupon.maxUses) {
      return { success: false, error: 'This promo code has reached its usage limit' };
    }

    // Check if coupon is for this listing (if listingId is specified)
    if (coupon.listingId && coupon.listingId !== listingId) {
      return { success: false, error: 'This promo code is not valid for this listing' };
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = (subtotal * coupon.discount) / 100;
    } else {
      discountAmount = coupon.discount;
    }

    return {
      success: true,
      coupon: coupon,
      discountAmount: discountAmount
    };
  } catch (error) {
    console.error('Error validating promo code:', error);
    return { success: false, error: 'Failed to validate promo code. Please try again.' };
  }
};

// Check if email exists in Firestore (users or hosts collections)
export const checkEmailExists = async (email) => {
  try {
    if (!email || !email.trim()) {
      return { success: false, exists: false, error: 'Email is required' };
    }

    const trimmedEmail = email.trim().toLowerCase();
    const usersRef = collection(db, 'users');
    const hostsRef = collection(db, 'hosts');

    // Check in users collection
    const usersQuery = query(usersRef, where('email', '==', trimmedEmail));
    const usersSnapshot = await getDocs(usersQuery);
    
    if (!usersSnapshot.empty) {
      console.log('✅ Email found in users collection');
      return { success: true, exists: true, collection: 'users' };
    }

    // Check in hosts collection
    const hostsQuery = query(hostsRef, where('email', '==', trimmedEmail));
    const hostsSnapshot = await getDocs(hostsQuery);
    
    if (!hostsSnapshot.empty) {
      console.log('✅ Email found in hosts collection');
      return { success: true, exists: true, collection: 'hosts' };
    }

    console.log('ℹ️ Email not found in Firestore');
    return { success: true, exists: false };
  } catch (error) {
    console.error('❌ Error checking email in Firestore:', error);
    // If it's an index error, we can't check - return exists: false to allow registration
    if (error.code === 'failed-precondition') {
      console.warn('⚠️ Firestore index missing for email query. Allowing registration to proceed.');
      return { success: true, exists: false, warning: 'Index missing' };
    }
    // For other errors, assume email doesn't exist to allow registration
    return { success: false, exists: false, error: error.message };
  }
};

// User Profile Management (for guests/non-hosts)
export const getGuestProfile = async (userId) => {
  try {
    if (!userId) {
      return { success: false, data: null, error: 'User ID is required' };
    }

    console.log('🔍 Fetching guest profile for user:', userId);
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const data = userSnap.data();
      console.log('✅ Guest profile found', {
        hasFirstName: !!data.firstName,
        hasLastName: !!data.lastName,
        hasProfilePicture: !!data.profilePicture,
        hasEmail: !!data.email,
        hasDisplayName: !!data.displayName,
        hasProvince: !!data.province,
        province: data.province || '(not set)',
        allFields: Object.keys(data)
      });
      return { success: true, data: data };
    } else {
      console.warn('⚠️ Guest profile does not exist for user:', userId);
      return { success: false, data: null, error: 'User profile not found' };
    }
  } catch (error) {
    console.error('❌ Error getting guest profile:', error);
    return { 
      success: false, 
      data: null, 
      error: error.message || 'Failed to fetch user profile',
      code: error.code 
    };
  }
};

export const createUserProfile = async (userId, userData) => {
  try {
    // Users can now have both guest and host profiles
    // Check if host profile exists and copy relevant data if needed
    const hostRef = doc(db, 'hosts', userId);
    const hostSnap = await getDoc(hostRef);
    
    let hostData = {};
    if (hostSnap.exists()) {
      const hostProfile = hostSnap.data();
      // Copy profile picture, name, email if not provided in userData
      hostData = {
        profilePicture: userData.profilePicture || hostProfile.profilePicture || '',
        firstName: userData.firstName || hostProfile.firstName || '',
        lastName: userData.lastName || hostProfile.lastName || '',
        email: userData.email || hostProfile.email || '',
      };
    }

    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      ...userData,
      ...hostData, // Merge host profile data
      role: 'guest', // Explicitly set role to 'guest'
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      favorites: userData.favorites || []
    });
    
    // Update host profile with guest data if host profile exists
    if (hostSnap.exists()) {
      await updateDoc(hostRef, {
        ...hostData,
        updatedAt: serverTimestamp()
      });
    }
    
    console.log('✅ Guest profile created successfully');
    return { success: true, id: userId };
  } catch (error) {
    console.error('❌ Error creating user profile:', error);
    throw error;
  }
};

export const updateUserProfile = async (userId, updates) => {
  try {
    if (!userId) {
      throw new Error('User ID is required to update user profile');
    }

    console.log('Updating user profile for user:', userId);
    const userRef = doc(db, 'users', userId);
    
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp()
    };
    
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });
    
    await updateDoc(userRef, updateData);
    console.log('✅ User profile updated successfully');
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error updating user profile:', error);
    return {
      success: false,
      error: error.message || 'Failed to update user profile',
      code: error.code
    };
  }
};

// Favorites Management
export const getUserFavorites = async (userId) => {
  try {
    if (!userId) {
      return { success: false, data: [], error: 'User ID is required' };
    }

    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      const favorites = userData.favorites || [];
      return { success: true, data: favorites };
    } else {
      // Profile should have been created during registration/sign-in
      // But as a fallback, create minimal profile
      // The App.jsx useEffect will populate it with full data if needed
      console.warn('⚠️ User profile not found when getting favorites, creating minimal profile');
      await createUserProfile(userId, {
        email: '', // Will be updated when user data is available
        favorites: []
      });
      return { success: true, data: [] };
    }
  } catch (error) {
    console.error('❌ Error getting user favorites:', error);
    return {
      success: false,
      data: [],
      error: error.message || 'Failed to fetch favorites',
      code: error.code
    };
  }
};

export const addToFavorites = async (userId, listingId) => {
  try {
    if (!userId || !listingId) {
      return { success: false, error: 'User ID and Listing ID are required' };
    }

    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    let favorites = [];
    if (userSnap.exists()) {
      favorites = userSnap.data().favorites || [];
    } else {
      // Profile should have been created during registration/sign-in
      // But as a fallback, create minimal profile
      // The App.jsx useEffect will populate it with full data if needed
      console.warn('⚠️ User profile not found when adding to favorites, creating minimal profile');
      await createUserProfile(userId, {
        email: '', // Will be updated when user data is available
        favorites: []
      });
    }
    
    if (!favorites.includes(listingId)) {
      favorites.push(listingId);
      await updateDoc(userRef, {
        favorites: favorites,
        updatedAt: serverTimestamp()
      });
      console.log('✅ Added to favorites');
      return { success: true };
    } else {
      return { success: true, message: 'Already in favorites' };
    }
  } catch (error) {
    console.error('❌ Error adding to favorites:', error);
    return {
      success: false,
      error: error.message || 'Failed to add to favorites'
    };
  }
};

export const removeFromFavorites = async (userId, listingId) => {
  try {
    if (!userId || !listingId) {
      return { success: false, error: 'User ID and Listing ID are required' };
    }

    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return { success: false, error: 'User profile not found' };
    }
    
    let favorites = userSnap.data().favorites || [];
    favorites = favorites.filter(id => id !== listingId);
    
    await updateDoc(userRef, {
      favorites: favorites,
      updatedAt: serverTimestamp()
    });
    console.log('✅ Removed from favorites');
    return { success: true };
  } catch (error) {
    console.error('❌ Error removing from favorites:', error);
    return {
      success: false,
      error: error.message || 'Failed to remove from favorites'
    };
  }
};

export const toggleFavorite = async (userId, listingId) => {
  try {
    const favoritesResult = await getUserFavorites(userId);
    if (!favoritesResult.success) {
      return { success: false, error: 'Failed to fetch favorites' };
    }
    
    const favorites = favoritesResult.data || [];
    const isFavorite = favorites.includes(listingId);
    
    if (isFavorite) {
      return await removeFromFavorites(userId, listingId);
    } else {
      return await addToFavorites(userId, listingId);
    }
  } catch (error) {
    console.error('❌ Error toggling favorite:', error);
    return {
      success: false,
      error: error.message || 'Failed to toggle favorite'
    };
  }
};

// Vouchers & Discounts System
// Generate a unique voucher code
const generateVoucherCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Check if voucher code is unique
const isVoucherCodeUnique = async (code) => {
  try {
    const vouchersRef = collection(db, 'vouchers');
    const q = query(vouchersRef, where('code', '==', code));
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty;
  } catch (error) {
    console.error('Error checking voucher code uniqueness:', error);
    return false;
  }
};

// Create a new voucher (Host only)
export const createVoucher = async (hostId, voucherData) => {
  try {
    if (!hostId) {
      throw new Error('Host ID is required');
    }

    // Validate discount percentage (max 50%)
    const discountPercentage = parseFloat(voucherData.discountPercentage || 0);
    if (discountPercentage <= 0 || discountPercentage > 50) {
      throw new Error('Discount percentage must be between 1% and 50%');
    }

    // Generate unique voucher code
    let code;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      code = generateVoucherCode();
      isUnique = await isVoucherCodeUnique(code);
      attempts++;
    }

    if (!isUnique) {
      throw new Error('Failed to generate unique voucher code. Please try again.');
    }

    // Create voucher document
    const vouchersRef = collection(db, 'vouchers');
    const voucherDoc = {
      code,
      hostId,
      discountPercentage,
      isClaimed: false,
      isUsed: false,
      claimedBy: null,
      claimedAt: null,
      usedAt: null,
      expirationDate: voucherData.expirationDate ? Timestamp.fromDate(new Date(voucherData.expirationDate)) : null,
      listingId: voucherData.listingId || null, // Optional: restrict to specific listing
      usageLimit: voucherData.usageLimit || 1, // Number of times voucher can be used
      usageCount: 0, // Track how many times it's been used
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const voucherRef = await addDoc(vouchersRef, voucherDoc);
    console.log('✅ Voucher created successfully:', code);
    return { success: true, id: voucherRef.id, code, ...voucherDoc };
  } catch (error) {
    console.error('Error creating voucher:', error);
    throw error;
  }
};

// Get all vouchers (filtered by host or guest)
export const getVouchers = async (userId, userRole = 'guest') => {
  try {
    const vouchersRef = collection(db, 'vouchers');
    let querySnapshot;
    let vouchers = [];

    if (userRole === 'host') {
      // Host sees all vouchers they created
      try {
        // Try with orderBy first (requires composite index)
        const q = query(
          vouchersRef,
          where('hostId', '==', userId),
          orderBy('createdAt', 'desc')
        );
        querySnapshot = await getDocs(q);
      } catch (indexError) {
        // Check if it's an index error (failed-precondition) or other error
        if (indexError.code === 'failed-precondition' || indexError.message?.includes('index')) {
          // If index error, fall back to query without orderBy and sort client-side
          console.warn('⚠️ Composite index not found. Fetching without orderBy and sorting client-side. You can create the index at: https://console.firebase.google.com/v1/r/project/zennest-app/firestore/indexes?create_composite=Ckxwcm9qZWN0cy96ZW5uZXN0LWFwcC9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvdm91Y2hlcnMvaW5kZXhlcy9fEAEaCgoGaG9zdElkEAEaDQoJY3JlYXRlZEF0EAIaDAoIX19uYW1lX18QAg');
          const q = query(
            vouchersRef,
            where('hostId', '==', userId)
          );
          querySnapshot = await getDocs(q);
        } else {
          // If it's a different error, throw it
          throw indexError;
        }
      }

      vouchers = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt,
        expirationDate: doc.data().expirationDate?.toDate ? doc.data().expirationDate.toDate() : doc.data().expirationDate,
        claimedAt: doc.data().claimedAt?.toDate ? doc.data().claimedAt.toDate() : doc.data().claimedAt,
        usedAt: doc.data().usedAt?.toDate ? doc.data().usedAt.toDate() : doc.data().usedAt
      }));

      // Sort by createdAt descending (client-side if index was missing)
      vouchers.sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt || 0).getTime();
        const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });

      return { success: true, data: vouchers };
    } else {
      // Guest sees available vouchers (not claimed) or their claimed vouchers
      try {
        // Try with orderBy first
        const q = query(
          vouchersRef,
          orderBy('createdAt', 'desc')
        );
        querySnapshot = await getDocs(q);
      } catch (indexError) {
        // If index error, fall back to query without orderBy and sort client-side
        console.warn('⚠️ Index not found. Fetching all vouchers and sorting client-side:', indexError);
        querySnapshot = await getDocs(vouchersRef);
      }

      vouchers = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt,
        expirationDate: doc.data().expirationDate?.toDate ? doc.data().expirationDate.toDate() : doc.data().expirationDate,
        claimedAt: doc.data().claimedAt?.toDate ? doc.data().claimedAt.toDate() : doc.data().claimedAt,
        usedAt: doc.data().usedAt?.toDate ? doc.data().usedAt.toDate() : doc.data().usedAt
      }));

      // Sort by createdAt descending (client-side if index was missing)
      vouchers.sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt || 0).getTime();
        const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });

      // Filter for guests: show available vouchers or vouchers claimed by this guest
      const filteredVouchers = vouchers.filter(voucher => 
        (!voucher.isClaimed && !voucher.isUsed && (voucher.usageCount < (voucher.usageLimit || 1))) ||
        (voucher.claimedBy === userId)
      );

      return {
        success: true,
        data: filteredVouchers
      };
    }
  } catch (error) {
    console.error('Error fetching vouchers:', error);
    // Final fallback: fetch all vouchers and filter/sort client-side
    try {
      const vouchersRef = collection(db, 'vouchers');
      const allVouchers = await getDocs(vouchersRef);
      const vouchers = allVouchers.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          expirationDate: data.expirationDate?.toDate ? data.expirationDate.toDate() : data.expirationDate,
          claimedAt: data.claimedAt?.toDate ? data.claimedAt.toDate() : data.claimedAt,
          usedAt: data.usedAt?.toDate ? data.usedAt.toDate() : data.usedAt
        };
      });

      // Sort by createdAt descending
      vouchers.sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt || 0).getTime();
        const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });

      if (userRole === 'host') {
        // Filter by hostId
        const hostVouchers = vouchers.filter(voucher => voucher.hostId === userId);
        return { success: true, data: hostVouchers };
      } else {
        // Filter for guests
        const filteredVouchers = vouchers.filter(voucher => 
          (!voucher.isClaimed && !voucher.isUsed && (voucher.usageCount < (voucher.usageLimit || 1))) ||
          (voucher.claimedBy === userId)
        );
        return { success: true, data: filteredVouchers };
      }
    } catch (fallbackError) {
      console.error('Error in fallback voucher fetch:', fallbackError);
      return { success: false, error: fallbackError.message, data: [] };
    }
  }
};

// Get available vouchers for guests (not claimed, not expired, not used)
export const getAvailableVouchers = async () => {
  try {
    const vouchersRef = collection(db, 'vouchers');
    let querySnapshot;
    
    try {
      // Try with orderBy first (requires composite index)
      const q = query(
        vouchersRef,
        where('isClaimed', '==', false),
        where('isUsed', '==', false),
        orderBy('createdAt', 'desc')
      );
      querySnapshot = await getDocs(q);
    } catch (indexError) {
      // Check if it's an index error (failed-precondition) or other error
      if (indexError.code === 'failed-precondition' || indexError.message?.includes('index')) {
        // If index error, fall back to query without orderBy and sort client-side
        console.warn('⚠️ Composite index not found for available vouchers. Fetching without orderBy and sorting client-side.');
        try {
          const q = query(
            vouchersRef,
            where('isClaimed', '==', false),
            where('isUsed', '==', false)
          );
          querySnapshot = await getDocs(q);
        } catch (fallbackError) {
          // If even the fallback fails, get all vouchers
          console.warn('⚠️ Fallback query failed. Fetching all vouchers and filtering client-side.');
          querySnapshot = await getDocs(vouchersRef);
        }
      } else {
        // If it's a different error, throw it
        throw indexError;
      }
    }

    const now = new Date();
    let vouchers = querySnapshot.docs
      .map(doc => {
        const data = doc.data();
        const expirationDate = data.expirationDate?.toDate ? data.expirationDate.toDate() : data.expirationDate;
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          expirationDate,
          claimedAt: data.claimedAt?.toDate ? data.claimedAt.toDate() : data.claimedAt,
          usedAt: data.usedAt?.toDate ? data.usedAt.toDate() : data.usedAt
        };
      })
      .filter(voucher => {
        // Filter out expired vouchers
        if (voucher.expirationDate && voucher.expirationDate < now) {
          return false;
        }
        // Filter out vouchers that have reached usage limit
        if (voucher.usageCount >= (voucher.usageLimit || 1)) {
          return false;
        }
        // Additional client-side filtering if query didn't include all filters
        if (voucher.isClaimed || voucher.isUsed) {
          return false;
        }
        return true;
      });

    // Sort by createdAt descending (client-side if index was missing)
    vouchers.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt || 0).getTime();
      const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    return { success: true, data: vouchers };
  } catch (error) {
    console.error('Error fetching available vouchers:', error);
    // Final fallback: get all vouchers and filter/sort client-side
    try {
      const vouchersRef = collection(db, 'vouchers');
      const allVouchers = await getDocs(vouchersRef);
      const now = new Date();
      const vouchers = allVouchers.docs
        .map(doc => {
          const data = doc.data();
          const expirationDate = data.expirationDate?.toDate ? data.expirationDate.toDate() : data.expirationDate;
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
            expirationDate,
            claimedAt: data.claimedAt?.toDate ? data.claimedAt.toDate() : data.claimedAt,
            usedAt: data.usedAt?.toDate ? data.usedAt.toDate() : data.usedAt
          };
        })
        .filter(voucher => {
          if (voucher.isClaimed || voucher.isUsed) return false;
          if (voucher.expirationDate && voucher.expirationDate < now) return false;
          if (voucher.usageCount >= (voucher.usageLimit || 1)) return false;
          return true;
        });

      // Sort by createdAt descending
      vouchers.sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt || 0).getTime();
        const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });

      return { success: true, data: vouchers };
    } catch (fallbackError) {
      console.error('Error in fallback voucher fetch:', fallbackError);
      return { success: false, error: fallbackError.message, data: [] };
    }
  }
};

// Get claimed vouchers for a guest
export const getClaimedVouchers = async (guestId) => {
  try {
    const vouchersRef = collection(db, 'vouchers');
    let querySnapshot;
    
    try {
      // Try with orderBy first (requires composite index)
      const q = query(
        vouchersRef,
        where('claimedBy', '==', guestId),
        orderBy('claimedAt', 'desc')
      );
      querySnapshot = await getDocs(q);
    } catch (indexError) {
      // Check if it's an index error (failed-precondition) or other error
      if (indexError.code === 'failed-precondition' || indexError.message?.includes('index')) {
        // If index error, fall back to query without orderBy and sort client-side
        console.warn('⚠️ Composite index not found for claimed vouchers. Fetching without orderBy and sorting client-side.');
        const q = query(
          vouchersRef,
          where('claimedBy', '==', guestId)
        );
        querySnapshot = await getDocs(q);
      } else {
        // If it's a different error, throw it
        throw indexError;
      }
    }

    const now = new Date();
    const vouchers = querySnapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          expirationDate: data.expirationDate?.toDate ? data.expirationDate.toDate() : data.expirationDate,
          claimedAt: data.claimedAt?.toDate ? data.claimedAt.toDate() : data.claimedAt,
          usedAt: data.usedAt?.toDate ? data.usedAt.toDate() : data.usedAt
        };
      })
      .filter(voucher => {
        // Filter out expired vouchers
        if (voucher.expirationDate && voucher.expirationDate < now) {
          return false;
        }
        return true;
      });

    // Sort by claimedAt descending (client-side if index was missing)
    vouchers.sort((a, b) => {
      const dateA = a.claimedAt instanceof Date ? a.claimedAt.getTime() : new Date(a.claimedAt || 0).getTime();
      const dateB = b.claimedAt instanceof Date ? b.claimedAt.getTime() : new Date(b.claimedAt || 0).getTime();
      return dateB - dateA;
    });

    return { success: true, data: vouchers };
  } catch (error) {
    console.error('Error fetching claimed vouchers:', error);
    // Fallback: get all vouchers and filter client-side
    try {
      const vouchersRef = collection(db, 'vouchers');
      const allVouchers = await getDocs(vouchersRef);
      const now = new Date();
      const vouchers = allVouchers.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
            expirationDate: data.expirationDate?.toDate ? data.expirationDate.toDate() : data.expirationDate,
            claimedAt: data.claimedAt?.toDate ? data.claimedAt.toDate() : data.claimedAt,
            usedAt: data.usedAt?.toDate ? data.usedAt.toDate() : data.usedAt
          };
        })
        .filter(voucher => voucher.claimedBy === guestId)
        .filter(voucher => {
          // Filter out expired vouchers
          if (voucher.expirationDate && voucher.expirationDate < now) {
            return false;
          }
          return true;
        });

      // Sort by claimedAt descending
      vouchers.sort((a, b) => {
        const dateA = a.claimedAt instanceof Date ? a.claimedAt.getTime() : new Date(a.claimedAt || 0).getTime();
        const dateB = b.claimedAt instanceof Date ? b.claimedAt.getTime() : new Date(b.claimedAt || 0).getTime();
        return dateB - dateA;
      });

      return { success: true, data: vouchers };
    } catch (fallbackError) {
      console.error('Error in fallback claimed vouchers fetch:', fallbackError);
      return { success: false, error: fallbackError.message, data: [] };
    }
  }
};

// Claim a voucher (Guest)
export const claimVoucher = async (voucherId, guestId) => {
  try {
    if (!voucherId || !guestId) {
      throw new Error('Voucher ID and Guest ID are required');
    }

    const voucherRef = doc(db, 'vouchers', voucherId);
    const voucherSnap = await getDoc(voucherRef);

    if (!voucherSnap.exists()) {
      throw new Error('Voucher not found');
    }

    const voucherData = voucherSnap.data();

    // Check if voucher is already claimed
    if (voucherData.isClaimed) {
      throw new Error('Voucher is already claimed');
    }

    // Check if voucher is already used
    if (voucherData.isUsed) {
      throw new Error('Voucher has already been used');
    }

    // Check if voucher has reached usage limit
    if (voucherData.usageCount >= (voucherData.usageLimit || 1)) {
      throw new Error('Voucher has reached its usage limit');
    }

    // Check expiration
    if (voucherData.expirationDate) {
      const expirationDate = voucherData.expirationDate?.toDate ? voucherData.expirationDate.toDate() : new Date(voucherData.expirationDate);
      if (expirationDate < new Date()) {
        throw new Error('Voucher has expired');
      }
    }

    // Check if guest has already claimed this voucher
    if (voucherData.claimedBy === guestId) {
      throw new Error('You have already claimed this voucher');
    }

    // Claim the voucher
    await updateDoc(voucherRef, {
      isClaimed: true,
      claimedBy: guestId,
      claimedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    console.log('✅ Voucher claimed successfully:', voucherData.code);
    return { success: true, voucher: { id: voucherSnap.id, ...voucherData } };
  } catch (error) {
    console.error('Error claiming voucher:', error);
    throw error;
  }
};

// Apply a voucher to a booking (validate and calculate discount)
export const applyVoucher = async (voucherId, guestId, bookingAmount) => {
  try {
    if (!voucherId || !guestId) {
      throw new Error('Voucher ID and Guest ID are required');
    }

    const voucherRef = doc(db, 'vouchers', voucherId);
    const voucherSnap = await getDoc(voucherRef);

    if (!voucherSnap.exists()) {
      throw new Error('Voucher not found');
    }

    const voucherData = voucherSnap.data();

    // Verify voucher belongs to the guest
    if (voucherData.claimedBy !== guestId) {
      throw new Error('Voucher not claimed by this guest');
    }

    // Check if voucher is already used
    if (voucherData.isUsed) {
      throw new Error('Voucher has already been used');
    }

    // Check if voucher has reached usage limit
    if (voucherData.usageCount >= (voucherData.usageLimit || 1)) {
      throw new Error('Voucher has reached its usage limit');
    }

    // Check expiration
    if (voucherData.expirationDate) {
      const expirationDate = voucherData.expirationDate?.toDate ? voucherData.expirationDate.toDate() : new Date(voucherData.expirationDate);
      if (expirationDate < new Date()) {
        throw new Error('Voucher has expired');
      }
    }

    // Calculate discount
    const discountPercentage = parseFloat(voucherData.discountPercentage || 0);
    const discountAmount = (bookingAmount * discountPercentage) / 100;
    const finalAmount = bookingAmount - discountAmount;

    return {
      success: true,
      voucher: { id: voucherSnap.id, ...voucherData },
      discountPercentage,
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      finalAmount: parseFloat(finalAmount.toFixed(2))
    };
  } catch (error) {
    console.error('Error applying voucher:', error);
    throw error;
  }
};

// Mark voucher as used after successful booking
export const markVoucherUsed = async (voucherId, bookingId) => {
  try {
    if (!voucherId) {
      throw new Error('Voucher ID is required');
    }

    const voucherRef = doc(db, 'vouchers', voucherId);
    const voucherSnap = await getDoc(voucherRef);

    if (!voucherSnap.exists()) {
      throw new Error('Voucher not found');
    }

    const voucherData = voucherSnap.data();
    const newUsageCount = (voucherData.usageCount || 0) + 1;
    const usageLimit = voucherData.usageLimit || 1;

    // Update voucher
    await updateDoc(voucherRef, {
      isUsed: newUsageCount >= usageLimit,
      usageCount: newUsageCount,
      usedAt: serverTimestamp(),
      bookingId: bookingId || null,
      updatedAt: serverTimestamp()
    });

    console.log('✅ Voucher marked as used:', voucherData.code);
    return { success: true };
  } catch (error) {
    console.error('Error marking voucher as used:', error);
    throw error;
  }
};

// Delete a voucher (Host only)
export const deleteVoucher = async (voucherId, hostId) => {
  try {
    if (!voucherId || !hostId) {
      throw new Error('Voucher ID and Host ID are required');
    }

    const voucherRef = doc(db, 'vouchers', voucherId);
    const voucherSnap = await getDoc(voucherRef);

    if (!voucherSnap.exists()) {
      throw new Error('Voucher not found');
    }

    const voucherData = voucherSnap.data();

    // Verify voucher belongs to the host
    if (voucherData.hostId !== hostId) {
      throw new Error('Unauthorized: This voucher does not belong to you');
    }

    // Don't allow deletion if voucher is already used
    if (voucherData.isUsed) {
      throw new Error('Cannot delete a voucher that has been used');
    }

    // Delete voucher
    await deleteDoc(voucherRef);

    console.log('✅ Voucher deleted successfully:', voucherData.code);
    return { success: true };
  } catch (error) {
    console.error('Error deleting voucher:', error);
    throw error;
  }
};

// Points & Rewards (Legacy - keeping for backward compatibility)
export const updateHostPoints = async (userId, points, reason) => {
  try {
    const hostRef = doc(db, 'hosts', userId);
    const hostSnap = await getDoc(hostRef);
    const currentPoints = hostSnap.data()?.points || 0;
    const newPoints = currentPoints + points;
    
    await updateDoc(hostRef, {
      points: newPoints,
      updatedAt: serverTimestamp()
    });

    // Log points transaction
    const pointsRef = collection(db, 'pointsTransactions');
    await addDoc(pointsRef, {
      hostId: userId,
      points,
      reason,
      balance: newPoints,
      createdAt: serverTimestamp()
    });

    return { success: true, newPoints };
  } catch (error) {
    console.error('Error updating host points:', error);
    throw error;
  }
};

// Payment methods
export const updatePaymentMethods = async (userId, paymentMethods) => {
  try {
    const hostRef = doc(db, 'hosts', userId);
    await updateDoc(hostRef, {
      paymentMethods,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating payment methods:', error);
    throw error;
  }
};

// Transfer payment to host
export const transferPaymentToHost = async (hostId, amount, bookingId, listingTitle) => {
  try {
    if (!hostId || !amount || amount <= 0) {
      throw new Error('Invalid host ID or amount');
    }

    // Get host profile to check payment methods
    const hostResult = await getHostProfile(hostId);
    if (!hostResult.success || !hostResult.data) {
      throw new Error('Host profile not found');
    }

    const hostData = hostResult.data;
    const paymentMethods = hostData.paymentMethods || [];

    // Find default payment method
    const defaultMethod = paymentMethods.find(method => method.isDefault) || paymentMethods[0];

    if (!defaultMethod) {
      console.warn('⚠️ No payment method configured for host. Funds will be added to host wallet.');
      // Add to wallet if no payment method
      return await transferToHostWallet(hostId, amount, bookingId, listingTitle);
    }

    // Transfer based on payment method type
    if (defaultMethod.type === 'wallet') {
      // Transfer to host wallet
      return await transferToHostWallet(hostId, amount, bookingId, listingTitle);
    } else if (defaultMethod.type === 'paypal') {
      // For PayPal, we'll add to wallet and mark for manual transfer
      // In production, you would integrate with PayPal API here
      console.log('💰 PayPal transfer initiated (simulated):', {
        hostId,
        amount,
        paypalEmail: defaultMethod.paypalEmail
      });
      // Still add to wallet for tracking
      const walletResult = await transferToHostWallet(hostId, amount, bookingId, listingTitle);
      // Create a pending transfer record
      await createPendingTransfer(hostId, amount, 'paypal', defaultMethod.paypalEmail, bookingId);
      return walletResult;
    } else if (defaultMethod.type === 'bank') {
      // For bank transfer, we'll add to wallet and mark for manual transfer
      console.log('💰 Bank transfer initiated (simulated):', {
        hostId,
        amount,
        bankAccount: defaultMethod.accountNumber
      });
      // Still add to wallet for tracking
      const walletResult = await transferToHostWallet(hostId, amount, bookingId, listingTitle);
      // Create a pending transfer record
      await createPendingTransfer(hostId, amount, 'bank', defaultMethod.accountNumber, bookingId);
      return walletResult;
    } else {
      // Default to wallet
      return await transferToHostWallet(hostId, amount, bookingId, listingTitle);
    }
  } catch (error) {
    console.error('❌ Error transferring payment to host:', error);
    throw error;
  }
};

// Transfer to host wallet
const transferToHostWallet = async (hostId, amount, bookingId, listingTitle) => {
  try {
    // Get or create host wallet
    const walletRef = doc(db, 'wallets', hostId);
    const walletSnap = await getDoc(walletRef);

    let currentBalance = 0;
    if (walletSnap.exists()) {
      currentBalance = walletSnap.data().balance || 0;
    } else {
      // Create wallet if it doesn't exist
      await setDoc(walletRef, {
        userId: hostId,
        balance: 0,
        currency: 'PHP',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }

    const newBalance = currentBalance + amount;

    // Update wallet balance
    await updateDoc(walletRef, {
      balance: newBalance,
      updatedAt: serverTimestamp()
    });

    // Create transaction record
    const transactionsRef = collection(db, 'transactions');
    await addDoc(transactionsRef, {
      userId: hostId,
      type: 'payment_received',
      amount: amount,
      status: 'completed',
      description: `Payment received for booking: ${listingTitle}`,
      paymentMethod: 'wallet',
      bookingId: bookingId,
      createdAt: serverTimestamp()
    });

    // Update host total earnings
    const hostRef = doc(db, 'hosts', hostId);
    const hostSnap = await getDoc(hostRef);
    if (hostSnap.exists()) {
      const currentEarnings = hostSnap.data().totalEarnings || 0;
      await updateDoc(hostRef, {
        totalEarnings: currentEarnings + amount,
        updatedAt: serverTimestamp()
      });
    }

    console.log('✅ Payment transferred to host wallet:', {
      hostId,
      amount,
      newBalance
    });

    return { success: true, newBalance, method: 'wallet' };
  } catch (error) {
    console.error('❌ Error transferring to host wallet:', error);
    throw error;
  }
};

// Create pending transfer record (for PayPal/bank transfers)
const createPendingTransfer = async (hostId, amount, method, accountDetails, bookingId) => {
  try {
    const transfersRef = collection(db, 'pendingTransfers');
    await addDoc(transfersRef, {
      hostId: hostId,
      amount: amount,
      method: method,
      accountDetails: accountDetails,
      bookingId: bookingId,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    console.log('✅ Pending transfer record created:', { hostId, amount, method });
  } catch (error) {
    console.error('❌ Error creating pending transfer:', error);
    // Don't throw - this is non-critical
  }
};

// Subscription management
export const updateSubscriptionStatus = async (userId, status, paymentId = null, subscriptionPlan = null, startDate = null, endDate = null) => {
  try {
    const hostRef = doc(db, 'hosts', userId);
    const updateData = {
      subscriptionStatus: status,
      updatedAt: serverTimestamp()
    };
    
    if (paymentId) {
      updateData.subscriptionPaymentId = paymentId;
    }
    
    if (subscriptionPlan) {
      updateData.subscriptionPlan = subscriptionPlan;
    }
    
    if (status === 'active') {
      updateData.subscriptionStartDate = startDate ? Timestamp.fromDate(startDate) : serverTimestamp();
      if (endDate) {
        updateData.subscriptionEndDate = Timestamp.fromDate(endDate);
      }
    }

    await updateDoc(hostRef, updateData);
    return { success: true };
  } catch (error) {
    console.error('Error updating subscription status:', error);
    throw error;
  }
};

// Get subscription listing limit
export const getSubscriptionListingLimit = (subscriptionPlan) => {
  const limits = {
    basic: 5,      // Updated to match new plan: 5 listings
    pro: 20,       // Updated to match new plan: 20 listings
    premium: -1    // -1 means unlimited
  };
  return limits[subscriptionPlan] || 0;
};

// Check if host can create more listings
export const canCreateListing = async (hostId) => {
  try {
    // Get host profile
    const hostResult = await getHostProfile(hostId);
    if (!hostResult.success || !hostResult.data) {
      return { success: false, canCreate: false, error: 'Host profile not found' };
    }

    const hostData = hostResult.data;
    
    // Check if subscription is active
    if (hostData.subscriptionStatus !== 'active') {
      return { 
        success: true, 
        canCreate: false, 
        error: 'Subscription is not active. Please renew your subscription to create listings.',
        reason: 'inactive_subscription'
      };
    }

    // Check subscription end date
    if (hostData.subscriptionEndDate) {
      const endDate = hostData.subscriptionEndDate.toDate ? hostData.subscriptionEndDate.toDate() : new Date(hostData.subscriptionEndDate);
      const now = new Date();
      if (now > endDate) {
        return { 
          success: true, 
          canCreate: false, 
          error: 'Subscription has expired. Please renew your subscription to create listings.',
          reason: 'expired_subscription'
        };
      }
    }

    // Get subscription plan
    const subscriptionPlan = hostData.subscriptionPlan || 'basic';
    const listingLimit = getSubscriptionListingLimit(subscriptionPlan);

    // If unlimited, allow creation
    if (listingLimit === -1) {
      return { success: true, canCreate: true, remaining: -1 };
    }

    // Get current listing count
    const listingsResult = await getHostListings(hostId);
    const currentListings = listingsResult.success ? listingsResult.data.length : 0;

    // Check if limit reached
    if (currentListings >= listingLimit) {
      return { 
        success: true, 
        canCreate: false, 
        error: `You have reached your listing limit of ${listingLimit}. Please upgrade your subscription to create more listings.`,
        reason: 'limit_reached',
        current: currentListings,
        limit: listingLimit
      };
    }

    return { 
      success: true, 
      canCreate: true, 
      remaining: listingLimit - currentListings,
      current: currentListings,
      limit: listingLimit
    };
  } catch (error) {
    console.error('Error checking listing limit:', error);
    return { success: false, canCreate: false, error: error.message };
  }
};

// Cancel subscription
export const cancelSubscription = async (userId) => {
  try {
    const hostRef = doc(db, 'hosts', userId);
    const hostSnap = await getDoc(hostRef);
    
    if (!hostSnap.exists()) {
      throw new Error('Host profile not found');
    }

    await updateDoc(hostRef, {
      subscriptionStatus: 'cancelled',
      subscriptionCancelledAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    console.log('✅ Subscription cancelled for user:', userId);
    return { success: true };
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    throw error;
  }
};

// Delete host account
export const deleteHostAccount = async (userId) => {
  try {
    // Get all host listings
    const listingsResult = await getHostListings(userId);
    const listings = listingsResult.success ? listingsResult.data : [];

    // SAFETY: Use soft archive instead of hard delete when deleting host account
    // This preserves data and allows recovery if needed
    // Only use hard delete (forceDelete=true) if absolutely necessary (e.g., GDPR compliance)
    const archiveListingPromises = listings.map(listing => softArchiveListing(listing.id, 'archived-by-host-account-deletion'));
    await Promise.all(archiveListingPromises);

    // Delete host profile
    const hostRef = doc(db, 'hosts', userId);
    await deleteDoc(hostRef);

    // Delete user profile if exists
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      await deleteDoc(userRef);
    }

    console.log('✅ Host account deleted for user:', userId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting host account:', error);
    throw error;
  }
};

// Increment listing views
export const incrementListingViews = async (listingId, userId = null) => {
  try {
    const listingRef = doc(db, 'listings', listingId);
    const listingSnap = await getDoc(listingRef);
    
    if (!listingSnap.exists()) {
      throw new Error('Listing not found');
    }

    const currentViews = listingSnap.data().views || 0;

    // Update views count
    await updateDoc(listingRef, {
      views: currentViews + 1,
      lastViewedAt: serverTimestamp()
    });

    // Optionally track view history (for analytics)
    if (userId) {
      const viewsRef = collection(db, 'listingViews');
      await addDoc(viewsRef, {
        listingId: listingId,
        userId: userId,
        viewedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error incrementing listing views:', error);
  }
};

// User Preferences Management (for role switching)
export const getUserPreferences = async (userId) => {
  try {
    if (!userId) {
      return { success: false, data: null, error: 'User ID is required' };
    }

    const preferencesRef = doc(db, 'userPreferences', userId);
    const preferencesSnap = await getDoc(preferencesRef);
    
    if (preferencesSnap.exists()) {
      return { success: true, data: preferencesSnap.data() };
    } else {
      // Return default preferences
      return { 
        success: true, 
        data: { 
          activeRole: null, // Will be determined by available roles
          updatedAt: null
        } 
      };
    }
  } catch (error) {
    console.error('Error getting user preferences:', error);
    return { 
      success: false, 
      data: null, 
      error: error.message || 'Failed to fetch user preferences' 
    };
  }
};

export const setUserPreferences = async (userId, preferences) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const preferencesRef = doc(db, 'userPreferences', userId);
    await setDoc(preferencesRef, {
      ...preferences,
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    return { success: true };
  } catch (error) {
    console.error('Error setting user preferences:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to update user preferences' 
    };
  }
};

export const setActiveRole = async (userId, role) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    if (role !== 'host' && role !== 'guest') {
      throw new Error('Invalid role. Must be "host" or "guest"');
    }

    // Check if user has the requested role
    if (role === 'host') {
      const hostResult = await getHostProfile(userId);
      if (!hostResult.success || !hostResult.data) {
        throw new Error('User does not have a host profile');
      }
    } else {
      const guestResult = await getGuestProfile(userId);
      if (!guestResult.success || !guestResult.data) {
        throw new Error('User does not have a guest profile');
      }
    }

    // Update preferences
    const result = await setUserPreferences(userId, { activeRole: role });
    
    // Also store in localStorage for immediate access
    if (typeof window !== 'undefined') {
      localStorage.setItem(`activeRole_${userId}`, role);
    }
    
    return result;
  } catch (error) {
    console.error('Error setting active role:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to set active role' 
    };
  }
};

export const getUserRoles = async (userId) => {
  try {
    if (!userId) {
      return { success: false, hasHost: false, hasGuest: false, error: 'User ID is required' };
    }

    // Check both roles
    const hostResult = await getHostProfile(userId);
    const guestResult = await getGuestProfile(userId);
    
    return {
      success: true,
      hasHost: hostResult.success && hostResult.data !== null,
      hasGuest: guestResult.success && guestResult.data !== null,
      hostProfile: hostResult.data,
      guestProfile: guestResult.data
    };
  } catch (error) {
    console.error('Error getting user roles:', error);
    return { 
      success: false, 
      hasHost: false, 
      hasGuest: false, 
      error: error.message || 'Failed to check user roles' 
    };
  }
};

// Get single listing by ID (for guest viewing)
export const getListingById = async (listingId) => {
  try {
    const listingRef = doc(db, 'listings', listingId);
    const listingSnap = await getDoc(listingRef);
    
    if (!listingSnap.exists()) {
      return { success: false, error: 'Listing not found' };
    }

    const listingData = {
      id: listingSnap.id,
      ...listingSnap.data()
    };

    return { success: true, data: listingData };
  } catch (error) {
    console.error('Error fetching listing:', error);
    return { success: false, error: error.message };
  }
};

