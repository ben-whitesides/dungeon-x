export class EnergyScheduler {
  constructor() {
    this.actors = new Map(); // id -> { actor, callback, threshold }
  }
  
  addActor(actor, onAct = null, threshold = 10) {
    const existing = this.actors.get(actor.id);
    if (existing) {
      // Update callback and threshold but preserve energy
      existing.onAct = onAct;
      existing.threshold = threshold;
    } else {
      // New actor
      this.actors.set(actor.id, { actor, onAct, threshold });
    }
  }
  
  removeActor(actorId) {
    this.actors.delete(actorId);
  }
  
  tick() {
    for (const [id, { actor, onAct, threshold }] of this.actors) {
      actor.energy = (actor.energy || 0) + actor.speed;
      
      if (actor.energy >= threshold) {
        if (onAct) onAct(actor);
        actor.energy -= threshold; // Reset energy after acting
      }
    }
  }
  
  getNextActor() {
    let nextActor = null;
    let highestEnergy = -1;
    
    for (const { actor } of this.actors.values()) {
      if (actor.energy > highestEnergy) {
        highestEnergy = actor.energy;
        nextActor = actor;
      }
    }
    
    return nextActor;
  }
}
