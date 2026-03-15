// Simple test for character system
import { Character } from './src/character/character.js';
import { CLASS_DATA } from './src/character/class-data.js';

console.log('Testing Character System...');

try {
  // Test fighter creation
  const fighter = new Character('TestFighter', 'fighter', 1);
  console.log('✓ Fighter created:', fighter.name, fighter.class, 'STR:', fighter.stats.str);
  
  // Test level up
  fighter.xp = 300;
  const leveledUp = fighter.checkLevelUp();
  console.log('✓ Level up result:', leveledUp, 'New level:', fighter.level, 'New STR:', fighter.stats.str);
  
  // Test all classes exist
  Object.keys(CLASS_DATA).forEach(classKey => {
    const char = new Character('Test', classKey);
    console.log(`✓ ${CLASS_DATA[classKey].name} class works`);
  });
  
  console.log('All character system tests passed!');
} catch (error) {
  console.error('Test failed:', error.message);
}
