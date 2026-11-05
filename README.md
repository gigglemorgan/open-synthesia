<div align="center">

# 🎹 OpenSynthesia (Open Piano Studio)

**Open-source, ultra-fast, featherweight piano visualizer, study & practice studio, and audio converter.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646cff?logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Web MIDI API](https://img.shields.io/badge/Web_MIDI-Plug_%26_Play-emerald)](#hardware-support)
[![Sound](https://img.shields.io/badge/Audio-Yamaha_C5_Grand_Piano_HD-purple)](#audio-engine)

[English](#-english) • [Türkçe](#-türkçe) • [Quickstart](#-quickstart) • [Features](#-features) • [License](#-license)

---

</div>

## 🌐 English

**OpenSynthesia** is an open-source, zero-dependency, ultra-lightweight web piano studio designed for practicing, visualizing falling notes (Synthesia style), connecting hardware MIDI keyboards with CC 64 sustain pedals, and converting MIDI to authentic MP3 audio and vice-versa.

### 🌟 Key Highlights

- ⚡ **Zero Installation:** Runs entirely inside modern web browsers (Chrome, Edge, Brave, Opera, Safari) via Web Audio & Web MIDI APIs.
- 🎹 **60 / 120 FPS Falling Notes Visualizer:** Powered by high-speed HTML5 Canvas with **$O(\log N)$ binary search** viewport rendering. Easily handles heavy pieces like **Rush E** and Black MIDI with tens of thousands of notes without dropping a single frame.
- 🎓 **Smart Practice & Study Modes:**
  - **Wait Mode:** Falling notes pause right at the hit line until you press the exact required keys on your keyboard or piano.
  - **Hand Isolation:** Practice Left Hand, Right Hand, or Both Hands independently (with computer auto-playing the accompaniment).
  - **A-B Loop:** Set repeat start and end markers to loop difficult measures.
  - **Speed & Tempo Scaling:** Practice at 50%, 75%, 100%, 125%, 150% speed.
- 🎼 **Authentic Yamaha C5 Grand Piano Audio:**
  - Real 48kHz high-resolution acoustic multi-samples from an authentic Yamaha C5 Concert Grand Piano (Salamander Grand Piano).
  - True damper felt releases, string resonance, and CC 64 sustain pedal simulation.
  - **Studio Anti-Clipping Limiter & Analog Tanh Soft-Clipper:** Guarantees zero distortion or popping even when all 88 keys are pressed simultaneously.
  - **Stutter-Free Lookahead Scheduling:** Hardware Web Audio clock lookahead scheduling for liquid-smooth note transitions without micro-stutters.
- 🎛️ **Full Hardware MIDI & Computer Keyboard Support:**
  - Plug-and-play USB & Bluetooth MIDI keyboards (Yamaha, Roland, Casio, Kawai, Alesis, Korg, etc.).
  - Realistic Damper / Sustain Pedal (CC 64).
  - Computer Keyboard Piano: 2 full octaves with letter key badges (`Q`, `W`, `E`, `2`, `3`...) displayed right on the piano keys.
  - Quick Octave Shifting: Press `[` and `]` to shift octaves on the fly.
- 🔄 **Bidirectional Converter Suite & Player:**
  - **MIDI ➔ MP3:** Renders MIDI files using the authentic Yamaha C5 sound engine into pure 192kbps LAME MP3s entirely inside the browser.
  - **Audio ➔ MIDI:** Performs spectral pitch detection on MP3 / WAV / OGG files to extract piano notes and generate standard `.mid` files.
  - **Built-in Audio Player:** Integrated audio monitor with visual spectrum, loop, and speed controls.
- 🌍 **Bilingual Support (English & Türkçe):** One-click language switch with persistent user preferences.

---

## 🚀 Quickstart

```bash
# 1. Clone repository
git clone https://github.com/gigglemorgan/open-synthesia.git
cd open-synthesia

# 2. Install dependencies
npm install

# 3. Start local studio
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## ⌨️ Controls & Shortcuts

| Action | Shortcut |
| :--- | :--- |
| **Play / Pause** | `Space` (when not playing keyboard) |
| **Sustain Pedal** | `Spacebar` (hold while playing keys) |
| **Octave Down** | `[` |
| **Octave Up** | `]` |
| **White Keys** | `Z, X, C, V, B, N, M` (Lower Octave) / `Q, W, E, R, T, Y, U, I, O, P` (Middle & Upper) |
| **Black Keys** | `S, D, G, H, J` (Lower Octave) / `2, 3, 5, 6, 7, 9, 0` (Upper Octave) |

---

## 🇹🇷 Türkçe

OpenSynthesia; Synthesia'nın en sevilen özelliklerini modern, ultra hafif ve sade web teknolojileriyle birleştiren, tamamen tarayıcı üzerinde çalışan, hiçbir sunucu veya eklenti kurulumu gerektirmeyen **açık kaynaklı ve ücretsiz** bir piyano stüdyosudur.

### 🌟 Öne Çıkan Özellikler

- ⚡ **Sıfır Kurulum, Ultra Hızlı:** Doğrudan tarayıcıda çalışır.
- 🎹 **60+ FPS İkili Arama Şelale Motoru:** Rush E ve 50.000+ notalı Black MIDI şarkılarda bile sıfır donma.
- 🎓 **Etüd & Eğitim:** Bekleme modu (tuşa basana kadar bekler), el ayrımı (Sol / Sağ / İki El), A-B ölçü döngüsü.
- 🎼 **Gerçek Yamaha C5 Grand Piano Sesleri:** Gerçek kuyruklu piyano çoklu örnekleri, keçe damper ve CC 64 sustain pedalı.
- 🎛️ **Donanım MIDI & Klavye:** USB/Bluetooth dijital piyanolar, tuş harf rozetleri ve `[` / `]` ile oktav kaydırma.
- 🔄 **Format Dönüştürücü:** `.mid` ➔ `.mp3` (akustik piyano render) ve `.mp3` ➔ `.mid` (spektral nota çıkarma).

---

## 🛠️ Architecture

```
src/
├── audio/
│   └── PianoEngine.ts         # Yamaha C5 Salamander multi-sampler, anti-clip limiter, hardware lookahead
├── midi/
│   ├── MidiManager.ts         # Web MIDI API, CC 64 sustain pedal, keyboard bindings & octave shifts
│   ├── MidiParser.ts          # .mid parser, auto-BPM IOI histogram detector, smart hand splitting
│   └── MidiWriter.ts          # Generates standard binary .mid files
├── converter/
│   ├── MidiToMp3.ts           # OfflineAudioContext + LAME MP3 client-side encoder
│   ├── AudioToMidi.ts         # Spectral pitch detection & polyphonic transcription
│   └── mp3Encoder.ts          # Float32 to Int16 LAME MP3 stream encoder
├── engine/
│   └── PracticeEngine.ts      # Wait-for-note logic, streak, accuracy scoring & A-B looping
├── visualizer/
│   ├── SynthesiaCanvas.tsx    # O(log N) binary search waterfall canvas & particle manager
│   ├── PianoKeyboard.tsx      # 88-key interactive keyboard with keybinding letter badges
│   └── pianoLayout.ts         # Mathematical 88-key piano geometry
├── components/
│   ├── Navbar.tsx             # Featherweight top console with language toggle (TR/EN)
│   ├── PlaybackControls.tsx   # Minimalist transport bar, scrub timeline, volume & modes
│   ├── KeyBindingsModal.tsx   # Keyboard keymapping & octave configuration
│   ├── ConverterModal.tsx     # .mid ⇄ .mp3 converter modal
│   ├── AudioPlayerModal.tsx   # Integrated audio listening monitor
│   ├── SongSelectorModal.tsx  # Rush E, classical songs & custom MIDI file loader
│   └── MidiSettingsModal.tsx  # MIDI hardware input & pedal test panel
├── i18n/
│   └── translations.ts        # English & Turkish localization
└── types/
    └── index.ts               # Shared TypeScript data models
```

---



---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
Feel free to fork, customize, and contribute!
