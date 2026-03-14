# Dungeon X — Combat System (D&D Model)
## Classic Hit Points + Armor Class

Based on the same D&D foundation that powered Wizardry (1981) and Dungeon Master (1987). Attack rolls against Armor Class. You hit or you miss. Damage dice on hit. Saving throws for spells.

---

## Core Stats

### Per Character
| Stat | Abbrev | Description | Range |
|------|--------|-------------|-------|
| Strength | STR | Melee damage bonus, carry weight, push/break checks | 3-18 |
| Dexterity | DEX | AC bonus, initiative, ranged attack bonus, trap disarm | 3-18 |
| Constitution | CON | HP bonus per level, poison/disease resistance | 3-18 |
| Intelligence | INT | Mana pool, spell damage, arcane puzzle bonus | 3-18 |
| Wisdom | WIS | Healing power, divine spell bonus, perception/trap detection | 3-18 |
| Charisma | CHA | NPC dialogue options, merchant prices, party morale | 3-18 |

**Modifier formula:** `Math.floor((stat - 10) / 2)`
- STR 10 = +0, STR 14 = +2, STR 18 = +4, STR 8 = -1

---

## Hit Points (HP)

- Base HP by class:
  - Fighter: d10 per level + CON modifier
  - Ranger: d8 per level + CON modifier
  - Mage: d4 per level + CON modifier
  - Cleric: d6 per level + CON modifier
- Level 1 gets max dice (Fighter = 10 + CON mod)
- At 0 HP: unconscious. At -10 HP: dead.
- Healing: Cleric spells, health potions, rest at tavern

---

## Armor Class (AC)

Higher AC = harder to hit. Base AC 10 (unarmored).

| Armor | AC | Weight | Classes |
|-------|-----|--------|---------|
| None (clothes) | 10 | 0 | All |
| Padded | 11 | 5 | All |
| Leather | 12 | 10 | All |
| Studded Leather | 13 | 13 | Fighter, Ranger, Cleric |
| Chain Mail | 15 | 40 | Fighter, Cleric |
| Plate Mail | 18 | 55 | Fighter only |
| Shield | +2 | 6 | Fighter, Ranger, Cleric |

**AC Calculation:** Base armor AC + DEX modifier (max +2 for medium, no limit for light, +0 for heavy) + shield bonus + magic bonuses

---

## Attack Rolls

**To Hit:** Roll d20 + attack modifier vs target AC.
- **Meet or beat AC = HIT.** Roll damage.
- **Below AC = MISS.** No damage. "Your sword swings wide!"
- **Natural 20 = CRITICAL HIT.** Double damage dice.
- **Natural 1 = CRITICAL MISS.** Attack fails, possible fumble effect.

**Attack Modifiers:**
- Melee: STR modifier + proficiency bonus (+2 at level 1)
- Ranged: DEX modifier + proficiency bonus
- Spell: INT modifier (Mage) or WIS modifier (Cleric) + proficiency bonus

---

## Damage Dice

| Weapon | Dice | Type | Properties |
|--------|------|------|------------|
| Dagger | d4 | Piercing | Light, throwable |
| Short Sword | d6 | Slashing | Light |
| Long Sword | d8 | Slashing | Standard melee |
| Mace | d6 | Bludgeoning | Bonus vs undead (+2) |
| Staff | d6 | Bludgeoning | Two-handed, spell focus |
| Greatsword | d10 | Slashing | Two-handed, Fighter only |
| Short Bow | d6 | Piercing | Ranged, requires arrows |
| Long Bow | d8 | Piercing | Ranged, two-handed, requires arrows |
| Thrown Dagger | d4 | Piercing | Ranged, consumable |

**Damage = dice roll + STR modifier (melee) or DEX modifier (ranged)**

---

## Spell Damage & Saving Throws

**Spell Attack:** Roll d20 + spellcasting modifier vs target AC (for direct spells like Fire Bolt).

**Saving Throws:** For area/effect spells, target rolls d20 + relevant modifier vs Spell Save DC.
- **Spell Save DC = 8 + proficiency bonus + spellcasting modifier**
- **Pass save:** Half damage (or no effect)
- **Fail save:** Full damage (or full effect)

**Spell Damage by Level:**

| Spell | Dice | Element | Save Type |
|-------|------|---------|-----------|
| Fire Bolt | d8 | Fire | Attack roll |
| Ice Shard | d6 | Ice | DEX save |
| Stone Fist | d10 | Stone | Attack roll |
| Wind Slash | d6 | Wind | DEX save |
| Shadow Strike | d8 | Shadow | WIS save |
| Holy Light | d6 | Light | CON save (undead: d10) |
| Fireball (combo) | 3d6 | Fire | DEX save, area |
| Frost Lock (combo) | — | Ice+Stone | INT save, disarm/freeze |
| Reveal (combo) | — | Shadow+Light | — (utility, no damage) |

---

## Enemy Stats (D&D Format)

### Shadow Lurker
- **AC:** 12 | **HP:** 28 (4d8+4)
- **STR** 10 | **DEX** 14 | **CON** 12 | **INT** 6 | **WIS** 10 | **CHA** 4
- **Attack:** Claw +4 to hit, d6+2 slashing
- **Vulnerability:** Fire (double damage)
- **Resistance:** Ice (half damage)
- **XP:** 100

### Frost Wraith
- **AC:** 13 | **HP:** 22 (3d8+3)
- **STR** 6 | **DEX** 16 | **CON** 12 | **INT** 12 | **WIS** 14 | **CHA** 8
- **Attack:** Frost Touch +5 to hit, d8+3 cold
- **Vulnerability:** Fire (double damage)
- **Resistance:** Stone (half damage)
- **Special:** Incorporeal — physical attacks have 50% miss chance unless magic weapon
- **XP:** 150

### Bone Revenant
- **AC:** 16 (tattered plate) | **HP:** 52 (6d10+12)
- **STR** 18 | **DEX** 10 | **CON** 14 | **INT** 8 | **WIS** 8 | **CHA** 6
- **Attack:** Bone Sword +6 to hit, d10+4 slashing
- **Vulnerability:** Stone (1.5x damage), Light (1.5x)
- **Resistance:** Fire (half damage)
- **Special:** Undying — first time reduced to 0 HP, rolls CON save DC 12. Pass = returns with 1 HP.
- **XP:** 250

---

## Initiative & Turn Order

1. Each combatant rolls d20 + DEX modifier
2. Highest goes first
3. Ties: player wins (hero advantage)
4. Each turn: one action (Attack, Cast Spell, Use Item, Defend, Flee)
5. **Defend:** AC +2 until next turn
6. **Flee:** Roll d20 + DEX mod vs enemy DEX + 10. Success = escape combat.

---

## Level Progression

| Level | XP Required | Proficiency | New Feature |
|-------|-------------|-------------|-------------|
| 1 | 0 | +2 | Starting abilities |
| 2 | 300 | +2 | Class feature unlock |
| 3 | 900 | +2 | Spell tier 2 / weapon specialization |
| 4 | 2,700 | +2 | Ability score increase (+2 to any stat) |
| 5 | 6,500 | +3 | Extra attack (Fighter/Ranger) / Spell tier 3 |

---

## Implementation Notes

**Random rolls in JavaScript:**
```javascript
function rollDice(sides) { return Math.floor(Math.random() * sides) + 1; }
function rollD20() { return rollDice(20); }
function rollDamage(notation) {
  // Parse "2d6+3" format
  const match = notation.match(/(\d+)d(\d+)(?:\+(\d+))?/);
  if (!match) return 0;
  const [, count, sides, bonus] = match;
  let total = parseInt(bonus || 0);
  for (let i = 0; i < parseInt(count); i++) total += rollDice(parseInt(sides));
  return total;
}
```

**Attack resolution:**
```javascript
function attackRoll(attacker, target) {
  const roll = rollD20();
  const modifier = attacker.attackMod;
  const total = roll + modifier;
  if (roll === 1) return { hit: false, critical: 'fumble', roll };
  if (roll === 20) return { hit: true, critical: 'crit', roll };
  return { hit: total >= target.ac, critical: null, roll };
}
```

**Combat log messages:**
- Hit: "You strike the Shadow Lurker for 7 damage! (rolled 15 + 4 = 19 vs AC 12)"
- Miss: "Your blade passes through empty air. (rolled 5 + 4 = 9 vs AC 12)"
- Crit: "CRITICAL HIT! Your sword finds a weak point! 14 damage!"
- Fumble: "You stumble! The Shadow Lurker gets a free attack!"
