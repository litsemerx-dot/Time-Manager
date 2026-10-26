import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// Оболочка веб-версии (HTML-страница, внутри которой работает приложение).
// Только для браузера: на Android и iPhone-приложении этот файл не используется.
//
// Здесь настроено то, что нужно, чтобы на iPhone можно было сделать ярлык на экран «Домой»:
// иконка, название под иконкой и запуск без адресной строки Safari.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ru">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <title>Time Manager</title>

        {/* viewport-fit=cover — приложение занимает весь экран iPhone, отступы под «чёлку» считает код */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />

        {/* Ярлык на экран «Домой» (iPhone) */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Time Manager" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="theme-color" content="#208AEF" />
        <link rel="manifest" href="/manifest.json" />

        {/* Нужно, чтобы прокрутка и высота экрана в React Native Web работали как в приложении */}
        <ScrollViewStyleReset />

        {/* Фон страницы совпадает с фоном приложения, чтобы не мелькал белый экран в тёмной теме */}
        <style dangerouslySetInnerHTML={{ __html: pageStyles }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const pageStyles = `
body {
  background-color: #ffffff;
  -webkit-text-size-adjust: 100%;
  -webkit-tap-highlight-color: transparent;
  overscroll-behavior: none;
}
@media (prefers-color-scheme: dark) {
  body {
    background-color: #000000;
  }
}
`;
