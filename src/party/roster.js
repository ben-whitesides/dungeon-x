import { Character } from '../character/character.js';

export class CharacterRoster {
  constructor() {
    this.characters = [];
  }
  
  add(character) {
    this.characters.push(character);
  }
  
  getAll() {
    return this.characters;
  }
  
  save() {
    // Mock localStorage for testing
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('dungeon-x-roster', JSON.stringify(
        this.characters.map(char => ({
          name: char.name,
          class: char.class,
          level: char.level,
          xp: char.xp,
          stats: char.stats,
          equipment: char.equipment,
          portrait: char.portrait
        }))
      ));
    }
  }
  
  load() {
    // Mock localStorage for testing
    if (typeof localStorage !== 'undefined') {
      const data = localStorage.getItem('dungeon-x-roster');
      if (data) {
        const chars = JSON.parse(data);
        this.characters = chars.map(charData => {
          const char = new Character(charData.name, charData.class, charData.level);
          Object.assign(char, charData);
          return char;
        });
      }
    }
  }
}
