# DUNGEON X — CARD/DECK-BUILDING COMBAT SYSTEM
## Complete Design Scope v2.1 FINAL | March 2026 (Masters Review Passed — 8.5/10)
## Masters-Grade Production Document

---

# TABLE OF CONTENTS

1. [Design Philosophy](#1-design-philosophy)
2. [Card Data Structure](#2-card-data-structure)
3. [Combat Mechanics — Turn Flow & Shared AP System](#3-combat-mechanics)
4. [Stat Integration — D&D 5e Meets Cards](#4-stat-integration)
5. [Starter Decks — All 6 Classes](#5-starter-decks)
6. [Full Card Pool — Class Cards](#6-full-card-pool)
7. [Neutral, Legendary, & Fragment Cards](#7-neutral-legendary-fragment-cards)
8. [Card Acquisition & Economy](#8-card-acquisition-economy)
9. [Synergy & Combo System](#9-synergy-combo-system)
10. [Rarity Distribution & Scaling](#10-rarity-distribution-scaling)
11. [Integration with Existing Systems](#11-integration-with-existing-systems)
12. [Anti-Patterns & Guardrails](#12-anti-patterns-guardrails)
13. [Phased Implementation Plan](#13-phased-implementation-plan)
14. [UX & Mobile Considerations](#14-ux-mobile-considerations)
15. [Future: Stress/Sanity System (Phase 6)](#15-future-stresssanity-system-phase-6)
16. [Changes from v1.0](#changes-from-v10)

---

# 1. DESIGN PHILOSOPHY

## Core Thesis
DX is a dungeon crawler with D&D 5e DNA. The card system does NOT replace the RPG layer — it enhances it. Stats, equipment, and levels still matter. Cards are the VERBS of combat: what your character DOES on their turn. Stats are the ADJECTIVES: how hard those verbs hit.

## Design Pillars (Non-Negotiable)

1. **Familiar Foundation** (Balatro principle) — D&D ability names and RPG tropes everyone recognizes. No learning curve on card identity. A card called "Fireball" does exactly what you think.

2. **Stats Feed Cards** — A Mage's INT modifier boosts spell card damage. A Fighter's STR modifier boosts Strike cards. This is the bridge between the existing D&D system and cards. Without it, stats become decorative.

3. **Small Decks, Big Decisions** (Anti-bloat) — Starter decks are 10 cards. Max recommended deck size is 20-25. Card removal is always available. Every card you add should make you stronger, not just different.

4. **15-Minute Run Target** — 3 AP per turn (shared pool), 5-card hand, clear effects. Turns resolve in 5-10 seconds of thought. No Balatro-style calculation chains. No Monster Train multi-lane positioning. One hand, one enemy group, assign cards to party members.

5. **Roguelike Tension** — Deck is per-run. You build it during the dungeon, lose it on death. Meta-progression unlocks cards into the DRAFT POOL, not into your deck. Options expand, power does not. (Slay the Spire model.)

6. **Class Identity from Turn 1** — A Fighter and a Mage should feel completely different based on which party member you ASSIGN a card to. Starter decks are class-specific but merge into ONE shared party deck. Cross-class synergies happen naturally through the shared hand.

7. **Shared Party Deck (Gordian Quest Model)** — The party draws from ONE deck, spends from ONE AP pool, and makes decisions as a unit. When you play a card, you ASSIGN it to a party member. A Fireball played by the Mage uses the Mage's INT modifier. A Strike played by the Fighter uses the Fighter's STR modifier. This preserves the party feel while keeping turn count manageable for the 15-minute run target.

8. **Deterministic Defense** — Block is the SOLE defense mechanic. No d20 attack rolls from enemies. Enemies deal fixed damage (shown via intent). Armor equipment converts to starting Block each turn. This makes the system transparent and plannable, like Slay the Spire.

---

# 2. CARD DATA STRUCTURE

## Card Object Schema

```javascript
{
  id: 'fireball',                    // Unique identifier (snake_case)
  name: 'Fireball',                  // Display name
  description: 'Deal {damage} fire damage to ALL enemies. DEX save for half.',
  type: 'attack',                    // attack | skill | power | curse | status
  cardClass: 'mage',                 // fighter | ranger | mage | cleric | rogue | paladin | neutral
  rarity: 'common',                  // starter | common | uncommon | rare | legendary | curse
  cost: 2,                           // AP cost to play (0 = free)

  // --- Effects Array (ordered, all resolve sequentially) ---
  effects: [
    {
      type: 'damage',               // damage | block | heal | buff | debuff | draw | gainAP | poison | burn | stun | lifesteal
      value: 12,                     // Base value (before stat scaling)
      scaling: { stat: 'int', ratio: 1.0 },  // +1 damage per point of INT modifier
      target: 'allEnemies',          // self | singleEnemy | allEnemies | singleAlly | allAllies | random
      damageType: 'fire',            // slashing | piercing | bludgeoning | fire | cold | force | radiant | necrotic | poison
      saveStat: 'dex',               // If set, target rolls save; success = half damage
      saveDC: 'caster',              // 'caster' = 8 + proficiency + casting mod; or fixed number
    }
  ],

  // --- Upgrade Definition ---
  upgraded: false,
  upgradedVersion: {                 // What changes when upgraded (only changed fields)
    cost: null,                      // null = unchanged
    effects: [{ value: 16 }],       // Override specific effect values
    description: 'Deal {damage} fire damage to ALL enemies. DEX save for half.',
  },

  // --- Metadata ---
  keywords: ['aoe'],                 // UI keywords: aoe, exhaust, ethereal, retain, innate
  exhaust: false,                    // True = removed from combat after play (goes to exhaust pile)
  ethereal: false,                   // True = exhausts if still in hand at end of turn
  innate: false,                     // True = always drawn in opening hand
  retain: false,                     // True = not discarded at end of turn
  unplayable: false,                 // True = cannot be played (curse/status cards)

  // --- Visual ---
  art: 'card-fireball',             // Sprite key in asset loader
  color: '#ff6600',                  // Card border glow color
  sfx: 'spell-fire',                // Sound effect key on play
}
```

## Card Types Explained

| Type | Description | Discard Behavior | Example |
|------|-------------|------------------|---------|
| **Attack** | Deals damage to enemies. May have secondary effects. | Discard pile after play | Strike, Fireball, Backstab |
| **Skill** | Defensive, utility, or support. No direct damage (usually). | Discard pile after play | Block, Dodge, Heal |
| **Power** | Permanent buff for rest of combat. Plays once, effect persists. | Exhausts on play (always) | Battle Trance, Arcane Mastery |
| **Curse** | Negative card forced into deck by events/enemies. Cannot be played. | Clogs hand, must be removed | Weakness, Doubt, Parasite |
| **Status** | Temporary negative cards added during combat (not saved to deck). | Exhausts at end of combat | Dazed, Burned, Wound |

## Effect Types — Complete Reference

| Effect Type | Description | Example Values |
|-------------|-------------|----------------|
| `damage` | Deal damage to target(s) | `{ value: 8, damageType: 'slashing' }` |
| `block` | Add temporary HP shield (removed at start of next turn) | `{ value: 5 }` |
| `heal` | Restore HP to target | `{ value: 6, target: 'singleAlly' }` |
| `buff` | Apply positive status to target | `{ buffId: 'strength', stacks: 2 }` |
| `debuff` | Apply negative status to target | `{ debuffId: 'vulnerable', stacks: 2 }` |
| `draw` | Draw cards from draw pile | `{ value: 2 }` |
| `gainAP` | Gain additional AP this turn | `{ value: 1 }` |
| `poison` | Apply poison stacks (tick damage at turn start) | `{ stacks: 3 }` |
| `burn` | Apply burn stacks (tick damage at turn END, does NOT decay — must be removed by playing a Skill card or water event) | `{ stacks: 4 }` |
| `stun` | Target skips next turn | `{ turns: 1 }` |
| `lifesteal` | Deal damage, heal for amount dealt | `{ value: 6 }` |
| `discard` | Force discard from hand | `{ value: 1, target: 'self' }` |
| `exhaust` | Exhaust a card from hand (remove from combat) | `{ value: 1, target: 'random' }` |
| `addCard` | Add a temporary card to hand/draw/discard | `{ cardId: 'shiv', destination: 'hand' }` |
| `scry` | Look at top N cards of draw pile, discard any | `{ value: 3 }` |

## Status Effects — Persistent Combat Buffs/Debuffs

| ID | Name | Type | Per-Stack Effect | Duration |
|----|------|------|------------------|----------|
| `strength` | Strength | Buff | +1 damage to ALL attack cards | Permanent (combat) |
| `dexterity` | Dexterity | Buff | +1 block to ALL block effects | Permanent (combat) |
| `vulnerable` | Vulnerable | Debuff | Take 50% more damage | 1 turn per stack |
| `weak` | Weak | Debuff | Deal 25% less damage | 1 turn per stack |
| `frail` | Frail | Debuff | Gain 25% less block | 1 turn per stack |
| `poison` | Poison | Debuff | Take N damage at turn START, reduce by 1 | Until 0 stacks (decays naturally) |
| `burn` | Burn | Debuff | Take N damage at turn END, does NOT decay | Until removed (play a Skill card or water event) |
| `regen` | Regeneration | Buff | Heal N at turn start, reduce by 1 | Until 0 stacks |
| `thorns` | Thorns | Buff | Deal N damage to attackers | Permanent (combat) |
| `ritual` | Ritual | Buff | Gain N strength at turn start | Permanent (combat) |
| `block_persist` | Barricade | Buff | Block does not decay at turn start | Permanent (combat) |

---

# 3. COMBAT MECHANICS

## Turn Flow

```
┌─────────────────────────────────────────────────────────┐
│                    PARTY TURN (Shared)                   │
│                                                         │
│  1. TURN START                                          │
│     - Gain 3 AP (shared party pool)                     │
│     - Draw 5 cards from shared draw pile                │
│     - Apply turn-start triggers:                        │
│       * Poison ticks on each affected party member      │
│       * Regen ticks on each affected party member       │
│       * Ritual / other start-of-turn effects            │
│       * Armor-based Block applied (see Equipment below) │
│     - Block from previous turn decays to 0 on all      │
│       party members (before armor Block is applied)     │
│                                                         │
│  2. PLAY PHASE (player acts freely until they end turn) │
│     - Play any card → ASSIGN to a party member          │
│     - Class cards: only assignable to matching class    │
│     - Neutral cards: assignable to anyone               │
│     - Card resolves using assigned member's stats       │
│     - View draw pile count, discard pile contents        │
│     - Press END TURN when done                          │
│                                                         │
│  3. TURN END                                            │
│     - Burn ticks on each affected party member          │
│     - Discard remaining hand (except Retain cards)      │
│     - Exhaust any Ethereal cards still in hand          │
│     - Trigger other end-of-turn effects                 │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                    ENEMY TURN                           │
│                                                         │
│  1. Each enemy acts in order                             │
│     - Enemy INTENT is visible (shown last turn)         │
│     - Enemies deal FIXED damage (no d20 rolls)          │
│     - Enemies execute: attack, buff, debuff, summon     │
│  2. After all enemies act, show next turn intents       │
│                                                         │
└──────────────────── NEXT PARTY TURN ────────────────────┘
```

## Key Difference from Slay the Spire — Shared Party Deck
In StS, the player IS one character. In DX, the player controls a PARTY of up to 4 characters who share ONE deck and ONE AP pool. Each turn, the party draws a hand from the shared deck. When playing a card, the player ASSIGNS it to a party member. The assigned member's stats determine scaling — a Fireball assigned to the Mage uses INT, a Strike assigned to the Fighter uses STR. Class-specific cards (e.g., Mage spells) can only be assigned to a member of that class. Neutral cards can be assigned to anyone. This is the Gordian Quest model adapted for DX.

## AP (Action Point) System

| Attribute | Value | Notes |
|-----------|-------|-------|
| Base AP per turn | 3 | Shared pool for the whole party |
| Max AP per turn | 5 | Hard cap (prevents infinite loops) |
| AP carries over? | NO | Unused AP is lost |
| Card costs | 0-3 | 0 = free plays, 3 = big finishers |
| AP gain cards | Exist | "Gain 1 AP" effects on some cards |

## Hand & Deck Rules

| Rule | Value | Notes |
|------|-------|-------|
| Cards drawn per turn | 5 | Can be modified by relics/powers |
| Max hand size | 10 | Draw beyond 10 = card goes to discard |
| Shared starter deck size | 10 per party member combined | 4-member party starts with ~40 cards in shared deck |
| No deck minimum | — | You can remove down to 15 cards (shared) |
| Deck minimum (hard floor) | 15 | Cannot remove below 15 cards (shared deck) |
| Shuffle trigger | Draw pile empty | Discard pile shuffled into new draw pile |

## Card Assignment Rules

| Rule | Description |
|------|-------------|
| Class cards | Can ONLY be assigned to a party member of that class |
| Neutral cards | Can be assigned to ANY party member |
| Stat scaling | Uses the ASSIGNED member's stats (STR, DEX, INT, etc.) |
| Block | Applied to the ASSIGNED member |
| Heal (self) | Heals the ASSIGNED member |
| Heal (ally) | Player picks target after assignment |
| AoE attacks | Assigned member's stats scale the damage; hits all enemies |
| **Dead member cards** | If a party member dies mid-combat, their class cards become unplayable dead draws. When drawn, they are automatically discarded (not exhausted) and replaced with a new draw. This prevents dead weight hands without permanently removing cards from the deck cycle. |

## Draw / Discard / Exhaust Piles

- **Draw Pile**: Face down. Cards drawn from top. When empty, discard pile is shuffled and becomes the new draw pile.
- **Discard Pile**: Face up. Viewable at any time. Cards go here after being played (unless Exhaust). Goes back to draw pile on shuffle.
- **Exhaust Pile**: Removed from combat. Viewable but cards cannot return (unless specific card effect says otherwise). Powers always exhaust when played.

## Enemy Intent System
Enemies telegraph their next action at the end of each enemy turn. Intents display as icons above the enemy sprite:

| Icon | Intent | Description |
|------|--------|-------------|
| Sword | Attack | Will deal N damage |
| Sword x2 | Multi-attack | Will attack N times |
| Shield | Defend | Will gain block |
| Skull | Debuff | Will apply a debuff |
| Up-arrow | Buff | Will buff self or allies |
| Spiral | Unknown | Boss special (hidden intent) |

This gives the player perfect information to plan their turn — play block cards when the enemy is attacking, play attack cards when the enemy is defending.

---

# 4. STAT INTEGRATION

## The Bridge: D&D Stats → Card Scaling

This is DX's unique differentiator. No other deckbuilder ties card power to an underlying stat system. Here is how each stat affects cards:

| Stat | Modifier Formula | Card Effect |
|------|-----------------|-------------|
| **STR** | (STR - 10) / 2 | Bonus damage on melee Attack cards (type: `damage`, damageType: `slashing/bludgeoning/piercing`) |
| **DEX** | (DEX - 10) / 2 | Bonus damage on ranged Attack cards. Bonus block on Skill cards with block effects. |
| **CON** | (CON - 10) / 2 | Bonus HP per level (existing). Cards that scale off CON: Second Wind heal amount. |
| **INT** | (INT - 10) / 2 | Bonus damage on spell Attack cards (damageType: `fire/cold/force/necrotic`). Bonus to scry depth. |
| **WIS** | (WIS - 10) / 2 | Bonus to heal card values. Bonus to buff/debuff duration (+1 turn per 2 WIS mod). |
| **CHA** | (CHA - 10) / 2 | Bessa shop discount (existing). Bonus stacks on party-wide buff cards. |

## Scaling Formula

```
finalValue = card.baseValue + (statModifier * card.scalingRatio)
```

Example: Fireball with `value: 12, scaling: { stat: 'int', ratio: 1.0 }` played by a Mage with INT 17 (modifier +3):
```
finalDamage = 12 + (3 * 1.0) = 15 fire damage to all enemies
```

## Equipment → Card Interaction

Equipment does NOT add cards to the deck. Equipment provides passive bonuses that affect card output. **AC is NOT used in card combat — Block is the sole defense mechanic.**

| Equipment Slot | Card Effect |
|----------------|-------------|
| **Weapon** | Weapon damage die is used by "basic Strike" cards. A Steel Sword (1d8) makes Strike hit harder than a Rusty Dagger (1d4). |
| **Armor** | Converts to starting Block each turn. Chain Mail = +3 Block at turn start. Leather Armor = +1 Block at turn start. Plate Mail = +5 Block at turn start. |
| **Shield** | Adds starting Block each turn. Wooden Shield = +1 Block at turn start. Iron Shield = +2 Block at turn start. Tower Shield = +3 Block at turn start. |
| **Accessory** | Special effects: Ring of Strength = +1 to all attack card damage. Amulet of Health = +5 max HP. |

**Armor Block is applied at the START of each turn, after previous Block decays to 0.** This means every party member with armor starts each turn with a small Block buffer, but must supplement it with card Block to survive big hits.

## Proficiency Bonus → Cards

The existing proficiency bonus (scales with level, 2-4) is added to the save DC of cards that force enemy saves:

```
saveDC = 8 + proficiencyBonus + castingStatModifier
```

---

# 5. STARTER DECKS — ALL 6 CLASSES

Every starter deck contains exactly 10 cards: a mix of basic attacks, class-flavored abilities, and 1 defend card. The goal is distinct playstyle from the first turn.

---

## FIGHTER — "The Iron Wall"
**Playstyle:** High damage, self-sustain, straightforward. Hits hard, takes hits, heals self.

| # | Card Name | Type | Cost | Effect | Scaling |
|---|-----------|------|------|--------|---------|
| 1 | Strike | Attack | 1 | Deal 6 damage. | +STR mod |
| 2 | Strike | Attack | 1 | Deal 6 damage. | +STR mod |
| 3 | Strike | Attack | 1 | Deal 6 damage. | +STR mod |
| 4 | Strike | Attack | 1 | Deal 6 damage. | +STR mod |
| 5 | Defend | Skill | 1 | Gain 5 Block. | +DEX mod |
| 6 | Defend | Skill | 1 | Gain 5 Block. | +DEX mod |
| 7 | Shield Bash | Attack | 1 | Deal 4 damage. Apply 1 Stun. | +STR mod (dmg only) |
| 8 | Second Wind | Skill | 1 | Heal 6 HP. Exhaust. | +CON mod |
| 9 | Cleave | Attack | 1 | Deal 4 damage to ALL enemies. | +STR mod |
| 10 | Battle Cry | Skill | 0 | Apply 1 Weak to ALL enemies. | — |

**Turn 1 Fantasy:** Play Strike + Strike + Shield Bash = 16 damage + stun the biggest threat. Or Strike + Defend + Battle Cry = damage + defense + debuff control.

---

## RANGER — "The Precision Hunter"
**Playstyle:** Targeted damage, mark-and-execute, card draw for consistency.

| # | Card Name | Type | Cost | Effect | Scaling |
|---|-----------|------|------|--------|---------|
| 1 | Quick Shot | Attack | 1 | Deal 5 damage. | +DEX mod |
| 2 | Quick Shot | Attack | 1 | Deal 5 damage. | +DEX mod |
| 3 | Quick Shot | Attack | 1 | Deal 5 damage. | +DEX mod |
| 4 | Quick Shot | Attack | 1 | Deal 5 damage. | +DEX mod |
| 5 | Defend | Skill | 1 | Gain 5 Block. | +DEX mod |
| 6 | Defend | Skill | 1 | Gain 5 Block. | +DEX mod |
| 7 | Hunter's Mark | Skill | 1 | Apply 2 Vulnerable to target. Draw 1 card. | — |
| 8 | Volley | Attack | 2 | Deal 4 damage to ALL enemies. | +DEX mod |
| 9 | Eagle Eye | Power | 1 | Gain 1 Dexterity (permanent +1 block). Exhaust. | — |
| 10 | Snare Trap | Skill | 1 | Apply 1 Stun to target. Apply 1 Weak. | — |

**Turn 1 Fantasy:** Hunter's Mark (Vulnerable + draw) → Quick Shot → Quick Shot = massive focused damage on a marked target.

---

## MAGE — "The Glass Cannon"
**Playstyle:** High AoE damage, card manipulation, fragile. INT-scaled spell cards.

| # | Card Name | Type | Cost | Effect | Scaling |
|---|-----------|------|------|--------|---------|
| 1 | Arcane Bolt | Attack | 1 | Deal 6 damage. | +INT mod |
| 2 | Arcane Bolt | Attack | 1 | Deal 6 damage. | +INT mod |
| 3 | Arcane Bolt | Attack | 1 | Deal 6 damage. | +INT mod |
| 4 | Defend | Skill | 1 | Gain 5 Block. | +DEX mod |
| 5 | Defend | Skill | 1 | Gain 5 Block. | +DEX mod |
| 6 | Fireball | Attack | 2 | Deal 8 fire damage to ALL enemies. | +INT mod |
| 7 | Ice Shard | Attack | 1 | Deal 6 cold damage. Apply 1 Weak. | +INT mod (dmg only) |
| 8 | Arcane Shield | Skill | 1 | Gain 8 Block. | +INT mod |
| 9 | Scry | Skill | 0 | Look at top 3 cards. Discard any. Draw 1. | Scry depth +INT mod |
| 10 | Magic Missile | Attack | 1 | Deal 3 damage 3 times (auto-hit, ignores Block). | +INT mod (each hit) |

**Turn 1 Fantasy:** Fireball (8 AoE) + Arcane Bolt (5 single) = clear weak enemies and soften the boss. Or Magic Missile for guaranteed damage through block.

---

## CLERIC — "The Bulwark"
**Playstyle:** Party healer/buffer, sustainable, WIS-scaled support cards. Lower personal damage, massive team value.

| # | Card Name | Type | Cost | Effect | Scaling |
|---|-----------|------|------|--------|---------|
| 1 | Holy Strike | Attack | 1 | Deal 5 radiant damage. | +STR mod |
| 2 | Holy Strike | Attack | 1 | Deal 5 radiant damage. | +STR mod |
| 3 | Sacred Word | Attack | 0 | Deal 2 radiant damage. Draw 1 card. | +WIS mod |
| 4 | Defend | Skill | 1 | Gain 5 Block. | +DEX mod |
| 5 | Defend | Skill | 1 | Gain 5 Block. | +DEX mod |
| 6 | Heal | Skill | 1 | Heal 8 HP to single ally. | +WIS mod |
| 7 | Bless | Skill | 1 | Give single ally 2 Strength (this combat). | +CHA mod (stacks) |
| 8 | Turn Undead | Skill | 2 | Apply 2 Weak + 1 Vulnerable to ALL undead enemies. Non-undead: 1 Weak. | — |
| 9 | Divine Light | Attack | 2 | Deal 4 radiant damage to ALL enemies. Heal self 3. | +WIS mod (both) |
| 10 | Prayer | Power | 1 | Gain 1 Regeneration at start of each turn. Exhaust. | — |

**Turn 1 Fantasy:** Bless the Fighter (+2 Strength) → Heal the Rogue (took damage last round) → Holy Strike = support + offense in one turn.

---

## ROGUE — "The Shadow Blade"
**Playstyle:** Burst damage, card generation, poison, high risk/reward. DEX-scaled.

| # | Card Name | Type | Cost | Effect | Scaling |
|---|-----------|------|------|--------|---------|
| 1 | Shiv | Attack | 0 | Deal 3 damage. | +DEX mod |
| 2 | Shiv | Attack | 0 | Deal 3 damage. | +DEX mod |
| 3 | Backstab | Attack | 1 | Deal 7 damage. | +DEX mod |
| 4 | Strike | Attack | 1 | Deal 6 damage. | +DEX mod |
| 5 | Strike | Attack | 1 | Deal 6 damage. | +DEX mod |
| 6 | Defend | Skill | 1 | Gain 5 Block. | +DEX mod |
| 7 | Defend | Skill | 1 | Gain 5 Block. | +DEX mod |
| 8 | Envenom | Power | 1 | Whenever you play an Attack card, apply 1 Poison. Exhaust. | — |
| 9 | Dodge Roll | Skill | 1 | Gain 4 Block. Draw 1 card. | +DEX mod |
| 10 | Preparation | Skill | 0 | Draw 2 cards. Discard 1. | — |

**Turn 1 Fantasy:** Backstab (7 damage) → Envenom (poison on all future attacks) → Shiv + Shiv (6 free damage + 2 poison stacks). Explosive opener.

---

## PALADIN — "The Radiant Crusader"
**Playstyle:** Hybrid fighter/healer. STR for damage, WIS/CHA for support. Smite mechanic rewards spending resources for burst.

| # | Card Name | Type | Cost | Effect | Scaling |
|---|-----------|------|------|--------|---------|
| 1 | Strike | Attack | 1 | Deal 6 damage. | +STR mod |
| 2 | Strike | Attack | 1 | Deal 6 damage. | +STR mod |
| 3 | Strike | Attack | 1 | Deal 6 damage. | +STR mod |
| 4 | Defend | Skill | 1 | Gain 5 Block. | +DEX mod |
| 5 | Defend | Skill | 1 | Gain 5 Block. | +DEX mod |
| 6 | Divine Smite | Attack | 2 | Deal 6 damage + 8 radiant damage. +4 vs Undead. | +STR mod (melee) +CHA mod (radiant) |
| 7 | Lay on Hands | Skill | 1 | Heal 10 HP to single ally. Exhaust. | +WIS mod |
| 8 | Divine Shield | Skill | 1 | Gain 6 Block. Give target ally 3 Block. | +CHA mod |
| 9 | Smite Evil | Attack | 1 | Deal 5 radiant damage. If target is Undead, deal 8 instead. | +STR mod |
| 10 | Aura of Courage | Power | 1 | All party members gain 1 Strength. Exhaust. | — |

**Turn 1 Fantasy:** Aura of Courage (buff whole party) → Divine Smite (14 damage to undead) → Defend. Tanky bruiser with team utility.

---

# 6. FULL CARD POOL — CLASS CARDS

Each class has 18 cards across 3 rarity tiers (6 Common, 6 Uncommon, 6 Rare). Total: 108 class cards.

---

## FIGHTER CARD POOL (18 cards)

### Common (6)
| Card | Type | Cost | Effect | Upgrade |
|------|------|------|--------|---------|
| Power Strike | Attack | 2 | Deal 12 damage. | 16 damage |
| Iron Will | Skill | 1 | Gain 7 Block. | 10 Block |
| Headbutt | Attack | 1 | Deal 6 damage. Put a card from discard on top of draw pile. | 9 damage |
| Reckless Charge | Attack | 0 | Deal 8 damage. Shuffle a Dazed (status) into draw pile. | 12 damage |
| Shield Wall | Skill | 2 | Gain 12 Block. | 16 Block |
| Warcry | Skill | 0 | Draw 2 cards. Put 1 card from hand on top of draw pile. | Draw 3, put 1 back |

### Uncommon (6)
| Card | Type | Cost | Effect | Upgrade |
|------|------|------|--------|---------|
| Whirlwind | Attack | X | Deal 5 damage to ALL enemies X times (X = remaining AP). | 8 damage per hit |
| Bloodlust | Power | 1 | Whenever you kill an enemy, gain 2 Strength. Exhaust. | 3 Strength |
| Impervious | Skill | 2 | Gain 20 Block. Exhaust. | 30 Block |
| Double Strike | Attack | 1 | Deal 5 damage twice. | 7 damage twice |
| Battle Trance | Power | 0 | Draw 2 additional cards each turn. Cannot draw more than 7 per turn. Exhaust. | Draw 3 additional |
| Anger | Attack | 0 | Deal 5 damage. Add a copy of Anger to discard pile (max 3 copies in deck). | 7 damage |

### Rare (6)
| Card | Type | Cost | Effect | Upgrade |
|------|------|------|--------|---------|
| Berserk | Power | 1 | Gain 1 Vulnerable (self). Gain 1 additional AP each turn. Exhaust. | No self-Vulnerable |
| Rampage | Attack | 1 | Deal 8 damage. Increase this card's damage by 5 each time it's played (this combat). | Start at 10, +8 per play |
| Reaper | Attack | 2 | Deal 4 damage to ALL enemies. Heal for damage dealt. Exhaust. | 6 damage |
| Barricade | Power | 3 | Block is no longer removed at start of turn. Exhaust. | Cost 2 |
| Limit Break | Skill | 1 | Double your Strength. Exhaust. | Cost 0 (still Exhausts) |
| Offering | Skill | 0 | Lose 6 HP. Gain 2 AP. Draw 3 cards. Exhaust. | Lose 4 HP |

---

## RANGER CARD POOL (18 cards)

### Common (6)
| Card | Type | Cost | Effect | Upgrade |
|------|------|------|--------|---------|
| Aimed Shot | Attack | 2 | Deal 10 damage. Apply 1 Vulnerable. | 13 damage |
| Camouflage | Skill | 1 | Gain 6 Block. Draw 1 card. | 9 Block |
| Poison Arrow | Attack | 1 | Deal 4 damage. Apply 3 Poison. | 5 Poison |
| Twin Arrows | Attack | 1 | Deal 4 damage twice. | 6 damage twice |
| Heightened Senses | Skill | 0 | Draw 2 cards. | Draw 3 |
| Barbed Trap | Skill | 1 | Gain 3 Thorns for this combat. | 5 Thorns |

### Uncommon (6)
| Card | Type | Cost | Effect | Upgrade |
|------|------|------|--------|---------|
| Rain of Arrows | Attack | 2 | Deal 6 damage to ALL enemies. Apply 1 Weak to ALL. | 9 damage |
| Favored Prey | Power | 1 | Whenever you apply Vulnerable, draw 1 card. Exhaust. | Also gain 1 AP |
| Evasion | Skill | 1 | Gain 10 Block. Next turn draw 1 extra card. | 14 Block |
| Crippling Shot | Attack | 1 | Deal 5 damage. Apply 2 Weak. | 3 Weak |
| Nature's Gift | Skill | 1 | Gain 3 Regeneration. | 5 Regeneration |
| Multishot | Attack | 2 | Deal 5 damage to 3 random enemies. | 7 damage each |

### Rare (6)
| Card | Type | Cost | Effect | Upgrade |
|------|------|------|--------|---------|
| Death Mark | Skill | 1 | Apply 3 Vulnerable and 2 Weak to target. Exhaust. | 4 Vulnerable, 3 Weak |
| Killing Blow | Attack | 2 | Deal 20 damage. Only playable on Vulnerable targets. | 28 damage |
| Rapid Fire | Attack | 1 | Deal 3 damage 4 times. | 4 damage, 5 times |
| Predator | Power | 1 | Draw 2 extra cards on first turn of each combat. Exhaust. | 3 extra cards |
| Serpent Venom | Power | 2 | All Poison you apply is doubled. Exhaust. | Cost 1 |
| Phantom Strike | Attack | 1 | Deal 8 damage. If target is Vulnerable, deal 8 again. | 11 base damage |

---

## MAGE CARD POOL (18 cards)

### Common (6)
| Card | Type | Cost | Effect | Upgrade |
|------|------|------|--------|---------|
| Frost Bolt | Attack | 1 | Deal 7 cold damage. Apply 1 Weak. | 10 damage |
| Lightning Spark | Attack | 1 | Deal 3 damage to a random enemy 3 times. | 4 damage, 3 times |
| Mana Shield | Skill | 1 | Gain Block equal to 5 + INT modifier x2. | 8 + INT mod x2 |
| Concentration | Skill | 0 | Draw 3 cards. Discard 2. | Discard 1 |
| Chain Lightning | Attack | 2 | Deal 6 damage to ALL enemies. | 9 damage |
| Arcane Intellect | Skill | 1 | Draw 2 cards. Gain 1 AP. | Draw 3 cards |

### Uncommon (6)
| Card | Type | Cost | Effect | Upgrade |
|------|------|------|--------|---------|
| Meteor | Attack | 3 | Deal 20 fire damage. Apply 3 Vulnerable. Exhaust. | 28 damage |
| Frost Nova | Skill | 2 | Apply 1 Stun to ALL enemies. | Also apply 1 Weak |
| Arcane Mastery | Power | 1 | At end of turn, deal 3 damage to a random enemy. Exhaust. | 5 damage |
| Spell Weave | Power | 1 | Whenever you play an Attack card, gain 1 Block. Exhaust. | 2 Block per Attack |
| Counterspell | Skill | 0 | Gain 8 Block. Ethereal. | 12 Block |
| Inferno | Attack | 2 | Deal 5 fire damage to ALL enemies. Apply 2 Burn to ALL. | 7 damage, 3 Burn |

### Rare (6)
| Card | Type | Cost | Effect | Upgrade |
|------|------|------|--------|---------|
| Time Warp | Skill | 3 | Take an extra turn after this one. Exhaust. | Cost 2 |
| Blizzard | Attack | 2 | Deal damage equal to total Weak applied this combat to ALL enemies. | x2 multiplier |
| Arcane Surge | Power | 1 | Gain 1 additional AP each turn. Exhaust. | Also draw 1 extra |
| Disintegrate | Attack | 3 | Deal 30 damage. If this kills, Exhaust all enemy status cards. | 40 damage |
| Echo | Skill | 1 | The next card you play this turn is played twice. Exhaust. | Cost 0 |
| Spell Siphon | Skill | 1 | Draw cards until you have 8 in hand. | Draw until 10 |

---

## CLERIC CARD POOL (18 cards)

### Common (6)
| Card | Type | Cost | Effect | Upgrade |
|------|------|------|--------|---------|
| Smite | Attack | 1 | Deal 6 radiant damage. Heal self 2. | 8 damage, heal 3 |
| Sanctuary | Skill | 1 | Gain 7 Block. Gain 2 Regeneration. | 10 Block, 3 Regen |
| Guiding Light | Skill | 1 | Heal ally 6. Draw 1 card. | Heal 9 |
| Consecrate | Attack | 1 | Deal 4 radiant damage to ALL enemies. | 7 damage |
| Shield of Faith | Skill | 1 | Give ally 8 Block. | 12 Block |
| Mending Prayer | Skill | 0 | Heal self 4. Draw 1 card. | Heal 6 |

### Uncommon (6)
| Card | Type | Cost | Effect | Upgrade |
|------|------|------|--------|---------|
| Mass Heal | Skill | 2 | Heal ALL allies 6 HP. | 9 HP |
| Holy Fire | Attack | 2 | Deal 10 radiant damage. Apply 2 Vulnerable. | 14 damage |
| Righteous Fury | Power | 1 | Whenever you heal an ally, deal 2 damage to a random enemy. Exhaust. | 4 damage |
| Dispel | Skill | 1 | Remove ALL debuffs from target ally. | Also heal 5 |
| Sacred Flame | Attack | 0 | Deal 3 radiant damage. If target is Undead, deal 8 instead. | 5 / 12 damage |
| Fortify Spirit | Skill | 1 | Give ally 3 Block and 1 Strength. | 5 Block, 2 Strength |

### Rare (6)
| Card | Type | Cost | Effect | Upgrade |
|------|------|------|--------|---------|
| Resurrection | Skill | 3 | Revive a dead party member with 50% HP. Exhaust. | 75% HP |
| Divine Intervention | Skill | 0 | Heal ALL allies to full HP. Can only be played if a party member is below 25% HP. Exhaust. | Below 40% threshold |
| Wrath of the Gods | Attack | 3 | Deal 15 radiant damage to ALL enemies. Apply 2 Weak to ALL. Exhaust. | 22 damage |
| Beacon of Hope | Power | 2 | All healing effects are doubled. Exhaust. | Cost 1 |
| Martyr's Shield | Skill | 1 | Take the next attack aimed at any ally. Gain 15 Block. Exhaust. | 20 Block |
| Purify | Skill | 1 | Exhaust a card from hand. Heal 6. | Heal 10 |

---

## ROGUE CARD POOL (18 cards)

### Common (6)
| Card | Type | Cost | Effect | Upgrade |
|------|------|------|--------|---------|
| Fan of Knives | Attack | 1 | Deal 4 damage to ALL enemies. Draw 1 card. | 7 damage |
| Poisoned Blade | Attack | 1 | Deal 5 damage. Apply 2 Poison. | 3 Poison |
| Cloak & Dagger | Skill | 1 | Gain 5 Block. Add 1 Shiv to hand. | 7 Block |
| Dash | Skill | 1 | Gain 6 Block. Draw 1 card. | 9 Block |
| Sucker Punch | Attack | 1 | Deal 6 damage. Apply 1 Weak. | 8 damage |
| Slice | Attack | 0 | Deal 4 damage. | 7 damage |

### Uncommon (6)
| Card | Type | Cost | Effect | Upgrade |
|------|------|------|--------|---------|
| Flurry | Attack | 1 | Deal 3 damage for each card played this turn (before Flurry). | 4 damage per |
| Noxious Fumes | Power | 1 | At start of your turn, apply 2 Poison to ALL enemies. Exhaust. | 3 Poison |
| Shadow Step | Skill | 1 | Gain 10 Block. Draw 2 cards. Discard 1. | 13 Block |
| Blade Dance | Attack | 1 | Add 3 Shivs to your hand. | 4 Shivs |
| Predator's Grace | Skill | 1 | If you played 3+ cards this turn, gain 2 AP. | 2+ cards threshold |
| Caltrops | Power | 1 | Whenever you are attacked, deal 3 damage back. Exhaust. | 5 damage |

### Rare (6)
| Card | Type | Cost | Effect | Upgrade |
|------|------|------|--------|---------|
| Assassinate | Attack | 2 | Deal 25 damage. Exhaust. | 32 damage |
| After Image | Power | 1 | Whenever you play a card, gain 1 Block. Exhaust. | 2 Block |
| Thousand Cuts | Power | 2 | Whenever you play a card, deal 1 damage to ALL enemies. Exhaust. | 2 damage |
| Grand Finale | Attack | 1 | Deal 40 damage. Only playable if draw pile has 0 cards. | 55 damage |
| Adrenaline | Skill | 0 | Gain 1 AP. Draw 2 cards. Exhaust. | Draw 3 |
| Corpse Explosion | Skill | 2 | Apply 6 Poison. When target dies, deal its max HP as damage to ALL enemies. Exhaust. | 9 Poison |

---

## PALADIN CARD POOL (18 cards)

### Common (6)
| Card | Type | Cost | Effect | Upgrade |
|------|------|------|--------|---------|
| Righteous Strike | Attack | 1 | Deal 6 damage. Gain 3 Block. | 8 damage, 4 Block |
| Holy Ward | Skill | 1 | Gain 6 Block. Give target ally 3 Block. | 9 / 5 Block |
| Radiant Blade | Attack | 1 | Deal 5 radiant damage. +5 vs Undead. | 7 / +7 |
| Devotion | Skill | 1 | Gain 2 Strength. Gain 4 Block. | 3 Strength, 6 Block |
| Judgment | Attack | 2 | Deal 10 damage. If target below 50% HP, deal 15 instead. | 13 / 20 |
| Blessed Guard | Skill | 0 | Gain 3 Block. Heal 2. | 5 Block, heal 3 |

### Uncommon (6)
| Card | Type | Cost | Effect | Upgrade |
|------|------|------|--------|---------|
| Avenging Strike | Attack | 1 | Deal 4 damage. Deal 4 additional damage for each ally below 50% HP. | 6 base + 6 per ally |
| Consecrated Ground | Power | 2 | All allies gain 2 Block at start of your turn. Exhaust. | 3 Block |
| Greater Smite | Attack | 2 | Deal 8 damage + 12 radiant damage. Exhaust. | 10 + 16 |
| Lay on Hands (Greater) | Skill | 2 | Heal ally 20 HP. Remove 1 debuff. | 25 HP, all debuffs |
| Crusader's Resolve | Power | 1 | Whenever you play an Attack card, heal 1 HP. Exhaust. | 2 HP |
| Rebuke | Power | 1 | Passive: Whenever an enemy attacks you, deal 4 damage back. Exhaust. | 7 damage |

### Rare (6)
| Card | Type | Cost | Effect | Upgrade |
|------|------|------|--------|---------|
| Exorcism | Attack | 2 | Deal 15 radiant damage. Remove ALL buffs from target. Exhaust. | 22 damage |
| Divine Aegis | Skill | 3 | ALL allies gain 15 Block. Exhaust. | 20 Block |
| Oath of Vengeance | Power | 1 | When an ally takes damage, gain 1 Strength. Exhaust. | Also gain 1 Block |
| Hammer of Dawn | Attack | 3 | Deal 20 radiant damage to ALL enemies. Apply 2 Weak. Exhaust. | 28 damage |
| Sacred Oath | Power | 2 | All damage you deal is also dealt as radiant (ignores resistance). Exhaust. | Cost 1 |
| Final Stand | Skill | 0 | Gain Block equal to your missing HP. Exhaust. | Also gain 3 Strength |

---

# 7. NEUTRAL, LEGENDARY, & FRAGMENT CARDS

## Neutral Cards (15) — Any class can draft these

| Card | Type | Rarity | Cost | Effect |
|------|------|--------|------|--------|
| Swift Strike | Attack | Common | 1 | Deal 5 damage. Draw 1 card. |
| Bandage | Skill | Common | 0 | Heal 3. |
| Brace | Skill | Common | 1 | Gain 6 Block. |
| Adrenaline Rush | Skill | Common | 0 | Gain 1 AP. Exhaust. |
| Parry | Skill | Common | 1 | Gain 5 Block. If attacked this turn, deal 5 damage back. |
| Trip | Skill | Uncommon | 0 | Apply 1 Vulnerable. |
| Focus | Skill | Uncommon | 0 | Draw 2 cards. |
| Toxic Flask | Attack | Uncommon | 1 | Deal 3 damage to ALL. Apply 2 Poison to ALL. |
| War Drum | Skill | Uncommon | 1 | ALL allies gain 1 Strength this combat. |
| Smoke Bomb | Skill | Uncommon | 1 | Gain 6 Block. Exhaust. Draw 2 cards. |
| Perseverance | Skill | Rare | 1 | Gain 5 Block. Each time discarded, increase by 3. Retain. |
| Dark Pact | Skill | Rare | 0 | Lose 5 HP. Draw 3 cards. Gain 1 AP. Exhaust. |
| Master Plan | Skill | Rare | 0 | Draw 5 cards. Discard 3. Exhaust. |
| Phoenix Feather | Skill | Rare | 2 | If you would die this combat, heal to 25% HP instead. Exhaust. |
| Shared Strength | Skill | Rare | 2 | ALL allies gain 2 Strength this combat. Exhaust. |

## Legendary Cards (5) — Extremely rare. Powerful with significant downside.

| Card | Type | Cost | Effect | Downside |
|------|------|------|--------|----------|
| **Dorevus's Echo** | Attack | 0 | Take 10 damage immediately. Deal 30 damage to ALL enemies. | Add 3 Curse cards to your deck (persist after combat). |
| **Soul Reaver** | Attack | 2 | Deal damage equal to 50% of target's current HP. Exhaust. | Lose 10 max HP for rest of run. |
| **The Cracked Stone** | Power | 3 | Triple ALL damage you deal. Exhaust. | Take double damage for rest of combat. |
| **Aureate Circle's Gift** | Skill | 0 | Fully heal all allies. Remove all debuffs. Exhaust. | Skip your next 2 turns. |
| **Timekeeper's Paradox** | Skill | 1 | Return ALL cards from exhaust pile to draw pile. Exhaust. | Shuffle 5 Dazed into draw pile. |

## Fragment-Synergy Cards (5) — Only appear in draft pool after collecting fragments

| Card | Fragment Req. | Type | Cost | Effect |
|------|--------------|------|------|--------|
| **Dawn's Fury** | 2 Fragments | Attack | 2 | Deal 12 radiant damage. If target has Burn, deal double. |
| **Dusk's Embrace** | 2 Fragments | Skill | 1 | Gain 10 Block. Gain 3 Regeneration. |
| **Sunstone Shard** | 4 Fragments | Power | 2 | At start of turn, deal 4 damage to ALL enemies. Gain 2 Block. Exhaust. |
| **Radiance** | 6 Fragments | Skill | 1 | Draw 3 cards. Gain 2 AP. Exhaust. |
| **Dorevus's Bane** | 8 Fragments | Attack | 3 | Deal 50 radiant damage. Apply 5 Vulnerable. Exhaust. Exhaust ALL Curse cards in deck. |

---

# 8. CARD ACQUISITION & ECONOMY

## Post-Floor Draft (Primary Acquisition)

After clearing all enemies on a dungeon floor, the party receives a card reward (added to the shared deck):

```
┌──────────────────────────────────────────────┐
│          CARD REWARD — Choose 1              │
│                                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐     │
│  │ Common  │  │ Uncommon│  │  Rare   │      │
│  │         │  │         │  │         │      │
│  │ Frost   │  │ Rain of │  │ Death   │      │
│  │ Bolt    │  │ Arrows  │  │ Mark    │      │
│  │         │  │         │  │         │      │
│  │ Cost: 1 │  │ Cost: 2 │  │ Cost: 1 │      │
│  └─────────┘  └─────────┘  └─────────┘     │
│                                              │
│              [ SKIP ]                        │
│    (Skipping is always an option)            │
└──────────────────────────────────────────────┘
```

**Rules:**
- 3 cards shown per reward — mix of class cards for current party members and neutral cards
- Rarity weighted by floor depth (see Section 10)
- Player can SKIP (crucial for deck control)
- One reward per floor (added to shared deck)

## Treasure Chest Cards

Chests found during exploration contain either an item OR a card:
- 60% chance: Item (existing loot table)
- 40% chance: Card reward (same 3-pick format, but rarity is boosted by +1 tier)

## Shop (Bessa) Card Inventory

Bessa stocks 4 class cards (one random card per party member's class) and 2 neutral cards, refreshed each time you return to the tavern.

| Rarity | Base Price | CHA Discount |
|--------|-----------|--------------|
| Common | 50 gold | -5 per CHA mod point |
| Uncommon | 100 gold | -10 per CHA mod point |
| Rare | 200 gold | -15 per CHA mod point |
| Card Removal | 75 gold (first), +25 each additional | -10 per CHA mod point |

## Card Removal

Available at:
1. **Bessa's Shop** — Pay gold to remove a card from the shared party deck
2. **Rare event: Altar of Forgetting** — Random dungeon event. Remove 1 card for free, but lose 5 HP.
3. **Shrine event** — Remove a card, gain a Curse card (trade-off)

**Price escalation:** First removal costs 75g. Each subsequent removal in the same run costs 25g more. This prevents trivially reducing to minimum deck size.

## Level-Up Card Unlock

When a character levels up, new cards are added to the DRAFT POOL (not the deck directly). These cards can then appear in post-floor rewards.

| Level | Unlock |
|-------|--------|
| 1 | Starter deck + Common pool |
| 3 | Uncommon pool unlocked |
| 5 | Rare pool unlocked |
| 7 | Legendary pool unlocked (very low odds) |
| 9 | Fragment cards appear at boosted rate |

## Card Upgrades

Cards can be upgraded once (except starter Strikes/Defends which cannot be upgraded — incentivizes replacing them).

**Upgrade sources:**
1. **Rest Site (Campfire)** — Between dungeon floors, choose: REST (heal 30% max HP for all party members) or SMITH (upgrade 1 card from the shared deck). Directly from StS.
2. **Rare event: Enchanter** — Upgrade a random card for free.
3. **Bessa upgrade service** — 100g to upgrade a card of choice (available after floor 3).

**Upgrade effects by card type:**
- Attack cards: +25-40% damage
- Skill cards: +25-40% block/heal values
- Power cards: Stronger persistent effect
- Some cards: Cost reduced by 1
- Some cards: Remove Exhaust keyword

---

# 9. SYNERGY & COMBO SYSTEM

## Fighter Combos (10)

| Combo Name | Cards Involved | Mechanic |
|------------|---------------|----------|
| **Fortress** | Barricade + Shield Wall + Iron Will | Block stacks permanently. Build an impenetrable wall over multiple turns. |
| **Berserker** | Berserk + Limit Break + Offering | Massive Strength stacking → exponential damage. High risk (Vulnerable, HP loss). |
| **Rampage Engine** | Rampage + Headbutt | Play Rampage, put it back on top with Headbutt, draw it again next turn. Escalating damage. |
| **Anger Loop** | Anger + Battle Trance | Anger copies itself. Battle Trance draws more. Deck fills with free 5-damage plays. |
| **Whirlwind Finisher** | Berserk (extra AP) + Whirlwind (X cost) | Extra AP = more Whirlwind hits. Wipe the board. |
| **Iron Wall** | Impervious + Second Wind | 20 Block + self-heal. Survive anything for one turn. |
| **Reaper Sustain** | Reaper + Strength stacking | Reaper heals for damage dealt. More Strength = more healing. |
| **Double Cleave** | Cleave + Warcry | Warcry puts Cleave on top. Guaranteed AoE next turn. |
| **Reckless Aggro** | Reckless Charge + Warcry (filter Dazed) | Get free damage, then stack-manage the Dazed status cards. |
| **Bloodlust Chain** | Bloodlust + Cleave/Whirlwind | Kill weak enemies with AoE, gain Strength for the boss. |

## Ranger Combos (10)

| Combo Name | Cards Involved | Mechanic |
|------------|---------------|----------|
| **Mark & Execute** | Hunter's Mark + Killing Blow | Apply Vulnerable, then play the 20-damage conditional finisher. |
| **Phantom Double** | Phantom Strike + Hunter's Mark | Mark → Phantom Strike hits twice on Vulnerable. Devastating. |
| **Poison Engine** | Poison Arrow + Serpent Venom | Doubled poison. Targets melt over turns. |
| **Rapid Barrage** | Rapid Fire + Favored Prey | Each Vulnerable trigger draws cards. Rapid Fire's multi-hit triggers multiple draws. |
| **Sniper** | Eagle Eye + Aimed Shot | Permanent DEX buff + big Vulnerable hit. |
| **Thorn Wall** | Barbed Trap + Evasion | Thorns punish attackers while Block absorbs. Enemies hurt themselves. |
| **Death Sentence** | Death Mark + Killing Blow | 4 Vulnerable + 3 Weak + 28 damage. Boss-killer. |
| **Volley Clear** | Volley + Rain of Arrows + Weak | AoE everything while debuffing. Board-clear specialty. |
| **Nature Sustain** | Nature's Gift + Camouflage | Regen + Block + card draw. Outlast. |
| **Predator Opening** | Predator + Heightened Senses | Massive first-turn hand size. Set up the whole fight turn 1. |

## Mage Combos (10)

| Combo Name | Cards Involved | Mechanic |
|------------|---------------|----------|
| **Echo Nuke** | Echo + Fireball/Meteor | Play Echo, then Fireball hits twice. 16-40 damage AoE. |
| **Frost Lock** | Frost Nova (stun ALL) + Blizzard | Stun everything, then Blizzard scales off Weak stacks. |
| **Time Stop** | Time Warp + any 3-AP turn | Extra turn = 6 AP total. Play your whole hand twice. |
| **Arcane Battery** | Arcane Surge + Spell Siphon | Extra AP + full hand refill. Endless cards, endless plays. |
| **Burn Everything** | Inferno + Arcane Mastery | Apply Burn to all, then Mastery ticks damage each turn. |
| **Spell Weave Tank** | Spell Weave + multiple cheap Attacks | Each Attack gives Block. Mage becomes unexpectedly tanky. |
| **Lightning Storm** | Lightning Spark + Chain Lightning + Strength | Multi-hit + AoE with Strength buff = devastating output. |
| **Counter Fortress** | Counterspell + Mana Shield + Arcane Shield | Stack enormous Block on a typically fragile class. |
| **Disintegrate Cleanup** | Disintegrate + any damage source | Soften a target, then Disintegrate for 30+ to finish. |
| **Scry Engine** | Scry + Concentration + Arcane Intellect | Extreme card filtering. Always have the right card in hand. |

## Cleric Combos (10)

| Combo Name | Cards Involved | Mechanic |
|------------|---------------|----------|
| **Healing Engine** | Beacon of Hope + Mass Heal | Doubled healing across the party. Full heal every turn. |
| **Righteous DPS** | Righteous Fury + Mass Heal | Every heal triggers 4 damage. Heal 4 allies = 16 free damage. |
| **Undead Annihilation** | Turn Undead + Sacred Flame + Holy Fire | Massive multiplied damage vs Undead encounters. |
| **Martyr Tank** | Martyr's Shield + Sanctuary | Take hits for allies with enormous Block. |
| **Dispel & Heal** | Dispel + Guiding Light | Remove debuffs, heal, and give the ally card draw. |
| **Prayer Sustain** | Prayer + Beacon of Hope | Doubled Regen each turn. Party never dies. |
| **Divine Wrath** | Wrath of the Gods + Righteous Fury | Big AoE + Weakness + healing triggers damage back. |
| **Fortify Fighter** | Fortify Spirit + Bless | Stack Strength and Block on the party's damage dealer. |
| **Resurrection Save** | Resurrection + Divine Intervention | Revive dead ally, emergency full heal if someone is critical. |
| **Purify Cycle** | Purify + any curse/weak card | Exhaust bad cards from hand while gaining health. Deck cleansing. |

## Rogue Combos (10)

| Combo Name | Cards Involved | Mechanic |
|------------|---------------|----------|
| **Shiv Storm** | Blade Dance + Envenom + Thousand Cuts | 4 Shivs = 4 Poison + 4 damage to ALL + 4 Block (After Image). |
| **Grand Finale** | Preparation + any draw manipulation | Empty the draw pile, then play Grand Finale for 40+ damage. |
| **Poison Bomb** | Corpse Explosion + Noxious Fumes | Poison ticks kill target → explodes for max HP damage to all. |
| **Flurry Burst** | Shiv + Shiv + Slice + Flurry | Play 3 free cards, then Flurry deals 3x damage per card. |
| **After Image Wall** | After Image + Blade Dance/Preparation | Every card played = Block. 10+ cards per turn = 10+ Block. |
| **Shadow Assassin** | Assassinate + Preparation (draw into it) | Draw 2, find Assassinate, deal 25. |
| **Caltrop Counter** | Caltrops + Dodge Roll | Enemies take damage attacking you. You block and draw. |
| **Adrenaline Burst** | Adrenaline + Flurry | Gain AP, draw cards, Flurry counts all plays. Explosive turn. |
| **Predator's Noxious** | Predator's Grace + Noxious Fumes + Blade Dance | Play tons of cards for free AP, poison ticks each turn. |
| **Double Envenom** | Envenom + Poisoned Blade + Fan of Knives | Every attack poisons. AoE attacks poison all. Poison avalanche. |

## Paladin Combos (10)

| Combo Name | Cards Involved | Mechanic |
|------------|---------------|----------|
| **Smite Engine** | Sacred Oath + Greater Smite | All damage becomes radiant. Greater Smite hits for 28+ total. |
| **Avenging Paladin** | Oath of Vengeance + Avenging Strike | Allies take damage → you gain Strength. Then Avenging Strike scales off hurt allies. |
| **Aegis Wall** | Divine Aegis + Consecrated Ground | All allies get 15 Block + 3 Block per turn. Party becomes immortal. |
| **Crusader Sustain** | Crusader's Resolve + Double Strike/many Attacks | Every attack heals. Many small attacks = lots of healing. |
| **Holy Executioner** | Judgment + Exorcism | Judgment finishes wounded targets. Exorcism strips boss buffs. |
| **Last Stand** | Final Stand + Lay on Hands | Low HP → enormous Block from Final Stand. Then heal back up. Risk-reward. |
| **Radiant Cleanse** | Hammer of Dawn + Exorcism | AoE + buff removal. Complete board control. |
| **Blessed Party** | Aura of Courage + Bless (starter) | Stack Strength on the whole party. Every ally hits harder. |
| **Rebuke Counter** | Rebuke + Divine Shield | Passive thorns-like damage on attacks. Block passively. |
| **Dawn Smite** | Dawn's Fury (Fragment) + Sacred Oath | Fragment card + radiant conversion = fire + radiant double-dip. |

## Cross-Class Party Synergies

| Party Combo | Classes | Mechanic |
|-------------|---------|----------|
| **Bless the Berserker** | Cleric + Fighter | Cleric Bless gives Fighter Strength. Fighter Limit Breaks it. Damage goes nuclear. |
| **Mark & Nuke** | Ranger + Mage | Ranger applies Vulnerable. Mage Fireballs for 50% more damage. |
| **Poison & Explode** | Rogue + Mage | Rogue poisons everything. Mage AoE + Burn + Poison = melting. |
| **Undying Party** | Cleric + Paladin | Double healer. Resurrection + Divine Intervention. Party cannot die. |
| **Shadow & Steel** | Rogue + Fighter | Rogue debuffs and poisons. Fighter Whirlwinds for massive AoE. |
| **Full Control** | Ranger + Cleric | Ranger Vulnerable + Weak. Cleric heals and buffs. No enemy acts at full power. |

## Combo Communication (UI Feedback)

When a synergy triggers:
1. **Glow effect** on the triggering card (gold border flash, 200ms)
2. **Combo text** floats above the combat log: "SYNERGY: Mark & Execute!" in amber text
3. **Chain counter** appears if 3+ synergistic cards played in sequence: "x3 COMBO" with increasing font size
4. **Sound**: ascending chime on synergy trigger, crescendo on 3+ chain

---

# 10. RARITY DISTRIBUTION & SCALING

## Post-Floor Draft Odds

| Floor | Common % | Uncommon % | Rare % |
|-------|----------|------------|--------|
| 1 | 75% | 20% | 5% |
| 2 | 70% | 25% | 5% |
| 3 | 60% | 30% | 10% |
| 4 | 50% | 35% | 15% |
| 5 (Boss) | 0% | 50% | 50% |

## Rare Pity Timer (StS model)
- Base rare chance starts at listed percentage minus 5%
- Each Common rolled adds +1% to rare chance
- When a Rare is rolled, counter resets to -5%
- This prevents long dry streaks of only Common cards

## Treasure Chest Rarity Table

| Chest Type | Common % | Uncommon % | Rare % | Legendary % |
|------------|----------|------------|--------|-------------|
| Wooden Chest | 60% | 30% | 10% | 0% |
| Iron Chest | 30% | 45% | 20% | 5% |
| Golden Chest (Boss) | 0% | 30% | 50% | 20% |

## Bessa Shop Stock (3 class + 2 neutral)

| Slot | Rarity |
|------|--------|
| Class Slot 1 | Common (guaranteed) |
| Class Slot 2 | Uncommon (guaranteed) |
| Class Slot 3 | Weighted: 50% Uncommon, 40% Rare, 10% Legendary |
| Neutral Slot 1 | Common or Uncommon (50/50) |
| Neutral Slot 2 | Uncommon or Rare (60/40) |

## Depth Scaling — Why It Matters

Early floors give mostly Common cards = establish your base strategy.
Mid floors add Uncommon = specialize and commit to a synergy path.
Late floors add Rare = capstone your build with a powerful payoff card.
Boss rewards = rare/legendary only = dramatic power spike for the final push.

This mirrors the StS Act structure but compressed into DX's shorter dungeon format (3-5 floors per dungeon).

---

# 11. INTEGRATION WITH EXISTING SYSTEMS

## Replacing the Current Combat System

The current combat system uses 4 actions: Attack (KeyA), Guard (KeyG), Spell (KeyS), Flee (KeyF). The card system replaces this entirely.

### What Changes

| Current System | Card System Replacement |
|----------------|------------------------|
| `KeyA` = Attack (uses weapon dice + STR mod) | Playing Attack cards from hand |
| `KeyG` = Guard (isDefending = true, +2 AC) | Playing Skill cards with Block effects |
| `KeyS` = Spell (placeholder, skips turn) | Playing any card that costs AP |
| `KeyF` = Flee (DEX check) | "Flee" is a special permanent card (see below) |

### Flee Card Definition

```
{
  id: 'flee',
  name: 'Flee',
  description: 'Attempt to escape combat. Each party member rolls DEX save vs DC (10 + floor). Majority must pass.',
  type: 'skill',
  cardClass: 'neutral',
  rarity: 'special',
  cost: 0,
  effects: [{ type: 'flee', saveStat: 'dex', saveDC: 'floor' }],
  exhaust: false,
  permanent: true,  // Always in hand, does NOT count toward hand size, not part of deck
}
```

The Flee card is always visible in a special slot below the hand. It does not occupy a hand slot, is not drawn from the deck, and cannot be removed or upgraded. |
| Mana pool (currentMana/maxMana) | **REMOVED.** AP replaces mana. All costs are AP. |
| Class abilities (useAbility) | **REMOVED.** Class abilities become cards in the deck. |
| Cooldowns (abilityCooldowns) | **REMOVED.** Card cycling handles availability naturally. |

### What Stays

| System | Status | Notes |
|--------|--------|-------|
| D&D 5e stats (STR/DEX/CON/INT/WIS/CHA) | STAYS | Stats scale card effects |
| Equipment slots (weapon/armor/shield/accessory) | STAYS | Equipment provides passive bonuses to cards |
| HP system (currentHP/maxHP) | STAYS | Unchanged |
| Initiative order | REMOVED | Card combat uses Party Turn → Enemy Turn (no initiative roll). DEX mod used for Block scaling instead. |
| Level-up / XP | STAYS | Levels unlock draft pool tiers |
| Proficiency bonus | STAYS | Used in save DC calculations |
| D&D damage types + vulnerability/resistance | STAYS | Cards specify damage types |
| Monster stat blocks | STAYS | Added: intent system, status effect tracking |
| `isDefending` / AC calculation | **REMOVED** | AC is NOT used in card combat. Block is the sole defense mechanic. |

### Defense System — Block Only (No AC)

AC is **completely removed** from card combat. Enemies deal **fixed damage** (shown via intent icons). There are no d20 attack rolls from enemies.

- **Block** absorbs damage BEFORE HP loss. Enemy intent shows exact damage → player plays Block cards to absorb.
- Order: Enemy deals fixed damage → subtract Block → remaining damage hits HP.
- Block decays to 0 at start of each turn (unless Barricade effect).
- Armor equipment provides starting Block each turn (Chain Mail = +3, Plate = +5, etc.).

This eliminates the Fighter-invincible / Mage-paper imbalance from the old AC system. Every class must play Block cards to survive. Armor gives a head start, not immunity.

## Save System Integration

### Meta-Save (dx-meta) — Additions

```javascript
// Added fields to meta-save
{
  // Existing fields unchanged...

  // NEW: Unlocked draft pool (meta-progression)
  unlockedCards: ['fireball', 'shield_bash', ...],  // Cards available in draft pool

  // NEW: Card upgrade progress
  totalCardsUpgraded: 0,  // Lifetime counter for achievement tracking

  // NEW: Lifetime stats
  cardStats: {
    totalCardsPlayed: 0,
    favoriteCard: null,  // Most-played card ID
    longestCombo: 0,
  }
}
```

### Run-Save (dx-run) — Additions

```javascript
// Added fields to run-save
{
  // Existing fields unchanged...

  // NEW: Shared party deck state (ONE deck for the whole party)
  partyDeck: {
    drawPile: ['strike', 'fireball', ...],    // Card IDs in order
    discardPile: ['defend', ...],
    exhaustPile: ['second_wind'],
    deck: ['strike', 'strike', 'fireball', 'defend', ...],  // Full deck list
    upgradedCards: { 'fireball': true },  // Which cards are upgraded
  },

  // NEW: Persistent combat curses (from Legendary cards)
  curseCards: ['weakness', 'doubt'],  // Added to deck, persist until removed
}
```

### Deck Lifecycle

```
PARTY CREATION
  → All party members' starter cards (10 each) merge into ONE shared deck
  → 4-member party = ~40 card shared deck
  → Deck stored in run-save as partyDeck

DUNGEON ENTRY
  → Shared deck copied from run-save
  → Draw pile = shuffled shared deck

COMBAT START
  → Draw 5 cards from shared draw pile
  → Party shares ONE draw/discard/exhaust pile

PLAY PHASE
  → Play a card → assign to a party member
  → Card resolves using assigned member's stats
  → Class cards can only be assigned to matching class
  → Neutral cards can be assigned to anyone

COMBAT END (Victory)
  → Card reward screen (draft 1 of 3, or skip)
  → New card added to shared party deck

FLOOR TRANSITION
  → Rest site: heal or upgrade a card
  → Run-save updated with shared deck state

DUNGEON COMPLETE
  → Deck state cleared (per-run, not persistent)
  → Newly unlocked card IDs added to meta-save unlockedCards
  → Meta-save persists progression

DEATH
  → Deck lost (per-run)
  → XP/levels kept (Hades model)
  → Card unlocks persist in meta-save
```

---

# 12. ANTI-PATTERNS & GUARDRAILS

## 1. Deck Bloat
**Problem:** Player adds every card offered, deck becomes 30+ cards, draws are inconsistent, synergies never fire.

**Guardrails:**
- SKIP is always prominent and never penalized
- Card removal available at shop, events, and rest sites
- UI shows deck size with color coding: Green (30-40), Yellow (41-55), Red (56+)
- Tooltip on red deck size: "Large decks draw less consistently. Consider removing cards."
- Minimum deck size: 5 cards (hard floor)
- Starter Strikes and Defends are intentionally weak — players naturally want to replace them

## 2. Analysis Paralysis
**Problem:** Too many cards in hand, too many possible plays, turn takes 60+ seconds.

**Guardrails:**
- Max hand size: 10 (hard cap)
- Most cards cost 1 AP, some cost 0 or 2, very few cost 3. With 3 AP, you play 2-4 cards per turn.
- Enemy intent is visible — the "right" play is usually guided by what the enemy is doing
- Card descriptions are SHORT. One sentence. No paragraphs. Numbers are highlighted.
- Targeting defaults to the highest-threat enemy (intent-based sorting)
- Intent tooltips: tap/hover on enemy intent icons to see "This enemy will deal 14 damage to [Fighter]" — guides player decisions naturally without hand-holding

## 3. Power Creep
**Problem:** Late-game cards are so strong that early dungeons become trivial on subsequent runs.

**Guardrails:**
- Decks are PER-RUN. You start fresh every dungeon. No carrying a god-deck.
- Meta-progression unlocks OPTIONS (cards in the draft pool), not POWER
- High-rarity cards have significant downsides (Exhaust, HP cost, Curse generation)
- Legendary cards are double-edged swords, not strict upgrades
- Difficulty scales with dungeon (later dungeons have harder enemies regardless of your build)
- Ascension system (post-game): each ascension level adds modifiers that increase difficulty

## 4. Unfun RNG
**Problem:** Bad draws lose the game regardless of player skill.

**Guardrails:**
- Innate keyword: critical cards always drawn turn 1
- Scry mechanic: filter upcoming draws
- Small decks: 10-15 cards means you see every card every 2-3 turns
- Shuffle is deterministic (seeded PRNG) — same seed = same shuffle order = fair daily challenge
- No "instant death" cards. Maximum single-hit enemy damage is always survivable with some Block.
- Retain keyword on key defensive cards — hold them for the right moment

## 5. Card Text Clarity
**Problem:** Players don't understand what a card does.

**Guardrails:**
- Every card follows this template: `[Action] [Value] [Target]. [Condition/Extra].`
- Examples: "Deal 8 damage." / "Gain 5 Block." / "Apply 2 Poison to ALL enemies."
- Keywords are highlighted and hoverable (tap on mobile): Exhaust, Ethereal, Retain, Innate
- Numbers that scale with stats show in a different color (e.g., blue for INT-scaled values)
- Card preview on hover/long-press shows exact damage after stat scaling

## 6. Party Complexity
**Problem:** Managing a shared deck with 4 party members could be confusing.

**Guardrails:**
- ONE hand, ONE AP pool, ONE turn. No switching between characters mid-combat.
- Card assignment is visual: drag card onto a party member portrait, or tap card then tap member.
- Class cards show a class icon — only highlights valid party members when played.
- Neutral cards highlight ALL party members as valid targets.
- Party member portraits show current HP, Block, and active status effects at all times.
- Deck management screen (between combats) shows the shared deck with class-color coding.
- Tutorial overlay for first 3 combats (see UX section).

---

# 13. PHASED IMPLEMENTATION PLAN

## Phase 1: Core Card Engine + Shared Party Deck (Merged from v1.0 Phases 1+2)
**Goal:** Replace current Attack/Guard/Spell/Flee with shared-deck card combat. All 6 class starter decks, party card assignment, full stat scaling from day one. No single-character intermediary phase.

### Deliverables
- Card data structure (`src/cards/card-data.js`) — all 60 starter cards (10 per class)
- Shared deck manager class (`src/cards/deck-manager.js`) — ONE draw pile, discard pile, exhaust pile, shuffle for the whole party
- Shared AP system (3 AP per party turn, not per character)
- Card assignment system — play a card → assign to a party member → resolve with their stats
- Class-locked assignment validation (Mage spells only assignable to Mage, etc.)
- Card hand UI — display 5 cards at bottom of combat screen, party member portraits above
- Play a card: tap/click card → select party member → select target → resolve effect
- End Turn button
- Block mechanic (decays each turn, armor provides starting Block, absorbs damage before HP)
- Status effects engine (`src/combat/status-effects.js`) — Strength, Weak, Vulnerable, Poison, Burn, etc.
- Poison: ticks at turn START, decays by 1. Burn: ticks at turn END, does NOT decay.
- Enemy intent display (fixed damage, no d20 rolls)
- Stat scaling working for all card types (STR melee, DEX ranged, INT spells, WIS heals)
- Tutorial overlay for first 3 combats (see UX section)

### Files to Create
| File | Purpose |
|------|---------|
| `src/cards/card-data.js` | All 60 starter card definitions |
| `src/cards/card.js` | Card class with effect resolution + assignment |
| `src/cards/deck-manager.js` | Shared draw/discard/exhaust/shuffle logic |
| `src/combat/status-effects.js` | Status effect tracker (apply, tick, remove) — separate Poison/Burn behavior |
| `src/combat/block-manager.js` | Block tracking per party member (includes armor-to-Block conversion) |
| `src/combat/intent-system.js` | Enemy intent selection and display (fixed damage, no d20) |
| `src/combat/card-assignment.js` | Card → party member assignment validation and resolution |

### Files to Modify
| File | Changes |
|------|---------|
| `src/ui/states/combat.js` | Complete rewrite: shared hand display, party portraits, card assignment UI, intent tooltips |
| `src/combat/combat-manager.js` | Replace processAttack/processDefend with card resolution. Remove AC from combat. |
| `src/combat/damage-calc.js` | Add stat-scaling formula, Block absorption, remove AC checks |
| `src/character/character.js` | Remove `abilityCooldowns`, keep stats. Deck is shared (not per-character). |
| `src/character/class-data.js` | Add `starterDeck: [cardIds]` to each class |
| `src/dungeon/monsters.js` | Add intent data (fixed damage values, no attack rolls) |

### Complexity: HIGH (largest phase — new core system + all starters)
### Dependencies: None
### Estimated effort: The foundation. Everything else builds on this.

---

## Phase 2: Card Draft After Floor Clear
**Goal:** Player receives card rewards after each floor. Choose 1 of 3, or skip.

### Deliverables
- Card reward screen UI (`src/ui/states/card-reward.js`)
- Rarity weighting system (Common/Uncommon/Rare by floor depth)
- Class-locked card filtering (only show cards matching character's class)
- Skip button
- Card added to shared party deck immediately
- Run-save updated with shared deck state

### Files to Create
| File | Purpose |
|------|---------|
| `src/ui/states/card-reward.js` | Card draft UI state |
| `src/cards/card-pool.js` | Rarity weighting, class filtering, draft generation |

### Files to Modify
| File | Changes |
|------|---------|
| `src/ui/states/combat.js` | After victory, push card-reward state |
| `src/core/game-save.js` | Add deck serialization to run-save |

### Complexity: MEDIUM
### Dependencies: Phase 1 complete

---

## Phase 3: Full Card Pool
**Goal:** All 108 class cards + 15 neutral cards + 5 legendary + 5 fragment cards defined and draftable.

### Deliverables
- All 133 non-starter cards defined
- Pity timer for rare cards
- Fragment-gated cards (check `world.collectedFragments.size`)
- Legendary cards with curse/downside mechanics
- Status card generation (Dazed, Wound, Burn status cards)
- Treasure chest card rewards

### Files to Modify
| File | Changes |
|------|---------|
| `src/cards/card-data.js` | Add all 133 cards |
| `src/cards/card-pool.js` | Pity timer, fragment gating, legendary odds |
| `src/dungeon/monsters.js` | Treasure chest → card reward integration |
| `src/core/game-world.js` | Fragment count affects available cards |

### Complexity: MEDIUM-HIGH (lots of content, moderate logic)
### Dependencies: Phase 2 complete

---

## Phase 4: Synergies, Combos, Fragment Cards
**Goal:** Combo detection, visual feedback, cross-class synergies, fragment-unlocked cards.

### Deliverables
- Combo detection engine (`src/combat/combo-tracker.js`)
- Synergy definitions data file
- Combo UI: glow effect, floating text, chain counter
- Fragment-synergy card pool integration
- Combo sound effects (ascending chimes)
- Combat log shows synergy triggers

### Files to Create
| File | Purpose |
|------|---------|
| `src/combat/combo-tracker.js` | Tracks cards played, detects synergies, emits events |
| `src/cards/synergy-data.js` | Synergy definitions (which card combos trigger which effects) |

### Files to Modify
| File | Changes |
|------|---------|
| `src/ui/states/combat.js` | Combo UI rendering |
| `src/render/animation-queue.js` | New combo/synergy animations |
| `src/audio/sound-manager.js` | Combo chime sounds |

### Complexity: MEDIUM
### Dependencies: Phase 3 complete

---

## Phase 5: Card Upgrades, Shop Integration, Card Removal
**Goal:** Complete card economy. Upgrade cards at rest sites. Buy/remove cards at Bessa's shop.

### Deliverables
- Rest site state (`src/ui/states/rest-site.js`) — REST or SMITH choice
- Card upgrade logic (apply `upgradedVersion` to card)
- Bessa shop: card inventory (3 class + 2 neutral), prices, CHA discount
- Card removal at shop (escalating price)
- Meta-save: track unlocked cards, lifetime stats
- Deck management screen (view shared party deck with class-color coding between combats)
- Ascension system unlock (post-game difficulty modifiers)

### Files to Create
| File | Purpose |
|------|---------|
| `src/ui/states/rest-site.js` | Rest vs Smith choice UI |
| `src/ui/states/deck-view.js` | Full deck management/inspection screen |
| `src/cards/card-upgrade.js` | Upgrade resolution logic |

### Files to Modify
| File | Changes |
|------|---------|
| `src/items/merchant.js` | Add card inventory, card removal service |
| `src/ui/states/tavern.js` | Bessa shop shows cards alongside items |
| `src/core/game-save.js` | Meta-save: `unlockedCards`, `cardStats` |
| `src/core/game-world.js` | Rest site placement in dungeon generation |

### Complexity: MEDIUM-HIGH
### Dependencies: Phase 4 complete

---

## Phase Summary

| Phase | What's Playable After | Key Risk |
|-------|----------------------|----------|
| **Phase 1** | Shared-deck card combat works. All 6 classes feel unique. Card assignment to party members. | Core engine + assignment system must be solid — everything builds on it. Stat scaling balance critical. |
| **Phase 2** | Draft after each floor. Shared deck grows during run. | UI/UX of the draft screen. Must be fast and clear. |
| **Phase 3** | Full card variety. Every run feels different. | 133 cards = lots of edge cases. Testing critical. |
| **Phase 4** | Combos fire, synergies reward smart play. | Combo detection can get expensive. Keep it O(n). |
| **Phase 5** | Complete card economy. Full progression loop. | Shop balance. If removal is too cheap, shared deck shrinks too fast. |
| **Phase 6** | Stress/Sanity system adds psychological layer (see Section 15). | Balance — must enhance, not punish. Design TBD. |

---

# APPENDIX A: GENERATED CARD — SHIV (Token Card)

Shivs are generated by Rogue cards (not drafted, not in starting deck). They are temporary cards added to hand during combat.

```javascript
{
  id: 'shiv',
  name: 'Shiv',
  description: 'Deal 3 damage.',
  type: 'attack',
  cardClass: 'rogue',
  rarity: 'token',      // Special rarity: token cards are not draftable
  cost: 0,
  effects: [{ type: 'damage', value: 3, scaling: { stat: 'dex', ratio: 1.0 }, target: 'singleEnemy' }],
  exhaust: true,         // Shivs exhaust after play (don't clog discard pile)
  keywords: ['exhaust'],
}
```

# APPENDIX B: STATUS CARDS (Generated During Combat)

| Card | How Generated | Effect |
|------|--------------|--------|
| Dazed | Reckless Charge, enemy abilities | Unplayable. Ethereal. Clogs hand for 1 turn. |
| Wound | Enemy abilities | Unplayable. Clogs hand permanently (must exhaust to remove). |
| Burn | Fire damage, Inferno card | Unplayable. At end of turn, take 2 damage. Ethereal. |
| Doubt | Curse events | Unplayable. At end of turn, gain 1 Weak. Ethereal. |
| Parasite | Legendary card downside | Unplayable. Cannot be removed during combat. Clogs hand. |

# APPENDIX C: MONSTER INTENT PATTERNS

Each monster gets an intent AI that determines what they telegraph:

```javascript
// Added to monster definitions
{
  "shadow_lurker": {
    // ...existing stats...
    intentPattern: [
      { type: 'attack', damage: 8 },
      { type: 'attack', damage: 8 },
      { type: 'buff', effect: 'strength', stacks: 1 },
    ],
    // Cycles through pattern. Randomized start position.
  },
  "bone_revenant": {
    intentPattern: [
      { type: 'attack', damage: 14 },
      { type: 'defend', block: 10 },
      { type: 'attack', damage: 14 },
      { type: 'buff', effect: 'strength', stacks: 2 },
    ],
  },
  "frost_wraith": {
    intentPattern: [
      { type: 'attack', damage: 10, debuff: { id: 'weak', stacks: 1 } },
      { type: 'debuff', effect: 'frail', stacks: 2 },
      { type: 'attack', damage: 10 },
    ],
  },
  "goblin_scrapper": {
    intentPattern: [
      { type: 'attack', damage: 6 },
      { type: 'attack', damage: 6 },
      { type: 'attack', damage: 12 },  // Big hit every 3rd turn
    ],
  },
  "gretchka_elder": {  // BOSS
    intentPattern: [
      { type: 'attack', damage: 18 },
      { type: 'summon', monster: 'goblin_scrapper', count: 2 },
      { type: 'buff', effect: 'strength', stacks: 3 },
      { type: 'attack', damage: 24 },
      { type: 'defend', block: 20 },
    ],
  },
}
```

---

---

# 14. UX & MOBILE CONSIDERATIONS

## Tutorial Overlay (First 3 Combats)

New players see a semi-transparent overlay for their first 3 combat encounters:

| Combat | Tutorial Focus | Overlay Content |
|--------|---------------|-----------------|
| **1st** | Card basics | "Tap a card to play it. Assign it to a party member. Spend AP to play cards. End Turn when done." Arrow pointing to hand, AP counter, End Turn button. |
| **2nd** | Assignment & scaling | "Class cards can only be assigned to matching classes. The assigned member's stats boost the card." Highlights class icons on cards and party portraits. |
| **3rd** | Block & intent | "Enemy intents show what they'll do next turn. Play Block cards to absorb incoming damage." Arrow pointing to intent icons and Block values. |

After 3 combats, overlay never appears again (stored in meta-save). Can be re-enabled in settings.

## Mobile UX

| Element | Implementation |
|---------|---------------|
| **Card tray** | Scrollable horizontal tray at bottom of screen. Cards fan out. Swipe left/right to browse. |
| **Tap-to-zoom** | Tap a card to see full-size preview with all stats, scaling values, and keywords. Tap again or tap elsewhere to dismiss. |
| **Card assignment** | Tap card → card lifts up → tap party member portrait to assign. Valid targets glow. Invalid targets are dimmed. |
| **Intent tooltips** | Tap enemy intent icon to see detailed tooltip: "Goblin will deal 6 damage to [random party member]" |
| **End Turn** | Large button, bottom-right. Requires confirmation tap if AP remains (prevents accidental end). |
| **Deck/discard view** | Tap draw pile or discard pile icon to see scrollable card list. |

---

# 15. FUTURE: STRESS/SANITY SYSTEM (Phase 6 — Design TBD)

A future phase will introduce a Stress/Sanity system inspired by Darkest Dungeon. Key design notes for future reference:

- **Stress** accumulates from: taking large damage, party members dying, curse cards, specific enemy abilities, dungeon events.
- **High Stress** triggers negative effects: reduced max hand size, forced discards, stat penalties, card cost increases.
- **Sanity Break** at max Stress: party member becomes uncontrollable for 1-2 turns (plays random cards) or gains a permanent negative trait for the run.
- **Stress Relief** from: rest sites, Cleric heal cards, specific events, completing floors without damage.
- **Design Goal:** Add psychological tension without punishing players unfairly. Stress should create interesting decisions, not feel-bad moments.
- **Implementation:** After Phase 5 is stable and playtested. This system touches every other system and must be carefully balanced.

---

# CHANGES FROM v1.0

## Mandatory Changes (Masters Review)

### 1. SHARED PARTY DECK (CRITICAL)
- **Before:** 4 independent decks, each character draws from OWN deck, spends OWN AP.
- **After:** ONE shared party deck. Party draws from ONE deck, spends from ONE AP pool. Cards are ASSIGNED to party members on play. Assigned member's stats determine scaling. Class cards restricted to matching class; neutral cards assignable to anyone.
- **Reference model:** Gordian Quest.
- **Sections affected:** Design Philosophy (pillars 4, 6, 7 added), Combat Mechanics (Section 3), Save System (Section 11), Anti-Patterns (Section 12), Implementation Plan (Section 13), Card Acquisition (Section 8).

### 2. REMOVED AC FROM CARD COMBAT
- **Before:** AC used for enemy d20 attack rolls. Block absorbed damage after AC check. High-AC characters (Fighter) were nearly invincible; low-AC (Mage) were paper.
- **After:** Block is the SOLE defense mechanic. No d20 enemy attack rolls. Enemies deal FIXED damage shown via intent. Armor equipment converts to starting Block each turn (Chain Mail = +3, Shield = +2, Plate = +5).
- **Sections affected:** Equipment (Section 4), Combat Mechanics (Section 3), Integration (Section 11).

### 3. FIXED BROKEN CARDS
- **Limit Break (upgraded):** Was "No longer Exhausts" (infinite Strength doubling). Now: Cost 0, still Exhausts.
- **Soul Reaver:** Was "Deal damage equal to target's current HP" (instant kill). Now: Deal 50% of target's current HP.
- **Grand Finale:** Was Cost 0 (free 40 damage). Now: Cost 1.
- **Dorevus's Echo:** Was "Deal 30 damage to ALL enemies" with only curse downside. Now: Added "Take 10 damage immediately" as upfront cost.
- **Anger:** Was uncapped self-copying. Now: Max 3 copies in deck.
- **Rebuke:** Was a reaction card (play during enemy turn — unsupported by the card system). Now: Power card with passive trigger (whenever attacked, deal 4 damage back).

### 4. DIFFERENTIATED POISON AND BURN
- **Before:** Both ticked at turn start and decayed by 1 per turn (identical mechanics with different names).
- **After:** Poison ticks at turn START, decays by 1 per turn. Burn ticks at turn END, does NOT decay — must be removed by playing a Skill card or water event.

### 5. MERGED PHASE 1 + 2
- **Before:** Phase 1 = single-character basic cards. Phase 2 = add class starters and party combat.
- **After:** Phase 1 builds shared party deck combat from day one. No single-character intermediary. Phases renumbered (old 3→2, 4→3, 5→4, 6→5).

## Secondary Changes

### Rogue Starter Rebalance
- **Backstab:** Damage reduced from 8 to 7. Innate keyword removed. (Was too strong as guaranteed opening play.)

### Cleric 0-Cost Cantrip Added
- **Sacred Word:** Deal 2 radiant damage. Draw 1 card. Cost 0. +WIS mod scaling. Replaces one Holy Strike in starter deck. (Cleric needed a free play option for tempo turns.)

### Mage Arcane Bolt Buffed
- **Arcane Bolt:** Base damage increased from 5 to 6. (Mage starter was underperforming vs Fighter/Rogue starters.)

### Stress/Sanity System Noted (Phase 6)
- Added Section 15 noting future Stress/Sanity system design (Darkest Dungeon inspired). Implementation after Phase 5 is stable.

### Tutorial Overlay Added
- Added tutorial overlay for first 3 combats. Teaches card basics, assignment, and Block/intent. Stored in meta-save.

### Mobile UX Notes Added
- Added Section 14 with scrollable card tray, tap-to-zoom, card assignment flow, intent tooltips, and end-turn confirmation.

### "Suggest Play" Button Removed
- Replaced with intent tooltips that guide decisions naturally. No hand-holding button.

### Cleric Guiding Light Updated
- "That ally draws 1 card on their next turn" changed to "Draw 1 card" (shared deck has no per-character turns).

---

*End of Document. Every number is canonical. Every card is defined. Every mechanic has a clear rule. Hand this to any Billy Boy and they build it.*
