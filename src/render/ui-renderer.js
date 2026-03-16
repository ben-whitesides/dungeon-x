export class UIRenderer {
  renderPartyHUD(ctx, party) {
    if (!party || party.length === 0) return;
    
    const startX = ctx.canvas.width - 200;
    const startY = 20;
    
    ctx.fillStyle = '#000';
    ctx.fillRect(startX - 10, startY - 10, 190, party.length * 40 + 20);
    
    ctx.fillStyle = '#0f0';
    ctx.font = '12px monospace';
    
    party.forEach((member, i) => {
      const y = startY + i * 40;
      ctx.fillText(member.name, startX, y);
      ctx.fillText(`${member.currentHP}/${member.hp} HP`, startX, y + 15);
      
      // Simple HP bar
      const barWidth = 100;
      const barHeight = 8;
      const hpPercent = member.currentHP / member.hp;
      
      ctx.fillStyle = '#f00';
      ctx.fillRect(startX, y + 20, barWidth, barHeight);
      ctx.fillStyle = '#0f0';
      ctx.fillRect(startX, y + 20, barWidth * hpPercent, barHeight);
    });
  }
  
  renderCombatUI(ctx, combatState, world) {
    // Render combat-specific UI
    ctx.fillStyle = '#000';
    ctx.fillRect(0, ctx.canvas.height - 60, ctx.canvas.width, 60);
    
    ctx.fillStyle = '#0f0';
    ctx.font = '14px monospace';
    ctx.fillText('COMBAT: A=Attack D=Defend S=Spell I=Item F=Flee', 10, ctx.canvas.height - 30);
  }
}

  renderVirtualGamepad(ctx) {
    // Only show on touch devices
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
    ctx.fillRect(width/2 - 40, height - 80, 80, 60);
    ctx.strokeRect(width/2 - 40, height - 80, 80, 60);
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px monospace';
    ctx.fillText('ACTION', width/2, height - 45);
    
    ctx.restore();
  }
}
