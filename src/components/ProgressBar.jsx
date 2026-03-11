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
    ytPlayerRef, audioRef, isPlaying, isYTModeRef
  } = usePlayer();

  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(0);

  const isDraggingRef = useRef(false);
  const rafRef = useRef(null);
  const syntheticRef = useRef(0);
  const lastRealRef = useRef(0);
  const lastMsRef = useRef(performance.now());
  // Store current song ID at mount to avoid false reset
  const mountedSongIdRef = useRef(currentSong?.id);

  // ── Duration: sync from context (updated by YouTube's onTimeUpdate callback)
  useEffect(() => {
    if (ctxDuration > 0) {
      setDur(ctxDuration);
    }
  }, [ctxDuration]);

  // ── Reset when song actually changes (not on mount) ───────────────────────
  useEffect(() => {
    // Skip if this is the same song that was playing when we mounted
    if (mountedSongIdRef.current === currentSong?.id) return;
    mountedSongIdRef.current = currentSong?.id;
    setTime(0);
    setDur(0);
    syntheticRef.current = 0;
    lastRealRef.current = 0;
  }, [currentSong?.id]);

  // ── rAF polling loop ──────────────────────────────────────────────────────
  useEffect(() => {
    lastMsRef.current = performance.now();

    const poll = () => {
      if (!isDraggingRef.current) {
        const now = performance.now();
        const delta = (now - lastMsRef.current) / 1000;
        lastMsRef.current = now;

        let t = -1, d = 0;

        // Try YouTube player
        if (isYTModeRef?.current) {
          try {
            const yt = ytPlayerRef?.current;
            if (yt) {
              const ytT = typeof yt.getCurrentTime === 'function' ? yt.getCurrentTime() : -1;
              const ytD = typeof yt.getDuration === 'function' ? yt.getDuration() : 0;
              // Chỉ lấy time khi YouTube đã report duration > 0
              // (tránh lấy getCurrentTime()=0 khi player chưa thực sự ready)
              if (ytD > 0) { t = ytT; d = ytD; }
            }
          } catch { }
        }

        // Try HTML5 Audio
        if (t < 0 && !isYTModeRef?.current) {
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

        if (t >= 0) {
          // Got real time from player
          if (lastRealRef.current > 3 && t < lastRealRef.current - 3) {
            syntheticRef.current = t; // Repeat detected
          }
          lastRealRef.current = t;
          syntheticRef.current = t;
          setTime(t);
        } else if (isPlaying) {
          // Synthetic advance: player not ready yet but song is playing
          syntheticRef.current += delta;
          setTime(syntheticRef.current);
        }

        if (d > 0) setDur(d);
      } else {
        lastMsRef.current = performance.now();
      }

      rafRef.current = requestAnimationFrame(poll);
    };

    rafRef.current = requestAnimationFrame(poll);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isPlaying, ytPlayerRef, audioRef, isYTModeRef]); // re-create when these change

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
