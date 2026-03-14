# Dungeon X — Master Rewrite Design Document

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete clean-sheet rewrite of Dungeon X using master-level architecture patterns, 16-bit pixel art assets, and modular ES module structure — replacing the single-file Phaser prototype.

**Inspiration:** Dungeon Master (1987), Wizardry — first-person grid-based dungeon crawling with persistent party management.

**Existing Design Docs (canonical — do not contradict):**
- `docs/dungeon-x-game-bible.md` — Full game design, lore, systems, classes, items, spells
- `docs/2026-03-08-dungeon-x-design.md` — Original design document
- `docs/combat-system-dnd.md` — D&D 5e combat adaptation
- `docs/storyline-recon-intel.md` — Storyline, narrative, NPC lore
- `.cursorrules` — Build constraints and phase targets
- `assets/MANIFEST.md` — 12 downloaded 16-bit asset packs

This document defines **architecture and build approach only**. Game design, lore, classes, spells, items, combat formulas, and storyline are defined in the docs above.

---

## Architecture Overview

### Philosophy

Three principles from the masters (Bob Nystrom, Amit Patel, Josh Ge):

1. **The game is data, not rendering.** World state is a pure data structure. The renderer is a view. They never know about each other directly.
2. **Systems interact through commands and events.** Player and AI use the same Command interface. Game events flow through an EventBus. No system reaches into another.
3. **Only render what changed.** Layered canvases with dirty flags. Turn-based means most tiles don't change most frames.

### No Engine

Phaser is removed. DX uses raw Canvas 2D with ES modules. Rationale:
- Phaser's real-time game loop fights turn-based architecture
- A roguelike needs a 2D grid, sprites, and input handling — not a physics engine
- Full control over rendering pipeline (layered canvases, dirty rectangles)
- Zero CDN dependencies, works offline as PWA
- Endorsed by r/roguelikedev, Frank Force (LittleJS), and the vanilla JS renaissance

### Three-Layer Architecture

```
CONTROLLER (input → commands)
  ├── InputMapper        — keyboard/touch → Command objects
  ├── StateStack         — pushdown automata (exploring, inventory, combat, merchant, dialog)
  └── AIDirector         — monster AI produces same Command objects as player

WORLD (pure game state)
  ├── GameWorld          — current dungeon level, party, turn state
  ├── DungeonLevel       — 2D tile grid, entity positions, items
  ├── EntityManager      — ECS-lite: entities with components
  ├── EnergyScheduler    — turn order via speed/energy accumulation
  ├── CharacterRoster    — persistent saved characters across sessions
  ├── PartyManager       — active 4-character party, pre-dungeon snapshots
  └── EventBus           — decoupled game events (damage, death, loot, door, etc.)

RENDERER (reads world → draws pixels)
  ├── FirstPersonView    — main viewport, Dungeon Master-style perspective
  ├── Minimap            — top-down corner map showing explored tiles
  ├── LayeredCanvas      — 6 stacked canvases with dirty flags
  ├── SpriteAtlas        — pre-sliced sprite sheets from asset packs
  ├── Camera             — viewport position and facing direction
  ├── AnimationQueue     — async visual effects between turns
  └── UIRenderer         — HUD, health bars, party status, menus
```

### File Structure

```
/src
  /core
    game-world.js        — Central game state container
    energy-scheduler.js  — Turn order (Bob Nystrom's energy system)
    event-bus.js         — Observer pattern for game events
    prng.js              — Mulberry32 seeded PRNG (from existing final build)
    save-manager.js      — localStorage serialization, pre-dungeon snapshots
    constants.js         — Tile types, directions, game config

  /entities
    entity.js            — Base entity with component map
    components.js        — Health, Combat, AI, Render, Inventory, Speed
    entity-factory.js    — Create monsters/NPCs from data files

  /dungeon
    bsp-generator.js     — Binary Space Partition room+corridor generation
    cellular-caves.js    — Cellular automata for organic cave floors (v2)
    flood-fill.js        — Connectivity verification
    dungeon-config.js    — Floor difficulty, monster pools, loot tables
    tile-map.js          — 2D grid with tile types and metadata

  /combat
    combat-manager.js    — Turn-based encounter state machine
    combat-actions.js    — Attack, Defend, Cast, Use Item, Flee
    damage-calc.js       — D&D 5e adapted formulas (see combat-system-dnd.md)

  /party
    character.js         — Individual character: class, stats, level, gear, name
    roster.js            — Full saved roster across sessions
    party.js             — Active party of 4, slot management
    class-data.js        — Six classes: Fighter, Mage, Cleric, Rogue, Ranger, Paladin
    level-up.js          — XP thresholds, stat gains, ability unlocks

  /commands
    command.js           — Base Command interface (execute/undo)
    move-command.js      — Grid movement (dx, dy)
    attack-command.js    — Melee/ranged attack
    use-item-command.js  — Consume or activate item
    cast-spell-command.js — Spell casting
    interact-command.js  — Doors, chests, switches, NPCs

  /render
    layered-canvas.js    — 6-canvas stack with dirty flag system
    sprite-atlas.js      — Load and slice sprite sheets into tile maps
    first-person.js      — Dungeon Master-style perspective renderer
    minimap.js           — Top-down explored-tile overlay
    camera.js            — Position, facing direction, viewport
    animation-queue.js   — Queued visual effects (slash, spell, damage numbers)
    ui-renderer.js       — HUD, menus, party status bars
    fog-renderer.js      — FOV darkness overlay

  /ui
    state-stack.js       — Pushdown automata for game states
    states/
      exploring.js       — Real-time movement, first-person view
      combat.js          — Turn-based encounter screen
      inventory.js       — Gear management, drag-and-drop
      tavern.js          — Roster, party swap, shop, craft
      character-create.js — New character wizard
      main-menu.js       — Title, load, daily seed
    input-mapper.js      — Keyboard + touch → Command translation

  /ai
    ai-director.js       — Monster behavior dispatcher
    behaviors.js         — Chase, patrol, flee, guard, ranged
    pathfinding.js       — A* with Manhattan heuristic

  /fov
    shadowcast.js        — Albert Ford's symmetric shadowcasting

  /audio
    sound-manager.js     — Web Audio API, pooled sources

  /data
    monsters.json        — Monster definitions (from game bible)
    items.json           — Item definitions (from game bible)
    spells.json          — Spell definitions (from game bible)
    floor-configs.json   — Per-floor difficulty, monster pools, loot tables

  /assets
    (existing 12 packs — Kyrise, DCSS, Kenney, Heroine Dusk, etc.)

index.html               — Canvas container + single module entry point
src/main.js              — Boot sequence, asset loading, game init
```

---

## Core Systems

### 1. Energy Scheduler (Turn Order)

Bob Nystrom's energy accumulation system. Each actor has a speed stat. Every tick, actors gain energy equal to their speed. When energy >= threshold, they act. Different action types cost different energy amounts.

- Player speed 10, threshold 10 → 1 action per tick
- Rat speed 15 → acts before player sometimes
- Golem speed 5 → acts every other tick
- Heavy attack costs 12 energy, quick jab costs 8

This single system handles haste/slow effects, different weapon speeds, and monster variety without special-case code.

### 2. Command Pattern (All Actions)

Every action in the game is a Command object with `execute()` and `undo()`. Player keyboard input creates Commands. Monster AI creates the same Commands. Benefits:
- Undo stack for free
- Replay system for free
- AI and player are architecturally identical
- Input remapping is trivial

### 3. State Stack (Pushdown Automata)

Game states stack: Exploring → push Combat → push Inventory → pop back to Combat → pop back to Exploring. Each state owns its own input handling and rendering. No spaghetti state transitions.

### 4. Layered Canvas Rendering

Six transparent canvases stacked via CSS `position: absolute`:

| Layer | Redraws When | Content |
|-------|-------------|---------|
| `floor` | Room change only | Tile sprites |
| `objects` | Item pickup/drop | Chests, items, furniture |
| `entities` | Every turn | Player party, monsters, NPCs |
| `effects` | Animation frames | Spell particles, slash effects |
| `fog` | Every turn | FOV shadow overlay |
| `ui` | Input/state change | HUD, health bars, menus |

Dirty flags per layer. GPU composites alpha for free. Turn-based means most layers don't redraw most frames.

### 5. First-Person Renderer

Dungeon Master / Wizardry perspective. Reads the tile grid + player facing direction, renders:
- Wall/floor/ceiling tiles from Heroine Dusk asset pack
- Depth layers (near → far) with perspective scaling
- Monsters rendered as sprites at grid positions in view
- Doors, chests, and interactables at their grid positions

The minimap in the corner shows the top-down view of explored tiles using Kyrise/DCSS sprites.

### 6. Sprite Atlas

Pre-loads all sprite sheets at boot. Slices them into tile maps keyed by sprite ID. Every entity, tile, and item references a sprite ID from the atlas — never a `fillRect()` call.

Asset packs used:
- **Heroine Dusk** — first-person walls, floors, ceilings, enemy sprites
- **Kyrise 16x16** — 904 RPG icons for items, spells, UI elements
- **DCSS 32x32** — 6,031 tiles for minimap entities and monsters
- **Kenney Roguelike/Tiny Dungeon** — supplemental tiles
- **Flare portraits** — character portraits in tavern/roster

### 7. Persistent Character Roster

Characters saved to localStorage as JSON. Each character:
- Name (player-chosen)
- Class (Fighter/Mage/Cleric/Rogue/Ranger/Paladin)
- Level, XP, stats (per class-data.js growth tables)
- Equipment slots (weapon, armor, shield, accessory)
- Spell/ability list
- Portrait selection

Roster grows over time. Tavern UI shows full roster, player picks 4 for each dungeon run.

### 8. Pre-Dungeon Snapshot (Death System)

Before entering the dungeon, `save-manager.js` serializes each party member's full state (gear, consumables, gold). On party wipe: restore from snapshot. Characters keep their level/XP but revert to pre-dungeon loadout. Only loot found during the run is lost.

On successful return to tavern: snapshot updates with new gear. The tavern IS the checkpoint.

### 9. Dungeon Generation

V1: Single mega-dungeon. BSP algorithm generates each floor. Floors seeded from `baseSeed + floorNumber` for reproducibility.

- Floor difficulty config: monster pool, loot table, room count, trap density
- Deeper floors = harder monsters, better loot, more complex layouts
- Flood-fill verification ensures full connectivity
- Stairs down placed in farthest room from stairs up

V2 (future): Multiple themed dungeons with different generators (cellular automata caves, Delaunay+MST labyrinths). Same architecture, different DungeonConfig objects.

### 10. Daily Seed System

Date string → Mulberry32 seed. Same dungeon layout for all players that day. Leaderboard tracks deepest floor reached, total loot value, party composition. Strider effect: top performers' characters appear as legends in the tavern lore.

### 11. FOV (Field of View)

Albert Ford's symmetric shadowcasting. If A sees B, B always sees A. No floating-point artifacts. Computed each time the party moves. Marks tiles as: unseen, seen-but-not-visible (fog), visible. Fog layer renders accordingly.

### 12. Combat System

Hybrid: real-time exploration, turn-based combat encounters.

**Exploration:** Party moves through the dungeon in real-time (grid step by step). Monsters are visible in the first-person view. Walking into a monster (or being ambushed) triggers combat.

**Combat:** Snap to turn-based. Each party member and each monster acts in energy-scheduler order. Actions: Attack, Defend, Cast Spell, Use Item, Flee. Formulas from `combat-system-dnd.md`. Combat resolves in a dedicated UI state (combat.js) with the first-person view showing the enemies.

---

## Platform Strategy

**Desktop-first, mobile-ready.**

- Keyboard is primary input (arrow keys, WASD, hotkeys)
- Touch controls mapped to same Command pattern (swipe = move, tap = interact)
- Canvas scales responsively via CSS `object-fit` + resolution detection
- UI elements sized for both mouse and finger targets
- PWA manifest for mobile home screen install + offline play
- Target demographic: 30-60 year old men — desktop hooks them, mobile keeps them

---

## Build Phases

### Phase 1: Foundation (the playable core)
- Project scaffolding, ES modules, asset loading
- SpriteAtlas with Heroine Dusk + Kyrise packs wired in
- First-person renderer with actual tile art (not rectangles)
- Grid movement with keyboard input
- BSP dungeon generation for single floor
- FOV (symmetric shadowcasting)
- Basic minimap

### Phase 2: Characters and Combat
- Character creation (6 classes, naming, portraits)
- Roster persistence (localStorage)
- Party management (pick 4, tavern UI)
- Energy scheduler
- Turn-based combat system (D&D 5e adapted)
- Monster AI (chase, patrol, flee)
- Death/snapshot system

### Phase 3: Progression
- Multi-floor dungeon (stairs, deeper = harder)
- Items, equipment, inventory UI
- Leveling, XP, stat growth
- Loot tables per floor
- Merchant/shop in tavern
- Save/load full game state

### Phase 4: Polish and Daily Seeds
- Daily seed system + leaderboard
- Strider lore in tavern
- Sound (Web Audio API)
- Animation queue (combat effects, spell particles)
- Touch controls for mobile
- PWA manifest
- Performance optimization pass

### Phase 5: Expansion (v2+)
- Spell crafting (component-based mixing)
- Class specialization at milestone levels
- Additional themed dungeons (different generators)
- Quest board in tavern

---

## What We're NOT Building (YAGNI)

- Multiplayer / networking
- Server-side anything (pure client, localStorage)
- 3D rendering or WebGL (Canvas 2D only)
- Custom level editor (proc gen handles it)
- Achievement system (leaderboard is enough for v1)
- Microtransactions or monetization hooks

---

## References

- Bob Nystrom — Game Programming Patterns (game loop, command, state, component, observer, object pool)
- Amit Patel / Red Blob Games — A* pathfinding, BSP generation, FOV algorithms
- Albert Ford — Symmetric shadowcasting implementation
- Josh Ge / Cogmind — Roguelike UI, proc gen philosophy, single mega-dungeon design
- Frank Force / LittleJS — Minimal Canvas game engine patterns
- RogueBasin — 15-step roguelike guide, energy systems, merchant design
- r/roguelikedev — Canvas optimization, procedural generation best practices
- Memory vault — `game-dev-canvas-mastery-intel.md`, `game-dev-deep-research.md`
