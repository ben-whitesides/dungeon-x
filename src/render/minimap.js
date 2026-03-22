import { TILE, MINIMAP } from '../core/constants.js';

// Dark fantasy color palette
const TILE_COLORS = {
  [TILE.VOID]:        '#000000',
  [TILE.WALL]:        '#2a2a30',
  [TILE.FLOOR]:       '#4a4a50',
  [TILE.DOOR]:        '#6b4226',
  [TILE.STAIRS_DOWN]: '#2d8a2d',
  [TILE.STAIRS_UP]:   '#2d2d8a',
  [TILE.CHEST]:       '#c8a820',
  [TILE.TORCH_UNLIT]: '#5a4a2a',
  [TILE.TORCH_LIT]:   '#ffaa22',
  [TILE.LEVER]:       '#886b22',
  [TILE.GATE_OPEN]:   '#4a4a50',
  [TILE.GATE_CLOSED]: '#8a2a2a',
};

// Dim versions for explored-but-not-visible tiles (fog of war)
const TILE_COLORS_DIM = {
  [TILE.VOID]:        '#000000',
  [TILE.WALL]:        '#18181c',
  [TILE.FLOOR]:       '#28282c',
  [TILE.DOOR]:        '#3a2414',
  [TILE.STAIRS_DOWN]: '#1a4a1a',
  [TILE.STAIRS_UP]:   '#1a1a4a',
  [TILE.CHEST]:       '#6a5810',
  [TILE.TORCH_UNLIT]: '#2e2616',
  [TILE.TORCH_LIT]:   '#8a5a12',
  [TILE.LEVER]:       '#4a3a12',
  [TILE.GATE_OPEN]:   '#28282c',
  [TILE.GATE_CLOSED]: '#4a1616',
};

const DIR_ARROWS = [
  [0, -0.35],  // N — up
  [0.35, 0],   // E — right
  [0, 0.35],   // S — down
  [-0.35, 0],  // W — left
];

export class MinimapRenderer {
  constructor() {
    this.ts = MINIMAP.tileSize;
  }

  /**
   * Draw a dark stone border frame around the minimap.
   */
  _drawFrame(ctx, mx, my, mw, mh) {
    const border = 4;

    // Outer dark stone border
    ctx.fillStyle = '#1a1714';
    ctx.fillRect(mx - border, my - border, mw + border * 2, mh + border * 2);

    // Inner gold trim
    ctx.strokeStyle = '#8a7a4a';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(mx - 1.5, my - 1.5, mw + 3, mh + 3);

    // Outer dark edge
    ctx.strokeStyle = '#0a0908';
    ctx.lineWidth = 1;
    ctx.strokeRect(mx - border, my - border, mw + border * 2, mh + border * 2);

    // Corner rivets (small gold dots)
    ctx.fillStyle = '#aa9a5a';
    const r = 2.5;
    const corners = [
      [mx - border + 1, my - border + 1],
      [mx + mw + border - 2, my - border + 1],
      [mx - border + 1, my + mh + border - 2],
      [mx + mw + border - 2, my + mh + border - 2],
    ];
    for (const [cx, cy] of corners) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Draw compass labels around the minimap edges, rotated to match player facing.
   */
  _drawCompass(ctx, mx, my, mw, mh, facing) {
    // Cardinal directions in world space: 0=N, 1=E, 2=S, 3=W
    // Rotate based on player facing so the map is always north-up
    const labels = ['N', 'E', 'S', 'W'];
    const positions = [
      [mx + mw / 2, my - 7],          // top = N
      [mx + mw + 8, my + mh / 2 + 4], // right = E
      [mx + mw / 2, my + mh + 12],    // bottom = S
      [mx - 9, my + mh / 2 + 4],      // left = W
    ];
    const colors = {
      'N': '#cc4444',  // North in red (classic compass)
      'S': '#8a8a8a',
      'E': '#8a8a8a',
      'W': '#8a8a8a',
    };

    ctx.font = 'bold 10px serif';
    ctx.textAlign = 'center';

    for (let i = 0; i < 4; i++) {
      const label = labels[i];
      const [px, py] = positions[i];
      ctx.fillStyle = colors[label] || '#8a8a8a';
      ctx.fillText(label, px, py);
    }

    ctx.textAlign = 'left';
  }

  /**
   * Draw a "LEVEL X" label below the minimap.
   */
  _drawLevelLabel(ctx, mx, my, mw, mh, floor) {
    ctx.fillStyle = '#8a7a4a';
    ctx.font = 'bold 11px serif';
    ctx.textAlign = 'center';
    ctx.fillText('LEVEL ' + (floor || 1), mx + mw / 2, my + mh + 24);
    ctx.textAlign = 'left';
  }

  /**
   * Draw the player as a gold dot with a directional arrow showing facing.
   */
  _drawPlayer(ctx, mx, my, ts, pdx, pdy, facing) {
    const cx = mx + pdx * ts + ts / 2;
    const cy = my + pdy * ts + ts / 2;

    // Gold glow
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, ts * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Direction arrow
    const [adx, ady] = DIR_ARROWS[facing] || [0, -0.35];
    const arrowLen = ts * 2.5;
    const tipX = cx + adx * arrowLen;
    const tipY = cy + ady * arrowLen;

    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    // Arrowhead
    const angle = Math.atan2(ady, adx);
    const headLen = ts * 1.2;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(
      tipX - headLen * Math.cos(angle - 0.5),
      tipY - headLen * Math.sin(angle - 0.5)
    );
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(
      tipX - headLen * Math.cos(angle + 0.5),
      tipY - headLen * Math.sin(angle + 0.5)
    );
    ctx.stroke();
  }

  render(ctx, tileMap, playerX, playerY, facing, floor) {
    const { x: mx, y: my, width: mw, height: mh } = MINIMAP;
    const ts = this.ts;

    // Draw stone frame
    this._drawFrame(ctx, mx, my, mw, mh);

    // Fill minimap background (unexplored = black)
    ctx.fillStyle = '#050505';
    ctx.fillRect(mx, my, mw, mh);

    const tilesWide = Math.floor(mw / ts);
    const tilesTall = Math.floor(mh / ts);
    const startX = playerX - Math.floor(tilesWide / 2);
    const startY = playerY - Math.floor(tilesTall / 2);

    // Draw tiles with fog of war
    for (let dy = 0; dy < tilesTall; dy++) {
      for (let dx = 0; dx < tilesWide; dx++) {
        const tx = startX + dx;
        const ty = startY + dy;
        const vis = tileMap.getVisibility(tx, ty);

        // vis 0 = unexplored (black, skip)
        if (vis === 0) continue;

        const tile = tileMap.get(tx, ty);

        if (vis === 2) {
          // Currently visible — bright colors
          ctx.fillStyle = TILE_COLORS[tile] || '#000';
        } else {
          // Explored but not visible — dim fog of war
          ctx.fillStyle = TILE_COLORS_DIM[tile] || '#0a0a0a';
        }

        ctx.fillRect(mx + dx * ts, my + dy * ts, ts, ts);
      }
    }

    // Draw player with directional indicator
    const pdx = playerX - startX;
    const pdy = playerY - startY;
    this._drawPlayer(ctx, mx, my, ts, pdx, pdy, facing || 0);

    // Compass indicators
    this._drawCompass(ctx, mx, my, mw, mh, facing || 0);

    // Level label
    this._drawLevelLabel(ctx, mx, my, mw, mh, floor);
  }
}
