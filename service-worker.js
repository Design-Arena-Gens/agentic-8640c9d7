const CACHE = 'aqua-buddy-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  '/manifest.webmanifest',
  '/icons/water.svg'
];
self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', (e)=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', (e)=>{
  const req = e.request;
  if(req.method !== 'GET') return;
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(resp => {
      const copy = resp.clone();
      caches.open(CACHE).then(c=> c.put(req, copy));
      return resp;
    }).catch(()=> cached))
  );
});
self.addEventListener('notificationclick', (event)=>{
  event.notification.close();
  event.waitUntil((async()=>{
    const allClients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    if(allClients.length){
      allClients[0].focus();
    } else {
      self.clients.openWindow('/');
    }
  })());
});
