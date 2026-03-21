import { CANVAS_WIDTH, CANVAS_HEIGHT, TILE, DIR_VECTOR } from '../../core/constants.js';
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
    this._interactMessage = null;
    this._interactMessageTimer = 0;
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
      'Enter':      () => new InteractCommand(),
      'KeyI':       () => ({ type: 'inventory' }),
    };

    const factory = EXPLORING_MAP[input.code];
    if (factory) {
      const cmd = factory();
      if (cmd.execute) {
        const result = cmd.execute(world);
        // Show interaction feedback
        this._checkInteractFeedback(world);
        return true;
      } else {
        if (cmd.type === 'inventory') {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Check the tile in front of the player and set interaction hint message.
   */
  _checkInteractFeedback(world) {
    const [dx, dy] = DIR_VECTOR[world.player.facing];
    const tx = world.player.x + dx;
    const ty = world.player.y + dy;
    const tile = world.tileMap.get(tx, ty);

    if (tile === TILE.TORCH_LIT) {
      this._showMessage('Torch (lit) - SPACE to extinguish');
    } else if (tile === TILE.TORCH_UNLIT) {
      this._showMessage('Torch (unlit) - SPACE to light');
    } else if (tile === TILE.LEVER) {
      this._showMessage('Lever - SPACE to pull');
    } else if (tile === TILE.GATE_CLOSED) {
      this._showMessage('Portcullis blocked. Find a lever.');
    } else if (tile === TILE.STAIRS_DOWN) {
      this._showMessage('Stairs down - SPACE to descend');
    } else if (tile === TILE.STAIRS_UP) {
      this._showMessage('Stairs up - SPACE to ascend');
    }
  }

  _showMessage(msg) {
    this._interactMessage = msg;
    this._interactMessageTimer = 120; // ~2 seconds at 60fps
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

      // Clear + render virtual gamepad with touch zones
      if (world.input && world.input.touch) {
        world.input.touch.clearHitZones();
      }
      this.uiRenderer.renderVirtualGamepad(uiCtx, world.input && world.input.touch);

      // Interaction hint
      if (this._interactMessageTimer > 0) {
        this._interactMessageTimer--;
        const alpha = Math.min(1, this._interactMessageTimer / 30);
        uiCtx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
        uiCtx.font = '14px monospace';
        uiCtx.textAlign = 'center';
        uiCtx.fillText(this._interactMessage, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 50);
        uiCtx.textAlign = 'left';
      }

      // Check facing tile for interact prompt
      const [dx, dy] = DIR_VECTOR[world.player.facing];
      const fx = world.player.x + dx;
      const fy = world.player.y + dy;
      const facingTile = world.tileMap.get(fx, fy);
      const interactTiles = [TILE.TORCH_LIT, TILE.TORCH_UNLIT, TILE.LEVER, TILE.GATE_CLOSED, TILE.STAIRS_DOWN, TILE.STAIRS_UP];
      if (interactTiles.includes(facingTile)) {
        // Show interact prompt
        uiCtx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        uiCtx.fillRect(CANVAS_WIDTH / 2 - 100, CANVAS_HEIGHT - 72, 200, 24);
        uiCtx.fillStyle = '#FFD700';
        uiCtx.font = '12px monospace';
        uiCtx.textAlign = 'center';
        uiCtx.fillText('[SPACE/TAP] Interact', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 55);
        uiCtx.textAlign = 'left';

        // Touch zone for interact prompt
        if (world.input && world.input.touch) {
          world.input.touch.registerHitZone(CANVAS_WIDTH / 2 - 100, CANVAS_HEIGHT - 72, 200, 24, 'Space');
        }
      }

      // Status text
      uiCtx.fillStyle = '#0f0';
      uiCtx.font = '14px monospace';
      const dirs = ['N', 'E', 'S', 'W'];
      uiCtx.fillText(
        `Floor ${world.floor} | (${world.player.x}, ${world.player.y}) Facing ${dirs[world.player.facing]}`,
        10, CANVAS_HEIGHT - 10
      );

      // Gold display
      uiCtx.fillStyle = '#FFD700';
      uiCtx.font = '13px monospace';
      uiCtx.fillText(`Gold: ${world.gold}`, 10, CANVAS_HEIGHT - 28);
    }
  }

  isDone() {
    return false;
  }
}
