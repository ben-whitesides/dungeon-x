export class InputMapper {
  constructor(soundManager) {
    this.soundManager = soundManager;
    this._pendingEvent = null;
    this._onKeyDown = this._onKeyDown.bind(this);
  }

  attach() {
    document.addEventListener('keydown', this._onKeyDown);
  }

  detach() {
    document.removeEventListener('keydown', this._onKeyDown);
  }

  _onKeyDown(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    // We capture all keys and let states decide what to do
    // Preventing default for most keys to avoid scrolling/etc
    const capturedKeys = [
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE',
      'Space', 'Enter', 'Escape', 'Backspace',
      'KeyP', 'KeyB', 'KeyV', 'KeyG', 'KeyF', 'KeyI', 'KeyC',
      'Digit1', 'Digit2', 'Digit3', 'Digit4'
    ];

    if (capturedKeys.includes(e.code)) {
      e.preventDefault();
      this._pendingEvent = { code: e.code, key: e.key };
    }
  }

  consume() {
    const ev = this._pendingEvent;
    this._pendingEvent = null;
    return ev;
  }
}
