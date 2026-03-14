# DX Character Customization — Open Party Creation
## Target: Cursor Workspace | Priority: HIGH

## FILE TO MODIFY
`index.html` in the `ben-whitesides/dungeon-x` repo (GitHub Pages, live at ben-whitesides.github.io/dungeon-x/)

This is a single self-contained ~12,452-line Phaser 3 first-person dungeon crawler HTML file. The party system was just added — 4 preset characters (Fighter Roland, Ranger Swift, Mage Grimm, Cleric Sera) in a 2x2 formation.

## THE CHANGE
The current party creation is too restrictive. Players get 4 preset characters locked to specific classes and positions. Open it up completely.

## WHAT TO BUILD

### 1. Custom Character Names
- Each of the 4 party slots should have an **editable text field** for the character name
- Default names pre-filled (Roland, Swift, Grimm, Sera) but fully editable
- Player can name them whatever they want
- Names persist through the entire game (combat, narrative, death messages, HUD)

### 2. Class Selection Per Slot — NO RESTRICTIONS
- Each party slot gets a **class dropdown or selector** (Fighter, Ranger, Mage, Cleric)
- **Any combination is valid.** 4 Mages? Fine. 4 Fighters? Fine. 2 Clerics + 2 Rangers? Fine.
- No restriction on class duplication
- No restriction on "you must have a healer" or "you need a tank"
- Let the player build whatever party they want — that's the fun
- Each slot still shows the class color and icon

### 3. Starting Equipment Selection
- After choosing class, each character should get to pick from available starting gear
- Show the equipment options for that class:
  - **Fighter:** Choose weapon (Sword, Axe, Mace) + armor (Chain Mail, Leather + Shield)
  - **Ranger:** Choose weapon (Longbow, Shortbow + Dagger, Dual Daggers) + armor (Leather, Scout's Garb)
  - **Mage:** Choose weapon (Staff, Wand, Orb) + robe (Apprentice Robe, Battle Mage Garb)
  - **Cleric:** Choose weapon (Mace, Staff, Hammer) + armor (Chain Mail, Blessed Robes)
- Each option should have a brief stat tooltip (damage range, AC bonus, special effect)
- Keep it simple — 2-3 choices per slot, not an overwhelming catalog
- These are STARTING items. More gear found in dungeon.

### 4. Position Selection (Formation)
- The 2x2 formation grid should be **drag-and-drop** or click-to-swap
- Player arranges their 4 characters in any formation they want
- Front row (positions 0-1): Melee range. Back row (positions 2-3): Protected.
- Show a brief tooltip: "Front row: can melee attack, gets hit first. Back row: protected, ranged/magic only."
- Default layout pre-filled but fully rearrangeable

### 5. Party Preview
- Before descending, show a **party summary card**:
  - All 4 characters with name, class, position, equipment
  - Total party HP, total party MP
  - Any warnings (e.g., "No healer — healing potions are your only recovery option")
  - Warnings are informational, NOT blocking. Player can still proceed.
- Big "DESCEND INTO THE DUNGEON" button

### 6. Tavern Scene Upgrade
- Replace the current basic recruitment screen with a **tavern scene**
- Dark, atmospheric — fits the dungeon aesthetic
- 4 "seats" at the tavern table = 4 party slots
- Each seat shows: Name field + Class selector + Equipment picker
- Class color coding on each seat (Fighter=dark red #882222, Ranger=forest green #228844, Mage=deep blue #224488, Cleric=warm gold #aa8822)
- Formation grid below the tavern table

## WHAT NOT TO CHANGE
- **DO NOT touch the combat system.** Formation rules, targeting, damage, spells — all stay the same.
- **DO NOT touch the lighting/darkness.** Torchlight stays. Dark stays.
- **DO NOT touch movement, minimap, inventory, merchant, NPCs, floor events, save/load.**
- **DO NOT change CLASS_TEMPLATES stats.** The classes keep their existing stats, spells, and abilities.
- Only the party CREATION screen changes. Everything after "Descend" works the same.

## EDGE CASES TO HANDLE
- **4 of the same class:** Works fine. Each is an independent instance with their own HP/MP/inventory.
- **No healer party:** Show a warning "No Cleric — you'll rely on potions for healing" but LET THEM DO IT.
- **No front-line fighter:** Show a warning "No melee fighters in front row — back row characters can't melee attack" but LET THEM DO IT.
- **Duplicate names:** Allowed. If someone names all 4 characters "Dave", that's their choice.
- **Empty name:** Default to class name (e.g., "Fighter 1") if name field is left blank.

## VISUAL STYLE
- Dark tavern aesthetic matching the dungeon theme
- Same color palette as the game (#0f172a background, torchlit orange accents)
- Class colors for slot borders
- Equipment icons can be simple text/emoji representations (⚔️ 🏹 🔮 ✝️) — no external assets
- Responsive — works on mobile too

## QUALITY BAR
- Zero crashes with any class combination
- Names display correctly everywhere (HUD, combat, death messages, narrative, merchant dialogue)
- Equipment choices actually affect starting stats (damage, AC, etc.)
- Formation preview accurately shows front/back row rules
- Mobile touch-friendly on the tavern screen
- The vibe: "Your dungeon, your party, your rules"
