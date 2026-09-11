const CACHE_NAME = 'rawasi-pwa-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // 1. لا تعترض أي طلبات غير GET (مثل POST أو PUT أو DELETE)
  if (request.method !== 'GET') {
    return;
  }

  // 2. تجاهل بروتوكولات إضافات المتصفح وغيرها
  if (!request.url.startsWith('http')) {
    return;
  }

  const url = new URL(request.url);

  // 3. تجاوز مسارات الـ API وطلبات Supabase والـ WebSockets لتفادي أي مشاكل شبكة
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase.co')) {
    return;
  }

  // 4. استراتيجية Network First مع Catch آمن لمنع أخطاء Uncaught TypeError
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone).catch(() => {});
          });
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) {
          return cached;
        }

        if (request.headers.get('accept')?.includes('text/html')) {
          return new Response(
            '<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>غير متصل</title></head><body style="font-family:sans-serif;text-align:center;padding:50px;direction:rtl;"><h2>أنت حالياً غير متصل بالإنترنت ⚠️</h2><p>يرجى التحقق من اتصال الشبكة وإعادة المحاولة.</p></body></html>',
            {
              headers: { 'Content-Type': 'text/html; charset=utf-8' }
            }
          );
        }

        return new Response(null, { status: 504, statusText: 'Gateway Timeout' });
      })
  );
});
