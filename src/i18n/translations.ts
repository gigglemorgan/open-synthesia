/**
 * translations.ts
 * Multi-language support (English & Turkish)
 */

export type Language = 'en' | 'tr';

export const translations = {
  en: {
    appTitle: 'OpenSynthesia',
    subtitle: 'v1.3 Minimal Studio',
    play: 'Play',
    pause: 'Pause',
    rewind: 'Rewind',
    listen: 'Listen',
    practiceWait: 'Wait Mode',
    practiceRhythm: 'Rhythm',
    handBoth: 'Both',
    handLeft: 'Left',
    handRight: 'Right',
    speed: 'Speed',
    zoom: 'Zoom',
    autoBpm: 'AUTO',
    bpm: 'BPM',
    pos: 'BAR',
    masterVol: 'Master',
    mute: 'Mute',
    unmute: 'Unmute',
    pedal: 'PEDAL',
    midi: 'MIDI',
    keys: 'Keys',
    converter: 'Convert',
    player: 'Player',
    library: 'Library',
    accuracy: 'ACCURACY',
    streak: 'STREAK',
    waitingPrompt: 'Waiting for key press...',
    
    // Key bindings modal
    keysTitle: 'Keyboard Controls & Keybindings',
    octaveShift: 'Octave Shift',
    octaveHelp: 'Press [ and ] to shift octaves on keyboard',
    showKeyLetters: 'Show letters on piano keys',
    resetKeys: 'Reset Defaults',
    spacePedalNote: 'Spacebar: Sustain Pedal (Hold to sustain notes)',
    octaveShortcuts: '[ / ]: Shift octave down / up',

    // Song selector modal
    libraryTitle: 'Song Library & MIDI Upload',
    uploadMidi: 'Drop or browse your .mid / .midi file',
    builtInSongs: 'Curated Songs & Benchmarks',
    notesCount: 'notes',

    // Converter modal
    converterTitle: 'Audio & MIDI Converter',
    midiToMp3Tab: 'MIDI ➔ MP3',
    mp3ToMidiTab: 'Audio ➔ MIDI',
    currentSong: 'Current Song',
    renderToMp3: 'Render to MP3',
    rendering: 'Rendering acoustic audio...',
    encoding: 'Encoding LAME MP3...',
    downloadMp3: 'Download MP3',
    openInPlayer: 'Open in Player',
    uploadCustomMidi: 'Or upload a different .mid file to convert',
    uploadAudioPrompt: 'Select MP3, WAV or OGG file to transcribe',
    transcribing: 'Analyzing frequencies & notes...',
    convertAudioToMidi: 'Extract Notes to MIDI',
    downloadMidi: 'Download .MID',
    openInStudio: 'Load into Studio & Play',

    // Audio player modal
    audioPlayerTitle: 'Audio Player & Monitor',
    uploadDifferentAudio: 'Listen to a different audio file',

    // Midi settings modal
    midiSettingsTitle: 'MIDI Devices & Pedal Status',
    availableInputs: 'Available MIDI Inputs',
    noMidiFound: 'No MIDI keyboard detected. Computer keyboard is active.',
    inputTest: 'Live Hardware Signal',
    lastNote: 'Last Note',
  },
  tr: {
    appTitle: 'OpenSynthesia',
    subtitle: 'v1.3 Sade Stüdyo',
    play: 'Çal',
    pause: 'Durdur',
    rewind: 'Başa Sar',
    listen: 'Dinle',
    practiceWait: 'Etüd (Bekle)',
    practiceRhythm: 'Ritim',
    handBoth: 'İki El',
    handLeft: 'Sol',
    handRight: 'Sağ',
    speed: 'Hız',
    zoom: 'Görüş',
    autoBpm: 'OTO',
    bpm: 'BPM',
    pos: 'ÖLÇÜ',
    masterVol: 'Ses',
    mute: 'Sessiz',
    unmute: 'Sesi Aç',
    pedal: 'PEDAL',
    midi: 'MIDI',
    keys: 'Tuşlar',
    converter: 'Dönüştür',
    player: 'Çalar',
    library: 'Eserler',
    accuracy: 'DOĞRULUK',
    streak: 'SERİ',
    waitingPrompt: 'Tuşa basılması bekleniyor...',

    // Key bindings modal
    keysTitle: 'Klavye Tuş Atamaları & Kontroller',
    octaveShift: 'Oktav Kaydırma',
    octaveHelp: 'Klavyeden [ ve ] tuşlarıyla oktavı kaydırabilirsiniz',
    showKeyLetters: 'Piyano tuşlarında harfleri göster',
    resetKeys: 'Varsayılana Sıfırla',
    spacePedalNote: 'Boşluk (Spacebar): Sustain Pedalı (Sesi uzatır)',
    octaveShortcuts: '[ / ]: Oktavı anında aşağı / yukarı kaydırır',

    // Song selector modal
    libraryTitle: 'Eser Kütüphanesi & MIDI Yükleme',
    uploadMidi: 'Kendi .mid dosyanızı sürükleyin veya seçin',
    builtInSongs: 'Hazır Eserler & Benchmark',
    notesCount: 'nota',

    // Converter modal
    converterTitle: 'Format Dönüştürücü (.mid ⇄ .mp3)',
    midiToMp3Tab: 'MIDI ➔ MP3',
    mp3ToMidiTab: 'Ses ➔ MIDI',
    currentSong: 'Aktif Eser',
    renderToMp3: 'MP3 Olarak Render Et',
    rendering: 'Akustik piyano kaydediliyor...',
    encoding: 'LAME MP3 kodlanıyor...',
    downloadMp3: 'MP3 İndir',
    openInPlayer: 'Çalarda Aç',
    uploadCustomMidi: 'Farklı bir .mid dosyası seçerek dönüştür',
    uploadAudioPrompt: 'MP3, WAV veya OGG ses dosyası seçin',
    transcribing: 'Spektrum taranıyor & notalar çıkarılıyor...',
    convertAudioToMidi: 'Notaları Çıkar ve MIDI Yap',
    downloadMidi: '.MID İndir',
    openInStudio: 'Stüdyoda Aç ve Çal',

    // Audio player modal
    audioPlayerTitle: 'Ses Monitörü & Çalar',
    uploadDifferentAudio: 'Harici bir ses dosyası seçip dinle',

    // Midi settings modal
    midiSettingsTitle: 'MIDI Aygıtı & Pedal Yönetimi',
    availableInputs: 'Bağlı MIDI Girişleri',
    noMidiFound: 'Bağlı MIDI klavye algılanmadı. Bilgisayar klavyesi devrede.',
    inputTest: 'Canlı Donanım Sinyali',
    lastNote: 'Son Nota',
  }
};
