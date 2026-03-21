import { CLASS_DATA } from '../../character/class-data.js';

/**
 * LevelUpState — "LEVEL UP!" notification overlay.
 * Shows what improved. Any key dismisses.
 */
export class LevelUpState {
  constructor(character, oldLevel, newLevel, assets) {
    this.character = character;
    this.oldLevel = oldLevel;
    this.newLevel = newLevel;
    this.assets = assets;
    this._dismissed = false;
    this.animates = true;
    this._elapsed = 0;
    this._lastTimestamp = 0;
    this._pulsePhase = 0;
  }

  update(timestamp) {
    if (!this._lastTimestamp) this._lastTimestamp = timestamp;
    const dt = (timestamp - this._lastTimestamp) / 16.67;
    this._lastTimestamp = timestamp;
    this._elapsed += dt;
    this._pulsePhase += 0.03 * dt;
  }

  handleInput(input, world) {
    if (this._elapsed > 15) { // ~250ms minimum display
      this._dismissed = true;
    }
    return true; // Consume all input
  }

  render(layers, world) {
    const ctx = layers.ui || layers;
    ctx.save();

    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, W, H);

    // Golden border box
    const boxW = 500;
    const boxH = 320;
    const boxX = (W - boxW) / 2;
    const boxY = (H - boxH) / 2;

    ctx.fillStyle = '#1a1208';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    // Pulsing glow
    const pulse = Math.sin(this._pulsePhase) * 0.2 + 0.8;
    ctx.strokeStyle = `rgba(255, 215, 0, ${pulse * 0.3})`;
    ctx.lineWidth = 6;
    ctx.strokeRect(boxX - 4, boxY - 4, boxW + 8, boxH + 8);

    ctx.textAlign = 'center';

    // LEVEL UP!
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 28px monospace';
    ctx.fillText('LEVEL UP!', W / 2, boxY + 40);

    // Character name and class
    const classData = CLASS_DATA[this.character.class];
    ctx.fillStyle = '#FFF';
    ctx.font = '18px monospace';
    ctx.fillText(`${this.character.name} — ${classData ? classData.name : this.character.class}`, W / 2, boxY + 70);

    // Level change
    ctx.fillStyle = '#AAA';
    ctx.font = '16px monospace';
    ctx.fillText(`Level ${this.oldLevel} -> Level ${this.newLevel}`, W / 2, boxY + 100);

    // HP info
    ctx.fillStyle = '#27AE60';
    ctx.font = '14px monospace';
    ctx.fillText(`Max HP: ${this.character.maxHP}`, W / 2, boxY + 130);

    // Mana info
    if (this.character.maxMana > 0) {
      ctx.fillStyle = '#3498DB';
      ctx.fillText(`Max Mana: ${this.character.maxMana}`, W / 2, boxY + 152);
    }

    // Proficiency bonus
    ctx.fillStyle = '#AAA';
    ctx.fillText(`Proficiency Bonus: +${this.character.getProficiencyBonus()}`, W / 2, boxY + 176);

    // New abilities unlocked
    if (classData && classData.abilities) {
      const newAbilities = classData.abilities.filter(a => {
        return a.unlockLevel > this.oldLevel && a.unlockLevel <= this.newLevel;
      });
      if (newAbilities.length > 0) {
        ctx.fillStyle = '#FFD700';
        ctx.font = '14px monospace';
        ctx.fillText('New Abilities:', W / 2, boxY + 205);
        newAbilities.forEach((ab, i) => {
          ctx.fillStyle = '#CCC';
          ctx.font = '12px monospace';
          ctx.fillText(`${ab.name} — ${ab.description.slice(0, 55)}`, W / 2, boxY + 225 + i * 18);
        });
      }
    }

    // Pending stat increase
    if (this.character.pendingStatIncrease) {
      ctx.fillStyle = '#E67E22';
      ctx.font = '13px monospace';
      ctx.fillText('Ability Score Increase available!', W / 2, boxY + boxH - 60);
    }

    // Dismiss prompt
    ctx.fillStyle = '#888';
    ctx.font = '12px monospace';
    ctx.fillText('Press any key to continue', W / 2, boxY + boxH - 20);

    ctx.textAlign = 'left';
    ctx.restore();
  }

  isDone() {
    return this._dismissed;
  }
}
