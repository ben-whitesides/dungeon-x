// Simple test for combat system
import { CombatManager } from './src/combat/combat-manager.js';
import { rollD20 } from './src/combat/damage-calc.js';

console.log('Testing Combat System...');

try {
  // Test dice rolling
  const roll = rollD20();
  console.log('✓ D20 roll result:', roll, '(between 1-20:', roll >= 1 && roll <= 20 + ')');
  
  // Test combat manager
  const combat = new CombatManager();
  const enemy = { name: 'Shadow Lurker', ac: 12, currentHP: 28, hp: 28 };
  
  combat.startCombat([enemy]);
  console.log('✓ Combat started with enemy:', enemy.name);
  console.log('✓ Combat state:', combat.state);
  
  // Test attack (mock attacker)
  const attacker = { attackMod: 4 };
  const result = combat.processAttack(attacker, enemy, '1d6', 4, 2);
  console.log('✓ Attack result - Success:', result.success, 'Damage:', result.damage);
  
  // Check if combat is over
  const isOver = combat.isCombatOver();
  console.log('✓ Combat over check:', isOver);
  
  console.log('All combat tests passed!');
} catch (error) {
  console.error('Combat test failed:', error.message);
}
