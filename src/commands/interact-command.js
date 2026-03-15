import { Command } from './command.js';
import { TILE } from '../core/constants.js';

export class InteractCommand extends Command {
  execute(world) {
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
    
    // Could handle other interactions here (chests, doors, NPCs, etc.)
    return false;
  }
  
  undo(world) {
    // Stair interactions are not easily reversible
    // Could implement floor undo, but for now stairs are one-way
  }
}
