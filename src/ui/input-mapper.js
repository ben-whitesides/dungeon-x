import { TouchHandler } from './touch-handler.js';

export class InputMapper {
  constructor(soundManager) {
    this.soundManager = soundManager;
    this._pendingEvent = null;
    this._onKeyDown = this._onKeyDown.bind(this);
    this.touch = new TouchHandler();
    this.captureAll = false; // Set true during name entry to capture all keys
  }

  attach() {
    document.addEventListener('keydown', this._onKeyDown);

    // Attach touch to the top-most canvas (ui layer)
    const canvases = document.querySelectorAll('canvas[data-layer]');
    const uiCanvas = Array.from(canvases).find(c => c.dataset.layer === 'ui') || canvases[canvases.length - 1];
    if (uiCanvas) {
      this.touch.attach(uiCanvas);
    }
  }

  detach() {
    document.removeEventListener('keydown', this._onKeyDown);
  }

  _onKeyDown(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    const capturedKeys = [
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE',
      'Space', 'Enter', 'Escape', 'Backspace',
      'KeyP', 'KeyB', 'KeyV', 'KeyG', 'KeyF', 'KeyI', 'KeyC', 'KeyN',
      'Digit1', 'Digit2', 'Digit3', 'Digit4'
    ];

    if (capturedKeys.includes(e.code) || this.captureAll) {
      e.preventDefault();
      this._pendingEvent = { code: e.code, key: e.key };
    }
  }

  consume() {
    // Keyboard takes priority, then touch
    const ev = this._pendingEvent;
    this._pendingEvent = null;
    if (ev) return ev;

    return this.touch.consume();
  }
}
