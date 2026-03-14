import { TILE, DUNGEON_WIDTH, DUNGEON_HEIGHT } from '../core/constants.js';
import { TileMap } from './tile-map.js';
import { isFullyConnected } from './flood-fill.js';

const MIN_ROOM = 5;
const MAX_DEPTH = 5;

export function generateDungeon(rng, width = DUNGEON_WIDTH, height = DUNGEON_HEIGHT) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const map = new TileMap(width, height);
    const root = { x: 1, y: 1, w: width - 2, h: height - 2 };

    split(root, rng, 0);
    const leaves = getLeaves(root);

    for (const leaf of leaves) {
      carveRoom(map, leaf, rng);
    }

    connectBSP(map, root, rng);

    if (map.rooms.length >= 2) {
      const first = map.rooms[0];
      const last = map.rooms[map.rooms.length - 1];
      map.set(first.cx, first.cy, TILE.STAIRS_UP);
      map.set(last.cx, last.cy, TILE.STAIRS_DOWN);
    }

    if (isFullyConnected(map)) {
      return map;
    }
  }

  throw new Error('Failed to generate connected dungeon after 10 attempts');
}

function split(node, rng, depth) {
  if (depth >= MAX_DEPTH || node.w < MIN_ROOM * 2 + 3 || node.h < MIN_ROOM * 2 + 3) {
    return;
  }

  const splitH = node.w > node.h
    ? rng.next() < 0.8
    : rng.next() < 0.2;

  if (splitH) {
    if (node.h < MIN_ROOM * 2 + 3) return;
    const splitAt = rng.nextInt(MIN_ROOM + 1, node.h - MIN_ROOM - 1);
    node.left  = { x: node.x, y: node.y, w: node.w, h: splitAt };
    node.right = { x: node.x, y: node.y + splitAt, w: node.w, h: node.h - splitAt };
  } else {
    if (node.w < MIN_ROOM * 2 + 3) return;
    const splitAt = rng.nextInt(MIN_ROOM + 1, node.w - MIN_ROOM - 1);
    node.left  = { x: node.x, y: node.y, w: splitAt, h: node.h };
    node.right = { x: node.x + splitAt, y: node.y, w: node.w - splitAt, h: node.h };
  }

  split(node.left, rng, depth + 1);
  split(node.right, rng, depth + 1);
}

function getLeaves(node) {
  if (!node.left && !node.right) return [node];
  const leaves = [];
  if (node.left) leaves.push(...getLeaves(node.left));
  if (node.right) leaves.push(...getLeaves(node.right));
  return leaves;
}

function carveRoom(map, leaf, rng) {
  const margin = 1;
  const maxW = leaf.w - margin * 2;
  const maxH = leaf.h - margin * 2;
  if (maxW < MIN_ROOM || maxH < MIN_ROOM) return;

  const rw = rng.nextInt(MIN_ROOM, maxW);
  const rh = rng.nextInt(MIN_ROOM, maxH);
  const rx = leaf.x + margin + rng.nextInt(0, maxW - rw);
  const ry = leaf.y + margin + rng.nextInt(0, maxH - rh);

  const room = { x: rx, y: ry, w: rw, h: rh, cx: rx + (rw >> 1), cy: ry + (rh >> 1) };

  for (let y = ry; y < ry + rh; y++) {
    for (let x = rx; x < rx + rw; x++) {
      map.set(x, y, TILE.FLOOR);
    }
  }

  leaf.room = room;
  map.rooms.push(room);
}

function getRoomFromNode(node) {
  if (node.room) return node.room;
  if (node.left) {
    const r = getRoomFromNode(node.left);
    if (r) return r;
  }
  if (node.right) {
    const r = getRoomFromNode(node.right);
    if (r) return r;
  }
  return null;
}

function connectBSP(map, node, rng) {
  if (!node.left || !node.right) return;

  connectBSP(map, node.left, rng);
  connectBSP(map, node.right, rng);

  const roomA = getRoomFromNode(node.left);
  const roomB = getRoomFromNode(node.right);
  if (!roomA || !roomB) return;

  carveCorridor(map, roomA.cx, roomA.cy, roomB.cx, roomB.cy, rng);
}

function carveCorridor(map, x1, y1, x2, y2, rng) {
  if (rng.next() < 0.5) {
    carveH(map, x1, x2, y1);
    carveV(map, y1, y2, x2);
  } else {
    carveV(map, y1, y2, x1);
    carveH(map, x1, x2, y2);
  }
}

function carveH(map, x1, x2, y) {
  const start = Math.min(x1, x2);
  const end = Math.max(x1, x2);
  for (let x = start; x <= end; x++) {
    if (map.get(x, y) === TILE.WALL) map.set(x, y, TILE.FLOOR);
  }
}

function carveV(map, y1, y2, x) {
  const start = Math.min(y1, y2);
  const end = Math.max(y1, y2);
  for (let y = start; y <= end; y++) {
    if (map.get(x, y) === TILE.WALL) map.set(x, y, TILE.FLOOR);
  }
}
