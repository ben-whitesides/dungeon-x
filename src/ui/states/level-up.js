import { CLASS_DATA } from '../../character/class-data.js';

/**
 * LevelUpState — "LEVEL UP!" notification overlay.
 * Shows what improved. Any key dismisses.
 */
export class LevelUpState {
  constructor(character, oldLevel, newLevel, assets) {
    this.character = character;
    this.oldLevel = oldLevel;
    this.newLevel = newLevel;
    this.assets = assets;
    this._dismissed = false;
    this.animates = true;
    this._elapsed = 0;
    this._lastTimestamp = 0;
    this._pulsePhase = 0;
  }

  update(timestamp) {
    if (!this._lastTimestamp) this._lastTimestamp = timestamp;
    const dt = (timestamp - this._lastTimestamp) / 16.67;
    this._lastTimestamp = timestamp;
    this._elapsed += dt;
    this._pulsePhase += 0.03 * dt;
  }

  handleInput(input, world) {
    if (this._elapsed > 15) { // ~250ms minimum display
      this._dismissed = true;
    }
    return true; // Consume all input
  }

  render(layers, world) {
    const ctx = layers.ui || layers;
    ctx.save();

    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    const pulse = Math.sin(this._pulsePhase) * 0.5 + 0.5; // 0..1
    const classData = CLASS_DATA[this.character.class];

    // --- SOUND CUE: Trigger level-up fanfare here (e.g. AudioManager.play('level_up_fanfare')) ---

    // === 1. GOLDEN CELEBRATION BACKGROUND ===
    this._renderBackground(ctx, W, H, pulse);

    // === 2. MAIN PANEL ===
    const boxW = Math.min(560, W - 40);
    const boxH = Math.min(520, H - 40);
    const boxX = (W - boxW) / 2;
    const boxY = (H - boxH) / 2;
    this._renderPanel(ctx, boxX, boxY, boxW, boxH, pulse);

    // === 3. PORTRAIT ===
    const portraitSize = 96;
    const portraitX = W / 2 - portraitSize / 2;
    const portraitY = boxY + 14;
    this._renderPortrait(ctx, portraitX, portraitY, portraitSize, classData, pulse);

    // === 4. LEVEL UP BANNER ===
    const bannerY = portraitY + portraitSize + 14;
    this._renderBanner(ctx, W, bannerY, pulse);

    // === 5. CHARACTER NAME + CLASS ===
    ctx.textAlign = 'center';
    ctx.fillStyle = '#DDD';
    ctx.font = '14px monospace';
    ctx.fillText(
      `${this.character.name} — ${classData ? classData.name : this.character.class}`,
      W / 2, bannerY + 46
    );

    // === 6. HP / MP INCREASE ===
    let cursorY = bannerY + 66;
    cursorY = this._renderHpMp(ctx, W / 2, cursorY, boxW);

    // === 7. STAT BLOCK ===
    cursorY = this._renderStats(ctx, boxX, cursorY + 6, boxW);

    // === 8. NEW ABILITIES ===
    cursorY = this._renderAbilities(ctx, W / 2, cursorY + 4, boxW, classData);

    // === 9. PENDING STAT INCREASE ===
    if (this.character.pendingStatIncrease) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#E67E22';
      ctx.font = 'bold 13px monospace';
      ctx.fillText('Ability Score Increase available!', W / 2, cursorY + 14);
      cursorY += 20;
    }

    // === 10. CONTINUE BUTTON (keyboard: Enter/Space + touch) ===
    this._renderContinueButton(ctx, W, boxY + boxH - 44, pulse, world);

    ctx.restore();
  }

  // ─── RENDER HELPERS ────────────────────────────────────────────────

  /** Dark base + radial golden glow + gold particle shower */
  _renderBackground(ctx, W, H, pulse) {
    // Dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
    ctx.fillRect(0, 0, W, H);

    // Radial golden glow from center
    const grad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.55);
    grad.addColorStop(0, `rgba(255, 200, 50, ${0.12 + pulse * 0.06})`);
    grad.addColorStop(0.4, `rgba(180, 130, 20, ${0.06 + pulse * 0.03})`);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Gold particle shower — deterministic sparkles seeded from elapsed time
    const particleCount = 35;
    for (let i = 0; i < particleCount; i++) {
      const seed = i * 137.508; // golden angle offset
      const speed = 0.4 + (i % 5) * 0.15;
      const x = ((seed + this._elapsed * (0.3 + (i % 3) * 0.1)) % W);
      const y = ((i * 47.3 + this._elapsed * speed * 2.0) % (H + 20)) - 10;
      const size = 1.5 + (i % 3);
      const alpha = 0.3 + Math.sin(this._elapsed * 0.05 + i) * 0.25;
      ctx.fillStyle = `rgba(255, 215, 80, ${Math.max(0.05, alpha)})`;
      ctx.fillRect(x, y, size, size);
    }
  }

  /** Main panel with dark fill, gold border, pulsing outer glow */
  _renderPanel(ctx, x, y, w, h, pulse) {
    // Dark panel fill
    ctx.fillStyle = '#110e06';
    ctx.fillRect(x, y, w, h);

    // Inner gold border
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);

    // Outer pulsing gold glow
    ctx.strokeStyle = `rgba(255, 215, 0, ${0.15 + pulse * 0.2})`;
    ctx.lineWidth = 5;
    ctx.strokeRect(x - 3, y - 3, w + 6, h + 6);

    // Corner accents (small gold squares)
    const cs = 6;
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(x - 1, y - 1, cs, cs);
    ctx.fillRect(x + w - cs + 1, y - 1, cs, cs);
    ctx.fillRect(x - 1, y + h - cs + 1, cs, cs);
    ctx.fillRect(x + w - cs + 1, y + h - cs + 1, cs, cs);
  }

  /** Character portrait in ornate gold frame with pulse glow */
  _renderPortrait(ctx, x, y, size, classData, pulse) {
    // Glow behind frame
    const glowAlpha = 0.15 + pulse * 0.15;
    ctx.shadowColor = `rgba(255, 200, 50, ${glowAlpha})`;
    ctx.shadowBlur = 18;

    // Gold frame background
    const frameP = 5;
    ctx.fillStyle = '#3a2a08';
    ctx.fillRect(x - frameP, y - frameP, size + frameP * 2, size + frameP * 2);

    // Portrait image or fallback
    const portraitKey = this.character.portrait;
    const portraitImg = this.assets ? this.assets.get(portraitKey) : null;
    if (portraitImg) {
      ctx.drawImage(portraitImg, x, y, size, size);
    } else {
      // Fallback: class initial on dark bg
      ctx.fillStyle = '#1a1208';
      ctx.fillRect(x, y, size, size);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFD700';
      ctx.font = `bold ${Math.floor(size * 0.5)}px monospace`;
      const initial = (classData ? classData.name : this.character.class || 'X')[0].toUpperCase();
      ctx.fillText(initial, x + size / 2, y + size / 2);
      ctx.textBaseline = 'alphabetic';
    }

    // Gold frame border
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.strokeRect(x - frameP, y - frameP, size + frameP * 2, size + frameP * 2);

    // Ornate frame corners — small gold diamonds
    const corners = [
      [x - frameP, y - frameP],
      [x + size + frameP, y - frameP],
      [x - frameP, y + size + frameP],
      [x + size + frameP, y + size + frameP],
    ];
    ctx.fillStyle = '#FFD700';
    for (const [cx, cy] of corners) {
      ctx.beginPath();
      ctx.moveTo(cx, cy - 4);
      ctx.lineTo(cx + 4, cy);
      ctx.lineTo(cx, cy + 4);
      ctx.lineTo(cx - 4, cy);
      ctx.closePath();
      ctx.fill();
    }

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }

  /** "LEVEL UP!" banner with pulsing glow + level transition */
  _renderBanner(ctx, W, y, pulse) {
    ctx.textAlign = 'center';

    // Shadow behind text
    ctx.shadowColor = `rgba(255, 180, 0, ${0.4 + pulse * 0.4})`;
    ctx.shadowBlur = 16 + pulse * 8;

    // Main title
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 30px monospace';
    ctx.fillText('LEVEL UP!', W / 2, y);

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Level transition
    ctx.fillStyle = '#BBB';
    ctx.font = '15px monospace';
    ctx.fillText(`Level ${this.oldLevel}  \u2192  Level ${this.newLevel}`, W / 2, y + 22);
  }

  /** HP and MP bars with values */
  _renderHpMp(ctx, centerX, y, boxW) {
    const barW = Math.min(200, boxW * 0.4);
    const barH = 12;
    const leftX = centerX - barW - 20;
    const rightX = centerX + 20;

    // HP
    ctx.fillStyle = '#888';
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('HP', leftX - 4, y + 10);
    this._drawStatBar(ctx, leftX, y, barW, barH, '#27AE60', '#1a3a1a', 1.0);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#27AE60';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`${this.character.maxHP}`, leftX + barW + 6, y + 10);

    // MP (only if character has mana)
    if (this.character.maxMana > 0) {
      ctx.fillStyle = '#888';
      ctx.font = '12px monospace';
      ctx.textAlign = 'right';
      ctx.fillText('MP', rightX - 4, y + 10);
      this._drawStatBar(ctx, rightX, y, barW, barH, '#3498DB', '#0e1e2e', 1.0);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#3498DB';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(`${this.character.maxMana}`, rightX + barW + 6, y + 10);
    }

    // Proficiency bonus
    ctx.textAlign = 'center';
    ctx.fillStyle = '#AAA';
    ctx.font = '12px monospace';
    ctx.fillText(
      `Proficiency Bonus: +${this.character.getProficiencyBonus()}`,
      centerX, y + 30
    );

    return y + 40;
  }

  /** Six ability score stat block with colored bars */
  _renderStats(ctx, boxX, y, boxW) {
    const stats = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    const labels = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
    const colors = ['#E74C3C', '#2ECC71', '#E67E22', '#3498DB', '#9B59B6', '#F1C40F'];

    const colW = Math.floor((boxW - 40) / 2);
    const leftCol = boxX + 20;
    const rightCol = boxX + 20 + colW;
    const rowH = 22;
    const barW = colW - 70;

    for (let i = 0; i < stats.length; i++) {
      const col = i < 3 ? leftCol : rightCol;
      const row = i < 3 ? i : i - 3;
      const rx = col;
      const ry = y + row * rowH;
      const val = this.character.stats[stats[i]];
      const base = this.character.baseStats[stats[i]];
      const bonus = this.character.levelBonuses[stats[i]];

      // Label
      ctx.textAlign = 'left';
      ctx.fillStyle = colors[i];
      ctx.font = 'bold 11px monospace';
      ctx.fillText(labels[i], rx, ry + 12);

      // Stat bar (fill based on value, max 20 for scale)
      const fill = Math.min(val / 20, 1.0);
      this._drawStatBar(ctx, rx + 34, ry + 2, barW, 10, colors[i], '#1a1a1a', fill);

      // Value + bonus indicator
      ctx.textAlign = 'left';
      ctx.fillStyle = '#DDD';
      ctx.font = '11px monospace';
      const valStr = `${val}`;
      ctx.fillText(valStr, rx + 36 + barW, ry + 12);

      // Green "+" if bonus exists
      if (bonus > 0) {
        ctx.fillStyle = '#2ECC71';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`+${bonus}`, rx + 36 + barW + 22, ry + 12);
      }
    }

    return y + 3 * rowH + 4;
  }

  /** Generic colored stat bar */
  _drawStatBar(ctx, x, y, w, h, fillColor, bgColor, fillPct) {
    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(x, y, w, h);
    // Fill
    ctx.fillStyle = fillColor;
    ctx.fillRect(x, y, Math.floor(w * Math.max(0, Math.min(1, fillPct))), h);
    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
  }

  /** New abilities unlocked at this level */
  _renderAbilities(ctx, centerX, y, boxW, classData) {
    if (!classData || !classData.abilities) return y;

    const newAbilities = classData.abilities.filter(a => {
      return a.unlockLevel > this.oldLevel && a.unlockLevel <= this.newLevel;
    });
    if (newAbilities.length === 0) return y;

    // Section header
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('NEW ABILITIES UNLOCKED', centerX, y + 12);
    y += 20;

    // Ability cards
    const cardW = Math.min(boxW - 60, 420);
    const cardX = centerX - cardW / 2;

    for (const ab of newAbilities) {
      // Highlighted box background
      ctx.fillStyle = 'rgba(255, 215, 0, 0.08)';
      ctx.fillRect(cardX, y, cardW, 32);
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(cardX, y, cardW, 32);

      // Ability name
      ctx.textAlign = 'left';
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(ab.name, cardX + 8, y + 13);

      // Description
      ctx.fillStyle = '#BBB';
      ctx.font = '10px monospace';
      const desc = ab.description.length > 60 ? ab.description.slice(0, 57) + '...' : ab.description;
      ctx.fillText(desc, cardX + 8, y + 26);

      y += 36;
    }

    return y;
  }

  /** Parchment-style continue button with keyboard + touch support */
  _renderContinueButton(ctx, W, y, pulse, world) {
    const btnW = 180;
    const btnH = 34;
    const btnX = W / 2 - btnW / 2;
    const btnY = y;

    // Parchment background
    const parchGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
    parchGrad.addColorStop(0, '#3a3018');
    parchGrad.addColorStop(0.5, '#2a2210');
    parchGrad.addColorStop(1, '#1e1a0c');
    ctx.fillStyle = parchGrad;
    ctx.fillRect(btnX, btnY, btnW, btnH);

    // Border with pulse
    ctx.strokeStyle = `rgba(255, 215, 0, ${0.5 + pulse * 0.3})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(btnX, btnY, btnW, btnH);

    // Text
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('CONTINUE', W / 2, btnY + 22);

    // Hint text
    ctx.fillStyle = '#666';
    ctx.font = '10px monospace';
    ctx.fillText('Enter / Space / Tap', W / 2, btnY + btnH + 14);

    // Touch support — register hit zone for Enter action
    if (world && world.input && world.input.touch) {
      world.input.touch.clearHitZones();
      world.input.touch.registerHitZone(btnX, btnY, btnW, btnH, 'Enter');
    }
  }

  isDone() {
    return this._dismissed;
  }
}
