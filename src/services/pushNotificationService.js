// Push Notification Service
// Handles Service Worker registration, permission requests, VAPID subscription, and Firestore sync

import { doc, setDoc, deleteDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

// Public VAPID Key: Replace this with your generated VAPID public key
// You can generate one via: npx web-push generate-payload-keys
// Or use your Firebase Cloud Messaging Web Push Certificate key (from Project Settings -> Cloud Messaging -> Web Push certificates)
export const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuNu0q6UnQvEdnKNTmG1bNJWBo';

/**
 * Convert a URL-safe Base64 string to a Uint8Array for applicationServerKey
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Hash string helper for deterministic doc IDs
 */
function hashEndpoint(endpoint) {
  let hash = 0;
  for (let i = 0; i < endpoint.length; i++) {
    hash = (hash << 5) - hash + endpoint.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Check if Web Push is supported in the current browser
 */
export function isPushNotificationSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Get current notification permission state: 'default' | 'granted' | 'denied'
 */
export function getNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Register the Service Worker
 */
export async function registerServiceWorker() {
  if (!isPushNotificationSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    await navigator.serviceWorker.ready;
    return registration;
  } catch (err) {
    console.error('Service Worker registration failed:', err);
    return null;
  }
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission() {
  if (!isPushNotificationSupported()) {
    throw new Error('Push notifications are not supported in this browser.');
  }

  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Subscribe the user device to Web Push and save subscription in Firestore
 */
export async function subscribeToPushNotifications(currentUser, userProfile) {
  if (!isPushNotificationSupported()) {
    throw new Error('Push notifications are not supported.');
  }
  if (!currentUser?.uid) {
    throw new Error('User must be logged in to subscribe to notifications.');
  }

  // 1. Request permission if not already granted
  let permission = Notification.permission;
  if (permission !== 'granted') {
    permission = await Notification.requestPermission();
  }
  if (permission !== 'granted') {
    throw new Error(permission === 'denied' ? 'PERMISSION_DENIED' : 'PERMISSION_DISMISSED');
  }

  // 2. Register Service Worker
  const registration = await registerServiceWorker();
  if (!registration) {
    throw new Error('Could not register service worker.');
  }

  // 3. Get existing subscription or create a new one
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey
    });
  }

  // 4. Save subscription into Firestore under pushSubscriptions collection
  const subJson = subscription.toJSON();
  const endpointHash = hashEndpoint(subJson.endpoint);
  const subDocId = `${currentUser.uid}_${endpointHash}`;

  const course = userProfile?.course || 'CA Foundation';
  const level = userProfile?.level || 'Foundation';
  const stream = userProfile?.stream || `${course}_${level}`;

  const payload = {
    docId: subDocId,
    uid: currentUser.uid,
    studentName: userProfile?.name || currentUser.displayName || 'Student',
    email: currentUser.email || '',
    rollNumber: userProfile?.rollNumber || '',
    course,
    level,
    stream,
    attempt: userProfile?.attempt || '',
    role: userProfile?.role || 'student',
    subscription: subJson,
    endpoint: subJson.endpoint,
    userAgent: navigator.userAgent,
    active: true,
    lastActiveAt: serverTimestamp(),
    subscribedAt: serverTimestamp()
  };

  const subDocRef = doc(db, 'pushSubscriptions', subDocId);
  await setDoc(subDocRef, payload, { merge: true });

  // Optional: Also save reference under the user's document
  try {
    const userSubRef = doc(db, 'users', currentUser.uid, 'pushSubscriptions', endpointHash);
    await setDoc(userSubRef, {
      endpoint: subJson.endpoint,
      subscribedAt: serverTimestamp(),
      active: true
    }, { merge: true });
  } catch (err) {
    // Non-critical, ignore
  }

  return { success: true, subscription: subJson };
}

/**
 * Unsubscribe current device from push notifications
 */
export async function unsubscribeFromPushNotifications(currentUser) {
  if (!isPushNotificationSupported()) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const subJson = subscription.toJSON();
      const endpointHash = hashEndpoint(subJson.endpoint);
      
      // Unsubscribe from browser push manager
      await subscription.unsubscribe();

      // Deactivate/Delete subscription in Firestore
      if (currentUser?.uid) {
        const subDocId = `${currentUser.uid}_${endpointHash}`;
        try {
          await deleteDoc(doc(db, 'pushSubscriptions', subDocId));
          await deleteDoc(doc(db, 'users', currentUser.uid, 'pushSubscriptions', endpointHash));
        } catch (e) {
          console.warn('Could not remove subscription doc:', e);
        }
      }
    }
    return { success: true };
  } catch (err) {
    console.error('Error unsubscribing from push notifications:', err);
    throw err;
  }
}

/**
 * Check if the current device is currently subscribed
 */
export async function isCurrentDeviceSubscribed() {
  if (!isPushNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return Boolean(subscription);
  } catch {
    return false;
  }
}
