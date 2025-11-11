import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ZennestLogoV3 from "../assets/zennest-logo-v3.svg";
import {
  FaFacebook,
  FaInstagram,
  FaTwitter,
  FaYoutube,
  FaMapMarkerAlt,
  FaPhone,
  FaEnvelope,
  FaChevronDown,
  FaChevronUp,
  FaHome,
  FaStar,
  FaConciergeBell,
  FaHeart,
  FaInfoCircle,
  FaShieldAlt,
  FaQuestionCircle,
  FaGlobe,
  FaUserTie,
  FaCheckCircle,
  FaAward,
  FaLock,
} from "react-icons/fa";

const Footer = () => {
  const [expandedSection, setExpandedSection] = useState(null);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    // Add your newsletter API call here
    console.log('Subscribing email:', email);
    setSubscribed(true);
    setTimeout(() => setSubscribed(false), 3000);
    setEmail('');
  };

  const currentYear = new Date().getFullYear();

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'tl', name: 'Tagalog', flag: '🇵🇭' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
  ];

  const footerLinks = {
    explore: [
      { name: "Home Stays", path: "/homestays", icon: <FaHome className="inline w-3 h-3" /> },
      { name: "Experiences", path: "/experiences", icon: <FaStar className="inline w-3 h-3" /> },
      { name: "Services", path: "/services", icon: <FaConciergeBell className="inline w-3 h-3" /> },
      { name: "Favorites", path: "/favorites", icon: <FaHeart className="inline w-3 h-3" /> },
    ],
    about: [
      { name: "About Us", path: "/about" },
      { name: "How It Works", path: "/how-it-works" },
      { name: "Careers", path: "/careers" },
      { name: "Press", path: "/press" },
    ],
    support: [
      { name: "Help Center", path: "/help" },
      { name: "Contact Us", path: "/contact" },
      { name: "Safety", path: "/safety" },
      { name: "FAQs", path: "/faqs" },
    ],
    legal: [
      { name: "Terms of Service", path: "/terms" },
      { name: "Privacy Policy", path: "/privacy" },
      { name: "Cookie Policy", path: "/cookies" },
      { name: "Accessibility", path: "/accessibility", highlight: true },
    ],
  };

  const socialLinks = [
    { name: "Facebook", icon: FaFacebook, url: "https://facebook.com/zennest", color: "hover:text-blue-600" },
    { name: "Instagram", icon: FaInstagram, url: "https://instagram.com/zennest", color: "hover:text-pink-600" },
    { name: "Twitter", icon: FaTwitter, url: "https://twitter.com/zennest", color: "hover:text-blue-400" },
    { name: "YouTube", icon: FaYoutube, url: "https://youtube.com/zennest", color: "hover:text-red-600" },
  ];

  return (
    <footer className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-gray-200" style={{ fontFamily: 'Poppins, sans-serif' }}>
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Logo, Description, Newsletter & Contact */}
          <div className="lg:col-span-2">
            <Link to="/" className="inline-block mb-4 group">
              <motion.img
                src={ZennestLogoV3}
                alt="Zennest Logo"
                className="h-12 w-auto group-hover:opacity-90 transition-opacity"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              />
            </Link>
            <p className="text-emerald-100 text-sm leading-relaxed mb-6 max-w-md">
              Discover unique home stays, unforgettable experiences, and exceptional services across the Philippines.
            </p>
            
            {/* Newsletter Signup */}
            <div className="mb-6 p-5 bg-emerald-800/30 backdrop-blur-sm rounded-2xl border border-emerald-700/50">
              <h3 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                <FaEnvelope className="text-emerald-300" />
                Stay Updated
              </h3>
              <p className="text-emerald-100 text-xs mb-3">
                Get exclusive deals and travel inspiration
              </p>
              {subscribed ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 text-emerald-300 font-semibold text-sm"
                >
                  <FaCheckCircle /> Thanks for subscribing!
                </motion.div>
              ) : (
                <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 border border-emerald-600/50 text-white placeholder-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
                    required
                  />
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-sm transition-colors shadow-lg"
                  >
                    Subscribe
                  </motion.button>
                </form>
              )}
            </div>

            {/* Contact Info */}
            <div className="space-y-2">
              <a 
                href="https://maps.google.com/?q=Manila,Philippines"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 text-sm p-2 rounded-lg hover:bg-emerald-800/30 transition-colors -ml-2"
              >
                <FaMapMarkerAlt className="text-emerald-300 mt-1 flex-shrink-0" />
                <span className="text-emerald-100">Manila, Philippines</span>
              </a>
              <a 
                href="tel:+63123456789" 
                className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-emerald-800/30 transition-colors -ml-2 active:bg-emerald-700/40"
              >
                <div className="w-9 h-9 rounded-full bg-emerald-700/50 flex items-center justify-center flex-shrink-0">
                  <FaPhone className="text-emerald-300 text-sm" />
                </div>
                <div>
                  <div className="text-xs text-emerald-300">Call us</div>
                  <div className="text-emerald-100 font-medium">+63 961 2469 245</div>
                </div>
              </a>
              <a 
                href="mailto:info@zennest.com" 
                className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-emerald-800/30 transition-colors -ml-2 active:bg-emerald-700/40"
              >
                <div className="w-9 h-9 rounded-full bg-emerald-700/50 flex items-center justify-center flex-shrink-0">
                  <FaEnvelope className="text-emerald-300 text-sm" />
                </div>
                <div>
                  <div className="text-xs text-emerald-300">Email us</div>
                  <div className="text-emerald-100 font-medium break-all">zennesrcorporation@gmail.com</div>
                </div>
              </a>
            </div>

            {/* Social Media Links */}
            <div className="flex items-center gap-3 mt-6">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <motion.a
                    key={social.name}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Follow us on ${social.name}`}
                    className={`w-10 h-10 rounded-full bg-emerald-800/50 backdrop-blur-sm flex items-center justify-center ${social.color} transition-all hover:bg-emerald-700/70 hover:scale-110 group relative`}
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label={social.name}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      {social.name}
                    </span>
                  </motion.a>
                );
              })}
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:block">
            <h3 className="text-white font-semibold mb-4 text-base flex items-center gap-2">
              <FaHome className="text-emerald-300" />
              Explore
            </h3>
            <ul className="space-y-3">
              {footerLinks.explore.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.path}
                    className="text-emerald-100 hover:text-white transition-colors text-sm flex items-center gap-2 group"
                  >
                    <span className="group-hover:translate-x-1 transition-transform">{link.icon}</span>
                    <span>{link.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="hidden lg:block">
            <h3 className="text-white font-semibold mb-4 text-base flex items-center gap-2">
              <FaInfoCircle className="text-emerald-300" />
              About
            </h3>
            <ul className="space-y-3">
              {footerLinks.about.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.path}
                    className="text-emerald-100 hover:text-white transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="hidden lg:block">
            <h3 className="text-white font-semibold mb-4 text-base flex items-center gap-2">
              <FaQuestionCircle className="text-emerald-300" />
              Support
            </h3>
            <ul className="space-y-3 mb-6">
              {footerLinks.support.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.path}
                    className="text-emerald-100 hover:text-white transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
            <h3 className="text-white font-semibold mb-4 text-base flex items-center gap-2">
              <FaShieldAlt className="text-emerald-300" />
              Legal
            </h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.path}
                    className={`text-emerald-100 hover:text-white transition-colors text-sm flex items-center gap-2 ${
                      link.highlight ? 'font-semibold' : ''
                    }`}
                  >
                    {link.name}
                    {link.highlight && (
                      <span className="text-xs bg-emerald-600 text-white px-1.5 py-0.5 rounded-full">
                        ♿
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Mobile Accordion Navigation */}
          <div className="lg:hidden space-y-4 md:col-span-2">
            {/* Explore Section */}
            <div className="border-b border-emerald-800 pb-4">
              <button
                onClick={() => toggleSection("explore")}
                className="flex items-center justify-between w-full text-left text-white font-semibold mb-3"
              >
                <span className="flex items-center gap-2">
                  <FaHome className="text-emerald-300" />
                  Explore
                </span>
                {expandedSection === "explore" ? (
                  <FaChevronUp className="text-emerald-300" />
                ) : (
                  <FaChevronDown className="text-emerald-200" />
                )}
              </button>
              <AnimatePresence>
                {expandedSection === "explore" && (
                  <motion.ul
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3"
                  >
                    {footerLinks.explore.map((link) => (
                      <li key={link.name}>
                        <Link
                          to={link.path}
                          onClick={() => setExpandedSection(null)}
                          className="text-emerald-100 hover:text-white transition-colors text-sm flex items-center gap-2"
                        >
                          {link.icon}
                          {link.name}
                        </Link>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>

            {/* About Section */}
            <div className="border-b border-emerald-800 pb-4">
              <button
                onClick={() => toggleSection("about")}
                className="flex items-center justify-between w-full text-left text-white font-semibold mb-3"
              >
                <span className="flex items-center gap-2">
                  <FaInfoCircle className="text-emerald-300" />
                  About
                </span>
                {expandedSection === "about" ? (
                  <FaChevronUp className="text-emerald-300" />
                ) : (
                  <FaChevronDown className="text-emerald-200" />
                )}
              </button>
              <AnimatePresence>
                {expandedSection === "about" && (
                  <motion.ul
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3"
                  >
                    {footerLinks.about.map((link) => (
                      <li key={link.name}>
                        <Link
                          to={link.path}
                          onClick={() => setExpandedSection(null)}
                          className="text-emerald-100 hover:text-white transition-colors text-sm"
                        >
                          {link.name}
                        </Link>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>

            {/* Support & Legal Combined for Mobile */}
            <div className="border-b border-emerald-800 pb-4">
              <button
                onClick={() => toggleSection("support")}
                className="flex items-center justify-between w-full text-left text-white font-semibold mb-3"
              >
                <span className="flex items-center gap-2">
                  <FaQuestionCircle className="text-emerald-300" />
                  Support & Legal
                </span>
                {expandedSection === "support" ? (
                  <FaChevronUp className="text-emerald-300" />
                ) : (
                  <FaChevronDown className="text-emerald-200" />
                )}
              </button>
              <AnimatePresence>
                {expandedSection === "support" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4"
                  >
                    <ul className="space-y-3">
                      {footerLinks.support.map((link) => (
                        <li key={link.name}>
                          <Link
                            to={link.path}
                            onClick={() => setExpandedSection(null)}
                            className="text-emerald-100 hover:text-white transition-colors text-sm"
                          >
                            {link.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <ul className="space-y-3 pt-3 border-t border-emerald-800">
                      {footerLinks.legal.map((link) => (
                        <li key={link.name}>
                          <Link
                            to={link.path}
                            onClick={() => setExpandedSection(null)}
                            className="text-emerald-100 hover:text-white transition-colors text-sm"
                          >
                            {link.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="border-t border-emerald-800/50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-6">
            <div className="flex items-center gap-2 text-emerald-200">
              <FaShieldAlt className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium">Secure Payments</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-200">
              <FaCheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium">Verified Hosts</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-200">
              <FaAward className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium">24/7 Support</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-200">
              <FaLock className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium">SSL Encrypted</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-emerald-800/50 bg-emerald-950/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-emerald-200 text-xs text-center md:text-left">
              © {currentYear} Zennest. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center justify-center md:justify-end gap-3">
              {/* Language Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                  className="flex items-center gap-2 text-emerald-200 hover:text-white transition-colors font-medium px-3 py-2 rounded-lg hover:bg-emerald-800/30 text-sm"
                >
                  <FaGlobe className="w-3 h-3" />
                  <span>English</span>
                  <FaChevronDown className={`w-3 h-3 transition-transform ${showLanguageMenu ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {showLanguageMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute bottom-full right-0 mb-2 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden min-w-[200px] z-50"
                    >
                      {languages.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => {
                            setShowLanguageMenu(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-emerald-50 transition-colors text-left"
                        >
                          <span className="text-xl">{lang.flag}</span>
                          <span className="text-sm font-medium text-gray-900">{lang.name}</span>
                        </button>
                      ))}
                      <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
                        <div className="text-xs text-gray-600 font-medium mb-2">Currency</div>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                          <option>PHP - ₱</option>
                          <option>USD - $</option>
                          <option>EUR - €</option>
                        </select>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  to="/host/onboarding"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl font-semibold text-sm shadow-lg transition-all"
                >
                  <FaUserTie className="w-3 h-3" />
                  <span>Become a Host</span>
                </Link>
              </motion.div>
              
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-800/50 hover:bg-emerald-700/70 text-white rounded-xl font-semibold text-sm border border-emerald-600/50 transition-all"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;