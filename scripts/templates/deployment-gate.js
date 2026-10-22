// Runs independently of the entry bundle, which an old cached HTML may reference
// after its hashed JavaScript file has been removed by a newer deployment.
(() => {
  const compiledVersion = __DEPLOYMENT_VERSION__;
  try {
    const url = new URL('deployment.json', document.baseURI);
    url.searchParams.set('check', String(Date.now()));
    fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(2000) })
      .then(response => response.ok ? response.json() : null)
      .then(info => {
        if (!info || typeof info.version !== 'string' || !/^[a-zA-Z0-9._-]{1,128}$/.test(info.version) || info.version === compiledVersion) return;
        const current = new URL(location.href);
        if (current.searchParams.get('__deployment') === info.version) return;
        try {
          if (sessionStorage.getItem('zney-deployment-reload') === info.version) return;
          sessionStorage.setItem('zney-deployment-reload', info.version);
        } catch { /* The URL also guards against repeated reloads. */ }
        current.searchParams.set('__deployment', info.version);
        location.replace(current);
      }).catch(() => {});
  } catch { /* Unsupported APIs cannot prevent the normal entry bundle. */ }
})();
