# PARTY SYSTEM — Wizardry/Dungeon Master Formation Combat

## READ FIRST
- `docs/2026-03-08-dungeon-x-design.md` — Full game bible. Party system is Phase 3 spec.
- `.cursorrules` — Class templates, design pillars, build rules.
- The game bible says: "Party of up to 4 (front row melee, back row ranged/magic)" and "recruit up to 4 at tavern, one per class."

## CRITICAL CONTEXT
You are modifying `builds/dungeon-x-final.html` — a self-contained 527KB Phaser 3 first-person dungeon crawler. Currently single-character. You are converting it to a 4-person party with Wizardry/Dungeon Master-style formation and turn-based combat.

**The map is DARK. Torchlight is the only visibility. The darkness is the fear engine. Distant things are shadowy and unclear. Do NOT brighten anything. Do NOT change the atmosphere.**

## WHAT EXISTS (DO NOT BREAK)
- 4 CLASS_TEMPLATES: Fighter, Ranger, Mage, Cleric (line ~8738) with full stats, spells, portraits
- Single PLAYER object (line 8703)
- Narrative system referencing `{ally1}`, `{ally2}` — these should now resolve to real party member names
- Combat, inventory, survival (food/water/torch), movement (WASD + arrows), minimap, merchant, NPCs, floor events, touch D-pad
- `applyClass()` function that templates a character

## THE FORMATION SYSTEM (Wizardry + Dungeon Master DNA)

### How Wizardry Did It
- 6 characters in 2 rows of 3: front row (melee) and back row (ranged/magic)
- Front row takes physical hits, can melee attack
- Back row protected from melee, can only use ranged/spells
- Players could SWAP characters between rows mid-combat as a turn action
- Formation order matters — position 1 gets targeted most

### How Dungeon Master Did It
- 4 characters in a 2x2 grid: front-left, front-right, back-left, back-right
- Characters in front swing weapons, characters in back throw/cast
- You could click to rearrange the party at any time outside combat
- In combat, swapping a character to front was tactical — put the fresh Fighter forward, pull the injured Mage back

### OUR IMPLEMENTATION (4 characters, 2 rows)

```
FORMATION (2x2 grid):
┌──────────┬──────────┐
│ FRONT-L  │ FRONT-R  │  ← Takes melee hits, can melee attack
│ Fighter  │ Ranger   │
├──────────┼──────────┤
│ BACK-L   │ BACK-R   │  ← Protected from melee, ranged/spells only
│ Mage     │ Cleric   │
└──────────┴──────────┘
```

**Formation Rules:**
- Front row: can melee attack AND use ranged/spells. Takes melee hits from enemies.
- Back row: can ONLY use ranged weapons, spells, or items. Cannot melee. Protected from enemy melee (enemies must kill front row first, or use ranged attacks).
- ANY character can be in ANY position. Put the Cleric up front if you want. Bad idea, but your call.
- **SWAP action (in combat):** Costs your turn. Swap positions with any other living party member. Tactical — pull a wounded Fighter back, push a fresh Cleric forward to tank one round.
- **Rearrange (outside combat):** Free. Click/drag party portraits to rearrange formation at any time during exploration.

## WHAT TO BUILD

### 1. Party Recruitment at Tavern
- After pressing START, go to Tavern scene (already exists conceptually)
- Show 4 recruitment slots in the 2x2 formation layout
- Default party pre-filled: Fighter (FL), Ranger (FR), Mage (BL), Cleric (BR)
- Player can: rename characters, swap which class is in which slot
- "Descend" button when ready
- Simple — no stat rolling. CLASS_TEMPLATES define everything.

### 2. Party Data Structure
```javascript
let PARTY = [
  { ...deepCopy(CLASS_TEMPLATES.Fighter), name: 'Roland', position: 0, alive: true, defending: false },
  { ...deepCopy(CLASS_TEMPLATES.Ranger), name: 'Swift', position: 1, alive: true, defending: false },
  { ...deepCopy(CLASS_TEMPLATES.Mage), name: 'Grimm', position: 2, alive: true, defending: false },
  { ...deepCopy(CLASS_TEMPLATES.Cleric), name: 'Sera', position: 3, alive: true, defending: false }
];
// positions: 0=front-left, 1=front-right, 2=back-left, 3=back-right
// PLAYER = reference to PARTY[0] for movement/position compatibility

function isFrontRow(member) { return member.position <= 1; }
function isBackRow(member) { return member.position >= 2; }
function livingMembers() { return PARTY.filter(m => m.alive); }
function frontRow() { return PARTY.filter(m => m.position <= 1 && m.alive); }
function backRow() { return PARTY.filter(m => m.position >= 2 && m.alive); }
```

### 3. HUD — Formation Display (Right Sidebar)
Replace single HP/MP with 2x2 formation view:
```
┌─────────────┬─────────────┐
│ F  Roland    │ R  Swift     │  FRONT
│ ████████ 12 │ ██████  9    │
├─────────────┼─────────────┤
│ M  Grimm    │ C  Sera      │  BACK
│ ██  4  ♦20  │ ████ 8  ♦15  │
└─────────────┴─────────────┘
```
- Class letter + color (Fighter=red, Ranger=green, Mage=blue, Cleric=gold)
- HP bar (red). MP diamond + number for casters.
- KO'd: skull icon, greyed out, red tint
- Active turn in combat: pulsing gold border
- Clickable to select for formation swap (outside combat)

### 4. Combat — Turn-Based Formation Combat (THE CORE)

**Initiative:** d20 + DEX mod per combatant (all 4 party members + all enemies). Highest goes first. This is in the game bible.

**Each Turn (per character):**
Show "[Name]'s Turn" banner. Options:

| Action | Front Row | Back Row | Effect |
|--------|-----------|----------|--------|
| Attack (melee) | YES | NO | d20 + attackMod vs enemy AC. Damage on hit. |
| Attack (ranged) | YES | YES | Only if equipped with bow/thrown weapon |
| Cast Spell | YES | YES | Costs mana. Target selection for heals. |
| Use Item | YES | YES | Potions, scrolls, etc. from that character's inventory |
| Defend | YES | YES | +2 AC until next turn. Skip attack. |
| **Swap** | YES | YES | Trade positions with another living member. Costs your turn. Tactical retreat/advance. |

**Enemy Targeting:**
- Melee enemies: MUST target front row. If front row all dead, then back row.
- Ranged enemies (archers, mages): can target anyone (30% chance back row)
- Boss enemies: target lowest HP member (smart targeting)
- Each enemy attacks ONE party member per round

**Damage & Death:**
- Damage applies to the targeted character only
- 0 HP = KO'd (greyed, can't act, can't be targeted by heals unless Revive)
- Cleric spell "Revive" (10 mana): restore KO'd ally to 25% HP. They act next round.
- ALL four KO'd = Total Party Kill. Game over screen (same as current death screen).

**The Swap Mechanic (Wizardry/DM feel):**
This is what makes formation tactical. Examples:
- Fighter at 2 HP in front. Swap with Cleric. Cleric tanks one hit (she has armor). Next turn Cleric heals herself. Fighter in back row is safe.
- Mage needs to melee (out of mana). Swap to front. Desperate move.
- Ranger swaps to front to Shield Wall the boss. Unusual but valid.

### 5. Inventory — Per Character with Transfer
- Each party member has own inventory + equipment
- I key opens inventory. 4 tabs across top (one per character, colored by class)
- Click tab to see that character's gear
- Drag item from one character's inventory to another's tab = transfer
- Class restrictions enforced on equip (not on carry)
- Merchant: buying goes to active character's inventory. Can transfer after.

### 6. Shared Resources (Party-Level)
- Food, Water, Torch: SHARED. Same consumption rate as now (not x4).
- Gold: shared pool
- Keys: shared pool
- These display below the formation HUD

### 7. XP & Leveling
- XP from kills split equally among LIVING members (dead get nothing — Wizardry rule)
- Each character levels independently using existing level-up logic
- Level-up notification per character

### 8. Narrative Integration
- `{ally1}` resolves to PARTY[1].name, `{ally2}` resolves to PARTY[2].name
- Death narratives reference the fallen character by name
- Merchant addresses the party leader (PARTY[0])

### 9. Movement & Exploration
- NO CHANGE. Party moves as one unit. WASD + Arrows. Touch D-pad.
- PLAYER.x, PLAYER.y, PLAYER.dir still control position
- Formation rearrangement available anytime during exploration (click portraits to swap)

## VISUAL STYLE
- **DARK. SCARY. TORCHLIT.** Do not touch the lighting engine.
- Formation portraits: colored rectangles with class initial (F/R/M/C) and name
- Fighter=dark red, Ranger=forest green, Mage=deep blue, Cleric=warm gold
- KO'd: skull overlay, desaturated
- Active turn: pulsing gold border
- Swap action: show arrow indicators between positions

## COMPATIBILITY REQUIREMENTS
- Single self-contained HTML file
- Phaser 3 from CDN (already loaded)
- All existing systems preserved: merchant, NPCs, floor events, minimap, narrative, daily seed, save/load
- WASD + Arrow keys + Touch D-pad
- No external assets (programmatic rendering)

## OUTPUT
Update `builds/dungeon-x-final.html` in place. The game should launch, let you recruit a 4-person party, enter the dungeon, and fight with formation-based turn combat. Every existing feature still works.

## QUALITY BAR
- Zero crashes. Zero TypeErrors. Zero undefined errors.
- All 4 characters participate meaningfully in combat
- Formation swap works and is tactically relevant
- Front/back row distinction enforced (no melee from back row)
- Enemy targeting respects formation
- KO'd characters visually obvious, can't act
- Party wipe = game over
- The vibe: Wizardry I, Dungeon Master, Eye of the Beholder. Dark. Tactical. Every decision matters.
