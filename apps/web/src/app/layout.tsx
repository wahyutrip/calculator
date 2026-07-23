import type { Metadata, Viewport } from 'next';
import { TopBar } from '@/components/layout/TopBar';
import { ServiceWorker } from '@/components/pwa/ServiceWorker';
import './globals.css';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://calculator.wahyutrip.com';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'Kalkulator Lot & Money Management Saham IDX',
    template: '%s · LOTSIZE',
  },
  description:
    'Hitung jumlah lot per entry dari modal, toleransi risiko, dan stop loss. Gratis, tanpa login, bisa dipakai offline.',
  applicationName: 'LOTSIZE',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'LOTSIZE' },
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: APP_URL,
    siteName: 'LOTSIZE',
    title: 'Kalkulator Lot & Money Management Saham IDX',
    description: 'Hitung lot per entry dari modal, risiko, dan stop loss. Tanpa login.',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Installed on iOS the home indicator overlaps the viewport; cover + the CSS
  // safe-area inset keeps the last row reachable.
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAFBFA' },
    { media: '(prefers-color-scheme: dark)', color: '#0E1116' },
  ],
};

/**
 * Applied before first paint. A dark-mode user seeing a white flash on every load
 * is the most visible possible bug, and it cannot be fixed after hydration.
 */
const NO_FLASH_THEME = `
(function(){try{
  var raw=localStorage.getItem('mm:prefs:v1');
  var t=raw?JSON.parse(raw).theme:'light';
  if(t==='system'||!t){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}
  document.documentElement.setAttribute('data-theme',t);
}catch(e){document.documentElement.setAttribute('data-theme','light');}})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME }} />
      </head>
      <body>
        <TopBar />
        <main className="mm-wrap">{children}</main>
        <footer className="mm-footer">
          Perhitungan bersifat edukatif, bukan rekomendasi investasi. Semua data disimpan di browser
          Anda.
        </footer>
        <ServiceWorker />
      </body>
    </html>
  );
}
