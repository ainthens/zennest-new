// src/pages/admin/Sidebar.jsx
import { motion } from 'framer-motion';
import {
  FaChartLine,
  FaUsers,
  FaFileContract,
  FaPercent,
  FaDollarSign,
  FaSignOutAlt,
  FaBook
} from 'react-icons/fa';
import zennestLogo from '../../assets/zennest-logo-v3.svg';

const menuItems = [
  { id: 'overview', label: 'Dashboard', icon: FaChartLine },
  { id: 'reservations', label: 'Reservations', icon: FaBook },
  { id: 'hosts-guests', label: 'Guest and Host', icon: FaUsers },
  { id: 'service-fees', label: 'Service Fees', icon: FaDollarSign },
  { id: 'terms', label: 'Terms & Conditions', icon: FaFileContract },
  { id: 'admin-fees', label: 'Admin Fees', icon: FaPercent },
];

const Sidebar = ({ activeSection, onSectionChange, onLogout, sidebarOpen, setSidebarOpen }) => {
  return (
    <motion.aside
      animate={{ x: sidebarOpen ? 0 : '-100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`fixed lg:fixed inset-y-0 left-0 w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white shadow-2xl z-50 flex flex-col h-screen overflow-hidden`}
    >
      {/* Logo & Branding */}
      <div className="p-4 sm:p-6 border-b border-slate-700/50 flex-shrink-0 bg-gradient-to-r from-slate-800/50 to-slate-900/50">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-white/10 rounded-lg backdrop-blur-sm flex-shrink-0">
            <img 
              src={zennestLogo} 
              alt="Zennest Logo" 
              className="h-8 sm:h-10 w-auto object-contain"
            />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-base sm:text-lg text-white truncate">Zennest</h1>
            <p className="text-xs text-emerald-400 font-medium">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu - Fixed, not scrollable */}
      <nav className="flex-1 px-3 sm:px-4 py-4 sm:py-6 space-y-2 overflow-hidden">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <motion.button
              key={item.id}
              whileHover={{ x: 4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                onSectionChange(item.id);
                if (window.innerWidth < 1024) setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition-all duration-200 relative ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg shadow-emerald-500/20'
                  : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
              }`}
            >
              <Icon className={`text-base sm:text-lg flex-shrink-0 ${isActive ? 'text-white' : ''}`} />
              <span className="font-medium text-xs sm:text-sm truncate">{item.label}</span>
              {isActive && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="ml-auto w-2 h-2 rounded-full bg-emerald-300 shadow-lg shadow-emerald-300/50 flex-shrink-0"
                />
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Admin Info & Logout - Fixed at bottom */}
      <div className="p-3 sm:p-4 border-t border-slate-700/50 space-y-2 sm:space-y-3 flex-shrink-0 bg-gradient-to-t from-slate-900/50 to-transparent">
        <div className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 backdrop-blur-sm rounded-lg p-2.5 sm:p-3 border border-slate-600/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-lg flex-shrink-0">
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-300">Logged in as</p>
              <p className="text-xs sm:text-sm font-semibold text-white truncate">Admin</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-600/30">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0"></div>
            <p className="text-xs text-emerald-400 font-medium">Active Session</p>
          </div>
        </div>

        {/* Logout Button */}
        <motion.button
          whileHover={{ scale: 1.02, x: 2 }}
          whileTap={{ scale: 0.98 }}
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-red-600/20 to-red-700/20 hover:from-red-600/30 hover:to-red-700/30 border border-red-500/30 hover:border-red-500/50 text-red-300 hover:text-red-200 rounded-lg transition-all font-semibold text-xs sm:text-sm shadow-sm"
        >
          <FaSignOutAlt className="text-xs sm:text-sm" />
          <span>Logout</span>
        </motion.button>
      </div>
    </motion.aside>
  );
};

export default Sidebar;

