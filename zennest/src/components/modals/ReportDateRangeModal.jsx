import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaCalendarAlt, FaTimes } from 'react-icons/fa';
import Modal from '../../pages/admin/components/Modal';

const ReportDateRangeModal = ({ 
  isOpen, 
  onClose, 
  onGenerate, 
  initialRange = { startDate: null, endDate: null, enabled: false } 
}) => {
  const [dateRange, setDateRange] = useState({
    startDate: initialRange.startDate || null,
    endDate: initialRange.endDate || null,
    enabled: initialRange.enabled || false
  });

  // Update local state when initialRange changes
  useEffect(() => {
    if (isOpen) {
      setDateRange({
        startDate: initialRange.startDate || null,
        endDate: initialRange.endDate || null,
        enabled: initialRange.enabled || false
      });
    }
  }, [isOpen, initialRange]);

  const handlePresetSelect = (preset) => {
    const today = new Date();
    const newRange = { startDate: null, endDate: null, enabled: true };

    switch (preset) {
      case 'today':
        newRange.startDate = new Date(today);
        newRange.endDate = new Date(today);
        break;
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        newRange.startDate = yesterday;
        newRange.endDate = yesterday;
        break;
      case 'thisWeek':
        const firstDayOfWeek = new Date(today);
        firstDayOfWeek.setDate(today.getDate() - today.getDay());
        newRange.startDate = firstDayOfWeek;
        newRange.endDate = new Date(today);
        break;
      case 'lastWeek':
        const lastWeekStart = new Date(today);
        lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
        newRange.startDate = lastWeekStart;
        newRange.endDate = lastWeekEnd;
        break;
      case 'thisMonth':
        newRange.startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        newRange.endDate = new Date(today);
        break;
      case 'lastMonth':
        const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        newRange.startDate = firstDayOfLastMonth;
        newRange.endDate = lastDayOfLastMonth;
        break;
      case 'thisYear':
        newRange.startDate = new Date(today.getFullYear(), 0, 1);
        newRange.endDate = new Date(today);
        break;
      default:
        break;
    }

    setDateRange(newRange);
  };

  const handleDateChange = (type, value) => {
    setDateRange(prev => ({
      ...prev,
      [type]: value ? new Date(value) : null,
      enabled: true
    }));
  };

  const toggleDateRange = () => {
    setDateRange(prev => ({
      ...prev,
      enabled: !prev.enabled
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (dateRange.enabled && dateRange.startDate && dateRange.endDate && dateRange.startDate > dateRange.endDate) {
      return; // Validation will be handled by the parent component
    }
    onGenerate({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      enabled: dateRange.enabled
    });
  };

  const formatDateForInput = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  if (!isOpen) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Select Date Range for Report"
      primaryAction={handleSubmit}
      primaryLabel="Generate Report"
    >
      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Presets</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {['today', 'yesterday', 'thisWeek', 'lastWeek', 'thisMonth', 'lastMonth', 'thisYear'].map((preset) => (
              <motion.button
                key={preset}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => handlePresetSelect(preset)}
                className="px-3 py-2 text-xs sm:text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-700"
              >
                {preset.split(/(?=[A-Z])/).map(word => 
                  word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ')}
              </motion.button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="useDateRange"
              checked={dateRange.enabled}
              onChange={toggleDateRange}
              className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
            />
            <label htmlFor="useDateRange" className="ml-2 block text-sm text-gray-700">
              Use date range filter
            </label>
          </div>

          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${!dateRange.enabled ? 'opacity-50' : ''}`}>
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaCalendarAlt className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="date"
                  id="startDate"
                  value={dateRange.startDate ? formatDateForInput(dateRange.startDate) : ''}
                  onChange={(e) => handleDateChange('startDate', e.target.value)}
                  disabled={!dateRange.enabled}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm disabled:bg-gray-100"
                />
              </div>
            </div>
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaCalendarAlt className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="date"
                  id="endDate"
                  value={dateRange.endDate ? formatDateForInput(dateRange.endDate) : ''}
                  onChange={(e) => handleDateChange('endDate', e.target.value)}
                  disabled={!dateRange.enabled}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm disabled:bg-gray-100"
                />
              </div>
            </div>
          </div>
        </div>

        {dateRange.enabled && dateRange.startDate && dateRange.endDate && dateRange.startDate > dateRange.endDate && (
          <div className="text-red-600 text-sm mt-2">
            End date cannot be before start date
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ReportDateRangeModal;
