import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../core/constants.js';

/**
 * DungeonTransitionState — Atmospheric "Descending into [Dungeon]" screen.
 * Dark stone corridor feel with torchlight, dust particles, and stone arch.
 * Fades in, holds ~2.5 seconds, auto-transitions to exploring.
 */
export class DungeonTransitionState {
  constructor(dungeonName, onComplete) {
    this.dungeonName = dungeonName;
    this.onComplete = onComplete;
    this.elapsed = 0;
    this.duration = 2500;
    this.animates = true;
    this._lastTimestamp = 0;
    this._done = false;
    this.alpha = 0;
    this.phase = 0;

    // Pre-generate dust particles
    this.particles = [];
    for (let i = 0; i < 30; i++) {
      this.particles.push({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.0005,
        vy: 0.0005 + Math.random() * 0.001,
        size: 0.5 + Math.random() * 2,
        alpha: 0.1 + Math.random() * 0.3,
      });
    }
  }

  update(timestamp) {
    if (!this._lastTimestamp) this._lastTimestamp = timestamp;
    const dt = timestamp - this._lastTimestamp;
    this._lastTimestamp = timestamp;

    this.elapsed += dt;
    this.phase += 0.03;

    // Fade in over first 600ms
    if (this.elapsed < 600) {
      this.alpha = this.elapsed / 600;
    } else if (this.elapsed < this.duration - 400) {
      this.alpha = 1;
    } else {
      this.alpha = Math.max(0, (this.duration - this.elapsed) / 400);
    }

    // Animate particles
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y > 1) { p.y = 0; p.x = Math.random(); }
      if (p.x < 0 || p.x > 1) p.vx *= -1;
    }

    if (this.elapsed >= this.duration && !this._done) {
      this._done = true;
      if (this.onComplete) this.onComplete();
    }
  }

  handleInput(input, world) {
    if (!this._done && this.elapsed > 400) {
      this._done = true;
      if (this.onComplete) this.onComplete();
      return true;
    }
    return true;
  }

  render(layers, world) {
    const ctx = layers.ui || layers;
    ctx.save();

    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    const a = this.alpha;

    // Dark stone background
    ctx.fillStyle = '#060504';
    ctx.fillRect(0, 0, W, H);

    // Subtle stone texture
    const seed = (x, y) => Math.abs(Math.sin(x * 127.1 + y * 311.7) * 43758.5453 % 1);
    for (let y = 0; y < H; y += 20) {
      for (let x = 0; x < W; x += 28) {
        const v = seed(x, y) * 6;
        ctx.fillStyle = `rgba(${8 + v}, ${7 + v}, ${6 + v}, ${0.4 * a})`;
        ctx.fillRect(x, y, 28, 20);
      }
    }

    // Stone archway frame
    const archCX = W / 2;
    const archW = 280;
    const archTop = H * 0.15;
    const archBot = H * 0.75;

    // Left pillar
    ctx.fillStyle = `rgba(35, 28, 20, ${0.8 * a})`;
    ctx.fillRect(archCX - archW / 2 - 30, archTop, 30, archBot - archTop);
    ctx.fillStyle = `rgba(45, 35, 25, ${0.6 * a})`;
    ctx.fillRect(archCX - archW / 2 - 28, archTop, 5, archBot - archTop);
    // Right pillar
    ctx.fillStyle = `rgba(35, 28, 20, ${0.8 * a})`;
    ctx.fillRect(archCX + archW / 2, archTop, 30, archBot - archTop);
    ctx.fillStyle = `rgba(25, 18, 12, ${0.6 * a})`;
    ctx.fillRect(archCX + archW / 2 + 25, archTop, 5, archBot - archTop);

    // Arch top (curved)
    ctx.strokeStyle = `rgba(45, 35, 25, ${0.8 * a})`;
    ctx.lineWidth = 28;
    ctx.beginPath();
    ctx.arc(archCX, archTop + 40, archW / 2 + 15, Math.PI, Math.PI * 2);
    ctx.stroke();

    // Dark interior (the descent)
    const interiorGrad = ctx.createRadialGradient(archCX, H * 0.5, 10, archCX, H * 0.5, archW * 0.6);
    interiorGrad.addColorStop(0, `rgba(8, 6, 4, ${0.3 * a})`);
    interiorGrad.addColorStop(0.5, `rgba(4, 3, 2, ${0.6 * a})`);
    interiorGrad.addColorStop(1, `rgba(0, 0, 0, ${0.9 * a})`);
    ctx.fillStyle = interiorGrad;
    ctx.fillRect(archCX - archW / 2, archTop + 40, archW, archBot - archTop - 40);

    // Torch on left pillar
    const torchLX = archCX - archW / 2 - 15;
    const torchLY = archTop + (archBot - archTop) * 0.3;
    const flickL = Math.sin(this.phase * 3) * 3;
    ctx.fillStyle = `rgba(255, 160, 40, ${0.7 * a})`;
    ctx.beginPath();
    ctx.ellipse(torchLX, torchLY - 8, 5, 10 + flickL, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255, 230, 80, ${0.8 * a})`;
    ctx.beginPath();
    ctx.ellipse(torchLX, torchLY - 6, 3, 6 + flickL * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Torch glow
    const tGlowL = ctx.createRadialGradient(torchLX, torchLY, 3, torchLX, torchLY, 80);
    tGlowL.addColorStop(0, `rgba(255, 140, 30, ${0.15 * a})`);
    tGlowL.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = tGlowL;
    ctx.fillRect(torchLX - 80, torchLY - 80, 160, 160);

    // Torch on right pillar
    const torchRX = archCX + archW / 2 + 15;
    const flickR = Math.sin(this.phase * 3 + 1.5) * 3;
    ctx.fillStyle = `rgba(255, 160, 40, ${0.7 * a})`;
    ctx.beginPath();
    ctx.ellipse(torchRX, torchLY - 8, 5, 10 + flickR, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255, 230, 80, ${0.8 * a})`;
    ctx.beginPath();
    ctx.ellipse(torchRX, torchLY - 6, 3, 6 + flickR * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    const tGlowR = ctx.createRadialGradient(torchRX, torchLY, 3, torchRX, torchLY, 80);
    tGlowR.addColorStop(0, `rgba(255, 140, 30, ${0.15 * a})`);
    tGlowR.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = tGlowR;
    ctx.fillRect(torchRX - 80, torchLY - 80, 160, 160);

    // Dust particles in torchlight
    for (const p of this.particles) {
      const px = p.x * W;
      const py = p.y * H;
      // Only visible near torches
      const distL = Math.sqrt((px - torchLX) ** 2 + (py - torchLY) ** 2);
      const distR = Math.sqrt((px - torchRX) ** 2 + (py - torchLY) ** 2);
      const nearLight = Math.min(distL, distR);
      if (nearLight < 120) {
        const brightness = (1 - nearLight / 120) * p.alpha * a;
        ctx.fillStyle = `rgba(255, 210, 140, ${brightness})`;
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Descending stone steps (inside archway)
    for (let i = 0; i < 6; i++) {
      const stepY = H * 0.55 + i * 22;
      const stepW = archW * 0.7 - i * 15;
      const stepX = archCX - stepW / 2;
      ctx.fillStyle = `rgba(${20 - i * 2}, ${16 - i * 2}, ${12 - i * 2}, ${(0.5 - i * 0.06) * a})`;
      ctx.fillRect(stepX, stepY, stepW, 4);
      ctx.fillStyle = `rgba(30, 24, 18, ${(0.3 - i * 0.04) * a})`;
      ctx.fillRect(stepX, stepY + 4, stepW, 16);
    }

    // Text
    ctx.textAlign = 'center';

    // "Descending into..."
    ctx.font = '14px monospace';
    ctx.fillStyle = `rgba(136, 107, 34, ${a * 0.8})`;
    ctx.fillText('Descending into...', W / 2, H * 0.25);

    // Dungeon name — large, gold
    ctx.font = 'bold 28px monospace';
    ctx.fillStyle = `rgba(0, 0, 0, ${a * 0.6})`;
    ctx.fillText(this.dungeonName, W / 2 + 2, H * 0.33 + 2);
    ctx.fillStyle = `rgba(255, 215, 0, ${a})`;
    ctx.fillText(this.dungeonName, W / 2, H * 0.33);

    // Decorative line
    ctx.fillStyle = `rgba(136, 107, 34, ${a * 0.4})`;
    ctx.fillRect(W / 2 - 120, H * 0.33 + 12, 240, 1);
    // Diamond
    ctx.fillStyle = `rgba(212, 175, 55, ${a * 0.5})`;
    ctx.beginPath();
    ctx.moveTo(W / 2, H * 0.33 + 8);
    ctx.lineTo(W / 2 + 4, H * 0.33 + 12);
    ctx.lineTo(W / 2, H * 0.33 + 16);
    ctx.lineTo(W / 2 - 4, H * 0.33 + 12);
    ctx.fill();

    // Flavor text
    ctx.font = '12px monospace';
    ctx.fillStyle = `rgba(120, 100, 70, ${a * 0.7})`;
    ctx.fillText('Steel your nerves. The darkness awaits.', W / 2, H * 0.40);

    // Skip prompt
    ctx.font = '10px monospace';
    ctx.fillStyle = `rgba(80, 70, 50, ${a * 0.4})`;
    ctx.fillText('Press any key to skip', W / 2, H - 25);

    // Vignette
    const vig = ctx.createRadialGradient(W / 2, H / 2, W * 0.2, W / 2, H / 2, W * 0.6);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, `rgba(0,0,0,${0.7 * a})`);
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    // Fade overlay
    if (a < 1) {
      ctx.fillStyle = `rgba(0, 0, 0, ${1 - a})`;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.textAlign = 'left';
    ctx.restore();
  }

  isDone() {
    return this._done;
  }
}
