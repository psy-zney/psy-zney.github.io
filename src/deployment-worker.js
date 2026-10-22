// This worker does not keep a second offline cache. Public files use the
// deployment version in their HTTP cache key, including unchanged filenames.
const deploymentRoot = new URL(self.registration.scope);
const assetFolders = self.deploymentAssetFolders;
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  try { await Promise.all((await caches.keys()).map(name => caches.delete(name))); } catch { /* Storage can be disabled. */ }
  await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== deploymentRoot.origin || !url.pathname.startsWith(deploymentRoot.pathname)) return;
  const path = url.pathname.slice(deploymentRoot.pathname.length);
  if (request.mode === 'navigate' && (path === '' || path === 'index.html')) {
    event.respondWith(fetch(new Request(request, { cache: 'no-store' })));
  } else if (path === 'deployment.json') {
    event.respondWith(fetch(new Request(request, { cache: 'no-store' })));
  } else if (assetFolders.some(folder => path.startsWith(folder)) || self.deploymentAssetFiles.includes(path)) {
    url.searchParams.set('__deploy', self.deploymentVersion);
    // A new Request cannot be constructed with mode=navigate. Preserve Range,
    // credentials and integrity for media, document downloads and modules.
    event.respondWith(fetch(new Request(url, {
      method: request.method, headers: request.headers,
      mode: request.mode === 'navigate' ? 'same-origin' : request.mode,
      credentials: request.credentials, redirect: request.redirect, cache: request.cache,
      referrer: request.referrer, referrerPolicy: request.referrerPolicy,
      integrity: request.integrity,
    })));
  }
});
