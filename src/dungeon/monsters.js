// Monster data — inlined for browser compatibility
const monstersData = {
  "shadow_lurker": { name: "Shadow Lurker", ac: 12, hp: "4d8+4", attack: "1d6+2", damageType: "slashing", xp: 100, sprite: "dcss-shadow-lurker", vulnerabilities: ["fire"], resistances: ["ice"] },
  "bone_revenant": { name: "Bone Revenant", ac: 16, hp: "6d10+12", attack: "1d10+4", damageType: "slashing", xp: 250, sprite: "dcss-bone-revenant", vulnerabilities: ["stone", "light"], resistances: ["fire"] },
  "frost_wraith": { name: "Frost Wraith", ac: 13, hp: "3d8+3", attack: "1d8+3", damageType: "cold", xp: 150, sprite: "dcss-frost-wraith", vulnerabilities: ["fire"], resistances: ["stone"] },
  "goblin_scrapper": { name: "Goblin Scrapper", ac: 13, hp: "2d6+2", attack: "1d6+1", damageType: "slashing", xp: 50, sprite: "dcss-goblin-scrapper", vulnerabilities: ["fire"], resistances: [] },
  "goblin_archer": { name: "Goblin Archer", ac: 12, hp: "2d6+1", attack: "1d6+2", damageType: "piercing", xp: 65, sprite: "dcss-goblin-archer", vulnerabilities: ["fire"], resistances: [] },
  "goblin_shaman": { name: "Goblin Shaman", ac: 11, hp: "2d6+0", attack: "1d4+0", damageType: "necrotic", xp: 100, sprite: "dcss-goblin-shaman", vulnerabilities: ["fire"], resistances: ["necrotic"] },
  "hobgoblin": { name: "Hobgoblin", ac: 15, hp: "3d8+6", attack: "1d8+2", damageType: "slashing", xp: 200, sprite: "dcss-hobgoblin", vulnerabilities: ["fire"], resistances: [] },
  "gretchka_elder": { name: "Gretchka the Elder", ac: 16, hp: "12d10+36", attack: "2d6+4", damageType: "slashing", xp: 1500, sprite: "dcss-gretchka-elder", vulnerabilities: ["fire", "light"], resistances: ["necrotic"], special: "summons_goblins" }
};

// Monster instance counter for deterministic IDs
let monsterCounter = 0;

// Roll HP from dice notation (e.g., "4d8+4" → roll 4d8 and add 4)
// Accepts optional seeded PRNG for deterministic rolls
function rollHP(diceNotation, rng = null) {
  const match = diceNotation.match(/(\d*)d(\d+)([+-]\d+)?/);
  if (!match) return 10;
  const count = parseInt(match[1]) || 1;
  const sides = parseInt(match[2]);
  const bonus = parseInt(match[3]) || 0;
  const rand = rng || Math.random;
  let total = bonus;
  for (let i = 0; i < count; i++) {
    total += Math.floor(rand() * sides) + 1;
  }
  return Math.max(1, total);
}

export function createMonster(type, rng = null) {
  const data = monstersData[type];
  if (!data) throw new Error(`Unknown monster type: ${type}`);

  const hp = rollHP(data.hp, rng);
  monsterCounter++;
  const monster = {
    type: 'monster',
    ...data,
    maxHP: hp,
    currentHP: hp,
    energy: 0,
    speed: 10,
    id: `monster_${type}_${monsterCounter}`
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
