/**
 * MidiManager.ts
 * Web MIDI API & Özelleştirilebilir Bilgisayar Klavyesi Yöneticisi
 * - Oktav Kaydırma ([ ve ] tuşları ile +2/-2 oktav)
 * - Tuş Etiketi Geri Bildirimi (Piyano tuşlarının üstünde tuş harfini gösterme)
 * - CC 64 Sustain Pedalı & Spacebar
 */

import { MidiDevice } from '../types';

export type NoteEventCallback = (midi: number, velocity: number) => void;
export type PedalEventCallback = (isDown: boolean, value: number) => void;
export type DeviceChangeCallback = (devices: MidiDevice[], activeDevice: MidiDevice | null) => void;
export type KeyboardConfigCallback = (octaveOffset: number, map: Record<string, number>) => void;

// Temel QWERTY haritası (Orta C4 = 60 merkezli)
export const DEFAULT_KEYBOARD_MAP: Record<string, number> = {
  // Alt Oktav (C3 - B3)
  'z': 48, 's': 49, 'x': 50, 'd': 51, 'c': 52, 'v': 53, 'g': 54, 'b': 55, 'h': 56, 'n': 57, 'j': 58, 'm': 59,
  // Ana Oktav (C4 - B4)
  'q': 60, '2': 61, 'w': 62, '3': 63, 'e': 64, 'r': 65, '5': 66, 't': 67, '6': 68, 'y': 69, '7': 70, 'u': 71,
  // Üst Oktav başlangıcı (C5 - E5)
  'i': 72, '9': 73, 'o': 74, '0': 75, 'p': 76
};

export class MidiManager {
  private midiAccess: WebMidi.MIDIAccess | null = null;
  private activeInput: WebMidi.MIDIInput | null = null;
  private devices: MidiDevice[] = [];
  private isSustainPedalDown = false;
  private pressedKeyboardKeys: Set<string> = new Set();

  // Klavye atamaları ve oktav ofseti
  private keyMap: Record<string, number> = { ...DEFAULT_KEYBOARD_MAP };
  private octaveOffset: number = 0; // -2, -1, 0, +1, +2

  private onNoteOnListeners: Set<NoteEventCallback> = new Set();
  private onNoteOffListeners: Set<NoteEventCallback> = new Set();
  private onPedalListeners: Set<PedalEventCallback> = new Set();
  private onDeviceChangeListeners: Set<DeviceChangeCallback> = new Set();
  private onConfigListeners: Set<KeyboardConfigCallback> = new Set();

  constructor() {
    this.setupKeyboardFallback();
  }

  public async initMidi(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.requestMIDIAccess) {
      console.warn('Web MIDI API bu tarayıcıda desteklenmiyor.');
      return false;
    }

    try {
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: false, software: true });
      this.updateDeviceList();

      this.midiAccess.onstatechange = () => {
        this.updateDeviceList();
      };

      if (!this.activeInput && this.devices.length > 0) {
        this.selectDevice(this.devices[0].id);
      }

      return true;
    } catch (err) {
      console.warn('MIDI cihazlarına erişim reddedildi veya bulunamadı:', err);
      return false;
    }
  }

  private updateDeviceList(): void {
    if (!this.midiAccess) return;

    const list: MidiDevice[] = [];
    const inputs = this.midiAccess.inputs.values();

    for (const input of inputs) {
      list.push({
        id: input.id,
        name: input.name || 'MIDI Girişi',
        manufacturer: input.manufacturer || 'Bilinmiyor',
        state: input.state || 'connected',
      });
    }

    this.devices = list;

    if (this.activeInput) {
      const stillConnected = list.some(d => d.id === this.activeInput?.id);
      if (!stillConnected) {
        this.activeInput = null;
      }
    }

    if (!this.activeInput && list.length > 0) {
      this.selectDevice(list[0].id);
    }

    this.notifyDeviceChange();
  }

  public selectDevice(deviceId: string): boolean {
    if (!this.midiAccess) return false;

    if (this.activeInput) {
      this.activeInput.onmidimessage = null;
      this.activeInput = null;
    }

    const input = this.midiAccess.inputs.get(deviceId);
    if (input) {
      this.activeInput = input;
      this.activeInput.onmidimessage = this.handleMidiMessage.bind(this);
      this.notifyDeviceChange();
      return true;
    }

    return false;
  }

  public getDevices(): MidiDevice[] {
    return this.devices;
  }

  public getActiveDevice(): MidiDevice | null {
    if (!this.activeInput) return null;
    return this.devices.find(d => d.id === this.activeInput?.id) || null;
  }

  public getSustainPedalState(): boolean {
    return this.isSustainPedalDown;
  }

  // --- Klavye Atamaları ve Oktav Kontrolü ---

  public getOctaveOffset(): number {
    return this.octaveOffset;
  }

  public setOctaveOffset(offset: number): void {
    this.octaveOffset = Math.max(-2, Math.min(2, offset));
    this.notifyConfigChange();
  }

  public shiftOctave(delta: number): void {
    this.setOctaveOffset(this.octaveOffset + delta);
  }

  public getKeyMap(): Record<string, number> {
    return { ...this.keyMap };
  }

  public setKeyMap(newMap: Record<string, number>): void {
    this.keyMap = { ...newMap };
    this.notifyConfigChange();
  }

  /**
   * Belirli bir MIDI notasına denk gelen bilgisayar klavyesi tuşunu bulur
   */
  public getKeyForMidi(midi: number): string | null {
    const effectiveMidi = midi - (this.octaveOffset * 12);
    for (const [key, noteMidi] of Object.entries(this.keyMap)) {
      if (noteMidi === effectiveMidi) {
        return key.toUpperCase();
      }
    }
    return null;
  }

  private handleMidiMessage(event: WebMidi.MIDIMessageEvent): void {
    const data = event.data;
    if (!data || data.length < 2) return;

    const status = data[0] & 0xf0;
    const noteOrControl = data[1];
    const velocityOrValue = data[2] || 0;

    switch (status) {
      case 0x90: // Note On
        if (velocityOrValue > 0) {
          this.notifyNoteOn(noteOrControl, velocityOrValue / 127);
        } else {
          this.notifyNoteOff(noteOrControl, 0);
        }
        break;

      case 0x80: // Note Off
        this.notifyNoteOff(noteOrControl, velocityOrValue / 127);
        break;

      case 0xb0: // Control Change (CC 64 = Sustain Pedal)
        if (noteOrControl === 64) {
          const isDown = velocityOrValue >= 64;
          this.isSustainPedalDown = isDown;
          this.notifyPedal(isDown, velocityOrValue);
        }
        break;
    }
  }

  private setupKeyboardFallback(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', (e) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      // Spacebar: Sustain Pedal
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        this.isSustainPedalDown = true;
        this.notifyPedal(true, 127);
        return;
      }

      // Oktav Kaydırma Kısayolları ([ = Oktav Aşağı, ] = Oktav Yukarı)
      if (e.key === '[' || e.key === '{') {
        e.preventDefault();
        this.shiftOctave(-1);
        return;
      }
      if (e.key === ']' || e.key === '}') {
        e.preventDefault();
        this.shiftOctave(1);
        return;
      }

      const key = e.key.toLowerCase();
      if (this.keyMap[key] !== undefined && !this.pressedKeyboardKeys.has(key)) {
        this.pressedKeyboardKeys.add(key);
        const baseMidi = this.keyMap[key];
        const actualMidi = baseMidi + (this.octaveOffset * 12);
        if (actualMidi >= 21 && actualMidi <= 108) {
          this.notifyNoteOn(actualMidi, 0.85);
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.isSustainPedalDown = false;
        this.notifyPedal(false, 0);
        return;
      }

      const key = e.key.toLowerCase();
      if (this.pressedKeyboardKeys.has(key)) {
        this.pressedKeyboardKeys.delete(key);
        const baseMidi = this.keyMap[key];
        const actualMidi = baseMidi + (this.octaveOffset * 12);
        this.notifyNoteOff(actualMidi, 0);
      }
    });
  }

  public onNoteOn(cb: NoteEventCallback): () => void {
    this.onNoteOnListeners.add(cb);
    return () => this.onNoteOnListeners.delete(cb);
  }

  public onNoteOff(cb: NoteEventCallback): () => void {
    this.onNoteOffListeners.add(cb);
    return () => this.onNoteOffListeners.delete(cb);
  }

  public onPedal(cb: PedalEventCallback): () => void {
    this.onPedalListeners.add(cb);
    return () => this.onPedalListeners.delete(cb);
  }

  public onDeviceChange(cb: DeviceChangeCallback): () => void {
    this.onDeviceChangeListeners.add(cb);
    return () => this.onDeviceChangeListeners.delete(cb);
  }

  public onConfigChange(cb: KeyboardConfigCallback): () => void {
    this.onConfigListeners.add(cb);
    return () => this.onConfigListeners.delete(cb);
  }

  private notifyNoteOn(midi: number, velocity: number): void {
    this.onNoteOnListeners.forEach(cb => cb(midi, velocity));
  }

  private notifyNoteOff(midi: number, velocity: number): void {
    this.onNoteOffListeners.forEach(cb => cb(midi, velocity));
  }

  private notifyPedal(isDown: boolean, value: number): void {
    this.onPedalListeners.forEach(cb => cb(isDown, value));
  }

  private notifyDeviceChange(): void {
    const active = this.getActiveDevice();
    this.onDeviceChangeListeners.forEach(cb => cb(this.devices, active));
  }

  private notifyConfigChange(): void {
    this.onConfigListeners.forEach(cb => cb(this.octaveOffset, this.keyMap));
  }
}

export const midiManager = new MidiManager();
