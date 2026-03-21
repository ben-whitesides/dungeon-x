/**
 * Load all game assets. Returns a Map of name → HTMLImageElement.
 * On load failure: warn in console, don't crash.
 */
export async function loadAssets() {
  const assets = new Map();

  const manifest = {
    'fp_wall':       'assets/walls-floors/heroine-dusk/tiles/first person dungeon crawl tiles/dungeon_wall.png',
    'fp_floor':      'assets/walls-floors/heroine-dusk/tiles/first person dungeon crawl tiles/dungeon_floor.png',
    'fp_ceiling':    'assets/walls-floors/heroine-dusk/tiles/first person dungeon crawl tiles/dungeon_ceiling.png',
    'fp_door':       'assets/walls-floors/heroine-dusk/tiles/first person dungeon crawl tiles/dungeon_door.png',
    'fp_locked_door':'assets/walls-floors/heroine-dusk/tiles/first person dungeon crawl tiles/locked_door.png',
    'fp_pillar_int': 'assets/walls-floors/heroine-dusk/tiles/first person dungeon crawl tiles/pillar_interior.png',
    'fp_pillar_ext': 'assets/walls-floors/heroine-dusk/tiles/first person dungeon crawl tiles/pillar_exterior.png',
    'fp_chest_int':  'assets/walls-floors/heroine-dusk/tiles/first person dungeon crawl tiles/chest_interior.png',
    'fp_chest_ext':  'assets/walls-floors/heroine-dusk/tiles/first person dungeon crawl tiles/chest_exterior.png',
    'fp_stairs':     'assets/walls-floors/heroine-dusk/tiles/first person dungeon crawl tiles/interior.png',

    'enemy_skeleton':    'assets/monsters/heroine-dusk-enemies/skeleton3.png',
    'enemy_zombie':      'assets/monsters/heroine-dusk-enemies/zombie2.png',
    'enemy_imp':         'assets/monsters/heroine-dusk-enemies/imp2.png',
    'enemy_goblin':      'assets/monsters/heroine-dusk-enemies/goblin2.png',
    'enemy_druid':       'assets/monsters/heroine-dusk-enemies/druid2.png',
    'enemy_mimic':       'assets/monsters/heroine-dusk-enemies/mimic2.png',
    'enemy_shadow':      'assets/monsters/heroine-dusk-enemies/shadow_soul2.png',
    'enemy_bone_shield': 'assets/monsters/heroine-dusk-enemies/bone_shield2.PNG',
    'enemy_death_speaker':'assets/monsters/heroine-dusk-enemies/death_speaker2.png',
    'enemy_skull_pile':  'assets/monsters/heroine-dusk-enemies/skull_pile2.PNG',

    'kenney_dungeon': 'assets/walls-floors/kenney/Spritesheet/roguelikeDungeon_transparent.png',

    'fighter_m':  'assets/portraits/classes/fighter_m.png',
    'fighter_f':  'assets/portraits/classes/fighter_f.png',
    'ranger_m':   'assets/portraits/classes/ranger_m.png',
    'ranger_f':   'assets/portraits/classes/ranger_f.png',
    'mage_m':     'assets/portraits/classes/mage_m.png',
    'mage_f':     'assets/portraits/classes/mage_f.png',
    'cleric_m':   'assets/portraits/classes/cleric_m.png',
    'cleric_f':   'assets/portraits/classes/cleric_f.png',
    'rogue_m':    'assets/portraits/classes/rogue_m.png',
    'rogue_f':    'assets/portraits/classes/rogue_f.png',
    'paladin_m':  'assets/portraits/classes/paladin_m.png',
    'paladin_f':  'assets/portraits/classes/paladin_f.png',

    'icon_sword_rusty':    "assets/items/kyrise-icons/Kyrise's 16x16 RPG Icon Pack - V1.2/icons/32x32/sword_01a.png",
    'icon_sword_iron':     "assets/items/kyrise-icons/Kyrise's 16x16 RPG Icon Pack - V1.2/icons/32x32/sword_01b.png",
    'icon_sword_steel':    "assets/items/kyrise-icons/Kyrise's 16x16 RPG Icon Pack - V1.2/icons/32x32/sword_01c.png",
    'icon_sword_magic':    "assets/items/kyrise-icons/Kyrise's 16x16 RPG Icon Pack - V1.2/icons/32x32/sword_01e.png",
    'icon_armor_cloth':    "assets/items/kyrise-icons/Kyrise's 16x16 RPG Icon Pack - V1.2/icons/32x32/helmet_01a.png",
    'icon_armor_leather':  "assets/items/kyrise-icons/Kyrise's 16x16 RPG Icon Pack - V1.2/icons/32x32/helmet_01b.png",
    'icon_armor_chain':    "assets/items/kyrise-icons/Kyrise's 16x16 RPG Icon Pack - V1.2/icons/32x32/helmet_01c.png",
    'icon_armor_plate':    "assets/items/kyrise-icons/Kyrise's 16x16 RPG Icon Pack - V1.2/icons/32x32/helmet_01d.png",
    'icon_shield_wood':    "assets/items/kyrise-icons/Kyrise's 16x16 RPG Icon Pack - V1.2/icons/32x32/shield_01a.png",
    'icon_shield_iron':    "assets/items/kyrise-icons/Kyrise's 16x16 RPG Icon Pack - V1.2/icons/32x32/shield_01c.png",
    'icon_potion_health':  "assets/items/kyrise-icons/Kyrise's 16x16 RPG Icon Pack - V1.2/icons/32x32/potion_01a.png",
    'icon_potion_mana':    "assets/items/kyrise-icons/Kyrise's 16x16 RPG Icon Pack - V1.2/icons/32x32/potion_01c.png",
    'icon_potion_strength':"assets/items/kyrise-icons/Kyrise's 16x16 RPG Icon Pack - V1.2/icons/32x32/potion_01e.png",
    'icon_key':            "assets/items/kyrise-icons/Kyrise's 16x16 RPG Icon Pack - V1.2/icons/32x32/key_01a.png",
    'icon_ring':           "assets/items/kyrise-icons/Kyrise's 16x16 RPG Icon Pack - V1.2/icons/32x32/ring_01a.png",
    'icon_amulet':         "assets/items/kyrise-icons/Kyrise's 16x16 RPG Icon Pack - V1.2/icons/32x32/necklace_01a.png",
    'icon_sunstone':       "assets/items/kyrise-icons/Kyrise's 16x16 RPG Icon Pack - V1.2/icons/32x32/crystal_01g.png",
  };

  const entries = Object.entries(manifest);
  const promises = entries.map(([name, path]) =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { assets.set(name, img); resolve(); };
      img.onerror = () => {
        console.warn(`Failed to load asset: ${name} (${path})`);
        resolve();
      };
      img.src = path;
    })
  );

  await Promise.all(promises);
  console.log(`Loaded ${assets.size}/${entries.length} assets`);

  // Post-process: Recolor dungeon tiles from warm orange/brown to cold grey stone
  // Per masters (Frank Force / Canvas optimization): offscreen canvas + pixel manipulation
  const tileKeys = ['fp_wall', 'fp_floor', 'fp_ceiling', 'fp_door', 'fp_locked_door',
                     'fp_pillar_int', 'fp_pillar_ext', 'fp_chest_int', 'fp_chest_ext', 'fp_stairs'];
  for (const key of tileKeys) {
    const img = assets.get(key);
    if (!img) continue;
    const recolored = recolorToGreyStone(img);
    assets.set(key, recolored);
  }
  console.log('Dungeon tiles recolored to grey stone');

  return assets;
}

/**
 * Recolor an image from warm orange/brown to cold grey ancient stone.
 * Dungeon Master 1987 aesthetic — dark, weathered, cold.
 * Uses offscreen canvas pixel manipulation (masters pattern).
 */
function recolorToGreyStone(img) {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // Skip fully transparent pixels
    if (a === 0) continue;

    // Convert to luminance (perceived brightness)
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    // Desaturate heavily and shift to cool grey-blue
    // Mix: 85% luminance-based grey + 15% cool blue tint
    const grey = lum * 0.7; // Darken overall for ancient/weathered look
    const coolR = grey * 0.9;              // Slightly less red
    const coolG = grey * 0.92;             // Slightly less green
    const coolB = grey * 1.05;             // Slight blue push — cold stone

    // Add subtle variation to prevent flat look
    const variation = ((i / 4) % 7) * 0.5; // Tiny per-pixel noise

    data[i]     = Math.min(255, Math.max(0, coolR + variation));
    data[i + 1] = Math.min(255, Math.max(0, coolG));
    data[i + 2] = Math.min(255, Math.max(0, coolB));
    // Alpha stays unchanged
  }

  ctx.putImageData(imageData, 0, 0);

  // Return as an Image element (same interface as original)
  const result = new Image();
  result.src = canvas.toDataURL();
  return result;
}

export const ITEM_ICON_MAP = {
  'sword-rusty': 'icon_sword_rusty',
  'sword-iron': 'icon_sword_iron',
  'sword-steel': 'icon_sword_steel',
  'sword-magic': 'icon_sword_magic',
  'armor-cloth': 'icon_armor_cloth',
  'armor-leather': 'icon_armor_leather',
  'armor-chain': 'icon_armor_chain',
  'armor-plate': 'icon_armor_plate',
  'shield-wood': 'icon_shield_wood',
  'shield-iron': 'icon_shield_iron',
  'potion-health': 'icon_potion_health',
  'potion-mana': 'icon_potion_mana',
  'potion-strength': 'icon_potion_strength',
  'key-dungeon': 'icon_key',
  'ring-strength': 'icon_ring',
  'amulet-health': 'icon_amulet',
  'fragment-sunstone': 'icon_sunstone',
};

export const MONSTER_SPRITE_MAP = {
  'shadow_lurker': 'enemy_shadow',
  'frost_wraith': 'enemy_death_speaker',
  'bone_revenant': 'enemy_bone_shield',
  'goblin_scrapper': 'enemy_goblin',
  'goblin_archer': 'enemy_goblin',
  'goblin_shaman': 'enemy_druid',
  'hobgoblin': 'enemy_goblin',
  'gretchka_elder': 'enemy_skull_pile',
  'skeleton': 'enemy_skeleton',
  'zombie': 'enemy_zombie',
  'imp': 'enemy_imp',
  'mimic': 'enemy_mimic',
};
