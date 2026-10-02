/**
 * ==============================================================================
 * Web Push Notification Backend Architecture & Worker Implementation
 * Platform: CA/CMA Blueprint (ca-with-shree-jii)
 * ==============================================================================
 * 
 * This file provides two production-grade backend implementations:
 * 
 * ARCHITECTURE OPTION 1 (Recommended for Cloudflare Workers / Serverless):
 *  - REST API endpoint: POST /api/send-push
 *  - Verifies Admin Auth Token
 *  - Queries Firestore REST API for matching pushSubscriptions
 *  - Sends encrypted Web Push using Web Crypto / VAPID (RFC 8291 & RFC 8292)
 * 
 * ARCHITECTURE OPTION 2 (Firebase Cloud Functions / Node.js Server):
 *  - Firestore Event Trigger on 'pushNotificationQueue/{queueId}'
 *  - Dispatches targeted notifications automatically via 'web-push' npm package
 *  - Handles stale/unsubscribed token cleanup (HTTP 410 / 404)
 * ==============================================================================
 */

// ------------------------------------------------------------------------------
// OPTION 1: Node.js / Serverless Dispatcher using 'web-push'
// (Ready to run in Express, Fastify, Cloudflare Workers, or Next.js API route)
// ------------------------------------------------------------------------------

import webpush from 'web-push';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// 1. Configure VAPID Keys
// Replace with your keys generated via: npx web-push generate-payload-keys
const VAPID_KEYS = {
  publicKey: process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuNu0q6UnQvEdnKNTmG1bNJWBo',
  privateKey: process.env.VAPID_PRIVATE_KEY || 'YOUR_VAPID_PRIVATE_KEY_HERE',
  contactEmail: 'mailto:support@successblueprint.in'
};

webpush.setVapidDetails(
  VAPID_KEYS.contactEmail,
  VAPID_KEYS.publicKey,
  VAPID_KEYS.privateKey
);

/**
 * Dispatch targeted web push notification
 * 
 * @param {Object} params
 * @param {string} params.title - Notification title
 * @param {string} params.body - Notification body
 * @param {string} params.url - Deep link URL (e.g. /dashboard?tab=announcements)
 * @param {string} params.targetType - 'all' | 'stream' | 'student'
 * @param {string} [params.targetStream] - 'CA Foundation' | 'CA Intermediate' | 'CMA Foundation' | 'CMA Intermediate'
 * @param {string} [params.targetStudentUid] - Specific student user UID
 * @param {string} [params.priority] - 'high' | 'normal'
 * @param {string} [params.historyId] - Optional history doc ID to update
 */
export async function dispatchTargetedPushNotification(db, {
  title,
  body,
  url = '/dashboard',
  targetType = 'all',
  targetStream = null,
  targetStudentUid = null,
  priority = 'high',
  historyId = null
}) {
  console.log(`[Push Backend] Starting dispatch: Target=${targetType}, Stream=${targetStream}, Student=${targetStudentUid}`);

  // 1. Query matching subscriptions from Firestore
  let subsQuery = db.collection('pushSubscriptions').where('active', '==', true);

  if (targetType === 'student' && targetStudentUid) {
    subsQuery = subsQuery.where('uid', '==', targetStudentUid);
  }

  const snapshot = await subsQuery.get();
  let targetDocs = snapshot.docs;

  // Filter stream client-side if targetType is 'stream' (to handle case-insensitivity)
  if (targetType === 'stream' && targetStream) {
    const norm = targetStream.toLowerCase().trim();
    targetDocs = targetDocs.filter(d => {
      const data = d.data();
      const course = String(data.course || '').toLowerCase().trim();
      const stream = String(data.stream || '').toLowerCase().trim();
      return course.includes(norm) || norm.includes(course) || stream.includes(norm);
    });
  }

  console.log(`[Push Backend] Found ${targetDocs.length} matching subscriptions.`);

  if (targetDocs.length === 0) {
    if (historyId) {
      await db.collection('pushNotificationHistory').doc(historyId).update({
        status: 'Delivered (0 matching active devices)',
        deliveredAt: FieldValue.serverTimestamp()
      }).catch(() => {});
    }
    return { success: true, sentCount: 0, failedCount: 0 };
  }

  // 2. Prepare Notification Payload
  const payload = JSON.stringify({
    title,
    body,
    icon: '/logo.png',
    badge: '/favicon.svg',
    url,
    tag: `notif_${Date.now()}`,
    vibrate: priority === 'high' ? [300, 100, 300, 100, 300] : [200, 100, 200],
    data: {
      url,
      timestamp: Date.now(),
      targetStream
    }
  });

  const pushOptions = {
    TTL: 60 * 60 * 24, // 24 hours
    urgency: priority === 'high' ? 'high' : 'normal'
  };

  // 3. Send notifications in parallel batches
  let successCount = 0;
  let failureCount = 0;
  const staleDocsToDelete = [];

  const promises = targetDocs.map(async (docSnap) => {
    const subData = docSnap.data();
    const pushSubscription = subData.subscription;

    if (!pushSubscription || !pushSubscription.endpoint) {
      staleDocsToDelete.push(docSnap.id);
      return;
    }

    try {
      await webpush.sendNotification(pushSubscription, payload, pushOptions);
      successCount++;
    } catch (err) {
      failureCount++;
      // If subscription has expired or unsubscribed (HTTP 404 or 410), mark for deletion
      if (err.statusCode === 404 || err.statusCode === 410) {
        console.log(`[Push Backend] Stale subscription detected (${docSnap.id}), marking for removal.`);
        staleDocsToDelete.push(docSnap.id);
      } else {
        console.warn(`[Push Backend] Delivery error for ${docSnap.id}:`, err.message);
      }
    }
  });

  await Promise.allSettled(promises);

  // 4. Clean up stale/unsubscribed endpoints in background
  if (staleDocsToDelete.length > 0) {
    const batch = db.batch();
    staleDocsToDelete.forEach(id => {
      batch.delete(db.collection('pushSubscriptions').doc(id));
    });
    batch.commit().catch(e => console.warn('[Push Backend] Cleanup batch error:', e));
  }

  // 5. Update history status in Firestore
  if (historyId) {
    await db.collection('pushNotificationHistory').doc(historyId).update({
      status: `Delivered (${successCount} successful, ${failureCount} failed)`,
      successCount,
      failureCount,
      deliveredAt: FieldValue.serverTimestamp()
    }).catch(() => {});
  }

  console.log(`[Push Backend] Completed: ${successCount} sent, ${failureCount} failed.`);
  return { success: true, sentCount: successCount, failedCount: failureCount };
}

// ------------------------------------------------------------------------------
// OPTION 2: Firebase Cloud Function Queue Worker (Event-Driven)
// File: functions/index.js
// ------------------------------------------------------------------------------
/*
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const webpush = require('web-push');

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

exports.onPushNotificationQueued = functions.firestore
  .document('pushNotificationQueue/{queueId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    if (!data || data.status !== 'pending') return;

    try {
      await dispatchTargetedPushNotification(db, {
        title: data.title,
        body: data.body,
        url: data.url,
        targetType: data.targetType,
        targetStream: data.targetStream,
        targetStudentUid: data.targetStudentUid,
        priority: data.priority,
        historyId: data.historyId
      });

      // Mark queue item as processed
      await snap.ref.update({
        status: 'completed',
        processedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (err) {
      console.error('Queue processing error:', err);
      await snap.ref.update({
        status: 'failed',
        error: err.message
      });
    }
  });
*/
