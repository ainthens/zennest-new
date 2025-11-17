// src/pages/HostRewards.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getHostProfile, updateHostPoints, getHostBookings } from '../services/firestoreService';
import { collection, query, where, getDocs, orderBy, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import useAuth from '../hooks/useAuth';
import {
  FaGift,
  FaStar,
  FaTrophy,
  FaCoins,
  FaChartLine,
  FaCheckCircle,
  FaArrowUp,
  FaSpinner,
  FaTicketAlt,
  FaCopy,
  FaTimes,
  FaWallet
} from 'react-icons/fa';

const HostRewards = () => {
  const { user } = useAuth();
  const [hostProfile, setHostProfile] = useState(null);
  const [pointsHistory, setPointsHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [claimedRewards, setClaimedRewards] = useState(new Set()); // Track which rewards have been claimed
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [redeemedCode, setRedeemedCode] = useState(null); // Store the code and reward info for the modal
  const [copied, setCopied] = useState(false);
  const [rewards, setRewards] = useState([]); // Store fetched rewards from Firestore
  const [waysToEarn, setWaysToEarn] = useState([]); // Store fetched ways to earn points

  useEffect(() => {
    if (user) {
      fetchRewardsData();
      checkClaimedRewards();
      fetchRewardsFromFirestore();
      fetchWaysToEarnFromFirestore();
    }
  }, [user]);

  // Check which rewards have already been claimed
  const checkClaimedRewards = async () => {
    if (!user?.uid) return;
    
    try {
      const validCodesRef = collection(db, 'valid codes');
      const q = query(
        validCodesRef,
        where('hostId', '==', user.uid)
      );
      const querySnapshot = await getDocs(q);
      
      const claimed = new Set();
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Use reward name as identifier to track which rewards have been claimed
        if (data.reward) {
          claimed.add(data.reward);
        }
      });
      
      setClaimedRewards(claimed);
    } catch (error) {
      console.error('Error checking claimed rewards:', error);
    }
  };

  const fetchRewardsData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch host profile
      const profileResult = await getHostProfile(user.uid);
      if (profileResult.success && profileResult.data) {
        setHostProfile(profileResult.data);
      } else {
        setError('Failed to load host profile');
      }

      // Fetch points transactions
      try {
        const pointsRef = collection(db, 'pointsTransactions');
        const q = query(
          pointsRef,
          where('hostId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const history = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          history.push({ 
            id: doc.id, 
            ...data,
            createdAt: data.createdAt
          });
        });
        setPointsHistory(history);
      } catch (queryError) {
        // If index error, try without orderBy
        if (queryError.code === 'failed-precondition') {
          const pointsRef = collection(db, 'pointsTransactions');
          const q = query(
            pointsRef,
            where('hostId', '==', user.uid)
          );
          const querySnapshot = await getDocs(q);
          const history = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            history.push({ 
              id: doc.id, 
              ...data,
              createdAt: data.createdAt
            });
          });
          // Sort in memory
          history.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : (a.createdAt ? new Date(a.createdAt) : new Date(0));
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : (b.createdAt ? new Date(b.createdAt) : new Date(0));
            return dateB - dateA;
          });
          setPointsHistory(history);
        } else {
          console.error('Error fetching points history:', queryError);
        }
      }
    } catch (error) {
      console.error('Error fetching rewards data:', error);
      setError('Failed to load rewards data');
    } finally {
      setLoading(false);
    }
  };

  const points = hostProfile?.points || 0;

  // Calculate tier based on points
  const getTier = () => {
    if (points >= 10000) return { 
      name: 'Platinum', 
      bgGradient: 'from-purple-500 to-purple-700',
      icon: FaTrophy,
      nextTier: null,
      nextTierPoints: null
    };
    if (points >= 5000) return { 
      name: 'Gold', 
      bgGradient: 'from-yellow-500 to-yellow-700',
      icon: FaTrophy,
      nextTier: 'Platinum',
      nextTierPoints: 10000
    };
    if (points >= 2000) return { 
      name: 'Silver', 
      bgGradient: 'from-gray-400 to-gray-600',
      icon: FaStar,
      nextTier: 'Gold',
      nextTierPoints: 5000
    };
    return { 
      name: 'Bronze', 
      bgGradient: 'from-orange-500 to-orange-700',
      icon: FaStar,
      nextTier: 'Silver',
      nextTierPoints: 2000
    };
  };

  const tier = getTier();
  const TierIcon = tier.icon;

  const generateRandomCode = () => {
    // Generate a random alphanumeric code (8 characters)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleRedeemReward = async (reward) => {
    // Check if reward has already been claimed
    if (claimedRewards.has(reward.reward)) {
      setError('This reward has already been claimed. Each reward can only be claimed once.');
      setTimeout(() => setError(''), 5000);
      return;
    }

    if (points < reward.points) {
      setError(`You need ${reward.points - points} more points to redeem this reward`);
      setTimeout(() => setError(''), 5000);
      return;
    }

    try {
      setRedeeming(reward.points);
      setError('');
      
      // All rewards are now e-wallet codes
      const randomCode = generateRandomCode();
      
      // Save to "valid codes" collection
      const validCodesRef = collection(db, 'valid codes');
      await addDoc(validCodesRef, {
        hostId: user.uid,
        code: randomCode,
        reward: reward.reward,
        pointsCost: reward.points,
        creditValue: reward.creditValue || 0, // Store the credit value
        createdAt: serverTimestamp(),
        status: 'active',
        redeemed: false,
        redeemedAt: null,
        redeemedBy: null
      });
      
      // Deduct points
      await updateHostPoints(
        user.uid, 
        -reward.points, 
        `Redeemed: ${reward.reward}`,
        points - reward.points
      );
      
      // Refresh data and claimed rewards
      await fetchRewardsData();
      await checkClaimedRewards();
      
      // Show modal with code instead of alert
      setRedeemedCode({
        code: randomCode,
        reward: reward.reward,
        creditValue: reward.creditValue || 0
      });
      setShowCodeModal(true);
      
      setSuccess(`Successfully redeemed ${reward.reward}!`);
      setTimeout(() => setSuccess(''), 5000);
    } catch (error) {
      console.error('Error redeeming reward:', error);
      setError('Failed to redeem reward. Please try again.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setRedeeming(null);
    }
  };

  // Fetch rewards from Firestore
  const fetchRewardsFromFirestore = async () => {
    try {
      // Try to fetch from admin/rewards document
      const rewardsDocRef = doc(db, 'admin', 'rewards');
      const rewardsDoc = await getDoc(rewardsDocRef);
      
      if (rewardsDoc.exists()) {
        const data = rewardsDoc.data();
        if (data.rewards && Array.isArray(data.rewards)) {
          // Map the rewards to include icon mappings if needed
          const fetchedRewards = data.rewards.map(reward => ({
            points: reward.points || 0,
            reward: reward.reward || reward.name || 'Reward',
            type: reward.type || 'code',
            creditValue: reward.creditValue || reward.credit || 0,
            available: false // Will be calculated based on user's points
          }));
          setRewards(fetchedRewards);
          return;
        }
      }
      
      // Fallback: Try 'rewards' collection
      try {
        const rewardsCollectionRef = collection(db, 'rewards');
        const rewardsQuery = query(rewardsCollectionRef, orderBy('points', 'asc'));
        const rewardsSnapshot = await getDocs(rewardsQuery);
        
        if (!rewardsSnapshot.empty) {
          const fetchedRewards = [];
          rewardsSnapshot.forEach((doc) => {
            const data = doc.data();
            fetchedRewards.push({
              id: doc.id,
              points: data.points || 0,
              reward: data.reward || data.name || 'Reward',
              type: data.type || 'code',
              creditValue: data.creditValue || data.credit || 0,
              available: false
            });
          });
          setRewards(fetchedRewards);
          return;
        }
      } catch (collectionError) {
        console.log('Rewards collection not found, using defaults');
      }
      
      // If no rewards found in Firestore, use default rewards
      const defaultRewards = [
        { points: 30, reward: 'E-wallet Credit (₱200)', type: 'code', creditValue: 200, available: false },
        { points: 500, reward: 'E-wallet Credit (₱500)', type: 'code', creditValue: 500, available: false },
        { points: 1000, reward: 'E-wallet Credit (₱1,000)', type: 'code', creditValue: 1000, available: false },
        { points: 2000, reward: 'E-wallet Credit (₱2,000)', type: 'code', creditValue: 2000, available: false },
        { points: 2500, reward: 'E-wallet Credit (₱2,500)', type: 'code', creditValue: 2500, available: false },
        { points: 5000, reward: 'E-wallet Credit (₱5,000)', type: 'code', creditValue: 5000, available: false },
        { points: 7500, reward: 'E-wallet Credit (₱7,500)', type: 'code', creditValue: 7500, available: false },
        { points: 10000, reward: 'E-wallet Credit (₱10,000)', type: 'code', creditValue: 10000, available: false }
      ];
      setRewards(defaultRewards);
    } catch (error) {
      console.error('Error fetching rewards from Firestore:', error);
      // Use default rewards on error
      const defaultRewards = [
        { points: 30, reward: 'E-wallet Credit (₱200)', type: 'code', creditValue: 200, available: false },
        { points: 500, reward: 'E-wallet Credit (₱500)', type: 'code', creditValue: 500, available: false },
        { points: 1000, reward: 'E-wallet Credit (₱1,000)', type: 'code', creditValue: 1000, available: false },
        { points: 2000, reward: 'E-wallet Credit (₱2,000)', type: 'code', creditValue: 2000, available: false },
        { points: 2500, reward: 'E-wallet Credit (₱2,500)', type: 'code', creditValue: 2500, available: false },
        { points: 5000, reward: 'E-wallet Credit (₱5,000)', type: 'code', creditValue: 5000, available: false },
        { points: 7500, reward: 'E-wallet Credit (₱7,500)', type: 'code', creditValue: 7500, available: false },
        { points: 10000, reward: 'E-wallet Credit (₱10,000)', type: 'code', creditValue: 10000, available: false }
      ];
      setRewards(defaultRewards);
    }
  };

  // Fetch ways to earn points from Firestore
  const fetchWaysToEarnFromFirestore = async () => {
    try {
      // Try to fetch from admin/rewards document
      const rewardsDocRef = doc(db, 'admin', 'rewards');
      const rewardsDoc = await getDoc(rewardsDocRef);
      
      if (rewardsDoc.exists()) {
        const data = rewardsDoc.data();
        if (data.waysToEarn && Array.isArray(data.waysToEarn)) {
          const fetchedWaysToEarn = data.waysToEarn.map((way, index) => {
            // Map icon names to actual icon components
            const iconMap = {
              'FaCheckCircle': FaCheckCircle,
              'FaStar': FaStar,
              'FaTrophy': FaTrophy,
              'FaChartLine': FaChartLine,
              'FaArrowUp': FaArrowUp,
              'FaCoins': FaCoins
            };
            return {
              action: way.action || way.title || 'Earn Points',
              points: way.points || 0,
              icon: iconMap[way.icon] || FaCheckCircle,
              description: way.description || ''
            };
          });
          setWaysToEarn(fetchedWaysToEarn);
          return;
        }
      }
      
      // Fallback: Try 'waysToEarn' collection
      try {
        const waysToEarnRef = collection(db, 'waysToEarn');
        const waysToEarnSnapshot = await getDocs(waysToEarnRef);
        
        if (!waysToEarnSnapshot.empty) {
          const fetchedWaysToEarn = [];
          const iconMap = {
            'FaCheckCircle': FaCheckCircle,
            'FaStar': FaStar,
            'FaTrophy': FaTrophy,
            'FaChartLine': FaChartLine,
            'FaArrowUp': FaArrowUp,
            'FaCoins': FaCoins
          };
          waysToEarnSnapshot.forEach((doc) => {
            const data = doc.data();
            fetchedWaysToEarn.push({
              action: data.action || data.title || 'Earn Points',
              points: data.points || 0,
              icon: iconMap[data.icon] || FaCheckCircle,
              description: data.description || ''
            });
          });
          setWaysToEarn(fetchedWaysToEarn);
          return;
        }
      } catch (collectionError) {
        console.log('WaysToEarn collection not found, using defaults');
      }
      
      // If no ways to earn found in Firestore, use default
      const defaultWaysToEarn = [
        { action: 'Complete first booking', points: 100, icon: FaCheckCircle, description: 'Get your first confirmed booking' },
        { action: 'Publish a listing', points: 50, icon: FaCheckCircle, description: 'Publish your first listing' },
        { action: 'Receive 5-star review', points: 25, icon: FaStar, description: 'Get a 5-star rating from a guest' },
        { action: 'Complete 10 bookings', points: 250, icon: FaCheckCircle, description: 'Reach 10 confirmed bookings' },
        { action: 'Complete 50 bookings', points: 1000, icon: FaTrophy, description: 'Reach 50 confirmed bookings' },
        { action: 'Monthly active host', points: 100, icon: FaChartLine, description: 'Be active this month' },
        { action: 'Refer a host', points: 200, icon: FaArrowUp, description: 'Refer another host to join' },
        { action: 'Earn ₱10,000', points: 500, icon: FaCoins, description: 'Accumulate ₱10,000 in earnings' }
      ];
      setWaysToEarn(defaultWaysToEarn);
    } catch (error) {
      console.error('Error fetching ways to earn from Firestore:', error);
      // Use default ways to earn on error
      const defaultWaysToEarn = [
        { action: 'Complete first booking', points: 100, icon: FaCheckCircle, description: 'Get your first confirmed booking' },
        { action: 'Publish a listing', points: 50, icon: FaCheckCircle, description: 'Publish your first listing' },
        { action: 'Receive 5-star review', points: 25, icon: FaStar, description: 'Get a 5-star rating from a guest' },
        { action: 'Complete 10 bookings', points: 250, icon: FaCheckCircle, description: 'Reach 10 confirmed bookings' },
        { action: 'Complete 50 bookings', points: 1000, icon: FaTrophy, description: 'Reach 50 confirmed bookings' },
        { action: 'Monthly active host', points: 100, icon: FaChartLine, description: 'Be active this month' },
        { action: 'Refer a host', points: 200, icon: FaArrowUp, description: 'Refer another host to join' },
        { action: 'Earn ₱10,000', points: 500, icon: FaCoins, description: 'Accumulate ₱10,000 in earnings' }
      ];
      setWaysToEarn(defaultWaysToEarn);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Fallback copy failed:', err);
      }
      document.body.removeChild(textArea);
    }
  };

  // Calculate available rewards based on user's current points
  const availableRewards = useMemo(() => {
    return rewards.map(reward => ({
      ...reward,
      available: points >= reward.points
    }));
  }, [rewards, points]);


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <FaGift className="text-emerald-600" />
          Points & Rewards
        </h1>
        <p className="text-gray-600">Earn points and unlock exclusive rewards</p>
      </div>

      {/* Error Notification */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-red-50 border-l-4 border-red-500 p-4 rounded"
          >
            <p className="text-red-700 text-sm">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Notification */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded"
          >
            <p className="text-emerald-700 text-sm font-medium">{success}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Points Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl shadow-lg p-6 text-white"
        >
          <div className="flex items-center justify-between mb-4">
            <FaCoins className="text-3xl" />
            <div className="text-right">
              <p className="text-sm opacity-90">Total Points</p>
              <p className="text-4xl font-bold">{points.toLocaleString()}</p>
            </div>
          </div>
          {tier.nextTier && (
            <div className="mt-2 pt-2 border-t border-emerald-400">
              <p className="text-xs opacity-75">
                {tier.nextTierPoints - points} points to {tier.nextTier}
              </p>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`bg-gradient-to-br ${tier.bgGradient} rounded-xl shadow-lg p-6 text-white`}
        >
          <div className="flex items-center justify-between mb-4">
            <TierIcon className="text-3xl" />
            <div className="text-right">
              <p className="text-sm opacity-90">Current Tier</p>
              <p className="text-2xl font-bold">{tier.name}</p>
            </div>
          </div>
          <div className="mt-2">
            <div className="w-full bg-white bg-opacity-30 rounded-full h-2">
              <div 
                className="bg-white rounded-full h-2 transition-all"
                style={{ 
                  width: tier.nextTierPoints 
                    ? `${Math.min(100, (points / tier.nextTierPoints) * 100)}%`
                    : '100%'
                }}
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Ways to Earn */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <FaArrowUp className="text-emerald-600" />
            Ways to Earn Points
          </h2>
        </div>
        <div className="p-6">
          {waysToEarn.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FaCoins className="text-4xl mx-auto mb-4 text-gray-300" />
              <p className="font-medium">No ways to earn points available</p>
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {waysToEarn.map((way, index) => {
              const Icon = way.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Icon className="text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{way.action}</p>
                    {way.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{way.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-700">+{way.points}</p>
                    <p className="text-xs text-gray-500">points</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
          )}
        </div>
      </div>

      {/* Available Rewards */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <FaGift className="text-emerald-600" />
            Available Rewards
          </h2>
          <p className="text-sm text-gray-600 mt-1">Each reward can only be claimed once. Claim your code and redeem it on the Payments & Earnings page.</p>
        </div>
        <div className="p-6">
          {availableRewards.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FaGift className="text-4xl mx-auto mb-4 text-gray-300" />
              <p className="font-medium">No rewards available</p>
              <p className="text-sm mt-2">Rewards will be available soon!</p>
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableRewards.map((reward, index) => {
              const isClaimed = claimedRewards.has(reward.reward);
              const canClaim = reward.available && !isClaimed;
              
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`
                    p-5 rounded-lg border-2 transition-all relative
                    ${isClaimed
                      ? 'border-gray-300 bg-gray-100 opacity-60'
                      : canClaim
                      ? 'border-emerald-600 bg-emerald-50 hover:shadow-md'
                      : 'border-gray-200 bg-gray-50 opacity-75'
                    }
                  `}
                >
                  {isClaimed && (
                    <div className="absolute top-2 right-2">
                      <span className="px-2 py-1 bg-gray-600 text-white text-xs font-semibold rounded-full">
                        Claimed
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FaWallet className={`${canClaim ? 'text-emerald-600' : 'text-gray-400'}`} />
                        <p className="font-semibold text-gray-900">{reward.reward}</p>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        {reward.points.toLocaleString()} points required
                      </p>
                      <p className="text-xs text-emerald-600 font-medium mb-3">
                        Credit Value: ₱{reward.creditValue.toLocaleString()}
                      </p>
                      {isClaimed ? (
                        <div className="text-center py-2 px-4 bg-gray-200 rounded-lg">
                          <p className="text-sm text-gray-600 font-medium">
                            Already Claimed
                          </p>
                        </div>
                      ) : canClaim ? (
                        <button 
                          onClick={() => handleRedeemReward(reward)}
                          disabled={redeeming === reward.points}
                          className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {redeeming === reward.points ? (
                            <>
                              <FaSpinner className="animate-spin" />
                              Redeeming...
                            </>
                          ) : (
                            <>
                              <FaGift />
                              Redeem Now
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="text-center py-2 px-4 bg-gray-200 rounded-lg">
                          <p className="text-sm text-gray-600">
                            {reward.points - points} more points needed
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
          )}
        </div>
      </div>

      {/* Points History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Points History</h2>
        </div>
        <div className="p-6">
          {pointsHistory.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FaCoins className="text-5xl mx-auto mb-4 text-gray-300" />
              <p className="font-medium">No points history yet</p>
              <p className="text-sm mt-2">Start earning points by completing bookings and receiving reviews!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pointsHistory.map((transaction, index) => (
                <motion.div
                  key={transaction.id || index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      transaction.points > 0 ? 'bg-emerald-100' : 'bg-red-100'
                    }`}>
                      {transaction.points > 0 ? (
                        <FaArrowUp className="text-emerald-600" />
                      ) : (
                        <FaGift className="text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{transaction.reason || 'Points earned'}</p>
                      <p className="text-sm text-gray-500">
                        {(() => {
                          try {
                            if (transaction.createdAt?.toDate) {
                              return transaction.createdAt.toDate().toLocaleDateString('en-PH', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              });
                            } else if (transaction.createdAt) {
                              return new Date(transaction.createdAt).toLocaleDateString('en-PH', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              });
                            }
                            return 'Date unavailable';
                          } catch (e) {
                            return 'Date unavailable';
                          }
                        })()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-lg ${transaction.points > 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      {transaction.points > 0 ? '+' : ''}{transaction.points}
                    </p>
                    <p className="text-xs text-gray-500">Balance: {transaction.balance}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Code Redemption Modal */}
      <AnimatePresence>
        {showCodeModal && redeemedCode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowCodeModal(false);
                setRedeemedCode(null);
                setCopied(false);
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <FaGift className="text-emerald-600" />
                  Reward Redeemed!
                </h2>
                <button
                  onClick={() => {
                    setShowCodeModal(false);
                    setRedeemedCode(null);
                    setCopied(false);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>

              <div className="mb-6">
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-4 mb-4 border border-emerald-200">
                  <p className="text-sm text-emerald-700 font-medium mb-2">Reward:</p>
                  <p className="text-lg font-bold text-emerald-900">{redeemedCode.reward}</p>
                  <p className="text-sm text-emerald-600 mt-1">Credit Value: ₱{redeemedCode.creditValue.toLocaleString()}</p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Redemption Code
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-50 border-2 border-emerald-500 rounded-lg p-4">
                      <p className="text-2xl font-mono font-bold text-center text-gray-900 tracking-wider">
                        {redeemedCode.code}
                      </p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(redeemedCode.code)}
                      className={`px-4 py-4 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                        copied
                          ? 'bg-emerald-600 text-white'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700'
                      }`}
                    >
                      {copied ? (
                        <>
                          <FaCheckCircle />
                          Copied!
                        </>
                      ) : (
                        <>
                          <FaCopy />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800 mb-2 font-semibold">
                    <strong>How to use this code:</strong>
                  </p>
                  <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                    <li>Copy the code above</li>
                    <li>Go to Payments & Earnings page</li>
                    <li>Click "Claim Credit" button</li>
                    <li>Paste your code and claim your credit</li>
                  </ol>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowCodeModal(false);
                  setRedeemedCode(null);
                  setCopied(false);
                }}
                className="w-full bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <FaCheckCircle />
                Got it!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HostRewards;

