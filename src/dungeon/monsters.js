// Monster data — inlined for browser compatibility
const monstersData = {
  // === Tier 1: Crypts ===
  "shadow_lurker": { name: "Shadow Lurker", ac: 12, hp: "4d8+4", attack: "1d6+2", damageType: "slashing", xp: 100, sprite: "dcss-shadow-lurker", vulnerabilities: ["fire"], resistances: ["ice"] },
  "bone_revenant": { name: "Bone Revenant", ac: 16, hp: "6d10+12", attack: "1d10+4", damageType: "slashing", xp: 250, sprite: "dcss-bone-revenant", vulnerabilities: ["stone", "light"], resistances: ["fire"] },
  "frost_wraith": { name: "Frost Wraith", ac: 13, hp: "3d8+3", attack: "1d8+3", damageType: "cold", xp: 150, sprite: "dcss-frost-wraith", vulnerabilities: ["fire"], resistances: ["stone"] },

  // === Tier 1: Goblin Warrens ===
  "goblin_scrapper": { name: "Goblin Scrapper", ac: 13, hp: "2d6+2", attack: "1d6+1", damageType: "slashing", xp: 50, sprite: "dcss-goblin-scrapper", vulnerabilities: ["fire"], resistances: [] },
  "goblin_archer": { name: "Goblin Archer", ac: 12, hp: "2d6+1", attack: "1d6+2", damageType: "piercing", xp: 65, sprite: "dcss-goblin-archer", vulnerabilities: ["fire"], resistances: [] },
  "goblin_shaman": { name: "Goblin Shaman", ac: 11, hp: "2d6+0", attack: "1d4+0", damageType: "necrotic", xp: 100, sprite: "dcss-goblin-shaman", vulnerabilities: ["fire"], resistances: ["necrotic"] },
  "hobgoblin": { name: "Hobgoblin", ac: 15, hp: "3d8+6", attack: "1d8+2", damageType: "slashing", xp: 200, sprite: "dcss-hobgoblin", vulnerabilities: ["fire"], resistances: [] },
  "gretchka_elder": { name: "Gretchka the Elder", ac: 16, hp: "12d10+36", attack: "2d6+4", damageType: "slashing", xp: 1500, sprite: "dcss-gretchka-elder", vulnerabilities: ["fire", "light"], resistances: ["necrotic"], special: "summons_goblins" },

  // === Tier 2: Flooded Vaults ===
  "drowned_warden": { name: "Drowned Warden", ac: 14, hp: "5d8+5", attack: "1d8+3", damageType: "cold", xp: 125, sprite: "enemy_zombie", vulnerabilities: ["fire", "lightning"], resistances: ["cold"] },
  "water_serpent": { name: "Water Serpent", ac: 13, hp: "3d8+6", attack: "1d6+3", damageType: "piercing", xp: 100, sprite: "enemy_imp", vulnerabilities: ["lightning"], resistances: ["cold", "fire"] },
  "vault_guardian": { name: "Vault Guardian", ac: 17, hp: "7d10+14", attack: "1d10+5", damageType: "slashing", xp: 300, sprite: "enemy_bone_shield", vulnerabilities: ["lightning"], resistances: ["cold", "slashing"] },

  // === Tier 2: Ember Depths ===
  "fire_imp": { name: "Fire Imp", ac: 13, hp: "3d6+3", attack: "1d6+2", damageType: "fire", xp: 100, sprite: "enemy_imp", vulnerabilities: ["cold", "water"], resistances: ["fire"] },
  "magma_beetle": { name: "Magma Beetle", ac: 16, hp: "4d8+8", attack: "1d8+3", damageType: "fire", xp: 150, sprite: "enemy_goblin", vulnerabilities: ["cold"], resistances: ["fire", "slashing"] },
  "ember_wraith": { name: "Ember Wraith", ac: 14, hp: "6d8+6", attack: "1d10+4", damageType: "fire", xp: 250, sprite: "enemy_shadow", vulnerabilities: ["cold", "light"], resistances: ["fire", "necrotic"] },

  // === Tier 2: Frozen Abyss ===
  "ice_stalker": { name: "Ice Stalker", ac: 14, hp: "4d8+4", attack: "1d8+3", damageType: "cold", xp: 125, sprite: "enemy_skeleton", vulnerabilities: ["fire"], resistances: ["cold"] },
  "frozen_sentinel": { name: "Frozen Sentinel", ac: 17, hp: "5d10+10", attack: "1d10+4", damageType: "cold", xp: 200, sprite: "enemy_bone_shield", vulnerabilities: ["fire", "light"], resistances: ["cold", "piercing"] },
  "blizzard_elemental": { name: "Blizzard Elemental", ac: 15, hp: "8d8+8", attack: "2d6+3", damageType: "cold", xp: 350, sprite: "enemy_death_speaker", vulnerabilities: ["fire"], resistances: ["cold", "slashing", "piercing"] },

  // === Tier 3: Shattered Halls ===
  "stone_golem": { name: "Stone Golem", ac: 18, hp: "6d10+18", attack: "2d8+4", damageType: "slashing", xp: 250, sprite: "enemy_bone_shield", vulnerabilities: ["lightning"], resistances: ["slashing", "piercing", "fire"] },
  "hall_phantom": { name: "Hall Phantom", ac: 13, hp: "4d8+4", attack: "1d8+3", damageType: "necrotic", xp: 175, sprite: "enemy_shadow", vulnerabilities: ["light"], resistances: ["slashing", "piercing", "cold"] },
  "crumbling_knight": { name: "Crumbling Knight", ac: 16, hp: "5d10+10", attack: "1d10+5", damageType: "slashing", xp: 225, sprite: "enemy_skeleton", vulnerabilities: ["light", "fire"], resistances: ["cold"] },

  // === Tier 3: Howling Spire ===
  "wind_harpy": { name: "Wind Harpy", ac: 14, hp: "4d8+4", attack: "1d6+3", damageType: "slashing", xp: 150, sprite: "enemy_imp", vulnerabilities: ["lightning"], resistances: ["cold"] },
  "storm_elemental": { name: "Storm Elemental", ac: 15, hp: "6d8+12", attack: "2d6+4", damageType: "lightning", xp: 300, sprite: "enemy_death_speaker", vulnerabilities: ["stone"], resistances: ["lightning", "cold"] },
  "spire_watcher": { name: "Spire Watcher", ac: 16, hp: "5d10+15", attack: "1d10+5", damageType: "piercing", xp: 275, sprite: "enemy_druid", vulnerabilities: ["fire"], resistances: ["cold", "lightning"] },

  // === Tier 4: Void Chambers ===
  "void_tendril": { name: "Void Tendril", ac: 14, hp: "5d8+5", attack: "1d8+4", damageType: "necrotic", xp: 200, sprite: "enemy_shadow", vulnerabilities: ["light"], resistances: ["necrotic", "cold"] },
  "null_wraith": { name: "Null Wraith", ac: 15, hp: "6d8+12", attack: "2d6+3", damageType: "necrotic", xp: 300, sprite: "enemy_death_speaker", vulnerabilities: ["light", "fire"], resistances: ["necrotic", "cold", "slashing"] },
  "void_sentinel": { name: "Void Sentinel", ac: 18, hp: "8d10+16", attack: "2d8+5", damageType: "necrotic", xp: 450, sprite: "enemy_bone_shield", vulnerabilities: ["light"], resistances: ["necrotic", "slashing", "piercing"] },

  // === Tier 4: Crystal Sanctum ===
  "crystal_golem": { name: "Crystal Golem", ac: 19, hp: "8d10+24", attack: "2d8+5", damageType: "light", xp: 400, sprite: "enemy_bone_shield", vulnerabilities: ["necrotic"], resistances: ["light", "slashing", "piercing", "fire"] },
  "prismatic_wisp": { name: "Prismatic Wisp", ac: 14, hp: "4d8+4", attack: "1d8+4", damageType: "light", xp: 200, sprite: "enemy_imp", vulnerabilities: ["necrotic", "cold"], resistances: ["light", "fire"] },
  "sanctum_guardian": { name: "Sanctum Guardian", ac: 17, hp: "10d10+20", attack: "2d10+5", damageType: "light", xp: 600, sprite: "enemy_druid", vulnerabilities: ["necrotic"], resistances: ["light", "slashing", "cold"] },

  // === Tier 5: Final Descent ===
  "abyssal_horror": { name: "Abyssal Horror", ac: 16, hp: "8d10+16", attack: "2d8+5", damageType: "necrotic", xp: 500, sprite: "enemy_death_speaker", vulnerabilities: ["light"], resistances: ["necrotic", "cold", "fire"] },
  "ancient_lich": { name: "Ancient Lich", ac: 18, hp: "10d10+30", attack: "2d10+6", damageType: "necrotic", xp: 750, sprite: "enemy_skull_pile", vulnerabilities: ["light", "fire"], resistances: ["necrotic", "cold", "slashing", "piercing"] },
  "the_sunstone_devourer": { name: "The Sunstone Devourer", ac: 20, hp: "15d10+50", attack: "3d8+7", damageType: "necrotic", xp: 2500, sprite: "enemy_mimic", vulnerabilities: ["light"], resistances: ["necrotic", "cold", "fire", "slashing", "piercing"], special: "absorbs_fragments" },
};

// Monster instance counter for deterministic IDs
let monsterCounter = 0;

// Roll HP from dice notation (e.g., "4d8+4" → roll 4d8 and add 4)
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
  switch (dungeonType) {
    case 'goblin_warrens':
      if (floor <= 2) return ['goblin_scrapper', 'goblin_archer'];
      return ['goblin_shaman', 'hobgoblin'];

    case 'flooded_vaults':
      if (floor <= 1) return ['drowned_warden', 'water_serpent'];
      return ['drowned_warden', 'water_serpent', 'vault_guardian'];

    case 'ember_depths':
      if (floor <= 2) return ['fire_imp', 'magma_beetle'];
      return ['fire_imp', 'magma_beetle', 'ember_wraith'];

    case 'frozen_abyss':
      if (floor <= 2) return ['ice_stalker', 'frozen_sentinel'];
      return ['ice_stalker', 'frozen_sentinel', 'blizzard_elemental'];

    case 'shattered_halls':
      if (floor <= 2) return ['hall_phantom', 'crumbling_knight'];
      return ['stone_golem', 'hall_phantom', 'crumbling_knight'];

    case 'howling_spire':
      if (floor <= 2) return ['wind_harpy', 'spire_watcher'];
      return ['wind_harpy', 'storm_elemental', 'spire_watcher'];

    case 'void_chambers':
      if (floor <= 2) return ['void_tendril', 'null_wraith'];
      return ['void_tendril', 'null_wraith', 'void_sentinel'];

    case 'crystal_sanctum':
      if (floor <= 2) return ['prismatic_wisp', 'crystal_golem'];
      return ['prismatic_wisp', 'crystal_golem', 'sanctum_guardian'];

    case 'final_descent':
      if (floor <= 3) return ['abyssal_horror', 'ancient_lich'];
      return ['abyssal_horror', 'ancient_lich', 'the_sunstone_devourer'];

    default: // crypts
      if (floor <= 2) return ['shadow_lurker'];
      if (floor <= 4) return ['shadow_lurker', 'frost_wraith'];
      return ['shadow_lurker', 'frost_wraith', 'bone_revenant'];
  }
}
