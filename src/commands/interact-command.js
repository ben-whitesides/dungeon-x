import { Command } from './command.js';
import { TILE } from '../core/constants.js';

export class InteractCommand extends Command {
  constructor() {
    super();
    this.destroyedDen = null;
  }

  execute(world) {
    this.destroyedDen = null;
    const [dx, dy] = [
      [0, -1], [1, 0], [0, 1], [-1, 0]
    ][world.player.facing];

    const targetX = world.player.x + dx;
    const targetY = world.player.y + dy;
    const targetTile = world.tileMap.get(targetX, targetY);

    // Handle stairs
    if (targetTile === TILE.STAIRS_DOWN) {
      world.goToNextFloor();
      return true;
    } else if (targetTile === TILE.STAIRS_UP) {
      world.goToPreviousFloor();
      return true;
    }

    // Handle torch (wall-mounted — interact with adjacent)
    if (targetTile === TILE.TORCH_UNLIT || targetTile === TILE.TORCH_LIT) {
      const result = world.tileMap.toggleTorch(targetX, targetY);
      if (result) {
        // Recompute FOV if torch state changed (lit torches increase visibility)
        world.recomputeFOV();
        console.log(`Torch ${result.lit ? 'lit' : 'extinguished'} at (${targetX}, ${targetY})`);
        return true;
      }
    }

    // Handle lever
    if (targetTile === TILE.LEVER) {
      const result = world.tileMap.activateLever(targetX, targetY);
      if (result) {
        console.log(`Lever pulled! Gate ${result.gateOpen ? 'opened' : 'closed'} at (${result.gateX}, ${result.gateY})`);
        return true;
      }
    }

    // Handle closed gate (can't walk through — inform player)
    if (targetTile === TILE.GATE_CLOSED) {
      console.log('A heavy portcullis blocks the way. Look for a lever.');
      return true;
    }

    // Also check the tile the player is standing on (for levers on floor)
    const standingTile = world.tileMap.get(world.player.x, world.player.y);
    if (standingTile === TILE.LEVER) {
      const result = world.tileMap.activateLever(world.player.x, world.player.y);
      if (result) {
        console.log(`Lever pulled! Gate ${result.gateOpen ? 'opened' : 'closed'}`);
        return true;
      }
    }

    return false;
  }

  undo(world) {
    // Stair/interact interactions are not easily reversible
  }
}
