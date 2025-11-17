// src/pages/admin/components/SectionHeader.jsx
import { motion } from 'framer-motion';

const SectionHeader = ({ icon: Icon, title, description }) => (
  <div className="mb-4 sm:mb-6">
    <div className="flex items-center gap-2 sm:gap-3 mb-2">
      {Icon && (
        <div className="p-1.5 sm:p-2 bg-emerald-50 rounded-lg flex-shrink-0">
          <Icon className="text-emerald-600 text-lg sm:text-xl" />
        </div>
      )}
      <h2 className="text-lg sm:text-xl font-bold text-gray-900">{title}</h2>
    </div>
    {description && (
      <p className="text-xs sm:text-sm text-gray-600 ml-0 sm:ml-14 mt-1">{description}</p>
    )}
  </div>
);

export default SectionHeader;

