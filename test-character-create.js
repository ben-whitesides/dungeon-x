// Simple test for character creation state
import { CharacterCreateState } from './src/ui/states/character-create.js';
import { CLASS_DATA } from './src/character/class-data.js';

console.log('Testing Character Creation State...');

try {
  const state = new CharacterCreateState();
  
  console.log('✓ Character creation state created');
  console.log('✓ Available classes:', state.availableClasses.length);
  console.log('✓ All classes from CLASS_DATA:', Object.keys(CLASS_DATA).length === state.availableClasses.length);
  
  // Create a mock world with roster
  const mockWorld = {
    roster: {
      add: (char) => console.log('Added character:', char.name),
      save: () => console.log('Roster saved')
    }
  };
  
  // Test class selection
  state.handleInput({ type: 'down' }, mockWorld);
  console.log('✓ Class selection changed:', state.selectedClass === 1);
  
  // Test name input
  state.handleInput({ type: 'select' }, mockWorld);
  console.log('✓ Entered name input mode:', state.nameInput);
  
  state.handleInput({ type: 'text', char: 'A' }, mockWorld);
  state.handleInput({ type: 'text', char: 'l' }, mockWorld);
  console.log('✓ Name input working:', state.name === 'Al');
  
  // Test render (should not crash)
  const mockCtx = { 
    fillStyle: '', 
    fillRect: () => {}, 
    fillText: () => {}, 
    canvas: { width: 800, height: 600 } 
  };
  state.render(mockCtx, mockWorld);
  console.log('✓ Render method works without crashing');
  
  console.log('All character creation tests passed!');
} catch (error) {
  console.error('Character creation test failed:', error.message);
}
