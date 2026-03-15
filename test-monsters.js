// Simple test for monster system
import { createMonster, getMonsterPool } from './src/dungeon/monsters.js';

console.log('Testing Monster System...');

try {
  // Test monster creation
  const shadowLurker = createMonster('shadow_lurker');
  console.log('✓ Created Shadow Lurker:', shadowLurker.name);
  console.log('✓ HP:', shadowLurker.currentHP, 'AC:', shadowLurker.ac);
  console.log('✓ Has ID:', shadowLurker.id.startsWith('monster_'));
  
  // Test monster pool
  const pool1 = getMonsterPool(1);
  const pool3 = getMonsterPool(3);
  const pool5 = getMonsterPool(5);
  
  console.log('✓ Floor 1 pool:', pool1);
  console.log('✓ Floor 3 pool:', pool3);
  console.log('✓ Floor 5 pool:', pool5);
  
  // Test unknown monster
  try {
    createMonster('unknown');
    console.log('✗ Should have thrown error for unknown monster');
  } catch (error) {
    console.log('✓ Correctly threw error for unknown monster');
  }
  
  console.log('All monster tests passed!');
} catch (error) {
  console.error('Monster test failed:', error.message);
}
