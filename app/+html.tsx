import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// Web-only root HTML: PWA tags + service worker registration (paths assume baseUrl "/pantry").
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="manifest" href="/pantry/manifest.json" />
        <meta name="theme-color" content="#4E8267" />
        <link rel="apple-touch-icon" href="/pantry/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Pantry" />
        <ScrollViewStyleReset />
        <script dangerouslySetInnerHTML={{ __html: "if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/pantry/sw.js'))}" }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
