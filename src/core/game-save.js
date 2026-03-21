/**
 * GameSave — Persistent game state to localStorage.
 * Key: 'dx-save'
 * Auto-saves after: dungeon completion, level up, character creation, party change.
 */

const SAVE_KEY = 'dx-save';
const CUSTOM_CHARS_KEY = 'dx-custom-characters';

export class GameSave {
  /**
   * Save full game state to localStorage.
   */
  static save(world) {
    if (typeof localStorage === 'undefined') return;

    const data = {
      version: 2,
      timestamp: Date.now(),
      // Player's custom hero (party leader, slot 0)
      heroCharacter: world.heroCharacter ? GameSave._serializeCharacter(world.heroCharacter) : null,
      // Party composition (by name+class keys for lookup)
      party: world.party.getMembers().map(m => ({
        name: m.name,
        class: m.class,
        isHero: m === world.heroCharacter
      })),
      // All character data (roster)
      roster: world.roster.getAll().map(c => GameSave._serializeCharacter(c)),
      // World state
      gold: world.gold,
      completedDungeons: [...world.completedDungeons],
      collectedFragments: [...world.collectedFragments],
      // Inventory
      inventory: world.inventory.getAllItems().map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity || 1
      })),
    };

    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('GameSave: Failed to save:', e);
    }
  }

  /**
   * Load game state from localStorage.
   * Returns the save data object, or null if no save exists.
   */
  static load() {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('GameSave: Failed to load:', e);
      return null;
    }
  }

  /**
   * Check if a save exists.
   */
  static hasSave() {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(SAVE_KEY) !== null;
  }

  /**
   * Clear save data (New Game).
   */
  static clearSave() {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(CUSTOM_CHARS_KEY);
    localStorage.removeItem('dungeon-x-roster');
  }

  /**
   * Save custom characters list.
   */
  static saveCustomCharacters(characters) {
    if (typeof localStorage === 'undefined') return;
    try {
      const data = characters.map(c => {
        // Handle both Character instances and plain objects
        if (c.baseStats) return GameSave._serializeCharacter(c);
        return c; // Already serialized
      });
      localStorage.setItem(CUSTOM_CHARS_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('GameSave: Failed to save custom characters:', e);
    }
  }

  /**
   * Load custom characters list.
   */
  static loadCustomCharacters() {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(CUSTOM_CHARS_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (e) {
      console.warn('GameSave: Failed to load custom characters:', e);
      return [];
    }
  }

  static _serializeCharacter(c) {
    return {
      name: c.name,
      class: c.class,
      level: c.level,
      xp: c.xp,
      portrait: c.portrait,
      currentHP: c.currentHP,
      maxHP: c.maxHP,
      currentMana: c.currentMana,
      maxMana: c.maxMana,
      baseStats: { ...c.baseStats },
      levelBonuses: { ...c.levelBonuses },
      equipment: c.equipment ? {
        weapon: c.equipment.weapon ? { ...c.equipment.weapon } : null,
        armor: c.equipment.armor ? { ...c.equipment.armor } : null,
        shield: c.equipment.shield ? { ...c.equipment.shield } : null,
        accessory: c.equipment.accessory ? { ...c.equipment.accessory } : null,
      } : {},
      isCustom: c.isCustom || false,
    };
  }
}
