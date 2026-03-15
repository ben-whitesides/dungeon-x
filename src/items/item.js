export const ITEM_TYPES = {
  WEAPON: 'weapon',
  ARMOR: 'armor', 
  SHIELD: 'shield',
  ACCESSORY: 'accessory',
  POTION: 'potion',
  SCROLL: 'scroll',
  KEY: 'key'
};

export const RARITIES = {
  COMMON: 'common',
  UNCOMMON: 'uncommon',
  RARE: 'rare',
  EPIC: 'epic',
  LEGENDARY: 'legendary'
};

export class Item {
  constructor(id, name, type, rarity = RARITIES.COMMON, stats = {}, value = 0, icon = 'default') {
    this.id = id;
    this.name = name;
    this.type = type;
    this.rarity = rarity;
    this.stats = { ...stats }; // stat bonuses (str+2, ac+1, etc.)
    this.value = value; // gold value
    this.icon = icon; // icon name from asset pack
    this.quantity = 1; // for stackable items
  }
  
  // Check if this item can be equipped by a character class
  canEquip(characterClass) {
    // For now, all items can be equipped by any class
    // Could add class restrictions later
    return true;
  }
  
  // Get the slot this item occupies
  getSlot() {
    switch (this.type) {
      case ITEM_TYPES.WEAPON: return 'weapon';
      case ITEM_TYPES.ARMOR: return 'armor';
      case ITEM_TYPES.SHIELD: return 'shield';
      case ITEM_TYPES.ACCESSORY: return 'accessory';
      default: return null; // consumables don't occupy slots
    }
  }
  
  // Check if item is equippable
  isEquippable() {
    return this.getSlot() !== null;
  }
  
  // Check if item is consumable
  isConsumable() {
    return this.type === ITEM_TYPES.POTION || this.type === ITEM_TYPES.SCROLL;
  }
}
