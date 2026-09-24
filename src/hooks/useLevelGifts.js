import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, writeBatch, increment, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { getStreamId } from '../utils/levelSystem';
import toast from 'react-hot-toast';

export function useLevelGifts() {
  const { currentUser, userProfile, levelInfo } = useAuth();
  const [availableGifts, setAvailableGifts] = useState([]);
  const [claimedGifts, setClaimedGifts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser || !userProfile || !levelInfo) {
      setLoading(false);
      return;
    }

    const stream = getStreamId(userProfile.course, userProfile.level);
    
    // Fetch active gifts for this stream
    const giftsRef = collection(db, 'levelGifts');
    const qGifts = query(giftsRef, where('stream', '==', stream), where('active', '==', true));
    
    // Fetch user's claimed gifts
    const claimedRef = collection(db, 'studentGifts');
    const qClaimed = query(claimedRef, where('studentId', '==', currentUser.uid));

    let activeGiftsList = [];
    let userClaimedMap = {};

    const unsubGifts = onSnapshot(qGifts, (snapshot) => {
      activeGiftsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      processGifts();
    });

    const unsubClaimed = onSnapshot(qClaimed, (snapshot) => {
      const claimed = {};
      snapshot.forEach(doc => {
        claimed[doc.data().giftId] = doc.data();
      });
      userClaimedMap = claimed;
      setClaimedGifts(claimed);
      processGifts();
    });

    const processGifts = async () => {
      if (!activeGiftsList.length) {
        setAvailableGifts([]);
        setLoading(false);
        return;
      }

      // Sort available gifts by levelNumber
      activeGiftsList.sort((a, b) => a.levelNumber - b.levelNumber);
      setAvailableGifts(activeGiftsList);
      
      const currentLevel = levelInfo.currentLevelNumber;
      
      // Check for auto-claims
      for (const gift of activeGiftsList) {
        if (gift.levelNumber <= currentLevel && !userClaimedMap[gift.id]) {
          // Needs claiming
          try {
            const batch = writeBatch(db);
            
            // 1. Add to studentGifts
            const claimRef = doc(collection(db, 'studentGifts'));
            batch.set(claimRef, {
              studentId: currentUser.uid,
              giftId: gift.id,
              stream: gift.stream,
              levelNumber: gift.levelNumber,
              claimedAt: new Date().toISOString(),
              pointsAwarded: gift.extraPoints || 0
            });
            
            // 2. Add extra points if applicable
            if (gift.extraPoints > 0) {
              const userRef = doc(db, 'users', currentUser.uid);
              batch.update(userRef, {
                points: increment(gift.extraPoints)
              });
            }

            await batch.commit();
            
            // Preemptively add to local map so we don't double claim in quick succession
            userClaimedMap[gift.id] = { claimed: true }; 
            
            toast.success(`🎉 Level ${gift.levelNumber} Reward Unlocked: ${gift.title}!`, {
              duration: 5000,
              icon: '🎁'
            });

          } catch (err) {
            console.error('Error claiming gift:', err);
          }
        }
      }
      
      setLoading(false);
    };

    return () => {
      unsubGifts();
      unsubClaimed();
    };

  }, [currentUser, userProfile, levelInfo]);

  return { availableGifts, claimedGifts, loading };
}
