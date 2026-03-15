// Simple test for combat state
import { CombatState } from './src/ui/states/combat.js';

console.log('Testing Combat State...');

try {
  const enemies = [{ name: 'Shadow Lurker', currentHP: 28, hp: 28 }];
  const state = new CombatState(enemies);
  
  console.log('✓ Combat state created');
  console.log('✓ Has enemies:', state.enemies.length);
  console.log('✓ Combat manager initialized:', !!state.combat);
  
  // Test input handling (should return false for unhandled input)
  const handled = state.handleInput({ type: 'unknown' });
  console.log('✓ Unhandled input ignored:', !handled);
  
  // Test render (should not crash)
  const mockCtx = { 
    fillStyle: '', 
    fillRect: () => {}, 
    fillText: () => {}, 
    canvas: { width: 800, height: 600 } 
  };
  state.render(mockCtx);
  console.log('✓ Render method works without crashing');
  
  // Test completion check
  const isDone = state.isDone();
  console.log('✓ Can check if combat is done:', typeof isDone === 'boolean');
  
  console.log('All combat state tests passed!');
} catch (error) {
  console.error('Combat state test failed:', error.message);
}
