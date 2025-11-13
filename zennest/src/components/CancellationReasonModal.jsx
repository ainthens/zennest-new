// src/components/CancellationReasonModal.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaExclamationTriangle, FaTimes } from 'react-icons/fa';

const CANCELLATION_REASONS = [
  'Change of plans',
  'Found a better option',
  'Travel dates changed',
  'Emergency or unexpected event',
  'Price concerns',
  'Location concerns',
  'Booking mistake'
];

const CancellationReasonModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  isSubmitting = false 
}) => {
  const [selectedReasons, setSelectedReasons] = useState([]);
  const [otherReason, setOtherReason] = useState('');
  const [error, setError] = useState('');

  const handleReasonToggle = (reason) => {
    setSelectedReasons(prev => {
      if (prev.includes(reason)) {
        return prev.filter(r => r !== reason);
      } else {
        return [...prev, reason];
      }
    });
    setError('');
  };

  const handleSubmit = () => {
    // Validate that at least one reason is selected or other reason is provided
    if (selectedReasons.length === 0 && !otherReason.trim()) {
      setError('Please select at least one reason or provide a custom reason');
      return;
    }

    // Combine selected reasons and other reason
    const cancellationReason = selectedReasons.length > 0
      ? selectedReasons.join(', ') + (otherReason.trim() ? ` - ${otherReason.trim()}` : '')
      : otherReason.trim();

    onSubmit(cancellationReason);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedReasons([]);
      setOtherReason('');
      setError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <FaExclamationTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Cancel Booking</h3>
                <p className="text-xs text-gray-600">Please tell us why you're cancelling</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaTimes className="w-5 h-5" />
            </button>
          </div>

          {/* Reasons */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Reason for cancellation (select all that apply):
            </label>
            <div className="space-y-2">
              {CANCELLATION_REASONS.map((reason) => (
                <label
                  key={reason}
                  className="flex items-center gap-3 p-3 rounded-lg border-2 border-gray-200 hover:border-emerald-300 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedReasons.includes(reason)}
                    onChange={() => handleReasonToggle(reason)}
                    disabled={isSubmitting}
                    className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 focus:ring-2"
                  />
                  <span className="text-sm text-gray-700 flex-1">{reason}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Other Reason */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Other (please specify):
            </label>
            <textarea
              value={otherReason}
              onChange={(e) => {
                setOtherReason(e.target.value);
                setError('');
              }}
              disabled={isSubmitting}
              placeholder="Tell us more about your cancellation reason..."
              rows={3}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-500 focus:outline-none resize-none text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <p className="text-xs text-yellow-800 font-medium mb-1.5">⚠️ Important Information:</p>
            <ul className="text-xs text-yellow-700 space-y-0.5 list-disc list-inside">
              <li>Your cancellation request will be sent to the host for approval</li>
              <li>Refund policies apply based on cancellation terms</li>
              <li>The host will be notified of this cancellation request</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Keep Booking
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Cancellation Request'
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CancellationReasonModal;

