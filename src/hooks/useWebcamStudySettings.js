import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

const DEFAULT_SETTINGS = {
  active: true,
  meetLink: '',
  roomTitle: 'CA/CMA Focus Study Room',
  roomDescription: 'Join the live study room and study together with other students.',
  updatedAt: null
};

export function useWebcamStudySettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'systemSettings', 'webcamStudy'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSettings({
          active: data.active !== false,
          meetLink: data.meetLink || '',
          roomTitle: data.roomTitle || DEFAULT_SETTINGS.roomTitle,
          roomDescription: data.roomDescription || DEFAULT_SETTINGS.roomDescription,
          updatedAt: data.updatedAt || null
        });
      } else {
        setSettings(DEFAULT_SETTINGS);
      }
      setLoading(false);
    }, (err) => {
      console.warn("Could not load webcam study settings:", err);
      setSettings(DEFAULT_SETTINGS);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const saveSettings = async (newSettings) => {
    const docRef = doc(db, 'systemSettings', 'webcamStudy');
    await setDoc(docRef, {
      ...newSettings,
      updatedAt: serverTimestamp()
    }, { merge: true });
  };

  return {
    settings,
    loading,
    saveSettings,
    isWebcamStudyActive: Boolean(settings.active && settings.meetLink?.trim())
  };
}
