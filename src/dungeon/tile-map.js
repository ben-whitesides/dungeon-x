import { TILE } from '../core/constants.js';

export class TileMap {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.tiles = new Uint8Array(width * height);
    this.tiles.fill(TILE.WALL);
    this.visibility = new Uint8Array(width * height);
    this.entities = new Map(); // x,y -> entity
    this.goblinDens = new Set(); // For goblin warrens boss mechanic
    this.rooms = [];
    this.interactables = new Map(); // x,y -> interactable data
    this.leverLinks = new Map(); // leverId -> { gateX, gateY }
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
    return t === TILE.FLOOR || t === TILE.DOOR || t === TILE.STAIRS_DOWN || t === TILE.STAIRS_UP
      || t === TILE.TORCH_LIT || t === TILE.TORCH_UNLIT || t === TILE.GATE_OPEN;
  }

  isOpaque(x, y) {
    const t = this.get(x, y);
    return t === TILE.WALL || t === TILE.VOID || t === TILE.DOOR || t === TILE.GATE_CLOSED;
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

  addEntity(entity) {
    const key = `${entity.x},${entity.y}`;
    this.entities.set(key, entity);
  }

  removeEntity(entity) {
    const key = `${entity.x},${entity.y}`;
    this.entities.delete(key);
  }

  getEntitiesAt(x, y) {
    const key = `${x},${y}`;
    const entity = this.entities.get(key);
    return entity ? [entity] : [];
  }

  /**
   * Get interactable at position, if any.
   */
  getInteractable(x, y) {
    return this.interactables.get(`${x},${y}`) || null;
  }

  /**
   * Place 2-3 interactables per floor in rooms.
   * Types: torch (on wall adjacent), lever + gate pair.
   */
  placeInteractables(rng) {
    if (!rng || this.rooms.length < 2) return;

    const rand = typeof rng === 'function' ? rng : rng.next;
    const count = 2 + Math.floor(rand() * 2); // 2-3 interactables
    let leverId = 0;

    for (let i = 0; i < count && i < this.rooms.length - 1; i++) {
      // Skip starting room (index 0)
      const roomIdx = 1 + Math.floor(rand() * (this.rooms.length - 1));
      const room = this.rooms[roomIdx];
      if (!room) continue;

      const type = rand() < 0.5 ? 'torch' : 'lever';

      if (type === 'torch') {
        // Place torch on a wall adjacent to floor in the room
        const torchPos = this._findWallAdjacent(room, rand);
        if (torchPos) {
          const isLit = rand() < 0.3; // 30% chance already lit
          this.set(torchPos.x, torchPos.y, isLit ? TILE.TORCH_LIT : TILE.TORCH_UNLIT);
          this.interactables.set(`${torchPos.x},${torchPos.y}`, {
            type: 'torch',
            lit: isLit,
            x: torchPos.x,
            y: torchPos.y,
          });
        }
      } else {
        // Place lever + gate pair
        const leverPos = this._findFloorInRoom(room, rand);
        if (leverPos) {
          // Find a corridor tile to place a gate
          const gatePos = this._findCorridorTile(rand);
          if (gatePos) {
            this.set(leverPos.x, leverPos.y, TILE.LEVER);
            this.set(gatePos.x, gatePos.y, TILE.GATE_CLOSED);

            const lid = `lever_${leverId++}`;
            this.interactables.set(`${leverPos.x},${leverPos.y}`, {
              type: 'lever',
              activated: false,
              leverId: lid,
              x: leverPos.x,
              y: leverPos.y,
            });
            this.interactables.set(`${gatePos.x},${gatePos.y}`, {
              type: 'gate',
              open: false,
              leverId: lid,
              x: gatePos.x,
              y: gatePos.y,
            });
            this.leverLinks.set(lid, { gateX: gatePos.x, gateY: gatePos.y });
          }
        }
      }
    }
  }

  /**
   * Find a wall tile adjacent to a floor tile in a room — for torch placement.
   */
  _findWallAdjacent(room, rng) {
    // Try random positions within the room borders
    for (let attempt = 0; attempt < 20; attempt++) {
      // Pick a wall along the room edge
      const side = Math.floor(rng() * 4);
      let wx, wy;
      if (side === 0) { // North wall
        wx = room.x + Math.floor(rng() * room.w);
        wy = room.y - 1;
      } else if (side === 1) { // South wall
        wx = room.x + Math.floor(rng() * room.w);
        wy = room.y + room.h;
      } else if (side === 2) { // West wall
        wx = room.x - 1;
        wy = room.y + Math.floor(rng() * room.h);
      } else { // East wall
        wx = room.x + room.w;
        wy = room.y + Math.floor(rng() * room.h);
      }

      if (this.get(wx, wy) === TILE.WALL) {
        return { x: wx, y: wy };
      }
    }
    return null;
  }

  /**
   * Find a floor tile in a room for lever placement.
   */
  _findFloorInRoom(room, rng) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const x = room.x + 1 + Math.floor(rng() * Math.max(1, room.w - 2));
      const y = room.y + 1 + Math.floor(rng() * Math.max(1, room.h - 2));
      if (this.get(x, y) === TILE.FLOOR) {
        // Don't place on stairs
        if (this.get(x, y) !== TILE.STAIRS_DOWN && this.get(x, y) !== TILE.STAIRS_UP) {
          return { x, y };
        }
      }
    }
    return null;
  }

  /**
   * Find a corridor tile (floor tile not in any room) for gate placement.
   */
  _findCorridorTile(rng) {
    for (let attempt = 0; attempt < 50; attempt++) {
      const x = 1 + Math.floor(rng() * (this.width - 2));
      const y = 1 + Math.floor(rng() * (this.height - 2));
      if (this.get(x, y) !== TILE.FLOOR) continue;
      // Check if it's in a corridor (not inside any room)
      let inRoom = false;
      for (const room of this.rooms) {
        if (x >= room.x && x < room.x + room.w && y >= room.y && y < room.y + room.h) {
          inRoom = true;
          break;
        }
      }
      if (!inRoom) return { x, y };
    }
    return null;
  }

  /**
   * Activate a lever — opens/closes its linked gate.
   */
  activateLever(leverX, leverY) {
    const lever = this.getInteractable(leverX, leverY);
    if (!lever || lever.type !== 'lever') return null;

    lever.activated = !lever.activated;
    const link = this.leverLinks.get(lever.leverId);
    if (link) {
      const gate = this.getInteractable(link.gateX, link.gateY);
      if (gate) {
        gate.open = !gate.open;
        this.set(link.gateX, link.gateY, gate.open ? TILE.GATE_OPEN : TILE.GATE_CLOSED);
        return { type: 'lever', gateOpen: gate.open, gateX: link.gateX, gateY: link.gateY };
      }
    }
    return { type: 'lever', gateOpen: null };
  }

  /**
   * Toggle a torch lit/unlit.
   */
  toggleTorch(torchX, torchY) {
    const torch = this.getInteractable(torchX, torchY);
    if (!torch || torch.type !== 'torch') return null;

    torch.lit = !torch.lit;
    this.set(torchX, torchY, torch.lit ? TILE.TORCH_LIT : TILE.TORCH_UNLIT);
    return { type: 'torch', lit: torch.lit };
  }
}
