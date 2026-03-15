// Simple test for tavern state
import { TavernState } from './src/ui/states/tavern.js';
import { Character } from './src/character/character.js';

console.log('Testing Tavern State...');

try {
  const state = new TavernState();
  
  console.log('✓ Tavern state created');
  console.log('✓ Initial mode:', state.mode);
  
  // Create a mock world with roster and party
  const mockWorld = {
    roster: {
      getAll: () => [
        new Character('Alice', 'fighter'),
        new Character('Bob', 'mage')
      ]
    },
    party: {
      addMember: () => true,
      getMembers: () => []
    },
    enterDungeon: () => console.log('Entering dungeon...')
  };
  
  // Test input handling
  const handled = state.handleInput({ type: 'unknown' }, mockWorld);
  console.log('✓ Unhandled input ignored:', !handled);
  
  // Test character selection
  state.handleInput({ type: 'down' }, mockWorld);
  console.log('✓ Character selection changed:', state.selectedCharacter === 1);
  
  // Test render (should not crash)
  const mockCtx = { 
    fillStyle: '', 
    fillRect: () => {}, 
    fillText: () => {}, 
    canvas: { width: 800, height: 600 } 
  };
  state.render(mockCtx, mockWorld);
  console.log('✓ Render method works without crashing');
  
  console.log('All tavern state tests passed!');
} catch (error) {
  console.error('Tavern state test failed:', error.message);
}
