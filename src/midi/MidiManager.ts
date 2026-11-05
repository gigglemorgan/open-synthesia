/**
 * MidiManager.ts
 * Web MIDI API Donanım Girişi & Sustain Pedalı Yöneticisi
 * - USB/Bluetooth MIDI klavye ve piyano tespiti
 * - Gerçek CC 64 Sustain Pedalı desteği
 * - Bilgisayar klavyesi tuş piyano yedeği (Space = Sustain Pedal)
 */

import { MidiDevice } from '../types';

export type NoteEventCallback = (midi: number, velocity: number) => void;
export type PedalEventCallback = (isDown: boolean, value: number) => void;
export type DeviceChangeCallback = (devices: MidiDevice[], activeDevice: MidiDevice | null) => void;

// QWERTY keyboard map (2 full octaves centered on C4)
const KEYBOARD_MAP: Record<string, number> = {
  // Lower octave (C3 - B3)
  'z': 48, 's': 49, 'x': 50, 'd': 51, 'c': 52, 'v': 53, 'g': 54, 'b': 55, 'h': 56, 'n': 57, 'j': 58, 'm': 59,
  // Middle & upper octave (C4 - E5)
  'q': 60, '2': 61, 'w': 62, '3': 63, 'e': 64, 'r': 65, '5': 66, 't': 67, '6': 68, 'y': 69, '7': 70, 'u': 71,
  'i': 72, '9': 73, 'o': 74, '0': 75, 'p': 76
};

export class MidiManager {
  private midiAccess: WebMidi.MIDIAccess | null = null;
  private activeInput: WebMidi.MIDIInput | null = null;
  private devices: MidiDevice[] = [];
  private isSustainPedalDown = false;
  private pressedKeyboardKeys: Set<string> = new Set();

  private onNoteOnListeners: Set<NoteEventCallback> = new Set();
  private onNoteOffListeners: Set<NoteEventCallback> = new Set();
  private onPedalListeners: Set<PedalEventCallback> = new Set();
  private onDeviceChangeListeners: Set<DeviceChangeCallback> = new Set();

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

      // Automatically select first available input if none is selected
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

    // Check if active input is still valid
    if (this.activeInput) {
      const stillConnected = list.some(d => d.id === this.activeInput?.id);
      if (!stillConnected) {
        this.activeInput = null;
      }
    }

    // Auto-select first if currently null
    if (!this.activeInput && list.length > 0) {
      this.selectDevice(list[0].id);
    }

    this.notifyDeviceChange();
  }

  public selectDevice(deviceId: string): boolean {
    if (!this.midiAccess) return false;

    // Remove listener from previous input
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

  private handleMidiMessage(event: WebMidi.MIDIMessageEvent): void {
    const data = event.data;
    if (!data || data.length < 2) return;

    const status = data[0] & 0xf0;
    const noteOrControl = data[1];
    const velocityOrValue = data[2] || 0;

    switch (status) {
      case 0x90: // Note On
        if (velocityOrValue > 0) {
          const normVel = velocityOrValue / 127;
          this.notifyNoteOn(noteOrControl, normVel);
        } else {
          // Velocity 0 is note off
          this.notifyNoteOff(noteOrControl, 0);
        }
        break;

      case 0x80: // Note Off
        this.notifyNoteOff(noteOrControl, velocityOrValue / 127);
        break;

      case 0xb0: // Control Change
        // CC 64 = Sustain Pedal (Damper)
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
      // Ignore if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      // Spacebar for Sustain Pedal
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        this.isSustainPedalDown = true;
        this.notifyPedal(true, 127);
        return;
      }

      const key = e.key.toLowerCase();
      if (KEYBOARD_MAP[key] !== undefined && !this.pressedKeyboardKeys.has(key)) {
        this.pressedKeyboardKeys.add(key);
        const midi = KEYBOARD_MAP[key];
        this.notifyNoteOn(midi, 0.85);
      }
    });

    window.addEventListener('keyup', (e) => {
      // Spacebar release
      if (e.code === 'Space') {
        e.preventDefault();
        this.isSustainPedalDown = false;
        this.notifyPedal(false, 0);
        return;
      }

      const key = e.key.toLowerCase();
      if (this.pressedKeyboardKeys.has(key)) {
        this.pressedKeyboardKeys.delete(key);
        const midi = KEYBOARD_MAP[key];
        this.notifyNoteOff(midi, 0);
      }
    });
  }

  // Event Subscription methods
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
}

export const midiManager = new MidiManager();
