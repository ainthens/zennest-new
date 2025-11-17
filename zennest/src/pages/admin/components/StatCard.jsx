// src/pages/admin/components/StatCard.jsx
import { motion } from 'framer-motion';
import { FaArrowUp, FaArrowDown } from 'react-icons/fa';

const StatCard = ({ icon: Icon, title, value, trend, loading = false }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -2, scale: 1.01 }}
    transition={{ duration: 0.3 }}
    className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 p-4 sm:p-6 border border-gray-100 relative overflow-hidden group"
  >
    {/* Background gradient accent */}
    <div className="absolute top-0 right-0 w-24 sm:w-32 h-24 sm:h-32 bg-gradient-to-br from-emerald-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-bl-full" />
    
    <div className="flex items-start justify-between relative z-10">
      <div className="flex-1">
        <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1 sm:mb-2">{title}</p>
        {loading ? (
          <div className="h-6 sm:h-8 w-16 sm:w-20 bg-gray-200 rounded animate-pulse" />
        ) : (
          <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">{value}</h3>
        )}
      </div>
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow flex-shrink-0">
        <Icon className="text-white text-lg sm:text-xl" />
      </div>
    </div>
    {trend && !loading && (
      <div className={`flex items-center gap-1.5 mt-3 sm:mt-4 text-xs font-semibold ${trend > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
        <div className={`p-1 rounded ${trend > 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
          {trend > 0 ? <FaArrowUp className="text-xs" /> : <FaArrowDown className="text-xs" />}
        </div>
        <span className="hidden sm:inline">{Math.abs(trend)}% vs last month</span>
        <span className="sm:hidden">{Math.abs(trend)}%</span>
      </div>
    )}
  </motion.div>
);

export default StatCard;

