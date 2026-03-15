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
