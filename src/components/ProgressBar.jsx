import { useRef, useState, useEffect } from "react";
import { usePlayer } from "../context/PlayerContext";
import RangeSlider from "./RangeSlider";

function formatTime(seconds) {
  if (!seconds || isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function ProgressBar() {
  const {
    seekTo, duration: ctxDuration, currentSong,
    ytPlayerRef, audioRef, isPlaying, isYTModeRef, sharedProgressRef,
    isLoadingStream
  } = usePlayer();

  // ── Refs for values that change during playback (avoid re-renders) ────────
  const isPlayingRef = useRef(isPlaying);
  const isLoadingStreamRef = useRef(isLoadingStream);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { isLoadingStreamRef.current = isLoadingStream; }, [isLoadingStream]);

  // Init from shared ref (so LyricsView ProgressBar starts at correct position)
  const initTime = sharedProgressRef?.current?.time || 0;
  const initDur = sharedProgressRef?.current?.dur || 0;

  const [time, setTime] = useState(initTime);
  const [dur, setDur] = useState(initDur);
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(0);

  const isDraggingRef = useRef(false);
  const rafRef = useRef(null);
  const syntheticRef = useRef(initTime);
  const lastRealRef = useRef(initTime);
  const lastMsRef = useRef(performance.now());
  const lastDisplayedTimeRef = useRef(initTime);
  const lastDurRef = useRef(initDur); // prevent re-renders from tiny duration changes
  const durLockedRef = useRef(false);  // lock duration once it stabilizes
  const mountedSongIdRef = useRef(currentSong?.id);
  const songChangeTsRef = useRef(0);

  // ── Duration: sync from context (only if rAF hasn't found a better one) ────
  useEffect(() => {
    if (ctxDuration > 0 && !durLockedRef.current) {
      if (Math.abs(ctxDuration - lastDurRef.current) > 1) {
        lastDurRef.current = ctxDuration;
        setDur(ctxDuration);
      }
    }
  }, [ctxDuration]);

  // ── Reset when song changes ───────────────────────────────────────────────
  useEffect(() => {
    if (mountedSongIdRef.current === currentSong?.id) return;
    mountedSongIdRef.current = currentSong?.id;
    songChangeTsRef.current = performance.now();
    setTime(0);
    setDur(0);
    syntheticRef.current = 0;
    lastRealRef.current = 0;
    lastDisplayedTimeRef.current = 0;
    lastDurRef.current = 0;
    durLockedRef.current = false;
  }, [currentSong?.id]);

  // ── rAF polling loop (only re-creates on song change) ─────────────────────
  useEffect(() => {
    lastMsRef.current = performance.now();

    const poll = () => {
      if (!isDraggingRef.current) {
        const now = performance.now();
        const delta = (now - lastMsRef.current) / 1000;
        lastMsRef.current = now;

        const timeSinceSongChange = now - songChangeTsRef.current;
        const isStaleWindow = timeSinceSongChange < 2500;

        let t = -1, d = 0;

        // Try YouTube player
        if (isYTModeRef?.current) {
          try {
            const yt = ytPlayerRef?.current;
            if (yt) {
              const ytT = typeof yt.getCurrentTime === 'function' ? yt.getCurrentTime() : -1;
              const ytD = typeof yt.getDuration === 'function' ? yt.getDuration() : 0;
              if (ytD > 0) { t = ytT; d = ytD; }
            }
          } catch { }
        }

        // Try HTML5 Audio
        if (t < 0 && !isYTModeRef?.current && !isStaleWindow) {
          try {
            const audio = audioRef?.current;
            if (audio) {
              const audioT = audio.currentTime;
              const audioD = isFinite(audio.duration) ? audio.duration : 0;
              if (audioT >= 0) { t = audioT; }
              if (audioD > 0) { d = audioD; }
            }
          } catch { }
        }

        // Fallback: song metadata duration
        if (d <= 0 && currentSong?.duration) {
          const sd = currentSong.duration;
          if (typeof sd === 'number' && sd > 0) d = sd;
          else if (typeof sd === 'string' && sd.includes(':')) {
            const parts = sd.split(':');
            d = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
          } else if (typeof sd === 'string') {
            const parsed = parseInt(sd, 10);
            if (!isNaN(parsed) && parsed > 0) d = parsed;
          }
        }

        if (isLoadingStreamRef.current || isStaleWindow) {
          syntheticRef.current = 0;
          lastRealRef.current = 0;
          if (lastDisplayedTimeRef.current !== 0) {
            lastDisplayedTimeRef.current = 0;
            setTime(0);
          }
        } else if (t >= 0) {
          if (lastRealRef.current > 3 && t < lastRealRef.current - 3) {
            syntheticRef.current = t;
          }
          lastRealRef.current = t;
          syntheticRef.current = t;
          if (Math.abs(t - lastDisplayedTimeRef.current) > 0.15) {
            lastDisplayedTimeRef.current = t;
            setTime(t);
          }
        } else if (isPlayingRef.current) {
          syntheticRef.current += delta;
          if (Math.abs(syntheticRef.current - lastDisplayedTimeRef.current) > 0.15) {
            lastDisplayedTimeRef.current = syntheticRef.current;
            setTime(syntheticRef.current);
          }
        }

        // Only update duration if it changed significantly (>1s) to prevent flicker
        if (d > 0 && !isStaleWindow && Math.abs(d - lastDurRef.current) > 1) {
          lastDurRef.current = d;
          durLockedRef.current = true; // lock once real player reports duration
          setDur(d);
        }
        if (sharedProgressRef) {
          sharedProgressRef.current.time = syntheticRef.current;
          if (d > 0) sharedProgressRef.current.dur = d;
        }
      } else {
        lastMsRef.current = performance.now();
      }

      rafRef.current = requestAnimationFrame(poll);
    };

    rafRef.current = requestAnimationFrame(poll);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [currentSong?.id]); // Only re-create on song change

  // ── Seek handlers ─────────────────────────────────────────────────────────
  const handleSeekStart = (e) => {
    isDraggingRef.current = true;
    setIsDragging(true);
    setDragValue(parseFloat(e.target.value));
  };

  const handleSeekMove = (e) => {
    if (isDraggingRef.current) setDragValue(parseFloat(e.target.value));
  };

  const handleSeekEnd = () => {
    isDraggingRef.current = false;
    setIsDragging(false);
    const v = parseFloat(dragValue);
    syntheticRef.current = v;
    lastRealRef.current = v;
    setTime(v);
    seekTo(v);
  };

  const displayTime = isDragging ? dragValue : time;

  let displayDur = dur > 0 ? dur : (ctxDuration > 0 ? ctxDuration : 0);
  if (displayDur <= 0 && currentSong?.duration) {
    const sd = currentSong.duration;
    if (typeof sd === 'number' && sd > 0) displayDur = sd;
    else if (typeof sd === 'string' && sd.includes(':')) {
      const parts = sd.split(':');
      displayDur = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    } else if (typeof sd === 'string') {
      const parsed = parseInt(sd, 10);
      if (!isNaN(parsed) && parsed > 0) displayDur = parsed;
    }
  }

  return (
    <div className="flex items-center gap-3 w-full">
      <span className="text-xs text-gray-500 font-mono w-10 text-right">
        {formatTime(displayTime)}
      </span>
      <RangeSlider
        value={displayTime}
        min={0}
        max={displayDur}
        step={0.1}
        onMouseDown={handleSeekStart}
        onChange={handleSeekMove}
        onMouseUp={handleSeekEnd}
        showGlow={true}
        className="flex-1 h-1"
      />
      <span className="text-xs text-gray-500 font-mono w-10">
        {formatTime(displayDur)}
      </span>
    </div>
  );
}
