import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

export const DEFAULT_WHATSAPP_NUMBER = '9509351975';
export const TRIAL_DURATION_DAYS = 12;
export const TRIAL_DURATION_MS = TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000;

// Accessible sections even after trial expiration
export const UNLOCKED_SECTIONS_AFTER_EXPIRY = ['profile', 'support', 'product', 'products'];

/**
 * Standardize phone number for WhatsApp wa.me links
 * e.g., '9509351975' -> '919509351975'
 */
export function formatWhatsAppNumberForLink(number) {
  if (!number) return '91' + DEFAULT_WHATSAPP_NUMBER;
  const digitsOnly = String(number).replace(/\D/g, '');
  if (digitsOnly.length === 10) {
    return '91' + digitsOnly;
  }
  return digitsOnly || ('91' + DEFAULT_WHATSAPP_NUMBER);
}

/**
 * Generate WhatsApp click URL with custom pre-filled message
 */
export function generateWhatsAppLink(number, message) {
  const targetNumber = formatWhatsAppNumberForLink(number);
  const encodedText = encodeURIComponent(message || 'Hello, I want to purchase Premium access.');
  return `https://wa.me/${targetNumber}?text=${encodedText}`;
}

/**
 * Helper to safely extract user registration Date
 */
export function extractUserRegistrationDate(userProfile, currentUser) {
  if (userProfile?.createdAt) {
    if (typeof userProfile.createdAt.toDate === 'function') {
      return userProfile.createdAt.toDate();
    }
    if (userProfile.createdAt.seconds) {
      return new Date(userProfile.createdAt.seconds * 1000);
    }
    const parsed = new Date(userProfile.createdAt);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  if (currentUser?.metadata?.creationTime) {
    const parsed = new Date(currentUser.metadata.creationTime);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  return new Date();
}

/**
 * Hook to manage Free Trial, Pro status, and Admin WhatsApp Number
 */
export function usePremiumAccess() {
  const { currentUser, userProfile, isAdmin } = useAuth();
  const [whatsappNumber, setWhatsappNumber] = useState(DEFAULT_WHATSAPP_NUMBER);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Subscribe to real-time Admin Premium Settings
  useEffect(() => {
    const settingsDocRef = doc(db, 'settings', 'premium');
    const unsub = onSnapshot(settingsDocRef, (snap) => {
      if (snap.exists() && snap.data()?.whatsappNumber) {
        setWhatsappNumber(String(snap.data().whatsappNumber).trim());
      } else {
        setWhatsappNumber(DEFAULT_WHATSAPP_NUMBER);
      }
      setLoadingSettings(false);
    }, (err) => {
      console.warn('Could not listen to premium settings, using default WhatsApp number:', err);
      setWhatsappNumber(DEFAULT_WHATSAPP_NUMBER);
      setLoadingSettings(false);
    });

    return () => unsub();
  }, []);

  // Update WhatsApp number in Firestore (Admin action)
  const updateWhatsappNumber = async (newNumber) => {
    const cleanNumber = String(newNumber).replace(/\D/g, '').slice(0, 15);
    if (!cleanNumber) throw new Error('Invalid WhatsApp number');

    const settingsDocRef = doc(db, 'settings', 'premium');
    await setDoc(settingsDocRef, {
      whatsappNumber: cleanNumber,
      updatedAt: serverTimestamp()
    }, { merge: true });
    setWhatsappNumber(cleanNumber);
  };

  // Helper to get WhatsApp URL with current configured number
  const getWhatsAppUrl = (message = 'Hello, I want to purchase Premium access.') => {
    return generateWhatsAppLink(whatsappNumber, message);
  };

  // Check if student completed the mandatory Name + Phone popup
  const isProfileCompleted = Boolean(
    isAdmin ||
    userProfile?.dashboardProfileCompleted ||
    (currentUser?.uid && localStorage.getItem(`dashboard_profile_completed_${currentUser.uid}`))
  );

  // Pro status from backend database
  const isPro = Boolean(userProfile?.isPro === true || userProfile?.proAccess === true);

  // Trial dates calculation
  const registrationDate = extractUserRegistrationDate(userProfile, currentUser);
  const trialEndDate = new Date(registrationDate.getTime() + TRIAL_DURATION_MS);
  const nowMs = Date.now();
  const isTrialActive = nowMs < trialEndDate.getTime();
  const isTrialExpired = !isTrialActive;

  // Days remaining in trial
  const msRemaining = Math.max(0, trialEndDate.getTime() - nowMs);
  const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

  // Optional Admin Simulator mode for previewing Trial Expired state
  const [adminSimulateExpired, setAdminSimulateExpired] = useState(() => {
    return localStorage.getItem('admin_preview_trial_expired') === 'true';
  });

  const toggleAdminSimulateExpired = () => {
    const nextVal = !adminSimulateExpired;
    setAdminSimulateExpired(nextVal);
    localStorage.setItem('admin_preview_trial_expired', String(nextVal));
  };

  const isSimulatingExpired = Boolean(isAdmin && adminSimulateExpired);

  // Determine if the trial expired message and locks can be presented:
  // MUST ONLY BE TRUE AFTER MANDATORY PROFILE POPUP IS COMPLETED!
  const canShowTrialExpiredUI = Boolean(
    isSimulatingExpired ||
    (!isAdmin && !isPro && isTrialExpired && isProfileCompleted)
  );

  // Full access flag
  const hasFullAccess = Boolean(isAdmin || isPro || (isTrialActive && isProfileCompleted));

  // Check if a specific dashboard section is allowed for this user
  const isSectionAccessible = (sectionId) => {
    if (isSimulatingExpired) {
      const normalized = (sectionId || '').toLowerCase();
      return UNLOCKED_SECTIONS_AFTER_EXPIRY.includes(normalized);
    }
    if (isAdmin || isPro) return true;
    if (!isProfileCompleted) return true; // Let them finish profile without section lock interfering
    if (isTrialActive) return true;

    // Trial is expired: Only permitted sections are accessible
    const normalized = (sectionId || '').toLowerCase();
    return UNLOCKED_SECTIONS_AFTER_EXPIRY.includes(normalized);
  };

  return {
    whatsappNumber,
    updateWhatsappNumber,
    getWhatsAppUrl,
    isPro,
    isAdmin,
    registrationDate,
    trialEndDate,
    isTrialActive,
    isTrialExpired,
    daysRemaining,
    isProfileCompleted,
    canShowTrialExpiredUI,
    hasFullAccess,
    isSectionAccessible,
    loadingSettings,
    adminSimulateExpired,
    toggleAdminSimulateExpired,
    isSimulatingExpired
  };
}

export default usePremiumAccess;
