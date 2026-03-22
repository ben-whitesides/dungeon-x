import { CombatManager } from '../../combat/combat-manager.js';
import { MONSTER_SPRITE_MAP } from '../../render/asset-loader.js';
import { AnimationQueue } from '../../render/animation-queue.js';

export class CombatState {
  constructor(enemies, assets) {
    this.enemies = enemies;
    this.assets = assets;
    this.combat = new CombatManager();
    this.animQueue = new AnimationQueue();
    this.party = null;
    this.initOrder = null;
    this.selectedAction = null;
    this.currentActor = null;
    this.combatLog = [];
    this.rewardsAwarded = false;
    this.dismissPressed = false;
    this.selectedTarget = 0;
    this.enemyTurnQueue = [];
    this.enemyTurnTimer = 0;
    this.processingEnemyTurns = false;

    // Visual state for atmospheric rendering
    this._flickerPhase = 0;
    this._dustParticles = [];
    for (let i = 0; i < 20; i++) {
      this._dustParticles.push({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.0003,
        vy: 0.0002 + Math.random() * 0.0006,
        size: 0.5 + Math.random() * 1.5,
        alpha: 0.05 + Math.random() * 0.15,
      });
    }
    this._damageFlash = {}; // memberIndex -> timestamp of last hit
    this._logScroll = 0;
    this._selectedActionIdx = 0; // 0=Attack,1=Guard,2=Spell,3=Flee
  }

  _log(msg) {
    this.combatLog.push(msg);
    if (this.combatLog.length > 50) this.combatLog.shift();
  }

  _getEnemySpritePos(enemyIdx) {
    const w = 760;
    const enemyAreaWidth = w - 40;
    const slotWidth = this.enemies.length > 0 ? enemyAreaWidth / this.enemies.length : 0;
    return {
      x: 20 + enemyIdx * slotWidth + slotWidth / 2,
      y: 40 + Math.min(96, slotWidth - 20) / 2
    };
  }

  _getPartyMemberPos(memberIdx) {
    return { x: 120, y: 330 + memberIdx * 22 };
  }

  handleInput(input, world) {
    // NEW-4: Touch target selection
    if (input.code && input.code.startsWith('_selectTarget_')) {
      const idx = parseInt(input.code.split('_')[2], 10);
      if (!isNaN(idx)) {
        this.selectedTarget = idx;
        return true;
      }
    }

    // Initialize combat with party on first input (world now available)
    if (!this.initOrder && world.party) {
      this.party = world.party;
      this.initOrder = this.combat.startCombat(world.party, this.enemies);
      this.combatLog = [];
      this._processEnemyTurns(world);
      return true; // C-1 fix: consume init input, don't also process as action
    }

    // If combat is over, award rewards once then wait for dismiss
    if (this.combat.state === 'victory' || this.combat.state === 'defeat' || this.combat.state === 'fled') {
      if (this.combat.state === 'victory' && !this.rewardsAwarded) {
        // Capture levels before XP award for level-up detection
        const preLevels = {};
        if (world.party) {
          world.party.getMembers().forEach(m => {
            preLevels[m.name + '_' + m.class] = m.level;
          });
        }
        const rewards = this.combat.awardLootAndXP(world, world.floor || 1);
        this.enemies.forEach(e => world.tileMap.removeEntity(e));
        this._log(`Victory! +${rewards.xp} XP, +${rewards.loot} items`);
        this.rewardsAwarded = true;
        // Track level-ups for main loop to show notifications
        this._levelUpData = [];
        if (world.party) {
          world.party.getMembers().forEach(m => {
            const key = m.name + '_' + m.class;
            const oldLevel = preLevels[key] || 1;
            if (m.level > oldLevel) {
              this._levelUpData.push({ character: m, oldLevel, newLevel: m.level });
              this._log(`${m.name} reached Level ${m.level}!`);
            }
          });
        }
        return true; // Show the victory screen, wait for next key
      }
      // Any key press after result shown = dismiss
      this.dismissPressed = true;
      return true;
    }

    const code = input.code;
    const current = this.combat.getCurrentTurnEntity();

    // C-2 fix: if no living entity has a turn, force defeat
    if (!current) {
      this.combat.state = 'defeat';
      return true;
    }

    // Only accept input on player turns
    if (!current.isPlayer) return false;

    // M-7: Target selection — cycle through alive enemies
    if (code === 'ArrowLeft' || code === 'KeyQ') {
      const aliveEnemies = this.enemies.filter(e => e.currentHP > 0);
      if (aliveEnemies.length > 0) {
        this.selectedTarget = ((this.selectedTarget || 0) - 1 + aliveEnemies.length) % aliveEnemies.length;
      }
      return true;
    }
    if (code === 'ArrowRight' || code === 'KeyE') {
      const aliveEnemies = this.enemies.filter(e => e.currentHP > 0);
      if (aliveEnemies.length > 0) {
        this.selectedTarget = ((this.selectedTarget || 0) + 1) % aliveEnemies.length;
      }
      return true;
    }

    if (code === 'KeyA') {
      // Attack selected target
      const aliveEnemies = this.enemies.filter(e => e.currentHP > 0);
      const targetIdx = Math.min(this.selectedTarget || 0, aliveEnemies.length - 1);
      const target = aliveEnemies[targetIdx];
      if (target) {
        const attacker = current.entity;
        const weaponDice = attacker.equipment?.weapon?.damage || '1d6';
        const attackMod = attacker.getModifier('str') + (attacker.getProficiencyBonus ? attacker.getProficiencyBonus() : 2);
        const damageMod = attacker.getModifier('str');
        const result = this.combat.processAttack(attacker, target, weaponDice, attackMod, damageMod);
        const ePos = this._getEnemySpritePos(this.enemies.indexOf(target));
        if (result.success) {
          this._log(`${attacker.name} hits ${target.name} for ${result.damage} damage!`);
          this.animQueue.addAnimation(AnimationQueue.createDamageNumber(ePos.x, ePos.y, result.damage, result.attack?.critical === 'crit'));
          this.animQueue.addAnimation(AnimationQueue.createHitEffect(ePos.x, ePos.y));
          this.animQueue.addParticles(ePos.x, ePos.y, 8, '#ff4444', 400, 80);
          if (result.attack?.critical === 'crit') {
            this.animQueue.addAnimation(AnimationQueue.createScreenShake(8, 300));
          }
          if (target.currentHP <= 0) {
            this.animQueue.addAnimation(AnimationQueue.createDeathEffect(ePos.x, ePos.y - 20));
            this.animQueue.addParticles(ePos.x, ePos.y, 15, '#880000', 800, 60);
          }
        } else {
          this._log(`${attacker.name} misses ${target.name}.`);
          this.animQueue.addAnimation(AnimationQueue.createMissText(ePos.x, ePos.y));
        }
        // NEW-3 fix: clamp target selection after kill
        const stillAlive = this.enemies.filter(e => e.currentHP > 0);
        if (this.selectedTarget >= stillAlive.length) {
          this.selectedTarget = Math.max(0, stillAlive.length - 1);
        }
        if (this.combat.isCombatOver()) {
          this.combat.state = 'victory';
          return true;
        }
        this.combat.advanceTurn();
        this._processEnemyTurns(world);
      }
      return true;
    }
    if (code === 'KeyG') {
      this.combat.processDefend(current.entity);
      this._log(`${current.entity.name} defends.`);
      this.combat.advanceTurn();
      this._processEnemyTurns(world);
      return true;
    }
    if (code === 'KeyF') {
      // M-6 fix: flee consumes the character's turn
      const fleeResult = this.combat.attemptFlee(world.party, world.floor || 1);
      if (fleeResult.fled) {
        this.combat.state = 'fled';
        this._log('Party flees!');
        // NEW-5 fix: don't process enemy turns after successful flee
      } else {
        this._log('Failed to flee!');
        this.combat.advanceTurn();
        this._processEnemyTurns(world);
      }
      return true;
    }
    if (code === 'KeyS') {
      // H-1 fix: spell placeholder skips turn (no free stall)
      this._log(`${current.entity.name} focuses... (no spells learned yet)`);
      this.combat.advanceTurn();
      this._processEnemyTurns(world);
      return true;
    }

    return false;
  }

  _processEnemyTurns(world) {
    // Process all enemy turns until it's a player's turn again
    let safety = 0;
    while (safety < 20) {
      const current = this.combat.getCurrentTurnEntity();
      if (!current) break;
      if (current.isPlayer) break; // Player's turn — stop and wait for input

      const enemy = current.entity;
      if (enemy.currentHP <= 0) {
        this.combat.advanceTurn();
        safety++;
        continue;
      }

      // Enemy AI: attack random alive party member
      const aliveMembers = world.party.getMembers().filter(m => m.isAlive());
      if (aliveMembers.length === 0) {
        this.combat.state = 'defeat';
        break;
      }
      const target = aliveMembers[Math.floor(Math.random() * aliveMembers.length)];
      const attackMod = enemy.attackMod || (enemy.dexMod || 0) + 2;
      const weaponDice = enemy.attack || enemy.damage || '1d6';
      const damageMod = enemy.damageMod || 0;
      const result = this.combat.processAttack(enemy, target, weaponDice, attackMod, damageMod);
      const memberIdx = world.party.getMembers().indexOf(target);
      const mPos = this._getPartyMemberPos(memberIdx >= 0 ? memberIdx : 0);
      if (result.success) {
        this._log(`${enemy.name} hits ${target.name} for ${result.damage}!`);
        this.animQueue.addAnimation(AnimationQueue.createDamageNumber(mPos.x, mPos.y, result.damage, result.attack?.critical === 'crit'));
        this.animQueue.addAnimation(AnimationQueue.createHitEffect(mPos.x, mPos.y));
        if (result.attack?.critical === 'crit') {
          this.animQueue.addAnimation(AnimationQueue.createScreenShake(6, 200));
        }
        // Flash the party member red on hit
        this._damageFlash[memberIdx >= 0 ? memberIdx : 0] = Date.now();
      } else {
        this._log(`${enemy.name} misses ${target.name}.`);
        this.animQueue.addAnimation(AnimationQueue.createMissText(mPos.x, mPos.y));
      }

      // Check for party wipe
      if (!world.party.getMembers().some(m => m.isAlive())) {
        this.combat.state = 'defeat';
        break;
      }

      this.combat.advanceTurn();
      safety++;
    }
  }

  // ============================================================
  // RENDER — Atmospheric dark fantasy combat UI
  // ============================================================

  render(layers, world) {
    const ctx = layers.ui || layers;
    ctx.save(); // H-5 fix: isolate render context

    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Advance flicker phase for animations
    this._flickerPhase += 0.04;

    // Animate dust particles
    for (const p of this._dustParticles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y > 1) { p.y = 0; p.x = Math.random(); }
      if (p.x < 0 || p.x > 1) p.vx *= -1;
    }

    // Clear touch hit zones each frame
    if (world.input && world.input.touch) {
      world.input.touch.clearHitZones();
    }

    const aliveEnemies = this.enemies.filter(e => e.currentHP > 0);

    // === BACKGROUND: Dark dungeon stone ===
    this._renderBackground(ctx, W, H);

    // === ENEMIES: Top half ===
    this._renderEnemies(ctx, W, H, aliveEnemies);

    // === TURN INDICATOR ===
    this._renderTurnIndicator(ctx, W, H);

    // === PARTY DISPLAY: Bottom-left portrait cards ===
    this._renderParty(ctx, W, H, world);

    // === COMBAT LOG: Right side parchment ===
    this._renderCombatLog(ctx, W, H);

    // === VICTORY / DEFEAT / FLED BANNERS ===
    if (this.combat.state === 'victory' || this.combat.state === 'defeat' || this.combat.state === 'fled') {
      this._renderEndBanner(ctx, W, H);
    } else {
      // === ACTION BUTTONS: Medieval parchment buttons ===
      this._renderActionButtons(ctx, W, H, aliveEnemies, world);
    }

    // === ROUND COUNTER: Top-right ===
    this._renderRoundCounter(ctx, W, H);

    // Render animations and particles on top of everything
    this.animQueue.update();
    this.animQueue.render(ctx);
    if (this.animQueue.hasActiveAnimations()) {
      world.needsRender = true; // Keep rendering while animations play
    }

    ctx.restore(); // H-5 fix: restore context state
  }

  // --- Background: Dark stone walls with torch glow and dust ---
  _renderBackground(ctx, W, H) {
    // Base dark stone
    ctx.fillStyle = '#0a0908';
    ctx.fillRect(0, 0, W, H);

    // Stone texture — procedural noise blocks
    const seed = (x, y) => Math.abs(Math.sin(x * 127.1 + y * 311.7) * 43758.5453 % 1);
    for (let y = 0; y < H; y += 18) {
      for (let x = 0; x < W; x += 24) {
        const v = seed(x, y) * 5;
        ctx.fillStyle = `rgba(${12 + v}, ${10 + v}, ${8 + v}, 0.5)`;
        ctx.fillRect(x, y, 24, 18);
        // Mortar lines
        if (seed(x + 1, y) > 0.7) {
          ctx.fillStyle = 'rgba(5, 4, 3, 0.3)';
          ctx.fillRect(x, y, 24, 1);
        }
        if (seed(x, y + 1) > 0.75) {
          ctx.fillStyle = 'rgba(5, 4, 3, 0.3)';
          ctx.fillRect(x, y, 1, 18);
        }
      }
    }

    // Left torch
    const torchLX = 30;
    const torchLY = H * 0.35;
    this._renderTorch(ctx, torchLX, torchLY, this._flickerPhase);

    // Right torch
    const torchRX = W - 30;
    const torchRY = H * 0.35;
    this._renderTorch(ctx, torchRX, torchRY, this._flickerPhase + 1.8);

    // Ambient torch glow across the arena (warm overlay)
    const ambientGlow = ctx.createRadialGradient(W / 2, H * 0.3, 20, W / 2, H * 0.3, W * 0.6);
    ambientGlow.addColorStop(0, 'rgba(255, 120, 30, 0.04)');
    ambientGlow.addColorStop(0.5, 'rgba(200, 80, 15, 0.02)');
    ambientGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = ambientGlow;
    ctx.fillRect(0, 0, W, H);

    // Dust particles in torchlight
    for (const p of this._dustParticles) {
      const px = p.x * W;
      const py = p.y * H;
      const distL = Math.sqrt((px - torchLX) ** 2 + (py - torchLY) ** 2);
      const distR = Math.sqrt((px - torchRX) ** 2 + (py - torchRY) ** 2);
      const nearLight = Math.min(distL, distR);
      if (nearLight < 150) {
        const brightness = (1 - nearLight / 150) * p.alpha;
        ctx.fillStyle = `rgba(255, 200, 120, ${brightness})`;
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Heavy vignette — dark corners
    const vig = ctx.createRadialGradient(W / 2, H * 0.4, W * 0.15, W / 2, H * 0.4, W * 0.7);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    // Stone floor line (divider between arena and party area)
    const floorY = H - 170;
    ctx.fillStyle = 'rgba(30, 24, 18, 0.8)';
    ctx.fillRect(0, floorY, W, 3);
    ctx.fillStyle = 'rgba(50, 40, 28, 0.4)';
    ctx.fillRect(0, floorY + 3, W, 1);
  }

  // --- Single torch with flame and glow ---
  _renderTorch(ctx, x, y, phase) {
    // Torch bracket (small dark rectangle)
    ctx.fillStyle = '#1a1410';
    ctx.fillRect(x - 3, y, 6, 16);
    ctx.fillStyle = '#2a1e14';
    ctx.fillRect(x - 4, y - 2, 8, 4);

    // Flame
    const flick = Math.sin(phase * 3.5) * 3;
    const flick2 = Math.cos(phase * 2.3) * 2;

    // Outer flame
    ctx.fillStyle = 'rgba(255, 140, 30, 0.7)';
    ctx.beginPath();
    ctx.ellipse(x + flick2 * 0.3, y - 10, 6, 12 + flick, 0, 0, Math.PI * 2);
    ctx.fill();

    // Inner bright core
    ctx.fillStyle = 'rgba(255, 230, 80, 0.85)';
    ctx.beginPath();
    ctx.ellipse(x + flick2 * 0.2, y - 8, 3, 7 + flick * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Glow
    const glow = ctx.createRadialGradient(x, y - 6, 3, x, y - 6, 100);
    glow.addColorStop(0, 'rgba(255, 130, 25, 0.12)');
    glow.addColorStop(0.5, 'rgba(200, 80, 10, 0.05)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 100, y - 106, 200, 200);
  }

  // --- Enemies: Portraits/silhouettes with frames and breathing ---
  _renderEnemies(ctx, W, H, aliveEnemies) {
    const enemyAreaWidth = W - 40;
    const slotWidth = this.enemies.length > 0 ? enemyAreaWidth / this.enemies.length : 0;
    const breathScale = 1 + Math.sin(this._flickerPhase * 1.5) * 0.015; // subtle breathing

    this.enemies.forEach((enemy, i) => {
      const slotX = 20 + i * slotWidth + slotWidth / 2;
      const spriteY = 50;
      const spriteSize = Math.min(96, slotWidth - 20);

      const isDead = enemy.currentHP <= 0;
      const aliveIdx = aliveEnemies.indexOf(enemy);
      const isTarget = aliveIdx === (this.selectedTarget || 0) && !isDead;

      // --- Dark ornate frame ---
      const frameX = slotX - spriteSize / 2 - 6;
      const frameY = spriteY - 6;
      const frameW = spriteSize + 12;
      const frameH = spriteSize + 12;

      // Frame shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(frameX + 3, frameY + 3, frameW, frameH);

      // Frame border (gold if targeted, dark wood otherwise)
      if (isTarget) {
        // Gold pulsing selection border
        const pulse = 0.7 + Math.sin(this._flickerPhase * 4) * 0.3;
        ctx.strokeStyle = `rgba(255, 215, 0, ${pulse})`;
        ctx.lineWidth = 3;
        ctx.strokeRect(frameX - 2, frameY - 2, frameW + 4, frameH + 4);

        // Target arrow above
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.moveTo(slotX, frameY - 14);
        ctx.lineTo(slotX - 8, frameY - 24);
        ctx.lineTo(slotX + 8, frameY - 24);
        ctx.fill();
      }

      // Dark wood frame fill
      ctx.fillStyle = '#1a1410';
      ctx.fillRect(frameX, frameY, frameW, frameH);
      ctx.strokeStyle = isDead ? '#2a1a10' : '#3a2a1a';
      ctx.lineWidth = 2;
      ctx.strokeRect(frameX, frameY, frameW, frameH);
      // Inner border
      ctx.strokeStyle = isDead ? '#1a1008' : '#2a1e14';
      ctx.lineWidth = 1;
      ctx.strokeRect(frameX + 3, frameY + 3, frameW - 6, frameH - 6);

      // --- Sprite / Silhouette ---
      ctx.save();
      if (!isDead) {
        // Breathing animation — scale from center
        ctx.translate(slotX, spriteY + spriteSize / 2);
        ctx.scale(breathScale, breathScale);
        ctx.translate(-slotX, -(spriteY + spriteSize / 2));
      }
      if (isDead) {
        ctx.globalAlpha = 0.25;
      }

      const spriteKey = MONSTER_SPRITE_MAP[enemy.type] || MONSTER_SPRITE_MAP[enemy.name?.toLowerCase()];
      const sprite = spriteKey ? this.assets.get(spriteKey) : null;

      if (sprite) {
        ctx.drawImage(sprite, slotX - spriteSize / 2, spriteY, spriteSize, spriteSize);
      } else {
        // Menacing silhouette placeholder
        this._renderSilhouette(ctx, slotX, spriteY, spriteSize, isDead);
      }
      ctx.restore();

      // --- HP bar below frame (gradient style) ---
      const barY = frameY + frameH + 6;
      const barWidth = spriteSize;
      const barHeight = 10;
      const hpPct = Math.max(0, enemy.currentHP / enemy.maxHP);

      // Bar background
      ctx.fillStyle = '#1a0a0a';
      ctx.fillRect(slotX - barWidth / 2, barY, barWidth, barHeight);
      ctx.strokeStyle = '#3a2a1a';
      ctx.lineWidth = 1;
      ctx.strokeRect(slotX - barWidth / 2, barY, barWidth, barHeight);

      // HP fill gradient (red)
      if (hpPct > 0) {
        const hpGrad = ctx.createLinearGradient(slotX - barWidth / 2, barY, slotX - barWidth / 2, barY + barHeight);
        if (hpPct > 0.5) {
          hpGrad.addColorStop(0, '#44aa44');
          hpGrad.addColorStop(1, '#226622');
        } else if (hpPct > 0.25) {
          hpGrad.addColorStop(0, '#ccaa22');
          hpGrad.addColorStop(1, '#886611');
        } else {
          hpGrad.addColorStop(0, '#cc3333');
          hpGrad.addColorStop(1, '#881111');
        }
        ctx.fillStyle = hpGrad;
        ctx.fillRect(slotX - barWidth / 2 + 1, barY + 1, (barWidth - 2) * hpPct, barHeight - 2);
      }

      // HP number overlay on bar
      ctx.fillStyle = '#fff';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${enemy.currentHP}/${enemy.maxHP}`, slotX, barY + barHeight - 1);

      // --- Name plate below HP bar ---
      const nameY = barY + barHeight + 14;
      ctx.fillStyle = isDead ? '#444' : '#c8b888';
      ctx.font = isDead ? '11px monospace' : 'bold 11px monospace';
      ctx.fillText(enemy.name || '???', slotX, nameY);
      if (isDead) {
        ctx.fillStyle = '#600';
        ctx.font = '9px monospace';
        ctx.fillText('SLAIN', slotX, nameY + 12);
      }
      ctx.textAlign = 'left';
    });
  }

  // --- Menacing silhouette when no sprite available ---
  _renderSilhouette(ctx, cx, top, size, isDead) {
    // Dark menacing shape
    const grad = ctx.createRadialGradient(cx, top + size * 0.4, size * 0.1, cx, top + size * 0.5, size * 0.5);
    grad.addColorStop(0, isDead ? '#1a0a0a' : '#3a0a0a');
    grad.addColorStop(1, isDead ? '#080404' : '#1a0505');
    ctx.fillStyle = grad;

    // Rough humanoid shape
    ctx.beginPath();
    // Head
    ctx.arc(cx, top + size * 0.2, size * 0.12, 0, Math.PI * 2);
    ctx.fill();
    // Body
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.2, top + size * 0.3);
    ctx.lineTo(cx + size * 0.2, top + size * 0.3);
    ctx.lineTo(cx + size * 0.25, top + size * 0.7);
    ctx.lineTo(cx + size * 0.1, top + size * 0.95);
    ctx.lineTo(cx - size * 0.1, top + size * 0.95);
    ctx.lineTo(cx - size * 0.25, top + size * 0.7);
    ctx.closePath();
    ctx.fill();

    // Glowing red eyes (if alive)
    if (!isDead) {
      ctx.fillStyle = '#ff2200';
      ctx.beginPath();
      ctx.arc(cx - size * 0.06, top + size * 0.18, 2, 0, Math.PI * 2);
      ctx.arc(cx + size * 0.06, top + size * 0.18, 2, 0, Math.PI * 2);
      ctx.fill();

      // Eye glow
      const eyeGlow = ctx.createRadialGradient(cx, top + size * 0.18, 2, cx, top + size * 0.18, 15);
      eyeGlow.addColorStop(0, 'rgba(255, 30, 0, 0.2)');
      eyeGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = eyeGlow;
      ctx.fillRect(cx - 15, top + size * 0.1, 30, 20);
    }
  }

  // --- Turn indicator ---
  _renderTurnIndicator(ctx, W, H) {
    const current = this.combat.getCurrentTurnEntity();
    if (!current) return;
    if (this.combat.state === 'victory' || this.combat.state === 'defeat' || this.combat.state === 'fled') return;

    const indicatorY = 18;
    const pulse = 0.7 + Math.sin(this._flickerPhase * 3) * 0.3;

    if (current.isPlayer) {
      // Player turn — gold YOUR TURN banner
      const text = 'YOUR TURN';
      ctx.font = 'bold 14px monospace';
      const textW = ctx.measureText(text).width;
      const bx = W / 2 - textW / 2 - 16;

      // Parchment backing
      ctx.fillStyle = 'rgba(40, 32, 20, 0.85)';
      ctx.fillRect(bx, indicatorY - 12, textW + 32, 22);
      ctx.strokeStyle = `rgba(212, 175, 55, ${pulse})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, indicatorY - 12, textW + 32, 22);

      ctx.fillStyle = `rgba(255, 215, 0, ${pulse})`;
      ctx.textAlign = 'center';
      ctx.fillText(text, W / 2, indicatorY + 4);
      ctx.textAlign = 'left';
    } else {
      // Enemy turn
      const name = current.entity.name || 'Enemy';
      const text = `${name}'s turn...`;
      ctx.font = 'bold 13px monospace';
      const textW = ctx.measureText(text).width;
      const bx = W / 2 - textW / 2 - 12;

      ctx.fillStyle = 'rgba(40, 10, 10, 0.8)';
      ctx.fillRect(bx, indicatorY - 12, textW + 24, 22);
      ctx.strokeStyle = 'rgba(180, 40, 40, 0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, indicatorY - 12, textW + 24, 22);

      ctx.fillStyle = `rgba(200, 60, 60, ${pulse})`;
      ctx.textAlign = 'center';
      ctx.fillText(text, W / 2, indicatorY + 4);
      ctx.textAlign = 'left';
    }
  }

  // --- Round counter: top-right ---
  _renderRoundCounter(ctx, W, H) {
    ctx.fillStyle = 'rgba(30, 24, 18, 0.7)';
    ctx.fillRect(W - 100, 4, 94, 22);
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 1;
    ctx.strokeRect(W - 100, 4, 94, 22);

    ctx.fillStyle = '#886b34';
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`Round ${this.combat.roundNumber}`, W - 12, 20);
    ctx.textAlign = 'left';
  }

  // --- Party member portrait cards ---
  _renderParty(ctx, W, H, world) {
    if (!world.party) return;
    const members = world.party.getMembers();
    const current = this.combat.getCurrentTurnEntity();

    const panelY = H - 165;
    const panelH = 115;

    // Dark stone panel background
    ctx.fillStyle = 'rgba(14, 12, 10, 0.9)';
    ctx.fillRect(0, panelY, W * 0.55, panelH);
    ctx.strokeStyle = '#2a1e14';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, panelY, W * 0.55, panelH);

    const cardW = Math.min(120, (W * 0.55 - 20) / members.length - 6);
    const cardH = panelH - 16;
    const startX = 8;

    members.forEach((member, i) => {
      const cx = startX + i * (cardW + 6);
      const cy = panelY + 8;
      const isActive = current && current.isPlayer && current.entity === member;
      const isDead = !member.isAlive();
      const now = Date.now();
      const flashTime = this._damageFlash[i] || 0;
      const isFlashing = (now - flashTime) < 300;

      // Card background
      if (isFlashing) {
        // Red flash on damage
        const flashAlpha = 0.3 + 0.4 * (1 - (now - flashTime) / 300);
        ctx.fillStyle = `rgba(180, 30, 30, ${flashAlpha})`;
      } else if (isDead) {
        ctx.fillStyle = 'rgba(20, 8, 8, 0.9)';
      } else {
        ctx.fillStyle = 'rgba(22, 18, 14, 0.95)';
      }
      ctx.fillRect(cx, cy, cardW, cardH);

      // Border — gold for active, dark for others
      if (isActive) {
        const pulse = 0.7 + Math.sin(this._flickerPhase * 4) * 0.3;
        ctx.strokeStyle = `rgba(255, 215, 0, ${pulse})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(cx - 1, cy - 1, cardW + 2, cardH + 2);

        // Active arrow
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.moveTo(cx + cardW / 2, cy - 6);
        ctx.lineTo(cx + cardW / 2 - 5, cy - 12);
        ctx.lineTo(cx + cardW / 2 + 5, cy - 12);
        ctx.fill();
      } else {
        ctx.strokeStyle = isDead ? '#1a0808' : '#3a2a1a';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx, cy, cardW, cardH);
      }

      // Name
      ctx.fillStyle = isActive ? '#FFD700' : isDead ? '#553333' : '#c8b888';
      ctx.font = isActive ? 'bold 11px monospace' : '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(member.name, cx + cardW / 2, cy + 14);

      // Class
      ctx.fillStyle = isDead ? '#442222' : '#887755';
      ctx.font = '9px monospace';
      ctx.fillText(member.class || '', cx + cardW / 2, cy + 26);

      // HP bar
      const hpBarX = cx + 6;
      const hpBarY = cy + 32;
      const hpBarW = cardW - 12;
      const hpBarH = 10;
      const hpPct = Math.max(0, member.currentHP / member.maxHP);

      // HP bar background
      ctx.fillStyle = '#1a0808';
      ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);

      // HP fill gradient (red tones)
      if (hpPct > 0) {
        const hpGrad = ctx.createLinearGradient(hpBarX, hpBarY, hpBarX, hpBarY + hpBarH);
        hpGrad.addColorStop(0, '#cc3333');
        hpGrad.addColorStop(1, '#881818');
        ctx.fillStyle = hpGrad;
        ctx.fillRect(hpBarX + 1, hpBarY + 1, (hpBarW - 2) * hpPct, hpBarH - 2);
      }

      // HP text
      ctx.fillStyle = '#eee';
      ctx.font = '8px monospace';
      ctx.fillText(`${member.currentHP}/${member.maxHP}`, cx + cardW / 2, hpBarY + hpBarH - 1);

      // MP bar (if member has MP)
      const mpMax = member.maxMP || 0;
      if (mpMax > 0) {
        const mpBarY = hpBarY + hpBarH + 3;
        const mpPct = Math.max(0, (member.currentMP || 0) / mpMax);

        ctx.fillStyle = '#080818';
        ctx.fillRect(hpBarX, mpBarY, hpBarW, hpBarH);

        if (mpPct > 0) {
          const mpGrad = ctx.createLinearGradient(hpBarX, mpBarY, hpBarX, mpBarY + hpBarH);
          mpGrad.addColorStop(0, '#3366cc');
          mpGrad.addColorStop(1, '#1a3366');
          ctx.fillStyle = mpGrad;
          ctx.fillRect(hpBarX + 1, mpBarY + 1, (hpBarW - 2) * mpPct, hpBarH - 2);
        }

        ctx.fillStyle = '#aaccff';
        ctx.font = '8px monospace';
        ctx.fillText(`${member.currentMP || 0}/${mpMax}`, cx + cardW / 2, mpBarY + hpBarH - 1);
      }

      // Dead overlay
      if (isDead) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(cx + 1, cy + 1, cardW - 2, cardH - 2);
        ctx.fillStyle = '#662222';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('DEAD', cx + cardW / 2, cy + cardH / 2 + 4);
      }

      ctx.textAlign = 'left';
    });
  }

  // --- Combat log: Parchment scroll on the right ---
  _renderCombatLog(ctx, W, H) {
    if (!this.combatLog || this.combatLog.length === 0) return;

    const logX = Math.max(W * 0.56, 300);
    const logY = H - 165;
    const logW = W - logX - 4;
    const logH = 115;

    // Parchment background
    const parchGrad = ctx.createLinearGradient(logX, logY, logX, logY + logH);
    parchGrad.addColorStop(0, 'rgba(45, 38, 28, 0.92)');
    parchGrad.addColorStop(0.5, 'rgba(40, 34, 24, 0.95)');
    parchGrad.addColorStop(1, 'rgba(35, 28, 20, 0.92)');
    ctx.fillStyle = parchGrad;
    ctx.fillRect(logX, logY, logW, logH);

    // Parchment border
    ctx.strokeStyle = '#4a3a24';
    ctx.lineWidth = 1;
    ctx.strokeRect(logX, logY, logW, logH);
    // Inner border (double line)
    ctx.strokeStyle = 'rgba(60, 48, 30, 0.5)';
    ctx.strokeRect(logX + 2, logY + 2, logW - 4, logH - 4);

    // Title
    ctx.fillStyle = '#a08850';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('COMBAT LOG', logX + 8, logY + 14);

    // Divider line
    ctx.fillStyle = 'rgba(100, 80, 50, 0.3)';
    ctx.fillRect(logX + 6, logY + 18, logW - 12, 1);

    // Log entries (last 5)
    const logLines = this.combatLog.slice(-5);
    logLines.forEach((line, i) => {
      const isLatest = i === logLines.length - 1;
      ctx.fillStyle = isLatest ? '#d4c8a0' : '#887755';
      ctx.font = '10px monospace';
      // Truncate long lines
      const maxChars = Math.floor((logW - 20) / 6.5);
      const display = line.length > maxChars ? line.substring(0, maxChars - 2) + '..' : line;
      ctx.fillText(display, logX + 8, logY + 34 + i * 16);
    });
  }

  // --- Action buttons: Medieval parchment with wood borders ---
  _renderActionButtons(ctx, W, H, aliveEnemies, world) {
    const current = this.combat.getCurrentTurnEntity();
    const btnAreaY = H - 48;
    const btnAreaH = 48;

    // Dark panel behind buttons
    ctx.fillStyle = 'rgba(18, 14, 10, 0.95)';
    ctx.fillRect(0, btnAreaY, W, btnAreaH);
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, btnAreaY, W, btnAreaH);

    if (current && current.isPlayer) {
      const targetName = aliveEnemies.length > 0
        ? aliveEnemies[Math.min(this.selectedTarget || 0, aliveEnemies.length - 1)]?.name || ''
        : '';

      // Button definitions
      const buttons = [
        { label: 'ATTACK', key: 'A', code: 'KeyA', desc: targetName },
        { label: 'GUARD', key: 'G', code: 'KeyG', desc: '' },
        { label: 'SPELL', key: 'S', code: 'KeyS', desc: '' },
        { label: 'FLEE', key: 'F', code: 'KeyF', desc: '' },
      ];

      const targetBtns = [
        { label: '\u25C4 TGT', key: 'Q', code: 'ArrowLeft' },
        { label: 'TGT \u25BA', key: 'E', code: 'ArrowRight' },
      ];

      // Layout: [<TGT] [ATTACK] [GUARD] [SPELL] [FLEE] [TGT>]
      const totalBtns = targetBtns.length + buttons.length;
      const btnW = Math.floor((W - 12) / totalBtns);
      const allBtns = [targetBtns[0], ...buttons, targetBtns[1]];

      allBtns.forEach((btn, i) => {
        const bx = 6 + i * btnW;
        const by = btnAreaY + 6;
        const bw = btnW - 4;
        const bh = btnAreaH - 12;
        const isAction = i > 0 && i < allBtns.length - 1; // middle 4 are action buttons

        // Parchment button background
        const btnGrad = ctx.createLinearGradient(bx, by, bx, by + bh);
        btnGrad.addColorStop(0, 'rgba(60, 50, 35, 0.9)');
        btnGrad.addColorStop(0.5, 'rgba(50, 42, 28, 0.95)');
        btnGrad.addColorStop(1, 'rgba(40, 32, 22, 0.9)');
        ctx.fillStyle = btnGrad;
        ctx.fillRect(bx, by, bw, bh);

        // Wood-grain border
        ctx.strokeStyle = '#5a4a30';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, bw, bh);
        // Inner highlight
        ctx.strokeStyle = 'rgba(80, 65, 40, 0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx + 2, by + 2, bw - 4, bh - 4);

        // Button label
        ctx.textAlign = 'center';
        ctx.fillStyle = isAction ? '#d4c090' : '#998866';
        ctx.font = isAction ? 'bold 12px monospace' : '10px monospace';
        ctx.fillText(btn.label, bx + bw / 2, by + bh / 2 + (isAction ? 0 : 1));

        // Key hint below label
        if (btn.key) {
          ctx.fillStyle = '#665533';
          ctx.font = '8px monospace';
          ctx.fillText(`[${btn.key}]`, bx + bw / 2, by + bh - 3);
        }

        // Description (target name for attack)
        if (btn.desc) {
          ctx.fillStyle = '#998855';
          ctx.font = '8px monospace';
          const maxW = bw - 8;
          const descText = btn.desc.length > 10 ? btn.desc.substring(0, 9) + '..' : btn.desc;
          ctx.fillText(descText, bx + bw / 2, by + bh / 2 + 12);
        }

        ctx.textAlign = 'left';

        // Register touch hit zone
        if (world.input && world.input.touch) {
          world.input.touch.registerHitZone(bx, by, bw, bh, btn.code);
        }
      });

      // Touch zones on enemy sprites for direct target selection
      if (world.input && world.input.touch) {
        const enemyAreaWidth = W - 40;
        aliveEnemies.forEach((enemy, ei) => {
          const enemySlotW = enemyAreaWidth / this.enemies.length;
          const enemyIdx = this.enemies.indexOf(enemy);
          const sx = 20 + enemyIdx * enemySlotW;
          world.input.touch.registerHitZone(sx, 40, enemySlotW, 120, `_selectTarget_${ei}`);
        });
      }
    } else {
      // Enemy turn indicator
      ctx.fillStyle = '#884444';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Enemy turn...', W / 2, btnAreaY + btnAreaH / 2 + 4);
      ctx.textAlign = 'left';
    }
  }

  // --- Victory / Defeat / Fled banners ---
  _renderEndBanner(ctx, W, H) {
    // Full-screen darkening overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, 0, W, H);

    const bannerY = H / 2 - 40;
    const bannerH = 80;

    // Banner background (dark parchment)
    const bannerGrad = ctx.createLinearGradient(0, bannerY, 0, bannerY + bannerH);
    bannerGrad.addColorStop(0, 'rgba(30, 24, 16, 0.95)');
    bannerGrad.addColorStop(0.5, 'rgba(25, 20, 14, 0.98)');
    bannerGrad.addColorStop(1, 'rgba(30, 24, 16, 0.95)');
    ctx.fillStyle = bannerGrad;
    ctx.fillRect(0, bannerY, W, bannerH);

    // Decorative borders
    ctx.strokeStyle = '#4a3a24';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, bannerY, W, bannerH);
    ctx.fillStyle = 'rgba(100, 80, 50, 0.3)';
    ctx.fillRect(W / 2 - 150, bannerY + bannerH - 3, 300, 1);
    ctx.fillRect(W / 2 - 150, bannerY + 2, 300, 1);

    // Diamond decorations
    const drawDiamond = (dx, dy, size, color) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(dx, dy - size);
      ctx.lineTo(dx + size, dy);
      ctx.lineTo(dx, dy + size);
      ctx.lineTo(dx - size, dy);
      ctx.fill();
    };

    ctx.textAlign = 'center';

    if (this.combat.state === 'victory') {
      drawDiamond(W / 2 - 100, bannerY + bannerH / 2, 4, '#d4af37');
      drawDiamond(W / 2 + 100, bannerY + bannerH / 2, 4, '#d4af37');

      ctx.font = 'bold 28px monospace';
      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillText('VICTORY', W / 2 + 2, bannerY + bannerH / 2 + 2);
      // Gold text
      ctx.fillStyle = '#FFD700';
      ctx.fillText('VICTORY', W / 2, bannerY + bannerH / 2);

      ctx.font = '11px monospace';
      ctx.fillStyle = '#a08850';
      ctx.fillText('Press any key to continue', W / 2, bannerY + bannerH / 2 + 22);
    } else if (this.combat.state === 'defeat') {
      drawDiamond(W / 2 - 80, bannerY + bannerH / 2, 4, '#882222');
      drawDiamond(W / 2 + 80, bannerY + bannerH / 2, 4, '#882222');

      ctx.font = 'bold 28px monospace';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillText('DEFEAT', W / 2 + 2, bannerY + bannerH / 2 + 2);
      ctx.fillStyle = '#C0392B';
      ctx.fillText('DEFEAT', W / 2, bannerY + bannerH / 2);

      ctx.font = '11px monospace';
      ctx.fillStyle = '#886655';
      ctx.fillText('Press any key to return to tavern', W / 2, bannerY + bannerH / 2 + 22);
    } else if (this.combat.state === 'fled') {
      ctx.font = 'bold 24px monospace';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillText('FLED!', W / 2 + 2, bannerY + bannerH / 2 + 2);
      ctx.fillStyle = '#F39C12';
      ctx.fillText('FLED!', W / 2, bannerY + bannerH / 2);

      ctx.font = '11px monospace';
      ctx.fillStyle = '#a08850';
      ctx.fillText('Press any key to continue', W / 2, bannerY + bannerH / 2 + 22);
    }

    ctx.textAlign = 'left';
  }

  isDone() {
    return this.dismissPressed;
  }
}
