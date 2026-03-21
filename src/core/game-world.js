import { DIR, FOV_RADIUS } from './constants.js';
import { Leaderboard } from '../systems/leaderboard.js';
import { createItem } from '../items/item-data.js';
import { Merchant } from '../items/merchant.js';
import { Inventory } from '../items/inventory.js';
import { SaveManager } from './save-manager.js';
import { GameSave } from './game-save.js';
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
  constructor(seed, assets) {
    this.inventory = new Inventory();
    this.merchant = new Merchant();
    this.saveManager = new SaveManager();
    this.stateStack = new StateStack(assets);
    this.scheduler = new EnergyScheduler();
    this.party = new PartyManager();
    this.roster = new CharacterRoster();
    this.useDailySeed = seed === undefined; // Use daily seed if no seed provided
    this.rng = this.useDailySeed ? createDailyPRNG() : createPRNG(seed);
    this.events = new EventBus();
    this.tileMap = null;
    this.floorCache = new Map(); // Cache generated floors so backtracking preserves state
    this.player = { x: 0, y: 0, facing: DIR.NORTH };
    this.floor = 1;
    this.completedDungeons = new Set(); // Track cleared dungeons
    this.collectedFragments = new Set(); // Track collected Sunstone Fragments
    this.dungeonType = 'crypts'; // crypts, goblin_warrens
    this.leaderboard = new Leaderboard();
    this.dungeonStartTime = null;
    this.gold = 50; // Starting gold
    this.heroCharacter = null; // Player's custom hero (party slot 1, can't be removed)
    this.needsRender = true;
  }

  init() {
    this.tileMap = generateDungeon(this.rng);

    const startRoom = this.tileMap.rooms[0];
    this.player.x = startRoom.cx;
    this.player.y = startRoom.cy;
    this.player.facing = DIR.NORTH;

    this.recomputeFOV();
    this.spawnMonsters();

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
        room = this.tileMap.rooms[Math.floor(this.rng.next() * this.tileMap.rooms.length)];
      } while (room === this.tileMap.rooms[0]); // Avoid starting room
      
      monster.x = room.cx;
      monster.y = room.cy;
      this.tileMap.addEntity(monster);
    }
  }

  goToNextFloor() {
    // Cache current floor state before leaving
    this.floorCache.set(this.floor, this.tileMap);

    this.floor++;

    if (this.floorCache.has(this.floor)) {
      // Restore cached floor — monsters, items, explored tiles all preserved
      this.tileMap = this.floorCache.get(this.floor);
      const startRoom = this.tileMap.rooms[0];
      this.player.x = startRoom.cx;
      this.player.y = startRoom.cy;
    } else {
      // Generate new floor on first visit only
      this.tileMap = generateDungeon(this.rng);
      const startRoom = this.tileMap.rooms[0];
      this.player.x = startRoom.cx;
      this.player.y = startRoom.cy;
    }

    this.recomputeFOV();
    this.needsRender = true;
  }

  goToPreviousFloor() {
    if (this.floor <= 1) return;

    // Cache current floor state
    this.floorCache.set(this.floor, this.tileMap);

    this.floor--;

    if (this.floorCache.has(this.floor)) {
      // Restore cached floor
      this.tileMap = this.floorCache.get(this.floor);
      const lastRoom = this.tileMap.rooms[this.tileMap.rooms.length - 1];
      this.player.x = lastRoom.cx;
      this.player.y = lastRoom.cy;
    } else {
      // Should always be cached since we came from here, but safety fallback
      this.tileMap = generateDungeon(this.rng);
      const lastRoom = this.tileMap.rooms[this.tileMap.rooms.length - 1];
      this.player.x = lastRoom.cx;
      this.player.y = lastRoom.cy;
    }

    this.recomputeFOV();
    this.needsRender = true;
  }

  enterDungeon() {
    // Create snapshot before entering
    this.saveManager.createSnapshot(this.party.getMembers());
    
    // Start timing
    this.dungeonStartTime = Date.now();
    
    console.log('Dungeon entered - party snapshot created');
  }



  getCurrentDailySeed() {
    if (this.useDailySeed) {
      const today = new Date();
      return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }
    return null;
  }

  exitDungeon(victory) {
    if (victory && this.dungeonStartTime) {
      // Record completion time
      const completionTime = Date.now() - this.dungeonStartTime;
      const dailySeed = this.getCurrentDailySeed();
      
      if (dailySeed) {
        this.leaderboard.recordCompletion(dailySeed, this.dungeonType, completionTime);
        console.log(`Daily dungeon completed in ${this.leaderboard.formatTime(completionTime)}!`);
      }
    }
    
    // Reset timing
    this.dungeonStartTime = null;
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

    // Full rest at tavern — restore all HP/MP for surviving party
    this.party.getMembers().forEach(member => {
      if (member.isAlive()) {
        member.currentHP = member.maxHP;
        member.currentMana = member.maxMana;
        member.isDefending = false;
        member.activeBuffs = [];
      }
    });
    console.log('Party rested at tavern - HP/MP restored');

    // Clear floor cache for fresh dungeon on next entry
    this.floorCache.clear();
    this.floor = 1;

    // Auto-save after dungeon exit
    GameSave.save(this);
  }


}
