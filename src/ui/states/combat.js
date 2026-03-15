import { CombatManager } from '../../combat/combat-manager.js';

export class CombatState {
  constructor(enemies) {
    this.enemies = enemies;
    this.combat = new CombatManager();
    this.combat.startCombat(enemies);
    this.selectedAction = null;
    this.currentActor = null;
  }
  
  handleInput(input, world) {
    // Handle attack, defend, cast spell, use item, flee
    if (input.type === 'attack') {
      // Process attack action
      return true; // Consumed input
    }
    return false; // Input not consumed
  }
  
  render(ctx, world) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    ctx.fillStyle = '#0f0';
    ctx.font = '16px monospace';
    ctx.fillText('COMBAT MODE', 20, 30);
    
    // Render enemies
    this.enemies.forEach((enemy, i) => {
      ctx.fillText(`${enemy.name}: ${enemy.currentHP}/${enemy.hp} HP`, 20, 60 + i * 20);
    });
    
    // Render action menu
    ctx.fillText('A: Attack  D: Defend  S: Spell  I: Item  F: Flee', 20, ctx.canvas.height - 20);
  }
  
  isDone() {
    return this.combat.state === 'victory' || this.combat.state === 'defeat';
  }
}
