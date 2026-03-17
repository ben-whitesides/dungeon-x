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
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const barH = 55;
    const barY = h - barH;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, barY, w, barH);

    // Touch-friendly combat buttons
    const buttons = [
      { label: 'ATTACK', code: 'KeyA', width: 90 },
      { label: 'GUARD', code: 'KeyG', width: 80 },
      { label: 'SPELL', code: 'KeyS', width: 80 },
      { label: 'ITEM', code: 'KeyI', width: 70 },
      { label: 'FLEE', code: 'KeyF', width: 70 },
    ];
    const gap = 6;
    const totalW = buttons.reduce((s, b) => s + b.width, 0) + (buttons.length - 1) * gap;
    let x = (w - totalW) / 2;

    const touchHandler = world && world.input && world.input.touch;

    for (const btn of buttons) {
      const btnH = 36;
      const btnY = barY + (barH - btnH) / 2;

      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(x, btnY, btn.width, btnH);
      ctx.strokeStyle = '#0a0';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, btnY, btn.width, btnH);

      ctx.fillStyle = '#0f0';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(btn.label, x + btn.width / 2, btnY + btnH / 2 + 4);
      ctx.textAlign = 'left';

      if (touchHandler) {
        touchHandler.registerHitZone(x, btnY, btn.width, btnH, btn.code);
      }

      x += btn.width + gap;
    }
  }

  renderVirtualGamepad(ctx, touchHandler) {
    if (!('ontouchstart' in window)) return;

    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const btnSize = 50;
    const gap = 4;

    ctx.save();
    ctx.globalAlpha = 0.55;

    const drawBtn = (x, y, bw, bh, label, code) => {
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(x, y, bw, bh);
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, bw, bh);
      ctx.fillStyle = '#ccc';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(label, x + bw / 2, y + bh / 2 + 5);
      ctx.textAlign = 'left';
      if (touchHandler) {
        touchHandler.registerHitZone(x, y, bw, bh, code);
      }
    };

    // D-pad (bottom-left) — Forward / Back / Strafe L / Strafe R
    const dpadX = 15;
    const dpadY = h - 170;
    drawBtn(dpadX + btnSize + gap, dpadY, btnSize, btnSize, '▲', 'ArrowUp');           // Forward
    drawBtn(dpadX, dpadY + btnSize + gap, btnSize, btnSize, '◄', 'KeyA');               // Strafe left
    drawBtn(dpadX + btnSize + gap, dpadY + btnSize + gap, btnSize, btnSize, '▼', 'ArrowDown'); // Back
    drawBtn(dpadX + (btnSize + gap) * 2, dpadY + btnSize + gap, btnSize, btnSize, '►', 'KeyD'); // Strafe right

    // Turn buttons (bottom-right)
    const turnX = w - 130;
    const turnY = h - 120;
    drawBtn(turnX, turnY, btnSize, btnSize, '↶', 'ArrowLeft');       // Turn left
    drawBtn(turnX + btnSize + gap, turnY, btnSize, btnSize, '↷', 'ArrowRight');  // Turn right

    // Action + Escape (center bottom)
    drawBtn(w / 2 - 65, h - 65, 80, 45, 'ACT', 'Space');
    drawBtn(w / 2 + 25, h - 65, 50, 45, 'ESC', 'Escape');

    ctx.restore();
  }
}
