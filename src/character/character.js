import { CLASS_DATA } from './class-data.js';
import { LEVEL_DATA, getLevelFromXP, getProficiencyBonus } from './level-data.js';

export class Character {
  constructor(name, classKey, level = 1) {
    this.name = name;
    this.class = classKey;
    this.level = level;
    this.xp = 0;
    this.equipment = {
      weapon: null,
      armor: null,
      shield: null,
      accessory: null
    };

    const classData = CLASS_DATA[classKey];
    this.portrait = classData.portrait || 'portrait_male_1';

    // Base ability scores from class data (game bible canonical)
    this.baseStats = {
      str: classData.str,
      dex: classData.dex,
      con: classData.con,
      int: classData.int,
      wis: classData.wis,
      cha: classData.cha
    };

    // Level-up stat bonuses (accumulated from ability score increases)
    this.levelBonuses = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };

    // Hit die info for HP rolls on level up
    this.hpDice = classData.hpDice;
    this.hpDieMax = classData.hpDieMax;

    // Calculate derived stats
    this.calculateFinalStats();

    // Level 1 HP = hit die maximum + CON modifier (D&D 5e standard)
    const conMod = Math.floor((this.stats.con - 10) / 2);
    this.maxHP = this.hpDieMax + conMod;
    this.currentHP = this.maxHP;

    // Mana pool — Mage uses INT, Cleric/Paladin use WIS, others use INT
    const manaStatKey = (classKey === 'cleric' || classKey === 'paladin') ? 'wis' : 'int';
    this.manaStatKey = manaStatKey;
    this.maxMana = classData.baseMana + Math.max(0, Math.floor((this.stats[manaStatKey] - 10) / 2));
    this.currentMana = this.maxMana;

    // Equip starting equipment
    if (classData.startingEquipment) {
      for (const item of classData.startingEquipment) {
        const slot = item.slot;
        if (slot && !this.equipment[slot]) {
          this.equipment[slot] = { ...item, getSlot: () => slot };
        }
      }
    }

    // Combat tracking
    this.hasExtraAttack = false;
    this.pendingStatIncrease = false;
    this.classFeatures = 0;
    this.epicFeatures = 0;
    this.isDefending = false;       // Defend action — +2 AC until next turn
    this.abilityCooldowns = {};     // { abilityId: turnsRemaining }
    this.activeBuffs = [];          // [{ id, effect, turnsLeft }]
    this.layOnHandsPool = 0;       // Paladin Lay on Hands remaining HP pool
    if (classKey === 'paladin') {
      this.layOnHandsPool = level * 5;
    }
  }

  // --- Stats ---

  calculateFinalStats() {
    this.stats = {
      str: this.baseStats.str + this.levelBonuses.str,
      dex: this.baseStats.dex + this.levelBonuses.dex,
      con: this.baseStats.con + this.levelBonuses.con,
      int: this.baseStats.int + this.levelBonuses.int,
      wis: this.baseStats.wis + this.levelBonuses.wis,
      cha: this.baseStats.cha + this.levelBonuses.cha
    };

    // Apply equipment stat bonuses
    Object.values(this.equipment).forEach(item => {
      if (item && item.stats) {
        Object.entries(item.stats).forEach(([stat, bonus]) => {
          if (this.stats[stat] !== undefined) {
            this.stats[stat] += bonus;
          }
        });
      }
    });

    // D&D 5e hard cap: no ability score above 20 (excluding magic items)
    for (const stat of Object.keys(this.stats)) {
      this.stats[stat] = Math.min(20, this.stats[stat]);
    }
  }

  getModifier(stat) {
    return Math.floor((this.stats[stat] - 10) / 2);
  }

  // --- HP ---

  calculateMaxHP() {
    // Level 1: hit die max + CON mod
    // Level 2+: add rolled hit die + CON mod per level
    const conMod = this.getModifier('con');
    let hp = this.hpDieMax + conMod; // Level 1

    // For levels beyond 1, add average roll + CON mod per level
    // Average roll = (max/2) + 1 (D&D 5e standard fixed HP option)
    for (let lvl = 2; lvl <= this.level; lvl++) {
      hp += Math.floor(this.hpDieMax / 2) + 1 + conMod;
    }

    return Math.max(1, hp);
  }

  // --- AC ---

  getAC() {
    let ac = 10 + this.getModifier('dex'); // Base unarmored

    // If wearing armor, use armor AC (may or may not add DEX)
    const armor = this.equipment.armor;
    if (armor && armor.ac) {
      ac = armor.ac; // Armor sets AC directly (already includes DEX cap where appropriate)
    }

    // Shield bonus
    const shield = this.equipment.shield;
    if (shield && shield.ac) {
      ac += shield.ac;
    }

    // Defend action: +2 AC until next turn (D&D 5e Dodge gives disadvantage, +2 is DX simplified)
    if (this.isDefending) {
      ac += 2;
    }

    // Active buff AC bonuses (Arcane Shield, Divine Shield, etc.)
    for (const buff of this.activeBuffs) {
      if (buff.effect.acBonus) {
        ac += buff.effect.acBonus;
      }
    }

    return ac;
  }

  // --- Mana ---

  calculateMaxMana() {
    const classData = CLASS_DATA[this.class];
    // Use correct casting stat: Cleric/Paladin = WIS, all others = INT
    const castMod = Math.max(0, this.getModifier(this.manaStatKey));
    // Base mana + casting stat mod, grows slightly per level for casters
    return classData.baseMana + castMod + (classData.baseMana > 0 ? (this.level - 1) * 2 : 0);
  }

  // --- Equipment ---

  equipItem(item) {
    const slot = item.getSlot ? item.getSlot() : item.slot;
    if (slot && this.equipment[slot] === null) {
      this.equipment[slot] = item;
      this.calculateFinalStats();
      return true;
    }
    return false;
  }

  unequipItem(slot) {
    if (this.equipment[slot]) {
      const item = this.equipment[slot];
      this.equipment[slot] = null;
      this.calculateFinalStats();
      return item;
    }
    return null;
  }

  getEquippedItem(slot) {
    return this.equipment[slot];
  }

  getWeaponDamage() {
    const weapon = this.equipment.weapon;
    if (weapon && weapon.damage) return weapon.damage;
    return '1d4'; // Unarmed
  }

  getAttackModifier() {
    const weapon = this.equipment.weapon;
    // Ranged weapons use DEX, melee uses STR
    if (weapon && weapon.ranged) {
      return this.getModifier('dex') + this.getProficiencyBonus();
    }
    return this.getModifier('str') + this.getProficiencyBonus();
  }

  getDamageModifier() {
    const weapon = this.equipment.weapon;
    if (weapon && weapon.ranged) {
      return this.getModifier('dex');
    }
    return this.getModifier('str');
  }

  // --- Leveling ---

  checkLevelUp() {
    const newLevel = getLevelFromXP(this.xp);
    if (newLevel > this.level) {
      const oldLevel = this.level;
      this.level = newLevel;

      // Apply level features for each level gained
      for (let lvl = oldLevel + 1; lvl <= newLevel; lvl++) {
        const levelData = LEVEL_DATA[lvl - 1];
        if (levelData) {
          this.applyLevelFeatures(levelData.features);
        }
      }

      // Recalculate HP and mana for new level
      this.maxHP = this.calculateMaxHP();
      this.currentHP = this.maxHP; // Full heal on level up
      this.maxMana = this.calculateMaxMana();
      this.currentMana = this.maxMana; // Full mana restore on level up

      return true;
    }
    return false;
  }

  getProficiencyBonus() {
    return getProficiencyBonus(this.level);
  }

  addXP(amount) {
    this.xp += amount;
    return this.checkLevelUp();
  }

  getXPToNextLevel() {
    const nextLevelData = LEVEL_DATA[this.level]; // current level is 1-indexed, array is 0-indexed
    if (!nextLevelData) return Infinity; // Max level
    return nextLevelData.xp - this.xp;
  }

  // --- Ability Score Increases ---

  getAvailableStatChoices() {
    return ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  }

  increaseStat(statName) {
    if (this.levelBonuses[statName] !== undefined) {
      // D&D 5e ASI: +2 to one score (capped at 20)
      const currentTotal = this.baseStats[statName] + this.levelBonuses[statName];
      const increase = Math.min(2, 20 - currentTotal); // Don't exceed cap
      if (increase <= 0) return false;
      this.levelBonuses[statName] += increase;
      this.calculateFinalStats();
      // Recalculate derived stats that depend on ability scores
      this.maxHP = this.calculateMaxHP();
      this.maxMana = this.calculateMaxMana();
      return true;
    }
    return false;
  }

  completeStatIncrease(statName) {
    if (this.pendingStatIncrease) {
      this.increaseStat(statName);
      this.pendingStatIncrease = false;
      return true;
    }
    return false;
  }

  applyLevelFeatures(features) {
    for (const feature of features) {
      if (feature === 'abilityScoreIncrease') {
        this.pendingStatIncrease = true;
      } else if (feature === 'extraAttack') {
        this.hasExtraAttack = true;
      } else if (feature === 'classFeature') {
        this.classFeatures += 1;
      } else if (feature === 'epicFeature') {
        this.epicFeatures += 1;
      } else if (feature === 'str+1') {
        this.levelBonuses.str++;
      } else if (feature === 'dex+1') {
        this.levelBonuses.dex++;
      } else if (feature === 'con+1') {
        this.levelBonuses.con++;
      } else if (feature === 'int+1') {
        this.levelBonuses.int++;
      } else if (feature === 'wis+1') {
        this.levelBonuses.wis++;
      } else if (feature === 'cha+1') {
        this.levelBonuses.cha++;
      }
    }
    this.calculateFinalStats();
  }

  // --- Healing & Rest ---

  heal(amount) {
    this.currentHP = Math.min(this.maxHP, this.currentHP + amount);
  }

  takeDamage(amount) {
    this.currentHP = Math.max(0, this.currentHP - amount);
    return this.currentHP <= 0;
  }

  restoreMana(amount) {
    this.currentMana = Math.min(this.maxMana, this.currentMana + amount);
  }

  spendMana(cost) {
    if (this.currentMana >= cost) {
      this.currentMana -= cost;
      return true;
    }
    return false;
  }

  isAlive() {
    return this.currentHP > 0;
  }

  isDead() {
    return this.currentHP <= 0;
  }

  // --- Saving Throws ---

  savingThrow(stat, dc) {
    // D&D 5e: d20 + stat modifier + proficiency bonus (if proficient in that save)
    const roll = Math.floor(Math.random() * 20) + 1;
    const mod = this.getModifier(stat);
    const classData = CLASS_DATA[this.class];
    const proficient = classData.savingThrows && classData.savingThrows.includes(stat);
    const profBonus = proficient ? this.getProficiencyBonus() : 0;
    return (roll + mod + profBonus) >= dc;
  }

  // --- Initiative ---

  rollInitiative() {
    // D&D 5e: d20 + DEX modifier
    const roll = Math.floor(Math.random() * 20) + 1;
    return roll + this.getModifier('dex');
  }

  // --- Defend Action ---

  setDefending() {
    this.isDefending = true;
  }

  clearDefending() {
    this.isDefending = false;
  }

  // --- Class Abilities ---

  getAvailableAbilities() {
    const classData = CLASS_DATA[this.class];
    if (!classData.abilities) return [];
    return classData.abilities.filter(a => {
      if (a.unlockLevel > this.level) return false;
      if (a.type === 'passive') return false; // Passives are always-on, not activated
      const cd = this.abilityCooldowns[a.id] || 0;
      if (cd > 0) return false;
      if (a.manaCost > this.currentMana) return false;
      return true;
    });
  }

  getPassiveAbilities() {
    const classData = CLASS_DATA[this.class];
    if (!classData.abilities) return [];
    return classData.abilities.filter(a => a.type === 'passive' && a.unlockLevel <= this.level);
  }

  useAbility(abilityId) {
    const classData = CLASS_DATA[this.class];
    const ability = classData.abilities?.find(a => a.id === abilityId);
    if (!ability) return { success: false, reason: 'unknown_ability' };
    if (ability.unlockLevel > this.level) return { success: false, reason: 'level_too_low' };

    const cd = this.abilityCooldowns[ability.id] || 0;
    if (cd > 0) return { success: false, reason: 'on_cooldown', turnsLeft: cd };

    // Paladin Lay on Hands uses pool, not mana
    if (ability.id === 'lay_on_hands') {
      if (this.layOnHandsPool <= 0) return { success: false, reason: 'pool_empty' };
    } else if (ability.manaCost > 0) {
      if (!this.spendMana(ability.manaCost)) return { success: false, reason: 'not_enough_mana' };
    }

    // Set cooldown
    if (ability.cooldown > 0) {
      this.abilityCooldowns[ability.id] = ability.cooldown;
    }

    // Apply buff if it has duration
    if (ability.effect.duration) {
      this.activeBuffs.push({
        id: ability.id,
        name: ability.name,
        effect: ability.effect,
        turnsLeft: ability.effect.duration
      });
    }

    return { success: true, ability };
  }

  // Called at start of this character's turn — tick cooldowns and buffs
  tickTurnStart() {
    // Clear defend from previous turn
    this.clearDefending();

    // Tick cooldowns down
    for (const id of Object.keys(this.abilityCooldowns)) {
      this.abilityCooldowns[id] = Math.max(0, this.abilityCooldowns[id] - 1);
    }

    // Tick buff durations
    this.activeBuffs = this.activeBuffs.filter(buff => {
      buff.turnsLeft -= 1;
      return buff.turnsLeft > 0;
    });
  }

  // Reset combat state between encounters
  resetCombatState() {
    this.isDefending = false;
    this.abilityCooldowns = {};
    this.activeBuffs = [];
  }

  // Paladin Lay on Hands — spend from pool
  layOnHands(target, amount) {
    if (this.class !== 'paladin') return 0;
    const actual = Math.min(amount, this.layOnHandsPool, target.maxHP - target.currentHP);
    this.layOnHandsPool -= actual;
    target.heal(actual);
    return actual;
  }

  // --- Summary ---

  getSummary() {
    return {
      name: this.name,
      class: this.class,
      level: this.level,
      xp: this.xp,
      hp: `${this.currentHP}/${this.maxHP}`,
      mp: `${this.currentMana}/${this.maxMana}`,
      ac: this.getAC(),
      stats: { ...this.stats },
    };
  }
}
