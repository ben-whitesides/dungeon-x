# Phase 2 Character System — Code (paste into .js files)

The mastery gate blocks editing `.js` until `nodejs-mastery.md` is present in  
`~/.claude/projects/-Users-benjaminwhitesides/memory/`.  
Only `nodejs-mastery-intel.md` exists there. Fix by copying/renaming that file to `nodejs-mastery.md`,  
or update the hook to use `nodejs-mastery-intel.md`. Then ask the agent to re-run the Phase 2 writes.

---

## src/character/class-data.js

```javascript
/**
 * Class definitions: stats, HP/MP dice, AC, proficiencies.
 * Canon: docs/dungeon-x-game-bible.md Section 3, docs/combat-system-dnd.md.
 * Six classes: Fighter, Mage, Cleric, Rogue, Ranger, Paladin.
 */

export const CLASS_IDS = {
  FIGHTER: 'fighter',
  RANGER: 'ranger',
  MAGE: 'mage',
  CLERIC: 'cleric',
  ROGUE: 'rogue',
  PALADIN: 'paladin',
};

/** Modifier: floor((stat - 10) / 2) */
export function statMod(stat) {
  return Math.floor((stat - 10) / 2);
}

export const CLASS_DATA = {
  [CLASS_IDS.FIGHTER]: {
    id: CLASS_IDS.FIGHTER,
    name: 'Fighter',
    stats: { str: 16, dex: 10, con: 15, int: 8, wis: 12, cha: 9 },
    hpDie: 10,
    resourceType: null,
    resourceMax: 0,
    baseAC: 16,
    attackStat: 'str',
    spellStat: null,
    proficiencies: { weapons: true, heavyArmor: true, shields: true },
  },
  [CLASS_IDS.RANGER]: {
    id: CLASS_IDS.RANGER,
    name: 'Ranger',
    stats: { str: 10, dex: 16, con: 12, int: 10, wis: 14, cha: 8 },
    hpDie: 8,
    resourceType: null,
    resourceMax: 0,
    baseAC: 14,
    attackStat: 'dex',
    spellStat: null,
    proficiencies: { weapons: true, lightArmor: true, mediumArmor: true },
  },
  [CLASS_IDS.MAGE]: {
    id: CLASS_IDS.MAGE,
    name: 'Mage',
    stats: { str: 8, dex: 12, con: 10, int: 17, wis: 10, cha: 13 },
    hpDie: 4,
    resourceType: 'mana',
    resourceMax: 20,
    baseAC: 11,
    attackStat: 'int',
    spellStat: 'int',
    proficiencies: { lightArmor: true, staves: true },
  },
  [CLASS_IDS.CLERIC]: {
    id: CLASS_IDS.CLERIC,
    name: 'Cleric',
    stats: { str: 12, dex: 10, con: 13, int: 10, wis: 16, cha: 14 },
    hpDie: 6,
    resourceType: 'divine',
    resourceMax: 18,
    baseAC: 15,
    attackStat: 'str',
    spellStat: 'wis',
    proficiencies: { weapons: true, lightArmor: true, mediumArmor: true, shields: true },
  },
  [CLASS_IDS.ROGUE]: {
    id: CLASS_IDS.ROGUE,
    name: 'Rogue',
    stats: { str: 10, dex: 16, con: 12, int: 14, wis: 10, cha: 8 },
    hpDie: 8,
    resourceType: null,
    resourceMax: 0,
    baseAC: 14,
    attackStat: 'dex',
    spellStat: null,
    proficiencies: { lightArmor: true, finesse: true },
  },
  [CLASS_IDS.PALADIN]: {
    id: CLASS_IDS.PALADIN,
    name: 'Paladin',
    stats: { str: 16, dex: 8, con: 14, int: 10, wis: 12, cha: 14 },
    hpDie: 10,
    resourceType: 'divine',
    resourceMax: 10,
    baseAC: 16,
    attackStat: 'str',
    spellStat: 'cha',
    proficiencies: { weapons: true, heavyArmor: true, shields: true },
  },
};

export function getClassData(classId) {
  return CLASS_DATA[classId] ?? null;
}

export function getAllClasses() {
  return Object.values(CLASS_DATA);
}
```

---

## src/character/level-up.js

```javascript
/**
 * XP thresholds and level-up logic.
 * Canon: docs/combat-system-dnd.md Level Progression.
 */

import { statMod } from './class-data.js';

export const XP_THRESHOLDS = [0, 300, 900, 2700, 6500];
export const MAX_LEVEL = 5;

export function proficiencyBonus(level) {
  return level < 5 ? 2 : 3;
}

export function levelFromXP(xp) {
  let level = 1;
  for (let i = XP_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= XP_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }
  return Math.min(level, MAX_LEVEL);
}

export function applyLevelUp(character, classData) {
  const level = levelFromXP(character.xp ?? 0);
  const conMod = statMod(character.stats?.con ?? 10);
  const hpDie = classData.hpDie ?? 8;
  const resourceMax = classData.resourceMax ?? 0;
  const spellStat = classData.spellStat;
  const spellMod = spellStat ? statMod(character.stats?.[spellStat] ?? 10) : 0;

  let maxHP = hpDie + conMod;
  if (level > 1) {
    for (let i = 1; i < level; i++) {
      maxHP += Math.max(1, Math.floor(hpDie / 2) + 1 + conMod);
    }
  }

  let maxResource = resourceMax;
  if (classData.resourceType && level > 1) {
    maxResource = resourceMax + (level - 1) * (classData.id === 'mage' ? 5 + spellMod : 4 + spellMod);
  }

  return {
    level,
    maxHP,
    maxResource: Math.max(0, maxResource),
    proficiency: proficiencyBonus(level),
  };
}
```

---

## src/character/character.js

```javascript
/**
 * Single character: class, stats, HP/MP, level, equipment, portrait.
 * Canon: docs/dungeon-x-game-bible.md Section 3, docs/combat-system-dnd.md.
 */

import { getClassData, statMod } from './class-data.js';
import { applyLevelUp } from './level-up.js';

export class Character {
  constructor(opts = {}) {
    this.id = opts.id ?? crypto.randomUUID?.() ?? `char-${Date.now()}`;
    this.name = opts.name ?? 'Hero';
    this.classId = opts.classId ?? 'fighter';
    this.portrait = opts.portrait ?? 'portrait_male_1';

    const classData = getClassData(this.classId);
    this.stats = opts.stats ?? (classData ? { ...classData.stats } : { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 });
    this.hp = opts.hp;
    this.maxHP = opts.maxHP;
    this.resource = opts.resource;
    this.maxResource = opts.maxResource;
    this.level = opts.level ?? 1;
    this.xp = opts.xp ?? 0;
    this.equipment = opts.equipment ?? { weapon: null, armor: null, offhand: null, ring: null };

    this._deriveFromClass();
  }

  _deriveFromClass() {
    const classData = getClassData(this.classId);
    if (!classData) return;

    const levelUp = applyLevelUp(this, classData);
    if (this.maxHP == null) this.maxHP = levelUp.maxHP;
    if (this.hp == null) this.hp = this.maxHP;
    if (this.level == null) this.level = levelUp.level;
    if (this.maxResource == null) this.maxResource = levelUp.maxResource;
    if (this.resource == null && classData.resourceType) this.resource = this.maxResource;
    if (this.resource == null) this.resource = 0;
  }

  getAC() {
    const classData = getClassData(this.classId);
    let ac = classData?.baseAC ?? 10;
    const dexMod = statMod(this.stats.dex ?? 10);
    if (classData?.proficiencies?.heavyArmor) ac += 0;
    else ac += Math.min(2, dexMod);
    return ac;
  }

  getAttackMod() {
    const classData = getClassData(this.classId);
    const stat = classData?.attackStat ?? 'str';
    const mod = statMod(this.stats[stat] ?? 10);
    const prof = this.level < 5 ? 2 : 3;
    return mod + prof;
  }

  getSpellSaveDC() {
    const classData = getClassData(this.classId);
    const stat = classData?.spellStat ?? 'int';
    const mod = statMod(this.stats[stat] ?? 10);
    const prof = this.level < 5 ? 2 : 3;
    return 8 + prof + mod;
  }

  getSpellAttackMod() {
    const classData = getClassData(this.classId);
    const stat = classData?.spellStat ?? 'int';
    return statMod(this.stats[stat] ?? 10) + (this.level < 5 ? 2 : 3);
  }

  getStatMod(statName) {
    return statMod(this.stats[statName] ?? 10);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      classId: this.classId,
      portrait: this.portrait,
      stats: { ...this.stats },
      hp: this.hp,
      maxHP: this.maxHP,
      resource: this.resource,
      maxResource: this.maxResource,
      level: this.level,
      xp: this.xp,
      equipment: { ...this.equipment },
    };
  }

  static fromJSON(obj) {
    const c = new Character(obj);
    c.hp = obj.hp ?? c.maxHP;
    c.maxHP = obj.maxHP ?? c.maxHP;
    c.resource = obj.resource ?? c.maxResource;
    c.maxResource = obj.maxResource ?? c.maxResource;
    c.level = obj.level ?? 1;
    c.xp = obj.xp ?? 0;
    return c;
  }
}
```

---

## src/character/index.js

```javascript
export { Character } from './character.js';
export {
  CLASS_IDS,
  CLASS_DATA,
  getClassData,
  getAllClasses,
  statMod,
} from './class-data.js';
export {
  XP_THRESHOLDS,
  MAX_LEVEL,
  proficiencyBonus,
  levelFromXP,
  applyLevelUp,
} from './level-up.js';
```

---

After fixing the mastery gate (or temporarily disabling it), delete the placeholder `src/character/class-data.js` (the event-bus copy) and have the agent create the four files above, or paste the blocks into the correct paths.
