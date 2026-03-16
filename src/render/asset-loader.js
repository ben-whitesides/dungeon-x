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

    'portrait_male_1':   'assets/portraits/flare/FlareMaleHero1.png',
    'portrait_male_2':   'assets/portraits/flare/FlareMaleHero2.png',
    'portrait_male_3':   'assets/portraits/flare/FlareMaleHero3.png',
    'portrait_female_1': 'assets/portraits/flare/FlareFemaleHero1.png',
    'portrait_female_2': 'assets/portraits/flare/FlareFemaleHero2.png',
    'portrait_female_3': 'assets/portraits/flare/FlareFemaleHero3.png',
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
  return assets;
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
