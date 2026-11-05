/**
 * PianoEngine.ts
 * Yamaha C5 Konser Kuyruklu Piyano (Salamander Grand Piano) Ses Motoru
 * - Önbelleklenmiş O(1) Örnekleme Tablosu (Sıfır arama gecikmesi)
 * - Donanım Zamanlamalı Nota Çizelgeleme (Stutter-Free Sample-Accurate Audio Scheduling)
 * - Anti-Clipping: Stüdyo Kompresörü & Tanh Soft-Clipper Limiter
 * - Gerçekçi Keçe Damper ve CC 64 Sustain Pedalı
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

export class PianoEngine {
  private ctx: AudioContext | null = null;
  private preMasterGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private compressorNode: DynamicsCompressorNode | null = null;
  private limiterNode: WaveShaperNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;

  private sampleBuffers: Map<number, AudioBuffer> = new Map();
  // 88 tuş için O(1) hazır örnek haritası (midi -> { buffer, playbackRate })
  private precomputedLookup: Map<number, PrecomputedNoteInfo> = new Map();

  private isLoadedFlag = false;
  private loadingProgress = 0;
  private onProgressCallback?: (progress: number) => void;

  // Aktif çalan sesler
  private activeVoices: Map<number, {
    source: AudioBufferSourceNode;
    gain: GainNode;
    stop: (decayTime?: number) => void;
    isUserHeld: boolean;
  }> = new Map();

  private scheduledNodes: Set<{ source: AudioBufferSourceNode; gain: GainNode }> = new Set();

  private sustainPedal = false;
  private masterVolume = 0.85;

  constructor() {
    // Lazy init
  }

  public async initAudio(): Promise<void> {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx({ latencyHint: 'interactive' });

      // 1. Pre-Master Bus
      this.preMasterGain = this.ctx.createGain();
      this.preMasterGain.gain.setValueAtTime(0.75, this.ctx.currentTime);

      // 2. Akustik Konser Salonu Reverb Rezonansı
      this.reverbNode = this.createImpulseReverb(this.ctx, 1.6, 2.2);
      this.reverbGain = this.ctx.createGain();
      this.reverbGain.gain.setValueAtTime(0.18, this.ctx.currentTime);

      this.preMasterGain.connect(this.reverbGain);
      this.reverbGain.connect(this.reverbNode);

      // 3. Master Volume Fader
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);

      // 4. Stüdyo Kompresörü / Limiter
      this.compressorNode = this.ctx.createDynamicsCompressor();
      this.compressorNode.threshold.setValueAtTime(-14, this.ctx.currentTime);
      this.compressorNode.knee.setValueAtTime(8, this.ctx.currentTime);
      this.compressorNode.ratio.setValueAtTime(10, this.ctx.currentTime);
      this.compressorNode.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressorNode.release.setValueAtTime(0.2, this.ctx.currentTime);

      // 5. Tanh Analog Soft-Clipper
      this.limiterNode = this.createSoftClipper(this.ctx);

      this.preMasterGain.connect(this.masterGain);
      this.reverbNode.connect(this.masterGain);

      this.masterGain.connect(this.compressorNode);
      this.compressorNode.connect(this.limiterNode);
      this.limiterNode.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  public setProgressCallback(cb: (p: number) => void) {
    this.onProgressCallback = cb;
  }

  public setMasterVolume(val: number): void {
    this.masterVolume = Math.max(0, Math.min(1.0, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(this.masterVolume, this.ctx.currentTime + 0.04);
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
   * Yamaha C5 Salamander Ses Örneklerini Yükler ve O(1) Tabloyu Hazırlar
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
        console.warn(`Örnek yüklenemedi: ${item.note}`, err);
      } finally {
        loaded++;
        const pct = Math.round((loaded / total) * 100);
        this.loadingProgress = pct;
        this.onProgressCallback?.(pct);
      }
    });

    await Promise.all(loadPromises);

    // 88 tuş için O(1) tablosunu hemen oluştur (Çalma sırasında sıfır arama gecikmesi)
    this.buildPrecomputedLookup();
    this.isLoadedFlag = this.precomputedLookup.size > 0;
  }

  private buildPrecomputedLookup(): void {
    if (this.sampleBuffers.size === 0) return;

    for (let midi = 21; midi <= 108; midi++) {
      let closestMidi = -1;
      let minDistance = 999;

      for (const sampleMidi of this.sampleBuffers.keys()) {
        const dist = Math.abs(midi - sampleMidi);
        if (dist < minDistance) {
          minDistance = dist;
          closestMidi = sampleMidi;
        }
      }

      if (closestMidi !== -1) {
        const buffer = this.sampleBuffers.get(closestMidi)!;
        const semitoneDiff = midi - closestMidi;
        const playbackRate = Math.pow(2, semitoneDiff / 12);
        this.precomputedLookup.set(midi, { buffer, playbackRate });
      }
    }
  }

  /**
   * Anlık Note On (Canlı kullanıcı vuruşu için)
   */
  public playNote(midi: number, velocity: number = 0.8, timeOffset: number = 0): void {
    if (!this.ctx || !this.preMasterGain) {
      this.initAudio().then(() => this.playNote(midi, velocity, timeOffset));
      return;
    }

    const now = this.ctx.currentTime + Math.max(0, timeOffset);
    const clampedVelocity = Math.max(0.1, Math.min(1.0, velocity));

    // Aşırı Küme & 88 Tuş Polifoni Koruması (Aynı anda tüm tuşlara basıldığında bile sıfır zorlanma)
    if (this.activeVoices.size >= 24) {
      // En eski sesleri topluca hızlıca söndür
      const iterator = this.activeVoices.entries();
      let pruned = 0;
      for (const [oldMidi, voice] of iterator) {
        if (!voice.isUserHeld || pruned < 6) {
          voice.stop(0.04);
          this.activeVoices.delete(oldMidi);
          pruned++;
          if (pruned >= 6) break;
        }
      }
    }

    // Önceki sesi yumuşakça söndür (ani kesme yapmaz)
    const existing = this.activeVoices.get(midi);
    if (existing) {
      existing.stop(0.06);
      this.activeVoices.delete(midi);
    }

    const info = this.precomputedLookup.get(midi);
    if (!info) return;

    const source = this.ctx.createBufferSource();
    source.buffer = info.buffer;
    source.playbackRate.setValueAtTime(info.playbackRate, now);

    const gain = this.ctx.createGain();
    // Yoğunluk ölçeklemesi: çok fazla tuşa basıldığında kazancı dinamik dengeler
    const clusterScale = this.activeVoices.size > 8 ? Math.max(0.4, 8 / Math.sqrt(this.activeVoices.size * 5)) : 1.0;
    const targetGain = Math.pow(clampedVelocity, 1.25) * 0.42 * clusterScale;

    // Pop-free mikro rampa
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(targetGain, now + 0.003);

    source.connect(gain);
    gain.connect(this.preMasterGain);

    source.start(now);

    const stopFn = (decayTime: number = 0.32) => {
      try {
        if (!this.ctx) return;
        const stopTime = this.ctx.currentTime;
        gain.gain.cancelScheduledValues(stopTime);
        gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), stopTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, stopTime + decayTime);
        source.stop(stopTime + decayTime + 0.05);
      } catch {
        // Voice already closed
      }
    };

    this.activeVoices.set(midi, {
      source,
      gain,
      stop: stopFn,
      isUserHeld: true
    });
  }

  /**
   * Donanım Zamanlamalı Nota Çizelgeleme (Hassas Çalma Motoru İçin)
   * UI gecikmesinden tamamen bağımsız olarak donanım saatinde mikro saniye hassasiyetinde çalar.
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

    const now = Math.max(this.ctx.currentTime, startTime);
    const clampedVelocity = Math.max(0.1, Math.min(1.0, velocity));

    const source = this.ctx.createBufferSource();
    source.buffer = info.buffer;
    source.playbackRate.setValueAtTime(info.playbackRate, now);

    const gain = this.ctx.createGain();
    const targetGain = Math.pow(clampedVelocity, 1.25) * 0.42;

    // Attack rampa
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(targetGain, now + 0.003);

    // Rush E / Yoğun Hızlı Notalar İçin Dinamik Sönümleme (Düğüm patlamasını önler)
    const decayDuration = duration < 0.15 ? Math.max(0.06, duration * 1.1) : 0.3;
    const releaseStart = now + Math.max(0.06, duration);

    gain.gain.setValueAtTime(targetGain, releaseStart);
    gain.gain.exponentialRampToValueAtTime(0.0001, releaseStart + decayDuration);

    source.connect(gain);
    gain.connect(this.preMasterGain);

    source.start(now);
    source.stop(releaseStart + decayDuration + 0.03);

    // Maksimum eşzamanlı donanım düğüm sınırı (Rush E / Black MIDI ses motoru çökmesini önler)
    if (this.scheduledNodes.size > 36) {
      const oldest = this.scheduledNodes.values().next().value;
      if (oldest) {
        try {
          oldest.gain.gain.cancelScheduledValues(this.ctx.currentTime);
          oldest.gain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
          oldest.source.stop(this.ctx.currentTime + 0.01);
          this.scheduledNodes.delete(oldest);
        } catch {
          // Ignore
        }
      }
    }

    const nodeRef = { source, gain };
    this.scheduledNodes.add(nodeRef);
    source.onended = () => {
      this.scheduledNodes.delete(nodeRef);
    };
  }

  /**
   * Tuş bırakıldığında sönümleme
   */
  public stopNote(midi: number, decayTime: number = 0.32, force: boolean = false): void {
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
    this.sustainPedal = isDown;

    if (!isDown) {
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
    this.activeVoices.forEach(v => v.stop(0.06));
    this.activeVoices.clear();

    // Çizelgelenmiş tüm donanım seslerini anında durdur
    this.scheduledNodes.forEach(({ source, gain }) => {
      try {
        if (this.ctx) {
          gain.gain.cancelScheduledValues(this.ctx.currentTime);
          gain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
          source.stop(this.ctx.currentTime + 0.02);
        }
      } catch {
        // Closed
      }
    });
    this.scheduledNodes.clear();
  }

  private createSoftClipper(ctx: AudioContext): WaveShaperNode {
    const shaper = ctx.createWaveShaper();
    const n = 4096;
    const curve = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = Math.tanh(x * 1.15);
    }

    shaper.curve = curve;
    shaper.oversample = '2x';
    return shaper;
  }

  private createImpulseReverb(ctx: BaseAudioContext, duration = 1.6, decay = 2.2): ConvolverNode {
    const convolver = ctx.createConvolver();
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * duration);
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

  public async renderNotesToAudioBuffer(
    notes: { midi: number; time: number; duration: number; velocity: number }[],
    totalDuration: number
  ): Promise<AudioBuffer> {
    const sampleRate = 44100;
    const lengthInSamples = Math.ceil((totalDuration + 2.5) * sampleRate);
    const offlineCtx = new OfflineAudioContext(2, lengthInSamples, sampleRate);

    const master = offlineCtx.createGain();
    master.gain.setValueAtTime(0.75, 0);

    const comp = offlineCtx.createDynamicsCompressor();
    comp.threshold.setValueAtTime(-14, 0);
    comp.knee.setValueAtTime(8, 0);
    comp.ratio.setValueAtTime(10, 0);
    comp.attack.setValueAtTime(0.003, 0);
    comp.release.setValueAtTime(0.2, 0);

    const reverb = this.createImpulseReverb(offlineCtx, 1.6, 2.2);
    const revGain = offlineCtx.createGain();
    revGain.gain.setValueAtTime(0.18, 0);

    master.connect(comp);
    master.connect(revGain);
    revGain.connect(reverb);
    reverb.connect(comp);
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
        const targetGain = Math.pow(velocity, 1.25) * 0.42;

        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.linearRampToValueAtTime(targetGain, startTime + 0.003);
        gain.gain.setValueAtTime(targetGain, startTime + duration);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration + 0.35);

        source.connect(gain);
        gain.connect(master);

        source.start(startTime);
        source.stop(startTime + duration + 0.4);
      }
    }

    return await offlineCtx.startRendering();
  }
}

export const pianoEngine = new PianoEngine();
