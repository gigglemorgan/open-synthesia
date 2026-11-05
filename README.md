<div align="center">

# 🎹 OpenSynthesia (Open Piano Studio)

**Açık Kaynak, Hızlı, Akıcı Piyano Eğitimi, Şelale Görselleştirici & Format Dönüştürücü**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646cff?logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Web MIDI API](https://img.shields.io/badge/Web_MIDI_API-Supported-emerald)](#hardware-support)
[![Audio](https://img.shields.io/badge/Sound-Acoustic_Grand_Piano_HD-purple)](#audio-engine)

[Özellikler](#-özellikler) • [Hızlı Başlangıç](#-hızlı-başlangıç) • [Etüd ve Eğitim](#-etüd-ve-eğitim-modu) • [Dönüştürücüler](#-dönüştürücü-ve-dinleme-özelliği) • [GitHub'da Paylaşım](#-github-üzerinde-yayınlama)

---

</div>

## 🌟 Neden OpenSynthesia?

OpenSynthesia; Synthesia'nın en sevilen özelliklerini modern web teknolojileriyle birleştiren, tamamen tarayıcı üzerinde çalışan, hiçbir sunucu veya eklenti kurulumu gerektirmeyen, **açık kaynaklı ve ücretsiz** bir piyano stüdyosudur.

- ⚡ **Sıfır Kurulum, Ultra Hızlı:** Doğrudan tarayıcıda çalışır (Chrome, Edge, Brave, Opera vb.).
- 🎹 **60+ FPS Akıcı Şelale (Waterfall):** HTML5 Canvas tabanlı yüksek performanslı nota akışı.
- 🎓 **Etüd & Eğitim Odaklı:** Tuşa basana kadar bekleyen bekleme modu, el izolasyonu ve A-B döngüsü.
- 🎛️ **Donanım MIDI & Sustain Pedalı:** USB/Bluetooth MIDI klavyeniz ve CC 64 sustain pedalıyla tak-çalıştır.
- 🎼 **Gerçekçi Akustik Piyano Tınısı:** Konser kuyruklu piyano çoklu örnekleri ve rezonans simülasyonu.
- 🔄 **İki Yönlü Dönüştürücü:** `.mid` ➔ `.mp3` (akustik render) ve `.mp3` ➔ `.mid` (yapay zeka nota tespiti).

---

## ✨ Özellikler

### 1. 🎼 Synthesia Şelale Görselleştirici & 88 Tuşlu Klavye
- **Sol El ve Sağ El Renk Kodlaması:** Sol el için elektrik mavisi (`#3b82f6`), sağ el için zümrüt yeşili (`#10b981`).
- **Gerçekçi 88 Tuşlu Piyano:** Beyaz ve siyah tuşlar, basış derinliği, nota isimleri (C3, C4 vb.).
- **Vuruş Parçacık Efektleri:** Tuşa basıldığında yukarı doğru parlayan dinamik ışık patlamaları.
- **Ayarlanabilir Şelale Hızı:** 1.5 saniyeden 4.5 saniyeye kadar görünüm penceresi.

### 2. 🎓 Gelişmiş Etüd ve Eğitim Modu (Practice Mode)
- **⏳ Bekleme Modu (Wait for Note):** Nota vuruş çizgisine geldiğinde şarkı durur; doğru tuşa basana kadar bekler!
- **🧤 El Seçimi:** 
  - *Sadece Sağ El:* Sol eli bilgisayar çalar, siz sağ eli çalışırsınız.
  - *Sadece Sol El:* Sağ eli bilgisayar çalar, siz sol eli çalışırsınız.
  - *İki El:* Her iki elin notalarını da sizin çalmanız beklenir.
- **🔁 A-B Loop (Bölüm Tekrarı):** [A] başlangıç ve [B] bitiş noktaları belirleyerek zorlandığınız ölçüyü arka arkaya çalışın.
- **⏱️ Hız Kontrolü:** 0.5x, 0.75x, 1.0x, 1.25x, 1.5x hız seçenekleri.
- **🏆 Seri ve Doğruluk Skoru:** Hata yapmadan çalınan nota serisi (Streak) ve konfeti kutlamaları.

### 3. 🎛️ MIDI Klavye ve CC 64 Sustain Pedalı Desteği
- Web MIDI API ile USB veya Bluetooth üzerinden bağlanan tüm dijital piyanoları otomatik tanır.
- **Gerçek Sustain Pedalı (CC 64):** Pedala bastığınızda serbest kalan notalar tınlamaya devam eder, pedalı kaldırdığınızda doğal olarak sönümlenir.
- **Bilgisayar Klavyesi Desteği:** MIDI klavyesi olmayanlar için QWERTY tuşları + Boşluk (Spacebar) sustain pedalı olarak çalışır.

### 4. 🔄 Format Dönüştürücü (.mid ⇄ .mp3) & Müzik Çalar
- **MIDI ➔ MP3:** MIDI dosyasındaki notaları stüdyo kalitesinde akustik piyano motoruyla seslendirir ve `lamejs` ile doğrudan MP3 olarak kaydeder.
- **MP3 ➔ MIDI:** Herhangi bir piyano ses kaydını (MP3, WAV, OGG) frekans spektrumunda analiz ederek notalarını çıkarır ve `.mid` dosyası üretir.
- **🎧 Dahili Müzik Çalar:** Oluşturulan MP3'leri dinlemek için dalga formlu, hız kontrollü oynatıcı.

---

## 🚀 Hızlı Başlangıç

### Gereksinimler
- [Node.js](https://nodejs.org/) (v18 veya üzeri)
- npm veya yarn / pnpm

### Kurulum Adımları

```bash
# 1. Projeyi klonlayın
git clone https://github.com/gigglemorgan/open-synthesia.git
cd open-synthesia

# 2. Bağımlılıkları yükleyin
npm install

# 3. Geliştirme sunucusunu başlatın
npm run dev
```

Tarayıcınızda `http://localhost:3000` adresini açarak hemen kullanmaya başlayabilirsiniz!

---

## 🛠️ Proje Mimarisi

```
src/
├── audio/
│   └── PianoEngine.ts         # Akustik Grand Piano SoundFont + Sustain Pedalı rezonansı
├── midi/
│   ├── MidiManager.ts         # Web MIDI API, CC 64 sustain pedalı, bilgisayar klavyesi
│   ├── MidiParser.ts          # .mid dosyası çözümleme ve akıllı el ayrımı (sol/sağ)
│   └── MidiWriter.ts          # Notalardan standart .mid binary üretimi
├── converter/
│   ├── MidiToMp3.ts           # OfflineAudioContext + LAME MP3 kodlama
│   ├── AudioToMidi.ts         # Spektral analiz ile ses dosyasından MIDI çıkarma
│   └── mp3Encoder.ts          # LAME MP3 Float32 -> Int16 akış dönüştürücüsü
├── engine/
│   └── PracticeEngine.ts      # Bekleme modu (wait-for-key), loop ve doğruluk motoru
├── visualizer/
│   ├── SynthesiaCanvas.tsx    # 60+ FPS Canvas düşen nota şelalesi ve parçacıklar
│   ├── PianoKeyboard.tsx      # 88 tuşlu 3D interaktif piyano klavyesi
│   └── pianoLayout.ts         # 88 tuşun matematiksel konum hesabı
├── components/
│   ├── Navbar.tsx             # Üst çubuk, parça adı, donanım durumu
│   ├── PlaybackControls.tsx   # Oynat/Durdur, Zaman, Hız, Modlar, A-B Loop
│   ├── ConverterModal.tsx     # .mid ⇄ .mp3 çift yönlü dönüştürücü penceresi
│   ├── AudioPlayerModal.tsx   # Dahili müzik dinleme oynatıcısı
│   ├── SongSelectorModal.tsx  # Klasik eserler ve özel MIDI yükleyici
│   └── MidiSettingsModal.tsx  # MIDI cihazı ve pedal test paneli
├── data/
│   └── sampleSongs.ts         # Für Elise, Türk Marşı, Bach Prelude, Moonlight Sonata
└── types/
    └── index.ts               # Tip tanımları
```

---

## 📦 GitHub Üzerinde Yayınlama

Projeyi kendi GitHub hesabınızda paylaşmak için:

```bash
# Git deposunu GitHub'a bağlayın ve gönderin:
git remote add origin https://github.com/gigglemorgan/open-synthesia.git
git push -u origin main
```

### GitHub Pages ile Ücretsiz Canlıya Alma
1. `vite.config.ts` dosyasına `base: './'` ekleyin.
2. `npm run build` komutunu çalıştırın.
3. `dist` klasörünü GitHub Pages dalına veya gh-pages ile yayınlayın:
   ```bash
   npx gh-pages -d dist
   ```

---

## 📄 Lisans

Bu proje [MIT Lisansı](LICENSE) altında lisanslanmıştır. Özgürce çatallayabilir (fork), geliştirebilir ve paylaşabilirsiniz.
