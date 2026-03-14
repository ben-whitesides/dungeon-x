# DX Billy — Phase 2 Build Prompt
## Paste this into Cursor Composer to start the Billy Boy

---

Read the .cursorrules file and docs/dungeon-x-game-bible.md carefully. Then build Phase 2 into builds/dungeon-x-phase2.html.

Start with Priority 1: the D&D 5e combat system. Read docs/combat-system-dnd.md for the exact spec.

Here's the build order:
1. Create builds/dungeon-x-phase2.html starting from builds/dungeon-x-phaser.html as the base
2. Add the D&D combat engine: attack rolls (d20 + mod vs AC), initiative, damage types, saving throws
3. Add class selection screen: Fighter, Ranger, Mage, Cleric (stats in .cursorrules)
4. Add Dungeon 1: Whispering Crypts (2 floors, procedural rooms, enemies from game bible Section 5.1)
5. Add the mini-boss (Vault Warden) and boss (Crypt Lord)
6. Connect tavern → overworld path → dungeon entrance → dungeon floors → boss → back to tavern with Fragment of Dawn

Do NOT touch builds/dungeon-x-phase1.html. Build fresh in phase2.html.
Use Phaser 3 Scenes for each game state (TitleScene, ClassSelectScene, TavernScene, DungeonScene, CombatScene).
All rendering: programmatic rectangles and text. No external assets.
