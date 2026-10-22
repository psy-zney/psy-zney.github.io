declare const __DEPLOYMENT_VERSION__: string;
const VERSION_KEY = 'zney-deployment-version';
const RELOAD_KEY = 'zney-deployment-reload';

function read(storage: 'localStorage' | 'sessionStorage', key: string) {
  try { return window[storage].getItem(key); } catch { return null; }
}
function write(storage: 'localStorage' | 'sessionStorage', key: string, value: string) {
  try { window[storage].setItem(key, value); } catch { /* Private mode may disable persistence. */ }
}

/** Clear this website's origin caches and registrations, not user preferences. */
export async function clearWebsiteCache(base: URL) {
  const tasks: Promise<unknown>[] = [];
  if ('caches' in window) tasks.push(caches.keys().then(names => Promise.all(names.map(name => caches.delete(name)))));
  if ('serviceWorker' in navigator) tasks.push(navigator.serviceWorker.getRegistrations().then(registrations =>
    Promise.all(registrations.filter(registration => registration.scope === base.href).map(registration => registration.unregister()))));
  await Promise.allSettled(tasks);
}

async function controlAssets(base: URL, version: string) {
  if (!('serviceWorker' in navigator)) return;
  const url = new URL('deployment-worker.js', base); url.searchParams.set('v', version);
  if (navigator.serviceWorker.controller?.scriptURL === url.href) return;
  await navigator.serviceWorker.register(url, { scope: base.pathname, updateViaCache: 'none' });
  await new Promise<void>(resolve => {
    const finish = () => { clearTimeout(timer); navigator.serviceWorker.removeEventListener('controllerchange', changed); resolve(); };
    const changed = () => { if (navigator.serviceWorker.controller?.scriptURL === url.href) finish(); };
    const timer = window.setTimeout(finish, 2500);
    navigator.serviceWorker.addEventListener('controllerchange', changed); changed();
  });
}

/** Runs before React mounts. Returns false only when a fresh document is opening. */
export async function prepareDeployment(): Promise<boolean> {
  if (import.meta.env.DEV) return true;
  const base = new URL(import.meta.env.BASE_URL, document.baseURI);
  try {
    let version = __DEPLOYMENT_VERSION__;
    try {
      const check = new URL('deployment.json', base); check.searchParams.set('check', String(Date.now()));
      const response = await fetch(check, { cache: 'no-store', signal: AbortSignal.timeout(2000) });
      if (response.ok) {
        const info = await response.json();
        if (typeof info.version === 'string' && /^[a-zA-Z0-9._-]{1,128}$/.test(info.version)) version = info.version;
      }
    } catch { /* The compiled version remains usable when metadata is unavailable. */ }
    const current = new URL(location.href);
    if (version !== __DEPLOYMENT_VERSION__) {
      // A cached HTML/module can belong to the preceding deployment. Retry the
      // document once, preserving its route/query and avoiding CDN reload loops.
      if (current.searchParams.get('__deployment') === version || read('sessionStorage', RELOAD_KEY) === version) return true;
      await clearWebsiteCache(base);
      write('sessionStorage', RELOAD_KEY, version);
      current.searchParams.set('__deployment', version); location.replace(current); return false;
    }
    if (read('localStorage', VERSION_KEY) !== version) await clearWebsiteCache(base);
    // A blocked worker or offline metadata must not lock the portfolio's entry.
    let timeout = 0;
    try { await Promise.race([controlAssets(base, version), new Promise<void>(resolve => { timeout = window.setTimeout(resolve, 3000); })]); }
    finally { clearTimeout(timeout); }
    write('localStorage', VERSION_KEY, version);
    try { sessionStorage.removeItem(RELOAD_KEY); } catch { /* Optional storage. */ }
    if (current.searchParams.has('__deployment')) {
      current.searchParams.delete('__deployment'); history.replaceState(history.state, '', current);
    }
  } catch { /* Offline, disabled storage and unsupported APIs keep the site usable. */ }
  return true;
}
