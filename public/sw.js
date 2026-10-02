// Service Worker for Web Push Notifications
// CA/CMA Blueprint Platform

const CACHE_NAME = 'ca-cma-blueprint-sw-v1';

// Install event - activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate event - claim all clients
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Push Event: Fired when a push message is delivered from server/FCM
self.addEventListener('push', (event) => {
  let notificationData = {
    title: 'CA/CMA Blueprint Notification',
    body: 'You have a new update in your study dashboard.',
    icon: '/logo.png',
    badge: '/favicon.svg',
    url: '/dashboard',
    tag: 'general-announcement',
    vibrate: [200, 100, 200],
    data: {
      url: '/dashboard',
      timestamp: Date.now()
    }
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = {
        title: payload.title || notificationData.title,
        body: payload.body || payload.message || notificationData.body,
        icon: payload.icon || '/logo.png',
        badge: payload.badge || '/favicon.svg',
        tag: payload.tag || `notif_${Date.now()}`,
        vibrate: payload.vibrate || [200, 100, 200],
        renotify: true,
        data: {
          url: payload.url || payload.click_action || '/dashboard',
          targetStream: payload.targetStream || 'all',
          timestamp: Date.now()
        }
      };
    } catch (e) {
      // If not JSON, parse as text
      notificationData.body = event.data.text();
    }
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    tag: notificationData.tag,
    vibrate: notificationData.vibrate,
    renotify: true,
    requireInteraction: false,
    data: notificationData.data,
    actions: [
      { action: 'open_dashboard', title: 'Open Dashboard' },
      { action: 'close_notification', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

// Notification Click Event: Fired when user taps or clicks notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close_notification') {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url) 
    ? event.notification.data.url 
    : '/dashboard';

  // Check if browser already has an open window matching origin and focus it
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // If no open client found, open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Background Sync / Push Subscription Change event
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager.subscribe(event.oldSubscription.options)
      .then((subscription) => {
        // Broadcast new subscription to active windows to update Firestore
        return clients.matchAll({ type: 'window' }).then((windowClients) => {
          windowClients.forEach((client) => {
            client.postMessage({
              type: 'PUSH_SUBSCRIPTION_REFRESHED',
              subscription: JSON.stringify(subscription)
            });
          });
        });
      })
  );
});
