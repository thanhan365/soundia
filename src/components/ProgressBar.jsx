import { useRef, useState, useEffect, useCallback } from "react";
import { usePlayer } from "../context/PlayerContext";
import RangeSlider from "./RangeSlider";

function formatTime(seconds) {
  if (!seconds || isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * ProgressBar — shared single-source-of-truth polling.
 * 
 * Uses a module-level singleton rAF loop + shared refs so that ALL mounted
 * ProgressBar instances display the exact same time/duration, eliminating
 * desync between PlayerBar and LyricsView.
 */

// ── Module-level shared state (singleton across all ProgressBar instances) ──
const shared = {
  time: 0,
  dur: 0,
  rafId: null,
  instanceCount: 0,
  listeners: new Set(),
  songId: null,
  isTransitioning: false,
  lastRealTime: 0,
  lastUpdateMs: performance.now(),
  syntheticTime: 0,
};

function notifyListeners() {
  for (const fn of shared.listeners) fn(shared.time, shared.dur);
}

export default function ProgressBar() {
  const {
    seekTo, duration: ctxDuration, currentSong,
    ytPlayerRef, audioRef, isPlaying, isYTModeRef
  } = usePlayer();

  const [time, setTime] = useState(shared.time);
  const [dur, setDur] = useState(shared.dur);
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(0);
  const isDraggingRef = useRef(false);

  // ── Subscribe to shared polling loop ──────────────────────────────────────
  useEffect(() => {
    const listener = (t, d) => {
      if (!isDraggingRef.current) {
        setTime(t);
        if (d > 0) setDur(d);
      }
    };
    shared.listeners.add(listener);
    shared.instanceCount++;

    // Start the shared rAF loop if not already running
    if (!shared.rafId) {
      startSharedPoll(ytPlayerRef, audioRef, isYTModeRef, isPlaying, ctxDuration);
    }

    return () => {
      shared.listeners.delete(listener);
      shared.instanceCount--;
      if (shared.instanceCount <= 0) {
        if (shared.rafId) cancelAnimationFrame(shared.rafId);
        shared.rafId = null;
        shared.instanceCount = 0;
      }
    };
  }, []); // eslint-disable-line

  // ── Update the shared poll parameters when deps change ────────────────────
  const pollParamsRef = useRef({ ytPlayerRef, audioRef, isYTModeRef, isPlaying, ctxDuration });
  useEffect(() => {
    pollParamsRef.current = { ytPlayerRef, audioRef, isYTModeRef, isPlaying, ctxDuration };
    // Restart poll with new params
    if (shared.rafId) cancelAnimationFrame(shared.rafId);
    startSharedPoll(ytPlayerRef, audioRef, isYTModeRef, isPlaying, ctxDuration);
  }, [ytPlayerRef, audioRef, isPlaying, ctxDuration]);

  // ── Song change: reset shared state ───────────────────────────────────────
  useEffect(() => {
    if (shared.songId !== currentSong?.id) {
      shared.isTransitioning = true;
      shared.songId = currentSong?.id;
      shared.time = 0;
      shared.dur = 0;
      shared.syntheticTime = 0;
      shared.lastRealTime = 0;
      notifyListeners();
      const timer = setTimeout(() => { shared.isTransitioning = false; }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentSong?.id]);

  // ── Fallback: context duration when YT/audio haven't reported yet ─────────
  useEffect(() => {
    if (ctxDuration > 0 && shared.dur === 0 && !shared.isTransitioning) {
      shared.dur = ctxDuration;
      notifyListeners();
    }
  }, [ctxDuration]);

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
    const newTime = parseFloat(dragValue);
    shared.syntheticTime = newTime;
    shared.lastRealTime = newTime;
    shared.time = newTime;
    notifyListeners();
    seekTo(newTime);
  };

  const displayTime = isDragging ? dragValue : time;
  const displayDur = dur > 0 ? dur : (ctxDuration > 0 ? ctxDuration : 0);

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

// ── Shared singleton polling loop ────────────────────────────────────────────
function startSharedPoll(ytPlayerRef, audioRef, isYTModeRef, isPlaying, ctxDuration) {
  shared.lastUpdateMs = performance.now();

  const poll = () => {
    const now = performance.now();
    const deltaSec = (now - shared.lastUpdateMs) / 1000;
    shared.lastUpdateMs = now;

    let t = 0, d = 0;
    let isRealTimeRead = false;

    // 1) YouTube player
    if (isYTModeRef?.current) {
      try {
        const ytT = ytPlayerRef.current?.getCurrentTime?.() || 0;
        const ytD = ytPlayerRef.current?.getDuration?.() || 0;
        if (ytD > 0) { t = ytT; d = ytD; isRealTimeRead = true; }
      } catch { }
    }

    // 2) HTML5 Audio
    if (!isRealTimeRead && !isYTModeRef?.current && audioRef.current?.src && !shared.isTransitioning) {
      try {
        const audioT = audioRef.current.currentTime || 0;
        const audioD = audioRef.current.duration && !isNaN(audioRef.current.duration) ? audioRef.current.duration : 0;
        if (audioT >= 0 && audioD > 0) { t = audioT; d = audioD; isRealTimeRead = true; }
      } catch { }
    }

    // 3) Detect repeat (time jumps backward)
    if (isRealTimeRead && shared.lastRealTime > 3 && t < shared.lastRealTime - 3) {
      shared.syntheticTime = t;
    }

    // 4) Fallback synthetic timer
    if (isRealTimeRead) {
      shared.lastRealTime = t;
      shared.syntheticTime = t;
    } else if (isPlaying && ctxDuration > 0 && !shared.isTransitioning) {
      shared.syntheticTime += deltaSec;
      if (shared.syntheticTime > ctxDuration) shared.syntheticTime = ctxDuration;
      t = shared.syntheticTime;
    } else {
      t = shared.syntheticTime;
    }

    shared.time = t;
    if (d > 0 && !shared.isTransitioning) shared.dur = d;

    notifyListeners();

    shared.rafId = requestAnimationFrame(poll);
  };

  shared.rafId = requestAnimationFrame(poll);
}
