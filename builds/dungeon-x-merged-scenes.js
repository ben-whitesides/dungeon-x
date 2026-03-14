// ============================================================
// DUNGEON X — Merged Phaser 3 Game Code
// Phase 2 + Phase 3 unified with module integration hooks
// ============================================================

// --- AUDIO SYSTEM (Web Audio oscillator beeps) ---
const AudioSys = {
  ctx: null,
  init() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); },
  beep(freq, dur, type, vol) {
    this.init();
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type || 'square';
    o.frequency.value = freq;
    g.gain.value = vol || 0.15;
    o.connect(g); g.connect(this.ctx.destination);
    o.start(); g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + (dur || 0.1));
    o.stop(this.ctx.currentTime + (dur || 0.1));
  },
  equipSound()   { this.beep(880, 0.08, 'square', 0.12); this.beep(1100, 0.06, 'square', 0.1); },
  healSound()    { this.beep(523, 0.1, 'sine', 0.15); setTimeout(() => this.beep(659, 0.1, 'sine', 0.12), 80); setTimeout(() => this.beep(784, 0.15, 'sine', 0.1), 160); },
  errorSound()   { this.beep(220, 0.15, 'sawtooth', 0.1); },
  clunkSound()   { this.beep(80, 0.2, 'sawtooth', 0.15); },
  keyTurnSound() { this.beep(440, 0.06, 'square', 0.08); setTimeout(() => this.beep(550, 0.06, 'square', 0.08), 70); setTimeout(() => this.beep(660, 0.1, 'sine', 0.1), 140); },
  leverSound()   { this.beep(100, 0.3, 'sawtooth', 0.12); setTimeout(() => this.beep(150, 0.2, 'square', 0.1), 200); },
  throwSound()   { this.beep(600, 0.05, 'square', 0.1); setTimeout(() => this.beep(400, 0.08, 'square', 0.08), 50); },
  sconceSound()  { this.beep(350, 0.1, 'sine', 0.1); setTimeout(() => this.beep(500, 0.15, 'sine', 0.12), 100); },
  eatSound()     { this.beep(300, 0.05, 'square', 0.08); setTimeout(() => this.beep(350, 0.05, 'square', 0.08), 60); setTimeout(() => this.beep(400, 0.05, 'square', 0.08), 120); },
  drinkSound()   { this.beep(500, 0.08, 'sine', 0.1); setTimeout(() => this.beep(600, 0.12, 'sine', 0.08), 80); },
  coatSound()    { this.beep(200, 0.1, 'triangle', 0.1); setTimeout(() => this.beep(300, 0.15, 'triangle', 0.08), 100); },
  springSound()  { this.beep(400, 0.05, 'square', 0.1); setTimeout(() => this.beep(300, 0.05, 'square', 0.08), 40); setTimeout(() => this.beep(200, 0.08, 'square', 0.06), 80); }
};

// --- GAME DATA ---
let PLAYER = {
  name: 'Adventurer', class: 'None', classId: 'none', level: 1, xp: 0, xpNext: 300,
  str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
  maxHp: 10, hp: 10, maxMana: 0, mana: 0,
  ac: 10, attackMod: 0, damageDice: 4, damageBonus: 0, proficiency: 2,
  potions: 2, keys: 1, torch: 50, maxTorch: 50,
  gold: 0,
  weapon: 'Unarmed', armor: 'None',
  inventory: [],
  equipped: { weapon: -1, armor: -1, head: -1, shield: -1, ring: -1 },
  x: 1, y: 1, dir: 0,
  fragmentOfDawn: false,
  // Phase 3: Survival
  food: 100, water: 100, maxFood: 100, maxWater: 100,
  // Phase 3: Weapon coating
  weaponCoating: null // { type: 'poison'|'fire', hitsLeft: 3 }
};

const GAME = {
  dungeonId: 1, floor: 1, currentMap: null, encounters: null,
  dailySeed: null,
  floorHistory: {},
  visitedFloors: {},
  firstEnemySeen: false,
  vaultWardenDefeated: false,
  isTouchDevice: false,
  litSconces: {},
  currentFloorData: null,
  currentLevers: [],
  floorEvents: null,
  floorNPC: null,
  combatModifiers: null
};

const CLASS_TEMPLATES = {
  Fighter: {
    class: 'Fighter', classId: 'fighter', str: 16, dex: 12, con: 14, int: 8, wis: 12, cha: 9,
    maxHp: 12, ac: 18, weapon: 'Long Sword', damageDice: 8, damageBonus: 3, attackMod: 5,
    maxMana: 0, regenMana: 0,
    spells: ['Power Strike', 'Shield Wall', 'Cleave'],
    portrait: 'portrait_fighter',
    food: 100, water: 100
  },
  Ranger: {
    class: 'Ranger', classId: 'ranger', str: 12, dex: 16, con: 12, int: 10, wis: 14, cha: 8,
    maxHp: 9, ac: 15, weapon: 'Long Bow', damageDice: 8, damageBonus: 3, attackMod: 5,
    maxMana: 0, regenMana: 0,
    spells: ['Twin Shot', 'Trap Set', 'Track'],
    portrait: 'portrait_ranger',
    food: 100, water: 100
  },
  Mage: {
    class: 'Mage', classId: 'mage', str: 10, dex: 10, con: 10, int: 16, wis: 14, cha: 13,
    maxHp: 4, ac: 12, weapon: 'Staff', damageDice: 6, damageBonus: 0, attackMod: 5,
    maxMana: 20, regenMana: 2,
    spells: ['Fireball', 'Frost Nova', 'Lightning Bolt', 'Shield'],
    portrait: 'portrait_mage',
    food: 100, water: 100
  },
  Cleric: {
    class: 'Cleric', classId: 'cleric', str: 12, dex: 10, con: 14, int: 10, wis: 16, cha: 14,
    maxHp: 8, ac: 16, weapon: 'Mace', damageDice: 6, damageBonus: 1, attackMod: 5,
    maxMana: 15, regenMana: 1,
    spells: ['Heal', 'Smite', 'Turn Undead', 'Bless'],
    portrait: 'portrait_cleric',
    food: 100, water: 100
  }
};

function applyClass(className) {
  const t = CLASS_TEMPLATES[className];
  Object.assign(PLAYER, t);
  PLAYER.hp = PLAYER.maxHp;
  PLAYER.mana = PLAYER.maxMana;
  PLAYER.level = 1; PLAYER.xp = 0; PLAYER.xpNext = 300;
  PLAYER.potions = 2; PLAYER.keys = 1; PLAYER.torch = 50; PLAYER.maxTorch = 50;
  PLAYER.gold = 0;
  PLAYER.proficiency = 2;
  PLAYER.fragmentOfDawn = false;
  PLAYER.food = 100; PLAYER.water = 100;
  PLAYER.maxFood = 100; PLAYER.maxWater = 100;
  PLAYER.weaponCoating = null;
  PLAYER.classId = t.classId;
  PLAYER.inventory = [
    {id:'w1',name:t.weapon,type:'weapon',letter:t.weapon[0],color:0xaaaacc,icon:CLASS_WEAPON_ICONS[className],damageDice:t.damageDice,damageBonus:t.damageBonus},
    {id:'p1',name:'Health Potion',type:'potion',subtype:'health',letter:'P',color:0xff4444,icon:'icon_potion'},
    {id:'p2',name:'Health Potion',type:'potion',subtype:'health',letter:'P',color:0xff4444,icon:'icon_potion'},
    {id:'k1',name:'Iron Key',type:'key',subtype:'iron',letter:'K',color:0xffdd44,icon:'icon_key'},
    {id:'f1',name:'Bread',type:'food',letter:'B',color:0xddaa55,icon:'icon_book',foodRestore:25,waterRestore:0},
    {id:'w2',name:'Water Flask',type:'water',letter:'W',color:0x4488ff,icon:'icon_potion_blue',foodRestore:0,waterRestore:30}
  ];
  PLAYER.equipped = { weapon: 0, armor: -1, head: -1, shield: -1, ring: -1 };
  PLAYER.x = 1; PLAYER.y = 1; PLAYER.dir = 0;
  GAME.dungeonId = 1;
  GAME.floor = 1;
  GAME.floorHistory = {};
  GAME.visitedFloors = {};
  GAME.firstEnemySeen = false;
  GAME.vaultWardenDefeated = false;
  GAME.litSconces = {};
  GAME.floorEvents = null;
  GAME.floorNPC = null;
  GAME.combatModifiers = null;
  loadFloor(1, 1);
}

const CLASS_WEAPON_ICONS = {
  Fighter: 'icon_sword',
  Ranger: 'icon_bow',
  Mage: 'icon_staff',
  Cleric: 'icon_mace'
};

const ENEMY_SPRITES = {
  shadow_lurker: 'enemy_shadow_soul',
  frost_wraith: 'enemy_death_speaker',
  bone_revenant: 'enemy_skeleton',
  crypt_crawler: 'enemy_zombie',
  vault_warden: 'enemy_bone_shield',
  goblin_scrapper: 'enemy_imp',
  goblin_shaman: 'enemy_druid'
};

const ITEM_ICONS = {
  weapon: 'icon_sword',
  potion: 'icon_potion',
  key: 'icon_key',
  armor: 'icon_shield',
  shield: 'icon_shield',
  ring: 'icon_gem',
  head: 'icon_helmet',
  book: 'icon_book',
  food: 'icon_book',
  water: 'icon_potion_blue',
  throwable: 'icon_arrow',
  coating: 'icon_potion_green'
};

const ENEMIES = {
  crypt_crawler: { name:'Crypt Crawler', ac:10, maxHp:12, hp:12, attackMod:2, damageDice:4, damageBonus:0, color:0x556633, xp:50, weakness:'fire', resist:null, str:10 },
  shadow_lurker: { name:'Shadow Lurker', ac:12, maxHp:28, hp:28, attackMod:4, damageDice:6, damageBonus:2, color:0x6633aa, xp:100, weakness:'fire', resist:'ice', str:12 },
  frost_wraith: { name:'Frost Wraith', ac:13, maxHp:22, hp:22, attackMod:5, damageDice:8, damageBonus:3, color:0x66ccff, xp:150, weakness:'fire', resist:'stone', str:10 },
  bone_revenant: { name:'Bone Revenant', ac:16, maxHp:52, hp:52, attackMod:6, damageDice:10, damageBonus:4, color:0xddccaa, xp:250, weakness:'holy', resist:'fire', str:16 },
  vault_warden: { name:'Vault Warden', ac:17, maxHp:65, hp:65, attackMod:5, damageDice:10, damageBonus:3, color:0xccaa66, xp:300, weakness:'fire', resist:'stone', isBoss:true, shield:30, str:18 },
  goblin_scrapper: { name:'Goblin Scrapper', ac:12, maxHp:10, hp:10, attackMod:3, damageDice:4, damageBonus:1, color:0x44aa33, xp:40, weakness:null, resist:null, str:8 },
  goblin_shaman: { name:'Goblin Shaman', ac:11, maxHp:18, hp:18, attackMod:4, damageDice:6, damageBonus:2, color:0x338855, xp:80, weakness:'fire', resist:'shadow', str:8 }
};

const SPELLS = [
  { name:'Fire Bolt', dice:8, element:'fire', color:0xff6600, manaCost:2 },
  { name:'Ice Shard', dice:6, element:'ice', color:0x44aaff, manaCost:2 },
  { name:'Holy Light', dice:6, element:'holy', color:0xffff66, manaCost:3 }
];

// ============================================================
// DUNGEON NAMES & NARRATIVE
// ============================================================
const DUNGEON_NAMES = { 1: 'The Whispering Crypts' };

const NARRATIVE = {
  enterDungeon1: "The Whispering Crypts. Dusty air fills your lungs as you descend the crumbling stairs. Ancient murals line the walls -- scenes of a golden age, long dead.",
  firstEnemy: "Something stirs in the shadows ahead...",
  reachFloor2: "The air grows colder. These crypts are older. The stones whisper names you don't recognize.",
  reachFloor3: "The deepest level. The air is thick with death. Only the strongest undead endure here.",
  vaultWardenEncounter: "A towering skeleton in ceremonial armor blocks the passage. Its shield glows with ancient fire.",
  afterVaultWarden: "Behind the fallen guardian, a sealed sarcophagus. Runes of fire and stone glow above it. The Fragment of Dawn rests within.",
  getFragment: "The Fragment of Dawn pulses warm in your hands. For a moment, the entire crypt is lit with golden light. Then it fades. Something, somewhere, noticed."
};

// ============================================================
// MULTI-FLOOR MAP SYSTEM
// Tile types: 0=floor, 1=wall, 2=door, 3=locked door, 4=stairs down, 5=stairs up
// Phase 3 additions: 6=unstable_ceiling, 7=pit_trap, 8=lever, 9=empty_sconce
// ============================================================
const DUNGEON_MAPS = {
  '1-1': {
    name: 'The Whispering Crypts - Floor 1',
    width: 10, height: 10,
    playerStart: {x:1, y:1, dir:0},
    map: [
      [1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,1,0,9,0,0,1],
      [1,0,1,0,1,0,1,1,0,1],
      [1,0,1,0,2,0,0,1,0,1],
      [1,0,0,0,1,6,0,1,0,1],
      [1,1,2,1,1,3,1,1,0,1],
      [1,0,0,0,0,0,0,9,0,1],
      [1,0,1,0,1,1,1,0,1,1],
      [1,8,0,0,7,0,0,0,4,1],
      [1,1,1,1,1,1,1,1,1,1]
    ],
    levers: [
      { x:1, y:8, targetType:'gate', targetX:5, targetY:5, pulled:false }
    ]
  },
  '1-2': {
    name: 'The Whispering Crypts - Floor 2',
    width: 12, height: 12,
    playerStart: {x:1, y:1, dir:0},
    map: [
      [1,1,1,1,1,1,1,1,1,1,1,1],
      [1,5,0,0,1,0,0,9,0,0,0,1],
      [1,0,1,0,1,0,1,1,0,1,0,1],
      [1,0,1,0,2,0,0,1,0,1,0,1],
      [1,0,0,6,1,0,0,1,7,0,0,1],
      [1,1,2,1,1,0,1,1,2,1,1,1],
      [1,0,0,0,9,0,0,0,0,0,0,1],
      [1,0,1,1,1,0,1,1,1,0,1,1],
      [1,0,0,0,1,0,0,1,0,0,0,1],
      [1,8,1,0,1,1,3,1,0,1,0,1],
      [1,0,0,0,0,0,0,0,0,0,4,1],
      [1,1,1,1,1,1,1,1,1,1,1,1]
    ],
    levers: [
      { x:1, y:9, targetType:'gate', targetX:6, targetY:9, pulled:false }
    ]
  },
  '1-3': {
    name: 'The Whispering Crypts - Floor 3 (Bonus)',
    width: 8, height: 8,
    playerStart: {x:1, y:1, dir:0},
    map: [
      [1,1,1,1,1,1,1,1],
      [1,5,0,1,0,9,0,1],
      [1,0,6,1,0,1,0,1],
      [1,1,0,0,7,1,0,1],
      [1,0,0,1,0,0,0,1],
      [1,0,1,1,0,1,9,1],
      [1,0,0,0,0,0,0,1],
      [1,1,1,1,1,1,1,1]
    ],
    levers: []
  }
};

// ============================================================
// ENCOUNTER SYSTEM
// ============================================================
const FLOOR_ENCOUNTERS_TEMPLATE = {
  '1-1': [
    {x:3, y:1, enemy:'crypt_crawler', defeated:false},
    {x:1, y:4, enemy:'crypt_crawler', defeated:false},
    {x:5, y:3, enemy:'crypt_crawler', defeated:false},
    {x:7, y:1, enemy:'shadow_lurker', defeated:false},
    {x:1, y:6, enemy:'shadow_lurker', defeated:false},
    {x:6, y:6, enemy:'crypt_crawler', defeated:false},
    {x:3, y:8, enemy:'shadow_lurker', defeated:false}
  ],
  '1-2': [
    {x:3, y:1, enemy:'shadow_lurker', defeated:false},
    {x:7, y:2, enemy:'shadow_lurker', defeated:false},
    {x:1, y:4, enemy:'bone_revenant', defeated:false},
    {x:5, y:6, enemy:'shadow_lurker', defeated:false},
    {x:9, y:4, enemy:'shadow_lurker', defeated:false},
    {x:3, y:8, enemy:'bone_revenant', defeated:false},
    {x:7, y:8, enemy:'shadow_lurker', defeated:false},
    {x:9, y:9, enemy:'vault_warden', defeated:false}
  ],
  '1-3': [
    {x:2, y:2, enemy:'bone_revenant', defeated:false},
    {x:4, y:1, enemy:'bone_revenant', defeated:false},
    {x:1, y:4, enemy:'bone_revenant', defeated:false},
    {x:4, y:4, enemy:'bone_revenant', defeated:false},
    {x:6, y:3, enemy:'bone_revenant', defeated:false},
    {x:3, y:6, enemy:'bone_revenant', defeated:false}
  ]
};

// ============================================================
// LOOT TABLE (expanded with food, throwables, coatings)
// ============================================================
const LOOT_TABLE = {
  crypt_crawler: [
    {chance:0.3, item:{name:'Health Potion', type:'potion', subtype:'health', icon:'icon_potion'}},
    {chance:0.1, item:{name:'Iron Key', type:'key', subtype:'iron', icon:'icon_key'}},
    {chance:0.5, item:{name:'3 Gold', type:'gold', amount:3}},
    {chance:0.25, item:{name:'Bread', type:'food', icon:'icon_book', foodRestore:25, waterRestore:0}},
    {chance:0.15, item:{name:'Throwing Dagger', type:'throwable', subtype:'dagger', icon:'icon_arrow', throwDice:4, throwStat:'dex'}}
  ],
  shadow_lurker: [
    {chance:0.4, item:{name:'Health Potion', type:'potion', subtype:'health', icon:'icon_potion'}},
    {chance:0.2, item:{name:'Shadow Cloak', type:'armor', icon:'icon_shield', acBonus:1}},
    {chance:0.6, item:{name:'8 Gold', type:'gold', amount:8}},
    {chance:0.2, item:{name:'Dried Meat', type:'food', icon:'icon_book', foodRestore:40, waterRestore:0}},
    {chance:0.1, item:{name:'Poison Vial', type:'coating', subtype:'poison', icon:'icon_potion_green'}}
  ],
  bone_revenant: [
    {chance:0.5, item:{name:'Health Potion', type:'potion', subtype:'health', icon:'icon_potion'}},
    {chance:0.15, item:{name:'Bone Shield', type:'shield', icon:'icon_shield', acBonus:2}},
    {chance:0.7, item:{name:'15 Gold', type:'gold', amount:15}},
    {chance:0.15, item:{name:'Hand Axe', type:'throwable', subtype:'axe', icon:'icon_sword2', throwDice:6, throwStat:'str'}},
    {chance:0.2, item:{name:'Rations', type:'food', icon:'icon_book', foodRestore:20, waterRestore:15}},
    {chance:0.1, item:{name:'Holy Water', type:'throwable', subtype:'holy_water', icon:'icon_potion_blue', throwDice:6, throwStat:'dex', holyDice:6, holyRolls:2}},
    {chance:0.08, item:{name:'Fire Oil', type:'coating', subtype:'fire', icon:'icon_potion_green'}}
  ],
  vault_warden: [
    {chance:1.0, item:{name:'Crystal Key', type:'key', subtype:'crystal', icon:'icon_key2'}},
    {chance:0.5, item:{name:"Warden's Halberd", type:'weapon', icon:'icon_sword2', damageDice:10, damageBonus:3}},
    {chance:1.0, item:{name:'40 Gold', type:'gold', amount:40}},
    {chance:0.5, item:{name:'Water Flask', type:'water', icon:'icon_potion_blue', foodRestore:0, waterRestore:30}},
    {chance:0.3, item:{name:'Oil Flask', type:'throwable', subtype:'oil', icon:'icon_potion_green', throwDice:4, throwStat:'dex', fireDamage:true}}
  ],
  frost_wraith: [
    {chance:0.35, item:{name:'Health Potion', type:'potion', subtype:'health', icon:'icon_potion'}},
    {chance:0.5, item:{name:'10 Gold', type:'gold', amount:10}},
    {chance:0.2, item:{name:'Water Flask', type:'water', icon:'icon_potion_blue', foodRestore:0, waterRestore:30}}
  ],
  goblin_scrapper: [
    {chance:0.25, item:{name:'Health Potion', type:'potion', subtype:'health', icon:'icon_potion'}},
    {chance:0.4, item:{name:'2 Gold', type:'gold', amount:2}},
    {chance:0.3, item:{name:'Throwing Dagger', type:'throwable', subtype:'dagger', icon:'icon_arrow', throwDice:4, throwStat:'dex'}},
    {chance:0.25, item:{name:'Bread', type:'food', icon:'icon_book', foodRestore:25, waterRestore:0}}
  ],
  goblin_shaman: [
    {chance:0.4, item:{name:'Health Potion', type:'potion', subtype:'health', icon:'icon_potion'}},
    {chance:0.15, item:{name:'Shaman Staff', type:'weapon', icon:'icon_staff', damageDice:6, damageBonus:2}},
    {chance:0.6, item:{name:'6 Gold', type:'gold', amount:6}},
    {chance:0.15, item:{name:'Mana Potion', type:'potion', subtype:'mana', icon:'icon_potion_blue'}}
  ]
};

const LEVEL_THRESHOLDS = [
  { level: 2, xp: 300,  hpBonus: 5, attackModBonus: 1, damageBonusAdd: 0, acBonus: 0, proficiency: 3 },
  { level: 3, xp: 900,  hpBonus: 5, attackModBonus: 0, damageBonusAdd: 1, acBonus: 0, proficiency: 3 },
  { level: 4, xp: 2700, hpBonus: 8, attackModBonus: 0, damageBonusAdd: 0, acBonus: 1, proficiency: 4 }
];

// ============================================================
// FLOOR MANAGEMENT FUNCTIONS
// ============================================================
function getFloorKey(dungeonId, floor) { return dungeonId + '-' + floor; }

function loadFloor(dungeonId, floor) {
  const key = getFloorKey(dungeonId, floor);
  const floorData = DUNGEON_MAPS[key];
  if (!floorData) return false;
  GAME.dungeonId = dungeonId;
  GAME.floor = floor;
  GAME.currentFloorData = floorData;
  GAME.currentMap = floorData.map.map(row => row.slice());
  GAME.mapWidth = floorData.width;
  GAME.mapHeight = floorData.height;
  // Restore lever states
  if (floorData.levers) {
    GAME.currentLevers = floorData.levers.map(l => ({...l}));
  } else {
    GAME.currentLevers = [];
  }
  if (GAME.floorHistory[key]) {
    GAME.encounters = GAME.floorHistory[key];
  } else {
    const template = FLOOR_ENCOUNTERS_TEMPLATE[key];
    GAME.encounters = template ? template.map(e => ({...e})) : [];
  }
  GAME.visitedFloors[key] = true;
  return true;
}

function saveFloorState() {
  const key = getFloorKey(GAME.dungeonId, GAME.floor);
  GAME.floorHistory[key] = GAME.encounters;
}

function getEncounterAt(x, y) {
  if (!GAME.encounters) return null;
  return GAME.encounters.find(e => e.x === x && e.y === y && !e.defeated);
}

function markEncounterDefeated(x, y) {
  if (!GAME.encounters) return;
  const enc = GAME.encounters.find(e => e.x === x && e.y === y);
  if (enc) enc.defeated = true;
}

function getLeverAt(x, y) {
  if (!GAME.currentLevers) return null;
  return GAME.currentLevers.find(l => l.x === x && l.y === y);
}

const ROOM_DECORATIONS = {};
function getRoomDecor(x, y) {
  const key = x + ',' + y + ',' + GAME.floor;
  if (ROOM_DECORATIONS[key] !== undefined) return ROOM_DECORATIONS[key];
  const seed = (x * 7 + y * 13 + GAME.floor * 29 + 37) % 100;
  if (seed < 12) ROOM_DECORATIONS[key] = 'skull_pile';
  else if (seed < 20) ROOM_DECORATIONS[key] = 'pillar';
  else if (seed < 28) ROOM_DECORATIONS[key] = 'crate';
  else if (seed < 33) ROOM_DECORATIONS[key] = 'chest';
  else ROOM_DECORATIONS[key] = null;
  return ROOM_DECORATIONS[key];
}

const DX = [0,1,0,-1]; // N,E,S,W
const DY = [-1,0,1,0];

function rollDice(sides) { return Math.floor(Math.random()*sides)+1; }
function mod(stat) { return Math.floor((stat-10)/2); }

function rollLoot(enemyType) {
  const table = LOOT_TABLE[enemyType];
  if (!table) return [];
  const found = [];
  table.forEach(entry => { if (Math.random() < entry.chance) found.push({...entry.item}); });
  return found;
}

function applyLoot(item) {
  if (item.type === 'gold') {
    PLAYER.gold += (item.amount || 0);
  } else if (item.type === 'potion') {
    if (item.subtype === 'health') PLAYER.potions++;
    PLAYER.inventory.push({
      id: 'i' + Date.now() + Math.random(),
      name: item.name, type: item.type, subtype: item.subtype || 'health',
      letter: item.name[0], color: item.subtype === 'mana' ? 0x4466cc : 0xff4444,
      icon: item.icon || 'icon_potion'
    });
  } else if (item.type === 'key') {
    PLAYER.keys++;
    PLAYER.inventory.push({
      id: 'i' + Date.now() + Math.random(),
      name: item.name, type: 'key', subtype: item.subtype || 'iron',
      letter: 'K', color: item.subtype === 'crystal' ? 0xaaddff : (item.subtype === 'gold' ? 0xffcc44 : 0xffdd44),
      icon: item.icon || 'icon_key'
    });
  } else if (item.type === 'weapon') {
    PLAYER.inventory.push({
      id: 'i' + Date.now() + Math.random(),
      name: item.name, type: 'weapon', letter: 'W', color: 0xaaaacc,
      icon: item.icon || 'icon_sword',
      damageDice: item.damageDice, damageBonus: item.damageBonus
    });
  } else if (item.type === 'armor') {
    PLAYER.inventory.push({
      id: 'i' + Date.now() + Math.random(),
      name: item.name, type: 'armor', letter: 'A', color: 0x8888cc,
      icon: item.icon || 'icon_shield', acBonus: item.acBonus
    });
  } else if (item.type === 'shield') {
    PLAYER.inventory.push({
      id: 'i' + Date.now() + Math.random(),
      name: item.name, type: 'shield', letter: 'S', color: 0x88aacc,
      icon: item.icon || 'icon_shield', acBonus: item.acBonus
    });
  } else if (item.type === 'food' || item.type === 'water') {
    PLAYER.inventory.push({
      id: 'i' + Date.now() + Math.random(),
      name: item.name, type: item.type, letter: item.name[0],
      color: item.type === 'water' ? 0x4488ff : 0xddaa55,
      icon: item.icon || (item.type === 'water' ? 'icon_potion_blue' : 'icon_book'),
      foodRestore: item.foodRestore || 0, waterRestore: item.waterRestore || 0
    });
  } else if (item.type === 'throwable') {
    PLAYER.inventory.push({
      id: 'i' + Date.now() + Math.random(),
      name: item.name, type: 'throwable', subtype: item.subtype,
      letter: item.name[0], color: 0xccaa66,
      icon: item.icon || 'icon_arrow',
      throwDice: item.throwDice, throwStat: item.throwStat,
      holyDice: item.holyDice, holyRolls: item.holyRolls,
      fireDamage: item.fireDamage
    });
  } else if (item.type === 'coating') {
    PLAYER.inventory.push({
      id: 'i' + Date.now() + Math.random(),
      name: item.name, type: 'coating', subtype: item.subtype,
      letter: item.name[0], color: item.subtype === 'fire' ? 0xff6600 : 0x44cc44,
      icon: item.icon || 'icon_potion_green'
    });
  }
}

function checkLevelUp() {
  let leveledUp = false;
  for (const threshold of LEVEL_THRESHOLDS) {
    if (PLAYER.level < threshold.level && PLAYER.xp >= threshold.xp) {
      PLAYER.level = threshold.level;
      PLAYER.maxHp += threshold.hpBonus;
      PLAYER.hp = PLAYER.maxHp;
      PLAYER.attackMod += threshold.attackModBonus;
      PLAYER.damageBonus += threshold.damageBonusAdd;
      PLAYER.ac += threshold.acBonus;
      PLAYER.proficiency = threshold.proficiency;
      PLAYER.maxMana += 2;
      PLAYER.mana = PLAYER.maxMana;
      leveledUp = true;
    }
  }
  return leveledUp;
}

// ============================================================
// PRELOAD SCENE
// ============================================================
class PreloadScene extends Phaser.Scene {
  constructor() { super('Preload'); }

  preload() {
    const barBg = this.add.graphics();
    barBg.fillStyle(0x222222); barBg.fillRect(200, 285, 400, 30);
    barBg.lineStyle(2, 0xff8800); barBg.strokeRect(200, 285, 400, 30);
    const bar = this.add.graphics();
    const loadText = this.add.text(400, 270, 'Loading Dungeon X...', {fontSize:'18px',fontFamily:'monospace',color:'#ff8800'}).setOrigin(0.5);
    const percentText = this.add.text(400, 300, '0%', {fontSize:'14px',fontFamily:'monospace',color:'#ffffff'}).setOrigin(0.5);
    this.load.on('progress', (v) => { bar.clear(); bar.fillStyle(0xff8800); bar.fillRect(202, 287, 396*v, 26); percentText.setText(Math.floor(v*100)+'%'); });
    this.load.on('complete', () => { loadText.setText('Ready.'); percentText.destroy(); });

    const tilePath = '../assets/walls-floors/heroine-dusk/tiles/first person dungeon crawl tiles/';
    this.load.image('tile_wall', tilePath + 'dungeon_wall.png');
    this.load.image('tile_floor', tilePath + 'dungeon_floor.png');
    this.load.image('tile_ceiling', tilePath + 'dungeon_ceiling.png');
    this.load.image('tile_door', tilePath + 'dungeon_door.png');
    this.load.image('tile_locked_door', tilePath + 'locked_door.png');
    this.load.image('tile_chest', tilePath + 'chest_exterior.png');
    this.load.image('tile_skull_pile', tilePath + 'skull_pile.png');
    this.load.image('tile_interior', tilePath + 'interior.png');
    this.load.image('tile_pillar', tilePath + 'pillar_exterior.png');

    const enemyPath = '../assets/walls-floors/heroine-dusk/enemies/first person dungeon crawl enemies/';
    this.load.image('enemy_skeleton', enemyPath + 'skeleton.png');
    this.load.image('enemy_zombie', enemyPath + 'zombie.png');
    this.load.image('enemy_imp', enemyPath + 'imp.png');
    this.load.image('enemy_druid', enemyPath + 'druid.png');
    this.load.image('enemy_death_speaker', enemyPath + 'death_speaker.png');
    this.load.image('enemy_shadow_soul', enemyPath + 'shadow_soul.png');
    this.load.image('enemy_mimic', enemyPath + 'mimic.png');
    this.load.image('enemy_bone_shield', enemyPath + 'bone_shield.png');

    const iconPath = "../assets/items/kyrise-icons/Kyrise's 16x16 RPG Icon Pack - V1.2/icons/16x16/";
    this.load.image('icon_sword', iconPath + 'sword_01a.png');
    this.load.image('icon_sword2', iconPath + 'sword_02a.png');
    this.load.image('icon_sword3', iconPath + 'sword_03a.png');
    this.load.image('icon_bow', iconPath + 'bow_01a.png');
    this.load.image('icon_bow2', iconPath + 'bow_02a.png');
    this.load.image('icon_staff', iconPath + 'staff_01a.png');
    this.load.image('icon_staff2', iconPath + 'staff_02ab.png');
    this.load.image('icon_mace', iconPath + 'sword_02c.png');
    this.load.image('icon_potion', iconPath + 'potion_01a.png');
    this.load.image('icon_potion_blue', iconPath + 'potion_01b.png');
    this.load.image('icon_potion_green', iconPath + 'potion_01c.png');
    this.load.image('icon_key', iconPath + 'key_01a.png');
    this.load.image('icon_key2', iconPath + 'key_01b.png');
    this.load.image('icon_shield', iconPath + 'shield_01a.png');
    this.load.image('icon_shield2', iconPath + 'shield_02a.png');
    this.load.image('icon_book', iconPath + 'book_01a.png');
    this.load.image('icon_gem', iconPath + 'gem_01a.png');
    this.load.image('icon_helmet', iconPath + 'helmet_01a.png');
    this.load.image('icon_arrow', iconPath + 'arrow_01a.png');

    this.load.image('portrait_fighter', '../assets/portraits/protagonist/Longsword.png');
    this.load.image('portrait_ranger', '../assets/portraits/protagonist/knife_4.png');
    this.load.image('portrait_mage', '../assets/portraits/protagonist/staff_3.png');
    this.load.image('portrait_cleric', '../assets/portraits/protagonist/BronzeMace.png');
    this.load.image('portrait_hero1', '../assets/portraits/flare/FlareMaleHero1.png');
    this.load.image('portrait_hero2', '../assets/portraits/flare/FlareMaleHero2.png');
    this.load.image('portrait_hero3', '../assets/portraits/flare/FlareMaleHero3.png');
    this.load.image('portrait_heroine1', '../assets/portraits/flare/FlareFemaleHero1.png');
    this.load.image('portrait_heroine2', '../assets/portraits/flare/FlareFemaleHero2.png');
    this.load.image('portrait_heroine3', '../assets/portraits/flare/FlareFemaleHero3.png');

    this.load.image('obj_crate', '../assets/objects/dungeon_objects/crate_exterior.png');
    this.load.image('obj_boulder', '../assets/objects/dungeon_objects/boulder_exterior.png');
  }

  create() { this.scene.start('Boot'); }
}

// ============================================================
// BOOT SCENE — Touch detection + Continue/New Game
// ============================================================
class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    this.cameras.main.setBackgroundColor('#0a0a0f');
    // Detect touch
    GAME.isTouchDevice = this.sys.game.device.input.touch;
    const cx=400, cy=300;
    this.add.image(400, 300, 'tile_floor').setDisplaySize(800, 600).setAlpha(0.15).setTint(0x442200);
    this.add.text(cx, cy-60, 'DUNGEON X', {fontSize:'48px',fontFamily:'monospace',color:'#ff8800',fontStyle:'bold'}).setOrigin(0.5);
    this.add.text(cx, cy, 'A Dungeon Master Tribute', {fontSize:'16px',fontFamily:'monospace',color:'#887766'}).setOrigin(0.5);
    this.add.text(cx, cy+40, 'The Whispering Crypts Await...', {fontSize:'14px',fontFamily:'monospace',color:'#665544'}).setOrigin(0.5);

    // Continue / New Game buttons
    const hasSave = window.DX_SAVE && DX_SAVE.hasSaveData();

    if (hasSave) {
      // Continue button
      const contBg = this.add.graphics();
      contBg.fillStyle(0x443322); contBg.fillRect(cx-90, cy+65, 180, 35);
      contBg.lineStyle(2, 0xff8800); contBg.strokeRect(cx-90, cy+65, 180, 35);
      this.add.text(cx, cy+82, '[ Continue ]', {fontSize:'18px',fontFamily:'monospace',color:'#ffaa44'}).setOrigin(0.5);
      const contZone = this.add.zone(cx, cy+82, 180, 35).setInteractive();
      contZone.on('pointerdown', () => {
        AudioSys.init();
        if (window.DX_SAVE) DX_SAVE.loadGame();
        this.scene.start('Tavern');
      });

      // New Game button (smaller, below)
      const newBg = this.add.graphics();
      newBg.fillStyle(0x332211); newBg.fillRect(cx-70, cy+110, 140, 28);
      newBg.lineStyle(1, 0x886644); newBg.strokeRect(cx-70, cy+110, 140, 28);
      this.add.text(cx, cy+124, '[ New Game ]', {fontSize:'14px',fontFamily:'monospace',color:'#886644'}).setOrigin(0.5);
      const newZone = this.add.zone(cx, cy+124, 140, 28).setInteractive();
      newZone.on('pointerdown', () => { AudioSys.init(); this.scene.start('ClassSelect'); });
    } else {
      // Just the click-to-enter
      this.add.text(cx, cy+80, '[ Click to Enter ]', {fontSize:'20px',fontFamily:'monospace',color:'#ffaa44'}).setOrigin(0.5);
      this.input.once('pointerdown', () => { AudioSys.init(); this.scene.start('ClassSelect'); });
    }

    const skele = this.add.image(120, 400, 'enemy_skeleton').setScale(2.5).setAlpha(0.4);
    const shadow = this.add.image(680, 400, 'enemy_shadow_soul').setScale(2.5).setAlpha(0.4);
    this.tweens.add({ targets: this.children.list[1], alpha:{from:0.7,to:1}, duration:800, yoyo:true, repeat:-1 });
    this.tweens.add({ targets: skele, y:{from:395,to:405}, duration:2000, yoyo:true, repeat:-1 });
    this.tweens.add({ targets: shadow, y:{from:405,to:395}, duration:2500, yoyo:true, repeat:-1 });
  }
}

// ============================================================
// CLASS SELECT SCENE
// ============================================================
class ClassSelectScene extends Phaser.Scene {
  constructor() { super('ClassSelect'); }
  create() {
    this.cameras.main.setBackgroundColor('#1a1008');
    this.add.image(400, 300, 'tile_interior').setDisplaySize(800, 600).setAlpha(0.12);
    this.add.text(400, 40, 'CHOOSE YOUR CLASS', {fontSize:'32px',fontFamily:'monospace',color:'#ffaa00'}).setOrigin(0.5);
    const classes = Object.keys(CLASS_TEMPLATES);
    classes.forEach((c, idx) => {
      const x = 200 + (idx%2)*400;
      const y = 200 + Math.floor(idx/2)*250;
      const g = this.add.graphics();
      const bx = x-180, by = y-100, bw = 360, bh = 200;
      const drawBox = (bgColor, lineColor) => { g.clear(); g.fillStyle(bgColor); g.fillRect(bx,by,bw,bh); g.lineStyle(2,lineColor); g.strokeRect(bx,by,bw,bh); };
      drawBox(0x2a1a0a, 0xff8800);
      this.add.image(bx+55, y, CLASS_TEMPLATES[c].portrait).setDisplaySize(80,80).setAlpha(0.9);
      this.add.text(x+20, y-70, c, {fontSize:'24px',fontFamily:'monospace',color:'#ffcc44',fontStyle:'bold'}).setOrigin(0.5);
      const t = CLASS_TEMPLATES[c];
      this.add.image(x-45, y+28, CLASS_WEAPON_ICONS[c]).setDisplaySize(24,24);
      const desc = `STR:${t.str} DEX:${t.dex} CON:${t.con}\nINT:${t.int} WIS:${t.wis} CHA:${t.cha}\n\nHP:${t.maxHp} MP:${t.maxMana} AC:${t.ac}\nWeapon: ${t.weapon}`;
      this.add.text(x+20, y, desc, {fontSize:'14px',fontFamily:'monospace',color:'#ccbbaa',align:'center'}).setOrigin(0.5);
      this.add.text(x+20, y+70, `Skills: ${t.spells.join(', ')}`, {fontSize:'12px',fontFamily:'monospace',color:'#88aa88',align:'center'}).setOrigin(0.5);
      const btn = this.add.zone(x,y,bw,bh).setInteractive();
      btn.on('pointerdown', () => { applyClass(c); this.scene.start('Tavern'); });
      btn.on('pointerover', () => drawBox(0x3a2a1a, 0xffff00));
      btn.on('pointerout', () => drawBox(0x2a1a0a, 0xff8800));
    });
  }
}

// ============================================================
// TAVERN SCENE — With module integration hooks
// ============================================================
class TavernScene extends Phaser.Scene {
  constructor() { super('Tavern'); }
  create() {
    this.cameras.main.setBackgroundColor('#1a1008');
    this.add.image(400, 200, 'tile_interior').setDisplaySize(800,300).setTint(0xddaa77).setAlpha(0.7);
    this.add.image(400, 475, 'tile_floor').setDisplaySize(800,250).setTint(0x886644).setAlpha(0.6);
    const g = this.add.graphics();
    for(let i=0;i<5;i++) { g.fillStyle(0x2a1a0a); g.fillRect(0,60+i*65,800,8); }
    g.fillStyle(0x444444); g.fillRect(340,150,120,200);
    g.fillStyle(0x222222); g.fillRect(350,170,100,180);
    this.add.image(310, 340, 'tile_skull_pile').setDisplaySize(40,40).setAlpha(0.7);
    this.fireGlow = this.add.graphics();
    this.time.addEvent({ delay:150, loop:true, callback:()=>{
      this.fireGlow.clear();
      const flicker = 0.5+Math.random()*0.5;
      this.fireGlow.fillStyle(0xff4400, flicker*0.6); this.fireGlow.fillCircle(400,300,60+Math.random()*20);
      this.fireGlow.fillStyle(0xff8800, flicker*0.8); this.fireGlow.fillCircle(400,310,30+Math.random()*15);
      this.fireGlow.fillStyle(0xffcc00, flicker); this.fireGlow.fillCircle(400,320,15+Math.random()*10);
    }});
    this.add.image(60,370,'obj_crate').setDisplaySize(48,48).setAlpha(0.7);
    this.add.image(750,360,'obj_crate').setDisplaySize(40,40).setAlpha(0.6);
    this.add.image(730,370,'obj_boulder').setDisplaySize(36,36).setAlpha(0.5);
    const dungeonName = DUNGEON_NAMES[GAME.dungeonId] || 'Unknown Dungeon';
    this.add.text(400,62,dungeonName+' -- Floor '+GAME.floor,{fontSize:'13px',fontFamily:'monospace',color:'#887755'}).setOrigin(0.5);
    if(PLAYER.fragmentOfDawn) this.add.text(400,80,'Fragment of Dawn acquired!',{fontSize:'12px',fontFamily:'monospace',color:'#ffdd44',fontStyle:'bold'}).setOrigin(0.5);

    // Refill food/water at tavern
    PLAYER.food = PLAYER.maxFood;
    PLAYER.water = PLAYER.maxWater;

    // --- MODULE INTEGRATION: Audio ambient layer ---
    if (window.DX_AUDIO) DX_AUDIO.setLayer('ambient');

    // --- MODULE INTEGRATION: Strider whispers ---
    if (window.DX_STRIDER && window.DX_SAVE) {
      const meta = DX_SAVE.loadMeta();
      if (DX_STRIDER.shouldActivate(meta)) DX_STRIDER.init(this, meta);
    }

    // --- MODULE INTEGRATION: Daily dungeon seed ---
    if (window.DX_SEED) {
      GAME.dailySeed = DX_SEED.getSeed();
      const options = DX_SEED.getDungeonOptions(GAME.dailySeed);
      // Use options for notice board display if available
      if (options && options.length > 0) {
        this.add.text(400, 95, 'Notice Board: ' + options[0].name, {fontSize:'10px',fontFamily:'monospace',color:'#887755'}).setOrigin(0.5);
      }
    }

    // --- MODULE INTEGRATION: Record returning alive ---
    if (window.DX_SAVE && GAME.floor > 1) {
      DX_SAVE.recordRunComplete();
    }

    // NPCs
    const npcs = [
      {x:120,y:280,w:50,h:80,portrait:'portrait_hero1',name:'Barkeep',dialog:'Welcome to the Rusty Flagon. Ale?\nWord is, something stirs below the crypts.\nBe careful down there, adventurer.'},
      {x:600,y:280,w:45,h:75,portrait:'portrait_heroine1',name:'Merchant',dialog:'Fine wares, fair prices.\nI have potions, torches, keys.\nCome back with gold from the dungeon.'},
      {x:700,y:260,w:40,h:90,portrait:'portrait_hero3',name:'Stranger',dialog:'You seek the Sunstone fragments?\nTen pieces, scattered across ten dungeons.\nThe first lies in the Whispering Crypts below.'}
    ];
    this.dialogBox = null; this.dialogText = null;
    npcs.forEach(npc => {
      const portrait = this.add.image(npc.x,npc.y-10,npc.portrait).setDisplaySize(npc.w+10,npc.h).setAlpha(0.95);
      this.add.text(npc.x,npc.y-npc.h/2-35,npc.name,{fontSize:'11px',fontFamily:'monospace',color:'#ffcc88'}).setOrigin(0.5);
      const zone = this.add.zone(npc.x,npc.y,npc.w+20,npc.h+40).setInteractive();
      zone.on('pointerdown', () => this.showDialog(npc.name,npc.dialog));
      zone.on('pointerover', () => portrait.setAlpha(1).setTint(0xffffcc));
      zone.on('pointerout', () => portrait.setAlpha(0.95).clearTint());
    });

    // Enter Dungeon button
    const btnG = this.add.graphics();
    btnG.fillStyle(0x443322); btnG.fillRect(250,490,180,40);
    btnG.lineStyle(2,0xff8800); btnG.strokeRect(250,490,180,40);
    this.add.image(270,510,'tile_door').setDisplaySize(24,24);
    this.add.text(350,510,'Enter Dungeon',{fontSize:'16px',fontFamily:'monospace',color:'#ff8800'}).setOrigin(0.5);
    const btnZone = this.add.zone(340,510,180,40).setInteractive();
    btnZone.on('pointerdown', () => {
      PLAYER.torch = PLAYER.maxTorch;
      loadFloor(GAME.dungeonId, 1);
      const floorData = DUNGEON_MAPS[getFloorKey(GAME.dungeonId, 1)];
      PLAYER.x = floorData.playerStart.x; PLAYER.y = floorData.playerStart.y; PLAYER.dir = floorData.playerStart.dir;
      this.scene.start('Dungeon', { narrative: NARRATIVE.enterDungeon1 });
    });

    // Rest button (costs 10 gold)
    const restG = this.add.graphics();
    const canRest = PLAYER.gold >= 10 && PLAYER.hp < PLAYER.maxHp;
    const restCol = canRest ? 0xff8800 : 0x555555;
    restG.fillStyle(0x443322); restG.fillRect(450,490,160,40);
    restG.lineStyle(2,restCol); restG.strokeRect(450,490,160,40);
    this.add.image(470,510,'icon_potion').setDisplaySize(20,20);
    this.add.text(540,510,'Rest (10g)',{fontSize:'14px',fontFamily:'monospace',color:canRest?'#ff8800':'#555555'}).setOrigin(0.5);
    const restZone = this.add.zone(530,510,160,40).setInteractive();
    restZone.on('pointerdown', () => {
      if(PLAYER.gold>=10 && PLAYER.hp<PLAYER.maxHp) { PLAYER.gold-=10; PLAYER.hp=PLAYER.maxHp; PLAYER.mana=PLAYER.maxMana; this.scene.restart(); }
      else if(PLAYER.hp>=PLAYER.maxHp) this.showDialog('Barkeep','You look healthy enough. Save your gold.');
      else this.showDialog('Barkeep','You need 10 gold to rent a room.');
    });

    // --- MODULE INTEGRATION: Merchant / Shop button ---
    const shopG = this.add.graphics();
    shopG.fillStyle(0x332233); shopG.fillRect(630,490,140,40);
    shopG.lineStyle(2, 0xcc88ff); shopG.strokeRect(630,490,140,40);
    this.add.image(650,510,'icon_gem').setDisplaySize(20,20);
    this.add.text(710,510,'Shop',{fontSize:'14px',fontFamily:'monospace',color:'#cc88ff'}).setOrigin(0.5);
    const shopZone = this.add.zone(700,510,140,40).setInteractive();
    shopZone.on('pointerdown', () => {
      if (window.DX_MERCHANT) {
        const shopInv = DX_MERCHANT.getShopInventory(GAME.dailySeed, PLAYER.classId);
        this.showMerchantOverlay(shopInv);
      } else {
        this.showDialog('Merchant', 'My wares are not ready yet.\nCome back later, adventurer.');
      }
    });

    // Title
    this.add.text(400,25,'THE RUSTY FLAGON',{fontSize:'22px',fontFamily:'monospace',color:'#ff9944',fontStyle:'bold'}).setOrigin(0.5);

    // Player status
    const classIcon = CLASS_WEAPON_ICONS[PLAYER.class] || 'icon_sword';
    this.add.image(20,556,classIcon).setDisplaySize(20,20);
    this.add.text(35,548,`${PLAYER.name} | Lv${PLAYER.level} ${PLAYER.class} | HP:${PLAYER.hp}/${PLAYER.maxHp} | XP:${PLAYER.xp}/${PLAYER.xpNext}`,{fontSize:'12px',fontFamily:'monospace',color:'#aa8866'});
    this.add.image(20,574,'icon_potion').setDisplaySize(16,16);
    this.add.text(35,566,`Potions:${PLAYER.potions}`,{fontSize:'12px',fontFamily:'monospace',color:'#aa8866'});
    this.add.image(140,574,'icon_key').setDisplaySize(16,16);
    this.add.text(155,566,`Keys:${PLAYER.keys}`,{fontSize:'12px',fontFamily:'monospace',color:'#aa8866'});
    this.add.image(240,574,'icon_gem').setDisplaySize(16,16);
    this.add.text(255,566,`Gold:${PLAYER.gold}`,{fontSize:'12px',fontFamily:'monospace',color:'#ddaa44'});
    this.add.text(350,566,`Torch:${PLAYER.torch}`,{fontSize:'12px',fontFamily:'monospace',color:'#aa8866'});
  }

  showDialog(name, text) {
    if(this.dialogBox) { this.dialogBox.destroy(); this.dialogText.destroy(); this.dialogName.destroy(); }
    this.dialogBox = this.add.graphics();
    this.dialogBox.fillStyle(0x111111,0.9); this.dialogBox.fillRect(50,400,700,80);
    this.dialogBox.lineStyle(1,0xff8800); this.dialogBox.strokeRect(50,400,700,80);
    this.dialogName = this.add.text(60,405,name,{fontSize:'13px',fontFamily:'monospace',color:'#ffaa44',fontStyle:'bold'});
    this.dialogText = this.add.text(60,422,text,{fontSize:'12px',fontFamily:'monospace',color:'#ccbbaa',wordWrap:{width:680}});
  }

  showMerchantOverlay(shopInv) {
    // Simple merchant overlay -- show shop items with buy buttons
    const overlay = this.add.graphics().setDepth(500);
    overlay.fillStyle(0x111111, 0.95); overlay.fillRect(100, 100, 600, 350);
    overlay.lineStyle(2, 0xcc88ff); overlay.strokeRect(100, 100, 600, 350);
    this.add.text(400, 120, 'MERCHANT', {fontSize:'20px',fontFamily:'monospace',color:'#cc88ff',fontStyle:'bold'}).setOrigin(0.5).setDepth(501);
    const elements = [overlay];

    if (shopInv && shopInv.length > 0) {
      shopInv.forEach((shopItem, i) => {
        if (i >= 6) return;
        const y = 155 + i * 35;
        const itemName = shopItem.name || 'Unknown';
        const price = shopItem.price || 10;
        const canBuy = PLAYER.gold >= price;
        const txt = this.add.text(150, y, `${itemName} -- ${price}g`, {
          fontSize:'13px', fontFamily:'monospace', color: canBuy ? '#ccbbaa' : '#666655'
        }).setDepth(501);
        elements.push(txt);
        if (canBuy) {
          const buyTxt = this.add.text(550, y, '[BUY]', {fontSize:'12px',fontFamily:'monospace',color:'#44ff44'}).setDepth(501).setInteractive();
          buyTxt.on('pointerdown', () => {
            PLAYER.gold -= price;
            applyLoot(shopItem);
            buyTxt.setText('[SOLD]').setColor('#666655').removeInteractive();
          });
          elements.push(buyTxt);
        }
      });
    } else {
      const noItems = this.add.text(400, 250, 'No wares available today.', {fontSize:'14px',fontFamily:'monospace',color:'#666655'}).setOrigin(0.5).setDepth(501);
      elements.push(noItems);
    }

    const closeTxt = this.add.text(400, 430, '[ Close ]', {fontSize:'14px',fontFamily:'monospace',color:'#888877'}).setOrigin(0.5).setDepth(501).setInteractive();
    closeTxt.on('pointerdown', () => { elements.forEach(e => e.destroy()); closeTxt.destroy(); this.scene.restart(); });
    elements.push(closeTxt);
  }
}

// ============================================================
// DUNGEON SCENE -- First Person View with Touch, Food/Water, Levers, Sconces
// ============================================================
class DungeonScene extends Phaser.Scene {
  constructor() { super('Dungeon'); }

  init(data) {
    this.narrativeMsg = data && data.narrative ? data.narrative : null;
  }

  create() {
    this.cameras.main.setBackgroundColor('#0f0f1f');
    this.gfx = this.add.graphics();
    this.viewSprites = [];
    this.decorSprites = [];
    this.handGfx = this.add.graphics();
    this.hudGfx = this.add.graphics();
    this.minimapGfx = this.add.graphics();
    this.torchGfx = this.add.graphics();
    this.interactionSprites = [];

    this.logText = this.add.text(10,555,'',{fontSize:'12px',fontFamily:'monospace',color:'#888877',wordWrap:{width:580}});
    this.hudText = this.add.text(10,580,'WASD:Move | I:Inventory | Space:Interact',{fontSize:'11px',fontFamily:'monospace',color:'#666655'});

    this.narrativeText = this.add.text(300, 20, '', {
      fontSize:'13px', fontFamily:'monospace', color:'#ffdd88',
      wordWrap:{width:560}, align:'center', backgroundColor:'#0a0a1488'
    }).setOrigin(0.5, 0).setDepth(300).setAlpha(0);

    if (this.narrativeMsg) this.showNarrative(this.narrativeMsg);

    const floorKey = getFloorKey(GAME.dungeonId, GAME.floor);
    const floorData = DUNGEON_MAPS[floorKey];
    if (floorData) this.logText.setText(floorData.name);

    this.keys = this.input.keyboard.addKeys('W,A,S,D,I,SPACE,ESC');
    this.moveDelay = 0;
    this.moveCount = 0;

    // Touch D-pad overlay
    this.dpadElements = [];
    if (GAME.isTouchDevice) this.createDpad();

    // --- MODULE INTEGRATION: Audio exploration layer ---
    if (window.DX_AUDIO) DX_AUDIO.setLayer('exploration');

    // --- MODULE INTEGRATION: Auto-save ---
    if (window.DX_SAVE) DX_SAVE.startAutoSave(30000);

    // --- MODULE INTEGRATION: Floor events ---
    if (window.DX_EVENTS) {
      GAME.floorEvents = DX_EVENTS.generateFloorEvents(GAME.dungeonId, GAME.currentFloor || GAME.floor, GAME.dailySeed);
    }

    // --- MODULE INTEGRATION: NPC encounter check ---
    if (window.DX_NPC) {
      const meta = window.DX_SAVE ? DX_SAVE.loadMeta() : {};
      GAME.floorNPC = DX_NPC.generateEncounter(GAME.dungeonId, GAME.currentFloor || GAME.floor, GAME.dailySeed, meta);
    }

    this.drawView();
    this.drawHUD();
    this.drawMinimap();
    this.drawHands();
    this.drawInteractionOverlay();
  }

  createDpad() {
    const dg = this.add.graphics().setDepth(500).setAlpha(0.35);
    dg.fillStyle(0xffffff); dg.fillTriangle(300,420, 280,455, 320,455);
    dg.fillTriangle(300,495, 280,470, 320,470);
    dg.fillTriangle(245,457, 270,440, 270,475);
    dg.fillTriangle(355,457, 330,440, 330,475);
    this.dpadElements.push(dg);

    const fwd = this.add.zone(300,435,80,50).setInteractive().setDepth(501);
    fwd.on('pointerdown', () => { if(this.tryMove(1)) this.afterMove(); });
    const bck = this.add.zone(300,485,80,50).setInteractive().setDepth(501);
    bck.on('pointerdown', () => { if(this.tryMove(-1)) this.afterMove(); });
    const lft = this.add.zone(255,457,50,50).setInteractive().setDepth(501);
    lft.on('pointerdown', () => { PLAYER.dir=(PLAYER.dir+3)%4; this.afterMove(); });
    const rgt = this.add.zone(345,457,50,50).setInteractive().setDepth(501);
    rgt.on('pointerdown', () => { PLAYER.dir=(PLAYER.dir+1)%4; this.afterMove(); });

    this.dpadElements.push(fwd, bck, lft, rgt);
  }

  showNarrative(msg) {
    this.narrativeText.setText(msg).setAlpha(1);
    this.time.delayedCall(4000, () => {
      this.tweens.add({ targets: this.narrativeText, alpha: 0, duration: 1500 });
    });
  }

  afterMove() {
    this.depleteSurvival();
    this.drawView();
    this.drawHUD();
    this.drawMinimap();
    this.drawHands();
    this.drawInteractionOverlay();

    // --- MODULE INTEGRATION: Audio on movement ---
    if (window.DX_AUDIO) DX_AUDIO.updateTorchReactivity(PLAYER.torch);
    if (window.DX_AUDIO) DX_AUDIO.playSFX('footstep');

    // --- MODULE INTEGRATION: Narrative text on movement (1 in 5 moves) ---
    this.moveCount++;
    if (window.DX_NARRATIVE && this.moveCount % 5 === 0) {
      const text = DX_NARRATIVE.getLine('exploration', GAME.dungeonId);
      if (text) this.showNarrative(text);
    }

    this.checkPositionEvents();
  }

  depleteSurvival() {
    PLAYER.food = Math.max(0, PLAYER.food - 1);
    PLAYER.water = Math.max(0, PLAYER.water - 1.5);
    if (PLAYER.food <= 0) {
      PLAYER.hp = Math.max(1, PLAYER.hp - 1);
      this.showNarrative("You're starving... (-1 HP)");
    }
    if (PLAYER.water <= 0) {
      this.showNarrative("You're parched... (No mana regen)");
    }
    PLAYER.torch = Math.max(0, PLAYER.torch - 1);
  }

  checkPositionEvents() {
    const encounter = getEncounterAt(PLAYER.x, PLAYER.y);
    if (encounter) {
      if (!GAME.firstEnemySeen) {
        GAME.firstEnemySeen = true;
        this.showNarrative(NARRATIVE.firstEnemy);
        this.time.delayedCall(1500, () => {
          if (encounter.enemy === 'vault_warden') {
            this.scene.start('Combat', { enemyType: encounter.enemy, encounterX: encounter.x, encounterY: encounter.y, isBoss: true, narrative: NARRATIVE.vaultWardenEncounter });
          } else {
            this.scene.start('Combat', { enemyType: encounter.enemy, encounterX: encounter.x, encounterY: encounter.y });
          }
        });
        return;
      }
      if (encounter.enemy === 'vault_warden') {
        this.scene.start('Combat', { enemyType: encounter.enemy, encounterX: encounter.x, encounterY: encounter.y, isBoss: true, narrative: NARRATIVE.vaultWardenEncounter });
      } else {
        this.scene.start('Combat', { enemyType: encounter.enemy, encounterX: encounter.x, encounterY: encounter.y });
      }
      return;
    }
    const map = GAME.currentMap;
    const tile = map[PLAYER.y][PLAYER.x];
    if (tile === 4) { this.handleStairsDown(); return; }
    else if (tile === 5) { this.logText.setText('Stairs leading up. Press SPACE to ascend.'); }
  }

  update(time) {
    if(time < this.moveDelay) return;
    let moved = false;
    if(this.keys.W.isDown) { moved = this.tryMove(1); }
    else if(this.keys.S.isDown) { moved = this.tryMove(-1); }
    else if(this.keys.A.isDown) { PLAYER.dir = (PLAYER.dir+3)%4; moved = true; }
    else if(this.keys.D.isDown) { PLAYER.dir = (PLAYER.dir+1)%4; moved = true; }
    else if(this.keys.I.isDown) { this.scene.launch('Inventory'); this.scene.pause(); this.moveDelay=time+300; return; }
    else if(this.keys.SPACE.isDown) { this.interact(); this.moveDelay=time+300; return; }

    if(moved) {
      this.moveDelay = time + 200;
      this.afterMove();
    }
  }

  handleStairsDown() {
    const nextFloor = GAME.floor + 1;
    const nextKey = getFloorKey(GAME.dungeonId, nextFloor);
    if (!DUNGEON_MAPS[nextKey]) { this.logText.setText('The stairs are collapsed. No way further down.'); return; }
    saveFloorState();
    loadFloor(GAME.dungeonId, nextFloor);
    const floorData = DUNGEON_MAPS[nextKey];
    let startX = floorData.playerStart.x, startY = floorData.playerStart.y;
    for (let y=0; y<floorData.height; y++) for (let x=0; x<floorData.width; x++) {
      if (GAME.currentMap[y][x] === 5) { startX = x; startY = y; }
    }
    PLAYER.x = startX; PLAYER.y = startY; PLAYER.dir = 2;
    let narrativeMsg = 'You descend deeper into the crypts...';
    if (nextFloor === 2) narrativeMsg = NARRATIVE.reachFloor2;
    else if (nextFloor === 3) narrativeMsg = NARRATIVE.reachFloor3;
    this.scene.restart({ narrative: narrativeMsg });
  }

  handleStairsUp() {
    const prevFloor = GAME.floor - 1;
    if (prevFloor < 1) {
      this.logText.setText('You climb back to the surface.');
      // --- MODULE INTEGRATION: Record returning alive ---
      if (window.DX_SAVE) DX_SAVE.recordRunComplete();
      if (window.DX_SAVE) DX_SAVE.recordGoldEarned(PLAYER.gold);
      PLAYER.food = 100;
      PLAYER.water = 100;
      if (window.DX_AUDIO) DX_AUDIO.setLayer('ambient');
      this.time.delayedCall(1000, () => this.scene.start('Tavern'));
      return;
    }
    const prevKey = getFloorKey(GAME.dungeonId, prevFloor);
    if (!DUNGEON_MAPS[prevKey]) { this.scene.start('Tavern'); return; }
    saveFloorState();
    loadFloor(GAME.dungeonId, prevFloor);
    const floorData = DUNGEON_MAPS[prevKey];
    let startX = floorData.playerStart.x, startY = floorData.playerStart.y;
    for (let y=0; y<floorData.height; y++) for (let x=0; x<floorData.width; x++) {
      if (GAME.currentMap[y][x] === 4) { startX = x; startY = y; }
    }
    PLAYER.x = startX; PLAYER.y = startY; PLAYER.dir = 0;
    this.scene.restart({ narrative: 'You ascend to the previous level.' });
  }

  tryMove(forward) {
    const map = GAME.currentMap;
    const w = GAME.mapWidth, h = GAME.mapHeight;
    const nx = PLAYER.x + DX[PLAYER.dir] * forward;
    const ny = PLAYER.y + DY[PLAYER.dir] * forward;
    if(nx<0||nx>=w||ny<0||ny>=h) return false;
    const tile = map[ny][nx];
    if(tile === 1) return false;
    if(tile === 3) { this.logText.setText('The door is locked. Face it and use a key from inventory.'); return false; }
    if(tile === 2) { map[ny][nx] = 0; this.logText.setText('You open the door.'); }
    if(tile === 8) { /* lever tile is walkable */ }
    if(tile === 9) { /* sconce tile is walkable */ }
    PLAYER.x = nx; PLAYER.y = ny;
    return true;
  }

  interact() {
    const map = GAME.currentMap;
    const w = GAME.mapWidth, h = GAME.mapHeight;
    const fx = PLAYER.x + DX[PLAYER.dir];
    const fy = PLAYER.y + DY[PLAYER.dir];

    // Check standing on stairs up
    if (map[PLAYER.y][PLAYER.x] === 5) { this.handleStairsUp(); return; }

    if(fx<0||fx>=w||fy<0||fy>=h) return;
    const tile = map[fy][fx];

    if(tile === 3 && PLAYER.keys > 0) {
      const keyIdx = PLAYER.inventory.findIndex(it => it.type === 'key');
      if (keyIdx >= 0) {
        PLAYER.keys--;
        PLAYER.inventory.splice(keyIdx, 1);
        for (const slot of Object.keys(PLAYER.equipped)) {
          if (PLAYER.equipped[slot] > keyIdx) PLAYER.equipped[slot]--;
          else if (PLAYER.equipped[slot] === keyIdx) PLAYER.equipped[slot] = -1;
        }
        map[fy][fx] = 0;
        AudioSys.keyTurnSound();
        this.logText.setText('Used a key. The door creaks open.');
        this.drawView(); this.drawHUD(); this.drawInteractionOverlay();
      }
    } else if(tile === 3) {
      this.logText.setText('Locked. Open inventory (I) and drag a key to the keyhole.');
    } else if(tile === 2) {
      map[fy][fx] = 0;
      this.logText.setText('Door opened.');
      this.drawView();
    }
  }

  clearViewSprites() {
    this.viewSprites.forEach(s => s.destroy());
    this.viewSprites = [];
    this.decorSprites.forEach(s => s.destroy());
    this.decorSprites = [];
  }

  clearInteractionSprites() {
    this.interactionSprites.forEach(s => s.destroy());
    this.interactionSprites = [];
  }

  addViewSprite(x, y, key, w, h, alpha, tintColor, depth) {
    const s = this.add.image(x, y, key);
    s.setDisplaySize(w, h);
    if (alpha !== undefined) s.setAlpha(alpha);
    if (tintColor !== undefined) s.setTint(tintColor);
    if (depth !== undefined) s.setDepth(depth);
    this.viewSprites.push(s);
    return s;
  }

  drawInteractionOverlay() {
    this.clearInteractionSprites();
    const map = GAME.currentMap;
    const fx = PLAYER.x + DX[PLAYER.dir];
    const fy = PLAYER.y + DY[PLAYER.dir];
    if (fx<0||fx>=GAME.mapWidth||fy<0||fy>=GAME.mapHeight) return;
    const tile = map[fy][fx];

    // Locked door keyhole indicator
    if (tile === 3) {
      const g = this.add.graphics().setDepth(400);
      g.fillStyle(0x222222); g.fillCircle(300, 260, 12);
      g.fillStyle(0x111111); g.fillCircle(300, 260, 8);
      g.fillStyle(0x111111); g.fillRect(296, 260, 8, 20);
      g.lineStyle(2, 0x888866); g.strokeCircle(300, 260, 12);
      const label = this.add.text(300, 235, 'KEYHOLE', {fontSize:'10px',fontFamily:'monospace',color:'#ffdd88'}).setOrigin(0.5).setDepth(401);
      this.interactionSprites.push(g, label);
    }

    // Lever
    if (tile === 8) {
      const lever = getLeverAt(fx, fy);
      if (lever && !lever.pulled) {
        const g = this.add.graphics().setDepth(400);
        g.fillStyle(0x666666); g.fillRect(285, 280, 30, 8);
        g.fillStyle(0x888888); g.fillRect(297, 230, 6, 55);
        g.fillStyle(0xaaaa44); g.fillCircle(300, 225, 8);
        const label = this.add.text(300, 210, 'PULL LEVER', {fontSize:'10px',fontFamily:'monospace',color:'#ffdd88'}).setOrigin(0.5).setDepth(401);
        this.interactionSprites.push(g, label);
        const zone = this.add.zone(300, 250, 60, 80).setInteractive().setDepth(402);
        this.interactionSprites.push(zone);
        let dragStartY = 0;
        zone.on('pointerdown', (ptr) => { dragStartY = ptr.y; });
        zone.on('pointerup', (ptr) => {
          const dragDist = ptr.y - dragStartY;
          if (dragDist > 40) {
            lever.pulled = true;
            AudioSys.leverSound();
            if (lever.targetType === 'gate') {
              map[lever.targetY][lever.targetX] = 0;
              this.logText.setText('The lever activates. A distant gate opens!');
            }
            this.drawView(); this.drawInteractionOverlay(); this.drawMinimap();
          } else if (dragDist > 5) {
            AudioSys.springSound();
            this.logText.setText('The lever snaps back. Pull harder!');
          }
        });
      } else if (lever && lever.pulled) {
        const label = this.add.text(300, 240, 'Lever (pulled)', {fontSize:'10px',fontFamily:'monospace',color:'#666655'}).setOrigin(0.5).setDepth(401);
        this.interactionSprites.push(label);
      }
    }

    // Empty sconce
    if (tile === 9) {
      const sconceKey = GAME.dungeonId+'-'+GAME.floor+'-'+fx+'-'+fy;
      const isLit = GAME.litSconces[sconceKey];
      const g = this.add.graphics().setDepth(400);
      g.fillStyle(0x555555); g.fillRect(290, 240, 20, 6);
      g.fillStyle(0x555555); g.fillRect(293, 230, 14, 16);
      if (isLit) {
        g.fillStyle(0xff8833, 0.6); g.fillCircle(300, 220, 15);
        g.fillStyle(0xffcc44, 0.8); g.fillCircle(300, 220, 8);
        const label = this.add.text(300, 200, 'LIT SCONCE', {fontSize:'10px',fontFamily:'monospace',color:'#ffaa44'}).setOrigin(0.5).setDepth(401);
        this.interactionSprites.push(label);
      } else {
        const label = this.add.text(300, 215, 'EMPTY SCONCE', {fontSize:'10px',fontFamily:'monospace',color:'#888866'}).setOrigin(0.5).setDepth(401);
        const hasTorch = PLAYER.torch > 10;
        if (hasTorch) {
          g.lineStyle(1, 0xffaa44, 0.4); g.strokeCircle(300, 235, 20);
        }
        this.interactionSprites.push(label);
      }
      this.interactionSprites.push(g);
    }
  }

  drawView() {
    const g = this.gfx;
    g.clear();
    this.clearViewSprites();
    const VW = 600, VH = 500;
    const map = GAME.currentMap;
    const mapW = GAME.mapWidth, mapH = GAME.mapHeight;
    const floorDarkness = Math.min(0.3, (GAME.floor - 1) * 0.08);
    const R = [
      { l: 0, r: VW, t: 0, b: VH },
      { l: 100, r: VW - 100, t: 62, b: VH - 62 },
      { l: 175, r: VW - 175, t: 109, b: VH - 109 },
      { l: 228, r: VW - 228, t: 141, b: VH - 141 },
      { l: 262, r: VW - 262, t: 163, b: VH - 163 }
    ];
    const leftDir = (PLAYER.dir + 3) % 4;
    const rightDir = (PLAYER.dir + 1) % 4;
    const sideCol = [0x4e4e68, 0x444460, 0x3c3c56, 0x34344c];

    this.addViewSprite(VW/2, VH/4, 'tile_ceiling', VW, VH/2, 0.6 - floorDarkness, 0x444466, 0);
    this.addViewSprite(VW/2, VH*3/4, 'tile_floor', VW, VH/2, 0.5 - floorDarkness, 0x554433, 0);

    for (let d = 3; d >= 0; d--) {
      const o = R[d], i = R[d + 1];
      const cx = PLAYER.x + DX[PLAYER.dir] * d;
      const cy = PLAYER.y + DY[PLAYER.dir] * d;
      const fx = PLAYER.x + DX[PLAYER.dir] * (d + 1);
      const fy = PLAYER.y + DY[PLAYER.dir] * (d + 1);
      const depthAlpha = (1.0 - d * 0.15) - floorDarkness;

      const ceilTint = [0x181828, 0x141424, 0x101020, 0x0c0c1c];
      g.fillStyle(ceilTint[d]);
      g.beginPath(); g.moveTo(o.l, o.t); g.lineTo(o.r, o.t);
      g.lineTo(i.r, i.t); g.lineTo(i.l, i.t); g.closePath(); g.fillPath();

      const floorTint = [0x1c1c2e, 0x18182a, 0x151526, 0x121222];
      g.fillStyle(floorTint[d]);
      g.beginPath(); g.moveTo(o.l, o.b); g.lineTo(o.r, o.b);
      g.lineTo(i.r, i.b); g.lineTo(i.l, i.b); g.closePath(); g.fillPath();
      g.lineStyle(1, 0x222238, 0.3);
      g.lineBetween(o.l, o.b, i.l, i.b);
      g.lineBetween(o.r, o.b, i.r, i.b);
      g.lineBetween((o.l+o.r)/2, o.b, (i.l+i.r)/2, i.b);

      const lx = cx + DX[leftDir], ly = cy + DY[leftDir];
      if (lx<0||lx>=mapW||ly<0||ly>=mapH||map[ly][lx]===1||map[ly][lx]>=2) {
        g.fillStyle(sideCol[d]);
        g.beginPath(); g.moveTo(o.l,o.t); g.lineTo(i.l,i.t); g.lineTo(i.l,i.b); g.lineTo(o.l,o.b); g.closePath(); g.fillPath();
        g.lineStyle(1,0x1a1a2a,0.5); g.lineBetween(o.l,(o.t+o.b)/2,i.l,(i.t+i.b)/2);
        const ml=(o.l+i.l)/2, mt=(o.t+i.t)/2, mb=(o.b+i.b)/2;
        g.lineBetween(ml,mt,ml,(mt+mb)/2); g.lineBetween((o.l+ml)/2,(mt+mb)/2,(o.l+ml)/2,mb);
      }

      const rx = cx + DX[rightDir], ry = cy + DY[rightDir];
      if (rx<0||rx>=mapW||ry<0||ry>=mapH||map[ry][rx]===1||map[ry][rx]>=2) {
        g.fillStyle(sideCol[d]);
        g.beginPath(); g.moveTo(o.r,o.t); g.lineTo(i.r,i.t); g.lineTo(i.r,i.b); g.lineTo(o.r,o.b); g.closePath(); g.fillPath();
        g.lineStyle(1,0x1a1a2a,0.5); g.lineBetween(o.r,(o.t+o.b)/2,i.r,(i.t+i.b)/2);
        const mr=(o.r+i.r)/2, mt2=(o.t+i.t)/2, mb2=(o.b+i.b)/2;
        g.lineBetween(mr,mt2,mr,(mt2+mb2)/2); g.lineBetween((o.r+mr)/2,(mt2+mb2)/2,(o.r+mr)/2,mb2);
      }

      const outOfBounds = fx<0||fx>=mapW||fy<0||fy>=mapH;
      const frontTile = outOfBounds ? 1 : map[fy][fx];
      const isWall = frontTile === 1;
      const isDoor = frontTile === 2 || frontTile === 3;
      const isStairs = frontTile === 4 || frontTile === 5;
      const isSpecial = frontTile === 6 || frontTile === 7 || frontTile === 8 || frontTile === 9;

      if (outOfBounds || isWall) {
        const wallW = i.r-i.l, wallH = i.b-i.t;
        const wallX = (i.l+i.r)/2, wallY = (i.t+i.b)/2;
        const depthTints = [0xffffff, 0xccccdd, 0x9999aa, 0x666688];
        this.addViewSprite(wallX, wallY, 'tile_wall', wallW, wallH, depthAlpha, depthTints[d], 10-d);
        g.lineStyle(1, 0x111120, 0.6); g.strokeRect(i.l, i.t, wallW, wallH);
      } else if (isDoor) {
        const wallW = i.r-i.l, wallH = i.b-i.t;
        const wallX = (i.l+i.r)/2, wallY = (i.t+i.b)/2;
        const depthTints = [0xffffff, 0xccccdd, 0x9999aa, 0x666688];
        this.addViewSprite(wallX, wallY, 'tile_wall', wallW, wallH, depthAlpha*0.6, depthTints[d], 10-d);
        const dw = wallW*0.55, dh = wallH*0.85;
        const doorX = wallX, doorY = i.b - dh/2;
        const doorKey = frontTile===3 ? 'tile_locked_door' : 'tile_door';
        const doorTint = frontTile===3 ? 0xffcc88 : 0xffffff;
        this.addViewSprite(doorX, doorY, doorKey, dw, dh, depthAlpha, doorTint, 11-d);
        if (frontTile===3 && d<=1) {
          this.addViewSprite(doorX + dw*0.3, doorY, 'icon_key', 16, 16, 0.9, 0xffdd44, 12-d);
        }
      } else if (isStairs && d<=2) {
        const wallW = i.r-i.l, wallH = i.b-i.t;
        const wallX = (i.l+i.r)/2, wallY = (i.t+i.b)/2;
        const stairsTint = frontTile===4 ? 0x44aaff : 0x44ff88;
        this.addViewSprite(wallX, wallY+wallH*0.2, 'tile_floor', wallW*0.6, wallH*0.4, depthAlpha*0.8, stairsTint, 10-d);
        if (d<=1) {
          const arrowLabel = frontTile===4 ? 'STAIRS DOWN' : 'STAIRS UP';
          const arrowText = this.add.text(wallX, wallY-10, arrowLabel, {fontSize:'10px',fontFamily:'monospace',color:frontTile===4?'#44aaff':'#44ff88',fontStyle:'bold'}).setOrigin(0.5).setDepth(12-d);
          this.viewSprites.push(arrowText);
        }
      }

      // Special tiles rendering
      if (!outOfBounds && isSpecial && d<=2) {
        const wallW = i.r-i.l, wallH = i.b-i.t;
        const wallX = (i.l+i.r)/2, wallY = (i.t+i.b)/2;
        if (frontTile === 6) {
          g.lineStyle(1, 0x664422, depthAlpha*0.5);
          g.lineBetween(wallX-20, i.t+5, wallX+10, i.t+15);
          g.lineBetween(wallX+10, i.t+15, wallX+25, i.t+8);
          if (d<=1) { const t = this.add.text(wallX, i.t+20, 'CRACKED', {fontSize:'8px',fontFamily:'monospace',color:'#664422'}).setOrigin(0.5).setDepth(12-d); this.viewSprites.push(t); }
        } else if (frontTile === 7) {
          g.fillStyle(0x0a0a0a, depthAlpha*0.8);
          g.fillEllipse(wallX, wallY+wallH*0.3, wallW*0.4, wallH*0.2);
          if (d<=1) { const t = this.add.text(wallX, wallY+wallH*0.1, 'PIT', {fontSize:'9px',fontFamily:'monospace',color:'#884422'}).setOrigin(0.5).setDepth(12-d); this.viewSprites.push(t); }
        } else if (frontTile === 8) {
          g.fillStyle(0x666666, depthAlpha); g.fillRect(wallX-8, wallY+wallH*0.15, 16, 4);
          g.fillStyle(0x888888, depthAlpha); g.fillRect(wallX-2, wallY-wallH*0.1, 4, wallH*0.25);
          g.fillStyle(0xaaaa44, depthAlpha); g.fillCircle(wallX, wallY-wallH*0.12, 4);
        } else if (frontTile === 9) {
          const sconceKey = GAME.dungeonId+'-'+GAME.floor+'-'+fx+'-'+fy;
          g.fillStyle(0x555555, depthAlpha); g.fillRect(wallX-6, wallY-wallH*0.15, 12, 4);
          g.fillStyle(0x555555, depthAlpha); g.fillRect(wallX-4, wallY-wallH*0.25, 8, 12);
          if (GAME.litSconces[sconceKey]) {
            g.fillStyle(0xff8833, depthAlpha*0.5); g.fillCircle(wallX, wallY-wallH*0.3, 10);
            g.fillStyle(0xffcc44, depthAlpha*0.7); g.fillCircle(wallX, wallY-wallH*0.3, 5);
          }
        }
      }

      // Decorations
      if (!outOfBounds && (frontTile===0||isStairs||isSpecial) && d<=2) {
        const decor = getRoomDecor(fx, fy);
        if (decor) {
          const decorX = (i.l+i.r)/2, decorY = i.b-(i.b-i.t)*0.2;
          const decorSize = Math.max(16, (3-d)*20);
          let decorKey = null;
          if (decor==='skull_pile') decorKey='tile_skull_pile';
          else if (decor==='pillar') decorKey='tile_pillar';
          else if (decor==='crate') decorKey='obj_crate';
          else if (decor==='chest') decorKey='tile_chest';
          if (decorKey) {
            const ds = this.add.image(decorX, decorY, decorKey).setDisplaySize(decorSize, decorSize);
            ds.setAlpha(depthAlpha*0.8).setDepth(10-d);
            this.decorSprites.push(ds);
          }
        }
      }

      // Enemy indicators
      if (!outOfBounds && d<=2) {
        const enc = getEncounterAt(fx, fy);
        if (enc) {
          const spriteKey = ENEMY_SPRITES[enc.enemy] || 'enemy_skeleton';
          const eSize = Math.max(24, (3-d)*30);
          const eX = (i.l+i.r)/2, eY = (i.t+i.b)/2;
          const eSprite = this.add.image(eX, eY, spriteKey).setDisplaySize(eSize, eSize);
          eSprite.setAlpha(depthAlpha*0.7).setDepth(11-d);
          this.viewSprites.push(eSprite);
        }
      }
    }

    // Torch light
    this.torchGfx.clear();
    this.torchGfx.setDepth(50);
    if (PLAYER.torch > 0) {
      const intensity = Math.min(1, PLAYER.torch / PLAYER.maxTorch);
      const flicker = 0.7 + Math.random()*0.3;
      const alpha = intensity * flicker * 0.1;
      this.torchGfx.fillStyle(0xffaa44, alpha); this.torchGfx.fillCircle(300, 250, 300);
      this.torchGfx.fillStyle(0xff8833, alpha*0.5); this.torchGfx.fillCircle(300, 260, 170);
    } else {
      this.torchGfx.fillStyle(0x000000, 0.92); this.torchGfx.fillRect(0, 0, VW, VH);
    }
    if (floorDarkness > 0) {
      this.torchGfx.fillStyle(0x000000, floorDarkness*0.5); this.torchGfx.fillRect(0, 0, VW, VH);
    }

    // Sconce light boost
    const sconceKey = GAME.dungeonId+'-'+GAME.floor+'-'+PLAYER.x+'-'+PLAYER.y;
    if (GAME.litSconces[sconceKey]) {
      this.torchGfx.fillStyle(0xffaa44, 0.06); this.torchGfx.fillCircle(300, 250, 200);
    }
  }

  drawHands() {
    const h = this.handGfx;
    h.clear(); h.setDepth(100);
    const VH = 500;
    h.fillStyle(0xddbb99); h.fillRect(60,VH-90,55,70);
    h.fillStyle(0xccaa88); h.fillRect(65,VH-95,45,15);
    h.fillStyle(0xddbb99); h.fillRect(485,VH-90,55,70);
    h.fillStyle(0xccaa88); h.fillRect(490,VH-95,45,15);
    if(PLAYER.equipped.weapon >= 0) {
      h.fillStyle(0xaaaacc); h.fillRect(505,VH-180,8,100);
      h.fillStyle(0x886633); h.fillRect(495,VH-85,30,6);
      h.fillStyle(0x886633); h.fillRect(505,VH-20,10,8);
      if (PLAYER.weaponCoating && PLAYER.weaponCoating.hitsLeft > 0) {
        const coatColor = PLAYER.weaponCoating.type === 'fire' ? 0xff6600 : 0x44cc44;
        h.fillStyle(coatColor, 0.5); h.fillRect(505, VH-180, 8, 100);
      }
    }
  }

  drawHUD() {
    const h = this.hudGfx;
    h.clear(); h.setDepth(200);
    const bx=610, by=10, bw=180;
    h.fillStyle(0x111118,0.9); h.fillRect(bx,by,bw,290);
    h.lineStyle(1,0x333344); h.strokeRect(bx,by,bw,290);

    h.fillStyle(0x441111); h.fillRect(bx+10,by+30,bw-20,14);
    h.fillStyle(0xcc2222); h.fillRect(bx+10,by+30,(bw-20)*(PLAYER.hp/PLAYER.maxHp),14);
    h.fillStyle(0x111144); h.fillRect(bx+10,by+60,bw-20,14);
    if(PLAYER.maxMana>0) { h.fillStyle(0x2244cc); h.fillRect(bx+10,by+60,(bw-20)*(PLAYER.mana/PLAYER.maxMana),14); }
    h.fillStyle(0x332200); h.fillRect(bx+10,by+90,bw-20,14);
    h.fillStyle(0xdd8822); h.fillRect(bx+10,by+90,(bw-20)*(PLAYER.torch/PLAYER.maxTorch),14);
    // Food bar
    h.fillStyle(0x332200); h.fillRect(bx+10,by+120,bw-20,10);
    const foodRatio = PLAYER.food/PLAYER.maxFood;
    h.fillStyle(foodRatio>0.25?0xdd8822:0xff4400); h.fillRect(bx+10,by+120,(bw-20)*foodRatio,10);
    // Water bar
    h.fillStyle(0x112233); h.fillRect(bx+10,by+138,bw-20,10);
    const waterRatio = PLAYER.water/PLAYER.maxWater;
    h.fillStyle(waterRatio>0.25?0x2266cc:0xff4400); h.fillRect(bx+10,by+138,(bw-20)*waterRatio,10);

    if(this.hudLabels) this.hudLabels.forEach(t=>t.destroy());
    if(this.hudIcons) this.hudIcons.forEach(t=>t.destroy());
    this.hudLabels = []; this.hudIcons = [];
    const addLabel = (x,y,txt,col) => { const t = this.add.text(x,y,txt,{fontSize:'11px',fontFamily:'monospace',color:col}); t.setDepth(201); this.hudLabels.push(t); };
    const addIcon = (x,y,key,size) => { const ic = this.add.image(x,y,key).setDisplaySize(size,size).setDepth(201); this.hudIcons.push(ic); };

    addLabel(bx+10,by+5,'DUNGEON X','#ff8800');
    addLabel(bx+10,by+17,`HP: ${PLAYER.hp}/${PLAYER.maxHp}`,'#cc4444');
    addLabel(bx+10,by+47,`MP: ${PLAYER.mana}/${PLAYER.maxMana}`,'#4466cc');
    addLabel(bx+10,by+77,`Torch: ${PLAYER.torch}`,'#dd8822');
    addLabel(bx+10,by+108,`Food: ${Math.floor(PLAYER.food)}`,foodRatio>0.25?'#dd8822':'#ff4400');
    addLabel(bx+100,by+108,`Water: ${Math.floor(PLAYER.water)}`,waterRatio>0.25?'#4488cc':'#ff4400');
    addLabel(bx+10,by+155,`AC: ${PLAYER.ac}  Lv: ${PLAYER.level}`,'#999988');
    addLabel(bx+10,by+172,`XP: ${PLAYER.xp}/${PLAYER.xpNext}`,'#999988');
    addIcon(bx+18,by+195,'icon_key',14);
    addLabel(bx+28,by+189,`Keys: ${PLAYER.keys}`,'#ddaa44');
    addIcon(bx+18,by+213,'icon_potion',14);
    addLabel(bx+28,by+206,`Potions: ${PLAYER.potions}`,'#cc4444');
    addIcon(bx+18,by+231,'icon_gem',14);
    addLabel(bx+28,by+224,`Gold: ${PLAYER.gold}`,'#ddaa44');
    addLabel(bx+10,by+248,`Floor: ${GAME.floor}  Pos:${PLAYER.x},${PLAYER.y}`,'#666655');
    if(PLAYER.weaponCoating && PLAYER.weaponCoating.hitsLeft>0) {
      const cName = PLAYER.weaponCoating.type === 'fire' ? 'FIRE' : 'POISON';
      addLabel(bx+10,by+265,`Coat: ${cName} (${PLAYER.weaponCoating.hitsLeft})`,PLAYER.weaponCoating.type==='fire'?'#ff6600':'#44cc44');
    }
  }

  drawMinimap() {
    const m = this.minimapGfx;
    m.clear(); m.setDepth(200);
    const map = GAME.currentMap;
    const mapW = GAME.mapWidth, mapH = GAME.mapHeight;
    const maxCells = Math.max(mapW, mapH);
    const cs = Math.min(16, Math.floor(140 / maxCells));
    const ox = 620, oy = 310;
    m.fillStyle(0x111118,0.9); m.fillRect(ox-5,oy-5,cs*mapW+10,cs*mapH+10);
    m.lineStyle(1,0x333344); m.strokeRect(ox-5,oy-5,cs*mapW+10,cs*mapH+10);
    for(let y=0;y<mapH;y++) for(let x=0;x<mapW;x++) {
      const tile = map[y][x];
      if(tile===1) m.fillStyle(0x444455);
      else if(tile===2) m.fillStyle(0x664422);
      else if(tile===3) m.fillStyle(0xaa6622);
      else if(tile===4) m.fillStyle(0x2255aa);
      else if(tile===5) m.fillStyle(0x22aa55);
      else if(tile===6) m.fillStyle(0x553322);
      else if(tile===7) m.fillStyle(0x331111);
      else if(tile===8) m.fillStyle(0x666644);
      else if(tile===9) m.fillStyle(0x444433);
      else m.fillStyle(0x222233);
      m.fillRect(ox+x*cs, oy+y*cs, cs-1, cs-1);
      const enc = getEncounterAt(x,y);
      if(enc) { m.fillStyle(0xff4444); m.fillCircle(ox+x*cs+cs/2, oy+y*cs+cs/2, Math.max(2,cs/4)); }
      const sk = GAME.dungeonId+'-'+GAME.floor+'-'+x+'-'+y;
      if(GAME.litSconces[sk]) { m.fillStyle(0xffaa44, 0.5); m.fillCircle(ox+x*cs+cs/2, oy+y*cs+cs/2, Math.max(2,cs/4)); }
    }
    m.fillStyle(0x00ff00);
    m.fillRect(ox+PLAYER.x*cs+Math.floor(cs/4), oy+PLAYER.y*cs+Math.floor(cs/4), Math.max(cs-Math.floor(cs/2),4), Math.max(cs-Math.floor(cs/2),4));
    m.fillStyle(0x44ff44);
    const px=ox+PLAYER.x*cs+cs/2, py=oy+PLAYER.y*cs+cs/2;
    m.fillCircle(px+DX[PLAYER.dir]*Math.floor(cs/2), py+DY[PLAYER.dir]*Math.floor(cs/2), 2);
  }
}

// ============================================================
// COMBAT SCENE -- With Boss, Loot, Throwables, Environmental, Coating, Spells
// ============================================================
class CombatScene extends Phaser.Scene {
  constructor() { super('Combat'); }

  init(data) {
    const template = ENEMIES[data.enemyType];
    this.enemy = { ...template, hp: template.maxHp };
    this.enemyType = data.enemyType;
    this.combatOver = false;
    this.defending = false;
    this.encounterX = data.encounterX;
    this.encounterY = data.encounterY;
    this.isBoss = data.isBoss || false;
    this.narrativeMsg = data.narrative || null;
    this.thrownItems = [];
    this.enemyOnFire = 0;
    this.enemyFrozen = false;

    this.bossShield = 0;
    this.bossEnraged = false;
    if (this.enemy.isBoss && this.enemy.shield) this.bossShield = this.enemy.shield;

    this.playerInit = rollDice(20) + mod(PLAYER.dex);
    this.enemyInit = rollDice(20) + mod(this.enemy.dex || 12);
    this.playerTurn = this.playerInit >= this.enemyInit;

    // Environmental options available at this tile
    this.envOptions = [];
    const map = GAME.currentMap;
    const px = this.encounterX, py = this.encounterY;
    if (map && py >= 0 && py < GAME.mapHeight && px >= 0 && px < GAME.mapWidth) {
      const tile = map[py][px];
      if (tile === 6) this.envOptions.push('ceiling_collapse');
      if (tile === 7) this.envOptions.push('push_into_pit');
    }
    if (map) {
      for (let dir = 0; dir < 4; dir++) {
        const ax = px + DX[dir], ay = py + DY[dir];
        if (ax>=0 && ax<GAME.mapWidth && ay>=0 && ay<GAME.mapHeight && map[ay][ax] === 3) {
          this.envOptions.push('portcullis');
          break;
        }
      }
    }
  }

  create() {
    this.cameras.main.setBackgroundColor('#0a0a14');
    this.gfx = this.add.graphics();
    this.handGfx = this.add.graphics();
    this.flashGfx = this.add.graphics();

    this.add.image(300, 200, 'tile_wall').setDisplaySize(600,400).setAlpha(0.35).setTint(0x444466);
    this.add.image(300, 380, 'tile_floor').setDisplaySize(600,100).setAlpha(0.3).setTint(0x554433);

    this.enemySprite = null;
    this.enemyHpText = null;
    this.shieldHpText = null;
    this.bossLabel = null;
    this.drawEnemy();

    if (this.narrativeMsg) {
      this.narrativeText = this.add.text(300, 85, this.narrativeMsg, {
        fontSize:'12px',fontFamily:'monospace',color:'#ffdd88',wordWrap:{width:500},align:'center'
      }).setOrigin(0.5).setDepth(20);
      this.tweens.add({ targets: this.narrativeText, alpha:0, delay:4000, duration:1500 });
    }

    this.logLines = [`A ${this.enemy.name} appears!`];
    if (this.isBoss && this.bossShield > 0) this.logLines.push('Its shield glows with ancient power!');
    this.logText = this.add.text(10,420,'',{fontSize:'12px',fontFamily:'monospace',color:'#999988',wordWrap:{width:580}});

    if (this.playerTurn) this.addLog(`Initiative: You ${this.playerInit} vs ${this.enemyInit}. You go first!`);
    else this.addLog(`Initiative: Enemy ${this.enemyInit} vs ${this.playerInit}. Enemy first!`);
    this.updateLog();

    // --- MODULE INTEGRATION: Audio combat layer ---
    if (window.DX_AUDIO) DX_AUDIO.setLayer('combat');

    // --- MODULE INTEGRATION: Combat modifiers ---
    if (window.DX_EVENTS) {
      GAME.combatModifiers = DX_EVENTS.getCombatModifiers(GAME.dungeonId, GAME.currentFloor || GAME.floor, GAME.dailySeed);
    }

    this.buildActionButtons();
    this.drawCombatHands();

    const classIcon = CLASS_WEAPON_ICONS[PLAYER.class] || 'icon_sword';
    this.add.image(22, 568, classIcon).setDisplaySize(18, 18);
    this.playerHpText = this.add.text(35,560,this.getPlayerStatusText(),{fontSize:'12px',fontFamily:'monospace',color:'#cc4444'});

    if (!this.playerTurn) this.enemyTurn();
  }

  getPlayerStatusText() {
    let txt = `HP: ${PLAYER.hp}/${PLAYER.maxHp} | MP: ${PLAYER.mana}/${PLAYER.maxMana} | AC: ${PLAYER.ac}`;
    if (PLAYER.weaponCoating && PLAYER.weaponCoating.hitsLeft > 0) {
      txt += ` | ${PLAYER.weaponCoating.type.toUpperCase()}(${PLAYER.weaponCoating.hitsLeft})`;
    }
    return txt;
  }

  buildActionButtons() {
    let actions = [
      {label:'Attack', x:620, y:420, cb:()=>this.doAttack()},
      {label:'Potion', x:710, y:420, cb:()=>this.doPotion()},
      {label:'Defend', x:710, y:455, cb:()=>this.doDefend()},
      {label:'Flee', x:710, y:490, cb:()=>this.doFlee()},
      {label:'THROW', x:620, y:525, cb:()=>this.openThrowMenu()}
    ];

    // --- MODULE INTEGRATION: Spell combo system ---
    if (window.DX_SPELLS && (PLAYER.class === 'Mage' || PLAYER.class === 'Cleric')) {
      actions.push({label:'SPELLS', x:620, y:455, cb:()=>this.openSpellComboMenu()});
    } else if (PLAYER.class === 'Mage') {
      actions.push({label:'Fireball', x:620, y:455, cb:()=>this.doCastSpell(0)});
      actions.push({label:'Frost Nova', x:620, y:490, cb:()=>this.doCastSpell(1)});
      actions.push({label:'Bolt', x:710, y:525, cb:()=>this.doCastSpell(2)});
    } else if (PLAYER.class === 'Cleric') {
      actions.push({label:'Heal', x:620, y:455, cb:()=>this.doCastSpell(3)});
      actions.push({label:'Smite', x:620, y:490, cb:()=>this.doCastSpell(4)});
    } else if (PLAYER.class === 'Fighter') {
      actions.push({label:'P. Strike', x:620, y:455, cb:()=>this.doSkill('Power Strike')});
    } else if (PLAYER.class === 'Ranger') {
      actions.push({label:'Twin Shot', x:620, y:455, cb:()=>this.doSkill('Twin Shot')});
    }

    // Environmental combat buttons
    if (this.envOptions.includes('portcullis')) {
      actions.push({label:'Portcullis', x:710, y:560, cb:()=>this.doEnvironmental('portcullis')});
    }
    if (this.envOptions.includes('ceiling_collapse') && PLAYER.class === 'Mage') {
      actions.push({label:'Collapse', x:620, y:560, cb:()=>this.doEnvironmental('ceiling_collapse')});
    }
    if (this.envOptions.includes('push_into_pit')) {
      actions.push({label:'Push/Pit', x:710, y:560, cb:()=>this.doEnvironmental('push_into_pit')});
    }

    this.buttons = [];
    actions.forEach(a => {
      const bg = this.add.graphics();
      const bw = 80, bh = 28;
      bg.fillStyle(0x222233); bg.fillRect(a.x,a.y,bw,bh);
      bg.lineStyle(1,0x555566); bg.strokeRect(a.x,a.y,bw,bh);
      const txt = this.add.text(a.x+40,a.y+14,a.label,{fontSize:'11px',fontFamily:'monospace',color:'#ccbbaa'}).setOrigin(0.5);
      const zone = this.add.zone(a.x+40,a.y+14,bw,bh).setInteractive();
      zone.on('pointerdown', () => { if(this.playerTurn && !this.combatOver) a.cb(); });
      zone.on('pointerover', () => { bg.clear(); bg.fillStyle(0x333344); bg.fillRect(a.x,a.y,bw,bh); bg.lineStyle(1,0xffaa44); bg.strokeRect(a.x,a.y,bw,bh); });
      zone.on('pointerout', () => { bg.clear(); bg.fillStyle(0x222233); bg.fillRect(a.x,a.y,bw,bh); bg.lineStyle(1,0x555566); bg.strokeRect(a.x,a.y,bw,bh); });
      this.buttons.push({bg,txt,zone});
    });
  }

  // --- MODULE INTEGRATION: Spell combo menu ---
  openSpellComboMenu() {
    if (!window.DX_SPELLS) return;
    const elements = ['fire','ice','lightning','holy','shadow','nature'];
    if (this.spellOverlay) { this.spellOverlay.forEach(e => e.destroy()); }
    this.spellOverlay = [];
    const bg = this.add.graphics().setDepth(600);
    bg.fillStyle(0x111122, 0.95); bg.fillRect(150, 120, 300, 220);
    bg.lineStyle(1, 0xff8800); bg.strokeRect(150, 120, 300, 220);
    this.spellOverlay.push(bg);
    const title = this.add.text(300, 135, 'COMBINE ELEMENTS', {fontSize:'14px',fontFamily:'monospace',color:'#ff8800'}).setOrigin(0.5).setDepth(601);
    this.spellOverlay.push(title);
    this.selectedElements = [];
    const elemColors = {fire:0xff6600,ice:0x44aaff,lightning:0xffff00,holy:0xffff66,shadow:0x6633aa,nature:0x44cc44};

    elements.forEach((elem, i) => {
      const col = i % 3, row = Math.floor(i / 3);
      const x = 185 + col * 90, y = 160 + row * 50;
      const ebg = this.add.graphics().setDepth(601);
      ebg.fillStyle(elemColors[elem], 0.3); ebg.fillRect(x, y, 80, 35);
      ebg.lineStyle(1, elemColors[elem]); ebg.strokeRect(x, y, 80, 35);
      const etxt = this.add.text(x+40, y+17, elem, {fontSize:'11px',fontFamily:'monospace',color:'#ccbbaa'}).setOrigin(0.5).setDepth(602);
      const ezone = this.add.zone(x+40, y+17, 80, 35).setInteractive().setDepth(603);
      ezone.on('pointerdown', () => {
        this.selectedElements.push(elem);
        etxt.setColor('#ffffff');
        if (this.selectedElements.length >= 2) {
          const e1 = this.selectedElements[0], e2 = this.selectedElements[1];
          this.spellOverlay.forEach(e => e.destroy());
          this.spellOverlay = [];
          const result = DX_SPELLS.castCombination(e1, e2, { int: PLAYER.int, wis: PLAYER.wis, level: PLAYER.level });
          if (result && result.damage) {
            this.applyDamageToEnemy(result.damage);
            this.addLog(`${result.name || 'Combo Spell'}: ${result.damage} dmg!`);
            if (result.effect) this.addLog(result.effect);
            this.screenFlash(result.color || 0xffffff, 0.3);
            this.drawEnemy();
          } else {
            this.addLog('The elements fizzle...');
          }
          if (window.DX_AUDIO) DX_AUDIO.playSFX('spell_cast');
          this.playerHpText.setText(this.getPlayerStatusText());
          this.checkEnemyDead() || this.enemyTurn();
        }
      });
      this.spellOverlay.push(ebg, etxt, ezone);
    });

    const closeTxt = this.add.text(300, 320, '[Cancel]', {fontSize:'11px',fontFamily:'monospace',color:'#666655'}).setOrigin(0.5).setDepth(601).setInteractive();
    closeTxt.on('pointerdown', () => { this.spellOverlay.forEach(e => e.destroy()); this.spellOverlay = []; });
    this.spellOverlay.push(closeTxt);
  }

  drawEnemy() {
    const g = this.gfx;
    g.clear();
    const spriteKey = ENEMY_SPRITES[this.enemyType] || 'enemy_skeleton';
    if (this.enemySprite) this.enemySprite.destroy();
    this.enemySprite = this.add.image(300, 200, spriteKey).setDisplaySize(180,180).setDepth(5);
    if (this.enemyTween) this.enemyTween.destroy();
    this.enemyTween = this.tweens.add({ targets: this.enemySprite, y:{from:195,to:210}, duration:1500, yoyo:true, repeat:-1, ease:'Sine.easeInOut' });
    g.fillStyle(0x000000, 0.3); g.fillEllipse(300, 310, 140, 30);

    if (this.bossLabel) this.bossLabel.destroy();
    if (this.isBoss) this.bossLabel = this.add.text(300,10,'BOSS',{fontSize:'16px',fontFamily:'monospace',color:'#ff4444',fontStyle:'bold'}).setOrigin(0.5).setDepth(10);

    if (this.enemyNameText) this.enemyNameText.destroy();
    const nameColor = this.isBoss ? '#ff6644' : '#'+this.enemy.color.toString(16).padStart(6,'0');
    this.enemyNameText = this.add.text(300,28,this.enemy.name,{fontSize:'20px',fontFamily:'monospace',color:nameColor,fontStyle:'bold'}).setOrigin(0.5).setDepth(10);

    if (this.bossEnraged) {
      if (this.enragedText) this.enragedText.destroy();
      this.enragedText = this.add.text(300,46,'ENRAGED',{fontSize:'11px',fontFamily:'monospace',color:'#ff2200',fontStyle:'bold'}).setOrigin(0.5).setDepth(10);
    }

    // Fire indicator
    if (this.enemyOnFire > 0) {
      g.fillStyle(0xff4400, 0.3); g.fillCircle(300, 280, 40);
      g.fillStyle(0xff8800, 0.5); g.fillCircle(300, 270, 20);
    }

    const barY = 55;
    if (this.isBoss && this.bossShield > 0) {
      const shieldMax = this.enemy.shield || 30;
      g.fillStyle(0x113344); g.fillRect(150,barY-22,300,14);
      g.fillStyle(0x4488cc); g.fillRect(150,barY-22,300*(this.bossShield/shieldMax),14);
      g.lineStyle(1,0x336688); g.strokeRect(150,barY-22,300,14);
      if (this.shieldHpText) this.shieldHpText.destroy();
      this.shieldHpText = this.add.text(300,barY-19,`Shield: ${this.bossShield}/${shieldMax}`,{fontSize:'10px',fontFamily:'monospace',color:'#88ccff'}).setOrigin(0.5).setDepth(10);
    } else {
      if (this.shieldHpText) { this.shieldHpText.destroy(); this.shieldHpText = null; }
    }

    g.fillStyle(0x441111); g.fillRect(150,barY,300,18);
    const hpRatio = this.enemy.hp / this.enemy.maxHp;
    const hpColor = hpRatio > 0.5 ? 0xcc2222 : (hpRatio > 0.25 ? 0xdd6600 : 0xff0000);
    g.fillStyle(hpColor); g.fillRect(150,barY,300*hpRatio,18);
    g.lineStyle(1,0x663333); g.strokeRect(150,barY,300,18);

    if(!this.enemyHpText) {
      this.enemyHpText = this.add.text(300,barY+3,`${this.enemy.hp}/${this.enemy.maxHp}`,{fontSize:'11px',fontFamily:'monospace',color:'#ffcccc'}).setOrigin(0.5).setDepth(10);
    } else {
      this.enemyHpText.setText(`${this.enemy.hp}/${this.enemy.maxHp}`);
    }
  }

  applyDamageToEnemy(dmg) {
    if (this.isBoss && this.bossShield > 0) {
      const shieldDmg = Math.min(dmg, this.bossShield);
      this.bossShield -= shieldDmg;
      const remainingDmg = dmg - shieldDmg;
      if (this.bossShield <= 0) {
        this.bossShield = 0;
        this.addLog('SHIELD DESTROYED! The Warden enters Enraged mode!');
        this.bossEnraged = true;
        this.enemy.attackMod += 2;
        this.screenFlash(0x4488cc, 0.4);
      }
      if (remainingDmg > 0) this.enemy.hp = Math.max(0, this.enemy.hp - remainingDmg);
      return dmg;
    } else {
      this.enemy.hp = Math.max(0, this.enemy.hp - dmg);
      return dmg;
    }
  }

  drawCombatHands(glowColor) {
    const h = this.handGfx;
    h.clear(); h.setDepth(50);
    h.fillStyle(0xddbb99); h.fillRect(40,350,60,80);
    h.fillStyle(0xccaa88); h.fillRect(45,345,50,15);
    h.fillStyle(0xddbb99); h.fillRect(500,350,60,80);
    h.fillStyle(0xccaa88); h.fillRect(505,345,50,15);
    if(PLAYER.equipped.weapon >= 0) {
      h.fillStyle(0xaaaacc); h.fillRect(523,260,8,100);
      h.fillStyle(0x886633); h.fillRect(513,355,30,6);
      if (PLAYER.weaponCoating && PLAYER.weaponCoating.hitsLeft > 0) {
        const cc = PLAYER.weaponCoating.type === 'fire' ? 0xff6600 : 0x44cc44;
        h.fillStyle(cc, 0.5); h.fillRect(523,260,8,100);
      }
    }
    if(glowColor !== undefined) {
      h.fillStyle(glowColor, 0.4); h.fillCircle(70,380,50); h.fillCircle(530,380,50);
    }
  }

  addLog(msg) { this.logLines.push(msg); if(this.logLines.length > 6) this.logLines.shift(); this.updateLog(); }
  updateLog() { this.logText.setText(this.logLines.join('\n')); }

  doAttack(bonusDmg, multi) {
    bonusDmg = bonusDmg || 0;
    multi = multi || 1;
    let hits = 0;
    for(let i=0; i<multi; i++) {
      const roll = rollDice(20);
      const total = roll + PLAYER.attackMod;
      const hit = roll === 20 || (roll !== 1 && total >= this.enemy.ac);
      const crit = roll === 20;
      const fumble = roll === 1;
      if(fumble) {
        this.addLog(`Rolled 1 -- FUMBLE!`);
        this.screenFlash(0xff0000, 0.2);
        if (window.DX_AUDIO) DX_AUDIO.playSFX('sword_miss');
      } else if(hit) {
        hits++;
        let dmg = rollDice(PLAYER.damageDice) + PLAYER.damageBonus + bonusDmg;
        if(crit) { dmg += rollDice(PLAYER.damageDice); this.addLog(`NAT 20! CRITICAL HIT!`); this.screenFlash(0xffff00, 0.4); }
        // Weapon coating bonus
        if (PLAYER.weaponCoating && PLAYER.weaponCoating.hitsLeft > 0) {
          const coatDmg = rollDice(4);
          dmg += coatDmg;
          this.addLog(`${PLAYER.weaponCoating.type} coating: +${coatDmg}!`);
          PLAYER.weaponCoating.hitsLeft--;
          if (PLAYER.weaponCoating.hitsLeft <= 0) {
            this.addLog('Coating worn off.');
            PLAYER.weaponCoating = null;
          }
        }
        this.applyDamageToEnemy(dmg);
        this.addLog(`Rolled ${roll}+${PLAYER.attackMod}=${total} vs AC ${this.enemy.ac} -- HIT! ${dmg} dmg!`);
        if (window.DX_AUDIO) DX_AUDIO.playSFX('sword_hit');

        // --- MODULE INTEGRATION: Combat narrator ---
        if (window.DX_NARRATIVE) {
          const line = DX_NARRATIVE.getLine('combat', 'hit', { damage: dmg, enemy: this.enemy.name, weapon: PLAYER.weapon });
          if (line) this.addLog(line);
        }

        this.drawEnemy();
        if (this.enemySprite) this.tweens.add({ targets: this.enemySprite, x:{from:290,to:310}, duration:50, yoyo:true, repeat:2 });
      } else {
        this.addLog(`Rolled ${roll}+${PLAYER.attackMod}=${total} vs AC ${this.enemy.ac} -- MISS!`);
        if (window.DX_AUDIO) DX_AUDIO.playSFX('sword_miss');
      }
    }
    if (hits > 0) this.time.delayedCall(100, ()=>this.screenFlash(0xffffffff, 0.1));
    this.playerHpText.setText(this.getPlayerStatusText());
    this.drawCombatHands();
    this.checkEnemyDead() || this.enemyTurn();
  }

  doSkill(skillName) {
    if (skillName === 'Power Strike') { this.addLog('Power Strike!'); this.doAttack(rollDice(PLAYER.damageDice), 1); }
    else if (skillName === 'Twin Shot') { this.addLog('Twin Shot!'); this.doAttack(0, 2); }
  }

  doCastSpell(idx) {
    const extSpells = [
      { name:'Fireball', dice:6, rolls:3, element:'fire', color:0xff6600, manaCost:5 },
      { name:'Frost Nova', dice:6, rolls:1, element:'ice', color:0x44aaff, manaCost:4 },
      { name:'Lightning Bolt', dice:6, rolls:4, element:'lightning', color:0xffff00, manaCost:6 },
      { name:'Heal', dice:8, rolls:2, element:'holy', color:0x00ff00, manaCost:5, isHeal:true },
      { name:'Smite', dice:6, rolls:2, element:'holy', color:0xffff66, manaCost:4 }
    ];
    const spell = extSpells[idx];
    if(PLAYER.mana < spell.manaCost) { this.addLog('Not enough mana.'); return; }
    PLAYER.mana -= spell.manaCost;
    if (spell.isHeal) {
      let heal = mod(PLAYER.wis);
      for(let i=0;i<spell.rolls;i++) heal += rollDice(spell.dice);
      PLAYER.hp = Math.min(PLAYER.maxHp, PLAYER.hp + heal);
      this.addLog(`${spell.name}: healed ${heal} HP.`);
      AudioSys.healSound();
      if (window.DX_AUDIO) DX_AUDIO.playSFX('spell_cast');
      this.playerHpText.setText(this.getPlayerStatusText());
      this.enemyTurn(); return;
    }
    let dmg = mod(PLAYER.int || PLAYER.wis);
    for(let i=0;i<spell.rolls;i++) dmg += rollDice(spell.dice);
    if(spell.element === this.enemy.weakness) { dmg = Math.floor(dmg*2); this.addLog(`WEAK to ${spell.element}! Double damage!`); }
    if(spell.element === this.enemy.resist) { dmg = Math.floor(dmg/2); this.addLog(`RESISTS ${spell.element}!`); }
    this.applyDamageToEnemy(dmg);
    this.addLog(`${spell.name}: ${dmg} dmg!`);
    if (window.DX_AUDIO) DX_AUDIO.playSFX('spell_cast');

    // --- MODULE INTEGRATION: Combat narrator for spells ---
    if (window.DX_NARRATIVE) {
      const line = DX_NARRATIVE.getLine('combat', 'spell', { damage: dmg, enemy: this.enemy.name, weapon: spell.name });
      if (line) this.addLog(line);
    }

    this.drawCombatHands(spell.color);
    this.screenFlash(spell.color, 0.3);
    this.drawEnemy();
    this.playerHpText.setText(this.getPlayerStatusText());
    if (this.enemySprite) this.tweens.add({ targets: this.enemySprite, alpha:{from:0.3,to:1}, duration:200, repeat:2 });
    this.time.delayedCall(500, ()=>this.drawCombatHands());
    this.checkEnemyDead() || this.enemyTurn();
  }

  doPotion() {
    if(PLAYER.potions <= 0) { this.addLog('No potions left.'); return; }
    PLAYER.potions--;
    const idx = PLAYER.inventory.findIndex(it => it.type === 'potion' && it.subtype === 'health');
    if (idx >= 0) {
      PLAYER.inventory.splice(idx, 1);
      for (const slot of Object.keys(PLAYER.equipped)) {
        if (PLAYER.equipped[slot] > idx) PLAYER.equipped[slot]--;
        else if (PLAYER.equipped[slot] === idx) PLAYER.equipped[slot] = -1;
      }
    }
    const heal = rollDice(8) + 2;
    PLAYER.hp = Math.min(PLAYER.maxHp, PLAYER.hp + heal);
    this.addLog(`Potion: healed ${heal} HP.`);
    AudioSys.healSound();
    this.playerHpText.setText(this.getPlayerStatusText());
    this.enemyTurn();
  }

  doDefend() {
    this.defending = true;
    this.addLog('Defending. AC +2 this round.');
    this.enemyTurn();
  }

  doFlee() {
    if (this.isBoss) { this.addLog('No fleeing from the Vault Warden!'); return; }
    const roll = rollDice(20) + mod(PLAYER.dex);
    const dc = 10 + mod(this.enemy.dex || 12);
    if(roll >= dc) {
      this.addLog('You flee!');
      this.combatOver = true;
      this.time.delayedCall(1000, ()=>this.scene.start('Dungeon'));
    } else {
      this.addLog(`Failed to flee! (${roll} vs DC ${dc})`);
      this.enemyTurn();
    }
  }

  openThrowMenu() {
    const throwables = PLAYER.inventory.filter(it => it.type === 'throwable');
    if (throwables.length === 0) { this.addLog('No throwable items.'); return; }
    if (this.throwOverlay) { this.throwOverlay.forEach(e => e.destroy()); }
    this.throwOverlay = [];
    const bg = this.add.graphics().setDepth(600);
    bg.fillStyle(0x111122, 0.9); bg.fillRect(200, 150, 200, Math.min(throwables.length * 35 + 40, 250));
    bg.lineStyle(1, 0xff8800); bg.strokeRect(200, 150, 200, Math.min(throwables.length * 35 + 40, 250));
    this.throwOverlay.push(bg);
    const title = this.add.text(300, 160, 'THROW ITEM', {fontSize:'14px',fontFamily:'monospace',color:'#ff8800'}).setOrigin(0.5).setDepth(601);
    this.throwOverlay.push(title);

    throwables.forEach((item, i) => {
      if (i >= 5) return;
      const y = 185 + i * 35;
      const ic = this.add.image(220, y + 12, item.icon || 'icon_arrow').setDisplaySize(20, 20).setDepth(601);
      const txt = this.add.text(240, y + 5, item.name, {fontSize:'11px',fontFamily:'monospace',color:'#ccbbaa'}).setDepth(601);
      const zone = this.add.zone(300, y + 12, 200, 30).setInteractive().setDepth(602);
      zone.on('pointerdown', () => {
        this.throwOverlay.forEach(e => e.destroy());
        this.throwOverlay = [];
        this.doThrow(item);
      });
      zone.on('pointerover', () => txt.setColor('#ffdd88'));
      zone.on('pointerout', () => txt.setColor('#ccbbaa'));
      this.throwOverlay.push(ic, txt, zone);
    });
    const closeTxt = this.add.text(300, 155 + Math.min(throwables.length, 5) * 35 + 15, '[Cancel]', {fontSize:'11px',fontFamily:'monospace',color:'#666655'}).setOrigin(0.5).setDepth(601).setInteractive();
    closeTxt.on('pointerdown', () => { this.throwOverlay.forEach(e => e.destroy()); this.throwOverlay = []; });
    this.throwOverlay.push(closeTxt);
  }

  doThrow(item) {
    AudioSys.throwSound();
    const itemIdx = PLAYER.inventory.findIndex(it => it.id === item.id);
    if (itemIdx < 0) return;

    PLAYER.inventory.splice(itemIdx, 1);
    for (const slot of Object.keys(PLAYER.equipped)) {
      if (PLAYER.equipped[slot] > itemIdx) PLAYER.equipped[slot]--;
      else if (PLAYER.equipped[slot] === itemIdx) PLAYER.equipped[slot] = -1;
    }

    if (item.subtype === 'oil') {
      let dmg = rollDice(item.throwDice || 4);
      const dexSave = rollDice(20) + mod(this.enemy.dex || 10);
      if (dexSave >= 13) { dmg = Math.floor(dmg / 2); this.addLog(`Oil Flask! Enemy dodges partly. ${dmg} fire dmg.`); }
      else { this.addLog(`Oil Flask! ${dmg} fire dmg. Enemy catches fire!`); this.enemyOnFire = 3; }
      this.applyDamageToEnemy(dmg);
      this.screenFlash(0xff6600, 0.3);
      this.drawEnemy();
      this.checkEnemyDead() || this.enemyTurn();
      return;
    }

    if (item.subtype === 'holy_water') {
      const isUndead = ['bone_revenant','shadow_lurker','frost_wraith','vault_warden','crypt_crawler'].includes(this.enemyType);
      let dmg = 0;
      if (isUndead && item.holyRolls) { for(let i=0;i<item.holyRolls;i++) dmg += rollDice(item.holyDice || 6); }
      else { dmg = rollDice(4); }
      this.applyDamageToEnemy(dmg);
      this.addLog(`Holy Water: ${dmg} dmg!${isUndead?' (Undead!)':''}`);
      this.screenFlash(0xffff66, 0.3);
      this.drawEnemy();
      this.checkEnemyDead() || this.enemyTurn();
      return;
    }

    const statMod = item.throwStat === 'str' ? mod(PLAYER.str) : mod(PLAYER.dex);
    const roll = rollDice(20);
    const total = roll + statMod + PLAYER.proficiency;
    if (roll === 1) {
      this.addLog(`Throw ${item.name}: NAT 1! Miss!`);
    } else if (roll === 20 || total >= this.enemy.ac) {
      let dmg = rollDice(item.throwDice || 4);
      if (roll === 20) { dmg += rollDice(item.throwDice || 4); this.addLog('CRITICAL THROW!'); }
      this.applyDamageToEnemy(dmg);
      this.addLog(`Throw ${item.name}: ${roll}+${statMod+PLAYER.proficiency}=${total} vs AC ${this.enemy.ac} -- HIT! ${dmg} dmg!`);
      this.screenFlash(0xffffff, 0.15);
      if (this.enemySprite) this.tweens.add({ targets: this.enemySprite, x:{from:290,to:310}, duration:50, yoyo:true, repeat:2 });
    } else {
      this.addLog(`Throw ${item.name}: ${roll}+${statMod+PLAYER.proficiency}=${total} vs AC ${this.enemy.ac} -- MISS!`);
    }

    this.thrownItems.push({...item});
    this.drawEnemy();
    this.checkEnemyDead() || this.enemyTurn();
  }

  doEnvironmental(type) {
    if (type === 'portcullis') {
      const roll = rollDice(20) + mod(PLAYER.str);
      if (roll >= 14) {
        const dmg = rollDice(10);
        this.applyDamageToEnemy(dmg);
        this.addLog(`Portcullis drops! STR ${roll} vs DC 14 -- ${dmg} dmg!`);
        this.screenFlash(0xaaaaaa, 0.3);
        this.envOptions = this.envOptions.filter(e => e !== 'portcullis');
      } else {
        this.addLog(`Portcullis won't budge! STR ${roll} vs DC 14 -- FAIL!`);
      }
      this.drawEnemy();
      this.checkEnemyDead() || this.enemyTurn();
    } else if (type === 'ceiling_collapse') {
      if (PLAYER.mana < 4) { this.addLog('Not enough mana for Stone spell.'); return; }
      PLAYER.mana -= 4;
      const dmg = rollDice(8) + rollDice(8);
      this.applyDamageToEnemy(dmg);
      const selfDmg = rollDice(8) + rollDice(8);
      PLAYER.hp = Math.max(0, PLAYER.hp - selfDmg);
      this.addLog(`Ceiling collapses! ${dmg} to enemy, ${selfDmg} to you!`);
      this.screenFlash(0x886644, 0.5);
      if (GAME.currentMap) GAME.currentMap[this.encounterY][this.encounterX] = 0;
      this.envOptions = this.envOptions.filter(e => e !== 'ceiling_collapse');
      this.playerHpText.setText(this.getPlayerStatusText());
      this.drawEnemy();
      if (PLAYER.hp <= 0) {
        this.handlePlayerDeath();
        return;
      }
      this.checkEnemyDead() || this.enemyTurn();
    } else if (type === 'push_into_pit') {
      const playerRoll = rollDice(20) + mod(PLAYER.str);
      const enemyRoll = rollDice(20) + mod(this.enemy.str || 10);
      if (playerRoll >= enemyRoll) {
        const isSmall = this.enemy.maxHp <= 30;
        if (isSmall) {
          this.enemy.hp = 0;
          this.addLog(`Push into pit! STR ${playerRoll} vs ${enemyRoll} -- INSTANT KILL!`);
        } else {
          const dmg = rollDice(6) + rollDice(6) + rollDice(6);
          this.applyDamageToEnemy(dmg);
          this.addLog(`Push into pit! STR ${playerRoll} vs ${enemyRoll} -- ${dmg} dmg!`);
        }
        this.screenFlash(0x442200, 0.3);
        this.envOptions = this.envOptions.filter(e => e !== 'push_into_pit');
      } else {
        this.addLog(`Push failed! STR ${playerRoll} vs ${enemyRoll}. Pushed back!`);
      }
      this.drawEnemy();
      this.checkEnemyDead() || this.enemyTurn();
    }
  }

  enemyTurn() {
    if(this.combatOver) return;
    this.playerTurn = false;
    this.time.delayedCall(600, () => {
      // Burn damage
      if (this.enemyOnFire > 0) {
        const burnDmg = rollDice(2);
        this.applyDamageToEnemy(burnDmg);
        this.addLog(`${this.enemy.name} burns: ${burnDmg} fire dmg!`);
        this.enemyOnFire--;
        if (this.checkEnemyDead()) return;
      }

      const roll = rollDice(20);
      const total = roll + this.enemy.attackMod;
      const targetAC = PLAYER.ac + (this.defending ? 2 : 0);
      this.defending = false;

      if(roll === 1) { this.addLog(`${this.enemy.name} fumbles!`); }
      else if(roll === 20 || total >= targetAC) {
        let dmg = rollDice(this.enemy.damageDice) + this.enemy.damageBonus;
        if(roll === 20) { dmg += rollDice(this.enemy.damageDice); this.addLog(`${this.enemy.name} CRITS!`); }
        PLAYER.hp = Math.max(0, PLAYER.hp - dmg);
        this.addLog(`${this.enemy.name}: ${total} vs AC ${targetAC} -- ${dmg} dmg!`);
        this.screenFlash(0xff0000, 0.2);
        this.playerHpText.setText(this.getPlayerStatusText());

        // --- MODULE INTEGRATION: Combat narrator for enemy hit ---
        if (window.DX_NARRATIVE) {
          const line = DX_NARRATIVE.getLine('combat', 'enemy_hit', { damage: dmg, enemy: this.enemy.name });
          if (line) this.addLog(line);
        }
      } else {
        this.addLog(`${this.enemy.name}: ${total} vs AC ${targetAC} -- MISS!`);
      }

      this.drawEnemy();

      if(PLAYER.hp <= 0) {
        this.handlePlayerDeath();
      } else {
        this.playerTurn = true;
      }
    });
  }

  handlePlayerDeath() {
    this.addLog('You have fallen...');
    this.combatOver = true;
    this.screenFlash(0xff0000, 0.5);

    // --- MODULE INTEGRATION: Record death ---
    if (window.DX_SAVE) DX_SAVE.recordDeath(PLAYER.name, PLAYER.classId, GAME.floor, GAME.dungeonId);
    if (window.DX_AUDIO) DX_AUDIO.setLayer('silence');

    this.time.delayedCall(2000, () => {
      PLAYER.hp = PLAYER.maxHp; PLAYER.mana = PLAYER.maxMana;
      PLAYER.food = 100; PLAYER.water = 100;
      this.scene.start('Boot');
    });
  }

  checkEnemyDead() {
    if(this.enemy.hp <= 0) {
      this.addLog(`${this.enemy.name} defeated! +${this.enemy.xp} XP`);
      PLAYER.xp += this.enemy.xp;
      if (this.encounterX !== undefined) markEncounterDefeated(this.encounterX, this.encounterY);

      // --- MODULE INTEGRATION: Record kill ---
      if (window.DX_SAVE) DX_SAVE.recordKill(this.enemyType);
      if (window.DX_AUDIO) DX_AUDIO.playSFX('enemy_death');

      if (this.enemySprite) {
        if (this.enemyTween) this.enemyTween.destroy();
        this.tweens.add({ targets: this.enemySprite, alpha:0, scaleX:0, scaleY:0, duration:800, ease:'Power2' });
      }

      // Loot
      const lootItems = rollLoot(this.enemyType);
      lootItems.forEach(item => { applyLoot(item); this.addLog(`Found: ${item.name}!`); });

      // Recover thrown items (50% each)
      this.thrownItems.forEach(item => {
        if (Math.random() < 0.5) {
          applyLoot(item);
          this.addLog(`Recovered: ${item.name}!`);
        }
      });

      if (this.enemyType === 'vault_warden') {
        GAME.vaultWardenDefeated = true;
        this.time.delayedCall(1500, () => this.addLog(NARRATIVE.afterVaultWarden));
        this.time.delayedCall(4000, () => { PLAYER.fragmentOfDawn = true; this.addLog(NARRATIVE.getFragment); });
      }

      const leveledUp = checkLevelUp();
      if (leveledUp) {
        this.addLog(`LEVEL UP! Now level ${PLAYER.level}!`);
        this.addLog(`HP:${PLAYER.maxHp} AC:${PLAYER.ac} ATK:+${PLAYER.attackMod}`);
      }

      this.combatOver = true;
      const returnDelay = this.enemyType === 'vault_warden' ? 7000 : 2000;
      this.time.delayedCall(returnDelay, () => {
        if (leveledUp) this.scene.start('Dungeon', { narrative: 'LEVEL UP! Level ' + PLAYER.level + '!' });
        else this.scene.start('Dungeon');
      });
      return true;
    }
    return false;
  }

  screenFlash(color, alpha) {
    this.flashGfx.clear(); this.flashGfx.setDepth(999);
    this.flashGfx.fillStyle(color, alpha); this.flashGfx.fillRect(0,0,800,600);
    this.time.delayedCall(150, ()=>this.flashGfx.clear());
  }
}

// ============================================================
// INVENTORY SCENE -- Full Drag-and-Drop with Keyhole/Sconce Drops
// ============================================================
class InventoryScene extends Phaser.Scene {
  constructor() { super('Inventory'); }

  create() {
    this.add.graphics().fillStyle(0x000000,0.7).fillRect(0,0,800,600);

    const ox=150, oy=80, cs=50;
    this.g = this.add.graphics();
    this.dragSprite = null;
    this.dragItem = null;
    this.dragOrigIdx = -1;
    this.floatingTexts = [];
    this.dropZoneGfx = this.add.graphics().setDepth(300);
    this.glowTimer = null;

    this.add.text(400,40,'INVENTORY',{fontSize:'22px',fontFamily:'monospace',color:'#ff8800',fontStyle:'bold'}).setOrigin(0.5);

    // Backpack grid 4x6
    this.backpackSlots = [];
    for(let row=0;row<6;row++) for(let col=0;col<4;col++) {
      this.g.fillStyle(0x1a1a2a); this.g.fillRect(ox+col*cs, oy+row*cs, cs-2, cs-2);
      this.g.lineStyle(1,0x333344); this.g.strokeRect(ox+col*cs, oy+row*cs, cs-2, cs-2);
      this.backpackSlots.push({x:ox+col*cs, y:oy+row*cs, w:cs-2, h:cs-2, idx: row*4+col});
    }

    // Equipment slots
    this.equipSlots = [
      {name:'Head',   x:520, y:80,  iconKey:'icon_helmet', slotKey:'head'},
      {name:'Body',   x:520, y:140, iconKey:'icon_shield',  slotKey:'armor'},
      {name:'Weapon', x:460, y:200, iconKey:'icon_sword',   slotKey:'weapon'},
      {name:'Shield', x:580, y:200, iconKey:'icon_shield2', slotKey:'shield'},
      {name:'Ring',   x:520, y:260, iconKey:'icon_gem',     slotKey:'ring'}
    ];

    this.equipSlots.forEach(s => {
      this.g.fillStyle(0x2a1a1a); this.g.fillRect(s.x, s.y, cs-2, cs-2);
      this.g.lineStyle(1,0x554433); this.g.strokeRect(s.x, s.y, cs-2, cs-2);
      this.add.text(s.x+cs/2-1, s.y-12, s.name, {fontSize:'10px',fontFamily:'monospace',color:'#887766'}).setOrigin(0.5);
      this.add.image(s.x+cs/2-1, s.y+cs/2-1, s.iconKey).setDisplaySize(24,24).setAlpha(0.15);
    });

    // Character portrait (drop zone for potions/food/water)
    const portraitKey = CLASS_TEMPLATES[PLAYER.class] ? CLASS_TEMPLATES[PLAYER.class].portrait : 'portrait_fighter';
    this.portraitImg = this.add.image(460, 340, portraitKey).setDisplaySize(60,60).setAlpha(0.9).setDepth(10);
    this.portraitZone = {x:430, y:310, w:60, h:60};

    // Keyhole drop zone (if facing locked door)
    this.keyholeZone = null;
    this.keyholeGfx = null;
    const map = GAME.currentMap;
    if (map) {
      const fx = PLAYER.x + DX[PLAYER.dir];
      const fy = PLAYER.y + DY[PLAYER.dir];
      if (fx>=0 && fx<GAME.mapWidth && fy>=0 && fy<GAME.mapHeight && map[fy][fx] === 3) {
        this.keyholeZone = {x:130, y:400, w:60, h:60, tileX:fx, tileY:fy};
        this.keyholeGfx = this.add.graphics().setDepth(10);
        this.keyholeGfx.fillStyle(0x222211); this.keyholeGfx.fillRect(130, 400, 60, 60);
        this.keyholeGfx.lineStyle(2, 0x888866); this.keyholeGfx.strokeRect(130, 400, 60, 60);
        this.keyholeGfx.fillStyle(0x111111); this.keyholeGfx.fillCircle(160, 420, 10);
        this.keyholeGfx.fillRect(156, 420, 8, 18);
        this.keyholeGfx.lineStyle(1, 0x666644); this.keyholeGfx.strokeCircle(160, 420, 10);
        this.add.text(160, 448, 'KEYHOLE', {fontSize:'9px',fontFamily:'monospace',color:'#888866'}).setOrigin(0.5).setDepth(11);
      }
    }

    // Sconce drop zone (if facing empty sconce)
    this.sconceZone = null;
    this.sconceGfx = null;
    if (map) {
      const fx = PLAYER.x + DX[PLAYER.dir];
      const fy = PLAYER.y + DY[PLAYER.dir];
      if (fx>=0 && fx<GAME.mapWidth && fy>=0 && fy<GAME.mapHeight && map[fy][fx] === 9) {
        const sconceKey = GAME.dungeonId+'-'+GAME.floor+'-'+fx+'-'+fy;
        if (!GAME.litSconces[sconceKey]) {
          this.sconceZone = {x:60, y:400, w:60, h:60, tileX:fx, tileY:fy, sconceKey:sconceKey};
          this.sconceGfx = this.add.graphics().setDepth(10);
          this.sconceGfx.fillStyle(0x1a1a11); this.sconceGfx.fillRect(60, 400, 60, 60);
          this.sconceGfx.lineStyle(2, 0x555544); this.sconceGfx.strokeRect(60, 400, 60, 60);
          this.sconceGfx.fillStyle(0x555555); this.sconceGfx.fillRect(80, 415, 20, 5);
          this.sconceGfx.fillStyle(0x555555); this.sconceGfx.fillRect(83, 405, 14, 14);
          this.add.text(90, 448, 'SCONCE', {fontSize:'9px',fontFamily:'monospace',color:'#888866'}).setOrigin(0.5).setDepth(11);
        }
      }
    }

    // Draw items in backpack
    this.itemSprites = [];
    this.renderItems();

    // Stats
    this.add.text(495,320,`STR:${PLAYER.str} DEX:${PLAYER.dex} CON:${PLAYER.con}`,{fontSize:'11px',fontFamily:'monospace',color:'#aa9988'});
    this.add.text(495,338,`INT:${PLAYER.int} WIS:${PLAYER.wis} CHA:${PLAYER.cha}`,{fontSize:'11px',fontFamily:'monospace',color:'#aa9988'});
    this.add.text(460,360,`AC:${PLAYER.ac} ATK:+${PLAYER.attackMod} DMG:d${PLAYER.damageDice}+${PLAYER.damageBonus}`,{fontSize:'11px',fontFamily:'monospace',color:'#ccbbaa'});
    this.add.text(460,378,`HP:${PLAYER.hp}/${PLAYER.maxHp} MP:${PLAYER.mana}/${PLAYER.maxMana}`,{fontSize:'11px',fontFamily:'monospace',color:'#cc4444'});
    this.add.text(460,394,`Food:${Math.floor(PLAYER.food)} Water:${Math.floor(PLAYER.water)}`,{fontSize:'11px',fontFamily:'monospace',color:'#dd8822'});

    this.add.image(465,416,'icon_potion').setDisplaySize(16,16);
    this.add.text(478,410,`Potions: ${PLAYER.potions}`,{fontSize:'11px',fontFamily:'monospace',color:'#cc4444'});
    this.add.image(465,432,'icon_key').setDisplaySize(16,16);
    this.add.text(478,426,`Keys: ${PLAYER.keys}`,{fontSize:'11px',fontFamily:'monospace',color:'#ddaa44'});
    this.add.image(465,448,'icon_gem').setDisplaySize(16,16);
    this.add.text(478,442,`Gold: ${PLAYER.gold}`,{fontSize:'11px',fontFamily:'monospace',color:'#ddaa44'});
    this.add.text(460,462,`Floor: ${GAME.floor} | ${DUNGEON_NAMES[GAME.dungeonId]||'Unknown'}`,{fontSize:'10px',fontFamily:'monospace',color:'#666655'});
    if(PLAYER.fragmentOfDawn) this.add.text(460,478,'Fragment of Dawn [acquired]',{fontSize:'10px',fontFamily:'monospace',color:'#ffdd44',fontStyle:'bold'});
    if(PLAYER.weaponCoating && PLAYER.weaponCoating.hitsLeft>0) {
      const cn = PLAYER.weaponCoating.type==='fire'?'FIRE':'POISON';
      this.add.text(460,494,`Coating: ${cn} (${PLAYER.weaponCoating.hitsLeft} hits)`,{fontSize:'10px',fontFamily:'monospace',color:PLAYER.weaponCoating.type==='fire'?'#ff6600':'#44cc44'});
    }

    this.add.text(400,560,'Press I or ESC to close | Drag items to interact',{fontSize:'13px',fontFamily:'monospace',color:'#666655'}).setOrigin(0.5);

    this.input.keyboard.on('keydown-I', () => { this.closeInventory(); });
    this.input.keyboard.on('keydown-ESC', () => { this.closeInventory(); });

    // Unified pointer system for drag-and-drop
    this.input.on('pointerdown', (ptr) => this.onPointerDown(ptr));
    this.input.on('pointermove', (ptr) => this.onPointerMove(ptr));
    this.input.on('pointerup', (ptr) => this.onPointerUp(ptr));

    this.longPressTimer = null;
    this.tooltipText = null;

    // Glow pulse for valid drop zones
    this.glowPhase = 0;
    this.glowTimer = this.time.addEvent({
      delay: 50, loop: true, callback: () => {
        this.glowPhase += 0.1;
        this.updateDropZoneGlow();
      }
    });
  }

  renderItems() {
    const ox=150, oy=80, cs=50;
    this.itemSprites.forEach(s => s.destroy());
    this.itemSprites = [];

    PLAYER.inventory.forEach((item, i) => {
      if(i >= 24) return;
      const col = i%4, row = Math.floor(i/4);
      const ix = ox+col*cs + cs/2-1;
      const iy = oy+row*cs + cs/2-1;

      const bg = this.add.graphics();
      bg.fillStyle(item.color, 0.3);
      bg.fillRect(ox+col*cs+2, oy+row*cs+2, cs-6, cs-6);
      this.itemSprites.push(bg);

      const iconKey = item.icon || ITEM_ICONS[item.type] || 'icon_gem';
      const icon = this.add.image(ix, iy, iconKey).setDisplaySize(36,36);
      this.itemSprites.push(icon);
    });

    // Draw equipped items
    const eqSlotKeys = ['head','armor','weapon','shield','ring'];
    const cs2 = 50;
    eqSlotKeys.forEach((key, i) => {
      const idx = PLAYER.equipped[key];
      if(idx >= 0 && idx < PLAYER.inventory.length) {
        const item = PLAYER.inventory[idx];
        const s = this.equipSlots[i];
        const eqBg = this.add.graphics();
        eqBg.fillStyle(0xff8800, 0.2); eqBg.fillRect(s.x+2, s.y+2, cs2-6, cs2-6);
        eqBg.lineStyle(1, 0xff8800); eqBg.strokeRect(s.x, s.y, cs2-2, cs2-2);
        this.itemSprites.push(eqBg);
        const iconKey = item.icon || ITEM_ICONS[item.type] || 'icon_gem';
        const eqIcon = this.add.image(s.x+cs2/2-1, s.y+cs2/2-1, iconKey).setDisplaySize(36,36);
        this.itemSprites.push(eqIcon);
      }
    });
  }

  closeInventory() {
    if (this.glowTimer) this.glowTimer.destroy();
    this.scene.resume('Dungeon');
    this.scene.stop();
  }

  getItemAtPointer(px, py) {
    const ox=150, oy=80, cs=50;
    for(let i=0; i<Math.min(PLAYER.inventory.length, 24); i++) {
      const col = i%4, row = Math.floor(i/4);
      const sx = ox+col*cs, sy = oy+row*cs;
      if (px >= sx && px < sx+cs && py >= sy && py < sy+cs) return i;
    }
    return -1;
  }

  getEquipSlotAtPointer(px, py) {
    const cs = 50;
    for(let i=0; i<this.equipSlots.length; i++) {
      const s = this.equipSlots[i];
      if (px >= s.x && px < s.x+cs && py >= s.y && py < s.y+cs) return i;
    }
    return -1;
  }

  isOverPortrait(px, py) {
    const z = this.portraitZone;
    return px >= z.x && px < z.x+z.w && py >= z.y && py < z.y+z.h;
  }

  isOverKeyhole(px, py) {
    if (!this.keyholeZone) return false;
    const z = this.keyholeZone;
    return px >= z.x && px < z.x+z.w && py >= z.y && py < z.y+z.h;
  }

  isOverSconce(px, py) {
    if (!this.sconceZone) return false;
    const z = this.sconceZone;
    return px >= z.x && px < z.x+z.w && py >= z.y && py < z.y+z.h;
  }

  onPointerDown(ptr) {
    const idx = this.getItemAtPointer(ptr.x, ptr.y);
    if (idx >= 0 && idx < PLAYER.inventory.length) {
      this.dragOrigIdx = idx;
      this.dragItem = PLAYER.inventory[idx];
      const iconKey = this.dragItem.icon || ITEM_ICONS[this.dragItem.type] || 'icon_gem';
      this.dragSprite = this.add.image(ptr.x, ptr.y, iconKey).setDisplaySize(44,44).setAlpha(0.6).setDepth(500);

      if (GAME.isTouchDevice) {
        this.longPressTimer = this.time.delayedCall(500, () => {
          if (this.dragItem) this.showTooltip(ptr.x, ptr.y, this.dragItem);
        });
      }
    }

    const eqIdx = this.getEquipSlotAtPointer(ptr.x, ptr.y);
    if (eqIdx >= 0) {
      const slotKey = this.equipSlots[eqIdx].slotKey;
      const invIdx = PLAYER.equipped[slotKey];
      if (invIdx >= 0 && invIdx < PLAYER.inventory.length) {
        this.dragOrigIdx = invIdx;
        this.dragItem = PLAYER.inventory[invIdx];
        this.dragFromEquip = slotKey;
        const iconKey = this.dragItem.icon || ITEM_ICONS[this.dragItem.type] || 'icon_gem';
        this.dragSprite = this.add.image(ptr.x, ptr.y, iconKey).setDisplaySize(44,44).setAlpha(0.6).setDepth(500);
      }
    }
  }

  onPointerMove(ptr) {
    if (this.dragSprite) {
      this.dragSprite.setPosition(ptr.x, ptr.y);
      if (this.longPressTimer) { this.longPressTimer.destroy(); this.longPressTimer = null; }
    }
  }

  onPointerUp(ptr) {
    if (this.longPressTimer) { this.longPressTimer.destroy(); this.longPressTimer = null; }
    if (this.tooltipText) { this.tooltipText.destroy(); this.tooltipText = null; }

    if (!this.dragSprite || !this.dragItem) return;

    let handled = false;

    if (this.isOverPortrait(ptr.x, ptr.y)) {
      handled = this.handlePortraitDrop();
    } else if (this.isOverKeyhole(ptr.x, ptr.y)) {
      handled = this.handleKeyholeDrop();
    } else if (this.isOverSconce(ptr.x, ptr.y)) {
      handled = this.handleSconceDrop();
    } else {
      const eqIdx = this.getEquipSlotAtPointer(ptr.x, ptr.y);
      if (eqIdx >= 0) {
        handled = this.handleEquipDrop(eqIdx);
      } else {
        const bpIdx = this.getItemAtPointer(ptr.x, ptr.y);
        if (bpIdx >= 0 && this.dragFromEquip) {
          PLAYER.equipped[this.dragFromEquip] = -1;
          AudioSys.equipSound();
          handled = true;
        }
      }
    }

    if (!handled && this.dragSprite) {
      const ox=150, oy=80, cs=50;
      const col = this.dragOrigIdx%4, row = Math.floor(this.dragOrigIdx/4);
      const origX = ox+col*cs+cs/2-1, origY = oy+row*cs+cs/2-1;
      this.tweens.add({
        targets: this.dragSprite, x: origX, y: origY, alpha: 0,
        duration: 200, ease: 'Power2',
        onComplete: () => { if(this.dragSprite) { this.dragSprite.destroy(); this.dragSprite = null; } }
      });
    } else {
      if(this.dragSprite) { this.dragSprite.destroy(); this.dragSprite = null; }
    }

    this.dragItem = null;
    this.dragOrigIdx = -1;
    this.dragFromEquip = null;

    if (handled) {
      this.renderItems();
    }
  }

  handlePortraitDrop() {
    const item = this.dragItem;
    const idx = this.dragOrigIdx;

    if (item.type === 'potion' && (item.subtype === 'health' || !item.subtype)) {
      const heal = rollDice(4) + rollDice(4) + 2;
      PLAYER.hp = Math.min(PLAYER.maxHp, PLAYER.hp + heal);
      PLAYER.potions = Math.max(0, PLAYER.potions - 1);
      this.removeItem(idx);
      AudioSys.healSound();
      this.showFloating(460, 310, `+${heal} HP`, '#44ff44');
      return true;
    }
    if (item.type === 'potion' && item.subtype === 'mana') {
      const restore = rollDice(6) + 3;
      PLAYER.mana = Math.min(PLAYER.maxMana, PLAYER.mana + restore);
      this.removeItem(idx);
      AudioSys.healSound();
      this.showFloating(460, 310, `+${restore} MP`, '#4488ff');
      return true;
    }
    if (item.type === 'food') {
      const fr = item.foodRestore || 25;
      const wr = item.waterRestore || 0;
      PLAYER.food = Math.min(PLAYER.maxFood, PLAYER.food + fr);
      if (wr > 0) PLAYER.water = Math.min(PLAYER.maxWater, PLAYER.water + wr);
      this.removeItem(idx);
      AudioSys.eatSound();
      let msg = `+${fr} Food`;
      if (wr > 0) msg += ` +${wr} Water`;
      this.showFloating(460, 310, msg, '#ddaa44');
      return true;
    }
    if (item.type === 'water') {
      const wr = item.waterRestore || 30;
      const fr = item.foodRestore || 0;
      PLAYER.water = Math.min(PLAYER.maxWater, PLAYER.water + wr);
      if (fr > 0) PLAYER.food = Math.min(PLAYER.maxFood, PLAYER.food + fr);
      this.removeItem(idx);
      AudioSys.drinkSound();
      let msg = `+${wr} Water`;
      if (fr > 0) msg += ` +${fr} Food`;
      this.showFloating(460, 310, msg, '#4488ff');
      return true;
    }

    AudioSys.errorSound();
    return false;
  }

  handleKeyholeDrop() {
    const item = this.dragItem;
    const idx = this.dragOrigIdx;
    if (item.type !== 'key') { AudioSys.clunkSound(); this.showFloating(160, 390, "That doesn't fit.", '#ff4444'); return false; }

    AudioSys.keyTurnSound();
    PLAYER.keys--;
    this.removeItem(idx);
    if (this.keyholeZone) {
      GAME.currentMap[this.keyholeZone.tileY][this.keyholeZone.tileX] = 0;
    }
    this.showFloating(160, 390, 'Door unlocked!', '#44ff44');
    if (this.keyholeGfx) { this.keyholeGfx.destroy(); this.keyholeGfx = null; }
    this.keyholeZone = null;
    return true;
  }

  handleSconceDrop() {
    if (PLAYER.torch < 10) { AudioSys.errorSound(); this.showFloating(90, 390, 'Not enough torch.', '#ff4444'); return false; }

    PLAYER.torch -= 10;
    AudioSys.sconceSound();
    if (this.sconceZone) {
      GAME.litSconces[this.sconceZone.sconceKey] = true;
    }
    this.showFloating(90, 390, 'Sconce lit!', '#ffaa44');
    if (this.sconceGfx) {
      this.sconceGfx.clear();
      this.sconceGfx.fillStyle(0x2a2211); this.sconceGfx.fillRect(60, 400, 60, 60);
      this.sconceGfx.lineStyle(2, 0xffaa44); this.sconceGfx.strokeRect(60, 400, 60, 60);
      this.sconceGfx.fillStyle(0xff8833, 0.5); this.sconceGfx.fillCircle(90, 420, 12);
      this.sconceGfx.fillStyle(0xffcc44, 0.8); this.sconceGfx.fillCircle(90, 420, 6);
    }
    this.sconceZone = null;
    if (this.dragSprite) { this.dragSprite.destroy(); this.dragSprite = null; }
    this.dragItem = null;
    this.renderItems();
    return true;
  }

  handleEquipDrop(eqIdx) {
    const item = this.dragItem;
    const idx = this.dragOrigIdx;
    const slot = this.equipSlots[eqIdx];

    // Coating on weapon slot
    if (item.type === 'coating' && slot.slotKey === 'weapon') {
      if (PLAYER.equipped.weapon < 0) { AudioSys.errorSound(); this.showFloating(460, 190, 'No weapon equipped.', '#ff4444'); return false; }
      PLAYER.weaponCoating = { type: item.subtype, hitsLeft: 3 };
      this.removeItem(idx);
      AudioSys.coatSound();
      const label = item.subtype === 'fire' ? 'Fire' : 'Poison';
      this.showFloating(460, 190, `${label} coating applied!`, item.subtype==='fire'?'#ff6600':'#44cc44');
      return true;
    }

    if (item.type === 'weapon' && slot.slotKey === 'weapon') {
      PLAYER.equipped.weapon = idx;
      PLAYER.weapon = item.name;
      PLAYER.damageDice = item.damageDice || PLAYER.damageDice;
      PLAYER.damageBonus = item.damageBonus !== undefined ? item.damageBonus : PLAYER.damageBonus;
      AudioSys.equipSound();
      return true;
    }
    if (item.type === 'armor' && slot.slotKey === 'armor') {
      const oldIdx = PLAYER.equipped.armor;
      if (oldIdx >= 0 && PLAYER.inventory[oldIdx]) {
        PLAYER.ac -= (PLAYER.inventory[oldIdx].acBonus || 0);
      }
      PLAYER.equipped.armor = idx;
      PLAYER.ac += (item.acBonus || 0);
      AudioSys.equipSound();
      return true;
    }
    if (item.type === 'shield' && slot.slotKey === 'shield') {
      const oldIdx = PLAYER.equipped.shield;
      if (oldIdx >= 0 && PLAYER.inventory[oldIdx]) {
        PLAYER.ac -= (PLAYER.inventory[oldIdx].acBonus || 0);
      }
      PLAYER.equipped.shield = idx;
      PLAYER.ac += (item.acBonus || 0);
      AudioSys.equipSound();
      return true;
    }
    if (item.type === 'head' && slot.slotKey === 'head') {
      PLAYER.equipped.head = idx;
      AudioSys.equipSound();
      return true;
    }
    if (item.type === 'ring' && slot.slotKey === 'ring') {
      PLAYER.equipped.ring = idx;
      AudioSys.equipSound();
      return true;
    }

    AudioSys.errorSound();
    return false;
  }

  removeItem(idx) {
    PLAYER.inventory.splice(idx, 1);
    for (const slot of Object.keys(PLAYER.equipped)) {
      if (PLAYER.equipped[slot] > idx) PLAYER.equipped[slot]--;
      else if (PLAYER.equipped[slot] === idx) PLAYER.equipped[slot] = -1;
    }
  }

  showFloating(x, y, text, color) {
    const ft = this.add.text(x, y, text, {fontSize:'14px',fontFamily:'monospace',color:color,fontStyle:'bold'}).setOrigin(0.5).setDepth(600);
    this.tweens.add({ targets: ft, y: y-40, alpha: 0, duration: 1200, onComplete: () => ft.destroy() });
  }

  showTooltip(x, y, item) {
    if (this.tooltipText) this.tooltipText.destroy();
    let info = item.name;
    if (item.type === 'weapon') info += ` (d${item.damageDice}+${item.damageBonus||0})`;
    if (item.type === 'armor' || item.type === 'shield') info += ` (+${item.acBonus||0} AC)`;
    if (item.type === 'food') info += ` (+${item.foodRestore} food)`;
    if (item.type === 'water') info += ` (+${item.waterRestore} water)`;
    if (item.type === 'throwable') info += ` (d${item.throwDice} throw)`;
    if (item.type === 'coating') info += ` (3 hits +d4 ${item.subtype})`;
    this.tooltipText = this.add.text(x, y-30, info, {fontSize:'10px',fontFamily:'monospace',color:'#ffcc88',backgroundColor:'#111111'}).setOrigin(0.5).setDepth(700);
  }

  updateDropZoneGlow() {
    this.dropZoneGfx.clear();
    if (!this.dragItem) return;
    const pulse = Math.sin(this.glowPhase) * 0.3 + 0.4;
    const item = this.dragItem;

    if (item.type === 'potion' || item.type === 'food' || item.type === 'water') {
      this.dropZoneGfx.lineStyle(2, 0x44ff44, pulse);
      this.dropZoneGfx.strokeRect(this.portraitZone.x, this.portraitZone.y, this.portraitZone.w, this.portraitZone.h);
    }
    if (item.type === 'key' && this.keyholeZone) {
      this.dropZoneGfx.lineStyle(2, 0xffdd44, pulse);
      this.dropZoneGfx.strokeRect(this.keyholeZone.x, this.keyholeZone.y, this.keyholeZone.w, this.keyholeZone.h);
    }
    if (this.sconceZone && PLAYER.torch >= 10) {
      this.dropZoneGfx.lineStyle(2, 0xffaa44, pulse);
      this.dropZoneGfx.strokeRect(this.sconceZone.x, this.sconceZone.y, this.sconceZone.w, this.sconceZone.h);
    }
    if (item.type === 'coating') {
      const ws = this.equipSlots[2];
      this.dropZoneGfx.lineStyle(2, item.subtype==='fire'?0xff6600:0x44cc44, pulse);
      this.dropZoneGfx.strokeRect(ws.x, ws.y, 48, 48);
    }
    if (item.type === 'weapon') {
      const ws = this.equipSlots[2];
      this.dropZoneGfx.lineStyle(2, 0xaaaacc, pulse);
      this.dropZoneGfx.strokeRect(ws.x, ws.y, 48, 48);
    }
    if (item.type === 'armor') {
      const ws = this.equipSlots[1];
      this.dropZoneGfx.lineStyle(2, 0x8888cc, pulse);
      this.dropZoneGfx.strokeRect(ws.x, ws.y, 48, 48);
    }
    if (item.type === 'shield') {
      const ws = this.equipSlots[3];
      this.dropZoneGfx.lineStyle(2, 0x88aacc, pulse);
      this.dropZoneGfx.strokeRect(ws.x, ws.y, 48, 48);
    }
  }
}

// ============================================================
// GAME CONFIG
// ============================================================
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#000000',
  pixelArt: true,
  input: { activePointers: 2 },
  scene: [PreloadScene, BootScene, ClassSelectScene, TavernScene, DungeonScene, CombatScene, InventoryScene],
  physics: { default: 'arcade' },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }
};

const game = new Phaser.Game(config);
