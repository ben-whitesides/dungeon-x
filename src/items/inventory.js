export class Inventory {
  constructor(size = 24) { // 4x6 grid = 24 slots
    this.slots = new Array(size).fill(null);
    this.size = size;
  }
  
  addItem(item) {
    // Try to stack consumables with existing matching items (potions, scrolls)
    const stackable = item.isConsumable ? item.isConsumable() : (item.type === 'potion' || item.type === 'scroll');
    if (stackable) {
      for (let i = 0; i < this.slots.length; i++) {
        const existing = this.slots[i];
        if (existing && existing.id === item.id && existing.quantity < 99) {
          const space = 99 - existing.quantity;
          const addAmount = Math.min(space, item.quantity || 1);
          existing.quantity += addAmount;
          if (item.quantity) item.quantity -= addAmount;
          if (!item.quantity || item.quantity <= 0) return true;
        }
      }
    }
    
    // Find empty slot
    for (let i = 0; i < this.slots.length; i++) {
      if (this.slots[i] === null) {
        this.slots[i] = item;
        return true;
      }
    }
    
    return false; // No space
  }
  
  removeItem(slotIndex) {
    if (slotIndex >= 0 && slotIndex < this.slots.length) {
      const item = this.slots[slotIndex];
      this.slots[slotIndex] = null;
      return item;
    }
    return null;
  }
  
  getItem(slotIndex) {
    if (slotIndex >= 0 && slotIndex < this.slots.length) {
      return this.slots[slotIndex];
    }
    return null;
  }
  
  moveItem(fromSlot, toSlot) {
    if (fromSlot < 0 || fromSlot >= this.size || toSlot < 0 || toSlot >= this.size) {
      return false;
    }
    
    const fromItem = this.slots[fromSlot];
    const toItem = this.slots[toSlot];
    
    this.slots[fromSlot] = toItem;
    this.slots[toSlot] = fromItem;
    
    return true;
  }
  
  getAllItems() {
    return this.slots.filter(item => item !== null);
  }
  
  hasSpace() {
    return this.slots.some(slot => slot === null);
  }
  
  getItemCount(itemId) {
    let count = 0;
    for (const slot of this.slots) {
      if (slot && slot.id === itemId) count += slot.quantity || 1;
    }
    return count;
  }
}
