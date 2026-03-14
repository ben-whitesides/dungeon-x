export function floodFill(tileMap, startX, startY) {
  const visited = new Set();
  const stack = [[startX, startY]];

  while (stack.length > 0) {
    const [x, y] = stack.pop();
    const key = x + y * tileMap.width;
    if (visited.has(key)) continue;
    if (x < 0 || x >= tileMap.width || y < 0 || y >= tileMap.height) continue;
    if (!tileMap.isWalkable(x, y)) continue;

    visited.add(key);
    stack.push([x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]);
  }
  return visited;
}

export function isFullyConnected(tileMap) {
  let startX = -1, startY = -1;
  for (let y = 0; y < tileMap.height; y++) {
    for (let x = 0; x < tileMap.width; x++) {
      if (tileMap.isWalkable(x, y)) {
        startX = x; startY = y;
        break;
      }
    }
    if (startX !== -1) break;
  }
  if (startX === -1) return false;

  const reached = floodFill(tileMap, startX, startY);

  let totalWalkable = 0;
  for (let i = 0; i < tileMap.tiles.length; i++) {
    const t = tileMap.tiles[i];
    if (t !== 0 && t !== 1) totalWalkable++;
  }
  return reached.size === totalWalkable;
}
