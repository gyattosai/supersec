// Supersec Class Management - Web Push Service Worker

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || "Supersec Class Update";
  const body = data.body || "New content was published in your subject portal.";
  const icon = data.icon || "/apple-touch-icon.png";
  const badge = data.badge || "/favicon-32x32.png";
  const targetUrl = data.data?.url || data.url || data.action || "/";
  const tag = data.tag || ("supersec-notification-" + Date.now());

  const notificationOptions = {
    body,
    icon,
    badge,
    tag,
    data: {
      url: targetUrl,
      subjectId: data.data?.subjectId || data.subjectId,
      type: data.data?.type || data.type,
      timestamp: Date.now(),
    },
    vibrate: [100, 50, 100],
    renotify: true,
    requireInteraction: false,
    actions: [
      {
        action: "view",
        title: "View Now",
      },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, notificationOptions));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus();
            if ("navigate" in client) {
              return client.navigate(targetUrl);
            }
            return client;
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
