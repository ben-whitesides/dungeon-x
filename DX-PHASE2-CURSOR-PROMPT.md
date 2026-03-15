# DX Phase 2: Characters & Combat — Cursor/Grok Prompt

## YOUR TASK

Build Phase 2 of the Dungeon X master rewrite: Characters and Combat. Phase 1 (foundation) is complete — BSP dungeon, FOV, first-person renderer, minimap, movement all working.

**READ THESE FIRST (in order):**
1. `docs/plans/2026-03-13-dx-rewrite-design.md` — Architecture and design decisions
2. `docs/dungeon-x-game-bible.md` — Game design canon (do not contradict)
3. `docs/combat-system-dnd.md` — D&D 5e combat adaptation
4. `src/` directory — Understand the existing Phase 1 code structure
5. `assets/MANIFEST.md` — Asset pack locations

## WHAT TO BUILD (Phase 2)

### 1. Character System (`src/character/`)
- `Character` class: name, class, level, HP, MP, stats (STR/DEX/CON/INT/WIS/CHA)
- 6 classes: Fighter, Mage, Cleric, Rogue, Ranger, Paladin
- Each class: base stats, HP/MP growth, allowed equipment slots, class abilities
- Level-up system: XP thresholds, stat gains, ability unlocks
- Character creation flow: name input, class selection, portrait picker
- Use Flare portraits from `assets/` for character portraits

### 2. Party System (`src/party/`)
- 4-character active party (picked from persistent roster)
- Roster management: add, remove, swap party members
- Party order matters (front 2 = melee, back 2 = ranged/caster)
- Party HUD: show 4 portraits + HP/MP bars during exploration

### 3. Combat System (`src/combat/`)
- Turn-based encounters triggered on dungeon tiles
- Energy scheduler determines turn order (already scaffolded in Phase 1)
- D&D 5e-inspired: attack rolls, AC, damage dice, saving throws
- Each class has 3-4 abilities at level 1 (attack, defend, + class specials)
- Monster definitions: use DCSS sprites from `assets/dcss/`
- Combat UI: enemy display, party action menu, damage numbers, turn indicator
- Victory: XP distribution, loot drops
- Defeat: revert to pre-dungeon loadout (snapshot system)

### 4. Monster AI (`src/dungeon/monsters.js`)
- Monster spawning on dungeon generation (deeper floors = harder)
- Basic AI: melee monsters approach, ranged attack from distance, healers support allies
- Monster stat blocks (HP, AC, attack, damage, XP reward)
- At least 5 monster types for v1: Rat, Skeleton, Goblin, Orc, Dark Mage

### 5. Tavern Hub (`src/ui/tavern.js`)
- State: TAVERN on the state stack (push on top of EXPLORE)
- Roster view: see all characters, pick party of 4
- Enter dungeon button: snapshot loadout, start run
- Simple UI — functional first, pretty later

## CRITICAL RULES

1. **No Phaser. No engines. No npm.** Raw Canvas 2D + ES modules. Zero dependencies.
2. **Use existing architecture.** Follow the patterns in `src/` — layered canvases, command pattern, state stack, energy scheduler. Don't reinvent.
3. **Use the real assets.** Flare portraits for characters, DCSS sprites for monsters, Heroine Dusk for dungeon. NO colored rectangles as placeholders.
4. **Commit after each major feature.** Character system, party system, combat system, monster AI, tavern — each gets its own commit.
5. **Test in browser after each feature.** `npx serve .` from project root.
6. **Follow D&D 5e combat doc** at `docs/combat-system-dnd.md` for all combat math.

## END STATE

When done:
- Tavern screen where you create characters, manage roster, pick party of 4
- Enter dungeon → first-person exploration (Phase 1)
- Encounter monsters → turn-based combat screen with D&D 5e mechanics
- Win → XP + loot. Lose → revert to pre-dungeon state.
- Party HUD visible during exploration (portraits + HP/MP)
- At least 5 monster types with DCSS sprites and basic AI
