import { createItem } from './item-data.js';

export class Merchant {
  constructor() {
    this.inventory = [];
    this.lastRefresh = 0;
    this.refreshInventory();
  }
  
  refreshInventory() {
    // Create a new inventory with random items
    this.inventory = [];
    
    // Always have some basic items
    const basicItems = [
      'health_potion',
      'iron_sword', 
      'leather_armor',
      'wooden_shield'
    ];
    
    // Add basic items
    basicItems.forEach(itemId => {
      this.inventory.push(createItem(itemId));
    });
    
    // Add some random items
    const randomItems = [
      'steel_sword',
      'chain_armor', 
      'iron_shield',
      'health_amulet',
      'strength_potion',
      'mana_potion'
    ];
    
    // Add 2-4 random items
    const numRandom = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < numRandom; i++) {
      const randomIndex = Math.floor(Math.random() * randomItems.length);
      this.inventory.push(createItem(randomItems[randomIndex]));
    }
    
    this.lastRefresh = Date.now();
  }
  
  getBuyPrice(item) {
    // Buy price is item's value
    return item.value;
  }
  
  getSellPrice(item) {
    // Sell price is 50% of item's value
    return Math.floor(item.value / 2);
  }
  
  canAfford(playerGold, item) {
    return playerGold >= this.getBuyPrice(item);
  }
  
  buyItem(item, playerGold, playerInventory) {
    const price = this.getBuyPrice(item);
    if (playerGold >= price && playerInventory.addItem(item)) {
      // Remove from merchant inventory
      const index = this.inventory.indexOf(item);
      if (index !== -1) {
        this.inventory.splice(index, 1);
      }
      return price; // Return cost for gold deduction
    }
    return 0; // Purchase failed
  }
  
  sellItem(item, playerInventory) {
    const price = this.getSellPrice(item);
    // Add to merchant inventory (they can always take items)
    this.inventory.push(item);
    return price; // Return gold received
  }
  
  getInventory() {
    return this.inventory;
  }
  
  shouldRefresh() {
    // Refresh every "dungeon run" or every few hours in game time
    // For now, refresh on demand
    return false;
  }
}
