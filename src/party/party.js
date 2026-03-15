export class PartyManager {
  constructor() {
    this.members = []; // Max 4 characters
  }
  
  addMember(character) {
    if (this.members.length < 4) {
      this.members.push(character);
      return true;
    }
    return false;
  }
  
  removeMember(index) {
    if (index >= 0 && index < this.members.length) {
      this.members.splice(index, 1);
    }
  }
  
  getMembers() {
    return this.members;
  }
  
  getFrontLine() {
    return this.members.slice(0, 2); // First 2 = front
  }
  
  getBackLine() {
    return this.members.slice(2, 4); // Last 2 = back
  }
  
  swapMembers(index1, index2) {
    if (index1 >= 0 && index1 < this.members.length &&
        index2 >= 0 && index2 < this.members.length) {
      [this.members[index1], this.members[index2]] = 
      [this.members[index2], this.members[index1]];
    }
  }
}
