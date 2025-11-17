// src/pages/admin/lib/dataFetchers.js
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  limit,
  startAfter
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { parseDate } from '../../../utils/dateUtils';

/**
 * Fetch hosts and guests with rankings
 * Hosts ranked by earnings, Guests ranked by booking count
 */
export async function fetchHostsAndGuests() {
  try {
    // Get admin fee percentage
    const adminSettings = await fetchAdminSettings();
    const adminFeePercentage = adminSettings.feePercentage || 5;

    const [hostsSnapshot, guestsSnapshot, bookingsSnapshot] = await Promise.all([
      getDocs(collection(db, 'hosts')),
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'bookings'))
    ]);

    // Process hosts with earnings-based rankings
    const hostsData = [];
    const hostEarnings = {};
    const bookingsByHost = {};
    
    bookingsSnapshot.forEach(doc => {
      const booking = doc.data();
      const hostId = booking.hostId;
      if (hostId) {
        // Count bookings
        bookingsByHost[hostId] = (bookingsByHost[hostId] || 0) + 1;
        
        // Calculate earnings (only from completed/active bookings with payment)
        const paymentCompleted = booking.paymentStatus === 'completed' || booking.paidAmount !== undefined;
        const isEligibleForEarnings = booking.status === 'completed' || 
                                     booking.status === 'active' || 
                                     (booking.status === 'confirmed' && paymentCompleted);
        
        if (paymentCompleted && isEligibleForEarnings) {
          const bookingTotal = parseFloat(booking.paidAmount || booking.total || booking.totalAmount || 0);
          if (bookingTotal > 0) {
            // Calculate host payout (total - admin fee)
            const adminFee = bookingTotal * (adminFeePercentage / 100);
            const hostPayout = bookingTotal - adminFee;
            
            hostEarnings[hostId] = (hostEarnings[hostId] || 0) + hostPayout;
          }
        }
      }
    });

    hostsSnapshot.forEach(doc => {
      const hostData = doc.data();
      hostsData.push({
        id: doc.id,
        ...hostData,
        totalBookings: bookingsByHost[doc.id] || 0,
        totalEarnings: parseFloat((hostEarnings[doc.id] || 0).toFixed(2)),
        ranking: 0
      });
    });

    // Sort hosts by earnings (highest first) and assign rankings
    hostsData.sort((a, b) => b.totalEarnings - a.totalEarnings);
    hostsData.forEach((host, index) => {
      host.ranking = index + 1;
    });

    // Process guests with booking-count-based rankings
    const guestsData = [];
    const bookingsByGuest = {};
    
    bookingsSnapshot.forEach(doc => {
      const booking = doc.data();
      const guestId = booking.guestId;
      if (guestId) {
        bookingsByGuest[guestId] = (bookingsByGuest[guestId] || 0) + 1;
      }
    });

    guestsSnapshot.forEach(doc => {
      const guestData = doc.data();
      guestsData.push({
        id: doc.id,
        ...guestData,
        totalBookings: bookingsByGuest[doc.id] || 0,
        ranking: 0
      });
    });

    // Sort guests by total bookings (highest first) and assign rankings
    guestsData.sort((a, b) => b.totalBookings - a.totalBookings);
    guestsData.forEach((guest, index) => {
      guest.ranking = index + 1;
    });

    return { hosts: hostsData, guests: guestsData };
  } catch (error) {
    console.error('Error fetching hosts and guests:', error);
    throw error;
  }
}

/**
 * Fetch host subscriptions
 */
export async function fetchSubscriptions() {
  try {
    const hostsSnapshot = await getDocs(collection(db, 'hosts'));
    const subscriptions = [];

    hostsSnapshot.forEach(doc => {
      const hostData = doc.data();
      if (hostData.subscriptionStatus === 'active' && hostData.subscriptionStartDate) {
        subscriptions.push({
          id: doc.id,
          hostName: `${hostData.firstName || ''} ${hostData.lastName || ''}`.trim() || hostData.email || 'Unknown',
          email: hostData.email || '',
          plan: hostData.subscriptionPlan || 'basic',
          status: hostData.subscriptionStatus || 'inactive',
          startDate: hostData.subscriptionStartDate?.toDate 
            ? hostData.subscriptionStartDate.toDate() 
            : (hostData.subscriptionStartDate instanceof Date 
                ? hostData.subscriptionStartDate 
                : null),
          endDate: hostData.subscriptionEndDate?.toDate 
            ? hostData.subscriptionEndDate.toDate() 
            : (hostData.subscriptionEndDate instanceof Date 
                ? hostData.subscriptionEndDate 
                : null)
        });
      }
    });

    return subscriptions;
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    throw error;
  }
}

/**
 * Fetch terms and conditions
 */
export async function fetchTermsAndConditions() {
  try {
    const termsDoc = await getDoc(doc(db, 'admin', 'termsAndConditions'));
    if (termsDoc.exists()) {
      return termsDoc.data().content || '';
    }
    return '';
  } catch (error) {
    console.error('Error fetching terms:', error);
    throw error;
  }
}

/**
 * Save terms and conditions
 */
export async function saveTermsAndConditions(content, userId = 'admin') {
  try {
    await setDoc(doc(db, 'admin', 'termsAndConditions'), {
      content: content,
      lastUpdated: new Date().toISOString(),
      updatedBy: userId
    });
    return { success: true };
  } catch (error) {
    console.error('Error saving terms:', error);
    throw error;
  }
}

/**
 * Fetch house rules
 */
export async function fetchHouseRules() {
  try {
    const houseRulesDoc = await getDoc(doc(db, 'admin', 'houseRules'));
    if (houseRulesDoc.exists()) {
      return houseRulesDoc.data().content || '';
    }
    return '';
  } catch (error) {
    console.error('Error fetching house rules:', error);
    throw error;
  }
}

/**
 * Save house rules
 */
export async function saveHouseRules(content, userId = 'admin') {
  try {
    await setDoc(doc(db, 'admin', 'houseRules'), {
      content: content,
      lastUpdated: new Date().toISOString(),
      updatedBy: userId
    });
    return { success: true };
  } catch (error) {
    console.error('Error saving house rules:', error);
    throw error;
  }
}

/**
 * Fetch admin settings (fee percentage and balance)
 */
export async function fetchAdminSettings() {
  try {
    const adminRef = doc(db, 'admin', 'settings');
    const adminSnap = await getDoc(adminRef);
    
    if (adminSnap.exists()) {
      const data = adminSnap.data();
      return {
        feePercentage: data.feePercentage || 5,
        balance: data.balance || 0
      };
    }
    return { feePercentage: 5, balance: 0 };
  } catch (error) {
    console.error('Error fetching admin settings:', error);
    throw error;
  }
}

/**
 * Calculate admin balance from all transactions
 */
export async function calculateAdminBalanceFromTransactions(adminFeePercentage = null) {
  try {
    // Get admin fee percentage if not provided
    let feePercentage = adminFeePercentage;
    if (!feePercentage) {
      const adminSettings = await fetchAdminSettings();
      feePercentage = adminSettings.feePercentage || 5;
    }

    // Fetch all bookings
    const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
    
    let totalAdminFees = 0;
    
    bookingsSnapshot.forEach(doc => {
      const booking = doc.data();
      
      // Only count bookings where payment was completed
      const paymentCompleted = booking.paymentStatus === 'completed' || booking.paidAmount !== undefined;
      
      // Skip cancelled or refunded bookings
      if (booking.status === 'cancelled' || booking.status === 'refunded') {
        return;
      }
      
      // Only count bookings with completed payment and valid status
      if (paymentCompleted && (booking.status === 'confirmed' || booking.status === 'completed' || booking.payoutProcessed)) {
        // Use actual paid amount if available, otherwise use booking total
        const bookingTotal = parseFloat(booking.paidAmount || booking.total || 0);
        
        // Skip if total is 0 or invalid
        if (!bookingTotal || bookingTotal <= 0) {
          return;
        }
        
        const adminFee = bookingTotal * (feePercentage / 100);
        totalAdminFees += adminFee;
      }
    });

    // Subtract any payouts made
    let totalPayouts = 0;
    try {
      // Try to fetch from admin/payouts subcollection
      // Payouts are stored as a subcollection under admin document
      const adminDocRef = doc(db, 'admin', 'settings');
      const adminPayoutsRef = collection(adminDocRef, 'payouts');
      const payoutsSnapshot = await getDocs(adminPayoutsRef);
      payoutsSnapshot.forEach(doc => {
        const payout = doc.data();
        if (payout.status === 'completed' || payout.status === 'success') {
          totalPayouts += parseFloat(payout.amount || 0);
        }
      });
    } catch (error) {
      // Payouts collection might not exist yet - that's okay
      console.log('Payouts collection not found, skipping payout deduction');
    }

    const calculatedBalance = totalAdminFees - totalPayouts;
    return Math.max(0, calculatedBalance);
  } catch (error) {
    console.error('Error calculating admin balance:', error);
    throw error;
  }
}

/**
 * Update admin fee percentage
 */
export async function updateAdminFeePercentage(feePercentage) {
  try {
    const adminRef = doc(db, 'admin', 'settings');
    await setDoc(adminRef, {
      feePercentage: feePercentage,
      updatedAt: serverTimestamp()
    }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('Error updating admin fee:', error);
    throw error;
  }
}

/**
 * Fetch ratings and suggestions
 */
export async function fetchRatingsAndSuggestions() {
  try {
    // Get all bookings
    const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
    
    // Build user map for guest names
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const userMap = {};
    usersSnapshot.forEach(u => {
      const d = u.data();
      userMap[u.id] =
        (d.firstName && d.lastName) ? `${d.firstName} ${d.lastName}` :
        d.displayName || d.name || (d.email ? d.email.split('@')[0] : 'Guest');
    });

    // Suggestions from bookings
    const suggestions = [];
    bookingsSnapshot.forEach(docSnap => {
      const b = docSnap.data();
      if (b.suggestion) {
        suggestions.push({
          id: docSnap.id,
          bookingId: docSnap.id,
          listingId: b.listingId || '',
          listingTitle: b.listingTitle || 'Unknown',
          guestId: b.guestId || '',
          guestName: userMap[b.guestId] || 'Guest',
          suggestion: b.suggestion,
          createdAt: b.suggestionCreatedAt?.toDate
            ? b.suggestionCreatedAt.toDate()
            : (b.suggestionCreatedAt instanceof Date
                ? b.suggestionCreatedAt
                : new Date())
        });
      }
    });

    // Reviews from listings.reviews[]
    const listingsSnapshot = await getDocs(collection(db, 'listings'));
    const ratings = [];
    listingsSnapshot.forEach(listingDoc => {
      const listingData = listingDoc.data();
      const reviewsArr = Array.isArray(listingData.reviews) ? listingData.reviews : [];
      reviewsArr.forEach(r => {
        ratings.push({
          id: `${listingDoc.id}-${r.bookingId || r.guestId || Math.random().toString(36).slice(2)}`,
          bookingId: r.bookingId || '',
          listingId: listingDoc.id,
          listingTitle: listingData.title || listingData.listingTitle || 'Unknown',
          guestId: r.guestId || r.userId || '',
          guestName: r.reviewerName || userMap[r.guestId] || 'Guest',
          rating: r.rating || null,
          cleanliness: r.cleanliness,
          accuracy: r.accuracy,
          communication: r.communication,
          location: r.location,
          checkin: r.checkin,
          value: r.value,
          comment: r.comment || '',
          createdAt: r.createdAt?.toDate
            ? r.createdAt.toDate()
            : (r.createdAt instanceof Date
                ? r.createdAt
                : new Date())
        });
      });
    });

    // Sort newest first
    ratings.sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));
    suggestions.sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));

    return { ratings, suggestions };
  } catch (error) {
    console.error('Error fetching ratings/suggestions:', error);
    throw error;
  }
}

/**
 * Fetch report data (listings, bookings, etc.)
 */
export async function fetchReportData() {
  try {
    const [usersSnapshot, listingsSnapshot, bookingsSnapshot] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'listings')),
      getDocs(collection(db, 'bookings'))
    ]);

    const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const listingsData = listingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const rawBookingsData = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Build user map for guest information
    const userMap = {};
    usersData.forEach(user => {
      const guestName = 
        (user.firstName && user.lastName) 
          ? `${user.firstName} ${user.lastName}` 
          : user.displayName 
          || user.name 
          || (user.email ? user.email.split('@')[0] : 'Guest');
      
      userMap[user.id] = {
        name: guestName,
        email: user.email || ''
      };
    });

    // Build listing map for listing titles
    const listingMap = {};
    listingsData.forEach(listing => {
      listingMap[listing.id] = listing.title || 'Unknown';
    });

    // Enrich bookings with guest and listing information
    const bookingsData = rawBookingsData.map(booking => {
      const guestInfo = booking.guestId ? userMap[booking.guestId] : null;
      const listingTitle = booking.listingId ? listingMap[booking.listingId] : null;

      return {
        ...booking,
        guestName: booking.guestName || guestInfo?.name || 'Guest',
        guestEmail: booking.guestEmail || guestInfo?.email || '',
        listingTitle: booking.listingTitle || listingTitle || 'Unknown'
      };
    });

    // Categorize bookings
    const now = new Date();
    const completedBookings = bookingsData.filter(b => b.status === 'completed');
    const cancelledBookings = bookingsData.filter(b => b.status === 'cancelled');
    const upcomingBookings = bookingsData.filter(b => {
      if (b.status !== 'confirmed' && b.status !== 'pending' && b.status !== 'pending_approval') return false;
      const checkIn = parseDate(b.checkIn);
      return checkIn && checkIn > now;
    });

    return {
      users: usersData,
      listings: listingsData,
      bookings: bookingsData,
      completedBookings,
      cancelledBookings,
      upcomingBookings
    };
  } catch (error) {
    console.error('Error fetching report data:', error);
    throw error;
  }
}

/**
 * Fetch bookings with pagination and guest information
 */
export async function fetchBookingsPaginated({ pageSize = 10, lastVisible = null, orderByField = 'createdAt', orderDirection = 'desc' }) {
  try {
    let q = query(
      collection(db, 'bookings'),
      orderBy(orderByField, orderDirection),
      limit(pageSize)
    );

    if (lastVisible) {
      q = query(q, startAfter(lastVisible));
    }

    const snapshot = await getDocs(q);
    const bookings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Fetch guest information for all bookings
    const guestIds = [...new Set(bookings.map(b => b.guestId).filter(Boolean))];
    const guestMap = {};
    
    if (guestIds.length > 0) {
      try {
        // Fetch all guest users
        const usersSnapshot = await getDocs(collection(db, 'users'));
        usersSnapshot.forEach(userDoc => {
          const userData = userDoc.data();
          if (guestIds.includes(userDoc.id)) {
            // Build guest name from available fields
            const guestName = 
              (userData.firstName && userData.lastName) 
                ? `${userData.firstName} ${userData.lastName}` 
                : userData.displayName 
                || userData.name 
                || (userData.email ? userData.email.split('@')[0] : 'Guest');
            
            guestMap[userDoc.id] = {
              name: guestName,
              email: userData.email || ''
            };
          }
        });
      } catch (error) {
        console.error('Error fetching guest information:', error);
        // Continue without guest info if fetch fails
      }
    }

    // Enrich bookings with guest information
    const enrichedBookings = bookings.map(booking => {
      const guestInfo = booking.guestId ? guestMap[booking.guestId] : null;
      return {
        ...booking,
        guestName: booking.guestName || guestInfo?.name || 'Guest',
        guestEmail: booking.guestEmail || guestInfo?.email || ''
      };
    });

    const newLastVisible = snapshot.docs[snapshot.docs.length - 1] || null;
    const hasMore = snapshot.docs.length === pageSize;

    return {
      bookings: enrichedBookings,
      lastVisible: newLastVisible,
      hasMore
    };
  } catch (error) {
    console.error('Error fetching bookings paginated:', error);
    throw error;
  }
}

/**
 * Fetch transactions (always computed from bookings to ensure accuracy)
 */
export async function fetchTransactions({ dateFrom = null, dateTo = null, status = null, hostId = null, adminFeePercentage = null }) {
  try {
    // Always compute transactions from bookings to ensure we get all transactions
    // This is the source of truth and ensures accuracy
    console.log('Fetching all transactions from bookings...');
    return await computeTransactionsFromBookings({ dateFrom, dateTo, status, hostId, adminFeePercentage });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
}

/**
 * Compute transactions from bookings
 */
async function computeTransactionsFromBookings({ dateFrom, dateTo, status, hostId, adminFeePercentage = null }) {
  try {
    const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
    
    // Get admin fee percentage if not provided
    let feePercentage = adminFeePercentage;
    if (!feePercentage) {
      const adminSettings = await fetchAdminSettings();
      feePercentage = adminSettings.feePercentage || 5;
    }

    // Fetch users and hosts for names
    const [usersSnapshot, hostsSnapshot] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'hosts'))
    ]);

    // Build name maps
    const userMap = {};
    usersSnapshot.forEach(u => {
      const d = u.data();
      userMap[u.id] = 
        (d.firstName && d.lastName) ? `${d.firstName} ${d.lastName}` :
        d.displayName || d.name || (d.email ? d.email.split('@')[0] : 'Guest');
    });

    const hostMap = {};
    hostsSnapshot.forEach(h => {
      const d = h.data();
      hostMap[h.id] = 
        (d.firstName && d.lastName) ? `${d.firstName} ${d.lastName}` :
        d.displayName || d.name || (d.email ? d.email.split('@')[0] : 'Host');
    });

    const transactions = [];
    bookingsSnapshot.forEach(doc => {
      const booking = doc.data();
      
      // Skip cancelled or refunded bookings (these don't generate transactions)
      if (booking.status === 'cancelled' || booking.status === 'refunded') {
        return;
      }
      
      // Check if payment was received/completed
      // Payment is considered completed if:
      // 1. paymentStatus is 'completed'
      // 2. paidAmount exists (indicates payment was made)
      // 3. booking has a total amount and status indicates payment (confirmed, completed, etc.)
      const paymentCompleted = booking.paymentStatus === 'completed' || 
                              booking.paidAmount !== undefined || 
                              (booking.total && booking.total > 0 && 
                               (booking.status === 'confirmed' || booking.status === 'completed' || booking.payoutProcessed));
      
      // Include all bookings with payment (regardless of final status, as long as payment was received)
      if (paymentCompleted) {
        // Use payment date if available, otherwise use booking creation/update date
        const transactionDate = parseDate(booking.paidAt) || 
                               parseDate(booking.updatedAt) || 
                               parseDate(booking.createdAt) || 
                               new Date();
        
        // Use actual paid amount if available, otherwise use booking total
        const bookingTotal = parseFloat(booking.paidAmount || booking.total || 0);
        
        // Skip if total is 0 or invalid
        if (!bookingTotal || bookingTotal <= 0) {
          return;
        }
        
        // Calculate admin fee and host payout
        const adminFee = bookingTotal * (feePercentage / 100);
        const hostPayout = bookingTotal - adminFee;

        // Get names from maps
        const guestName = booking.guestName || 
                        booking.payerName || 
                        userMap[booking.guestId] || 
                        'Guest';
        const hostName = booking.hostName || hostMap[booking.hostId] || 'Host';

        // Determine transaction status based on booking state
        let transactionStatus = 'pending';
        if (booking.payoutProcessed) {
          transactionStatus = 'completed'; // Payout already processed
        } else if (booking.status === 'completed') {
          transactionStatus = 'completed'; // Booking completed, payout ready
        } else if (booking.status === 'confirmed') {
          transactionStatus = 'pending'; // Payment received, awaiting completion
        } else if (booking.status === 'cancelled' || booking.status === 'refunded') {
          transactionStatus = 'refunded'; // Should not reach here due to early return, but just in case
        }

        transactions.push({
          id: `booking-${doc.id}`,
          bookingId: doc.id,
          date: transactionDate,
          guestId: booking.guestId,
          guestName: guestName,
          hostId: booking.hostId,
          hostName: hostName,
          subtotal: bookingTotal,
          adminFee: parseFloat(adminFee.toFixed(2)),
          hostPayout: parseFloat(hostPayout.toFixed(2)),
          status: transactionStatus,
          paymentMethod: booking.paymentMethod || 'unknown',
          paymentStatus: booking.paymentStatus || 'unknown'
        });
      }
    });

    // Sort transactions by date (newest first)
    transactions.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA; // Newest first
    });

    // Apply filters
    let filtered = transactions;
    if (dateFrom) {
      const fromDate = parseDate(dateFrom);
      if (fromDate) {
        fromDate.setHours(0, 0, 0, 0);
        filtered = filtered.filter(t => {
          if (!t.date) return false;
          const tDate = new Date(t.date);
          tDate.setHours(0, 0, 0, 0);
          return tDate >= fromDate;
        });
      }
    }
    if (dateTo) {
      const toDate = parseDate(dateTo);
      if (toDate) {
        toDate.setHours(23, 59, 59, 999);
        filtered = filtered.filter(t => {
          if (!t.date) return false;
          const tDate = new Date(t.date);
          return tDate <= toDate;
        });
      }
    }
    if (status) {
      filtered = filtered.filter(t => t.status === status);
    }
    if (hostId) {
      filtered = filtered.filter(t => t.hostId === hostId);
    }

    return filtered;
  } catch (error) {
    console.error('Error computing transactions from bookings:', error);
    throw error;
  }
}

/**
 * Fetch dashboard stats
 */
export async function fetchDashboardStats() {
  try {
    const [hostsSnapshot, guestsSnapshot, listingsSnapshot, bookingsSnapshot] = await Promise.all([
      getDocs(collection(db, 'hosts')),
      getDocs(collection(db, 'users')),
      getDocs(query(collection(db, 'listings'), where('status', '==', 'published'))),
      getDocs(collection(db, 'bookings'))
    ]);

    const hostsCount = hostsSnapshot.size;
    const guestsCount = guestsSnapshot.size;
    const listingsCount = listingsSnapshot.size;
    const bookingsCount = bookingsSnapshot.size;
    
    // Calculate total revenue from bookings
    let totalRevenue = 0;
    bookingsSnapshot.forEach(doc => {
      const booking = doc.data();
      if (booking.total) totalRevenue += booking.total;
    });

    return {
      totalHosts: hostsCount,
      totalGuests: guestsCount,
      totalBookings: bookingsCount,
      totalRevenue: totalRevenue,
      activeListings: listingsCount,
      pendingReports: 0 // TODO: Implement reports collection
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw error;
  }
}

