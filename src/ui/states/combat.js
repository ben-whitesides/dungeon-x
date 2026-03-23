// Combat State — Card-based shared party deck combat system
// Phase 1: Replaces Attack/Guard/Spell/Flee with card hand + AP system
// Scope: DX-CARD-COMBAT-SYSTEM-SCOPE.md Sections 3, 13, 14

import { MONSTER_SPRITE_MAP } from '../../render/asset-loader.js';
import { AnimationQueue } from '../../render/animation-queue.js';
import { DeckManager } from '../../cards/deck-manager.js';
import { Card } from '../../cards/card.js';
import { STARTER_DECKS } from '../../cards/card-data.js';
import { StatusEffectTracker, STATUS_DISPLAY } from '../../combat/status-effects.js';
import { BlockManager } from '../../combat/block-manager.js';
import { selectIntent, executeIntent, getIntentDisplay, INTENT_TYPE } from '../../combat/intent-system.js';
import { getRandomLoot, createItem } from '../../items/item-data.js';

export class CombatState {
  constructor(enemies, assets) {
    this.enemies = enemies;
    this.assets = assets;
    this.animQueue = new AnimationQueue();
    this.party = null;
    this.combatLog = [];
    this.rewardsAwarded = false;
    this.dismissPressed = false;

    // Compatibility shim for main.js — it reads combat.state and combat.enemies
    const self = this;
    this.combat = {
      get state() { return self.phase; },
      set state(v) { self.phase = v; },
      enemies: this.enemies,
    };

    // Card combat state
    this.deckManager = null;
    this.statusTracker = new StatusEffectTracker();
    this.blockManager = new BlockManager();
    this.ap = 0;
    this.maxAP = 3;
    this.turnNumber = 0;
    this.phase = 'init'; // init, playerTurn, enemyTurn, victory, defeat, fled

    // UI interaction state
    this.selectedCardIdx = -1;    // Index in hand
    this.selectedMemberIdx = -1;  // Party member to assign card to
    this.selectedEnemyIdx = 0;    // Enemy target
    this.selectedAllyIdx = -1;    // Ally target for heal/buff
    this.uiStep = 'selectCard';   // selectCard, selectMember, selectTarget, selectAlly

    // Enemy intents
    this.enemyIntents = new Map(); // enemy -> intent object

    // Visual state
    this._flickerPhase = 0;
    this._dustParticles = [];
    for (let i = 0; i < 20; i++) {
      this._dustParticles.push({
        x: Math.random(), y: Math.random(),
        vx: (Math.random() - 0.5) * 0.0003,
        vy: 0.0002 + Math.random() * 0.0006,
        size: 0.5 + Math.random() * 1.5,
        alpha: 0.05 + Math.random() * 0.15,
      });
    }
    this._damageFlash = {};
    this._logScroll = 0;
  }

  _log(msg) {
    this.combatLog.push(msg);
    if (this.combatLog.length > 50) this.combatLog.shift();
  }

  // ============================================================
  // COMBAT INITIALIZATION
  // ============================================================

  _initCombat(world) {
    this.party = world.party;
    const members = this.party.getMembers();

    // Build shared deck from all party members' starter decks
    const allCardIds = [];
    for (const member of members) {
      const starterIds = STARTER_DECKS[member.class] || [];
      allCardIds.push(...starterIds);
    }

    this.deckManager = new DeckManager(allCardIds);
    this.statusTracker.reset();
    this.blockManager.reset();

    // Set up armor-based starting Block for each member
    for (const member of members) {
      this.blockManager.setStartingBlock(member);
    }

    // Generate initial enemy intents
    for (const enemy of this.enemies) {
      this.enemyIntents.set(enemy, selectIntent(enemy, world.floor || 1));
    }

    this.turnNumber = 1;
    this._startPlayerTurn(world);
  }

  // ============================================================
  // TURN FLOW
  // ============================================================

  _startPlayerTurn(world) {
    this.phase = 'playerTurn';
    this.ap = this.maxAP; // 3 AP per turn

    const aliveMembers = this.party.getMembers().filter(m => m.isAlive());

    // 1. Block decay (previous turn block → armor base)
    this.blockManager.decayBlock(this.statusTracker);

    // 2. Turn-start status ticks for party members (Poison, Regen, Ritual)
    for (const member of aliveMembers) {
      const results = this.statusTracker.tickTurnStart(member);
      for (const r of results) {
        if (r.type === 'poison_tick') {
          this._log(`${r.target.name} takes ${r.damage} poison damage!`);
        } else if (r.type === 'regen_tick') {
          this._log(`${r.target.name} regenerates ${r.healed} HP.`);
        } else if (r.type === 'stunned') {
          this._log(`${r.target.name} is stunned!`);
        }
      }
    }

    // Check for party wipe from poison
    if (!aliveMembers.some(m => m.isAlive())) {
      this.phase = 'defeat';
      return;
    }

    // 3. Draw 5 cards (previous hand already discarded at end of last turn)
    this.deckManager.draw(this.deckManager.cardsPerDraw, aliveMembers);

    // Reset UI state
    this.selectedCardIdx = -1;
    this.selectedMemberIdx = -1;
    this.uiStep = 'selectCard';

    this._log(`--- Turn ${this.turnNumber} --- AP: ${this.ap}/${this.maxAP}`);
  }

  _endPlayerTurn(world) {
    const aliveMembers = this.party.getMembers().filter(m => m.isAlive());

    // Turn-end status ticks for party (Burn, Weak/Vulnerable/Frail decay)
    for (const member of aliveMembers) {
      const results = this.statusTracker.tickTurnEnd(member);
      for (const r of results) {
        if (r.type === 'burn_tick') {
          this._log(`${r.target.name} takes ${r.damage} burn damage!`);
        }
      }
    }

    // Discard remaining hand (Retain cards kept, Ethereal cards exhausted)
    this.deckManager.endTurn();

    // Check party wipe from burn
    if (!aliveMembers.some(m => m.isAlive())) {
      this.phase = 'defeat';
      return;
    }

    // Enemy turn
    this._processEnemyTurn(world);
  }

  _processEnemyTurn(world) {
    this.phase = 'enemyTurn';
    const aliveMembers = () => this.party.getMembers().filter(m => m.isAlive());

    for (const enemy of this.enemies) {
      if (enemy.currentHP <= 0) continue;

      // Check if enemy is stunned
      if (this.statusTracker.isStunned(enemy)) {
        const stunResults = this.statusTracker.tickTurnStart(enemy);
        this._log(`${enemy.name} is stunned and cannot act!`);
        continue;
      }

      // Tick enemy turn-start (poison on enemies)
      const startResults = this.statusTracker.tickTurnStart(enemy);
      for (const r of startResults) {
        if (r.type === 'poison_tick') {
          this._log(`${enemy.name} takes ${r.damage} poison damage!`);
          if (enemy.currentHP <= 0) {
            this._log(`${enemy.name} dies to poison!`);
          }
        }
      }
      if (enemy.currentHP <= 0) continue;

      // Execute intent
      const intent = this.enemyIntents.get(enemy);
      if (!intent) continue;

      const members = aliveMembers();
      if (members.length === 0) {
        this.phase = 'defeat';
        return;
      }

      const intentResults = executeIntent(enemy, intent, members, this.blockManager, this.statusTracker);
      for (const r of intentResults) {
        if (r.type === 'enemy_attack') {
          const blockText = r.blocked > 0 ? ` (${r.blocked} blocked)` : '';
          this._log(`${r.enemy.name} hits ${r.target.name} for ${r.hpDamage}${blockText}!`);
          this._damageFlash[this.party.getMembers().indexOf(r.target)] = Date.now();
          this.animQueue.addAnimation(AnimationQueue.createDamageNumber(120, 330 + this.party.getMembers().indexOf(r.target) * 22, r.hpDamage, false));
        } else if (r.type === 'enemy_defend') {
          this._log(`${r.enemy.name} gains ${r.block} Block.`);
        } else if (r.type === 'enemy_debuff') {
          this._log(`${r.enemy.name} applies ${r.stacks} ${r.debuffId} to ${r.target.name}!`);
        } else if (r.type === 'enemy_buff') {
          this._log(`${r.enemy.name} gains ${r.stacks} ${r.buffId}!`);
        }
      }

      // Tick enemy turn-end (burn)
      const endResults = this.statusTracker.tickTurnEnd(enemy);
      for (const r of endResults) {
        if (r.type === 'burn_tick') {
          this._log(`${enemy.name} takes ${r.damage} burn damage!`);
          if (enemy.currentHP <= 0) {
            this._log(`${enemy.name} dies to burn!`);
          }
        }
      }

      // Generate new intent for next turn
      if (enemy.currentHP > 0) {
        this.enemyIntents.set(enemy, selectIntent(enemy, world.floor || 1));
      }
    }

    // Check party wipe
    if (!aliveMembers().some(m => m.isAlive())) {
      this.phase = 'defeat';
      return;
    }

    // Check all enemies dead
    if (!this.enemies.some(e => e.currentHP > 0)) {
      this.phase = 'victory';
      return;
    }

    // Next player turn
    this.turnNumber++;
    this._startPlayerTurn(world);
  }

  // ============================================================
  // CARD PLAY LOGIC
  // ============================================================

  _playCard(cardIdx, memberIdx, targetEnemyIdx, targetAllyIdx, world) {
    const hand = this.deckManager.hand;
    if (cardIdx < 0 || cardIdx >= hand.length) return false;

    const card = hand[cardIdx];
    const members = this.party.getMembers();
    const member = members[memberIdx];
    if (!member || !member.isAlive()) return false;

    // Validate assignment
    if (!card.canAssignTo(member)) {
      this._log(`${card.name} can only be assigned to a ${card.cardClass}!`);
      return false;
    }
    if (!card.canPlay(this.ap)) {
      this._log(`Not enough AP! Need ${card.cost}, have ${this.ap}.`);
      return false;
    }

    // Spend AP
    this.ap -= card.cost;

    // Resolve target
    const aliveEnemies = this.enemies.filter(e => e.currentHP > 0);
    const aliveMembers = members.filter(m => m.isAlive());
    let targetEnemy = aliveEnemies[targetEnemyIdx] || aliveEnemies[0] || null;

    // For ally-targeted effects (heal, buff on singleAlly), use the ally target
    const needsAllyTarget = card.effects.some(e =>
      e.target === 'singleAlly' && e.type !== 'block'
    );
    if (needsAllyTarget && targetAllyIdx >= 0 && targetAllyIdx < members.length) {
      // Pass the ally as targetEnemy (the card.resolve handles singleAlly)
      targetEnemy = members[targetAllyIdx];
    }

    // Resolve effects
    const results = card.resolve(
      member, targetEnemy, aliveEnemies, aliveMembers,
      this.statusTracker, this.blockManager, this.deckManager,
      world.floor || 1, this.party
    );

    // Process results for combat log and animations
    for (const r of results) {
      if (r.type === 'damage') {
        const blockText = r.blocked > 0 ? ` (${r.blocked} blocked)` : '';
        const hitText = r.totalHits > 1 ? ` [hit ${r.hit}/${r.totalHits}]` : '';
        this._log(`${member.name}'s ${card.name}: ${r.amount} damage to ${r.target.name}${blockText}${hitText}`);
        // Animation
        const eIdx = this.enemies.indexOf(r.target);
        if (eIdx >= 0) {
          const pos = this._getEnemySpritePos(eIdx);
          this.animQueue.addAnimation(AnimationQueue.createDamageNumber(pos.x, pos.y, r.amount, false));
          this.animQueue.addAnimation(AnimationQueue.createHitEffect(pos.x, pos.y));
          if (r.target.currentHP <= 0) {
            this.animQueue.addAnimation(AnimationQueue.createDeathEffect(pos.x, pos.y - 20));
          }
        }
      } else if (r.type === 'block') {
        this._log(`${r.target.name} gains ${r.amount} Block.`);
      } else if (r.type === 'heal') {
        this._log(`${r.target.name} heals ${r.amount} HP.`);
      } else if (r.type === 'buff') {
        this._log(`${r.target.name} gains ${r.stacks} ${r.buffId}.`);
      } else if (r.type === 'debuff') {
        this._log(`${r.target.name} gets ${r.stacks} ${r.debuffId}.`);
      } else if (r.type === 'draw') {
        this._log(`Draw ${r.count} card(s).`);
      } else if (r.type === 'gainAP') {
        this.ap = Math.min(5, this.ap + r.value); // Max AP cap = 5
        this._log(`Gain ${r.value} AP! (${this.ap}/${this.maxAP})`);
      } else if (r.type === 'poison_applied') {
        this._log(`${r.target.name} gets ${r.stacks} Poison.`);
      } else if (r.type === 'burn_applied') {
        this._log(`${r.target.name} gets ${r.stacks} Burn.`);
      } else if (r.type === 'stun') {
        this._log(`${r.target.name} is stunned for ${r.turns} turn(s)!`);
      } else if (r.type === 'flee') {
        // Handle flee
        return this._handleFlee(world);
      }
    }

    // Move card from hand to discard/exhaust
    if (card.exhaust || card.type === 'power') {
      this.deckManager.exhaust(card);
    } else {
      this.deckManager.discard(card);
    }

    // Check victory — but if party is also dead, it's a defeat
    if (!this.enemies.some(e => e.currentHP > 0)) {
      const partyAlive = this.party.getMembers().some(m => m.currentHP > 0);
      this.phase = partyAlive ? 'victory' : 'defeat';
      return true;
    }

    // Clamp enemy target
    const stillAlive = this.enemies.filter(e => e.currentHP > 0);
    if (this.selectedEnemyIdx >= stillAlive.length) {
      this.selectedEnemyIdx = Math.max(0, stillAlive.length - 1);
    }

    // Reset selection
    this.selectedCardIdx = -1;
    this.selectedMemberIdx = -1;
    this.uiStep = 'selectCard';
    return true;
  }

  _handleFlee(world) {
    const dc = 10 + Math.min(world.floor || 1, 10);
    const members = this.party.getMembers().filter(m => m.isAlive());
    let successes = 0;
    for (const member of members) {
      const roll = Math.floor(Math.random() * 20) + 1;
      const total = roll + member.getModifier('dex');
      if (total >= dc) successes++;
    }
    const needed = Math.floor(members.length / 2) + 1;
    if (successes >= needed) {
      this.phase = 'fled';
      this._log('The party flees!');
      return true;
    }
    this._log(`Failed to flee! (${successes}/${needed} passed DC ${dc})`);
    return false;
  }

  // ============================================================
  // REWARDS (same as old system)
  // ============================================================

  _awardRewards(world) {
    let totalXP = 0;
    const loot = [];
    this.enemies.forEach(enemy => {
      if (enemy.currentHP <= 0) {
        totalXP += enemy.xp;
        const dropChance = Math.min(0.3 + ((world.floor || 1) * 0.1), 0.8);
        if (Math.random() < dropChance) {
          const itemId = getRandomLoot(world.floor || 1);
          const item = createItem(itemId);
          loot.push(item);
        }
      }
    });

    const aliveMembers = world.party.getMembers().filter(m => m.isAlive());
    const xpPerMember = aliveMembers.length > 0 ? Math.floor(totalXP / aliveMembers.length) : 0;

    const preLevels = {};
    aliveMembers.forEach(m => { preLevels[m.name + '_' + m.class] = m.level; });
    aliveMembers.forEach(member => {
      member.xp += xpPerMember;
      member.checkLevelUp();
    });

    world.gold += Math.max(1, Math.floor(totalXP / 5));
    loot.forEach(item => { world.inventory.addItem(item); });

    this._log(`Victory! +${totalXP} XP, +${loot.length} items`);
    this.rewardsAwarded = true;

    // Track level-ups
    this._levelUpData = [];
    aliveMembers.forEach(m => {
      const key = m.name + '_' + m.class;
      if (m.level > (preLevels[key] || 1)) {
        this._levelUpData.push({ character: m, oldLevel: preLevels[key], newLevel: m.level });
        this._log(`${m.name} reached Level ${m.level}!`);
      }
    });
  }

  // ============================================================
  // INPUT HANDLING
  // ============================================================

  handleInput(input, world) {
    const code = input.code;

    // Touch: card selection
    if (code && code.startsWith('_card_')) {
      const idx = parseInt(code.split('_')[2], 10);
      if (!isNaN(idx)) {
        this.selectedCardIdx = idx;
        this.uiStep = 'selectMember';
        return true;
      }
    }

    // Touch: member selection
    if (code && code.startsWith('_member_')) {
      const idx = parseInt(code.split('_')[2], 10);
      if (!isNaN(idx)) {
        return this._handleMemberSelect(idx, world);
      }
    }

    // Touch: enemy target selection
    if (code && code.startsWith('_enemy_')) {
      const idx = parseInt(code.split('_')[2], 10);
      if (!isNaN(idx)) {
        return this._handleEnemySelect(idx, world);
      }
    }

    // Touch: ally target selection
    if (code && code.startsWith('_ally_')) {
      const idx = parseInt(code.split('_')[2], 10);
      if (!isNaN(idx)) {
        return this._handleAllySelect(idx, world);
      }
    }

    // Touch: end turn button
    if (code === '_endTurn') {
      if (this.phase === 'playerTurn') {
        this._endPlayerTurn(world);
        return true;
      }
    }

    // Touch: flee button
    if (code === '_flee') {
      if (this.phase === 'playerTurn') {
        this._handleFlee(world);
        return true;
      }
    }

    // Initialize combat on first input
    if (this.phase === 'init' && world.party) {
      this._initCombat(world);
      return true;
    }

    // Victory/Defeat/Fled states
    if (this.phase === 'victory' || this.phase === 'defeat' || this.phase === 'fled') {
      if (this.phase === 'victory' && !this.rewardsAwarded) {
        this._awardRewards(world);
        this.enemies.forEach(e => world.tileMap.removeEntity(e));
        return true;
      }
      this.dismissPressed = true;
      return true;
    }

    if (this.phase !== 'playerTurn') return false;

    // === KEYBOARD INPUT ===

    // Number keys 1-5: select card in hand
    if (code >= 'Digit1' && code <= 'Digit9') {
      const idx = parseInt(code.charAt(5)) - 1;
      if (idx >= 0 && idx < this.deckManager.hand.length) {
        if (this.selectedCardIdx === idx) {
          // Deselect
          this.selectedCardIdx = -1;
          this.uiStep = 'selectCard';
        } else {
          this.selectedCardIdx = idx;
          this.uiStep = 'selectMember';
        }
        return true;
      }
    }

    // Left/Right arrow or Q/R: cycle enemy target
    if (code === 'ArrowLeft' || code === 'KeyQ') {
      const alive = this.enemies.filter(e => e.currentHP > 0);
      if (alive.length > 0) {
        this.selectedEnemyIdx = ((this.selectedEnemyIdx || 0) - 1 + alive.length) % alive.length;
      }
      return true;
    }
    if (code === 'ArrowRight' || code === 'KeyR') {
      const alive = this.enemies.filter(e => e.currentHP > 0);
      if (alive.length > 0) {
        this.selectedEnemyIdx = ((this.selectedEnemyIdx || 0) + 1) % alive.length;
      }
      return true;
    }

    // Up/Down arrow or W/S: cycle party member (for assignment)
    if (code === 'ArrowUp' || code === 'KeyW') {
      const members = this.party.getMembers().filter(m => m.isAlive());
      if (this.uiStep === 'selectMember' || this.uiStep === 'selectAlly') {
        const targetIdx = this.uiStep === 'selectAlly' ? 'selectedAllyIdx' : 'selectedMemberIdx';
        this[targetIdx] = ((this[targetIdx] || 0) - 1 + members.length) % members.length;
      }
      return true;
    }
    if (code === 'ArrowDown' || code === 'KeyS') {
      const members = this.party.getMembers().filter(m => m.isAlive());
      if (this.uiStep === 'selectMember' || this.uiStep === 'selectAlly') {
        const targetIdx = this.uiStep === 'selectAlly' ? 'selectedAllyIdx' : 'selectedMemberIdx';
        this[targetIdx] = ((this[targetIdx] || 0) + 1) % members.length;
      }
      return true;
    }

    // Enter/Space: confirm current selection step
    if (code === 'Enter' || code === 'Space') {
      if (this.uiStep === 'selectMember' && this.selectedCardIdx >= 0) {
        return this._handleMemberSelect(this.selectedMemberIdx >= 0 ? this.selectedMemberIdx : 0, world);
      }
      if (this.uiStep === 'selectTarget') {
        return this._handleEnemySelect(this.selectedEnemyIdx, world);
      }
      if (this.uiStep === 'selectAlly') {
        return this._handleAllySelect(this.selectedAllyIdx >= 0 ? this.selectedAllyIdx : 0, world);
      }
      return true;
    }

    // Escape: cancel selection
    if (code === 'Escape' || code === 'Backspace') {
      if (this.uiStep === 'selectTarget' || this.uiStep === 'selectAlly') {
        this.uiStep = 'selectMember';
        return true;
      }
      if (this.uiStep === 'selectMember') {
        this.selectedCardIdx = -1;
        this.uiStep = 'selectCard';
        return true;
      }
      return true;
    }

    // KeyE: End Turn
    if (code === 'KeyE') {
      this._endPlayerTurn(world);
      return true;
    }

    // KeyF: Flee
    if (code === 'KeyF') {
      this._handleFlee(world);
      return true;
    }

    return false;
  }

  _handleMemberSelect(idx, world) {
    const members = this.party.getMembers();
    if (idx < 0 || idx >= members.length || !members[idx].isAlive()) return false;

    const card = this.deckManager.hand[this.selectedCardIdx];
    if (!card) return false;

    if (!card.canAssignTo(members[idx])) {
      this._log(`${card.name} requires a ${card.cardClass}!`);
      return true;
    }

    this.selectedMemberIdx = idx;

    // Determine if card needs enemy target or ally target
    const needsEnemyTarget = card.effects.some(e =>
      e.target === 'singleEnemy' && (e.type === 'damage' || e.type === 'debuff' || e.type === 'stun' || e.type === 'poison' || e.type === 'burn')
    );
    const needsAllyTarget = card.effects.some(e =>
      e.target === 'singleAlly'
    );

    if (needsAllyTarget) {
      this.uiStep = 'selectAlly';
      this.selectedAllyIdx = idx; // Default to self
    } else if (needsEnemyTarget) {
      this.uiStep = 'selectTarget';
    } else {
      // No target needed (self, allEnemies, allAllies) — play immediately
      return this._playCard(this.selectedCardIdx, this.selectedMemberIdx, this.selectedEnemyIdx, -1, world);
    }
    return true;
  }

  _handleEnemySelect(idx, world) {
    const alive = this.enemies.filter(e => e.currentHP > 0);
    if (idx < 0 || idx >= alive.length) return false;
    this.selectedEnemyIdx = idx;
    return this._playCard(this.selectedCardIdx, this.selectedMemberIdx, idx, -1, world);
  }

  _handleAllySelect(idx, world) {
    const members = this.party.getMembers();
    if (idx < 0 || idx >= members.length) return false;
    return this._playCard(this.selectedCardIdx, this.selectedMemberIdx, this.selectedEnemyIdx, idx, world);
  }

  // ============================================================
  // POSITION HELPERS
  // ============================================================

  _getEnemySpritePos(enemyIdx) {
    const w = 760;
    const enemyAreaWidth = w - 40;
    const slotWidth = this.enemies.length > 0 ? enemyAreaWidth / this.enemies.length : 0;
    return {
      x: 20 + enemyIdx * slotWidth + slotWidth / 2,
      y: 40 + Math.min(80, slotWidth - 20) / 2
    };
  }

  // ============================================================
  // isDone — keeps combat on state stack until dismissed
  // ============================================================

  isDone() {
    return this.dismissPressed;
  }

  // ============================================================
  // RENDER
  // ============================================================

  render(layers, world) {
    const ctx = layers.ui || layers;
    ctx.save();

    const W = ctx.canvas.width;  // 800
    const H = ctx.canvas.height; // 600

    this._flickerPhase += 0.04;
    for (const p of this._dustParticles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y > 1) { p.y = 0; p.x = Math.random(); }
      if (p.x < 0 || p.x > 1) p.vx *= -1;
    }

    if (world.input && world.input.touch) {
      world.input.touch.clearHitZones();
    }

    const aliveEnemies = this.enemies.filter(e => e.currentHP > 0);

    // === BACKGROUND ===
    this._renderBackground(ctx, W, H);

    // === ENEMIES + INTENTS ===
    this._renderEnemies(ctx, W, H, aliveEnemies, world);

    // === PARTY PORTRAITS (left side) ===
    this._renderPartyPortraits(ctx, W, H, world);

    // === COMBAT LOG (right side) ===
    this._renderCombatLog(ctx, W, H);

    // === VICTORY / DEFEAT / FLED ===
    if (this.phase === 'victory' || this.phase === 'defeat' || this.phase === 'fled') {
      this._renderEndBanner(ctx, W, H);
    } else if (this.phase === 'playerTurn') {
      // === HAND + AP + END TURN ===
      this._renderHand(ctx, W, H, world);
      this._renderAPCounter(ctx, W, H);
      this._renderEndTurnButton(ctx, W, H, world);
      this._renderFleeButton(ctx, W, H, world);
      this._renderPileCounts(ctx, W, H);
      this._renderTurnNumber(ctx, W, H);
      this._renderUIHints(ctx, W, H);
    }

    // Animations
    this.animQueue.update();
    this.animQueue.render(ctx);
    if (this.animQueue.hasActiveAnimations()) {
      world.needsRender = true;
    }

    ctx.restore();
  }

  // --- Background: Dark stone with torchlight ---
  _renderBackground(ctx, W, H) {
    ctx.fillStyle = '#0a0908';
    ctx.fillRect(0, 0, W, H);

    const seed = (x, y) => Math.abs(Math.sin(x * 127.1 + y * 311.7) * 43758.5453 % 1);
    for (let y = 0; y < H; y += 18) {
      for (let x = 0; x < W; x += 24) {
        const v = seed(x, y) * 5;
        ctx.fillStyle = `rgba(${12 + v}, ${10 + v}, ${8 + v}, 0.5)`;
        ctx.fillRect(x, y, 24, 18);
        if (seed(x + 1, y) > 0.7) {
          ctx.fillStyle = 'rgba(5, 4, 3, 0.3)';
          ctx.fillRect(x, y, 24, 1);
        }
      }
    }

    // Torches
    this._renderTorch(ctx, 30, H * 0.3, this._flickerPhase);
    this._renderTorch(ctx, W - 30, H * 0.3, this._flickerPhase + 1.8);

    // Ambient glow
    const ambientGlow = ctx.createRadialGradient(W / 2, H * 0.25, 20, W / 2, H * 0.25, W * 0.6);
    ambientGlow.addColorStop(0, 'rgba(255, 120, 30, 0.04)');
    ambientGlow.addColorStop(0.5, 'rgba(200, 80, 15, 0.02)');
    ambientGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = ambientGlow;
    ctx.fillRect(0, 0, W, H);

    // Dust
    for (const p of this._dustParticles) {
      const px = p.x * W;
      const py = p.y * H;
      const dist = Math.min(
        Math.sqrt((px - 30) ** 2 + (py - H * 0.3) ** 2),
        Math.sqrt((px - (W - 30)) ** 2 + (py - H * 0.3) ** 2)
      );
      if (dist < 150) {
        ctx.fillStyle = `rgba(255, 200, 120, ${(1 - dist / 150) * p.alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Vignette
    const vig = ctx.createRadialGradient(W / 2, H * 0.35, W * 0.15, W / 2, H * 0.35, W * 0.7);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    // Divider line
    ctx.fillStyle = 'rgba(30, 24, 18, 0.8)';
    ctx.fillRect(0, 290, W, 2);
  }

  _renderTorch(ctx, x, y, phase) {
    ctx.fillStyle = '#1a1410';
    ctx.fillRect(x - 3, y, 6, 16);
    ctx.fillStyle = '#2a1e14';
    ctx.fillRect(x - 4, y - 2, 8, 4);

    const flick = Math.sin(phase * 3.5) * 3;
    const flick2 = Math.cos(phase * 2.3) * 2;
    ctx.fillStyle = 'rgba(255, 140, 30, 0.7)';
    ctx.beginPath();
    ctx.ellipse(x + flick2 * 0.3, y - 10, 6, 12 + flick, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 230, 80, 0.85)';
    ctx.beginPath();
    ctx.ellipse(x + flick2 * 0.2, y - 8, 3, 7 + flick * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    const glow = ctx.createRadialGradient(x, y - 6, 3, x, y - 6, 100);
    glow.addColorStop(0, 'rgba(255, 130, 25, 0.12)');
    glow.addColorStop(0.5, 'rgba(200, 80, 10, 0.05)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 100, y - 106, 200, 200);
  }

  // --- Enemy rendering with intent icons ---
  _renderEnemies(ctx, W, H, aliveEnemies, world) {
    const enemyAreaWidth = W - 80;
    const slotWidth = this.enemies.length > 0 ? enemyAreaWidth / this.enemies.length : 0;
    const breathScale = 1 + Math.sin(this._flickerPhase * 1.5) * 0.015;

    this.enemies.forEach((enemy, i) => {
      const slotX = 40 + i * slotWidth + slotWidth / 2;
      const spriteY = 30;
      const spriteSize = Math.min(80, slotWidth - 16);
      const isDead = enemy.currentHP <= 0;
      const aliveIdx = aliveEnemies.indexOf(enemy);
      const isTarget = aliveIdx === (this.selectedEnemyIdx || 0) && !isDead;

      // Frame
      const frameX = slotX - spriteSize / 2 - 4;
      const frameY = spriteY - 4;
      const frameW = spriteSize + 8;
      const frameH = spriteSize + 8;

      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(frameX + 2, frameY + 2, frameW, frameH);

      if (isTarget) {
        const pulse = 0.7 + Math.sin(this._flickerPhase * 4) * 0.3;
        ctx.strokeStyle = `rgba(255, 215, 0, ${pulse})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(frameX - 1, frameY - 1, frameW + 2, frameH + 2);
        // Target arrow
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.moveTo(slotX, frameY - 10);
        ctx.lineTo(slotX - 6, frameY - 18);
        ctx.lineTo(slotX + 6, frameY - 18);
        ctx.fill();
      }

      ctx.fillStyle = '#1a1410';
      ctx.fillRect(frameX, frameY, frameW, frameH);
      ctx.strokeStyle = isDead ? '#2a1a10' : '#3a2a1a';
      ctx.lineWidth = 1;
      ctx.strokeRect(frameX, frameY, frameW, frameH);

      // Sprite
      ctx.save();
      if (!isDead) {
        ctx.translate(slotX, spriteY + spriteSize / 2);
        ctx.scale(breathScale, breathScale);
        ctx.translate(-slotX, -(spriteY + spriteSize / 2));
      }
      if (isDead) ctx.globalAlpha = 0.25;

      const spriteKey = MONSTER_SPRITE_MAP[enemy.type] || MONSTER_SPRITE_MAP[enemy.name?.toLowerCase()];
      const sprite = spriteKey ? this.assets.get(spriteKey) : null;
      if (sprite) {
        ctx.drawImage(sprite, slotX - spriteSize / 2, spriteY, spriteSize, spriteSize);
      } else {
        this._renderSilhouette(ctx, slotX, spriteY, spriteSize, isDead);
      }
      ctx.restore();

      // HP bar
      const barY = frameY + frameH + 4;
      const barWidth = spriteSize;
      const barHeight = 8;
      const hpPct = Math.max(0, enemy.currentHP / enemy.maxHP);

      ctx.fillStyle = '#1a0a0a';
      ctx.fillRect(slotX - barWidth / 2, barY, barWidth, barHeight);
      ctx.strokeStyle = '#3a2a1a';
      ctx.lineWidth = 1;
      ctx.strokeRect(slotX - barWidth / 2, barY, barWidth, barHeight);

      if (hpPct > 0) {
        const hpGrad = ctx.createLinearGradient(slotX - barWidth / 2, barY, slotX - barWidth / 2, barY + barHeight);
        if (hpPct > 0.5) { hpGrad.addColorStop(0, '#44aa44'); hpGrad.addColorStop(1, '#226622'); }
        else if (hpPct > 0.25) { hpGrad.addColorStop(0, '#ccaa22'); hpGrad.addColorStop(1, '#886611'); }
        else { hpGrad.addColorStop(0, '#cc3333'); hpGrad.addColorStop(1, '#881111'); }
        ctx.fillStyle = hpGrad;
        ctx.fillRect(slotX - barWidth / 2 + 1, barY + 1, (barWidth - 2) * hpPct, barHeight - 2);
      }

      ctx.fillStyle = '#fff';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${enemy.currentHP}/${enemy.maxHP}`, slotX, barY + barHeight - 1);

      // Block display for enemies
      const enemyBlock = this.blockManager.getBlock(enemy);
      if (enemyBlock > 0) {
        ctx.fillStyle = '#4488cc';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`[${enemyBlock}]`, slotX + barWidth / 2 + 12, barY + barHeight - 1);
      }

      // Name
      const nameY = barY + barHeight + 10;
      ctx.fillStyle = isDead ? '#444' : '#c8b888';
      ctx.font = isDead ? '9px monospace' : 'bold 9px monospace';
      ctx.fillText(enemy.name || '???', slotX, nameY);
      if (isDead) {
        ctx.fillStyle = '#600';
        ctx.font = '8px monospace';
        ctx.fillText('SLAIN', slotX, nameY + 10);
      }

      // Intent icon (above enemy frame)
      if (!isDead && this.enemyIntents.has(enemy)) {
        const intent = this.enemyIntents.get(enemy);
        const display = getIntentDisplay(intent);
        const intentY = frameY - 24;

        // Intent background
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(slotX - 20, intentY - 2, 40, 16);
        ctx.strokeStyle = display.color;
        ctx.lineWidth = 1;
        ctx.strokeRect(slotX - 20, intentY - 2, 40, 16);

        ctx.fillStyle = display.color;
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${display.icon} ${display.detail}`, slotX, intentY + 10);
      }

      // Status effects on enemy
      if (!isDead) {
        const effects = this.statusTracker.getActiveEffects(enemy);
        if (effects.length > 0) {
          const statusY = nameY + 12;
          let statusX = slotX - (effects.length * 10) / 2;
          for (const eff of effects) {
            const info = STATUS_DISPLAY[eff.id];
            if (info) {
              ctx.fillStyle = info.color;
              ctx.font = '9px monospace';
              ctx.textAlign = 'center';
              ctx.fillText(`${eff.stacks}`, statusX + 5, statusY);
              statusX += 14;
            }
          }
        }
      }

      ctx.textAlign = 'left';

      // Touch hit zone for enemy targeting
      if (!isDead && world.input && world.input.touch) {
        world.input.touch.registerHitZone(frameX, frameY, frameW, frameH + 30, `_enemy_${aliveIdx}`);
      }
    });
  }

  _renderSilhouette(ctx, cx, top, size, isDead) {
    const grad = ctx.createRadialGradient(cx, top + size * 0.4, size * 0.1, cx, top + size * 0.5, size * 0.5);
    grad.addColorStop(0, isDead ? '#1a0a0a' : '#3a0a0a');
    grad.addColorStop(1, isDead ? '#080404' : '#1a0505');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, top + size * 0.2, size * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.2, top + size * 0.3);
    ctx.lineTo(cx + size * 0.2, top + size * 0.3);
    ctx.lineTo(cx + size * 0.25, top + size * 0.7);
    ctx.lineTo(cx + size * 0.1, top + size * 0.95);
    ctx.lineTo(cx - size * 0.1, top + size * 0.95);
    ctx.lineTo(cx - size * 0.25, top + size * 0.7);
    ctx.closePath();
    ctx.fill();
    if (!isDead) {
      ctx.fillStyle = '#ff2200';
      ctx.beginPath();
      ctx.arc(cx - size * 0.06, top + size * 0.18, 2, 0, Math.PI * 2);
      ctx.arc(cx + size * 0.06, top + size * 0.18, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- Party portraits: Left side, HP bars, Block shields, status icons ---
  _renderPartyPortraits(ctx, W, H, world) {
    if (!this.party) return;
    const members = this.party.getMembers();
    const portraitW = 140;
    const portraitH = 52;
    const startY = 300;
    const startX = 8;

    members.forEach((member, i) => {
      const y = startY + i * (portraitH + 4);
      const isSelected = (this.uiStep === 'selectMember' && this.selectedMemberIdx === i) ||
                         (this.uiStep === 'selectAlly' && this.selectedAllyIdx === i);
      const isDead = !member.isAlive();
      const isFlashed = this._damageFlash[i] && (Date.now() - this._damageFlash[i] < 300);

      // Portrait background
      if (isFlashed) {
        ctx.fillStyle = 'rgba(180, 30, 30, 0.4)';
      } else if (isSelected) {
        ctx.fillStyle = 'rgba(60, 50, 20, 0.8)';
      } else {
        ctx.fillStyle = isDead ? 'rgba(15, 10, 8, 0.6)' : 'rgba(20, 16, 12, 0.7)';
      }
      ctx.fillRect(startX, y, portraitW, portraitH);

      // Border
      ctx.strokeStyle = isSelected ? '#FFD700' : (isDead ? '#2a1a10' : '#4a3a2a');
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.strokeRect(startX, y, portraitW, portraitH);

      // Name + Class
      ctx.fillStyle = isDead ? '#555' : '#C8B888';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${member.name}`, startX + 4, y + 12);
      ctx.fillStyle = isDead ? '#444' : '#8B7355';
      ctx.font = '8px monospace';
      ctx.fillText(`Lv${member.level} ${member.class.charAt(0).toUpperCase() + member.class.slice(1)}`, startX + 4, y + 22);

      // HP bar
      const hpBarX = startX + 4;
      const hpBarY = y + 27;
      const hpBarW = portraitW - 8;
      const hpBarH = 8;
      const hpPct = Math.max(0, member.currentHP / member.maxHP);
      ctx.fillStyle = '#1a0a0a';
      ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);
      if (hpPct > 0) {
        ctx.fillStyle = hpPct > 0.5 ? '#44aa44' : (hpPct > 0.25 ? '#ccaa22' : '#cc3333');
        ctx.fillRect(hpBarX, hpBarY, hpBarW * hpPct, hpBarH);
      }
      ctx.fillStyle = '#fff';
      ctx.font = '7px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${member.currentHP}/${member.maxHP}`, hpBarX + hpBarW / 2, hpBarY + hpBarH - 1);

      // Block shield
      const block = this.blockManager.getBlock(member);
      if (block > 0) {
        ctx.textAlign = 'left';
        ctx.fillStyle = '#4488cc';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`B:${block}`, startX + 4, y + 48);
      }

      // Status effects
      const effects = this.statusTracker.getActiveEffects(member);
      if (effects.length > 0) {
        let sx = startX + 45;
        ctx.font = '8px monospace';
        for (const eff of effects.slice(0, 5)) {
          const info = STATUS_DISPLAY[eff.id];
          if (info) {
            ctx.fillStyle = info.color;
            ctx.textAlign = 'left';
            ctx.fillText(`${eff.stacks}`, sx, y + 48);
            sx += 16;
          }
        }
      }

      // Dead overlay
      if (isDead) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(startX, y, portraitW, portraitH);
        ctx.fillStyle = '#600';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('DEAD', startX + portraitW / 2, y + portraitH / 2 + 4);
      }

      ctx.textAlign = 'left';

      // Touch hit zone for member/ally selection
      if (world.input && world.input.touch && !isDead) {
        const zoneCode = this.uiStep === 'selectAlly' ? `_ally_${i}` : `_member_${i}`;
        world.input.touch.registerHitZone(startX, y, portraitW, portraitH, zoneCode);
      }
    });
  }

  // --- Card hand display: bottom center, 5 cards ---
  _renderHand(ctx, W, H, world) {
    if (!this.deckManager) return;
    const hand = this.deckManager.hand;
    const cardW = 100;
    const cardH = 130;
    const gap = 6;
    const totalW = hand.length * (cardW + gap) - gap;
    const startX = Math.max(160, (W - totalW) / 2);
    const cardY = H - cardH - 10;

    hand.forEach((card, i) => {
      const x = startX + i * (cardW + gap);
      const isSelected = this.selectedCardIdx === i;
      const canAfford = card.canPlay(this.ap);
      const yOffset = isSelected ? -12 : 0;

      // Card shadow
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(x + 2, cardY + yOffset + 2, cardW, cardH);

      // Card background — parchment
      const cardGrad = ctx.createLinearGradient(x, cardY + yOffset, x, cardY + yOffset + cardH);
      if (isSelected) {
        cardGrad.addColorStop(0, '#3a3020');
        cardGrad.addColorStop(1, '#2a2015');
      } else if (!canAfford) {
        cardGrad.addColorStop(0, '#1a1510');
        cardGrad.addColorStop(1, '#100c08');
      } else {
        cardGrad.addColorStop(0, '#2a2418');
        cardGrad.addColorStop(1, '#1a1610');
      }
      ctx.fillStyle = cardGrad;
      ctx.fillRect(x, cardY + yOffset, cardW, cardH);

      // Card border — color-coded by class
      ctx.strokeStyle = isSelected ? '#FFD700' : (canAfford ? (card.color || '#4a3a2a') : '#333');
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.strokeRect(x, cardY + yOffset, cardW, cardH);

      // Card type indicator strip at top
      const typeColors = { attack: '#cc3333', skill: '#3366cc', power: '#cc9900' };
      ctx.fillStyle = typeColors[card.type] || '#666';
      ctx.fillRect(x + 1, cardY + yOffset + 1, cardW - 2, 3);

      // AP cost — top-left circle
      ctx.fillStyle = canAfford ? '#FFD700' : '#555';
      ctx.beginPath();
      ctx.arc(x + 12, cardY + yOffset + 14, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${card.cost}`, x + 12, cardY + yOffset + 18);

      // Card name
      ctx.fillStyle = canAfford ? '#C8B888' : '#555';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(card.name, x + cardW / 2, cardY + yOffset + 28);

      // Card type label
      ctx.fillStyle = '#8B7355';
      ctx.font = '8px monospace';
      ctx.fillText(card.type.toUpperCase(), x + cardW / 2, cardY + yOffset + 40);

      // Class badge
      if (card.cardClass !== 'neutral') {
        ctx.fillStyle = '#6a5a3a';
        ctx.font = '7px monospace';
        ctx.fillText(card.cardClass.toUpperCase(), x + cardW / 2, cardY + yOffset + 50);
      }

      // Description — word wrap
      ctx.fillStyle = canAfford ? '#aaa' : '#444';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      const desc = card.description || '';
      const words = desc.split(' ');
      let line = '';
      let lineY = cardY + yOffset + 64;
      const maxLineW = cardW - 10;
      for (const word of words) {
        const test = line + (line ? ' ' : '') + word;
        if (ctx.measureText(test).width > maxLineW && line) {
          ctx.fillText(line, x + cardW / 2, lineY);
          line = word;
          lineY += 10;
          if (lineY > cardY + yOffset + cardH - 20) break;
        } else {
          line = test;
        }
      }
      if (line && lineY <= cardY + yOffset + cardH - 20) {
        ctx.fillText(line, x + cardW / 2, lineY);
      }

      // Keywords (Exhaust, Retain, etc.) at bottom
      if (card.keywords.length > 0) {
        ctx.fillStyle = '#886644';
        ctx.font = 'italic 7px monospace';
        ctx.fillText(card.keywords.join(' | '), x + cardW / 2, cardY + yOffset + cardH - 6);
      }

      // Keyboard shortcut number
      ctx.fillStyle = isSelected ? '#FFD700' : '#555';
      ctx.font = '8px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`[${i + 1}]`, x + cardW - 4, cardY + yOffset + cardH - 6);

      ctx.textAlign = 'left';

      // Touch hit zone
      if (world.input && world.input.touch) {
        world.input.touch.registerHitZone(x, cardY + yOffset, cardW, cardH, `_card_${i}`);
      }
    });
  }

  // --- AP counter: top center ---
  _renderAPCounter(ctx, W, H) {
    const apX = W / 2;
    const apY = 288;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(apX - 40, apY - 10, 80, 20);
    ctx.strokeStyle = '#8a7a4a';
    ctx.lineWidth = 1;
    ctx.strokeRect(apX - 40, apY - 10, 80, 20);

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`AP: ${this.ap}/${this.maxAP}`, apX, apY + 4);
    ctx.textAlign = 'left';
  }

  // --- End Turn button: bottom-right ---
  _renderEndTurnButton(ctx, W, H, world) {
    const btnW = 90;
    const btnH = 30;
    const btnX = W - btnW - 10;
    const btnY = H - 50;

    // Parchment button
    ctx.fillStyle = '#2a2015';
    ctx.fillRect(btnX, btnY, btnW, btnH);
    ctx.strokeStyle = '#8a7a4a';
    ctx.lineWidth = 1;
    ctx.strokeRect(btnX, btnY, btnW, btnH);

    ctx.fillStyle = '#C8B888';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('END TURN', btnX + btnW / 2, btnY + 18);
    ctx.fillStyle = '#666';
    ctx.font = '8px monospace';
    ctx.fillText('[E]', btnX + btnW / 2, btnY + 28);
    ctx.textAlign = 'left';

    if (world.input && world.input.touch) {
      world.input.touch.registerHitZone(btnX, btnY, btnW, btnH, '_endTurn');
    }
  }

  // --- Flee button: bottom-right, above end turn ---
  _renderFleeButton(ctx, W, H, world) {
    const btnW = 90;
    const btnH = 24;
    const btnX = W - btnW - 10;
    const btnY = H - 80;

    ctx.fillStyle = '#1a1510';
    ctx.fillRect(btnX, btnY, btnW, btnH);
    ctx.strokeStyle = '#5a4a3a';
    ctx.lineWidth = 1;
    ctx.strokeRect(btnX, btnY, btnW, btnH);

    ctx.fillStyle = '#886644';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('FLEE [F]', btnX + btnW / 2, btnY + 16);
    ctx.textAlign = 'left';

    if (world.input && world.input.touch) {
      world.input.touch.registerHitZone(btnX, btnY, btnW, btnH, '_flee');
    }
  }

  // --- Draw/Discard pile counts: bottom corners ---
  _renderPileCounts(ctx, W, H) {
    if (!this.deckManager) return;

    // Draw pile — bottom left (next to party)
    ctx.fillStyle = '#8B7355';
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Draw: ${this.deckManager.getDrawCount()}`, 160, H - 6);

    // Discard pile — above draw
    ctx.fillText(`Discard: ${this.deckManager.getDiscardCount()}`, 160, H - 18);

    // Exhaust pile
    if (this.deckManager.getExhaustCount() > 0) {
      ctx.fillText(`Exhaust: ${this.deckManager.getExhaustCount()}`, 160, H - 30);
    }
  }

  // --- Turn number ---
  _renderTurnNumber(ctx, W, H) {
    ctx.fillStyle = '#666';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`Turn ${this.turnNumber}`, W - 10, 14);
    ctx.textAlign = 'left';
  }

  // --- UI hints based on current step ---
  _renderUIHints(ctx, W, H) {
    let hint = '';
    if (this.uiStep === 'selectCard') {
      hint = 'Select a card (1-5) or End Turn (E)';
    } else if (this.uiStep === 'selectMember') {
      hint = 'Select party member (W/S + Enter) | ESC to cancel';
    } else if (this.uiStep === 'selectTarget') {
      hint = 'Select enemy target (Q/R + Enter) | ESC to cancel';
    } else if (this.uiStep === 'selectAlly') {
      hint = 'Select ally target (W/S + Enter) | ESC to cancel';
    }

    if (hint) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(155, 292, 490, 14);
      ctx.fillStyle = '#888';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(hint, 400, 303);
      ctx.textAlign = 'left';
    }
  }

  // --- Combat log: right side ---
  _renderCombatLog(ctx, W, H) {
    const logX = W - 170;
    const logY = 300;
    const logW = 165;
    const logH = 150;

    // Background
    ctx.fillStyle = 'rgba(10, 8, 6, 0.8)';
    ctx.fillRect(logX, logY, logW, logH);
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 1;
    ctx.strokeRect(logX, logY, logW, logH);

    // Title
    ctx.fillStyle = '#8B7355';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('COMBAT LOG', logX + 4, logY + 10);

    // Log entries (most recent at bottom)
    ctx.font = '7px monospace';
    ctx.fillStyle = '#777';
    const maxLines = 13;
    const startIdx = Math.max(0, this.combatLog.length - maxLines);
    for (let i = startIdx; i < this.combatLog.length; i++) {
      const lineY = logY + 22 + (i - startIdx) * 10;
      if (lineY > logY + logH - 4) break;
      const msg = this.combatLog[i];
      // Truncate long messages
      const display = msg.length > 24 ? msg.slice(0, 23) + '...' : msg;
      ctx.fillText(display, logX + 4, lineY);
    }
  }

  // --- Victory/Defeat/Fled banner ---
  _renderEndBanner(ctx, W, H) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, W, H);

    const bannerY = H / 2 - 40;
    ctx.fillStyle = '#1a1208';
    ctx.fillRect(W / 2 - 150, bannerY, 300, 80);
    ctx.strokeStyle = '#8a7a4a';
    ctx.lineWidth = 2;
    ctx.strokeRect(W / 2 - 150, bannerY, 300, 80);

    ctx.textAlign = 'center';
    ctx.font = 'bold 24px monospace';

    if (this.phase === 'victory') {
      ctx.fillStyle = '#FFD700';
      ctx.fillText('VICTORY', W / 2, bannerY + 35);
    } else if (this.phase === 'defeat') {
      ctx.fillStyle = '#cc3333';
      ctx.fillText('DEFEAT', W / 2, bannerY + 35);
    } else if (this.phase === 'fled') {
      ctx.fillStyle = '#886644';
      ctx.fillText('FLED', W / 2, bannerY + 35);
    }

    ctx.fillStyle = '#888';
    ctx.font = '11px monospace';
    ctx.fillText('Press any key to continue...', W / 2, bannerY + 60);

    // Level-up notifications
    if (this._levelUpData && this._levelUpData.length > 0) {
      let ly = bannerY + 85;
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 11px monospace';
      for (const data of this._levelUpData) {
        ctx.fillText(`${data.character.name} reached Level ${data.newLevel}!`, W / 2, ly);
        ly += 14;
      }
    }

    ctx.textAlign = 'left';
  }
}
