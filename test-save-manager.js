// Simple test for save manager and snapshots
import { SaveManager } from './src/core/save-manager.js';
import { Character } from './src/character/character.js';

console.log('Testing Save Manager and Snapshots...');

try {
  const manager = new SaveManager();
  
  console.log('✓ SaveManager created');
  
  // Create test party
  const party = [
    new Character('Alice', 'fighter'),
    new Character('Bob', 'mage')
  ];
  
  // Modify party state
  party[0].currentHP = 5; // Injured
  party[0].equipment.weapon = 'rusty_sword'; // New weapon
  party[1].xp = 350; // Gained XP
  
  console.log('✓ Party state modified before snapshot');
  
  // Create snapshot
  manager.createSnapshot(party);
  console.log('✓ Snapshot created');
  console.log('✓ Has snapshot:', manager.hasSnapshot());
  
  // Modify party further (simulate dungeon run)
  party[0].currentHP = 1; // More injured
  party[0].equipment.weapon = 'broken_sword'; // Weapon broke
  party[1].xp = 600; // More XP
  
  console.log('✓ Party state modified (simulating dungeon damage)');
  
  // Restore from snapshot
  manager.restoreSnapshot(party);
  console.log('✓ Snapshot restored');
  
  // Verify restoration
  console.log('✓ Alice HP restored:', party[0].currentHP === 5);
  console.log('✓ Alice weapon restored:', party[0].equipment.weapon === 'rusty_sword');
  console.log('✓ Bob XP kept:', party[1].xp === 600); // XP should be kept
  
  // Clear snapshot
  manager.clearSnapshot();
  console.log('✓ Snapshot cleared');
  console.log('✓ Has snapshot after clear:', manager.hasSnapshot());
  
  console.log('All save manager tests passed!');
} catch (error) {
  console.error('Save manager test failed:', error.message);
}
