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
      className="fixed inset-y-0 left-0 w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white shadow-2xl z-50 flex flex-col h-screen overflow-hidden"
    >
      {/* Logo */}
      <div className="p-6 flex justify-center border-b border-slate-700/50">
        <motion.div 
          whileHover={{ scale: 1.05 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full"></div>
          <img 
            src={zennestLogo} 
            alt="Zennest Logo" 
            className="h-10 w-auto object-contain relative z-10"
          />
        </motion.div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-hidden">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <motion.button
              key={item.id}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                onSectionChange(item.id);
                if (window.innerWidth < 1024) setSidebarOpen(false);
              }}
              className={`group w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 relative ${
                isActive
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                  : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
              }`}
            >
              <div className={`p-2 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-white/20' 
                  : 'bg-slate-700/50 group-hover:bg-slate-600/50'
              }`}>
                <Icon className="text-base" />
              </div>
              <span className="font-medium text-sm">{item.label}</span>
              {isActive && (
                <motion.div 
                  layoutId="activeIndicator"
                  className="absolute right-4 w-1.5 h-1.5 rounded-full bg-white shadow-lg shadow-white/50"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Admin Info & Logout */}
      <div className="p-4 space-y-3 border-t border-slate-700/50">
        {/* Admin Card */}
        <div className="bg-gradient-to-br from-slate-700/40 to-slate-800/40 backdrop-blur-sm rounded-xl p-4 border border-slate-600/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-lg flex-shrink-0">
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-400 font-medium mb-0.5">Administrator</p>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                <p className="text-xs text-emerald-400 font-semibold">Active</p>
              </div>
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-700/30 border border-slate-600/50 hover:border-red-500/50 hover:bg-red-500/10 text-slate-300 hover:text-red-400 rounded-xl transition-all font-semibold text-sm group"
        >
          <FaSignOutAlt className="text-sm group-hover:rotate-12 transition-transform" />
          <span>Logout</span>
        </motion.button>
      </div>
    </motion.aside>
  );
};

export default Sidebar;