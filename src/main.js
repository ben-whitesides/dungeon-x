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

