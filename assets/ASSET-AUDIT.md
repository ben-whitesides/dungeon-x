# Dungeon X — Asset Audit & Mapping
## Matched to Dungeon Master (1987) Aesthetic
## Date: 2026-03-08

---

## DUNGEON WALLS / FLOORS / CEILINGS (First-Person View)

### PRIMARY: Stone Dungeon (OptimusDu) — CLOSEST TO DM
Dark grey/purple stone with heavy mortar. Ominous. This is our main dungeon look.
- `walls-floors/more-tilesets/stone_dungeon/stone_dungeon/stone_wall.png` — Wall segments at 6 depths
- `walls-floors/more-tilesets/stone_dungeon/stone_dungeon/stone_floor.png` — Floor at 6 depths
- `walls-floors/more-tilesets/stone_dungeon/stone_dungeon/stone_ceiling.png` — Ceiling at 6 depths
- `walls-floors/more-tilesets/stone_dungeon/stone_dungeon/stone_door.png` — Wooden door on stone
- `walls-floors/more-tilesets/stone_dungeon/stone_dungeon/locked_stone.png` — Locked door variant
- `walls-floors/more-tilesets/stone_dungeon/stone_dungeon/chest_stone.png` — Chest on stone floor
- `walls-floors/more-tilesets/stone_dungeon/stone_dungeon/pillar_stone.png` — Stone pillar

### SECONDARY: Heroine Dusk Original (Clint Bellanger) — Warm Brown Brick
Good for upper levels / well-lit areas. Two color variants (dark brown + golden sandstone).
- `walls-floors/heroine-dusk/tiles/first person dungeon crawl tiles/dungeon_wall.png`
- `walls-floors/heroine-dusk/tiles/first person dungeon crawl tiles/dungeon_floor.png`
- `walls-floors/heroine-dusk/tiles/first person dungeon crawl tiles/dungeon_ceiling.png`
- `walls-floors/heroine-dusk/tiles/first person dungeon crawl tiles/dungeon_door.png`
- `walls-floors/heroine-dusk/tiles/first person dungeon crawl tiles/locked_door.png`
- `walls-floors/heroine-dusk/tiles/first person dungeon crawl tiles/chest_interior.png`

### ADDITIONAL VARIANTS
- `walls-floors/more-tilesets/monochrome_dungeon/` — Black and white (nightmare/dream sequences)
- `walls-floors/more-tilesets/cga_dusk/` — CGA palette (retro-within-retro)
- `walls-floors/more-tilesets/underwater/` — Underwater dungeon variant

### DCSS DOOR
- `monsters/dcss/Dungeon Crawl Stone Soup Full/dungeon/doors/closed_door.png` — 32x32 iron gate door

---

## TAVERN SCENE

### INTERIOR BACKGROUND
- `walls-floors/heroine-dusk/tiles/first person dungeon crawl tiles/interior.png` — **TAVERN INTERIOR with fireplace, bench, windows, wooden floor.** Use directly or as reference.

### TAVERN ENVIRONMENT (from DCSS)
- `monsters/dcss/.../dungeon/shops/` — Shop tiles (for tavern bar area)
- `monsters/dcss/.../dungeon/floor/` — Floor tiles for tavern
- `monsters/dcss/.../dungeon/wall/torches/` — Wall torches for tavern lighting

### TAVERN OBJECTS (Kenney Tiny Dungeon)
- `walls-floors/kenney-tiny/Tiles/` — 143 tiles including furniture, barrels, tables, weapons racks

---

## ENEMIES — Front-Facing Combat Sprites

### HEROINE DUSK ENEMIES (DawnBringer 16-color, ~80x120px) — PRIMARY
Best match for DM style. Front-facing, designed for first-person combat.

| File | Enemy | Our Game Mapping |
|------|-------|-----------------|
| `heroine-dusk/enemies/.../skeleton.png` | Skeleton warrior with sword | **Bone Revenant** |
| `heroine-dusk/enemies/.../zombie.png` | Shambling zombie | General undead |
| `heroine-dusk/enemies/.../shadow_soul.png` | Dark shadowy figure | **Shadow Lurker** |
| `heroine-dusk/enemies/.../death_speaker.png` | Horned robed figure with staff | Boss caster |
| `heroine-dusk/enemies/.../imp.png` | Flying fire creature | Fire imp |
| `heroine-dusk/enemies/.../druid.png` | Red-robed sorcerer | Dark mage |
| `heroine-dusk/enemies/.../mimic.png` | Chest with teeth | **Mimic** (trap chest) |
| `heroine-dusk/enemies/.../bone_shield.png` | Crystal/bone spikes | Bone trap |
| `heroine-dusk/enemies/.../shadow_tendrils.png` | Dark tentacles | Shadow tendril hazard |

### REMIXED ENEMIES (Redshrike, higher detail)
- `monsters/heroine-dusk-enemies/skeleton3.png` — Skeleton warrior (enhanced)
- `monsters/heroine-dusk-enemies/zombie2.png` — Zombie (enhanced)
- `monsters/heroine-dusk-enemies/shadow_soul2.png` — Shadow soul (enhanced)
- `monsters/heroine-dusk-enemies/goblin2.png` — **Goblin warrior** (new enemy type!)
- `monsters/heroine-dusk-enemies/death_speaker2.png` — Death speaker (enhanced)
- `monsters/heroine-dusk-enemies/druid2.png` — Dark druid (enhanced)
- `monsters/heroine-dusk-enemies/imp2.png` — Imp (enhanced)
- `monsters/heroine-dusk-enemies/mimic2.png` — Mimic (enhanced)
- `monsters/heroine-dusk-enemies/shadow_tendrils2.png` — Shadow tendrils (enhanced)
- `monsters/heroine-dusk-enemies/skull_pile2.PNG` — Bone pile hazard
- `monsters/heroine-dusk-enemies/bone_shield2.PNG` — Bone shield creature

### DCSS MONSTERS (32x32, top-down but many face forward) — SUPPLEMENTARY
Cherry-pick these for deeper dungeon floors:

**Undead:**
- `monsters/dcss/.../monster/undead/freezing_wraith.png` — **Frost Wraith** (blue ghost)
- `monsters/dcss/.../monster/undead/ancient_lich_new.png` — Lich boss
- `monsters/dcss/.../monster/undead/bone_dragon_new.png` — Bone dragon (deep floor boss)
- `monsters/dcss/.../monster/undead/ghost_new.png` — Ghost
- `monsters/dcss/.../monster/undead/ghoul.png` — Ghoul
- `monsters/dcss/.../monster/undead/greater_mummy.png` — Mummy lord
- `monsters/dcss/.../monster/undead/flying_skull.png` — Flying skull
- `monsters/dcss/.../monster/undead/curse_skull.png` — Cursed skull

**Demons:**
- `monsters/dcss/.../monster/demons/balrug_new.png` — Balrog-type demon (floor boss)
- `monsters/dcss/.../monster/demons/blizzard_demon.png` — Ice demon
- `monsters/dcss/.../monster/demons/blue_devil_new.png` — Blue devil
- `monsters/dcss/.../monster/demons/cacodemon.png` — Cacodemon

**Other:**
- `monsters/dcss/.../monster/nonliving/` — Golems, animated weapons
- `monsters/dcss/.../monster/eyes/` — Beholders, floating eyes
- `monsters/dcss/.../monster/dragons/` — Dragon variants

---

## ITEM ICONS

### KYRISE 32x32 RPG Icons — PRIMARY for inventory grid
Complete spritesheet: `items/kyrise-icons/.../spritesheet/spritesheet_32x32.png`

Individual icons at `items/kyrise-icons/.../icons/32x32/`:

**Weapons:**
- `sword_01a.png` through `sword_01e.png` — 5 sword color variants
- `sword_02a-e`, `sword_03a-e`, `sword_04a-e` — More sword types (short, long, great)

**Armor:**
- `helmet_01a-e.png`, `helmet_02a-e.png` — Helmet variants

**Keys:**
- `key_01a-e.png`, `key_02a-e.png` — Key variants (iron, gold, etc.)

**Potions:**
- `potion_01a-h.png`, `potion_02a-h.png` — Multiple potion colors

**Also:** arrows, books, shields, scrolls, gems, rings, staffs, coins

### DCSS ITEMS (32x32) — SUPPLEMENTARY
- `monsters/dcss/.../item/weapon/` — 100+ weapon sprites (swords, axes, maces, bows)
- `monsters/dcss/.../item/armor/` — Shields, helmets, boots, gloves, body armor
- `monsters/dcss/.../item/potion/` — 40+ potion color variants
- `monsters/dcss/.../item/scroll/` — Scroll sprites
- `monsters/dcss/.../item/food/` — Food items
- `monsters/dcss/.../item/wand/` — Wand sprites
- `monsters/dcss/.../item/book/` — Spellbook sprites
- `monsters/dcss/.../item/ring/` — Ring sprites
- `monsters/dcss/.../item/amulet/` — Amulet sprites

---

## SPELL / MAGIC EFFECTS

### DCSS SPELL ICONS (32x32) — For spell casting UI and hand effects
- `monsters/dcss/.../gui/spells/fire/fireball_new.png` — Fireball icon (orange glow)
- `monsters/dcss/.../gui/spells/fire/bolt_of_fire_new.png` — Fire bolt
- `monsters/dcss/.../gui/spells/fire/fire_storm_new.png` — Fire storm
- `monsters/dcss/.../gui/spells/fire/flame_tongue_new.png` — Flame tongue
- `monsters/dcss/.../gui/spells/ice/ice_storm_new.png` — Ice storm (blue crystal)
- `monsters/dcss/.../gui/spells/ice/bolt_of_cold_new.png` — Ice bolt
- `monsters/dcss/.../gui/spells/ice/freeze_new.png` — Freeze spell
- `monsters/dcss/.../gui/spells/earth/` — Stone/earth spells
- `monsters/dcss/.../gui/spells/necromancy/` — Dark magic
- `monsters/dcss/.../gui/spells/conjuration/` — General attack spells

### DCSS EFFECTS (32x32) — Projectile animations
- `monsters/dcss/.../effect/` — Arrows, clouds, acid, projectiles

---

## CHARACTER / PROTAGONIST

### HEROINE DUSK PROTAGONIST — Paper doll system with swappable equipment
Layered sprites at `portraits/protagonist/layers/`:
- `Base2.png` — Base character (female warrior)
- `LeatherArmor2.png` — Leather armor layer
- `brigadierArmor2.png` — Brigandine armor
- `PartialPlate2.png` — Partial plate
- `FullPlate2.png` — Full plate armor
- `SilverArmor2.png` — Silver/magical armor
- `cloak2.png` — Cloak layer
- `knife.png` — Knife weapon
- `Longsword.png` — Longsword
- `Katana.png` — Katana
- `staff.png` — Staff
- `BronzeMace.png` — Mace
- `Hammer.png` — Hammer
- `heroinepreview2.png` — Full preview (armored with sword)

Combined sprite sheet: `walls-floors/heroine-dusk/heroine_set.png` — All 7 armor tiers + 6 weapons

### FLARE PORTRAITS
- `portraits/flare/` — 7 portrait images (hero faces)

---

## UI ELEMENTS

### HEROINE DUSK INTERFACE
- `walls-floors/heroine-dusk/interface/.../action_buttons.png` — 8 circular action buttons
- `walls-floors/heroine-dusk/interface/.../dialog_buttons.png` — Dialog UI
- `walls-floors/heroine-dusk/interface/.../minimap.png` — Minimap widget
- `walls-floors/heroine-dusk/interface/.../minimap_cursor.png` — Player cursor for minimap
- `walls-floors/heroine-dusk/interface/.../select.png` — Selection highlight
- `walls-floors/heroine-dusk/interface/.../info_button.png` — Info button
- `walls-floors/heroine-dusk/interface/.../boxy_bold.png` — Pixel font

### DCSS GUI
- `monsters/dcss/.../gui/skills/` — Skill icons
- `monsters/dcss/.../gui/abilities/` — Ability icons
- `monsters/dcss/.../gui/tabs/` — Tab UI elements
- `monsters/dcss/.../gui/startup/` — Start screen elements

---

## FIRST-PERSON HANDS (for equipped weapon display)

### DCSS PLAYER HAND SPRITES
Right hand weapons: `monsters/dcss/.../player/hand_right/`
- `axe.png`, `battleaxe.png` — Axes held in hand
- `bow_2.png` — Bow
- `blessed_blade.png` — Magical sword
- `black_sword.png` — Dark sword
- `aragorn.png`, `arwen.png`, `boromir.png` — Named weapon variants
- `artefact/` — Unique artifact weapons

Left hand items: `monsters/dcss/.../player/hand_left/`
- `misc/` — Shields, torches, off-hand items

**NOTE:** These are 32x32 top-down paper doll overlays, NOT first-person hand sprites. They'd need to be scaled/redrawn for the first-person hand view at bottom of viewport. Best approach: use these as REFERENCE for drawing larger first-person hands in Phaser.

---

## RECOMMENDED ASSET SELECTION PER GAME COMPONENT

### Dungeon View (Floor 1 — Whispering Crypts)
- **Stone dungeon** walls/floors/ceilings (OptimusDu) as primary
- **Heroine Dusk** doors and locked doors
- **Heroine Dusk** chest sprites
- **DCSS** closed_door for alternate door style

### Dungeon View (Floor 2+ — deeper, darker)
- **Monochrome** or **CGA** variants for nightmare zones
- Recolor stone dungeon darker for deeper floors

### Tavern (The Rusty Flagon)
- **Heroine Dusk** `interior.png` as background/reference
- **Kenney Tiny** furniture tiles for objects
- **DCSS** wall torches for lighting

### Combat Screen
- **Heroine Dusk Remixed** enemies (Redshrike) as primary — higher detail
- **Original Heroine Dusk** enemies as fallback
- **DCSS** undead/demons for deeper floor encounters
- **DCSS** spell icons for magic effects overlay

### Inventory Grid
- **Kyrise 32x32** icons for all items — clean, consistent, wide coverage
- **DCSS** items to supplement any gaps (potions, scrolls, wands)

### Character Display
- **Heroine Dusk protagonist** paper doll layers for equipment preview
- **Flare portraits** for character face

### Spell Effects
- **DCSS** fire/ice/earth spell icons for casting UI
- **DCSS** effect sprites for projectile animations

---

## STILL NEEDED (Not in current collection)

1. **First-person hand sprites** — Large hands holding weapons at bottom of viewport. No pack has these. Must be drawn/created for Phaser implementation.
2. **NPC portraits** — Tavern NPCs (barkeep, merchant, mysterious stranger). Flare pack only has hero faces.
3. **Tavern-specific furniture** — Tables with mugs, bar counter, notice board as sprites. interior.png has these embedded but not as separate objects.
4. **Wall torches (first-person view)** — Torch on wall at multiple depths for the perspective system.
5. **Screaming Brain Studios pack** — The BEST first-person wall pack (189 tiles, CC0). Needs manual download from itch.io.
6. **Snakerser 600+ items** — Most comprehensive free item icon pack. Needs manual download from itch.io.
