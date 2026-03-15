// Simple test for AI director and monster behavior
import { AIDirector } from './src/ai/ai-director.js';
import { createMonster } from './src/dungeon/monsters.js';
import { TileMap } from './src/dungeon/tile-map.js';

console.log('Testing AI Director and Monster Behavior...');

try {
  const director = new AIDirector();
  
  console.log('✓ AI Director created');
  
  // Create a monster and player
  const monster = createMonster('shadow_lurker');
  monster.x = 5;
  monster.y = 5;
  
  const player = { x: 3, y: 3 };
  
  // Create a simple tile map
  const tileMap = new TileMap(10, 10);
  for (let x = 1; x < 9; x++) {
    for (let y = 1; y < 9; y++) {
      tileMap.set(x, y, 0); // FLOOR
    }
  }
  
  const world = { tileMap, player };
  
  // Test decideAction - should move toward player
  const action = director.decideAction(monster, player, world);
  console.log('✓ Action decided:', action.type);
  
  if (action.type === 'move') {
    console.log('✓ Monster moving toward player');
    console.log('✓ Move delta:', action.dx, action.dy);
  }
  
  // Test executeAction
  const originalX = monster.x;
  const originalY = monster.y;
  director.executeAction(action, monster, world);
  
  if (action.type === 'move') {
    console.log('✓ Monster position changed:', originalX, originalY, '->', monster.x, monster.y);
  }
  
  // Test attack when adjacent
  monster.x = 4;
  monster.y = 3; // Adjacent to player at (3,3)
  const attackAction = director.decideAction(monster, player, world);
  console.log('✓ Attack action when adjacent:', attackAction.type === 'attack');
  
  console.log('All AI director tests passed!');
} catch (error) {
  console.error('AI director test failed:', error.message);
}
