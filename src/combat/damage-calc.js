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
  const hit = total >= (target.ac || 10);
  
  return {
    roll,
    modifier,
    total,
    hit,
    critical: roll === 20 ? 'crit' : roll === 1 ? 'fumble' : null
  };
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
