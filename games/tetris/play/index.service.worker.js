// Retire the old Godot offline worker without retaining its engine cache.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('Tetris-sw-cache-')) await caches.delete(key);
    }
    await self.registration.unregister();
    for (const client of await self.clients.matchAll({type:'window'})) {
      if (new URL(client.url).pathname.startsWith('/games/tetris/play/')) await client.navigate('/games/tetris');
    }
  })());
});
