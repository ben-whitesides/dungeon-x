import { TavernState } from './states/tavern.js';
import { CombatState } from './states/combat.js';
import { CharacterCreateState } from './states/character-create.js';
import { ExploringState } from './states/exploring.js';

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

  pushCombat(enemies) {
    this.push(new CombatState(enemies, this.assets));
  }

  pushCharacterCreate() {
    this.push(new CharacterCreateState(this.assets));
  }

  pushExploring(fpRenderer, minimapRenderer, uiRenderer) {
    this.push(new ExploringState(fpRenderer, minimapRenderer, uiRenderer));
  }

  updateAndRender(layers, world) {
    const current = this.peek();
    if (!current) return false;
    current.render(layers, world);
    return true;
  }
}
