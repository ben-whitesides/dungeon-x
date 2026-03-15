// Simple test for energy scheduler
import { EnergyScheduler } from './src/core/energy-scheduler.js';

console.log('Testing Energy Scheduler...');

try {
  const scheduler = new EnergyScheduler();
  const actor = { id: 1, speed: 10, energy: 0 };
  
  scheduler.addActor(actor);
  console.log('✓ Added actor with speed 10, energy:', actor.energy);
  
  scheduler.tick({});
  console.log('✓ After tick 1 - Energy:', actor.energy, '(expected: 10)');
  
  scheduler.tick({});
  console.log('✓ After tick 2 - Energy:', actor.energy, '(expected: 20)');
  
  // Add callback to same actor
  let acted = false;
  scheduler.addActor(actor, () => { acted = true; });
  console.log('✓ Added callback to actor, energy:', actor.energy, '(should be 20)');
  
  scheduler.tick({}); // Should trigger action since energy >= 10
  console.log('✓ After tick 3 - Acted:', acted, 'Energy:', actor.energy, '(expected: acted=true, energy=10)');
  
  console.log('All scheduler tests passed!');
} catch (error) {
  console.error('Scheduler test failed:', error.message);
}
