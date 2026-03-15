export class EventBus {
  constructor() {
    this._listeners = new Map();
  }

  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    const cbs = this._listeners.get(event);
    if (!cbs) return;
    const idx = cbs.indexOf(callback);
    if (idx !== -1) cbs.splice(idx, 1);
  }

  emit(event, data) {
    const cbs = this._listeners.get(event);
    if (!cbs) return;
    for (const cb of cbs) {
      cb(data);
    }
  }

  clear() {
    this._listeners.clear();
  }
}
