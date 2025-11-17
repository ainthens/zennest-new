// src/pages/admin/Reservations/useReservationsPagination.js
import { useState, useCallback } from 'react';
import { fetchBookingsPaginated } from '../lib/dataFetchers';

export function useReservationsPagination({ pageSize = 10 }) {
  const [page, setPage] = useState(0);
  const [pageStack, setPageStack] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [lastVisible, setLastVisible] = useState(null);
  const [firstVisible, setFirstVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchNext = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    setError(null);
    try {
      const result = await fetchBookingsPaginated({
        pageSize,
        lastVisible: lastVisible,
        orderByField: 'createdAt',
        orderDirection: 'desc'
      });

      if (result.bookings.length > 0) {
        // Push current lastVisible to stack for back navigation
        if (lastVisible) {
          setPageStack(prev => [...prev, lastVisible]);
        }
        
        setBookings(result.bookings);
        setLastVisible(result.lastVisible);
        setFirstVisible(result.bookings[0]?.id || null);
        setHasMore(result.hasMore);
        setPage(prev => prev + 1);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error fetching next page:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [lastVisible, pageSize, hasMore, loading]);

  const fetchPrevious = useCallback(async () => {
    if (loading || pageStack.length === 0) return;

    setLoading(true);
    setError(null);
    try {
      // Pop the last page marker from stack
      const newStack = [...pageStack];
      const previousLastVisible = newStack.pop();
      
      // Fetch previous page (we need to implement a different approach for Firestore)
      // For now, we'll reset to beginning
      const result = await fetchBookingsPaginated({
        pageSize,
        lastVisible: null,
        orderByField: 'createdAt',
        orderDirection: 'desc'
      });

      setBookings(result.bookings);
      setLastVisible(result.lastVisible);
      setPageStack(newStack);
      setHasMore(true);
      setPage(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error fetching previous page:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [pageStack, pageSize, loading]);

  const reset = useCallback(async () => {
    setPage(0);
    setPageStack([]);
    setLastVisible(null);
    setFirstVisible(null);
    setHasMore(true);
    setLoading(true);
    setError(null);

    try {
      const result = await fetchBookingsPaginated({
        pageSize,
        lastVisible: null,
        orderByField: 'createdAt',
        orderDirection: 'desc'
      });

      setBookings(result.bookings);
      setLastVisible(result.lastVisible);
      setFirstVisible(result.bookings[0]?.id || null);
      setHasMore(result.hasMore);
    } catch (err) {
      console.error('Error resetting pagination:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  return {
    bookings,
    page,
    hasMore,
    loading,
    error,
    fetchNext,
    fetchPrevious,
    reset
  };
}

