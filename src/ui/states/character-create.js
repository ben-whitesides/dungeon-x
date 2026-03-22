import { Character } from '../../character/character.js';
import { CLASS_DATA } from '../../character/class-data.js';
import { GameSave } from '../../core/game-save.js';

const CLASS_KEYS = Object.keys(CLASS_DATA);

// Step descriptions for the wizard
const STEPS = ['Choose Class', 'Choose Gender', 'Enter Name', 'Review & Confirm'];

/**
 * CharacterCreateState — Full first-run hero creation wizard.
 * Step 1: Choose class (6 options with descriptions + stat preview)
 * Step 2: Choose gender (male/female — determines portrait)
 * Step 3: Enter name (keyboard input with blinking cursor)
 * Step 4: Review & confirm
 *
 * DUAL INPUT: keyboard + touch/click on every step. Min 44x44 touch targets.
 */
export class CharacterCreateState {
  constructor(assets, isFirstRun = false) {
    this.assets = assets;
    this.isFirstRun = isFirstRun; // true = first launch, character becomes party leader
    this.step = 0; // 0-3
    this.selectedClass = 0;
    this.selectedGender = 0; // 0 = male, 1 = female
    this.name = '';
    this.cursorBlink = 0;
    this.cursorVisible = true;
    this.animates = true; // for blinking cursor
    this._lastTimestamp = 0;
    this._confirmSelected = 0; // 0 = confirm, 1 = back
  }

  update(timestamp) {
    if (!this._lastTimestamp) this._lastTimestamp = timestamp;
    const dt = (timestamp - this._lastTimestamp) / 16.67;
    this._lastTimestamp = timestamp;

    // Blink cursor in name entry step
    if (this.step === 2) {
      this.cursorBlink += 0.04 * dt;
      if (this.cursorBlink >= 1) {
        this.cursorBlink = 0;
        this.cursorVisible = !this.cursorVisible;
      }
    }
  }

  handleInput(input, world) {
    const code = input.code;

    // --- Touch: button presses from render pass ---
    if (code && code.startsWith('_cc_')) {
      return this._handleTouchCode(code, world);
    }

    // --- Step 0: Choose Class ---
    if (this.step === 0) {
      if (code === 'ArrowUp' || code === 'KeyW') {
        this.selectedClass = (this.selectedClass - 1 + CLASS_KEYS.length) % CLASS_KEYS.length;
        return true;
      }
      if (code === 'ArrowDown' || code === 'KeyS') {
        this.selectedClass = (this.selectedClass + 1) % CLASS_KEYS.length;
        return true;
      }
      if (code === 'Enter' || code === 'Space') {
        this.step = 1;
        this.selectedGender = 0;
        return true;
      }
      return false;
    }

    // --- Step 1: Choose Gender ---
    if (this.step === 1) {
      if (code === 'ArrowLeft' || code === 'KeyA' || code === 'ArrowUp' || code === 'KeyW') {
        this.selectedGender = this.selectedGender === 0 ? 1 : 0;
        return true;
      }
      if (code === 'ArrowRight' || code === 'KeyD' || code === 'ArrowDown' || code === 'KeyS') {
        this.selectedGender = this.selectedGender === 0 ? 1 : 0;
        return true;
      }
      if (code === 'Enter' || code === 'Space') {
        this.step = 2;
        this.name = '';
        this.cursorBlink = 0;
        this.cursorVisible = true;
        if (world.input) world.input.captureAll = true;
        this._focusHiddenInput();
        return true;
      }
      if (code === 'Escape' || code === 'Backspace') {
        this.step = 0;
        return true;
      }
      return false;
    }

    // --- Step 2: Enter Name ---
    if (this.step === 2) {
      if (code === 'Enter') {
        if (this.name.trim().length > 0) {
          this.step = 3;
          this._confirmSelected = 0;
          if (world.input) world.input.captureAll = false;
          this._blurHiddenInput();
        }
        return true;
      }
      if (code === 'Escape') {
        this.step = 1;
        if (world.input) world.input.captureAll = false;
        this._blurHiddenInput();
        return true;
      }
      if (code === 'Backspace') {
        this.name = this.name.slice(0, -1);
        return true;
      }
      // Character entry
      if (code && code.startsWith('Key') && this.name.length < 16) {
        this.name += input.key;
        return true;
      }
      if (code === 'Space' && this.name.length < 16) {
        this.name += ' ';
        return true;
      }
      // Allow digits
      if (code && code.startsWith('Digit') && this.name.length < 16) {
        this.name += input.key;
        return true;
      }
      return true; // Consume all input in name mode
    }

    // --- Step 3: Review & Confirm ---
    if (this.step === 3) {
      if (code === 'ArrowLeft' || code === 'ArrowRight' || code === 'KeyA' || code === 'KeyD') {
        this._confirmSelected = this._confirmSelected === 0 ? 1 : 0;
        return true;
      }
      if (code === 'Enter' || code === 'Space') {
        if (this._confirmSelected === 0) {
          // CONFIRM — create character
          this._createCharacter(world);
          return true;
        } else {
          // BACK — go to step 0
          this.step = 0;
          return true;
        }
      }
      if (code === 'Escape' || code === 'Backspace') {
        this.step = 2;
        if (world.input) world.input.captureAll = true;
        this._focusHiddenInput();
        return true;
      }
      return false;
    }

    return false;
  }

  _handleTouchCode(code, world) {
    if (code === '_cc_next') {
      // Simulate Enter
      return this.handleInput({ code: 'Enter', key: 'Enter' }, world);
    }
    if (code === '_cc_back') {
      return this.handleInput({ code: 'Escape', key: 'Escape' }, world);
    }
    if (code === '_cc_male') {
      this.selectedGender = 0;
      return true;
    }
    if (code === '_cc_female') {
      this.selectedGender = 1;
      return true;
    }
    if (code === '_cc_confirm') {
      this._confirmSelected = 0;
      this._createCharacter(world);
      return true;
    }
    if (code === '_cc_restart') {
      this._confirmSelected = 1;
      this.step = 0;
      return true;
    }
    // Class selection by index
    if (code.startsWith('_cc_class_')) {
      const idx = parseInt(code.split('_cc_class_')[1], 10);
      if (!isNaN(idx) && idx >= 0 && idx < CLASS_KEYS.length) {
        this.selectedClass = idx;
      }
      return true;
    }
    return false;
  }

  _createCharacter(world) {
    const classKey = CLASS_KEYS[this.selectedClass];
    const gender = this.selectedGender === 0 ? 'm' : 'f';
    const classData = CLASS_DATA[classKey];
    const portraitKey = classData.portrait[gender];

    const character = new Character(this.name.trim(), classKey);
    character.portrait = portraitKey;
    character.isCustom = true;

    if (this.isFirstRun) {
      // First run: this character is the hero / party leader
      world.heroCharacter = character;
      world.roster.add(character);

      // Add default starter NPCs to roster (so tavern has people to recruit)
      const starters = [
        { name: 'Roland', class: 'fighter' },
        { name: 'Elara', class: 'cleric' },
        { name: 'Thane', class: 'rogue' },
        { name: 'Ashara', class: 'mage' },
        { name: 'Kael', class: 'ranger' },
        { name: 'Seraphina', class: 'paladin' },
      ];
      // Don't add a starter that matches the hero's class
      for (const s of starters) {
        if (s.class !== classKey) {
          world.roster.add(new Character(s.name, s.class, 1));
        }
      }
      world.roster.save();

      // Auto-add hero to party slot 1
      world.party.addMember(character);

      // Save custom character
      GameSave.saveCustomCharacters([character]);

      // Save game state
      GameSave.save(world);

      // Transition to tavern
      world.stateStack.pop(); // Remove this state
      world.stateStack.pushTavern(world.renderers || {});
    } else {
      // Non-first-run: adding extra custom character from tavern
      world.roster.add(character);
      world.roster.save();

      // Save to custom characters list (max 5)
      const existing = GameSave.loadCustomCharacters();
      if (existing.length < 5) {
        existing.push(character);
        GameSave.saveCustomCharacters(existing);
      }

      GameSave.save(world);
      world.stateStack.pop(); // Return to tavern roster
    }
  }

  // --- Role badges and class accent colors for the upgraded UI ---
  static get CLASS_ROLES() {
    return {
      fighter:  { role: 'TANK',    color: '#C0392B' },
      ranger:   { role: 'STRIKER', color: '#27AE60' },
      mage:     { role: 'CASTER',  color: '#8E44AD' },
      cleric:   { role: 'HEALER',  color: '#2980B9' },
      rogue:    { role: 'STRIKER', color: '#D4AC0D' },
      paladin:  { role: 'TANK',    color: '#E67E22' },
    };
  }

  static get STAT_COLORS() {
    return {
      str: '#C0392B', dex: '#27AE60', con: '#E67E22',
      int: '#8E44AD', wis: '#2980B9', cha: '#D4AC0D',
    };
  }

  // --- Shared drawing helpers ---

  /** Draw a dark parchment background with medieval double-line border */
  _drawParchmentBG(ctx, W, H) {
    // Base dark parchment
    ctx.fillStyle = '#1a0f08';
    ctx.fillRect(0, 0, W, H);

    // Parchment texture gradient (warm center, dark edges)
    const vig = ctx.createRadialGradient(W / 2, H / 2, W * 0.15, W / 2, H / 2, W * 0.7);
    vig.addColorStop(0, 'rgba(42, 32, 20, 0.4)');
    vig.addColorStop(0.6, 'rgba(10, 6, 3, 0.3)');
    vig.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    // Outer border (thick dark)
    ctx.strokeStyle = '#3a2a14';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, W - 8, H - 8);

    // Inner border (thin gold)
    ctx.strokeStyle = '#886B22';
    ctx.lineWidth = 1;
    ctx.strokeRect(8, 8, W - 16, H - 16);

    // Corner flourishes (small diagonal lines in corners)
    const cLen = 16;
    ctx.strokeStyle = '#664d1a';
    ctx.lineWidth = 2;
    const corners = [[12, 12, 1, 1], [W - 12, 12, -1, 1], [12, H - 12, 1, -1], [W - 12, H - 12, -1, -1]];
    corners.forEach(([cx, cy, dx, dy]) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + cLen * dx, cy + cLen * dy);
      ctx.stroke();
    });
  }

  /** Draw a colored stat bar with label */
  _drawStatBar(ctx, x, y, label, value, barW, barH, color) {
    // Label
    ctx.fillStyle = '#B8A88A';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(label, x, y + barH - 1);

    const bx = x + 36;
    // Background track
    ctx.fillStyle = '#1a1208';
    ctx.fillRect(bx, y, barW, barH);
    ctx.strokeStyle = '#3a2a14';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, y, barW, barH);

    // Filled portion (6-20 range)
    const pct = Math.max(0, Math.min(1, (value - 6) / 14));
    ctx.fillStyle = color;
    ctx.fillRect(bx + 1, y + 1, (barW - 2) * pct, barH - 2);

    // Value text
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(String(value), bx + barW + 18, y + barH - 1);
    ctx.textAlign = 'left';
  }

  /** Draw a role badge (e.g. TANK, STRIKER) */
  _drawRoleBadge(ctx, x, y, role, color) {
    const tw = ctx.measureText(role).width;
    const padX = 6;
    const bw = tw + padX * 2;
    const bh = 16;

    ctx.fillStyle = color;
    ctx.globalAlpha = 0.25;
    ctx.fillRect(x, y, bw, bh);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, bw, bh);

    ctx.fillStyle = color;
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(role, x + padX, y + 12);
    return bw;
  }

  /** Draw an ornate gold frame around a rectangle */
  _drawGoldFrame(ctx, x, y, w, h, lineW) {
    // Outer glow
    ctx.shadowColor = 'rgba(255, 215, 0, 0.4)';
    ctx.shadowBlur = 8;
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = lineW;
    ctx.strokeRect(x, y, w, h);
    ctx.shadowBlur = 0;

    // Inner accent line
    ctx.strokeStyle = '#886B22';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);
  }

  /** Draw a medieval parchment-style button */
  _drawParchmentButton(ctx, x, y, w, h, label, isSelected, variant) {
    // variant: 'confirm' = green tint, 'danger' = red tint, 'default' = brown
    const fills = {
      confirm: isSelected ? '#1a3a1a' : '#161210',
      danger:  isSelected ? '#3a1a1a' : '#161210',
      default: isSelected ? '#2a2018' : '#161210',
    };
    const strokes = {
      confirm: isSelected ? '#FFD700' : '#3a2a14',
      danger:  isSelected ? '#FFD700' : '#3a2a14',
      default: isSelected ? '#FFD700' : '#3a2a14',
    };

    const v = variant || 'default';

    // Button body
    ctx.fillStyle = fills[v];
    ctx.fillRect(x, y, w, h);

    // Border
    if (isSelected) {
      ctx.shadowColor = 'rgba(255, 215, 0, 0.3)';
      ctx.shadowBlur = 6;
    }
    ctx.strokeStyle = strokes[v];
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.strokeRect(x, y, w, h);
    ctx.shadowBlur = 0;

    // Decorative corner ticks on selected
    if (isSelected) {
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2;
      const t = 6;
      // top-left
      ctx.beginPath(); ctx.moveTo(x, y + t); ctx.lineTo(x, y); ctx.lineTo(x + t, y); ctx.stroke();
      // top-right
      ctx.beginPath(); ctx.moveTo(x + w - t, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + t); ctx.stroke();
      // bottom-left
      ctx.beginPath(); ctx.moveTo(x, y + h - t); ctx.lineTo(x, y + h); ctx.lineTo(x + t, y + h); ctx.stroke();
      // bottom-right
      ctx.beginPath(); ctx.moveTo(x + w - t, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - t); ctx.stroke();
    }

    // Label text
    ctx.fillStyle = isSelected ? '#FFD700' : '#8a7a5a';
    ctx.font = isSelected ? 'bold 14px monospace' : '13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + h / 2 + 5);
    ctx.textAlign = 'left';
  }

  // ============================================================
  //  RENDER — main entry point
  // ============================================================
  render(layers, world) {
    const ctx = layers.ui || layers;
    ctx.save();

    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Dark parchment background with medieval border
    this._drawParchmentBG(ctx, W, H);

    // Title bar area
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    const title = this.isFirstRun ? 'CREATE YOUR HERO' : 'CREATE CHARACTER';
    ctx.fillText(title, W / 2, 30);

    // Decorative line under title
    ctx.strokeStyle = '#664d1a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 120, 38);
    ctx.lineTo(W / 2 + 120, 38);
    ctx.stroke();

    // Step indicator text
    ctx.fillStyle = '#8a7a5a';
    ctx.font = '11px monospace';
    ctx.fillText(`Step ${this.step + 1} of 4  --  ${STEPS[this.step]}`, W / 2, 52);

    // Step progress diamonds
    for (let i = 0; i < 4; i++) {
      const dx = W / 2 - 30 + i * 20;
      const dy = 63;
      ctx.save();
      ctx.translate(dx, dy);
      ctx.rotate(Math.PI / 4);
      const size = 4;
      if (i === this.step) {
        ctx.fillStyle = '#FFD700';
        ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';
        ctx.shadowBlur = 4;
      } else if (i < this.step) {
        ctx.fillStyle = '#886B22';
      } else {
        ctx.fillStyle = '#3a2a14';
      }
      ctx.fillRect(-size, -size, size * 2, size * 2);
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Clear touch zones
    if (world.input && world.input.touch) {
      world.input.touch.clearHitZones();
    }

    // Render current step
    if (this.step === 0) this._renderClassSelect(ctx, world);
    else if (this.step === 1) this._renderGenderSelect(ctx, world);
    else if (this.step === 2) this._renderNameEntry(ctx, world);
    else if (this.step === 3) this._renderReview(ctx, world);

    ctx.restore();
  }

  // ============================================================
  //  Step 0 — Choose Class
  // ============================================================
  _renderClassSelect(ctx, world) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    const roles = CharacterCreateState.CLASS_ROLES;
    const statColors = CharacterCreateState.STAT_COLORS;

    // --- LEFT SIDE: Class card list ---
    const listX = 16;
    const listY = 82;
    const cardW = 180;
    const cardH = 46;
    const cardGap = 4;

    ctx.textAlign = 'left';

    CLASS_KEYS.forEach((classKey, i) => {
      const y = listY + i * (cardH + cardGap);
      const classData = CLASS_DATA[classKey];
      const isSelected = i === this.selectedClass;
      const roleInfo = roles[classKey] || { role: '???', color: '#888' };

      // Card background
      ctx.fillStyle = isSelected ? 'rgba(255, 215, 0, 0.08)' : 'rgba(20, 14, 8, 0.6)';
      ctx.fillRect(listX, y, cardW, cardH);

      // Left accent bar (class color)
      ctx.fillStyle = roleInfo.color;
      ctx.globalAlpha = isSelected ? 0.8 : 0.3;
      ctx.fillRect(listX, y, 4, cardH);
      ctx.globalAlpha = 1;

      // Border
      if (isSelected) {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.strokeRect(listX, y, cardW, cardH);
      } else {
        ctx.strokeStyle = '#2a2018';
        ctx.lineWidth = 1;
        ctx.strokeRect(listX, y, cardW, cardH);
      }

      // Class name
      ctx.fillStyle = isSelected ? '#FFD700' : '#B8A88A';
      ctx.font = isSelected ? 'bold 14px monospace' : '13px monospace';
      ctx.fillText(classData.name, listX + 12, y + 18);

      // Role badge
      ctx.font = 'bold 9px monospace';
      this._drawRoleBadge(ctx, listX + 12, y + 24, roleInfo.role, roleInfo.color);

      // HP die info on right side of card
      ctx.fillStyle = isSelected ? '#AAA' : '#5a4a3a';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`d${classData.hpDieMax} HP`, listX + cardW - 8, y + 18);
      ctx.fillText(`${classData.baseMana} MP`, listX + cardW - 8, y + 32);
      ctx.textAlign = 'left';

      // Touch target
      if (world.input && world.input.touch) {
        world.input.touch.registerHitZone(listX, y, cardW, cardH, `_cc_class_${i}`);
      }
    });

    // --- RIGHT SIDE: Selected class detail preview ---
    const selKey = CLASS_KEYS[this.selectedClass];
    const selClass = CLASS_DATA[selKey];
    const roleInfo = roles[selKey] || { role: '???', color: '#888' };
    const previewX = 210;
    const previewY = 82;
    const panelW = W - previewX - 16;

    // Panel background
    ctx.fillStyle = 'rgba(16, 10, 6, 0.7)';
    ctx.fillRect(previewX, previewY, panelW, H - previewY - 70);
    ctx.strokeStyle = '#3a2a14';
    ctx.lineWidth = 1;
    ctx.strokeRect(previewX, previewY, panelW, H - previewY - 70);

    // --- Portraits (male + female side by side) ---
    const pSize = 64;
    const pPad = 10;
    const pStartX = previewX + pPad;
    const pStartY = previewY + 8;

    const maleKey = selClass.portrait.m;
    const femaleKey = selClass.portrait.f;
    const maleImg = this.assets.get(maleKey);
    const femaleImg = this.assets.get(femaleKey);

    // Male portrait frame
    ctx.fillStyle = '#0e0a06';
    ctx.fillRect(pStartX - 2, pStartY - 2, pSize + 4, pSize + 4);
    if (maleImg) {
      ctx.drawImage(maleImg, pStartX, pStartY, pSize, pSize);
    } else {
      ctx.fillStyle = '#1a1208';
      ctx.fillRect(pStartX, pStartY, pSize, pSize);
    }
    ctx.strokeStyle = '#664d1a';
    ctx.lineWidth = 1;
    ctx.strokeRect(pStartX - 2, pStartY - 2, pSize + 4, pSize + 4);

    // Female portrait frame
    const fPX = pStartX + pSize + 8;
    ctx.fillStyle = '#0e0a06';
    ctx.fillRect(fPX - 2, pStartY - 2, pSize + 4, pSize + 4);
    if (femaleImg) {
      ctx.drawImage(femaleImg, fPX, pStartY, pSize, pSize);
    } else {
      ctx.fillStyle = '#1a1208';
      ctx.fillRect(fPX, pStartY, pSize, pSize);
    }
    ctx.strokeStyle = '#664d1a';
    ctx.lineWidth = 1;
    ctx.strokeRect(fPX - 2, pStartY - 2, pSize + 4, pSize + 4);

    // Gender labels under portraits
    ctx.fillStyle = '#5a4a3a';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Male', pStartX + pSize / 2, pStartY + pSize + 12);
    ctx.fillText('Female', fPX + pSize / 2, pStartY + pSize + 12);
    ctx.textAlign = 'left';

    // --- Class name + role badge ---
    const infoX = previewX + pPad;
    let infoY = pStartY + pSize + 24;

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(selClass.name, infoX, infoY);

    ctx.font = 'bold 9px monospace';
    const badgeW = this._drawRoleBadge(ctx, infoX + ctx.measureText(selClass.name).width + 8, infoY - 11, roleInfo.role, roleInfo.color);

    // HP die info line
    infoY += 16;
    ctx.fillStyle = '#8a7a5a';
    ctx.font = '11px monospace';
    ctx.fillText(`Hit Die: d${selClass.hpDieMax}  |  Base Mana: ${selClass.baseMana}`, infoX, infoY);

    // --- Stat bars ---
    infoY += 14;
    const stats = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    const statNames = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
    const barW = Math.min(100, panelW - 80);
    const barH = 8;

    stats.forEach((stat, i) => {
      const sy = infoY + i * 17;
      this._drawStatBar(ctx, infoX, sy, statNames[i], selClass[stat], barW, barH, statColors[stat]);
    });

    // --- Abilities list ---
    let abY = infoY + stats.length * 17 + 8;
    ctx.fillStyle = '#886B22';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('Starting Abilities:', infoX, abY);
    abY += 4;

    if (selClass.abilities) {
      selClass.abilities.slice(0, 4).forEach((ab, i) => {
        abY += 14;
        const lvlTag = ab.unlockLevel > 1 ? ` [Lv${ab.unlockLevel}]` : '';
        ctx.fillStyle = ab.unlockLevel <= 1 ? '#B8A88A' : '#5a4a3a';
        ctx.font = '10px monospace';
        // Truncate description to fit panel
        const maxDesc = Math.floor((panelW - 30) / 6);
        const desc = ab.description.length > maxDesc ? ab.description.slice(0, maxDesc - 2) + '..' : ab.description;
        ctx.fillText(`${ab.name}${lvlTag}`, infoX + 4, abY);
        abY += 11;
        ctx.fillStyle = ab.unlockLevel <= 1 ? '#6a5a4a' : '#3a2a1a';
        ctx.font = '9px monospace';
        ctx.fillText(desc, infoX + 8, abY);
      });
    }

    // Bottom bar: controls
    this._renderBottomBar(ctx, world, W, H, [
      { label: 'SELECT CLASS', code: '_cc_next', width: 200 }
    ], 'W/S: Navigate  ENTER: Select');
  }

  // ============================================================
  //  Step 1 — Choose Gender
  // ============================================================
  _renderGenderSelect(ctx, world) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    const selKey = CLASS_KEYS[this.selectedClass];
    const selClass = CLASS_DATA[selKey];
    const roleInfo = CharacterCreateState.CLASS_ROLES[selKey] || { role: '???', color: '#888' };

    // Class name + role above cards
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(selClass.name, W / 2, 88);

    ctx.font = 'bold 9px monospace';
    const roleW = ctx.measureText(roleInfo.role).width + 12;
    this._drawRoleBadge(ctx, W / 2 - roleW / 2, 93, roleInfo.role, roleInfo.color);

    // Subtitle
    ctx.fillStyle = '#8a7a5a';
    ctx.font = '12px monospace';
    ctx.fillText("Choose your hero's appearance", W / 2, 120);

    // Two large portrait cards
    const cardW = 160;
    const cardH = 240;
    const gap = 30;
    const totalW = cardW * 2 + gap;
    const startX = (W - totalW) / 2;
    const cardY = 135;

    const genders = [
      { label: 'Male', key: selClass.portrait.m, idx: 0 },
      { label: 'Female', key: selClass.portrait.f, idx: 1 },
    ];

    genders.forEach((g, i) => {
      const x = startX + i * (cardW + gap);
      const isSelected = this.selectedGender === g.idx;

      // Card background
      ctx.fillStyle = isSelected ? 'rgba(42, 32, 20, 0.9)' : 'rgba(16, 10, 6, 0.7)';
      ctx.fillRect(x, cardY, cardW, cardH);

      // Border — ornate gold frame if selected
      if (isSelected) {
        this._drawGoldFrame(ctx, x, cardY, cardW, cardH, 3);
      } else {
        ctx.strokeStyle = '#3a2a14';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, cardY, cardW, cardH);
      }

      // Portrait
      const portrait = this.assets.get(g.key);
      const pSize = 128;
      const pX = x + (cardW - pSize) / 2;
      const pY = cardY + 24;

      // Portrait background
      ctx.fillStyle = '#0e0a06';
      ctx.fillRect(pX - 2, pY - 2, pSize + 4, pSize + 4);

      if (portrait) {
        ctx.drawImage(portrait, pX, pY, pSize, pSize);
      } else {
        ctx.fillStyle = '#1a1208';
        ctx.fillRect(pX, pY, pSize, pSize);
        ctx.fillStyle = '#3a2a14';
        ctx.font = '11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('No Portrait', x + cardW / 2, pY + pSize / 2);
      }

      // Portrait inner frame
      ctx.strokeStyle = isSelected ? '#886B22' : '#2a2018';
      ctx.lineWidth = 1;
      ctx.strokeRect(pX - 2, pY - 2, pSize + 4, pSize + 4);

      // Label
      ctx.fillStyle = isSelected ? '#FFD700' : '#8a7a5a';
      ctx.font = isSelected ? 'bold 16px monospace' : '14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(g.label, x + cardW / 2, cardY + cardH - 50);

      // Selection indicator arrow
      if (isSelected) {
        ctx.fillStyle = '#FFD700';
        ctx.font = '18px monospace';
        ctx.fillText('^', x + cardW / 2, cardY + cardH - 20);
      }

      // Touch zone
      if (world.input && world.input.touch) {
        world.input.touch.registerHitZone(x, cardY, cardW, cardH, i === 0 ? '_cc_male' : '_cc_female');
      }
    });

    ctx.textAlign = 'left';

    this._renderBottomBar(ctx, world, W, H, [
      { label: 'BACK', code: '_cc_back', width: 100 },
      { label: 'CONFIRM', code: '_cc_next', width: 160 },
    ], 'A/D: Switch  ENTER: Confirm  ESC: Back');
  }

  // ============================================================
  //  Step 2 — Enter Name
  // ============================================================
  _renderNameEntry(ctx, world) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    const selKey = CLASS_KEYS[this.selectedClass];
    const selClass = CLASS_DATA[selKey];
    const roleInfo = CharacterCreateState.CLASS_ROLES[selKey] || { role: '???', color: '#888' };
    const gender = this.selectedGender === 0 ? 'm' : 'f';
    const portraitKey = selClass.portrait[gender];

    // Portrait displayed prominently
    const portrait = this.assets.get(portraitKey);
    const pSize = 96;
    const pX = (W - pSize) / 2;
    const pY = 84;

    // Portrait background + frame
    ctx.fillStyle = '#0e0a06';
    ctx.fillRect(pX - 3, pY - 3, pSize + 6, pSize + 6);
    if (portrait) {
      ctx.drawImage(portrait, pX, pY, pSize, pSize);
    }
    this._drawGoldFrame(ctx, pX - 3, pY - 3, pSize + 6, pSize + 6, 2);

    // Class + gender info below portrait
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(selClass.name, W / 2, pY + pSize + 18);

    ctx.fillStyle = '#8a7a5a';
    ctx.font = '11px monospace';
    ctx.fillText(this.selectedGender === 0 ? 'Male' : 'Female', W / 2, pY + pSize + 32);

    // "Name Your Hero" prompt
    const promptY = pY + pSize + 54;
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('Name Your Hero', W / 2, promptY);

    // --- Carved wooden plaque name input ---
    const fieldW = 300;
    const fieldH = 48;
    const fieldX = (W - fieldW) / 2;
    const fieldY = promptY + 14;

    // Plaque background (dark wood)
    const woodGrad = ctx.createLinearGradient(fieldX, fieldY, fieldX, fieldY + fieldH);
    woodGrad.addColorStop(0, '#2a1e10');
    woodGrad.addColorStop(0.3, '#1e1408');
    woodGrad.addColorStop(0.7, '#1e1408');
    woodGrad.addColorStop(1, '#2a1e10');
    ctx.fillStyle = woodGrad;
    ctx.fillRect(fieldX, fieldY, fieldW, fieldH);

    // Plaque border (carved look — double line)
    ctx.strokeStyle = '#4a3a1e';
    ctx.lineWidth = 2;
    ctx.strokeRect(fieldX, fieldY, fieldW, fieldH);
    ctx.strokeStyle = '#664d1a';
    ctx.lineWidth = 1;
    ctx.strokeRect(fieldX + 3, fieldY + 3, fieldW - 6, fieldH - 6);

    // Decorative nail dots at corners of plaque
    const nailR = 3;
    ctx.fillStyle = '#886B22';
    [[fieldX + 8, fieldY + 8], [fieldX + fieldW - 8, fieldY + 8],
     [fieldX + 8, fieldY + fieldH - 8], [fieldX + fieldW - 8, fieldY + fieldH - 8]].forEach(([nx, ny]) => {
      ctx.beginPath();
      ctx.arc(nx, ny, nailR, 0, Math.PI * 2);
      ctx.fill();
    });

    // Name text with blinking cursor
    const cursor = this.cursorVisible ? '|' : '';
    ctx.fillStyle = '#FFD700';
    ctx.font = '18px monospace';
    ctx.textAlign = 'left';
    const textX = fieldX + 18;
    ctx.fillText(this.name + cursor, textX, fieldY + 32);

    // Character count (X/16)
    ctx.fillStyle = '#5a4a3a';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${this.name.length}/16`, fieldX + fieldW - 8, fieldY + fieldH + 14);

    // Instructions
    ctx.textAlign = 'center';
    ctx.fillStyle = '#6a5a4a';
    ctx.font = '11px monospace';
    ctx.fillText('Type your name and press ENTER', W / 2, fieldY + fieldH + 34);

    if (this.name.trim().length === 0) {
      ctx.fillStyle = '#5a3a1a';
      ctx.font = '11px monospace';
      ctx.fillText('(Name cannot be empty)', W / 2, fieldY + fieldH + 50);
    }

    this._renderBottomBar(ctx, world, W, H, [
      { label: 'BACK', code: '_cc_back', width: 100 },
      { label: 'CONFIRM NAME', code: '_cc_next', width: 180 },
    ], 'Type name  ENTER: Confirm  ESC: Back');
  }

  // ============================================================
  //  Step 3 — Review & Confirm
  // ============================================================
  _renderReview(ctx, world) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    const classKey = CLASS_KEYS[this.selectedClass];
    const selClass = CLASS_DATA[classKey];
    const roleInfo = CharacterCreateState.CLASS_ROLES[classKey] || { role: '???', color: '#888' };
    const statColors = CharacterCreateState.STAT_COLORS;
    const gender = this.selectedGender === 0 ? 'm' : 'f';
    const portraitKey = selClass.portrait[gender];

    // --- Left column: portrait + identity ---
    const leftX = 20;
    const topY = 80;

    // Large portrait with ornate gold frame
    const portrait = this.assets.get(portraitKey);
    const pSize = 128;

    ctx.fillStyle = '#0e0a06';
    ctx.fillRect(leftX - 3, topY - 3, pSize + 6, pSize + 6);
    if (portrait) {
      ctx.drawImage(portrait, leftX, topY, pSize, pSize);
    }
    this._drawGoldFrame(ctx, leftX - 3, topY - 3, pSize + 6, pSize + 6, 3);

    // Character name
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 18px monospace';
    const nameX = leftX + pSize + 16;
    ctx.fillText(this.name.trim(), nameX, topY + 18);

    // Class + gender
    ctx.fillStyle = '#B8A88A';
    ctx.font = '13px monospace';
    ctx.fillText(`${selClass.name}  -  ${this.selectedGender === 0 ? 'Male' : 'Female'}`, nameX, topY + 36);

    // Role badge
    ctx.font = 'bold 9px monospace';
    this._drawRoleBadge(ctx, nameX, topY + 42, roleInfo.role, roleInfo.color);

    // Level + computed HP/Mana
    const conMod = Math.floor((selClass.con - 10) / 2);
    const castStat = selClass.int > selClass.wis ? selClass.int : selClass.wis;
    const castMod = Math.max(0, Math.floor((castStat - 10) / 2));
    const totalHP = selClass.hpDieMax + conMod;
    const totalMana = selClass.baseMana + castMod;

    ctx.fillStyle = '#8a7a5a';
    ctx.font = '11px monospace';
    let infoY = topY + 66;
    ctx.fillText(`Level 1   HP: ${totalHP}   Mana: ${totalMana}`, nameX, infoY);
    infoY += 14;
    ctx.fillText(`Hit Die: ${selClass.hpDice}   AC: ${selClass.startingAC}`, nameX, infoY);

    // --- Stat bars (full width under portrait area) ---
    const statsY = topY + pSize + 18;
    const stats = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    const statNames = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

    // Section header
    ctx.fillStyle = '#886B22';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('ATTRIBUTES', leftX, statsY);

    // Draw separator
    ctx.strokeStyle = '#3a2a14';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(leftX, statsY + 4);
    ctx.lineTo(leftX + 160, statsY + 4);
    ctx.stroke();

    const barW = 80;
    const barH = 7;
    // Two columns of 3 stats
    stats.forEach((stat, i) => {
      const col = i < 3 ? 0 : 1;
      const row = i % 3;
      const sx = leftX + col * 100;
      const sy = statsY + 12 + row * 16;
      this._drawStatBar(ctx, sx, sy, statNames[i], selClass[stat], barW, barH, statColors[stat]);
    });

    // --- Starting Equipment ---
    const eqStartY = statsY + 12 + 3 * 16 + 10;
    ctx.fillStyle = '#886B22';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('STARTING EQUIPMENT', leftX, eqStartY);
    ctx.strokeStyle = '#3a2a14';
    ctx.beginPath();
    ctx.moveTo(leftX, eqStartY + 4);
    ctx.lineTo(leftX + 200, eqStartY + 4);
    ctx.stroke();

    let eqY = eqStartY + 14;
    if (selClass.startingEquipment) {
      selClass.startingEquipment.forEach((item) => {
        ctx.fillStyle = '#B8A88A';
        ctx.font = '10px monospace';
        let detail = item.name;
        if (item.damage) detail += ` (${item.damage} ${item.damageType || ''})`;
        else if (item.ac) detail += ` (AC ${item.ac})`;
        ctx.fillText(`- ${detail}`, leftX + 4, eqY);
        eqY += 13;
      });
    }

    // --- Starting Abilities ---
    const abStartY = eqY + 8;
    ctx.fillStyle = '#886B22';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('ABILITIES', leftX, abStartY);
    ctx.strokeStyle = '#3a2a14';
    ctx.beginPath();
    ctx.moveTo(leftX, abStartY + 4);
    ctx.lineTo(leftX + 160, abStartY + 4);
    ctx.stroke();

    let abY = abStartY + 14;
    if (selClass.abilities) {
      selClass.abilities.filter(a => a.unlockLevel <= 1).forEach((ab) => {
        ctx.fillStyle = '#D4AC0D';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(ab.name, leftX + 4, abY);
        abY += 12;
        ctx.fillStyle = '#6a5a4a';
        ctx.font = '9px monospace';
        const maxLen = Math.floor((W - leftX - 30) / 5.5);
        const desc = ab.description.length > maxLen ? ab.description.slice(0, maxLen - 2) + '..' : ab.description;
        ctx.fillText(desc, leftX + 8, abY);
        abY += 14;
      });
    }

    // --- Party leader notice ---
    if (this.isFirstRun) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#886B22';
      ctx.font = '11px monospace';
      ctx.fillText('This hero will lead your party.', W / 2, H - 106);
      ctx.textAlign = 'left';
    }

    // --- Confirm / Start Over buttons (parchment style) ---
    const btnW = 170;
    const btnH = 46;
    const btnGap = 20;
    const totalBtnW = btnW * 2 + btnGap;
    const btnX = (W - totalBtnW) / 2;
    const btnY = H - 94;

    // BEGIN ADVENTURE / CREATE button
    const confirmSel = this._confirmSelected === 0;
    const confirmLabel = this.isFirstRun ? 'BEGIN ADVENTURE' : 'CREATE';
    this._drawParchmentButton(ctx, btnX, btnY, btnW, btnH, confirmLabel, confirmSel, 'confirm');

    // START OVER button
    const backSel = this._confirmSelected === 1;
    this._drawParchmentButton(ctx, btnX + btnW + btnGap, btnY, btnW, btnH, 'START OVER', backSel, 'danger');

    // Touch zones for both buttons
    if (world.input && world.input.touch) {
      world.input.touch.registerHitZone(btnX, btnY, btnW, btnH, '_cc_confirm');
      world.input.touch.registerHitZone(btnX + btnW + btnGap, btnY, btnW, btnH, '_cc_restart');
    }

    // Bottom help text
    ctx.fillStyle = '#5a4a3a';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('A/D: Switch  ENTER: Confirm  ESC: Back to Name', W / 2, H - 8);
    ctx.textAlign = 'left';
  }

  _focusHiddenInput() {
    const el = document.getElementById('name-input');
    if (el) {
      el.value = this.name;
      el.focus();
      if (!this._hiddenInputBound) {
        this._hiddenInputBound = true;
        el.addEventListener('input', () => {
          if (this.step === 2) {
            const val = el.value.slice(0, 16);
            this.name = val;
          }
        });
      }
    }
  }

  _blurHiddenInput() {
    const el = document.getElementById('name-input');
    if (el) {
      el.blur();
      el.value = '';
    }
  }

  // Shared bottom bar renderer — medieval parchment style
  _renderBottomBar(ctx, world, W, H, buttons, helpText) {
    const barY = H - 60;
    const barH = 54;
    const btnH = 42;

    // Bar background with top border
    ctx.fillStyle = 'rgba(10, 6, 3, 0.9)';
    ctx.fillRect(0, barY, W, barH + 8);
    ctx.strokeStyle = '#3a2a14';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(12, barY);
    ctx.lineTo(W - 12, barY);
    ctx.stroke();

    // Render buttons
    let bx = (W - buttons.reduce((s, b) => s + b.width + 10, -10)) / 2;
    buttons.forEach(btn => {
      const by = barY + (barH - btnH) / 2;
      this._drawParchmentButton(ctx, bx, by, btn.width, btnH, btn.label, true, 'default');

      if (world.input && world.input.touch) {
        world.input.touch.registerHitZone(bx, by, btn.width, btnH, btn.code);
      }
      bx += btn.width + 10;
    });

    // Help text
    ctx.fillStyle = '#5a4a3a';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(helpText, W / 2, H - 2);
    ctx.textAlign = 'left';
  }
}
