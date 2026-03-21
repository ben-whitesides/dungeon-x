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

  render(layers, world) {
    const ctx = layers.ui || layers;
    ctx.save(); // H-5 fix: isolate render context
    // Dark background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Render enemy sprites across the top half
    const enemyAreaWidth = ctx.canvas.width - 40;
    const slotWidth = this.enemies.length > 0 ? enemyAreaWidth / this.enemies.length : 0;

    const aliveEnemies = this.enemies.filter(e => e.currentHP > 0);
    this.enemies.forEach((enemy, i) => {
      const slotX = 20 + i * slotWidth + slotWidth / 2;
      const spriteY = 40;
      const spriteSize = Math.min(96, slotWidth - 20);

      // M-7: Target selection highlight
      const aliveIdx = aliveEnemies.indexOf(enemy);
      const isTarget = aliveIdx === (this.selectedTarget || 0) && enemy.currentHP > 0;
      if (isTarget) {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.strokeRect(slotX - spriteSize / 2 - 4, spriteY - 4, spriteSize + 8, spriteSize + 8);
        ctx.lineWidth = 1;
      }

      // Draw enemy sprite
      const spriteKey = MONSTER_SPRITE_MAP[enemy.type] || MONSTER_SPRITE_MAP[enemy.name?.toLowerCase()];
      const sprite = spriteKey ? this.assets.get(spriteKey) : null;

      if (sprite) {
        ctx.drawImage(
          sprite,
          slotX - spriteSize / 2, spriteY,
          spriteSize, spriteSize
        );
      } else {
        // Fallback: colored silhouette
        ctx.fillStyle = '#600';
        ctx.fillRect(slotX - spriteSize / 2, spriteY, spriteSize, spriteSize);
        ctx.fillStyle = '#f00';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(enemy.name || '???', slotX, spriteY + spriteSize / 2);
        ctx.textAlign = 'left';
      }

      // HP bar below sprite
      const barY = spriteY + spriteSize + 8;
      const barWidth = spriteSize;
      const barHeight = 8;
      const hpPct = enemy.currentHP / enemy.maxHP;

      ctx.fillStyle = '#400';
      ctx.fillRect(slotX - barWidth / 2, barY, barWidth, barHeight);
      ctx.fillStyle = hpPct > 0.5 ? '#0a0' : hpPct > 0.25 ? '#aa0' : '#a00';
      ctx.fillRect(slotX - barWidth / 2, barY, barWidth * hpPct, barHeight);

      // Enemy name below HP bar
      ctx.fillStyle = '#0f0';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${enemy.name}: ${enemy.currentHP}/${enemy.maxHP}`, slotX, barY + 22);
      ctx.textAlign = 'left';
    });

    // Title + round
    ctx.fillStyle = '#f00';
    ctx.font = '18px monospace';
    ctx.fillText('COMBAT', 20, 24);
    ctx.fillStyle = '#888';
    ctx.font = '12px monospace';
    ctx.fillText(`Round ${this.combat.roundNumber}`, 120, 24);

    // Party status (bottom-left)
    const partyY = ctx.canvas.height - 160;
    ctx.fillStyle = '#111';
    ctx.fillRect(0, partyY, ctx.canvas.width, 110);
    if (world.party) {
      const members = world.party.getMembers();
      const current = this.combat.getCurrentTurnEntity();
      members.forEach((member, i) => {
        const y = partyY + 8 + i * 22;
        const isActive = current && current.isPlayer && current.entity === member;
        ctx.fillStyle = isActive ? '#FFD700' : (member.isAlive() ? '#0f0' : '#600');
        ctx.font = isActive ? 'bold 13px monospace' : '13px monospace';
        const arrow = isActive ? '▶ ' : '  ';
        ctx.fillText(`${arrow}${member.name} (${member.class}) HP:${member.currentHP}/${member.maxHP}`, 20, y + 12);
      });
    }

    // Combat log (right side, clamped for narrow screens — M-5 fix)
    if (this.combatLog && this.combatLog.length > 0) {
      const logX = Math.max(220, ctx.canvas.width - 300);
      const logLines = this.combatLog.slice(-5); // Last 5 entries
      ctx.fillStyle = '#333';
      ctx.fillRect(logX - 10, partyY, 310, 110);
      logLines.forEach((line, i) => {
        ctx.fillStyle = i === logLines.length - 1 ? '#FFF' : '#888';
        ctx.font = '11px monospace';
        ctx.fillText(line, logX, partyY + 16 + i * 18);
      });
    }

    // Victory/Defeat/Fled banner
    if (this.combat.state === 'victory') {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, ctx.canvas.height / 2 - 30, ctx.canvas.width, 60);
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('VICTORY!', ctx.canvas.width / 2, ctx.canvas.height / 2 + 8);
      ctx.fillStyle = '#FFF';
      ctx.font = '12px monospace';
      ctx.fillText('Press any key to continue', ctx.canvas.width / 2, ctx.canvas.height / 2 + 28);
      ctx.textAlign = 'left';
    } else if (this.combat.state === 'defeat') {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, ctx.canvas.height / 2 - 30, ctx.canvas.width, 60);
      ctx.fillStyle = '#C0392B';
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('DEFEAT', ctx.canvas.width / 2, ctx.canvas.height / 2 + 8);
      ctx.fillStyle = '#FFF';
      ctx.font = '12px monospace';
      ctx.fillText('Press any key to return to tavern', ctx.canvas.width / 2, ctx.canvas.height / 2 + 28);
      ctx.textAlign = 'left';
    } else if (this.combat.state === 'fled') {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, ctx.canvas.height / 2 - 30, ctx.canvas.width, 60);
      ctx.fillStyle = '#F39C12';
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('FLED!', ctx.canvas.width / 2, ctx.canvas.height / 2 + 8);
      ctx.textAlign = 'left';
    } else {
      // Action menu at bottom + NEW-4: touch support
      ctx.fillStyle = '#111';
      ctx.fillRect(0, ctx.canvas.height - 50, ctx.canvas.width, 50);
      const current = this.combat.getCurrentTurnEntity();
      if (current && current.isPlayer) {
        ctx.fillStyle = '#FFD700';
        ctx.font = '14px monospace';
        const targetName = aliveEnemies.length > 0 ? aliveEnemies[Math.min(this.selectedTarget || 0, aliveEnemies.length - 1)]?.name : '';
        ctx.fillText(`${current.entity.name}'s turn:  A:Attack(${targetName})  G:Guard  F:Flee  Q/E:Target`, 20, ctx.canvas.height - 20);

        // NEW-4: Register touch hit zones for combat actions
        if (world.input && world.input.touch) {
          world.input.touch.clearHitZones();
          const btnY = ctx.canvas.height - 50;
          const btnH = 50;
          const btnW = Math.floor(ctx.canvas.width / 5);
          world.input.touch.registerHitZone(0, btnY, btnW, btnH, 'ArrowLeft');           // ◄ Target
          world.input.touch.registerHitZone(btnW, btnY, btnW, btnH, 'KeyA');              // Attack
          world.input.touch.registerHitZone(btnW * 2, btnY, btnW, btnH, 'KeyG');          // Guard
          world.input.touch.registerHitZone(btnW * 3, btnY, btnW, btnH, 'KeyF');          // Flee
          world.input.touch.registerHitZone(btnW * 4, btnY, btnW, btnH, 'ArrowRight');    // ► Target

          // Touch zones on enemy sprites for direct target selection
          aliveEnemies.forEach((enemy, ei) => {
            const enemySlotW = enemyAreaWidth / this.enemies.length;
            const enemyIdx = this.enemies.indexOf(enemy);
            const sx = 20 + enemyIdx * enemySlotW;
            world.input.touch.registerHitZone(sx, 40, enemySlotW, 120, `_selectTarget_${ei}`);
          });

          // Draw touch button labels
          ctx.fillStyle = '#555';
          ctx.font = '10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('◄TGT', btnW / 2, btnY + 14);
          ctx.fillText('ATTACK', btnW + btnW / 2, btnY + 14);
          ctx.fillText('GUARD', btnW * 2 + btnW / 2, btnY + 14);
          ctx.fillText('FLEE', btnW * 3 + btnW / 2, btnY + 14);
          ctx.fillText('TGT►', btnW * 4 + btnW / 2, btnY + 14);
          ctx.textAlign = 'left';
        }
      } else {
        ctx.fillStyle = '#888';
        ctx.font = '14px monospace';
        ctx.fillText('Enemy turn...', 20, ctx.canvas.height - 20);
      }
    }
    // Render animations and particles on top of everything
    this.animQueue.update();
    this.animQueue.render(ctx);
    if (this.animQueue.hasActiveAnimations()) {
      world.needsRender = true; // Keep rendering while animations play
    }

    ctx.restore(); // H-5 fix: restore context state
  }

  isDone() {
    return this.dismissPressed;
  }
}
