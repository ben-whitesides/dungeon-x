import { createMonster } from '../dungeon/monsters.js';

export class AIDirector {
  decideAction(monster, player, world) {
    // Special handling for Gretchka boss
    if (monster.id && monster.id.includes('gretchka')) {
      return this.decideGretchkaAction(monster, player, world);
    }
    
    // Default AI: chase and attack player
    return this.decideDefaultAction(monster, player);
  }
  
  decideDefaultAction(monster, player) {
    const dx = player.x - monster.x;
    const dy = player.y - monster.y;
    const distance = Math.abs(dx) + Math.abs(dy);
    
    // If adjacent to player, attack
    if (distance === 1) {
      return { type: 'attack', target: player };
    }
    
    // Otherwise chase player
    return this.getChaseAction(monster, player);
  }
  
  decideGretchkaAction(monster, player, world) {
    const dx = player.x - monster.x;
    const dy = player.y - monster.y;
    const distance = Math.abs(dx) + Math.abs(dy);
    
    // If adjacent to player, attack
    if (distance === 1) {
      return { type: 'attack', target: player };
    }
    
    // If goblin dens remain, try to summon
    if (world.tileMap.goblinDens.size > 0 && Math.random() < 0.3) {
      return { type: 'summon' };
    }
    
    // Otherwise chase player
    return this.getChaseAction(monster, player);
  }
  
  getChaseAction(monster, player) {
    const dx = player.x - monster.x;
    const dy = player.y - monster.y;
    
    // Move towards player
    let moveDx = 0;
    let moveDy = 0;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      moveDx = dx > 0 ? 1 : -1;
    } else {
      moveDy = dy > 0 ? 1 : -1;
    }
    
    return { type: 'move', dx: moveDx, dy: moveDy };
  }
  
  executeAction(action, monster, world) {
    // Special handling for Gretchka boss
    if (monster.id && monster.id.includes('gretchka')) {
      return this.executeGretchkaAction(action, monster, world);
    }
    
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
  
  executeGretchkaAction(action, monster, world) {
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
    } else if (action.type === 'summon') {
      // Special summon action for Gretchka
      if (world.tileMap.goblinDens.size > 0) {
        // Summon goblin minions from remaining dens
        this.summonGoblinMinions(monster, world);
      }
    }
  }
  
  summonGoblinMinions(gretchka, world) {
    // Summon 1-2 goblin minions if dens remain
    const numSummons = Math.min(world.tileMap.goblinDens.size, 2);
    const goblinTypes = ['goblin_scrapper', 'goblin_archer', 'goblin_shaman'];
    
    for (let i = 0; i < numSummons; i++) {
      const goblinType = goblinTypes[Math.floor(Math.random() * goblinTypes.length)];
      const goblin = createMonster(goblinType);
      
      // Place near Gretchka
      goblin.x = gretchka.x + (Math.random() > 0.5 ? 1 : -1);
      goblin.y = gretchka.y + (Math.random() > 0.5 ? 1 : -1);
      
      world.tileMap.addEntity(goblin);
    }
  }
}
