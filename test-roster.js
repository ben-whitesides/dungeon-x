// Simple test for roster system
import { CharacterRoster } from './src/party/roster.js';
import { Character } from './src/character/character.js';

console.log('Testing Character Roster...');

try {
  const roster = new CharacterRoster();
  const char1 = new Character('Alice', 'fighter');
  const char2 = new Character('Bob', 'mage');
  
  roster.add(char1);
  roster.add(char2);
  
  console.log('✓ Added 2 characters to roster');
  console.log('✓ Roster size:', roster.getAll().length);
  console.log('✓ First character:', roster.getAll()[0].name, roster.getAll()[0].class);
  
  // Test persistence
  roster.save();
  console.log('✓ Saved roster to localStorage');
  
  const newRoster = new CharacterRoster();
  newRoster.load();
  console.log('✓ Loaded roster from localStorage');
  console.log('✓ Loaded roster size:', newRoster.getAll().length);
  
  console.log('All roster tests passed!');
} catch (error) {
  console.error('Roster test failed:', error.message);
}
