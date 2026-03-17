import { CombatManager } from '../../combat/combat-manager.js';
import { MONSTER_SPRITE_MAP } from '../../render/asset-loader.js';

export class CombatState {
  constructor(enemies, assets) {
    this.enemies = enemies;
    this.assets = assets;
    this.combat = new CombatManager();
    this.party = null; // Set when world is available
    this.initOrder = null;
    this.selectedAction = null;
    this.currentActor = null;
  }

  handleInput(input, world) {
    // Initialize combat with party on first input (world now available)
    if (!this.initOrder && world.party) {
      this.party = world.party;
      this.initOrder = this.combat.startCombat(world.party, this.enemies);
    }
    
    const code = input.code;
    
    if (code === 'KeyA') {
      // For now, attack just triggers a placeholder log or something
      return true;
    }
    if (code === 'KeyG') {
      const current = this.combat.getCurrentTurnEntity();
      if (current && current.isPlayer) {
        this.combat.processDefend(current.entity);
        this.combat.advanceTurn();
      }
      return true;
    }
    if (code === 'KeyF') {
      const fleeResult = this.combat.attemptFlee(world.party, world.floor || 1);
      if (fleeResult.fled) {
        this.combat.state = 'fled';
      }
      return true;
    }
    if (code === 'KeyS') {
      // Spell menu placeholder
      return true;
    }
    if (code && code.startsWith('Digit')) {
      // Ability placeholder
      return true;
    }

    return false;
  }

  render(layers, world) {
    const ctx = layers.ui || layers;
    // Dark background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Render enemy sprites across the top half
    const enemyAreaWidth = ctx.canvas.width - 40;
    const slotWidth = this.enemies.length > 0 ? enemyAreaWidth / this.enemies.length : 0;

    this.enemies.forEach((enemy, i) => {
      const slotX = 20 + i * slotWidth + slotWidth / 2;
      const spriteY = 40;
      const spriteSize = Math.min(96, slotWidth - 20);

      // Draw enemy sprite
      const spriteKey = MONSTER_SPRITE_MAP[enemy.type] || MONSTER_SPRITE_MAP[enemy.name?.toLowerCase()];
      const sprite = spriteKey ? this.assets.get(spriteKey) : null;

      if (sprite) {
        ctx.drawImage(
          sprite,
          slotX - spriteSize / 2, spriteY,
          spriteSize, spriteSize
        );
      } else {
        // Fallback: colored silhouette
        ctx.fillStyle = '#600';
        ctx.fillRect(slotX - spriteSize / 2, spriteY, spriteSize, spriteSize);
        ctx.fillStyle = '#f00';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(enemy.name || '???', slotX, spriteY + spriteSize / 2);
        ctx.textAlign = 'left';
      }

      // HP bar below sprite
      const barY = spriteY + spriteSize + 8;
      const barWidth = spriteSize;
      const barHeight = 8;
      const hpPct = enemy.currentHP / enemy.maxHP;

      ctx.fillStyle = '#400';
      ctx.fillRect(slotX - barWidth / 2, barY, barWidth, barHeight);
      ctx.fillStyle = hpPct > 0.5 ? '#0a0' : hpPct > 0.25 ? '#aa0' : '#a00';
      ctx.fillRect(slotX - barWidth / 2, barY, barWidth * hpPct, barHeight);

      // Enemy name below HP bar
      ctx.fillStyle = '#0f0';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${enemy.name}: ${enemy.currentHP}/${enemy.maxHP}`, slotX, barY + 22);
      ctx.textAlign = 'left';
    });

    // Title
    ctx.fillStyle = '#f00';
    ctx.font = '18px monospace';
    ctx.fillText('COMBAT', 20, 24);

    // Action menu at bottom
    ctx.fillStyle = '#111';
    ctx.fillRect(0, ctx.canvas.height - 50, ctx.canvas.width, 50);
    ctx.fillStyle = '#0f0';
    ctx.font = '14px monospace';
    ctx.fillText('A: Attack  G: Guard  S: Spell  1-4: Abilities  F: Flee', 20, ctx.canvas.height - 20);
  }

  isDone() {
    return this.combat.state === 'victory' || this.combat.state === 'defeat' || this.combat.state === 'fled';
  }
}
