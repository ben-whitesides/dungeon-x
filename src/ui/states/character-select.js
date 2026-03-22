import { GameSave } from '../../core/game-save.js';
import { CLASS_DATA } from '../../character/class-data.js';

/**
 * CharacterSelectState — Shows existing hero with option to continue or create new.
 * Appears after title screen CONTINUE, before tavern exterior.
 * Displays hero portrait, name, class, level, stats.
 * Options: ENTER TAVERN (continue with this hero) or CREATE NEW (wipes save, new wizard).
 */
export class CharacterSelectState {
  constructor(assets) {
    this.assets = assets;
    this.animates = true;
    this.phase = 0;
    this.fadeIn = 0;
    this._done = false;
    this._action = null; // 'continue' or 'new'
    this.selectedButton = 0; // 0 = ENTER TAVERN, 1 = CREATE NEW
    this.heroData = null;
    this.partyData = [];

    // Load save data
    const save = GameSave.load();
    if (save && save.heroCharacter) {
      this.heroData = save.heroCharacter;
      this.partyData = save.party || [];
      this.gold = save.gold || 0;
      this.dungeons = save.completedDungeons ? save.completedDungeons.length : 0;
      this.fragments = save.collectedFragments ? save.collectedFragments.length : 0;
    }
  }

  isDone() { return this._done; }
  getAction() { return this._action; }

  update(timestamp) {
    this.phase += 0.02;
    if (this.fadeIn < 1) this.fadeIn = Math.min(1, this.fadeIn + 0.025);
  }

  handleInput(input, world) {
    const code = input.code;

    if (code === 'ArrowLeft' || code === 'KeyA') {
      this.selectedButton = 0;
      return true;
    }
    if (code === 'ArrowRight' || code === 'KeyD') {
      this.selectedButton = 1;
      return true;
    }

    if (code === 'Enter' || code === 'Space') {
      if (this.selectedButton === 0) {
        this._action = 'continue';
      } else {
        this._action = 'new';
      }
      this._done = true;
      return true;
    }

    if (code === 'Escape' || code === 'Backspace') {
      this._action = 'back'; // Go back to title
      this._done = true;
      return true;
    }

    // Touch
    if (code === '_charsel_continue') {
      this._action = 'continue';
      this._done = true;
      return true;
    }
    if (code === '_charsel_new') {
      this._action = 'new';
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

    // Clear touch zones
    if (world.input && world.input.touch) {
      world.input.touch.clearHitZones();
    }

    // Dark background with subtle warmth
    ctx.fillStyle = '#0e0a06';
    ctx.fillRect(0, 0, W, H);

    // Warm center glow
    const bgGlow = ctx.createRadialGradient(W / 2, H * 0.4, 20, W / 2, H * 0.4, W * 0.5);
    bgGlow.addColorStop(0, `rgba(80, 50, 20, ${0.08 * alpha})`);
    bgGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = bgGlow;
    ctx.fillRect(0, 0, W, H);

    // Title
    ctx.textAlign = 'center';
    ctx.font = 'bold 24px monospace';
    ctx.fillStyle = `rgba(212, 175, 55, ${alpha})`;
    ctx.fillText('YOUR HERO', W / 2, 50);

    ctx.font = '11px monospace';
    ctx.fillStyle = `rgba(140, 115, 75, ${0.6 * alpha})`;
    ctx.fillText('Continue your adventure or forge a new path', W / 2, 70);

    if (!this.heroData) {
      ctx.font = '14px monospace';
      ctx.fillStyle = `rgba(180, 160, 120, ${alpha})`;
      ctx.fillText('No hero found. Create a new character.', W / 2, H / 2);
      this.selectedButton = 1;
    } else {
      const hero = this.heroData;
      const classKey = hero.class || 'fighter';
      const classInfo = CLASS_DATA[classKey] || {};

      // === Hero card (centered) ===
      const cardW = 320;
      const cardH = 340;
      const cardX = (W - cardW) / 2;
      const cardY = 90;

      // Card background
      ctx.fillStyle = `rgba(26, 18, 10, ${0.9 * alpha})`;
      ctx.fillRect(cardX, cardY, cardW, cardH);
      ctx.strokeStyle = `rgba(100, 80, 50, ${0.6 * alpha})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(cardX, cardY, cardW, cardH);

      // Inner border
      ctx.strokeStyle = `rgba(60, 40, 20, ${0.4 * alpha})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(cardX + 4, cardY + 4, cardW - 8, cardH - 8);

      // Portrait frame
      const portSize = 96;
      const portX = cardX + 20;
      const portY = cardY + 20;

      // Portrait background
      ctx.fillStyle = `rgba(15, 10, 6, ${alpha})`;
      ctx.fillRect(portX, portY, portSize, portSize);
      ctx.strokeStyle = `rgba(90, 60, 30, ${0.8 * alpha})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(portX, portY, portSize, portSize);

      // Try to draw portrait
      const portraitKey = hero.portrait;
      if (portraitKey && this.assets && this.assets[portraitKey]) {
        ctx.drawImage(this.assets[portraitKey], portX, portY, portSize, portSize);
      } else {
        // Fallback — class initial
        ctx.font = 'bold 40px monospace';
        ctx.fillStyle = `rgba(180, 160, 120, ${0.5 * alpha})`;
        ctx.textAlign = 'center';
        ctx.fillText(classKey[0].toUpperCase(), portX + portSize / 2, portY + portSize / 2 + 14);
      }

      // Name and class
      const infoX = portX + portSize + 20;
      ctx.textAlign = 'left';

      ctx.font = 'bold 20px monospace';
      ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
      ctx.fillText(hero.name || 'Unknown', infoX, cardY + 45);

      ctx.font = '13px monospace';
      ctx.fillStyle = `rgba(180, 160, 120, ${0.8 * alpha})`;
      ctx.fillText(`Level ${hero.level || 1} ${classInfo.name || classKey}`, infoX, cardY + 65);

      // HP / Mana
      ctx.font = '12px monospace';
      ctx.fillStyle = `rgba(200, 80, 80, ${0.9 * alpha})`;
      ctx.fillText(`HP: ${hero.currentHP || hero.maxHP || '?'}/${hero.maxHP || '?'}`, infoX, cardY + 88);
      ctx.fillStyle = `rgba(80, 120, 200, ${0.9 * alpha})`;
      ctx.fillText(`Mana: ${hero.currentMana || hero.maxMana || '?'}/${hero.maxMana || '?'}`, infoX, cardY + 105);

      // Stats
      const stats = hero.baseStats || {};
      const statNames = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
      const statKeys = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
      const statColors = ['#c06030', '#60c060', '#c0a030', '#3080c0', '#a060c0', '#c06080'];
      const bonuses = hero.levelBonuses || {};

      const statsY = cardY + 140;
      ctx.font = '11px monospace';

      for (let i = 0; i < 6; i++) {
        const sx = cardX + 20 + (i % 3) * 100;
        const sy = statsY + Math.floor(i / 3) * 40;
        const base = stats[statKeys[i]] || 10;
        const bonus = bonuses[statKeys[i]] || 0;
        const total = base + bonus;

        // Stat name
        ctx.fillStyle = `rgba(140, 115, 75, ${0.7 * alpha})`;
        ctx.fillText(statNames[i], sx, sy);

        // Stat value
        ctx.fillStyle = `rgba(${statColors[i].slice(1, 3)}, ${statColors[i].slice(3, 5)}, ${statColors[i].slice(5, 7)}, ${alpha})`;
        const pr = parseInt(statColors[i].slice(1, 3), 16);
        const pg = parseInt(statColors[i].slice(3, 5), 16);
        const pb = parseInt(statColors[i].slice(5, 7), 16);
        ctx.fillStyle = `rgba(${pr}, ${pg}, ${pb}, ${alpha})`;
        ctx.fillText(`${total}`, sx + 35, sy);

        // Stat bar
        const barW = 45;
        const barH = 6;
        const barX = sx;
        const barY = sy + 5;
        ctx.fillStyle = `rgba(30, 20, 10, ${0.8 * alpha})`;
        ctx.fillRect(barX, barY, barW, barH);
        const fill = Math.min(1, total / 20);
        ctx.fillStyle = `rgba(${pr}, ${pg}, ${pb}, ${0.7 * alpha})`;
        ctx.fillRect(barX, barY, barW * fill, barH);
      }

      // Equipment
      const equipY = statsY + 90;
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = `rgba(140, 115, 75, ${0.7 * alpha})`;
      ctx.fillText('Equipment:', cardX + 20, equipY);

      ctx.font = '11px monospace';
      const equip = hero.equipment || {};
      const equipSlots = ['weapon', 'armor', 'shield', 'accessory'];
      for (let i = 0; i < equipSlots.length; i++) {
        const slot = equipSlots[i];
        const item = equip[slot];
        const label = slot.charAt(0).toUpperCase() + slot.slice(1);
        ctx.fillStyle = `rgba(120, 100, 70, ${0.6 * alpha})`;
        ctx.fillText(`${label}: ${item ? item.name || item : 'None'}`, cardX + 20, equipY + 16 + i * 15);
      }

      // Game stats (bottom of card)
      const gameY = cardY + cardH - 30;
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(100, 80, 50, ${0.5 * alpha})`;
      ctx.fillText(`Gold: ${this.gold}  |  Dungeons: ${this.dungeons}  |  Fragments: ${this.fragments}`, W / 2, gameY);
    }

    // === Buttons ===
    const btnW = 160;
    const btnH = 48;
    const btnY = H - 90;
    const btnGap = 30;

    const buttons = [
      { label: 'ENTER TAVERN', code: '_charsel_continue' },
      { label: 'CREATE NEW', code: '_charsel_new' },
    ];

    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i];
      const btnX = W / 2 - btnW - btnGap / 2 + i * (btnW + btnGap);
      const isSelected = i === this.selectedButton;

      ctx.fillStyle = isSelected
        ? `rgba(60, 40, 20, ${0.9 * alpha})`
        : `rgba(30, 20, 10, ${0.7 * alpha})`;
      ctx.fillRect(btnX, btnY, btnW, btnH);

      ctx.strokeStyle = isSelected
        ? `rgba(255, 215, 0, ${0.9 * alpha})`
        : `rgba(100, 80, 50, ${0.5 * alpha})`;
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.strokeRect(btnX, btnY, btnW, btnH);

      if (isSelected) {
        ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
        ctx.font = '16px monospace';
        ctx.textAlign = 'right';
        ctx.fillText('▸', btnX - 8, btnY + btnH / 2 + 5);
        ctx.textAlign = 'left';
        ctx.fillText('◂', btnX + btnW + 8, btnY + btnH / 2 + 5);
      }

      ctx.textAlign = 'center';
      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = isSelected
        ? `rgba(255, 215, 0, ${alpha})`
        : `rgba(180, 160, 120, ${0.8 * alpha})`;
      ctx.fillText(btn.label, btnX + btnW / 2, btnY + btnH / 2 + 6);

      // Touch zone
      if (world.input && world.input.touch) {
        world.input.touch.registerHitZone(btnX, btnY, btnW, btnH, btn.code);
      }
    }

    // Footer
    ctx.font = '10px monospace';
    ctx.fillStyle = `rgba(100, 80, 60, ${0.4 * alpha})`;
    ctx.textAlign = 'center';
    ctx.fillText('Arrow keys to select  ·  Enter to confirm  ·  Escape for title', W / 2, H - 20);

    // Fade in
    if (this.fadeIn < 1) {
      ctx.fillStyle = `rgba(0, 0, 0, ${1 - this.fadeIn})`;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.textAlign = 'left';
    ctx.restore();
  }
}
