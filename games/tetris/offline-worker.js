// Scope is /games/tetris/ or /en/games/tetris/; no other game's cache is touched.
const PREFIX = `tetris-canvas:${self.registration.scope}:`;
const CACHE = `${PREFIX}v1`;
const home = new URL(self.registration.scope);
const isGame = url => url.origin === home.origin && (url.pathname === home.pathname || url.pathname === home.pathname.slice(0, -1));
const isAsset = url => url.origin === home.origin && url.pathname.startsWith('/_astro/');
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  const message = event.data;
  if (message?.type !== 'cache-game' || !event.source || !isGame(new URL(event.source.url))) return;
  event.waitUntil((async () => {
    const page = new URL(message.page);
    if (!isGame(page)) return;
    const cache = await caches.open(CACHE);
    const assets = [...new Set(message.assets)].map(url => new URL(url)).filter(isAsset);
    // Only publish the offline shell after its game JS and CSS are cached.
    await Promise.all(assets.map(async url => {
      const response = await fetch(url.href);
      if (!response.ok) throw new Error('Offline asset unavailable');
      await cache.put(url.href, response);
    }));
    const response = await fetch(page.href);
    if (response.ok) await cache.put(home.href, response);
  })().catch(() => {}));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (event.request.mode === 'navigate' && isGame(url)) {
    event.respondWith((async () => {
      try { return await fetch(event.request); }
      catch {
        const cached = await (await caches.open(CACHE)).match(home.href);
        return cached || new Response('Connect once to make Tetris available offline.', {status:503});
      }
    })());
  } else if (isAsset(url)) {
    event.respondWith((async () => (await (await caches.open(CACHE)).match(event.request)) || fetch(event.request))());
  }
});
