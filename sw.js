// Service Worker — Second Brain
// Strategy: Network Only (no cache) + skipWaiting → อัปเดตทันทีทุกครั้งที่ deploy

const VERSION = 'v1';

// ติดตั้งทันที ไม่รอ SW เก่า
self.addEventListener('install', () => self.skipWaiting());

// เข้าควบคุม tabs ทั้งหมดทันที
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// ส่งทุก request ไป network โดยตรง (ไม่ cache เลย)
self.addEventListener('fetch', e => {
  e.respondWith(fetch(e.request));
});
