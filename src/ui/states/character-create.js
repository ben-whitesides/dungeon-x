import { Character } from '../../character/character.js';
import { CLASS_DATA } from '../../character/class-data.js';

const PORTRAIT_KEYS = [
  'portrait_male_1', 'portrait_male_2', 'portrait_male_3',
  'portrait_female_1', 'portrait_female_2', 'portrait_female_3',
];

export class CharacterCreateState {
  constructor(assets) {
    this.assets = assets;
    this.availableClasses = Object.keys(CLASS_DATA);
    this.selectedClass = 0;
    this.name = '';
    this.nameInput = false;
    this.selectedPortrait = 0;
  }

  handleInput(input, world) {
    const code = input.code;

    if (this.nameInput) {
      if (code === 'Enter') {
        this.nameInput = false;
        return true;
      }
      if (code === 'Backspace') {
        this.name = this.name.slice(0, -1);
        return true;
      }
      // Simple character entry for A-Z
      if (code && code.startsWith('Key')) {
        this.name += input.key;
        return true;
      }
      if (code === 'Space') {
        this.name += ' ';
        return true;
      }
    } else {
      if (code === 'ArrowUp' || code === 'KeyW') {
        this.selectedClass = Math.max(0, this.selectedClass - 1);
        return true;
      }
      if (code === 'ArrowDown' || code === 'KeyS') {
        this.selectedClass = Math.min(this.availableClasses.length - 1, this.selectedClass + 1);
        return true;
      }
      if (code === 'ArrowLeft' || code === 'KeyA') {
        this.selectedPortrait = (this.selectedPortrait - 1 + PORTRAIT_KEYS.length) % PORTRAIT_KEYS.length;
        return true;
      }
      if (code === 'ArrowRight' || code === 'KeyD') {
        this.selectedPortrait = (this.selectedPortrait + 1) % PORTRAIT_KEYS.length;
        return true;
      }
      if (code === 'Space') {
        this.nameInput = true;
        return true;
      }
      if (code === 'KeyC' && this.name.length > 0) {
        const classKey = this.availableClasses[this.selectedClass];
        const character = new Character(this.name, classKey);
        character.portrait = PORTRAIT_KEYS[this.selectedPortrait];
        world.roster.add(character);
        world.roster.save();
        // Return to tavern roster
        world.stateStack.pop();
        return true;
      }
    }
    return false;
  }

  render(ctx, world) {
    // Dark brown background
    ctx.fillStyle = '#2F1B14';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Title
    ctx.fillStyle = '#FFD700';
    ctx.font = '20px monospace';
    ctx.fillText('CREATE CHARACTER', 20, 30);

    // Portrait selection (top right area)
    this._renderPortraitGrid(ctx);

    // Class selection (left side)
    ctx.fillStyle = '#FFF';
    ctx.font = '16px monospace';
    ctx.fillText('Choose Class:', 20, 60);

    this.availableClasses.forEach((classKey, i) => {
      const y = 80 + i * 22;
      const prefix = i === this.selectedClass ? '> ' : '  ';
      const classData = CLASS_DATA[classKey];
      ctx.fillStyle = i === this.selectedClass ? '#FFD700' : '#FFF';
      ctx.fillText(`${prefix}${classData.name}`, 20, y);
    });

    // Instructions
    ctx.fillStyle = '#AAA';
    ctx.font = '14px monospace';
    if (this.nameInput) {
      ctx.fillText(`Name: ${this.name}_`, 20, ctx.canvas.height - 60);
      ctx.fillText('Type name and press ENTER', 20, ctx.canvas.height - 40);
    } else {
      ctx.fillText('LEFT/RIGHT: Portrait  SPACE: Enter Name  C: Create', 20, ctx.canvas.height - 20);
    }
  }

  _renderPortraitGrid(ctx) {
    const startX = ctx.canvas.width - 280;
    const startY = 50;
    const size = 64;
    const gap = 12;

    ctx.fillStyle = '#AAA';
    ctx.font = '14px monospace';
    ctx.fillText('Portrait:', startX, startY - 8);

    PORTRAIT_KEYS.forEach((key, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = startX + col * (size + gap);
      const y = startY + row * (size + gap);

      // Selection highlight
      if (i === this.selectedPortrait) {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.strokeRect(x - 3, y - 3, size + 6, size + 6);
      }

      // Draw portrait or placeholder
      const portrait = this.assets.get(key);
      if (portrait) {
        ctx.drawImage(portrait, x, y, size, size);
      } else {
        ctx.fillStyle = '#444';
        ctx.fillRect(x, y, size, size);
        ctx.fillStyle = '#888';
        ctx.font = '10px monospace';
        ctx.fillText(i < 3 ? 'M' + (i + 1) : 'F' + (i - 2), x + 22, y + 36);
        ctx.font = '14px monospace';
      }

      // Border
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, size, size);
    });
  }
}
