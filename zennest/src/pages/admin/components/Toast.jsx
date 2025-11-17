// src/pages/admin/components/Toast.jsx
import { motion, AnimatePresence } from 'framer-motion';
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

const Toast = ({ message, type = 'success', isVisible }) => (
  <AnimatePresence>
    {isVisible && (
      <motion.div
        initial={{ opacity: 0, y: 20, x: 20 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        exit={{ opacity: 0, y: 20, x: 20 }}
        className={`fixed bottom-6 right-6 px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 z-50 ${
          type === 'success' 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}
      >
        {type === 'success' ? (
          <FaCheckCircle className="text-green-600" />
        ) : (
          <FaTimesCircle className="text-red-600" />
        )}
        <span className={type === 'success' ? 'text-green-900' : 'text-red-900'}>
          {message}
        </span>
      </motion.div>
    )}
  </AnimatePresence>
);

export default Toast;

