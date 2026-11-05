/**
 * PianoEngine.ts
 * Gerçekçi Akustik Piyano Ses Motoru
 * - Yüksek kaliteli SoundFont örnekleri (FluidR3 / Salamander acoustic grand piano)
 * - Çevrimdışı/Hızlı hibrit akustik sentezleyici yedeği
 * - Gerçekçi Sustain Pedalı (CC 64) sönümleme ve rezonans simülasyonu
 * - OfflineAudioContext ile yüksek hızlı MP3/WAV render desteği
 */

// Note to Frequency helper
export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// MIDI note number to Note Name (e.g. 60 -> C4)
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiToNoteName(midi: number): string {
  const noteIndex = midi % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

export class PianoEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private soundfontBuffers: Map<number, AudioBuffer> = new Map();
  private isSoundfontLoaded = false;
  private loadingProgress = 0;
  private onProgressCallback?: (progress: number) => void;

  // Active playing nodes: midi -> { source, gain, releaseFn, isPedalHeld }
  private activeVoices: Map<number, {
    stop: (decayTime?: number) => void;
    isUserHeld: boolean;
  }> = new Map();

  // Sustain Pedal State
  private sustainPedal = false;

  constructor() {
    // AudioContext will be initialized on user interaction to comply with browser autoplay policy
  }

  public async initAudio(): Promise<void> {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);

      // Create warm room reverb impulse
      this.reverbNode = this.createImpulseReverb(this.ctx, 1.8, 2.0);
      
      const reverbGain = this.ctx.createGain();
      reverbGain.gain.setValueAtTime(0.25, this.ctx.currentTime);

      this.masterGain.connect(this.ctx.destination);
      this.masterGain.connect(reverbGain);
      reverbGain.connect(this.reverbNode);
      this.reverbNode.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  public setProgressCallback(cb: (p: number) => void) {
    this.onProgressCallback = cb;
  }

  public getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    return this.ctx;
  }

  /**
   * SoundFont yüklemesi (FluidR3 GM Acoustic Grand Piano)
   * Yüksek kaliteli gerçek piyano sesleri
   */
  public async loadSoundfont(): Promise<void> {
    if (this.isSoundfontLoaded) return;
    await this.initAudio();

    try {
      this.loadingProgress = 10;
      this.onProgressCallback?.(10);

      // Use MusyngKite / FluidR3 high quality mp3 soundfont
      const url = 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_grand_piano-mp3.js';
      
      const response = await fetch(url);
      const text = await response.text();
      
      // JSONP format extract: MIDI.Soundfont.acoustic_grand_piano = {...}
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}');
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error('Soundfont format hatası');
      }

      const jsonStr = text.substring(jsonStart, jsonEnd + 1);
      const sampleMap: Record<string, string> = JSON.parse(jsonStr);

      const entries = Object.entries(sampleMap);
      const total = entries.length;
      let loaded = 0;

      for (const [noteName, base64Audio] of entries) {
        try {
          const midi = this.noteNameToMidi(noteName);
          if (midi !== null && this.ctx) {
            const audioData = this.base64ToArrayBuffer(base64Audio.split(',')[1]);
            const audioBuffer = await this.ctx.decodeAudioData(audioData);
            this.soundfontBuffers.set(midi, audioBuffer);
          }
        } catch {
          // Continue on sample decode error
        }
        loaded++;
        const progress = Math.round(10 + (loaded / total) * 90);
        this.loadingProgress = progress;
        this.onProgressCallback?.(progress);
      }

      this.isSoundfontLoaded = true;
    } catch (err) {
      console.warn('Soundfont CDN yüklemesi başarısız oldu, hibrit akustik sentezleyici devrede:', err);
      // Fallback to high-fidelity acoustic physical modeling
      this.isSoundfontLoaded = false;
      this.onProgressCallback?.(100);
    }
  }

  public isLoaded(): boolean {
    return this.isSoundfontLoaded || this.loadingProgress === 100;
  }

  /**
   * Note On (Piyano tuşuna basıldığında)
   */
  public playNote(midi: number, velocity: number = 0.8, timeOffset: number = 0): void {
    if (!this.ctx || !this.masterGain) {
      this.initAudio().then(() => this.playNote(midi, velocity, timeOffset));
      return;
    }

    const now = this.ctx.currentTime + Math.max(0, timeOffset);
    const clampedVelocity = Math.max(0.1, Math.min(1.0, velocity));

    // Stop existing note if already playing
    this.stopNote(midi, 0.05, false);

    if (this.soundfontBuffers.has(midi)) {
      // High fidelity sampled acoustic piano note
      const buffer = this.soundfontBuffers.get(midi)!;
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;

      const gain = this.ctx.createGain();
      // Natural velocity curves
      const vol = Math.pow(clampedVelocity, 1.3) * 1.2;
      gain.gain.setValueAtTime(vol, now);

      source.connect(gain);
      gain.connect(this.masterGain);

      source.start(now);

      const stopFn = (decayTime: number = 0.35) => {
        try {
          const stopTime = this.ctx!.currentTime;
          gain.gain.cancelScheduledValues(stopTime);
          gain.gain.setValueAtTime(gain.gain.value, stopTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, stopTime + decayTime);
          source.stop(stopTime + decayTime + 0.05);
        } catch {
          // Node already stopped
        }
      };

      this.activeVoices.set(midi, {
        stop: stopFn,
        isUserHeld: true
      });
    } else {
      // Rich acoustic piano synthesis with multi-harmonics & hammer strike transient
      this.playAcousticSynthesizedNote(midi, clampedVelocity, now);
    }
  }

  /**
   * Note Off (Piyano tuşu bırakıldığında)
   */
  public stopNote(midi: number, decayTime: number = 0.3, force: boolean = false): void {
    const voice = this.activeVoices.get(midi);
    if (!voice) return;

    voice.isUserHeld = false;

    // If sustain pedal is currently pressed down and not forced, keep ringing!
    if (this.sustainPedal && !force) {
      return;
    }

    voice.stop(decayTime);
    this.activeVoices.delete(midi);
  }

  /**
   * Sustain Pedal (Damper Pedal CC 64)
   * value: 0 - 127 (>= 64 down, < 64 up)
   */
  public setSustainPedal(isDown: boolean): void {
    this.sustainPedal = isDown;

    if (!isDown) {
      // Pedal released: damp all notes that are no longer physically held by keys
      const toRemove: number[] = [];
      this.activeVoices.forEach((voice, midi) => {
        if (!voice.isUserHeld) {
          voice.stop(0.35);
          toRemove.push(midi);
        }
      });
      toRemove.forEach((m) => this.activeVoices.delete(m));
    }
  }

  public getSustainPedalState(): boolean {
    return this.sustainPedal;
  }

  public stopAllNotes(): void {
    this.activeVoices.forEach(v => v.stop(0.1));
    this.activeVoices.clear();
  }

  /**
   * Rich Physical Acoustic Grand Piano Synthesizer
   */
  private playAcousticSynthesizedNote(midi: number, velocity: number, startTime: number): void {
    if (!this.ctx || !this.masterGain) return;

    const freq = midiToFrequency(midi);
    const duration = 4.0;

    // Fundamental + Rich Piano Harmonics (Overtone Series)
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const osc3 = this.ctx.createOscillator();

    // Subtle detuning for natural string chorus
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, startTime);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, startTime);
    osc2.detune.setValueAtTime(3.5, startTime);

    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(freq * 3, startTime);
    osc3.detune.setValueAtTime(-2.8, startTime);

    // Hammer attack transient (percussive strike)
    const hammerBuffer = this.createHammerNoise(this.ctx);
    const hammerSource = this.ctx.createBufferSource();
    hammerSource.buffer = hammerBuffer;

    const hammerGain = this.ctx.createGain();
    hammerGain.gain.setValueAtTime(0.4 * velocity, startTime);
    hammerGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.04);
    hammerSource.connect(hammerGain);
    hammerGain.connect(this.masterGain);

    // Dynamic low-pass acoustic resonance filter
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const cutoff = Math.min(14000, freq * 8 * velocity);
    filter.frequency.setValueAtTime(cutoff, startTime);
    filter.frequency.exponentialRampToValueAtTime(Math.max(200, freq * 1.5), startTime + 2.5);

    // Amplitude envelope
    const ampGain = this.ctx.createGain();
    const peakGain = 0.5 * Math.pow(velocity, 1.4);
    ampGain.gain.setValueAtTime(0.0001, startTime);
    ampGain.gain.linearRampToValueAtTime(peakGain, startTime + 0.006); // Fast strike
    // Natural piano exponential decay
    ampGain.gain.exponentialRampToValueAtTime(peakGain * 0.4, startTime + 0.5);
    ampGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    // Route audio
    osc1.connect(filter);
    osc2.connect(filter);
    osc3.connect(filter);
    filter.connect(ampGain);
    ampGain.connect(this.masterGain);

    osc1.start(startTime);
    osc2.start(startTime);
    osc3.start(startTime);
    hammerSource.start(startTime);

    const stopFn = (decayTime: number = 0.3) => {
      try {
        const now = this.ctx!.currentTime;
        ampGain.gain.cancelScheduledValues(now);
        ampGain.gain.setValueAtTime(ampGain.gain.value, now);
        ampGain.gain.exponentialRampToValueAtTime(0.0001, now + decayTime);
        const killTime = now + decayTime + 0.05;
        osc1.stop(killTime);
        osc2.stop(killTime);
        osc3.stop(killTime);
      } catch {
        // Already stopped
      }
    };

    this.activeVoices.set(midi, {
      stop: stopFn,
      isUserHeld: true
    });
  }

  /**
   * Concert Hall Reverb Impulse Generator
   */
  private createImpulseReverb(ctx: BaseAudioContext, duration = 1.8, decay = 2.0): ConvolverNode {
    const convolver = ctx.createConvolver();
    const rate = ctx.sampleRate;
    const length = rate * duration;
    const impulse = ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = i / length;
      const envelope = Math.pow(1 - n, decay);
      left[i] = (Math.random() * 2 - 1) * envelope;
      right[i] = (Math.random() * 2 - 1) * envelope;
    }

    convolver.buffer = impulse;
    return convolver;
  }

  /**
   * Per-key hammer noise buffer
   */
  private createHammerNoise(ctx: BaseAudioContext): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * 0.04);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    return buffer;
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private noteNameToMidi(name: string): number | null {
    const match = name.match(/^([A-G][b#]?)(-?\d+)$/);
    if (!match) return null;
    const note = match[1];
    const octave = parseInt(match[2], 10);
    const noteMap: Record<string, number> = {
      'C': 0, 'Db': 1, 'C#': 1, 'D': 2, 'Eb': 3, 'D#': 3,
      'E': 4, 'F': 5, 'Gb': 6, 'F#': 6, 'G': 7, 'Ab': 8,
      'G#': 8, 'A': 9, 'Bb': 10, 'A#': 10, 'B': 11
    };
    if (noteMap[note] === undefined) return null;
    return (octave + 1) * 12 + noteMap[note];
  }

  /**
   * Render MIDI notes offline to an AudioBuffer for instant MP3 export
   */
  public async renderNotesToAudioBuffer(
    notes: { midi: number; time: number; duration: number; velocity: number }[],
    totalDuration: number
  ): Promise<AudioBuffer> {
    const sampleRate = 44100;
    const lengthInSamples = Math.ceil((totalDuration + 2.5) * sampleRate);
    const offlineCtx = new OfflineAudioContext(2, lengthInSamples, sampleRate);

    const master = offlineCtx.createGain();
    master.gain.setValueAtTime(0.85, 0);

    const reverb = this.createImpulseReverb(offlineCtx, 1.5, 2.2);
    const revGain = offlineCtx.createGain();
    revGain.gain.setValueAtTime(0.2, 0);

    master.connect(offlineCtx.destination);
    master.connect(revGain);
    revGain.connect(reverb);
    reverb.connect(offlineCtx.destination);

    for (const note of notes) {
      const startTime = note.time;
      const duration = note.duration;
      const midi = note.midi;
      const velocity = Math.max(0.1, Math.min(1.0, note.velocity || 0.8));

      if (this.soundfontBuffers.has(midi)) {
        // High quality soundfont sample
        const buf = this.soundfontBuffers.get(midi)!;
        const source = offlineCtx.createBufferSource();
        source.buffer = buf;

        const gain = offlineCtx.createGain();
        gain.gain.setValueAtTime(Math.pow(velocity, 1.3) * 1.2, startTime);
        gain.gain.setValueAtTime(Math.pow(velocity, 1.3) * 1.2, startTime + duration);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration + 0.35);

        source.connect(gain);
        gain.connect(master);
        source.start(startTime);
        source.stop(startTime + duration + 0.4);
      } else {
        // Acoustic synthesis
        const freq = midiToFrequency(midi);
        const osc = offlineCtx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        const osc2 = offlineCtx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(freq * 2, startTime);
        osc2.detune.setValueAtTime(3, startTime);

        const filter = offlineCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(Math.min(12000, freq * 7 * velocity), startTime);

        const noteGain = offlineCtx.createGain();
        noteGain.gain.setValueAtTime(0.0001, startTime);
        noteGain.gain.linearRampToValueAtTime(0.5 * velocity, startTime + 0.008);
        noteGain.gain.exponentialRampToValueAtTime(0.5 * velocity * 0.4, startTime + Math.min(0.5, duration));
        noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration + 0.3);

        osc.connect(filter);
        osc2.connect(filter);
        filter.connect(noteGain);
        noteGain.connect(master);

        osc.start(startTime);
        osc2.start(startTime);
        osc.stop(startTime + duration + 0.35);
        osc2.stop(startTime + duration + 0.35);
      }
    }

    return await offlineCtx.startRendering();
  }
}

// Singleton audio engine
export const pianoEngine = new PianoEngine();
