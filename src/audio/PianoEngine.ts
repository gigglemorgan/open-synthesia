/**
 * PianoEngine.ts
 * Profesyonel Akustik Piyano Ses Motoru
 * - Anti-Clipping: Stüdyo Tipi Dinamik Kompresör & Tanh Yumuşak Kırpıcı (Soft-Clipper Limiter)
 * - Polifoni ve Sönümleme Yönetimi (Aşırı ses yüklenmesini ve patlamayı önler)
 * - Ayarlanabilir Ana Ses Seviyesi (Master Volume)
 * - Mikro rampa yumuşatma (Tıklama ve patlama önleyici)
 * - Gerçekçi Sustain Pedalı (CC 64)
 */

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiToNoteName(midi: number): string {
  const noteIndex = midi % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

export class PianoEngine {
  private ctx: AudioContext | null = null;
  private preMasterGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private compressorNode: DynamicsCompressorNode | null = null;
  private limiterNode: WaveShaperNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;

  private soundfontBuffers: Map<number, AudioBuffer> = new Map();
  private isSoundfontLoaded = false;
  private loadingProgress = 0;
  private onProgressCallback?: (progress: number) => void;

  // Active playing voices
  private activeVoices: Map<number, {
    stop: (decayTime?: number) => void;
    isUserHeld: boolean;
  }> = new Map();

  // Sustain Pedal State
  private sustainPedal = false;
  private masterVolume = 0.8; // 0.0 - 1.0

  constructor() {
    // Lazy AudioContext init
  }

  public async initAudio(): Promise<void> {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // 1. Pre-Master (toplayıcı)
      this.preMasterGain = this.ctx.createGain();
      this.preMasterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);

      // 2. Reverb Bus
      this.reverbNode = this.createImpulseReverb(this.ctx, 1.6, 2.4);
      this.reverbGain = this.ctx.createGain();
      this.reverbGain.gain.setValueAtTime(0.18, this.ctx.currentTime);

      this.preMasterGain.connect(this.reverbGain);
      this.reverbGain.connect(this.reverbNode);

      // 3. Master Volume (Kullanıcı ses ayarı)
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);

      // 4. Stüdyo Kompresörü / Limiter (Patlamaları kesinlikle engeller)
      this.compressorNode = this.ctx.createDynamicsCompressor();
      this.compressorNode.threshold.setValueAtTime(-14, this.ctx.currentTime);
      this.compressorNode.knee.setValueAtTime(10, this.ctx.currentTime);
      this.compressorNode.ratio.setValueAtTime(12, this.ctx.currentTime); // Soft brickwall
      this.compressorNode.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressorNode.release.setValueAtTime(0.18, this.ctx.currentTime);

      // 5. Yumuşak Doyum Kırpıcı (Tanh Waveshaper - 0 dBFS üzerinde dijital çatlamayı analog sıcaklığa çevirir)
      this.limiterNode = this.createSoftClipper(this.ctx);

      // Sinyal Akışı:
      // PreMaster + Reverb -> MasterGain -> Compressor -> Limiter -> Destination
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

  /**
   * Ses Seviyesi (0.0 - 1.0)
   */
  public setMasterVolume(val: number): void {
    this.masterVolume = Math.max(0, Math.min(1.0, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(this.masterVolume, this.ctx.currentTime + 0.05);
    }
  }

  public getMasterVolume(): number {
    return this.masterVolume;
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
   * SoundFont Yüklemesi
   */
  public async loadSoundfont(): Promise<void> {
    if (this.isSoundfontLoaded) return;
    await this.initAudio();

    try {
      this.loadingProgress = 10;
      this.onProgressCallback?.(10);

      const url = 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_grand_piano-mp3.js';
      const response = await fetch(url);
      const text = await response.text();

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
          // Ignore failed sample
        }
        loaded++;
        const progress = Math.round(10 + (loaded / total) * 90);
        this.loadingProgress = progress;
        this.onProgressCallback?.(progress);
      }

      this.isSoundfontLoaded = true;
    } catch (err) {
      console.warn('Soundfont CDN yüklemesi başarısız, akustik sentezleyici devrede:', err);
      this.isSoundfontLoaded = false;
      this.onProgressCallback?.(100);
    }
  }

  public isLoaded(): boolean {
    return this.isSoundfontLoaded || this.loadingProgress === 100;
  }

  /**
   * Note On: Tıklama ve aşırı ses patlamasını önleyen akıllı kazanç
   */
  public playNote(midi: number, velocity: number = 0.8, timeOffset: number = 0): void {
    if (!this.ctx || !this.preMasterGain) {
      this.initAudio().then(() => this.playNote(midi, velocity, timeOffset));
      return;
    }

    const now = this.ctx.currentTime + Math.max(0, timeOffset);
    const clampedVelocity = Math.max(0.1, Math.min(1.0, velocity));

    // Polifoni koruması: Çok fazla ses açıksa en eskiyi yumuşakça söndür
    if (this.activeVoices.size > 28) {
      const oldestKey = this.activeVoices.keys().next().value;
      if (oldestKey !== undefined) {
        this.stopNote(oldestKey, 0.08, true);
      }
    }

    // Stop existing note cleanly
    this.stopNote(midi, 0.04, false);

    if (this.soundfontBuffers.has(midi)) {
      const buffer = this.soundfontBuffers.get(midi)!;
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;

      const gain = this.ctx.createGain();
      // Kalibre edilmiş ses kazancı (0.35 max ile çoklu notalarda patlamayı önler)
      const targetGain = Math.pow(clampedVelocity, 1.4) * 0.38;

      // Click/Pop önleyici mikro rampa (0.004s)
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(targetGain, now + 0.004);

      source.connect(gain);
      gain.connect(this.preMasterGain);

      source.start(now);

      const stopFn = (decayTime: number = 0.35) => {
        try {
          if (!this.ctx) return;
          const stopTime = this.ctx.currentTime;
          gain.gain.cancelScheduledValues(stopTime);
          gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), stopTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, stopTime + decayTime);
          source.stop(stopTime + decayTime + 0.04);
        } catch {
          // Voice already closed
        }
      };

      this.activeVoices.set(midi, {
        stop: stopFn,
        isUserHeld: true
      });
    } else {
      // Hibrit akustik piyano tel sentezi
      this.playAcousticSynthesizedNote(midi, clampedVelocity, now);
    }
  }

  /**
   * Note Off: Sustain pedalı basılıysa bırakılan tuş sönümlenmez!
   */
  public stopNote(midi: number, decayTime: number = 0.28, force: boolean = false): void {
    const voice = this.activeVoices.get(midi);
    if (!voice) return;

    voice.isUserHeld = false;

    if (this.sustainPedal && !force) {
      return;
    }

    voice.stop(decayTime);
    this.activeVoices.delete(midi);
  }

  /**
   * Sustain Pedal (Damper CC 64)
   */
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
    this.activeVoices.forEach(v => v.stop(0.08));
    this.activeVoices.clear();
  }

  /**
   * Yumuşak Akustik Sentezleyici (Patlama önleyici kalibrasyon)
   */
  private playAcousticSynthesizedNote(midi: number, velocity: number, startTime: number): void {
    if (!this.ctx || !this.preMasterGain) return;

    const freq = midiToFrequency(midi);
    const duration = 3.5;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, startTime);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, startTime);
    osc2.detune.setValueAtTime(2.5, startTime);

    // Dynamic lowpass
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const cutoff = Math.min(10000, freq * 6 * velocity);
    filter.frequency.setValueAtTime(cutoff, startTime);
    filter.frequency.exponentialRampToValueAtTime(Math.max(180, freq * 1.2), startTime + 2.0);

    const ampGain = this.ctx.createGain();
    const peakGain = 0.22 * Math.pow(velocity, 1.3);

    ampGain.gain.setValueAtTime(0.0001, startTime);
    ampGain.gain.linearRampToValueAtTime(peakGain, startTime + 0.005);
    ampGain.gain.exponentialRampToValueAtTime(peakGain * 0.35, startTime + 0.4);
    ampGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(ampGain);
    ampGain.connect(this.preMasterGain);

    osc1.start(startTime);
    osc2.start(startTime);

    const stopFn = (decayTime: number = 0.25) => {
      try {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        ampGain.gain.cancelScheduledValues(now);
        ampGain.gain.setValueAtTime(Math.max(0.0001, ampGain.gain.value), now);
        ampGain.gain.exponentialRampToValueAtTime(0.0001, now + decayTime);
        osc1.stop(now + decayTime + 0.04);
        osc2.stop(now + decayTime + 0.04);
      } catch {
        // Voice closed
      }
    };

    this.activeVoices.set(midi, {
      stop: stopFn,
      isUserHeld: true
    });
  }

  /**
   * Analog Tanh Soft-Clipper Curve
   */
  private createSoftClipper(ctx: AudioContext): WaveShaperNode {
    const shaper = ctx.createWaveShaper();
    const n = 4096;
    const curve = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      // Hyperbolic tangent soft clip
      curve[i] = Math.tanh(x * 1.15);
    }

    shaper.curve = curve;
    shaper.oversample = '2x';
    return shaper;
  }

  /**
   * Concert Reverb Impulse
   */
  private createImpulseReverb(ctx: BaseAudioContext, duration = 1.6, decay = 2.4): ConvolverNode {
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
   * Offline Rendering for MP3
   */
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
    comp.threshold.setValueAtTime(-14, 0);
    comp.knee.setValueAtTime(10, 0);
    comp.ratio.setValueAtTime(12, 0);
    comp.attack.setValueAtTime(0.003, 0);
    comp.release.setValueAtTime(0.18, 0);

    const reverb = this.createImpulseReverb(offlineCtx, 1.4, 2.4);
    const revGain = offlineCtx.createGain();
    revGain.gain.setValueAtTime(0.16, 0);

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

      if (this.soundfontBuffers.has(midi)) {
        const buf = this.soundfontBuffers.get(midi)!;
        const source = offlineCtx.createBufferSource();
        source.buffer = buf;

        const gain = offlineCtx.createGain();
        const targetGain = Math.pow(velocity, 1.4) * 0.38;
        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.linearRampToValueAtTime(targetGain, startTime + 0.004);
        gain.gain.setValueAtTime(targetGain, startTime + duration);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration + 0.35);

        source.connect(gain);
        gain.connect(master);
        source.start(startTime);
        source.stop(startTime + duration + 0.4);
      } else {
        const freq = midiToFrequency(midi);
        const osc = offlineCtx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        const filter = offlineCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(Math.min(9000, freq * 5 * velocity), startTime);

        const noteGain = offlineCtx.createGain();
        const peakGain = 0.22 * Math.pow(velocity, 1.3);
        noteGain.gain.setValueAtTime(0.0001, startTime);
        noteGain.gain.linearRampToValueAtTime(peakGain, startTime + 0.006);
        noteGain.gain.exponentialRampToValueAtTime(peakGain * 0.35, startTime + Math.min(0.4, duration));
        noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration + 0.3);

        osc.connect(filter);
        filter.connect(noteGain);
        noteGain.connect(master);

        osc.start(startTime);
        osc.stop(startTime + duration + 0.35);
      }
    }

    return await offlineCtx.startRendering();
  }
}

export const pianoEngine = new PianoEngine();
