// Service Worker - 推播通知已停用，僅保留基本生命週期
self.addEventListener('install', e => e.waitUntil(self.skipWaiting()));
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
