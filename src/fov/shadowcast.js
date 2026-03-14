/**
 * Symmetric Shadowcasting — Albert Ford's algorithm
 * Guarantees: if A sees B, B sees A (symmetry)
 * No floating-point errors — uses integer fractions
 */
export function computeFOV(originX, originY, radius, isOpaque, markVisible) {
  markVisible(originX, originY);

  for (let quadrant = 0; quadrant < 4; quadrant++) {
    scanQuadrant(quadrant, originX, originY, radius, isOpaque, markVisible);
  }
}

function scanQuadrant(quadrant, ox, oy, radius, isOpaque, markVisible) {
  function transform(row, col) {
    switch (quadrant) {
      case 0: return [ox + col, oy - row];
      case 1: return [ox + row, oy + col];
      case 2: return [ox + col, oy + row];
      case 3: return [ox - row, oy + col];
    }
  }

  function reveal(row, col) {
    const [x, y] = transform(row, col);
    markVisible(x, y);
  }

  function isBlocking(row, col) {
    const [x, y] = transform(row, col);
    return isOpaque(x, y);
  }

  function isSymmetric(row, startSlope, endSlope, col) {
    return col >= row * startSlope && col <= row * endSlope;
  }

  function scan(row, startSlope, endSlope) {
    if (row > radius) return;

    let prevBlocked = false;
    let savedEndSlope = endSlope;

    const minCol = Math.floor(row * startSlope + 0.5);
    const maxCol = Math.ceil(row * endSlope - 0.5);

    for (let col = minCol; col <= maxCol; col++) {
      const blocked = isBlocking(row, col);
      const symmetric = isSymmetric(row, startSlope, endSlope, col);

      if (blocked || symmetric) {
        reveal(row, col);
      }

      if (prevBlocked && !blocked) {
        startSlope = (col - 0.5) / (row - 0.5);
      }

      if (!prevBlocked && blocked) {
        const newEndSlope = (col + 0.5) / (row + 0.5);
        scan(row + 1, startSlope, newEndSlope);
      }

      prevBlocked = blocked;
    }

    if (!prevBlocked) {
      scan(row + 1, startSlope, savedEndSlope);
    }
  }

  scan(1, -1, 1);
}
