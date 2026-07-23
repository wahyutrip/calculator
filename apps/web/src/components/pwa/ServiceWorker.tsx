'use client';

import * as React from 'react';

/**
 * Registers the service worker and offers updates rather than applying them.
 *
 * skipWaiting() is deliberately NOT automatic: swapping assets under a user
 * mid-calculation can leave a page whose JS and HTML come from different builds.
 * The user picks the moment.
 */
export function ServiceWorker() {
  const [waiting, setWaiting] = React.useState<ServiceWorker | null>(null);

  React.useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    // Service workers only register on a secure origin. http://localhost counts;
    // http://192.168.x.x does NOT — see specs/features/pwa-offline.md §6.
    if (!window.isSecureContext) return;

    let reloading = false;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Guard against a reload loop: controllerchange fires again after the
      // reload if the flag is not held.
      if (reloading) return;
      reloading = true;
      window.location.reload();
    });

    void navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        if (reg.waiting) setWaiting(reg.waiting);
        reg.addEventListener('updatefound', () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              setWaiting(installing);
            }
          });
        });
      })
      .catch(() => {
        // A failed registration must never break the calculator — every feature
        // works without the service worker, it just will not run offline.
      });
  }, []);

  if (!waiting) return null;

  return (
    <div className="mm-toast" role="status">
      <span>Versi baru tersedia</span>
      <button
        type="button"
        className="mm-btn mm-btn--primary"
        style={{ minHeight: 36, padding: '8px 12px' }}
        onClick={() => waiting.postMessage({ type: 'SKIP_WAITING' })}
      >
        Muat ulang
      </button>
    </div>
  );
}
