// src/pages/HostMessagesPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getUserConversations, 
  subscribeToUserConversations,
  subscribeToMessages,
  sendConversationMessage,
  markConversationAsRead,
  getGuestProfile,
  getHostProfile,
  subscribeToTypingStatus,
  setTypingStatus,
  deleteMessage,
  deleteConversation
} from '../services/firestoreService';
import useAuth from '../hooks/useAuth';
import { FaEnvelope, FaPaperPlane, FaSpinner, FaMapMarkerAlt, FaTrash, FaArrowLeft } from 'react-icons/fa';

const HostMessagesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [guestProfiles, setGuestProfiles] = useState({});
  const [hostProfile, setHostProfile] = useState(null);
  const [isGuestTyping, setIsGuestTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const messageInputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fetchedProfilesRef = useRef(new Set());
  const [failedImages, setFailedImages] = useState(new Set());
  const [deletingId, setDeletingId] = useState(null);
  const [deletingConversationId, setDeletingConversationId] = useState(null);
  const [showConversationList, setShowConversationList] = useState(true);

  // Auto-scroll to bottom when messages change or someone is typing
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, isGuestTyping]);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    // Fetch host profile
    const fetchHostProfile = async () => {
      try {
        const result = await getHostProfile(user.uid);
        if (result.success && result.data) {
          setHostProfile(result.data);
        }
      } catch (error) {
        console.error('Error fetching host profile:', error);
      }
    };
    fetchHostProfile();

    // Subscribe to conversations
    const unsubscribe = subscribeToUserConversations(user.uid, 'host', async (result) => {
      if (result.success) {
        setConversations(result.data || []);
        
        // Fetch guest profiles
        const profilePromises = result.data
          ?.filter(conv => conv.guestId)
          .map(async (conv) => {
            try {
              const guestResult = await getGuestProfile(conv.guestId);
              if (guestResult.success && guestResult.data) {
                const profileData = guestResult.data;
                
                if (!profileData.firstName && !profileData.lastName) {
                  if (profileData.displayName) {
                    const nameParts = profileData.displayName.trim().split(/\s+/);
                    profileData.firstName = nameParts[0] || '';
                    profileData.lastName = nameParts.slice(1).join(' ') || '';
                  } else if (profileData.name) {
                    const nameParts = profileData.name.trim().split(/\s+/);
                    profileData.firstName = nameParts[0] || '';
                    profileData.lastName = nameParts.slice(1).join(' ') || '';
                  } else if (profileData.email) {
                    profileData.firstName = profileData.email.split('@')[0];
                    profileData.lastName = '';
                  }
                }
                
                return { guestId: conv.guestId, profile: profileData };
              }
            } catch (error) {
              console.error('Error fetching guest profile:', error);
            }
            return null;
          }) || [];

        const profileResults = await Promise.all(profilePromises);
        const profilesMap = {};
        profileResults.forEach(result => {
          if (result && result.guestId && result.profile) {
            profilesMap[result.guestId] = result.profile;
          }
        });

        if (Object.keys(profilesMap).length > 0) {
          Object.keys(profilesMap).forEach(guestId => {
            fetchedProfilesRef.current.add(guestId);
          });
          setGuestProfiles(prev => ({
            ...prev,
            ...profilesMap
          }));
        }
      }
      setLoading(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  // Subscribe to messages and typing status
  useEffect(() => {
    if (!selectedConversation?.id) return;

    const fetchGuestProfile = async () => {
      if (!selectedConversation.guestId) return;
      
      if (fetchedProfilesRef.current.has(selectedConversation.guestId)) {
        return;
      }
      
      fetchedProfilesRef.current.add(selectedConversation.guestId);
      
      try {
        const guestResult = await getGuestProfile(selectedConversation.guestId);
        if (guestResult.success && guestResult.data) {
          const profileData = guestResult.data;
          
          if (!profileData.firstName && !profileData.lastName) {
            if (profileData.displayName) {
              const nameParts = profileData.displayName.trim().split(/\s+/);
              profileData.firstName = nameParts[0] || '';
              profileData.lastName = nameParts.slice(1).join(' ') || '';
            } else if (profileData.name) {
              const nameParts = profileData.name.trim().split(/\s+/);
              profileData.firstName = nameParts[0] || '';
              profileData.lastName = nameParts.slice(1).join(' ') || '';
            } else if (profileData.email) {
              profileData.firstName = profileData.email.split('@')[0];
              profileData.lastName = '';
            }
          }
          
          setGuestProfiles(prev => ({
            ...prev,
            [selectedConversation.guestId]: profileData
          }));
        } else {
          fetchedProfilesRef.current.delete(selectedConversation.guestId);
        }
      } catch (error) {
        console.error('Error fetching guest profile:', error);
        fetchedProfilesRef.current.delete(selectedConversation.guestId);
      }
    };
    
    fetchGuestProfile();

    const unsubscribeMessages = subscribeToMessages(selectedConversation.id, (result) => {
      if (result.success) {
        setMessages(result.data || []);
        
        if (user?.uid) {
          markConversationAsRead(selectedConversation.id, user.uid);
        }
      }
    });

    const unsubscribeTyping = subscribeToTypingStatus(selectedConversation.id, user.uid, (result) => {
      if (result.success) {
        setIsGuestTyping(result.isTyping);
      }
    });

    return () => {
      if (unsubscribeMessages) unsubscribeMessages();
      if (unsubscribeTyping) unsubscribeTyping();
      setTypingStatus(selectedConversation.id, user.uid, false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [selectedConversation, user]);

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
    setMessages([]);
    if (window.innerWidth < 768) {
      setShowConversationList(false);
    }
    setTimeout(() => {
      messageInputRef.current?.focus();
    }, 300);
  };

  const handleBackToConversations = () => {
    setShowConversationList(true);
    setSelectedConversation(null);
    setMessages([]);
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim() || !selectedConversation || sending) return;

    await setTypingStatus(selectedConversation.id, user.uid, false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    setSending(true);
    try {
      const senderName = user.displayName || user.email?.split('@')[0] || 'Host';
      const result = await sendConversationMessage(
        selectedConversation.id,
        user.uid,
        senderName,
        'host',
        newMessage.trim(),
        selectedConversation.listingId,
        selectedConversation.listingTitle
      );

      if (result.success) {
        setNewMessage('');
        requestAnimationFrame(() => {
          setTimeout(() => {
            messageInputRef.current?.focus();
          }, 10);
        });
      } else {
        alert('Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
      requestAnimationFrame(() => {
        setTimeout(() => {
          messageInputRef.current?.focus();
        }, 10);
      });
    }
  };

  const handleInputChange = async (e) => {
    const value = e.target.value;
    setNewMessage(value);

    if (!selectedConversation || !user) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (value.trim().length > 0) {
      await setTypingStatus(selectedConversation.id, user.uid, true);
      
      typingTimeoutRef.current = setTimeout(async () => {
        await setTypingStatus(selectedConversation.id, user.uid, false);
        typingTimeoutRef.current = null;
      }, 2000);
    } else {
      await setTypingStatus(selectedConversation.id, user.uid, false);
    }
  };

  const formatTime = (date) => {
    if (!date) return '';
    const dateObj = date instanceof Date ? date : (date?.toDate ? date.toDate() : new Date(date));
    const now = new Date();
    const diff = now - dateObj;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return dateObj.toLocaleDateString();
  };

  const formatMessageTime = (date) => {
    if (!date) return '';
    const dateObj = date instanceof Date ? date : (date?.toDate ? date.toDate() : new Date(date));
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());

    if (messageDate.getTime() === today.getTime()) {
      return dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else {
      return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
             dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
  };

  const getGuestName = (conversation) => {
    if (!conversation?.guestId) return 'Guest';
    
    const profile = guestProfiles[conversation.guestId];
    if (!profile) return 'Guest';
    
    if (profile.firstName && profile.lastName) {
      return `${profile.firstName} ${profile.lastName}`.trim();
    }
    
    if (profile.firstName) return profile.firstName;
    if (profile.displayName) return profile.displayName;
    if (profile.name) return profile.name;
    if (profile.fullName) return profile.fullName;
    if (profile.email) return profile.email.split('@')[0];
    
    return 'Guest';
  };

  const getGuestAvatar = (conversation) => {
    if (!conversation?.guestId) return null;
    
    const profile = guestProfiles[conversation.guestId];
    if (!profile) return null;
    
    const avatarUrl = profile?.profilePicture || profile?.photoURL || profile?.photoUrl || null;
    
    if (avatarUrl && failedImages.has(avatarUrl)) {
      return null;
    }
    
    return avatarUrl;
  };

  const handleImageError = (e) => {
    const imgSrc = e.target.src;
    if (imgSrc) {
      setFailedImages(prev => new Set([...prev, imgSrc]));
    }
  };

  const handleDeleteMessage = async (messageId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this message?')) {
      return;
    }

    setDeletingId(messageId);
    try {
      const result = await deleteMessage(selectedConversation.id, messageId);
      if (!result.success) {
        alert('Failed to delete message. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Failed to delete message. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteConversation = async (conversationId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      return;
    }

    setDeletingConversationId(conversationId);
    try {
      const result = await deleteConversation(conversationId);
      if (result.success) {
        if (selectedConversation?.id === conversationId) {
          setSelectedConversation(null);
          setMessages([]);
          setShowConversationList(true);
        }
      } else {
        alert('Failed to delete conversation. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      alert('Failed to delete conversation. Please try again.');
    } finally {
      setDeletingConversationId(null);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm sm:text-base" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Loading conversations...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden">
      {/* Header - Only show when conversation list is visible OR on desktop */}
      <AnimatePresence>
        {(showConversationList || window.innerWidth >= 768) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`${!showConversationList && 'hidden md:block'} p-4 sm:p-6 bg-white border-b border-gray-200 flex-shrink-0`}
          >
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-gray-900 mb-1 sm:mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Messages
            </h1>
            <p className="text-sm sm:text-base text-gray-600" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {conversations.length > 0
                ? `${conversations.length} conversation${conversations.length === 1 ? '' : 's'}`
                : 'Guests will contact you here'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversations List */}
        <AnimatePresence mode="wait">
          {showConversationList && (
            <motion.div
              key="conversations"
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full md:w-80 lg:w-96 bg-white border-r border-gray-200 flex flex-col"
            >
              {/* Conversations Header */}
              <div className="p-3 sm:p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    <FaEnvelope className="text-emerald-600 text-lg sm:text-xl" />
                    <span className="hidden sm:inline">Conversations</span>
                    <span className="sm:hidden">{conversations.length}</span>
                  </h2>
                  <span className="hidden sm:inline text-xs sm:text-sm text-gray-600 bg-gray-200 px-2 py-1 rounded-full">
                    {conversations.length}
                  </span>
                </div>
              </div>

              {/* Conversations List */}
              <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                {conversations.length === 0 ? (
                  <div className="p-8 sm:p-12 text-center text-gray-500">
                    <FaEnvelope className="text-4xl sm:text-5xl mx-auto mb-3 text-gray-300" />
                    <p className="text-sm sm:text-base" style={{ fontFamily: 'Poppins, sans-serif' }}>No messages yet</p>
                    <p className="text-xs sm:text-sm mt-2 text-gray-400" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      Guests will contact you here
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {conversations.map((conversation, index) => {
                      const guestName = getGuestName(conversation);
                      const guestAvatar = getGuestAvatar(conversation);
                      const unreadCount = conversation.unreadCount?.[user.uid] || 0;
                      const isSelected = selectedConversation?.id === conversation.id;

                      return (
                        <motion.button
                          key={conversation.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: index * 0.03 }}
                          onClick={() => handleSelectConversation(conversation)}
                          className={`
                            w-full text-left p-3 sm:p-4 hover:bg-gray-50 active:bg-gray-100 transition-all relative group
                            ${isSelected ? 'bg-emerald-50 border-l-4 border-emerald-600' : ''}
                          `}
                        >
                          <div className="flex items-start gap-3">
                            {/* Avatar */}
                            <div className="flex-shrink-0">
                              {guestAvatar && !failedImages.has(guestAvatar) ? (
                                <img
                                  src={guestAvatar}
                                  alt={guestName}
                                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-gray-200"
                                  onError={handleImageError}
                                />
                              ) : (
                                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-semibold text-lg sm:text-xl">
                                  {guestName.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-1 gap-2">
                                <p className="font-semibold text-gray-900 truncate text-sm sm:text-base" style={{ fontFamily: 'Poppins, sans-serif' }}>
                                  {guestName}
                                </p>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {unreadCount > 0 && (
                                    <span className="bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                                      {unreadCount > 99 ? '99+' : unreadCount}
                                    </span>
                                  )}
                                  <button
                                    onClick={(e) => handleDeleteConversation(conversation.id, e)}
                                    disabled={deletingConversationId === conversation.id}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-600 transition-all rounded-lg hover:bg-red-50 active:scale-95"
                                    aria-label="Delete conversation"
                                  >
                                    {deletingConversationId === conversation.id ? (
                                      <FaSpinner className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <FaTrash className="w-4 h-4" />
                                    )}
                                  </button>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-1.5 mb-1">
                                <FaMapMarkerAlt className="text-emerald-600 text-xs flex-shrink-0" />
                                <p className="text-xs text-gray-600 truncate" style={{ fontFamily: 'Poppins, sans-serif' }}>
                                  {conversation.listingTitle}
                                </p>
                              </div>
                              
                              {conversation.lastMessage && (
                                <p className="text-xs sm:text-sm text-gray-500 truncate" style={{ fontFamily: 'Poppins, sans-serif' }}>
                                  {conversation.lastMessage}
                                </p>
                              )}
                              
                              <p className="text-xs text-gray-400 mt-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
                                {formatTime(conversation.lastMessageAt || conversation.createdAt)}
                              </p>
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Message View */}
        <AnimatePresence mode="wait">
          {(!showConversationList || window.innerWidth >= 768) && (
            <motion.div
              key="messages"
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="flex-1 flex flex-col bg-white"
            >
              {selectedConversation ? (
                <>
                  {/* Message Header */}
                  <div className="p-3 sm:p-4 border-b border-gray-200 bg-white flex-shrink-0 sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                      {/* Back Button */}
                      <button
                        onClick={handleBackToConversations}
                        className="md:hidden p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
                      >
                        <FaArrowLeft className="w-5 h-5 text-gray-600" />
                      </button>

                      {/* Avatar */}
                      {(() => {
                        const avatar = getGuestAvatar(selectedConversation);
                        const name = getGuestName(selectedConversation);
                        return avatar && !failedImages.has(avatar) ? (
                          <img
                            src={avatar}
                            alt={name}
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-gray-200"
                            onError={handleImageError}
                          />
                        ) : (
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-semibold text-base sm:text-lg">
                            {name.charAt(0).toUpperCase()}
                          </div>
                        );
                      })()}

                      {/* Guest Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate" style={{ fontFamily: 'Poppins, sans-serif' }}>
                          {getGuestName(selectedConversation)}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 truncate" style={{ fontFamily: 'Poppins, sans-serif' }}>
                          {isGuestTyping ? (
                            <span className="text-emerald-600 italic flex items-center gap-1">
                              <span className="animate-pulse">typing</span>
                              <span className="inline-flex gap-0.5">
                                <span className="w-1 h-1 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="w-1 h-1 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-1 h-1 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                              </span>
                            </span>
                          ) : (
                            selectedConversation.listingTitle
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Messages Container */}
                  <div
                    ref={messagesContainerRef}
                    className="flex-1 overflow-y-auto p-3 sm:p-4 bg-gradient-to-b from-gray-50 to-white"
                    style={{ scrollbarWidth: 'thin' }}
                  >
                    {messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center text-gray-500">
                          <FaEnvelope className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 opacity-30" />
                          <p className="text-sm sm:text-base">No messages yet</p>
                          <p className="text-xs sm:text-sm text-gray-400 mt-1">Start the conversation!</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {messages.map((message, index) => {
                          const isHost = message.senderId === user.uid;
                          const showAvatar = index === 0 || messages[index - 1].senderId !== message.senderId;
                          const showTime = index === messages.length - 1 || 
                            (messages[index + 1].senderId !== message.senderId) ||
                            ((messages[index + 1].createdAt?.getTime?.() || 0) - (message.createdAt?.getTime?.() || 0)) > 300000;

                          const guestAvatar = getGuestAvatar(selectedConversation);
                          const guestName = getGuestName(selectedConversation);

                          return (
                            <motion.div
                              key={message.id}
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              transition={{ duration: 0.15 }}
                              className={`flex ${isHost ? 'justify-end' : 'justify-start'} mb-2`}
                            >
                              <div className={`flex items-end gap-2 max-w-[85%] sm:max-w-[80%] md:max-w-[75%] ${isHost ? 'flex-row-reverse' : 'flex-row'}`}>
                                {/* Avatar */}
                                {!isHost && (
                                  <div className="flex-shrink-0">
                                    {showAvatar ? (
                                      guestAvatar && !failedImages.has(guestAvatar) ? (
                                        <img
                                          src={guestAvatar}
                                          alt={guestName}
                                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-gray-200"
                                          onError={handleImageError}
                                        />
                                      ) : (
                                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-xs sm:text-sm font-semibold border-2 border-gray-200">
                                          {guestName.charAt(0).toUpperCase()}
                                        </div>
                                      )
                                    ) : (
                                      <div className="w-8 sm:w-10" />
                                    )}
                                  </div>
                                )}

                                {/* Host Avatar */}
                                {isHost && (
                                  <div className="flex-shrink-0">
                                    {showAvatar ? (
                                      hostProfile?.profilePicture || user.photoURL ? (
                                        <img
                                          src={hostProfile?.profilePicture || user.photoURL}
                                          alt="You"
                                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-emerald-200"
                                        />
                                      ) : (
                                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white text-xs sm:text-sm font-semibold border-2 border-emerald-200">
                                          {(hostProfile?.firstName?.charAt(0) || user.displayName?.charAt(0) || user.email?.charAt(0) || 'H').toUpperCase()}
                                        </div>
                                      )
                                    ) : (
                                      <div className="w-8 sm:w-10" />
                                    )}
                                  </div>
                                )}

                                {/* Message Bubble */}
                                <div className={`relative group flex flex-col ${isHost ? 'items-end' : 'items-start'}`}>
                                  <div
                                    className={`relative px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl shadow-sm ${
                                      isHost
                                        ? 'bg-emerald-600 text-white rounded-br-sm'
                                        : 'bg-white text-gray-900 border border-gray-200 rounded-bl-sm'
                                    }`}
                                  >
                                    <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words">
                                      {message.text}
                                    </p>
                                    
                                    {/* Delete button (for host's messages) */}
                                    {isHost && (
                                      <button
                                        onClick={(e) => handleDeleteMessage(message.id, e)}
                                        disabled={deletingId === message.id}
                                        className={`
                                          absolute ${isHost ? '-left-8 sm:-left-10' : '-right-8 sm:-right-10'} 
                                          top-1/2 -translate-y-1/2
                                          opacity-0 group-hover:opacity-100 
                                          p-1.5 text-gray-400 hover:text-red-600 transition-all 
                                          bg-white rounded-full shadow-md border border-gray-200
                                          active:scale-90
                                        `}
                                        aria-label="Delete message"
                                      >
                                        {deletingId === message.id ? (
                                          <FaSpinner className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                                        ) : (
                                          <FaTrash className="w-3 h-3 sm:w-4 sm:h-4" />
                                        )}
                                      </button>
                                    )}
                                  </div>
                                  
                                  {showTime && (
                                    <span className={`text-xs text-gray-400 mt-1 px-2 ${isHost ? 'text-right' : 'text-left'}`}>
                                      {formatMessageTime(message.createdAt)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}

                        {/* Typing Indicator */}
                        {isGuestTyping && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="flex justify-start mb-2"
                          >
                            <div className="flex items-end gap-2 max-w-[70%]">
                              <div className="flex-shrink-0">
                                {(() => {
                                  const avatar = getGuestAvatar(selectedConversation);
                                  const name = getGuestName(selectedConversation);
                                  return avatar && !failedImages.has(avatar) ? (
                                    <img
                                      src={avatar}
                                      alt={name}
                                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-gray-200"
                                      onError={handleImageError}
                                    />
                                  ) : (
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-xs sm:text-sm font-semibold border-2 border-gray-200">
                                      {name.charAt(0).toUpperCase()}
                                    </div>
                                  );
                                })()}
                              </div>
                              <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Input Form */}
                  <form
                    onSubmit={handleSendMessage}
                    className="p-3 sm:p-4 border-t border-gray-200 bg-white flex-shrink-0 sticky bottom-0"
                  >
                    <div className="flex items-end gap-2 sm:gap-3">
                      <input
                        ref={messageInputRef}
                        type="text"
                        value={newMessage}
                        onChange={handleInputChange}
                        placeholder="Type a message..."
                        className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none"
                        style={{ fontFamily: 'Poppins, sans-serif' }}
                        disabled={sending}
                      />
                      <motion.button
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-3 sm:p-3.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 active:bg-emerald-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 shadow-md"
                        aria-label="Send message"
                      >
                        {sending ? (
                          <FaSpinner className="w-5 h-5 animate-spin" />
                        ) : (
                          <FaPaperPlane className="w-5 h-5" />
                        )}
                      </motion.button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500 p-4">
                  <div className="text-center">
                    <FaEnvelope className="text-5xl sm:text-6xl mx-auto mb-4 text-gray-300" />
                    <p className="text-base sm:text-lg" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      Select a conversation to view messages
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default HostMessagesPage;