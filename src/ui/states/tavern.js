export class TavernState {
  constructor() {
    this.mode = 'roster'; // roster, party_select, shop, dungeon_select, leaderboard
    this.selectedDungeon = 0;
    this.selectedLeaderboardDungeon = 0;
    this.selectedDungeon = 0;
    this.selectedMerchantItem = 0;
    this.selectedPlayerItem = 0;
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
    
    } else if (input.type === 'shop') {
      this.mode = 'shop';
      this.selectedMerchantItem = 0;
      this.selectedPlayerItem = 0;
      return true;
    }
    
    if (this.mode === 'party_select'     if (this.mode === 'party_select' && input.type === 'enter_dungeon') {    if (this.mode === 'party_select' && input.type === 'enter_dungeon') { input.type === 'enter_dungeon') {
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
      
      ctx.fillText('ENTER: Enter Dungeon  S: Shop', 20, ctx.canvas.height - 20);
    }
    
    if (this.mode === 'shop') {
      ctx.fillText('MERCHANT SHOP - Gold: ' + world.gold, 20, 50);
      
      // Merchant inventory (left side)
      ctx.fillText('Merchant Inventory:', 20, 70);
      const merchantInventory = world.merchant.getInventory();
      merchantInventory.forEach((item, i) => {
        const y = 90 + i * 20;
        const prefix = i === this.selectedMerchantItem ? '> ' : '  ';
        const price = world.merchant.getBuyPrice(item);
        ctx.fillText(prefix + item.name + ' (Cost: ' + price + '), 20, y);
      });
      
      // Player inventory (right side)
      const rightX = ctx.canvas.width / 2 + 20;
      ctx.fillText('Your Items:', rightX, 70);
      const playerItems = world.inventory.getAllItems();
      playerItems.forEach((item, i) => {
        const y = 90 + i * 20;
        const prefix = i === this.selectedPlayerItem ? '> ' : '  ';
        const price = world.merchant.getSellPrice(item);
        ctx.fillText(prefix + item.name + ' (Sell: ' + price + '), rightX, y);
      });
      
      ctx.fillText('B: Buy selected  V: Sell selected  ESC: Back', 20, ctx.canvas.height - 20);
    }
    
    if (this.mode === 'dungeon_select') {
      ctx.fillText('SELECT DUNGEON', 20, 50);
      
      const dungeons = [
        { name: 'Whispering Crypts', desc: 'Ancient burial grounds haunted by undead', floors: 5 },
        { name: 'Goblin Warrens', desc: 'Twisted tunnels ruled by goblin clans', floors: 3 }
      ];
      
      dungeons.forEach((dungeon, i) => {
        const y = 80 + i * 60;
        const prefix = i === this.selectedDungeon ? '> ' : '  ';
        ctx.fillText(prefix + dungeon.name, 20, y);
        ctx.fillText('  ' + dungeon.desc, 20, y + 20);
        ctx.fillText('  ' + dungeon.floors + ' floors', 20, y + 35);
      });
      
      ctx.fillText('ENTER: Select Dungeon  ESC: Back', 20, ctx.canvas.height - 20);
    }
    
    // Trophy Wall - always visible in tavern
    this.renderTrophyWall(ctx, world);
    }
  }
}
