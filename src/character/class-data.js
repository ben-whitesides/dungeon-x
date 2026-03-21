// Class data — stats match the Dungeon X Game Bible (Section 3)
// Starting stats are D&D 5e Level 1 standard arrays per class archetype
// HP = hit die max + CON modifier at Level 1

export const CLASS_DATA = {
  fighter: {
    name: 'Fighter',
    str: 16, dex: 10, con: 15, int: 8, wis: 12, cha: 9,
    hpDice: 'd10', hpDieMax: 10,
    startingAC: 16, // Chain Mail (15) + Shield (+1 effective, no DEX bonus)
    baseMana: 0,    // Fighters don't cast
    proficiencies: ['all weapons', 'heavy armor', 'shields'],
    savingThrows: ['str', 'con'], // D&D 5e Fighter saving throw proficiencies
    abilities: [
      { id: 'second_wind', name: 'Second Wind', type: 'heal', manaCost: 0, cooldown: 1,
        description: 'Regain 1d10 + level HP once per combat',
        effect: { healDice: '1d10', addLevel: true }, unlockLevel: 1 },
      { id: 'shield_bash', name: 'Shield Bash', type: 'attack', manaCost: 0, cooldown: 2,
        description: 'Bash with shield — 1d6 bludgeoning + STR, target stunned 1 turn',
        effect: { damage: '1d6', damageType: 'bludgeoning', statMod: 'str', stun: 1 }, unlockLevel: 1 },
      { id: 'action_surge', name: 'Action Surge', type: 'buff', manaCost: 0, cooldown: 3,
        description: 'Take an additional attack action this turn',
        effect: { extraActions: 1 }, unlockLevel: 3 },
    ],
    startingEquipment: [
      { id: 'long-sword', name: 'Long Sword', slot: 'weapon', damage: '1d8', damageType: 'slashing', stats: {} },
      { id: 'chain-mail', name: 'Chain Mail', slot: 'armor', ac: 16, stats: {} },
      { id: 'shield-wood', name: 'Wooden Shield', slot: 'shield', ac: 2, stats: {} },
    ],
    startingItems: [
      { id: 'torch', name: 'Torch', quantity: 3 },
      { id: 'bread', name: 'Bread', quantity: 5 },
      { id: 'water-flask', name: 'Water Flask', quantity: 2 },
    ],
    portrait: { m: 'fighter_m', f: 'fighter_f' },
  },

  ranger: {
    name: 'Ranger',
    str: 10, dex: 16, con: 12, int: 10, wis: 14, cha: 8,
    hpDice: 'd8', hpDieMax: 8,
    startingAC: 14, // Studded Leather (12) + DEX mod (+2 capped)
    baseMana: 4,    // Minor spellcasting
    proficiencies: ['ranged weapons', 'light armor', 'medium armor', 'martial melee'],
    savingThrows: ['str', 'dex'], // D&D 5e Ranger saving throw proficiencies
    abilities: [
      { id: 'hunters_mark', name: "Hunter's Mark", type: 'buff', manaCost: 2, cooldown: 0,
        description: 'Mark a target — deal +1d6 damage on each hit against it',
        effect: { bonusDamage: '1d6', duration: 3 }, unlockLevel: 1 },
      { id: 'eagle_eye', name: 'Eagle Eye', type: 'buff', manaCost: 1, cooldown: 2,
        description: 'Next ranged attack has advantage (roll twice, take higher)',
        effect: { advantage: true, rangedOnly: true }, unlockLevel: 1 },
      { id: 'volley', name: 'Volley', type: 'attack', manaCost: 3, cooldown: 3,
        description: 'Fire arrows at all enemies — 1d8 piercing each',
        effect: { damage: '1d8', damageType: 'piercing', aoe: true }, unlockLevel: 5 },
    ],
    startingEquipment: [
      { id: 'long-bow', name: 'Long Bow', slot: 'weapon', damage: '1d8', damageType: 'piercing', ranged: true, stats: {} },
      { id: 'short-sword', name: 'Short Sword', slot: 'accessory', damage: '1d6', damageType: 'slashing', stats: {} },
      { id: 'studded-leather', name: 'Studded Leather', slot: 'armor', ac: 14, stats: {} },
    ],
    startingItems: [
      { id: 'arrow', name: 'Arrow', quantity: 20 },
      { id: 'torch', name: 'Torch', quantity: 3 },
      { id: 'bread', name: 'Bread', quantity: 4 },
      { id: 'water-flask', name: 'Water Flask', quantity: 2 },
      { id: 'snare-trap', name: 'Snare Trap', quantity: 1 },
    ],
    portrait: { m: 'ranger_m', f: 'ranger_f' },
  },

  mage: {
    name: 'Mage',
    str: 8, dex: 12, con: 10, int: 17, wis: 10, cha: 13,
    hpDice: 'd4', hpDieMax: 4,
    startingAC: 11, // Padded Armor (AC 11)
    baseMana: 20,   // Primary caster — INT-driven
    proficiencies: ['staves', 'daggers', 'no armor'],
    savingThrows: ['int', 'wis'], // D&D 5e Wizard saving throw proficiencies
    abilities: [
      { id: 'fireball', name: 'Fireball', type: 'attack', manaCost: 6, cooldown: 0,
        description: 'Hurl fire at all enemies — 3d6 fire damage (DEX save for half)',
        effect: { damage: '3d6', damageType: 'fire', aoe: true, saveStat: 'dex', saveHalves: true }, unlockLevel: 1 },
      { id: 'ice_storm', name: 'Ice Storm', type: 'attack', manaCost: 5, cooldown: 0,
        description: 'Blast of ice — 2d8 cold damage to one target',
        effect: { damage: '2d8', damageType: 'cold' }, unlockLevel: 1 },
      { id: 'arcane_shield', name: 'Arcane Shield', type: 'buff', manaCost: 2, cooldown: 1,
        description: 'Shield of force — +5 AC until next turn',
        effect: { acBonus: 5, duration: 1 }, unlockLevel: 1 },
      { id: 'magic_missile', name: 'Magic Missile', type: 'attack', manaCost: 3, cooldown: 0,
        description: '3 darts of force — 1d4+1 each, auto-hit (no attack roll)',
        effect: { damage: '1d4+1', damageType: 'force', missiles: 3, autoHit: true }, unlockLevel: 1 },
    ],
    startingEquipment: [
      { id: 'staff', name: 'Quarterstaff', slot: 'weapon', damage: '1d6', damageType: 'bludgeoning', stats: {} },
      { id: 'padded-armor', name: 'Padded Armor', slot: 'armor', ac: 11, stats: {} },
    ],
    startingItems: [
      { id: 'torch', name: 'Torch', quantity: 2 },
      { id: 'bread', name: 'Bread', quantity: 3 },
      { id: 'water-flask', name: 'Water Flask', quantity: 2 },
      { id: 'mana-potion', name: 'Mana Potion', quantity: 2 },
      { id: 'spell-scroll-fire', name: 'Fire Scroll', quantity: 1 },
    ],
    portrait: { m: 'mage_m', f: 'mage_f' },
  },

  cleric: {
    name: 'Cleric',
    str: 12, dex: 10, con: 13, int: 10, wis: 16, cha: 14,
    hpDice: 'd6', hpDieMax: 6,
    startingAC: 15, // Chain Mail (AC 15)
    baseMana: 12,   // Healing/support caster — WIS-driven
    proficiencies: ['maces', 'staves', 'medium armor', 'shields'],
    savingThrows: ['wis', 'cha'], // D&D 5e Cleric saving throw proficiencies
    abilities: [
      { id: 'heal', name: 'Heal', type: 'heal', manaCost: 3, cooldown: 0,
        description: 'Restore 1d8 + WIS modifier HP to one ally',
        effect: { healDice: '1d8', statMod: 'wis' }, unlockLevel: 1 },
      { id: 'turn_undead', name: 'Turn Undead', type: 'debuff', manaCost: 4, cooldown: 2,
        description: 'Undead enemies must save or flee for 2 turns',
        effect: { saveStat: 'wis', flee: 2, undeadOnly: true }, unlockLevel: 1 },
      { id: 'bless', name: 'Bless', type: 'buff', manaCost: 3, cooldown: 0,
        description: 'Up to 3 allies add 1d4 to attack rolls and saves for 3 turns',
        effect: { bonus: '1d4', targets: 3, duration: 3 }, unlockLevel: 1 },
      { id: 'spiritual_weapon', name: 'Spiritual Weapon', type: 'attack', manaCost: 4, cooldown: 0,
        description: 'Conjure a spectral weapon — 1d8 + WIS force damage',
        effect: { damage: '1d8', damageType: 'force', statMod: 'wis' }, unlockLevel: 3 },
    ],
    startingEquipment: [
      { id: 'mace', name: 'Mace', slot: 'weapon', damage: '1d6', damageType: 'bludgeoning', stats: {} },
      { id: 'chain-mail', name: 'Chain Mail', slot: 'armor', ac: 16, stats: {} },
      { id: 'shield-wood', name: 'Wooden Shield', slot: 'shield', ac: 2, stats: {} },
    ],
    startingItems: [
      { id: 'torch', name: 'Torch', quantity: 3 },
      { id: 'bread', name: 'Bread', quantity: 4 },
      { id: 'water-flask', name: 'Water Flask', quantity: 2 },
      { id: 'health-potion', name: 'Health Potion', quantity: 1 },
    ],
    portrait: { m: 'cleric_m', f: 'cleric_f' },
  },

  // Bonus classes beyond the core 4 bible classes
  rogue: {
    name: 'Rogue',
    str: 10, dex: 16, con: 12, int: 14, wis: 12, cha: 10,
    hpDice: 'd8', hpDieMax: 8,
    startingAC: 14, // Leather (11) + DEX mod (+3)
    baseMana: 2,    // Minimal — utility tricks only
    proficiencies: ['light weapons', 'ranged weapons', 'light armor'],
    savingThrows: ['dex', 'int'], // D&D 5e Rogue saving throw proficiencies
    abilities: [
      { id: 'sneak_attack', name: 'Sneak Attack', type: 'attack', manaCost: 0, cooldown: 0,
        description: 'Extra 1d6 damage per 2 levels (once per turn) when you have advantage',
        effect: { bonusDamagePerLevel: '1d6', levelInterval: 2, requiresAdvantage: true }, unlockLevel: 1 },
      { id: 'cunning_action', name: 'Cunning Action', type: 'utility', manaCost: 0, cooldown: 1,
        description: 'Dash, Disengage, or Hide as a bonus action',
        effect: { options: ['dash', 'disengage', 'hide'] }, unlockLevel: 2 },
      { id: 'evasion', name: 'Evasion', type: 'passive', manaCost: 0, cooldown: 0,
        description: 'DEX saves: success = no damage, fail = half damage',
        effect: { dexSaveNoDamage: true, dexSaveHalfOnFail: true }, unlockLevel: 7 },
    ],
    startingEquipment: [
      { id: 'dagger', name: 'Dagger', slot: 'weapon', damage: '1d4', damageType: 'piercing', throwable: true, stats: {} },
      { id: 'short-sword', name: 'Short Sword', slot: 'accessory', damage: '1d6', damageType: 'slashing', stats: {} },
      { id: 'leather-armor', name: 'Leather Armor', slot: 'armor', ac: 14, stats: {} },
    ],
    startingItems: [
      { id: 'torch', name: 'Torch', quantity: 3 },
      { id: 'bread', name: 'Bread', quantity: 3 },
      { id: 'water-flask', name: 'Water Flask', quantity: 2 },
      { id: 'lockpick', name: 'Lockpick', quantity: 3 },
    ],
    portrait: { m: 'rogue_m', f: 'rogue_f' },
  },

  paladin: {
    name: 'Paladin',
    str: 16, dex: 10, con: 14, int: 8, wis: 12, cha: 14,
    hpDice: 'd10', hpDieMax: 10,
    startingAC: 16, // Chain Mail + Shield
    baseMana: 6,    // Limited divine casting
    proficiencies: ['all weapons', 'heavy armor', 'shields'],
    savingThrows: ['wis', 'cha'], // D&D 5e Paladin saving throw proficiencies
    abilities: [
      { id: 'lay_on_hands', name: 'Lay on Hands', type: 'heal', manaCost: 0, cooldown: 0,
        description: 'Heal pool of level x 5 HP per long rest, spend any amount',
        effect: { healPool: true, poolPerLevel: 5 }, unlockLevel: 1 },
      { id: 'divine_smite', name: 'Divine Smite', type: 'attack', manaCost: 3, cooldown: 0,
        description: 'On hit, add 2d8 radiant damage (+1d8 vs undead)',
        effect: { bonusDamage: '2d8', damageType: 'radiant', extraVsUndead: '1d8' }, unlockLevel: 2 },
      { id: 'divine_shield', name: 'Divine Shield', type: 'buff', manaCost: 2, cooldown: 2,
        description: 'Radiant barrier — +2 AC and resistance to necrotic for 3 turns',
        effect: { acBonus: 2, resistance: 'necrotic', duration: 3 }, unlockLevel: 1 },
    ],
    startingEquipment: [
      { id: 'long-sword', name: 'Long Sword', slot: 'weapon', damage: '1d8', damageType: 'slashing', stats: {} },
      { id: 'chain-mail', name: 'Chain Mail', slot: 'armor', ac: 16, stats: {} },
      { id: 'shield-wood', name: 'Wooden Shield', slot: 'shield', ac: 2, stats: {} },
    ],
    startingItems: [
      { id: 'torch', name: 'Torch', quantity: 3 },
      { id: 'bread', name: 'Bread', quantity: 4 },
      { id: 'water-flask', name: 'Water Flask', quantity: 2 },
    ],
    portrait: { m: 'paladin_m', f: 'paladin_f' },
  },
};
