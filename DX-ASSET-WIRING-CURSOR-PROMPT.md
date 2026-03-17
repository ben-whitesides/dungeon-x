# DX Asset Wiring Fix — Cursor/Grok Prompt

## YOUR TASK

The asset loading pipeline (`src/render/asset-loader.js` + `src/render/sprite-atlas.js`) works perfectly — 28 sprites load from 12 asset packs. But **only the first-person wall renderer uses them.** Every other screen draws colored rectangles and monospace text. Wire the real assets into every UI state.

**READ THESE FIRST:**
1. `src/render/asset-loader.js` — The asset manifest (what's loaded)
2. `src/render/sprite-atlas.js` — The `draw()`/`drawSlice()` wrapper
3. `src/render/first-person.js` — The ONE file that correctly uses sprites (study its pattern)
4. `src/ui/states/tavern.js` — Tavern hub (100% procedural)
5. `src/ui/states/combat.js` — Combat screen (100% procedural)
6. `src/ui/states/character-create.js` — Character creation (100% procedural)
7. `src/render/ui-renderer.js` — Party HUD + combat HUD (100% procedural)
8. `src/items/item-data.js` — Items have `icon` properties but nothing maps them to files
9. `src/dungeon/monsters.js` — Monster type strings need sprite mapping
10. `assets/MANIFEST.md` — Full asset pack inventory

---

## THE PROBLEM

The asset loader loads sprites. The SpriteAtlas draws sprites. But nobody calls them except `first-person.js`. Every UI screen uses `fillRect` + `fillText` instead of `drawImage` with the loaded sprites. The loaded assets sit unused in memory.

---

## FIX 1: Expand Asset Loader Manifest [CRITICAL]

**File:** `src/render/asset-loader.js`

Add these missing assets to the manifest. Use 32x32 Kyrise icons (better resolution for UI):

```javascript
// Item icons — Kyrise 32x32
'icon_sword_rusty':   "assets/items/kyrise-icons/Kyrise's 16x16 RPG Icon Pack - V1.2/icons/32x32/sword_01a.png",
'icon_sword_iron':    "assets/items/kyrise-icons/Kyrise's 16x16 RPG Icon Pack - V1.2/icons/32x32/sword_01c.png",
'icon_sword_steel':   "assets/items/kyrise-icons/Kyrise's 16x16 RPG Icon Pack - V1.2/icons/32x32/sword_02a.png",
'icon_sword_magic':   "assets/items/kyrise-icons/Kyrise's 16x16 RPG Icon Pack - V1.2/icons/32x32/sword_03a.png",
'icon_armor_cloth':   "assets/items/kyrise-icons/Kyrise's 16x16 RPG Icon Pack - V1.2/icons/32x32/shield_01a.png",
'icon_armor_leather': "assets/items/kyrise-icons/Kyrise's 16x16 RPG Icon Pack - V1.2/icons/32x32/shield_01c.png",
'icon_armor_chain':   "assets/items/kyrise-icons/Kyrise's 16x16 RPG Icon Pack - V1.2/icons/32x32/shield_02a.png",
'icon_armor_plate':   "assets/items/kyrise-icons/Kyrise's 16x16 RPG Icon Pack - V1.2/icons/32x32/shield_03a.png",
'icon_shield_wood':   "assets/items/kyrise-icons/Kyrise's 16x16 RPG Icon Pack - V1.2/icons/32x32/shield_01b.png",
'icon_shield_iron':   "assets/items/kyrise-icons/Kyrise's 16x16 RPG Icon Pack - V1.2/icons/32x32/shield_02b.png",
'icon_potion_health': "assets/items/kyrise-icons/Kyrise's 16x16 RPG Icon Pack - V1.2/icons/32x32/potion_01a.png",
'icon_potion_mana':   "assets/items/kyrise-icons/Kyrise's 16x16 RPG Icon Pack - V1.2/icons/32x32/potion_01c.png",
'icon_potion_strength': "assets/items/kyrise-icons/Kyrise's 16x16 RPG Icon Pack - V1.2/icons/32x32/potion_01e.png",
'icon_key':           "assets/items/kyrise-icons/Kyrise's 16x16 RPG Icon Pack - V1.2/icons/32x32/key_01a.png",
'icon_ring':          "assets/items/kyrise-icons/Kyrise's 16x16 RPG Icon Pack - V1.2/icons/32x32/ring_01a.png",
'icon_amulet':        "assets/items/kyrise-icons/Kyrise's 16x16 RPG Icon Pack - V1.2/icons/32x32/ring_02a.png",
'icon_scroll':        "assets/items/kyrise-icons/Kyrise's 16x16 RPG Icon Pack - V1.2/icons/32x32/scroll_01a.png",
'icon_gem':           "assets/items/kyrise-icons/Kyrise's 16x16 RPG Icon Pack - V1.2/icons/32x32/gem_01a.png",
'icon_sunstone':      "assets/items/kyrise-icons/Kyrise's 16x16 RPG Icon Pack - V1.2/icons/32x32/gem_01f.png",
```

Also add an **icon mapping function** that maps item `icon` property strings to asset keys:

```javascript
export const ITEM_ICON_MAP = {
  'sword-rusty': 'icon_sword_rusty',
  'sword-iron': 'icon_sword_iron',
  'sword-steel': 'icon_sword_steel',
  'sword-magic': 'icon_sword_magic',
  'armor-cloth': 'icon_armor_cloth',
  'armor-leather': 'icon_armor_leather',
  'armor-chain': 'icon_armor_chain',
  'armor-plate': 'icon_armor_plate',
  'shield-wood': 'icon_shield_wood',
  'shield-iron': 'icon_shield_iron',
  'potion-health': 'icon_potion_health',
  'potion-mana': 'icon_potion_mana',
  'potion-strength': 'icon_potion_strength',
  'key-dungeon': 'icon_key',
  'ring-strength': 'icon_ring',
  'amulet-health': 'icon_amulet',
  'fragment-sunstone': 'icon_sunstone',
};
```

And a **monster sprite mapping**:

```javascript
export const MONSTER_SPRITE_MAP = {
  'shadow_lurker': 'enemy_shadow',
  'frost_wraith': 'enemy_death_speaker',
  'bone_revenant': 'enemy_bone_shield',
  'goblin_scrapper': 'enemy_goblin',
  'goblin_archer': 'enemy_goblin',
  'goblin_shaman': 'enemy_druid',
  'hobgoblin': 'enemy_goblin',
  'gretchka': 'enemy_skull_pile',
  'skeleton': 'enemy_skeleton',
  'zombie': 'enemy_zombie',
  'imp': 'enemy_imp',
  'mimic': 'enemy_mimic',
};
```

---

## FIX 2: Combat Screen — Show Enemy Sprites [CRITICAL]

**File:** `src/ui/states/combat.js`

Replace the black screen + green text monster display with actual Heroine Dusk enemy artwork. The assets object should be passed through the game state or accessible globally.

**Pattern to follow:** Study how `first-person.js` accesses assets via `this.atlas` or `this.assets`. Use the same pattern.

For each enemy in the encounter:
1. Look up the monster type in `MONSTER_SPRITE_MAP` to get the asset key
2. Get the `Image` from the assets Map
3. Draw it with `ctx.drawImage(img, x, y, width, height)`
4. Draw the HP bar below it (can keep the colored bar, that's fine)
5. Draw the monster name below that

Layout: enemies displayed side-by-side horizontally, centered, with Heroine Dusk dungeon wall as background. These enemy sprites are ~640x120px first-person style art, so scale them to fit the combat viewport.

---

## FIX 3: Tavern Scene — Real NPC Sprites + Item Icons [CRITICAL]

**File:** `src/ui/states/tavern.js`

Replace the brown rectangle + text with:

1. **Background:** Use the Heroine Dusk wall tile as a tiled background, or draw a warm tavern-colored gradient — either is better than a flat brown rectangle.

2. **NPC sprites:** Use Heroine Dusk enemy sprites repurposed as NPCs:
   - Barkeep → `enemy_druid` (the most "civilian" looking sprite)
   - Merchant → `enemy_mimic` or `enemy_imp` (exotic merchant feel)
   - Stranger/Strider → `enemy_shadow` (mysterious traveler)
   Draw them at appropriate positions with name labels.

3. **Roster/Party display:** Show Flare portraits next to character names.
   - Each character should have a portrait assignment (use `portrait_male_1` through `portrait_female_3`)
   - Draw the portrait (scaled to ~48x48 or 64x64) next to the character name, class, and level

4. **Shop screen:** When showing merchant inventory or player inventory:
   - Draw the Kyrise item icon next to each item name
   - Use `ITEM_ICON_MAP` to resolve the icon string to asset key
   - Icon size: 32x32 next to item text

5. **Dungeon select:** Show a small preview using Heroine Dusk wall tiles for each dungeon option

6. **Trophy wall:** Show Sunstone fragment icons (Kyrise gem sprites) on the trophy display

---

## FIX 4: Character Creation — Portrait Selection [CRITICAL]

**File:** `src/ui/states/character-create.js`

The `selectedPortrait` property already exists (line 10). Wire it up:

1. Display all 6 Flare portraits in a 2x3 or 3x2 grid
2. Highlight the selected portrait with a gold border
3. Show the selected portrait large (128x128 or larger) next to the class/name selection
4. Save the portrait choice with the character data
5. Portrait keys: `portrait_male_1`, `portrait_male_2`, `portrait_male_3`, `portrait_female_1`, `portrait_female_2`, `portrait_female_3`

---

## FIX 5: Party HUD — Character Portraits [CRITICAL]

**File:** `src/render/ui-renderer.js`

Replace the plain text character names with:

1. Small Flare portraits (32x32 scaled) for each party member
2. HP bar next to the portrait (colored bars are fine, keep those)
3. Character name + level text below or beside the portrait
4. The HUD should show the 4 active party members in a row

---

## FIX 6: First-Person Renderer — Use Ceiling/Floor Assets [MEDIUM]

**File:** `src/render/first-person.js`

Lines 28-32 draw flat colored rectangles for ceiling and floor despite `fp_ceiling` and `fp_floor` being loaded.

Replace:
```javascript
// Ceiling
ctx.fillStyle = '#1a1a2e';
ctx.fillRect(0, 0, canvas.width, canvas.height / 2);
// Floor
ctx.fillStyle = '#2d2d1a';
ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2);
```

With:
```javascript
const ceilingImg = this.assets.get('fp_ceiling');
const floorImg = this.assets.get('fp_floor');
if (ceilingImg) {
  ctx.drawImage(ceilingImg, 0, 0, canvas.width, canvas.height / 2);
} else {
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height / 2);
}
if (floorImg) {
  ctx.drawImage(floorImg, 0, canvas.height / 2, canvas.width, canvas.height / 2);
} else {
  ctx.fillStyle = '#2d2d1a';
  ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2);
}
```

---

## FIX 7: Ensure Assets Are Accessible Everywhere [INFRASTRUCTURE]

The assets Map needs to be accessible in every UI state and renderer. Check how `first-person.js` gets its assets reference and ensure the same pattern is used for tavern, combat, character-create, and ui-renderer.

If assets are passed through the game state/state stack, make sure every state receives them. If they're on a global game object, ensure all states can read it. Do NOT create a new loading mechanism — use the existing `loadAssets()` return value that's already called in `main.js`.

---

## CRITICAL RULES

1. **Keep all procedural drawing as FALLBACK.** If an asset fails to load (img is null/undefined), fall back to the existing colored rectangle. Never crash because an asset is missing.
2. **Do NOT change the game logic, combat system, or state management.** Only change rendering.
3. **Do NOT add any npm dependencies.** This is raw Canvas 2D, no build tools.
4. **Commit after each fix.** Each fix gets its own commit.
5. **Test in browser after each fix:** `npx serve .` from project root, open `http://localhost:8888`
6. **Verify Kyrise icon paths are correct** by opening one in the browser: `http://localhost:8888/assets/items/kyrise-icons/Kyrise's%2016x16%20RPG%20Icon%20Pack%20-%20V1.2/icons/32x32/sword_01a.png`

## END STATE

When done:
- Tavern shows Heroine Dusk-style environment with NPC sprites, item icons, character portraits
- Combat shows actual Heroine Dusk enemy artwork instead of green text on black
- Character creation shows Flare portrait grid for selection
- Party HUD shows small portraits for each party member
- Dungeon exploration shows Heroine Dusk ceiling/floor tiles (not flat colors)
- Shop shows Kyrise item icons next to item names and prices
- Trophy wall shows gem/sunstone fragment icons
- All procedural drawing kept as fallback if assets fail to load
- NO colored rectangles as primary art for any game entity
