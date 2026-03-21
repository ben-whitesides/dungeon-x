export class SoundManager {
  constructor() {
    this.audioContext = null;
    this.masterGain = null;
    this.isInitialized = false;
    this.volume = 0.3; // Default volume
    this.muted = false;
    this._ambientNodes = []; // Track ambient audio nodes for cleanup
    this._tavernAmbientActive = false;
    this._exteriorWindActive = false;

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

    // Mute toggle (KeyM) — global listener
    document.addEventListener('keydown', (e) => {
      if (e.code === 'KeyM') {
        this.muted = !this.muted;
        this.setMuted(this.muted);
      }
    });
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
    this.muted = muted;
    if (this.masterGain) {
      this.masterGain.gain.value = muted ? 0 : this.volume;
    }
  }

  // Toggle mute state
  toggleMute() {
    this.muted = !this.muted;
    this.setMuted(this.muted);
    return this.muted;
  }

  // Stop all ambient sounds
  stopAllAmbient() {
    for (const node of this._ambientNodes) {
      try {
        if (node.stop) node.stop();
        if (node.disconnect) node.disconnect();
      } catch (_) { /* already stopped */ }
    }
    this._ambientNodes = [];
    this._tavernAmbientActive = false;
    this._exteriorWindActive = false;
  }

  /**
   * Tavern ambient — procedural crackling fire using filtered noise + oscillators.
   * No audio files needed. Web Audio API only.
   */
  startTavernAmbient() {
    if (!this.isInitialized || this._tavernAmbientActive) return;

    this.ensureAudioContext().then(() => {
      this._tavernAmbientActive = true;

      // === Crackling fire: filtered noise ===
      const bufferSize = this.audioContext.sampleRate * 2;
      const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        noiseData[i] = Math.random() * 2 - 1;
      }

      const noiseSource = this.audioContext.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      // Bandpass filter — fire crackle range
      const filter = this.audioContext.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 800;
      filter.Q.value = 0.5;

      // Modulate amplitude for crackling effect
      const crackleGain = this.audioContext.createGain();
      crackleGain.gain.value = 0.04;

      // Low drone — warm fire base
      const drone = this.audioContext.createOscillator();
      drone.type = 'sine';
      drone.frequency.value = 60;
      const droneGain = this.audioContext.createGain();
      droneGain.gain.value = 0.02;

      // Second harmonic for warmth
      const warmth = this.audioContext.createOscillator();
      warmth.type = 'sine';
      warmth.frequency.value = 120;
      const warmthGain = this.audioContext.createGain();
      warmthGain.gain.value = 0.008;

      // Connect
      noiseSource.connect(filter);
      filter.connect(crackleGain);
      crackleGain.connect(this.masterGain);

      drone.connect(droneGain);
      droneGain.connect(this.masterGain);

      warmth.connect(warmthGain);
      warmthGain.connect(this.masterGain);

      // Start
      noiseSource.start();
      drone.start();
      warmth.start();

      // Fade in
      crackleGain.gain.setValueAtTime(0, this.audioContext.currentTime);
      crackleGain.gain.linearRampToValueAtTime(0.04, this.audioContext.currentTime + 1.5);
      droneGain.gain.setValueAtTime(0, this.audioContext.currentTime);
      droneGain.gain.linearRampToValueAtTime(0.02, this.audioContext.currentTime + 2);

      this._ambientNodes.push(noiseSource, drone, warmth);
    });
  }

  /**
   * Door creak — short procedural sound for entering tavern.
   */
  playDoorCreak() {
    if (!this.isInitialized) return;

    this.ensureAudioContext().then(() => {
      // Descending sweep with noise = creak
      const osc = this.audioContext.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, this.audioContext.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, this.audioContext.currentTime + 0.4);

      const gain = this.audioContext.createGain();
      gain.gain.setValueAtTime(0.08, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4);

      // Add some resonance
      const filter = this.audioContext.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 200;
      filter.Q.value = 3;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      osc.stop(this.audioContext.currentTime + 0.5);
    });
  }

  /**
   * Exterior wind — subtle procedural wind ambience.
   */
  startExteriorWind() {
    if (!this.isInitialized || this._exteriorWindActive) return;

    this.ensureAudioContext().then(() => {
      this._exteriorWindActive = true;

      // Filtered noise for wind
      const bufferSize = this.audioContext.sampleRate * 3;
      const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        noiseData[i] = Math.random() * 2 - 1;
      }

      const noiseSource = this.audioContext.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      // Low-pass filter — wind is mostly low frequency
      const filter = this.audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;
      filter.Q.value = 0.7;

      // LFO to modulate filter frequency (wind gusts)
      const lfo = this.audioContext.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.15; // Very slow modulation
      const lfoGain = this.audioContext.createGain();
      lfoGain.gain.value = 200;

      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      const windGain = this.audioContext.createGain();
      windGain.gain.value = 0;

      noiseSource.connect(filter);
      filter.connect(windGain);
      windGain.connect(this.masterGain);

      // Fade in
      windGain.gain.linearRampToValueAtTime(0.035, this.audioContext.currentTime + 2);

      noiseSource.start();
      lfo.start();

      this._ambientNodes.push(noiseSource, lfo);
    });
  }
}
