import {
import { InteractCommand } from './interact-command.js';
  MoveForwardCommand, MoveBackwardCommand,
  StrafeLeftCommand, StrafeRightCommand,
  TurnLeftCommand, TurnRightCommand
} from '../commands/move-command.js';

/**
 * Maps keyboard input to Command objects.
 */
export class InputMapper {
  constructor(soundManager) {
    this.soundManager = soundManager;
  constructor() {
    this._pendingCommand = null;
    this._keyMap = {
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
      'Space':     () => new InteractCommand(),
      'KeyS':      () => ({ type: 'shop' }), // Enter shop from party select
      'KeyB':      () => ({ type: 'buy' }), // Buy item
      'KeyV':      () => ({ type: 'sell' }), // Sell item
      'Enter':     () => ({ type: 'select_dungeon' }), // Select dungeon in dungeon_select mode
    };

    this._onKeyDown = this._onKeyDown.bind(this);
  }

  attach() {
    document.addEventListener('keydown', this._onKeyDown);
  }

  detach() {
    document.removeEventListener('keydown', this._onKeyDown);
  }

  _onKeyDown(e) {
    const factory = this._keyMap[e.code];
    if (factory) {
      e.preventDefault();
      this._pendingCommand = factory();
    }
  }

  consume() {
    const cmd = this._pendingCommand;
    this._pendingCommand = null;
    return cmd;
  }
}
