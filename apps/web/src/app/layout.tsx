import type { Metadata, Viewport } from 'next';
import '@/shared/styles/global.css';

export const metadata: Metadata = {
  // Запасной title для страниц без собственного (404 и подобные): настоящие
  // метаданные каждая публичная страница собирает из настроек (ADR-009).
  // Индексируемость решается не здесь: публичная часть закрывается noindex,
  // пока настройки не заполнены (layout группы (site), ADR-090), админка
  // закрыта всегда — своим layout и заголовком в middleware.
  title: 'Кондиционеры в Туле',
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
