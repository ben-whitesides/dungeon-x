import { DIR, FOV_RADIUS } from './constants.js';
import { createItem } from '../items/item-data.js';
import { Merchant } from '../items/merchant.js';
import { Inventory } from '../items/inventory.js';
import { SaveManager } from './save-manager.js';
import { createMonster, getMonsterPool } from '../dungeon/monsters.js';
import { StateStack } from '../ui/state-stack.js';
import { EnergyScheduler } from './energy-scheduler.js';
import { PartyManager } from '../party/party.js';
import { CharacterRoster } from '../party/roster.js';
import { EventBus } from './event-bus.js';
import { createPRNG, createDailyPRNG } from './prng.js';
import { generateDungeon } from '../dungeon/bsp-generator.js';
import { computeFOV } from '../fov/shadowcast.js';

export class GameWorld {
  constructor(seed) {
    this.inventory = new Inventory();
    this.merchant = new Merchant();
    this.saveManager = new SaveManager();
    this.stateStack = new StateStack();
    this.scheduler = new EnergyScheduler();
    this.party = new PartyManager();
    this.roster = new CharacterRoster();
    this.rng = typeof seed === 'number' ? createPRNG(seed) : createDailyPRNG();
    this.events = new EventBus();
    this.tileMap = null;
    this.player = { x: 0, y: 0, facing: DIR.NORTH };
    this.floor = 1;
    this.completedDungeons = new Set(); // Track cleared dungeons
    this.collectedFragments = new Set(); // Track collected Sunstone Fragments
    this.dungeonType = 'crypts'; // crypts, goblin_warrens
    this.gold = 50; // Starting gold
    this.needsRender = true;
  }

  init() {
    this.tileMap = generateDungeon(this.rng);

    const startRoom = this.tileMap.rooms[0];
    this.player.x = startRoom.cx;
    this.player.y = startRoom.cy;
    this.player.facing = DIR.NORTH;

    this.recomputeFOV();
    // this.spawnMonsters();
    // this.roster.load(); // Load saved characters

    this.events.on('playerMoved', () => {
      this.recomputeFOV();
      this.needsRender = true;
    });
    this.events.on('playerTurned', () => {
      this.needsRender = true;
    });

    this.needsRender = true;
    return this;
  }

  recomputeFOV() {
    this.tileMap.fadeVisibility();
    computeFOV(
      this.player.x, this.player.y, FOV_RADIUS,
      (x, y) => this.tileMap.isOpaque(x, y),
      (x, y) => this.tileMap.setVisible(x, y)
    );
  }

  spawnMonsters(dungeonType = this.dungeonType) {
    // Clear previous entities and dens
    this.tileMap.entities.clear();
    this.tileMap.goblinDens.clear();
    const monsterTypes = getMonsterPool(this.floor, dungeonType);
    const numMonsters = Math.min(monsterTypes.length, 3 + this.floor); // More monsters on deeper floors
    
    for (let i = 0; i < numMonsters; i++) {
      const monsterType = monsterTypes[i % monsterTypes.length];
      const monster = createMonster(monsterType);
      
      // Place in random room (not the starting room)
      let room;
      do {
        room = this.tileMap.rooms[Math.floor(this.rng() * this.tileMap.rooms.length)];
      } while (room === this.tileMap.rooms[0]); // Avoid starting room
      
      monster.x = room.cx;
      monster.y = room.cy;
      this.tileMap.addEntity(monster);
    }
  }

  goToNextFloor() {
    this.floor++;
    console.log(`Descending to floor ${this.floor}`);
    
    // Generate new dungeon for this floor
    this.tileMap = generateDungeon(this.rng);
    
    // Place player at stairs up
    const startRoom = this.tileMap.rooms[0];
    this.player.x = startRoom.cx;
    this.player.y = startRoom.cy;
    
    this.recomputeFOV();
    // this.spawnMonsters();
    this.needsRender = true;
  }

  goToPreviousFloor() {
    if (this.floor > 1) {
      this.floor--;
      console.log(`Ascending to floor ${this.floor}`);
      
      // Generate new dungeon for this floor (should be deterministic)
      this.tileMap = generateDungeon(this.rng);
      
      // Place player at stairs down (last room)
      const lastRoom = this.tileMap.rooms[this.tileMap.rooms.length - 1];
      this.player.x = lastRoom.cx;
      this.player.y = lastRoom.cy;
      
      this.recomputeFOV();
      // this.spawnMonsters();
      this.needsRender = true;
    }
  }

  enterDungeon() {
    // Create snapshot before entering
    this.saveManager.createSnapshot(this.party.getMembers());
    console.log('Dungeon entered - party snapshot created');
  }

  exitDungeon(victory) {
    if (victory) {
      // Mark dungeon as completed and award fragment
      this.completedDungeons.add(this.dungeonType);
      
      // Award appropriate fragment
      if (this.dungeonType === 'crypts') {
        this.collectedFragments.add('dawn');
        this.inventory.addItem(createItem('sunstone_fragment'));
      } else if (this.dungeonType === 'goblin_warrens') {
        this.collectedFragments.add('dusk');
        this.inventory.addItem(createItem('sunstone_fragment'));
      }
      
      console.log(`Dungeon ${this.dungeonType} completed! Fragment of ${this.dungeonType === 'crypts' ? 'Dawn' : 'Dusk'} collected.`);
    }
    
    if (!victory) {
      // Restore from snapshot on defeat
      this.saveManager.restoreSnapshot(this.party.getMembers());
      console.log('Party restored from snapshot after defeat');
    } else {
      // Clear snapshot on victory
      this.saveManager.clearSnapshot();
      console.log('Dungeon completed - snapshot cleared');
    }
  }

  old_exitDungeon(victory) {
    if (!victory) {
      // Restore from snapshot on defeat
      this.saveManager.restoreSnapshot(this.party.getMembers());
      console.log('Party restored from snapshot after defeat');
    } else {
      // Clear snapshot on victory
      this.saveManager.clearSnapshot();
      console.log('Dungeon completed - snapshot cleared');
    }
  }
}
