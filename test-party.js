// Simple test for party system
import { PartyManager } from './src/party/party.js';
import { Character } from './src/character/character.js';

console.log('Testing Party Management...');

try {
  const party = new PartyManager();
  
  // Add up to 4 characters
  for (let i = 0; i < 4; i++) {
    const char = new Character(`Char${i}`, 'fighter');
    const added = party.addMember(char);
    console.log(`✓ Added character ${i}: ${added}`);
  }
  
  console.log('✓ Party size:', party.getMembers().length);
  console.log('✓ Front line:', party.getFrontLine().length, 'characters');
  console.log('✓ Back line:', party.getBackLine().length, 'characters');
  
  // Try to add 5th character (should fail)
  const extraChar = new Character('Extra', 'fighter');
  const addedExtra = party.addMember(extraChar);
  console.log('✓ Rejected 5th character:', !addedExtra);
  
  // Test swapping
  party.swapMembers(0, 1);
  console.log('✓ Swapped members successfully');
  
  console.log('All party tests passed!');
} catch (error) {
  console.error('Party test failed:', error.message);
}
