/**
 * PianoEngine.ts
 * Yamaha C5 Concert Grand Piano (Salamander)
 *
 * Ultra Low-Latency Audio Engine with Acoustic Hammer Action & Real Sustain Physics
 * - Acoustic Hammer Strike: Velocity-dependent keybed thump & felt snap transient
 * - Dynamic Timbre: Strike velocity modulates acoustic brightness (mellow pianissimo to bright fortissimo)
 * - CC 64 Damper & Sustain Pedal: Full resonance hold and felt damper release noise
 * - O(1) Precomputed 88-key sample table with anti-clip compressor
 */

export interface SampleMapEntry {
  note: string;
  midi: number;
  file: string;
}

export const SALAMANDER_SAMPLES: SampleMapEntry[] = [
  { note: 'A0',  midi: 21,  file: 'A0.mp3' },
  { note: 'C1',  midi: 24,  file: 'C1.mp3' },
  { note: 'Ds1', midi: 27,  file: 'Ds1.mp3' },
  { note: 'Fs1', midi: 30,  file: 'Fs1.mp3' },
  { note: 'A1',  midi: 33,  file: 'A1.mp3' },
  { note: 'C2',  midi: 36,  file: 'C2.mp3' },
  { note: 'Ds2', midi: 39,  file: 'Ds2.mp3' },
  { note: 'Fs2', midi: 42,  file: 'Fs2.mp3' },
  { note: 'A2',  midi: 45,  file: 'A2.mp3' },
  { note: 'C3',  midi: 48,  file: 'C3.mp3' },
  { note: 'Ds3', midi: 51,  file: 'Ds3.mp3' },
  { note: 'Fs3', midi: 54,  file: 'Fs3.mp3' },
  { note: 'A3',  midi: 57,  file: 'A3.mp3' },
  { note: 'C4',  midi: 60,  file: 'C4.mp3' },
  { note: 'Ds4', midi: 63,  file: 'Ds4.mp3' },
  { note: 'Fs4', midi: 66,  file: 'Fs4.mp3' },
  { note: 'A4',  midi: 69,  file: 'A4.mp3' },
  { note: 'C5',  midi: 72,  file: 'C5.mp3' },
  { note: 'Ds5', midi: 75,  file: 'Ds5.mp3' },
  { note: 'Fs5', midi: 78,  file: 'Fs5.mp3' },
  { note: 'A5',  midi: 81,  file: 'A5.mp3' },
  { note: 'C6',  midi: 84,  file: 'C6.mp3' },
  { note: 'Ds6', midi: 87,  file: 'Ds6.mp3' },
  { note: 'Fs6', midi: 90,  file: 'Fs6.mp3' },
  { note: 'A6',  midi: 93,  file: 'A6.mp3' },
  { note: 'C7',  midi: 96,  file: 'C7.mp3' },
  { note: 'Ds7', midi: 99,  file: 'Ds7.mp3' },
  { note: 'Fs7', midi: 102, file: 'Fs7.mp3' },
  { note: 'A7',  midi: 105, file: 'A7.mp3' },
  { note: 'C8',  midi: 108, file: 'C8.mp3' },
];

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiToNoteName(midi: number): string {
  const noteIndex = midi % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

interface PrecomputedNoteInfo {
  buffer: AudioBuffer;
  playbackRate: number;
}

const MAX_LIVE_VOICES = 64;
const MAX_SCHEDULED_NODES = 250;
const PRUNE_BATCH = 12;

export class PianoEngine {
  private ctx: AudioContext | null = null;
  private preMasterGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private compressorNode: DynamicsCompressorNode | null = null;
  private hammerGain: GainNode | null = null;

  private sampleBuffers: Map<number, AudioBuffer> = new Map();
  private precomputedLookup: Map<number, PrecomputedNoteInfo> = new Map();

  private isLoadedFlag = false;
  private loadingProgress = 0;
  private onProgressCallback?: (progress: number) => void;

  // Live voices
  private activeVoices: Map<number, {
    source: AudioBufferSourceNode;
    gain: GainNode;
    stop: (decayTime?: number) => void;
    isUserHeld: boolean;
  }> = new Map();

  // Scheduled voices (lookahead engine)
  private scheduledNodes: Set<{ source: AudioBufferSourceNode; gain: GainNode }> = new Set();

  private sustainPedal = false;
  private masterVolume = 0.85;
  private hammerActionEnabled = true;

  constructor() {
    // Lazy init
  }

  public async initAudio(): Promise<void> {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx({ latencyHint: 'interactive', sampleRate: 44100 });

      // 1. Pre-Master bus
      this.preMasterGain = this.ctx.createGain();
      this.preMasterGain.gain.value = 0.72;

      // 2. Hammer Action bus (mechanical thump and felt transient layer)
      this.hammerGain = this.ctx.createGain();
      this.hammerGain.gain.value = 0.55;
      this.hammerGain.connect(this.preMasterGain);

      // 3. Master volume fader
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.masterVolume;

      // 4. Stüdyo Kompresörü / Limiter (Anti-Clipping)
      this.compressorNode = this.ctx.createDynamicsCompressor();
      this.compressorNode.threshold.value = -8;
      this.compressorNode.knee.value = 6;
      this.compressorNode.ratio.value = 12;
      this.compressorNode.attack.value = 0.002;
      this.compressorNode.release.value = 0.15;

      this.preMasterGain.connect(this.masterGain);
      this.masterGain.connect(this.compressorNode);
      this.compressorNode.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  public setHammerAction(enabled: boolean): void {
    this.hammerActionEnabled = enabled;
  }

  public isHammerActionEnabled(): boolean {
    return this.hammerActionEnabled;
  }

  public setProgressCallback(cb: (p: number) => void) {
    this.onProgressCallback = cb;
  }

  public setMasterVolume(val: number): void {
    this.masterVolume = Math.max(0, Math.min(1.0, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.03);
    }
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  public isLoaded(): boolean {
    return this.isLoadedFlag;
  }

  public getCurrentTime(): number {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  /**
   * Generates realistic acoustic piano hammer strike mechanics:
   * 1. Low-frequency wooden keybed impact thump (60-80 Hz pitch drop)
   * 2. High-frequency acoustic felt contact snap (proportional to velocity)
   */
  private triggerHammerStrike(now: number, velocity: number, midi: number): void {
    if (!this.ctx || !this.hammerGain || !this.hammerActionEnabled) return;

    try {
      const vel = Math.max(0.1, Math.min(1.0, velocity));

      // 1. Keybed Body Thump (Oscillator pitch sweep down)
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();

      const baseFreq = Math.max(55, 110 - (midi * 0.4));
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, now + 0.025);

      const thumpGain = Math.pow(vel, 1.4) * 0.14;
      oscGain.gain.setValueAtTime(thumpGain, now);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.028);

      osc.connect(oscGain);
      oscGain.connect(this.hammerGain);

      osc.start(now);
      osc.stop(now + 0.03);

      // 2. Felt Strike Snap (Filtered white noise burst)
      if (vel > 0.25) {
        const bufferSize = Math.floor(this.ctx.sampleRate * 0.015); // 15ms buffer
        const noiseBuf = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = noiseBuf.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
        }

        const noiseSrc = this.ctx.createBufferSource();
        noiseSrc.buffer = noiseBuf;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1400 + (midi * 25), now);
        filter.Q.value = 2.0;

        const noiseGain = this.ctx.createGain();
        const snapLevel = Math.pow(vel, 1.5) * 0.09;
        noiseGain.gain.setValueAtTime(snapLevel, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);

        noiseSrc.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.hammerGain);

        noiseSrc.start(now);
        noiseSrc.stop(now + 0.016);
      }
    } catch {
      // Audio node safety
    }
  }

  /**
   * Damper Felt Noise (Subtle acoustic felt release when key/pedal lifts)
   */
  private triggerDamperRelease(now: number): void {
    if (!this.ctx || !this.hammerGain || !this.hammerActionEnabled) return;

    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.02);
      const noiseBuf = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
      }

      const noiseSrc = this.ctx.createBufferSource();
      noiseSrc.buffer = noiseBuf;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.018, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);

      noiseSrc.connect(filter);
      filter.connect(gain);
      gain.connect(this.hammerGain);

      noiseSrc.start(now);
      noiseSrc.stop(now + 0.022);
    } catch {
      // Safety
    }
  }

  /**
   * Load Yamaha C5 Salamander samples
   */
  public async loadSoundfont(): Promise<void> {
    if (this.isLoadedFlag) return;
    await this.initAudio();

    const total = SALAMANDER_SAMPLES.length;
    let loaded = 0;

    const loadPromises = SALAMANDER_SAMPLES.map(async (item) => {
      try {
        let url = `./audio/salamander/${item.file}`;
        let response = await fetch(url).catch(() => null);

        if (!response || !response.ok) {
          url = `https://tonejs.github.io/audio/salamander/${item.file}`;
          response = await fetch(url);
        }

        const arrayBuffer = await response.arrayBuffer();
        if (this.ctx) {
          const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
          this.sampleBuffers.set(item.midi, audioBuffer);
        }
      } catch (err) {
        console.warn(`Sample load failed: ${item.note}`, err);
      } finally {
        loaded++;
        const pct = Math.round((loaded / total) * 100);
        this.loadingProgress = pct;
        this.onProgressCallback?.(pct);
      }
    });

    await Promise.all(loadPromises);

    this.buildPrecomputedLookup();
    this.isLoadedFlag = this.precomputedLookup.size > 0;
  }

  private buildPrecomputedLookup(): void {
    if (this.sampleBuffers.size === 0) return;

    const sampleMidis = Array.from(this.sampleBuffers.keys()).sort((a, b) => a - b);

    for (let midi = 21; midi <= 108; midi++) {
      let closestMidi = sampleMidis[0];
      let minDistance = Math.abs(midi - closestMidi);

      for (let j = 1; j < sampleMidis.length; j++) {
        const dist = Math.abs(midi - sampleMidis[j]);
        if (dist < minDistance) {
          minDistance = dist;
          closestMidi = sampleMidis[j];
        }
        if (dist > minDistance) break;
      }

      const buffer = this.sampleBuffers.get(closestMidi)!;
      const semitoneDiff = midi - closestMidi;
      const playbackRate = Math.pow(2, semitoneDiff / 12);
      this.precomputedLookup.set(midi, { buffer, playbackRate });
    }
  }

  /**
   * Live User Note Strike (Keyboard, MIDI, Screen)
   */
  public playNote(midi: number, velocity: number = 0.8, timeOffset: number = 0): void {
    if (!this.ctx || !this.preMasterGain) {
      this.initAudio().then(() => this.playNote(midi, velocity, timeOffset));
      return;
    }

    const now = this.ctx.currentTime + Math.max(0, timeOffset);
    const vel = Math.max(0.1, Math.min(1.0, velocity));

    // Acoustic Hammer Strike transient
    this.triggerHammerStrike(now, vel, midi);

    // Voice pruning
    if (this.activeVoices.size >= MAX_LIVE_VOICES) {
      const iter = this.activeVoices.entries();
      let pruned = 0;
      for (const [oldMidi, voice] of iter) {
        if (!voice.isUserHeld || pruned < PRUNE_BATCH) {
          voice.stop(0.02);
          this.activeVoices.delete(oldMidi);
          pruned++;
          if (pruned >= PRUNE_BATCH) break;
        }
      }
    }

    const existing = this.activeVoices.get(midi);
    if (existing) {
      existing.stop(0.015);
      this.activeVoices.delete(midi);
    }

    const info = this.precomputedLookup.get(midi);
    if (!info) return;

    const source = this.ctx.createBufferSource();
    source.buffer = info.buffer;
    source.playbackRate.value = info.playbackRate;

    // Dynamic Tone Filter: softer hits = warmer acoustic felt tone, hard hits = bright harmonics
    const toneFilter = this.ctx.createBiquadFilter();
    toneFilter.type = 'lowpass';
    const cutoff = 2500 + Math.pow(vel, 1.4) * 17500;
    toneFilter.frequency.setValueAtTime(cutoff, now);

    const gain = this.ctx.createGain();
    const voiceCount = this.activeVoices.size;
    const headroom = voiceCount > 10 ? Math.max(0.35, 1.0 / Math.sqrt(voiceCount * 0.25)) : 1.0;
    const targetGain = Math.pow(vel, 1.2) * 0.38 * headroom;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(targetGain, now + 0.004);

    source.connect(toneFilter);
    toneFilter.connect(gain);
    gain.connect(this.preMasterGain);
    source.start(now);

    const stopFn = (decayTime: number = 0.3) => {
      try {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        gain.gain.cancelScheduledValues(t);
        gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + decayTime);
        source.stop(t + decayTime + 0.05);
        this.triggerDamperRelease(t);
      } catch {
        // Voice already stopped
      }
    };

    this.activeVoices.set(midi, { source, gain, stop: stopFn, isUserHeld: true });

    source.onended = () => {
      if (this.activeVoices.get(midi)?.source === source) {
        this.activeVoices.delete(midi);
      }
    };
  }

  /**
   * Hardware-Scheduled Note (for MIDI song playback lookahead)
   */
  public scheduleNote(
    midi: number,
    velocity: number,
    startTime: number,
    duration: number
  ): void {
    if (!this.ctx || !this.preMasterGain) return;

    const info = this.precomputedLookup.get(midi);
    if (!info) return;

    const t0 = Math.max(this.ctx.currentTime, startTime);
    const vel = Math.max(0.1, Math.min(1.0, velocity));

    // Hammer action mechanical transient
    this.triggerHammerStrike(t0, vel, midi);

    const source = this.ctx.createBufferSource();
    source.buffer = info.buffer;
    source.playbackRate.value = info.playbackRate;

    // Dynamic Tone Filter
    const toneFilter = this.ctx.createBiquadFilter();
    toneFilter.type = 'lowpass';
    const cutoff = 2500 + Math.pow(vel, 1.4) * 17500;
    toneFilter.frequency.setValueAtTime(cutoff, t0);

    const gain = this.ctx.createGain();
    const targetGain = Math.pow(vel, 1.2) * 0.35;

    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(targetGain, t0 + 0.004);

    // Sustain calculation: if sustain pedal is held, note duration extends!
    const effectiveDuration = this.sustainPedal ? Math.max(duration, 3.5) : duration;
    const releaseStart = t0 + Math.max(0.04, effectiveDuration);
    const releaseDur = effectiveDuration < 0.12 ? 0.06 : 0.28;

    gain.gain.setValueAtTime(targetGain, releaseStart);
    gain.gain.exponentialRampToValueAtTime(0.0001, releaseStart + releaseDur);

    source.connect(toneFilter);
    toneFilter.connect(gain);
    gain.connect(this.preMasterGain);
    source.start(t0);
    source.stop(releaseStart + releaseDur + 0.02);

    if (this.scheduledNodes.size > MAX_SCHEDULED_NODES) {
      const iter = this.scheduledNodes.values();
      let pruned = 0;
      for (const old of iter) {
        try {
          old.gain.gain.cancelScheduledValues(this.ctx.currentTime);
          old.gain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
          old.source.stop(this.ctx.currentTime + 0.005);
        } catch { /* already stopped */ }
        this.scheduledNodes.delete(old);
        pruned++;
        if (pruned >= PRUNE_BATCH) break;
      }
    }

    const nodeRef = { source, gain };
    this.scheduledNodes.add(nodeRef);
    source.onended = () => {
      this.scheduledNodes.delete(nodeRef);
    };
  }

  public stopNote(midi: number, decayTime: number = 0.3, force: boolean = false): void {
    const voice = this.activeVoices.get(midi);
    if (!voice) return;

    voice.isUserHeld = false;

    if (this.sustainPedal && !force) {
      return;
    }

    voice.stop(decayTime);
    this.activeVoices.delete(midi);
  }

  public setSustainPedal(isDown: boolean): void {
    const wasDown = this.sustainPedal;
    this.sustainPedal = isDown;

    if (wasDown && !isDown) {
      // Pedal lifted: trigger acoustic damper felt release!
      if (this.ctx) {
        this.triggerDamperRelease(this.ctx.currentTime);
      }
      const toRemove: number[] = [];
      this.activeVoices.forEach((voice, midi) => {
        if (!voice.isUserHeld) {
          voice.stop(0.32);
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
    this.activeVoices.forEach(v => v.stop(0.03));
    this.activeVoices.clear();

    this.scheduledNodes.forEach(({ source, gain }) => {
      try {
        if (this.ctx) {
          gain.gain.cancelScheduledValues(this.ctx.currentTime);
          gain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
          source.stop(this.ctx.currentTime + 0.01);
        }
      } catch {
        // Stopped
      }
    });
    this.scheduledNodes.clear();
  }

  public async renderNotesToAudioBuffer(
    notes: { midi: number; time: number; duration: number; velocity: number }[],
    totalDuration: number
  ): Promise<AudioBuffer> {
    const sampleRate = 44100;
    const lengthInSamples = Math.ceil((totalDuration + 2.5) * sampleRate);
    const offlineCtx = new OfflineAudioContext(2, lengthInSamples, sampleRate);

    const master = offlineCtx.createGain();
    master.gain.setValueAtTime(0.7, 0);

    const comp = offlineCtx.createDynamicsCompressor();
    comp.threshold.setValueAtTime(-8, 0);
    comp.knee.setValueAtTime(6, 0);
    comp.ratio.setValueAtTime(12, 0);
    comp.attack.setValueAtTime(0.002, 0);
    comp.release.setValueAtTime(0.15, 0);

    master.connect(comp);
    comp.connect(offlineCtx.destination);

    for (const note of notes) {
      const startTime = note.time;
      const duration = note.duration;
      const midi = note.midi;
      const velocity = Math.max(0.1, Math.min(1.0, note.velocity || 0.8));

      const info = this.precomputedLookup.get(midi);
      if (info) {
        const source = offlineCtx.createBufferSource();
        source.buffer = info.buffer;
        source.playbackRate.setValueAtTime(info.playbackRate, startTime);

        const gain = offlineCtx.createGain();
        const targetGain = Math.pow(velocity, 1.2) * 0.38;

        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.linearRampToValueAtTime(targetGain, startTime + 0.004);
        gain.gain.setValueAtTime(targetGain, startTime + duration);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration + 0.3);

        source.connect(gain);
        gain.connect(master);

        source.start(startTime);
        source.stop(startTime + duration + 0.35);
      }
    }

    return await offlineCtx.startRendering();
  }
}

export const pianoEngine = new PianoEngine();
