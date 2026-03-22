import { GameSave } from '../../core/game-save.js';

/**
 * TitleScreenState — Main menu before the game world loads.
 * CONTINUE (if save exists) or NEW GAME.
 * Dark medieval aesthetic with fire particles and the DX logo.
 */
export class TitleScreenState {
  constructor(assets) {
    this.assets = assets;
    this.hasSave = false;
    this.selectedButton = 0; // 0 = CONTINUE (or NEW GAME if no save), 1 = NEW GAME
    this.phase = 0;
    this.fadeIn = 0;
    this.particles = [];
    this._done = false;
    this._action = null; // 'continue' or 'new_game'
    this.animates = true; // Continuous animation for fire particles

    // Check for existing save
    const saveData = GameSave.load();
    this.hasSave = !!(saveData && saveData.heroCharacter);

    // If no save, only one button — NEW GAME
    if (!this.hasSave) {
      this.selectedButton = 0;
    }

    // Seed fire particles
    for (let i = 0; i < 40; i++) {
      this.particles.push({
        x: 0.3 + Math.random() * 0.4,  // Centered horizontally (ratio)
        y: 0.85 + Math.random() * 0.1,  // Start near bottom
        vx: (Math.random() - 0.5) * 0.001,
        vy: -(0.001 + Math.random() * 0.003),
        life: Math.random(),
        maxLife: 0.5 + Math.random() * 0.5,
        size: 1 + Math.random() * 3,
      });
    }
  }

  isDone() { return this._done; }
  getAction() { return this._action; }

  update(timestamp) {
    this.phase += 0.02;
    if (this.fadeIn < 1) this.fadeIn = Math.min(1, this.fadeIn + 0.02);

    // Animate fire particles
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.life += 0.008;
      if (p.life >= p.maxLife) {
        // Reset particle
        p.x = 0.3 + Math.random() * 0.4;
        p.y = 0.85 + Math.random() * 0.1;
        p.life = 0;
        p.maxLife = 0.5 + Math.random() * 0.5;
        p.size = 1 + Math.random() * 3;
        p.vx = (Math.random() - 0.5) * 0.001;
        p.vy = -(0.001 + Math.random() * 0.003);
      }
    }
  }

  handleInput(input, world) {
    const code = input.code;
    const buttonCount = this.hasSave ? 2 : 1;

    if (code === 'ArrowUp' || code === 'KeyW') {
      this.selectedButton = (this.selectedButton - 1 + buttonCount) % buttonCount;
      return true;
    }
    if (code === 'ArrowDown' || code === 'KeyS') {
      this.selectedButton = (this.selectedButton + 1) % buttonCount;
      return true;
    }

    if (code === 'Enter' || code === 'Space') {
      if (this.hasSave && this.selectedButton === 0) {
        this._action = 'continue';
      } else {
        this._action = 'new_game';
      }
      this._done = true;
      return true;
    }

    // Touch: button codes
    if (code === '_title_continue') {
      this._action = 'continue';
      this._done = true;
      return true;
    }
    if (code === '_title_new_game') {
      this._action = 'new_game';
      this._done = true;
      return true;
    }

    return false;
  }

  render(layers, world) {
    const ctx = layers.ui || layers;
    ctx.save();

    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    const alpha = this.fadeIn;

    // Clear touch hit zones each frame
    if (world.input && world.input.touch) {
      world.input.touch.clearHitZones();
    }

    // === Dark background ===
    ctx.fillStyle = '#080604';
    ctx.fillRect(0, 0, W, H);

    // Subtle stone texture
    const seed = (x, y) => Math.abs(Math.sin(x * 127.1 + y * 311.7) * 43758.5453 % 1);
    for (let y = 0; y < H; y += 24) {
      for (let x = 0; x < W; x += 32) {
        const v = seed(x, y) * 8;
        ctx.fillStyle = `rgba(${12 + v}, ${10 + v}, ${8 + v}, 0.5)`;
        ctx.fillRect(x, y, 32, 24);
      }
    }

    // Warm glow from below (fire pit)
    const fireGlow = ctx.createRadialGradient(W / 2, H * 0.85, 10, W / 2, H * 0.85, W * 0.5);
    fireGlow.addColorStop(0, `rgba(255, 120, 30, ${0.12 * alpha})`);
    fireGlow.addColorStop(0.5, `rgba(255, 80, 10, ${0.06 * alpha})`);
    fireGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = fireGlow;
    ctx.fillRect(0, 0, W, H);

    // === Fire particles ===
    for (const p of this.particles) {
      const progress = p.life / p.maxLife;
      const a = (1 - progress) * 0.8 * alpha;
      const r = 255;
      const g = 120 + (1 - progress) * 100;
      const b = 20 + (1 - progress) * 30;
      ctx.fillStyle = `rgba(${r}, ${g | 0}, ${b | 0}, ${a})`;
      ctx.beginPath();
      ctx.arc(p.x * W, p.y * H, p.size * (1 - progress * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }

    // === Title: DUNGEON X ===
    const titleY = H * 0.22;

    // Shadow
    ctx.textAlign = 'center';
    ctx.font = 'bold 52px monospace';
    ctx.fillStyle = `rgba(0, 0, 0, ${0.8 * alpha})`;
    ctx.fillText('DUNGEON X', W / 2 + 3, titleY + 3);

    // Main title — gold
    ctx.fillStyle = `rgba(212, 175, 55, ${alpha})`;
    ctx.fillText('DUNGEON X', W / 2, titleY);

    // Subtle glow on title
    ctx.shadowColor = 'rgba(255, 180, 50, 0.4)';
    ctx.shadowBlur = 20;
    ctx.fillText('DUNGEON X', W / 2, titleY);
    ctx.shadowBlur = 0;

    // Subtitle
    ctx.font = '14px monospace';
    ctx.fillStyle = `rgba(140, 115, 75, ${0.7 * alpha})`;
    ctx.fillText('A Dungeon Crawler Roguelike', W / 2, titleY + 30);

    // === Decorative line ===
    const lineY = titleY + 50;
    ctx.strokeStyle = `rgba(140, 115, 75, ${0.3 * alpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W * 0.25, lineY);
    ctx.lineTo(W * 0.75, lineY);
    ctx.stroke();
    // Diamond center
    ctx.fillStyle = `rgba(212, 175, 55, ${0.5 * alpha})`;
    ctx.beginPath();
    ctx.moveTo(W / 2, lineY - 5);
    ctx.lineTo(W / 2 + 5, lineY);
    ctx.lineTo(W / 2, lineY + 5);
    ctx.lineTo(W / 2 - 5, lineY);
    ctx.closePath();
    ctx.fill();

    // === Menu buttons ===
    const btnW = 200;
    const btnH = 48;
    const btnGap = 16;
    const buttons = [];

    if (this.hasSave) {
      buttons.push({ label: 'CONTINUE', code: '_title_continue' });
    }
    buttons.push({ label: 'NEW GAME', code: '_title_new_game' });

    const totalH = buttons.length * btnH + (buttons.length - 1) * btnGap;
    const startY = H * 0.52;

    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i];
      const btnX = (W - btnW) / 2;
      const btnY = startY + i * (btnH + btnGap);
      const isSelected = i === this.selectedButton;

      // Button background
      if (isSelected) {
        ctx.fillStyle = `rgba(60, 40, 20, ${0.9 * alpha})`;
      } else {
        ctx.fillStyle = `rgba(30, 20, 10, ${0.7 * alpha})`;
      }
      ctx.fillRect(btnX, btnY, btnW, btnH);

      // Button border
      ctx.strokeStyle = isSelected
        ? `rgba(255, 215, 0, ${0.9 * alpha})`
        : `rgba(100, 80, 50, ${0.5 * alpha})`;
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.strokeRect(btnX, btnY, btnW, btnH);

      // Selection indicator
      if (isSelected) {
        // Arrow indicator
        ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
        ctx.font = '16px monospace';
        ctx.textAlign = 'right';
        ctx.fillText('▸', btnX - 8, btnY + btnH / 2 + 5);
        ctx.textAlign = 'left';
        ctx.fillText('◂', btnX + btnW + 8, btnY + btnH / 2 + 5);
      }

      // Button text
      ctx.textAlign = 'center';
      ctx.font = `bold 18px monospace`;
      ctx.fillStyle = isSelected
        ? `rgba(255, 215, 0, ${alpha})`
        : `rgba(180, 160, 120, ${0.8 * alpha})`;
      ctx.fillText(btn.label, W / 2, btnY + btnH / 2 + 6);

      // Touch zone
      if (world.input && world.input.touch) {
        world.input.touch.registerHitZone(btnX, btnY, btnW, btnH, btn.code);
      }
    }

    // === Footer ===
    ctx.font = '10px monospace';
    ctx.fillStyle = `rgba(100, 80, 60, ${0.5 * alpha})`;
    ctx.textAlign = 'center';
    ctx.fillText('Arrow keys to navigate  ·  Enter to select', W / 2, H - 30);

    // Version
    ctx.fillStyle = `rgba(80, 60, 40, ${0.3 * alpha})`;
    ctx.fillText('v0.5.0', W / 2, H - 14);

    ctx.textAlign = 'left';
    ctx.restore();
  }
}
