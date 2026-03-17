export class SaveManager {
  constructor() {
    this.snapshot = null;
  }
  
  createSnapshot(party) {
    this.snapshot = party.map(member => ({
      name: member.name,
      level: member.level,
      xp: member.xp,
      maxHP: member.maxHP,
      currentHP: member.currentHP,
      equipment: { ...member.equipment },
      stats: { ...member.stats }
    }));
  }
  
  restoreSnapshot(party) {
    if (!this.snapshot) return;
    
    // Restore equipment and HP, keep level/XP
    party.forEach((member, i) => {
      if (this.snapshot[i]) {
        const snap = this.snapshot[i];
        member.equipment = { ...snap.equipment };
        member.currentHP = snap.currentHP;
        member.maxHP = snap.maxHP;
        member.calculateFinalStats();
      }
    });
  }
  
  clearSnapshot() {
    this.snapshot = null;
  }
  
  hasSnapshot() {
    return this.snapshot !== null;
  }
}
