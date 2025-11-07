// src/components/Hero.jsx
import React, { useState, forwardRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import waveSvg from "../assets/wave (1).svg";
import { FaSearch, FaCalendarAlt } from "react-icons/fa";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Listbox } from "@headlessui/react";
import LightRays from "./LightRays";
import BlurText from "./BlurText";

const handleAnimationComplete = () => {
  // Animation completed - no action needed
  // Removed console.log for cleaner console output
};

const Hero = () => {
  const navigate = useNavigate();
  const [checkIn, setCheckIn] = useState(null);
  const [checkOut, setCheckOut] = useState(null);

  const guestOptions = ["1 Guest", "2 Guests", "3 Guests", "4+ Guests"];
  const [selectedGuest, setSelectedGuest] = useState(guestOptions[0]);

  const [mounted, setMounted] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const videoRef = React.useRef(null);

  // Get Cloudinary configuration
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const heroVideoPublicId = import.meta.env.VITE_HERO_VIDEO_PUBLIC_ID || 'hero-video';
  
  // Construct optimized Cloudinary video URL with transformations
  const getOptimizedVideoUrl = () => {
    if (import.meta.env.VITE_HERO_VIDEO_URL) {
      return import.meta.env.VITE_HERO_VIDEO_URL;
    }
    if (!cloudName) {
      if (import.meta.env.DEV) {
        console.warn('Cloudinary cloud name not configured. Check your .env file.');
      }
      return null;
    }
    
    // Remove any existing extension from public ID if present
    const publicId = heroVideoPublicId.replace(/\.(mp4|webm|mov)$/i, '');
    
    // Try base URL first (no transformations) to verify video exists
    // If you get 404, the public ID is incorrect
    const baseUrl = `https://res.cloudinary.com/${cloudName}/video/upload/${publicId}`;
    
    // If base URL works, add transformations for optimization
    const transformations = [
      'q_auto:best',      // High quality with automatic optimization
      'w_1920',           // Full HD width
      'h_1080',           // Full HD height
      'c_fill',           // Fill area while maintaining aspect ratio
      'f_auto'            // Automatic format selection
    ].join(',');
    
    const optimizedUrl = `https://res.cloudinary.com/${cloudName}/video/upload/${transformations}/${publicId}`;
    
    // Use base URL for now (can switch to optimizedUrl if needed)
    return baseUrl;
  };

  const heroVideoUrl = getOptimizedVideoUrl();

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

  const CustomDateInput = forwardRef(
    ({ value, onClick, placeholder, className }, ref) => (
      <div className={`relative ${className || ""}`}>
        <input
          onClick={onClick}
          ref={ref}
          value={value}
          placeholder={placeholder}
          readOnly
          className="w-full p-3 rounded-lg bg-white text-gray-800 text-sm focus:ring-2 focus:ring-emerald-500 cursor-pointer placeholder-gray-400"
        />
        <FaCalendarAlt className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm pointer-events-none" />
      </div>
    )
  );


  // Generate poster image (thumbnail from first frame) for better loading experience
  const getPosterUrl = () => {
    if (!cloudName) return undefined;
    const posterTransformations = [
      'so_0',        // First frame (start offset 0)
      'q_auto:good', // Good quality for poster
      'w_1920',
      'h_1080',
      'c_fill',
      'f_jpg'        // JPG format for poster
    ].join(',');
    return `https://res.cloudinary.com/${cloudName}/video/upload/${posterTransformations}/${heroVideoPublicId}.jpg`;
  };

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
          poster={getPosterUrl()}
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
          {/* Cloudinary's f_auto will automatically serve the best format (webm/mp4) */}
          <source src={heroVideoUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      ) : (
        <div className="absolute inset-0 bg-gray-900 z-0 flex items-center justify-center">
          <p className="text-white text-sm">Video configuration missing</p>
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
      <div className="relative z-20 max-w-7xl mx-auto w-full px-4 sm:px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
        {/* Left Column */}
        <div className="flex flex-col justify-center text-white space-y-4 sm:space-y-5 md:space-y-6 order-2 lg:order-1 px-2 sm:px-0">
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

        {/* Right Column - Search Form */}
        <div
          className={`relative z-30 group overflow-hidden bg-white/20 sm:bg-white/15 backdrop-blur-md sm:backdrop-blur-sm border border-white/30 sm:border-white/20 rounded-xl p-4 sm:p-6 shadow-xl text-white transform transition-all duration-700 ease-out
            w-full max-w-md mx-auto lg:mx-0 lg:w-96 self-start justify-self-center lg:justify-self-end order-1 lg:order-2
            ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
          style={{ transitionDelay: "180ms" }}
        >
          <span className="absolute top-0 left-[-50%] h-full w-1/2 pointer-events-none shine"></span>
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Plan your journey</h2>
          <form className="space-y-3 sm:space-y-4">
            {/* Where */}
            <div>
              <label htmlFor="where" className="block text-xs font-medium text-white mb-1.5">
                Where?
              </label>
              <input
                type="text"
                id="where"
                placeholder="e.g. Palawan, Siargao"
                className="w-full p-3 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-emerald-500 text-sm placeholder-gray-400"
              />
            </div>

            {/* Check-in */}
            <div>
              <label htmlFor="checkin" className="block text-xs font-medium text-white mb-1.5">
                Check-in
              </label>
              <DatePicker
                selected={checkIn}
                onChange={(date) => setCheckIn(date)}
                dateFormat="dd/MM/yyyy"
                placeholderText="Select date"
                customInput={<CustomDateInput className="w-full" />}
                wrapperClassName="w-full"
              />
            </div>

            {/* Check-out */}
            <div>
              <label htmlFor="checkout" className="block text-xs font-medium text-white mb-1.5">
                Check-out
              </label>
              <DatePicker
                selected={checkOut}
                onChange={(date) => setCheckOut(date)}
                dateFormat="dd/MM/yyyy"
                placeholderText="Select date"
                customInput={<CustomDateInput className="w-full" />}
                wrapperClassName="w-full"
              />
            </div>

            {/* Guests */}
            <div>
              <label htmlFor="guests" className="block text-xs font-medium text-white mb-1.5">
                Who (Guests)
              </label>
              <Listbox value={selectedGuest} onChange={setSelectedGuest}>
                <div className="relative">
                  <Listbox.Button className="w-full p-3 rounded-lg bg-white text-gray-800 text-sm text-left focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                    {selectedGuest}
                  </Listbox.Button>
                  <Listbox.Options className="absolute mt-1 w-full bg-white rounded-lg shadow-xl max-h-60 overflow-auto z-50 border border-gray-200">
                    {guestOptions.map((guest, idx) => (
                      <Listbox.Option
                        key={idx}
                        value={guest}
                        className="cursor-pointer select-none p-3 text-sm text-gray-700 hover:bg-emerald-50 active:bg-emerald-100 transition-colors"
                      >
                        {guest}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </div>
              </Listbox>
            </div>

            {/* Search Button */}
            <button
              type="submit"
              className="w-full flex items-center justify-center bg-emerald-700 py-3 rounded-lg font-semibold hover:bg-emerald-800 transition transform hover:-translate-y-0.5 active:scale-95 text-sm mt-1"
            >
              <FaSearch className="mr-2" /> Search
            </button>
          </form>
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