import { DIR, FOV_RADIUS } from './constants.js';
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
    this.roster.load(); // Load saved characters

    this.events.on('playerMoved', () => {
      this.recomputeFOV();
    this.spawnMonsters();
    this.roster.load(); // Load saved characters
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

  spawnMonsters() {
    const monsterTypes = getMonsterPool(this.floor);
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

  enterDungeon() {
    // Create snapshot before entering
    this.saveManager.createSnapshot(this.party.getMembers());
    console.log('Dungeon entered - party snapshot created');
  }

  exitDungeon(victory) {
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
    const monsterTypes = getMonsterPool(this.floor);
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
}
    this.tileMap.fadeVisibility();
    computeFOV(
      this.player.x, this.player.y, FOV_RADIUS,
      (x, y) => this.tileMap.isOpaque(x, y),
      (x, y) => this.tileMap.setVisible(x, y)
    );
  }
}
