import { ITEM_ICON_MAP } from '../../render/asset-loader.js';
import { CLASS_DATA } from '../../character/class-data.js';

// Class insight data for the tavern character cards
const CLASS_INSIGHTS = {
  fighter: { role: 'TANK', icon: '⚔', color: '#C0392B', desc: 'High HP, heavy armor, front-line warrior', best: 'Taking hits & dealing steady damage' },
  ranger:  { role: 'STRIKER', icon: '🏹', color: '#27AE60', desc: 'Ranged attacks, nature magic, tracking', best: 'Picking off enemies from distance' },
  mage:    { role: 'CASTER', icon: '✦', color: '#8E44AD', desc: 'Devastating spells, fragile body', best: 'Area damage & arcane destruction' },
  cleric:  { role: 'HEALER', icon: '✚', color: '#F1C40F', desc: 'Divine magic, healing, undead bane', best: 'Keeping the party alive' },
  rogue:   { role: 'SHADOW', icon: '🗡', color: '#2C3E50', desc: 'Stealth, traps, critical strikes', best: 'Sneak attacks & lockpicking' },
  paladin: { role: 'CRUSADER', icon: '⛨', color: '#D4AC0D', desc: 'Holy warrior, smites evil, heals', best: 'Smiting undead & divine protection' },
};

export class TavernState {
  constructor(assets, renderers) {
    this.assets = assets;
    this.renderers = renderers;
    this.mode = 'roster'; // roster, party_select, shop, dungeon_select, leaderboard, strider
    this.selectedCharacter = 0;
    this.selectedPartySlot = 0;
    this.selectedMerchantItem = 0;
    this.selectedPlayerItem = 0;
    this.selectedDungeon = 0;
    this.selectedLeaderboardDungeon = 0;
    this.striderAvailable = false;
    this.striderDialogueIndex = 0;
    this.flickerPhase = 0; // For torch flicker animation
  }

  handleInput(input, world) {
    const code = input.code;

    // Touch: direct card selection
    if (code && code.startsWith('_selectCard_')) {
      const idx = parseInt(code.split('_')[2], 10);
      if (!isNaN(idx)) {
        this.selectedCharacter = idx;
        return true;
      }
    }

    if (this.mode === 'roster') {
      if (code === 'ArrowLeft' || code === 'KeyA') {
        this.selectedCharacter = Math.max(0, this.selectedCharacter - 1);
        return true;
      }
      if (code === 'ArrowRight' || code === 'KeyD') {
        this.selectedCharacter = Math.min(world.roster.getAll().length, this.selectedCharacter + 1);
        return true;
      }
      if (code === 'Space') {
        const roster = world.roster.getAll();
        if (this.selectedCharacter === roster.length) {
          // "Create Custom" card selected — push character create screen
          world.stateStack.pushCharacterCreate();
          return true;
        }
        const char = roster[this.selectedCharacter];
        if (char && world.party.addMember(char)) {
          this.mode = 'party_select';
        }
        return true;
      }
      if (code === 'KeyP') {
        this.mode = 'shop';
        this._resetShopSelection();
        return true;
      }
    }

    if (this.mode === 'party_select') {
      if (code === 'Enter') {
        this.mode = 'dungeon_select';
        return true;
      }
      if (code === 'KeyP') {
        this.mode = 'shop';
        this._resetShopSelection();
        return true;
      }
      if (code === 'Escape') {
        this.mode = 'roster';
        return true;
      }
    }

    if (this.mode === 'shop') {
      if (code === 'ArrowUp' || code === 'KeyW') {
        this.selectedMerchantItem = Math.max(0, this.selectedMerchantItem - 1);
        return true;
      }
      if (code === 'ArrowDown' || code === 'KeyS') {
        this.selectedMerchantItem = Math.min(world.merchant.getInventory().length - 1, this.selectedMerchantItem + 1);
        return true;
      }
      if (code === 'KeyB') {
        const item = world.merchant.getInventory()[this.selectedMerchantItem];
        if (item && world.gold >= world.merchant.getBuyPrice(item)) {
          world.merchant.buyItem(world, item);
        }
        return true;
      }
      if (code === 'KeyV') {
        const item = world.inventory.getAllItems()[this.selectedPlayerItem];
        if (item) {
          world.merchant.sellItem(world, item);
        }
        return true;
      }
      if (code === 'Escape') {
        this.mode = 'roster';
        return true;
      }
    }

    if (this.mode === 'dungeon_select') {
      if (code === 'ArrowUp' || code === 'KeyW') {
        this.selectedDungeon = Math.max(0, this.selectedDungeon - 1);
        return true;
      }
      if (code === 'ArrowDown' || code === 'KeyS') {
        this.selectedDungeon = Math.min(1, this.selectedDungeon + 1); // Only 2 dungeons shown in render
        return true;
      }
      if (code === 'Enter') {
        world.init();
        world.enterDungeon();
        world.stateStack.pushExploring(
          this.renderers.fp,
          this.renderers.minimap,
          this.renderers.ui
        );
        return true;
      }
      if (code === 'Escape') {
        this.mode = 'party_select';
        return true;
      }
    }

    return false;
  }

  _resetShopSelection() {
    this.selectedMerchantItem = 0;
    this.selectedPlayerItem = 0;
  }

  render(layers, world) {
    const ctx = layers.ui || layers;
    this.flickerPhase += 0.05;

    // Clear touch hit zones each frame
    if (world.input && world.input.touch) {
      world.input.touch.clearHitZones();
    }

    this._drawWoodBackground(ctx);
    this._drawTavernTitle(ctx);

    if (this.mode === 'roster') {
      this._renderRoster(ctx, world);
    } else if (this.mode === 'party_select') {
      this._renderPartySelect(ctx, world);
    } else if (this.mode === 'shop') {
      this._renderShop(ctx, world);
    } else if (this.mode === 'dungeon_select') {
      this._renderDungeonSelect(ctx, world);
    } else if (this.mode === 'strider') {
      this._renderStrider(ctx, world);
    }
  }

  // --- Background & Decorations ---

  _drawWoodBackground(ctx) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    // Seeded pseudo-random for consistent weathering per frame
    const _seed = (x, y) => Math.sin(x * 127.1 + y * 311.7) * 43758.5453 % 1;
    const seed = (x, y) => Math.abs(_seed(x, y));

    // Dark base — old stone showing through
    ctx.fillStyle = '#0f0a06';
    ctx.fillRect(0, 0, w, h);

    // Stone patches (behind wood — exposed where planks rotted away)
    const stonePatches = [
      { x: 0, y: 180, w: 110, h: 80 },
      { x: 200, y: 420, w: 90, h: 60 },
      { x: w / 2 + 60, y: 130, w: 80, h: 70 },
      // Large bottom-right stone corner — foundation exposed
      { x: w - 260, y: h - 200, w: 260, h: 150 },
      { x: w - 180, y: h - 280, w: 180, h: 80 },
      // Top-left crumble
      { x: 0, y: 0, w: 80, h: 60 },
    ];
    for (const sp of stonePatches) {
      // Rough stone fill — dark grey with slight warmth
      ctx.fillStyle = '#1e1a16';
      ctx.fillRect(sp.x, sp.y, sp.w, sp.h);

      // Individual stone blocks with slight color variation
      const blockH = 20;
      const blockW = sp.w * 0.45;
      for (let sy = sp.y; sy < sp.y + sp.h; sy += blockH) {
        const rowOffset = ((sy - sp.y) / blockH) % 2 === 0 ? 0 : blockW * 0.5;
        for (let sx = sp.x + rowOffset; sx < sp.x + sp.w; sx += blockW) {
          const bw = Math.min(blockW - 3, sp.x + sp.w - sx);
          const bh = Math.min(blockH - 3, sp.y + sp.h - sy);
          if (bw <= 0 || bh <= 0) continue;
          // Stone color variation
          const sv = seed(sx, sy);
          const r = 30 + sv * 18;
          const g = 27 + sv * 14;
          const b = 22 + sv * 10;
          ctx.fillStyle = `rgb(${r | 0}, ${g | 0}, ${b | 0})`;
          ctx.fillRect(sx + 1, sy + 1, bw, bh);
        }
        // Horizontal mortar line
        ctx.fillStyle = 'rgba(15, 10, 6, 0.7)';
        ctx.fillRect(sp.x, sy, sp.w, 3);
      }
      // Vertical mortar lines
      for (let row = 0; row < sp.h / blockH; row++) {
        const sy = sp.y + row * blockH;
        const rowOffset = row % 2 === 0 ? 0 : blockW * 0.5;
        for (let sx = sp.x + rowOffset; sx < sp.x + sp.w; sx += blockW) {
          ctx.fillStyle = 'rgba(15, 10, 6, 0.6)';
          ctx.fillRect(sx, sy, 3, blockH);
        }
      }

      // Moss/damp stains on stone
      if (sp.h > 60) {
        const mx = sp.x + seed(sp.x + 1, sp.y + 1) * sp.w * 0.5;
        const my = sp.y + sp.h * 0.6;
        const mw = 30 + seed(sp.x + 2, sp.y) * 40;
        ctx.fillStyle = 'rgba(20, 35, 15, 0.25)';
        ctx.fillRect(mx, my, mw, 15);
        ctx.fillStyle = 'rgba(25, 40, 18, 0.15)';
        ctx.fillRect(mx + 5, my - 8, mw - 10, 10);
      }

      // Edge shadow where wood meets stone
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(sp.x, sp.y, sp.w, 2);
      ctx.fillRect(sp.x, sp.y, 2, sp.h);
      ctx.fillRect(sp.x + sp.w - 2, sp.y, 2, sp.h);
      ctx.fillRect(sp.x, sp.y + sp.h - 2, sp.w, 2);
    }

    // Weathered wood planks over stone
    const plankHeight = 32;
    for (let y = 0; y < h; y += plankHeight) {
      const row = y / plankHeight;
      // Vary wood color — some planks darker, some lighter, some greenish (rot)
      const baseR = 35 + seed(row, 0) * 20;
      const baseG = 18 + seed(row, 1) * 12;
      const baseB = 8 + seed(row, 2) * 6;
      const isRotted = seed(row, 3) > 0.75;
      const isMissing = seed(row, 4) > 0.88;

      if (isMissing) continue; // Skip — stone shows through

      if (isRotted) {
        // Rotted plank — darker, greenish tint
        ctx.fillStyle = `rgb(${baseR - 10}, ${baseG + 8}, ${baseB})`;
      } else {
        ctx.fillStyle = `rgb(${baseR | 0}, ${baseG | 0}, ${baseB | 0})`;
      }
      ctx.fillRect(0, y, w, plankHeight - 1);

      // Wood grain lines — irregular
      ctx.strokeStyle = `rgba(0, 0, 0, ${isRotted ? 0.25 : 0.12})`;
      ctx.lineWidth = 1;
      for (let g = 0; g < 3; g++) {
        const gy = y + 5 + g * 9;
        ctx.beginPath();
        ctx.moveTo(0, gy);
        for (let x = 0; x < w; x += 30) {
          const wobble = Math.sin(x * 0.08 + y * 0.3 + g) * 2.5;
          ctx.lineTo(x + 15, gy + wobble);
          ctx.lineTo(x + 30, gy + wobble * 0.3);
        }
        ctx.stroke();
      }

      // Dark knots in wood
      if (seed(row, 5) > 0.5) {
        const kx = seed(row, 6) * (w - 40) + 20;
        const kr = 4 + seed(row, 7) * 5;
        ctx.beginPath();
        ctx.arc(kx, y + plankHeight / 2, kr, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(10, 6, 2, ${0.5 + seed(row, 8) * 0.3})`;
        ctx.fill();
        // Knot ring
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Rot stains — dark wet patches
      if (isRotted) {
        const rx = seed(row, 9) * w * 0.6;
        const rw = 60 + seed(row, 10) * 120;
        ctx.fillStyle = 'rgba(15, 20, 10, 0.35)';
        ctx.fillRect(rx, y + 2, rw, plankHeight - 4);
      }

      // Plank gap — wider and darker than before
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, y + plankHeight - 1, w, 2);
    }

    // Vertical plank joints (staggered, uneven)
    for (let row = 0; row < h / plankHeight; row++) {
      const y = row * plankHeight;
      const offset = row % 2 === 0 ? 0 : w * 0.35;
      for (let x = offset; x < w; x += w * 0.45) {
        const jitter = seed(row, x) * 6 - 3;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(x + jitter, y, 2, plankHeight);
      }
    }

    // Cracks in the wall — thin dark lines
    const cracks = [
      { x1: 120, y1: 60, x2: 135, y2: 130, x3: 128, y3: 180 },
      { x1: w - 200, y1: 200, x2: w - 185, y2: 260, x3: w - 195, y3: 300 },
      { x1: w / 2 + 80, y1: 380, x2: w / 2 + 90, y2: 430, x3: w / 2 + 75, y3: 470 },
    ];
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 1;
    for (const c of cracks) {
      ctx.beginPath();
      ctx.moveTo(c.x1, c.y1);
      ctx.quadraticCurveTo(c.x2, c.y2, c.x3, c.y3);
      ctx.stroke();
      // Thin highlight next to crack
      ctx.strokeStyle = 'rgba(50, 35, 20, 0.2)';
      ctx.beginPath();
      ctx.moveTo(c.x1 + 1, c.y1);
      ctx.quadraticCurveTo(c.x2 + 1, c.y2, c.x3 + 1, c.y3);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    }

    // === Fireplace (center of back wall) ===
    const fpX = w / 2 - 80;
    const fpY = h - 200;
    const fpW = 160;
    const fpH = 150;

    // Stone hearth surround
    ctx.fillStyle = '#2a2220';
    ctx.fillRect(fpX - 12, fpY - 8, fpW + 24, fpH + 8);
    // Hearth arch (rounded top)
    ctx.beginPath();
    ctx.moveTo(fpX, fpY + fpH);
    ctx.lineTo(fpX, fpY + 20);
    ctx.quadraticCurveTo(fpX + fpW / 2, fpY - 30, fpX + fpW, fpY + 20);
    ctx.lineTo(fpX + fpW, fpY + fpH);
    ctx.closePath();
    ctx.fillStyle = '#0a0604';
    ctx.fill();
    ctx.strokeStyle = '#3d3230';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Inner stone border
    ctx.strokeStyle = '#4a3d38';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fpX + 6, fpY + fpH);
    ctx.lineTo(fpX + 6, fpY + 26);
    ctx.quadraticCurveTo(fpX + fpW / 2, fpY - 22, fpX + fpW - 6, fpY + 26);
    ctx.lineTo(fpX + fpW - 6, fpY + fpH);
    ctx.stroke();

    // Mantle shelf
    ctx.fillStyle = '#3d2814';
    ctx.fillRect(fpX - 20, fpY - 12, fpW + 40, 8);
    ctx.fillStyle = '#5a3d1e';
    ctx.fillRect(fpX - 20, fpY - 14, fpW + 40, 3);

    // Logs
    ctx.fillStyle = '#2a1508';
    ctx.fillRect(fpX + 20, fpY + fpH - 30, 50, 12);
    ctx.fillRect(fpX + 60, fpY + fpH - 35, 55, 10);
    ctx.fillStyle = '#3d1e0a';
    ctx.fillRect(fpX + 35, fpY + fpH - 40, 45, 8);

    // Embers at base
    for (let i = 0; i < 12; i++) {
      const ex = fpX + 25 + seed(i, 100) * (fpW - 50);
      const ey = fpY + fpH - 10 - seed(i, 101) * 20;
      const er = 2 + seed(i, 102) * 3;
      const pulse = Math.sin(this.flickerPhase * 2 + i * 1.7) * 0.3 + 0.7;
      ctx.fillStyle = `rgba(255, ${80 + seed(i, 103) * 80 | 0}, 0, ${pulse * 0.6})`;
      ctx.beginPath();
      ctx.arc(ex, ey, er, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fire flames (animated)
    const fireFlicker = Math.sin(this.flickerPhase * 2.5) * 8;
    // Outer flame
    const fireGrad = ctx.createRadialGradient(
      w / 2, fpY + fpH - 50 + fireFlicker * 0.3, 5,
      w / 2, fpY + fpH - 20, 50
    );
    fireGrad.addColorStop(0, 'rgba(255, 220, 50, 0.8)');
    fireGrad.addColorStop(0.4, 'rgba(255, 120, 10, 0.5)');
    fireGrad.addColorStop(1, 'rgba(255, 50, 0, 0)');
    ctx.fillStyle = fireGrad;
    ctx.beginPath();
    ctx.moveTo(fpX + 30, fpY + fpH - 10);
    ctx.quadraticCurveTo(fpX + 50 + fireFlicker, fpY + 40, w / 2, fpY + 30 + fireFlicker * 0.5);
    ctx.quadraticCurveTo(fpX + fpW - 50 - fireFlicker, fpY + 40, fpX + fpW - 30, fpY + fpH - 10);
    ctx.fill();

    // Inner bright flame
    const innerGrad = ctx.createRadialGradient(
      w / 2, fpY + fpH - 45, 3,
      w / 2, fpY + fpH - 25, 30
    );
    innerGrad.addColorStop(0, 'rgba(255, 255, 200, 0.9)');
    innerGrad.addColorStop(0.5, 'rgba(255, 200, 50, 0.4)');
    innerGrad.addColorStop(1, 'rgba(255, 120, 0, 0)');
    ctx.fillStyle = innerGrad;
    ctx.beginPath();
    ctx.ellipse(w / 2, fpY + fpH - 40 + fireFlicker * 0.3, 20, 35 + fireFlicker, 0, 0, Math.PI * 2);
    ctx.fill();

    // Fireplace warm glow on wall above
    const hearthGlow = ctx.createRadialGradient(w / 2, fpY + 20, 10, w / 2, fpY + 20, 250);
    hearthGlow.addColorStop(0, `rgba(255, 140, 30, ${0.15 + Math.sin(this.flickerPhase * 1.5) * 0.04})`);
    hearthGlow.addColorStop(1, 'rgba(255, 80, 0, 0)');
    ctx.fillStyle = hearthGlow;
    ctx.fillRect(w / 2 - 250, 0, 500, fpY + fpH);

    // Warm torch glow overlay (radial gradients on left and right)
    const flicker = Math.sin(this.flickerPhase) * 0.04 + 0.12;
    const glow1 = ctx.createRadialGradient(80, 100, 10, 80, 100, 300);
    glow1.addColorStop(0, `rgba(255, 160, 40, ${flicker + 0.06})`);
    glow1.addColorStop(1, 'rgba(255, 100, 10, 0)');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, 400, 500);

    const glow2 = ctx.createRadialGradient(w - 80, 100, 10, w - 80, 100, 300);
    glow2.addColorStop(0, `rgba(255, 160, 40, ${flicker + 0.04})`);
    glow2.addColorStop(1, 'rgba(255, 100, 10, 0)');
    ctx.fillStyle = glow2;
    ctx.fillRect(w - 400, 0, 400, 500);

    // Bottom bar — old dark tavern bar counter
    ctx.fillStyle = '#0d0704';
    ctx.fillRect(0, h - 50, w, 50);
    ctx.fillStyle = '#2a1a0e';
    ctx.fillRect(0, h - 50, w, 4);
    ctx.fillStyle = '#3d2814';
    ctx.fillRect(0, h - 48, w, 2);
  }

  _drawTavernTitle(ctx) {
    const w = ctx.canvas.width;

    // Carved wooden sign
    const signW = 340;
    const signH = 48;
    const signX = (w - signW) / 2;
    const signY = 8;

    // Sign background
    ctx.fillStyle = '#2a1a0e';
    ctx.fillRect(signX, signY, signW, signH);
    ctx.strokeStyle = '#4a3018';
    ctx.lineWidth = 3;
    ctx.strokeRect(signX, signY, signW, signH);

    // Inner border (carved look)
    ctx.strokeStyle = '#1a0e06';
    ctx.lineWidth = 1;
    ctx.strokeRect(signX + 4, signY + 4, signW - 8, signH - 8);

    // Title text — golden with shadow
    ctx.textAlign = 'center';
    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#0a0500';
    ctx.fillText('THE RUSTY FLAGON', w / 2 + 1, signY + 31);
    ctx.fillStyle = '#FFD700';
    ctx.fillText('THE RUSTY FLAGON', w / 2, signY + 30);

    // Subtitle
    ctx.font = '11px monospace';
    ctx.fillStyle = '#8B7355';
    ctx.fillText('~ Est. the Aureate Age, Year of the Broken Sun ~', w / 2, signY + 44);
    ctx.textAlign = 'left';
  }

  _drawTorchSconce(ctx, x, y) {
    // Wall bracket
    ctx.fillStyle = '#3d2814';
    ctx.fillRect(x - 3, y, 6, 20);
    ctx.fillStyle = '#5a3d1e';
    ctx.fillRect(x - 6, y + 16, 12, 6);

    // Flame (animated flicker)
    const flicker = Math.sin(this.flickerPhase * 3 + x) * 3;
    const flameH = 14 + flicker;

    // Outer flame glow
    ctx.fillStyle = 'rgba(255, 120, 20, 0.6)';
    ctx.beginPath();
    ctx.ellipse(x, y - 4, 8, flameH, 0, 0, Math.PI * 2);
    ctx.fill();

    // Inner flame
    ctx.fillStyle = 'rgba(255, 220, 80, 0.8)';
    ctx.beginPath();
    ctx.ellipse(x, y - 2, 4, flameH * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // White hot core
    ctx.fillStyle = 'rgba(255, 255, 200, 0.9)';
    ctx.beginPath();
    ctx.ellipse(x, y, 2, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Roster Screen (main landing) ---

  _renderRoster(ctx, world) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const roster = world.roster.getAll();

    // Draw torch sconces
    this._drawTorchSconce(ctx, 50, 80);
    this._drawTorchSconce(ctx, w - 50, 80);

    // Notice board header
    ctx.textAlign = 'center';
    ctx.font = '14px monospace';
    ctx.fillStyle = '#C4A265';
    ctx.fillText('ADVENTURERS FOR HIRE', w / 2, 76);
    ctx.fillStyle = '#6b5030';
    ctx.fillText('───────────────────────────', w / 2, 88);
    ctx.textAlign = 'left';

    // Character cards — scrollable window of up to 4 visible
    const cardW = 160;
    const cardH = 380;
    const gap = 16;
    const maxVisible = 4;
    const totalCards = roster.length + 1; // +1 for "Create Custom"
    const visibleCount = Math.min(maxVisible, totalCards);
    const totalW = visibleCount * cardW + (visibleCount - 1) * gap;
    const startX = (w - totalW) / 2;
    const startY = 100;

    // Determine scroll offset to keep selected card visible
    const scrollStart = Math.max(0, Math.min(this.selectedCharacter - Math.floor(maxVisible / 2), totalCards - visibleCount));

    // Draw left arrow indicator if scrolled
    if (scrollStart > 0) {
      ctx.fillStyle = '#C4A265';
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('◄', startX - 20, startY + cardH / 2);
      ctx.textAlign = 'left';
    }

    // Draw visible cards + register touch hit zones
    for (let vi = 0; vi < visibleCount; vi++) {
      const ci = scrollStart + vi;
      const x = startX + vi * (cardW + gap);
      const selected = ci === this.selectedCharacter;

      if (ci < roster.length) {
        this._drawCharacterCard(ctx, roster[ci], x, startY, cardW, cardH, selected);
      } else {
        this._drawCustomCard(ctx, x, startY, cardW, cardH, selected);
      }

      // Register touch zone for this card
      if (world.input && world.input.touch) {
        if (ci === this.selectedCharacter) {
          // Tapping selected card = recruit (Space)
          world.input.touch.registerHitZone(x, startY, cardW, cardH, 'Space');
        } else {
          // Tapping unselected card = select it (arrow key to that index)
          // Use a special code we handle below
          world.input.touch.registerHitZone(x, startY, cardW, cardH, `_selectCard_${ci}`);
        }
      }
    }

    // Draw right arrow indicator if more cards to the right
    if (scrollStart + visibleCount < totalCards) {
      ctx.fillStyle = '#C4A265';
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('►', startX + totalW + 20, startY + cardH / 2);
      ctx.textAlign = 'left';
    }

    // Bottom bar — touch-friendly buttons
    this._drawTouchBar(ctx, w, h, world, [
      { label: '◄', code: 'ArrowLeft', width: 60 },
      { label: 'RECRUIT', code: 'Space', width: 140 },
      { label: '►', code: 'ArrowRight', width: 60 },
      { label: 'SHOP', code: 'KeyP', width: 80 },
    ]);
  }

  _drawCharacterCard(ctx, char, x, y, w, h, selected) {
    const classInfo = CLASS_INSIGHTS[char.class] || CLASS_INSIGHTS.fighter;
    const classData = CLASS_DATA[char.class];

    // Card background — parchment
    if (selected) {
      // Golden glow behind selected card
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 20;
    }
    ctx.fillStyle = selected ? '#3a2a18' : '#2a1c10';
    ctx.fillRect(x, y, w, h);
    ctx.shadowBlur = 0;

    // Card border
    ctx.strokeStyle = selected ? '#FFD700' : '#5a3d20';
    ctx.lineWidth = selected ? 3 : 2;
    ctx.strokeRect(x, y, w, h);

    // Inner border (double-line frame)
    ctx.strokeStyle = selected ? 'rgba(255, 215, 0, 0.3)' : 'rgba(90, 61, 32, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);

    // Portrait — BIG (fills card width)
    const portraitSize = w - 20;
    const portraitX = x + 10;
    const portraitY = y + 10;
    const portrait = char.portrait ? this.assets.get(char.portrait) : null;

    // Portrait frame background
    ctx.fillStyle = '#1a0e06';
    ctx.fillRect(portraitX - 2, portraitY - 2, portraitSize + 4, portraitSize + 4);

    if (portrait) {
      ctx.drawImage(portrait, portraitX, portraitY, portraitSize, portraitSize);
    } else {
      // Fallback silhouette
      ctx.fillStyle = classInfo.color;
      ctx.fillRect(portraitX, portraitY, portraitSize, portraitSize);
      ctx.fillStyle = '#000';
      ctx.font = '60px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(classInfo.icon, portraitX + portraitSize / 2, portraitY + portraitSize / 2 + 20);
      ctx.textAlign = 'left';
    }

    // Portrait frame border
    ctx.strokeStyle = selected ? '#FFD700' : '#6b4e2a';
    ctx.lineWidth = 2;
    ctx.strokeRect(portraitX - 2, portraitY - 2, portraitSize + 4, portraitSize + 4);

    // Role badge (top-right corner of portrait)
    const badgeW = 60;
    const badgeH = 18;
    ctx.fillStyle = classInfo.color;
    ctx.fillRect(portraitX + portraitSize - badgeW + 2, portraitY, badgeW, badgeH);
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(classInfo.role, portraitX + portraitSize - badgeW / 2 + 2, portraitY + 13);
    ctx.textAlign = 'left';

    // Character name
    const nameY = portraitY + portraitSize + 18;
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = selected ? '#FFD700' : '#E8D5B0';
    ctx.textAlign = 'center';
    ctx.fillText(char.name, x + w / 2, nameY);

    // Class + Level
    ctx.font = '11px monospace';
    ctx.fillStyle = classInfo.color;
    ctx.fillText(`${classData.name} · L${char.level}`, x + w / 2, nameY + 16);
    ctx.textAlign = 'left';

    // Stat bars (compact)
    const barStartY = nameY + 28;
    const barX = x + 12;
    const barW = w - 24;
    const barH = 6;
    const barGap = 14;

    // HP bar
    this._drawStatBar(ctx, barX, barStartY, barW, barH, 'HP', char.currentHP, char.maxHP, '#a00', '#0a0');

    // Mana bar
    if (char.maxMana > 0) {
      this._drawStatBar(ctx, barX, barStartY + barGap, barW, barH, 'MP', char.currentMana, char.maxMana, '#224', '#44f');
    }

    // Key stats row
    const statsY = barStartY + barGap * 2 + 6;
    ctx.font = 'bold 11px monospace';

    const stats = [
      { label: 'STR', val: char.stats.str },
      { label: 'DEX', val: char.stats.dex },
      { label: 'CON', val: char.stats.con },
    ];
    const stats2 = [
      { label: 'INT', val: char.stats.int },
      { label: 'WIS', val: char.stats.wis },
      { label: 'CHA', val: char.stats.cha },
    ];

    stats.forEach((s, i) => {
      const sx = barX + i * (barW / 3);
      const highlight = s.val >= 14 ? '#E8D5B0' : '#9B8765';
      ctx.fillStyle = '#000';
      ctx.fillText(`${s.label}:${s.val}`, sx + 1, statsY + 1);
      ctx.fillStyle = highlight;
      ctx.fillText(`${s.label}:${s.val}`, sx, statsY);
    });
    stats2.forEach((s, i) => {
      const sx = barX + i * (barW / 3);
      const highlight = s.val >= 14 ? '#E8D5B0' : '#9B8765';
      ctx.fillStyle = '#000';
      ctx.fillText(`${s.label}:${s.val}`, sx + 1, statsY + 15);
      ctx.fillStyle = highlight;
      ctx.fillText(`${s.label}:${s.val}`, sx, statsY + 14);
    });

    // AC + Weapon
    const infoY = statsY + 30;
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000';
    ctx.fillText(`AC:${char.getAC()} | ${char.getWeaponDamage()}`, x + w / 2 + 1, infoY + 1);
    ctx.fillStyle = '#C4A265';
    ctx.fillText(`AC:${char.getAC()} | ${char.getWeaponDamage()}`, x + w / 2, infoY);

    // "Best at" insight
    ctx.font = '10px monospace';
    ctx.fillStyle = '#000';
    ctx.fillText(classInfo.best, x + w / 2 + 1, infoY + 15);
    ctx.fillStyle = '#9B8765';
    ctx.fillText(classInfo.best, x + w / 2, infoY + 14);
    ctx.textAlign = 'left';
  }

  _drawStatBar(ctx, x, y, w, h, label, current, max, bgColor, fillColor) {
    const pct = Math.max(0, Math.min(1, current / max));

    // Label
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#000';
    ctx.fillText(label, x + 1, y);
    ctx.fillStyle = '#C4A265';
    ctx.fillText(label, x, y - 1);

    // Value
    ctx.textAlign = 'right';
    ctx.fillStyle = '#000';
    ctx.fillText(`${current}/${max}`, x + w + 1, y);
    ctx.fillStyle = '#C4A265';
    ctx.fillText(`${current}/${max}`, x + w, y - 1);
    ctx.textAlign = 'left';

    // Bar background
    ctx.fillStyle = bgColor;
    ctx.fillRect(x, y + 2, w, h);

    // Bar fill
    ctx.fillStyle = fillColor;
    ctx.fillRect(x, y + 2, w * pct, h);

    // Bar border
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y + 2, w, h);
  }

  _drawCustomCard(ctx, x, y, w, h, selected) {
    // Card background
    if (selected) {
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 20;
    }
    ctx.fillStyle = selected ? '#2a2a30' : '#1c1c22';
    ctx.fillRect(x, y, w, h);
    ctx.shadowBlur = 0;

    // Card border (dashed style via segments)
    ctx.strokeStyle = selected ? '#FFD700' : '#5a5a6a';
    ctx.lineWidth = selected ? 3 : 2;
    ctx.setLineDash([8, 4]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);

    // Large "+" icon
    const centerX = x + w / 2;
    const centerY = y + h / 2 - 40;
    const plusSize = 36;

    ctx.fillStyle = selected ? '#FFD700' : '#6a6a7a';
    ctx.fillRect(centerX - 4, centerY - plusSize, 8, plusSize * 2);
    ctx.fillRect(centerX - plusSize, centerY - 4, plusSize * 2, 8);

    // Circle around plus
    ctx.beginPath();
    ctx.arc(centerX, centerY, plusSize + 12, 0, Math.PI * 2);
    ctx.strokeStyle = selected ? '#FFD700' : '#5a5a6a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Text
    ctx.textAlign = 'center';
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#000';
    ctx.fillText('Create', centerX + 1, centerY + plusSize + 36);
    ctx.fillStyle = selected ? '#FFD700' : '#9a9aaa';
    ctx.fillText('Create', centerX, centerY + plusSize + 35);

    ctx.font = '12px monospace';
    ctx.fillStyle = '#000';
    ctx.fillText('Custom Hero', centerX + 1, centerY + plusSize + 54);
    ctx.fillStyle = selected ? '#C4A265' : '#6a6a7a';
    ctx.fillText('Custom Hero', centerX, centerY + plusSize + 53);

    ctx.font = '10px monospace';
    ctx.fillStyle = selected ? '#8B7355' : '#4a4a5a';
    ctx.fillText('Choose class, name', centerX, centerY + plusSize + 74);
    ctx.fillText('& portrait', centerX, centerY + plusSize + 88);
    ctx.textAlign = 'left';
  }

  // --- Touch Button Bar ---

  _drawTouchBar(ctx, canvasW, canvasH, world, buttons) {
    const barH = 50;
    const barY = canvasH - barH;
    const gap = 8;
    const totalW = buttons.reduce((sum, b) => sum + b.width, 0) + (buttons.length - 1) * gap;
    let x = (canvasW - totalW) / 2;

    // Bar background
    ctx.fillStyle = 'rgba(10, 6, 3, 0.85)';
    ctx.fillRect(0, barY, canvasW, barH);
    ctx.fillStyle = '#3d2814';
    ctx.fillRect(0, barY, canvasW, 2);

    for (const btn of buttons) {
      const btnH = 36;
      const btnY = barY + (barH - btnH) / 2;

      // Button background
      ctx.fillStyle = '#2a1a0e';
      ctx.fillRect(x, btnY, btn.width, btnH);
      ctx.strokeStyle = '#5a3d20';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, btnY, btn.width, btnH);

      // Button text
      ctx.fillStyle = '#C4A265';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(btn.label, x + btn.width / 2, btnY + btnH / 2 + 4);
      ctx.textAlign = 'left';

      // Register touch hit zone
      if (world.input && world.input.touch) {
        world.input.touch.registerHitZone(x, btnY, btn.width, btnH, btn.code);
      }

      x += btn.width + gap;
    }
  }

  // --- Party Select ---

  _renderPartySelect(ctx, world) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    // Draw torch sconces
    this._drawTorchSconce(ctx, 50, 80);
    this._drawTorchSconce(ctx, w - 50, 80);

    ctx.textAlign = 'center';
    ctx.font = '14px monospace';
    ctx.fillStyle = '#C4A265';
    ctx.fillText('YOUR PARTY', w / 2, 76);
    ctx.fillStyle = '#6b5030';
    ctx.fillText('───────────────────', w / 2, 88);
    ctx.textAlign = 'left';

    const members = world.party.getMembers();
    const cardW = 160;
    const cardH = 380;
    const gap = 16;
    const totalW = members.length * cardW + (members.length - 1) * gap;
    const startX = (w - totalW) / 2;
    const startY = 100;

    members.forEach((char, i) => {
      this._drawCharacterCard(ctx, char, startX + i * (cardW + gap), startY, cardW, cardH, false);
    });

    // Bottom bar — touch-friendly buttons
    this._drawTouchBar(ctx, w, h, world, [
      { label: 'BACK', code: 'Escape', width: 80 },
      { label: 'ENTER DUNGEON', code: 'Enter', width: 180 },
      { label: 'SHOP', code: 'KeyP', width: 80 },
    ]);
  }

  // --- Shop ---

  _renderShop(ctx, world) {
    const w = ctx.canvas.width;

    ctx.fillStyle = '#C4A265';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MERCHANT SHOP', w / 2, 76);
    ctx.font = '12px monospace';
    ctx.fillStyle = '#FFD700';
    ctx.fillText(`Gold: ${world.gold}`, w / 2, 94);
    ctx.textAlign = 'left';

    // Merchant inventory (left parchment panel)
    const panelW = 340;
    const panelH = 400;
    const leftX = 30;
    const rightX = w - panelW - 30;
    const panelY = 110;

    this._drawPanel(ctx, leftX, panelY, panelW, panelH, 'Merchant Wares');
    this._drawPanel(ctx, rightX, panelY, panelW, panelH, 'Your Items');

    const merchantInventory = world.merchant.getInventory();
    merchantInventory.forEach((item, i) => {
      const y = panelY + 36 + i * 22;
      const prefix = i === this.selectedMerchantItem ? '▸ ' : '  ';
      const price = world.merchant.getBuyPrice(item);
      ctx.fillStyle = i === this.selectedMerchantItem ? '#FFD700' : '#C4A265';
      ctx.font = '12px monospace';
      ctx.fillText(`${prefix}${item.name}`, leftX + 12, y);
      ctx.fillStyle = '#8B7355';
      ctx.textAlign = 'right';
      ctx.fillText(`${price}g`, leftX + panelW - 12, y);
      ctx.textAlign = 'left';
    });

    const playerItems = world.inventory.getAllItems();
    playerItems.forEach((item, i) => {
      const y = panelY + 36 + i * 22;
      const prefix = i === this.selectedPlayerItem ? '▸ ' : '  ';
      const price = world.merchant.getSellPrice(item);
      ctx.fillStyle = i === this.selectedPlayerItem ? '#FFD700' : '#C4A265';
      ctx.font = '12px monospace';
      ctx.fillText(`${prefix}${item.name}`, rightX + 12, y);
      ctx.fillStyle = '#8B7355';
      ctx.textAlign = 'right';
      ctx.fillText(`${price}g`, rightX + panelW - 12, y);
      ctx.textAlign = 'left';
    });

    // Bottom bar — touch-friendly buttons
    this._drawTouchBar(ctx, w, ctx.canvas.height, world, [
      { label: 'BACK', code: 'Escape', width: 80 },
      { label: '▲', code: 'ArrowUp', width: 50 },
      { label: '▼', code: 'ArrowDown', width: 50 },
      { label: 'BUY', code: 'KeyB', width: 80 },
      { label: 'SELL', code: 'KeyV', width: 80 },
    ]);
  }

  _drawPanel(ctx, x, y, w, h, title) {
    // Dark panel with border
    ctx.fillStyle = 'rgba(20, 12, 6, 0.85)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#5a3d20';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Title bar
    ctx.fillStyle = '#2a1a0e';
    ctx.fillRect(x + 1, y + 1, w - 2, 22);
    ctx.fillStyle = '#C4A265';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(title, x + w / 2, y + 16);
    ctx.textAlign = 'left';
  }

  // --- Dungeon Select ---

  _renderDungeonSelect(ctx, world) {
    const w = ctx.canvas.width;

    ctx.textAlign = 'center';
    ctx.font = '14px monospace';
    ctx.fillStyle = '#C4A265';
    ctx.fillText('NOTICE BOARD — EXPEDITIONS AVAILABLE', w / 2, 76);
    ctx.textAlign = 'left';

    const dungeons = [
      { name: 'Whispering Crypts', desc: 'Ancient burial grounds haunted by undead', floors: 5, danger: '★★☆' },
      { name: 'Goblin Warrens', desc: 'Twisted tunnels ruled by goblin clans', floors: 3, danger: '★☆☆' },
    ];

    dungeons.forEach((dungeon, i) => {
      const y = 100 + i * 100;
      const selected = i === this.selectedDungeon;

      // Parchment card for each dungeon
      ctx.fillStyle = selected ? '#3a2a18' : '#2a1c10';
      ctx.fillRect(80, y, w - 160, 80);
      ctx.strokeStyle = selected ? '#FFD700' : '#5a3d20';
      ctx.lineWidth = selected ? 2 : 1;
      ctx.strokeRect(80, y, w - 160, 80);

      const prefix = selected ? '▸ ' : '  ';
      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = selected ? '#FFD700' : '#C4A265';
      ctx.fillText(prefix + dungeon.name, 100, y + 24);

      ctx.font = '12px monospace';
      ctx.fillStyle = '#8B7355';
      ctx.fillText(dungeon.desc, 100, y + 44);
      ctx.fillText(`Floors: ${dungeon.floors}  |  Danger: ${dungeon.danger}`, 100, y + 62);
    });

    // Register touch zones for dungeon entries
    if (world.input && world.input.touch) {
      dungeons.forEach((dungeon, i) => {
        const y = 100 + i * 100;
        world.input.touch.registerHitZone(80, y, w - 160, 80, i === this.selectedDungeon ? 'Enter' : (i < this.selectedDungeon ? 'ArrowUp' : 'ArrowDown'));
      });
    }

    // Bottom bar — touch-friendly buttons
    this._drawTouchBar(ctx, w, ctx.canvas.height, world, [
      { label: 'BACK', code: 'Escape', width: 100 },
      { label: 'SELECT DUNGEON', code: 'Enter', width: 200 },
    ]);
  }

  isStriderAvailable(world) {
    const fragmentsCollected = world.collectedFragments.size;
    const dungeonsCompleted = world.completedDungeons.size;
    return fragmentsCollected >= 2 || dungeonsCompleted >= 5;
  }

  _renderStrider(ctx, world) {
    const w = ctx.canvas.width;
    const centerX = w / 2;
    const startY = 80;

    ctx.textAlign = 'center';
    ctx.fillStyle = '#C0C0C0';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('STRIDER — The Wanderer', centerX, startY);

    ctx.fillStyle = '#8B7355';
    ctx.font = '13px monospace';
    const lines = [
      'Ah, seeker of the lost light. The Sunstone calls to you...',
      'Three thousand years ago, a mage shattered the source of all light.',
      'Now its fragments whisper from the shadows of these ancient dungeons.',
      '',
      `You have found ${world.collectedFragments.size} fragments.`,
      'Each one carries a piece of the consciousness of Dorevus the Unmoored.',
    ];
    lines.forEach((line, i) => {
      ctx.fillText(line, centerX, startY + 40 + i * 24);
    });
    ctx.textAlign = 'left';

    ctx.textAlign = 'center';
    ctx.font = '13px monospace';
    ctx.fillStyle = '#C4A265';
    ctx.fillText('SPACE: Continue    ESC: Back', w / 2, ctx.canvas.height - 20);
    ctx.textAlign = 'left';
  }
}
