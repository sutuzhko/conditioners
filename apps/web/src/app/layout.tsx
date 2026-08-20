import type { Metadata, Viewport } from 'next';
import '@/shared/styles/global.css';

export const metadata: Metadata = {
  // Настоящие title и description придут из настроек компании (ADR-009).
  // Здесь — минимум, пока раздел «Компания» не заполнен.
  title: 'Кондиционеры в Туле',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1220' },
  ],
};

// Тема выбирается до первого кадра: иначе пользователь с тёмной темой
// увидит вспышку светлой (docs/DESIGN_BRIEF.md §2).
const themeScript = `
try {
  var t = localStorage.getItem('tk-theme')
    || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', t);
} catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link
          rel="preload"
          href="/fonts/Manrope-400-cyrillic.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/Onest-700-cyrillic.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
