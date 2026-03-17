# DX Phase 3: Progression & Dungeon 2 — Cursor/Grok Prompt

## YOUR TASK

Build Phase 3 of the Dungeon X master rewrite: Progression, Items, and Dungeon 2. Phase 1 (foundation) and Phase 2 (characters & combat) are complete — BSP dungeon, FOV, first-person renderer, minimap, movement, 6 character classes, D&D 5e combat, tavern hub, party system, energy scheduler, monster AI all working.

**READ THESE FIRST (in order):**
1. `docs/plans/2026-03-13-dx-rewrite-design.md` — Architecture and design decisions
2. `docs/dungeon-x-game-bible.md` — Game design canon (Section: PHASE 3)
3. `docs/combat-system-dnd.md` — D&D 5e combat adaptation
4. `src/` directory — Understand the existing Phase 1+2 code structure
5. `assets/MANIFEST.md` — Asset pack locations

## WHAT TO BUILD (Phase 3)

### 1. Multi-Floor Dungeon (`src/dungeon/`)
- Stairs up/down connecting floors (BSP generates per floor)
- Deeper floors = harder monsters, better loot
- Floor 1: easy (rats, goblins). Floor 2: medium (skeletons, orcs). Floor 3+: hard
- Stairs are placed in rooms — one up stair, one down stair per floor
- Transition: step on stair tile → generate next floor → place party at stair entry

### 2. Item & Equipment System (`src/items/`)
- `Item` class: name, type (weapon/armor/potion/scroll/key), stats, rarity, value
- Equipment slots: weapon, armor, shield, accessory (per character)
- Inventory UI: grid view, drag-equip, compare stats, drop/use
- Item drops from monsters (loot tables by floor depth)
- Potions: HP heal, MP restore, stat buffs (temporary)
- Weapons: damage dice override character base. Armor: AC bonus.
- At least 15 items for v1 across all types

### 3. Leveling & XP System (`src/character/`)
- XP thresholds: Level 2 = 300 XP, Level 3 = 900, Level 4 = 2700 (D&D 5e curve)
- Level-up: HP increase (class hit die), stat point allocation, new ability unlock
- XP distributed equally to surviving party members after combat
- Level-up notification with stat choices
- Max level 10 for v1

### 4. Tavern Merchant (`src/ui/tavern.js`)
- Buy/sell items at the tavern
- Merchant inventory refreshes per dungeon run
- Gold earned from selling loot and monster drops
- Simple shop UI: merchant inventory on left, player gold + inventory on right
- Price = item value. Sell price = 50% of value.

### 5. Dungeon 2: Goblin Warrens (`config/` or `src/dungeon/`)
- Second dungeon selectable from tavern
- 2 floors + boss floor
- Unique monsters: Goblin Scrapper, Goblin Archer, Goblin Shaman, Hobgoblin
- Boss: Gretchka the Elder (see game bible for full stat block)
- Goblin Dens mechanic: 3 dens on boss floor, destroy them to stop Gretchka summoning
- Different visual palette if possible (recolor dungeon tiles)
- Drops Sunstone Fragment of Dusk + Shaman's Amulet (+2 WIS)

### 6. Trophy Wall (`src/ui/tavern.js`)
- Display collected Sunstone Fragments in the tavern
- Visual: fragment icons on a wall display
- Tracks which dungeons have been cleared

## CRITICAL RULES

1. **No Phaser. No engines. No npm.** Raw Canvas 2D + ES modules. Zero dependencies.
2. **Use existing architecture.** Follow the patterns in `src/` — layered canvases, command pattern, state stack, energy scheduler. Don't reinvent.
3. **Use the real assets.** Flare portraits for characters, DCSS sprites for monsters, Heroine Dusk for dungeon. NO colored rectangles as placeholders.
4. **Commit after each major feature.** Each system gets its own commit.
5. **Test in browser after each feature.** `npx serve .` from project root.
6. **Follow D&D 5e combat doc** at `docs/combat-system-dnd.md` for all combat/leveling math.

## END STATE

When done:
- Tavern with merchant (buy/sell), trophy wall, party management, dungeon selection
- Enter Dungeon 1 OR Dungeon 2 from tavern
- Multi-floor exploration with stairs connecting floors
- Monsters drop items → inventory → equip to characters
- XP from combat → level up → stronger characters
- Dungeon 2 (Goblin Warrens) with unique monsters and Gretchka boss
- Trophy wall shows collected Sunstone Fragments
- Full gameplay loop: Tavern → Dungeon → Combat → Loot → Level → Return → Repeat
