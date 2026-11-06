/**
 * App.tsx
 * OpenSynthesia — Ultra-Lightweight Minimalist Piano Studio
 *
 * - Hardware Audio Clock: AudioContext.currentTime master synchronization (Zero Lag, Zero Drift)
 * - Acoustic Hammer Action: Mechanical keybed thump & felt snap physics
 * - Full MIDI Sustain: Automatic CC 64 sustain pedal from .mid files + Live user pedal override
 * - Canvas Piano Keyboard: 88 keys rendered on high-speed hardware 2D canvas with hammer dip
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  LoadedSong, 
  VisualNote, 
  PlaybackMode, 
  HandSelection, 
  PracticeStats, 
  MidiDevice, 
  ActiveNote 
} from './types';
import { SAMPLE_SONGS } from './data/sampleSongs';
import { pianoEngine } from './audio/PianoEngine';
import { midiManager } from './midi/MidiManager';
import { PracticeEngine } from './engine/PracticeEngine';
import { detectBpmFromNoteTimings } from './midi/MidiParser';

// Components
import { Navbar } from './components/Navbar';
import { PlaybackControls } from './components/PlaybackControls';
import { SynthesiaCanvas } from './visualizer/SynthesiaCanvas';
import { PianoKeyboard } from './visualizer/PianoKeyboard';
import { ConverterModal } from './components/ConverterModal';
import { AudioPlayerModal } from './components/AudioPlayerModal';
import { SongSelectorModal } from './components/SongSelectorModal';
import { MidiSettingsModal } from './components/MidiSettingsModal';
import { KeyBindingsModal } from './components/KeyBindingsModal';
import { Language } from './i18n/translations';

export const App: React.FC = () => {
  // Current Song
  const [currentSong, setCurrentSong] = useState<LoadedSong>(SAMPLE_SONGS[0]);

  // Playback & Practice State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [mode, setMode] = useState<PlaybackMode>('play');
  const [hand, setHand] = useState<HandSelection>('both');
  const [tempo, setTempo] = useState<number>(1.0);
  const [noteSpeed, setNoteSpeed] = useState<number>(2.5);
  const [volume, setVolume] = useState<number>(0.85);
  const [loopStart, setLoopStart] = useState<number | null>(null);
  const [loopEnd, setLoopEnd] = useState<number | null>(null);
  const [hammerAction, setHammerAction] = useState<boolean>(true);

  // Active Keys (Visual & Audio)
  const [activeNotes, setActiveNotes] = useState<Map<number, ActiveNote>>(new Map());
  const [waitingNotes, setWaitingNotes] = useState<VisualNote[]>([]);
  const [isWaiting, setIsWaiting] = useState<boolean>(false);
  const [showKeyBindings, setShowKeyBindings] = useState<boolean>(true);
  const [lang, setLang] = useState<Language>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('open_synthesia_lang') : null;
    return (saved === 'tr' || saved === 'en') ? saved : 'en';
  });

  const handleToggleLang = useCallback(() => {
    setLang((prev) => {
      const next = prev === 'en' ? 'tr' : 'en';
      if (typeof window !== 'undefined') {
        localStorage.setItem('open_synthesia_lang', next);
      }
      return next;
    });
  }, []);

  // Practice Stats
  const [practiceStats, setPracticeStats] = useState<PracticeStats>({
    notesTotal: currentSong.notes.length,
    notesHit: 0,
    notesMissed: 0,
    currentStreak: 0,
    maxStreak: 0,
    accuracy: 100,
  });

  // SoundFont status
  const [isSoundfontLoaded, setIsSoundfontLoaded] = useState<boolean>(false);
  const [, setSoundfontProgress] = useState<number>(0);

  // Hardware MIDI & Sustain (Both Live User Pedal and MIDI CC 64)
  const [midiDevices, setMidiDevices] = useState<MidiDevice[]>([]);
  const [activeMidiDevice, setActiveMidiDevice] = useState<MidiDevice | null>(null);
  const [sustainPedalActive, setSustainPedalActive] = useState<boolean>(false);

  // Modals
  const [isSongSelectorOpen, setIsSongSelectorOpen] = useState<boolean>(false);
  const [isConverterOpen, setIsConverterOpen] = useState<boolean>(false);
  const [isAudioPlayerOpen, setIsAudioPlayerOpen] = useState<boolean>(false);
  const [isMidiSettingsOpen, setIsMidiSettingsOpen] = useState<boolean>(false);
  const [isKeyBindingsOpen, setIsKeyBindingsOpen] = useState<boolean>(false);

  // Audio player modal URL & title
  const [playerAudioUrl, setPlayerAudioUrl] = useState<string | null>(null);
  const [playerAudioTitle, setPlayerAudioTitle] = useState<string>('');

  // === REFS: Master Hardware Clock & Engine State ===
  const practiceEngineRef = useRef<PracticeEngine>(new PracticeEngine(currentSong.notes));
  const isPlayingRef = useRef<boolean>(isPlaying);
  const currentTimeRef = useRef<number>(0);
  const startAudioTimeRef = useRef<number>(0);
  const startSongTimeRef = useRef<number>(0);
  const scheduledNoteIdsRef = useRef<Set<string>>(new Set());
  const tempoRef = useRef<number>(tempo);
  const audioCursorRef = useRef<number>(0);
  const visualCursorRef = useRef<number>(0);
  const currentSongRef = useRef<LoadedSong>(currentSong);

  // Sustain Pedal Refs (Tracks live user pedal vs MIDI CC64 pedal)
  const userPedalHeldRef = useRef<boolean>(false);
  const midiPedalActiveRef = useRef<boolean>(false);
  const sustainPedalActiveRef = useRef<boolean>(false);

  // Throttle timers for React state updates
  const lastUIUpdateRef = useRef<number>(0);
  const lastActiveNotesUpdateRef = useRef<number>(0);

  // Mutable active notes buffer
  const activeNotesBufRef = useRef<Map<number, ActiveNote>>(new Map());
  const userKeysRef = useRef<Map<number, ActiveNote>>(new Map());

  isPlayingRef.current = isPlaying;
  tempoRef.current = tempo;
  currentSongRef.current = currentSong;

  // Initialize Audio & Soundfont & MIDI
  useEffect(() => {
    pianoEngine.setProgressCallback((pct) => {
      setSoundfontProgress(pct);
      if (pct >= 100) {
        setIsSoundfontLoaded(true);
      }
    });

    pianoEngine.loadSoundfont().then(() => {
      setIsSoundfontLoaded(pianoEngine.isLoaded());
    });

    midiManager.initMidi().then(() => {
      setMidiDevices(midiManager.getDevices());
      setActiveMidiDevice(midiManager.getActiveDevice());
    });

    const unsubDev = midiManager.onDeviceChange((devs, active) => {
      setMidiDevices([...devs]);
      setActiveMidiDevice(active);
    });

    const engine = practiceEngineRef.current;
    engine.subscribeStats((stats) => setPracticeStats(stats));
    engine.subscribeWaiting((waiting, notes) => {
      setIsWaiting(waiting);
      setWaitingNotes(notes);
    });
    engine.subscribeLoopRestart(() => {
      audioCursorRef.current = 0;
      visualCursorRef.current = 0;
      scheduledNoteIdsRef.current.clear();
      pianoEngine.stopAllNotes();
      startAudioTimeRef.current = pianoEngine.getCurrentTime();
      startSongTimeRef.current = loopStart || 0;
    });

    return () => {
      unsubDev();
    };
  }, [loopStart]);

  // Update Practice Engine when Song, Mode, Hand, Tempo or Loop changes
  useEffect(() => {
    const engine = practiceEngineRef.current;
    engine.setNotes(currentSong.notes);
    engine.setConfig({
      mode,
      hand,
      tempoMultiplier: tempo,
      loopStart,
      loopEnd,
    });
    scheduledNoteIdsRef.current.clear();
    setWaitingNotes([]);
    setIsWaiting(false);
  }, [currentSong, mode, hand, tempo, loopStart, loopEnd]);

  // Handle Hardware / User MIDI Input & Live Sustain Pedal
  useEffect(() => {
    const unsubNoteOn = midiManager.onNoteOn((midi, velocity) => {
      pianoEngine.playNote(midi, velocity);
      practiceEngineRef.current.handleUserNotePress(midi);

      const note: ActiveNote = { midi, velocity, source: 'user' };
      userKeysRef.current.set(midi, note);
      setActiveNotes((prev) => {
        const next = new Map(prev);
        next.set(midi, note);
        return next;
      });
    });

    const unsubNoteOff = midiManager.onNoteOff((midi) => {
      pianoEngine.stopNote(midi);
      userKeysRef.current.delete(midi);
      setActiveNotes((prev) => {
        const next = new Map(prev);
        if (next.get(midi)?.source === 'user') {
          next.delete(midi);
        }
        return next;
      });
    });

    const unsubPedal = midiManager.onPedal((isDown) => {
      userPedalHeldRef.current = isDown;
      const effective = isDown || midiPedalActiveRef.current;
      sustainPedalActiveRef.current = effective;
      setSustainPedalActive(effective);
      pianoEngine.setSustainPedal(effective);
    });

    return () => {
      unsubNoteOn();
      unsubNoteOff();
      unsubPedal();
    };
  }, []);

  // === HARDWARE-SYNCHRONIZED MASTER PLAYBACK LOOP ===
  useEffect(() => {
    let animId: number;
    const LOOKAHEAD_SEC = 0.25;
    const UI_UPDATE_INTERVAL = 66; // 15 Hz for scrubber UI
    const ACTIVE_NOTES_INTERVAL = 35; // ~28 Hz for keyboard canvas

    const loop = (timestamp: number) => {
      if (isPlayingRef.current) {
        const engine = practiceEngineRef.current;
        const nowAudioTime = pianoEngine.getCurrentTime();
        const currentTempo = tempoRef.current;
        const song = currentSongRef.current;

        // MASTER CLOCK: exact song time derived directly from hardware audio quartz clock
        const elapsedAudio = Math.max(0, nowAudioTime - startAudioTimeRef.current);
        const calculatedSongTime = startSongTimeRef.current + (elapsedAudio * currentTempo);

        const result = engine.update(calculatedSongTime, 0);

        if (!result.shouldAdvance) {
          startAudioTimeRef.current = nowAudioTime;
          startSongTimeRef.current = currentTimeRef.current;
        } else {
          const newTime = calculatedSongTime;
          currentTimeRef.current = newTime;

          const engineConfig = engine.getConfig();
          const scheduledIds = scheduledNoteIdsRef.current;
          const maxAudioScheduleTime = nowAudioTime + LOOKAHEAD_SEC;

          // 1. MIDI CC 64 Sustain Pedal Synchronization:
          let midiPedalDown = false;
          if (song.sustainEvents && song.sustainEvents.length > 0) {
            for (let i = 0; i < song.sustainEvents.length; i++) {
              if (song.sustainEvents[i].time <= newTime) {
                midiPedalDown = song.sustainEvents[i].isDown;
              } else {
                break;
              }
            }
          }
          midiPedalActiveRef.current = midiPedalDown;
          const effectivePedal = userPedalHeldRef.current || midiPedalDown;
          if (effectivePedal !== sustainPedalActiveRef.current) {
            sustainPedalActiveRef.current = effectivePedal;
            setSustainPedalActive(effectivePedal);
            pianoEngine.setSustainPedal(effectivePedal);
          }

          // 2. Hardware Lookahead Audio Scheduling:
          while (
            audioCursorRef.current < song.notes.length &&
            song.notes[audioCursorRef.current].time < newTime - 0.1
          ) {
            audioCursorRef.current++;
          }

          for (let i = audioCursorRef.current; i < song.notes.length; i++) {
            const n = song.notes[i];
            const noteAudioTime = startAudioTimeRef.current + ((n.time - startSongTimeRef.current) / currentTempo);

            if (noteAudioTime > maxAudioScheduleTime) break;

            if (!scheduledIds.has(n.id)) {
              const isTargetForUser = 
                engineConfig.mode === 'practice-wait' &&
                ((engineConfig.hand === 'both') ||
                 (engineConfig.hand === 'right' && n.hand === 'right') ||
                 (engineConfig.hand === 'left' && n.hand === 'left'));

              if (!isTargetForUser) {
                scheduledIds.add(n.id);
                pianoEngine.scheduleNote(n.midi, n.velocity, noteAudioTime, n.duration / currentTempo);
              }
            }
          }

          // 3. Visual active key tracking:
          while (
            visualCursorRef.current < song.notes.length &&
            song.notes[visualCursorRef.current].time + song.notes[visualCursorRef.current].duration < newTime - 0.05
          ) {
            visualCursorRef.current++;
          }

          const buf = activeNotesBufRef.current;
          buf.clear();
          for (let i = visualCursorRef.current; i < song.notes.length; i++) {
            const n = song.notes[i];
            if (n.time > newTime) break;
            if (n.time <= newTime && n.time + n.duration >= newTime) {
              buf.set(n.midi, {
                midi: n.midi,
                velocity: n.velocity,
                source: 'playback',
                hand: n.hand,
              });
            }
          }

          // Merge live user keys
          userKeysRef.current.forEach((v, k) => buf.set(k, v));

          if (timestamp - lastActiveNotesUpdateRef.current > ACTIVE_NOTES_INTERVAL) {
            lastActiveNotesUpdateRef.current = timestamp;
            setActiveNotes(new Map(buf));
          }

          if (timestamp - lastUIUpdateRef.current > UI_UPDATE_INTERVAL) {
            lastUIUpdateRef.current = timestamp;
            setCurrentTime(newTime);
          }

          // Song End
          if (newTime >= song.metadata.duration) {
            setIsPlaying(false);
            setCurrentTime(newTime);
            pianoEngine.stopAllNotes();
          }
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(animId); };
  }, []);

  // Playback Control Handlers
  const handlePlayPause = useCallback(async () => {
    await pianoEngine.initAudio();

    if (isPlaying) {
      setIsPlaying(false);
      pianoEngine.stopAllNotes();
      scheduledNoteIdsRef.current.clear();
    } else {
      if (currentTimeRef.current >= currentSongRef.current.metadata.duration) {
        currentTimeRef.current = 0;
        setCurrentTime(0);
        scheduledNoteIdsRef.current.clear();
        audioCursorRef.current = 0;
        visualCursorRef.current = 0;
        practiceEngineRef.current.resetStats();
      }
      const nowAudio = pianoEngine.getCurrentTime();
      startAudioTimeRef.current = nowAudio;
      startSongTimeRef.current = currentTimeRef.current;
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleRewind = useCallback(() => {
    currentTimeRef.current = 0;
    setCurrentTime(0);
    const nowAudio = pianoEngine.getCurrentTime();
    startAudioTimeRef.current = nowAudio;
    startSongTimeRef.current = 0;
    audioCursorRef.current = 0;
    visualCursorRef.current = 0;
    scheduledNoteIdsRef.current.clear();
    pianoEngine.stopAllNotes();
    midiPedalActiveRef.current = false;
    const effective = userPedalHeldRef.current;
    sustainPedalActiveRef.current = effective;
    setSustainPedalActive(effective);
    pianoEngine.setSustainPedal(effective);
    practiceEngineRef.current.resetStats();
  }, []);

  const handleSeek = useCallback((time: number) => {
    currentTimeRef.current = time;
    setCurrentTime(time);
    const nowAudio = pianoEngine.getCurrentTime();
    startAudioTimeRef.current = nowAudio;
    startSongTimeRef.current = time;

    const song = currentSongRef.current;
    let idx = 0;
    for (let i = 0; i < song.notes.length; i++) {
      if (song.notes[i].time >= time - 0.1) {
        idx = i;
        break;
      }
    }
    audioCursorRef.current = idx;
    visualCursorRef.current = idx;
    scheduledNoteIdsRef.current.clear();
    pianoEngine.stopAllNotes();
  }, []);

  const handleTempoChange = useCallback((newTempo: number) => {
    const nowAudio = pianoEngine.getCurrentTime();
    startAudioTimeRef.current = nowAudio;
    startSongTimeRef.current = currentTimeRef.current;
    setTempo(newTempo);
    tempoRef.current = newTempo;
    scheduledNoteIdsRef.current.clear();
    pianoEngine.stopAllNotes();

    let idx = 0;
    for (let i = 0; i < currentSongRef.current.notes.length; i++) {
      if (currentSongRef.current.notes[i].time >= currentTimeRef.current - 0.1) {
        idx = i;
        break;
      }
    }
    audioCursorRef.current = idx;
  }, []);

  const handleToggleHammerAction = useCallback(() => {
    setHammerAction(prev => {
      const next = !prev;
      pianoEngine.setHammerAction(next);
      return next;
    });
  }, []);

  const handleVolumeChange = useCallback((newVol: number) => {
    setVolume(newVol);
    pianoEngine.setMasterVolume(newVol);
  }, []);

  const handleAutoDetectBpm = useCallback(() => {
    const song = currentSongRef.current;
    if (song.notes.length < 4) return;
    const detected = detectBpmFromNoteTimings(song.notes.map(n => n.time));
    setCurrentSong((prev) => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        bpm: detected,
      }
    }));
  }, []);

  // On-screen Keyboard click
  const handleScreenNotePress = useCallback((midi: number) => {
    pianoEngine.playNote(midi, 0.85);
    practiceEngineRef.current.handleUserNotePress(midi);
    const note: ActiveNote = { midi, velocity: 0.85, source: 'user' };
    userKeysRef.current.set(midi, note);
    setActiveNotes((prev) => {
      const next = new Map(prev);
      next.set(midi, note);
      return next;
    });
  }, []);

  const handleScreenNoteRelease = useCallback((midi: number) => {
    pianoEngine.stopNote(midi);
    userKeysRef.current.delete(midi);
    setActiveNotes((prev) => {
      const next = new Map(prev);
      if (next.get(midi)?.source === 'user') {
        next.delete(midi);
      }
      return next;
    });
  }, []);

  // Song Select
  const handleSelectSong = (song: LoadedSong) => {
    pianoEngine.stopAllNotes();
    scheduledNoteIdsRef.current.clear();
    audioCursorRef.current = 0;
    visualCursorRef.current = 0;
    setCurrentSong(song);
    currentSongRef.current = song;
    currentTimeRef.current = 0;
    setCurrentTime(0);
    const nowAudio = pianoEngine.getCurrentTime();
    startAudioTimeRef.current = nowAudio;
    startSongTimeRef.current = 0;
    midiPedalActiveRef.current = false;
    const effective = userPedalHeldRef.current;
    sustainPedalActiveRef.current = effective;
    setSustainPedalActive(effective);
    pianoEngine.setSustainPedal(effective);
    practiceEngineRef.current.resetStats();
  };

  const handleOpenAudioInPlayer = (url: string, title: string) => {
    setPlayerAudioUrl(url);
    setPlayerAudioTitle(title);
    setIsAudioPlayerOpen(true);
  };

  const activeMidiSet = React.useMemo(() => {
    return new Set(activeNotes.keys());
  }, [activeNotes]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#07080a] font-sans text-zinc-100">
      {/* 1. Ultra-Sade Üst Konsol */}
      <Navbar
        songTitle={currentSong.metadata.title}
        activeDevice={activeMidiDevice}
        sustainPedalActive={sustainPedalActive}
        hammerActionEnabled={hammerAction}
        practiceStats={practiceStats}
        isSoundfontLoaded={isSoundfontLoaded}
        lang={lang}
        onToggleHammerAction={handleToggleHammerAction}
        onToggleLang={handleToggleLang}
        onOpenSongSelector={() => setIsSongSelectorOpen(true)}
        onOpenConverter={() => setIsConverterOpen(true)}
        onOpenAudioPlayer={() => setIsAudioPlayerOpen(true)}
        onOpenMidiSettings={() => setIsMidiSettingsOpen(true)}
        onOpenKeyBindings={() => setIsKeyBindingsOpen(true)}
      />

      {/* 2. Synthesia Falling Notes Şelalesi */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <SynthesiaCanvas
          notes={currentSong.notes}
          currentTimeRef={currentTimeRef}
          noteSpeed={noteSpeed}
          isWaiting={isWaiting}
          waitingNotes={waitingNotes}
          handSelection={hand}
          activeMidiSet={activeMidiSet}
        />

        {/* 3. 88 Tuşlu Çekiç Aksiyonlu Piyano Klavyesi */}
        <PianoKeyboard
          activeNotes={activeNotes}
          waitingNotes={waitingNotes}
          onNotePress={handleScreenNotePress}
          onNoteRelease={handleScreenNoteRelease}
          showLabels={true}
          showKeyBindings={showKeyBindings}
          sustainPedalActive={sustainPedalActive}
          hammerActionEnabled={hammerAction}
        />
      </main>

      {/* 4. Alt DAW Transport Konsolu */}
      <PlaybackControls
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={currentSong.metadata.duration}
        bpm={currentSong.metadata.bpm}
        mode={mode}
        hand={hand}
        tempo={tempo}
        noteSpeed={noteSpeed}
        loopStart={loopStart}
        loopEnd={loopEnd}
        volume={volume}
        lang={lang}
        onVolumeChange={handleVolumeChange}
        onPlayPause={handlePlayPause}
        onRewind={handleRewind}
        onSeek={handleSeek}
        onModeChange={setMode}
        onHandChange={setHand}
        onTempoChange={handleTempoChange}
        onNoteSpeedChange={setNoteSpeed}
        onSetLoopA={() => setLoopStart(currentTimeRef.current)}
        onSetLoopB={() => setLoopEnd(currentTimeRef.current)}
        onClearLoop={() => { setLoopStart(null); setLoopEnd(null); }}
        onAutoDetectBpm={handleAutoDetectBpm}
      />

      {/* MODALLER */}
      <ConverterModal
        isOpen={isConverterOpen}
        onClose={() => setIsConverterOpen(false)}
        currentSong={currentSong}
        onLoadSongIntoStudio={handleSelectSong}
        onOpenAudioInPlayer={handleOpenAudioInPlayer}
      />

      <AudioPlayerModal
        isOpen={isAudioPlayerOpen}
        onClose={() => setIsAudioPlayerOpen(false)}
        audioUrl={playerAudioUrl}
        audioTitle={playerAudioTitle}
      />

      <SongSelectorModal
        isOpen={isSongSelectorOpen}
        onClose={() => setIsSongSelectorOpen(false)}
        currentTitle={currentSong.metadata.title}
        onSelectSong={handleSelectSong}
        lang={lang}
      />

      <MidiSettingsModal
        isOpen={isMidiSettingsOpen}
        onClose={() => setIsMidiSettingsOpen(false)}
        devices={midiDevices}
        activeDevice={activeMidiDevice}
        onSelectDevice={(id) => midiManager.selectDevice(id)}
        sustainPedalActive={sustainPedalActive}
      />

      <KeyBindingsModal
        isOpen={isKeyBindingsOpen}
        onClose={() => setIsKeyBindingsOpen(false)}
        showKeyBindings={showKeyBindings}
        onToggleShowKeyBindings={setShowKeyBindings}
        lang={lang}
      />
    </div>
  );
};
