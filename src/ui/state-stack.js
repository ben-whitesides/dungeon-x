import { TavernState } from './states/tavern.js';
import { TavernExteriorState } from './states/tavern-exterior.js';
import { CombatState } from './states/combat.js';
import { CharacterCreateState } from './states/character-create.js';
import { ExploringState } from './states/exploring.js';
import { DungeonTransitionState } from './states/dungeon-transition.js';
import { LevelUpState } from './states/level-up.js';
import { TitleScreenState } from './states/title-screen.js';
import { CharacterSelectState } from './states/character-select.js';
import { DeathScreenState } from './states/death-screen.js';
import { VictoryScreenState } from './states/victory-screen.js';

export class StateStack {
  constructor(assets) {
    this.stack = [];
    this.assets = assets;
  }

  push(state) {
    this.stack.push(state);
  }

  pop() {
    return this.stack.pop();
  }

  clear() {
    this.stack = [];
  }

  peek() {
    return this.stack[this.stack.length - 1];
  }

  isEmpty() {
    return this.stack.length === 0;
  }

  pushTavern(renderers) {
    this.push(new TavernState(this.assets, renderers));
  }

  pushTavernExterior() {
    this.push(new TavernExteriorState(this.assets));
  }

  pushCombat(enemies) {
    this.push(new CombatState(enemies, this.assets));
  }

  pushCharacterCreate(isFirstRun = false) {
    this.push(new CharacterCreateState(this.assets, isFirstRun));
  }

  pushExploring(fpRenderer, minimapRenderer, uiRenderer) {
    this.push(new ExploringState(fpRenderer, minimapRenderer, uiRenderer));
  }

  pushDungeonTransition(dungeonName, onComplete) {
    this.push(new DungeonTransitionState(dungeonName, onComplete));
  }

  pushLevelUp(character, oldLevel, newLevel) {
    this.push(new LevelUpState(character, oldLevel, newLevel, this.assets));
  }

  pushTitleScreen() {
    this.push(new TitleScreenState(this.assets));
  }

  pushCharacterSelect() {
    this.push(new CharacterSelectState(this.assets));
  }

  pushDeathScreen(partyMembers, dungeonName, floor) {
    this.push(new DeathScreenState(this.assets, partyMembers, dungeonName, floor));
  }

  pushVictoryScreen(rewards, partyMembers, dungeonName, floor) {
    this.push(new VictoryScreenState(this.assets, rewards, partyMembers, dungeonName, floor));
  }

  updateAndRender(layers, world, timestamp) {
    const current = this.peek();
    if (!current) return false;
    if (current.update) current.update(timestamp);
    current.render(layers, world);
    return true;
  }
}
