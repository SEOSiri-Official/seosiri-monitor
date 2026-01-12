console.log("Service Worker Loaded...");

self.addEventListener("push", e => {
  const data = e.data.json();
  console.log("Push Received...");
  
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: "https://cdn-icons-png.flaticon.com/512/2344/2344062.png", // Spider Icon
    data: { url: data.url }
  });
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  // Redirect user to the report
  e.waitUntil(
    clients.openWindow(e.notification.data.url)
  );
});