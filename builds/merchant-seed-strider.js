// ============================================================
// DUNGEON X — Merchant / Daily Seed / Strider Whispers Module
// Self-contained IIFE — exposes window.DX_MERCHANT, window.DX_SEED,
// and window.DX_STRIDER
// Version 0.3.0
// ============================================================

(function() {
  'use strict';

  // ============================================================
  //
  //  PART 1: DX_SEED — Daily Deterministic Seed System
  //  (Placed first because Merchant and Strider depend on it)
  //
  // ============================================================

  // ----------------------------------------------------------
  // djb2 hash: string -> 32-bit integer
  // ----------------------------------------------------------
  function djb2(str) {
    var hash = 5381;
    for (var i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
      hash = hash & hash; // convert to 32-bit int
    }
    return hash >>> 0; // unsigned
  }

  // ----------------------------------------------------------
  // Mulberry32 PRNG: deterministic 0-1 float from a 32-bit state
  // ----------------------------------------------------------
  function mulberry32(seed) {
    var t = (seed + 0x6D2B79F5) | 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // ----------------------------------------------------------
  // Dungeon Pool — 10 dungeons from the game spec
  // ----------------------------------------------------------
  var DUNGEON_POOL = [
    {
      id: 'whispering_crypts',
      name: 'The Whispering Crypts',
      themeColor: 0x6633aa,
      primaryEnemyType: 'undead',
      elementalTheme: 'shadow',
      floors: 3,
      difficulty: 2,
      fragment: 'Fragment of Dawn',
      description: 'Ancient burial vaults where the dead do not rest. Whispers follow you through every corridor.'
    },
    {
      id: 'goblin_warrens',
      name: 'Goblin Warrens',
      themeColor: 0x447722,
      primaryEnemyType: 'beast',
      elementalTheme: 'stone',
      floors: 3,
      difficulty: 1,
      fragment: 'Fragment of Dusk',
      description: 'A cramped labyrinth of narrow tunnels and crude traps. They are watching.'
    },
    {
      id: 'flooded_vaults',
      name: 'The Flooded Vaults',
      themeColor: 0x2266aa,
      primaryEnemyType: 'construct',
      elementalTheme: 'ice',
      floors: 4,
      difficulty: 4,
      fragment: 'Fragment of Storm',
      description: 'Submerged chambers where clockwork guardians still patrol. The water rises.'
    },
    {
      id: 'ember_depths',
      name: 'Ember Depths',
      themeColor: 0xcc4400,
      primaryEnemyType: 'demon',
      elementalTheme: 'fire',
      floors: 4,
      difficulty: 5,
      fragment: 'Fragment of Flame',
      description: 'The heat here would melt lesser resolve. Demons feast on the desperate.'
    },
    {
      id: 'frozen_abyss',
      name: 'The Frozen Abyss',
      themeColor: 0x44ccff,
      primaryEnemyType: 'ice_creature',
      elementalTheme: 'ice',
      floors: 4,
      difficulty: 5,
      fragment: 'Fragment of Frost',
      description: 'A chasm of endless cold. The ice has teeth here — and intentions.'
    },
    {
      id: 'shattered_halls',
      name: 'The Shattered Halls',
      themeColor: 0x998866,
      primaryEnemyType: 'mixed',
      elementalTheme: 'stone',
      floors: 4,
      difficulty: 6,
      fragment: 'Fragment of Stone',
      description: 'Once a great keep, now collapsed and overrun. The rubble hides many things.'
    },
    {
      id: 'howling_spire',
      name: 'The Howling Spire',
      themeColor: 0xccffcc,
      primaryEnemyType: 'wind',
      elementalTheme: 'wind',
      floors: 5,
      difficulty: 7,
      fragment: 'Fragment of Wind',
      description: 'A vertical nightmare. The wind screams through broken stone, and things ride the gale.'
    },
    {
      id: 'void_chambers',
      name: 'The Void Chambers',
      themeColor: 0x331166,
      primaryEnemyType: 'shadow',
      elementalTheme: 'shadow',
      floors: 5,
      difficulty: 8,
      fragment: 'Fragment of Shadow',
      description: 'Darkness so thick it has weight. Your torch means nothing here.'
    },
    {
      id: 'crystal_sanctum',
      name: 'The Crystal Sanctum',
      themeColor: 0xffffaa,
      primaryEnemyType: 'light',
      elementalTheme: 'light',
      floors: 5,
      difficulty: 9,
      fragment: 'Fragment of Light',
      description: 'Blinding radiance hides lethal guardians. The sanctum does not welcome visitors.'
    },
    {
      id: 'final_descent',
      name: 'The Final Descent',
      themeColor: 0xff0044,
      primaryEnemyType: 'all',
      elementalTheme: 'all',
      floors: 5,
      difficulty: 10,
      fragment: 'Fragment of Life',
      description: 'The last dungeon. Every horror you have faced waits here — and worse. The Sunstone lies beyond.'
    }
  ];

  // ----------------------------------------------------------
  // Cell types for dungeon grid
  // ----------------------------------------------------------
  var CELL = {
    EMPTY:       0,
    CORRIDOR:    1,
    ROOM:        2,
    LOCKED_DOOR: 3,
    TRAP:        4,
    CHEST:       5,
    STAIRS_DOWN: 6,
    ENEMY:       7,
    NPC:         8,
    SHRINE:      9,
    OBSTACLE:   10,
    STAIRS_UP:  11,
    KEY:        12,
    MARKING:    13
  };

  // ----------------------------------------------------------
  // Tavern rumor pool — 30 rumors, seed picks 3 per day
  // ----------------------------------------------------------
  var RUMOR_POOL = [
    "They say the Crypts breathe at night. Not the wind — the walls themselves.",
    "A knight went down last week. Came back without his shadow.",
    "The goblins have been quiet. That's never good.",
    "Someone found a golden key on floor three. Opened a door that wasn't there before.",
    "The Flooded Vaults are rising. Another foot of water since yesterday.",
    "A merchant in the Ember Depths? Aye. Dead merchant, mind you.",
    "The Frozen Abyss took four men last month. Sent back their boots. Just the boots.",
    "The Shattered Halls shift. Walls move when you're not looking.",
    "You can hear singing from the Howling Spire. Beautiful, they say. Before you die.",
    "The Void Chambers eat torchlight. Bring two. Or three. Or don't go.",
    "The Crystal Sanctum blinds you before it kills you. A mercy, perhaps.",
    "Nobody returns from the Final Descent. That's not rumor. That's record.",
    "The barkeep lost his brother down there. Doesn't talk about it. Ever.",
    "A cleric found a Fragment once. Said it whispered his daughter's name.",
    "The traps on floor two reset themselves. Every damn night.",
    "There's a shrine on floor three of the Crypts. Blessed me once. Cursed me twice.",
    "The creatures down there — they learn. Your patterns, your timing. Be unpredictable.",
    "I saw a man come back with a Fragment of Dawn. Eyes weren't the same after.",
    "The walls have markings. Old language. They say they're warnings. Or invitations.",
    "Gold's good, but torches are better. You can't spend coin in the dark.",
    "The locked doors — some lead to treasure. Some lead to things best left locked.",
    "An old ranger told me: the deeper floors have fewer enemies. But bigger ones.",
    "They found footprints in the Crypts. Going down. None coming back up.",
    "The constructs in the Vaults don't tire. Don't sleep. Don't forget.",
    "Some scrolls down there predate the kingdom. The words still have power.",
    "A mage tried to map the Spire once. Said the stairs go in directions that shouldn't exist.",
    "The demons in Ember Depths don't want your soul. They want your fear. It feeds them.",
    "If you find a shrine, choose carefully. The gods below are not the gods above.",
    "The Sunstone fragments call to each other. Collect enough and you'll hear the hum.",
    "An adventurer told me the Void Chambers showed her things. Things that haven't happened yet."
  ];

  // ----------------------------------------------------------
  // Wall marking pool
  // ----------------------------------------------------------
  var MARKING_POOL = [
    { text: 'TURN BACK', style: 'scratched' },
    { text: 'THE LIGHT LIES', style: 'carved' },
    { text: 'THREE LEFT THEN DOWN', style: 'chalk' },
    { text: 'HE STILL WALKS', style: 'blood' },
    { text: 'COUNT YOUR TORCHES', style: 'scratched' },
    { text: 'THE WATER REMEMBERS', style: 'carved' },
    { text: 'DO NOT OPEN THE FOURTH DOOR', style: 'chalk' },
    { text: 'SHE WAITS BELOW', style: 'blood' },
    { text: 'THE STONE SPEAKS TRUE', style: 'carved' },
    { text: 'I WAS HERE — I AM STILL HERE', style: 'scratched' },
    { text: 'THE FRAGMENT SINGS', style: 'chalk' },
    { text: 'PRAISE THE DAWN', style: 'carved' },
    { text: 'FEED THE SHRINE', style: 'blood' },
    { text: 'THE GOBLINS TRADE', style: 'chalk' },
    { text: 'FIVE WENT DOWN FOUR CAME BACK', style: 'scratched' },
    { text: 'THE KEY IS NOT THE ANSWER', style: 'carved' },
    { text: 'LISTEN', style: 'blood' },
    { text: 'THE WALLS HAVE TEETH', style: 'scratched' },
    { text: 'GOLD WEIGHS MORE THAN YOU THINK', style: 'chalk' },
    { text: 'THE LAST DESCENT HAS NO STAIRS UP', style: 'blood' }
  ];

  // ----------------------------------------------------------
  // Shrine effect pool
  // ----------------------------------------------------------
  var SHRINE_EFFECTS = [
    { name: 'Blessing of Vigor',    type: 'buff',  stat: 'maxHp',   value: 5,  description: '+5 Max HP' },
    { name: 'Blessing of Insight',  type: 'buff',  stat: 'maxMana', value: 5,  description: '+5 Max Mana' },
    { name: 'Blessing of Iron',     type: 'buff',  stat: 'ac',      value: 1,  description: '+1 AC' },
    { name: 'Blessing of the Keen', type: 'buff',  stat: 'attackMod',value: 1,  description: '+1 Attack' },
    { name: 'Blessing of Fortune',  type: 'buff',  stat: 'gold',    value: 20, description: '+20 Gold' },
    { name: 'Blessing of Light',    type: 'buff',  stat: 'torch',   value: 20, description: '+20 Torch' },
    { name: 'Curse of Frailty',     type: 'curse', stat: 'maxHp',   value: -3, description: '-3 Max HP' },
    { name: 'Curse of Fog',         type: 'curse', stat: 'maxMana', value: -3, description: '-3 Max Mana' },
    { name: 'Curse of Rust',        type: 'curse', stat: 'ac',      value: -1, description: '-1 AC' },
    { name: 'Curse of Fumbling',    type: 'curse', stat: 'attackMod',value: -1, description: '-1 Attack' },
    { name: 'Curse of the Miser',   type: 'curse', stat: 'gold',    value: -15,description: '-15 Gold' },
    { name: 'Curse of Darkness',    type: 'curse', stat: 'torch',   value: -15,description: '-15 Torch' }
  ];

  // ----------------------------------------------------------
  // DX_SEED public API
  // ----------------------------------------------------------
  var seed = {

    // Cell type constants (for external reference)
    CELL: CELL,

    // Dungeon pool (for external reference)
    DUNGEON_POOL: DUNGEON_POOL,

    // ----------------------------------------------------------
    // getSeed: returns today's seed as a 32-bit unsigned integer
    // ----------------------------------------------------------
    getSeed: function() {
      var now = new Date();
      var dateStr = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0');
      return djb2(dateStr);
    },

    // ----------------------------------------------------------
    // getSeedForDate: seed for a specific date string 'YYYY-MM-DD'
    // ----------------------------------------------------------
    getSeedForDate: function(dateStr) {
      return djb2(dateStr);
    },

    // ----------------------------------------------------------
    // seededRandom: deterministic float [0,1) from seed + index
    // Each unique (seed, index) pair produces the same result.
    // ----------------------------------------------------------
    seededRandom: function(seed, index) {
      return mulberry32(seed + index * 2654435761);
    },

    // ----------------------------------------------------------
    // seededInt: deterministic integer in [min, max] inclusive
    // ----------------------------------------------------------
    seededInt: function(seed, index, min, max) {
      return min + Math.floor(this.seededRandom(seed, index) * (max - min + 1));
    },

    // ----------------------------------------------------------
    // seededPick: pick a random element from an array
    // ----------------------------------------------------------
    seededPick: function(seed, index, arr) {
      return arr[Math.floor(this.seededRandom(seed, index) * arr.length)];
    },

    // ----------------------------------------------------------
    // seededShuffle: Fisher-Yates shuffle of array copy
    // ----------------------------------------------------------
    seededShuffle: function(seed, startIndex, arr) {
      var copy = arr.slice();
      for (var i = copy.length - 1; i > 0; i--) {
        var j = Math.floor(this.seededRandom(seed, startIndex + i) * (i + 1));
        var tmp = copy[i];
        copy[i] = copy[j];
        copy[j] = tmp;
      }
      return copy;
    },

    // ----------------------------------------------------------
    // getMerchantSeed: sub-seed for merchant inventory
    // ----------------------------------------------------------
    getMerchantSeed: function(baseSeed) {
      return djb2('merchant_' + baseSeed);
    },

    // ----------------------------------------------------------
    // getRumorSeed: sub-seed for NPC rumors
    // ----------------------------------------------------------
    getRumorSeed: function(baseSeed) {
      return djb2('rumor_' + baseSeed);
    },

    // ----------------------------------------------------------
    // getShrineSeed: sub-seed for shrine effects
    // ----------------------------------------------------------
    getShrineSeed: function(baseSeed) {
      return djb2('shrine_' + baseSeed);
    },

    // ----------------------------------------------------------
    // getDungeonOptions: returns 2-3 dungeon options for the
    //   notice board. Excludes Final Descent until 9 fragments
    //   are found (handled by caller). Seed determines selection.
    // ----------------------------------------------------------
    getDungeonOptions: function(baseSeed, fragmentCount) {
      fragmentCount = fragmentCount || 0;
      var available = DUNGEON_POOL.slice(0, 9); // Exclude Final Descent
      if (fragmentCount >= 9) {
        available.push(DUNGEON_POOL[9]); // Unlock Final Descent
      }

      var dungeonSeed = djb2('dungeons_' + baseSeed);
      var count = this.seededRandom(dungeonSeed, 0) < 0.4 ? 2 : 3;
      var shuffled = this.seededShuffle(dungeonSeed, 100, available);
      var options = shuffled.slice(0, count);

      // Attach today's rumors for each dungeon
      var rumorSeed = this.getRumorSeed(baseSeed);
      var rumorShuffled = this.seededShuffle(rumorSeed, 0, RUMOR_POOL);
      for (var i = 0; i < options.length; i++) {
        options[i] = JSON.parse(JSON.stringify(options[i])); // deep copy
        options[i].rumor = rumorShuffled[i] || rumorShuffled[0];
      }

      return options;
    },

    // ----------------------------------------------------------
    // getTavernRumors: returns 3 rumors for today
    // ----------------------------------------------------------
    getTavernRumors: function(baseSeed) {
      var rumorSeed = this.getRumorSeed(baseSeed);
      var shuffled = this.seededShuffle(rumorSeed, 50, RUMOR_POOL);
      return shuffled.slice(0, 3);
    },

    // ----------------------------------------------------------
    // getShrineEffect: returns a shrine effect for a given floor
    // ----------------------------------------------------------
    getShrineEffect: function(baseSeed, dungeonId, floorNum) {
      var shrineSeed = djb2('shrine_' + baseSeed + '_' + dungeonId + '_' + floorNum);
      var idx = Math.floor(this.seededRandom(shrineSeed, 0) * SHRINE_EFFECTS.length);
      return JSON.parse(JSON.stringify(SHRINE_EFFECTS[idx]));
    },

    // ----------------------------------------------------------
    // getWallMarkings: returns 1-2 markings for a floor
    // ----------------------------------------------------------
    getWallMarkings: function(baseSeed, dungeonId, floorNum) {
      var markSeed = djb2('marking_' + baseSeed + '_' + dungeonId + '_' + floorNum);
      var count = this.seededRandom(markSeed, 0) < 0.5 ? 1 : 2;
      var shuffled = this.seededShuffle(markSeed, 10, MARKING_POOL);
      return shuffled.slice(0, count);
    },

    // ----------------------------------------------------------
    // generateFloor: produces a 7x7 grid for a dungeon floor
    //
    // Returns:
    // {
    //   grid: 7x7 array of CELL constants,
    //   stairsUp: {x, y},
    //   stairsDown: {x, y},
    //   enemies: [{x, y, type}],
    //   chests: [{x, y, contents}],
    //   npc: {x, y, type} or null,
    //   traps: [{x, y, type}],
    //   shrine: {x, y, effect} or null,
    //   keys: [{x, y}],
    //   lockedDoors: [{x, y}],
    //   markings: [{x, y, text, style}]
    // }
    // ----------------------------------------------------------
    generateFloor: function(baseSeed, dungeonId, floorNum) {
      var floorSeed = djb2(baseSeed + '_' + dungeonId + '_' + floorNum);
      var idx = 0; // running index for seededRandom calls

      // Helper: next seeded random
      var self = this;
      function rng() {
        return self.seededRandom(floorSeed, idx++);
      }
      function rngInt(min, max) {
        return min + Math.floor(rng() * (max - min + 1));
      }

      // Initialize 7x7 grid to EMPTY
      var GRID_SIZE = 7;
      var grid = [];
      for (var y = 0; y < GRID_SIZE; y++) {
        grid[y] = [];
        for (var x = 0; x < GRID_SIZE; x++) {
          grid[y][x] = CELL.EMPTY;
        }
      }

      // Result containers
      var enemies = [];
      var chests = [];
      var traps = [];
      var keys = [];
      var lockedDoors = [];
      var markings = [];
      var npc = null;
      var shrine = null;

      // ------ Step 1: Place stairs_up at a random edge cell ------
      var edges = [];
      for (var i = 1; i < GRID_SIZE - 1; i++) {
        edges.push({ x: 0, y: i });           // left edge
        edges.push({ x: GRID_SIZE - 1, y: i }); // right edge
        edges.push({ x: i, y: 0 });           // top edge
        edges.push({ x: i, y: GRID_SIZE - 1 }); // bottom edge
      }
      var stairsUpIdx = Math.floor(rng() * edges.length);
      var stairsUp = edges[stairsUpIdx];
      grid[stairsUp.y][stairsUp.x] = CELL.STAIRS_UP;

      // ------ Step 2: Random walk to carve corridors ------
      // Target: ~60% of cells as corridors
      var targetCorridors = Math.floor(GRID_SIZE * GRID_SIZE * 0.6);
      var cx = stairsUp.x;
      var cy = stairsUp.y;
      var carved = 1;
      var directions = [
        { dx: 0, dy: -1 }, // N
        { dx: 1, dy: 0 },  // E
        { dx: 0, dy: 1 },  // S
        { dx: -1, dy: 0 }  // W
      ];
      var maxSteps = 200; // safety limit
      var step = 0;

      while (carved < targetCorridors && step < maxSteps) {
        step++;
        var dirIdx = Math.floor(rng() * 4);
        var dir = directions[dirIdx];
        var nx = cx + dir.dx;
        var ny = cy + dir.dy;

        if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
          cx = nx;
          cy = ny;
          if (grid[cy][cx] === CELL.EMPTY) {
            grid[cy][cx] = CELL.CORRIDOR;
            carved++;
          }
        }
      }

      // ------ Step 3: Place 2-3 rooms (2x2 open areas) ------
      var roomCount = rng() < 0.5 ? 2 : 3;
      var rooms = [];
      for (var r = 0; r < roomCount; r++) {
        var attempts = 0;
        while (attempts < 20) {
          attempts++;
          var rx = rngInt(0, GRID_SIZE - 2);
          var ry = rngInt(0, GRID_SIZE - 2);

          // Check the 2x2 area isn't overlapping stairs
          var canPlace = true;
          for (var ry2 = ry; ry2 <= ry + 1; ry2++) {
            for (var rx2 = rx; rx2 <= rx + 1; rx2++) {
              if (grid[ry2][rx2] === CELL.STAIRS_UP || grid[ry2][rx2] === CELL.ROOM) {
                canPlace = false;
              }
            }
          }
          if (canPlace) {
            for (var ry2 = ry; ry2 <= ry + 1; ry2++) {
              for (var rx2 = rx; rx2 <= rx + 1; rx2++) {
                grid[ry2][rx2] = CELL.ROOM;
              }
            }
            rooms.push({ x: rx, y: ry });
            break;
          }
        }
      }

      // ------ Step 4: Place stairs_down (furthest from stairs_up) ------
      var bestDist = -1;
      var stairsDown = { x: GRID_SIZE - 1 - stairsUp.x, y: GRID_SIZE - 1 - stairsUp.y };

      // Find the walkable cell furthest from stairs_up
      for (var sy = 0; sy < GRID_SIZE; sy++) {
        for (var sx = 0; sx < GRID_SIZE; sx++) {
          if (grid[sy][sx] === CELL.CORRIDOR || grid[sy][sx] === CELL.ROOM) {
            var dist = Math.abs(sx - stairsUp.x) + Math.abs(sy - stairsUp.y);
            if (dist > bestDist) {
              bestDist = dist;
              stairsDown = { x: sx, y: sy };
            }
          }
        }
      }
      grid[stairsDown.y][stairsDown.x] = CELL.STAIRS_DOWN;

      // ------ Step 5: Scatter enemies ------
      var enemyCount = floorNum * 2 + 1;
      var enemyTypes = ['shadow_lurker', 'frost_wraith', 'bone_revenant', 'goblin', 'demon_imp', 'ice_golem'];
      var placed = 0;
      var placeAttempts = 0;

      while (placed < enemyCount && placeAttempts < 100) {
        placeAttempts++;
        var ex = rngInt(0, GRID_SIZE - 1);
        var ey = rngInt(0, GRID_SIZE - 1);
        if (grid[ey][ex] === CELL.CORRIDOR || grid[ey][ex] === CELL.ROOM) {
          // Don't place too close to stairs_up (min 2 cells)
          var distFromStart = Math.abs(ex - stairsUp.x) + Math.abs(ey - stairsUp.y);
          if (distFromStart >= 2) {
            grid[ey][ex] = CELL.ENEMY;
            var eType = enemyTypes[Math.floor(rng() * enemyTypes.length)];
            enemies.push({ x: ex, y: ey, type: eType });
            placed++;
          }
        }
      }

      // ------ Step 6: Place 1-2 chests ------
      var chestCount = rng() < 0.6 ? 1 : 2;
      for (var c = 0; c < chestCount; c++) {
        placeAttempts = 0;
        while (placeAttempts < 50) {
          placeAttempts++;
          var chX = rngInt(0, GRID_SIZE - 1);
          var chY = rngInt(0, GRID_SIZE - 1);
          if (grid[chY][chX] === CELL.CORRIDOR || grid[chY][chX] === CELL.ROOM) {
            grid[chY][chX] = CELL.CHEST;
            // Generate chest contents based on floor
            var goldAmount = rngInt(5, 15) + floorNum * 3;
            var contents = { gold: goldAmount };
            if (rng() < 0.3) contents.potion = true;
            if (rng() < 0.15) contents.scroll = true;
            chests.push({ x: chX, y: chY, contents: contents });
            break;
          }
        }
      }

      // ------ Step 7: Place 0-1 NPC ------
      if (rng() < 0.4 + floorNum * 0.05) {
        placeAttempts = 0;
        while (placeAttempts < 30) {
          placeAttempts++;
          var npcX = rngInt(0, GRID_SIZE - 1);
          var npcY = rngInt(0, GRID_SIZE - 1);
          if (grid[npcY][npcX] === CELL.CORRIDOR || grid[npcY][npcX] === CELL.ROOM) {
            grid[npcY][npcX] = CELL.NPC;
            var npcTypes = ['lost_adventurer', 'wounded_soldier', 'mad_wizard', 'ghost', 'prisoner'];
            npc = { x: npcX, y: npcY, type: npcTypes[Math.floor(rng() * npcTypes.length)] };
            break;
          }
        }
      }

      // ------ Step 8: Place locked doors + keys ------
      var lockCount = Math.min(floorNum, 2);
      for (var l = 0; l < lockCount; l++) {
        // Place locked door
        placeAttempts = 0;
        var doorPlaced = false;
        while (placeAttempts < 30) {
          placeAttempts++;
          var dx = rngInt(1, GRID_SIZE - 2);
          var dy = rngInt(1, GRID_SIZE - 2);
          if (grid[dy][dx] === CELL.CORRIDOR) {
            // Check that door has walkable neighbors on at least 2 sides
            var walkableNeighbors = 0;
            if (dy > 0 && grid[dy - 1][dx] !== CELL.EMPTY) walkableNeighbors++;
            if (dy < GRID_SIZE - 1 && grid[dy + 1][dx] !== CELL.EMPTY) walkableNeighbors++;
            if (dx > 0 && grid[dy][dx - 1] !== CELL.EMPTY) walkableNeighbors++;
            if (dx < GRID_SIZE - 1 && grid[dy][dx + 1] !== CELL.EMPTY) walkableNeighbors++;
            if (walkableNeighbors >= 2) {
              grid[dy][dx] = CELL.LOCKED_DOOR;
              lockedDoors.push({ x: dx, y: dy });
              doorPlaced = true;
              break;
            }
          }
        }

        // Place corresponding key on accessible side of the door
        if (doorPlaced) {
          placeAttempts = 0;
          while (placeAttempts < 30) {
            placeAttempts++;
            var kx = rngInt(0, GRID_SIZE - 1);
            var ky = rngInt(0, GRID_SIZE - 1);
            if (grid[ky][kx] === CELL.CORRIDOR || grid[ky][kx] === CELL.ROOM) {
              grid[ky][kx] = CELL.KEY;
              keys.push({ x: kx, y: ky });
              break;
            }
          }
        }
      }

      // ------ Step 9: Place traps (density increases with floor) ------
      var trapCount = Math.floor(floorNum * 1.5);
      var trapTypes = ['spike', 'pit', 'dart', 'gas', 'collapse'];
      for (var t = 0; t < trapCount; t++) {
        placeAttempts = 0;
        while (placeAttempts < 30) {
          placeAttempts++;
          var tx = rngInt(0, GRID_SIZE - 1);
          var ty = rngInt(0, GRID_SIZE - 1);
          if (grid[ty][tx] === CELL.CORRIDOR) {
            var distFromStairs = Math.abs(tx - stairsUp.x) + Math.abs(ty - stairsUp.y);
            if (distFromStairs >= 2) {
              grid[ty][tx] = CELL.TRAP;
              traps.push({ x: tx, y: ty, type: trapTypes[Math.floor(rng() * trapTypes.length)] });
              break;
            }
          }
        }
      }

      // ------ Step 10: Place 0-1 shrine ------
      if (rng() < 0.35 + floorNum * 0.05) {
        placeAttempts = 0;
        while (placeAttempts < 30) {
          placeAttempts++;
          var shX = rngInt(0, GRID_SIZE - 1);
          var shY = rngInt(0, GRID_SIZE - 1);
          if (grid[shY][shX] === CELL.CORRIDOR || grid[shY][shX] === CELL.ROOM) {
            grid[shY][shX] = CELL.SHRINE;
            shrine = {
              x: shX,
              y: shY,
              effect: this.getShrineEffect(baseSeed, dungeonId, floorNum)
            };
            break;
          }
        }
      }

      // ------ Step 11: Place 1-2 wall markings on walkable cells ------
      var markingData = this.getWallMarkings(baseSeed, dungeonId, floorNum);
      for (var m = 0; m < markingData.length; m++) {
        placeAttempts = 0;
        while (placeAttempts < 30) {
          placeAttempts++;
          var mx = rngInt(0, GRID_SIZE - 1);
          var my = rngInt(0, GRID_SIZE - 1);
          if (grid[my][mx] === CELL.CORRIDOR) {
            grid[my][mx] = CELL.MARKING;
            markings.push({
              x: mx, y: my,
              text: markingData[m].text,
              style: markingData[m].style
            });
            break;
          }
        }
      }

      // ------ Ensure connectivity: fill any remaining EMPTY with CORRIDOR ------
      // This guarantees no unreachable areas
      for (var fy = 0; fy < GRID_SIZE; fy++) {
        for (var fx = 0; fx < GRID_SIZE; fx++) {
          if (grid[fy][fx] === CELL.EMPTY) {
            // Check if adjacent to any walkable cell
            var adjWalkable = false;
            if (fy > 0 && grid[fy - 1][fx] !== CELL.EMPTY) adjWalkable = true;
            if (fy < GRID_SIZE - 1 && grid[fy + 1][fx] !== CELL.EMPTY) adjWalkable = true;
            if (fx > 0 && grid[fy][fx - 1] !== CELL.EMPTY) adjWalkable = true;
            if (fx < GRID_SIZE - 1 && grid[fy][fx + 1] !== CELL.EMPTY) adjWalkable = true;
            if (adjWalkable) {
              grid[fy][fx] = CELL.OBSTACLE;
            } else {
              grid[fy][fx] = CELL.CORRIDOR; // make it walkable to ensure connectivity
            }
          }
        }
      }

      return {
        grid: grid,
        stairsUp: stairsUp,
        stairsDown: stairsDown,
        enemies: enemies,
        chests: chests,
        npc: npc,
        traps: traps,
        shrine: shrine,
        keys: keys,
        lockedDoors: lockedDoors,
        markings: markings,
        dungeonId: dungeonId,
        floorNum: floorNum,
        seed: floorSeed
      };
    },

    // ----------------------------------------------------------
    // getDungeonById: lookup dungeon data by id string
    // ----------------------------------------------------------
    getDungeonById: function(dungeonId) {
      for (var i = 0; i < DUNGEON_POOL.length; i++) {
        if (DUNGEON_POOL[i].id === dungeonId) {
          return JSON.parse(JSON.stringify(DUNGEON_POOL[i]));
        }
      }
      return null;
    },

    // ----------------------------------------------------------
    // getFloorCount: number of floors for a given dungeon
    // ----------------------------------------------------------
    getFloorCount: function(dungeonId) {
      var d = this.getDungeonById(dungeonId);
      return d ? d.floors : 3;
    }
  };


  // ============================================================
  //
  //  PART 2: DX_MERCHANT — The Tavern Merchant
  //  "Spend gold on torches, potions, spell scrolls.
  //   Preparation, not power creep."
  //
  // ============================================================

  // ----------------------------------------------------------
  // Master item catalog
  // ----------------------------------------------------------
  var ITEM_CATALOG = {

    // --- CONSUMABLES (always available) ---
    standard_torch: {
      id: 'standard_torch', name: 'Standard Torch', type: 'consumable',
      subtype: 'torch', baseCost: 5, maxStack: 5,
      effect: { stat: 'torch', value: 36, duration: 180 }, // 3 min = 180 ticks
      letter: 'T', color: 0xff8800,
      description: 'Burns for three minutes. A lifeline in the dark.',
      merchantLine: "That's a good torch. Burns long and true."
    },
    everlight_torch: {
      id: 'everlight_torch', name: 'Everlight Torch', type: 'consumable',
      subtype: 'torch', baseCost: 25, maxStack: 3,
      effect: { stat: 'torch', value: 120, duration: 600 }, // 10 min = 600 ticks
      letter: 'T', color: 0xffdd44,
      description: 'Burns ten minutes. Dwarf-forged oil. Worth every coin.',
      merchantLine: "Everlight. Dwarf-forged. Worth more than ye'd think."
    },
    health_potion: {
      id: 'health_potion', name: 'Health Potion', type: 'consumable',
      subtype: 'potion', baseCost: 15, maxStack: 5,
      effect: { stat: 'hp', value: 30 },
      letter: 'P', color: 0xff4444,
      description: 'Restores 30 hit points. Tastes foul. Works fast.',
      merchantLine: "Tastes like death, works like salvation."
    },
    mana_potion: {
      id: 'mana_potion', name: 'Mana Potion', type: 'consumable',
      subtype: 'potion', baseCost: 15, maxStack: 5,
      effect: { stat: 'mana', value: 25 },
      letter: 'M', color: 0x4488ff,
      description: 'Restores 25 mana. The blue glow is genuine.',
      merchantLine: "Pure cerulean. None of that watered-down rubbish."
    },
    bread: {
      id: 'bread', name: 'Bread', type: 'consumable',
      subtype: 'food', baseCost: 3, maxStack: 10,
      effect: { stat: 'food', value: 20, percent: true },
      letter: 'B', color: 0xddaa66,
      description: 'Day-old bread. Restores 20% of your food bar.',
      merchantLine: "Baked this morning. Well. Yesterday morning."
    },
    water_flask: {
      id: 'water_flask', name: 'Water Flask', type: 'consumable',
      subtype: 'water', baseCost: 3, maxStack: 10,
      effect: { stat: 'water', value: 25, percent: true },
      letter: 'W', color: 0x66aadd,
      description: 'Clean water. Restores 25% of your water bar.',
      merchantLine: "Fresh from the well. Well, the rain barrel."
    },
    dried_meat: {
      id: 'dried_meat', name: 'Dried Meat', type: 'consumable',
      subtype: 'food', baseCost: 8, maxStack: 5,
      effect: { stat: 'food', value: 40, percent: true },
      letter: 'D', color: 0x884422,
      description: 'Salted and dried. Restores 40% of your food bar.',
      merchantLine: "Don't ask what kind of meat. Just eat it."
    },
    antidote: {
      id: 'antidote', name: 'Antidote', type: 'consumable',
      subtype: 'cure', baseCost: 10, maxStack: 3,
      effect: { cure: 'poison' },
      letter: 'A', color: 0x44dd44,
      description: 'Cures poison. Bitter going down, sweet relief after.',
      merchantLine: "Bitter as regret. But it works."
    },

    // --- SCROLLS (1-2 available per day, seed-selected) ---
    scroll_reveal: {
      id: 'scroll_reveal', name: 'Scroll of Reveal', type: 'scroll',
      baseCost: 30, maxStack: 1,
      effect: { spell: 'Reveal', combo: 'Light+Shadow', uses: 1 },
      letter: 'S', color: 0xddddff,
      description: 'Cast the Shadow+Light combination once. Reveals hidden passages.',
      merchantLine: "One use. Make it count. Reveals what's hidden."
    },
    scroll_inferno: {
      id: 'scroll_inferno', name: 'Scroll of Inferno', type: 'scroll',
      baseCost: 35, maxStack: 1,
      effect: { spell: 'Inferno Gust', combo: 'Fire+Wind', uses: 1 },
      letter: 'S', color: 0xff6600,
      description: 'Cast the Fire+Wind combination once. Burns everything.',
      merchantLine: "Handle with care. Very much with care."
    },
    scroll_frost_lock: {
      id: 'scroll_frost_lock', name: 'Scroll of Frost Lock', type: 'scroll',
      baseCost: 35, maxStack: 1,
      effect: { spell: 'Frost Lock', combo: 'Ice+Stone', uses: 1 },
      letter: 'S', color: 0x66aacc,
      description: 'Cast the Ice+Stone combination once. Freezes mechanisms and foes.',
      merchantLine: "Cold enough to stop time. Briefly."
    },
    scroll_sunburst: {
      id: 'scroll_sunburst', name: 'Scroll of Sunburst', type: 'scroll',
      baseCost: 40, maxStack: 1,
      effect: { spell: 'Sunburst', illumination: true, duration: 3 },
      letter: 'S', color: 0xffffaa,
      description: 'Full room illumination for three seconds. No shadow survives.',
      merchantLine: "Like daylight underground. The creatures hate it."
    },
    scroll_darkvision: {
      id: 'scroll_darkvision', name: 'Scroll of Darkvision', type: 'scroll',
      baseCost: 50, maxStack: 1,
      effect: { spell: 'Darkvision', seeInDark: true, duration: 60 },
      letter: 'S', color: 0xaa88ff,
      description: 'See without light for one full minute. Your eyes adapt.',
      merchantLine: "See in the dark. Like the creatures do."
    },

    // --- GEAR (1-2 available per day, class-filtered by seed) ---
    iron_shield: {
      id: 'iron_shield', name: 'Iron Shield', type: 'gear',
      subtype: 'shield', baseCost: 40, maxStack: 1,
      classRestriction: 'Fighter',
      effect: { stat: 'ac', value: 2, equip: true, slot: 'shield' },
      letter: 'H', color: 0x888899,
      description: '+2 AC. Heavy iron. Stops what your armor misses.',
      merchantLine: "Iron from the northern mines. Nothing gets through."
    },
    sturdy_bow: {
      id: 'sturdy_bow', name: 'Sturdy Bow', type: 'gear',
      subtype: 'weapon', baseCost: 45, maxStack: 1,
      classRestriction: 'Ranger',
      effect: { stat: 'attackMod', value: 2, equip: true, slot: 'weapon', ranged: true },
      letter: 'B', color: 0x886633,
      description: '+2 ranged attack. Yew wood, sinew string.',
      merchantLine: "Yew and sinew. Shoots true even in the dark."
    },
    crystal_staff: {
      id: 'crystal_staff', name: 'Crystal Staff', type: 'gear',
      subtype: 'weapon', baseCost: 50, maxStack: 1,
      classRestriction: 'Mage',
      effect: { stat: 'maxMana', value: 5, equip: true, slot: 'weapon' },
      letter: 'F', color: 0xaa88ff,
      description: '+5 max mana. The crystal pulses with residual enchantment.',
      merchantLine: "Feel that hum? That's power, that is."
    },
    holy_symbol: {
      id: 'holy_symbol', name: 'Holy Symbol', type: 'gear',
      subtype: 'accessory', baseCost: 45, maxStack: 1,
      classRestriction: 'Cleric',
      effect: { stat: 'healPower', value: 2, equip: true, slot: 'ring' },
      letter: 'Y', color: 0xffff66,
      description: '+2 healing power. Silver, blessed by the old rites.',
      merchantLine: "Blessed by the abbess herself. Before she went below."
    },
    throwing_daggers: {
      id: 'throwing_daggers', name: 'Throwing Daggers (x5)', type: 'gear',
      subtype: 'throwable', baseCost: 20, maxStack: 3,
      classRestriction: null, // Any class
      effect: { damage: { dice: 4, count: 1 }, ranged: true, uses: 5 },
      letter: 'K', color: 0xcccccc,
      description: 'Five balanced blades. d4 damage each. Throw and pray.',
      merchantLine: "Balanced for throwing. Balanced for killing."
    },
    fire_arrows: {
      id: 'fire_arrows', name: 'Fire Arrows (x5)', type: 'gear',
      subtype: 'ammo', baseCost: 25, maxStack: 3,
      classRestriction: 'Ranger',
      effect: { damage: { dice: 4, count: 1 }, element: 'fire', uses: 5 },
      letter: 'F', color: 0xff4400,
      description: '+d4 fire damage per arrow. Five in the quiver.',
      merchantLine: "Alchemist tips. Burn on impact. Mind your fingers."
    },
    poison_vial: {
      id: 'poison_vial', name: 'Poison Vial', type: 'gear',
      subtype: 'coating', baseCost: 15, maxStack: 3,
      classRestriction: null,
      effect: { coating: 'poison', hits: 3, dotDamage: 2, dotRounds: 3 },
      letter: 'V', color: 0x44aa44,
      description: 'Coat your weapon. Poisons for 3 hits, 2 damage per round for 3 rounds.',
      merchantLine: "Three coats on the blade. Three chances for agony."
    },
    fire_oil: {
      id: 'fire_oil', name: 'Fire Oil', type: 'gear',
      subtype: 'coating', baseCost: 15, maxStack: 3,
      classRestriction: null,
      effect: { coating: 'fire', hits: 3, bonusDamage: 3 },
      letter: 'O', color: 0xff6600,
      description: 'Coat your weapon. +3 fire damage for 3 hits.',
      merchantLine: "Smells like brimstone. That's how you know it works."
    }
  };

  // List of all consumable IDs (always available)
  var CONSUMABLE_IDS = [
    'standard_torch', 'everlight_torch', 'health_potion', 'mana_potion',
    'bread', 'water_flask', 'dried_meat', 'antidote'
  ];

  // List of all scroll IDs
  var SCROLL_IDS = [
    'scroll_reveal', 'scroll_inferno', 'scroll_frost_lock',
    'scroll_sunburst', 'scroll_darkvision'
  ];

  // List of all gear IDs
  var GEAR_IDS = [
    'iron_shield', 'sturdy_bow', 'crystal_staff', 'holy_symbol',
    'throwing_daggers', 'fire_arrows', 'poison_vial', 'fire_oil'
  ];

  // ----------------------------------------------------------
  // Merchant dialogue lines
  // ----------------------------------------------------------
  var MERCHANT_LINES = {
    greeting: [
      "What'll it be, traveler? I've things that'll keep ye breathing down there.",
      "Ah, another brave soul. Or foolish one. Browse my wares.",
      "Welcome, welcome. Everything ye need for the deep places.",
      "Step closer. I don't bite. The things below, however...",
      "Gold burns a hole in the pocket. Best spend it on survival.",
      "Morning. Or is it evening? Hard to tell down here. What'll ye have?",
      "Back again? Good. Means ye survived. Let's keep it that way.",
      "The dead don't shop, friend. So ye're already ahead."
    ],
    buy: [
      "A wise purchase.",
      "Ye'll need that, mark my words.",
      "Good choice. That one's saved more than a few.",
      "Sold. May it serve ye well in the dark.",
      "Pleasure doing business. Come back breathing.",
      "Fine taste. That'll keep ye alive another floor, at least.",
      "Done. Use it wisely — I can't sell ye a second life."
    ],
    sell: [
      "I'll take it off your hands. Fair price.",
      "Hmm. Serviceable. I'll give ye what it's worth.",
      "Selling already? The dungeon must have been generous.",
      "One person's burden is another's inventory. Done.",
      "I'll find a buyer. Here's your coin.",
      "A trade, then. Fair enough."
    ],
    broke: [
      "Coin talks, friend. Come back when yours does.",
      "I'm a merchant, not a charity. Find some gold first.",
      "Empty pockets buy nothing. Try the chests below.",
      "No gold, no goods. That's the arrangement.",
      "I'd love to help. I'd also love to be paid.",
      "Come back with coin. The dungeon's full of it — if ye live."
    ],
    farewell: [
      "Come back alive, eh? Bad for business otherwise.",
      "Good fortune, traveler. Don't waste what I sold ye.",
      "Off ye go. The dark awaits. And so do I, when ye return.",
      "Stay sharp. The dungeon doesn't forgive carelessness.",
      "Until next time. Assuming there is a next time.",
      "Safe travels. Well — safe as they can be down there.",
      "May your torch outlast your enemies."
    ],
    haggle: [
      "My prices are fair. Fairer than what the dungeon charges.",
      "Haggling? With me? Bold. But no.",
      "The price is the price. Take it or face the dark without it."
    ]
  };

  // ----------------------------------------------------------
  // DX_MERCHANT public API
  // ----------------------------------------------------------
  var merchant = {

    // Reference to the item catalog
    ITEM_CATALOG: ITEM_CATALOG,

    // ----------------------------------------------------------
    // getShopInventory: returns today's available items
    //   dailySeed: today's seed from DX_SEED.getSeed()
    //   playerClass: 'Fighter', 'Ranger', 'Mage', 'Cleric'
    //
    // Returns array of item objects from ITEM_CATALOG with
    //   an added 'available' count.
    // ----------------------------------------------------------
    getShopInventory: function(dailySeed, playerClass) {
      var merchantSeed = seed.getMerchantSeed(dailySeed);
      var inventory = [];
      var idx = 0;

      // --- All consumables are always available ---
      for (var i = 0; i < CONSUMABLE_IDS.length; i++) {
        var item = JSON.parse(JSON.stringify(ITEM_CATALOG[CONSUMABLE_IDS[i]]));
        item.available = item.maxStack;
        inventory.push(item);
      }

      // --- 1-2 scrolls, seeded ---
      var scrollCount = seed.seededRandom(merchantSeed, idx++) < 0.5 ? 1 : 2;
      var scrollOrder = seed.seededShuffle(merchantSeed, 200, SCROLL_IDS);
      for (var s = 0; s < scrollCount; s++) {
        var scrollItem = JSON.parse(JSON.stringify(ITEM_CATALOG[scrollOrder[s]]));
        scrollItem.available = 1;
        inventory.push(scrollItem);
      }

      // --- 1-2 gear, class-filtered, seeded ---
      var gearCount = seed.seededRandom(merchantSeed, idx++) < 0.5 ? 1 : 2;

      // Filter gear: include items that match player class or have no restriction
      var classGear = [];
      for (var g = 0; g < GEAR_IDS.length; g++) {
        var gearDef = ITEM_CATALOG[GEAR_IDS[g]];
        if (!gearDef.classRestriction || gearDef.classRestriction === playerClass) {
          classGear.push(GEAR_IDS[g]);
        }
      }

      var gearOrder = seed.seededShuffle(merchantSeed, 300, classGear);
      for (var gi = 0; gi < gearCount && gi < gearOrder.length; gi++) {
        var gearItem = JSON.parse(JSON.stringify(ITEM_CATALOG[gearOrder[gi]]));
        gearItem.available = 1;
        inventory.push(gearItem);
      }

      return inventory;
    },

    // ----------------------------------------------------------
    // getPrice: returns CHA-adjusted price for an item
    //   itemId: string ID from ITEM_CATALOG
    //   chaMod: CHA modifier ( Math.floor((cha - 10) / 2) )
    //
    // Formula: price = baseCost * (1 - (chaMod * 0.05))
    //   CHA 18 (+4 mod) = 20% discount
    //   CHA 8 (-1 mod) = 5% markup
    //   Minimum price: 1 gold
    // ----------------------------------------------------------
    getPrice: function(itemId, chaMod) {
      var item = ITEM_CATALOG[itemId];
      if (!item) return 0;
      chaMod = chaMod || 0;
      var multiplier = 1 - (chaMod * 0.05);
      var price = Math.max(1, Math.round(item.baseCost * multiplier));
      return price;
    },

    // ----------------------------------------------------------
    // getSellPrice: returns sell-back price (40% of base)
    // ----------------------------------------------------------
    getSellPrice: function(itemId) {
      var item = ITEM_CATALOG[itemId];
      if (!item) return 0;
      return Math.max(1, Math.floor(item.baseCost * 0.4));
    },

    // ----------------------------------------------------------
    // buyItem: attempt to purchase an item
    //   itemId: string ID
    //   player: reference to PLAYER object (needs .gold, .cha, .inventory)
    //
    // Returns:
    //   { success: true, message: '...', item: {...} } or
    //   { success: false, message: '...' }
    // ----------------------------------------------------------
    buyItem: function(itemId, player) {
      var item = ITEM_CATALOG[itemId];
      if (!item) {
        return { success: false, message: "I don't carry that." };
      }

      var chaMod = Math.floor((player.cha - 10) / 2);
      var price = this.getPrice(itemId, chaMod);

      // Check gold
      if ((player.gold || 0) < price) {
        return {
          success: false,
          message: this.getMerchantLine('broke'),
          price: price
        };
      }

      // Check stack limit in player inventory
      var currentCount = 0;
      if (player.inventory) {
        for (var i = 0; i < player.inventory.length; i++) {
          if (player.inventory[i].id === itemId) {
            currentCount++;
          }
        }
      }
      if (currentCount >= item.maxStack) {
        return {
          success: false,
          message: "Ye're carrying all ye can of those. No more room.",
          price: price
        };
      }

      // Deduct gold, add item
      player.gold = (player.gold || 0) - price;
      if (!player.inventory) player.inventory = [];

      // Create inventory entry
      var invItem = {
        id: item.id,
        name: item.name,
        type: item.type,
        subtype: item.subtype || item.type,
        letter: item.letter,
        color: item.color,
        effect: JSON.parse(JSON.stringify(item.effect)),
        description: item.description
      };

      // Add class restriction info if relevant
      if (item.classRestriction) {
        invItem.classRestriction = item.classRestriction;
      }

      player.inventory.push(invItem);

      return {
        success: true,
        message: this.getMerchantLine('buy'),
        item: invItem,
        price: price
      };
    },

    // ----------------------------------------------------------
    // sellItem: sell an item back at 40% value
    //   itemId: string ID of item to sell
    //   player: reference to PLAYER object
    //   inventoryIndex: index in player.inventory to remove
    //
    // Returns:
    //   { success: true, message: '...', goldReceived: N } or
    //   { success: false, message: '...' }
    // ----------------------------------------------------------
    sellItem: function(itemId, player, inventoryIndex) {
      if (!player.inventory || inventoryIndex < 0 || inventoryIndex >= player.inventory.length) {
        return { success: false, message: "Nothing to sell." };
      }

      var invItem = player.inventory[inventoryIndex];
      if (invItem.id !== itemId) {
        return { success: false, message: "That item doesn't match." };
      }

      var sellPrice = this.getSellPrice(itemId);

      // Remove from inventory and add gold
      player.inventory.splice(inventoryIndex, 1);
      player.gold = (player.gold || 0) + sellPrice;

      return {
        success: true,
        message: this.getMerchantLine('sell'),
        goldReceived: sellPrice
      };
    },

    // ----------------------------------------------------------
    // getMerchantLine: returns a contextual dialogue line
    //   context: 'greeting', 'buy', 'sell', 'broke', 'farewell', 'haggle'
    // ----------------------------------------------------------
    getMerchantLine: function(context) {
      var lines = MERCHANT_LINES[context];
      if (!lines || lines.length === 0) {
        return "...";
      }
      return lines[Math.floor(Math.random() * lines.length)];
    },

    // ----------------------------------------------------------
    // getItemInfo: returns full item data from catalog
    // ----------------------------------------------------------
    getItemInfo: function(itemId) {
      var item = ITEM_CATALOG[itemId];
      if (!item) return null;
      return JSON.parse(JSON.stringify(item));
    },

    // ----------------------------------------------------------
    // getItemDescription: returns the flavor text for an item
    // ----------------------------------------------------------
    getItemDescription: function(itemId) {
      var item = ITEM_CATALOG[itemId];
      return item ? item.description : '';
    },

    // ----------------------------------------------------------
    // getAllItemIds: returns all available item IDs by category
    // ----------------------------------------------------------
    getAllItemIds: function() {
      return {
        consumables: CONSUMABLE_IDS.slice(),
        scrolls: SCROLL_IDS.slice(),
        gear: GEAR_IDS.slice()
      };
    }
  };


  // ============================================================
  //
  //  PART 3: DX_STRIDER — The Strider Effect
  //  "After 5+ runs, tavern NPCs whisper about the player's
  //   achievements. Translucent text fading in/out at screen edges."
  //
  // ============================================================

  // ----------------------------------------------------------
  // Whisper templates organized by tier
  // Each template can use {title}, {kills}, {fragments},
  // {deepest}, {runs}, {class}, {gold}, {deaths}
  // ----------------------------------------------------------
  var WHISPER_TIERS = {

    // 5-9 runs: Curious
    curious: [
      "...a newcomer, but persistent...",
      "...they've gone below five times now. Some don't go once...",
      "...{title}, they call them. For now...",
      "...not many return from floor {deepest}. This one did...",
      "...killed {kills} so far. The count will grow...",
      "...a {class} with something to prove...",
      "...the barkeep watches them. Sizing them up...",
      "...they say {title} found something down there...",
      "...five runs. Most quit after one...",
      "...quiet one, that. But the blade speaks loud enough...",
      "...coin flows through their hands... {gold} pieces earned, they reckon...",
      "...the torches burn longer for some. Perhaps for this one..."
    ],

    // 10-24 runs: Respectful
    respectful: [
      "...they've earned their place at the bar...",
      "...{kills} creatures slain. The dungeon takes notice...",
      "...{runs} times below. The regulars are starting to remember the name...",
      "...reached floor {deepest}... deeper than most dare to dream...",
      "...found {fragments} fragments, they did... more than most ever find...",
      "...a {class} of uncommon skill, they say...",
      "...{title}. The name carries weight now...",
      "...the old-timers nod when they walk in. That means something...",
      "...I heard they cleared the third floor without a torch. Mad or brilliant...",
      "...gold flows through their hands like water... {gold} pieces earned...",
      "...the merchant saves the good stock for {title}...",
      "...they move different now. Seen too much to flinch...",
      "...the ghosts whisper their name in the corridors...",
      "...even the rats give them a wide berth..."
    ],

    // 25-49 runs: Awed
    awed: [
      "...few have seen what they have seen...",
      "...{kills} kills. The dungeon bleeds because of them...",
      "...floor {deepest}. The stones remember their footsteps...",
      "...{fragments} fragments gathered. The Sunstone stirs...",
      "...{title}. Say it with respect or don't say it at all...",
      "...{runs} descents. Each one a story the bards should tell...",
      "...a {class} of terrifying competence...",
      "...the creatures below know their scent now. And they fear it...",
      "...they carry themselves like someone who has stared into the void...",
      "...and the void blinked first...",
      "...the barkeep pours their drink before they sit. Always the same seat...",
      "...gold means nothing to one who has held a Fragment...",
      "...the merchant offers discounts. Not from charity. From respect...",
      "...I watched them come up from the Crypts once. Their eyes had changed...",
      "...the dead below speak of {title} in hushed tones...",
      "...even the Crypts fear them...",
      "...they walk among us, but they belong to the deep now..."
    ],

    // 50+ runs: Legendary
    legendary: [
      "...they say the Sunstone itself calls to them...",
      "...{title}. A name the dungeon itself has learned to dread...",
      "...{kills} souls sent to the other side. An army's worth...",
      "...floor {deepest}. Where the light has never reached. They reached it...",
      "...{fragments} fragments. The final pieces tremble when they draw near...",
      "...{runs} descents. Not a delve — a reign...",
      "...a {class} of legend. The kind they'll write about when this is over...",
      "...the walls shift when they enter. The dungeon rearranges in respect...",
      "...or in fear. Hard to tell the difference down there...",
      "...the barkeep speaks of one who carries the Fragment of Dawn...",
      "...they don't enter the dungeon. The dungeon admits them...",
      "...I saw them smile once. At a locked door. The door opened...",
      "...the old gods left these halls long ago. Now {title} walks them...",
      "...they say death bowed once. To {title}. Just once...",
      "...the creatures below have a word for them. It translates roughly to 'inevitable'...",
      "...{gold} pieces of gold have passed through those hands. A king's fortune...",
      "...when {title} descends, the torches on floor one go out. In tribute...",
      "...some say they've seen the bottom. The true bottom. And walked back up...",
      "...the Fragment of Life waits for one worthy. It has been waiting a long time...",
      "...this is not an adventurer. This is a force of nature wearing armor...",
      "...legends speak of the one who would unite the fragments. They're sitting right there...",
      "...they carry the weight of {deaths} deaths. Each one made them stronger...",
      "...the final descent awaits. And for the first time, it should be afraid..."
    ]
  };

  // ----------------------------------------------------------
  // Edge positions for whisper placement
  // ----------------------------------------------------------
  var EDGE_POSITIONS = [
    { name: 'top',    x: 400, y: 20,  anchorX: 0.5, anchorY: 0 },
    { name: 'bottom', x: 400, y: 580, anchorX: 0.5, anchorY: 1 },
    { name: 'left',   x: 15,  y: 300, anchorX: 0,   anchorY: 0.5 },
    { name: 'right',  x: 785, y: 300, anchorX: 1,   anchorY: 0.5 }
  ];

  // ----------------------------------------------------------
  // DX_STRIDER public API
  // ----------------------------------------------------------
  var strider = {

    // Internal state
    _scene: null,
    _timer: null,
    _active: false,
    _currentText: null,
    _minInterval: 15000,
    _maxInterval: 30000,

    // ----------------------------------------------------------
    // shouldActivate: returns true if 5+ runs completed
    // ----------------------------------------------------------
    shouldActivate: function(metaData) {
      if (!metaData) return false;
      return (metaData.totalRuns || 0) >= 5;
    },

    // ----------------------------------------------------------
    // getTier: returns the whisper tier based on run count
    // ----------------------------------------------------------
    getTier: function(totalRuns) {
      if (totalRuns >= 50) return 'legendary';
      if (totalRuns >= 25) return 'awed';
      if (totalRuns >= 10) return 'respectful';
      return 'curious';
    },

    // ----------------------------------------------------------
    // getWhisper: returns a stat-filled whisper string
    //   metaData: object from DX_SAVE.loadMeta() with:
    //     totalRuns, totalKills, fragmentCount, deepestFloor,
    //     reputationTitle, totalGoldEarned, totalDeaths,
    //     and optionally playerClass
    // ----------------------------------------------------------
    getWhisper: function(metaData) {
      if (!metaData) return '...';

      var tier = this.getTier(metaData.totalRuns || 0);
      var pool = WHISPER_TIERS[tier];
      if (!pool || pool.length === 0) return '...';

      // Pick a random whisper from the tier
      var template = pool[Math.floor(Math.random() * pool.length)];

      // Fill in template variables
      var whisper = template
        .replace(/\{title\}/g,     metaData.reputationTitle || 'Unknown Stranger')
        .replace(/\{kills\}/g,     String(metaData.totalKills || 0))
        .replace(/\{fragments\}/g, String(metaData.fragmentCount || 0))
        .replace(/\{deepest\}/g,   String(metaData.deepestFloor || 1))
        .replace(/\{runs\}/g,      String(metaData.totalRuns || 0))
        .replace(/\{class\}/g,     metaData.playerClass || 'adventurer')
        .replace(/\{gold\}/g,      String(metaData.totalGoldEarned || 0))
        .replace(/\{deaths\}/g,    String(metaData.totalDeaths || 0));

      return whisper;
    },

    // ----------------------------------------------------------
    // init: starts the whisper system in a Phaser scene
    //   scene: reference to TavernScene (Phaser.Scene)
    //   metaData: optional, if not provided reads from DX_SAVE
    // ----------------------------------------------------------
    init: function(scene, metaData) {
      this.stop(); // Clean up any existing timer

      this._scene = scene;
      this._active = true;

      // Get meta data
      var meta = metaData;
      if (!meta && typeof window.DX_SAVE !== 'undefined') {
        meta = window.DX_SAVE.loadMeta();
      }

      if (!meta || !this.shouldActivate(meta)) {
        this._active = false;
        return;
      }

      // Store meta for whisper generation
      this._meta = meta;

      // Schedule first whisper after a short delay
      var self = this;
      this._timer = scene.time.delayedCall(3000, function() {
        self._showWhisper();
      });
    },

    // ----------------------------------------------------------
    // stop: clears all whisper timers and removes active text
    // ----------------------------------------------------------
    stop: function() {
      this._active = false;

      if (this._timer) {
        if (this._timer.remove) {
          this._timer.remove();
        }
        this._timer = null;
      }

      if (this._currentText) {
        this._currentText.destroy();
        this._currentText = null;
      }

      this._scene = null;
      this._meta = null;
    },

    // ----------------------------------------------------------
    // _showWhisper: internal — display a whisper with fade animation
    // ----------------------------------------------------------
    _showWhisper: function() {
      if (!this._active || !this._scene || !this._meta) return;

      var scene = this._scene;
      var self = this;

      // Destroy previous text if still lingering
      if (this._currentText) {
        this._currentText.destroy();
        this._currentText = null;
      }

      // Pick random edge position
      var edge = EDGE_POSITIONS[Math.floor(Math.random() * EDGE_POSITIONS.length)];

      // Add slight random offset to prevent repetitive placement
      var offsetX = (Math.random() - 0.5) * 200;
      var offsetY = (Math.random() - 0.5) * 80;
      var posX = edge.x + offsetX;
      var posY = edge.y + offsetY;

      // Clamp to screen bounds
      posX = Math.max(10, Math.min(790, posX));
      posY = Math.max(10, Math.min(590, posY));

      // Generate whisper text
      var whisperText = this.getWhisper(this._meta);

      // Determine max width based on edge
      var maxWidth = 350;
      if (edge.name === 'left' || edge.name === 'right') {
        maxWidth = 250;
      }

      // Create text object — parchment gold, italic, translucent
      var text = scene.add.text(posX, posY, whisperText, {
        fontSize: '14px',
        fontFamily: 'monospace',
        fontStyle: 'italic',
        color: '#c8b48c',       // parchment gold rgb(200, 180, 140)
        wordWrap: { width: maxWidth },
        align: (edge.name === 'right') ? 'right' : 'left'
      });

      text.setOrigin(edge.anchorX, edge.anchorY);
      text.setAlpha(0);
      text.setDepth(1000); // On top of everything

      this._currentText = text;

      // Animation: fade in 2s, hold 3s, fade out 2s = 7s total
      scene.tweens.add({
        targets: text,
        alpha: { from: 0, to: 0.6 },
        duration: 2000,
        ease: 'Sine.easeIn',
        onComplete: function() {
          // Hold for 3 seconds
          scene.time.delayedCall(3000, function() {
            // Fade out
            if (!self._active || !scene || !text || !text.scene) return;
            scene.tweens.add({
              targets: text,
              alpha: { from: 0.6, to: 0 },
              duration: 2000,
              ease: 'Sine.easeOut',
              onComplete: function() {
                if (text && text.scene) {
                  text.destroy();
                }
                if (self._currentText === text) {
                  self._currentText = null;
                }
              }
            });
          });
        }
      });

      // Schedule next whisper (15-30 seconds from now)
      if (this._active && scene && scene.time) {
        var delay = this._minInterval + Math.random() * (this._maxInterval - this._minInterval);
        this._timer = scene.time.delayedCall(delay, function() {
          self._showWhisper();
        });
      }
    },

    // ----------------------------------------------------------
    // setInterval: adjust whisper frequency (min/max in ms)
    // ----------------------------------------------------------
    setInterval: function(min, max) {
      this._minInterval = min || 15000;
      this._maxInterval = max || 30000;
    },

    // ----------------------------------------------------------
    // forceWhisper: immediately show a whisper (for testing)
    // ----------------------------------------------------------
    forceWhisper: function(metaOverride) {
      if (metaOverride) {
        this._meta = metaOverride;
      }
      if (this._scene && this._meta) {
        this._showWhisper();
      }
    }
  };


  // ============================================================
  // EXPOSE GLOBALS
  // ============================================================
  window.DX_MERCHANT = merchant;
  window.DX_SEED = seed;
  window.DX_STRIDER = strider;


  // ============================================================
  //
  //  INTEGRATION GUIDE
  //
  //  How to wire DX_MERCHANT, DX_SEED, and DX_STRIDER into
  //  the existing Dungeon X Phaser game.
  //
  // ============================================================
  //
  // ----------------------------------------------------------
  // LOAD ORDER (in HTML):
  //   1. phaser.min.js
  //   2. audio-save-system.js (DX_AUDIO, DX_SAVE)
  //   3. spell-system.js (DX_SPELLS)
  //   4. narrative-data.js (DX_NARRATIVE)
  //   5. merchant-seed-strider.js (DX_MERCHANT, DX_SEED, DX_STRIDER) <-- THIS FILE
  //   6. Main game HTML/JS
  //
  // ----------------------------------------------------------
  // TAVERN SCENE INTEGRATION:
  //
  //   class TavernScene extends Phaser.Scene {
  //     create() {
  //       var dailySeed = DX_SEED.getSeed();
  //
  //       // --- Notice Board: Which dungeons are available today ---
  //       var meta = DX_SAVE.loadMeta();
  //       var dungeonOptions = DX_SEED.getDungeonOptions(dailySeed, meta.fragmentCount);
  //       // Render 2-3 dungeon buttons from dungeonOptions array
  //       // Each has: .name, .difficulty, .description, .rumor, .fragment
  //
  //       // --- Tavern Rumors (NPC barkeep/stranger) ---
  //       var rumors = DX_SEED.getTavernRumors(dailySeed);
  //       // Display 3 rumors in NPC dialogue
  //
  //       // --- Merchant NPC interaction ---
  //       // On clicking merchant:
  //       var shopItems = DX_MERCHANT.getShopInventory(dailySeed, PLAYER.class);
  //       var greeting = DX_MERCHANT.getMerchantLine('greeting');
  //       // Show shop UI with shopItems, each with:
  //       //   .name, .baseCost, .description, .available, .type
  //       // Adjusted price: DX_MERCHANT.getPrice(item.id, mod(PLAYER.cha))
  //
  //       // On clicking "Buy":
  //       var result = DX_MERCHANT.buyItem(itemId, PLAYER);
  //       if (result.success) {
  //         // Show result.message, play purchase SFX
  //       } else {
  //         // Show result.message (broke, full stack, etc.)
  //       }
  //
  //       // On clicking "Sell":
  //       var result = DX_MERCHANT.sellItem(itemId, PLAYER, inventoryIndex);
  //       if (result.success) {
  //         // Show result.message, add result.goldReceived
  //       }
  //
  //       // On closing shop:
  //       var farewell = DX_MERCHANT.getMerchantLine('farewell');
  //
  //       // --- Strider Whisper System ---
  //       DX_STRIDER.init(this);
  //       // Whispers will automatically appear at screen edges
  //       // after 5+ completed runs
  //     }
  //
  //     shutdown() {
  //       DX_STRIDER.stop();
  //     }
  //   }
  //
  // ----------------------------------------------------------
  // DUNGEON SCENE INTEGRATION:
  //
  //   class DungeonScene extends Phaser.Scene {
  //     create(data) {
  //       var dailySeed = DX_SEED.getSeed();
  //       var dungeonId = data.dungeonId || 'whispering_crypts';
  //       var floor = data.floor || 1;
  //
  //       // Generate floor layout
  //       var floorData = DX_SEED.generateFloor(dailySeed, dungeonId, floor);
  //       // floorData.grid is a 7x7 array of CELL constants
  //       // floorData.enemies, .chests, .traps, .keys, etc.
  //
  //       // Use DX_SEED.CELL constants to interpret grid:
  //       //   DX_SEED.CELL.CORRIDOR (1) = walkable corridor
  //       //   DX_SEED.CELL.ROOM (2) = room tile
  //       //   DX_SEED.CELL.ENEMY (7) = enemy encounter
  //       //   DX_SEED.CELL.CHEST (5) = lootable chest
  //       //   etc.
  //
  //       // Get dungeon info for theming
  //       var dungeonInfo = DX_SEED.getDungeonById(dungeonId);
  //       // Use dungeonInfo.themeColor, .elementalTheme for visuals
  //
  //       // Get shrine effect if shrine exists on this floor
  //       if (floorData.shrine) {
  //         var effect = floorData.shrine.effect;
  //         // Apply effect.stat += effect.value to player on interaction
  //       }
  //
  //       // Get wall markings
  //       // floorData.markings has [{x, y, text, style}]
  //       // Display when player faces a MARKING cell
  //     }
  //
  //     nextFloor() {
  //       var dailySeed = DX_SEED.getSeed();
  //       var nextFloorData = DX_SEED.generateFloor(dailySeed, this.dungeonId, this.floor + 1);
  //       // Rebuild dungeon view with nextFloorData
  //     }
  //   }
  //
  // ----------------------------------------------------------
  // TESTING:
  //
  //   // Test seed determinism:
  //   var s = DX_SEED.getSeed();
  //   var f1 = DX_SEED.generateFloor(s, 'whispering_crypts', 1);
  //   var f2 = DX_SEED.generateFloor(s, 'whispering_crypts', 1);
  //   console.log(JSON.stringify(f1.grid) === JSON.stringify(f2.grid)); // true
  //
  //   // Test merchant pricing:
  //   console.log(DX_MERCHANT.getPrice('health_potion', 0));  // 15
  //   console.log(DX_MERCHANT.getPrice('health_potion', 4));  // 12 (20% off)
  //   console.log(DX_MERCHANT.getPrice('health_potion', -1)); // 16 (5% markup)
  //
  //   // Test whisper system:
  //   var testMeta = { totalRuns: 50, totalKills: 200, fragmentCount: 7,
  //     deepestFloor: 15, reputationTitle: 'Legendary Champion',
  //     totalGoldEarned: 5000, totalDeaths: 12, playerClass: 'Mage' };
  //   console.log(DX_STRIDER.getWhisper(testMeta));
  //   console.log(DX_STRIDER.getTier(50)); // 'legendary'
  //
  //   // Force-show a whisper in TavernScene:
  //   DX_STRIDER.forceWhisper(testMeta);
  //
  // ----------------------------------------------------------

})();
