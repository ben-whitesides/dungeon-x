// Status Effect Tracker — Scope Section 2: Status Effects table
// Poison: ticks at turn START, decays by 1
// Burn: ticks at turn END, does NOT decay
// Strength/Dexterity: permanent combat buffs
// Weak/Vulnerable/Frail: turn-based debuffs that decay

export class StatusEffectTracker {
  constructor() {
    // Map of entity -> { effectId: stacks }
    this._effects = new Map();
  }

  /**
   * Get the status map for an entity, creating if needed.
   */
  _getMap(entity) {
    if (!this._effects.has(entity)) {
      this._effects.set(entity, {});
    }
    return this._effects.get(entity);
  }

  /**
   * Apply stacks of a status effect to a target.
   */
  apply(target, effectId, stacks) {
    const map = this._getMap(target);
    map[effectId] = (map[effectId] || 0) + stacks;
  }

  /**
   * Get current stacks of an effect on a target.
   */
  getStacks(target, effectId) {
    const map = this._effects.get(target);
    if (!map) return 0;
    return map[effectId] || 0;
  }

  /**
   * Remove all stacks of an effect from a target.
   */
  remove(target, effectId) {
    const map = this._effects.get(target);
    if (map) {
      delete map[effectId];
    }
  }

  /**
   * Remove ALL effects from a target (combat end cleanup).
   */
  clearAll(target) {
    this._effects.delete(target);
  }

  /**
   * Clear the entire tracker (new combat).
   */
  reset() {
    this._effects.clear();
  }

  /**
   * Get all active effects for a target (for UI display).
   * @returns {{ id: string, stacks: number }[]}
   */
  getActiveEffects(target) {
    const map = this._effects.get(target);
    if (!map) return [];
    return Object.entries(map)
      .filter(([, stacks]) => stacks > 0)
      .map(([id, stacks]) => ({ id, stacks }));
  }

  /**
   * Process turn-start effects for a target.
   * - Poison: deal damage equal to stacks, then reduce by 1
   * - Regen: heal equal to stacks, then reduce by 1
   * - Ritual: gain 1 Strength per stack
   * - Stun: decrement (skip turn if > 0)
   * @returns {Array} — array of effect results for combat log
   */
  tickTurnStart(target) {
    const results = [];
    const map = this._effects.get(target);
    if (!map) return results;

    // Poison: damage + decay
    if (map.poison > 0) {
      const dmg = map.poison;
      if (target.currentHP !== undefined) {
        target.currentHP = Math.max(0, target.currentHP - dmg);
      }
      results.push({ type: 'poison_tick', target, damage: dmg, remaining: map.poison - 1 });
      map.poison -= 1;
      if (map.poison <= 0) delete map.poison;
    }

    // Regen: heal + decay
    if (map.regen > 0) {
      const heal = map.regen;
      if (target.currentHP !== undefined && target.maxHP !== undefined) {
        const actual = Math.min(heal, target.maxHP - target.currentHP);
        target.currentHP = Math.min(target.maxHP, target.currentHP + heal);
        results.push({ type: 'regen_tick', target, healed: actual, remaining: map.regen - 1 });
      }
      map.regen -= 1;
      if (map.regen <= 0) delete map.regen;
    }

    // Ritual: gain Strength
    if (map.ritual > 0) {
      map.strength = (map.strength || 0) + map.ritual;
      results.push({ type: 'ritual_tick', target, strengthGained: map.ritual });
    }

    // Stun: decrement
    if (map.stun > 0) {
      results.push({ type: 'stunned', target });
      map.stun -= 1;
      if (map.stun <= 0) delete map.stun;
    }

    return results;
  }

  /**
   * Process turn-end effects for a target.
   * - Burn: deal damage equal to stacks (does NOT decay)
   * - Weak: decrement
   * - Vulnerable: decrement
   * - Frail: decrement
   * @returns {Array} — array of effect results
   */
  tickTurnEnd(target) {
    const results = [];
    const map = this._effects.get(target);
    if (!map) return results;

    // Burn: damage, NO decay
    if (map.burn > 0) {
      const dmg = map.burn;
      if (target.currentHP !== undefined) {
        target.currentHP = Math.max(0, target.currentHP - dmg);
      }
      results.push({ type: 'burn_tick', target, damage: dmg });
    }

    // Weak: decrement
    if (map.weak > 0) {
      map.weak -= 1;
      if (map.weak <= 0) delete map.weak;
    }

    // Vulnerable: decrement
    if (map.vulnerable > 0) {
      map.vulnerable -= 1;
      if (map.vulnerable <= 0) delete map.vulnerable;
    }

    // Frail: decrement
    if (map.frail > 0) {
      map.frail -= 1;
      if (map.frail <= 0) delete map.frail;
    }

    return results;
  }

  /**
   * Check if target is stunned (skip their turn).
   */
  isStunned(target) {
    return this.getStacks(target, 'stun') > 0;
  }
}

// Display data for status effects (icons, colors, descriptions)
export const STATUS_DISPLAY = {
  strength:   { name: 'Strength',   icon: '⚔', color: '#ff4444', desc: '+{n} damage to attacks' },
  dexterity:  { name: 'Dexterity',  icon: '🛡', color: '#4488ff', desc: '+{n} block gained' },
  vulnerable: { name: 'Vulnerable', icon: '💥', color: '#ff8844', desc: 'Take 50% more damage' },
  weak:       { name: 'Weak',       icon: '↓',  color: '#888844', desc: 'Deal 25% less damage' },
  frail:      { name: 'Frail',      icon: '🔻', color: '#886644', desc: 'Gain 25% less block' },
  poison:     { name: 'Poison',     icon: '☠',  color: '#44aa44', desc: '{n} damage at turn start, decays' },
  burn:       { name: 'Burn',       icon: '🔥', color: '#ff6600', desc: '{n} damage at turn end' },
  regen:      { name: 'Regen',      icon: '❤',  color: '#44cc44', desc: 'Heal {n} at turn start, decays' },
  thorns:     { name: 'Thorns',     icon: '⚡', color: '#aa8844', desc: 'Deal {n} to attackers' },
  ritual:     { name: 'Ritual',     icon: '✦',  color: '#cc44cc', desc: 'Gain {n} Strength each turn' },
  stun:       { name: 'Stun',       icon: '★',  color: '#ffcc00', desc: 'Skip next turn' },
  envenom:    { name: 'Envenom',    icon: '🗡',  color: '#44aa44', desc: 'Attacks apply 1 Poison' },
  block_persist: { name: 'Barricade', icon: '🏰', color: '#8888aa', desc: 'Block persists between turns' },
};
