// src/components/Hero.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import waveSvg from "../assets/wave (1).svg";
import heroVideo from "../assets/homestays_video.webm";
import { FaUmbrellaBeach, FaCity, FaMountain, FaUtensils } from "react-icons/fa";
import LightRays from "./LightRays";
import BlurText from "./BlurText";

const handleAnimationComplete = () => {
  // Animation completed - no action needed
  // Removed console.log for cleaner console output
};

const Hero = () => {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const videoRef = React.useRef(null);
  const [heroRef, heroInView] = useInView({
    triggerOnce: true,
    threshold: 0.2,
  });

  // Use local video from assets folder
  const heroVideoUrl = heroVideo;
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

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
    <section className="relative min-h-screen flex items-center overflow-hidden pt-20 sm:pt-16 pb-12 sm:pb-8">
      {/* Video Background */}
      {heroVideoUrl ? (
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
          preload="auto"
          onError={(e) => {
            const video = e.target;
            const error = video.error;
            let errorMessage = 'Failed to load video';
            
            if (error) {
              switch (error.code) {
                case MediaError.MEDIA_ERR_ABORTED:
                  errorMessage = 'Video loading aborted';
                  break;
                case MediaError.MEDIA_ERR_NETWORK:
                  errorMessage = 'Network error loading video';
                  break;
                case MediaError.MEDIA_ERR_DECODE:
                  errorMessage = 'Video decode error';
                  break;
                case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                  errorMessage = 'Video format not supported or URL incorrect';
                  break;
                default:
                  errorMessage = `Video error (code: ${error.code})`;
              }
              
              // Only log detailed errors in development
              if (import.meta.env.DEV) {
                console.error('Video error:', errorMessage, heroVideoUrl);
              }
            } else {
              if (import.meta.env.DEV) {
                console.error('Video error (no error code):', heroVideoUrl);
              }
            }
            
            setVideoError(errorMessage);
          }}
          onLoadedMetadata={() => {
            if (videoRef.current) {
              videoRef.current.play().catch(err => {
                if (import.meta.env.DEV) {
                  console.warn('Video autoplay prevented:', err);
                }
              });
            }
          }}
        >
          <source src={heroVideoUrl} type="video/webm" />
          Your browser does not support the video tag.
        </video>
      ) : (
        <div className="absolute inset-0 bg-gray-900 z-0 flex items-center justify-center">
          <p className="text-white text-sm">Video not found</p>
        </div>
      )}
      {videoError && (
        <div className="absolute inset-0 bg-gray-900 z-0 flex items-center justify-center">
          <p className="text-white text-sm">{videoError}</p>
        </div>
      )}
      {/* Light Rays Background */}
      <div className="absolute inset-0 z-0">
        <LightRays
          raysOrigin="top-left"
          raysColor="#fff085"
          raysSpeed={2}
          lightSpread={5}
          rayLength={5}
          followMouse={true}
          mouseInfluence={0.1}
          noiseAmount={0.1}
          distortion={0.05}
        />
      </div>

      {/* Overlay - Stronger on mobile for better text readability */}
      <div className="absolute inset-0 bg-black/20 sm:bg-black/10 z-10"></div>

      {/* Content Grid */}
      <div className="relative z-20 max-w-7xl mx-auto w-full px-4 sm:px-6 md:px-12">
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
          {/* Left Column */}
          <div className="flex flex-col justify-center text-white space-y-4 sm:space-y-5 md:space-y-6 px-2 sm:px-0">
            <BlurText
              text="Find your Sanctuary"
              delay={150}
              animateBy="words"
              direction="top"
              onAnimationComplete={handleAnimationComplete}
              className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight text-center lg:text-left px-1"
            />

            <p
              className={`text-xs xs:text-sm sm:text-base md:text-lg max-w-md mx-auto lg:mx-0 text-center lg:text-left leading-relaxed px-2 sm:px-0 transform transition-all duration-700 ease-out
                ${mounted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}`}
              style={{ transitionDelay: "220ms" }}
            >
              Discover unique stays and unforgettable experiences across the
              Philippines. From serene rest houses to vibrant city tours, find
              your perfect escape.
            </p>

            {/* Buttons */}
            <div
              className={`flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start px-2 sm:px-0 transform transition-all duration-700 ease-out
                ${mounted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3"}`}
              style={{ transitionDelay: "320ms" }}
            >
              <button className="bg-emerald-700 px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold text-xs sm:text-sm hover:bg-emerald-800 transition transform hover:-translate-y-0.5 active:scale-95">
                Explore Now
              </button>
              <button className="px-5 sm:px-6 py-2.5 sm:py-3 border border-white rounded-lg font-semibold text-xs sm:text-sm hover:bg-white/10 transition transform hover:-translate-y-0.5 active:scale-95">
                About us
              </button>
            </div>

            {/* Become a Host CTA */}
            <div
              className={`transform transition-all duration-700 ease-out text-center lg:text-left px-2 sm:px-0
                ${mounted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3"}`}
              style={{ transitionDelay: "500ms" }}
            >
              <div className="mt-4 sm:mt-6">
                <p className="text-sm sm:text-base md:text-lg font-semibold text-white leading-tight">
                  Be a part of Zennest
                </p>
                <p className="text-xs sm:text-sm text-white/80 mt-1 px-2 sm:px-0">
                  Share your space and welcome guests across the Philippines.
                </p>
                <div className="mt-3 sm:mt-3">
                  <button
                    type="button"
                    onClick={() => navigate('/host/register')}
                    className="inline-flex items-center justify-center px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg bg-white/12 backdrop-blur-sm border border-white/30 text-white text-xs sm:text-sm font-semibold hover:bg-white/20 transition shadow-sm active:scale-95"
                    aria-label="Become a host"
                  >
                    Become a host
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Categories */}
          <motion.div
            ref={heroRef}
            initial={{ opacity: 0, x: 50 }}
            animate={heroInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="grid grid-cols-2 gap-3"
          >
            {[
              { 
                icon: FaUmbrellaBeach, 
                title: "Beach", 
                desc: "Coastal escapes", 
                color: "text-blue-300",
                onClick: () => navigate('/homestays?category=beach')
              },
              { 
                icon: FaCity, 
                title: "City", 
                desc: "Urban stays", 
                color: "text-purple-300",
                onClick: () => navigate('/homestays?category=city')
              },
              { 
                icon: FaMountain, 
                title: "Countryside", 
                desc: "Nature retreats", 
                color: "text-green-300",
                onClick: () => navigate('/homestays?category=countryside')
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
                  transition={{ duration: 0.6, delay: 0.1 + idx * 0.1 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  onClick={category.onClick}
                  className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-2 sm:p-3 hover:bg-white/15 transition-all cursor-pointer flex flex-col items-center justify-center shadow-lg min-h-[50px] sm:min-h-[60px]"
                >
                  <motion.div 
                    className={`mb-3 flex justify-center ${category.color || "text-white"}`}
                    whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <IconComponent className="w-8 h-8 sm:w-9 sm:h-9" />
                  </motion.div>
                  <div className="text-white font-semibold text-sm sm:text-base mb-1">{category.title}</div>
                  <div className="text-xs text-white/90 text-center leading-tight">{category.desc}</div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>

      {/* Wave Divider */}
      <img
        src={waveSvg}
        alt="Wave divider"
        className={`absolute left-0 w-full bottom-[-50px] sm:bottom-[-65px] transform transition-all duration-900 ease-out pointer-events-none z-40
          ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        style={{ transitionDelay: "480ms" }}
      />
    </section>
  );
};

export default Hero;