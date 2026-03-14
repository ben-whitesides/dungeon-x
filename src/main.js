import { CANVAS_WIDTH, CANVAS_HEIGHT, LAYERS } from './core/constants.js';
import { loadAssets } from './render/asset-loader.js';
import { SpriteAtlas } from './render/sprite-atlas.js';

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
  ui.fillText('Loading assets...', 20, 30);

  const assets = await loadAssets();
  const atlas = new SpriteAtlas(assets);

  ui.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ui.fillText(`Dungeon X — ${assets.size} assets loaded`, 20, 30);

  atlas.draw(layers.floor, 'fp_wall', 0, 0);
  console.log('Boot complete. Atlas ready.');
}

document.addEventListener('DOMContentLoaded', boot);

