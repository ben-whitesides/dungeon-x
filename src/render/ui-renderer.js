export class UIRenderer {
  constructor(assets) {
    this.assets = assets;
  }

  renderPartyHUD(ctx, party) {
    if (!party || party.length === 0) return;

    const startX = ctx.canvas.width - 200;
    const startY = 20;

    // Background panel
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(startX - 10, startY - 10, 200, party.length * 45 + 20);

    party.forEach((member, i) => {
      const y = startY + i * 45;

      // Draw portrait if available
      const portrait = member.portrait ? this.assets.get(member.portrait) : null;
      if (portrait) {
        ctx.drawImage(portrait, startX, y, 28, 28);
      } else {
        ctx.fillStyle = '#444';
        ctx.fillRect(startX, y, 28, 28);
      }

      // Name and HP text
      ctx.fillStyle = '#0f0';
      ctx.font = '12px monospace';
      ctx.fillText(member.name, startX + 34, y + 10);
      ctx.fillText(`${member.currentHP}/${member.maxHP} HP`, startX + 34, y + 24);

      // HP bar
      const barX = startX + 34;
      const barY = y + 28;
      const barWidth = 120;
      const barHeight = 6;
      const hpPercent = member.currentHP / member.maxHP;

      ctx.fillStyle = '#400';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      ctx.fillStyle = hpPercent > 0.5 ? '#0a0' : hpPercent > 0.25 ? '#aa0' : '#a00';
      ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);
    });
  }

  renderCombatUI(ctx, combatState, world) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, ctx.canvas.height - 60, ctx.canvas.width, 60);

    ctx.fillStyle = '#0f0';
    ctx.font = '14px monospace';
    ctx.fillText('COMBAT: A=Attack G=Guard S=Spell I=Item F=Flee', 10, ctx.canvas.height - 30);
  }

  renderVirtualGamepad(ctx) {
    if (!('ontouchstart' in window)) return;

    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#333333';
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 2;
    ctx.font = '20px monospace';
    ctx.textAlign = 'center';

    // Movement pad (bottom left)
    ctx.fillRect(20, height - 140, 100, 120);
    ctx.strokeRect(20, height - 140, 100, 120);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('MOVE', 70, height - 110);

    // Turn pad (bottom right)
    ctx.fillStyle = '#333333';
    ctx.fillRect(width - 120, height - 140, 100, 120);
    ctx.strokeRect(width - 120, height - 140, 100, 120);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('TURN', width - 70, height - 110);

    // Action button (center bottom)
    ctx.fillStyle = '#555555';
    ctx.fillRect(width / 2 - 40, height - 80, 80, 60);
    ctx.strokeRect(width / 2 - 40, height - 80, 80, 60);
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px monospace';
    ctx.fillText('ACTION', width / 2, height - 45);

    ctx.restore();
  }
}
