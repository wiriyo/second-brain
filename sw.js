// Service Worker — Second Brain
// ทำหน้าที่แค่ให้ app "ติดตั้งได้" เท่านั้น ไม่ intercept request ใด ๆ
// → browser โหลดไฟล์จาก network ตามปกติ, อัปเดตเห็นทันทีทุก deploy

// ติดตั้งทันที ไม่รอ SW เก่า
self.addEventListener('install', () => self.skipWaiting());

// เข้าควบคุม tabs ทั้งหมดทันที
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
