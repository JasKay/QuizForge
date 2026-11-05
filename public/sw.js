/* Buzzer PWA: cache the public shell, never cache private or live game data. */
const CACHE = "buzzer-shell-v1";
const SHELL = ["/", "/manifest.webmanifest", "/icon.svg", "/offline"];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(["/offline", "/icon.svg"])));
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/") || url.pathname.startsWith("/room") || url.pathname.startsWith("/play") || url.pathname.startsWith("/auth")) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(async () => (await caches.match("/offline")) || Response.error()));
  }
});
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data?.json() || {}; } catch {}
  event.waitUntil(self.registration.showNotification("Buzzer! — Keep your streak going", {
    body: typeof data.body === "string" ? data.body : "A few minutes of practice today can help your recall tomorrow.",
    icon: "/icon.svg",
    badge: "/icon.svg",
    tag: "buzzer-practice",
    data: { url: "/learn" }
  }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data?.url || "/learn"));
});
