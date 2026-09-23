import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { DASHBOARD_SECTIONS, DEFAULT_MAINTENANCE_MESSAGE } from '../config/dashboardSections';

export function useSectionLocks() {
  const [locks, setLocks] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const docRef = doc(db, 'systemSettings', 'sectionLocks');
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setLocks(data.locks || {});
      } else {
        setLocks({});
      }
      setLoading(false);
    }, (error) => {
      console.error('Error listening to section locks:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isSectionLocked = useCallback((sectionId) => {
    if (!sectionId) return false;
    return Boolean(locks[sectionId]?.locked);
  }, [locks]);

  const getSectionLock = useCallback((sectionId) => {
    if (!sectionId) return null;
    return locks[sectionId] || null;
  }, [locks]);

  const getMaintenanceMessage = useCallback((sectionId) => {
    if (!sectionId) return DEFAULT_MAINTENANCE_MESSAGE;
    const lockInfo = locks[sectionId];
    return lockInfo?.reason?.trim() || DEFAULT_MAINTENANCE_MESSAGE;
  }, [locks]);

  const setSectionLock = async (sectionId, locked, reason = '') => {
    const docRef = doc(db, 'systemSettings', 'sectionLocks');
    const updatedLocks = {
      ...locks,
      [sectionId]: {
        locked: Boolean(locked),
        reason: reason || (locked ? (locks[sectionId]?.reason || DEFAULT_MAINTENANCE_MESSAGE) : ''),
        updatedAt: new Date().toISOString()
      }
    };

    await setDoc(docRef, {
      locks: updatedLocks,
      lastUpdatedAt: serverTimestamp()
    }, { merge: true });
  };

  const toggleSectionLock = async (sectionId, customReason = '') => {
    const current = Boolean(locks[sectionId]?.locked);
    await setSectionLock(sectionId, !current, customReason);
  };

  const setBulkSectionLocks = async (locked, customReason = '') => {
    const docRef = doc(db, 'systemSettings', 'sectionLocks');
    const updatedLocks = { ...locks };

    DASHBOARD_SECTIONS.forEach((s) => {
      updatedLocks[s.id] = {
        locked: Boolean(locked),
        reason: customReason || (locked ? DEFAULT_MAINTENANCE_MESSAGE : ''),
        updatedAt: new Date().toISOString()
      };
    });

    await setDoc(docRef, {
      locks: updatedLocks,
      lastUpdatedAt: serverTimestamp()
    }, { merge: true });
  };

  return {
    locks,
    loading,
    isSectionLocked,
    getSectionLock,
    getMaintenanceMessage,
    setSectionLock,
    toggleSectionLock,
    setBulkSectionLocks
  };
}
