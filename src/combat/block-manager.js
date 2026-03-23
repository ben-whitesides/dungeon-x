// Block Manager — Per-party-member Block tracking
// Scope Section 4: Equipment -> Card Interaction
// Block absorbs damage BEFORE HP. Decays to 0 at turn start (unless Barricade).
// Armor/Shield provide starting Block each turn.

// Armor AC → starting Block conversion table
const ARMOR_BLOCK_MAP = {
  // AC value → block per turn
  11: 1,  // Padded
  12: 1,  // Leather
  14: 2,  // Studded Leather / Hide
  15: 3,  // Chain Mail (Cleric variant)
  16: 3,  // Chain Mail + Shield
  18: 5,  // Plate
};

// Shield AC → block per turn
const SHIELD_BLOCK_MAP = {
  2: 1,  // Wooden Shield
  3: 2,  // Iron Shield
  4: 3,  // Tower Shield
};

export class BlockManager {
  constructor() {
    // Map of entity → { current: number, armorBase: number }
    this._blocks = new Map();
  }

  /**
   * Get or create block entry for an entity.
   */
  _getEntry(entity) {
    if (!this._blocks.has(entity)) {
      this._blocks.set(entity, { current: 0, armorBase: 0 });
    }
    return this._blocks.get(entity);
  }

  /**
   * Calculate and store the armor-based starting Block for a party member.
   * Called once at combat start for each party member.
   */
  setStartingBlock(member) {
    const entry = this._getEntry(member);
    let armorBlock = 0;

    // Armor contribution
    const armor = member.equipment?.armor;
    if (armor && armor.ac) {
      // Find nearest AC in map, default to simple formula
      armorBlock = ARMOR_BLOCK_MAP[armor.ac] || Math.max(0, Math.floor((armor.ac - 10) / 2));
    }

    // Shield contribution
    const shield = member.equipment?.shield;
    if (shield && shield.ac) {
      armorBlock += SHIELD_BLOCK_MAP[shield.ac] || Math.max(0, shield.ac - 1);
    }

    entry.armorBase = armorBlock;
    entry.current = armorBlock;
  }

  /**
   * Add Block from a card effect.
   */
  addBlock(entity, amount) {
    const entry = this._getEntry(entity);
    entry.current += Math.max(0, amount);
  }

  /**
   * Get current Block for an entity.
   */
  getBlock(entity) {
    const entry = this._blocks.get(entity);
    return entry ? entry.current : 0;
  }

  /**
   * Absorb damage with Block. Returns HP damage remaining after Block.
   */
  absorbDamage(entity, damage) {
    const entry = this._getEntry(entity);
    if (entry.current >= damage) {
      entry.current -= damage;
      return 0; // All absorbed
    }
    const remaining = damage - entry.current;
    entry.current = 0;
    return remaining;
  }

  /**
   * Decay Block at turn start — reset to armor base value.
   * If entity has block_persist (Barricade), do NOT reset.
   * @param {Object} statusTracker — StatusEffectTracker for checking Barricade
   */
  decayBlock(statusTracker) {
    for (const [entity, entry] of this._blocks) {
      if (statusTracker && statusTracker.getStacks(entity, 'block_persist') > 0) {
        // Barricade: Block persists, but still add armor base
        entry.current += entry.armorBase;
      } else {
        // Normal: decay to 0 then apply armor base
        entry.current = entry.armorBase;
      }
    }
  }

  /**
   * Reset block tracking for new combat.
   */
  reset() {
    this._blocks.clear();
  }
}
