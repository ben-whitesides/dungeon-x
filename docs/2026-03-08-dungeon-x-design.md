# Dungeon X — Game Design Document

**Version:** 1.1 (Locked — Class System + Inventory + Drag-and-Drop added)
**Date:** 2026-03-08
**Author:** Ben Whitesides + Tommy Shelby

## Vision

Browser-based dungeon crawler blending Wizardry (1981) and Dungeon Master (1987) with modern roguelike engagement hooks. Retro pixel art. 15-minute runs. Daily seeded dungeons. Spell combination puzzles. Dynamic torchlight and darkness as a core mechanic.

Target: 30-50 age bracket who grew up on these games. Browser-first (HTML5 Canvas + Web Audio API). No install. No login required for first play.

---

## Core Loop

```
TAVERN (The Rusty Flagon)
  → Hear rumors from NPCs, pick a dungeon from the notice board
  → Recruit party members, buy supplies, review spell codex
  → Daily rotation: 2-3 dungeon options with unique lore and difficulty
    |
OVERWORLD PATH (pixel top-down walk, 30-60 seconds)
  → Side caves / mini-dungeons for optional loot and spell fragments
  → Wandering NPCs, shrines (buffs/curses), random ambushes
  → Skip-able — head straight to dungeon if preferred
    |
DUNGEON (first-person grid crawl, 10-15 minutes)
  → Dynamic torchlight with true darkness beyond radius
  → Spell combination puzzles (escape room model)
  → Turn-based combat with elemental weakness system
  → NPC helpers, environmental clues, wall markings
  → Floor-by-floor progression, deeper = harder + richer rewards
    |
RETURN OR DEATH
  → Survive: return to tavern with loot, XP, meta-knowledge
  → Die: character becomes ghost NPC in future runs
  → Daily leaderboard + community message board
```

---

## The Tavern — The Rusty Flagon

Home base. Warm pixel art interior. Fireplace. Barkeep. Patrons at tables.

### Features
- **Notice Board** — Daily dungeon options (2-3). Name, difficulty (skull rating), rumored treasure, cryptic bounty description. Rotates every 24 hours via daily seed.
- **NPC Rumors** — Tavern patrons give gameplay hints disguised as chatter. "Fire don't work on Floor 3, friend." "The door that listens..." These change with the daily seed.
- **Party Management** — Recruit companions, swap gear, review spell codex, check bestiary.
- **Trophy Wall** — Personal best runs. Deepest floor. Rarest artifact. Visual progression.
- **The Merchant** — Spend gold on torches, potions, spell scrolls. Preparation, not power creep.

### Atmosphere
- Low-tempo retro music. Safe. Warm.
- Contrast with dungeon creates emotional whiplash.

---

## The Overworld Path

Top-down pixel art. Character walks from tavern to selected dungeon entrance. Terrain matches dungeon theme (forest, mountain, swamp, volcanic).

### Side Content (Optional)
- **Cave Entrances** — 2-3 room mini-dungeons. Quick loot: torches, spell fragments, cryptic notes about main dungeon.
- **Wandering NPCs** — Trade, talk, or ignore. Some honest, some not.
- **Shrines** — Quick prayer = random buff for the run. Corrupted shrine = curse.
- **Ambushes** — Bandits or creatures. Quick combat. Drops loot.

30-60 second traverse. Risk/reward appetizer. Can skip to dungeon entrance directly.

---

## Magic System — The Arcane Codex

### Elemental Roots
Six base elements: Fire, Ice, Stone, Wind, Shadow, Light.

### Spell Combinations
Combine two elements for advanced effects:
- Fire + Wind = Inferno Gust (blast doors, clear gas)
- Ice + Stone = Frost Lock (freeze mechanisms, disarm traps)
- Shadow + Light = Reveal (hidden passages, invisible enemies)
- Fire + Stone = Magma Seal (forge bridges, seal doors)
- Wind + Ice = Blizzard (area damage, slow enemies)
- Shadow + Wind = Phantom Step (phase through thin walls)

### Discovery
- Experimentation: try combos, some fizzle, some backfire, some surprise
- Wall markings hint at combinations
- NPC helpers teach specific combos
- Bestiary entries suggest effective spells per enemy type

### Utility Beyond Combat
- Open locked doors
- Disarm traps
- Solve environmental puzzles (redirect water with Ice, burn barriers with Fire)
- Reveal hidden content (Shadow + Light)
- Create tactical advantages (block pursuit with Magma Seal)

---

## Dynamic Lighting — The Fear Engine

### Torch Radius System
- Party carries light source (torch, lantern, light spell)
- Illuminates cone/radius ahead. Beyond = true black.
- Enemies heard before seen (growling, chains, claws on stone)

### Light as Resource
- Torches burn down over time
- Lanterns need oil
- Light spells drain mana
- Deeper floors = darker, more expensive to illuminate

### Light Spell Tiers
| Spell | Radius | Duration | Cost | Special |
|-------|--------|----------|------|---------|
| Spark | Tiny | 30 sec | Free | Barely see your feet |
| Torchlight | Medium cone | 2 min | Low mana | Standard exploration |
| Sunburst | Entire room | 3 sec | High mana | Reveals all + blinds shadow creatures |
| Darkvision | Full | 1 min | Rare scroll | See without emitting light. Enemies can't see you. |

### The Fireball Scout
Hear something in the dark? Launch a fireball. Lights the corridor for 2 seconds. Whatever's there — you see it. And it sees you.

### Creature Light Behavior
- Some hunt by sound → light makes them scatter
- Shadow creatures → stronger in dark, weaken in light
- Player must read the situation. Light isn't always correct.

---

## Combat System — Classic D&D Model

> Full spec: `combat-system-dnd.md`

### Core Mechanics (D&D Heritage)
- **Hit Points (HP)** — Damage pool. 0 HP = unconscious. -10 = dead.
- **Armor Class (AC)** — Higher = harder to hit. Base 10 + armor + DEX mod + shield.
- **Attack Rolls** — d20 + modifier vs target AC. Meet or beat = hit. Below = miss entirely.
- **Damage Dice** — Weapon-specific (dagger d4, sword d8, greatsword d10). Roll on hit only.
- **Critical Hit (nat 20)** — Double damage dice. "Your sword finds a weak point!"
- **Critical Miss (nat 1)** — Attack fails. Possible fumble. Enemy gets advantage.
- **Saving Throws** — d20 + modifier vs Spell Save DC. Pass = half damage or resist effect.
- **Initiative** — d20 + DEX mod. Highest goes first. Ties favor the player.

### Six Ability Scores (3-18 range)
STR (melee, carry weight), DEX (AC, ranged, initiative), CON (HP, endurance), INT (mana, arcane), WIS (healing, perception), CHA (NPC interaction, prices)

### Turn-Based with Positioning
- Party of up to 4 (front row melee, back row ranged/magic)
- Initiative: d20 + DEX modifier per combatant
- Each turn: Attack, Cast Spell, Use Item, Defend (+2 AC until next turn), Flee (DEX contest)

### Elemental Weakness Grid
| Enemy Type | Weak To | Resistant To | Immune To |
|-----------|---------|-------------|-----------|
| Undead | Fire, Light | Shadow | Poison |
| Beasts | Ice, Shadow | Stone | — |
| Constructs | Stone, Wind | Fire | Poison, Shadow |
| Demons | Light, Ice | Fire | Shadow |
| Spirits | Shadow, Stone | Wind | Physical |

### Environmental Combat (Dungeon Master DNA)
- Lure enemies under gate doors, drop them
- Use wall torches to burn creatures
- Collapse unstable ceilings
- Freeze water on floor to create slip zones
- Push enemies into pit traps

### Knowledge Discovery
- Weaknesses learned through observation, not UI labels
- Bestiary fills in as player experiments
- NPC hints supplement direct experience

---

## NPC System — The Wanderers

### Dungeon NPCs
- **The Scribe** — Chained in a cell. Free him, he translates markings on that floor.
- **The Alchemist** — Wounded. Heal her, she teaches one spell combination.
- **The Ghost** — Previous adventurer who died here. Tells you what killed him.
- **The Trickster** — Offers a deal. Could be help. Could be a trap.

### Persistence
- Some NPCs appear across multiple runs
- Build rapport — they remember you and offer deeper intel
- Player's own dead characters become ghost NPCs in future runs

---

## Wall Markings & Clue System

### Types
- **Scratch marks** — Warnings from previous adventurers ("FIRE ALONE WON'T WORK")
- **Rune carvings** — Half-complete spell formulas. Player figures out missing element.
- **Blood trails** — Follow to find what the last traveler dropped.
- **Journals** — Multi-page entries found across floors. Pieced together across runs.

### Meta-Progression
- Some markings are from your own previous runs
- Die on floor 4? Next run, your ghost might be there with your journal entry
- Community daily messages from other players who beat the seed

---

## Audio Design

### Layers
| Layer | Purpose | Implementation |
|-------|---------|---------------|
| Ambient base | Low drone, barely audible | Continuous oscillator, Web Audio API |
| Exploration loop | 8-16 bar retro melody, minor key | Procedural chiptune or small .ogg samples |
| Combat trigger | Tempo doubles, drums kick in | Triggered on enemy encounter |
| Danger proximity | Heartbeat pulse, faster as enemies close | Gain node tied to distance calculation |
| Silence | Some floors have NO music | Absence creates fear |

### Reactive Audio
- Bright torch = clearer melody, structured
- Dim torch = distorted, detuned, unsettling
- No light = just low drone + environmental sounds

### Sound as Gameplay
- Enemy sounds are distinct (identify threats by audio before sight)
- Traps make subtle sounds (click, hiss, grinding gears)
- Some enemies go silent when they know you're watching

---

## Visual Style

Retro pixel art. Minecraft/Terraria energy. Not fancy. Characterful.

### Rendering
- HTML5 Canvas
- First-person dungeon view (pseudo-3D wireframe with pixel textures)
- Top-down for overworld path
- Pixel art tavern scene (2D illustrated)

### Lighting Effects
- Orange torchlight glow with flicker animation
- Shadows on dungeon walls
- Shapes moving at edge of light radius
- Screen mostly black in low-light situations

---

## Character Classes — Balanced, Not Magic-Heavy

Four classes. Every class has equal value in combat, puzzles, and exploration. No class can solo everything. Party composition matters.

### Fighter
- **Combat:** Melee specialist. Highest HP, heaviest armor. Front-line tank.
- **Puzzles:** Brute strength — push stone blocks, bend iron bars, hold gates open, break crumbling walls
- **Exploration:** Can force open stuck doors (chance-based), carry more weight, resist physical traps
- **Unique ability:** Shield Bash (stun enemy 1 turn), War Cry (draw aggro from party)

### Ranger
- **Combat:** Ranged specialist. Bows, thrown weapons. Medium armor. Balanced offense.
- **Puzzles:** Precision — shoot arrows through narrow slots to hit switches, spot fake doors, read tracks
- **Exploration:** Spot traps from 2 tiles away (highlighted on approach), forage for food in the dungeon
- **Unique ability:** Eagle Eye (reveal 1 tile in any direction), Snare Trap (slow enemy 2 turns)

### Mage
- **Combat:** Spell caster. Low HP, no armor. Elemental spell combos (Fire, Ice, Stone, Wind, Shadow, Light).
- **Puzzles:** Arcane knowledge — decipher runes, combine spells for utility (open magic doors, reveal hidden passages)
- **Exploration:** Light spells for visibility, Reveal for hidden content, Darkvision for stealth
- **Unique ability:** Spell Combination (2 elements = advanced spell), Mana Surge (double damage, costs double)

### Cleric
- **Combat:** Healer and support. Medium HP, medium armor. Mace/staff weapons. Healing spells.
- **Puzzles:** Divine knowledge — read ancient religious texts, purify corrupted objects, sense undead through walls
- **Exploration:** Heal party members, cure poison/curse, bless items (temporary buff), sense evil (shows nearby enemies)
- **Unique ability:** Purify (cure any status + dispel curses), Holy Shield (absorb next hit for ally)

### Class Balance in Escape Room Design
Every floor has puzzles requiring multiple disciplines:
- Physical obstacle (Fighter needed)
- Precision trigger (Ranger needed)
- Arcane mechanism (Mage needed)
- Corrupted/cursed element (Cleric needed)

A solo player picks one class and must find creative workarounds. A party covers all bases.

---

## Inventory System — Dungeon Master Grid Style

### Character Panel (Dungeon Master reference)
Full-screen overlay showing:
- **Body silhouette** with equipment slots: Head, Chest, Arms, Legs, Feet, Hands, Left Hand (weapon/shield), Right Hand (weapon/shield)
- **Grid backpack** below body: 4x6 grid (24 slots). Each item occupies 1 slot.
- **Food bar** (orange, depletes over time — eat food items to refill)
- **Water bar** (blue, depletes over time — drink water/potions to refill)
- **Health, Mana, Stamina bars** on the side
- **Weight/Load indicator** — carry too much = move slower, can't run

### Item Types
| Category | Examples | Grid Visual |
|----------|----------|-------------|
| Weapons | Sword, Mace, Bow, Staff, Dagger | Colored pixel sprite per item |
| Armor | Helmet, Chainmail, Leather, Shield, Boots | Equipment slot visual |
| Consumables | Bread, Meat, Water Flask, Health Potion, Mana Potion | Stacks up to 5 |
| Keys | Iron Key, Gold Key, Crystal Key, Skeleton Key | Different colors |
| Scrolls | Spell Scroll, Map Fragment, Lore Page | Rolled parchment pixel art |
| Arrows | Standard (stack of 20), Fire Arrows (stack of 5) | Quiver visual |
| Torches | Standard Torch (burns 3 min), Everlight (burns 10 min) | Flame icon |
| Quest Items | Sunstone Fragments, Ancient Relics, NPC quest items | Golden border |

### Survival Mechanics
- **Food** depletes 1%/min during dungeon exploration. At 0%, HP drains slowly. Find food in barrels, buy at merchant, forage (Ranger skill).
- **Water** depletes 1.5%/min. At 0%, Mana stops regenerating. Find water in pools, buy flasks.
- **Torches** are inventory items. Equip one to have light. They burn down. No torch = darkness.

---

## Drag-and-Drop Interaction — Physical Manipulation

The core UX differentiator. Players physically interact with the world using mouse drag.

### How It Works
1. **Click and hold** an item in inventory grid — item attaches to cursor
2. **Drag** the item across the screen
3. **Drop** on a valid target — interaction triggers
4. **Invalid drop** — item bounces back to inventory with a fizzle sound

### Interaction Types

**Keys → Keyholes:**
- Locked doors show a keyhole in the first-person view
- Drag the matching key from inventory onto the keyhole
- Wrong key: bounce back + "clunk" sound + "This key doesn't fit" message
- Right key: key turns animation + door opens + key consumed from inventory

**Levers:**
- Click the lever handle in the dungeon view
- Drag downward to pull
- Release too early: lever snaps back (spring sound)
- Pull fully: mechanism activates (grinding gears sound) + gate opens / trap disarms / bridge extends

**Torches → Wall Sconces:**
- Empty sconces visible on dungeon walls
- Drag a torch from inventory → drop on sconce
- Permanently lights that section of the corridor (even on future visits)
- Strategic: limited torches, choose which areas to illuminate permanently

**Potions → Characters or Weapons:**
- Drag health potion to character portrait → drink (heal HP)
- Drag mana potion to character → drink (restore mana)
- Drag poison vial to weapon → coat weapon (adds poison damage for 3 hits)
- Drag fire oil to weapon → coat weapon (adds fire damage for 3 hits)

**Food/Water → Character:**
- Drag bread/meat to character → eat (restore food bar)
- Drag water flask to character → drink (restore water bar)

**Weapons → Combat View:**
- During combat, drag a throwable weapon (dagger, axe) from inventory to enemy → throw attack
- Thrown weapons can be recovered from enemy corpse after combat

**Scrolls → Environment:**
- Drag spell scroll to a puzzle mechanism → cast the scroll's spell on it
- Scroll consumed after use. Powerful but limited.

### Technical Implementation (Canvas)
- `mousedown` on inventory slot → begin drag, store item reference
- `mousemove` → render item sprite following cursor with slight transparency
- `mouseup` → check drop zone (keyhole hitbox, lever hitbox, character portrait, etc.)
- Drop zones highlighted with subtle glow when dragging a compatible item near them
- Snap-back animation (ease-out) when drop is invalid

---

## The Sunstone — Overarching Quest (Zelda-style)

### The Legend
An ancient artifact called **The Sunstone** was shattered into 10 fragments and scattered across 10 dungeons. Legend says reassembling it can "heal the world" — but no one has found more than a single piece in centuries.

### Fragments
Each dungeon contains one unique fragment, always in its deepest/hardest-to-reach location:
1. Fragment of Dawn (The Whispering Crypts)
2. Fragment of Dusk (Goblin Warrens)
3. Fragment of Storm (The Flooded Vaults)
4. Fragment of Flame (Ember Depths)
5. Fragment of Frost (The Frozen Abyss)
6. Fragment of Stone (The Shattered Halls)
7. Fragment of Wind (The Howling Spire)
8. Fragment of Shadow (The Void Chambers)
9. Fragment of Light (The Crystal Sanctum)
10. Fragment of Life (The Final Descent)

### Progression
- Fragments persist in localStorage across all runs
- Tavern trophy wall shows 10 slots — found fragments glow gold, unfound are dark
- NPCs reference how many fragments you've found
- At 5/10: NPC dialogue shifts — "They say you're actually doing it..."
- At 10/10: Final quest unlocks — The Sunstone Assembly (endgame event)

### Scalability
Can expand to 100 dungeons with sub-quests and secondary relics. The 10-fragment arc is the first "season." Future seasons add new artifact hunts.

---

## Tavern Lore & Reputation

### Player Reputation
Tracked cumulatively in localStorage:
- Total runs, enemies slain, gold earned, fragments found, deepest floor
- Reputation title: Unknown Stranger → Curious Wanderer → Dungeon Delver → Seasoned Adventurer → Feared Warrior → Legendary Champion

### The Strider Effect
After 5+ runs, tavern NPCs whisper about the player's achievements:
- Translucent text fading in/out at screen edges
- References actual stats: "...they say the Stranger found the Fragment of Dawn..."
- Other players' legendary runs also appear as whispers (multiplayer future)
- The player becomes a legend in their own tavern — the Strider in the corner

### Trophy Wall
Near the fireplace: fragment slots (gold/dark), enemy skulls (colored when slain), runs counter.

---

## Meta-Progression

- **Knowledge persists** — Bestiary, spell combos, NPC relationships
- **Tavern upgrades** — New rooms, better merchant, advanced notice board
- **Character legacy** — Dead characters become dungeon ghosts
- **Daily seeds** — Same layout for all players, leaderboard
- **Community board** — One message per completed run

---

## Technical Stack

- **Rendering:** HTML5 Canvas (2D context)
- **Audio:** Web Audio API (procedural + small samples)
- **Language:** Vanilla JavaScript (no frameworks)
- **Storage:** localStorage for save state / meta-progression
- **Distribution:** Single HTML file or small bundle. No server required for single-player.
- **Target:** Modern browsers (Chrome, Firefox, Safari, Edge)

---

## Phase 1 — Proof of Concept (DONE)

Single HTML file. 3 enemies. Tavern with lore/reputation. Artifact fragment system. Dynamic torchlight. Spell combo puzzle. Retro audio.

### Phase 1.5 — Inventory & Interaction (Next Build)
- Grid inventory system (4x6 backpack + equipment slots on body silhouette)
- Drag-and-drop items (keys → keyholes, levers, potions → characters)
- Food & Water survival bars
- Class selection at tavern (Fighter/Ranger/Mage/Cleric — single character for now)
- Class-specific puzzle interactions (strength, precision, arcane, divine)
- Multiple key types (Iron, Gold) for different locked doors
- Throwable items in combat (drag dagger to enemy)

### Phase 2 — Multi-Floor + Overworld
- 3-floor dungeon with descending difficulty
- Overworld path with side caves (+ fast travel skip)
- Full spell combination system (6 elements)
- Daily seed system
- More enemy types per floor
- Wall sconce torch mounting (drag torch → sconce)
- localStorage save state

### Phase 3 — Party + Social
- Party system (recruit up to 4 at tavern, one per class)
- Full tavern with merchant, trophy wall, party management
- 10+ enemy types across 3+ dungeons
- NPC helper system with persistence
- Wall markings + ghost system (your dead characters appear)
- Community message board
- Leaderboard
- Second dungeon (Goblin Warrens) with Fragment #2

### Phase 4 — The Sunstone Arc
- All 10 dungeons with unique themes and fragments
- Sunstone Assembly endgame event
- Cross-player whispered legends (multiplayer lore)
- Mobile touch controls + drag-and-drop for touch
- Seasonal content (new artifact hunts)
