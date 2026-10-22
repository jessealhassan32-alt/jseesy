// Procedural Web Audio API sound generator for Highway Roadster
class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private musicInterval: number | null = null;
  private musicStep: number = 0;
  private isMusicPlaying: boolean = false;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private thrusterNoise: AudioBufferSourceNode | null = null;
  private thrusterGain: GainNode | null = null;

  constructor() {
    // AudioContext will be initialized on first user gesture
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      if (this.engineGain) this.engineGain.gain.value = 0;
      if (this.thrusterGain) this.thrusterGain.gain.value = 0;
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public startEngine() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    if (this.engineOsc) return;

    try {
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(45, this.ctx.currentTime);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(220, this.ctx.currentTime);

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

      this.engineOsc.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);

      this.engineOsc.start();
    } catch {
      // Audio autoplay policy handled
    }
  }

  public updateEngine(speedKmh: number, isBoosting: boolean) {
    if (!this.ctx || !this.engineOsc || !this.engineGain || this.isMuted) return;

    const baseFreq = 40 + (speedKmh / 350) * 85;
    const boostMult = isBoosting ? 1.4 : 1.0;
    this.engineOsc.frequency.setTargetAtTime(baseFreq * boostMult, this.ctx.currentTime, 0.05);
    this.engineGain.gain.setTargetAtTime(isBoosting ? 0.12 : 0.08, this.ctx.currentTime, 0.05);
  }

  public stopEngine() {
    if (this.engineOsc) {
      try {
        this.engineOsc.stop();
        this.engineOsc.disconnect();
      } catch {}
      this.engineOsc = null;
    }
  }

  // Synthwave BGM loop
  public startMusic() {
    this.initContext();
    if (this.isMusicPlaying) return;
    this.isMusicPlaying = true;
    this.musicStep = 0;

    const bassNotes = [55, 55, 65.4, 55, 73.4, 55, 65.4, 49]; // A1, C2, D2, G1
    const bpm = 124;
    const intervalMs = (60 / bpm / 2) * 1000; // 16th notes

    this.musicInterval = window.setInterval(() => {
      if (this.isMuted || !this.ctx || this.ctx.state !== 'running') return;

      const t = this.ctx.currentTime;
      const noteIdx = Math.floor(this.musicStep / 2) % bassNotes.length;
      const noteFreq = bassNotes[noteIdx];

      // Bass synth
      if (this.musicStep % 2 === 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(noteFreq, t);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, t);
        filter.frequency.exponentialRampToValueAtTime(80, t + 0.18);

        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.22);
      }

      // Kick drum on 0, 4, 8, 12
      if (this.musicStep % 4 === 0) {
        const kickOsc = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();

        kickOsc.frequency.setValueAtTime(140, t);
        kickOsc.frequency.exponentialRampToValueAtTime(35, t + 0.08);

        kickGain.gain.setValueAtTime(0.22, t);
        kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        kickOsc.connect(kickGain);
        kickGain.connect(this.ctx.destination);

        kickOsc.start(t);
        kickOsc.stop(t + 0.15);
      }

      // Snare on 4, 12
      if (this.musicStep % 8 === 4) {
        const snareNoise = this.ctx.createBufferSource();
        const bufferSize = this.ctx.sampleRate * 0.1;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        snareNoise.buffer = buffer;

        const snareFilter = this.ctx.createBiquadFilter();
        snareFilter.type = 'highpass';
        snareFilter.frequency.setValueAtTime(1000, t);

        const snareGain = this.ctx.createGain();
        snareGain.gain.setValueAtTime(0.15, t);
        snareGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

        snareNoise.connect(snareFilter);
        snareFilter.connect(snareGain);
        snareGain.connect(this.ctx.destination);

        snareNoise.start(t);
        snareNoise.stop(t + 0.12);
      }

      // Hi-hat
      if (this.musicStep % 2 === 1) {
        const hatBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.04, this.ctx.sampleRate);
        const data = hatBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const hatNoise = this.ctx.createBufferSource();
        hatNoise.buffer = hatBuffer;

        const hatFilter = this.ctx.createBiquadFilter();
        hatFilter.type = 'highpass';
        hatFilter.frequency.setValueAtTime(6000, t);

        const hatGain = this.ctx.createGain();
        hatGain.gain.setValueAtTime(0.04, t);
        hatGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

        hatNoise.connect(hatFilter);
        hatFilter.connect(hatGain);
        hatGain.connect(this.ctx.destination);

        hatNoise.start(t);
      }

      this.musicStep = (this.musicStep + 1) % 16;
    }, intervalMs);
  }

  public stopMusic() {
    if (this.musicInterval !== null) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    this.isMusicPlaying = false;
  }

  // SFX: Jump Whoosh
  public playJump() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(580, t + 0.25);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.26);
  }

  // SFX: Stunt Completed Chime
  public playStuntChime(streak: number = 1) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const baseFreq = notes[Math.min(streak - 1, notes.length - 1)] || 784;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'triangle';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(baseFreq, t);
    osc2.frequency.setValueAtTime(baseFreq * 1.5, t);

    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.42);
    osc2.stop(t + 0.42);
  }

  // SFX: Perfect Landing
  public playLanding(isPerfect: boolean) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isPerfect ? 180 : 110, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.15);

    gain.gain.setValueAtTime(isPerfect ? 0.35 : 0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.2);
  }

  // SFX: Rocket Boost Ignited
  public playBoostIgnite() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.3);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.36);
  }

  // SFX: Smash car in invincible rocket mode
  public playSmash() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Low punch
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + 0.25);

    // Noise burst
    const bufferSize = this.ctx.sampleRate * 0.25;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.06));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    noise.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    noise.start(t);
    osc.stop(t + 0.28);
  }

  // SFX: Crash Game Over
  public playCrash() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.8;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.2));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.exponentialRampToValueAtTime(100, t + 0.6);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
  }

  // SFX: Close Call
  public playCloseCall() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.linearRampToValueAtTime(700, t + 0.08);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.16);
  }

  // SFX: Nitro Orb Collected
  public playNitroPickup() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.12);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.16);
  }

  // SFX: Thunder Rumble for Neon Rain Storm
  public playThunder() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 1.5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.4));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(180, t);
    filter.frequency.exponentialRampToValueAtTime(45, t + 1.2);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.4);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
  }

  // SFX: Acrobatic Double-Tap Stunt
  public playDoubleTapFlip() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(950, t + 0.22);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.26);
  }
}

export const soundManager = new SoundManager();
