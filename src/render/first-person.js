import { TILE, DIR_VECTOR, FP_VIEW } from '../core/constants.js';

/**
 * First-Person Dungeon Renderer — Heroine Dusk / Clint Bellanger style.
 * Each 640x240 tile image has 13 sub-sprites across 2 rows of 120px.
 * 3 depth layers, painter's algorithm back-to-front.
 */

// Native Heroine Dusk viewport: 160x120. Ours: 600x450. Scale: 3.75x
const SX = FP_VIEW.width / 160;   // 3.75
const SY = FP_VIEW.height / 120;  // 3.75

// 13 sub-sprite source rectangles from the 640x240 tile sheet
// [src_x, src_y, src_w, src_h, dest_x, dest_y] — dest in native 160x120 coords
const SPRITE_MAP = [
  // Back row (positions 0-4) — 2 cells ahead, drawn first
  [  0,   0,  80, 120,   0,  0],  // 0: far-left edge
  [ 80,   0,  80, 120,  80,  0],  // 1: far-right edge
  [160,   0,  80, 120,   0,  0],  // 2: inner-left
  [240,   0,  80, 120,  80,  0],  // 3: inner-right
  [320,   0, 160, 120,   0,  0],  // 4: center

  // Middle row (positions 5-9) — 1 cell ahead
  [480,   0,  80, 120,   0,  0],  // 5: far-left edge
  [560,   0,  80, 120,  80,  0],  // 6: far-right edge
  [  0, 120,  80, 120,   0,  0],  // 7: inner-left
  [ 80, 120,  80, 120,  80,  0],  // 8: inner-right
  [160, 120, 160, 120,   0,  0],  // 9: center

  // Front row (positions 10-12) — player's row, drawn last
  [320, 120,  80, 120,   0,  0],  // 10: left wall
  [400, 120,  80, 120,  80,  0],  // 11: right wall
  [480, 120, 160, 120,   0,  0],  // 12: center
];

// Map coordinate offsets: [forward_mult, right_mult]
// Applied as: map_x = px + fdx*fwd + rdx*right, map_y = py + fdy*fwd + rdy*right
const MAP_OFFSETS = [
  // Back row
  [2, -2], [2,  2], [2, -1], [2,  1], [2,  0],
  // Middle row
  [1, -2], [1,  2], [1, -1], [1,  1], [1,  0],
  // Front row
  [0, -1], [0,  1], [0,  0],
];

export class FirstPersonRenderer {
  constructor(atlas) {
    this.atlas = atlas;
  }

  render(ctx, tileMap, px, py, facing) {
    const vw = FP_VIEW.width;
    const vh = FP_VIEW.height;

    ctx.clearRect(FP_VIEW.x, FP_VIEW.y, vw, vh);

    // Void background
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(FP_VIEW.x, FP_VIEW.y, vw, vh);

    // Direction vectors
    const [fdx, fdy] = DIR_VECTOR[facing];
    const rdx = -fdy;
    const rdy = fdx;

    // Draw all 13 positions back-to-front (painter's algorithm)
    for (let i = 0; i < 13; i++) {
      const [fwd, right] = MAP_OFFSETS[i];
      const tx = px + fdx * fwd + rdx * right;
      const ty = py + fdy * fwd + rdy * right;

      // Skip out-of-bounds or non-visible tiles
      const tile = tileMap.get(tx, ty);
      if (tile === TILE.VOID) continue;

      // Only render tiles currently in FOV (visibility 2)
      const vis = tileMap.getVisibility(tx, ty);
      if (vis !== 2) continue;

      this._drawPosition(ctx, tile, i);
    }
  }

  _drawPosition(ctx, tile, pos) {
    const [srcX, srcY, srcW, srcH, natDX, natDY] = SPRITE_MAP[pos];

    // Scale native dest coords to our viewport
    const dx = FP_VIEW.x + Math.floor(natDX * SX);
    const dy = FP_VIEW.y + Math.floor(natDY * SY);
    const dw = Math.floor(srcW * SX);
    const dh = Math.floor(srcH * SY);

    // For walkable tiles: draw ceiling, then floor, then any object on top
    if (tile !== TILE.WALL) {
      // Ceiling
      if (!this.atlas.drawSlice(ctx, 'fp_ceiling', srcX, srcY, srcW, srcH, dx, dy, dw, dh)) {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(dx, dy, dw, dh);
      }
      // Floor
      if (!this.atlas.drawSlice(ctx, 'fp_floor', srcX, srcY, srcW, srcH, dx, dy, dw, dh)) {
        ctx.fillStyle = '#2d2d1a';
        ctx.fillRect(dx, dy, dw, dh);
      }
    }

    // Wall or object layer
    let asset = null;
    if (tile === TILE.WALL) asset = 'fp_wall';
    else if (tile === TILE.DOOR) asset = 'fp_door';
    else if (tile === TILE.CHEST) asset = 'fp_chest_int';
    else if (tile === TILE.STAIRS_DOWN || tile === TILE.STAIRS_UP) {
      // fp_stairs is 160x120 (single image, not 640x240 sprite sheet)
      if (this.atlas.has('fp_stairs')) {
        this.atlas.draw(ctx, 'fp_stairs',
          FP_VIEW.x, FP_VIEW.y, FP_VIEW.width, FP_VIEW.height);
      }
      return;
    }

    if (asset && this.atlas.has(asset)) {
      this.atlas.drawSlice(ctx, asset, srcX, srcY, srcW, srcH, dx, dy, dw, dh);
    } else if (tile === TILE.WALL) {
      // Fallback solid wall
      ctx.fillStyle = '#505064';
      ctx.fillRect(dx, dy, dw, dh);
    }
  }
}
