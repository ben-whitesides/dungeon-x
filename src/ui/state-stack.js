export class StateStack {
  constructor() {
    this.stack = [];
  }
  
  push(state) {
    this.stack.push(state);
  }
  
  pop() {
    return this.stack.pop();
  }
  
  peek() {
    return this.stack[this.stack.length - 1];
  }
  
  isEmpty() {
    return this.stack.length === 0;
  }
  
  // State management methods will be added when states are imported
  // in the main game loop
}

  pushCombat(enemies) {
    // For now, just log that combat should start
    // In a full implementation, this would push a CombatState
    console.log('Combat triggered with enemies:', enemies);
  }

  updateAndRender(ctx, world, assets) {
    // Check if there are active states to render
    // This would be called from the main loop when states are active
    return false;
  }
}
