export class TavernState {
  constructor() {
    this.mode = 'roster'; // roster, party_select, shop
    this.selectedCharacter = 0;
    this.selectedPartySlot = 0;
  }
  
  handleInput(input, world) {
    if (this.mode === 'roster') {
      if (input.type === 'select') {
        // Add selected character to party
        const char = world.roster.getAll()[this.selectedCharacter];
        if (char && world.party.addMember(char)) {
          this.mode = 'party_select';
        }
        return true;
      }
      if (input.type === 'up') {
        this.selectedCharacter = Math.max(0, this.selectedCharacter - 1);
        return true;
      }
      if (input.type === 'down') {
        this.selectedCharacter = Math.min(
          world.roster.getAll().length - 1, 
          this.selectedCharacter + 1
        );
        return true;
      }
    }
    
    if (this.mode === 'party_select' && input.type === 'enter_dungeon') {
      // Start dungeon run with current party
      world.enterDungeon();
      return true;
    }
    
    return false;
  }
  
  render(ctx, world) {
    ctx.fillStyle = '#8B4513'; // Brown tavern background
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    ctx.fillStyle = '#FFD700';
    ctx.font = '20px monospace';
    ctx.fillText('THE RUSTY FLAGON', 20, 30);
    
    if (this.mode === 'roster') {
      ctx.fillStyle = '#FFF';
      ctx.font = '16px monospace';
      ctx.fillText('Select Characters for Your Party:', 20, 50);
      
      world.roster.getAll().forEach((char, i) => {
        const y = 80 + i * 25;
        const prefix = i === this.selectedCharacter ? '> ' : '  ';
        ctx.fillText(`${prefix}${char.name} (${char.class}) L${char.level}`, 20, y);
      });
      
      ctx.fillText('SPACE: Add to Party  ESC: Back', 20, ctx.canvas.height - 20);
    }
    
    if (this.mode === 'party_select') {
      ctx.fillText('Your Party:', 20, 50);
      
      world.party.getMembers().forEach((char, i) => {
        const y = 80 + i * 25;
        ctx.fillText(`${i + 1}. ${char.name} (${char.class})`, 20, y);
      });
      
      ctx.fillText('ENTER: Enter Dungeon', 20, ctx.canvas.height - 20);
    }
  }
}
