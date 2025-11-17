// src/pages/admin/ServiceFees/CashoutModal.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaWallet, FaSpinner, FaPaypal, FaMoneyBillWave, FaTimes, FaExclamationCircle } from 'react-icons/fa';

const CashoutModal = ({ isOpen, onClose, adminBalance, onCashout, processingCashOut }) => {
  const [amount, setAmount] = useState('');
  const [paypalEmail, setPaypalEmail] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setPaypalEmail('');
      setError('');
    }
  }, [isOpen]);

  const handleWithdraw = async () => {
    setError('');

    // Validate PayPal email
    if (!paypalEmail || !paypalEmail.trim()) {
      setError('Please enter your PayPal email address');
      setTimeout(() => setError(''), 5000);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(paypalEmail.trim())) {
      setError('Please enter a valid email address');
      setTimeout(() => setError(''), 5000);
      return;
    }

    // Validate amount
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      setTimeout(() => setError(''), 5000);
      return;
    }

    const withdrawalAmount = parseFloat(amount);
    if (withdrawalAmount > adminBalance) {
      setError('Withdrawal amount cannot exceed current balance.');
      setTimeout(() => setError(''), 5000);
      return;
    }

    // Validate minimum amount
    if (withdrawalAmount < 100) {
      setError('Minimum cash out amount is ₱100');
      setTimeout(() => setError(''), 5000);
      return;
    }

    try {
      await onCashout({ amount: withdrawalAmount, receiver_email: paypalEmail });
      // Modal will be closed by parent component after success
    } catch (err) {
      setError(err.message || 'Failed to process cashout.');
      setTimeout(() => setError(''), 10000);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget && !processingCashOut) {
            onClose();
          }
        }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-xl shadow-2xl max-w-md w-full p-4 sm:p-6 mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FaMoneyBillWave className="text-emerald-600 text-lg sm:text-xl" />
              <span className="hidden sm:inline">Cash Out to PayPal</span>
              <span className="sm:hidden">Cash Out</span>
            </h2>
            {!processingCashOut && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              >
                <FaTimes className="text-lg sm:text-xl" />
              </button>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700 flex items-center gap-2">
                <FaExclamationCircle />
                {error}
              </p>
            </div>
          )}

          <div className="mb-4 sm:mb-6">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 sm:p-4 mb-4">
              <p className="text-xs sm:text-sm text-emerald-700 font-medium mb-1">Available Balance</p>
              <p className="text-2xl sm:text-3xl font-bold text-emerald-600">₱{adminBalance.toLocaleString()}</p>
              <p className="text-xs text-emerald-600 mt-1">Calculated from completed transactions</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PayPal Email Address *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                  <FaPaypal className="text-blue-600" />
                </span>
                <input
                  type="email"
                  value={paypalEmail}
                  onChange={(e) => setPaypalEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="your-email@example.com"
                  disabled={processingCashOut}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Enter your PayPal Sandbox personal account email
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount to Cash Out *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₱</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="0.00"
                  min="0"
                  max={adminBalance}
                  step="0.01"
                  disabled={processingCashOut}
                />
              </div>
              <button
                onClick={() => setAmount(adminBalance.toString())}
                disabled={processingCashOut}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cash out full amount
              </button>
            </div>

            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 mb-2 font-semibold">
                <strong>Cash Out Information:</strong>
              </p>
              <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                <li>Funds will be sent directly to your PayPal Sandbox account</li>
                <li>Make sure you enter the correct PayPal email address</li>
                <li>Processing typically takes a few moments in PayPal Sandbox</li>
                <li>Currency: Philippine Peso (₱)</li>
                <li>Minimum cash out amount: ₱100</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleWithdraw}
              disabled={
                processingCashOut || 
                !paypalEmail || 
                !paypalEmail.trim() ||
                !amount || 
                parseFloat(amount) <= 0 || 
                parseFloat(amount) < 100 ||
                parseFloat(amount) > adminBalance
              }
              className="flex-1 bg-emerald-600 text-white py-2.5 sm:py-3 rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {processingCashOut ? (
                <>
                  <FaSpinner className="animate-spin text-white text-sm" />
                  <span className="hidden sm:inline">Processing...</span>
                  <span className="sm:hidden">Processing</span>
                </>
              ) : (
                <>
                  <FaPaypal className="text-white text-sm" />
                  <span className="hidden sm:inline">Process Cash Out</span>
                  <span className="sm:hidden">Cash Out</span>
                </>
              )}
            </button>
            {!processingCashOut && (
              <button
                onClick={onClose}
                className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CashoutModal;

