import { Character } from '../../character/character.js';
import { CLASS_DATA } from '../../character/class-data.js';

export class CharacterCreateState {
  constructor() {
    this.availableClasses = Object.keys(CLASS_DATA);
    this.selectedClass = 0;
    this.name = '';
    this.nameInput = false;
    this.selectedPortrait = 0;
  }
  
  handleInput(input, world) {
    if (this.nameInput) {
      if (input.type === 'text') {
        this.name += input.char;
        return true;
      }
      if (input.type === 'backspace') {
        this.name = this.name.slice(0, -1);
        return true;
      }
      if (input.type === 'enter') {
        this.nameInput = false;
        return true;
      }
    } else {
      if (input.type === 'up') {
        this.selectedClass = Math.max(0, this.selectedClass - 1);
        return true;
      }
      if (input.type === 'down') {
        this.selectedClass = Math.min(this.availableClasses.length - 1, this.selectedClass + 1);
        return true;
      }
      if (input.type === 'select') {
        this.nameInput = true;
        return true;
      }
      if (input.type === 'create' && this.name.length > 0) {
        const classKey = this.availableClasses[this.selectedClass];
        const character = new Character(this.name, classKey);
        world.roster.add(character);
        world.roster.save();
        return true; // Creation complete
      }
    }
    return false;
  }
  
  render(ctx, world) {
    ctx.fillStyle = '#2F1B14'; // Dark brown
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    ctx.fillStyle = '#FFD700';
    ctx.font = '20px monospace';
    ctx.fillText('CREATE CHARACTER', 20, 30);
    
    // Class selection
    ctx.fillStyle = '#FFF';
    ctx.font = '16px monospace';
    ctx.fillText('Choose Class:', 20, 60);
    
    this.availableClasses.forEach((classKey, i) => {
      const y = 80 + i * 20;
      const prefix = i === this.selectedClass ? '> ' : '  ';
      const classData = CLASS_DATA[classKey];
      ctx.fillText(`${prefix}${classData.name}`, 20, y);
    });
    
    if (this.nameInput) {
      ctx.fillText(`Name: ${this.name}_`, 20, ctx.canvas.height - 60);
      ctx.fillText('Type name and press ENTER', 20, ctx.canvas.height - 40);
    } else {
      ctx.fillText('SPACE: Enter Name  C: Create Character', 20, ctx.canvas.height - 20);
    }
  }
}
