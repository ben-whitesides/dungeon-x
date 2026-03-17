export function rollD20() {
  return Math.floor(Math.random() * 20) + 1;
}

export function rollDice(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

export function attackRoll(attacker, target) {
  const roll = rollD20();
  const modifier = attacker.attackMod || 0;
  const total = roll + modifier;
  // D&D 5e: nat 20 = auto-hit (crit), nat 1 = auto-miss (fumble)
  const critical = roll === 20 ? 'crit' : roll === 1 ? 'fumble' : null;
  const hit = roll === 1 ? false : (roll === 20 ? true : total >= (target.ac || 10));

  return { roll, modifier, total, hit, critical };
}

// D&D 5e initiative: d20 + DEX modifier (higher goes first)
export function rollInitiative(dexModifier = 0) {
  return rollD20() + dexModifier;
}

export function calculateDamage(diceNotation, modifier = 0) {
  // Parse "2d6+3" format
  const match = diceNotation.match(/(\d*)d(\d+)([+-]\d+)?/);
  if (!match) return 0;
  
  const [, count = 1, sides, bonus = 0] = match;
  let damage = 0;
  for (let i = 0; i < parseInt(count); i++) {
    damage += rollDice(parseInt(sides));
  }
  return damage + parseInt(bonus) + modifier;
}
