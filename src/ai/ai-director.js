export class AIDirector {
  decideAction(monster, player, world) {
    // Simple chase AI - move toward player or attack if adjacent
    const dx = player.x - monster.x;
    const dy = player.y - monster.y;
    
    // If adjacent to player, attack
    if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
      return { type: 'attack', target: player };
    }
    
    // Otherwise, move toward player
    // Normalize to single step
    const stepX = dx === 0 ? 0 : dx > 0 ? 1 : -1;
    const stepY = dy === 0 ? 0 : dy > 0 ? 1 : -1;
    
    // Check if move is valid
    const newX = monster.x + stepX;
    const newY = monster.y + stepY;
    
    if (world.tileMap.isWalkable(newX, newY)) {
      return { type: 'move', dx: stepX, dy: stepY };
    }
    
    // If can't move toward player, try other directions or just wait
    return { type: 'wait' };
  }
  
  executeAction(action, monster, world) {
    if (action.type === 'move') {
      // Update monster position
      world.tileMap.removeEntity(monster);
      monster.x += action.dx;
      monster.y += action.dy;
      world.tileMap.addEntity(monster);
    } else if (action.type === 'attack') {
      // Trigger attack through combat system
      if (world.combat) {
        world.combat.processAttack(monster, action.target);
      }
    } else if (action.type === 'wait') {
      // Do nothing
    }
  }
}
