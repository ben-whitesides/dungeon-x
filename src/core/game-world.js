import { DIR, FOV_RADIUS } from './constants.js';
import { PartyManager } from '../party/party.js';
import { CharacterRoster } from '../party/roster.js';
import { EventBus } from './event-bus.js';
import { createPRNG, createDailyPRNG } from './prng.js';
import { generateDungeon } from '../dungeon/bsp-generator.js';
import { computeFOV } from '../fov/shadowcast.js';

export class GameWorld {
  constructor(seed) {
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
    this.roster.load(); // Load saved characters

    this.events.on('playerMoved', () => {
      this.recomputeFOV();
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
}
