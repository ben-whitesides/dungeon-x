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
        }
        return true;
      }
      if (code === 'Escape') {
        this.step = 1;
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

  render(layers, world) {
    const ctx = layers.ui || layers;
    ctx.save();

    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Dark background
    ctx.fillStyle = '#1a0f08';
    ctx.fillRect(0, 0, W, H);

    // Subtle vignette
    const vig = ctx.createRadialGradient(W / 2, H / 2, W * 0.2, W / 2, H / 2, W * 0.6);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    // Title
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    if (this.isFirstRun) {
      ctx.fillText('CREATE YOUR HERO', W / 2, 32);
    } else {
      ctx.fillText('CREATE CHARACTER', W / 2, 32);
    }

    // Step indicator
    ctx.fillStyle = '#888';
    ctx.font = '12px monospace';
    ctx.fillText(`Step ${this.step + 1}/4: ${STEPS[this.step]}`, W / 2, 50);

    // Step dots
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i === this.step ? '#FFD700' : (i < this.step ? '#886B22' : '#444');
      ctx.beginPath();
      ctx.arc(W / 2 - 30 + i * 20, 60, 4, 0, Math.PI * 2);
      ctx.fill();
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

  // === Step 0: Class Selection ===
  _renderClassSelect(ctx, world) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Class list (left side)
    const listX = 30;
    const listY = 85;
    const itemH = 48;

    ctx.textAlign = 'left';

    CLASS_KEYS.forEach((classKey, i) => {
      const y = listY + i * itemH;
      const classData = CLASS_DATA[classKey];
      const isSelected = i === this.selectedClass;

      // Background highlight
      if (isSelected) {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.12)';
        ctx.fillRect(listX - 8, y - 4, 220, itemH - 4);
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 1;
        ctx.strokeRect(listX - 8, y - 4, 220, itemH - 4);
      }

      // Class name
      ctx.fillStyle = isSelected ? '#FFD700' : '#CCC';
      ctx.font = isSelected ? 'bold 16px monospace' : '14px monospace';
      const arrow = isSelected ? '> ' : '  ';
      ctx.fillText(`${arrow}${classData.name}`, listX, y + 14);

      // Brief role
      ctx.fillStyle = isSelected ? '#AAA' : '#666';
      ctx.font = '11px monospace';
      ctx.fillText(`  HP: d${classData.hpDieMax}  Mana: ${classData.baseMana}`, listX, y + 30);

      // Touch target
      if (world.input && world.input.touch) {
        world.input.touch.registerHitZone(listX - 8, y - 4, 220, itemH - 4, `_cc_class_${i}`);
      }
    });

    // Stats preview (right side)
    const selClass = CLASS_DATA[CLASS_KEYS[this.selectedClass]];
    const previewX = 280;
    const previewY = 85;

    // Portrait preview (both genders)
    const portraitSize = 80;
    const maleKey = selClass.portrait.m;
    const femaleKey = selClass.portrait.f;
    const maleImg = this.assets.get(maleKey);
    const femaleImg = this.assets.get(femaleKey);

    if (maleImg) ctx.drawImage(maleImg, previewX, previewY, portraitSize, portraitSize);
    else { ctx.fillStyle = '#333'; ctx.fillRect(previewX, previewY, portraitSize, portraitSize); }

    if (femaleImg) ctx.drawImage(femaleImg, previewX + portraitSize + 12, previewY, portraitSize, portraitSize);
    else { ctx.fillStyle = '#333'; ctx.fillRect(previewX + portraitSize + 12, previewY, portraitSize, portraitSize); }

    // Class name and description
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(selClass.name, previewX, previewY + portraitSize + 24);

    // Stat bars
    const stats = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    const statNames = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
    const barStartY = previewY + portraitSize + 40;
    const barW = 120;
    const barH = 10;

    stats.forEach((stat, i) => {
      const y = barStartY + i * 22;
      const val = selClass[stat];

      ctx.fillStyle = '#AAA';
      ctx.font = '12px monospace';
      ctx.fillText(`${statNames[i]}: ${val}`, previewX, y + 8);

      // Background bar
      ctx.fillStyle = '#333';
      ctx.fillRect(previewX + 60, y, barW, barH);

      // Filled bar (scale: 8-20 mapped to 0-barW)
      const pct = Math.max(0, (val - 6) / 14);
      const barColor = val >= 16 ? '#27AE60' : val >= 12 ? '#F1C40F' : '#C0392B';
      ctx.fillStyle = barColor;
      ctx.fillRect(previewX + 60, y, barW * pct, barH);
    });

    // Abilities preview
    const abY = barStartY + stats.length * 22 + 10;
    ctx.fillStyle = '#FFD700';
    ctx.font = '13px monospace';
    ctx.fillText('Abilities:', previewX, abY);
    if (selClass.abilities) {
      selClass.abilities.slice(0, 3).forEach((ab, i) => {
        ctx.fillStyle = '#AAA';
        ctx.font = '11px monospace';
        const lvlTxt = ab.unlockLevel > 1 ? ` (Lv${ab.unlockLevel})` : '';
        ctx.fillText(`- ${ab.name}${lvlTxt}`, previewX + 8, abY + 18 + i * 16);
      });
    }

    // Bottom bar: controls
    this._renderBottomBar(ctx, world, W, H, [
      { label: 'SELECT CLASS', code: '_cc_next', width: 200 }
    ], 'W/S: Navigate  ENTER: Select');
  }

  // === Step 1: Gender Selection ===
  _renderGenderSelect(ctx, world) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    const selClass = CLASS_DATA[CLASS_KEYS[this.selectedClass]];

    ctx.textAlign = 'center';
    ctx.fillStyle = '#CCC';
    ctx.font = '16px monospace';
    ctx.fillText(`Class: ${selClass.name}`, W / 2, 90);

    // Two large portrait cards
    const cardW = 180;
    const cardH = 260;
    const gap = 40;
    const totalW = cardW * 2 + gap;
    const startX = (W - totalW) / 2;
    const cardY = 110;

    const genders = [
      { label: 'Male', key: selClass.portrait.m, idx: 0 },
      { label: 'Female', key: selClass.portrait.f, idx: 1 },
    ];

    genders.forEach((g, i) => {
      const x = startX + i * (cardW + gap);
      const isSelected = this.selectedGender === g.idx;

      // Card background
      ctx.fillStyle = isSelected ? 'rgba(255, 215, 0, 0.15)' : 'rgba(40, 30, 20, 0.8)';
      ctx.fillRect(x, cardY, cardW, cardH);

      // Border
      ctx.strokeStyle = isSelected ? '#FFD700' : '#555';
      ctx.lineWidth = isSelected ? 3 : 1;
      ctx.strokeRect(x, cardY, cardW, cardH);

      // Portrait
      const portrait = this.assets.get(g.key);
      const pSize = 128;
      const pX = x + (cardW - pSize) / 2;
      const pY = cardY + 20;
      if (portrait) {
        ctx.drawImage(portrait, pX, pY, pSize, pSize);
      } else {
        ctx.fillStyle = '#444';
        ctx.fillRect(pX, pY, pSize, pSize);
      }

      // Label
      ctx.fillStyle = isSelected ? '#FFD700' : '#AAA';
      ctx.font = isSelected ? 'bold 18px monospace' : '16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(g.label, x + cardW / 2, cardY + cardH - 30);

      // Touch zone
      if (world.input && world.input.touch) {
        world.input.touch.registerHitZone(x, cardY, cardW, cardH, i === 0 ? '_cc_male' : '_cc_female');
      }
    });

    this._renderBottomBar(ctx, world, W, H, [
      { label: 'BACK', code: '_cc_back', width: 100 },
      { label: 'CONFIRM GENDER', code: '_cc_next', width: 200 },
    ], 'A/D: Switch  ENTER: Confirm  ESC: Back');
  }

  // === Step 2: Name Entry ===
  _renderNameEntry(ctx, world) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    const selClass = CLASS_DATA[CLASS_KEYS[this.selectedClass]];
    const gender = this.selectedGender === 0 ? 'm' : 'f';
    const portraitKey = selClass.portrait[gender];

    // Portrait + class
    const portrait = this.assets.get(portraitKey);
    const pSize = 96;
    if (portrait) {
      ctx.drawImage(portrait, (W - pSize) / 2, 85, pSize, pSize);
    }
    ctx.fillStyle = '#CCC';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${selClass.name} - ${this.selectedGender === 0 ? 'Male' : 'Female'}`, W / 2, 200);

    // Name prompt
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('Enter Your Name', W / 2, 240);

    // Name input field
    const fieldW = 320;
    const fieldH = 44;
    const fieldX = (W - fieldW) / 2;
    const fieldY = 260;

    ctx.fillStyle = '#1a1208';
    ctx.fillRect(fieldX, fieldY, fieldW, fieldH);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.strokeRect(fieldX, fieldY, fieldW, fieldH);

    // Name text with blinking cursor
    const cursor = this.cursorVisible ? '|' : '';
    ctx.fillStyle = '#FFF';
    ctx.font = '20px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(this.name + cursor, fieldX + 12, fieldY + 30);

    // Character count
    ctx.fillStyle = '#666';
    ctx.font = '11px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${this.name.length}/16`, fieldX + fieldW - 8, fieldY + fieldH + 16);

    // Instructions
    ctx.textAlign = 'center';
    ctx.fillStyle = '#888';
    ctx.font = '13px monospace';
    ctx.fillText('Type your name and press ENTER', W / 2, 350);

    if (this.name.trim().length === 0) {
      ctx.fillStyle = '#664';
      ctx.fillText('(Name cannot be empty)', W / 2, 375);
    }

    this._renderBottomBar(ctx, world, W, H, [
      { label: 'BACK', code: '_cc_back', width: 100 },
      { label: 'CONFIRM NAME', code: '_cc_next', width: 200 },
    ], 'Type name  ENTER: Confirm  ESC: Back');
  }

  // === Step 3: Review & Confirm ===
  _renderReview(ctx, world) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    const classKey = CLASS_KEYS[this.selectedClass];
    const selClass = CLASS_DATA[classKey];
    const gender = this.selectedGender === 0 ? 'm' : 'f';
    const portraitKey = selClass.portrait[gender];

    // Large portrait
    const portrait = this.assets.get(portraitKey);
    const pSize = 128;
    if (portrait) {
      ctx.drawImage(portrait, 40, 85, pSize, pSize);
    }
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.strokeRect(38, 83, pSize + 4, pSize + 4);

    // Character info
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 22px monospace';
    ctx.fillText(this.name.trim(), 190, 110);

    ctx.fillStyle = '#CCC';
    ctx.font = '16px monospace';
    ctx.fillText(`${selClass.name} - ${this.selectedGender === 0 ? 'Male' : 'Female'}`, 190, 136);

    ctx.fillStyle = '#AAA';
    ctx.font = '13px monospace';
    ctx.fillText(`Level 1  |  HP: ${selClass.hpDieMax + Math.floor((selClass.con - 10) / 2)}  |  Mana: ${selClass.baseMana + Math.max(0, Math.floor(((selClass.int > selClass.wis ? selClass.int : selClass.wis) - 10) / 2))}`, 190, 160);

    // Stats summary
    const statsX = 190;
    const statsY = 185;
    const statPairs = [
      ['STR', selClass.str, 'INT', selClass.int],
      ['DEX', selClass.dex, 'WIS', selClass.wis],
      ['CON', selClass.con, 'CHA', selClass.cha],
    ];
    statPairs.forEach((row, i) => {
      const y = statsY + i * 20;
      ctx.fillStyle = '#AAA';
      ctx.font = '13px monospace';
      ctx.fillText(`${row[0]}: ${row[1]}`, statsX, y);
      ctx.fillText(`${row[2]}: ${row[3]}`, statsX + 120, y);
    });

    // Equipment
    const eqY = statsY + 75;
    ctx.fillStyle = '#886B22';
    ctx.font = '14px monospace';
    ctx.fillText('Starting Equipment:', 40, eqY);
    if (selClass.startingEquipment) {
      selClass.startingEquipment.forEach((item, i) => {
        ctx.fillStyle = '#AAA';
        ctx.font = '12px monospace';
        ctx.fillText(`- ${item.name}`, 50, eqY + 20 + i * 18);
      });
    }

    // Abilities
    const abY = eqY + 20 + (selClass.startingEquipment ? selClass.startingEquipment.length * 18 : 0) + 15;
    ctx.fillStyle = '#886B22';
    ctx.font = '14px monospace';
    ctx.fillText('Abilities:', 40, abY);
    if (selClass.abilities) {
      selClass.abilities.filter(a => a.unlockLevel <= 1).forEach((ab, i) => {
        ctx.fillStyle = '#AAA';
        ctx.font = '12px monospace';
        ctx.fillText(`- ${ab.name}: ${ab.description.slice(0, 50)}`, 50, abY + 20 + i * 18);
      });
    }

    // Confirmation info
    ctx.textAlign = 'center';
    if (this.isFirstRun) {
      ctx.fillStyle = '#FFD700';
      ctx.font = '13px monospace';
      ctx.fillText('This hero will be your party leader.', W / 2, H - 100);
    }

    // Confirm / Start Over buttons
    const btnW = 180;
    const btnH = 48;
    const btnGap = 30;
    const totalBtnW = btnW * 2 + btnGap;
    const btnX = (W - totalBtnW) / 2;
    const btnY = H - 80;

    // Confirm button
    const confirmSel = this._confirmSelected === 0;
    ctx.fillStyle = confirmSel ? '#2a6b2a' : '#222';
    ctx.fillRect(btnX, btnY, btnW, btnH);
    ctx.strokeStyle = confirmSel ? '#FFD700' : '#555';
    ctx.lineWidth = confirmSel ? 3 : 1;
    ctx.strokeRect(btnX, btnY, btnW, btnH);
    ctx.fillStyle = confirmSel ? '#FFD700' : '#AAA';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(this.isFirstRun ? 'BEGIN ADVENTURE' : 'CREATE', btnX + btnW / 2, btnY + 30);

    // Start Over button
    const backSel = this._confirmSelected === 1;
    ctx.fillStyle = backSel ? '#6b2a2a' : '#222';
    ctx.fillRect(btnX + btnW + btnGap, btnY, btnW, btnH);
    ctx.strokeStyle = backSel ? '#FFD700' : '#555';
    ctx.lineWidth = backSel ? 3 : 1;
    ctx.strokeRect(btnX + btnW + btnGap, btnY, btnW, btnH);
    ctx.fillStyle = backSel ? '#FFD700' : '#AAA';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('START OVER', btnX + btnW + btnGap + btnW / 2, btnY + 30);

    // Touch zones
    if (world.input && world.input.touch) {
      world.input.touch.registerHitZone(btnX, btnY, btnW, btnH, '_cc_confirm');
      world.input.touch.registerHitZone(btnX + btnW + btnGap, btnY, btnW, btnH, '_cc_restart');
    }

    ctx.textAlign = 'left';

    // Bottom help
    ctx.fillStyle = '#666';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('A/D: Switch  ENTER: Confirm  ESC: Back to Name', W / 2, H - 6);
    ctx.textAlign = 'left';
  }

  // Shared bottom bar renderer
  _renderBottomBar(ctx, world, W, H, buttons, helpText) {
    const barY = H - 55;
    const barH = 48;

    ctx.fillStyle = '#111';
    ctx.fillRect(0, barY, W, barH + 7);

    // Render buttons
    let bx = (W - buttons.reduce((s, b) => s + b.width + 10, -10)) / 2;
    buttons.forEach(btn => {
      ctx.fillStyle = '#2a2018';
      ctx.fillRect(bx, barY + 4, btn.width, barH - 8);
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, barY + 4, btn.width, barH - 8);

      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(btn.label, bx + btn.width / 2, barY + 28);
      ctx.textAlign = 'left';

      if (world.input && world.input.touch) {
        world.input.touch.registerHitZone(bx, barY + 4, btn.width, barH - 8, btn.code);
      }
      bx += btn.width + 10;
    });

    // Help text
    ctx.fillStyle = '#666';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(helpText, W / 2, H - 2);
    ctx.textAlign = 'left';
  }
}
