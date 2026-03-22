// Dungeon X Service Worker for PWA offline functionality
const CACHE_NAME = 'dungeon-x-v3.5.0';
const STATIC_CACHE_NAME = 'dungeon-x-static-v3.5.0';

// Files to cache for offline play
const STATIC_FILES = [
  './',
  './index.html',
  './dungeon-x-manifest.json',
  './src/main.js',
  './src/core/constants.js',
  './src/core/game-world.js',
  './src/core/prng.js',
  './src/core/event-bus.js',
  './src/core/save-manager.js',
  './src/core/energy-scheduler.js',
  './src/character/character.js',
  './src/character/class-data.js',
  './src/character/level-data.js',
  './src/party/party.js',
  './src/party/roster.js',
  './src/items/item.js',
  './src/items/item-data.js',
  './src/items/inventory.js',
  './src/items/merchant.js',
  './src/dungeon/bsp-generator.js',
  './src/dungeon/monsters.js',
  './src/dungeon/tile-map.js',
  './src/dungeon/flood-fill.js',
  './src/commands/command.js',
  './src/commands/move-command.js',
  './src/commands/interact-command.js',
  './src/ui/input-mapper.js',
  './src/ui/state-stack.js',
  './src/ui/states/tavern.js',
  './src/ui/states/tavern-exterior.js',
  './src/ui/npc-dialogue.js',
  './config/npc-dialogue.json',
  './config/notice-board.json',
  './src/ui/states/combat.js',
  './src/ui/states/character-create.js',
  './src/ui/states/dungeon-transition.js',
  './src/ui/states/level-up.js',
  './src/ui/states/exploring.js',
  './src/core/game-save.js',
  './src/render/ui-renderer.js',
  './src/render/asset-loader.js',
  './src/render/sprite-atlas.js',
  './src/render/first-person.js',
  './src/render/minimap.js',
  './src/render/animation-queue.js',
  './src/audio/sound-manager.js',
  './src/systems/leaderboard.js',
  './src/ai/ai-director.js',
  './src/combat/combat-manager.js',
  './src/combat/damage-calc.js',
  './src/fov/shadowcast.js',
  './data/monsters.json',
  './src/ui/touch-handler.js',
  './src/utils/performance-monitor.js'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Caching static files...');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('All static files cached.');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating.');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE_NAME && cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker activated.');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache first, then network
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
      .catch((error) => {
        console.log('Fetch failed:', error);
        // Could return a fallback page here
      })
  );
});

// Message event - handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
