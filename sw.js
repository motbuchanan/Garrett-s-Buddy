// Garrett's Buddy - Service Worker
// Increment this version number every time you deploy a new version
// This forces all devices to fetch fresh files instead of using cache
const VERSION = 'v1.0.8';
const CACHE_NAME = 'garretts-buddy-' + VERSION;

// Files to cache for offline use
const CACHE_FILES = [
  '/',
  '/index.html'
];

// Install - cache core files
self.addEventListener('install', event => {
  console.log('[SW] Installing version:', VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CACHE_FILES);
    }).then(() => {
      // Force this service worker to become active immediately
      return self.skipWaiting();
    })
  );
});

// Activate - delete old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating version:', VERSION);
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      );
    }).then(() => {
      // Take control of all open pages immediately
      return self.clients.claim();
    })
  );
});

// Fetch - network first, fall back to cache
// This means users always get the latest version when online
self.addEventListener('fetch', event => {
  // Skip Firebase and API requests - never cache these
  if (
    event.request.url.includes('firebaseio.com') ||
    event.request.url.includes('firestore.googleapis.com') ||
    event.request.url.includes('anthropic.com') ||
    event.request.url.includes('googleapis.com') ||
    event.request.url.includes('fonts.') ||
    event.request.url.includes('emailjs.com')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // If we got a valid response, update the cache
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed - serve from cache
        return caches.match(event.request);
      })
  );
});

// Listen for skip waiting message from app
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
