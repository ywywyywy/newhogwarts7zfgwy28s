// Сервис-воркер: сайт открывается быстро и без интернета (видео не кэшируются).
const CACHE = 'hogwarts-v1';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Видео и частичные запросы браузер обрабатывает сам
  if (req.headers.has('range') || req.destination === 'video' || req.destination === 'audio' || /\.(mp4|webm|mov|m4v)$/i.test(url.pathname)) return;

  const fresh = req.mode === 'navigate' || url.pathname.endsWith('/media.json') || url.pathname.endsWith('.html');
  if (fresh) {
    // Страница и список серий: сначала сеть, без интернета — из кэша
    e.respondWith(
      fetch(req).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return r; })
        .catch(() => caches.match(req).then(r => r || caches.match('index.html')))
    );
    return;
  }
  // Остальное (иконки, шрифты): из кэша, а в фоне обновляем
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return r; }).catch(() => hit);
      return hit || net;
    })
  );
});
