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
    // Clear ALL layers to prevent tavern/other state bleed-through
    for (const name of Object.keys(layers)) {
      if (layers[name] && layers[name].clearRect) {
        layers[name].clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }
    }

    // 1. Render First-Person view to 'floor' layer (full canvas, black bg)
    if (layers.floor) {
      layers.floor.fillStyle = '#08080e';
      layers.floor.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      this.fpRenderer.render(
        layers.floor, world.tileMap,
        world.player.x, world.player.y, world.player.facing
      );
    }

    // 2. Render UI elements to 'ui' layer
    const uiCtx = layers.ui;
    if (uiCtx) {

      // Dungeon info bar (top center)
      this.uiRenderer.renderDungeonInfo(uiCtx, world.dungeonName, world.floor, world.turnCount);

      // Minimap (with facing direction and floor for level label)
      this.minimapRenderer.render(uiCtx, world.tileMap, world.player.x, world.player.y, world.player.facing, world.floor);

      // Party HUD
      this.uiRenderer.renderPartyHUD(uiCtx, world.party.getMembers());

      // Clear + render virtual gamepad with touch zones
      if (world.input && world.input.touch) {
        world.input.touch.clearHitZones();
      }
      this.uiRenderer.renderVirtualGamepad(uiCtx, world.input && world.input.touch);

      // Action hints (keyboard controls, hidden on touch)
      this.uiRenderer.renderActionHints(uiCtx);

      // Interaction hint
      if (this._interactMessageTimer > 0) {
        this._interactMessageTimer--;
        const alpha = Math.min(1, this._interactMessageTimer / 30);
        uiCtx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
        uiCtx.font = 'bold 14px serif';
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
        // Show interact prompt — parchment style
        uiCtx.fillStyle = 'rgba(12, 10, 8, 0.75)';
        uiCtx.fillRect(CANVAS_WIDTH / 2 - 100, CANVAS_HEIGHT - 72, 200, 24);
        uiCtx.strokeStyle = '#8a7a4a';
        uiCtx.lineWidth = 1;
        uiCtx.strokeRect(CANVAS_WIDTH / 2 - 100, CANVAS_HEIGHT - 72, 200, 24);
        uiCtx.fillStyle = '#FFD700';
        uiCtx.font = 'bold 12px serif';
        uiCtx.textAlign = 'center';
        uiCtx.fillText('[SPACE/TAP] Interact', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 55);
        uiCtx.textAlign = 'left';

        // Touch zone for interact prompt
        if (world.input && world.input.touch) {
          world.input.touch.registerHitZone(CANVAS_WIDTH / 2 - 100, CANVAS_HEIGHT - 72, 200, 24, 'Space');
        }
      }

      // Status text — medieval style
      uiCtx.fillStyle = '#8a7a4a';
      uiCtx.font = '12px serif';
      const dirs = ['N', 'E', 'S', 'W'];
      uiCtx.fillText(
        `(${world.player.x}, ${world.player.y}) Facing ${dirs[world.player.facing]}`,
        10, CANVAS_HEIGHT - 10
      );

      // Gold display
      uiCtx.fillStyle = '#FFD700';
      uiCtx.font = 'bold 13px serif';
      uiCtx.fillText(`Gold: ${world.gold}`, 10, CANVAS_HEIGHT - 28);
    }
  }

  isDone() {
    return false;
  }
}
