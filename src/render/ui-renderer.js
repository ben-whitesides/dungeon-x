export class UIRenderer {
  constructor(assets) {
    this.assets = assets;
  }

  /**
   * Draw a parchment-style panel with dark background and gold border.
   */
  _drawPanel(ctx, x, y, w, h, opts = {}) {
    const { cornerRadius = 3, bgColor = 'rgba(12, 10, 8, 0.85)', borderColor = '#8a7a4a', borderWidth = 1.5 } = opts;

    // Dark background
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, cornerRadius);
    ctx.fill();

    // Gold border
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderWidth;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, cornerRadius);
    ctx.stroke();
  }

  /**
   * Draw a stat bar (HP or MP style).
   */
  _drawBar(ctx, x, y, w, h, percent, colorStart, colorEnd, bgColor) {
    // Background
    ctx.fillStyle = bgColor || '#1a0a0a';
    ctx.fillRect(x, y, w, h);

    // Fill with gradient
    if (percent > 0) {
      const grad = ctx.createLinearGradient(x, y, x + w * percent, y);
      grad.addColorStop(0, colorStart);
      grad.addColorStop(1, colorEnd);
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, w * percent, h);
    }

    // Border
    ctx.strokeStyle = '#3a3228';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x, y, w, h);
  }

  renderPartyHUD(ctx, party) {
    if (!party || party.length === 0) return;

    const startX = ctx.canvas.width - 210;
    const startY = 14;
    const cardH = 52;
    const panelW = 205;
    const panelH = party.length * cardH + 16;

    // Panel background
    this._drawPanel(ctx, startX - 5, startY - 5, panelW, panelH);

    // "PARTY" header
    ctx.fillStyle = '#8a7a4a';
    ctx.font = 'bold 9px serif';
    ctx.textAlign = 'center';
    ctx.fillText('PARTY', startX - 5 + panelW / 2, startY + 6);
    ctx.textAlign = 'left';

    party.forEach((member, i) => {
      const y = startY + 12 + i * cardH;
      const isActive = i === 0; // First member is active by default

      // Active member highlight
      if (isActive) {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 1;
        ctx.strokeRect(startX - 2, y - 2, panelW - 6, cardH - 2);
      }

      // Portrait
      const portrait = member.portrait ? this.assets.get(member.portrait) : null;
      if (portrait) {
        ctx.drawImage(portrait, startX, y, 30, 30);
        // Portrait border
        ctx.strokeStyle = isActive ? '#FFD700' : '#5a4a2a';
        ctx.lineWidth = 1;
        ctx.strokeRect(startX, y, 30, 30);
      } else {
        ctx.fillStyle = '#2a2218';
        ctx.fillRect(startX, y, 30, 30);
        ctx.strokeStyle = isActive ? '#FFD700' : '#5a4a2a';
        ctx.lineWidth = 1;
        ctx.strokeRect(startX, y, 30, 30);
        // Class initial fallback
        ctx.fillStyle = '#8a7a4a';
        ctx.font = 'bold 14px serif';
        ctx.textAlign = 'center';
        ctx.fillText((member.name || '?')[0], startX + 15, y + 20);
        ctx.textAlign = 'left';
      }

      // Name
      ctx.fillStyle = isActive ? '#FFD700' : '#c8b880';
      ctx.font = 'bold 11px serif';
      ctx.fillText(member.name || 'Unknown', startX + 36, y + 11);

      // HP bar
      const barX = startX + 36;
      const barW = 130;
      const barH = 7;
      const hpPercent = Math.max(0, Math.min(1, member.currentHP / member.maxHP));

      // HP gradient: red at low, yellow mid, green high
      let hpStart, hpEnd;
      if (hpPercent > 0.5) {
        hpStart = '#2a8a2a';
        hpEnd = '#44cc44';
      } else if (hpPercent > 0.25) {
        hpStart = '#8a6a0a';
        hpEnd = '#ccaa22';
      } else {
        hpStart = '#6a1a1a';
        hpEnd = '#cc2222';
      }
      this._drawBar(ctx, barX, y + 16, barW, barH, hpPercent, hpStart, hpEnd, '#1a0808');

      // HP text on bar
      ctx.fillStyle = '#ddd';
      ctx.font = '8px monospace';
      ctx.fillText(`${member.currentHP}/${member.maxHP}`, barX + 2, y + 23);

      // MP bar (if member has MP)
      if (member.maxMP !== undefined && member.maxMP > 0) {
        const mpPercent = Math.max(0, Math.min(1, (member.currentMP || 0) / member.maxMP));
        this._drawBar(ctx, barX, y + 26, barW, 5, mpPercent, '#1a2a6a', '#4466cc', '#08081a');

        ctx.fillStyle = '#aac';
        ctx.font = '7px monospace';
        ctx.fillText(`${member.currentMP || 0}/${member.maxMP}`, barX + 2, y + 31);
      }

      // Status effects
      if (member.statusEffects && member.statusEffects.length > 0) {
        ctx.font = '8px monospace';
        let sx = barX + barW - 4;
        for (let si = member.statusEffects.length - 1; si >= 0; si--) {
          const effect = member.statusEffects[si];
          const eColors = {
            'poison': '#44aa44',
            'burn': '#cc4422',
            'freeze': '#4488cc',
            'stun': '#cccc22',
            'bless': '#FFD700',
            'shield': '#6688cc',
          };
          ctx.fillStyle = eColors[effect] || '#aaa';
          const tag = (effect || '').substring(0, 3).toUpperCase();
          const tw = ctx.measureText(tag).width;
          sx -= tw + 4;
          ctx.fillText(tag, sx, y + 11);
        }
      }
    });
  }

  /**
   * Render dungeon info bar — dungeon name, floor, turn counter.
   */
  renderDungeonInfo(ctx, dungeonName, floor, turnCount) {
    const w = ctx.canvas.width;
    const barW = 280;
    const barH = 22;
    const barX = (w - barW) / 2;
    const barY = 4;

    this._drawPanel(ctx, barX, barY, barW, barH, { bgColor: 'rgba(12, 10, 8, 0.75)' });

    ctx.fillStyle = '#c8b880';
    ctx.font = 'bold 11px serif';
    ctx.textAlign = 'center';

    const name = dungeonName || 'Unknown Dungeon';
    const info = `${name}  —  Floor ${floor || 1}`;
    ctx.fillText(info, w / 2, barY + 15);

    // Turn counter on right side
    if (turnCount !== undefined) {
      ctx.fillStyle = '#6a6250';
      ctx.font = '9px serif';
      ctx.textAlign = 'right';
      ctx.fillText('Turn ' + turnCount, barX + barW - 8, barY + 15);
    }

    ctx.textAlign = 'left';
  }

  /**
   * Render action hints bar at the bottom.
   */
  renderActionHints(ctx) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    // Only show on non-touch devices
    if ('ontouchstart' in window) return;

    const hints = 'WASD: Move   Q/E: Turn   Space: Interact   I: Inventory   ESC: Leave';
    const barH = 18;
    const barY = h - barH;

    ctx.fillStyle = 'rgba(12, 10, 8, 0.6)';
    ctx.fillRect(0, barY, w, barH);

    ctx.fillStyle = '#6a6250';
    ctx.font = '10px serif';
    ctx.textAlign = 'center';
    ctx.fillText(hints, w / 2, barY + 13);
    ctx.textAlign = 'left';
  }

  renderCombatUI(ctx, combatState, world) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const barH = 55;
    const barY = h - barH;

    this._drawPanel(ctx, 0, barY, w, barH, { cornerRadius: 0, bgColor: 'rgba(12, 10, 8, 0.9)' });

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

      // Dark background with gold border
      ctx.fillStyle = '#12100e';
      ctx.fillRect(x, btnY, btn.width, btnH);
      ctx.strokeStyle = '#8a7a4a';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, btnY, btn.width, btnH);

      // Button label
      ctx.fillStyle = '#c8b880';
      ctx.font = 'bold 12px serif';
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
    ctx.globalAlpha = 0.6;

    const drawBtn = (x, y, bw, bh, label, code) => {
      // Dark stone button
      ctx.fillStyle = '#1a1714';
      ctx.beginPath();
      ctx.roundRect(x, y, bw, bh, 4);
      ctx.fill();

      // Gold border
      ctx.strokeStyle = '#6a5a3a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x, y, bw, bh, 4);
      ctx.stroke();

      // Label
      ctx.fillStyle = '#c8b880';
      ctx.font = 'bold 16px serif';
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
    drawBtn(dpadX + btnSize + gap, dpadY, btnSize, btnSize, '\u25B2', 'ArrowUp');           // Forward
    drawBtn(dpadX, dpadY + btnSize + gap, btnSize, btnSize, '\u25C4', 'KeyA');               // Strafe left
    drawBtn(dpadX + btnSize + gap, dpadY + btnSize + gap, btnSize, btnSize, '\u25BC', 'ArrowDown'); // Back
    drawBtn(dpadX + (btnSize + gap) * 2, dpadY + btnSize + gap, btnSize, btnSize, '\u25BA', 'KeyD'); // Strafe right

    // Turn buttons (bottom-right)
    const turnX = w - 130;
    const turnY = h - 120;
    drawBtn(turnX, turnY, btnSize, btnSize, '\u21B6', 'ArrowLeft');       // Turn left
    drawBtn(turnX + btnSize + gap, turnY, btnSize, btnSize, '\u21B7', 'ArrowRight');  // Turn right

    // Action + Escape (center bottom)
    drawBtn(w / 2 - 65, h - 65, 80, 45, 'ACT', 'Space');
    drawBtn(w / 2 + 25, h - 65, 50, 45, 'ESC', 'Escape');

    ctx.restore();
  }
}
