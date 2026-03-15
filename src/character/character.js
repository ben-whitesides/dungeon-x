import { CLASS_DATA } from './class-data.js';
import { LEVEL_DATA } from './level-data.js';

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
    
    const classData = CLASS_DATA[classKey];
    this.stats = {
      str: classData.str,
      dex: classData.dex,
      con: classData.con,
      int: classData.int,
      wis: classData.wis,
      cha: classData.cha
    };
    
    this.hp = this.calculateMaxHP();
    this.currentHP = this.hp;
    this.mp = 10; // Simplified for now
    this.currentMP = this.mp;
  }
  
  getModifier(stat) {
    return Math.floor((this.stats[stat] - 10) / 2);
  }
  
  calculateMaxHP() {
    const conMod = this.getModifier('con');
    return 10 + conMod; // Simplified: base 10 + CON mod
  }
  
  checkLevelUp() {
    const nextLevel = LEVEL_DATA[this.level];
    if (this.xp >= nextLevel.xp) {
      this.level++;
      this.applyLevelFeatures(nextLevel.features);
      this.hp = this.calculateMaxHP();
      return true;
    }
    return false;
  }
  
  applyLevelFeatures(features) {
    for (const feature of features) {
      if (feature === 'str+1') this.stats.str++;
      if (feature === 'dex+1') this.stats.dex++;
      // Add other features as needed
    }
  }
}
