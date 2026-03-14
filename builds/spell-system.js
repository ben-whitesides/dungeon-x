// ============================================================
// DUNGEON X — SPELL SYSTEM MODULE
// Spell Combinations, Light Spell Tiers, Creature Light Behavior
// Load after dungeon-x-phase2.html globals (PLAYER, ENEMIES, rollDice, etc.)
// ============================================================
(function() {
  'use strict';

  // ----------------------------------------------------------
  // DEPENDENCY GUARDS — rollDice and mod may be provided by the
  // host page (dungeon-x-phase2.html). Define fallbacks if missing.
  // ----------------------------------------------------------

  if (typeof rollDice === 'undefined') {
    console.warn('spell-system.js: rollDice not found, defining fallback');
  }

  var _rollDice = (typeof rollDice !== 'undefined') ? rollDice : function(sides) {
    return Math.floor(Math.random() * sides) + 1;
  };

  var _mod = (typeof mod !== 'undefined') ? mod : function(stat) {
    return Math.floor((stat - 10) / 2);
  };

  // ----------------------------------------------------------
  // CONSTANTS
  // ----------------------------------------------------------

  var ELEMENTS = ['Fire', 'Ice', 'Stone', 'Wind', 'Shadow', 'Light'];

  var ELEMENT_COLORS = {
    Fire:   0xff4400,
    Ice:    0x44ccff,
    Stone:  0x998866,
    Wind:   0xccffcc,
    Shadow: 0x6633aa,
    Light:  0xffffaa
  };

  // ----------------------------------------------------------
  // SPELL COMBINATIONS
  // Keys are sorted alphabetically so lookup is order-independent.
  // ----------------------------------------------------------

  var COMBINATIONS = {
    'Fire+Wind': {
      name: 'Inferno Gust',
      elements: ['Fire', 'Wind'],
      combat: {
        damage: { rolls: 3, dice: 6 },
        element: 'fire',
        aoe: true,
        dot: { rounds: 2, damagePerRound: 3 },
        description: '3d6 fire damage AoE, burns for 2 rounds'
      },
      utility: {
        types: ['stuck_door', 'gas_cloud', 'fog'],
        description: 'Blast open stuck doors, clear gas or fog'
      },
      color: 0xff6600,
      discoveryText: 'Fire and Wind merge into a roaring inferno that sweeps through the corridor!',
      flair: 'The air ignites.'
    },

    'Ice+Stone': {
      name: 'Frost Lock',
      elements: ['Ice', 'Stone'],
      combat: {
        damage: { rolls: 2, dice: 6 },
        element: 'ice',
        aoe: false,
        freeze: { turns: 2 },
        description: '2d6 cold damage, target frozen 2 turns'
      },
      utility: {
        types: ['mechanism', 'trap', 'water'],
        description: 'Freeze mechanisms, disarm traps, freeze water'
      },
      color: 0x66aacc,
      discoveryText: 'Ice crawls across stone, locking everything in crystalline stillness!',
      flair: 'The world holds its breath.'
    },

    'Light+Shadow': {
      name: 'Reveal',
      elements: ['Light', 'Shadow'],
      combat: {
        damage: { rolls: 1, dice: 8 },
        element: 'holy',
        aoe: false,
        stripInvisibility: true,
        description: '1d8 radiant + strips invisibility'
      },
      utility: {
        types: ['hidden_passage', 'invisible_enemy', 'secret_door'],
        description: 'Reveal hidden passages, invisible enemies, secret doors'
      },
      color: 0xddddff,
      discoveryText: 'Shadow and Light collide — reality flickers and secrets lay bare!',
      flair: 'Nothing stays hidden.'
    },

    'Fire+Stone': {
      name: 'Magma Seal',
      elements: ['Fire', 'Stone'],
      combat: {
        damage: { rolls: 2, dice: 8 },
        element: 'fire',
        aoe: false,
        createsTile: 'lava',
        description: '2d8 fire damage, creates lava tile'
      },
      utility: {
        types: ['gap', 'chasm', 'seal_door'],
        description: 'Forge bridges across gaps, seal doors permanently'
      },
      color: 0xff4400,
      discoveryText: 'Rock melts and reshapes at your command — the earth itself obeys!',
      flair: 'The stone remembers fire.'
    },

    'Ice+Wind': {
      name: 'Blizzard',
      elements: ['Ice', 'Wind'],
      combat: {
        damage: { rolls: 2, dice: 6 },
        element: 'ice',
        aoe: true,
        slow: { turns: 2 },
        description: '2d6 cold damage AoE, slow all enemies 2 turns'
      },
      utility: {
        types: ['fire_hazard', 'poison_cloud', 'area_slow'],
        description: 'Area slow, extinguish fires, clear poison clouds'
      },
      color: 0x88ccff,
      discoveryText: 'A freezing gale erupts, coating everything in biting frost!',
      flair: 'Winter answers.'
    },

    'Shadow+Wind': {
      name: 'Phantom Step',
      elements: ['Shadow', 'Wind'],
      combat: {
        damage: { rolls: 0, dice: 0 },
        element: 'shadow',
        aoe: false,
        phaseThrough: true,
        dodgeAll: { rounds: 1 },
        description: 'Party phases through — dodge all attacks 1 round'
      },
      utility: {
        types: ['thin_wall', 'phase_wall'],
        description: 'Phase through thin walls (1 tile), dodge all attacks 1 round'
      },
      color: 0x9966cc,
      discoveryText: 'Your body becomes mist — solid matter means nothing!',
      flair: 'You are smoke.'
    }
  };

  // Fizzle messages for invalid combinations
  var FIZZLE_MESSAGES = [
    'The elements reject each other. Perhaps a different pairing.',
    'A spark — then nothing. The elements do not wish to meet.',
    'The magic sputters and dies. These elements have nothing to say to one another.',
    'You feel the mana drain uselessly. That combination holds no secret.',
    'The elements swirl, clash, and dissipate. Wrong pairing.',
    'A faint hum, then silence. The arcane formula is incomplete.'
  ];

  // ----------------------------------------------------------
  // LIGHT SPELLS
  // ----------------------------------------------------------

  var LIGHT_SPELLS = {
    spark: {
      name: 'Spark',
      radius: 1,
      duration: 15,       // ~15 moves
      manaCost: 0,
      description: 'Barely see your feet',
      effect: 'minimal_light',
      tier: 0
    },
    torchlight: {
      name: 'Torchlight',
      radius: 3,
      duration: 60,       // ~60 moves
      manaCost: 4,
      description: 'Standard exploration light',
      effect: 'normal_light',
      tier: 1
    },
    sunburst: {
      name: 'Sunburst',
      radius: 99,
      duration: 2,        // ~2 moves (flash)
      manaCost: 12,
      description: 'Reveals all + blinds shadow creatures',
      effect: 'full_reveal',
      special: 'blinds_shadow_creatures',
      tier: 2
    },
    darkvision: {
      name: 'Darkvision',
      radius: 99,
      duration: 30,       // ~30 moves
      manaCost: 0,
      requiresScroll: true,
      description: 'See without emitting light. Enemies cannot see you.',
      effect: 'stealth_vision',
      special: 'enemies_unaware',
      tier: 3
    }
  };

  // ----------------------------------------------------------
  // CREATURE LIGHT BEHAVIOR
  // Keys match ENEMIES object in the game exactly.
  // ----------------------------------------------------------

  var CREATURE_LIGHT = {
    shadow_lurker: {
      behavior: 'light_weak',
      lightDamageBonus: -2,
      darkDamageBonus: 3,
      lightACPenalty: -2,
      darkACBonus: 3,
      sunburstVulnerable: true,
      sunburstDamage: { rolls: 2, dice: 6 },
      sunburstStun: 1,
      firstSightLight: 'The Shadow Lurker seems to shrink from your torchlight...',
      firstSightDark: 'The Shadow Lurker moves with terrible certainty in the darkness...'
    },
    frost_wraith: {
      behavior: 'light_neutral',
      lightDamageBonus: 0,
      darkDamageBonus: 0,
      lightACPenalty: 0,
      darkACBonus: 0,
      sunburstVulnerable: false,
      firstSightLight: 'The Frost Wraith glides forward, indifferent to the light.',
      firstSightDark: 'The Frost Wraith materializes from the cold air, unaffected by darkness.'
    },
    bone_revenant: {
      behavior: 'sound_hunter',
      lightDamageBonus: 0,
      darkDamageBonus: 0,
      lightACPenalty: 0,
      darkACBonus: 0,
      sunburstVulnerable: false,
      description: 'This creature hunts by sound. Light does not help you here.',
      firstSightLight: 'The Bone Revenant tilts its skull, listening. It hunts by sound, not sight.',
      firstSightDark: 'You hear grinding bone in the dark. The Bone Revenant needs no eyes to find you.'
    },
    crypt_crawler: {
      behavior: 'light_scatter',
      lightDamageBonus: 0,
      darkDamageBonus: 0,
      lightACPenalty: 0,
      darkACBonus: 0,
      fleeOnSunburst: true,
      darknessAggro: true,
      darknessAttackBonus: 2,
      sunburstVulnerable: false,
      firstSightLight: 'The Crypt Crawler scuttles back from the light, wary but cornered.',
      firstSightDark: 'Chitinous legs scrape stone. The Crypt Crawler is bolder in the dark...'
    },
    goblin_scrapper: {
      behavior: 'light_cautious',
      lightAttackPenalty: -1,
      darkAttackBonus: 2,
      lightDamageBonus: 0,
      darkDamageBonus: 0,
      lightACPenalty: 0,
      darkACBonus: 0,
      sunburstVulnerable: false,
      firstSightLight: 'The Goblin Scrapper squints against the light, fumbling its weapon.',
      firstSightDark: 'Cackling echoes. The goblin is braver where you cannot see.'
    },
    goblin_shaman: {
      behavior: 'light_cautious',
      lightAttackPenalty: -1,
      darkAttackBonus: 1,
      lightDamageBonus: 0,
      darkDamageBonus: 0,
      lightACPenalty: 0,
      darkACBonus: 0,
      sunburstVulnerable: false,
      firstSightLight: 'The Goblin Shaman raises a gnarled staff, chanting louder in the light.',
      firstSightDark: 'Green sparks flicker in the dark. The shaman weaves spells unseen.'
    },
    vault_warden: {
      behavior: 'light_immune',
      lightDamageBonus: 0,
      darkDamageBonus: 0,
      lightACPenalty: 0,
      darkACBonus: 0,
      sunburstVulnerable: false,
      description: 'The Vault Warden sees all, light or dark.',
      firstSightLight: 'The Vault Warden does not flinch. It sees all, light or dark.',
      firstSightDark: 'The Vault Warden does not flinch. Darkness is no advantage here.'
    }
  };

  // ----------------------------------------------------------
  // INTERNAL STATE
  // Active light spell tracking (persists until duration expires)
  // ----------------------------------------------------------

  var _activeLightSpell = null;   // { key, movesRemaining, ... }
  var _lightFirstSightShown = {}; // Track which creature first-sight hints have fired
  var _comboFirstSightShown = {}; // Track first-time combo discoveries

  // ----------------------------------------------------------
  // HELPER: Normalize element pair to sorted key
  // ----------------------------------------------------------

  function comboKey(el1, el2) {
    var pair = [el1, el2].sort();
    return pair[0] + '+' + pair[1];
  }

  // ----------------------------------------------------------
  // HELPER: Roll multiple dice and sum
  // ----------------------------------------------------------

  function rollMultiple(rolls, dice) {
    if (rolls <= 0 || dice <= 0) return 0;
    var total = 0;
    for (var i = 0; i < rolls; i++) {
      total += _rollDice(dice);
    }
    return total;
  }

  // ----------------------------------------------------------
  // HELPER: Determine current light level
  // Returns a string: 'darkness', 'dim', 'normal', 'bright', 'stealth'
  // and a numeric value 0-4 for modifier lookups
  // ----------------------------------------------------------

  function computeLightLevel() {
    // Darkvision overrides everything — stealth mode
    if (_activeLightSpell && _activeLightSpell.key === 'darkvision' && _activeLightSpell.movesRemaining > 0) {
      return { level: 'stealth', value: 4, label: 'Darkvision (Stealth)' };
    }

    // Sunburst — full bright while active
    if (_activeLightSpell && _activeLightSpell.key === 'sunburst' && _activeLightSpell.movesRemaining > 0) {
      return { level: 'bright', value: 3, label: 'Sunburst (Full Reveal)' };
    }

    // Active light spell overrides torch
    if (_activeLightSpell && _activeLightSpell.movesRemaining > 0) {
      if (_activeLightSpell.key === 'torchlight') {
        return { level: 'normal', value: 2, label: 'Torchlight Spell' };
      }
      if (_activeLightSpell.key === 'spark') {
        return { level: 'dim', value: 1, label: 'Spark' };
      }
    }

    // Fall back to physical torch
    if (typeof PLAYER !== 'undefined') {
      if (PLAYER.torch <= 0) {
        return { level: 'darkness', value: 0, label: 'Total Darkness' };
      }
      var ratio = PLAYER.torch / PLAYER.maxTorch;
      if (ratio > 0.5) {
        return { level: 'normal', value: 2, label: 'Torch (strong)' };
      }
      if (ratio > 0.15) {
        return { level: 'dim', value: 1, label: 'Torch (fading)' };
      }
      return { level: 'dim', value: 1, label: 'Torch (guttering)' };
    }

    return { level: 'darkness', value: 0, label: 'No light source' };
  }

  // ----------------------------------------------------------
  // PUBLIC API
  // ----------------------------------------------------------

  window.DX_SPELLS = {

    // ========================================================
    // DATA ACCESS
    // ========================================================

    ELEMENTS: ELEMENTS,
    ELEMENT_COLORS: ELEMENT_COLORS,
    COMBINATIONS: COMBINATIONS,
    LIGHT_SPELLS: LIGHT_SPELLS,
    CREATURE_LIGHT: CREATURE_LIGHT,

    FIZZLE_MANA_COST: 3,
    COMBO_MANA_COST: 8,

    // ========================================================
    // COMBINATION SYSTEM
    // ========================================================

    /**
     * Initialize the player's combo tracking.
     * Call once when a game starts / class is chosen.
     */
    initPlayer: function() {
      if (typeof PLAYER !== 'undefined') {
        if (!PLAYER.knownCombos) PLAYER.knownCombos = [];
        if (!PLAYER.darkvisionScrolls) PLAYER.darkvisionScrolls = 0;
      }
      _activeLightSpell = null;
      _lightFirstSightShown = {};
      _comboFirstSightShown = {};
    },

    /**
     * Try combining two elements.
     * Returns a result object describing the outcome.
     *
     * @param {string} element1 - e.g. 'Fire'
     * @param {string} element2 - e.g. 'Wind'
     * @returns {object} result
     *   On success: { success:true, combo, isNew, discoveryText, ... }
     *   On fizzle:  { success:false, fizzle:true, message, manaCost }
     *   On error:   { success:false, error:true, message }
     */
    tryCombination: function(element1, element2) {
      // Validate elements
      if (ELEMENTS.indexOf(element1) === -1 || ELEMENTS.indexOf(element2) === -1) {
        return { success: false, error: true, message: 'Unknown element.' };
      }
      if (element1 === element2) {
        return {
          success: false,
          fizzle: true,
          message: 'Combining an element with itself? Even a novice knows better.',
          manaCost: this.FIZZLE_MANA_COST
        };
      }

      // Check mana
      if (typeof PLAYER !== 'undefined' && PLAYER.mana < this.COMBO_MANA_COST) {
        return { success: false, error: true, message: 'Not enough mana. Combination spells cost ' + this.COMBO_MANA_COST + ' MP.' };
      }

      var key = comboKey(element1, element2);
      var combo = COMBINATIONS[key];

      if (!combo) {
        // Fizzle
        if (typeof PLAYER !== 'undefined') {
          PLAYER.mana = Math.max(0, PLAYER.mana - this.FIZZLE_MANA_COST);
        }
        var msg = FIZZLE_MESSAGES[Math.floor(Math.random() * FIZZLE_MESSAGES.length)];
        return {
          success: false,
          fizzle: true,
          message: msg,
          manaCost: this.FIZZLE_MANA_COST
        };
      }

      // Valid combination — deduct mana
      if (typeof PLAYER !== 'undefined') {
        PLAYER.mana = Math.max(0, PLAYER.mana - this.COMBO_MANA_COST);
      }

      // Check if this is a new discovery
      var isNew = !this.isKnown(combo.name);
      if (isNew) {
        this.learnCombo(combo.name);
      }

      return {
        success: true,
        combo: combo,
        comboKey: key,
        isNew: isNew,
        discoveryText: isNew ? ('DISCOVERY! You have learned ' + combo.name + '!') : null,
        name: combo.name,
        color: combo.color,
        flair: combo.flair,
        manaCost: this.COMBO_MANA_COST
      };
    },

    /**
     * Execute a combination spell in combat.
     * Returns damage result for the caller to apply.
     *
     * @param {string} comboName - e.g. 'Inferno Gust'
     * @param {object} enemy - current enemy object (from CombatScene)
     * @returns {object} { totalDamage, messages[], effects{} }
     */
    executeComboCombat: function(comboName, enemy) {
      var combo = null;
      var key;
      for (key in COMBINATIONS) {
        if (COMBINATIONS[key].name === comboName) {
          combo = COMBINATIONS[key];
          break;
        }
      }
      if (!combo) return { totalDamage: 0, messages: ['Unknown combination.'], effects: {} };

      var c = combo.combat;
      var messages = [];
      var effects = {};
      var totalDamage = 0;

      // Roll damage
      if (c.damage.rolls > 0 && c.damage.dice > 0) {
        totalDamage = rollMultiple(c.damage.rolls, c.damage.dice);

        // Add INT modifier for Mages
        if (typeof PLAYER !== 'undefined') {
          totalDamage += _mod(PLAYER.int);
        }

        // Weakness / resistance
        if (enemy && enemy.weakness === c.element) {
          totalDamage = Math.floor(totalDamage * 2);
          messages.push(enemy.name + ' is WEAK to ' + c.element + '! Double damage!');
        }
        if (enemy && enemy.resist === c.element) {
          totalDamage = Math.floor(totalDamage / 2);
          messages.push(enemy.name + ' RESISTS ' + c.element + '!');
        }

        messages.push(combo.name + ' hits for ' + totalDamage + ' damage!');
      }

      // Burn DOT
      if (c.dot) {
        effects.dot = { rounds: c.dot.rounds, damagePerRound: c.dot.damagePerRound };
        messages.push('The target burns! ' + c.dot.damagePerRound + ' fire damage for ' + c.dot.rounds + ' rounds.');
      }

      // Freeze
      if (c.freeze) {
        effects.freeze = { turns: c.freeze.turns };
        messages.push('Target FROZEN for ' + c.freeze.turns + ' turns!');
      }

      // Slow
      if (c.slow) {
        effects.slow = { turns: c.slow.turns };
        messages.push('All enemies SLOWED for ' + c.slow.turns + ' turns!');
      }

      // Strip invisibility
      if (c.stripInvisibility) {
        effects.stripInvisibility = true;
        messages.push('Invisibility stripped! The enemy is fully visible.');
      }

      // Creates lava tile
      if (c.createsTile) {
        effects.createsTile = c.createsTile;
        messages.push('Molten lava pools where the enemy stood.');
      }

      // Phase / dodge
      if (c.phaseThrough) {
        effects.phaseThrough = true;
        messages.push('Your form becomes ethereal!');
      }
      if (c.dodgeAll) {
        effects.dodgeAll = { rounds: c.dodgeAll.rounds };
        messages.push('You dodge all attacks for ' + c.dodgeAll.rounds + ' round!');
      }

      // AoE flag
      if (c.aoe) {
        effects.aoe = true;
      }

      return {
        totalDamage: totalDamage,
        messages: messages,
        effects: effects,
        element: c.element,
        color: combo.color,
        name: combo.name,
        flair: combo.flair
      };
    },

    /**
     * Check if the player knows a combo by name.
     */
    isKnown: function(comboName) {
      if (typeof PLAYER === 'undefined' || !PLAYER.knownCombos) return false;
      return PLAYER.knownCombos.indexOf(comboName) !== -1;
    },

    /**
     * Learn (record) a combo by name.
     */
    learnCombo: function(comboName) {
      if (typeof PLAYER === 'undefined') return;
      if (!PLAYER.knownCombos) PLAYER.knownCombos = [];
      if (PLAYER.knownCombos.indexOf(comboName) === -1) {
        PLAYER.knownCombos.push(comboName);
      }
    },

    /**
     * Get all known combos as full combo objects.
     */
    getKnownCombos: function() {
      if (typeof PLAYER === 'undefined' || !PLAYER.knownCombos) return [];
      var known = [];
      for (var key in COMBINATIONS) {
        if (PLAYER.knownCombos.indexOf(COMBINATIONS[key].name) !== -1) {
          known.push({ key: key, combo: COMBINATIONS[key] });
        }
      }
      return known;
    },

    /**
     * Get all valid combo names (for cheats/debug).
     */
    getAllComboNames: function() {
      var names = [];
      for (var key in COMBINATIONS) {
        names.push(COMBINATIONS[key].name);
      }
      return names;
    },

    // ========================================================
    // LIGHT SPELL SYSTEM
    // ========================================================

    /**
     * Cast a light spell by key (spark, torchlight, sunburst, darkvision).
     * Returns result object with success/failure and messages.
     */
    castLightSpell: function(tier) {
      var spell = LIGHT_SPELLS[tier];
      if (!spell) {
        return { success: false, message: 'Unknown light spell.' };
      }

      // Class check — only Mages can cast light spells
      if (typeof PLAYER !== 'undefined' && PLAYER.class !== 'Mage') {
        return { success: false, message: 'Only a Mage can cast light spells.' };
      }

      // Darkvision requires a scroll
      if (spell.requiresScroll) {
        if (typeof PLAYER !== 'undefined') {
          if (!PLAYER.darkvisionScrolls || PLAYER.darkvisionScrolls <= 0) {
            return { success: false, message: 'Darkvision requires a rare scroll. You have none.' };
          }
          PLAYER.darkvisionScrolls--;
        }
      } else {
        // Check mana
        if (typeof PLAYER !== 'undefined' && PLAYER.mana < spell.manaCost) {
          return { success: false, message: 'Not enough mana. ' + spell.name + ' costs ' + spell.manaCost + ' MP.' };
        }
        if (typeof PLAYER !== 'undefined') {
          PLAYER.mana -= spell.manaCost;
        }
      }

      // Activate the spell
      _activeLightSpell = {
        key: tier,
        spell: spell,
        movesRemaining: spell.duration,
        radius: spell.radius,
        effect: spell.effect,
        special: spell.special || null
      };

      var messages = [spell.name + ' cast! ' + spell.description + '.'];

      // Sunburst special: immediate combat effects handled by caller
      if (spell.special === 'blinds_shadow_creatures') {
        messages.push('A blinding flash fills the dungeon!');
      }

      // Darkvision special
      if (spell.special === 'enemies_unaware') {
        messages.push('The world sharpens into clarity. You see everything — and nothing sees you.');
      }

      return {
        success: true,
        spell: spell,
        messages: messages,
        lightLevel: computeLightLevel()
      };
    },

    /**
     * Tick light spell duration (call once per player move).
     * Returns null normally, or a message when the spell expires.
     */
    tickLightSpell: function() {
      if (!_activeLightSpell || _activeLightSpell.movesRemaining <= 0) {
        _activeLightSpell = null;
        return null;
      }

      _activeLightSpell.movesRemaining--;

      if (_activeLightSpell.movesRemaining <= 0) {
        var expiredName = _activeLightSpell.spell.name;
        _activeLightSpell = null;
        return expiredName + ' fades. ' + (typeof PLAYER !== 'undefined' && PLAYER.torch > 0 ? 'Your torch flickers on.' : 'Darkness returns.');
      }

      // Warning at low duration
      if (_activeLightSpell.movesRemaining === 3) {
        return _activeLightSpell.spell.name + ' is about to expire...';
      }

      return null;
    },

    /**
     * Get the current light level.
     */
    getCurrentLightLevel: function() {
      return computeLightLevel();
    },

    /**
     * Get the active light spell (or null).
     */
    getActiveLightSpell: function() {
      return _activeLightSpell;
    },

    /**
     * Force-clear the active light spell (e.g. on death/tavern return).
     */
    clearLightSpell: function() {
      _activeLightSpell = null;
    },

    /**
     * Get the effective torch override value for the dungeon renderer.
     * Returns null if no light spell is active (use physical torch).
     * Returns a simulated torch value (0-50) for the renderer otherwise.
     */
    getTorchOverride: function() {
      if (!_activeLightSpell || _activeLightSpell.movesRemaining <= 0) {
        return null;
      }

      var key = _activeLightSpell.key;

      if (key === 'darkvision') {
        // Full visibility but no visible light emission
        // Return max torch so the renderer shows everything
        return typeof PLAYER !== 'undefined' ? PLAYER.maxTorch : 50;
      }
      if (key === 'sunburst') {
        return typeof PLAYER !== 'undefined' ? PLAYER.maxTorch : 50;
      }
      if (key === 'torchlight') {
        // Simulate a strong, steady torch
        return typeof PLAYER !== 'undefined' ? Math.floor(PLAYER.maxTorch * 0.8) : 40;
      }
      if (key === 'spark') {
        // Very dim — equivalent to 15% torch
        return typeof PLAYER !== 'undefined' ? Math.floor(PLAYER.maxTorch * 0.15) : 8;
      }

      return null;
    },

    // ========================================================
    // CREATURE LIGHT BEHAVIOR
    // ========================================================

    /**
     * Get combat modifiers for a creature based on current light level.
     *
     * @param {string} enemyType - key from ENEMIES (e.g. 'shadow_lurker')
     * @returns {object} { acMod, damageMod, attackMod, stunned, flees, firstSightText, hints[] }
     */
    getCreatureModifiers: function(enemyType) {
      var entry = CREATURE_LIGHT[enemyType];
      if (!entry) {
        return { acMod: 0, damageMod: 0, attackMod: 0, stunned: false, flees: false, firstSightText: null, hints: [] };
      }

      var light = computeLightLevel();
      var isDark = light.value <= 1;
      var isBright = light.value >= 2;
      var isSunburst = _activeLightSpell && _activeLightSpell.key === 'sunburst' && _activeLightSpell.movesRemaining > 0;
      var isDarkvision = _activeLightSpell && _activeLightSpell.key === 'darkvision' && _activeLightSpell.movesRemaining > 0;

      var result = {
        acMod: 0,
        damageMod: 0,
        attackMod: 0,
        stunned: false,
        stunnedTurns: 0,
        flees: false,
        sunburstDamage: 0,
        firstSightText: null,
        hints: [],
        noFirstStrike: isDarkvision  // Darkvision prevents enemy first strike
      };

      // First sight text (show once per creature type per dungeon run)
      if (!_lightFirstSightShown[enemyType]) {
        _lightFirstSightShown[enemyType] = true;
        result.firstSightText = isBright ? entry.firstSightLight : entry.firstSightDark;
      }

      // Behavior-specific modifiers
      switch (entry.behavior) {
        case 'light_weak':
          if (isBright) {
            result.acMod = entry.lightACPenalty || 0;
            result.damageMod = entry.lightDamageBonus || 0;
            result.hints.push('The creature weakens in the light.');
          } else if (isDark) {
            result.acMod = entry.darkACBonus || 0;
            result.damageMod = entry.darkDamageBonus || 0;
            result.hints.push('Darkness empowers this creature!');
          }
          // Sunburst devastation
          if (isSunburst && entry.sunburstVulnerable) {
            var sbDmg = entry.sunburstDamage ? rollMultiple(entry.sunburstDamage.rolls, entry.sunburstDamage.dice) : 0;
            result.sunburstDamage = sbDmg;
            result.stunned = true;
            result.stunnedTurns = entry.sunburstStun || 1;
            result.hints.push('SUNBURST! The creature recoils in agony! ' + sbDmg + ' radiant damage!');
          }
          break;

        case 'light_neutral':
          // No modifiers from light
          break;

        case 'sound_hunter':
          result.hints.push(entry.description || 'This creature hunts by sound.');
          break;

        case 'light_scatter':
          if (isSunburst && entry.fleeOnSunburst) {
            result.flees = true;
            result.hints.push('The creature flees from the blinding light!');
          }
          if (isDark && entry.darknessAggro) {
            result.attackMod = entry.darknessAttackBonus || 2;
            result.hints.push('The creature is emboldened by darkness!');
          }
          break;

        case 'light_cautious':
          if (isBright) {
            result.attackMod = entry.lightAttackPenalty || 0;
            result.hints.push('The creature fights cautiously in the light.');
          } else if (isDark) {
            result.attackMod = entry.darkAttackBonus || 0;
            result.hints.push('Darkness makes this creature bolder!');
          }
          break;

        case 'light_immune':
          result.hints.push(entry.description || 'Light level has no effect on this creature.');
          break;
      }

      return result;
    },

    /**
     * Apply sunburst combat effects to an enemy.
     * Call this when Sunburst is cast during combat.
     *
     * @param {string} enemyType
     * @returns {object} { damage, stunned, flees, messages[] }
     */
    applySunburstCombat: function(enemyType) {
      var entry = CREATURE_LIGHT[enemyType];
      var messages = [];
      var damage = 0;
      var stunned = false;
      var stunnedTurns = 0;
      var flees = false;

      if (!entry) {
        messages.push('The flash illuminates the battlefield!');
        return { damage: 0, stunned: false, stunnedTurns: 0, flees: false, messages: messages };
      }

      if (entry.sunburstVulnerable && entry.sunburstDamage) {
        damage = rollMultiple(entry.sunburstDamage.rolls, entry.sunburstDamage.dice);
        stunned = true;
        stunnedTurns = entry.sunburstStun || 1;
        messages.push('SUNBURST sears the ' + (typeof ENEMIES !== 'undefined' && ENEMIES[enemyType] ? ENEMIES[enemyType].name : 'creature') + ' for ' + damage + ' radiant damage!');
        messages.push('Stunned for ' + stunnedTurns + ' turn!');
      } else if (entry.fleeOnSunburst) {
        flees = true;
        messages.push('The creature cannot bear the light and FLEES!');
      } else {
        messages.push('The flash illuminates the battlefield, but this creature is unfazed.');
      }

      return { damage: damage, stunned: stunned, stunnedTurns: stunnedTurns, flees: flees, messages: messages };
    },

    /**
     * Reset first-sight tracking (call on new dungeon entry).
     */
    resetFirstSight: function() {
      _lightFirstSightShown = {};
      _comboFirstSightShown = {};
    },

    // ========================================================
    // FIREBALL SCOUT
    // ========================================================

    /**
     * Cast Fireball Scout — fire a fireball down the corridor to reveal
     * tiles and enemies in the direction the player faces.
     *
     * @param {number} direction - PLAYER.dir (0=N, 1=E, 2=S, 3=W)
     * @returns {object} { success, revealedTiles[], revealedEnemies[], messages[], manaCost }
     */
    fireballScout: function(direction) {
      var SCOUT_MANA_COST = 5;
      var SCOUT_RANGE = 4;

      if (typeof PLAYER === 'undefined') {
        return { success: false, message: 'No player context.' };
      }

      if (PLAYER.class !== 'Mage') {
        return { success: false, message: 'Only a Mage can scout with Fireball.' };
      }

      if (PLAYER.mana < SCOUT_MANA_COST) {
        return { success: false, message: 'Not enough mana. Fireball Scout costs ' + SCOUT_MANA_COST + ' MP.' };
      }

      PLAYER.mana -= SCOUT_MANA_COST;

      if (direction === undefined || direction === null) {
        direction = PLAYER.dir;
      }

      var dx = [0, 1, 0, -1]; // N, E, S, W
      var dy = [-1, 0, 1, 0];

      var revealedTiles = [];
      var revealedEnemies = [];
      var messages = ['You hurl a Fireball down the corridor!'];

      var cx = PLAYER.x;
      var cy = PLAYER.y;

      for (var i = 1; i <= SCOUT_RANGE; i++) {
        var nx = cx + dx[direction] * i;
        var ny = cy + dy[direction] * i;

        // Bounds check
        if (typeof GAME !== 'undefined' && GAME.currentMap) {
          if (nx < 0 || nx >= GAME.mapWidth || ny < 0 || ny >= GAME.mapHeight) break;
          var tile = GAME.currentMap[ny][nx];
          if (tile === 1) break; // Hit a wall
          if (tile === 2 || tile === 3) break; // Hit a door

          revealedTiles.push({ x: nx, y: ny, tile: tile });
        }

        // Check for enemies
        if (typeof getEncounterAt === 'function') {
          var enc = getEncounterAt(nx, ny);
          if (enc) {
            revealedEnemies.push({
              x: nx, y: ny,
              enemy: enc.enemy,
              name: (typeof ENEMIES !== 'undefined' && ENEMIES[enc.enemy]) ? ENEMIES[enc.enemy].name : enc.enemy
            });
            // Enemy is now aware
            messages.push('The fireball reveals a ' + ((typeof ENEMIES !== 'undefined' && ENEMIES[enc.enemy]) ? ENEMIES[enc.enemy].name : enc.enemy) + '!');
            messages.push('It has spotted you!');
          }
        }
      }

      if (revealedTiles.length === 0) {
        messages.push('The fireball splashes against the wall. Nothing ahead.');
      } else if (revealedEnemies.length === 0) {
        messages.push('The corridor ahead is clear for ' + revealedTiles.length + ' tiles.');
      }

      return {
        success: true,
        revealedTiles: revealedTiles,
        revealedEnemies: revealedEnemies,
        messages: messages,
        manaCost: SCOUT_MANA_COST,
        range: SCOUT_RANGE,
        flashColor: 0xff6600,
        flashDuration: 2000 // 2 seconds for the orange flash
      };
    },

    // ========================================================
    // DUNGEON UTILITY: OBSTACLE SOLVING
    // ========================================================

    /**
     * Obstacle types that combo spells can solve:
     *   stuck_door, gas_cloud, fog,
     *   mechanism, trap, water,
     *   hidden_passage, invisible_enemy, secret_door,
     *   gap, chasm, seal_door,
     *   fire_hazard, poison_cloud, area_slow,
     *   thin_wall, phase_wall
     */

    /**
     * Check if the player can solve a given obstacle type
     * with any known combination spell.
     *
     * @param {string} obstacleType
     * @returns {object|null} { comboName, comboKey, utility } or null
     */
    canSolveObstacle: function(obstacleType) {
      if (typeof PLAYER === 'undefined' || !PLAYER.knownCombos) return null;

      for (var key in COMBINATIONS) {
        var combo = COMBINATIONS[key];
        if (PLAYER.knownCombos.indexOf(combo.name) === -1) continue;
        if (combo.utility && combo.utility.types && combo.utility.types.indexOf(obstacleType) !== -1) {
          // Check mana
          if (PLAYER.mana < this.COMBO_MANA_COST) continue;
          return {
            comboName: combo.name,
            comboKey: key,
            utility: combo.utility,
            manaCost: this.COMBO_MANA_COST,
            description: combo.utility.description
          };
        }
      }

      return null;
    },

    /**
     * Solve an obstacle with the appropriate combo spell.
     * Deducts mana and returns result.
     *
     * @param {string} obstacleType
     * @returns {object} { success, comboName, messages[] }
     */
    solveObstacle: function(obstacleType) {
      var solution = this.canSolveObstacle(obstacleType);
      if (!solution) {
        return {
          success: false,
          messages: ['You have no way to overcome this obstacle.']
        };
      }

      if (typeof PLAYER !== 'undefined') {
        PLAYER.mana = Math.max(0, PLAYER.mana - this.COMBO_MANA_COST);
      }

      var combo = COMBINATIONS[solution.comboKey];
      var messages = [
        combo.name + '! ' + combo.flair,
        solution.description
      ];

      // Specific obstacle flavor text
      switch (obstacleType) {
        case 'stuck_door':
          messages.push('The door blasts open in a shower of splinters and flame!');
          break;
        case 'gas_cloud':
        case 'fog':
          messages.push('The air clears instantly as the gust burns away the obstruction.');
          break;
        case 'mechanism':
          messages.push('Frost coats the mechanism. Gears lock. The trap is disarmed.');
          break;
        case 'trap':
          messages.push('Ice encases the trigger plate. It will never fire again.');
          break;
        case 'water':
          messages.push('The water freezes solid — a bridge of ice stretches before you.');
          break;
        case 'hidden_passage':
          messages.push('The wall shimmers and fades, revealing a hidden passage!');
          break;
        case 'invisible_enemy':
          messages.push('The creature\'s cloak of shadow is torn away. It stands revealed!');
          break;
        case 'secret_door':
          messages.push('Ancient runes glow along the wall, outlining a hidden door!');
          break;
        case 'gap':
        case 'chasm':
          messages.push('Molten stone flows and hardens. A bridge of obsidian spans the gap.');
          break;
        case 'seal_door':
          messages.push('Magma flows into the door frame, cooling into an impenetrable seal.');
          break;
        case 'fire_hazard':
          messages.push('A frozen gale extinguishes the flames instantly.');
          break;
        case 'poison_cloud':
          messages.push('The blizzard freezes the poison particles and clears the air.');
          break;
        case 'thin_wall':
        case 'phase_wall':
          messages.push('Your body turns to mist. You pass through the wall like a ghost.');
          break;
      }

      return {
        success: true,
        comboName: solution.comboName,
        comboKey: solution.comboKey,
        messages: messages,
        color: combo.color
      };
    },

    /**
     * Get all obstacles solvable with currently known combos.
     * Useful for UI hints.
     */
    getSolvableObstacles: function() {
      if (typeof PLAYER === 'undefined' || !PLAYER.knownCombos) return [];

      var solvable = [];
      for (var key in COMBINATIONS) {
        var combo = COMBINATIONS[key];
        if (PLAYER.knownCombos.indexOf(combo.name) === -1) continue;
        if (combo.utility && combo.utility.types) {
          combo.utility.types.forEach(function(type) {
            solvable.push({ type: type, comboName: combo.name, description: combo.utility.description });
          });
        }
      }
      return solvable;
    },

    // ========================================================
    // NPC TEACHING
    // ========================================================

    /**
     * NPC teaches a specific combo to the player.
     *
     * @param {string} npcName - 'Elden' or 'Mira'
     * @returns {object} { taught, comboName, messages[] }
     */
    npcTeachCombo: function(npcName) {
      var comboName = null;
      var teachMessages = [];

      switch (npcName) {
        case 'Elden':
          comboName = 'Reveal';
          teachMessages = [
            '"Shadow and Light," Elden murmurs, tracing runes in the air.',
            '"Two forces that deny each other. But forced together..."',
            '"They reveal what neither could alone. Remember this."'
          ];
          break;
        case 'Mira':
          comboName = 'Frost Lock';
          teachMessages = [
            'Mira presses a frozen crystal into your palm.',
            '"Ice seeks stone. Stone holds ice. Together, they lock the world in place."',
            '"Use it wisely. Some things, once frozen, never thaw."'
          ];
          break;
        default:
          return { taught: false, comboName: null, messages: ['This person has nothing to teach you about magic.'] };
      }

      var alreadyKnown = this.isKnown(comboName);
      if (alreadyKnown) {
        return {
          taught: false,
          comboName: comboName,
          messages: ['"You already know ' + comboName + '. Go. Use it well."']
        };
      }

      this.learnCombo(comboName);
      teachMessages.push('You have learned ' + comboName + '!');

      return {
        taught: true,
        comboName: comboName,
        messages: teachMessages
      };
    },

    // ========================================================
    // COMBAT INTEGRATION HELPERS
    // ========================================================

    /**
     * Get the effective enemy stats after light modifiers.
     * Returns a modified copy — does NOT mutate the original enemy.
     *
     * @param {string} enemyType
     * @param {object} enemy - the enemy instance from combat
     * @returns {object} { modifiedEnemy, messages[] }
     */
    applyLightModsToEnemy: function(enemyType, enemy) {
      var mods = this.getCreatureModifiers(enemyType);
      var modifiedEnemy = {};
      for (var k in enemy) {
        modifiedEnemy[k] = enemy[k];
      }

      var messages = [];

      // Apply AC modifier
      if (mods.acMod !== 0) {
        modifiedEnemy.ac = Math.max(1, enemy.ac + mods.acMod);
        if (mods.acMod < 0) {
          messages.push(enemy.name + ' AC reduced to ' + modifiedEnemy.ac + ' (light weakness).');
        } else {
          messages.push(enemy.name + ' AC increased to ' + modifiedEnemy.ac + ' (darkness bonus).');
        }
      }

      // Apply damage modifier
      if (mods.damageMod !== 0) {
        modifiedEnemy.damageBonus = Math.max(0, enemy.damageBonus + mods.damageMod);
      }

      // Apply attack modifier
      if (mods.attackMod !== 0) {
        modifiedEnemy.attackMod = enemy.attackMod + mods.attackMod;
      }

      // First sight text
      if (mods.firstSightText) {
        messages.unshift(mods.firstSightText);
      }

      // Add hints
      mods.hints.forEach(function(hint) {
        messages.push(hint);
      });

      return {
        modifiedEnemy: modifiedEnemy,
        messages: messages,
        stunned: mods.stunned,
        stunnedTurns: mods.stunnedTurns || 0,
        flees: mods.flees,
        sunburstDamage: mods.sunburstDamage || 0,
        noFirstStrike: mods.noFirstStrike || false
      };
    },

    // ========================================================
    // DOT (DAMAGE OVER TIME) TRACKER
    // ========================================================

    /**
     * Active DOT effects on the current enemy.
     * Managed by combat scene integration.
     */
    _activeDots: [],
    _activeFreeze: 0,    // Turns remaining where enemy cannot act
    _activeSlow: 0,      // Turns remaining where enemy has -2 attack
    _dodgeAllRounds: 0,  // Turns remaining where player dodges all attacks

    /**
     * Apply a DOT effect from a combo result.
     */
    applyDot: function(dot) {
      if (dot && dot.rounds > 0) {
        this._activeDots.push({ rounds: dot.rounds, damagePerRound: dot.damagePerRound });
      }
    },

    /**
     * Apply freeze effect.
     */
    applyFreeze: function(turns) {
      this._activeFreeze = Math.max(this._activeFreeze, turns);
    },

    /**
     * Apply slow effect.
     */
    applySlow: function(turns) {
      this._activeSlow = Math.max(this._activeSlow, turns);
    },

    /**
     * Apply dodge-all effect.
     */
    applyDodgeAll: function(rounds) {
      this._dodgeAllRounds = Math.max(this._dodgeAllRounds, rounds);
    },

    /**
     * Process start of enemy turn. Returns:
     * { canAct, dotDamage, messages[] }
     */
    processEnemyTurnStart: function() {
      var messages = [];
      var dotDamage = 0;
      var canAct = true;
      var slowPenalty = 0;

      // Process DOTs
      var remainingDots = [];
      this._activeDots.forEach(function(dot) {
        dotDamage += dot.damagePerRound;
        messages.push('Burning! ' + dot.damagePerRound + ' fire damage.');
        dot.rounds--;
        if (dot.rounds > 0) remainingDots.push(dot);
      });
      this._activeDots = remainingDots;

      // Process freeze
      if (this._activeFreeze > 0) {
        canAct = false;
        messages.push('The enemy is FROZEN and cannot act!');
        this._activeFreeze--;
      }

      // Process slow
      if (this._activeSlow > 0) {
        slowPenalty = -2;
        messages.push('The enemy is SLOWED (-2 attack).');
        this._activeSlow--;
      }

      return {
        canAct: canAct,
        dotDamage: dotDamage,
        messages: messages,
        slowPenalty: slowPenalty
      };
    },

    /**
     * Check if player is in dodge-all mode.
     * Returns true if all attacks are dodged this round.
     */
    checkDodgeAll: function() {
      if (this._dodgeAllRounds > 0) {
        this._dodgeAllRounds--;
        return true;
      }
      return false;
    },

    /**
     * Reset all combat status effects (call at combat start/end).
     */
    resetCombatEffects: function() {
      this._activeDots = [];
      this._activeFreeze = 0;
      this._activeSlow = 0;
      this._dodgeAllRounds = 0;
    },

    // ========================================================
    // UI DATA: Element selector info for Phaser scene
    // ========================================================

    /**
     * Get element orb data for the combination UI.
     * Returns array of { name, color, x, y } for rendering 6 orbs.
     */
    getElementOrbLayout: function(centerX, centerY, radius) {
      centerX = centerX || 300;
      centerY = centerY || 250;
      radius = radius || 80;

      var orbs = [];
      for (var i = 0; i < ELEMENTS.length; i++) {
        var angle = (i / ELEMENTS.length) * Math.PI * 2 - Math.PI / 2; // Start from top
        orbs.push({
          name: ELEMENTS[i],
          color: ELEMENT_COLORS[ELEMENTS[i]],
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
          index: i
        });
      }
      return orbs;
    },

    /**
     * Get the visual flash parameters for a combo or light spell.
     * Used by Phaser scene for screenFlash.
     */
    getSpellFlash: function(spellNameOrTier) {
      // Check combinations
      for (var key in COMBINATIONS) {
        if (COMBINATIONS[key].name === spellNameOrTier) {
          return { color: COMBINATIONS[key].color, alpha: 0.35, duration: 400 };
        }
      }
      // Check light spells
      if (LIGHT_SPELLS[spellNameOrTier]) {
        var ls = LIGHT_SPELLS[spellNameOrTier];
        switch (spellNameOrTier) {
          case 'sunburst':
            return { color: 0xffffff, alpha: 0.9, duration: 800 };
          case 'darkvision':
            return { color: 0x6633aa, alpha: 0.3, duration: 500 };
          case 'torchlight':
            return { color: 0xffaa44, alpha: 0.2, duration: 300 };
          case 'spark':
            return { color: 0xffdd88, alpha: 0.1, duration: 200 };
        }
      }
      // Fireball scout
      if (spellNameOrTier === 'fireball_scout') {
        return { color: 0xff6600, alpha: 0.4, duration: 2000 };
      }
      return { color: 0xffffff, alpha: 0.2, duration: 200 };
    },

    // ========================================================
    // VERSION & DEBUG
    // ========================================================

    VERSION: '1.0.0',

    /**
     * Debug: dump current state to console.
     */
    debugState: function() {
      console.log('=== DX_SPELLS Debug ===');
      console.log('Known Combos:', typeof PLAYER !== 'undefined' ? PLAYER.knownCombos : 'N/A');
      console.log('Active Light Spell:', _activeLightSpell);
      console.log('Current Light Level:', computeLightLevel());
      console.log('Active DOTs:', this._activeDots);
      console.log('Freeze turns:', this._activeFreeze);
      console.log('Slow turns:', this._activeSlow);
      console.log('Dodge-All rounds:', this._dodgeAllRounds);
      console.log('Darkvision Scrolls:', typeof PLAYER !== 'undefined' ? PLAYER.darkvisionScrolls : 'N/A');
      console.log('=======================');
    }
  };

})();
