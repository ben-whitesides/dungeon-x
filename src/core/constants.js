// Canvas dimensions (internal resolution, CSS scales to viewport)
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

// Dungeon grid
export const TILE_SIZE = 32;           // Minimap tile size
export const DUNGEON_WIDTH = 40;       // Tiles wide
export const DUNGEON_HEIGHT = 30;      // Tiles tall

// Tile types
export const TILE = Object.freeze({
  VOID:   0,
  WALL:   1,
  FLOOR:  2,
  DOOR:   3,
  STAIRS_DOWN: 4,
  STAIRS_UP:   5,
  CHEST:  6,
});

// Cardinal directions (for player facing)
export const DIR = Object.freeze({
  NORTH: 0,
  EAST:  1,
  SOUTH: 2,
  WEST:  3,
});

// Direction vectors [dx, dy] indexed by DIR
export const DIR_VECTOR = Object.freeze([
  [0, -1],  // NORTH
  [1,  0],  // EAST
  [0,  1],  // SOUTH
  [-1, 0],  // WEST
]);

// Canvas layer names (bottom to top)
export const LAYERS = Object.freeze([
  'floor',
  'objects',
  'entities',
  'effects',
  'fog',
  'ui',
]);

// FOV
export const FOV_RADIUS = 8;

// First-person view dimensions (within the 800x600 canvas)
export const FP_VIEW = Object.freeze({
  x: 0,
  y: 0,
  width: 600,
  height: 450,
});

// Minimap dimensions
export const MINIMAP = Object.freeze({
  x: 610,
  y: 10,
  width: 180,
  height: 180,
  tileSize: 4,  // Pixels per tile on minimap
});

