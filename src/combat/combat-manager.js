import { attackRoll, calculateDamage } from './damage-calc.js';

export class CombatManager {
  constructor() {
    this.state = 'inactive'; // inactive, active, victory, defeat
    this.enemies = [];
    this.currentTurn = 0;
  }
  
  startCombat(enemies) {
    this.enemies = enemies;
    this.state = 'active';
    this.currentTurn = 0;
  }
  
  processAttack(attacker, target, weaponDice = '1d6', attackMod = 0, damageMod = 0) {
    const attack = attackRoll({ attackMod }, target);
    
    if (!attack.hit) {
      return { success: false, attack, damage: 0 };
    }
    
    let damage = calculateDamage(weaponDice, damageMod);
    if (attack.critical === 'crit') {
      damage *= 2; // Double damage on crit
    }
    
    target.currentHP = Math.max(0, target.currentHP - damage);
    
    return { success: true, attack, damage };
  }
  
  isCombatOver() {
    const enemiesAlive = this.enemies.some(e => e.currentHP > 0);
    return !enemiesAlive;
  }
}
