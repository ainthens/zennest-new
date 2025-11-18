// src/components/Hero.jsx
import React, { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import waveSvg from "../assets/wave (1).svg";
import heroVideo from "../assets/homestays_video.webm";
import { FaUmbrellaBeach, FaCity, FaMountain, FaUtensils } from "react-icons/fa";

const Hero = () => {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [heroRef, heroInView] = useInView({
    triggerOnce: true,
    threshold: 0.2,
  });
  const [params] = useSearchParams();
  const startParam = params.get("start") || params.get("startDate");
  const endParam = params.get("end") || params.get("endDate");
  const withDates = (path) => {
    if (startParam || endParam) {
      const sp = new URLSearchParams();
      if (startParam) sp.set("start", startParam);
      if (endParam) sp.set("end", endParam);
      return `${path}?${sp.toString()}`;
    }
    return path;
  };

  // Use local video from assets folder
  const heroVideoUrl = heroVideo;

  // Ensure video plays (handles autoplay restrictions)
  useEffect(() => {
    if (videoRef.current && heroVideoUrl) {
      const video = videoRef.current;
      
      const playVideo = async () => {
        try {
          await video.play();
        } catch (error) {
          if (import.meta.env.DEV) {
            console.warn('Video autoplay prevented:', error);
          }
          // Try to play on user interaction
          const playOnInteraction = () => {
            video.play().catch(err => {
              if (import.meta.env.DEV) {
                console.error('Play failed:', err);
              }
            });
            document.removeEventListener('click', playOnInteraction);
            document.removeEventListener('touchstart', playOnInteraction);
          };
          document.addEventListener('click', playOnInteraction);
          document.addEventListener('touchstart', playOnInteraction);
        }
      };

      video.addEventListener('loadedmetadata', playVideo);
      video.addEventListener('canplay', () => {
        video.play().catch(err => {
          if (import.meta.env.DEV) {
            console.error('Video play failed:', err);
          }
        });
      });

      return () => {
        video.removeEventListener('loadedmetadata', playVideo);
      };
    }
  }, [heroVideoUrl]);




  return (
    <motion.section 
      ref={heroRef}
      initial={{ opacity: 0 }}
      animate={heroInView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="relative min-h-[75vh] sm:min-h-[80vh] md:min-h-[85vh] lg:min-h-screen flex items-center justify-center overflow-hidden pt-16 sm:pt-0"
    >
      {/* Background Video */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {heroVideoUrl ? (
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              transform: heroInView ? 'scale(1)' : 'scale(1.15)',
              transition: 'transform 1.2s ease-out'
            }}
          >
            <source src={heroVideoUrl} type="video/webm" />
            Your browser does not support the video tag.
          </video>
        ) : (
          <motion.div 
            initial={{ scale: 1.15 }}
            animate={heroInView ? { scale: 1 } : { scale: 1.15 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="absolute inset-0 z-0 bg-gray-900"
          ></motion.div>
        )}
      </div>
      
      {/* Gradient Overlays - Stronger on mobile for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/35 to-black/45 sm:from-black/30 sm:via-black/30 sm:to-black/40 z-0"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/25 via-transparent to-emerald-900/25 sm:from-emerald-900/20 sm:via-transparent sm:to-emerald-900/20 z-0"></div>
      
      {/* Animated Background Elements - Hidden on mobile, visible on larger screens */}
      <div className="absolute inset-0 z-0 overflow-hidden hidden md:block">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-20 right-20 w-72 h-72 bg-emerald-400 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.1, 0.15, 0.1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
          className="absolute bottom-20 left-20 w-96 h-96 bg-emerald-500 rounded-full blur-3xl"
        />
      </div>
      
      {/* Hero Content */}
      <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-5 md:px-6 lg:px-12 py-6 sm:py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 md:gap-8 lg:gap-12 items-center">
          {/* Left Column - Main Content */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={heroInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-white text-center lg:text-left"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={heroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="inline-flex items-center gap-1 sm:gap-1.5 md:gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-2.5 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 mb-3 sm:mb-4 md:mb-6"
            >
              <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-[10px] sm:text-xs md:text-sm font-medium">Your Perfect Escape</span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={heroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-semibold mb-3 sm:mb-4 md:mb-6 leading-tight px-2 sm:px-0"
            >
              Find your
              <motion.span 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={heroInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="block bg-gradient-to-r from-emerald-400 via-emerald-300 to-emerald-500 bg-clip-text text-transparent mt-0.5 sm:mt-1 md:mt-2"
              >
                Sanctuary
              </motion.span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={heroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl text-gray-200 mb-4 sm:mb-5 md:mb-6 lg:mb-8 leading-relaxed px-2 sm:px-3 md:px-0 max-w-xl mx-auto lg:mx-0"
            >
              Discover unique stays and unforgettable experiences across the Philippines. From serene rest houses to vibrant city tours, find your perfect escape.
            </motion.p>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={heroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.8, delay: 0.9 }}
              className="grid grid-cols-3 gap-2 sm:gap-2.5 md:gap-3 lg:gap-4 xl:gap-6 mb-4 sm:mb-5 md:mb-6 lg:mb-8 px-2 sm:px-0"
            >
              <div>
                <div className="text-lg sm:text-xl md:text-2xl font-semibold text-emerald-400">200+</div>
                <div className="text-[10px] sm:text-xs md:text-sm text-gray-300">Listings</div>
              </div>
              <div>
                <div className="text-lg sm:text-xl md:text-2xl font-semibold text-emerald-400">4.9</div>
                <div className="text-[10px] sm:text-xs md:text-sm text-gray-300">Avg Rating</div>
              </div>
              <div>
                <div className="text-lg sm:text-xl md:text-2xl font-semibold text-emerald-400">1000+</div>
                <div className="text-[10px] sm:text-xs md:text-sm text-gray-300">Happy Guests</div>
              </div>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={heroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.8, delay: 1.1 }}
              className="flex flex-col sm:flex-row gap-2 sm:gap-2.5 md:gap-3 justify-center lg:justify-start px-2 sm:px-0"
            >
              <motion.div 
                // Explore Now CTA keeps any date params present
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(withDates('/homestays'))}
                className="px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 bg-emerald-600 text-white font-medium rounded-lg md:rounded-xl hover:bg-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl text-xs sm:text-sm w-full sm:w-auto"
              >
                Explore Now
              </motion.div>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/host/register')}
                className="px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 border-2 border-white text-white font-medium rounded-lg md:rounded-xl hover:bg-white/10 transition-all duration-300 backdrop-blur-sm text-xs sm:text-sm w-full sm:w-auto"
              >
                Become a Host
              </motion.button>
            </motion.div>
          </motion.div>

          {/* Right Column - Categories */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={heroInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="grid grid-cols-2 gap-2 sm:gap-2.5 md:gap-3 mt-4 sm:mt-5 md:mt-6 lg:mt-0 max-w-md mx-auto lg:max-w-none lg:mx-0"
          >
            {[
              { 
                icon: FaUmbrellaBeach, 
                title: "Beach", 
                desc: "Coastal escapes", 
                color: "text-blue-300",
                onClick: () => navigate(withDates('/homestays?category=beach'))
              },
              { 
                icon: FaCity, 
                title: "City", 
                desc: "Urban stays", 
                color: "text-purple-300",
                onClick: () => navigate(withDates('/homestays?category=city'))
              },
              { 
                icon: FaMountain, 
                title: "Countryside", 
                desc: "Nature retreats", 
                color: "text-green-300",
                onClick: () => navigate(withDates('/homestays?category=countryside'))
              },
              { 
                icon: FaUtensils, 
                title: "Services", 
                desc: "Local experiences", 
                color: "text-orange-300",
                onClick: () => navigate('/services')
              },
            ].map((category, idx) => {
              const IconComponent = category.icon;
              return (
                <motion.div
                  key={category.title}
                  initial={{ opacity: 0, y: 30 }}
                  animate={heroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                  transition={{ duration: 0.6, delay: 0.8 + idx * 0.1 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  onClick={category.onClick}
                  className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg md:rounded-xl p-2.5 sm:p-3 md:p-4 text-center hover:bg-white/15 transition-all cursor-pointer active:scale-95"
                >
                  <motion.div 
                    className={`mb-1 sm:mb-1.5 md:mb-2 flex justify-center ${category.color || "text-white"}`}
                    whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" />
                  </motion.div>
                  <div className="text-white font-medium mb-0.5 text-[11px] sm:text-xs md:text-sm">{category.title}</div>
                  <div className="text-[9px] sm:text-[10px] md:text-xs text-gray-300 leading-tight">{category.desc}</div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={heroInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 1, delay: 1.2 }}
        className="absolute bottom-3 sm:bottom-4 md:bottom-6 lg:bottom-8 left-1/2 transform -translate-x-1/2 z-10 hidden sm:block"
      >
        <motion.img
          src="/src/assets/zennest-loading-icon.svg"
          alt="Scroll"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-6 h-6 sm:w-7 sm:h-7 md:w-14 md:h-14"
        />
      </motion.div>

      {/* Wave Divider */}
      <motion.img
        src={waveSvg}
        alt="Wave divider"
        initial={{ opacity: 0, y: 8 }}
        animate={heroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
        transition={{ duration: 0.9, delay: 1.2 }}
        className="absolute left-0 w-full bottom-[-40px] sm:bottom-[-45px] md:bottom-[-50px] lg:bottom-[-65px] pointer-events-none z-40"
      />
    </motion.section>
  );
};

export default Hero;