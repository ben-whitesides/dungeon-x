export class SoundManager {
  constructor() {
    this.audioContext = null;
    this.masterGain = null;
    this.isInitialized = false;
    this.volume = 0.3; // Default volume
    
    // Defer AudioContext creation to first user gesture (browser requirement)
    this._initOnGesture = () => {
      if (!this.isInitialized) this.init();
      document.removeEventListener('keydown', this._initOnGesture);
      document.removeEventListener('click', this._initOnGesture);
      document.removeEventListener('touchstart', this._initOnGesture);
    };
    document.addEventListener('keydown', this._initOnGesture);
    document.addEventListener('click', this._initOnGesture);
    document.addEventListener('touchstart', this._initOnGesture);
  }
  
  async init() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create master gain node
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.audioContext.destination);
      
      this.isInitialized = true;
      console.log('Sound system initialized');
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
    }
  }
  
  // Ensure audio context is running (required after user gesture)
  async ensureAudioContext() {
    if (!this.audioContext) return false;
    
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    return this.audioContext.state === 'running';
  }
  
  // Create and play a tone
  playTone(frequency, duration = 0.1, type = 'sine', volume = 1.0) {
    if (!this.isInitialized) return;
    
    this.ensureAudioContext().then(() => {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.masterGain);
      
      oscillator.frequency.value = frequency;
      oscillator.type = type;
      
      gainNode.gain.setValueAtTime(volume * this.volume, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
      
      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + duration);
    });
  }
  
  // UI interaction sounds
  playUISound(type = 'click') {
    switch (type) {
      case 'click':
        this.playTone(800, 0.05, 'sine', 0.3);
        break;
      case 'select':
        this.playTone(600, 0.08, 'triangle', 0.4);
        break;
      case 'back':
        this.playTone(400, 0.06, 'sawtooth', 0.3);
        break;
      case 'error':
        this.playTone(200, 0.15, 'square', 0.5);
        break;
    }
  }
  
  // Movement sounds
  playFootstep() {
    // Random footstep sound
    const frequencies = [150, 180, 200, 220];
    const freq = frequencies[Math.floor(Math.random() * frequencies.length)];
    this.playTone(freq, 0.03, 'square', 0.1); // 'noise' is not a valid OscillatorNode type
  }
  
  // Combat sounds
  playCombatSound(type = 'hit') {
    switch (type) {
      case 'hit':
        // Quick attack sound
        this.playTone(300, 0.08, 'sawtooth', 0.6);
        setTimeout(() => this.playTone(200, 0.05, 'square', 0.4), 50);
        break;
      case 'miss':
        // Swish sound
        this.playTone(150, 0.1, 'triangle', 0.3);
        break;
      case 'damage':
        // Impact sound
        this.playTone(100, 0.12, 'sawtooth', 0.7);
        setTimeout(() => this.playTone(80, 0.08, 'square', 0.5), 30);
        break;
      case 'death':
        // Descending tone
        this.playTone(400, 0.2, 'sawtooth', 0.5);
        setTimeout(() => this.playTone(300, 0.15, 'sawtooth', 0.4), 100);
        setTimeout(() => this.playTone(200, 0.1, 'sawtooth', 0.3), 200);
        break;
    }
  }
  
  // Item interaction sounds
  playItemSound(type = 'pickup') {
    switch (type) {
      case 'pickup':
        this.playTone(600, 0.06, 'sine', 0.4);
        break;
      case 'drop':
        this.playTone(300, 0.04, 'triangle', 0.3);
        break;
      case 'equip':
        this.playTone(800, 0.08, 'triangle', 0.5);
        break;
      case 'use':
        this.playTone(1000, 0.05, 'sine', 0.6);
        break;
    }
  }
  
  // Dungeon atmosphere sounds
  playDungeonAmbience() {
    // Subtle background drone
    if (!this.isInitialized) return;
    
    this.ensureAudioContext().then(() => {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.masterGain);
      
      oscillator.frequency.value = 80; // Low frequency drone
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(this.volume * 0.05, this.audioContext.currentTime + 2);
      
      oscillator.start();
      
      // Stop after 10 seconds
      oscillator.stop(this.audioContext.currentTime + 10);
    });
  }
  
  // Set master volume
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.value = this.volume;
    }
  }
  
  // Get current volume
  getVolume() {
    return this.volume;
  }
  
  // Mute/unmute
  setMuted(muted) {
    if (this.masterGain) {
      this.masterGain.gain.value = muted ? 0 : this.volume;
    }
  }
}
