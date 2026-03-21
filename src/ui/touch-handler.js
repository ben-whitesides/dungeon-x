/**
 * Touch handler — translates touch events into the same key codes
 * the game already uses. Supports tap zones, swipe gestures, and
 * hit-target registration from render passes.
 */
export class TouchHandler {
  constructor() {
    this._pendingCode = null;
    this._touchStart = null;
    this._hitZones = [];       // Registered by render pass each frame
    this._onScreenButtons = []; // Persistent on-screen controls
    this._swipeThreshold = 40;
    this._tapTimeout = 300;
  }

  attach(canvas) {
    this._canvas = canvas;
    this._rect = canvas.getBoundingClientRect();

    canvas.addEventListener('touchstart', (e) => this._onTouchStart(e), { passive: false });
    canvas.addEventListener('touchend', (e) => this._onTouchEnd(e), { passive: false });
    canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

    // Mouse click support for desktop
    canvas.addEventListener('mousedown', (e) => {
      const pos = this._getMousePos(e);
      this._touchStart = { x: e.clientX, y: e.clientY, time: Date.now(), canvasPos: pos };
    });
    canvas.addEventListener('mouseup', (e) => {
      if (!this._touchStart) return;
      const pos = this._touchStart.canvasPos;

      // Check hit zones (registered by render pass)
      for (const zone of this._hitZones) {
        if (pos.x >= zone.x && pos.x <= zone.x + zone.w &&
            pos.y >= zone.y && pos.y <= zone.y + zone.h) {
          this._pendingCode = zone.code;
          this._touchStart = null;
          return;
        }
      }
      // Check on-screen buttons
      for (const btn of this._onScreenButtons) {
        if (pos.x >= btn.x && pos.x <= btn.x + btn.w &&
            pos.y >= btn.y && pos.y <= btn.y + btn.h) {
          this._pendingCode = btn.code;
          this._touchStart = null;
          return;
        }
      }
      this._touchStart = null;
      // No fallback for mouse — only registered zones respond
    });

    // Recalc rect on resize/scroll
    window.addEventListener('resize', () => {
      this._rect = canvas.getBoundingClientRect();
    });
  }

  _getMousePos(e) {
    const rect = this._rect;
    const scaleX = this._canvas.width / rect.width;
    const scaleY = this._canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  /** Called each frame before render to clear old hit zones */
  clearHitZones() {
    this._hitZones = [];
  }

  /** Register a tappable zone from the render pass */
  registerHitZone(x, y, w, h, code) {
    this._hitZones.push({ x, y, w, h, code });
  }

  /** Set persistent on-screen button zones (for dungeon nav etc) */
  setOnScreenButtons(buttons) {
    this._onScreenButtons = buttons;
  }

  consume() {
    const code = this._pendingCode;
    this._pendingCode = null;
    if (code) return { code, key: code };
    return null;
  }

  _getCanvasPos(touch) {
    const rect = this._rect;
    const scaleX = this._canvas.width / rect.width;
    const scaleY = this._canvas.height / rect.height;
    return {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY
    };
  }

  _onTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    this._touchStart = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
      canvasPos: this._getCanvasPos(touch)
    };
  }

  _onTouchEnd(e) {
    e.preventDefault();
    if (!this._touchStart) return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - this._touchStart.x;
    const dy = touch.clientY - this._touchStart.y;
    const dt = Date.now() - this._touchStart.time;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Swipe detection
    if (absDx > this._swipeThreshold || absDy > this._swipeThreshold) {
      if (absDx > absDy) {
        // Horizontal swipe
        this._pendingCode = dx > 0 ? 'ArrowRight' : 'ArrowLeft';
      } else {
        // Vertical swipe
        if (dy > 0) {
          this._pendingCode = 'Escape'; // Swipe down = back
        } else {
          this._pendingCode = 'ArrowUp'; // Swipe up = forward/up
        }
      }
      this._touchStart = null;
      return;
    }

    // Tap — check hit zones first (from render pass)
    const pos = this._touchStart.canvasPos;

    for (const zone of this._hitZones) {
      if (pos.x >= zone.x && pos.x <= zone.x + zone.w &&
          pos.y >= zone.y && pos.y <= zone.y + zone.h) {
        this._pendingCode = zone.code;
        this._touchStart = null;
        return;
      }
    }

    // Check on-screen buttons
    for (const btn of this._onScreenButtons) {
      if (pos.x >= btn.x && pos.x <= btn.x + btn.w &&
          pos.y >= btn.y && pos.y <= btn.y + btn.h) {
        this._pendingCode = btn.code;
        this._touchStart = null;
        return;
      }
    }

    // Fallback: zone-based tap (split canvas into regions)
    const cw = this._canvas.width;
    const ch = this._canvas.height;

    // Bottom 60px = action bar taps
    if (pos.y > ch - 60) {
      if (pos.x < cw / 3) {
        this._pendingCode = 'Escape';
      } else if (pos.x > cw * 2 / 3) {
        this._pendingCode = 'KeyP'; // Shop
      } else {
        this._pendingCode = 'Space'; // Recruit / Interact
      }
      this._touchStart = null;
      return;
    }

    // No fallback — if no zone matched, ignore the tap
    this._touchStart = null;
  }
}
