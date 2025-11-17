// src/pages/admin/components/Modal.jsx
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';

const Modal = ({ isOpen, title, children, onClose, primaryAction, primaryLabel = "Save" }) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          aria-label="Close modal"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto mx-4">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-4 sm:p-6 flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-bold truncate pr-2">{title}</h3>
              <button
                onClick={onClose}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
                aria-label="Close modal"
              >
                <FaTimes className="text-base sm:text-lg" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6">{children}</div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-3 sm:p-4 flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-medium text-xs sm:text-sm"
              >
                Cancel
              </button>
              {primaryAction && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={primaryAction}
                  className="flex-1 px-3 sm:px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-xs sm:text-sm"
                >
                  {primaryLabel}
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

export default Modal;

