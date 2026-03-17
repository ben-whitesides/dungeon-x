import { attackRoll, calculateDamage, rollInitiative } from './damage-calc.js';
import { AnimationQueue } from '../render/animation-queue.js';
import { getRandomLoot, createItem } from '../items/item-data.js';

export class CombatManager {
  constructor() {
    this.state = 'inactive'; // inactive, active, victory, defeat
    this.enemies = [];
    this.turnOrder = [];     // Sorted array of { entity, initiative, isPlayer }
    this.currentTurn = 0;
    this.roundNumber = 0;
  }

  startCombat(party, enemies) {
    this.enemies = enemies;
    this.state = 'active';
    this.roundNumber = 1;

    // Roll initiative for all combatants — D&D 5e: d20 + DEX mod, descending
    this.turnOrder = [];

    // Party members
    if (party) {
      const members = party.getMembers ? party.getMembers() : party;
      for (const member of members) {
        if (member.isAlive()) {
          member.resetCombatState();
          this.turnOrder.push({
            entity: member,
            initiative: member.rollInitiative(),
            isPlayer: true
          });
        }
      }
    }

    // Enemies — monsters use DEX-based init (derive from AC as proxy if no DEX)
    for (const enemy of enemies) {
      const dexMod = enemy.dexMod || Math.floor(((enemy.ac || 10) - 10) / 2);
      this.turnOrder.push({
        entity: enemy,
        initiative: rollInitiative(dexMod),
        isPlayer: false
      });
    }

    // Sort descending by initiative (higher goes first). Tie: higher DEX wins.
    this.turnOrder.sort((a, b) => b.initiative - a.initiative);
    this.currentTurn = 0;

    return this.turnOrder.map(t => ({
      name: t.entity.name,
      initiative: t.initiative,
      isPlayer: t.isPlayer
    }));
  }

  getCurrentTurnEntity() {
    if (this.turnOrder.length === 0) return null;
    return this.turnOrder[this.currentTurn % this.turnOrder.length];
  }

  advanceTurn() {
    this.currentTurn++;
    // Wrap around = new round
    if (this.currentTurn >= this.turnOrder.length) {
      this.currentTurn = 0;
      this.roundNumber++;
    }

    // Skip dead entities
    let safety = 0;
    while (safety < this.turnOrder.length) {
      const current = this.turnOrder[this.currentTurn];
      const hp = current.entity.currentHP;
      if (hp > 0) {
        // Tick turn-start effects for player characters
        if (current.isPlayer && current.entity.tickTurnStart) {
          current.entity.tickTurnStart();
        }
        return current;
      }
      this.currentTurn = (this.currentTurn + 1) % this.turnOrder.length;
      safety++;
    }
    return null; // Everyone dead
  }

  // --- Defend Action ---
  processDefend(character) {
    character.setDefending();
    return { action: 'defend', name: character.name, acBonus: 2 };
  }

  // --- Flee Mechanic ---
  attemptFlee(party, floor) {
    // D&D 5e inspired: each party member rolls DEX check vs DC (10 + floor)
    // Whole party flees if majority succeed
    const dc = 10 + Math.min(floor, 10);
    const members = party.getMembers ? party.getMembers() : party;
    let successes = 0;
    const results = [];

    for (const member of members) {
      if (!member.isAlive()) continue;
      const roll = Math.floor(Math.random() * 20) + 1;
      const total = roll + member.getModifier('dex');
      const passed = total >= dc;
      if (passed) successes++;
      results.push({ name: member.name, roll, total, passed });
    }

    const aliveCount = members.filter(m => m.isAlive()).length;
    const fled = successes > Math.floor(aliveCount / 2); // Majority must pass

    if (fled) {
      this.state = 'fled';
    }

    return { fled, dc, results, successes, needed: Math.floor(aliveCount / 2) + 1 };
  }
  
  processAttack(attacker, target, weaponDice = '1d6', attackMod = 0, damageMod = 0, soundManager = null, animationQueue = null, damageType = 'slashing') {
    const attack = attackRoll({ attackMod }, target);

    if (!attack.hit) {
      if (soundManager) soundManager.playCombatSound('miss');
      return { success: false, attack, damage: 0, damageType };
    }

    // D&D 5e crit: double the dice, NOT the modifier
    let damage;
    if (attack.critical === 'crit') {
      const diceDamage = calculateDamage(weaponDice, 0); // Roll dice only
      damage = (diceDamage * 2) + damageMod; // Double dice + flat modifier once
    } else {
      damage = calculateDamage(weaponDice, damageMod);
    }

    // Vulnerability/resistance per D&D 5e — doubles or halves total damage
    if (target.vulnerabilities && target.vulnerabilities.includes(damageType)) {
      damage = damage * 2;
    } else if (target.resistances && target.resistances.includes(damageType)) {
      damage = Math.floor(damage / 2);
    }

    damage = Math.max(1, damage); // Minimum 1 damage on a hit
    target.currentHP = Math.max(0, target.currentHP - damage);

    return { success: true, attack, damage, damageType };
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
    world.gold += Math.max(1, Math.floor(totalXP / 5)); // ~1 gold per 5 XP (D&D economy balance)
    
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
