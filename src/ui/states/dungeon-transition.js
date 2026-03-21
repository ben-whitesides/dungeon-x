import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../core/constants.js';

/**
 * DungeonTransitionState — Brief "Entering the [Dungeon Name]..." screen.
 * Fades in text, holds for ~2 seconds, then auto-transitions to exploring.
 */
export class DungeonTransitionState {
  constructor(dungeonName, onComplete) {
    this.dungeonName = dungeonName;
    this.onComplete = onComplete;
    this.elapsed = 0;
    this.duration = 2000; // 2 seconds
    this.animates = true;
    this._lastTimestamp = 0;
    this._done = false;
    this.alpha = 0;
  }

  update(timestamp) {
    if (!this._lastTimestamp) this._lastTimestamp = timestamp;
    const dt = timestamp - this._lastTimestamp;
    this._lastTimestamp = timestamp;

    this.elapsed += dt;

    // Fade in over first 500ms
    if (this.elapsed < 500) {
      this.alpha = this.elapsed / 500;
    } else if (this.elapsed < this.duration - 300) {
      this.alpha = 1;
    } else {
      // Fade out last 300ms
      this.alpha = Math.max(0, (this.duration - this.elapsed) / 300);
    }

    if (this.elapsed >= this.duration && !this._done) {
      this._done = true;
      if (this.onComplete) this.onComplete();
    }
  }

  handleInput(input, world) {
    // Skip transition on any key/tap
    if (!this._done && this.elapsed > 300) {
      this._done = true;
      if (this.onComplete) this.onComplete();
      return true;
    }
    return true; // Consume all input
  }

  render(layers, world) {
    const ctx = layers.ui || layers;
    ctx.save();

    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Black background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    // Dungeon name
    ctx.globalAlpha = this.alpha;

    ctx.textAlign = 'center';
    ctx.fillStyle = '#886B22';
    ctx.font = '14px monospace';
    ctx.fillText('Entering...', W / 2, H / 2 - 30);

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 24px monospace';
    ctx.fillText(this.dungeonName, W / 2, H / 2 + 5);

    ctx.fillStyle = '#666';
    ctx.font = '12px monospace';
    ctx.fillText('Prepare yourself.', W / 2, H / 2 + 35);

    // Decorative line
    ctx.fillStyle = `rgba(136, 107, 34, ${this.alpha * 0.5})`;
    ctx.fillRect(W / 2 - 100, H / 2 + 15, 200, 1);

    ctx.fillStyle = '#555';
    ctx.font = '11px monospace';
    ctx.fillText('Press any key to skip', W / 2, H - 30);

    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
    ctx.restore();
  }

  isDone() {
    return this._done;
  }
}
