import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../core/constants.js';
import { CLASS_DATA } from '../../character/class-data.js';

/**
 * DeathScreenState — Atmospheric party wipe / defeat screen.
 * Dark, somber atmosphere with blood-red vignette, falling ash particles,
 * fallen party portraits, and flavor text before returning to tavern.
 *
 * Constructor: new DeathScreenState(assets, partyMembers, dungeonName, floor)
 * Must have: isDone(), animates flag, keyboard + touch input handling.
 */

const FLAVOR_QUOTES = [
  'The darkness claims another party...',
  'Even the bravest fall in these depths.',
  'The tavern awaits... if you can find your way back.',
  'Your tale is not yet finished.',
  'The dungeon cares not for valor.',
  'Bones join bones in the deep.',
  'Rest now. The crypts will wait.',
  'Defeat is but a teacher with sharp lessons.',
];

export class DeathScreenState {
  constructor(assets, partyMembers, dungeonName, floor) {
    this.assets = assets;
    this.partyMembers = partyMembers || [];
    this.dungeonName = dungeonName || 'Unknown Dungeon';
    this.floor = floor || 1;

    this.animates = true;
    this._done = false;
    this._dismissed = false;
    this._elapsed = 0;
    this._lastTimestamp = 0;
    this._phase = 0;

    // Timing constants (ms)
    this._fadeInDuration = 500;
    this._buttonDelay = 2000;
    this._autoTransition = 8000;

    // Pick a random flavor quote
    this._quote = FLAVOR_QUOTES[Math.floor(Math.random() * FLAVOR_QUOTES.length)];

    // Pre-generate ash/ember particles
    this.particles = [];
    for (let i = 0; i < 40; i++) {
      this.particles.push({
        x: Math.random(),
        y: Math.random(),
        vy: 0.0003 + Math.random() * 0.0008,
        vx: (Math.random() - 0.5) * 0.0002,
        size: 1 + Math.random() * 2.5,
        alpha: 0.15 + Math.random() * 0.35,
        isEmber: Math.random() < 0.3,
      });
    }
  }

  update(timestamp) {
    if (!this._lastTimestamp) this._lastTimestamp = timestamp;
    const dt = timestamp - this._lastTimestamp;
    this._lastTimestamp = timestamp;

    this._elapsed += dt;
    this._phase += 0.02;

    // Animate particles
    for (const p of this.particles) {
      p.y += p.vy;
      p.x += p.vx + Math.sin(this._phase + p.x * 10) * 0.00005;
      if (p.y > 1.05) {
        p.y = -0.05;
        p.x = Math.random();
      }
    }

    // Auto-transition after timeout
    if (this._elapsed >= this._autoTransition && !this._done) {
      this._done = true;
      this._dismissed = true;
    }
  }

  handleInput(input, world) {
    // Only accept input after button delay
    if (this._elapsed >= this._buttonDelay && !this._done) {
      this._done = true;
      this._dismissed = true;
    }
    return true; // Consume all input
  }

  render(layers, world) {
    const ctx = layers.ui || layers;
    ctx.save();

    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Master fade-in alpha
    const fadeAlpha = Math.min(1, this._elapsed / this._fadeInDuration);

    // === 1. BLACK BACKGROUND ===
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);

    // === 2. BLOOD-RED VIGNETTE ===
    this._renderVignette(ctx, W, H, fadeAlpha);

    // === 3. ASH / EMBER PARTICLES ===
    this._renderParticles(ctx, W, H, fadeAlpha);

    // === 4. "DEFEAT" TEXT ===
    this._renderDefeatText(ctx, W, H, fadeAlpha);

    // === 5. DUNGEON INFO ===
    const infoY = H * 0.28;
    this._renderDungeonInfo(ctx, W, infoY, fadeAlpha);

    // === 6. FALLEN PARTY DISPLAY ===
    const partyY = H * 0.36;
    this._renderFallenParty(ctx, W, partyY, fadeAlpha);

    // === 7. FLAVOR TEXT ===
    const quoteY = H * 0.72;
    this._renderFlavorText(ctx, W, quoteY, fadeAlpha);

    // === 8. RETURN TO TAVERN BUTTON (after delay) ===
    if (this._elapsed >= this._buttonDelay) {
      const btnAlpha = Math.min(1, (this._elapsed - this._buttonDelay) / 600);
      this._renderReturnButton(ctx, W, H * 0.80, btnAlpha, world);
    }

    // === 9. FADE-IN OVERLAY (black fading out) ===
    if (fadeAlpha < 1) {
      ctx.fillStyle = `rgba(0, 0, 0, ${1 - fadeAlpha})`;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.restore();
  }

  // ─── RENDER HELPERS ────────────────────────────────────────────────

  _renderVignette(ctx, W, H, a) {
    // Red-tinged radial vignette from edges
    const vig = ctx.createRadialGradient(W / 2, H / 2, W * 0.15, W / 2, H / 2, W * 0.65);
    vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vig.addColorStop(0.6, `rgba(40, 0, 0, ${0.3 * a})`);
    vig.addColorStop(1, `rgba(80, 0, 0, ${0.5 * a})`);
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    // Subtle dim scene glow from center
    const glow = ctx.createRadialGradient(W / 2, H * 0.4, 0, W / 2, H * 0.4, W * 0.4);
    glow.addColorStop(0, `rgba(30, 8, 8, ${0.2 * a})`);
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
  }

  _renderParticles(ctx, W, H, a) {
    for (const p of this.particles) {
      const px = p.x * W;
      const py = p.y * H;
      const flicker = p.isEmber ? (0.5 + Math.sin(this._phase * 3 + p.x * 20) * 0.5) : 1;
      const alpha = p.alpha * a * flicker;

      if (p.isEmber) {
        // Orange-red embers
        ctx.fillStyle = `rgba(200, 60, 20, ${alpha})`;
      } else {
        // Dark grey ash
        ctx.fillStyle = `rgba(80, 70, 65, ${alpha * 0.7})`;
      }
      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _renderDefeatText(ctx, W, H, a) {
    const textAlpha = Math.min(1, Math.max(0, (this._elapsed - 200) / 800));
    const combinedAlpha = textAlpha * a;
    if (combinedAlpha <= 0) return;

    ctx.textAlign = 'center';

    // Drip/fade effect — slight vertical offset that settles
    const settleOffset = Math.max(0, 1 - textAlpha) * 8;

    // Dark shadow for depth
    ctx.fillStyle = `rgba(0, 0, 0, ${0.7 * combinedAlpha})`;
    ctx.font = 'bold 48px monospace';
    ctx.fillText('DEFEAT', W / 2 + 3, H * 0.16 + 3 + settleOffset);

    // Blood-red main text
    ctx.fillStyle = `rgba(160, 20, 20, ${combinedAlpha})`;
    ctx.fillText('DEFEAT', W / 2, H * 0.16 + settleOffset);

    // Lighter red highlight on top
    ctx.fillStyle = `rgba(200, 40, 40, ${combinedAlpha * 0.6})`;
    ctx.font = 'bold 48px monospace';
    ctx.fillText('DEFEAT', W / 2, H * 0.16 - 1 + settleOffset);

    // Decorative blood drip line below
    const dripAlpha = Math.min(1, Math.max(0, (this._elapsed - 600) / 500));
    if (dripAlpha > 0) {
      const lineW = 200 * dripAlpha;
      ctx.fillStyle = `rgba(120, 15, 15, ${0.5 * dripAlpha * a})`;
      ctx.fillRect(W / 2 - lineW / 2, H * 0.16 + 14, lineW, 2);
    }

    ctx.textAlign = 'left';
  }

  _renderDungeonInfo(ctx, W, y, a) {
    const infoAlpha = Math.min(1, Math.max(0, (this._elapsed - 400) / 600)) * a;
    if (infoAlpha <= 0) return;

    ctx.textAlign = 'center';

    // "Lost in [Dungeon Name]"
    ctx.fillStyle = `rgba(140, 100, 70, ${infoAlpha * 0.9})`;
    ctx.font = '16px monospace';
    ctx.fillText(`Lost in ${this.dungeonName}`, W / 2, y);

    // "Floor X"
    ctx.fillStyle = `rgba(120, 85, 55, ${infoAlpha * 0.7})`;
    ctx.font = '13px monospace';
    ctx.fillText(`Floor ${this.floor}`, W / 2, y + 20);

    ctx.textAlign = 'left';
  }

  _renderFallenParty(ctx, W, startY, a) {
    const partyAlpha = Math.min(1, Math.max(0, (this._elapsed - 600) / 700)) * a;
    if (partyAlpha <= 0 || this.partyMembers.length === 0) return;

    const cardW = 100;
    const cardH = 130;
    const gap = 16;
    const totalW = this.partyMembers.length * cardW + (this.partyMembers.length - 1) * gap;
    let startX = (W - totalW) / 2;

    for (let i = 0; i < this.partyMembers.length; i++) {
      const member = this.partyMembers[i];
      const cx = startX + i * (cardW + gap);
      const cy = startY;
      const isHero = i === 0;

      this._renderFallenCard(ctx, cx, cy, cardW, cardH, member, isHero, partyAlpha);
    }
  }

  _renderFallenCard(ctx, x, y, w, h, member, isHero, a) {
    // Card background — dark, slightly red-tinged
    const bgAlpha = isHero ? 0.4 : 0.3;
    ctx.fillStyle = `rgba(25, 10, 10, ${bgAlpha * a})`;
    ctx.fillRect(x, y, w, h);

    // Border — dimmer red for hero, dark grey for others
    const borderColor = isHero
      ? `rgba(120, 30, 30, ${0.6 * a})`
      : `rgba(60, 50, 45, ${0.4 * a})`;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = isHero ? 2 : 1;
    ctx.strokeRect(x, y, w, h);

    // Portrait
    const portraitSize = 64;
    const portraitX = x + (w - portraitSize) / 2;
    const portraitY = y + 8;

    const portraitKey = member.portrait;
    const portraitImg = this.assets ? this.assets.get(portraitKey) : null;

    if (portraitImg) {
      // Draw dimmed portrait
      ctx.globalAlpha = 0.4 * a;
      ctx.drawImage(portraitImg, portraitX, portraitY, portraitSize, portraitSize);
      ctx.globalAlpha = 1;
    } else {
      // Fallback — dark box with class initial
      ctx.fillStyle = `rgba(15, 8, 8, ${0.6 * a})`;
      ctx.fillRect(portraitX, portraitY, portraitSize, portraitSize);
      const classData = CLASS_DATA[member.class];
      const initial = (classData ? classData.name : member.class || 'X')[0].toUpperCase();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = `rgba(100, 40, 40, ${0.6 * a})`;
      ctx.font = 'bold 28px monospace';
      ctx.fillText(initial, portraitX + portraitSize / 2, portraitY + portraitSize / 2);
      ctx.textBaseline = 'alphabetic';
    }

    // Red X over portrait
    ctx.strokeStyle = `rgba(160, 20, 20, ${0.7 * a})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(portraitX + 6, portraitY + 6);
    ctx.lineTo(portraitX + portraitSize - 6, portraitY + portraitSize - 6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(portraitX + portraitSize - 6, portraitY + 6);
    ctx.lineTo(portraitX + 6, portraitY + portraitSize - 6);
    ctx.stroke();

    // Name
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(170, 140, 120, ${0.8 * a})`;
    ctx.font = 'bold 11px monospace';
    const displayName = member.name.length > 10 ? member.name.slice(0, 9) + '.' : member.name;
    ctx.fillText(displayName, x + w / 2, portraitY + portraitSize + 16);

    // Class
    const classData = CLASS_DATA[member.class];
    const className = classData ? classData.name : member.class;
    ctx.fillStyle = `rgba(120, 100, 80, ${0.6 * a})`;
    ctx.font = '10px monospace';
    ctx.fillText(className, x + w / 2, portraitY + portraitSize + 30);

    // "Fallen" text
    ctx.fillStyle = `rgba(140, 30, 30, ${0.7 * a})`;
    ctx.font = 'italic 10px monospace';
    ctx.fillText('Fallen', x + w / 2, portraitY + portraitSize + 44);

    ctx.textAlign = 'left';
  }

  _renderFlavorText(ctx, W, y, a) {
    const quoteAlpha = Math.min(1, Math.max(0, (this._elapsed - 1200) / 800)) * a;
    if (quoteAlpha <= 0) return;

    ctx.textAlign = 'center';

    // Decorative line above
    const lineW = 160;
    ctx.fillStyle = `rgba(80, 50, 40, ${0.3 * quoteAlpha})`;
    ctx.fillRect(W / 2 - lineW / 2, y - 12, lineW, 1);

    // Quote
    ctx.fillStyle = `rgba(140, 110, 80, ${0.8 * quoteAlpha})`;
    ctx.font = 'italic 13px monospace';
    ctx.fillText(`"${this._quote}"`, W / 2, y);

    ctx.textAlign = 'left';
  }

  _renderReturnButton(ctx, W, y, btnAlpha, world) {
    const pulse = Math.sin(this._phase * 2) * 0.5 + 0.5;
    const a = btnAlpha;

    const btnW = 220;
    const btnH = 36;
    const btnX = W / 2 - btnW / 2;
    const btnY = y;

    // Parchment background
    const parchGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
    parchGrad.addColorStop(0, `rgba(50, 35, 20, ${0.8 * a})`);
    parchGrad.addColorStop(0.5, `rgba(35, 25, 14, ${0.9 * a})`);
    parchGrad.addColorStop(1, `rgba(25, 18, 10, ${0.8 * a})`);
    ctx.fillStyle = parchGrad;
    ctx.fillRect(btnX, btnY, btnW, btnH);

    // Border with subtle pulse
    ctx.strokeStyle = `rgba(140, 100, 60, ${(0.4 + pulse * 0.2) * a})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(btnX, btnY, btnW, btnH);

    // Button text
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(200, 170, 120, ${a})`;
    ctx.font = 'bold 14px monospace';
    ctx.fillText('RETURN TO TAVERN', W / 2, btnY + 23);

    // Hint text
    ctx.fillStyle = `rgba(120, 100, 70, ${0.6 * a})`;
    ctx.font = '10px monospace';
    ctx.fillText('Enter / Space / Tap', W / 2, btnY + btnH + 14);

    ctx.textAlign = 'left';

    // Touch hit zone
    if (world && world.input && world.input.touch) {
      world.input.touch.clearHitZones();
      world.input.touch.registerHitZone(btnX, btnY, btnW, btnH, 'Enter');
    }
  }

  isDone() {
    return this._dismissed;
  }
}
