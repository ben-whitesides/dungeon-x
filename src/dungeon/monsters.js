import { readFileSync } from 'fs';
import { calculateDamage } from '../combat/damage-calc.js';

// Load monster data
const monstersData = JSON.parse(readFileSync(new URL('../data/monsters.json', import.meta.url), 'utf8'));

export function createMonster(type) {
  const data = monstersData[type];
  if (!data) throw new Error(`Unknown monster type: ${type}`);
  
  const monster = {
    type: 'monster',
    ...data,
    currentHP: calculateDamage(data.hp), // Roll HP
    energy: 0,
    speed: 10, // Default speed
    id: `monster_${Date.now()}_${Math.random()}`
  };
  
  return monster;
}

export function getMonsterPool(floor) {
  // Return different monsters based on floor difficulty
  if (floor <= 2) {
    return ['shadow_lurker'];
  } else if (floor <= 4) {
    return ['shadow_lurker', 'frost_wraith'];
  } else {
    return ['shadow_lurker', 'frost_wraith', 'bone_revenant'];
  }
}
