// src/pages/admin/Topbar.jsx
import { motion } from 'framer-motion';
import { FaBars, FaTimes, FaBell, FaChevronDown } from 'react-icons/fa';
import zennestLogo from '../../assets/zennest-logo-v3.svg';

const Topbar = ({ sidebarOpen, setSidebarOpen, onLogout }) => {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30 backdrop-blur-sm bg-white/95">
      <div className="flex items-center justify-between px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4">
        {/* Left: Logo & Menu */}
        <div className="flex items-center gap-2 sm:gap-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? (
              <FaTimes className="text-lg sm:text-xl text-gray-600" />
            ) : (
              <FaBars className="text-lg sm:text-xl text-gray-600" />
            )}
          </motion.button>

          {/* Logo - Hidden on mobile when sidebar is open */}
          <div className={`hidden lg:flex items-center gap-2 sm:gap-3 ${sidebarOpen ? 'lg:hidden' : ''}`}>
            <div className="p-1 sm:p-1.5 bg-emerald-50 rounded-lg">
              <img 
                src={zennestLogo} 
                alt="Zennest Logo" 
                className="h-7 sm:h-8 w-auto object-contain"
              />
            </div>
            <div>
              <span className="font-bold text-base sm:text-lg text-gray-900">Zennest</span>
              <span className="text-xs sm:text-sm text-emerald-600 font-medium ml-1 sm:ml-2">Admin</span>
            </div>
          </div>
        </div>

        {/* Right: Notifications & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Notifications */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative p-2 sm:p-2.5 hover:bg-gray-100 rounded-lg transition-colors group"
            aria-label="Notifications"
          >
            <FaBell className="text-base sm:text-lg text-gray-600 group-hover:text-emerald-600 transition-colors" />
            <span className="absolute top-1 sm:top-1.5 right-1 sm:right-1.5 w-2 sm:w-2.5 h-2 sm:h-2.5 bg-red-500 rounded-full animate-pulse ring-2 ring-white" />
          </motion.button>

          {/* User Menu Trigger */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onLogout}
            className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 hover:bg-gray-100 rounded-lg transition-colors group"
            aria-label="User menu"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-md group-hover:shadow-lg transition-shadow flex-shrink-0">
              A
            </div>
            <div className="hidden sm:block text-left min-w-0">
              <p className="text-xs text-gray-500 truncate">Admin</p>
              <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">Dashboard</p>
            </div>
            <FaChevronDown className="text-xs text-gray-600 group-hover:text-emerald-600 transition-colors flex-shrink-0" />
          </motion.button>
        </div>
      </div>
    </header>
  );
};

export default Topbar;

