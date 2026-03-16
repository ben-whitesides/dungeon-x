export class Leaderboard {
  constructor() {
    this.scores = this.loadScores();
  }
  
  loadScores() {
    try {
      const data = localStorage.getItem('dungeon-x-leaderboard');
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.warn('Failed to load leaderboard:', error);
      return {};
    }
  }
  
  saveScores() {
    try {
      localStorage.setItem('dungeon-x-leaderboard', JSON.stringify(this.scores));
    } catch (error) {
      console.warn('Failed to save leaderboard:', error);
    }
  }
  
  recordCompletion(seed, dungeonType, completionTime, playerName = 'Adventurer') {
    if (!this.scores[seed]) {
      this.scores[seed] = {};
    }
    
    if (!this.scores[seed][dungeonType]) {
      this.scores[seed][dungeonType] = [];
    }
    
    // Add the completion
    this.scores[seed][dungeonType].push({
      playerName,
      completionTime,
      timestamp: Date.now()
    });
    
    // Sort by completion time (fastest first) and keep top 10
    this.scores[seed][dungeonType].sort((a, b) => a.completionTime - b.completionTime);
    this.scores[seed][dungeonType] = this.scores[seed][dungeonType].slice(0, 10);
    
    this.saveScores();
  }
  
  getTopScores(seed, dungeonType, limit = 10) {
    if (!this.scores[seed] || !this.scores[seed][dungeonType]) {
      return [];
    }
    
    return this.scores[seed][dungeonType].slice(0, limit);
  }
  
  getPersonalBest(seed, dungeonType, playerName = 'Adventurer') {
    const scores = this.getTopScores(seed, dungeonType);
    return scores.find(score => score.playerName === playerName);
  }
  
  getDailyLeaderboard(dungeonType) {
    const today = new Date();
    const todaySeed = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return this.getTopScores(todaySeed, dungeonType);
  }
  
  formatTime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${remainingSeconds}s`;
  }
}
