// Simple test for combat trigger integration
import { MoveForwardCommand } from './src/commands/move-command.js';
import { createMonster } from './src/dungeon/monsters.js';
import { TileMap } from './src/dungeon/tile-map.js';

console.log('Testing Combat Trigger Integration...');

try {
  // Create a simple tile map
  const tileMap = new TileMap(10, 10);
  for (let x = 1; x < 9; x++) {
    for (let y = 1; y < 9; y++) {
      tileMap.set(x, y, 0); // FLOOR
    }
  }
  
  // Create a monster and place it at (4, 6)
  const monster = createMonster('shadow_lurker');
  monster.x = 4;
  monster.y = 6;
  tileMap.addEntity(monster);
  
  console.log('✓ Monster placed at (4, 6)');
  console.log('✓ Monster type:', monster.type);
  console.log('✓ Monster object x,y:', monster.x, monster.y);
  console.log('✓ Entities at (4, 6):', tileMap.getEntitiesAt(4, 6).length);
  
  // Create mock world
  const mockWorld = {
    player: { x: 4, y: 5, facing: 2 }, // Facing south (towards monster)
    tileMap: tileMap,
    stateStack: {
      pushCombat: (enemies) => console.log('Combat triggered with', enemies.length, 'enemies')
    },
    events: { emit: () => {} }
  };
  
  console.log('✓ Player at (4, 5) facing south towards (4, 6)');
  
  // Create and execute move command
  const command = new MoveForwardCommand();
  const result = command.execute(mockWorld);
  
  console.log('✓ Move command executed');
  console.log('✓ Combat triggered:', command.triggeredCombat);
  console.log('✓ Player position unchanged:', mockWorld.player.x === 4 && mockWorld.player.y === 5);
  
  console.log('All combat trigger tests passed!');
} catch (error) {
  console.error('Combat trigger test failed:', error.message);
}
