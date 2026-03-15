# Dungeon X Phase 2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement Phase 2 of Dungeon X adding characters, party management, D&D 5e combat, monster AI, and tavern hub to the existing dungeon crawler foundation.

**Architecture:** Incremental integration following existing modular ES module structure with layered canvases, command pattern, state stack, and event-driven architecture. Each system builds on the previous while maintaining clean separation between world state, rendering, and UI.

**Tech Stack:** Vanilla JavaScript ES modules, Canvas 2D API, localStorage, Web Audio API, Flare portraits, DCSS sprites, Kyrise icons.

---

### Task 1: Character System Foundation

**Files:**
- Create: `src/character/character.js`
- Modify: `src/character/class-data.js` (replace EventBus with class definitions)
- Create: `src/character/level-data.js`

**Step 1: Write the failing test**
Create `src/character/character.test.js`:
```javascript
import { Character } from './character.js';
import { CLASS_DATA } from './class-data.js';

describe('Character', () => {
  test('creates fighter with correct base stats', () => {
    const char = new Character('Test', 'fighter', 1);
    expect(char.name).toBe('Test');
    expect(char.class).toBe('fighter');
    expect(char.level).toBe(1);
    expect(char.stats.str).toBe(16); // Fighter base STR
    expect(char.hp).toBe(10 + 2); // d10 + CON modifier
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/character/character.test.js`
Expected: FAIL - Character class not defined

**Step 3: Write minimal implementation**

`src/character/class-data.js`:
```javascript
export const CLASS_DATA = {
  fighter: { name: 'Fighter', str: 16, dex: 12, con: 14, int: 10, wis: 12, cha: 10, hpDice: '1d10' },
  mage: { name: 'Mage', str: 10, dex: 14, con: 12, int: 16, wis: 14, cha: 8, hpDice: '1d4' },
  cleric: { name: 'Cleric', str: 12, dex: 10, con: 14, int: 10, wis: 16, cha: 12, hpDice: '1d6' },
  rogue: { name: 'Rogue', str: 12, dex: 16, con: 12, int: 14, wis: 10, cha: 10, hpDice: '1d8' },
  ranger: { name: 'Ranger', str: 14, dex: 16, con: 12, int: 10, wis: 14, cha: 8, hpDice: '1d8' },
  paladin: { name: 'Paladin', str: 16, dex: 10, con: 14, int: 8, wis: 12, cha: 14, hpDice: '1d10' }
};
```

`src/character/character.js`:
```javascript
import { CLASS_DATA } from './class-data.js';

export class Character {
  constructor(name, classKey, level = 1) {
    this.name = name;
    this.class = classKey;
    this.level = level;
    this.xp = 0;
    this.equipment = {
      weapon: null,
      armor: null,
      shield: null,
      accessory: null
    };
    this.portrait = 'flare-1'; // Default portrait
    
    const classData = CLASS_DATA[classKey];
    this.stats = {
      str: classData.str,
      dex: classData.dex,
      con: classData.con,
      int: classData.int,
      wis: classData.wis,
      cha: classData.cha
    };
    
    this.hp = this.calculateMaxHP();
    this.currentHP = this.hp;
    this.mp = 10; // Simplified for now
    this.currentMP = this.mp;
  }
  
  getModifier(stat) {
    return Math.floor((this.stats[stat] - 10) / 2);
  }
  
  calculateMaxHP() {
    const conMod = this.getModifier('con');
    return 10 + conMod; // Simplified: base 10 + CON mod
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/character/character.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/character/
git commit -m "feat: implement character system foundation with 6 classes and basic stats"
```

---

### Task 2: Level Progression System

**Files:**
- Create: `src/character/level-data.js`
- Modify: `src/character/character.js`

**Step 1: Write the failing test**

Add to `src/character/character.test.js`:
```javascript
test('character gains level at 300 XP', () => {
  const char = new Character('Test', 'fighter', 1);
  char.xp = 300;
  char.checkLevelUp();
  expect(char.level).toBe(2);
  expect(char.stats.str).toBe(17); // +1 STR at level 2
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/character/character.test.js::character_gains_level_at_300_XP`
Expected: FAIL - checkLevelUp method not defined

**Step 3: Write minimal implementation**

`src/character/level-data.js`:
```javascript
export const LEVEL_DATA = [
  { xp: 0, features: [] },
  { xp: 300, features: ['str+1'] },
  { xp: 900, features: ['str+1', 'dex+1'] },
  { xp: 2700, features: ['str+1'] },
  { xp: 6500, features: ['str+1', 'abilityScoreIncrease'] }
];
```

Modify `src/character/character.js`:
```javascript
import { LEVEL_DATA } from './level-data.js';

export class Character {
  // ... existing constructor ...
  
  checkLevelUp() {
    const nextLevel = LEVEL_DATA[this.level];
    if (this.xp >= nextLevel.xp) {
      this.level++;
      this.applyLevelFeatures(nextLevel.features);
      this.hp = this.calculateMaxHP();
      return true;
    }
    return false;
  }
  
  applyLevelFeatures(features) {
    for (const feature of features) {
      if (feature === 'str+1') this.stats.str++;
      if (feature === 'dex+1') this.stats.dex++;
      // Add other features as needed
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/character/character.test.js::character_gains_level_at_300_XP`
Expected: PASS

**Step 5: Commit**

```bash
git add src/character/level-data.js src/character/character.js
git commit -m "feat: add level progression system with XP thresholds and stat gains"
```

---

### Task 3: Character Roster Management

**Files:**
- Create: `src/party/roster.js`
- Modify: `src/core/game-world.js`

**Step 1: Write the failing test**

Create `src/party/roster.test.js`:
```javascript
import { CharacterRoster } from './roster.js';
import { Character } from '../character/character.js';

describe('CharacterRoster', () => {
  test('can add and retrieve characters', () => {
    const roster = new CharacterRoster();
    const char = new Character('Test', 'fighter');
    roster.add(char);
    expect(roster.getAll().length).toBe(1);
    expect(roster.getAll()[0].name).toBe('Test');
  });
  
  test('persists to localStorage', () => {
    const roster = new CharacterRoster();
    const char = new Character('Test', 'fighter');
    roster.add(char);
    roster.save();
    
    const newRoster = new CharacterRoster();
    newRoster.load();
    expect(newRoster.getAll().length).toBe(1);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/party/roster.test.js`
Expected: FAIL - CharacterRoster class not defined

**Step 3: Write minimal implementation**

`src/party/roster.js`:
```javascript
export class CharacterRoster {
  constructor() {
    this.characters = [];
  }
  
  add(character) {
    this.characters.push(character);
  }
  
  getAll() {
    return this.characters;
  }
  
  save() {
    localStorage.setItem('dungeon-x-roster', JSON.stringify(
      this.characters.map(char => ({
        name: char.name,
        class: char.class,
        level: char.level,
        xp: char.xp,
        stats: char.stats,
        equipment: char.equipment,
        portrait: char.portrait
      }))
    ));
  }
  
  load() {
    const data = localStorage.getItem('dungeon-x-roster');
    if (data) {
      const chars = JSON.parse(data);
      this.characters = chars.map(charData => {
        const char = new Character(charData.name, charData.class, charData.level);
        Object.assign(char, charData);
        return char;
      });
    }
  }
}
```

Modify `src/core/game-world.js`:
```javascript
import { CharacterRoster } from '../party/roster.js';

export class GameWorld {
  constructor(seed) {
    // ... existing constructor ...
    this.roster = new CharacterRoster();
  }
  
  init() {
    // ... existing init ...
    this.roster.load(); // Load saved characters
    return this;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/party/roster.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/party/roster.js src/core/game-world.js
git commit -m "feat: implement character roster with localStorage persistence"
```

---

### Task 4: Party Management System

**Files:**
- Create: `src/party/party.js`
- Modify: `src/core/game-world.js`

**Step 1: Write the failing test**

Create `src/party/party.test.js`:
```javascript
import { PartyManager } from './party.js';
import { Character } from '../character/character.js';

describe('PartyManager', () => {
  test('can add up to 4 characters to party', () => {
    const party = new PartyManager();
    for (let i = 0; i < 4; i++) {
      const char = new Character(`Char${i}`, 'fighter');
      party.addMember(char);
    }
    expect(party.getMembers().length).toBe(4);
    
    const extraChar = new Character('Extra', 'fighter');
    party.addMember(extraChar); // Should not add 5th
    expect(party.getMembers().length).toBe(4);
  });
  
  test('party order affects positioning', () => {
    const party = new PartyManager();
    const front = new Character('Front', 'fighter');
    const back = new Character('Back', 'fighter');
    party.addMember(front); // Position 0 = front
    party.addMember(back);  // Position 1 = back
    
    expect(party.getFrontLine()).toContain(front);
    expect(party.getBackLine()).toContain(back);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/party/party.test.js`
Expected: FAIL - PartyManager class not defined

**Step 3: Write minimal implementation**

`src/party/party.js`:
```javascript
export class PartyManager {
  constructor() {
    this.members = []; // Max 4 characters
  }
  
  addMember(character) {
    if (this.members.length < 4) {
      this.members.push(character);
      return true;
    }
    return false;
  }
  
  removeMember(index) {
    if (index >= 0 && index < this.members.length) {
      this.members.splice(index, 1);
    }
  }
  
  getMembers() {
    return this.members;
  }
  
  getFrontLine() {
    return this.members.slice(0, 2); // First 2 = front
  }
  
  getBackLine() {
    return this.members.slice(2, 4); // Last 2 = back
  }
  
  swapMembers(index1, index2) {
    if (index1 >= 0 && index1 < this.members.length &&
        index2 >= 0 && index2 < this.members.length) {
      [this.members[index1], this.members[index2]] = 
      [this.members[index2], this.members[index1]];
    }
  }
}
```

Modify `src/core/game-world.js`:
```javascript
import { PartyManager } from '../party/party.js';

export class GameWorld {
  constructor(seed) {
    // ... existing constructor ...
    this.party = new PartyManager();
  }
  
  init() {
    // ... existing init ...
    // Load party from roster or create default
    return this;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/party/party.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/party/party.js src/core/game-world.js
git commit -m "feat: implement party management with 4-member limit and front/back positioning"
```

---

### Task 5: D&D 5e Combat Foundation

**Files:**
- Create: `src/combat/combat-manager.js`
- Create: `src/combat/damage-calc.js`

**Step 1: Write the failing test**

Create `src/combat/combat.test.js`:
```javascript
import { rollD20 } from './damage-calc.js';

describe('Combat Calculations', () => {
  test('rollD20 returns value between 1-20', () => {
    const roll = rollD20();
    expect(roll).toBeGreaterThanOrEqual(1);
    expect(roll).toBeLessThanOrEqual(20);
  });
  
  test('attack roll calculation', () => {
    const attacker = { attackMod: 4 }; // +4 to hit
    const target = { ac: 15 }; // AC 15
    
    // Mock d20 roll of 12: 12 + 4 = 16 vs AC 15 = hit
    const result = { roll: 12, hit: true };
    expect(result.hit).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/combat/combat.test.js`
Expected: FAIL - rollD20 function not defined

**Step 3: Write minimal implementation**

`src/combat/damage-calc.js`:
```javascript
export function rollD20() {
  return Math.floor(Math.random() * 20) + 1;
}

export function rollDice(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

export function attackRoll(attacker, target) {
  const roll = rollD20();
  const modifier = attacker.attackMod || 0;
  const total = roll + modifier;
  const hit = total >= (target.ac || 10);
  
  return {
    roll,
    modifier,
    total,
    hit,
    critical: roll === 20 ? 'crit' : roll === 1 ? 'fumble' : null
  };
}

export function calculateDamage(diceNotation, modifier = 0) {
  // Parse "2d6+3" format
  const match = diceNotation.match(/(\d*)d(\d+)([+-]\d+)?/);
  if (!match) return 0;
  
  const [, count = 1, sides, bonus = 0] = match;
  let damage = 0;
  for (let i = 0; i < parseInt(count); i++) {
    damage += rollDice(parseInt(sides));
  }
  return damage + parseInt(bonus) + modifier;
}
```

`src/combat/combat-manager.js`:
```javascript
import { attackRoll, calculateDamage } from './damage-calc.js';

export class CombatManager {
  constructor() {
    this.state = 'inactive'; // inactive, active, victory, defeat
    this.enemies = [];
    this.currentTurn = 0;
  }
  
  startCombat(enemies) {
    this.enemies = enemies;
    this.state = 'active';
    this.currentTurn = 0;
  }
  
  processAttack(attacker, target, weaponDice = '1d6', attackMod = 0, damageMod = 0) {
    const attack = attackRoll({ attackMod }, target);
    
    if (!attack.hit) {
      return { success: false, attack, damage: 0 };
    }
    
    let damage = calculateDamage(weaponDice, damageMod);
    if (attack.critical === 'crit') {
      damage *= 2; // Double damage on crit
    }
    
    target.currentHP = Math.max(0, target.currentHP - damage);
    
    return { success: true, attack, damage };
  }
  
  isCombatOver() {
    const enemiesAlive = this.enemies.some(e => e.currentHP > 0);
    return !enemiesAlive;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/combat/combat.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/combat/
git commit -m "feat: implement D&D 5e combat foundation with attack rolls and damage calculation"
```

---

### Task 6: Energy Scheduler Integration

**Files:**
- Create: `src/core/energy-scheduler.js`
- Modify: `src/core/game-world.js`

**Step 1: Write the failing test**

Create `src/core/energy-scheduler.test.js`:
```javascript
import { EnergyScheduler } from './energy-scheduler.js';

describe('EnergyScheduler', () => {
  test('actors gain energy each tick', () => {
    const scheduler = new EnergyScheduler();
    const actor = { id: 1, speed: 10, energy: 0 };
    scheduler.addActor(actor);
    
    scheduler.tick();
    expect(actor.energy).toBe(10);
    
    scheduler.tick();
    expect(actor.energy).toBe(20);
  });
  
  test('actors act when energy >= threshold', () => {
    const scheduler = new EnergyScheduler();
    const actor = { id: 1, speed: 15, energy: 0 };
    
    let acted = false;
    scheduler.addActor(actor, () => { acted = true; });
    
    scheduler.tick(); // energy = 15, should act
    expect(acted).toBe(true);
    expect(actor.energy).toBe(0); // Reset after acting
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/core/energy-scheduler.test.js`
Expected: FAIL - EnergyScheduler class not defined

**Step 3: Write minimal implementation**

`src/core/energy-scheduler.js`:
```javascript
export class EnergyScheduler {
  constructor() {
    this.actors = new Map(); // id -> { actor, callback, threshold }
  }
  
  addActor(actor, onAct = null, threshold = 10) {
    this.actors.set(actor.id, { actor, onAct, threshold });
  }
  
  removeActor(actorId) {
    this.actors.delete(actorId);
  }
  
  tick() {
    for (const [id, { actor, onAct, threshold }] of this.actors) {
      actor.energy = (actor.energy || 0) + actor.speed;
      
      if (actor.energy >= threshold) {
        if (onAct) onAct(actor);
        actor.energy -= threshold; // Reset energy after acting
      }
    }
  }
  
  getNextActor() {
    let nextActor = null;
    let highestEnergy = -1;
    
    for (const { actor } of this.actors.values()) {
      if (actor.energy > highestEnergy) {
        highestEnergy = actor.energy;
        nextActor = actor;
      }
    }
    
    return nextActor;
  }
}
```

Modify `src/core/game-world.js`:
```javascript
import { EnergyScheduler } from './energy-scheduler.js';

export class GameWorld {
  constructor(seed) {
    // ... existing constructor ...
    this.scheduler = new EnergyScheduler();
  }
  
  init() {
    // ... existing init ...
    // Add party members and enemies to scheduler during combat
    return this;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/core/energy-scheduler.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/core/energy-scheduler.js src/core/game-world.js
git commit -m "feat: integrate energy scheduler for turn-based combat timing"
```

---

### Task 7: Monster Definitions

**Files:**
- Create: `src/dungeon/monsters.js`
- Create: `src/data/monsters.json`

**Step 1: Write the failing test**

Create `src/dungeon/monsters.test.js`:
```javascript
import { createMonster } from './monsters.js';

describe('Monster Creation', () => {
  test('creates shadow lurker with correct stats', () => {
    const monster = createMonster('shadow_lurker');
    expect(monster.name).toBe('Shadow Lurker');
    expect(monster.ac).toBe(12);
    expect(monster.hp).toBeGreaterThan(25); // 4d8+4
    expect(monster.attack).toBe('1d6+2');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/dungeon/monsters.test.js`
Expected: FAIL - createMonster function not defined

**Step 3: Write minimal implementation**

`src/data/monsters.json`:
```json
{
  "shadow_lurker": {
    "name": "Shadow Lurker",
    "ac": 12,
    "hp": "4d8+4",
    "attack": "1d6+2",
    "damageType": "slashing",
    "xp": 100,
    "sprite": "dcss-shadow-lurker",
    "vulnerabilities": ["fire"],
    "resistances": ["ice"]
  },
  "bone_revenant": {
    "name": "Bone Revenant",
    "ac": 16,
    "hp": "6d10+12",
    "attack": "1d10+4",
    "damageType": "slashing",
    "xp": 250,
    "sprite": "dcss-bone-revenant",
    "vulnerabilities": ["stone", "light"],
    "resistances": ["fire"]
  }
}
```

`src/dungeon/monsters.js`:
```javascript
import monstersData from '../data/monsters.json' assert { type: 'json' };
import { calculateDamage } from '../combat/damage-calc.js';

export function createMonster(type) {
  const data = monstersData[type];
  if (!data) throw new Error(`Unknown monster type: ${type}`);
  
  const monster = {
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
  } else {
    return ['shadow_lurker', 'bone_revenant'];
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/dungeon/monsters.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/dungeon/monsters.js src/data/monsters.json
git commit -m "feat: implement monster definitions with DCSS sprites and stat blocks"
```

---

### Task 8: Combat UI State

**Files:**
- Create: `src/ui/states/combat.js`
- Modify: `src/ui/state-stack.js`

**Step 1: Write the failing test**

Create `src/ui/states/combat.test.js`:
```javascript
import { CombatState } from './combat.js';

describe('CombatState', () => {
  test('initializes with enemies', () => {
    const enemies = [{ name: 'Shadow Lurker' }];
    const state = new CombatState(enemies);
    expect(state.enemies).toEqual(enemies);
    expect(state.state).toBe('active');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/ui/states/combat.test.js`
Expected: FAIL - CombatState class not defined

**Step 3: Write minimal implementation**

`src/ui/states/combat.js`:
```javascript
import { CombatManager } from '../../combat/combat-manager.js';

export class CombatState {
  constructor(enemies) {
    this.enemies = enemies;
    this.combat = new CombatManager();
    this.combat.startCombat(enemies);
    this.selectedAction = null;
    this.currentActor = null;
  }
  
  handleInput(input, world) {
    // Handle attack, defend, cast spell, use item, flee
    if (input.type === 'attack') {
      // Process attack action
      return true; // Consumed input
    }
    return false; // Input not consumed
  }
  
  render(ctx, world) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    ctx.fillStyle = '#0f0';
    ctx.font = '16px monospace';
    ctx.fillText('COMBAT MODE', 20, 30);
    
    // Render enemies
    this.enemies.forEach((enemy, i) => {
      ctx.fillText(`${enemy.name}: ${enemy.currentHP}/${enemy.hp} HP`, 20, 60 + i * 20);
    });
    
    // Render action menu
    ctx.fillText('A: Attack  D: Defend  S: Spell  I: Item  F: Flee', 20, ctx.canvas.height - 20);
  }
  
  isDone() {
    return this.combat.state === 'victory' || this.combat.state === 'defeat';
  }
}
```

Modify `src/ui/state-stack.js` (assuming it exists):
```javascript
// Add combat state support
export class StateStack {
  // ... existing methods ...
  
  pushCombat(enemies) {
    const combatState = new CombatState(enemies);
    this.stack.push(combatState);
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/ui/states/combat.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/ui/states/combat.js src/ui/state-stack.js
git commit -m "feat: implement combat UI state with enemy display and action menu"
```

---

### Task 9: Tavern UI State

**Files:**
- Create: `src/ui/states/tavern.js`

**Step 1: Write the failing test**

Create `src/ui/states/tavern.test.js`:
```javascript
import { TavernState } from './tavern.js';

describe('TavernState', () => {
  test('displays roster and party selection', () => {
    const state = new TavernState();
    expect(state.mode).toBe('roster'); // Default mode
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/ui/states/tavern.test.js`
Expected: FAIL - TavernState class not defined

**Step 3: Write minimal implementation**

`src/ui/states/tavern.js`:
```javascript
export class TavernState {
  constructor() {
    this.mode = 'roster'; // roster, party_select, shop
    this.selectedCharacter = 0;
    this.selectedPartySlot = 0;
  }
  
  handleInput(input, world) {
    if (this.mode === 'roster') {
      if (input.type === 'select') {
        // Add selected character to party
        const char = world.roster.getAll()[this.selectedCharacter];
        if (char && world.party.addMember(char)) {
          this.mode = 'party_select';
        }
        return true;
      }
      if (input.type === 'up') {
        this.selectedCharacter = Math.max(0, this.selectedCharacter - 1);
        return true;
      }
      if (input.type === 'down') {
        this.selectedCharacter = Math.min(
          world.roster.getAll().length - 1, 
          this.selectedCharacter + 1
        );
        return true;
      }
    }
    
    if (this.mode === 'party_select' && input.type === 'enter_dungeon') {
      // Start dungeon run with current party
      world.enterDungeon();
      return true;
    }
    
    return false;
  }
  
  render(ctx, world) {
    ctx.fillStyle = '#8B4513'; // Brown tavern background
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    ctx.fillStyle = '#FFD700';
    ctx.font = '20px monospace';
    ctx.fillText('THE RUSTY FLAGON', 20, 30);
    
    if (this.mode === 'roster') {
      ctx.fillStyle = '#FFF';
      ctx.font = '16px monospace';
      ctx.fillText('Select Characters for Your Party:', 20, 50);
      
      world.roster.getAll().forEach((char, i) => {
        const y = 80 + i * 25;
        const prefix = i === this.selectedCharacter ? '> ' : '  ';
        ctx.fillText(`${prefix}${char.name} (${char.class}) L${char.level}`, 20, y);
      });
      
      ctx.fillText('SPACE: Add to Party  ESC: Back', 20, ctx.canvas.height - 20);
    }
    
    if (this.mode === 'party_select') {
      ctx.fillText('Your Party:', 20, 50);
      
      world.party.getMembers().forEach((char, i) => {
        const y = 80 + i * 25;
        ctx.fillText(`${i + 1}. ${char.name} (${char.class})`, 20, y);
      });
      
      ctx.fillText('ENTER: Enter Dungeon', 20, ctx.canvas.height - 20);
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/ui/states/tavern.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/ui/states/tavern.js
git commit -m "feat: implement tavern UI state with roster and party selection"
```

---

### Task 10: Character Creation State

**Files:**
- Create: `src/ui/states/character-create.js`

**Step 1: Write the failing test**

Create `src/ui/states/character-create.test.js`:
```javascript
import { CharacterCreateState } from './character-create.js';

describe('CharacterCreateState', () => {
  test('allows class selection', () => {
    const state = new CharacterCreateState();
    expect(state.availableClasses).toContain('fighter');
    expect(state.availableClasses).toContain('mage');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/ui/states/character-create.test.js`
Expected: FAIL - CharacterCreateState class not defined

**Step 3: Write minimal implementation**

`src/ui/states/character-create.js`:
```javascript
import { Character } from '../../character/character.js';
import { CLASS_DATA } from '../../character/class-data.js';

export class CharacterCreateState {
  constructor() {
    this.availableClasses = Object.keys(CLASS_DATA);
    this.selectedClass = 0;
    this.name = '';
    this.nameInput = false;
    this.selectedPortrait = 0;
  }
  
  handleInput(input, world) {
    if (this.nameInput) {
      if (input.type === 'text') {
        this.name += input.char;
        return true;
      }
      if (input.type === 'backspace') {
        this.name = this.name.slice(0, -1);
        return true;
      }
      if (input.type === 'enter') {
        this.nameInput = false;
        return true;
      }
    } else {
      if (input.type === 'up') {
        this.selectedClass = Math.max(0, this.selectedClass - 1);
        return true;
      }
      if (input.type === 'down') {
        this.selectedClass = Math.min(this.availableClasses.length - 1, this.selectedClass + 1);
        return true;
      }
      if (input.type === 'select') {
        this.nameInput = true;
        return true;
      }
      if (input.type === 'create' && this.name.length > 0) {
        const classKey = this.availableClasses[this.selectedClass];
        const character = new Character(this.name, classKey);
        world.roster.add(character);
        world.roster.save();
        return true; // Creation complete
      }
    }
    return false;
  }
  
  render(ctx, world) {
    ctx.fillStyle = '#2F1B14'; // Dark brown
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    ctx.fillStyle = '#FFD700';
    ctx.font = '20px monospace';
    ctx.fillText('CREATE CHARACTER', 20, 30);
    
    // Class selection
    ctx.fillStyle = '#FFF';
    ctx.font = '16px monospace';
    ctx.fillText('Choose Class:', 20, 60);
    
    this.availableClasses.forEach((classKey, i) => {
      const y = 80 + i * 20;
      const prefix = i === this.selectedClass ? '> ' : '  ';
      const classData = CLASS_DATA[classKey];
      ctx.fillText(`${prefix}${classData.name}`, 20, y);
    });
    
    if (this.nameInput) {
      ctx.fillText(`Name: ${this.name}_`, 20, ctx.canvas.height - 60);
      ctx.fillText('Type name and press ENTER', 20, ctx.canvas.height - 40);
    } else {
      ctx.fillText('SPACE: Enter Name  C: Create Character', 20, ctx.canvas.height - 20);
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/ui/states/character-create.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/ui/states/character-create.js
git commit -m "feat: implement character creation state with class selection and naming"
```

---

### Task 11: Integration and Party HUD

**Files:**
- Modify: `src/render/ui-renderer.js` (create if doesn't exist)
- Modify: `src/main.js`

**Step 1: Write the failing test**

Create `src/render/ui-renderer.test.js`:
```javascript
import { UIRenderer } from './ui-renderer.js';

describe('UIRenderer', () => {
  test('renders party HUD during exploration', () => {
    const renderer = new UIRenderer();
    const mockCtx = { fillText: jest.fn() };
    const party = [{ name: 'Test', currentHP: 10, hp: 10 }];
    
    renderer.renderPartyHUD(mockCtx, party);
    expect(mockCtx.fillText).toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/render/ui-renderer.test.js`
Expected: FAIL - UIRenderer class not defined

**Step 3: Write minimal implementation**

`src/render/ui-renderer.js`:
```javascript
export class UIRenderer {
  renderPartyHUD(ctx, party) {
    if (!party || party.length === 0) return;
    
    const startX = ctx.canvas.width - 200;
    const startY = 20;
    
    ctx.fillStyle = '#000';
    ctx.fillRect(startX - 10, startY - 10, 190, party.length * 40 + 20);
    
    ctx.fillStyle = '#0f0';
    ctx.font = '12px monospace';
    
    party.forEach((member, i) => {
      const y = startY + i * 40;
      ctx.fillText(member.name, startX, y);
      ctx.fillText(`${member.currentHP}/${member.hp} HP`, startX, y + 15);
      
      // Simple HP bar
      const barWidth = 100;
      const barHeight = 8;
      const hpPercent = member.currentHP / member.hp;
      
      ctx.fillStyle = '#f00';
      ctx.fillRect(startX, y + 20, barWidth, barHeight);
      ctx.fillStyle = '#0f0';
      ctx.fillRect(startX, y + 20, barWidth * hpPercent, barHeight);
    });
  }
  
  renderCombatUI(ctx, combatState, world) {
    // Render combat-specific UI
    ctx.fillStyle = '#000';
    ctx.fillRect(0, ctx.canvas.height - 60, ctx.canvas.width, 60);
    
    ctx.fillStyle = '#0f0';
    ctx.font = '14px monospace';
    ctx.fillText('COMBAT: A=Attack D=Defend S=Spell I=Item F=Flee', 10, ctx.canvas.height - 30);
  }
}
```

Modify `src/main.js`:
```javascript
import { UIRenderer } from './render/ui-renderer.js';

async function boot() {
  // ... existing boot code ...
  
  const uiRenderer = new UIRenderer();
  
  function gameLoop() {
    // ... existing game loop ...
    
    if (world.needsRender) {
      // ... existing rendering ...
      
      // Render party HUD during exploration
      if (world.party) {
        uiRenderer.renderPartyHUD(layers.ui, world.party.getMembers());
      }
      
      world.needsRender = false;
    }
    
    requestAnimationFrame(gameLoop);
  }
  
  requestAnimationFrame(gameLoop);
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/render/ui-renderer.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/render/ui-renderer.js src/main.js
git commit -m "feat: integrate party HUD and UI renderer for exploration and combat"
```

---

### Task 12: Combat Trigger Integration

**Files:**
- Modify: `src/commands/move-command.js`
- Modify: `src/core/game-world.js`

**Step 1: Write the failing test**

Add to `src/commands/move-command.test.js` (create if doesn't exist):
```javascript
import { MoveCommand } from './move-command.js';

describe('MoveCommand', () => {
  test('triggers combat when moving onto enemy', () => {
    const world = {
      tileMap: { getEntitiesAt: () => [{ type: 'enemy' }] },
      stateStack: { pushCombat: jest.fn() }
    };
    
    const command = new MoveCommand(1, 0); // Move right
    const result = command.execute(world, { x: 0, y: 0 });
    
    expect(world.stateStack.pushCombat).toHaveBeenCalled();
    expect(result.triggeredCombat).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/commands/move-command.test.js`
Expected: FAIL - MoveCommand doesn't trigger combat

**Step 3: Write minimal implementation**

Modify `src/commands/move-command.js`:
```javascript
export class MoveCommand {
  // ... existing constructor and execute ...
  
  execute(world, player) {
    const newX = player.x + this.dx;
    const newY = player.y + this.dy;
    
    // Check for collision with walls
    if (world.tileMap.isSolid(newX, newY)) {
      return { success: false, reason: 'blocked' };
    }
    
    // Check for enemies
    const entities = world.tileMap.getEntitiesAt(newX, newY);
    const enemy = entities.find(e => e.type === 'enemy');
    if (enemy) {
      // Trigger combat
      world.stateStack.pushCombat([enemy]);
      return { success: false, reason: 'combat', enemy };
    }
    
    // Move player
    player.x = newX;
    player.y = newY;
    
    world.events.emit('playerMoved', { x: newX, y: newY });
    
    return { success: true };
  }
}
```

Modify `src/core/game-world.js` to add enemies to tilemap during generation:
```javascript
// In init() method, after dungeon generation:
const monsters = getMonsterPool(this.floor);
monsters.forEach(type => {
  const monster = createMonster(type);
  // Place monster in random room
  const room = this.tileMap.rooms[Math.floor(Math.random() * this.tileMap.rooms.length)];
  monster.x = room.cx;
  monster.y = room.cy;
  this.tileMap.addEntity(monster);
});
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/commands/move-command.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/commands/move-command.js src/core/game-world.js
git commit -m "feat: integrate combat triggers when moving onto enemies"
```

---

### Task 13: Pre-Dungeon Snapshot System

**Files:**
- Create: `src/core/save-manager.js`
- Modify: `src/core/game-world.js`

**Step 1: Write the failing test**

Create `src/core/save-manager.test.js`:
```javascript
import { SaveManager } from './save-manager.js';

describe('SaveManager', () => {
  test('creates and restores party snapshots', () => {
    const manager = new SaveManager();
    const party = [{ name: 'Test', equipment: { weapon: 'sword' } }];
    
    manager.createSnapshot(party);
    expect(manager.snapshot).toEqual(party);
    
    // Modify party
    party[0].equipment.weapon = 'broken_sword';
    
    manager.restoreSnapshot(party);
    expect(party[0].equipment.weapon).toBe('sword');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/core/save-manager.test.js`
Expected: FAIL - SaveManager class not defined

**Step 3: Write minimal implementation**

`src/core/save-manager.js`:
```javascript
export class SaveManager {
  constructor() {
    this.snapshot = null;
  }
  
  createSnapshot(party) {
    this.snapshot = party.map(member => ({
      name: member.name,
      level: member.level,
      xp: member.xp,
      hp: member.hp,
      currentHP: member.currentHP,
      equipment: { ...member.equipment },
      stats: { ...member.stats }
    }));
  }
  
  restoreSnapshot(party) {
    if (!this.snapshot) return;
    
    // Restore equipment and HP, keep level/XP
    party.forEach((member, i) => {
      if (this.snapshot[i]) {
        const snap = this.snapshot[i];
        member.equipment = { ...snap.equipment };
        member.currentHP = snap.currentHP;
        member.hp = snap.hp;
      }
    });
  }
  
  clearSnapshot() {
    this.snapshot = null;
  }
}
```

Modify `src/core/game-world.js`:
```javascript
import { SaveManager } from './save-manager.js';

export class GameWorld {
  constructor(seed) {
    // ... existing constructor ...
    this.saveManager = new SaveManager();
  }
  
  enterDungeon() {
    // Create snapshot before entering
    this.saveManager.createSnapshot(this.party.getMembers());
    // Transition to dungeon state
  }
  
  exitDungeon(victory) {
    if (!victory) {
      // Restore from snapshot on defeat
      this.saveManager.restoreSnapshot(this.party.getMembers());
    } else {
      // Clear snapshot on victory
      this.saveManager.clearSnapshot();
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/core/save-manager.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/core/save-manager.js src/core/game-world.js
git commit -m "feat: implement pre-dungeon snapshot system for death/revival mechanics"
```

---

### Task 14: Monster AI Integration

**Files:**
- Create: `src/ai/ai-director.js`
- Modify: `src/core/energy-scheduler.js`

**Step 1: Write the failing test**

Create `src/ai/ai-director.test.js`:
```javascript
import { AIDirector } from './ai-director.js';

describe('AIDirector', () => {
  test('monster moves toward player', () => {
    const director = new AIDirector();
    const monster = { x: 5, y: 5, speed: 10 };
    const player = { x: 3, y: 3 };
    
    const action = director.decideAction(monster, player);
    expect(action.type).toBe('move');
    expect(action.dx).toBe(-1); // Move left toward player
    expect(action.dy).toBe(-1); // Move up toward player
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/ai/ai-director.test.js`
Expected: FAIL - AIDirector class not defined

**Step 3: Write minimal implementation**

`src/ai/ai-director.js`:
```javascript
export class AIDirector {
  decideAction(monster, player, world) {
    // Simple chase AI
    const dx = player.x - monster.x;
    const dy = player.y - monster.y;
    
    // Normalize to single step
    const stepX = dx === 0 ? 0 : dx > 0 ? 1 : -1;
    const stepY = dy === 0 ? 0 : dy > 0 ? 1 : -1;
    
    // Check if move is valid
    const newX = monster.x + stepX;
    const newY = monster.y + stepY;
    
    if (world.tileMap.isSolid(newX, newY)) {
      // Can't move, maybe attack if adjacent
      if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
        return { type: 'attack', target: player };
      }
      return { type: 'wait' }; // Blocked
    }
    
    return { type: 'move', dx: stepX, dy: stepY };
  }
  
  executeAction(action, monster, world) {
    if (action.type === 'move') {
      monster.x += action.dx;
      monster.y += action.dy;
    } else if (action.type === 'attack') {
      // Trigger combat or direct attack
      world.combat.processAttack(monster, action.target);
    }
  }
}
```

Modify `src/core/energy-scheduler.js`:
```javascript
import { AIDirector } from '../ai/ai-director.js';

export class EnergyScheduler {
  constructor() {
    // ... existing constructor ...
    this.aiDirector = new AIDirector();
  }
  
  // In tick method, when actor acts:
  if (actor.isMonster) {
    const action = this.aiDirector.decideAction(actor, world.player, world);
    this.aiDirector.executeAction(action, actor, world);
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/ai/ai-director.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/ai/ai-director.js src/core/energy-scheduler.js
git commit -m "feat: implement monster AI with chase behavior and energy scheduler integration"
```

---

### Task 15: Final Integration and Testing

**Files:**
- Modify: `src/main.js`
- Modify: `index.html`

**Step 1: Manual testing**

Open `index.html` in browser and verify:
- Character creation works
- Party selection works  
- Tavern UI displays correctly
- Combat triggers on enemy contact
- Party HUD shows during exploration
- Monster AI moves toward player

**Step 2: Browser testing**

Run: `npx serve .` and open in browser

**Step 3: Fix any integration issues**

**Step 4: Final browser test**

Ensure no console errors, all features work

**Step 5: Commit**

```bash
git add .
git commit -m "feat: complete Phase 2 integration - characters, party, combat, AI, tavern all working"
```