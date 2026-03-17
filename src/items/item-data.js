import { Item, ITEM_TYPES, RARITIES } from './item.js';

export const ITEM_DATA = {
  // Weapons
  'rusty_sword': new Item('rusty_sword', 'Rusty Sword', ITEM_TYPES.WEAPON, RARITIES.COMMON, 
    { attack: 1 }, 10, 'sword-rusty'),
  'iron_sword': new Item('iron_sword', 'Iron Sword', ITEM_TYPES.WEAPON, RARITIES.COMMON,
    { attack: 2 }, 25, 'sword-iron'),
  'steel_sword': new Item('steel_sword', 'Steel Sword', ITEM_TYPES.WEAPON, RARITIES.UNCOMMON,
    { attack: 3 }, 75, 'sword-steel'),
  'magic_sword': new Item('magic_sword', 'Magic Sword', ITEM_TYPES.WEAPON, RARITIES.RARE,
    { attack: 4, magic: 1 }, 200, 'sword-magic'),
  
  // Armor
  'cloth_armor': new Item('cloth_armor', 'Cloth Armor', ITEM_TYPES.ARMOR, RARITIES.COMMON,
    { ac: 1 }, 15, 'armor-cloth'),
  'leather_armor': new Item('leather_armor', 'Leather Armor', ITEM_TYPES.ARMOR, RARITIES.COMMON,
    { ac: 2 }, 30, 'armor-leather'),
  'chain_armor': new Item('chain_armor', 'Chain Armor', ITEM_TYPES.ARMOR, RARITIES.UNCOMMON,
    { ac: 3 }, 100, 'armor-chain'),
  'plate_armor': new Item('plate_armor', 'Plate Armor', ITEM_TYPES.ARMOR, RARITIES.RARE,
    { ac: 4 }, 250, 'armor-plate'),
  
  // Shields
  'wooden_shield': new Item('wooden_shield', 'Wooden Shield', ITEM_TYPES.SHIELD, RARITIES.COMMON,
    { ac: 1 }, 20, 'shield-wood'),
  'iron_shield': new Item('iron_shield', 'Iron Shield', ITEM_TYPES.SHIELD, RARITIES.UNCOMMON,
    { ac: 2 }, 60, 'shield-iron'),
  
  // Accessories
  'health_amulet': new Item('health_amulet', 'Amulet of Health', ITEM_TYPES.ACCESSORY, RARITIES.UNCOMMON,
    { maxHp: 10 }, 150, 'amulet-health'),
  'strength_ring': new Item('strength_ring', 'Ring of Strength', ITEM_TYPES.ACCESSORY, RARITIES.RARE,
    { str: 2 }, 300, 'ring-strength'),
  
  // Potions
  'health_potion': new Item('health_potion', 'Health Potion', ITEM_TYPES.POTION, RARITIES.COMMON,
    { heal: 20 }, 5, 'potion-health'),
  'mana_potion': new Item('mana_potion', 'Mana Potion', ITEM_TYPES.POTION, RARITIES.COMMON,
    { mana: 15 }, 5, 'potion-mana'),
  'strength_potion': new Item('strength_potion', 'Strength Potion', ITEM_TYPES.POTION, RARITIES.UNCOMMON,
    { strBuff: 2, duration: 5 }, 25, 'potion-strength'),
  
  // Keys
  'dungeon_key': new Item('dungeon_key', 'Dungeon Key', ITEM_TYPES.KEY, RARITIES.COMMON,
    {}, 0, 'key-dungeon'),
  
  // Special items
  'sunstone_fragment': new Item('sunstone_fragment', 'Sunstone Fragment', ITEM_TYPES.ACCESSORY, RARITIES.LEGENDARY,
    { wis: 1 }, 1000, 'fragment-sunstone')
};

export function createItem(itemId) {
  const template = ITEM_DATA[itemId];
  if (!template) {
    throw new Error(`Unknown item: ${itemId}`);
  }
  
  // Create a copy of the item
  return new Item(
    template.id,
    template.name,
    template.type,
    template.rarity,
    { ...template.stats },
    template.value,
    template.icon
  );
}

export function getRandomLoot(floor) {
  // Return random loot based on floor
  const lootTables = {
    1: ['rusty_sword', 'cloth_armor', 'health_potion', 'health_potion'],
    2: ['iron_sword', 'leather_armor', 'wooden_shield', 'health_potion', 'mana_potion'],
    3: ['steel_sword', 'chain_armor', 'iron_shield', 'strength_potion', 'health_amulet'],
    4: ['magic_sword', 'plate_armor', 'strength_ring'],
    5: ['magic_sword', 'plate_armor', 'strength_ring', 'sunstone_fragment']
  };
  
  const table = lootTables[Math.min(floor, 5)] || lootTables[5];
  // Accept optional seeded PRNG for deterministic loot
  const rand = arguments[1] || Math.random;
  const randomIndex = Math.floor(rand() * table.length);
  return table[randomIndex];
}
