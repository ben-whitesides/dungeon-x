// D&D 5e XP thresholds for medium-fast progression
export const LEVEL_DATA = [
  { xp: 0, proficiencyBonus: 2, features: [] },
  { xp: 300, proficiencyBonus: 2, features: ['abilityScoreIncrease'] },
  { xp: 900, proficiencyBonus: 2, features: ['classFeature'] },
  { xp: 2700, proficiencyBonus: 2, features: ['abilityScoreIncrease'] },
  { xp: 6500, proficiencyBonus: 3, features: ['extraAttack', 'classFeature'] },
  { xp: 14000, proficiencyBonus: 3, features: ['abilityScoreIncrease'] },
  { xp: 23000, proficiencyBonus: 3, features: ['classFeature'] },
  { xp: 34000, proficiencyBonus: 3, features: ['abilityScoreIncrease'] },
  { xp: 48000, proficiencyBonus: 4, features: ['classFeature'] },
  { xp: 64000, proficiencyBonus: 4, features: ['abilityScoreIncrease'] },
  { xp: 85000, proficiencyBonus: 4, features: ['epicFeature'] }
];

// Level-up choices for ability score increases
export const ABILITY_CHOICES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export function getXPForLevel(level) {
  return LEVEL_DATA[level - 1]?.xp || 0;
}

export function getLevelFromXP(xp) {
  for (let i = LEVEL_DATA.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_DATA[i].xp) {
      return i + 1;
    }
  }
  return 1;
}

export function getProficiencyBonus(level) {
  return LEVEL_DATA[Math.min(level - 1, LEVEL_DATA.length - 1)]?.proficiencyBonus || 2;
}
