# Dungeon X — Master Index
## Last Updated: 2026-03-08

---

## Project Overview
Browser-based dungeon crawler blending Wizardry (1981) + Dungeon Master (1987) with modern roguelike hooks. Retro pixel art. HTML5 Canvas + Web Audio API. Single-file prototype.

---

## File Index

| File | Location | Purpose |
|------|----------|---------|
| `INDEX.md` | `docs/` | This file — master navigation |
| `2026-03-08-dungeon-x-design.md` | `docs/` | Full game design document (v1.1 — classes, inventory, drag-and-drop, Sunstone, lore) |
| `combat-system-dnd.md` | `docs/` | D&D combat model spec (AC, attack rolls, saving throws, damage dice) |
| `dungeon-x-phase1.html` | `builds/` | Phase 1 prototype — playable in browser (tavern, 3 enemies, torchlight, inventory, drag-and-drop, fragment, reputation) |

---

## Design Pillars
1. **Dynamic Torchlight** — Darkness is the core mechanic. Light is a resource.
2. **Drag-and-Drop Interaction** — Physical manipulation (keys in keyholes, levers, pushable stones). Dungeon Master DNA.
3. **Grid Inventory** — Equipment slots + 4x6 backpack + food/water survival. Every item is visible and tactile.
4. **Spell Combination** — 6 elements, combine for puzzles/combat/utility. Escape room model.
5. **Class Balance** — Fighter, Ranger, Mage, Cleric. All equally valuable. Puzzles require all disciplines.
6. **D&D Combat** — Classic hit points, armor class, attack rolls, damage dice, saving throws. Wizardry/DM heritage.
7. **The Sunstone** — 10-fragment overarching quest across 10 dungeons. Zelda-style long game.
8. **Tavern Lore** — Reputation grows. NPCs whisper about your deeds. The Strider effect.
9. **Retro Pixel Art** — Minecraft/Terraria energy. Chunky. Characterful. Not fancy.
10. **Daily Seeded Dungeons** — Same layout for all players. Leaderboard. Community message board.

---

## Phase Roadmap

| Phase | Status | Scope |
|-------|--------|-------|
| Phase 1 | DONE | Tavern, 3 enemies, torchlight, combat, spell puzzle, fragment, reputation, audio |
| Phase 1.5 | DONE | Grid inventory, drag-and-drop, food/water, levers, pushable stones, treasure chests, key system |
| Phase 2 | NEXT | D&D combat model, class selection, multi-floor dungeon, overworld path, daily seeds |
| Phase 3 | PLANNED | Party system (4 members), 10+ enemies, 3+ dungeons, NPC helpers, ghost system, community board |
| Phase 4 | PLANNED | All 10 Sunstone dungeons, cross-player legends, mobile touch, seasonal content |

---

## Key Design Decisions
- **Single HTML file** — No build tools, no frameworks, no server. Open and play.
- **Procedural audio** — Web Audio API oscillators. No external sound files.
- **Programmatic pixel art** — drawPixelRect on canvas. No sprite sheets (yet).
- **localStorage** — Save state, reputation, fragments, best runs. No account required.
- **D&D combat over simple ATK/DEF** — Attack rolls vs AC. Miss is a miss. Classic.
- **Drag-and-drop over menu buttons** — Physical interaction. Keys go in keyholes by hand.
- **Food & Water survival** — Forces resource management. Can't just explore forever.
- **Not magic-heavy** — All 4 classes equally important for puzzles and combat.
