import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaChevronLeft, FaChevronRight, FaTimes } from 'react-icons/fa';
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
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedStart, setSelectedStart] = useState(null);
  const [selectedEnd, setSelectedEnd] = useState(null);
  const [hoverDate, setHoverDate] = useState(null);

  // Update local state when initialRange changes
  useEffect(() => {
    if (isOpen) {
      setDateRange({
        startDate: initialRange.startDate || null,
        endDate: initialRange.endDate || null,
        enabled: initialRange.enabled || false
      });
      if (initialRange.startDate) {
        setSelectedStart(new Date(initialRange.startDate));
        setCurrentMonth(new Date(initialRange.startDate));
      } else {
        setSelectedStart(null);
      }
      if (initialRange.endDate) {
        setSelectedEnd(new Date(initialRange.endDate));
      } else {
        setSelectedEnd(null);
      }
    }
  }, [isOpen, initialRange]);

  const handlePresetSelect = (preset) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let start = null;
    let end = null;

    switch (preset) {
      case 'today':
        start = new Date(today);
        end = new Date(today);
        break;
      case 'thisMonth':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today);
        break;
      case 'lastMonth':
        const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        start = firstDayOfLastMonth;
        end = lastDayOfLastMonth;
        break;
      case 'thisYear':
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today);
        break;
      default:
        break;
    }

    if (start && end) {
      setSelectedStart(start);
      setSelectedEnd(end);
      setDateRange({
        startDate: start,
        endDate: end,
        enabled: true
      });
      setCurrentMonth(new Date(start));
    }
  };

  const normalizeDate = (date) => {
    if (!date) return null;
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const isDateInRange = (date) => {
    if (!selectedStart || !selectedEnd) return false;
    const normalizedDate = normalizeDate(date);
    const normalizedStart = normalizeDate(selectedStart);
    const normalizedEnd = normalizeDate(selectedEnd);
    if (!normalizedDate || !normalizedStart || !normalizedEnd) return false;
    return normalizedDate >= normalizedStart && normalizedDate <= normalizedEnd;
  };

  const isDateInHoverRange = (date) => {
    if (!selectedStart || selectedEnd || !hoverDate) return false;
    const normalizedDate = normalizeDate(date);
    const normalizedStart = normalizeDate(selectedStart);
    const normalizedHover = normalizeDate(hoverDate);
    if (!normalizedDate || !normalizedStart || !normalizedHover) return false;
    const min = normalizedStart < normalizedHover ? normalizedStart : normalizedHover;
    const max = normalizedStart > normalizedHover ? normalizedStart : normalizedHover;
    return normalizedDate >= min && normalizedDate <= max;
  };

  const handleDateClick = (date) => {
    const normalizedDate = normalizeDate(date);
    if (!normalizedDate) return;

    if (!selectedStart || (selectedStart && selectedEnd)) {
      // Start new selection
      setSelectedStart(normalizedDate);
      setSelectedEnd(null);
      setDateRange({
        startDate: normalizedDate,
        endDate: null,
        enabled: true
      });
    } else if (selectedStart && !selectedEnd) {
      // Complete selection
      if (normalizedDate < selectedStart) {
        // If clicked date is before start, make it the new start
        setSelectedStart(normalizedDate);
        setSelectedEnd(null);
        setDateRange({
          startDate: normalizedDate,
          endDate: null,
          enabled: true
        });
      } else {
        // Set end date
        setSelectedEnd(normalizedDate);
        setDateRange({
          startDate: selectedStart,
          endDate: normalizedDate,
          enabled: true
        });
      }
    }
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
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
      return;
    }
    onGenerate({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      enabled: dateRange.enabled
    });
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const calendarDays = getDaysInMonth(currentMonth);
  const currentYear = currentMonth.getFullYear();
  const currentMonthIndex = currentMonth.getMonth();

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
        {/* Quick Presets */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Presets:</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { key: 'today', label: 'Today' },
              { key: 'thisMonth', label: 'This Month' },
              { key: 'lastMonth', label: 'Last Month' },
              { key: 'thisYear', label: 'This Year' }
            ].map((preset) => (
              <motion.button
                key={preset.key}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => handlePresetSelect(preset.key)}
                className="px-3 py-2 text-xs sm:text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-700 font-medium"
              >
                {preset.label}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Calendar */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            {/* Calendar Header with Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Previous month"
              >
                <FaChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <h3 className="text-base font-semibold text-gray-900">
                {monthNames[currentMonthIndex]} {currentYear}
              </h3>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Next month"
              >
                <FaChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Day labels */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map((day) => (
                <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} className="aspect-square" />;
                }

                const normalizedDate = normalizeDate(date);
                const normalizedStart = normalizeDate(selectedStart);
                const normalizedEnd = normalizeDate(selectedEnd);
                
                const isStart = normalizedDate && normalizedStart && 
                                normalizedDate.getTime() === normalizedStart.getTime();
                const isEnd = normalizedDate && normalizedEnd && 
                              normalizedDate.getTime() === normalizedEnd.getTime();
                const inRange = isDateInRange(date);
                const inHoverRange = isDateInHoverRange(date);
                
                // Determine rounded corners for range styling
                const prevDay = new Date(date);
                prevDay.setDate(prevDay.getDate() - 1);
                const nextDay = new Date(date);
                nextDay.setDate(nextDay.getDate() + 1);
                
                const isRangeStart = isStart || (inRange && !isDateInRange(prevDay));
                const isRangeEnd = isEnd || (inRange && !isDateInRange(nextDay));

                return (
                  <button
                    key={date.getTime()}
                    type="button"
                    onClick={() => handleDateClick(date)}
                    onMouseEnter={() => setHoverDate(date)}
                    onMouseLeave={() => setHoverDate(null)}
                    className={`
                      aspect-square flex items-center justify-center text-sm font-medium
                      transition-all duration-150 ease-in-out
                      ${isStart || isEnd
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700 font-semibold rounded-full z-10'
                        : inRange
                        ? 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200'
                        : inHoverRange && !selectedEnd
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-700 hover:bg-gray-100'
                      }
                      ${isRangeStart && inRange && !isStart
                        ? 'rounded-l-full'
                        : ''
                      }
                      ${isRangeEnd && inRange && !isEnd
                        ? 'rounded-r-full'
                        : ''
                      }
                      ${!inRange && !inHoverRange && !isStart && !isEnd
                        ? 'rounded-lg'
                        : ''
                      }
                    `}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Checkbox at bottom left */}
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
        </div>

        {/* Validation message */}
        {dateRange.enabled && dateRange.startDate && dateRange.endDate && dateRange.startDate > dateRange.endDate && (
          <div className="text-red-600 text-sm">
            End date cannot be before start date
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ReportDateRangeModal;
