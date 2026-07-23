# Feature — PWA & Offline

The app installs to the home screen and works with no network. This is a
requirement, not a nicety: every calculation is local, so there is no honest
reason for the tool to need a connection — and Indonesian mobile data on a
commuter train is reason enough to guarantee it.

---

## 1. Manifest

`apps/web/public/manifest.webmanifest`

```jsonc
{
  "name": "Lot Sizing Calculator",
  "short_name": "LotSize",
  "description": "Hitung lot dan money management untuk saham IDX",
  "start_url": "/?source=pwa",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "background_color": "#FAFBFA",
  "theme_color": "#00AB6B",
  "lang": "id-ID",
  "categories": ["finance", "productivity"],
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "shortcuts": [
    { "name": "Kalkulator", "url": "/" },
    { "name": "Portofolio", "url": "/portfolio" }
  ]
}
```

A **maskable** icon is mandatory. Without one Android crops the square icon into
a circle and clips the artwork; the safe zone is the inner 80% diameter.

`theme_color` must be supplied per theme via `<meta name="theme-color"
media="(prefers-color-scheme: dark)">` as well — the manifest field alone leaves
the dark-mode status bar showing the light green.

`start_url` carries `?source=pwa` so installed usage is distinguishable in
analytics later, without needing analytics now.

## 2. Service worker

Hand-written, at `apps/web/public/sw.js`. No Workbox: the caching needs here are
a few dozen lines, and a build-time SW toolchain is a large dependency to carry
for that.

| Asset | Strategy | Why |
|---|---|---|
| App shell (`/`, `/portfolio`) | Stale-while-revalidate | Instant load, updates in the background |
| `/_next/static/*` | Cache-first, immutable | Content-hashed; the URL changes when the content does |
| `/data/idx-tickers.json` | Stale-while-revalidate | Must work offline; freshness is not urgent |
| `/icons/*`, fonts | Cache-first | Never change without a hash |
| `sw.js`, `manifest.webmanifest` | **Network-only** | See below |

Cache names are versioned (`mm-shell-v1`); activation deletes every cache not on
the current allow-list, so an old build's assets cannot accumulate forever.

**`sw.js` must never be cached.** A stale service worker pins a user to an old
build permanently, and no redeploy can reach them — the browser asks the cached
worker for its own update. `infra/calculator.caddy` sets
`Cache-Control: public, max-age=0, must-revalidate` on it, and the SW itself
excludes its own path from every strategy. This is the single highest-severity
mistake available in this feature.

## 3. Updates

1. New SW installs and enters `waiting`.
2. The page shows a toast: *"Versi baru tersedia"* with **Muat ulang**.
3. Tapping it posts `SKIP_WAITING`; on `controllerchange` the page reloads once.

We do **not** call `skipWaiting()` automatically. Swapping assets under a user
mid-calculation can produce a page whose JS and HTML come from different builds.
The user chooses the moment.

A reload guard flag prevents the `controllerchange` handler from looping.

## 4. Install

- Capture `beforeinstallprompt`, suppress the default banner, and show our own
  install button in the top bar.
- Hide the button when `display-mode: standalone` matches — the app is already
  installed.
- iOS Safari fires no such event. Detect iOS + not-standalone and show a short
  "Bagikan → Tambah ke Layar Utama" hint instead, once, dismissible.
- The install prompt is never shown on first paint. It appears after a
  successful calculation, when the tool has earned it.

## 5. Offline behaviour

Everything works: calculating, saving, listing, averaging, theme switching. The
only unavailable thing is a first visit.

An offline indicator appears in the top bar when `navigator.onLine` is false —
worded as reassurance, not an error: *"Offline — semua fitur tetap jalan."*

## 6. Development caveat

Service workers require a **secure origin**. `http://localhost` qualifies;
`http://192.168.x.x` does not. Testing the PWA on a real phone over the LAN
therefore requires TLS:

```bash
./scripts/start-web.sh --https
```

Without this the SW silently never registers and the install prompt never
appears — with no error in the console explaining why. This trips people up
every time; it is called out again in `specs/deployment/local-development.md`.

## 7. Tests

- Lighthouse CI: installable, PWA checks pass, mobile performance ≥ 90 — a CI
  gate, not a manual check.
- Playwright: offline after first load → the calculator still computes.
- Playwright: `sw.js` responds with a no-store/must-revalidate cache header.
- Manual, once per release: install on Android and iOS, confirm the icon is not
  clipped and the status bar colour is right in both themes.
