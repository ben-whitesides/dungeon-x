import { CANVAS_WIDTH, CANVAS_HEIGHT, LAYERS } from './core/constants.js';
import { PerformanceMonitor } from './utils/performance-monitor.js';
import { AnimationQueue } from './render/animation-queue.js';
import { SoundManager } from './audio/sound-manager.js';
import { UIRenderer } from './render/ui-renderer.js';
import { GameWorld } from './core/game-world.js';
import { loadAssets } from './render/asset-loader.js';
import { SpriteAtlas } from './render/sprite-atlas.js';
import { FirstPersonRenderer } from './render/first-person.js';
import { MinimapRenderer } from './render/minimap.js';
import { InputMapper } from './ui/input-mapper.js';
import { Character } from './character/character.js';

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

  const ui = layers.ui;
  ui.fillStyle = '#0f0';
  ui.font = '16px monospace';
  ui.fillText('Loading Dungeon X...', 20, 30);

  const assets = await loadAssets();
  const atlas = new SpriteAtlas(assets);

  const world = new GameWorld(42, assets);
  // Don't call init() yet — dungeon generates when player enters from tavern

  const renderers = {
    fp: new FirstPersonRenderer(atlas),
    ui: new UIRenderer(assets),
    minimap: new MinimapRenderer()
  };
  world.renderers = renderers;

  const soundManager = new SoundManager();
  const animationQueue = new AnimationQueue();
  const performanceMonitor = new PerformanceMonitor();

  const input = new InputMapper(soundManager);
  input.attach();
  world.input = input; // Expose for touch hit zone registration

  // Seed the roster with starter characters (load saved if available)
  world.roster.load();
  if (world.roster.getAll().length === 0) {
    world.roster.add(new Character('Roland', 'fighter', 1));
    world.roster.add(new Character('Elara', 'cleric', 1));
    world.roster.add(new Character('Thane', 'rogue', 1));
    world.roster.add(new Character('Ashara', 'mage', 1));
    world.roster.add(new Character('Kael', 'ranger', 1));
    world.roster.add(new Character('Seraphina', 'paladin', 1));
    world.roster.save();
  } else {
    // Migrations for existing saves
    const all = world.roster.getAll();
    let dirty = false;

    // Migration 1: rename Miriel -> Ashara (LOTR IP fix)
    const miriel = all.find(c => c.name === 'Miriel');
    if (miriel) { miriel.name = 'Ashara'; dirty = true; }

    // Migration 2: add Ranger + Paladin if missing
    if (!all.find(c => c.class === 'ranger')) {
      world.roster.add(new Character('Kael', 'ranger', 1));
      dirty = true;
    }
    if (!all.find(c => c.class === 'paladin')) {
      world.roster.add(new Character('Seraphina', 'paladin', 1));
      dirty = true;
    }

    if (dirty) world.roster.save();
  }

  // Start in the tavern
  world.stateStack.pushTavern(renderers);
  world.needsRender = true;

  ui.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  function gameLoop() {
    performanceMonitor.beginFrame();
    const commandEvent = input.consume();
    const currentState = world.stateStack.peek();

    if (commandEvent && currentState) {
      const handled = currentState.handleInput(commandEvent, world);
      if (handled) world.needsRender = true;
    }

    // Check for state transitions (e.g., combat end)
    const activeState = world.stateStack.peek();
    if (activeState && activeState.isDone && activeState.isDone()) {
      world.stateStack.pop();
      world.needsRender = true;

      // Handle specific state completion logic
      if (activeState.combat) {
        if (activeState.combat.state === 'defeat') {
          // Party wipe — return to tavern
          world.exitDungeon(false);
          world.stateStack.clear();
          world.stateStack.pushTavern(renderers);
        }
        // Victory or Fled just resumes exploration which is already on the stack
      }
    }

    if (world.needsRender) {
      // Clear all layers
      for (const name of Object.keys(layers)) {
        layers[name].clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }
      
      // Render the full stack (though current states usually clear their layers)
      world.stateStack.updateAndRender(layers, world);
      world.needsRender = false;
    }

    performanceMonitor.endFrame();
    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
  console.log('Dungeon X — The Rusty Flagon awaits.');
}

document.addEventListener('DOMContentLoaded', boot);

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then((registration) => {
      console.log('Service Worker registered:', registration.scope);
    })
    .catch((error) => {
      console.log('Service Worker registration failed:', error);
    });
}
