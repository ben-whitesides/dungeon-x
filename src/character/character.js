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
    this.portrait = 'flare-1'; // Default portrait
    
    // Track base stats vs modified stats
    this.baseStats = {};
    this.levelBonuses = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
    
    const classData = CLASS_DATA[classKey];
    this.baseStats = {
      str: classData.str,
      dex: classData.dex,
      con: classData.con,
      int: classData.int,
      wis: classData.wis,
      cha: classData.cha
    };
    
    // Calculate initial stats
    this.calculateFinalStats();
    
    this.hp = this.calculateMaxHP();
    this.currentHP = this.hp;
    this.mp = 10; // Simplified for now
    this.currentMP = this.mp;
  }
  
  equipItem(item) {
    const slot = item.getSlot();
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
  
  calculateFinalStats() {
    // Calculate final stats: base + level bonuses + equipment
    this.stats = {
      str: this.baseStats.str + this.levelBonuses.str,
      dex: this.baseStats.dex + this.levelBonuses.dex,
      con: this.baseStats.con + this.levelBonuses.con,
      int: this.baseStats.int + this.levelBonuses.int,
      wis: this.baseStats.wis + this.levelBonuses.wis,
      cha: this.baseStats.cha + this.levelBonuses.cha
    };
    
    // Apply equipment bonuses
    Object.values(this.equipment).forEach(item => {
      if (item && item.stats) {
        Object.entries(item.stats).forEach(([stat, bonus]) => {
          if (this.stats[stat] !== undefined) {
            this.stats[stat] += bonus;
          }
        });
      }
    });
    
    // Recalculate derived stats
    this.hp = this.calculateMaxHP();
  }
  
  getModifier(stat) {
    return Math.floor((this.stats[stat] - 10) / 2);
  }
  
  calculateMaxHP() {
    const conMod = this.getModifier('con');
    return 10 + conMod; // Simplified: base 10 + CON mod
  }
  
  checkLevelUp() {
    const newLevel = getLevelFromXP(this.xp);
    if (newLevel > this.level) {
      const oldLevel = this.level;
      this.level = newLevel;
      
      // Apply level features
      for (let lvl = oldLevel + 1; lvl <= newLevel; lvl++) {
        const levelData = LEVEL_DATA[lvl - 1];
        if (levelData) {
          this.applyLevelFeatures(levelData.features);
        }
      }
      
      this.hp = this.calculateMaxHP();
      return true;
    }
    return false;
  }
  
  getProficiencyBonus() {
    return getProficiencyBonus(this.level);
  }
  
  // For future level-up UI - returns available stat choices
  getAvailableStatChoices() {
    return ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  }
  
  // Apply a stat increase choice
  increaseStat(statName) {
    if (this.levelBonuses[statName] !== undefined) {
      this.levelBonuses[statName] += 1;
      this.calculateFinalStats();
      return true;
    }
    return false;
  }
  
  // Complete a pending stat increase
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
        // Mark that player needs to choose a stat increase
        this.pendingStatIncrease = true;
      } else if (feature === 'extraAttack') {
        this.hasExtraAttack = true;
      } else if (feature === 'classFeature') {
        // Placeholder for class-specific features
        this.classFeatures = (this.classFeatures || 0) + 1;
      } else if (feature === 'epicFeature') {
        // Placeholder for epic features
        this.epicFeatures = (this.epicFeatures || 0) + 1;
      }
      // Handle specific stat increases
      else if (feature === 'str+1') this.levelBonuses.str++;
      else if (feature === 'dex+1') this.levelBonuses.dex++;
      // Add other specific bonuses as needed
    }
  }
}
