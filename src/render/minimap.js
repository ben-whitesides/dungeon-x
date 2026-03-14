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

    ctx.fillStyle = '#000';
    ctx.fillRect(mx, my, mw, mh);

    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.strokeRect(mx, my, mw, mh);

    const tilesWide = Math.floor(mw / ts);
    const tilesTall = Math.floor(mh / ts);
    const startX = playerX - Math.floor(tilesWide / 2);
    const startY = playerY - Math.floor(tilesTall / 2);

    for (let dy = 0; dy < tilesTall; dy++) {
      for (let dx = 0; dx < tilesWide; dx++) {
        const tx = startX + dx;
        const ty = startY + dy;
        const vis = tileMap.getVisibility(tx, ty);

        if (vis === 0) continue;

        const tile = tileMap.get(tx, ty);
        const color = TILE_COLORS[tile] || '#000';
        const alpha = vis === 2 ? 1.0 : 0.4;

        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.fillRect(mx + dx * ts, my + dy * ts, ts, ts);
      }
    }

    ctx.globalAlpha = 1.0;
    ctx.fillStyle = '#ff0';
    const pdx = playerX - startX;
    const pdy = playerY - startY;
    ctx.fillRect(mx + pdx * ts, my + pdy * ts, ts, ts);

    ctx.globalAlpha = 1.0;
  }
}
