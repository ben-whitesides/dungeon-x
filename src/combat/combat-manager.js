import { attackRoll, calculateDamage } from './damage-calc.js';
import { getRandomLoot, createItem } from '../items/item-data.js';

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
  
  awardLootAndXP(world, floor) {
    let totalXP = 0;
    const loot = [];
    
    this.enemies.forEach(enemy => {
      if (enemy.currentHP <= 0) {
        totalXP += enemy.xp;
        
        // Chance to drop loot based on floor
        const dropChance = Math.min(0.3 + (floor * 0.1), 0.8); // 30% + 10% per floor, max 80%
        if (Math.random() < dropChance) {
          const itemId = getRandomLoot(floor);
          const item = createItem(itemId);
          loot.push(item);
        }
      }
    });
    
    // Distribute XP to party
    const partySize = world.party.getMembers().length;
    const xpPerMember = Math.floor(totalXP / partySize);
    
    world.party.getMembers().forEach(member => {
      member.xp += xpPerMember;
      member.checkLevelUp();
    });
    
    // Add loot to inventory
    // Award gold for the kill
    world.gold += totalXP // 1 gold per XP as simple conversion
    
    loot.forEach(item => {
      world.inventory.addItem(item);
    });
    
    return { xp: totalXP, loot: loot.length };
  }

  isCombatOver() {
    const enemiesAlive = this.enemies.some(e => e.currentHP > 0);
    return !enemiesAlive;
  }
}
