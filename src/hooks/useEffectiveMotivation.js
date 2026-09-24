import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { resolveEffectiveMotivation, isMotivationActive } from '../utils/motivationSystem';

export function useEffectiveMotivation(userProfile) {
  const [manualMotivations, setManualMotivations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ticker, setTicker] = useState(() => Date.now());

  // 1. Real-time subscription to manual motivations in Firestore
  useEffect(() => {
    try {
      const q = query(
        collection(db, 'manualMotivations'),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const items = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
          }));
          setManualMotivations(items);
          setLoading(false);
        },
        (err) => {
          console.warn('Could not fetch manual motivations with orderBy, falling back to collection listener:', err);
          // Fallback in case index is building
          const fallbackUnsub = onSnapshot(
            collection(db, 'manualMotivations'),
            (snapshot) => {
              const items = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data()
              }));
              setManualMotivations(items);
              setLoading(false);
            },
            (fallbackErr) => {
              console.error('Failed to load manual motivations:', fallbackErr);
              setLoading(false);
            }
          );
          return fallbackUnsub;
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error('Error initializing manual motivations listener:', err);
      setLoading(false);
    }
  }, []);

  // 2. High-precision ticker for real-time automatic expiration
  // Ticks every 15 seconds so as soon as 24h expires, the system seamlessly transitions
  useEffect(() => {
    const interval = setInterval(() => {
      setTicker(Date.now());
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  // 3. Resolve the active motivation with exact priority
  const effectiveMotivation = useMemo(() => {
    return resolveEffectiveMotivation(manualMotivations, userProfile, ticker);
  }, [manualMotivations, userProfile, ticker]);

  const activeMotivations = useMemo(() => {
    return manualMotivations.filter((m) => isMotivationActive(m, ticker));
  }, [manualMotivations, ticker]);

  return {
    effectiveMotivation,
    manualMotivations,
    activeMotivations,
    loading
  };
}
