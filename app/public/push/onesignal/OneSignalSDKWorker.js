// Service worker de OneSignal en su propio scope (push/onesignal/) para no
// pisarse con el service worker de la PWA, que controla la raíz de la app.
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js')
