# DX Phase 1: Master Rewrite — Cursor Prompt

## YOUR TASK

Execute the Phase 1 implementation plan at `docs/plans/2026-03-13-dx-phase1-implementation.md` task by task.

**READ THESE FIRST (in order):**
1. `docs/plans/2026-03-13-dx-rewrite-design.md` — Architecture and design decisions
2. `docs/plans/2026-03-13-dx-phase1-implementation.md` — The exact implementation plan (10 tasks)
3. `docs/dungeon-x-game-bible.md` — Game design canon (do not contradict)
4. `assets/MANIFEST.md` — Asset pack locations

## CRITICAL RULES

1. **Follow the plan exactly.** Each task has exact file paths, exact code, exact test steps. Execute them in order (Task 1 → Task 10).

2. **No Phaser. No engines. No npm.** Raw Canvas 2D + ES modules. `<script type="module">` in `index.html`. Browser-native module loading. Zero dependencies.

3. **16-bit pixel art from day one.** The Heroine Dusk tiles at `assets/walls-floors/heroine-dusk/tiles/first person dungeon crawl tiles/` are the primary first-person art. Load them, render them. NO colored rectangles as placeholders. If an asset doesn't load, warn in console but don't crash.

4. **Verify Heroine Dusk tile format.** The plan assumes 640x120 px tiles with 5 frames of 128x120 each. OPEN `dungeon_wall.png` and confirm the actual dimensions before coding the renderer. Adjust `FRAME_W` and slicing logic if different.

5. **Commit after each task.** Small, focused commits. The plan has the exact commit messages.

6. **Preserve `builds/` directory.** Don't delete the old HTML builds. They're reference material.

7. **Test in browser after each visual task.** Use `npx serve .` from project root to serve with proper CORS for module loading.

## END STATE

When done, opening `index.html` (via local server) should show:
- First-person Dungeon Master-style view with Heroine Dusk pixel art
- Minimap in top-right corner with fog of war
- Arrow keys / WASD to move through a procedurally generated dungeon
- FOV updates as you explore
- 6 layered canvases, ES module architecture, zero dependencies

## REFERENCE: Existing builds in `builds/` folder

The old `dungeon-x-phaser.html` (860 lines) and `dungeon-x-final.html` (12,600 lines) have working patterns you can reference:
- Mulberry32 PRNG implementation
- Dungeon pool definitions
- First-person trapezoid rendering approach (replace with sprite-based)
- Scene flow logic

Do NOT copy these wholesale. Use the new architecture from the plan. Reference only for domain logic.
