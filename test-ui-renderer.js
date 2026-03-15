// Simple test for UI renderer
import { UIRenderer } from './src/render/ui-renderer.js';
import { Character } from './src/character/character.js';

console.log('Testing UI Renderer...');

try {
  const renderer = new UIRenderer();
  
  console.log('✓ UI renderer created');
  
  // Create test party
  const party = [
    new Character('Alice', 'fighter'),
    new Character('Bob', 'mage')
  ];
  
  // Mock canvas context
  const mockCtx = {
    fillStyle: '',
    fillRect: (...args) => console.log('fillRect called with:', args),
    fillText: (text, x, y) => console.log(`fillText: "${text}" at (${x}, ${y})`),
    canvas: { width: 800, height: 600 }
  };
  
  // Test party HUD rendering
  console.log('Testing party HUD render...');
  renderer.renderPartyHUD(mockCtx, party);
  console.log('✓ Party HUD render completed');
  
  // Test combat UI rendering
  console.log('Testing combat UI render...');
  const mockCombatState = { enemies: [] };
  renderer.renderCombatUI(mockCtx, mockCombatState, {});
  console.log('✓ Combat UI render completed');
  
  console.log('All UI renderer tests passed!');
} catch (error) {
  console.error('UI renderer test failed:', error.message);
}
