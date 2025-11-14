// src/utils/dateUtils.js
// Utility functions for consistent date parsing across the application

import { Timestamp } from 'firebase/firestore';

/**
 * Converts various date formats to a JavaScript Date object
 * Handles: Firestore Timestamps, Date objects, ISO strings, and date strings
 */
export const parseDate = (dateValue) => {
  if (!dateValue) return null;
  
  // If it's already a Date object, return it
  if (dateValue instanceof Date) {
    // Validate the date
    if (isNaN(dateValue.getTime())) return null;
    return dateValue;
  }
  
  // If it's a Firestore Timestamp, convert to Date
  if (dateValue && typeof dateValue.toDate === 'function') {
    try {
      return dateValue.toDate();
    } catch (error) {
      console.error('Error converting Firestore Timestamp to Date:', error);
      return null;
    }
  }
  
  // If it's a string, try to parse it
  if (typeof dateValue === 'string') {
    // Handle ISO date strings (YYYY-MM-DD or full ISO format)
    if (dateValue.includes('T')) {
      // Full ISO format: "2024-01-15T00:00:00.000Z"
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date;
      }
    } else if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Date-only format: "2024-01-15"
      // Parse as local date (midnight in local timezone)
      const [year, month, day] = dateValue.split('-').map(Number);
      const date = new Date(year, month - 1, day); // month is 0-indexed
      if (!isNaN(date.getTime())) {
        return date;
      }
    } else {
      // Try parsing as a general date string
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  
  // If it's a number (timestamp), convert to Date
  if (typeof dateValue === 'number') {
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  console.warn('Unable to parse date:', dateValue);
  return null;
};

/**
 * Converts a date value to Firestore Timestamp
 * Handles: Date objects, ISO strings, Firestore Timestamps
 */
export const convertToTimestamp = (dateValue) => {
  if (!dateValue) return null;
  
  // If it's already a Timestamp, return it
  if (dateValue && typeof dateValue.toDate === 'function') {
    return dateValue;
  }
  
  // Parse the date first
  const date = parseDate(dateValue);
  if (!date) return null;
  
  // Convert to Timestamp
  return Timestamp.fromDate(date);
};

/**
 * Formats a date for display
 */
export const formatDate = (dateValue) => {
  const date = parseDate(dateValue);
  if (!date) return 'N/A';
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

/**
 * Formats a date with time for display
 */
export const formatDateTime = (dateValue) => {
  const date = parseDate(dateValue);
  if (!date) return 'N/A';
  
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

/**
 * Calculates the number of nights between two dates
 */
export const calculateNights = (checkIn, checkOut) => {
  const checkInDate = parseDate(checkIn);
  const checkOutDate = parseDate(checkOut);
  
  if (!checkInDate || !checkOutDate) return 0;
  
  const diff = checkOutDate.getTime() - checkInDate.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

/**
 * Converts a Date object to ISO date string (YYYY-MM-DD)
 */
export const toISODateString = (date) => {
  if (!date) return null;
  const dateObj = parseDate(date);
  if (!dateObj) return null;
  
  // Get date in local timezone and format as YYYY-MM-DD
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

