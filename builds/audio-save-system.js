// ============================================================
// DUNGEON X — Audio/Fear Engine + localStorage Save System
// Self-contained IIFE — exposes window.DX_AUDIO and window.DX_SAVE
// Version 0.3.0
// ============================================================

(function() {
  'use strict';

  // ============================================================
  // PART 1: AUDIO / FEAR ENGINE (Web Audio API — fully procedural)
  // ============================================================

  var NOTES = {
    A3: 220.00, Bb3: 233.08, C4: 261.63, Db4: 277.18,
    D4: 293.66, E4: 329.63, G4: 392.00,
    C5: 523.25, E5: 659.25, G5: 783.99,
    G4_: 392.00
  };

  // Pentatonic minor exploration melody: A3, C4, D4, E4, G4
  var EXPLORATION_NOTES = [
    NOTES.A3, NOTES.C4, NOTES.D4, NOTES.E4, NOTES.G4,
    NOTES.E4, NOTES.D4, NOTES.C4
  ];

  // Chromatic combat melody: A3, Bb3, C4, Db4, E4
  var COMBAT_NOTES = [
    NOTES.A3, NOTES.Bb3, NOTES.C4, NOTES.Db4, NOTES.E4,
    NOTES.Db4, NOTES.C4, NOTES.Bb3
  ];

  // Environmental sound names for no_light state
  var DARK_SOUNDS = ['drip', 'scrape', 'breath', 'chains'];

  // ----------------------------------------------------------
  // Audio Manager
  // ----------------------------------------------------------
  var audio = {
    ctx: null,
    masterGain: null,
    compressor: null,
    enabled: true,
    initialized: false,
    currentLayer: 'ambient',
    volume: 0.5,

    // Active node references for cleanup
    _ambientNodes: null,
    _melodyInterval: null,
    _melodyGain: null,
    _melodyFilter: null,
    _percussionInterval: null,
    _percussionGain: null,
    _dangerInterval: null,
    _dangerGain: null,
    _darkSoundInterval: null,
    _crackleInterval: null,

    // Reactive audio state
    _currentDetune: 0,
    _currentFilterFreq: 2000,
    _currentVolMod: 1.0,
    _addCrackle: false,
    _torchPercent: 100,

    // Danger proximity state
    _dangerDistance: Infinity,
    _dangerRate: 1500,

    // ----------------------------------------------------------
    // init: create AudioContext on first user interaction
    // ----------------------------------------------------------
    init: function() {
      if (this.initialized) return;

      var self = this;

      var doInit = function() {
        if (self.initialized) return;
        try {
          var AC = window.AudioContext || window.webkitAudioContext;
          self.ctx = new AC();

          // Master chain: compressor -> masterGain -> destination
          self.compressor = self.ctx.createDynamicsCompressor();
          self.compressor.threshold.value = -24;
          self.compressor.knee.value = 30;
          self.compressor.ratio.value = 12;
          self.compressor.attack.value = 0.003;
          self.compressor.release.value = 0.25;

          self.masterGain = self.ctx.createGain();
          self.masterGain.gain.value = self.volume;

          self.compressor.connect(self.masterGain);
          self.masterGain.connect(self.ctx.destination);

          self.initialized = true;

          // Start ambient drone
          self._startAmbient();

          // Start default layer
          self.setLayer('ambient');

        } catch(e) {
          console.warn('DX_AUDIO: Web Audio API not supported', e);
        }

        document.removeEventListener('click', doInit);
        document.removeEventListener('touchstart', doInit);
        document.removeEventListener('keydown', doInit);
      };

      document.addEventListener('click', doInit);
      document.addEventListener('touchstart', doInit);
      document.addEventListener('keydown', doInit);
    },

    // ----------------------------------------------------------
    // Ambient drone: brown noise filtered very low, always playing
    // ----------------------------------------------------------
    _startAmbient: function() {
      if (!this.ctx) return;
      if (this._ambientNodes) return;

      var ctx = this.ctx;
      var bufferSize = 2 * ctx.sampleRate;
      var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      var data = buffer.getChannelData(0);

      // Generate brown noise
      var lastOut = 0;
      for (var i = 0; i < bufferSize; i++) {
        var white = Math.random() * 2 - 1;
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5; // scale up
      }

      var source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      // Low pass filter: 50-100Hz range
      var filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 80;
      filter.Q.value = 1;

      var gain = ctx.createGain();
      gain.gain.value = 0.05;

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.compressor);
      source.start(0);

      this._ambientNodes = { source: source, filter: filter, gain: gain };
    },

    _stopAmbient: function() {
      if (this._ambientNodes) {
        try { this._ambientNodes.source.stop(); } catch(e) {}
        this._ambientNodes = null;
      }
    },

    // ----------------------------------------------------------
    // Exploration melody: 8-bar minor pentatonic, 70 BPM
    // ----------------------------------------------------------
    _startExploration: function() {
      this._stopExploration();
      if (!this.ctx) return;

      var ctx = this.ctx;
      var self = this;
      var noteIndex = 0;
      var beatMs = Math.round(60000 / 70); // ~857ms per beat

      // Create a gain and filter for the melody
      var melodyGain = ctx.createGain();
      melodyGain.gain.value = 0.15 * self._currentVolMod;
      self._melodyGain = melodyGain;

      var melodyFilter = ctx.createBiquadFilter();
      melodyFilter.type = 'lowpass';
      melodyFilter.frequency.value = self._currentFilterFreq;
      self._melodyFilter = melodyFilter;

      melodyGain.connect(melodyFilter);
      melodyFilter.connect(self.compressor);

      var playNote = function() {
        if (!self.ctx || self.currentLayer !== 'exploration') return;

        var freq = EXPLORATION_NOTES[noteIndex % EXPLORATION_NOTES.length];
        noteIndex++;

        var osc = ctx.createOscillator();
        // Alternate square and triangle for texture
        osc.type = (noteIndex % 2 === 0) ? 'square' : 'triangle';
        osc.frequency.value = freq;
        osc.detune.value = self._currentDetune;

        var noteGain = ctx.createGain();
        var now = ctx.currentTime;
        noteGain.gain.setValueAtTime(0, now);
        noteGain.gain.linearRampToValueAtTime(0.5, now + 0.02);
        noteGain.gain.linearRampToValueAtTime(0.3, now + 0.15);
        noteGain.gain.linearRampToValueAtTime(0, now + 0.3);

        osc.connect(noteGain);
        noteGain.connect(melodyGain);

        osc.start(now);
        osc.stop(now + 0.35);
      };

      playNote();
      self._melodyInterval = setInterval(function() {
        if (!self.enabled || !self.ctx) return;
        // Update reactive parameters
        if (self._melodyGain) self._melodyGain.gain.value = 0.15 * self._currentVolMod;
        if (self._melodyFilter) self._melodyFilter.frequency.value = self._currentFilterFreq;
        playNote();
      }, beatMs);
    },

    _stopExploration: function() {
      if (this._melodyInterval) {
        clearInterval(this._melodyInterval);
        this._melodyInterval = null;
      }
      if (this._melodyGain) {
        try { this._melodyGain.disconnect(); } catch(e) {}
        this._melodyGain = null;
      }
      if (this._melodyFilter) {
        try { this._melodyFilter.disconnect(); } catch(e) {}
        this._melodyFilter = null;
      }
    },

    // ----------------------------------------------------------
    // Combat layer: 140 BPM, chromatic melody + percussion
    // ----------------------------------------------------------
    _startCombat: function() {
      this._stopCombat();
      if (!this.ctx) return;

      var ctx = this.ctx;
      var self = this;
      var noteIndex = 0;
      var beatMs = Math.round(60000 / 140); // ~428ms per beat

      // Melody gain
      var melodyGain = ctx.createGain();
      melodyGain.gain.value = 0.25;
      self._melodyGain = melodyGain;

      var melodyFilter = ctx.createBiquadFilter();
      melodyFilter.type = 'lowpass';
      melodyFilter.frequency.value = 1500;
      self._melodyFilter = melodyFilter;

      melodyGain.connect(melodyFilter);
      melodyFilter.connect(self.compressor);

      // Percussion gain
      var percGain = ctx.createGain();
      percGain.gain.value = 0.2;
      percGain.connect(self.compressor);
      self._percussionGain = percGain;

      var playNote = function() {
        if (!self.ctx || self.currentLayer !== 'combat') return;

        var freq = COMBAT_NOTES[noteIndex % COMBAT_NOTES.length];
        noteIndex++;

        // Chromatic melody oscillator
        var osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = freq;

        var noteGain = ctx.createGain();
        var now = ctx.currentTime;
        noteGain.gain.setValueAtTime(0, now);
        noteGain.gain.linearRampToValueAtTime(0.6, now + 0.01);
        noteGain.gain.linearRampToValueAtTime(0.3, now + 0.1);
        noteGain.gain.linearRampToValueAtTime(0, now + 0.2);

        osc.connect(noteGain);
        noteGain.connect(melodyGain);

        osc.start(now);
        osc.stop(now + 0.25);
      };

      var beatCount = 0;
      var playPercussion = function() {
        if (!self.ctx || self.currentLayer !== 'combat') return;
        var now = ctx.currentTime;
        beatCount++;

        // Kick on 1 and 3, snare on 2 and 4
        if (beatCount % 2 === 1) {
          // Kick drum: sine at 60Hz with fast decay
          var kick = ctx.createOscillator();
          kick.type = 'sine';
          kick.frequency.setValueAtTime(120, now);
          kick.frequency.exponentialRampToValueAtTime(60, now + 0.05);

          var kickGain = ctx.createGain();
          kickGain.gain.setValueAtTime(0.8, now);
          kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

          kick.connect(kickGain);
          kickGain.connect(percGain);
          kick.start(now);
          kick.stop(now + 0.2);
        } else {
          // Snare: noise burst with bandpass
          var bufLen = Math.floor(ctx.sampleRate * 0.1);
          var noiseBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
          var noiseData = noiseBuf.getChannelData(0);
          for (var i = 0; i < bufLen; i++) noiseData[i] = Math.random() * 2 - 1;

          var noise = ctx.createBufferSource();
          noise.buffer = noiseBuf;

          var bandpass = ctx.createBiquadFilter();
          bandpass.type = 'bandpass';
          bandpass.frequency.value = 3000;
          bandpass.Q.value = 1;

          var snareGain = ctx.createGain();
          snareGain.gain.setValueAtTime(0.6, now);
          snareGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

          noise.connect(bandpass);
          bandpass.connect(snareGain);
          snareGain.connect(percGain);
          noise.start(now);
          noise.stop(now + 0.1);
        }
      };

      playNote();
      playPercussion();

      self._melodyInterval = setInterval(function() {
        if (!self.enabled || !self.ctx) return;
        playNote();
      }, beatMs);

      self._percussionInterval = setInterval(function() {
        if (!self.enabled || !self.ctx) return;
        playPercussion();
      }, beatMs);
    },

    _stopCombat: function() {
      this._stopExploration(); // stops melody interval + gain
      if (this._percussionInterval) {
        clearInterval(this._percussionInterval);
        this._percussionInterval = null;
      }
      if (this._percussionGain) {
        try { this._percussionGain.disconnect(); } catch(e) {}
        this._percussionGain = null;
      }
    },

    // ----------------------------------------------------------
    // Danger proximity: heartbeat pulse
    // ----------------------------------------------------------
    _startDanger: function() {
      this._stopDanger();
      if (!this.ctx) return;

      var ctx = this.ctx;
      var self = this;

      var dangerGain = ctx.createGain();
      dangerGain.gain.value = 0.1;
      dangerGain.connect(self.compressor);
      self._dangerGain = dangerGain;

      var playHeartbeat = function() {
        if (!self.ctx || self.currentLayer !== 'danger') return;
        var now = ctx.currentTime;

        // Two quick sine pulses: 60Hz then 80Hz
        var beat1 = ctx.createOscillator();
        beat1.type = 'sine';
        beat1.frequency.value = 60;
        var g1 = ctx.createGain();
        g1.gain.setValueAtTime(0, now);
        g1.gain.linearRampToValueAtTime(1, now + 0.02);
        g1.gain.linearRampToValueAtTime(0, now + 0.1);
        beat1.connect(g1);
        g1.connect(dangerGain);
        beat1.start(now);
        beat1.stop(now + 0.12);

        var beat2 = ctx.createOscillator();
        beat2.type = 'sine';
        beat2.frequency.value = 80;
        var g2 = ctx.createGain();
        g2.gain.setValueAtTime(0, now + 0.1);
        g2.gain.linearRampToValueAtTime(0.8, now + 0.12);
        g2.gain.linearRampToValueAtTime(0, now + 0.2);
        beat2.connect(g2);
        g2.connect(dangerGain);
        beat2.start(now + 0.1);
        beat2.stop(now + 0.22);
      };

      playHeartbeat();
      self._dangerInterval = setInterval(function() {
        if (!self.enabled || !self.ctx) return;
        // Update volume based on proximity
        if (self._dangerGain) {
          var vol = self._mapRange(self._dangerDistance, 10, 1, 0.1, 0.3);
          self._dangerGain.gain.value = vol;
        }
        playHeartbeat();
        // Adjust interval for next beat based on distance
        var newRate = self._mapRange(self._dangerDistance, 10, 1, 1500, 500);
        if (Math.abs(newRate - self._dangerRate) > 100) {
          self._dangerRate = newRate;
          clearInterval(self._dangerInterval);
          self._dangerInterval = setInterval(arguments.callee, self._dangerRate);
        }
      }, self._dangerRate);
    },

    _stopDanger: function() {
      if (this._dangerInterval) {
        clearInterval(this._dangerInterval);
        this._dangerInterval = null;
      }
      if (this._dangerGain) {
        try { this._dangerGain.disconnect(); } catch(e) {}
        this._dangerGain = null;
      }
    },

    // ----------------------------------------------------------
    // Dark environmental sounds (no light state)
    // ----------------------------------------------------------
    _startDarkSounds: function() {
      this._stopDarkSounds();
      if (!this.ctx) return;

      var self = this;
      var playRandom = function() {
        if (!self.ctx || !self.enabled) return;
        var sound = DARK_SOUNDS[Math.floor(Math.random() * DARK_SOUNDS.length)];
        self.playSFX(sound === 'drip' ? 'water_drip' :
                     sound === 'scrape' ? 'distant_growl' :
                     sound === 'breath' ? 'wind_howl' :
                     'chains_rattle');
      };

      self._darkSoundInterval = setInterval(function() {
        if (!self.enabled || !self.ctx) return;
        playRandom();
      }, 3000 + Math.random() * 5000);
    },

    _stopDarkSounds: function() {
      if (this._darkSoundInterval) {
        clearInterval(this._darkSoundInterval);
        this._darkSoundInterval = null;
      }
    },

    // ----------------------------------------------------------
    // Crackle (dying torch)
    // ----------------------------------------------------------
    _startCrackle: function() {
      this._stopCrackle();
      if (!this.ctx) return;

      var self = this;
      self._crackleInterval = setInterval(function() {
        if (!self.enabled || !self.ctx) return;
        if (Math.random() < 0.4) {
          self.playSFX('torch_crackle');
        }
      }, 800 + Math.random() * 1200);
    },

    _stopCrackle: function() {
      if (this._crackleInterval) {
        clearInterval(this._crackleInterval);
        this._crackleInterval = null;
      }
    },

    // ----------------------------------------------------------
    // Utility: map value from one range to another
    // ----------------------------------------------------------
    _mapRange: function(val, inMin, inMax, outMin, outMax) {
      if (val <= inMax) return outMax;
      if (val >= inMin) return outMin;
      return outMin + (outMax - outMin) * ((inMin - val) / (inMin - inMax));
    },

    // ----------------------------------------------------------
    // setLayer: crossfade between audio layers
    // ----------------------------------------------------------
    setLayer: function(layer) {
      if (!this.initialized || !this.enabled) {
        this.currentLayer = layer;
        return;
      }

      var prevLayer = this.currentLayer;
      this.currentLayer = layer;

      // Stop all active layers
      if (prevLayer !== layer) {
        this._stopExploration();
        this._stopCombat();
        this._stopDanger();
        this._stopDarkSounds();
        this._stopCrackle();
      }

      // Ambient drone adjustments per layer
      if (this._ambientNodes) {
        switch (layer) {
          case 'silence':
            // Only ambient drone, slightly louder
            this._ambientNodes.gain.gain.value = 0.08;
            break;
          case 'danger':
            this._ambientNodes.gain.gain.value = 0.06;
            break;
          default:
            this._ambientNodes.gain.gain.value = 0.05;
            break;
        }
      }

      // Start the requested layer
      switch (layer) {
        case 'ambient':
          // Drone only, nothing extra
          break;
        case 'exploration':
          this._startExploration();
          break;
        case 'combat':
          this._startCombat();
          break;
        case 'danger':
          this._startDanger();
          break;
        case 'silence':
          // Ambient drone only -- fear through absence
          break;
      }
    },

    // ----------------------------------------------------------
    // updateTorchReactivity: adjust melody based on torch level
    // ----------------------------------------------------------
    updateTorchReactivity: function(torchPercent) {
      this._torchPercent = torchPercent;

      if (torchPercent > 70) {
        // Bright torch: clear, in tune
        this._currentDetune = 0;
        this._currentFilterFreq = 2000;
        this._currentVolMod = 1.0;
        this._addCrackle = false;
        this._stopCrackle();
        this._stopDarkSounds();
      } else if (torchPercent > 30) {
        // Dim torch: slightly detuned, muffled
        this._currentDetune = 15;
        this._currentFilterFreq = 800;
        this._currentVolMod = 0.7;
        this._addCrackle = false;
        this._stopCrackle();
        this._stopDarkSounds();
      } else if (torchPercent > 10) {
        // Dying torch: heavily detuned, distorted, crackle
        this._currentDetune = 50;
        this._currentFilterFreq = 400;
        this._currentVolMod = 0.5;
        if (!this._addCrackle) {
          this._addCrackle = true;
          this._startCrackle();
        }
        this._stopDarkSounds();
      } else {
        // No light: no melody, louder drone, environmental sounds
        this._currentDetune = 0;
        this._currentFilterFreq = 400;
        this._currentVolMod = 0;
        this._addCrackle = false;
        this._stopCrackle();

        // Kill melody gain if active
        if (this._melodyGain) {
          this._melodyGain.gain.value = 0;
        }

        // Boost ambient
        if (this._ambientNodes) {
          this._ambientNodes.gain.gain.value = 0.15;
        }

        // Start dark environmental sounds
        if (!this._darkSoundInterval) {
          this._startDarkSounds();
        }
        return; // Skip normal gain update below
      }

      // Restore ambient to normal
      if (this._ambientNodes && this.currentLayer !== 'silence') {
        this._ambientNodes.gain.gain.value = 0.05;
      }
    },

    // ----------------------------------------------------------
    // updateDangerProximity: heartbeat rate/volume based on distance
    // ----------------------------------------------------------
    updateDangerProximity: function(distance) {
      this._dangerDistance = distance;
      // If danger layer is active, the interval callback handles adjustments
      // If not in danger layer but enemies are near, start danger overlay
    },

    // ----------------------------------------------------------
    // playSFX: trigger a one-shot procedural sound effect
    // ----------------------------------------------------------
    playSFX: function(name) {
      if (!this.ctx || !this.enabled || !this.initialized) return;
      var fn = SFX[name];
      if (fn) {
        try { fn(this.ctx, this.compressor); } catch(e) {}
      }
    },

    // ----------------------------------------------------------
    // Volume controls
    // ----------------------------------------------------------
    setVolume: function(vol) {
      this.volume = Math.max(0, Math.min(1, vol));
      if (this.masterGain) {
        this.masterGain.gain.value = this.volume;
      }
    },

    mute: function() {
      this.enabled = false;
      if (this.masterGain) {
        this.masterGain.gain.value = 0;
      }
    },

    unmute: function() {
      this.enabled = true;
      if (this.masterGain) {
        this.masterGain.gain.value = this.volume;
      }
    },

    toggle: function() {
      if (this.enabled) this.mute();
      else this.unmute();
      return this.enabled;
    },

    // ----------------------------------------------------------
    // Cleanup: stop all audio (for scene transitions etc.)
    // ----------------------------------------------------------
    stopAll: function() {
      this._stopExploration();
      this._stopCombat();
      this._stopDanger();
      this._stopDarkSounds();
      this._stopCrackle();
    },

    // ----------------------------------------------------------
    // Resume AudioContext if suspended (browser policy)
    // ----------------------------------------------------------
    resume: function() {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }
  };

  // ----------------------------------------------------------
  // SFX: All procedural sound effects via Web Audio API
  // ----------------------------------------------------------
  var SFX = {

    // --- COMBAT ---

    sword_hit: function(ctx, dest) {
      var now = ctx.currentTime;

      // Short noise burst (50ms)
      var bufLen = Math.floor(ctx.sampleRate * 0.05);
      var buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1;
      var noise = ctx.createBufferSource();
      noise.buffer = buf;
      var ng = ctx.createGain();
      ng.gain.setValueAtTime(0.4, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      noise.connect(ng);
      ng.connect(dest);
      noise.start(now);
      noise.stop(now + 0.06);

      // Sine sweep down 200Hz -> 80Hz over 100ms
      var osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
      var og = ctx.createGain();
      og.gain.setValueAtTime(0.3, now);
      og.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(og);
      og.connect(dest);
      osc.start(now);
      osc.stop(now + 0.15);
    },

    sword_miss: function(ctx, dest) {
      var now = ctx.currentTime;
      // Quick sine sweep up 200Hz -> 400Hz over 80ms (whoosh)
      var osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.25, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(g);
      g.connect(dest);
      osc.start(now);
      osc.stop(now + 0.12);
    },

    critical_hit: function(ctx, dest) {
      var now = ctx.currentTime;

      // Noise burst
      var bufLen = Math.floor(ctx.sampleRate * 0.06);
      var buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1;
      var noise = ctx.createBufferSource();
      noise.buffer = buf;
      var ng = ctx.createGain();
      ng.gain.setValueAtTime(0.5, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      noise.connect(ng);
      ng.connect(dest);
      noise.start(now);
      noise.stop(now + 0.07);

      // Sine sweep down
      var osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(250, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
      var og = ctx.createGain();
      og.gain.setValueAtTime(0.35, now);
      og.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(og);
      og.connect(dest);
      osc.start(now);
      osc.stop(now + 0.15);

      // Extra ring at 800Hz with decay
      var ring = ctx.createOscillator();
      ring.type = 'sine';
      ring.frequency.value = 800;
      var rg = ctx.createGain();
      rg.gain.setValueAtTime(0.3, now + 0.05);
      rg.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      ring.connect(rg);
      rg.connect(dest);
      ring.start(now + 0.05);
      ring.stop(now + 0.3);
    },

    spell_cast: function(ctx, dest) {
      var now = ctx.currentTime;

      // Rising sine sweep 200Hz -> 1200Hz over 300ms
      var osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.3);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.25, now);
      g.gain.linearRampToValueAtTime(0.15, now + 0.3);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(g);
      g.connect(dest);
      osc.start(now);
      osc.stop(now + 0.45);

      // Shimmer: high sine oscillation
      var shimmer = ctx.createOscillator();
      shimmer.type = 'sine';
      shimmer.frequency.value = 2400;
      var lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 20;
      var lfoGain = ctx.createGain();
      lfoGain.gain.value = 600;
      lfo.connect(lfoGain);
      lfoGain.connect(shimmer.frequency);

      var sg = ctx.createGain();
      sg.gain.setValueAtTime(0.1, now + 0.1);
      sg.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      shimmer.connect(sg);
      sg.connect(dest);
      shimmer.start(now + 0.1);
      lfo.start(now + 0.1);
      shimmer.stop(now + 0.55);
      lfo.stop(now + 0.55);
    },

    heal: function(ctx, dest) {
      var now = ctx.currentTime;
      // Ascending major triad: C4, E4, G4 (sine, 100ms each, overlap)
      var freqs = [NOTES.C4, NOTES.E4, NOTES.G4];
      for (var i = 0; i < freqs.length; i++) {
        var osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freqs[i];
        var g = ctx.createGain();
        var t = now + i * 0.08;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.25, t + 0.02);
        g.gain.linearRampToValueAtTime(0.15, t + 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.connect(g);
        g.connect(dest);
        osc.start(t);
        osc.stop(t + 0.25);
      }
    },

    enemy_death: function(ctx, dest) {
      var now = ctx.currentTime;
      // Descending noise sweep 1000Hz -> 50Hz over 500ms
      var bufLen = Math.floor(ctx.sampleRate * 0.5);
      var buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1;
      var noise = ctx.createBufferSource();
      noise.buffer = buf;

      var filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1000, now);
      filter.frequency.exponentialRampToValueAtTime(50, now + 0.5);

      var g = ctx.createGain();
      g.gain.setValueAtTime(0.4, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      noise.connect(filter);
      filter.connect(g);
      g.connect(dest);
      noise.start(now);
      noise.stop(now + 0.55);
    },

    player_hit: function(ctx, dest) {
      var now = ctx.currentTime;
      // Low thud: sine 60Hz, 100ms
      var osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 60;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.4, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(g);
      g.connect(dest);
      osc.start(now);
      osc.stop(now + 0.12);

      // Slight noise
      var bufLen = Math.floor(ctx.sampleRate * 0.05);
      var buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1;
      var noise = ctx.createBufferSource();
      noise.buffer = buf;
      var ng = ctx.createGain();
      ng.gain.setValueAtTime(0.15, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      noise.connect(ng);
      ng.connect(dest);
      noise.start(now);
      noise.stop(now + 0.06);
    },

    // --- DUNGEON INTERACTION ---

    door_open: function(ctx, dest) {
      var now = ctx.currentTime;
      // Grinding: filtered noise sweep, 200ms
      var bufLen = Math.floor(ctx.sampleRate * 0.2);
      var buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1;
      var noise = ctx.createBufferSource();
      noise.buffer = buf;

      var filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300, now);
      filter.frequency.linearRampToValueAtTime(800, now + 0.1);
      filter.frequency.linearRampToValueAtTime(200, now + 0.2);

      var g = ctx.createGain();
      g.gain.setValueAtTime(0.3, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      noise.connect(filter);
      filter.connect(g);
      g.connect(dest);
      noise.start(now);
      noise.stop(now + 0.25);
    },

    door_locked: function(ctx, dest) {
      var now = ctx.currentTime;
      // Clunk: short sine 100Hz, 50ms + metallic noise burst
      var osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 100;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.4, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(g);
      g.connect(dest);
      osc.start(now);
      osc.stop(now + 0.06);

      // Metallic noise
      var bufLen = Math.floor(ctx.sampleRate * 0.03);
      var buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1;
      var noise = ctx.createBufferSource();
      noise.buffer = buf;
      var bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 3000;
      bp.Q.value = 5;
      var ng = ctx.createGain();
      ng.gain.setValueAtTime(0.3, now + 0.03);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      noise.connect(bp);
      bp.connect(ng);
      ng.connect(dest);
      noise.start(now + 0.03);
      noise.stop(now + 0.07);
    },

    key_turn: function(ctx, dest) {
      var now = ctx.currentTime;
      // Click-click-click: three short sine bursts at 800Hz, 30ms each, 50ms apart
      for (var i = 0; i < 3; i++) {
        var t = now + i * 0.05;
        var osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 800 + i * 50;
        var g = ctx.createGain();
        g.gain.setValueAtTime(0.3, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
        osc.connect(g);
        g.connect(dest);
        osc.start(t);
        osc.stop(t + 0.04);
      }
    },

    lever_pull: function(ctx, dest) {
      var now = ctx.currentTime;
      // Grinding gears: filtered noise 400ms
      var bufLen = Math.floor(ctx.sampleRate * 0.4);
      var buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1;
      var noise = ctx.createBufferSource();
      noise.buffer = buf;

      var filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 500;

      var g = ctx.createGain();
      g.gain.setValueAtTime(0.25, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      noise.connect(filter);
      filter.connect(g);
      g.connect(dest);
      noise.start(now);
      noise.stop(now + 0.45);

      // Clank at end
      var clank = ctx.createOscillator();
      clank.type = 'sine';
      clank.frequency.value = 150;
      var cg = ctx.createGain();
      cg.gain.setValueAtTime(0, now + 0.3);
      cg.gain.linearRampToValueAtTime(0.4, now + 0.32);
      cg.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      clank.connect(cg);
      cg.connect(dest);
      clank.start(now + 0.3);
      clank.stop(now + 0.42);
    },

    lever_snap: function(ctx, dest) {
      var now = ctx.currentTime;
      // Spring: quick sine up-down 300Hz -> 600Hz -> 300Hz, 100ms
      var osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.linearRampToValueAtTime(600, now + 0.05);
      osc.frequency.linearRampToValueAtTime(300, now + 0.1);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.3, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(g);
      g.connect(dest);
      osc.start(now);
      osc.stop(now + 0.15);
    },

    chest_open: function(ctx, dest) {
      var now = ctx.currentTime;
      // Creak: slow filtered noise 300ms
      var bufLen = Math.floor(ctx.sampleRate * 0.3);
      var buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1;
      var noise = ctx.createBufferSource();
      noise.buffer = buf;

      var filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(200, now);
      filter.frequency.linearRampToValueAtTime(600, now + 0.3);
      filter.Q.value = 3;

      var g = ctx.createGain();
      g.gain.setValueAtTime(0.2, now);
      g.gain.exponentialRampToValueAtTime(0.05, now + 0.3);

      noise.connect(filter);
      filter.connect(g);
      g.connect(dest);
      noise.start(now);
      noise.stop(now + 0.35);

      // Sparkle: ascending sines
      var sparkleFreqs = [800, 1000, 1200, 1500];
      for (var i = 0; i < sparkleFreqs.length; i++) {
        var t = now + 0.25 + i * 0.06;
        var osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = sparkleFreqs[i];
        var sg = ctx.createGain();
        sg.gain.setValueAtTime(0.15, t);
        sg.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.connect(sg);
        sg.connect(dest);
        osc.start(t);
        osc.stop(t + 0.12);
      }
    },

    footstep: function(ctx, dest) {
      var now = ctx.currentTime;
      // Very quiet noise burst 20ms, randomized pitch
      var bufLen = Math.floor(ctx.sampleRate * 0.02);
      var buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1;
      var noise = ctx.createBufferSource();
      noise.buffer = buf;

      var filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 200 + Math.random() * 200;

      var g = ctx.createGain();
      g.gain.setValueAtTime(0.08, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

      noise.connect(filter);
      filter.connect(g);
      g.connect(dest);
      noise.start(now);
      noise.stop(now + 0.03);
    },

    stairs: function(ctx, dest) {
      var now = ctx.currentTime;
      // 4 descending footstep noise bursts
      for (var i = 0; i < 4; i++) {
        var t = now + i * 0.15;
        var bufLen = Math.floor(ctx.sampleRate * 0.025);
        var buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
        var d = buf.getChannelData(0);
        for (var j = 0; j < bufLen; j++) d[j] = Math.random() * 2 - 1;
        var noise = ctx.createBufferSource();
        noise.buffer = buf;

        var filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 300 - i * 40;

        var g = ctx.createGain();
        g.gain.setValueAtTime(0.12, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

        noise.connect(filter);
        filter.connect(g);
        g.connect(dest);
        noise.start(t);
        noise.stop(t + 0.03);
      }
    },

    // --- UI ---

    item_pickup: function(ctx, dest) {
      var now = ctx.currentTime;
      // Quick ascending two-note: sine C5, E5 (50ms each)
      var freqs = [NOTES.C5, NOTES.E5];
      for (var i = 0; i < freqs.length; i++) {
        var t = now + i * 0.05;
        var osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freqs[i];
        var g = ctx.createGain();
        g.gain.setValueAtTime(0.2, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        osc.connect(g);
        g.connect(dest);
        osc.start(t);
        osc.stop(t + 0.07);
      }
    },

    item_drop: function(ctx, dest) {
      var now = ctx.currentTime;
      // Quick descending: sine E5, C5
      var freqs = [NOTES.E5, NOTES.C5];
      for (var i = 0; i < freqs.length; i++) {
        var t = now + i * 0.05;
        var osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freqs[i];
        var g = ctx.createGain();
        g.gain.setValueAtTime(0.2, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        osc.connect(g);
        g.connect(dest);
        osc.start(t);
        osc.stop(t + 0.07);
      }
    },

    inventory_open: function(ctx, dest) {
      var now = ctx.currentTime;
      // Soft tone: sine G4, 100ms, low volume
      var osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = NOTES.G4;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.1, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(g);
      g.connect(dest);
      osc.start(now);
      osc.stop(now + 0.12);
    },

    potion_drink: function(ctx, dest) {
      var now = ctx.currentTime;
      // "Glug": 3 quick sine bursts at random low frequencies
      for (var i = 0; i < 3; i++) {
        var t = now + i * 0.08;
        var osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 80 + Math.random() * 40;
        var g = ctx.createGain();
        g.gain.setValueAtTime(0.25, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        osc.connect(g);
        g.connect(dest);
        osc.start(t);
        osc.stop(t + 0.06);
      }
    },

    // --- ATMOSPHERE ---

    torch_crackle: function(ctx, dest) {
      var now = ctx.currentTime;
      // Random noise bursts at very quiet volume
      var count = 1 + Math.floor(Math.random() * 3);
      for (var i = 0; i < count; i++) {
        var t = now + Math.random() * 0.15;
        var bufLen = Math.floor(ctx.sampleRate * 0.015);
        var buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
        var d = buf.getChannelData(0);
        for (var j = 0; j < bufLen; j++) d[j] = Math.random() * 2 - 1;
        var noise = ctx.createBufferSource();
        noise.buffer = buf;

        var filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 1000 + Math.random() * 2000;

        var g = ctx.createGain();
        g.gain.setValueAtTime(0.04, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.015);

        noise.connect(filter);
        filter.connect(g);
        g.connect(dest);
        noise.start(t);
        noise.stop(t + 0.02);
      }
    },

    water_drip: function(ctx, dest) {
      var now = ctx.currentTime;
      // Sine ping: random pitch 800-1200Hz, very short 30ms, reverb-like decay
      var freq = 800 + Math.random() * 400;
      var osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      var g = ctx.createGain();
      g.gain.setValueAtTime(0.12, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      // Simple delay for reverb effect
      var delay = ctx.createDelay(0.3);
      delay.delayTime.value = 0.08;
      var delayGain = ctx.createGain();
      delayGain.gain.value = 0.3;

      osc.connect(g);
      g.connect(dest);
      g.connect(delay);
      delay.connect(delayGain);
      delayGain.connect(dest);

      osc.start(now);
      osc.stop(now + 0.03);
    },

    chains_rattle: function(ctx, dest) {
      var now = ctx.currentTime;
      // Metallic noise burst, bandpass filtered around 2000Hz
      var bufLen = Math.floor(ctx.sampleRate * 0.15);
      var buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1;
      var noise = ctx.createBufferSource();
      noise.buffer = buf;

      var bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 2000;
      bp.Q.value = 2;

      var g = ctx.createGain();
      g.gain.setValueAtTime(0.15, now);
      g.gain.linearRampToValueAtTime(0.08, now + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      noise.connect(bp);
      bp.connect(g);
      g.connect(dest);
      noise.start(now);
      noise.stop(now + 0.18);
    },

    distant_growl: function(ctx, dest) {
      var now = ctx.currentTime;
      // Low sine sweep 40Hz -> 60Hz, 500ms with slight vibrato
      var osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(40, now);
      osc.frequency.linearRampToValueAtTime(60, now + 0.5);

      // Vibrato via LFO
      var lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 5;
      var lfoGain = ctx.createGain();
      lfoGain.gain.value = 3;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      var g = ctx.createGain();
      g.gain.setValueAtTime(0.15, now);
      g.gain.linearRampToValueAtTime(0.1, now + 0.3);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(g);
      g.connect(dest);
      osc.start(now);
      lfo.start(now);
      osc.stop(now + 0.55);
      lfo.stop(now + 0.55);
    },

    wind_howl: function(ctx, dest) {
      var now = ctx.currentTime;
      // Filtered noise with slow LFO on filter frequency 200Hz-600Hz
      var bufLen = Math.floor(ctx.sampleRate * 1.5);
      var buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1;
      var noise = ctx.createBufferSource();
      noise.buffer = buf;

      var filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 400;
      filter.Q.value = 5;

      // LFO to sweep filter
      var lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.5;
      var lfoGain = ctx.createGain();
      lfoGain.gain.value = 200;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      var g = ctx.createGain();
      g.gain.setValueAtTime(0.08, now);
      g.gain.linearRampToValueAtTime(0.05, now + 1.0);
      g.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

      noise.connect(filter);
      filter.connect(g);
      g.connect(dest);
      noise.start(now);
      lfo.start(now);
      noise.stop(now + 1.55);
      lfo.stop(now + 1.55);
    },

    heartbeat: function(ctx, dest) {
      var now = ctx.currentTime;
      // Two quick sine pulses: 60Hz then 80Hz, 100ms apart
      var beat1 = ctx.createOscillator();
      beat1.type = 'sine';
      beat1.frequency.value = 60;
      var g1 = ctx.createGain();
      g1.gain.setValueAtTime(0, now);
      g1.gain.linearRampToValueAtTime(0.3, now + 0.02);
      g1.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      beat1.connect(g1);
      g1.connect(dest);
      beat1.start(now);
      beat1.stop(now + 0.12);

      var beat2 = ctx.createOscillator();
      beat2.type = 'sine';
      beat2.frequency.value = 80;
      var g2 = ctx.createGain();
      g2.gain.setValueAtTime(0, now + 0.1);
      g2.gain.linearRampToValueAtTime(0.25, now + 0.12);
      g2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      beat2.connect(g2);
      g2.connect(dest);
      beat2.start(now + 0.1);
      beat2.stop(now + 0.22);
    }
  };

  // Expose audio manager
  window.DX_AUDIO = audio;


  // ============================================================
  // PART 2: LOCALSTORAGE SAVE SYSTEM
  // ============================================================

  var REPUTATION_THRESHOLDS = [
    { min: 0,   title: 'Unknown Stranger' },
    { min: 50,  title: 'Curious Wanderer' },
    { min: 150, title: 'Dungeon Delver' },
    { min: 300, title: 'Seasoned Adventurer' },
    { min: 500, title: 'Feared Warrior' },
    { min: 800, title: 'Legendary Champion' }
  ];

  var DEFAULT_META = {
    totalRuns: 0,
    totalDeaths: 0,
    totalKills: 0,
    totalGoldEarned: 0,
    deepestFloor: 0,
    fragmentsFound: [],
    fragmentCount: 0,
    knownEnemies: [],
    knownCombos: [],
    reputationTitle: 'Unknown Stranger',
    reputationScore: 0,
    deadCharacters: [],
    npcRelationships: {},
    dialogueHistory: [],
    trophyWall: {
      fragments: [],
      enemySkulls: [],
      runsCompleted: 0
    },
    lastPlayedDate: null,
    dailySeedUsed: null
  };

  var save = {
    SAVE_KEY: 'dungeon_x_save',
    META_KEY: 'dungeon_x_meta',
    VERSION: '0.3.0',
    autoSaveInterval: null,

    // ----------------------------------------------------------
    // saveGame: serialize PLAYER + GAME into localStorage
    // ----------------------------------------------------------
    saveGame: function() {
      try {
        // Reference the global PLAYER and GAME objects from the game
        if (typeof PLAYER === 'undefined' || typeof GAME === 'undefined') return false;

        var data = {
          player: {
            name: PLAYER.name,
            class: PLAYER.class,
            level: PLAYER.level,
            xp: PLAYER.xp,
            xpNext: PLAYER.xpNext,
            str: PLAYER.str,
            dex: PLAYER.dex,
            con: PLAYER.con,
            int: PLAYER.int,
            wis: PLAYER.wis,
            cha: PLAYER.cha,
            maxHp: PLAYER.maxHp,
            hp: PLAYER.hp,
            maxMana: PLAYER.maxMana,
            mana: PLAYER.mana,
            ac: PLAYER.ac,
            attackMod: PLAYER.attackMod,
            damageDice: PLAYER.damageDice,
            damageBonus: PLAYER.damageBonus,
            proficiency: PLAYER.proficiency,
            potions: PLAYER.potions,
            keys: PLAYER.keys,
            torch: PLAYER.torch,
            maxTorch: PLAYER.maxTorch,
            gold: PLAYER.gold,
            weapon: PLAYER.weapon,
            armor: PLAYER.armor || 'None',
            inventory: JSON.parse(JSON.stringify(PLAYER.inventory)),
            equipped: JSON.parse(JSON.stringify(PLAYER.equipped)),
            x: PLAYER.x,
            y: PLAYER.y,
            dir: PLAYER.dir,
            fragmentOfDawn: PLAYER.fragmentOfDawn,
            food: PLAYER.food || 0,
            water: PLAYER.water || 0,
            maxFood: PLAYER.maxFood || 0,
            maxWater: PLAYER.maxWater || 0,
            knownCombos: PLAYER.knownCombos || [],
            weaponCoating: PLAYER.weaponCoating || null
          },
          game: {
            dungeonId: GAME.dungeonId,
            floor: GAME.floor,
            floorHistory: JSON.parse(JSON.stringify(GAME.floorHistory)),
            visitedFloors: JSON.parse(JSON.stringify(GAME.visitedFloors)),
            firstEnemySeen: GAME.firstEnemySeen,
            vaultWardenDefeated: GAME.vaultWardenDefeated,
            dailySeed: GAME.dailySeed
          },
          savedAt: new Date().toISOString(),
          version: this.VERSION
        };

        localStorage.setItem(this.SAVE_KEY, JSON.stringify(data));

        // Update meta: track deepest floor and gold earned
        var meta = this.loadMeta();
        if (GAME.floor > meta.deepestFloor) {
          meta.deepestFloor = GAME.floor;
        }
        meta.lastPlayedDate = new Date().toISOString();
        this.saveMeta(meta);

        // Show brief "Saved" flash if Phaser scene is available
        this._showSaveFlash();

        return true;
      } catch(e) {
        console.warn('DX_SAVE: saveGame failed', e);
        return false;
      }
    },

    // ----------------------------------------------------------
    // loadGame: deserialize from localStorage
    // ----------------------------------------------------------
    loadGame: function() {
      try {
        var raw = localStorage.getItem(this.SAVE_KEY);
        if (!raw) return null;

        var data = JSON.parse(raw);

        // Version migration
        if (data.version !== this.VERSION) {
          data = this._migrate(data);
        }

        return data;
      } catch(e) {
        console.warn('DX_SAVE: loadGame failed', e);
        return null;
      }
    },

    // ----------------------------------------------------------
    // applyLoadedGame: restore PLAYER and GAME state from save data
    // ----------------------------------------------------------
    applyLoadedGame: function(data) {
      if (!data || !data.player || !data.game) return false;

      try {
        // Restore PLAYER
        var p = data.player;
        PLAYER.name = p.name;
        PLAYER.class = p.class;
        PLAYER.level = p.level;
        PLAYER.xp = p.xp;
        PLAYER.xpNext = p.xpNext;
        PLAYER.str = p.str;
        PLAYER.dex = p.dex;
        PLAYER.con = p.con;
        PLAYER.int = p.int;
        PLAYER.wis = p.wis;
        PLAYER.cha = p.cha;
        PLAYER.maxHp = p.maxHp;
        PLAYER.hp = p.hp;
        PLAYER.maxMana = p.maxMana;
        PLAYER.mana = p.mana;
        PLAYER.ac = p.ac;
        PLAYER.attackMod = p.attackMod;
        PLAYER.damageDice = p.damageDice;
        PLAYER.damageBonus = p.damageBonus;
        PLAYER.proficiency = p.proficiency;
        PLAYER.potions = p.potions;
        PLAYER.keys = p.keys;
        PLAYER.torch = p.torch;
        PLAYER.maxTorch = p.maxTorch;
        PLAYER.gold = p.gold;
        PLAYER.weapon = p.weapon;
        PLAYER.armor = p.armor || 'None';
        PLAYER.inventory = p.inventory || [];
        PLAYER.equipped = p.equipped || { weapon: -1, armor: -1, head: -1, shield: -1, ring: -1 };
        PLAYER.x = p.x;
        PLAYER.y = p.y;
        PLAYER.dir = p.dir;
        PLAYER.fragmentOfDawn = p.fragmentOfDawn || false;
        PLAYER.food = p.food || 0;
        PLAYER.water = p.water || 0;
        PLAYER.maxFood = p.maxFood || 0;
        PLAYER.maxWater = p.maxWater || 0;
        PLAYER.knownCombos = p.knownCombos || [];
        PLAYER.weaponCoating = p.weaponCoating || null;

        // Restore GAME
        var g = data.game;
        GAME.dungeonId = g.dungeonId;
        GAME.floor = g.floor;
        GAME.floorHistory = g.floorHistory || {};
        GAME.visitedFloors = g.visitedFloors || {};
        GAME.firstEnemySeen = g.firstEnemySeen || false;
        GAME.vaultWardenDefeated = g.vaultWardenDefeated || false;
        GAME.dailySeed = g.dailySeed || GAME.dailySeed;

        // Reload the current floor map and encounters
        if (typeof loadFloor === 'function') {
          loadFloor(GAME.dungeonId, GAME.floor);
        }

        return true;
      } catch(e) {
        console.warn('DX_SAVE: applyLoadedGame failed', e);
        return false;
      }
    },

    // ----------------------------------------------------------
    // hasSave: check if save exists
    // ----------------------------------------------------------
    hasSave: function() {
      return localStorage.getItem(this.SAVE_KEY) !== null;
    },

    // ----------------------------------------------------------
    // deleteSave: remove game save (new game), keeps meta
    // ----------------------------------------------------------
    deleteSave: function() {
      localStorage.removeItem(this.SAVE_KEY);
    },

    // ----------------------------------------------------------
    // getSaveSummary: get brief info about saved game for display
    // ----------------------------------------------------------
    getSaveSummary: function() {
      var data = this.loadGame();
      if (!data) return null;

      var dungeonName = 'Unknown Dungeon';
      if (typeof DUNGEON_NAMES !== 'undefined' && DUNGEON_NAMES[data.game.dungeonId]) {
        dungeonName = DUNGEON_NAMES[data.game.dungeonId];
      }

      var meta = this.loadMeta();

      return {
        className: data.player.class,
        level: data.player.level,
        floor: data.game.floor,
        dungeonName: dungeonName,
        hp: data.player.hp,
        maxHp: data.player.maxHp,
        gold: data.player.gold,
        reputationTitle: meta.reputationTitle,
        savedAt: data.savedAt
      };
    },

    // ----------------------------------------------------------
    // META-PROGRESSION (persists across ALL runs, even death)
    // ----------------------------------------------------------

    saveMeta: function(meta) {
      try {
        if (!meta) meta = this.loadMeta();
        // Recalculate reputation
        meta.reputationScore = (meta.totalKills * 2) +
                               (meta.fragmentCount * 50) +
                               (meta.deepestFloor * 10) +
                               (meta.totalRuns * 5);

        // Determine title
        var title = REPUTATION_THRESHOLDS[0].title;
        for (var i = REPUTATION_THRESHOLDS.length - 1; i >= 0; i--) {
          if (meta.reputationScore >= REPUTATION_THRESHOLDS[i].min) {
            title = REPUTATION_THRESHOLDS[i].title;
            break;
          }
        }
        meta.reputationTitle = title;

        localStorage.setItem(this.META_KEY, JSON.stringify(meta));
        return true;
      } catch(e) {
        console.warn('DX_SAVE: saveMeta failed', e);
        return false;
      }
    },

    loadMeta: function() {
      try {
        var raw = localStorage.getItem(this.META_KEY);
        if (!raw) return JSON.parse(JSON.stringify(DEFAULT_META));
        var meta = JSON.parse(raw);
        // Fill in any missing fields from defaults
        for (var key in DEFAULT_META) {
          if (meta[key] === undefined) {
            meta[key] = JSON.parse(JSON.stringify(DEFAULT_META[key]));
          }
        }
        if (!meta.trophyWall) {
          meta.trophyWall = JSON.parse(JSON.stringify(DEFAULT_META.trophyWall));
        }
        return meta;
      } catch(e) {
        console.warn('DX_SAVE: loadMeta failed', e);
        return JSON.parse(JSON.stringify(DEFAULT_META));
      }
    },

    // ----------------------------------------------------------
    // Meta event recorders
    // ----------------------------------------------------------

    recordDeath: function(characterName, className, floor, dungeon) {
      var meta = this.loadMeta();
      meta.totalDeaths++;
      meta.deadCharacters.push({
        name: characterName || 'Unknown',
        class: className || 'Unknown',
        floor: floor || 1,
        dungeon: dungeon || 1,
        diedAt: new Date().toISOString()
      });
      // Keep last 50 dead characters for the ghost system
      if (meta.deadCharacters.length > 50) {
        meta.deadCharacters = meta.deadCharacters.slice(-50);
      }
      this.saveMeta(meta);
    },

    recordKill: function(enemyType) {
      var meta = this.loadMeta();
      meta.totalKills++;
      if (meta.knownEnemies.indexOf(enemyType) === -1) {
        meta.knownEnemies.push(enemyType);
        // Trophy wall: enemy skull
        if (meta.trophyWall.enemySkulls.indexOf(enemyType) === -1) {
          meta.trophyWall.enemySkulls.push(enemyType);
        }
      }
      this.saveMeta(meta);
    },

    recordFragment: function(fragmentName) {
      var meta = this.loadMeta();
      if (meta.fragmentsFound.indexOf(fragmentName) === -1) {
        meta.fragmentsFound.push(fragmentName);
        meta.fragmentCount = meta.fragmentsFound.length;
        // Trophy wall
        if (meta.trophyWall.fragments.indexOf(fragmentName) === -1) {
          meta.trophyWall.fragments.push(fragmentName);
        }
      }
      this.saveMeta(meta);
    },

    recordComboDiscovery: function(comboName) {
      var meta = this.loadMeta();
      if (meta.knownCombos.indexOf(comboName) === -1) {
        meta.knownCombos.push(comboName);
      }
      this.saveMeta(meta);
    },

    recordRunStart: function() {
      var meta = this.loadMeta();
      meta.totalRuns++;
      meta.lastPlayedDate = new Date().toISOString();
      this.saveMeta(meta);
    },

    recordRunComplete: function() {
      var meta = this.loadMeta();
      meta.trophyWall.runsCompleted++;
      this.saveMeta(meta);
    },

    recordGoldEarned: function(amount) {
      var meta = this.loadMeta();
      meta.totalGoldEarned += amount;
      this.saveMeta(meta);
    },

    updateReputation: function() {
      var meta = this.loadMeta();
      this.saveMeta(meta); // saveMeta recalculates
      return meta;
    },

    // ----------------------------------------------------------
    // Auto-save
    // ----------------------------------------------------------

    startAutoSave: function(intervalMs) {
      this.stopAutoSave();
      var self = this;
      var ms = intervalMs || 30000;
      self.autoSaveInterval = setInterval(function() {
        self.saveGame();
      }, ms);
    },

    stopAutoSave: function() {
      if (this.autoSaveInterval) {
        clearInterval(this.autoSaveInterval);
        this.autoSaveInterval = null;
      }
    },

    // ----------------------------------------------------------
    // Export / Import (for sharing saves)
    // ----------------------------------------------------------

    exportSave: function() {
      try {
        var payload = {
          save: localStorage.getItem(this.SAVE_KEY),
          meta: localStorage.getItem(this.META_KEY)
        };
        return btoa(JSON.stringify(payload));
      } catch(e) {
        console.warn('DX_SAVE: exportSave failed', e);
        return null;
      }
    },

    importSave: function(encoded) {
      try {
        var data = JSON.parse(atob(encoded));
        if (data.save) localStorage.setItem(this.SAVE_KEY, data.save);
        if (data.meta) localStorage.setItem(this.META_KEY, data.meta);
        return true;
      } catch(e) {
        console.warn('DX_SAVE: importSave failed', e);
        return false;
      }
    },

    // ----------------------------------------------------------
    // Version migration
    // ----------------------------------------------------------
    _migrate: function(data) {
      // Future migration logic goes here.
      // For now, stamp current version and return.
      data.version = this.VERSION;
      return data;
    },

    // ----------------------------------------------------------
    // Show brief "Saved" flash on screen via Phaser
    // ----------------------------------------------------------
    _showSaveFlash: function() {
      try {
        // Try to find the active Phaser scene
        if (typeof game === 'undefined' || !game.scene) return;
        var scenes = game.scene.getScenes(true);
        if (!scenes || scenes.length === 0) return;
        var scene = scenes[0];

        var txt = scene.add.text(400, 20, 'SAVED', {
          fontSize: '14px',
          fontFamily: 'monospace',
          color: '#44ff44',
          backgroundColor: '#000000aa'
        }).setOrigin(0.5).setDepth(9999);

        scene.tweens.add({
          targets: txt,
          alpha: 0,
          delay: 800,
          duration: 500,
          onComplete: function() { txt.destroy(); }
        });
      } catch(e) {
        // Silent fail -- save flash is cosmetic
      }
    }
  };

  // Expose save manager
  window.DX_SAVE = save;


  // ============================================================
  // INTEGRATION GUIDE
  // ============================================================
  //
  // Include this file AFTER the main dungeon-x-phase2.html <script>
  // tag, or inline it before the Phaser game config.
  //
  // AUDIO INTEGRATION POINTS:
  //
  //   1. BootScene.create()
  //      - Call DX_AUDIO.init() to register first-interaction listener
  //
  //   2. DungeonScene.create()
  //      - DX_AUDIO.setLayer('exploration')
  //
  //   3. DungeonScene.update() (on each move)
  //      - DX_AUDIO.updateTorchReactivity((PLAYER.torch / PLAYER.maxTorch) * 100)
  //      - DX_AUDIO.playSFX('footstep')
  //
  //   4. DungeonScene — door interactions
  //      - Door open:   DX_AUDIO.playSFX('door_open')
  //      - Locked door: DX_AUDIO.playSFX('door_locked')
  //      - Key used:    DX_AUDIO.playSFX('key_turn')
  //
  //   5. DungeonScene — stairs
  //      - DX_AUDIO.playSFX('stairs')
  //
  //   6. CombatScene.create()
  //      - DX_AUDIO.setLayer('combat')
  //
  //   7. CombatScene — attacks
  //      - Hit:     DX_AUDIO.playSFX('sword_hit')
  //      - Miss:    DX_AUDIO.playSFX('sword_miss')
  //      - Crit:    DX_AUDIO.playSFX('critical_hit')
  //      - Spell:   DX_AUDIO.playSFX('spell_cast')
  //      - Heal:    DX_AUDIO.playSFX('heal')
  //      - Enemy die: DX_AUDIO.playSFX('enemy_death')
  //      - Player hit: DX_AUDIO.playSFX('player_hit')
  //
  //   8. CombatScene — return to dungeon
  //      - DX_AUDIO.setLayer('exploration')
  //
  //   9. TavernScene.create()
  //      - DX_AUDIO.setLayer('ambient')
  //
  //  10. InventoryScene.create()
  //      - DX_AUDIO.playSFX('inventory_open')
  //
  //  11. Potion use:
  //      - DX_AUDIO.playSFX('potion_drink')
  //
  //  12. Item pickup / loot:
  //      - DX_AUDIO.playSFX('item_pickup')
  //
  // SAVE INTEGRATION POINTS:
  //
  //   1. BootScene.create()
  //      - Check DX_SAVE.hasSave(). If yes, show "Continue" button.
  //      - Show meta stats via DX_SAVE.loadMeta()
  //      - Show save summary via DX_SAVE.getSaveSummary()
  //
  //   2. BootScene — "Continue" click
  //      - var data = DX_SAVE.loadGame();
  //      - DX_SAVE.applyLoadedGame(data);
  //      - scene.start('Tavern') or scene.start('Dungeon')
  //
  //   3. BootScene — "New Game" click
  //      - DX_SAVE.deleteSave() (keeps meta)
  //      - DX_SAVE.recordRunStart()
  //      - scene.start('ClassSelect')
  //
  //   4. ClassSelectScene — after class selection
  //      - DX_SAVE.recordRunStart()
  //
  //   5. TavernScene.create()
  //      - DX_SAVE.saveGame()
  //
  //   6. DungeonScene.create()
  //      - DX_SAVE.startAutoSave(30000)
  //
  //   7. DungeonScene — floor change (stairs)
  //      - DX_SAVE.saveGame()
  //
  //   8. DungeonScene — scene shutdown
  //      - DX_SAVE.stopAutoSave()
  //
  //   9. CombatScene — enemy death
  //      - DX_SAVE.recordKill(this.enemyType)
  //
  //  10. CombatScene — player death
  //      - DX_SAVE.recordDeath(PLAYER.name, PLAYER.class, GAME.floor, GAME.dungeonId)
  //      - DX_SAVE.deleteSave() (meta persists)
  //
  //  11. Fragment pickup
  //      - DX_SAVE.recordFragment('Fragment of Dawn')
  //
  //  12. Spell combo discovery
  //      - DX_SAVE.recordComboDiscovery(comboName)
  //
  //  13. InventoryScene — on close
  //      - DX_SAVE.saveGame()
  //
  // BOOT SCENE LAYOUT WITH SAVE:
  //
  //   DUNGEON X
  //
  //   [Continue]  (if save exists)
  //     "Seasoned Adventurer -- Floor 3, Whispering Crypts"
  //
  //   [New Game]
  //     "Your legend: 5 runs, 2 fragments, 47 kills"
  //
  //   [Settings]
  //     Audio: ON/OFF, Volume slider
  //
  // ============================================================

})();
