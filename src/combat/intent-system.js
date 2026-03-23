// Intent System — Enemy intent selection and display
// Scope Section 3: Enemy Intent System
// Enemies deal FIXED damage (no d20 rolls). Intent shown at end of enemy turn.

// Intent types
export const INTENT_TYPE = {
  ATTACK: 'attack',
  MULTI_ATTACK: 'multi_attack',
  DEFEND: 'defend',
  DEBUFF: 'debuff',
  BUFF: 'buff',
  UNKNOWN: 'unknown',
};

// Intent display data
export const INTENT_DISPLAY = {
  attack:       { icon: '⚔', color: '#ff4444', label: 'Attack' },
  multi_attack: { icon: '⚔⚔', color: '#ff2222', label: 'Multi-Attack' },
  defend:       { icon: '🛡', color: '#4488ff', label: 'Defend' },
  debuff:       { icon: '☠', color: '#cc44cc', label: 'Debuff' },
  buff:         { icon: '↑', color: '#44cc44', label: 'Buff' },
  unknown:      { icon: '?', color: '#888888', label: '???' },
};

/**
 * Parse a monster's attack dice notation to a fixed damage value.
 * "1d8+3" → average roll = 4.5 + 3 = 7.5 → 8 (rounded up for danger feel)
 */
function attackToFixed(attackNotation) {
  if (typeof attackNotation === 'number') return attackNotation;
  const match = String(attackNotation).match(/(\d*)d(\d+)([+-]\d+)?/);
  if (!match) return parseInt(attackNotation) || 5;
  const count = parseInt(match[1]) || 1;
  const sides = parseInt(match[2]);
  const bonus = parseInt(match[3]) || 0;
  // Use average + 0.5 per die (rounds favorably for enemies)
  return Math.ceil(count * ((sides + 1) / 2) + bonus);
}

/**
 * Generate intent patterns for a monster based on its stats.
 * Each monster gets a weighted pool of intents.
 */
function getIntentPool(enemy) {
  const baseDamage = attackToFixed(enemy.attack || enemy.damage || '1d6');

  const pool = [
    // Standard attack — most common
    { type: INTENT_TYPE.ATTACK, damage: baseDamage, weight: 50 },
    // Light attack
    { type: INTENT_TYPE.ATTACK, damage: Math.max(1, Math.floor(baseDamage * 0.6)), weight: 15 },
    // Heavy attack
    { type: INTENT_TYPE.ATTACK, damage: Math.floor(baseDamage * 1.4), weight: 10 },
    // Defend (gain block)
    { type: INTENT_TYPE.DEFEND, block: Math.floor(baseDamage * 0.8), weight: 10 },
    // Debuff (apply weak)
    { type: INTENT_TYPE.DEBUFF, debuffId: 'weak', stacks: 1, damage: Math.floor(baseDamage * 0.5), weight: 10 },
    // Buff self (gain strength)
    { type: INTENT_TYPE.BUFF, buffId: 'strength', stacks: 1, weight: 5 },
  ];

  // Boss/special enemies: add multi-attack
  if (enemy.xp >= 500 || enemy.special) {
    pool.push({
      type: INTENT_TYPE.MULTI_ATTACK,
      damage: Math.floor(baseDamage * 0.6),
      hits: 2,
      weight: 15
    });
  }

  return pool;
}

/**
 * Select an intent for an enemy.
 * @param {Object} enemy — monster object
 * @param {number} floor — current dungeon floor (higher floors = more aggressive)
 * @returns {Object} — selected intent { type, damage?, block?, debuffId?, stacks?, hits? }
 */
export function selectIntent(enemy, floor) {
  // If enemy already has intents defined in data, use those
  if (enemy.intents && enemy.intents.length > 0) {
    const idx = Math.floor(Math.random() * enemy.intents.length);
    return { ...enemy.intents[idx] };
  }

  const pool = getIntentPool(enemy);

  // Floor scaling: boost attack weight on higher floors
  const floorBonus = Math.min(floor || 1, 5);
  for (const intent of pool) {
    if (intent.type === INTENT_TYPE.ATTACK || intent.type === INTENT_TYPE.MULTI_ATTACK) {
      intent.weight += floorBonus * 2;
    }
  }

  // Weighted random selection
  const totalWeight = pool.reduce((sum, i) => sum + i.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const intent of pool) {
    roll -= intent.weight;
    if (roll <= 0) {
      const result = { ...intent };
      delete result.weight;
      return result;
    }
  }

  // Fallback
  return { type: INTENT_TYPE.ATTACK, damage: attackToFixed(enemy.attack || '1d6') };
}

/**
 * Execute an enemy's intent against the party.
 * @param {Object} enemy — the acting enemy
 * @param {Object} intent — the intent to execute
 * @param {Array} aliveMembers — alive party members
 * @param {Object} blockManager — BlockManager instance
 * @param {Object} statusTracker — StatusEffectTracker instance
 * @returns {Array} — results for combat log
 */
export function executeIntent(enemy, intent, aliveMembers, blockManager, statusTracker) {
  const results = [];
  if (aliveMembers.length === 0) return results;

  switch (intent.type) {
    case INTENT_TYPE.ATTACK: {
      const target = aliveMembers[Math.floor(Math.random() * aliveMembers.length)];
      let dmg = intent.damage || 5;
      // Apply enemy Strength buff and Weak debuff
      if (statusTracker) {
        dmg += statusTracker.getStacks(enemy, 'strength');
        // If enemy is Weak, -25% damage
        if (statusTracker.getStacks(enemy, 'weak') > 0) {
          dmg = Math.floor(dmg * 0.75);
        }
        // If target is Vulnerable, +50%
        if (statusTracker.getStacks(target, 'vulnerable') > 0) {
          dmg = Math.floor(dmg * 1.5);
        }
      }
      dmg = Math.max(1, dmg);
      // Block absorbs first
      let hpDmg = dmg;
      if (blockManager) {
        hpDmg = blockManager.absorbDamage(target, dmg);
      }
      target.currentHP = Math.max(0, target.currentHP - hpDmg);
      results.push({
        type: 'enemy_attack', enemy, target,
        totalDamage: dmg, blocked: dmg - hpDmg, hpDamage: hpDmg
      });
      break;
    }

    case INTENT_TYPE.MULTI_ATTACK: {
      const hits = intent.hits || 2;
      for (let i = 0; i < hits; i++) {
        const target = aliveMembers[Math.floor(Math.random() * aliveMembers.length)];
        let dmg = intent.damage || 3;
        if (statusTracker) {
          dmg += statusTracker.getStacks(enemy, 'strength');
          if (statusTracker.getStacks(enemy, 'weak') > 0) {
            dmg = Math.floor(dmg * 0.75);
          }
          if (statusTracker.getStacks(target, 'vulnerable') > 0) {
            dmg = Math.floor(dmg * 1.5);
          }
        }
        dmg = Math.max(1, dmg);
        let hpDmg = dmg;
        if (blockManager) {
          hpDmg = blockManager.absorbDamage(target, dmg);
        }
        target.currentHP = Math.max(0, target.currentHP - hpDmg);
        results.push({
          type: 'enemy_attack', enemy, target,
          totalDamage: dmg, blocked: dmg - hpDmg, hpDamage: hpDmg,
          hit: i + 1, totalHits: hits
        });
      }
      break;
    }

    case INTENT_TYPE.DEFEND: {
      const block = intent.block || 5;
      if (blockManager) {
        blockManager.addBlock(enemy, block);
      }
      results.push({ type: 'enemy_defend', enemy, block });
      break;
    }

    case INTENT_TYPE.DEBUFF: {
      const target = aliveMembers[Math.floor(Math.random() * aliveMembers.length)];
      if (statusTracker) {
        statusTracker.apply(target, intent.debuffId || 'weak', intent.stacks || 1);
      }
      // Some debuff intents also deal damage
      if (intent.damage > 0) {
        let dmg = intent.damage;
        let hpDmg = dmg;
        if (blockManager) {
          hpDmg = blockManager.absorbDamage(target, dmg);
        }
        target.currentHP = Math.max(0, target.currentHP - hpDmg);
        results.push({
          type: 'enemy_attack', enemy, target,
          totalDamage: dmg, blocked: dmg - hpDmg, hpDamage: hpDmg
        });
      }
      results.push({
        type: 'enemy_debuff', enemy, target,
        debuffId: intent.debuffId || 'weak', stacks: intent.stacks || 1
      });
      break;
    }

    case INTENT_TYPE.BUFF: {
      if (statusTracker) {
        statusTracker.apply(enemy, intent.buffId || 'strength', intent.stacks || 1);
      }
      results.push({
        type: 'enemy_buff', enemy,
        buffId: intent.buffId || 'strength', stacks: intent.stacks || 1
      });
      break;
    }

    default:
      results.push({ type: 'enemy_unknown', enemy });
  }

  return results;
}

/**
 * Get display data for an intent (for rendering icons).
 */
export function getIntentDisplay(intent) {
  const display = INTENT_DISPLAY[intent.type] || INTENT_DISPLAY.unknown;
  let label = display.label;
  let detail = '';

  if (intent.type === INTENT_TYPE.ATTACK) {
    detail = `${intent.damage}`;
  } else if (intent.type === INTENT_TYPE.MULTI_ATTACK) {
    detail = `${intent.damage}x${intent.hits || 2}`;
  } else if (intent.type === INTENT_TYPE.DEFEND) {
    detail = `+${intent.block}`;
  } else if (intent.type === INTENT_TYPE.DEBUFF) {
    detail = intent.debuffId || '';
  } else if (intent.type === INTENT_TYPE.BUFF) {
    detail = intent.buffId || '';
  }

  return {
    icon: display.icon,
    color: display.color,
    label,
    detail,
  };
}
