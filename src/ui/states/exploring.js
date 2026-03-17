import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../core/constants.js';
import {
  MoveForwardCommand, MoveBackwardCommand,
  StrafeLeftCommand, StrafeRightCommand,
  TurnLeftCommand, TurnRightCommand
} from '../../commands/move-command.js';
import { InteractCommand } from '../../commands/interact-command.js';

export class ExploringState {
  constructor(fpRenderer, minimapRenderer, uiRenderer) {
    this.fpRenderer = fpRenderer;
    this.minimapRenderer = minimapRenderer;
    this.uiRenderer = uiRenderer;
  }

  handleInput(input, world) {
    // Escape exits dungeon and returns to tavern
    if (input.code === 'Escape') {
      world.exitDungeon(false);
      world.stateStack.pop(); // Remove ExploringState
      world.stateStack.pushTavern(world.renderers || {});
      return true;
    }

    const EXPLORING_MAP = {
      'ArrowUp':    () => new MoveForwardCommand(),
      'KeyW':       () => new MoveForwardCommand(),
      'ArrowDown':  () => new MoveBackwardCommand(),
      'KeyS':       () => new MoveBackwardCommand(),
      'ArrowLeft':  () => new TurnLeftCommand(),
      'KeyA':       () => new StrafeLeftCommand(),
      'ArrowRight': () => new TurnRightCommand(),
      'KeyD':       () => new StrafeRightCommand(),
      'KeyQ':       () => new TurnLeftCommand(),
      'KeyE':       () => new TurnRightCommand(),
      'Space':      () => new InteractCommand(),
      'KeyI':       () => ({ type: 'inventory' }),
    };

    const factory = EXPLORING_MAP[input.code];
    if (factory) {
      const cmd = factory();
      if (cmd.execute) {
        cmd.execute(world);
        // If movement triggered combat, CombatState will be pushed. 
        // Return true to signal we handled the input and need render.
        return true;
      } else {
        // Handle non-command inputs if needed
        if (cmd.type === 'inventory') {
          // world.stateStack.pushInventory(); // Placeholder for future
          return true;
        }
      }
    }
    return false;
  }

  render(layers, world) {
    // 1. Render First-Person view to 'floor' layer
    if (layers.floor) {
      this.fpRenderer.render(
        layers.floor, world.tileMap,
        world.player.x, world.player.y, world.player.facing
      );
    }

    // 2. Render UI elements to 'ui' layer
    const uiCtx = layers.ui;
    if (uiCtx) {
      uiCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // Minimap
      this.minimapRenderer.render(uiCtx, world.tileMap, world.player.x, world.player.y);

      // Party HUD
      this.uiRenderer.renderPartyHUD(uiCtx, world.party.getMembers());
      
      // Virtual Gamepad
      this.uiRenderer.renderVirtualGamepad(uiCtx);

      // Status text
      uiCtx.fillStyle = '#0f0';
      uiCtx.font = '14px monospace';
      const dirs = ['N', 'E', 'S', 'W'];
      uiCtx.fillText(
        `Floor ${world.floor} | (${world.player.x}, ${world.player.y}) Facing ${dirs[world.player.facing]}`,
        10, CANVAS_HEIGHT - 10
      );
    }
  }

  isDone() {
    return false;
  }
}
