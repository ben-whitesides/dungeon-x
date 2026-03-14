# ASSET PATCH — Load Real Pixel Art Into Dungeon X Phase 2

## CRITICAL ISSUE
The current `builds/dungeon-x-phase2.html` uses inline drawn shapes (rectangles, basic colors) instead of the downloaded pixel art assets in `assets/`. This patch fixes that. ALL visual elements must use the real PNG assets below.

## ASSET MAPPING — Use These Exact Paths

All paths are relative to the project root (`~/Desktop/Dungeon X/`).

### DUNGEON ENVIRONMENT (First-Person View)
These are the Heroine Dusk tiles — designed specifically for first-person dungeon crawlers:

| Game Element | Asset Path |
|---|---|
| Wall | `assets/walls-floors/heroine-dusk/tiles/first person dungeon crawl tiles/dungeon_wall.png` |
| Floor | `assets/walls-floors/heroine-dusk/tiles/first person dungeon crawl tiles/dungeon_floor.png` |
| Ceiling | `assets/walls-floors/heroine-dusk/tiles/first person dungeon crawl tiles/dungeon_ceiling.png` |
| Door | `assets/walls-floors/heroine-dusk/tiles/first person dungeon crawl tiles/dungeon_door.png` |
| Locked Door | `assets/walls-floors/heroine-dusk/tiles/first person dungeon crawl tiles/locked_door.png` |
| Pillar (interior) | `assets/walls-floors/heroine-dusk/tiles/first person dungeon crawl tiles/pillar_interior.png` |
| Pillar (exterior) | `assets/walls-floors/heroine-dusk/tiles/first person dungeon crawl tiles/pillar_exterior.png` |
| Chest (exterior) | `assets/walls-floors/heroine-dusk/tiles/first person dungeon crawl tiles/chest_exterior.png` |
| Chest (interior/open) | `assets/walls-floors/heroine-dusk/tiles/first person dungeon crawl tiles/chest_interior.png` |
| Skull Pile | `assets/walls-floors/heroine-dusk/tiles/first person dungeon crawl tiles/skull_pile.png` |
| Hay Pile | `assets/walls-floors/heroine-dusk/tiles/first person dungeon crawl tiles/hay_pile.png` |
| Grave (cross) | `assets/walls-floors/heroine-dusk/tiles/first person dungeon crawl tiles/grave_cross.png` |
| Grave (stone) | `assets/walls-floors/heroine-dusk/tiles/first person dungeon crawl tiles/grave_stone.png` |
| Interior room | `assets/walls-floors/heroine-dusk/tiles/first person dungeon crawl tiles/interior.png` |

### ENEMIES (First-Person Combat View)
Heroine Dusk enemies — pixel art designed for first-person encounter display:

| Enemy | Asset Path |
|---|---|
| Skeleton | `assets/walls-floors/heroine-dusk/enemies/first person dungeon crawl enemies/skeleton.png` |
| Zombie | `assets/walls-floors/heroine-dusk/enemies/first person dungeon crawl enemies/zombie.png` |
| Imp | `assets/walls-floors/heroine-dusk/enemies/first person dungeon crawl enemies/imp.png` |
| Druid | `assets/walls-floors/heroine-dusk/enemies/first person dungeon crawl enemies/druid.png` |
| Death Speaker | `assets/walls-floors/heroine-dusk/enemies/first person dungeon crawl enemies/death_speaker.png` |
| Shadow Soul | `assets/walls-floors/heroine-dusk/enemies/first person dungeon crawl enemies/shadow_soul.png` |
| Shadow Tendrils | `assets/walls-floors/heroine-dusk/enemies/first person dungeon crawl enemies/shadow_tendrils.png` |
| Mimic | `assets/walls-floors/heroine-dusk/enemies/first person dungeon crawl enemies/mimic.png` |
| Bone Shield | `assets/walls-floors/heroine-dusk/enemies/first person dungeon crawl enemies/bone_shield.png` |

### DUNGEON OBJECTS
| Object | Asset Path |
|---|---|
| Crate | `assets/objects/dungeon_objects/crate_exterior.png` |
| Boulder | `assets/objects/dungeon_objects/boulder_exterior.png` |
| Case | `assets/objects/dungeon_objects/case_exterior.png` |
| Block | `assets/objects/dungeon_objects/block_exterior.png` |
| Large Crate | `assets/objects/crate_large.png` |

### ITEM ICONS (16x16 — for inventory, loot, HUD)
Located in: `assets/items/kyrise-icons/Kyrise's 16x16 RPG Icon Pack - V1.2/icons/16x16/`
Key items to use:
- `sword_*.png` — weapon icons
- `shield_*.png` — shield icons
- `potion_*.png` — health/mana potions
- `key_*.png` — dungeon keys
- `scroll_*.png` — spell scrolls
- `armor_*.png` — armor pieces
- `ring_*.png` — magic rings
- `book_*.png` — spell books
- `gem_*.png` — treasure gems
- `coin_*.png` — gold coins

### PORTRAITS (Character Select / HUD)
- Protagonist: `assets/portraits/protagonist/`
- NPC/Ally faces: `assets/portraits/flare/`

## IMPLEMENTATION INSTRUCTIONS

1. **Load all images as `new Image()` objects at game init.** Pre-load before game starts. Show a loading bar.

2. **First-person dungeon view**: Replace all `fillRect()` / `strokeRect()` wall/floor/ceiling draws with the Heroine Dusk tile PNGs using `drawImage()`. These tiles are 640x120px designed for raycasting/first-person perspective rendering.

3. **Enemy encounters**: When entering combat, render the enemy PNG centered in the viewport. Scale to fit. These are designed for first-person display.

4. **Inventory/HUD**: Replace colored squares with Kyrise 16x16 icons. Scale 2x or 3x for display (32px or 48px).

5. **Minimap**: Can stay as simple colored tiles — that's fine for minimap scale.

6. **Objects in dungeon**: Render crates, boulders, chests using the object PNGs instead of colored rectangles.

7. **Since this is a single HTML file**, embed the image loading using relative paths from where the HTML is served. The HTML is in `builds/` so paths should be `../assets/...`

## QUALITY BAR
- NO more colored rectangles for game elements
- Every wall, floor, door, enemy, chest, item must use real pixel art
- The game should look like a retro dungeon crawler, not a prototype
- Maintain all existing game logic (combat, movement, inventory, torch)
- Just swap the visuals

## OUTPUT
Update `builds/dungeon-x-phase2.html` in place. Keep all game logic. Replace all visual rendering with real assets.
