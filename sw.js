const CACHE = 'daily-rhythm-v2';

const PRE_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './icon.svg'
];

/* ── Install: pre-cache app shell ── */
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE)
            .then(c => c.addAll(PRE_CACHE))
            .then(() => self.skipWaiting())
    );
});

/* ── Activate: clear old caches ── */
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(k => k !== CACHE).map(k => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

/* ── Fetch: cache-first for local, network-first for external (fonts) ── */
self.addEventListener('fetch', e => {
    const url = new URL(e.request.url);
    const isLocal = url.origin === self.location.origin;

    if (isLocal) {
        /* Cache first → fall back to network → cache result */
        e.respondWith(
            caches.match(e.request).then(hit => {
                if (hit) return hit;
                return fetch(e.request).then(res => {
                    if (res && res.status === 200) {
                        const clone = res.clone();
                        caches.open(CACHE).then(c => c.put(e.request, clone));
                    }
                    return res;
                });
            })
        );
    } else {
        /* Network first → fall back to cache (covers Google Fonts offline) */
        e.respondWith(
            fetch(e.request)
                .then(res => {
                    const clone = res.clone();
                    caches.open(CACHE).then(c => c.put(e.request, clone));
                    return res;
                })
                .catch(() => caches.match(e.request))
        );
    }
});
