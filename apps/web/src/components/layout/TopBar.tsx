'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';
import { readPrefs, writePrefs } from '@/lib/prefs';

type Theme = 'light' | 'dark';

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0E1116' : '#FAFBFA');
}

function ThemeToggle() {
  const [theme, setTheme] = React.useState<Theme>('light');

  React.useEffect(() => {
    const stored = readPrefs().theme;
    const resolved: Theme =
      stored === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : stored;
    setTheme(resolved);
  }, []);

  return (
    <button
      type="button"
      className="mm-btn mm-btn--ghost"
      aria-label={theme === 'dark' ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'}
      onClick={() => {
        const next: Theme = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        applyTheme(next);
        writePrefs({ theme: next });
      }}
    >
      <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
    </button>
  );
}

function InstallButton() {
  const [prompt, setPrompt] = React.useState<Event | null>(null);
  const [installed, setInstalled] = React.useState(false);

  React.useEffect(() => {
    // Already installed — no button to show.
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }
    function onPrompt(e: Event) {
      e.preventDefault(); // suppress the browser's own banner; we place our own
      setPrompt(e);
    }
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', () => setInstalled(true));
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (installed || !prompt) return null;

  return (
    <button
      type="button"
      className="mm-btn"
      onClick={async () => {
        const p = prompt as Event & { prompt?: () => Promise<void> };
        await p.prompt?.();
        setPrompt(null);
      }}
    >
      Install
    </button>
  );
}

function OfflineBadge() {
  const [offline, setOffline] = React.useState(false);

  React.useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  if (!offline) return null;
  // Worded as reassurance, not an error — everything genuinely still works.
  return <span className="mm-badge mm-badge--bull">Offline — semua fitur tetap jalan</span>;
}

export function TopBar() {
  const pathname = usePathname();
  return (
    <header className="mm-topbar">
      <div className="mm-topbar-inner">
        <Link href="/" className="mm-logo">
          <span className="mm-logo-mark" aria-hidden="true" />
          LOTSIZE
        </Link>
        <nav className="mm-nav" aria-label="Utama">
          <Link href="/" aria-current={pathname === '/' ? 'page' : undefined}>
            Kalkulator
          </Link>
          <Link href="/portfolio" aria-current={pathname === '/portfolio' ? 'page' : undefined}>
            Portofolio
          </Link>
        </nav>
        <div className="mm-topbar-actions">
          <OfflineBadge />
          <InstallButton />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
