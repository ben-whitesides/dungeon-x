// Card class — runtime card instance with effect resolution
// Scope Section 2: Card resolves using assigned party member's stats

import { CARD_DATA } from './card-data.js';

export class Card {
  constructor(cardId, upgraded = false) {
    const data = CARD_DATA[cardId];
    if (!data) throw new Error(`Unknown card ID: ${cardId}`);

    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.type = data.type;
    this.cardClass = data.cardClass;
    this.rarity = data.rarity;
    this.cost = data.cost;
    this.effects = JSON.parse(JSON.stringify(data.effects)); // deep copy
    this.upgraded = upgraded;
    this.keywords = [...(data.keywords || [])];
    this.exhaust = data.exhaust || false;
    this.ethereal = data.ethereal || false;
    this.innate = data.innate || false;
    this.retain = data.retain || false;
    this.unplayable = data.unplayable || false;
    this.permanent = data.permanent || false;
    this.color = data.color || '#888888';

    // Unique instance ID for tracking in hand/deck
    this._uid = Card._nextUid++;
  }

  /**
   * Check if this card can be assigned to a given party member.
   * Class cards only to matching class, neutral to anyone.
   */
  canAssignTo(member) {
    if (this.cardClass === 'neutral') return true;
    return member.class === this.cardClass;
  }

  /**
   * Check if player can afford to play this card.
   */
  canPlay(currentAP) {
    if (this.unplayable) return false;
    return currentAP >= this.cost;
  }

  /**
   * Get the stat modifier for a given stat from the assigned party member.
   */
  _getStatMod(caster, stat) {
    if (!caster || !stat) return 0;
    return caster.getModifier ? caster.getModifier(stat) : Math.floor(((caster.stats?.[stat] || 10) - 10) / 2);
  }

  /**
   * Calculate final value with stat scaling.
   * finalValue = base + (statModifier * ratio)
   */
  _scaledValue(baseValue, scaling, caster) {
    if (!scaling || !scaling.stat) return baseValue;
    const mod = this._getStatMod(caster, scaling.stat);
    return Math.max(0, baseValue + Math.floor(mod * (scaling.ratio || 1.0)));
  }

  /**
   * Resolve all effects of this card.
   * @param {Object} caster — the party member this card is assigned to
   * @param {Object|null} targetEnemy — single enemy target (if applicable)
   * @param {Array} allEnemies — all alive enemies
   * @param {Array} allAllies — all alive party members
   * @param {Object} statusTracker — StatusEffectTracker instance
   * @param {Object} blockManager — BlockManager instance
   * @param {Object} deckManager — DeckManager instance (for draw effects)
   * @param {number} floor — current dungeon floor (for Flee DC)
   * @param {Object} party — full party reference (for flee)
   * @returns {Array} — array of result objects describing what happened
   */
  resolve(caster, targetEnemy, allEnemies, allAllies, statusTracker, blockManager, deckManager, floor, party) {
    const results = [];

    for (const effect of this.effects) {
      switch (effect.type) {
        case 'damage': {
          const base = this._scaledValue(effect.value, effect.scaling, caster);
          // Apply Strength buff bonus from caster
          const strengthBonus = statusTracker ? statusTracker.getStacks(caster, 'strength') : 0;
          let dmg = base + strengthBonus;
          // Apply Weak debuff on caster (25% less damage)
          const weakStacks = statusTracker ? statusTracker.getStacks(caster, 'weak') : 0;
          if (weakStacks > 0) {
            dmg = Math.floor(dmg * 0.75);
          }
          dmg = Math.max(0, dmg);

          const hits = effect.hits || 1;
          const targets = this._resolveTargets(effect.target, targetEnemy, allEnemies, allAllies, caster);

          for (const t of targets) {
            for (let h = 0; h < hits; h++) {
              let finalDmg = dmg;
              // Bonus vs undead
              if (effect.bonusVsUndead && t.type === 'undead') {
                finalDmg += effect.bonusVsUndead;
              }
              // Apply Vulnerable on target (50% more damage)
              const vulnStacks = statusTracker ? statusTracker.getStacks(t, 'vulnerable') : 0;
              if (vulnStacks > 0) {
                finalDmg = Math.floor(finalDmg * 1.5);
              }
              // Apply damage type vulnerability/resistance (D&D)
              if (effect.damageType && t.vulnerabilities && t.vulnerabilities.includes(effect.damageType)) {
                finalDmg = finalDmg * 2;
              } else if (effect.damageType && t.resistances && t.resistances.includes(effect.damageType)) {
                finalDmg = Math.floor(finalDmg / 2);
              }
              finalDmg = Math.max(1, finalDmg);

              // Block absorption (unless ignoresBlock)
              let actualDmg = finalDmg;
              if (!effect.ignoresBlock && blockManager) {
                actualDmg = blockManager.absorbDamage(t, finalDmg);
              }

              // Apply HP damage
              if (t.currentHP !== undefined) {
                t.currentHP = Math.max(0, t.currentHP - actualDmg);
              }

              results.push({
                type: 'damage',
                source: caster,
                target: t,
                amount: actualDmg,
                blocked: finalDmg - actualDmg,
                damageType: effect.damageType,
                hit: h + 1,
                totalHits: hits
              });
            }
          }

          // Envenom: if caster has envenom buff and this is an attack, apply 1 poison to targets
          if (statusTracker && statusTracker.getStacks(caster, 'envenom') > 0) {
            for (const t of targets) {
              if (t.currentHP > 0) {
                statusTracker.apply(t, 'poison', 1);
                results.push({ type: 'poison_applied', target: t, stacks: 1, source: 'envenom' });
              }
            }
          }
          break;
        }

        case 'block': {
          let base = this._scaledValue(effect.value, effect.scaling, caster);
          // Apply Dexterity buff bonus
          const dexBonus = statusTracker ? statusTracker.getStacks(caster, 'dexterity') : 0;
          base += dexBonus;
          // Apply Frail debuff (25% less block)
          const frailStacks = statusTracker ? statusTracker.getStacks(caster, 'frail') : 0;
          if (frailStacks > 0) {
            base = Math.floor(base * 0.75);
          }
          base = Math.max(0, base);

          const targets = this._resolveTargets(effect.target, targetEnemy, allEnemies, allAllies, caster);
          for (const t of targets) {
            if (blockManager) {
              blockManager.addBlock(t, base);
            }
            results.push({ type: 'block', target: t, amount: base });
          }
          break;
        }

        case 'heal': {
          const base = this._scaledValue(effect.value, effect.scaling, caster);
          const amount = Math.max(0, base);
          const targets = this._resolveTargets(effect.target, targetEnemy, allEnemies, allAllies, caster);
          for (const t of targets) {
            if (t.currentHP !== undefined && t.maxHP !== undefined) {
              const healed = Math.min(amount, t.maxHP - t.currentHP);
              t.currentHP = Math.min(t.maxHP, t.currentHP + amount);
              results.push({ type: 'heal', target: t, amount: healed });
            }
          }
          break;
        }

        case 'buff': {
          let stacks = effect.stacks || 1;
          if (effect.scaling) {
            stacks += Math.max(0, this._getStatMod(caster, effect.scaling.stat));
          }
          const targets = this._resolveTargets(effect.target, targetEnemy, allEnemies, allAllies, caster);
          for (const t of targets) {
            if (statusTracker) {
              statusTracker.apply(t, effect.buffId, stacks);
            }
            results.push({ type: 'buff', target: t, buffId: effect.buffId, stacks });
          }
          break;
        }

        case 'debuff': {
          const stacks = effect.stacks || 1;
          const targets = this._resolveTargets(effect.target, targetEnemy, allEnemies, allAllies, caster);
          for (const t of targets) {
            // undeadOnly: skip non-undead targets
            if (effect.undeadOnly && t.type !== 'undead') continue;
            if (statusTracker) {
              statusTracker.apply(t, effect.debuffId, stacks);
            }
            results.push({ type: 'debuff', target: t, debuffId: effect.debuffId, stacks });
          }
          break;
        }

        case 'draw': {
          if (deckManager) {
            const drawn = deckManager.draw(effect.value, allAllies);
            results.push({ type: 'draw', count: drawn.length });
          }
          break;
        }

        case 'gainAP': {
          results.push({ type: 'gainAP', value: effect.value || 1 });
          break;
        }

        case 'poison': {
          const stacks = effect.stacks || 1;
          const targets = this._resolveTargets(effect.target, targetEnemy, allEnemies, allAllies, caster);
          for (const t of targets) {
            if (statusTracker) {
              statusTracker.apply(t, 'poison', stacks);
            }
            results.push({ type: 'poison_applied', target: t, stacks });
          }
          break;
        }

        case 'burn': {
          const stacks = effect.stacks || 1;
          const targets = this._resolveTargets(effect.target, targetEnemy, allEnemies, allAllies, caster);
          for (const t of targets) {
            if (statusTracker) {
              statusTracker.apply(t, 'burn', stacks);
            }
            results.push({ type: 'burn_applied', target: t, stacks });
          }
          break;
        }

        case 'stun': {
          const turns = effect.turns || 1;
          const targets = this._resolveTargets(effect.target, targetEnemy, allEnemies, allAllies, caster);
          for (const t of targets) {
            if (statusTracker) {
              statusTracker.apply(t, 'stun', turns);
            }
            results.push({ type: 'stun', target: t, turns });
          }
          break;
        }

        case 'lifesteal': {
          const base = this._scaledValue(effect.value, effect.scaling, caster);
          const targets = this._resolveTargets(effect.target || 'singleEnemy', targetEnemy, allEnemies, allAllies, caster);
          for (const t of targets) {
            const dmg = Math.max(1, base);
            t.currentHP = Math.max(0, t.currentHP - dmg);
            const healed = Math.min(dmg, caster.maxHP - caster.currentHP);
            caster.currentHP = Math.min(caster.maxHP, caster.currentHP + dmg);
            results.push({ type: 'lifesteal', target: t, damage: dmg, healed });
          }
          break;
        }

        case 'discard': {
          // Handled by combat state (player picks card to discard)
          results.push({ type: 'discard', value: effect.value || 1 });
          break;
        }

        case 'scry': {
          const depth = this._scaledValue(effect.value, effect.scaling, caster);
          results.push({ type: 'scry', value: Math.max(1, depth) });
          break;
        }

        case 'flee': {
          // Flee resolution — same logic as old system
          results.push({ type: 'flee', saveStat: effect.saveStat, saveDC: effect.saveDC });
          break;
        }

        default:
          results.push({ type: 'unknown', effectType: effect.type });
      }
    }

    return results;
  }

  /**
   * Resolve target specification to actual target array.
   */
  _resolveTargets(targetSpec, targetEnemy, allEnemies, allAllies, caster) {
    switch (targetSpec) {
      case 'self':
        return [caster];
      case 'singleEnemy':
        return targetEnemy ? [targetEnemy] : (allEnemies.length > 0 ? [allEnemies[0]] : []);
      case 'allEnemies':
        return allEnemies.filter(e => e.currentHP > 0);
      case 'singleAlly':
        // For ally-targeted effects, targetEnemy is repurposed as allyTarget
        // The combat UI will handle setting the correct target
        return targetEnemy && targetEnemy.currentHP !== undefined && !targetEnemy.type
          ? [targetEnemy]
          : (caster ? [caster] : []);
      case 'allAllies':
        return allAllies.filter(a => a.currentHP > 0);
      case 'random':
        if (allEnemies.length > 0) {
          return [allEnemies[Math.floor(Math.random() * allEnemies.length)]];
        }
        return [];
      default:
        return caster ? [caster] : [];
    }
  }
}

Card._nextUid = 1;
