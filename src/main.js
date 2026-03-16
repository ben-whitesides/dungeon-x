import { CANVAS_WIDTH, CANVAS_HEIGHT, LAYERS } from './core/constants.js';
import { AnimationQueue } from './render/animation-queue.js';
import { SoundManager } from './audio/sound-manager.js';
import { UIRenderer } from './render/ui-renderer.js';
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

  const ui = layers.ui;
  ui.fillStyle = '#0f0';
  ui.font = '16px monospace';
  ui.fillText('Loading Dungeon X...', 20, 30);

  const assets = await loadAssets();
  const atlas = new SpriteAtlas(assets);

  const world = new GameWorld(42).init();

  const fpRenderer = new FirstPersonRenderer(atlas);
  const uiRenderer = new UIRenderer();
  const soundManager = new SoundManager();
  const animationQueue = new AnimationQueue();
  const minimapRenderer = new MinimapRenderer();

  const input = new InputMapper(soundManager);
  input.attach();

  ui.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  function gameLoop() {
    const command = input.consume();
    if (command) {
      command.execute(world);
    }

    if (world.needsRender) {
      fpRenderer.render(
        layers.floor, world.tileMap,
        world.player.x, world.player.y, world.player.facing
      );

      const uiCtx = layers.ui;
      uiCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      minimapRenderer.render(uiCtx, world.tileMap, world.player.x, world.player.y);

      uiCtx.fillStyle = '#0f0';
      uiCtx.font = '14px monospace';
      const dirs = ['N', 'E', 'S', 'W'];
      uiRenderer.renderPartyHUD(layers.ui, world.party.getMembers());
      uiRenderer.renderVirtualGamepad(layers.ui);

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
