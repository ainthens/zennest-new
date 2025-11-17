// src/pages/admin/Reservations/ReservationRow.jsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import Modal from '../components/Modal';
import { FaInfoCircle } from 'react-icons/fa';
import { parseDate } from '../../../utils/dateUtils';

const ReservationRow = ({ booking }) => {
  const [showDetails, setShowDetails] = useState(false);

  const checkIn = parseDate(booking.checkIn);
  const checkOut = parseDate(booking.checkOut);
  const createdAt = parseDate(booking.createdAt);

  // Helper function to determine payment status
  const getPaymentStatus = (booking) => {
    // Payment is "completed" if paymentStatus is 'completed' or paidAmount exists
    if (booking.paymentStatus === 'completed' || booking.paidAmount !== undefined) {
      return 'completed';
    }
    
    // Payment is "pending" if paymentStatus is 'pending' or 'scheduled'
    if (booking.paymentStatus === 'pending' || booking.paymentStatus === 'scheduled') {
      return 'pending';
    }
    
    // If booking status is upcoming (check-in in future), payment is also upcoming
    const now = new Date();
    if (checkIn && now < checkIn) {
      return 'upcoming';
    }
    
    // Default to pending if no payment status
    return booking.paymentStatus || 'pending';
  };

  const paymentStatus = getPaymentStatus(booking);

  return (
    <>
      <tr className="hover:bg-gray-50 transition-colors">
        <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm font-medium text-gray-900">{booking.id?.substring(0, 8) || 'N/A'}</td>
        <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-600">
          <div>
            <div className="font-medium text-gray-900">{booking.guestName || 'Guest'}</div>
            {booking.guestEmail && (
              <div className="text-xs text-gray-500">{booking.guestEmail}</div>
            )}
          </div>
        </td>
        <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-600 hidden md:table-cell">{booking.listingTitle || 'Unknown'}</td>
        <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-600 hidden lg:table-cell">
          {checkIn ? checkIn.toLocaleDateString() : 'N/A'}
        </td>
        <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-600 hidden lg:table-cell">
          {checkOut ? checkOut.toLocaleDateString() : 'N/A'}
        </td>
        <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm">
          <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${
            booking.status === 'completed' ? 'bg-green-100 text-green-800' :
            booking.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
            booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {booking.status || 'N/A'}
          </span>
        </td>
        <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm hidden md:table-cell">
          <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${
            paymentStatus === 'completed' ? 'bg-green-100 text-green-800' :
            paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
            paymentStatus === 'upcoming' ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {paymentStatus}
          </span>
        </td>
        <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-600 hidden xl:table-cell">
          {createdAt ? createdAt.toLocaleDateString() : 'N/A'}
        </td>
        <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowDetails(true)}
            className="px-2 sm:px-3 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-xs font-semibold flex items-center gap-1"
          >
            <FaInfoCircle className="text-xs" />
            <span className="hidden sm:inline">Details</span>
          </motion.button>
        </td>
      </tr>

      <Modal
        isOpen={showDetails}
        title="Booking Details"
        onClose={() => setShowDetails(false)}
      >
        <div className="space-y-3 sm:space-y-4">
          <div>
            <h4 className="text-sm sm:text-base font-semibold text-gray-700 mb-2">Booking Information</h4>
            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                <span className="text-gray-600">Booking ID:</span>
                <span className="font-medium break-all text-right sm:text-left">{booking.id}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                <span className="text-gray-600">Status:</span>
                <span className="font-medium">{booking.status || 'N/A'}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                <span className="text-gray-600">Payment Status:</span>
                <span className={`font-medium px-2 py-1 rounded text-xs ${
                  paymentStatus === 'completed' ? 'bg-green-100 text-green-800' :
                  paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  paymentStatus === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {paymentStatus}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                <span className="text-gray-600">Total:</span>
                <span className="font-medium">₱{(booking.total || 0).toLocaleString()}</span>
              </div>
              {booking.paidAmount !== undefined && (
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                  <span className="text-gray-600">Paid Amount:</span>
                  <span className="font-medium">₱{(booking.paidAmount || 0).toLocaleString()}</span>
                </div>
              )}
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                <span className="text-gray-600">Created:</span>
                <span className="font-medium">{createdAt ? createdAt.toLocaleString() : 'N/A'}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm sm:text-base font-semibold text-gray-700 mb-2">Guest Information</h4>
            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                <span className="text-gray-600">Name:</span>
                <span className="font-medium break-words text-right sm:text-left">{booking.guestName || 'N/A'}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                <span className="text-gray-600">Email:</span>
                <span className="font-medium break-all text-right sm:text-left">{booking.guestEmail || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm sm:text-base font-semibold text-gray-700 mb-2">Listing Information</h4>
            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                <span className="text-gray-600">Title:</span>
                <span className="font-medium break-words text-right sm:text-left">{booking.listingTitle || 'N/A'}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                <span className="text-gray-600">Check-in:</span>
                <span className="font-medium">{checkIn ? checkIn.toLocaleDateString() : 'N/A'}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                <span className="text-gray-600">Check-out:</span>
                <span className="font-medium">{checkOut ? checkOut.toLocaleDateString() : 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ReservationRow;

