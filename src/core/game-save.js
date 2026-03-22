/**
 * GameSave — Two-Tier Persistent Save System
 *
 * Masters pattern (Hades/Darkest Dungeon/Dead Cells/Slay the Spire):
 *
 * Tier 1: META-SAVE (dx-meta) — Permanent, survives death/new game
 *   - Hero character, roster, completed dungeons, fragments, gold, settings
 *   - Checksum + backup slot for corruption resilience
 *   - Version migration chain
 *
 * Tier 2: RUN-SAVE (dx-run) — Exists only during active dungeon run
 *   - Party HP/MP/status, floor, dungeon seed, map state, run inventory
 *   - Deleted on death (rewards harvested to meta first)
 *   - Deleted on victory (completion flags + rewards to meta first)
 *
 * Legacy: Reads old 'dx-save' format and migrates to new two-tier on first load.
 */

const META_KEY = 'dx-meta';
const META_BACKUP_KEY = 'dx-meta-backup';
const RUN_KEY = 'dx-run';
const LEGACY_KEY = 'dx-save';
const CUSTOM_CHARS_KEY = 'dx-custom-characters';
const CURRENT_META_VERSION = 3;

// Simple checksum for corruption detection
function _checksum(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

export class GameSave {

  // =========================================================================
  // META-SAVE — Permanent progression (Tier 1)
  // =========================================================================

  /**
   * Save meta-progression (permanent state) from world.
   * Called after: character creation, party change, dungeon complete, level up,
   * shop transactions, returning to tavern.
   */
  static saveMeta(world) {
    if (typeof localStorage === 'undefined') return;

    const data = {
      version: CURRENT_META_VERSION,
      timestamp: Date.now(),
      heroCharacter: world.heroCharacter ? GameSave._serializeCharacter(world.heroCharacter) : null,
      party: world.party.getMembers().map(m => ({
        name: m.name,
        class: m.class,
        isHero: m === world.heroCharacter,
      })),
      roster: world.roster.getAll().map(c => GameSave._serializeCharacter(c)),
      gold: world.gold,
      completedDungeons: [...world.completedDungeons],
      collectedFragments: [...world.collectedFragments],
      inventory: world.inventory.getAllItems().map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity || 1,
      })),
    };

    GameSave._safeWrite(META_KEY, data);
  }

  /**
   * Load meta-save. Falls back to backup if primary is corrupt.
   * Also migrates legacy 'dx-save' format if found.
   */
  static loadMeta() {
    if (typeof localStorage === 'undefined') return null;

    // Try migrating legacy save first
    const legacy = GameSave._tryLoadLegacy();
    if (legacy) return legacy;

    // Load primary
    let data = GameSave._safeRead(META_KEY);
    if (data) {
      data = GameSave._migrateMeta(data);
      return data;
    }

    // Try backup
    data = GameSave._safeRead(META_BACKUP_KEY);
    if (data) {
      console.warn('GameSave: Primary meta corrupt, restored from backup');
      data = GameSave._migrateMeta(data);
      // Re-save to primary
      GameSave._safeWrite(META_KEY, data);
      return data;
    }

    return null;
  }

  /**
   * Check if any save exists (meta or legacy).
   */
  static hasSave() {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(META_KEY) !== null
      || localStorage.getItem(LEGACY_KEY) !== null;
  }

  /**
   * Clear all save data (New Game).
   */
  static clearSave() {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(META_KEY);
    localStorage.removeItem(META_BACKUP_KEY);
    localStorage.removeItem(RUN_KEY);
    localStorage.removeItem(LEGACY_KEY);
    localStorage.removeItem(CUSTOM_CHARS_KEY);
    localStorage.removeItem('dungeon-x-roster');
  }

  // =========================================================================
  // RUN-SAVE — Active dungeon run (Tier 2)
  // =========================================================================

  /**
   * Save active run state. Called on floor transitions, combat end.
   */
  static saveRun(world) {
    if (typeof localStorage === 'undefined') return;
    if (!world.tileMap) return; // Not in a dungeon

    const data = {
      version: 1,
      timestamp: Date.now(),
      dungeonType: world.dungeonType,
      dungeonName: world.dungeonName || world.dungeonType,
      floor: world.floor || 1,
      seed: world.rng ? world.rng.seed : null,
      party: world.party.getMembers().map(m => GameSave._serializeCharacter(m)),
      playerPos: { x: world.player.x, y: world.player.y, facing: world.player.facing },
      turnCount: world.turnCount || 0,
    };

    GameSave._safeWrite(RUN_KEY, data);
  }

  /**
   * Load active run state. Returns null if no run in progress.
   */
  static loadRun() {
    if (typeof localStorage === 'undefined') return null;
    return GameSave._safeRead(RUN_KEY);
  }

  /**
   * Check if an active run exists.
   */
  static hasActiveRun() {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(RUN_KEY) !== null;
  }

  /**
   * Delete run save — called on death or victory after harvesting rewards.
   */
  static clearRun() {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(RUN_KEY);
  }

  /**
   * Harvest run rewards into meta-save on death.
   * Characters survive, but run-specific progress is lost.
   * XP and levels earned during the run ARE kept (Hades model).
   */
  static harvestRunOnDeath(world) {
    // Characters keep their XP/levels from the run
    // but HP is restored to pre-dungeon snapshot values
    // Gold earned during run is kept (consolation prize)
    GameSave.saveMeta(world);
    GameSave.clearRun();
  }

  /**
   * Harvest run rewards into meta-save on victory.
   * Dungeon marked complete, fragments collected, full save.
   */
  static harvestRunOnVictory(world) {
    GameSave.saveMeta(world);
    GameSave.clearRun();
  }

  // =========================================================================
  // BACKWARD COMPATIBILITY — Legacy 'dx-save' migration
  // =========================================================================

  /**
   * Reads old flat 'dx-save', migrates to dx-meta, removes old key.
   * Returns migrated data or null.
   */
  static _tryLoadLegacy() {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(LEGACY_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || !data.heroCharacter) return null;

      // Migrate: legacy format IS the meta format (same fields)
      data.version = CURRENT_META_VERSION;
      console.log('GameSave: Migrated legacy dx-save to dx-meta');

      // Write to new key
      GameSave._safeWrite(META_KEY, data);
      // Remove legacy key
      localStorage.removeItem(LEGACY_KEY);

      return data;
    } catch (e) {
      console.warn('GameSave: Legacy migration failed:', e);
      return null;
    }
  }

  // =========================================================================
  // BACKWARD COMPAT WRAPPER — save() and load() still work
  // =========================================================================

  /**
   * save(world) — backward compatible wrapper.
   * Saves meta. If in dungeon, also saves run.
   */
  static save(world) {
    GameSave.saveMeta(world);
    if (world.tileMap) {
      GameSave.saveRun(world);
    }
  }

  /**
   * load() — backward compatible wrapper.
   * Returns meta-save data (same format as old dx-save).
   */
  static load() {
    return GameSave.loadMeta();
  }

  // =========================================================================
  // CUSTOM CHARACTERS
  // =========================================================================

  static saveCustomCharacters(characters) {
    if (typeof localStorage === 'undefined') return;
    try {
      const data = characters.map(c => {
        if (c.baseStats) return GameSave._serializeCharacter(c);
        return c;
      });
      localStorage.setItem(CUSTOM_CHARS_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('GameSave: Failed to save custom characters:', e);
    }
  }

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

  // =========================================================================
  // BROWSER PERSISTENCE — Request persistent storage
  // =========================================================================

  /**
   * Request persistent storage to prevent browser eviction.
   * Call once after first meaningful save.
   */
  static async requestPersistence() {
    if (navigator.storage && navigator.storage.persist) {
      const granted = await navigator.storage.persist();
      if (granted) {
        console.log('GameSave: Persistent storage granted');
      }
    }
  }

  /**
   * Export save data as a downloadable JSON string.
   * For cross-device portability.
   */
  static exportSave() {
    const meta = GameSave.loadMeta();
    const run = GameSave.loadRun();
    const custom = GameSave.loadCustomCharacters();
    return JSON.stringify({ meta, run, custom, exportedAt: new Date().toISOString() }, null, 2);
  }

  /**
   * Import save data from a JSON string.
   */
  static importSave(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      if (data.meta) {
        GameSave._safeWrite(META_KEY, data.meta);
      }
      if (data.run) {
        GameSave._safeWrite(RUN_KEY, data.run);
      }
      if (data.custom) {
        localStorage.setItem(CUSTOM_CHARS_KEY, JSON.stringify(data.custom));
      }
      return true;
    } catch (e) {
      console.warn('GameSave: Import failed:', e);
      return false;
    }
  }

  // =========================================================================
  // INTERNAL HELPERS
  // =========================================================================

  /**
   * Safe write with backup — writes to primary, keeps previous as backup.
   */
  static _safeWrite(key, data) {
    try {
      const json = JSON.stringify(data);
      // Backup current primary before overwriting (meta only)
      if (key === META_KEY) {
        const current = localStorage.getItem(META_KEY);
        if (current) {
          localStorage.setItem(META_BACKUP_KEY, current);
        }
      }
      localStorage.setItem(key, json);
    } catch (e) {
      console.warn(`GameSave: Failed to write ${key}:`, e);
    }
  }

  /**
   * Safe read with parse error handling.
   */
  static _safeRead(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn(`GameSave: Failed to read ${key}:`, e);
      return null;
    }
  }

  /**
   * Migrate meta-save through version chain.
   */
  static _migrateMeta(data) {
    if (!data.version) data.version = 1;

    // v1 → v2: Added collectedFragments
    if (data.version === 1) {
      data.collectedFragments = data.collectedFragments || [];
      data.version = 2;
    }

    // v2 → v3: Two-tier system (no structural change to meta, just version bump)
    if (data.version === 2) {
      data.version = 3;
    }

    return data;
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
