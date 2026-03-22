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
    this.flickerPhase = 0;
    this._seed = (x, y) => Math.abs(Math.sin(x * 127.1 + y * 311.7) * 43758.5453 % 1);
  }

  render(ctx, tileMap, px, py, facing) {
    const vw = FP_VIEW.width;
    const vh = FP_VIEW.height;

    this.flickerPhase += 0.05;
    if (this.flickerPhase > Math.PI * 200) this.flickerPhase -= Math.PI * 200;

    ctx.clearRect(FP_VIEW.x, FP_VIEW.y, vw, vh);

    // Void background — dark cold stone
    ctx.fillStyle = '#08080e';
    ctx.fillRect(FP_VIEW.x, FP_VIEW.y, vw, vh);

    // Ambient ceiling/floor gradient (gives depth even without tiles)
    const ambGrad = ctx.createLinearGradient(FP_VIEW.x, FP_VIEW.y, FP_VIEW.x, FP_VIEW.y + vh);
    ambGrad.addColorStop(0, '#0c0c14');
    ambGrad.addColorStop(0.35, '#08080e');
    ambGrad.addColorStop(0.65, '#08080e');
    ambGrad.addColorStop(1, '#0e0e12');
    ctx.fillStyle = ambGrad;
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

      this._drawPosition(ctx, tile, i, tx, ty);
    }

    // === Subtle depth atmosphere (very light — don't black out the view) ===
    const fogAlpha = 0.06 + Math.sin(this.flickerPhase * 0.3) * 0.015;
    ctx.fillStyle = `rgba(6, 6, 10, ${fogAlpha})`;
    ctx.fillRect(FP_VIEW.x, FP_VIEW.y, vw, vh);

    // Soft vignette — gentle darkening at edges only
    const vig = ctx.createRadialGradient(
      FP_VIEW.x + vw / 2, FP_VIEW.y + vh / 2, vw * 0.3,
      FP_VIEW.x + vw / 2, FP_VIEW.y + vh / 2, vw * 0.6
    );
    vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vig.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
    ctx.fillStyle = vig;
    ctx.fillRect(FP_VIEW.x, FP_VIEW.y, vw, vh);

    // Player's torch glow — warm light radiating from player position
    const playerGlow = ctx.createRadialGradient(
      FP_VIEW.x + vw / 2, FP_VIEW.y + vh * 0.6, 10,
      FP_VIEW.x + vw / 2, FP_VIEW.y + vh * 0.6, vw * 0.45
    );
    const glowFlicker = Math.sin(this.flickerPhase * 2.5) * 0.015;
    playerGlow.addColorStop(0, `rgba(255, 140, 40, ${0.08 + glowFlicker})`);
    playerGlow.addColorStop(0.5, `rgba(255, 100, 20, ${0.03 + glowFlicker * 0.5})`);
    playerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = playerGlow;
    ctx.fillRect(FP_VIEW.x, FP_VIEW.y, vw, vh);
  }

  _drawPosition(ctx, tile, pos, tx, ty) {
    const [srcX, srcY, srcW, srcH, natDX, natDY] = SPRITE_MAP[pos];

    // Scale native dest coords to our viewport
    const dx = FP_VIEW.x + Math.floor(natDX * SX);
    const dy = FP_VIEW.y + Math.floor(natDY * SY);
    const dw = Math.floor(srcW * SX);
    const dh = Math.floor(srcH * SY);

    // Depth layer: 0 = front (player), 1 = middle, 2 = back
    const depth = pos < 5 ? 2 : pos < 10 ? 1 : 0;
    const depthFog = depth * 0.06; // Subtle fog with distance

    // For walkable tiles: draw ceiling, then floor, then any object on top
    if (tile !== TILE.WALL) {
      // Ceiling
      if (!this.atlas.drawSlice(ctx, 'fp_ceiling', srcX, srcY, srcW, srcH, dx, dy, dw, dh)) {
        ctx.fillStyle = '#1a1a22';
        ctx.fillRect(dx, dy, dw, dh);
      }
      // Floor
      if (!this.atlas.drawSlice(ctx, 'fp_floor', srcX, srcY, srcW, srcH, dx, dy, dw, dh)) {
        ctx.fillStyle = '#2a2a2e';
        ctx.fillRect(dx, dy, dw, dh);
      }

      // Floor debris (seeded per tile, only on front/middle rows)
      if (depth <= 1 && tx !== undefined) {
        const sv = this._seed(tx, ty);
        if (sv > 0.6) {
          // Small stones/rubble
          const debrisX = dx + sv * dw * 0.6;
          const debrisY = dy + dh * 0.75 + sv * dh * 0.15;
          ctx.fillStyle = `rgba(40, 38, 35, ${0.4 - depth * 0.15})`;
          ctx.beginPath();
          ctx.ellipse(debrisX, debrisY, 3 + sv * 4, 2 + sv * 2, sv * 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
        if (sv > 0.8) {
          // Bone or debris
          ctx.fillStyle = `rgba(60, 55, 45, ${0.3 - depth * 0.1})`;
          ctx.fillRect(dx + dw * 0.3 + sv * 20, dy + dh * 0.8, 8 + sv * 6, 2);
        }
      }
    }

    // Wall or object layer
    let asset = null;
    if (tile === TILE.WALL) asset = 'fp_wall';
    else if (tile === TILE.DOOR) asset = 'fp_door';
    else if (tile === TILE.CHEST) asset = 'fp_chest_int';
    else if (tile === TILE.GATE_CLOSED) asset = 'fp_door';
    else if (tile === TILE.STAIRS_DOWN || tile === TILE.STAIRS_UP) {
      if (this.atlas.has('fp_stairs')) {
        this.atlas.draw(ctx, 'fp_stairs',
          FP_VIEW.x, FP_VIEW.y, FP_VIEW.width, FP_VIEW.height);
      }
      return;
    }

    if (asset && this.atlas.has(asset)) {
      this.atlas.drawSlice(ctx, asset, srcX, srcY, srcW, srcH, dx, dy, dw, dh);
    } else if (tile === TILE.WALL) {
      // Fallback solid wall — cold grey ancient stone
      ctx.fillStyle = '#3a3a42';
      ctx.fillRect(dx, dy, dw, dh);

      // Wall detail overlays (cracks, moss) — seeded per position
      if (tx !== undefined) {
        const wv = this._seed(tx * 3 + 1, ty * 7 + 2);
        // Crack
        if (wv > 0.5) {
          ctx.strokeStyle = `rgba(20, 20, 25, ${0.4 - depth * 0.1})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(dx + dw * 0.3 + wv * 20, dy + dh * 0.1);
          ctx.lineTo(dx + dw * 0.35 + wv * 15, dy + dh * 0.4);
          ctx.lineTo(dx + dw * 0.3 + wv * 25, dy + dh * 0.6);
          ctx.stroke();
        }
        // Moss/damp patch (lower wall)
        if (wv > 0.7) {
          ctx.fillStyle = `rgba(20, 35, 18, ${0.15 - depth * 0.04})`;
          ctx.beginPath();
          ctx.ellipse(dx + dw * wv, dy + dh * 0.85, 8 + wv * 10, 5 + wv * 4, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        // Water stain (dark streak down wall)
        if (wv > 0.85) {
          ctx.fillStyle = `rgba(15, 18, 22, ${0.12 - depth * 0.03})`;
          ctx.fillRect(dx + dw * 0.6 + wv * 10, dy + dh * 0.2, 3, dh * 0.5);
        }
      }
    } else if (tile === TILE.GATE_CLOSED) {
      ctx.fillStyle = '#4a4a55';
      ctx.fillRect(dx, dy, dw, dh);
      ctx.fillStyle = '#222';
      for (let bx = dx + 8; bx < dx + dw; bx += 16) {
        ctx.fillRect(bx, dy, 4, dh);
      }
    }

    // Per-tile depth fog (back row darkest)
    if (depthFog > 0) {
      ctx.fillStyle = `rgba(6, 6, 10, ${depthFog})`;
      ctx.fillRect(dx, dy, dw, dh);
    }

    // === Interactable overlays ===
    if (tile === TILE.TORCH_LIT) {
      // Animated torch flame
      const flick = Math.sin(this.flickerPhase * 3 + (tx || 0) * 2.7) * 3;
      const glowRadius = dw * (0.5 + depth * 0.15);

      // Warm glow on surrounding walls
      const glowGrad = ctx.createRadialGradient(
        dx + dw / 2, dy + dh * 0.3, 3,
        dx + dw / 2, dy + dh * 0.3, glowRadius
      );
      glowGrad.addColorStop(0, `rgba(255, 150, 40, ${0.35 - depth * 0.08})`);
      glowGrad.addColorStop(0.5, `rgba(255, 100, 20, ${0.12 - depth * 0.03})`);
      glowGrad.addColorStop(1, 'rgba(255, 80, 10, 0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(dx - 20, dy - 10, dw + 40, dh + 20);

      // Bracket
      ctx.fillStyle = `rgba(60, 40, 20, ${0.7 - depth * 0.15})`;
      ctx.fillRect(dx + dw / 2 - 3, dy + dh * 0.32, 6, 15);

      // Outer flame
      ctx.fillStyle = `rgba(255, 120, 20, ${0.7 - depth * 0.1})`;
      ctx.beginPath();
      ctx.ellipse(dx + dw / 2, dy + dh * 0.25 + flick * 0.3, 5 * SX / 3, (10 + flick) * SY / 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Inner flame
      ctx.fillStyle = `rgba(255, 220, 80, ${0.85 - depth * 0.1})`;
      ctx.beginPath();
      ctx.ellipse(dx + dw / 2, dy + dh * 0.27 + flick * 0.2, 3 * SX / 3, (6 + flick * 0.5) * SY / 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Hot core
      ctx.fillStyle = `rgba(255, 255, 200, ${0.9 - depth * 0.15})`;
      ctx.beginPath();
      ctx.ellipse(dx + dw / 2, dy + dh * 0.29, 1.5 * SX / 3, 3 * SY / 3, 0, 0, Math.PI * 2);
      ctx.fill();

    } else if (tile === TILE.TORCH_UNLIT) {
      // Dark bracket — empty sconce
      ctx.fillStyle = `rgba(50, 35, 20, ${0.5 - depth * 0.1})`;
      ctx.fillRect(dx + dw / 2 - 4, dy + dh * 0.25, 8, 18);
      ctx.fillStyle = `rgba(35, 25, 15, ${0.4 - depth * 0.1})`;
      ctx.fillRect(dx + dw / 2 - 6, dy + dh * 0.35, 12, 5);

    } else if (tile === TILE.LEVER) {
      // Lever on wall — metallic
      ctx.fillStyle = `rgba(80, 70, 50, ${0.7 - depth * 0.15})`;
      ctx.fillRect(dx + dw / 2 - 3, dy + dh * 0.45, 6, dh * 0.25);
      // Lever head
      ctx.fillStyle = `rgba(200, 180, 80, ${0.8 - depth * 0.15})`;
      ctx.beginPath();
      ctx.arc(dx + dw / 2, dy + dh * 0.42, 5, 0, Math.PI * 2);
      ctx.fill();
      // Metallic highlight
      ctx.fillStyle = `rgba(255, 230, 120, ${0.3 - depth * 0.08})`;
      ctx.beginPath();
      ctx.arc(dx + dw / 2 - 1, dy + dh * 0.41, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
