import { readFileSync } from 'fs';

// Load monster data
const monstersData = JSON.parse(readFileSync(new URL('../data/monsters.json', import.meta.url), 'utf8'));

export function createMonster(type) {
  const data = monstersData[type];
  if (!data) throw new Error(`Unknown monster type: ${type}`);
  
  const monster = {
    type: 'monster',
    ...data,
    currentHP: 10, // Simplified HP for testing
    energy: 0,
    speed: 10, // Default speed
    id: `monster_${Date.now()}_${Math.random()}`
  };
  
  return monster;
}

export function getMonsterPool(floor, dungeonType = 'crypts') {
  // Return different monsters based on dungeon type and floor difficulty
  if (dungeonType === 'goblin_warrens') {
    if (floor <= 2) {
      return ['goblin_scrapper', 'goblin_archer'];
    } else if (floor === 3) {
      return ['goblin_shaman', 'hobgoblin']; // Boss floor
    } else {
      return ['goblin_scrapper', 'goblin_archer', 'goblin_shaman', 'hobgoblin'];
    }
  } else {
    // Default crypts dungeon
    if (floor <= 2) {
      return ['shadow_lurker'];
    } else if (floor <= 4) {
      return ['shadow_lurker', 'frost_wraith'];
    } else {
      return ['shadow_lurker', 'frost_wraith', 'bone_revenant'];
    }
  }
}
