import { TILE } from '../core/constants.js';

export class TileMap {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.tiles = new Uint8Array(width * height);
    this.tiles.fill(TILE.WALL);
    this.visibility = new Uint8Array(width * height);
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
    return t === TILE.WALL || t === TILE.VOID || t === TILE.DOOR;
  }

  getVisibility(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
    return this.visibility[y * this.width + x];
  }

  setVisible(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    this.visibility[y * this.width + x] = 2;
  }

  fadeVisibility() {
    for (let i = 0; i < this.visibility.length; i++) {
      if (this.visibility[i] === 2) this.visibility[i] = 1;
    }
  }
}
