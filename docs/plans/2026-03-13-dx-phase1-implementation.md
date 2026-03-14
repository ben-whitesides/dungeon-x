# Dungeon X Phase 1: Foundation — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the playable foundation of Dungeon X — a first-person dungeon crawler (Dungeon Master / Wizardry inspired) with real 16-bit pixel art, BSP-generated dungeon, FOV, grid movement, and a minimap. No combat yet (Phase 2). This phase ends when you can walk through a procedurally generated dungeon in first-person view with actual sprite art and fog of war.

**Architecture:** Three-layer separation — World (pure data), Renderer (Canvas 2D views), Controller (input → commands). No game engine. Raw Canvas 2D with layered canvases. ES modules bundled via a single `<script type="module">` entry point. Turn-based: only render when state changes.

**Tech Stack:** Vanilla JavaScript (ES modules), HTML5 Canvas 2D, CSS for canvas stacking. No frameworks, no bundler, no npm. Browser-native module loading.

**Key Design Docs (READ THESE FIRST):**
- `docs/plans/2026-03-13-dx-rewrite-design.md` — Full architecture and system design
- `docs/dungeon-x-game-bible.md` — Game design, lore, classes, items, spells
- `docs/2026-03-08-dungeon-x-design.md` — Original design document
- `assets/MANIFEST.md` — All 12 asset packs with exact paths

**Asset Paths (verified on disk):**
- Heroine Dusk first-person tiles: `assets/walls-floors/heroine-dusk/tiles/first person dungeon crawl tiles/`
  - `dungeon_wall.png`, `dungeon_floor.png`, `dungeon_ceiling.png`, `dungeon_door.png`, `locked_door.png`, `pillar_interior.png`, `pillar_exterior.png`, `chest_interior.png`, `chest_exterior.png`, etc. (23 tiles, 640x120 px each)
- Heroine Dusk enemies: `assets/walls-floors/heroine-dusk/enemies/` AND `assets/monsters/heroine-dusk-enemies/` (skeleton3.png, zombie2.png, imp2.png, goblin2.png, druid2.png, etc.)
- Heroine Dusk interface: `assets/walls-floors/heroine-dusk/interface/first person dungeon crawl interface/`
- Kyrise 16x16 icons: `assets/items/kyrise-icons/Kyrise's 16x16 RPG Icon Pack - V1.2/icons/16x16/` (904 PNGs — potions, swords, armor, scrolls, etc.)
- DCSS 32x32 tiles: `assets/monsters/dcss/Dungeon Crawl Stone Soup Full/` (monster/, player/, item/, dungeon/, gui/ subdirs)
- Kenney roguelike: `assets/walls-floors/kenney/Spritesheet/roguelikeDungeon_transparent.png`
- Kenney tiny dungeon: `assets/walls-floors/kenney-tiny/Tiles/` (132 individual PNGs), `assets/walls-floors/kenney-tiny/Tilemap/`
- Flare portraits: `assets/portraits/flare/FlareMaleHero1.png` through `FlareMaleHero3.png`, `FlareFemaleHero1.png` through `FlareFemaleHero3.png`
- Protagonist paper-doll layers: `assets/portraits/protagonist/`
- Object tiles: `assets/objects/`

---

## Task 1: Project Scaffolding

**Files:**
- Create: `src/main.js`
- Create: `src/core/constants.js`
- Create: `index.html`
- Delete: Nothing (existing builds in `builds/` are preserved for reference)

**Step 1: Create `index.html`**

The single HTML file. Canvas container, module entry point, nothing else.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>Dungeon X</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
    #game-container {
      position: relative;
      width: 100vw;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #game-viewport {
      position: relative;
      width: 800px;
      height: 600px;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
    }
    #game-viewport canvas {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
    }
    /* Responsive scaling */
    @media (max-width: 800px) {
      #game-viewport { width: 100vw; height: 75vw; }
    }
  </style>
</head>
<body>
  <div id="game-container">
    <div id="game-viewport"></div>
  </div>
  <script type="module" src="src/main.js"></script>
</body>
</html>
```

**Step 2: Create `src/core/constants.js`**

Game-wide constants. Single source of truth for tile sizes, directions, canvas dimensions.

```javascript
// Canvas dimensions (internal resolution, CSS scales to viewport)
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

// Dungeon grid
export const TILE_SIZE = 32;           // Minimap tile size
export const DUNGEON_WIDTH = 40;       // Tiles wide
export const DUNGEON_HEIGHT = 30;      // Tiles tall

// Tile types
export const TILE = Object.freeze({
  VOID:   0,
  WALL:   1,
  FLOOR:  2,
  DOOR:   3,
  STAIRS_DOWN: 4,
  STAIRS_UP:   5,
  CHEST:  6,
});

// Cardinal directions (for player facing)
export const DIR = Object.freeze({
  NORTH: 0,
  EAST:  1,
  SOUTH: 2,
  WEST:  3,
});

// Direction vectors [dx, dy] indexed by DIR
export const DIR_VECTOR = Object.freeze([
  [0, -1],  // NORTH
  [1,  0],  // EAST
  [0,  1],  // SOUTH
  [-1, 0],  // WEST
]);

// Canvas layer names (bottom to top)
export const LAYERS = Object.freeze([
  'floor',
  'objects',
  'entities',
  'effects',
  'fog',
  'ui',
]);

// FOV
export const FOV_RADIUS = 8;

// First-person view dimensions (within the 800x600 canvas)
export const FP_VIEW = Object.freeze({
  x: 0,
  y: 0,
  width: 600,
  height: 450,
});

// Minimap dimensions
export const MINIMAP = Object.freeze({
  x: 610,
  y: 10,
  width: 180,
  height: 180,
  tileSize: 4,  // Pixels per tile on minimap
});
```

**Step 3: Create `src/main.js`**

Boot sequence stub. Just verifies the module system works and creates the canvas stack.

```javascript
import { CANVAS_WIDTH, CANVAS_HEIGHT, LAYERS } from './core/constants.js';

function createCanvasStack(container) {
  const canvases = {};
  for (const name of LAYERS) {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    canvas.dataset.layer = name;
    container.appendChild(canvas);
    canvases[name] = canvas.getContext('2d');
  }
  return canvases;
}

function boot() {
  const viewport = document.getElementById('game-viewport');
  const layers = createCanvasStack(viewport);

  // Smoke test: draw on the UI layer
  const ui = layers.ui;
  ui.fillStyle = '#0f0';
  ui.font = '16px monospace';
  ui.fillText('Dungeon X — Engine Loaded', 20, 30);

  console.log('Dungeon X booted. Layers:', Object.keys(layers).join(', '));
}

document.addEventListener('DOMContentLoaded', boot);
```

**Step 4: Test in browser**

Run: Open `index.html` in browser (use a local server: `npx serve .` from project root)
Expected: Black screen with green text "Dungeon X — Engine Loaded" in top-left. Console shows layer names. No errors.

**Step 5: Commit**

```bash
git init
git add index.html src/main.js src/core/constants.js
git commit -m "feat: project scaffolding — canvas stack, constants, module entry point"
```

---

## Task 2: Seeded PRNG

**Files:**
- Create: `src/core/prng.js`

**Step 1: Implement Mulberry32 PRNG**

Deterministic PRNG seeded from any integer. Same seed = same dungeon. This is the foundation for daily seeds and reproducible generation.

```javascript
/**
 * Mulberry32 — fast 32-bit seeded PRNG
 * Same seed always produces same sequence.
 */
export function createPRNG(seed) {
  let s = seed | 0;

  function next() {
    s |= 0;
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function nextInt(min, max) {
    return min + Math.floor(next() * (max - min + 1));
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /**
   * Convert a string to a seed integer (djb2 hash)
   */
  function hashString(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
    }
    return hash;
  }

  return { next, nextInt, shuffle, seed: s, hashString };
}

/**
 * Create a daily-seeded PRNG from today's date
 */
export function createDailyPRNG() {
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  const seed = createPRNG(0).hashString(dateStr);
  return createPRNG(seed);
}
```

**Step 2: Verify determinism**

Open browser console, run:
```javascript
import { createPRNG } from './src/core/prng.js';
const a = createPRNG(42);
const b = createPRNG(42);
console.log(a.next() === b.next()); // true
console.log(a.nextInt(1, 100) === b.nextInt(1, 100)); // true
```
Expected: Both `true`.

**Step 3: Commit**

```bash
git add src/core/prng.js
git commit -m "feat: Mulberry32 seeded PRNG with daily seed support"
```

---

## Task 3: Event Bus

**Files:**
- Create: `src/core/event-bus.js`

**Step 1: Implement the observer pattern**

Decoupled game events. Systems emit events, other systems listen. No direct coupling.

```javascript
export class EventBus {
  constructor() {
    this._listeners = new Map();
  }

  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    const cbs = this._listeners.get(event);
    if (!cbs) return;
    const idx = cbs.indexOf(callback);
    if (idx !== -1) cbs.splice(idx, 1);
  }

  emit(event, data) {
    const cbs = this._listeners.get(event);
    if (!cbs) return;
    for (const cb of cbs) {
      cb(data);
    }
  }

  clear() {
    this._listeners.clear();
  }
}
```

**Step 2: Commit**

```bash
git add src/core/event-bus.js
git commit -m "feat: EventBus — decoupled observer pattern for game events"
```

---

## Task 4: Tile Map and BSP Dungeon Generation

**Files:**
- Create: `src/dungeon/tile-map.js`
- Create: `src/dungeon/bsp-generator.js`
- Create: `src/dungeon/flood-fill.js`

**Step 1: Create `src/dungeon/tile-map.js`**

The 2D grid data structure. Pure data, no rendering.

```javascript
import { TILE } from '../core/constants.js';

export class TileMap {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    // Flat Uint8Array for cache-friendly access
    this.tiles = new Uint8Array(width * height);
    this.tiles.fill(TILE.WALL);
    // Visibility: 0=unseen, 1=seen-not-visible, 2=visible
    this.visibility = new Uint8Array(width * height);
    // Rooms list (for spawning, loot placement)
    this.rooms = [];
  }

  get(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return TILE.VOID;
    return this.tiles[y * this.width + x];
  }

  set(x, y, tile) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    this.tiles[y * this.width + x] = tile;
  }

  isWalkable(x, y) {
    const t = this.get(x, y);
    return t === TILE.FLOOR || t === TILE.DOOR || t === TILE.STAIRS_DOWN || t === TILE.STAIRS_UP;
  }

  isOpaque(x, y) {
    const t = this.get(x, y);
    return t === TILE.WALL || t === TILE.VOID || t === TILE.DOOR; // Closed doors block vision
  }

  getVisibility(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
    return this.visibility[y * this.width + x];
  }

  setVisible(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    this.visibility[y * this.width + x] = 2;
  }

  /** Downgrade all visible tiles to seen (called before FOV recompute) */
  fadeVisibility() {
    for (let i = 0; i < this.visibility.length; i++) {
      if (this.visibility[i] === 2) this.visibility[i] = 1;
    }
  }
}
```

**Step 2: Create `src/dungeon/flood-fill.js`**

Connectivity verification. Every generated dungeon MUST pass this check.

```javascript
export function floodFill(tileMap, startX, startY) {
  const visited = new Set();
  const stack = [[startX, startY]];

  while (stack.length > 0) {
    const [x, y] = stack.pop();
    const key = x + y * tileMap.width;
    if (visited.has(key)) continue;
    if (x < 0 || x >= tileMap.width || y < 0 || y >= tileMap.height) continue;
    if (!tileMap.isWalkable(x, y)) continue;

    visited.add(key);
    stack.push([x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]);
  }
  return visited;
}

export function isFullyConnected(tileMap) {
  // Find first walkable tile
  let startX = -1, startY = -1;
  for (let y = 0; y < tileMap.height; y++) {
    for (let x = 0; x < tileMap.width; x++) {
      if (tileMap.isWalkable(x, y)) {
        startX = x; startY = y;
        break;
      }
    }
    if (startX !== -1) break;
  }
  if (startX === -1) return false;

  const reached = floodFill(tileMap, startX, startY);

  let totalWalkable = 0;
  for (let i = 0; i < tileMap.tiles.length; i++) {
    const t = tileMap.tiles[i];
    if (t !== 0 && t !== 1) totalWalkable++; // Not VOID or WALL
  }
  return reached.size === totalWalkable;
}
```

**Step 3: Create `src/dungeon/bsp-generator.js`**

BSP room+corridor generation. The workhorse. Guaranteed no overlapping rooms.

```javascript
import { TILE, DUNGEON_WIDTH, DUNGEON_HEIGHT } from '../core/constants.js';
import { TileMap } from './tile-map.js';
import { isFullyConnected } from './flood-fill.js';

const MIN_ROOM = 5;
const MAX_DEPTH = 5;

export function generateDungeon(rng, width = DUNGEON_WIDTH, height = DUNGEON_HEIGHT) {
  // Retry until we get a connected dungeon (usually first try with BSP)
  for (let attempt = 0; attempt < 10; attempt++) {
    const map = new TileMap(width, height);
    const root = { x: 1, y: 1, w: width - 2, h: height - 2 };

    split(root, rng, 0);
    const leaves = getLeaves(root);

    // Carve rooms
    for (const leaf of leaves) {
      carveRoom(map, leaf, rng);
    }

    // Connect sibling rooms via BSP tree
    connectBSP(map, root, rng);

    // Place stairs
    if (map.rooms.length >= 2) {
      const first = map.rooms[0];
      const last = map.rooms[map.rooms.length - 1];
      map.set(first.cx, first.cy, TILE.STAIRS_UP);
      map.set(last.cx, last.cy, TILE.STAIRS_DOWN);
    }

    if (isFullyConnected(map)) {
      return map;
    }
  }

  // Fallback: should never reach here with BSP
  throw new Error('Failed to generate connected dungeon after 10 attempts');
}

function split(node, rng, depth) {
  if (depth >= MAX_DEPTH || node.w < MIN_ROOM * 2 + 3 || node.h < MIN_ROOM * 2 + 3) {
    return; // Leaf
  }

  // Prefer splitting the longer axis
  const splitH = node.w > node.h
    ? rng.next() < 0.8  // mostly vertical split if wider
    : rng.next() < 0.2; // mostly horizontal split if taller

  if (splitH) {
    if (node.h < MIN_ROOM * 2 + 3) return;
    const splitAt = rng.nextInt(MIN_ROOM + 1, node.h - MIN_ROOM - 1);
    node.left  = { x: node.x, y: node.y, w: node.w, h: splitAt };
    node.right = { x: node.x, y: node.y + splitAt, w: node.w, h: node.h - splitAt };
  } else {
    if (node.w < MIN_ROOM * 2 + 3) return;
    const splitAt = rng.nextInt(MIN_ROOM + 1, node.w - MIN_ROOM - 1);
    node.left  = { x: node.x, y: node.y, w: splitAt, h: node.h };
    node.right = { x: node.x + splitAt, y: node.y, w: node.w - splitAt, h: node.h };
  }

  split(node.left, rng, depth + 1);
  split(node.right, rng, depth + 1);
}

function getLeaves(node) {
  if (!node.left && !node.right) return [node];
  const leaves = [];
  if (node.left) leaves.push(...getLeaves(node.left));
  if (node.right) leaves.push(...getLeaves(node.right));
  return leaves;
}

function carveRoom(map, leaf, rng) {
  const margin = 1;
  const maxW = leaf.w - margin * 2;
  const maxH = leaf.h - margin * 2;
  if (maxW < MIN_ROOM || maxH < MIN_ROOM) return;

  const rw = rng.nextInt(MIN_ROOM, maxW);
  const rh = rng.nextInt(MIN_ROOM, maxH);
  const rx = leaf.x + margin + rng.nextInt(0, maxW - rw);
  const ry = leaf.y + margin + rng.nextInt(0, maxH - rh);

  const room = { x: rx, y: ry, w: rw, h: rh, cx: rx + (rw >> 1), cy: ry + (rh >> 1) };

  for (let y = ry; y < ry + rh; y++) {
    for (let x = rx; x < rx + rw; x++) {
      map.set(x, y, TILE.FLOOR);
    }
  }

  leaf.room = room;
  map.rooms.push(room);
}

function getRoomFromNode(node) {
  if (node.room) return node.room;
  if (node.left) {
    const r = getRoomFromNode(node.left);
    if (r) return r;
  }
  if (node.right) {
    const r = getRoomFromNode(node.right);
    if (r) return r;
  }
  return null;
}

function connectBSP(map, node, rng) {
  if (!node.left || !node.right) return;

  connectBSP(map, node.left, rng);
  connectBSP(map, node.right, rng);

  const roomA = getRoomFromNode(node.left);
  const roomB = getRoomFromNode(node.right);
  if (!roomA || !roomB) return;

  carveCorridor(map, roomA.cx, roomA.cy, roomB.cx, roomB.cy, rng);
}

function carveCorridor(map, x1, y1, x2, y2, rng) {
  // L-shaped corridor
  if (rng.next() < 0.5) {
    carveH(map, x1, x2, y1);
    carveV(map, y1, y2, x2);
  } else {
    carveV(map, y1, y2, x1);
    carveH(map, x1, x2, y2);
  }
}

function carveH(map, x1, x2, y) {
  const start = Math.min(x1, x2);
  const end = Math.max(x1, x2);
  for (let x = start; x <= end; x++) {
    if (map.get(x, y) === TILE.WALL) map.set(x, y, TILE.FLOOR);
  }
}

function carveV(map, y1, y2, x) {
  const start = Math.min(y1, y2);
  const end = Math.max(y1, y2);
  for (let y = start; y <= end; y++) {
    if (map.get(x, y) === TILE.WALL) map.set(x, y, TILE.FLOOR);
  }
}
```

**Step 4: Test dungeon generation**

Temporarily add to `src/main.js`:
```javascript
import { generateDungeon } from './dungeon/bsp-generator.js';
import { createPRNG } from './core/prng.js';

const rng = createPRNG(42);
const dungeon = generateDungeon(rng);
console.log(`Generated dungeon: ${dungeon.rooms.length} rooms`);
```

Expected: Console shows 6-10 rooms. No errors.

**Step 5: Commit**

```bash
git add src/dungeon/
git commit -m "feat: BSP dungeon generation with flood-fill connectivity verification"
```

---

## Task 5: Symmetric Shadowcasting (FOV)

**Files:**
- Create: `src/fov/shadowcast.js`

**Step 1: Implement Albert Ford's symmetric shadowcasting**

If A sees B, B always sees A. No floating-point artifacts. Four quadrant scans.

```javascript
import { FOV_RADIUS } from '../core/constants.js';

/**
 * Symmetric Shadowcasting — Albert Ford's algorithm
 * Guarantees: if A sees B, B sees A (symmetry)
 * No floating-point errors — uses integer fractions
 */
export function computeFOV(originX, originY, radius, isOpaque, markVisible) {
  markVisible(originX, originY);

  for (let quadrant = 0; quadrant < 4; quadrant++) {
    scanQuadrant(quadrant, originX, originY, radius, isOpaque, markVisible);
  }
}

function scanQuadrant(quadrant, ox, oy, radius, isOpaque, markVisible) {
  // Transform quadrant-local (row, col) to map (x, y)
  function transform(row, col) {
    switch (quadrant) {
      case 0: return [ox + col, oy - row]; // North
      case 1: return [ox + row, oy + col]; // East
      case 2: return [ox + col, oy + row]; // South
      case 3: return [ox - row, oy + col]; // West
    }
  }

  function reveal(row, col) {
    const [x, y] = transform(row, col);
    markVisible(x, y);
  }

  function isBlocking(row, col) {
    const [x, y] = transform(row, col);
    return isOpaque(x, y);
  }

  function isSymmetric(row, startSlope, endSlope, col) {
    // A tile is symmetric if its center is between the start and end slopes
    return col >= row * startSlope && col <= row * endSlope;
  }

  function scan(row, startSlope, endSlope) {
    if (row > radius) return;

    let prevBlocked = false;
    let savedEndSlope = endSlope;

    const minCol = Math.floor(row * startSlope + 0.5);
    const maxCol = Math.ceil(row * endSlope - 0.5);

    for (let col = minCol; col <= maxCol; col++) {
      const blocked = isBlocking(row, col);
      const symmetric = isSymmetric(row, startSlope, endSlope, col);

      if (blocked || symmetric) {
        reveal(row, col);
      }

      if (prevBlocked && !blocked) {
        startSlope = (col - 0.5) / (row - 0.5);
      }

      if (!prevBlocked && blocked) {
        const newEndSlope = (col + 0.5) / (row + 0.5);
        scan(row + 1, startSlope, newEndSlope);
      }

      prevBlocked = blocked;
    }

    if (!prevBlocked) {
      scan(row + 1, startSlope, savedEndSlope);
    }
  }

  scan(1, -1, 1);
}
```

**Step 2: Test FOV computation**

In `src/main.js`, after dungeon generation:
```javascript
import { computeFOV } from './fov/shadowcast.js';

const startRoom = dungeon.rooms[0];
dungeon.fadeVisibility();
computeFOV(
  startRoom.cx, startRoom.cy, 8,
  (x, y) => dungeon.isOpaque(x, y),
  (x, y) => dungeon.setVisible(x, y)
);

let visibleCount = 0;
for (let i = 0; i < dungeon.visibility.length; i++) {
  if (dungeon.visibility[i] === 2) visibleCount++;
}
console.log(`FOV: ${visibleCount} tiles visible from (${startRoom.cx}, ${startRoom.cy})`);
```

Expected: 20-60 visible tiles (depends on room size). No errors.

**Step 3: Commit**

```bash
git add src/fov/shadowcast.js
git commit -m "feat: symmetric shadowcasting FOV — Albert Ford's algorithm"
```

---

## Task 6: Sprite Atlas and Asset Loading

**Files:**
- Create: `src/render/sprite-atlas.js`
- Create: `src/render/asset-loader.js`

**Step 1: Create `src/render/asset-loader.js`**

Loads all images at boot. Returns a promise that resolves when everything is ready.

```javascript
/**
 * Load all game assets. Returns a Map of name → HTMLImageElement.
 */
export async function loadAssets() {
  const assets = new Map();

  const manifest = {
    // Heroine Dusk first-person tiles (640x120 px each)
    'fp_wall':       'assets/walls-floors/heroine-dusk/tiles/first person dungeon crawl tiles/dungeon_wall.png',
    'fp_floor':      'assets/walls-floors/heroine-dusk/tiles/first person dungeon crawl tiles/dungeon_floor.png',
    'fp_ceiling':    'assets/walls-floors/heroine-dusk/tiles/first person dungeon crawl tiles/dungeon_ceiling.png',
    'fp_door':       'assets/walls-floors/heroine-dusk/tiles/first person dungeon crawl tiles/dungeon_door.png',
    'fp_locked_door':'assets/walls-floors/heroine-dusk/tiles/first person dungeon crawl tiles/locked_door.png',
    'fp_pillar_int': 'assets/walls-floors/heroine-dusk/tiles/first person dungeon crawl tiles/pillar_interior.png',
    'fp_pillar_ext': 'assets/walls-floors/heroine-dusk/tiles/first person dungeon crawl tiles/pillar_exterior.png',
    'fp_chest_int':  'assets/walls-floors/heroine-dusk/tiles/first person dungeon crawl tiles/chest_interior.png',
    'fp_chest_ext':  'assets/walls-floors/heroine-dusk/tiles/first person dungeon crawl tiles/chest_exterior.png',
    'fp_stairs':     'assets/walls-floors/heroine-dusk/tiles/first person dungeon crawl tiles/interior.png',

    // Enemies
    'enemy_skeleton':  'assets/monsters/heroine-dusk-enemies/skeleton3.png',
    'enemy_zombie':    'assets/monsters/heroine-dusk-enemies/zombie2.png',
    'enemy_imp':       'assets/monsters/heroine-dusk-enemies/imp2.png',
    'enemy_goblin':    'assets/monsters/heroine-dusk-enemies/goblin2.png',
    'enemy_druid':     'assets/monsters/heroine-dusk-enemies/druid2.png',
    'enemy_mimic':     'assets/monsters/heroine-dusk-enemies/mimic2.png',
    'enemy_shadow':    'assets/monsters/heroine-dusk-enemies/shadow_soul2.png',
    'enemy_bone_shield':'assets/monsters/heroine-dusk-enemies/bone_shield2.PNG',
    'enemy_death_speaker':'assets/monsters/heroine-dusk-enemies/death_speaker2.png',
    'enemy_skull_pile':'assets/monsters/heroine-dusk-enemies/skull_pile2.PNG',

    // Kenney roguelike spritesheet (for minimap)
    'kenney_dungeon': 'assets/walls-floors/kenney/Spritesheet/roguelikeDungeon_transparent.png',

    // Portraits
    'portrait_male_1':   'assets/portraits/flare/FlareMaleHero1.png',
    'portrait_male_2':   'assets/portraits/flare/FlareMaleHero2.png',
    'portrait_male_3':   'assets/portraits/flare/FlareMaleHero3.png',
    'portrait_female_1': 'assets/portraits/flare/FlareFemaleHero1.png',
    'portrait_female_2': 'assets/portraits/flare/FlareFemaleHero2.png',
    'portrait_female_3': 'assets/portraits/flare/FlareFemaleHero3.png',
  };

  const entries = Object.entries(manifest);
  const promises = entries.map(([name, path]) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => { assets.set(name, img); resolve(); };
      img.onerror = () => {
        console.warn(`Failed to load asset: ${name} (${path})`);
        resolve(); // Don't block on missing assets
      };
      img.src = path;
    })
  );

  await Promise.all(promises);
  console.log(`Loaded ${assets.size}/${entries.length} assets`);
  return assets;
}
```

**Step 2: Create `src/render/sprite-atlas.js`**

Wraps the loaded assets and provides helper methods for drawing sprites.

```javascript
/**
 * SpriteAtlas — central registry of loaded sprite images.
 * Every draw call goes through here.
 */
export class SpriteAtlas {
  constructor(assets) {
    this.assets = assets;
  }

  get(name) {
    return this.assets.get(name) || null;
  }

  has(name) {
    return this.assets.has(name);
  }

  /**
   * Draw a full image at (x, y) with optional width/height scaling
   */
  draw(ctx, name, x, y, w, h) {
    const img = this.assets.get(name);
    if (!img) return false;
    if (w !== undefined && h !== undefined) {
      ctx.drawImage(img, x, y, w, h);
    } else {
      ctx.drawImage(img, x, y);
    }
    return true;
  }

  /**
   * Draw a sub-rectangle from a spritesheet
   * (sx, sy, sw, sh) = source rect, (dx, dy, dw, dh) = dest rect
   */
  drawSlice(ctx, name, sx, sy, sw, sh, dx, dy, dw, dh) {
    const img = this.assets.get(name);
    if (!img) return false;
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
    return true;
  }
}
```

**Step 3: Wire asset loading into boot**

Update `src/main.js` to load assets before proceeding:
```javascript
import { loadAssets } from './render/asset-loader.js';
import { SpriteAtlas } from './render/sprite-atlas.js';

async function boot() {
  const viewport = document.getElementById('game-viewport');
  const layers = createCanvasStack(viewport);

  const ui = layers.ui;
  ui.fillStyle = '#0f0';
  ui.font = '16px monospace';
  ui.fillText('Loading assets...', 20, 30);

  const assets = await loadAssets();
  const atlas = new SpriteAtlas(assets);

  ui.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ui.fillText(`Dungeon X — ${assets.size} assets loaded`, 20, 30);

  // Test: draw a first-person wall tile
  atlas.draw(layers.floor, 'fp_wall', 0, 0);
  console.log('Boot complete. Atlas ready.');
}
```

**Step 4: Test in browser**

Expected: Loading message, then asset count, and the dungeon wall tile image drawn on screen. Console shows loaded count.

**Step 5: Commit**

```bash
git add src/render/asset-loader.js src/render/sprite-atlas.js
git commit -m "feat: asset loader and sprite atlas — 16-bit pixel art loaded at boot"
```

---

## Task 7: First-Person Renderer

**Files:**
- Create: `src/render/first-person.js`

This is the heart of the visual experience. Reads the tile grid and player position/facing, renders a Dungeon Master-style first-person perspective using the Heroine Dusk tile images.

**Step 1: Understand the Heroine Dusk tile format**

Each Heroine Dusk tile is 640x120 px. The image contains 5 frames (128x120 each) representing the tile at different depth positions in the first-person view:
- Frame 0 (px 0-127): Far left
- Frame 1 (px 128-255): Near left
- Frame 2 (px 256-383): Center
- Frame 3 (px 384-511): Near right
- Frame 4 (px 512-639): Far right

**NOTE:** Examine the actual tile images to confirm this layout. The renderer below assumes this 5-frame strip format based on the Heroine Dusk game's format. If the actual images differ, adjust `FRAME_WIDTH` and the frame slicing logic accordingly.

**Step 2: Create `src/render/first-person.js`**

```javascript
import { TILE, DIR, DIR_VECTOR, FP_VIEW } from '../core/constants.js';

/**
 * First-Person Dungeon Renderer
 *
 * Reads the tile grid around the player's position and facing direction,
 * renders a Dungeon Master-style perspective view.
 *
 * The view shows 3 rows of depth (far, mid, near) and 3 columns (left, center, right).
 * Walls are drawn using Heroine Dusk tile strips.
 */

// Heroine Dusk tile strip: 640x120, 5 frames of 128x120 each
const FRAME_W = 128;
const FRAME_H = 120;

// Depth layers for the 3D perspective effect
// Each layer defines how to scale/position tiles as they recede
const DEPTH_LAYERS = [
  { scale: 1.0,  yOff: 0,   opacity: 1.0  },  // Near (depth 0)
  { scale: 0.65, yOff: 40,  opacity: 0.85 },   // Mid (depth 1)
  { scale: 0.4,  yOff: 65,  opacity: 0.7  },   // Far (depth 2)
  { scale: 0.25, yOff: 78,  opacity: 0.55 },   // Very far (depth 3)
];

export class FirstPersonRenderer {
  constructor(atlas) {
    this.atlas = atlas;
  }

  /**
   * Render the first-person view.
   * @param {CanvasRenderingContext2D} ctx - The floor layer context
   * @param {TileMap} tileMap - The dungeon tile data
   * @param {number} px - Player x position
   * @param {number} py - Player y position
   * @param {number} facing - Player facing direction (DIR.NORTH, etc.)
   */
  render(ctx, tileMap, px, py, facing) {
    const vw = FP_VIEW.width;
    const vh = FP_VIEW.height;

    // Clear the first-person viewport area
    ctx.clearRect(FP_VIEW.x, FP_VIEW.y, vw, vh);

    // Draw ceiling
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(FP_VIEW.x, FP_VIEW.y, vw, vh / 2);

    // Draw floor
    ctx.fillStyle = '#2d2d1a';
    ctx.fillRect(FP_VIEW.x, FP_VIEW.y + vh / 2, vw, vh / 2);

    // Get direction vectors for forward and right
    const [fdx, fdy] = DIR_VECTOR[facing];
    // Right vector: rotate forward 90 degrees clockwise
    const rdx = -fdy;
    const rdy = fdx;

    // Render from back to front (far depth first, painter's algorithm)
    for (let depth = DEPTH_LAYERS.length - 1; depth >= 0; depth--) {
      const layer = DEPTH_LAYERS[depth];

      // Check tiles at this depth: left (-1), center (0), right (+1)
      for (let side = -1; side <= 1; side++) {
        const tx = px + fdx * (depth + 1) + rdx * side;
        const ty = py + fdy * (depth + 1) + rdy * side;

        const tile = tileMap.get(tx, ty);
        const visible = tileMap.getVisibility(tx, ty) >= 1;

        if (!visible) continue;

        this._drawTileAtDepth(ctx, tile, depth, side, layer);
      }
    }
  }

  _drawTileAtDepth(ctx, tile, depth, side, layer) {
    const vw = FP_VIEW.width;
    const vh = FP_VIEW.height;
    const centerX = FP_VIEW.x + vw / 2;
    const centerY = FP_VIEW.y + vh / 2;

    // Calculate position and size based on depth
    const scale = layer.scale;
    const tileW = vw * 0.4 * scale;
    const tileH = vh * 0.8 * scale;

    const xOffset = side * tileW * 0.9;
    const x = centerX + xOffset - tileW / 2;
    const y = centerY - tileH / 2;

    // Select the appropriate asset based on tile type
    let assetName = null;
    if (tile === TILE.WALL) assetName = 'fp_wall';
    else if (tile === TILE.DOOR) assetName = 'fp_door';
    else if (tile === TILE.FLOOR) assetName = 'fp_floor';
    else if (tile === TILE.STAIRS_DOWN || tile === TILE.STAIRS_UP) assetName = 'fp_stairs';
    else if (tile === TILE.CHEST) assetName = 'fp_chest_int';

    if (!assetName || !this.atlas.has(assetName)) {
      // Fallback: colored rectangle
      if (tile === TILE.WALL) {
        ctx.fillStyle = `rgba(80, 80, 100, ${layer.opacity})`;
        ctx.fillRect(x, y, tileW, tileH);
      }
      return;
    }

    // Draw the tile image scaled to depth
    // Use center frame (frame 2) from the 5-frame strip
    const frameIdx = side === -1 ? 1 : side === 1 ? 3 : 2;
    ctx.globalAlpha = layer.opacity;
    this.atlas.drawSlice(
      ctx, assetName,
      frameIdx * FRAME_W, 0, FRAME_W, FRAME_H,
      Math.floor(x), Math.floor(y), Math.floor(tileW), Math.floor(tileH)
    );
    ctx.globalAlpha = 1.0;
  }
}
```

**IMPORTANT NOTE:** The frame layout of the Heroine Dusk tiles (640x120, 5 frames) should be verified by examining the actual PNGs. If the layout is different (e.g., they're single images, or the frames represent something else), this renderer must be adjusted. The implementing engineer should open `dungeon_wall.png` and `dungeon_floor.png` to confirm dimensions and frame structure before proceeding.

**Step 3: Test first-person rendering**

Wire into `src/main.js` with a generated dungeon and player position. Expected: See actual Heroine Dusk wall/floor art in perspective view, not colored rectangles.

**Step 4: Commit**

```bash
git add src/render/first-person.js
git commit -m "feat: first-person dungeon renderer using Heroine Dusk tiles"
```

---

## Task 8: Minimap Renderer

**Files:**
- Create: `src/render/minimap.js`

**Step 1: Create `src/render/minimap.js`**

Top-down minimap showing explored dungeon area. Uses simple colored tiles (not sprites — minimap is tiny).

```javascript
import { TILE, MINIMAP } from '../core/constants.js';

const TILE_COLORS = {
  [TILE.VOID]:        '#000000',
  [TILE.WALL]:        '#333344',
  [TILE.FLOOR]:       '#554433',
  [TILE.DOOR]:        '#886622',
  [TILE.STAIRS_DOWN]: '#44aa44',
  [TILE.STAIRS_UP]:   '#4444aa',
  [TILE.CHEST]:       '#aaaa22',
};

export class MinimapRenderer {
  constructor() {
    this.ts = MINIMAP.tileSize;
  }

  render(ctx, tileMap, playerX, playerY) {
    const { x: mx, y: my, width: mw, height: mh } = MINIMAP;
    const ts = this.ts;

    // Background
    ctx.fillStyle = '#000';
    ctx.fillRect(mx, my, mw, mh);

    // Border
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.strokeRect(mx, my, mw, mh);

    // Center minimap on player
    const tilesWide = Math.floor(mw / ts);
    const tilesTall = Math.floor(mh / ts);
    const startX = playerX - Math.floor(tilesWide / 2);
    const startY = playerY - Math.floor(tilesTall / 2);

    for (let dy = 0; dy < tilesTall; dy++) {
      for (let dx = 0; dx < tilesWide; dx++) {
        const tx = startX + dx;
        const ty = startY + dy;
        const vis = tileMap.getVisibility(tx, ty);

        if (vis === 0) continue; // Unseen

        const tile = tileMap.get(tx, ty);
        const color = TILE_COLORS[tile] || '#000';
        const alpha = vis === 2 ? 1.0 : 0.4; // Visible vs seen-but-dark

        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.fillRect(
          mx + dx * ts,
          my + dy * ts,
          ts, ts
        );
      }
    }

    // Player dot
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = '#ff0';
    const pdx = playerX - startX;
    const pdy = playerY - startY;
    ctx.fillRect(
      mx + pdx * ts,
      my + pdy * ts,
      ts, ts
    );

    ctx.globalAlpha = 1.0;
  }
}
```

**Step 2: Commit**

```bash
git add src/render/minimap.js
git commit -m "feat: minimap renderer — top-down fog-of-war dungeon view"
```

---

## Task 9: Input System and Command Pattern

**Files:**
- Create: `src/commands/command.js`
- Create: `src/commands/move-command.js`
- Create: `src/ui/input-mapper.js`

**Step 1: Create `src/commands/command.js`**

```javascript
/** Base command interface. All game actions extend this. */
export class Command {
  execute(world) { throw new Error('Command.execute() not implemented'); }
  undo(world) { throw new Error('Command.undo() not implemented'); }
}
```

**Step 2: Create `src/commands/move-command.js`**

```javascript
import { Command } from './command.js';
import { DIR, DIR_VECTOR } from '../core/constants.js';

export class MoveForwardCommand extends Command {
  execute(world) {
    const [dx, dy] = DIR_VECTOR[world.player.facing];
    const nx = world.player.x + dx;
    const ny = world.player.y + dy;
    if (!world.tileMap.isWalkable(nx, ny)) return false;
    this._prevX = world.player.x;
    this._prevY = world.player.y;
    world.player.x = nx;
    world.player.y = ny;
    world.events.emit('playerMoved', { x: nx, y: ny });
    return true;
  }
  undo(world) {
    world.player.x = this._prevX;
    world.player.y = this._prevY;
  }
}

export class MoveBackwardCommand extends Command {
  execute(world) {
    const [dx, dy] = DIR_VECTOR[world.player.facing];
    const nx = world.player.x - dx;
    const ny = world.player.y - dy;
    if (!world.tileMap.isWalkable(nx, ny)) return false;
    this._prevX = world.player.x;
    this._prevY = world.player.y;
    world.player.x = nx;
    world.player.y = ny;
    world.events.emit('playerMoved', { x: nx, y: ny });
    return true;
  }
  undo(world) {
    world.player.x = this._prevX;
    world.player.y = this._prevY;
  }
}

export class StrafeLeftCommand extends Command {
  execute(world) {
    const [fdx, fdy] = DIR_VECTOR[world.player.facing];
    const nx = world.player.x + fdy;  // Left = rotate forward CCW
    const ny = world.player.y - fdx;
    if (!world.tileMap.isWalkable(nx, ny)) return false;
    this._prevX = world.player.x;
    this._prevY = world.player.y;
    world.player.x = nx;
    world.player.y = ny;
    world.events.emit('playerMoved', { x: nx, y: ny });
    return true;
  }
  undo(world) {
    world.player.x = this._prevX;
    world.player.y = this._prevY;
  }
}

export class StrafeRightCommand extends Command {
  execute(world) {
    const [fdx, fdy] = DIR_VECTOR[world.player.facing];
    const nx = world.player.x - fdy;  // Right = rotate forward CW
    const ny = world.player.y + fdx;
    if (!world.tileMap.isWalkable(nx, ny)) return false;
    this._prevX = world.player.x;
    this._prevY = world.player.y;
    world.player.x = nx;
    world.player.y = ny;
    world.events.emit('playerMoved', { x: nx, y: ny });
    return true;
  }
  undo(world) {
    world.player.x = this._prevX;
    world.player.y = this._prevY;
  }
}

export class TurnLeftCommand extends Command {
  execute(world) {
    this._prevFacing = world.player.facing;
    world.player.facing = (world.player.facing + 3) % 4; // CCW
    world.events.emit('playerTurned', { facing: world.player.facing });
    return true;
  }
  undo(world) {
    world.player.facing = this._prevFacing;
  }
}

export class TurnRightCommand extends Command {
  execute(world) {
    this._prevFacing = world.player.facing;
    world.player.facing = (world.player.facing + 1) % 4; // CW
    world.events.emit('playerTurned', { facing: world.player.facing });
    return true;
  }
  undo(world) {
    world.player.facing = this._prevFacing;
  }
}
```

**Step 3: Create `src/ui/input-mapper.js`**

```javascript
import {
  MoveForwardCommand, MoveBackwardCommand,
  StrafeLeftCommand, StrafeRightCommand,
  TurnLeftCommand, TurnRightCommand
} from '../commands/move-command.js';

/**
 * Maps keyboard input to Command objects.
 * Same pattern will be used for touch input later.
 */
export class InputMapper {
  constructor() {
    this._pendingCommand = null;
    this._keyMap = {
      'ArrowUp':    () => new MoveForwardCommand(),
      'KeyW':       () => new MoveForwardCommand(),
      'ArrowDown':  () => new MoveBackwardCommand(),
      'KeyS':       () => new MoveBackwardCommand(),
      'ArrowLeft':  () => new TurnLeftCommand(),
      'KeyA':       () => new StrafeLeftCommand(),
      'ArrowRight': () => new TurnRightCommand(),
      'KeyD':       () => new StrafeRightCommand(),
      'KeyQ':       () => new TurnLeftCommand(),
      'KeyE':       () => new TurnRightCommand(),
    };

    this._onKeyDown = this._onKeyDown.bind(this);
  }

  attach() {
    document.addEventListener('keydown', this._onKeyDown);
  }

  detach() {
    document.removeEventListener('keydown', this._onKeyDown);
  }

  _onKeyDown(e) {
    const factory = this._keyMap[e.code];
    if (factory) {
      e.preventDefault();
      this._pendingCommand = factory();
    }
  }

  /** Consume the pending command (returns null if no input) */
  consume() {
    const cmd = this._pendingCommand;
    this._pendingCommand = null;
    return cmd;
  }
}
```

**Step 4: Commit**

```bash
git add src/commands/ src/ui/input-mapper.js
git commit -m "feat: command pattern + input mapper — keyboard controls for dungeon movement"
```

---

## Task 10: Game World and Main Loop

**Files:**
- Create: `src/core/game-world.js`
- Modify: `src/main.js` (replace test code with real game loop)

**Step 1: Create `src/core/game-world.js`**

The central game state container. Pure data, no rendering.

```javascript
import { DIR, FOV_RADIUS } from './constants.js';
import { EventBus } from './event-bus.js';
import { createPRNG, createDailyPRNG } from './prng.js';
import { generateDungeon } from '../dungeon/bsp-generator.js';
import { computeFOV } from '../fov/shadowcast.js';

export class GameWorld {
  constructor(seed) {
    this.rng = typeof seed === 'number' ? createPRNG(seed) : createDailyPRNG();
    this.events = new EventBus();
    this.tileMap = null;
    this.player = { x: 0, y: 0, facing: DIR.NORTH };
    this.floor = 1;
    this.needsRender = true;
  }

  init() {
    this.tileMap = generateDungeon(this.rng);

    // Place player in first room (stairs up location)
    const startRoom = this.tileMap.rooms[0];
    this.player.x = startRoom.cx;
    this.player.y = startRoom.cy;
    this.player.facing = DIR.NORTH;

    this.recomputeFOV();

    // Listen for movement to recompute FOV
    this.events.on('playerMoved', () => {
      this.recomputeFOV();
      this.needsRender = true;
    });
    this.events.on('playerTurned', () => {
      this.needsRender = true;
    });

    this.needsRender = true;
    return this;
  }

  recomputeFOV() {
    this.tileMap.fadeVisibility();
    computeFOV(
      this.player.x, this.player.y, FOV_RADIUS,
      (x, y) => this.tileMap.isOpaque(x, y),
      (x, y) => this.tileMap.setVisible(x, y)
    );
  }
}
```

**Step 2: Rewrite `src/main.js` with the real game loop**

```javascript
import { CANVAS_WIDTH, CANVAS_HEIGHT, LAYERS } from './core/constants.js';
import { GameWorld } from './core/game-world.js';
import { loadAssets } from './render/asset-loader.js';
import { SpriteAtlas } from './render/sprite-atlas.js';
import { FirstPersonRenderer } from './render/first-person.js';
import { MinimapRenderer } from './render/minimap.js';
import { InputMapper } from './ui/input-mapper.js';

function createCanvasStack(container) {
  const canvases = {};
  for (const name of LAYERS) {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    canvas.dataset.layer = name;
    container.appendChild(canvas);
    canvases[name] = canvas.getContext('2d');
  }
  return canvases;
}

async function boot() {
  const viewport = document.getElementById('game-viewport');
  const layers = createCanvasStack(viewport);

  // Loading screen
  const ui = layers.ui;
  ui.fillStyle = '#0f0';
  ui.font = '16px monospace';
  ui.fillText('Loading Dungeon X...', 20, 30);

  // Load assets
  const assets = await loadAssets();
  const atlas = new SpriteAtlas(assets);

  // Create game world
  const world = new GameWorld(42).init(); // Seed 42 for testing; daily seed later

  // Create renderers
  const fpRenderer = new FirstPersonRenderer(atlas);
  const minimapRenderer = new MinimapRenderer();

  // Create input system
  const input = new InputMapper();
  input.attach();

  // Clear loading screen
  ui.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Game loop — turn-based, only render when state changes
  function gameLoop() {
    // Process input
    const command = input.consume();
    if (command) {
      command.execute(world);
    }

    // Render only when needed
    if (world.needsRender) {
      // First-person view on floor layer
      fpRenderer.render(
        layers.floor, world.tileMap,
        world.player.x, world.player.y, world.player.facing
      );

      // Minimap on UI layer
      const uiCtx = layers.ui;
      uiCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      minimapRenderer.render(
        uiCtx, world.tileMap,
        world.player.x, world.player.y
      );

      // HUD: floor number, position, facing
      uiCtx.fillStyle = '#0f0';
      uiCtx.font = '14px monospace';
      const dirs = ['N', 'E', 'S', 'W'];
      uiCtx.fillText(
        `Floor ${world.floor} | (${world.player.x}, ${world.player.y}) Facing ${dirs[world.player.facing]}`,
        10, CANVAS_HEIGHT - 10
      );

      world.needsRender = false;
    }

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
  console.log(`Dungeon X running. ${world.tileMap.rooms.length} rooms generated.`);
}

document.addEventListener('DOMContentLoaded', boot);
```

**Step 3: Test the complete game**

Run: `npx serve .` from project root, open in browser
Expected:
- First-person view showing Heroine Dusk wall/floor tiles
- Minimap in top-right showing explored dungeon
- Arrow keys: forward/backward/turn left/turn right
- WASD: forward/backward/strafe left/strafe right
- Q/E: turn left/turn right
- FOV updates as you move — unexplored areas are dark on minimap
- Position and facing displayed in bottom-left HUD

**Step 4: Commit**

```bash
git add src/core/game-world.js src/main.js
git commit -m "feat: game world, main loop, first-person exploration — Phase 1 complete"
```

---

## Phase 1 Completion Criteria

When all 10 tasks are done, you should have:

- [ ] ES module project structure (no bundler, no engine)
- [ ] 6 layered canvases with dirty-flag rendering
- [ ] Seeded PRNG (deterministic, daily seed ready)
- [ ] BSP dungeon generation with flood-fill verification
- [ ] Symmetric shadowcasting FOV
- [ ] First-person renderer using Heroine Dusk tile art
- [ ] Minimap with fog of war
- [ ] Command pattern input system (keyboard)
- [ ] Player can walk through a procedurally generated dungeon
- [ ] All 16-bit assets loaded and rendering (not colored rectangles)

**What's NOT in Phase 1:** Combat, characters, inventory, monsters (AI), saving, sound, touch controls, tavern. Those are Phase 2-4.

---

## Next Phase

After Phase 1 is verified working, return to `docs/plans/2026-03-13-dx-rewrite-design.md` and build the Phase 2 implementation plan: Characters, Roster, Combat, and Monster AI.
