/**
 * App.tsx
 * OpenSynthesia - Ana Stüdyo & Uygulama Koordinatörü
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
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

  // Active Keys (Visual & Audio)
  const [activeNotes, setActiveNotes] = useState<Map<number, ActiveNote>>(new Map());
  const [waitingNotes, setWaitingNotes] = useState<VisualNote[]>([]);
  const [isWaiting, setIsWaiting] = useState<boolean>(false);

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
  const [soundfontProgress, setSoundfontProgress] = useState<number>(0);

  // Hardware MIDI & Sustain
  const [midiDevices, setMidiDevices] = useState<MidiDevice[]>([]);
  const [activeMidiDevice, setActiveMidiDevice] = useState<MidiDevice | null>(null);
  const [sustainPedalActive, setSustainPedalActive] = useState<boolean>(false);

  // Modals
  const [isSongSelectorOpen, setIsSongSelectorOpen] = useState<boolean>(false);
  const [isConverterOpen, setIsConverterOpen] = useState<boolean>(false);
  const [isAudioPlayerOpen, setIsAudioPlayerOpen] = useState<boolean>(false);
  const [isMidiSettingsOpen, setIsMidiSettingsOpen] = useState<boolean>(false);

  // Audio player modal URL & title
  const [playerAudioUrl, setPlayerAudioUrl] = useState<string | null>(null);
  const [playerAudioTitle, setPlayerAudioTitle] = useState<string>('');

  // Refs for animation loop
  const practiceEngineRef = useRef<PracticeEngine>(new PracticeEngine(currentSong.notes));
  const isPlayingRef = useRef<boolean>(isPlaying);
  const currentTimeRef = useRef<number>(currentTime);
  const playedNoteIdsRef = useRef<Set<string>>(new Set());
  const lastFrameTimeRef = useRef<number>(0);

  isPlayingRef.current = isPlaying;
  currentTimeRef.current = currentTime;

  // Initialize Audio & Soundfont & MIDI
  useEffect(() => {
    // Soundfont loading progress
    pianoEngine.setProgressCallback((pct) => {
      setSoundfontProgress(pct);
      if (pct >= 100) {
        setIsSoundfontLoaded(true);
      }
    });

    // Start background soundfont loading
    pianoEngine.loadSoundfont().then(() => {
      setIsSoundfontLoaded(pianoEngine.isLoaded());
    });

    // Initialize Web MIDI API
    midiManager.initMidi().then(() => {
      setMidiDevices(midiManager.getDevices());
      setActiveMidiDevice(midiManager.getActiveDevice());
    });

    // MIDI device changes
    const unsubDev = midiManager.onDeviceChange((devs, active) => {
      setMidiDevices([...devs]);
      setActiveMidiDevice(active);
    });

    // Practice engine stats & waiting subscriptions
    const engine = practiceEngineRef.current;
    engine.subscribeStats((stats) => setPracticeStats(stats));
    engine.subscribeWaiting((waiting, notes) => {
      setIsWaiting(waiting);
      setWaitingNotes(notes);
    });
    engine.subscribeLoopRestart(() => {
      playedNoteIdsRef.current.clear();
      pianoEngine.stopAllNotes();
    });

    return () => {
      unsubDev();
    };
  }, []);

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
    playedNoteIdsRef.current.clear();
    setWaitingNotes([]);
    setIsWaiting(false);
  }, [currentSong, mode, hand, tempo, loopStart, loopEnd]);

  // Handle Hardware / User MIDI Input
  useEffect(() => {
    // Hardware MIDI Note On
    const unsubNoteOn = midiManager.onNoteOn((midi, velocity) => {
      pianoEngine.playNote(midi, velocity);

      // Check practice engine
      practiceEngineRef.current.handleUserNotePress(midi);

      // Visual keyboard highlight
      setActiveNotes((prev) => {
        const next = new Map(prev);
        next.set(midi, { midi, velocity, source: 'user' });
        return next;
      });
    });

    // Hardware MIDI Note Off
    const unsubNoteOff = midiManager.onNoteOff((midi) => {
      pianoEngine.stopNote(midi);

      setActiveNotes((prev) => {
        const next = new Map(prev);
        if (next.get(midi)?.source === 'user') {
          next.delete(midi);
        }
        return next;
      });
    });

    // Hardware Sustain Pedal (CC 64)
    const unsubPedal = midiManager.onPedal((isDown) => {
      setSustainPedalActive(isDown);
      pianoEngine.setSustainPedal(isDown);
    });

    return () => {
      unsubNoteOn();
      unsubNoteOff();
      unsubPedal();
    };
  }, []);

  // Trigger high streak celebration
  useEffect(() => {
    if (practiceStats.currentStreak > 0 && practiceStats.currentStreak % 25 === 0) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });
    }
  }, [practiceStats.currentStreak]);

  // Master Animation & Playback Loop
  useEffect(() => {
    let animId: number;

    const loop = (timestamp: number) => {
      if (!lastFrameTimeRef.current) lastFrameTimeRef.current = timestamp;
      const dt = Math.min(0.1, (timestamp - lastFrameTimeRef.current) / 1000);
      lastFrameTimeRef.current = timestamp;

      if (isPlayingRef.current) {
        const engine = practiceEngineRef.current;
        const result = engine.update(currentTimeRef.current, dt);

        if (result.shouldAdvance) {
          const newTime = result.nextTime;
          currentTimeRef.current = newTime;
          setCurrentTime(newTime);

          // Trigger Notes that crossed newTime
          const currentT = newTime;
          const engineConfig = engine.getConfig();

          const activeVoices = new Map<number, ActiveNote>();

          currentSong.notes.forEach((n) => {
            const isTargetForUser = 
              engineConfig.mode === 'practice-wait' &&
              ((engineConfig.hand === 'both') ||
               (engineConfig.hand === 'right' && n.hand === 'right') ||
               (engineConfig.hand === 'left' && n.hand === 'left'));

            // If note should play (either normal play, or computer plays opposite hand)
            if (!isTargetForUser) {
              if (n.time <= currentT && n.time + n.duration >= currentT) {
                activeVoices.set(n.midi, {
                  midi: n.midi,
                  velocity: n.velocity,
                  source: 'playback',
                  hand: n.hand,
                });

                if (!playedNoteIdsRef.current.has(n.id) && Math.abs(currentT - n.time) < 0.1) {
                  playedNoteIdsRef.current.add(n.id);
                  pianoEngine.playNote(n.midi, n.velocity);
                }
              }
            }
          });

          // Retain any user active notes
          setActiveNotes((prev) => {
            const merged = new Map(activeVoices);
            prev.forEach((val, key) => {
              if (val.source === 'user') {
                merged.set(key, val);
              }
            });
            return merged;
          });

          // Check End of Song
          if (newTime >= currentSong.metadata.duration) {
            setIsPlaying(false);
            pianoEngine.stopAllNotes();
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          }
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [currentSong]);

  // Playback Control Handlers
  const handlePlayPause = useCallback(async () => {
    await pianoEngine.initAudio();

    if (isPlaying) {
      setIsPlaying(false);
      pianoEngine.stopAllNotes();
    } else {
      if (currentTime >= currentSong.metadata.duration) {
        setCurrentTime(0);
        currentTimeRef.current = 0;
        playedNoteIdsRef.current.clear();
        practiceEngineRef.current.resetStats();
      }
      setIsPlaying(true);
    }
  }, [isPlaying, currentTime, currentSong]);

  const handleRewind = useCallback(() => {
    setCurrentTime(0);
    currentTimeRef.current = 0;
    playedNoteIdsRef.current.clear();
    pianoEngine.stopAllNotes();
    practiceEngineRef.current.resetStats();
  }, []);

  const handleSeek = useCallback((time: number) => {
    setCurrentTime(time);
    currentTimeRef.current = time;
    playedNoteIdsRef.current.clear();
    // Mark passed notes as played to prevent audio explosion
    currentSong.notes.forEach((n) => {
      if (n.time < time) playedNoteIdsRef.current.add(n.id);
    });
    pianoEngine.stopAllNotes();
  }, [currentSong]);

  // Master Volume handler
  const handleVolumeChange = useCallback((newVol: number) => {
    setVolume(newVol);
    pianoEngine.setMasterVolume(newVol);
  }, []);

  // Auto Detect BPM handler
  const handleAutoDetectBpm = useCallback(() => {
    if (currentSong.notes.length < 4) return;
    const detected = detectBpmFromNoteTimings(currentSong.notes.map(n => n.time));
    setCurrentSong((prev) => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        bpm: detected,
      }
    }));
  }, [currentSong]);

  // On-screen Keyboard click
  const handleScreenNotePress = useCallback((midi: number) => {
    pianoEngine.playNote(midi, 0.85);
    practiceEngineRef.current.handleUserNotePress(midi);
    setActiveNotes((prev) => {
      const next = new Map(prev);
      next.set(midi, { midi, velocity: 0.85, source: 'user' });
      return next;
    });
  }, []);

  const handleScreenNoteRelease = useCallback((midi: number) => {
    pianoEngine.stopNote(midi);
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
    setCurrentSong(song);
    handleRewind();
  };

  // Open audio in listening player
  const handleOpenAudioInPlayer = (url: string, title: string) => {
    setPlayerAudioUrl(url);
    setPlayerAudioTitle(title);
    setIsAudioPlayerOpen(true);
  };

  const activeMidiSet = React.useMemo(() => {
    return new Set(activeNotes.keys());
  }, [activeNotes]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0b0d13] font-sans">
      {/* 1. Üst Menü & Durum Çubuğu */}
      <Navbar
        songTitle={currentSong.metadata.title}
        activeDevice={activeMidiDevice}
        sustainPedalActive={sustainPedalActive}
        practiceStats={practiceStats}
        isSoundfontLoaded={isSoundfontLoaded}
        soundfontProgress={soundfontProgress}
        onOpenSongSelector={() => setIsSongSelectorOpen(true)}
        onOpenConverter={() => setIsConverterOpen(true)}
        onOpenAudioPlayer={() => setIsAudioPlayerOpen(true)}
        onOpenMidiSettings={() => setIsMidiSettingsOpen(true)}
      />

      {/* 2. Synthesia Falling Notes Şelale Alanı */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <SynthesiaCanvas
          notes={currentSong.notes}
          currentTime={currentTime}
          noteSpeed={noteSpeed}
          isWaiting={isWaiting}
          waitingNotes={waitingNotes}
          handSelection={hand}
          activeMidiSet={activeMidiSet}
        />

        {/* 3. 88 Tuşlu İnteraktif Piyano Klavyesi */}
        <PianoKeyboard
          activeNotes={activeNotes}
          waitingNotes={waitingNotes}
          onNotePress={handleScreenNotePress}
          onNoteRelease={handleScreenNoteRelease}
          showLabels={true}
          sustainPedalActive={sustainPedalActive}
        />
      </main>

      {/* 4. Alt Kontrol & Etüd Barı */}
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
        onVolumeChange={handleVolumeChange}
        onPlayPause={handlePlayPause}
        onRewind={handleRewind}
        onSeek={handleSeek}
        onModeChange={setMode}
        onHandChange={setHand}
        onTempoChange={setTempo}
        onNoteSpeedChange={setNoteSpeed}
        onSetLoopA={() => setLoopStart(currentTime)}
        onSetLoopB={() => setLoopEnd(currentTime)}
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
      />

      <MidiSettingsModal
        isOpen={isMidiSettingsOpen}
        onClose={() => setIsMidiSettingsOpen(false)}
        devices={midiDevices}
        activeDevice={activeMidiDevice}
        onSelectDevice={(id) => midiManager.selectDevice(id)}
        sustainPedalActive={sustainPedalActive}
      />
    </div>
  );
};
