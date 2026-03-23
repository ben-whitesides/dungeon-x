// Card Data — All 60 starter cards (10 per class) from DX Card Combat System Scope v2.1
// Schema matches Section 2 of the scope document

export const CARD_DATA = {
  // ============================================================
  // FIGHTER — "The Iron Wall"
  // ============================================================
  fighter_strike: {
    id: 'fighter_strike',
    name: 'Strike',
    description: 'Deal 6 damage.',
    type: 'attack',
    cardClass: 'fighter',
    rarity: 'starter',
    cost: 1,
    effects: [
      { type: 'damage', value: 6, scaling: { stat: 'str', ratio: 1.0 }, target: 'singleEnemy', damageType: 'slashing' }
    ],
    upgraded: false,
    keywords: [],
    exhaust: false, ethereal: false, innate: false, retain: false, unplayable: false,
    color: '#aa4444',
  },
  fighter_defend: {
    id: 'fighter_defend',
    name: 'Defend',
    description: 'Gain 5 Block.',
    type: 'skill',
    cardClass: 'fighter',
    rarity: 'starter',
    cost: 1,
    effects: [
      { type: 'block', value: 5, scaling: { stat: 'dex', ratio: 1.0 }, target: 'self' }
    ],
    upgraded: false,
    keywords: [],
    exhaust: false, ethereal: false, innate: false, retain: false, unplayable: false,
    color: '#4488aa',
  },
  fighter_shield_bash: {
    id: 'fighter_shield_bash',
    name: 'Shield Bash',
    description: 'Deal 4 damage. Apply 1 Stun.',
    type: 'attack',
    cardClass: 'fighter',
    rarity: 'starter',
    cost: 1,
    effects: [
      { type: 'damage', value: 4, scaling: { stat: 'str', ratio: 1.0 }, target: 'singleEnemy', damageType: 'bludgeoning' },
      { type: 'stun', turns: 1, target: 'singleEnemy' }
    ],
    upgraded: false,
    keywords: [],
    exhaust: false, ethereal: false, innate: false, retain: false, unplayable: false,
    color: '#aa6644',
  },
  fighter_second_wind: {
    id: 'fighter_second_wind',
    name: 'Second Wind',
    description: 'Heal 6 HP. Exhaust.',
    type: 'skill',
    cardClass: 'fighter',
    rarity: 'starter',
    cost: 1,
    effects: [
      { type: 'heal', value: 6, scaling: { stat: 'con', ratio: 1.0 }, target: 'self' }
    ],
    upgraded: false,
    keywords: ['exhaust'],
    exhaust: true, ethereal: false, innate: false, retain: false, unplayable: false,
    color: '#44aa44',
  },
  fighter_cleave: {
    id: 'fighter_cleave',
    name: 'Cleave',
    description: 'Deal 4 damage to ALL enemies.',
    type: 'attack',
    cardClass: 'fighter',
    rarity: 'starter',
    cost: 1,
    effects: [
      { type: 'damage', value: 4, scaling: { stat: 'str', ratio: 1.0 }, target: 'allEnemies', damageType: 'slashing' }
    ],
    upgraded: false,
    keywords: ['aoe'],
    exhaust: false, ethereal: false, innate: false, retain: false, unplayable: false,
    color: '#cc4444',
  },
  fighter_battle_cry: {
    id: 'fighter_battle_cry',
    name: 'Battle Cry',
    description: 'Apply 1 Weak to ALL enemies.',
    type: 'skill',
    cardClass: 'fighter',
    rarity: 'starter',
    cost: 0,
    effects: [
      { type: 'debuff', debuffId: 'weak', stacks: 1, target: 'allEnemies' }
    ],
    upgraded: false,
    keywords: ['aoe'],
    exhaust: false, ethereal: false, innate: false, retain: false, unplayable: false,
    color: '#cc8844',
  },

  // ============================================================
  // RANGER — "The Precision Hunter"
  // ============================================================
  ranger_quick_shot: {
    id: 'ranger_quick_shot',
    name: 'Quick Shot',
    description: 'Deal 5 damage.',
    type: 'attack',
    cardClass: 'ranger',
    rarity: 'starter',
    cost: 1,
    effects: [
      { type: 'damage', value: 5, scaling: { stat: 'dex', ratio: 1.0 }, target: 'singleEnemy', damageType: 'piercing' }
    ],
    upgraded: false,
    keywords: [],
    exhaust: false, ethereal: false, innate: false, retain: false, unplayable: false,
    color: '#44aa44',
  },
  ranger_defend: {
    id: 'ranger_defend',
    name: 'Defend',
    description: 'Gain 5 Block.',
    type: 'skill',
    cardClass: 'ranger',
    rarity: 'starter',
    cost: 1,
    effects: [
      { type: 'block', value: 5, scaling: { stat: 'dex', ratio: 1.0 }, target: 'self' }
    ],
    upgraded: false,
    keywords: [],
    exhaust: false, ethereal: false, innate: false, retain: false, unplayable: false,
    color: '#4488aa',
  },
  ranger_hunters_mark: {
    id: 'ranger_hunters_mark',
    name: "Hunter's Mark",
    description: 'Apply 2 Vulnerable to target. Draw 1 card.',
    type: 'skill',
    cardClass: 'ranger',
    rarity: 'starter',
    cost: 1,
    effects: [
      { type: 'debuff', debuffId: 'vulnerable', stacks: 2, target: 'singleEnemy' },
      { type: 'draw', value: 1 }
    ],
    upgraded: false,
    keywords: [],
    exhaust: false, ethereal: false, innate: false, retain: false, unplayable: false,
    color: '#cc6644',
  },
  ranger_volley: {
    id: 'ranger_volley',
    name: 'Volley',
    description: 'Deal 4 damage to ALL enemies.',
    type: 'attack',
    cardClass: 'ranger',
    rarity: 'starter',
    cost: 2,
    effects: [
      { type: 'damage', value: 4, scaling: { stat: 'dex', ratio: 1.0 }, target: 'allEnemies', damageType: 'piercing' }
    ],
    upgraded: false,
    keywords: ['aoe'],
    exhaust: false, ethereal: false, innate: false, retain: false, unplayable: false,
    color: '#44cc44',
  },
  ranger_eagle_eye: {
    id: 'ranger_eagle_eye',
    name: 'Eagle Eye',
    description: 'Gain 1 Dexterity (permanent +1 block). Exhaust.',
    type: 'power',
    cardClass: 'ranger',
    rarity: 'starter',
    cost: 1,
    effects: [
      { type: 'buff', buffId: 'dexterity', stacks: 1, target: 'self' }
    ],
    upgraded: false,
    keywords: ['exhaust'],
    exhaust: true, ethereal: false, innate: false, retain: false, unplayable: false,
    color: '#88aa44',
  },
  ranger_snare_trap: {
    id: 'ranger_snare_trap',
    name: 'Snare Trap',
    description: 'Apply 1 Stun to target. Apply 1 Weak.',
    type: 'skill',
    cardClass: 'ranger',
    rarity: 'starter',
    cost: 1,
    effects: [
      { type: 'stun', turns: 1, target: 'singleEnemy' },
      { type: 'debuff', debuffId: 'weak', stacks: 1, target: 'singleEnemy' }
    ],
    upgraded: false,
    keywords: [],
    exhaust: false, ethereal: false, innate: false, retain: false, unplayable: false,
    color: '#886644',
  },

  // ============================================================
  // MAGE — "The Glass Cannon"
  // ============================================================
  mage_arcane_bolt: {
    id: 'mage_arcane_bolt',
    name: 'Arcane Bolt',
    description: 'Deal 6 damage.',
    type: 'attack',
    cardClass: 'mage',
    rarity: 'starter',
    cost: 1,
    effects: [
      { type: 'damage', value: 6, scaling: { stat: 'int', ratio: 1.0 }, target: 'singleEnemy', damageType: 'force' }
    ],
    upgraded: false,
    keywords: [],
    exhaust: false, ethereal: false, innate: false, retain: false, unplayable: false,
    color: '#6644cc',
  },
  mage_defend: {
    id: 'mage_defend',
    name: 'Defend',
    description: 'Gain 5 Block.',
    type: 'skill',
    cardClass: 'mage',
    rarity: 'starter',
    cost: 1,
    effects: [
      { type: 'block', value: 5, scaling: { stat: 'dex', ratio: 1.0 }, target: 'self' }
    ],
    upgraded: false,
    keywords: [],
    exhaust: false, ethereal: false, innate: false, retain: false, unplayable: false,
    color: '#4488aa',
  },
  mage_fireball: {
    id: 'mage_fireball',
    name: 'Fireball',
    description: 'Deal 8 fire damage to ALL enemies.',
    type: 'attack',
    cardClass: 'mage',
    rarity: 'starter',
    cost: 2,
    effects: [
      { type: 'damage', value: 8, scaling: { stat: 'int', ratio: 1.0 }, target: 'allEnemies', damageType: 'fire' }
    ],
    upgraded: false,
    keywords: ['aoe'],
    exhaust: false, ethereal: false, innate: false, retain: false, unplayable: false,
    color: '#ff6600',
  },
  mage_ice_shard: {
    id: 'mage_ice_shard',
    name: 'Ice Shard',
    description: 'Deal 6 cold damage. Apply 1 Weak.',
    type: 'attack',
    cardClass: 'mage',
    rarity: 'starter',
    cost: 1,
    effects: [
      { type: 'damage', value: 6, scaling: { stat: 'int', ratio: 1.0 }, target: 'singleEnemy', damageType: 'cold' },
      { type: 'debuff', debuffId: 'weak', stacks: 1, target: 'singleEnemy' }
    ],
    upgraded: false,
    keywords: [],
    exhaust: false, ethereal: false, innate: false, retain: false, unplayable: false,
    color: '#4488cc',
  },
  mage_arcane_shield: {
    id: 'mage_arcane_shield',
    name: 'Arcane Shield',
    description: 'Gain 8 Block.',
    type: 'skill',
    cardClass: 'mage',
    rarity: 'starter',
    cost: 1,
    effects: [
      { type: 'block', value: 8, scaling: { stat: 'int', ratio: 1.0 }, target: 'self' }
    ],
    upgraded: false,
    keywords: [],
    exhaust: false, ethereal: false, innate: false, retain: false, unplayable: false,
    color: '#8866cc',
  },
  mage_scry: {
    id: 'mage_scry',
    name: 'Scry',
    description: 'Look at top 3 cards. Discard any. Draw 1.',
    type: 'skill',
    cardClass: 'mage',
    rarity: 'starter',
    cost: 0,
    effects: [
      { type: 'scry', value: 3, scaling: { stat: 'int', ratio: 0.5 } },
      { type: 'draw', value: 1 }
    ],
    upgraded: false,
    keywords: [],
    exhaust: false, ethereal: false, innate: false, retain: false, unplayable: false,
    color: '#aa88cc',
  },
  mage_magic_missile: {
    id: 'mage_magic_missile',
    name: 'Magic Missile',
    description: 'Deal 3 damage 3 times (auto-hit, ignores Block).',
    type: 'attack',
    cardClass: 'mage',
    rarity: 'starter',
    cost: 1,
    effects: [
      { type: 'damage', value: 3, scaling: { stat: 'int', ratio: 1.0 }, target: 'singleEnemy', damageType: 'force', hits: 3, ignoresBlock: true }
    ],
    upgraded: false,
    keywords: [],
    exhaust: false, ethereal: false, innate: false, retain: false, unplayable: false,
    color: '#cc44ff',
  },

  // ============================================================
  // CLERIC — "The Bulwark"
  // ============================================================
  cleric_holy_strike: {
    id: 'cleric_holy_strike',
    name: 'Holy Strike',
    description: 'Deal 5 radiant damage.',
    type: 'attack',
    cardClass: 'cleric',
    rarity: 'starter',
    cost: 1,
    effects: [
      { type: 'damage', value: 5, scaling: { stat: 'str', ratio: 1.0 }, target: 'singleEnemy', damageType: 'radiant' }
    ],
    upgraded: false,
    keywords: [],
    exhaust: false, ethereal: false, innate: false, retain: false, unplayable: false,
    color: '#ccaa44',
  },
  cleric_sacred_word: {
    id: 'cleric_sacred_word',
    name: 'Sacred Word',
    description: 'Deal 2 radiant damage. Draw 1 card.',
    type: 'attack',
    cardClass: 'cleric',
    rarity: 'starter',
    cost: 0,
    effects: [
      { type: 'damage', value: 2, scaling: { stat: 'wis', ratio: 1.0 }, target: 'singleEnemy', damageType: 'radiant' },
      { type: 'draw', value: 1 }
    ],
    upgraded: false,
    keywords: [],
    exhaust: false, ethereal: false, innate: false, retain: false, unplayable: false,
    color: '#cccc44',
  },
  cleric_defend: {
    id: 'cleric_defend',
    name: 'Defend',
    description: 'Gain 5 Block.',
    type: 'skill',
    cardClass: 'cleric',
    rarity: 'starter',
    cost: 1,
    effects: [
      { type: 'block', value: 5, scaling: { stat: 'dex', ratio: 1.0 }, target: 'self' }
    ],
    upgraded: false,
    keywords: [],
    exhaust: false, ethereal: false, innate: false, retain: false, unplayable: false,
    color: '#4488aa',
  },
  cleric_heal: {
    id: 'cleric_heal',
    name: 'Heal',
    description: 'Heal 8 HP to single ally.',
    type: 'skill',
    cardClass: 'cleric',
    rarity: 'starter',
    cost: 1,
    effects: [
      { type: 'heal', value: 8, scaling: { stat: 'wis', ratio: 1.0 }, target: 'singleAlly' }
    ],
    upgraded: false,
    keywords: [],
    exhaust: false, ethereal: false, innate: false, retain: false, unplayable: false,
    color: '#44cc44',
  },
  cleric_bless: {
    id: 'cleric_bless',
    name: 'Bless',
    description: 'Give single ally 2 Strength (this combat).',
    type: 'skill',
    cardClass: 'cleric',
    rarity: 'starter',
    cost: 1,
    effects: [
      { type: 'buff', buffId: 'strength', stacks: 2, scaling: { stat: 'cha', ratio: 1.0 }, target: 'singleAlly' }
    ],
    upgraded: false,
    keywords: [],
    exhaust: false, ethereal: false, innate: false, retain: false, unplayable: false,
    color: '#ccaa88',
  },
  cleric_turn_undead: {
    id: 'cleric_turn_undead',
    name: 'Turn Undead',
    description: 'Apply 2 Weak + 1 Vulnerable to ALL undead. Non-undead: 1 Weak.',
    type: 'skill',
    cardClass: 'cleric',
    rarity: 'starter',
    cost: 2,
    effects: [
      { type: 'debuff', debuffId: 'weak', stacks: 2, target: 'allEnemies', undeadBonus: true },
      { type: 'debuff', debuffId: 'vulnerable', stacks: 1, target: 'allEnemies', undeadOnly: true }
    ],
    upgraded: false,
    keywords: ['aoe'],
    exhaust: false, ethereal: false, innate: false, retain: false, unplayable: false,
    color: '#cccc88',
  },
  cleric_divine_light: {
    id: 'cleric_divine_light',
    name: 'Divine Light',
    description: 'Deal 4 radiant damage to ALL enemies. Heal self 3.',
    type: 'attack',
    cardClass: 'cleric',
    rarity: 'starter',
    cost: 2,
    effects: [
      { type: 'damage', value: 4, scaling: { stat: 'wis', ratio: 1.0 }, target: 'allEnemies', damageType: 'radiant' },
      { type: 'heal', value: 3, scaling: { stat: 'wis', ratio: 1.0 }, target: 'self' }
    ],
    upgraded: false,
    keywords: ['aoe'],
    exhaust: false, ethereal: false, innate: false, retain: false, unplayable: false,
    color: '#eecc44',
  },
  cleric_prayer: {
    id: 'cleric_prayer',
    name: 'Prayer',
    description: 'Gain 1 Regeneration at start of each turn. Exhaust.',
    type: 'power',
    cardClass: 'cleric',
    rarity: 'starter',
    cost: 1,
    effects: [
      { type: 'buff', buffId: 'regen', stacks: 1, target: 'self' }
    ],
    upgraded: false,
    keywords: ['exhaust'],
    exhaust: true, ethereal: false, innate: false, retain: false, unplayable: false,
    color: '#88cc88',
  },

  // ============================================================
  // ROGUE — "The Shadow Blade"
  // ============================================================
  rogue_shiv: {
    id: 'rogue_shiv',
    name: 'Shiv',
    description: 'Deal 3 damage.',
    type: 'attack',
    cardClass: 'rogue',
    rarity: 'starter',
    cost: 0,
    effects: [
      { type: 'damage', value: 3, scaling: { stat: 'dex', ratio: 1.0 }, target: 'singleEnemy', damageType: 'piercing' }
    ],
    upgraded: false,
    keywords: [],
    exhaust: false, ethereal: false, innate: false, retain: false, unplayable: false,
    color: '#666688',
  },
  rogue_backstab: {
    id: 'rogue_backstab',
    name: 'Backstab',
    description: 'Deal 7 damage.',
    type: 'attack',
    cardClass: 'rogue',
    rarity: 'starter',
    cost: 1,
    effects: [
      { type: 'damage', value: 7, scaling: { stat: 'dex', ratio: 1.0 }, target: 'singleEnemy', damageType: 'piercing' }
    ],
    upgraded: false,
    keywords: [],
    exhaust: false, ethereal: false, innate: false, retain: false, unplayable: false,
    color: '#884466',
  },
  rogue_strike: {
    id: 'rogue_strike',
    name: 'Strike',
    description: 'Deal 6 damage.',
    type: 'attack',
    cardClass: 'rogue',
    rarity: 'starter',
    cost: 1,
    effects: [
      { type: 'damage', value: 6, scaling: { stat: 'dex', ratio: 1.0 }, target: 'singleEnemy', damageType: 'slashing' }
    ],
    upgraded: false,
    keywords: [],
    exhaust: false, ethereal: false, innate: false, retain: false, unplayable: false,
    color: '#aa4466',
  },
  rogue_defend: {
    id: 'rogue_defend',
    name: 'Defend',
    description: 'Gain 5 Block.',
    type: 'skill',
    cardClass: 'rogue',
    rarity: 'starter',
    cost: 1,
    effects: [
      { type: 'block', value: 5, scaling: { stat: 'dex', ratio: 1.0 }, target: 'self' }
    ],
    upgraded: false,
    keywords: [],
    exhaust: false, ethereal: false, innate: false, retain: false, unplayable: false,
    color: '#4488aa',
  },
  rogue_envenom: {
    id: 'rogue_envenom',
    name: 'Envenom',
    description: 'Whenever you play an Attack card, apply 1 Poison. Exhaust.',
    type: 'power',
    cardClass: 'rogue',
    rarity: 'starter',
    cost: 1,
    effects: [
      { type: 'buff', buffId: 'envenom', stacks: 1, target: 'self' }
    ],
    upgraded: false,
    keywords: ['exhaust'],
    exhaust: true, ethereal: false, innate: false, retain: false, unplayable: false,
    color: '#448844',
  },
  rogue_dodge_roll: {
    id: 'rogue_dodge_roll',
    name: 'Dodge Roll',
    description: 'Gain 4 Block. Draw 1 card.',
    type: 'skill',
    cardClass: 'rogue',
    rarity: 'starter',
    cost: 1,
    effects: [
      { type: 'block', value: 4, scaling: { stat: 'dex', ratio: 1.0 }, target: 'self' },
      { type: 'draw', value: 1 }
    ],
    upgraded: false,
    keywords: [],
    exhaust: false, ethereal: false, innate: false, retain: false, unplayable: false,
    color: '#668888',
  },
  rogue_preparation: {
    id: 'rogue_preparation',
    name: 'Preparation',
    description: 'Draw 2 cards. Discard 1.',
    type: 'skill',
    cardClass: 'rogue',
    rarity: 'starter',
    cost: 0,
    effects: [
      { type: 'draw', value: 2 },
      { type: 'discard', value: 1, target: 'self' }
    ],
    upgraded: false,
    keywords: [],
    exhaust: false, ethereal: false, innate: false, retain: false, unplayable: false,
    color: '#888866',
  },

  // ============================================================
  // PALADIN — "The Radiant Crusader"
  // ============================================================
  paladin_strike: {
    id: 'paladin_strike',
    name: 'Strike',
    description: 'Deal 6 damage.',
    type: 'attack',
    cardClass: 'paladin',
    rarity: 'starter',
    cost: 1,
    effects: [
      { type: 'damage', value: 6, scaling: { stat: 'str', ratio: 1.0 }, target: 'singleEnemy', damageType: 'slashing' }
    ],
    upgraded: false,
    keywords: [],
    exhaust: false, ethereal: false, innate: false, retain: false, unplayable: false,
    color: '#ccaa44',
  },
  paladin_defend: {
    id: 'paladin_defend',
    name: 'Defend',
    description: 'Gain 5 Block.',
    type: 'skill',
    cardClass: 'paladin',
    rarity: 'starter',
    cost: 1,
    effects: [
      { type: 'block', value: 5, scaling: { stat: 'dex', ratio: 1.0 }, target: 'self' }
    ],
    upgraded: false,
    keywords: [],
    exhaust: false, ethereal: false, innate: false, retain: false, unplayable: false,
    color: '#4488aa',
  },
  paladin_divine_smite: {
    id: 'paladin_divine_smite',
    name: 'Divine Smite',
    description: 'Deal 6 damage + 8 radiant. +4 vs Undead.',
    type: 'attack',
    cardClass: 'paladin',
    rarity: 'starter',
    cost: 2,
    effects: [
      { type: 'damage', value: 6, scaling: { stat: 'str', ratio: 1.0 }, target: 'singleEnemy', damageType: 'slashing' },
      { type: 'damage', value: 8, scaling: { stat: 'cha', ratio: 1.0 }, target: 'singleEnemy', damageType: 'radiant', bonusVsUndead: 4 }
    ],
    upgraded: false,
    keywords: [],
    exhaust: false, ethereal: false, innate: false, retain: false, unplayable: false,
    color: '#ffcc44',
  },
  paladin_lay_on_hands: {
    id: 'paladin_lay_on_hands',
    name: 'Lay on Hands',
    description: 'Heal 10 HP to single ally. Exhaust.',
    type: 'skill',
    cardClass: 'paladin',
    rarity: 'starter',
    cost: 1,
    effects: [
      { type: 'heal', value: 10, scaling: { stat: 'wis', ratio: 1.0 }, target: 'singleAlly' }
    ],
    upgraded: false,
    keywords: ['exhaust'],
    exhaust: true, ethereal: false, innate: false, retain: false, unplayable: false,
    color: '#44cc88',
  },
  paladin_divine_shield: {
    id: 'paladin_divine_shield',
    name: 'Divine Shield',
    description: 'Gain 6 Block. Give target ally 3 Block.',
    type: 'skill',
    cardClass: 'paladin',
    rarity: 'starter',
    cost: 1,
    effects: [
      { type: 'block', value: 6, scaling: { stat: 'cha', ratio: 1.0 }, target: 'self' },
      { type: 'block', value: 3, scaling: { stat: 'cha', ratio: 0.5 }, target: 'singleAlly' }
    ],
    upgraded: false,
    keywords: [],
    exhaust: false, ethereal: false, innate: false, retain: false, unplayable: false,
    color: '#88aacc',
  },
  paladin_smite_evil: {
    id: 'paladin_smite_evil',
    name: 'Smite Evil',
    description: 'Deal 5 radiant damage. If Undead, deal 8 instead.',
    type: 'attack',
    cardClass: 'paladin',
    rarity: 'starter',
    cost: 1,
    effects: [
      { type: 'damage', value: 5, scaling: { stat: 'str', ratio: 1.0 }, target: 'singleEnemy', damageType: 'radiant', bonusVsUndead: 3 }
    ],
    upgraded: false,
    keywords: [],
    exhaust: false, ethereal: false, innate: false, retain: false, unplayable: false,
    color: '#cccc44',
  },
  paladin_aura_of_courage: {
    id: 'paladin_aura_of_courage',
    name: 'Aura of Courage',
    description: 'All party members gain 1 Strength. Exhaust.',
    type: 'power',
    cardClass: 'paladin',
    rarity: 'starter',
    cost: 1,
    effects: [
      { type: 'buff', buffId: 'strength', stacks: 1, target: 'allAllies' }
    ],
    upgraded: false,
    keywords: ['exhaust'],
    exhaust: true, ethereal: false, innate: false, retain: false, unplayable: false,
    color: '#eeaa44',
  },

  // ============================================================
  // SPECIAL — Flee Card (permanent, always in hand)
  // ============================================================
  flee: {
    id: 'flee',
    name: 'Flee',
    description: 'Attempt to escape. DEX save vs DC (10 + floor). Majority must pass.',
    type: 'skill',
    cardClass: 'neutral',
    rarity: 'special',
    cost: 0,
    effects: [
      { type: 'flee', saveStat: 'dex', saveDC: 'floor' }
    ],
    upgraded: false,
    keywords: [],
    exhaust: false, ethereal: false, innate: false, retain: false, unplayable: false,
    permanent: true,
    color: '#886644',
  },
};

// Starter deck card ID arrays per class (references into CARD_DATA)
export const STARTER_DECKS = {
  fighter: [
    'fighter_strike', 'fighter_strike', 'fighter_strike', 'fighter_strike',
    'fighter_defend', 'fighter_defend',
    'fighter_shield_bash', 'fighter_second_wind', 'fighter_cleave', 'fighter_battle_cry'
  ],
  ranger: [
    'ranger_quick_shot', 'ranger_quick_shot', 'ranger_quick_shot', 'ranger_quick_shot',
    'ranger_defend', 'ranger_defend',
    'ranger_hunters_mark', 'ranger_volley', 'ranger_eagle_eye', 'ranger_snare_trap'
  ],
  mage: [
    'mage_arcane_bolt', 'mage_arcane_bolt', 'mage_arcane_bolt',
    'mage_defend', 'mage_defend',
    'mage_fireball', 'mage_ice_shard', 'mage_arcane_shield', 'mage_scry', 'mage_magic_missile'
  ],
  cleric: [
    'cleric_holy_strike', 'cleric_holy_strike', 'cleric_sacred_word',
    'cleric_defend', 'cleric_defend',
    'cleric_heal', 'cleric_bless', 'cleric_turn_undead', 'cleric_divine_light', 'cleric_prayer'
  ],
  rogue: [
    'rogue_shiv', 'rogue_shiv', 'rogue_backstab', 'rogue_strike', 'rogue_strike',
    'rogue_defend', 'rogue_defend',
    'rogue_envenom', 'rogue_dodge_roll', 'rogue_preparation'
  ],
  paladin: [
    'paladin_strike', 'paladin_strike', 'paladin_strike',
    'paladin_defend', 'paladin_defend',
    'paladin_divine_smite', 'paladin_lay_on_hands', 'paladin_divine_shield',
    'paladin_smite_evil', 'paladin_aura_of_courage'
  ],
};
