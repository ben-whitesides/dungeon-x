import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../core/constants.js';
import { CLASS_DATA } from '../../character/class-data.js';

/**
 * VictoryScreenState — Celebratory loot reveal screen.
 * Shown after completing a dungeon floor or defeating a boss.
 * Golden celebration atmosphere, slot-machine-style loot reveals, party status.
 *
 * Constructor: new VictoryScreenState(assets, rewards, partyMembers, dungeonName, floor)
 * Where rewards = { gold, xp, items: [], fragment: null }
 * Must have: isDone(), animates flag, keyboard + touch input handling.
 */

const VICTORY_QUOTES = [
  'The darkness retreats before your steel.',
  'Gold and glory — the spoils of the brave.',
  'Another floor conquered. The depths await.',
  'Fortune favors the bold.',
  'Your legend grows with each victory.',
  'The dungeon yields its treasures.',
  'Steel and cunning prevail once more.',
  'The monsters fall. The heroes stand.',
];

export class VictoryScreenState {
  constructor(assets, rewards, partyMembers, dungeonName, floor) {
    this.assets = assets;
    this.rewards = rewards || { gold: 0, xp: 0, items: [], fragment: null };
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
    this._goldRevealTime = 800;
    this._xpRevealTime = 1400;
    this._itemRevealTime = 2000;
    this._fragmentRevealTime = 2600;
    this._buttonDelay = 2000;
    this._autoTransition = 10000;

    // Pick a random quote
    this._quote = VICTORY_QUOTES[Math.floor(Math.random() * VICTORY_QUOTES.length)];

    // Gold sparkle particles (rising upward)
    this.particles = [];
    for (let i = 0; i < 50; i++) {
      this.particles.push({
        x: Math.random(),
        y: Math.random(),
        vy: -(0.0003 + Math.random() * 0.0008), // negative = upward
        vx: (Math.random() - 0.5) * 0.0003,
        size: 1 + Math.random() * 2.5,
        alpha: 0.2 + Math.random() * 0.4,
        hue: Math.random() < 0.6 ? 0 : 1, // 0 = gold, 1 = white sparkle
      });
    }

    // Track which loot slots have been "revealed"
    this._revealedSlots = 0;
    this._totalSlots = this._countRewardSlots();
  }

  _countRewardSlots() {
    let count = 0;
    if (this.rewards.gold > 0) count++;
    if (this.rewards.xp > 0) count++;
    if (this.rewards.items && this.rewards.items.length > 0) count += this.rewards.items.length;
    if (this.rewards.fragment) count++;
    return Math.max(count, 1);
  }

  update(timestamp) {
    if (!this._lastTimestamp) this._lastTimestamp = timestamp;
    const dt = timestamp - this._lastTimestamp;
    this._lastTimestamp = timestamp;

    this._elapsed += dt;
    this._phase += 0.02;

    // Animate particles upward
    for (const p of this.particles) {
      p.y += p.vy;
      p.x += p.vx + Math.sin(this._phase + p.x * 10) * 0.00005;
      if (p.y < -0.05) {
        p.y = 1.05;
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

    // === 1. DARK BACKGROUND ===
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);

    // === 2. GOLDEN RADIAL GLOW ===
    this._renderGoldenGlow(ctx, W, H, fadeAlpha);

    // === 3. GOLD SPARKLE PARTICLES (rising) ===
    this._renderParticles(ctx, W, H, fadeAlpha);

    // === 4. "VICTORY!" TEXT ===
    this._renderVictoryText(ctx, W, H, fadeAlpha);

    // === 5. DUNGEON INFO ===
    const infoY = H * 0.22;
    this._renderDungeonInfo(ctx, W, infoY, fadeAlpha);

    // === 6. LOOT REVEAL (slot-machine style staggered) ===
    const lootY = H * 0.30;
    this._renderLootReveal(ctx, W, lootY, fadeAlpha);

    // === 7. PARTY STATUS ===
    const partyY = H * 0.58;
    this._renderPartyStatus(ctx, W, partyY, fadeAlpha);

    // === 8. STATS SUMMARY ===
    const statsY = H * 0.80;
    this._renderStatsSummary(ctx, W, statsY, fadeAlpha);

    // === 9. CONTINUE BUTTON (after delay) ===
    if (this._elapsed >= this._buttonDelay) {
      const btnAlpha = Math.min(1, (this._elapsed - this._buttonDelay) / 600);
      this._renderContinueButton(ctx, W, H * 0.88, btnAlpha, world);
    }

    // === 10. FADE-IN OVERLAY (black fading out) ===
    if (fadeAlpha < 1) {
      ctx.fillStyle = `rgba(0, 0, 0, ${1 - fadeAlpha})`;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.restore();
  }

  // --- RENDER HELPERS ---

  _renderGoldenGlow(ctx, W, H, a) {
    // Gold radial glow from center
    const glow = ctx.createRadialGradient(W / 2, H * 0.35, 0, W / 2, H * 0.35, W * 0.6);
    const pulse = Math.sin(this._phase * 1.5) * 0.5 + 0.5;
    glow.addColorStop(0, `rgba(255, 200, 50, ${(0.12 + pulse * 0.06) * a})`);
    glow.addColorStop(0.4, `rgba(180, 130, 20, ${(0.06 + pulse * 0.03) * a})`);
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // Warm vignette from edges
    const vig = ctx.createRadialGradient(W / 2, H / 2, W * 0.2, W / 2, H / 2, W * 0.65);
    vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vig.addColorStop(0.7, `rgba(20, 12, 0, ${0.2 * a})`);
    vig.addColorStop(1, `rgba(40, 20, 0, ${0.4 * a})`);
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
  }

  _renderParticles(ctx, W, H, a) {
    for (const p of this.particles) {
      const px = p.x * W;
      const py = p.y * H;
      const twinkle = 0.5 + Math.sin(this._phase * 3 + p.x * 20 + p.y * 15) * 0.5;
      const alpha = p.alpha * a * twinkle;

      if (p.hue === 0) {
        // Gold sparkle
        ctx.fillStyle = `rgba(255, 215, 80, ${alpha})`;
      } else {
        // White sparkle
        ctx.fillStyle = `rgba(255, 255, 220, ${alpha * 0.8})`;
      }
      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _renderVictoryText(ctx, W, H, a) {
    const textAlpha = Math.min(1, Math.max(0, (this._elapsed - 150) / 600));
    const combinedAlpha = textAlpha * a;
    if (combinedAlpha <= 0) return;

    const pulse = Math.sin(this._phase * 2) * 0.5 + 0.5;
    const settleOffset = Math.max(0, 1 - textAlpha) * 10;

    ctx.textAlign = 'center';

    // Glow behind text
    ctx.shadowColor = `rgba(255, 200, 50, ${(0.4 + pulse * 0.4) * combinedAlpha})`;
    ctx.shadowBlur = 20 + pulse * 10;

    // Dark shadow for depth
    ctx.fillStyle = `rgba(0, 0, 0, ${0.7 * combinedAlpha})`;
    ctx.font = 'bold 48px monospace';
    ctx.fillText('VICTORY!', W / 2 + 3, H * 0.12 + 3 - settleOffset);

    // Gold main text
    ctx.fillStyle = `rgba(255, 215, 0, ${combinedAlpha})`;
    ctx.fillText('VICTORY!', W / 2, H * 0.12 - settleOffset);

    // Lighter gold highlight
    ctx.fillStyle = `rgba(255, 235, 120, ${combinedAlpha * 0.5})`;
    ctx.fillText('VICTORY!', W / 2, H * 0.12 - 1 - settleOffset);

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Decorative gold line below
    const lineAlpha = Math.min(1, Math.max(0, (this._elapsed - 400) / 400));
    if (lineAlpha > 0) {
      const lineW = 220 * lineAlpha;
      ctx.fillStyle = `rgba(255, 215, 0, ${0.4 * lineAlpha * a})`;
      ctx.fillRect(W / 2 - lineW / 2, H * 0.12 + 14, lineW, 2);
    }

    ctx.textAlign = 'left';
  }

  _renderDungeonInfo(ctx, W, y, a) {
    const infoAlpha = Math.min(1, Math.max(0, (this._elapsed - 300) / 500)) * a;
    if (infoAlpha <= 0) return;

    ctx.textAlign = 'center';

    // "Conquered: [Dungeon Name]"
    ctx.fillStyle = `rgba(255, 215, 0, ${infoAlpha * 0.8})`;
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`Conquered: ${this.dungeonName}`, W / 2, y);

    // "Floor X"
    ctx.fillStyle = `rgba(200, 170, 100, ${infoAlpha * 0.6})`;
    ctx.font = '13px monospace';
    ctx.fillText(`Floor ${this.floor}`, W / 2, y + 18);

    ctx.textAlign = 'left';
  }

  _renderLootReveal(ctx, W, startY, a) {
    const slotW = 130;
    const slotH = 70;
    const gap = 12;

    // Gather all reward slots
    const slots = [];
    if (this.rewards.gold > 0) {
      slots.push({ type: 'gold', label: 'Gold', value: `+${this.rewards.gold}`, icon: '\u26C1', color: '#FFD700' });
    }
    if (this.rewards.xp > 0) {
      slots.push({ type: 'xp', label: 'XP Earned', value: `+${this.rewards.xp}`, icon: '\u2605', color: '#64B5F6' });
    }
    if (this.rewards.items && this.rewards.items.length > 0) {
      for (const item of this.rewards.items) {
        const itemName = typeof item === 'string' ? item : (item.name || 'Item');
        const itemType = typeof item === 'object' && item.type ? item.type : 'Loot';
        slots.push({ type: 'item', label: itemName, value: itemType, icon: '\u2694', color: '#81C784' });
      }
    }
    if (this.rewards.fragment) {
      slots.push({ type: 'fragment', label: 'Sunstone Fragment', value: this.rewards.fragment, icon: '\u2B50', color: '#FFE082' });
    }

    if (slots.length === 0) return;

    const totalW = slots.length * slotW + (slots.length - 1) * gap;
    let x = (W - totalW) / 2;

    for (let i = 0; i < slots.length; i++) {
      const revealTime = this._goldRevealTime + i * 400;
      const slotAlpha = Math.min(1, Math.max(0, (this._elapsed - revealTime) / 400)) * a;
      if (slotAlpha <= 0) {
        x += slotW + gap;
        continue;
      }

      const slot = slots[i];
      const isFragment = slot.type === 'fragment';

      // Slot background
      const bgAlpha = isFragment ? 0.35 : 0.25;
      ctx.fillStyle = `rgba(30, 22, 8, ${bgAlpha * slotAlpha})`;
      ctx.fillRect(x, startY, slotW, slotH);

      // Border
      const borderColor = isFragment
        ? `rgba(255, 224, 130, ${0.7 * slotAlpha})`
        : `rgba(180, 150, 80, ${0.5 * slotAlpha})`;
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = isFragment ? 2 : 1;
      ctx.strokeRect(x, startY, slotW, slotH);

      // Fragment gets extra glow
      if (isFragment) {
        const fragGlow = ctx.createRadialGradient(
          x + slotW / 2, startY + slotH / 2, 0,
          x + slotW / 2, startY + slotH / 2, slotW * 0.6
        );
        fragGlow.addColorStop(0, `rgba(255, 215, 0, ${0.15 * slotAlpha})`);
        fragGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = fragGlow;
        ctx.fillRect(x - 10, startY - 10, slotW + 20, slotH + 20);
      }

      // Icon
      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(${this._colorToRgb(slot.color)}, ${slotAlpha})`;
      ctx.font = isFragment ? 'bold 22px monospace' : '18px monospace';
      ctx.fillText(slot.icon, x + slotW / 2, startY + 22);

      // Label
      ctx.fillStyle = `rgba(220, 200, 160, ${0.9 * slotAlpha})`;
      ctx.font = 'bold 11px monospace';
      const displayLabel = slot.label.length > 14 ? slot.label.slice(0, 12) + '..' : slot.label;
      ctx.fillText(displayLabel, x + slotW / 2, startY + 42);

      // Value
      ctx.fillStyle = `rgba(${this._colorToRgb(slot.color)}, ${0.9 * slotAlpha})`;
      ctx.font = 'bold 13px monospace';
      ctx.fillText(slot.value, x + slotW / 2, startY + 58);

      ctx.textAlign = 'left';
      x += slotW + gap;
    }
  }

  _colorToRgb(hex) {
    // Convert hex color to rgb string for rgba usage
    if (hex.startsWith('#')) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `${r}, ${g}, ${b}`;
    }
    return '255, 215, 0';
  }

  _renderPartyStatus(ctx, W, startY, a) {
    const partyAlpha = Math.min(1, Math.max(0, (this._elapsed - 1200) / 600)) * a;
    if (partyAlpha <= 0 || this.partyMembers.length === 0) return;

    // Section header
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(200, 180, 130, ${0.7 * partyAlpha})`;
    ctx.font = '12px monospace';
    ctx.fillText('PARTY STATUS', W / 2, startY - 6);
    ctx.textAlign = 'left';

    const cardW = 110;
    const cardH = 110;
    const gap = 14;
    const totalW = this.partyMembers.length * cardW + (this.partyMembers.length - 1) * gap;
    let startX = (W - totalW) / 2;

    for (let i = 0; i < this.partyMembers.length; i++) {
      const member = this.partyMembers[i];
      const cx = startX + i * (cardW + gap);
      this._renderPartyCard(ctx, cx, startY, cardW, cardH, member, partyAlpha);
    }
  }

  _renderPartyCard(ctx, x, y, w, h, member, a) {
    const isAlive = member.currentHP > 0;

    // Card background
    ctx.fillStyle = `rgba(20, 16, 8, ${0.4 * a})`;
    ctx.fillRect(x, y, w, h);

    // Border
    const borderColor = isAlive
      ? `rgba(80, 160, 80, ${0.5 * a})`
      : `rgba(120, 40, 40, ${0.4 * a})`;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    // Portrait
    const portraitSize = 48;
    const portraitX = x + (w - portraitSize) / 2;
    const portraitY = y + 6;

    const portraitKey = member.portrait;
    const portraitImg = this.assets ? this.assets.get(portraitKey) : null;

    if (portraitImg) {
      ctx.globalAlpha = (isAlive ? 0.9 : 0.3) * a;
      ctx.drawImage(portraitImg, portraitX, portraitY, portraitSize, portraitSize);
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = `rgba(15, 12, 6, ${0.6 * a})`;
      ctx.fillRect(portraitX, portraitY, portraitSize, portraitSize);
      const classData = CLASS_DATA[member.class];
      const initial = (classData ? classData.name : member.class || 'X')[0].toUpperCase();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = `rgba(180, 160, 100, ${0.6 * a})`;
      ctx.font = 'bold 22px monospace';
      ctx.fillText(initial, portraitX + portraitSize / 2, portraitY + portraitSize / 2);
      ctx.textBaseline = 'alphabetic';
    }

    // Name
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(200, 180, 140, ${0.9 * a})`;
    ctx.font = 'bold 10px monospace';
    const displayName = member.name.length > 11 ? member.name.slice(0, 10) + '.' : member.name;
    ctx.fillText(displayName, x + w / 2, portraitY + portraitSize + 12);

    // HP bar
    const barW = w - 16;
    const barH = 6;
    const barX = x + 8;
    const barY = portraitY + portraitSize + 18;
    const hpPct = member.maxHP > 0 ? Math.max(0, member.currentHP / member.maxHP) : 0;

    ctx.fillStyle = `rgba(30, 15, 15, ${0.6 * a})`;
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = `rgba(80, 180, 80, ${0.8 * a})`;
    ctx.fillRect(barX, barY, Math.floor(barW * hpPct), barH);
    ctx.strokeStyle = `rgba(100, 90, 70, ${0.3 * a})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    // HP text
    ctx.fillStyle = `rgba(180, 170, 140, ${0.7 * a})`;
    ctx.font = '9px monospace';
    ctx.fillText(`${member.currentHP}/${member.maxHP}`, x + w / 2, barY + barH + 10);

    // "Survived" or "Fallen" badge
    if (isAlive) {
      ctx.fillStyle = `rgba(60, 160, 60, ${0.8 * a})`;
      ctx.font = 'bold 9px monospace';
      ctx.fillText('Survived', x + w / 2, barY + barH + 22);
    } else {
      ctx.fillStyle = `rgba(160, 50, 50, ${0.8 * a})`;
      ctx.font = 'bold 9px monospace';
      ctx.fillText('Fallen', x + w / 2, barY + barH + 22);
    }

    // "LEVEL UP!" badge if applicable
    if (member.leveledUp) {
      const pulse = Math.sin(this._phase * 3) * 0.5 + 0.5;
      ctx.fillStyle = `rgba(255, 215, 0, ${(0.7 + pulse * 0.3) * a})`;
      ctx.font = 'bold 10px monospace';
      ctx.fillText('LEVEL UP!', x + w / 2, y - 2);
    }

    ctx.textAlign = 'left';
  }

  _renderStatsSummary(ctx, W, y, a) {
    const statsAlpha = Math.min(1, Math.max(0, (this._elapsed - 1600) / 500)) * a;
    if (statsAlpha <= 0) return;

    ctx.textAlign = 'center';

    // Flavor quote
    ctx.fillStyle = `rgba(180, 150, 100, ${0.6 * statsAlpha})`;
    ctx.font = 'italic 11px monospace';
    ctx.fillText(`"${this._quote}"`, W / 2, y);

    ctx.textAlign = 'left';
  }

  _renderContinueButton(ctx, W, y, btnAlpha, world) {
    const pulse = Math.sin(this._phase * 2) * 0.5 + 0.5;
    const a = btnAlpha;

    const btnW = 220;
    const btnH = 36;
    const btnX = W / 2 - btnW / 2;
    const btnY = y;

    // Parchment background
    const parchGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
    parchGrad.addColorStop(0, `rgba(60, 45, 20, ${0.8 * a})`);
    parchGrad.addColorStop(0.5, `rgba(45, 32, 14, ${0.9 * a})`);
    parchGrad.addColorStop(1, `rgba(30, 22, 10, ${0.8 * a})`);
    ctx.fillStyle = parchGrad;
    ctx.fillRect(btnX, btnY, btnW, btnH);

    // Border with subtle gold pulse
    ctx.strokeStyle = `rgba(255, 215, 0, ${(0.4 + pulse * 0.3) * a})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(btnX, btnY, btnW, btnH);

    // Button text
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(255, 215, 0, ${a})`;
    ctx.font = 'bold 14px monospace';
    ctx.fillText('CONTINUE', W / 2, btnY + 23);

    // Hint text
    ctx.fillStyle = `rgba(160, 140, 90, ${0.6 * a})`;
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
