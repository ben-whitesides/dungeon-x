import { TILE, DIR_VECTOR, FP_VIEW } from '../core/constants.js';

/**
 * First-Person Dungeon Renderer — Dungeon Master-style perspective.
 * Heroine Dusk tiles: verified 640x240, 5 frames of 128x240 each.
 */
const FRAME_W = 128;
const FRAME_H = 240;

const DEPTH_LAYERS = [
  { scale: 1.0,  yOff: 0,   opacity: 1.0  },
  { scale: 0.65, yOff: 40,  opacity: 0.85 },
  { scale: 0.4,  yOff: 65,  opacity: 0.7  },
  { scale: 0.25, yOff: 78,  opacity: 0.55 },
];

export class FirstPersonRenderer {
  constructor(atlas) {
    this.atlas = atlas;
  }

  render(ctx, tileMap, px, py, facing) {
    const vw = FP_VIEW.width;
    const vh = FP_VIEW.height;

    ctx.clearRect(FP_VIEW.x, FP_VIEW.y, vw, vh);

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(FP_VIEW.x, FP_VIEW.y, vw, vh / 2);

    ctx.fillStyle = '#2d2d1a';
    ctx.fillRect(FP_VIEW.x, FP_VIEW.y + vh / 2, vw, vh / 2);

    const [fdx, fdy] = DIR_VECTOR[facing];
    const rdx = -fdy;
    const rdy = fdx;

    for (let depth = DEPTH_LAYERS.length - 1; depth >= 0; depth--) {
      const layer = DEPTH_LAYERS[depth];

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

    const scale = layer.scale;
    const tileW = vw * 0.4 * scale;
    const tileH = vh * 0.8 * scale;

    const xOffset = side * tileW * 0.9;
    const x = centerX + xOffset - tileW / 2;
    const y = centerY - tileH / 2;

    let assetName = null;
    if (tile === TILE.WALL) assetName = 'fp_wall';
    else if (tile === TILE.DOOR) assetName = 'fp_door';
    else if (tile === TILE.FLOOR) assetName = 'fp_floor';
    else if (tile === TILE.STAIRS_DOWN || tile === TILE.STAIRS_UP) assetName = 'fp_stairs';
    else if (tile === TILE.CHEST) assetName = 'fp_chest_int';

    if (!assetName || !this.atlas.has(assetName)) {
      if (tile === TILE.WALL) {
        ctx.fillStyle = `rgba(80, 80, 100, ${layer.opacity})`;
        ctx.fillRect(x, y, tileW, tileH);
      }
      return;
    }

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
