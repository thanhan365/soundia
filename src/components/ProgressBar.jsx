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

  // ── Synthetic Timer Fallback ──
  const lastRealTimeRef = useRef(0);
  const lastUpdateTimeRef = useRef(performance.now());
  const syntheticTimeRef = useRef(0);
  const songIdRef = useRef(currentSong?.id);
  const isTransitioningRef = useRef(false);

  // ── Direct Polling — SILLY-SMOOTH & BULLETPROOF ───────────────────────────
  useEffect(() => {
    let animFrameId;

    const poll = () => {
      const now = performance.now();
      const deltaSec = (now - lastUpdateTimeRef.current) / 1000;
      lastUpdateTimeRef.current = now;

      if (!isDraggingRef.current) {
        let t = 0, d = 0;
        let isRealTimeRead = false;

        // 1) Thử YouTube player trước nếu đang ở chế độ YT
        if (isYTModeRef?.current) {
          try {
            const ytT = ytPlayerRef.current?.getCurrentTime?.() || 0;
            const ytD = ytPlayerRef.current?.getDuration?.() || 0;
            if (ytD > 0) {
              t = ytT;
              d = ytD;
              isRealTimeRead = true;
            }
          } catch (e) { }
        }
        // 2) Nếu không có data YouTube hoặc ở chế độ audio, thử HTML5 audio
        //    BỎ QUA nếu đang transition (bài vừa đổi, audio chưa load bài mới)
        if (!isRealTimeRead && !isYTModeRef?.current && audioRef.current?.src && !isTransitioningRef.current) {
          try {
            const audioT = audioRef.current.currentTime || 0;
            const audioD = audioRef.current.duration && !isNaN(audioRef.current.duration) ? audioRef.current.duration : 0;
            if (audioT >= 0 && audioD > 0) {
              t = audioT;
              d = audioD;
              isRealTimeRead = true;
            }
          } catch (e) { }
        }

        // 3) Detect repeat: thời gian nhảy ngược (bài lặp lại từ đầu)
        if (isRealTimeRead && lastRealTimeRef.current > 3 && t < lastRealTimeRef.current - 3) {
          syntheticTimeRef.current = t;
        }

        // 4) Gỡ kẹt (Hyper-Robust Fallback)
        if (isRealTimeRead) {
          lastRealTimeRef.current = t;
          syntheticTimeRef.current = t;
        } else if (isPlaying && ctxDuration > 0 && !isTransitioningRef.current) {
          syntheticTimeRef.current += deltaSec;
          if (syntheticTimeRef.current > ctxDuration) syntheticTimeRef.current = ctxDuration;
          t = syntheticTimeRef.current;
        } else {
          t = syntheticTimeRef.current;
        }

        setTime(t);
        if (d > 0 && !isTransitioningRef.current) setDur(d);
      }

      animFrameId = requestAnimationFrame(poll);
    };

    lastUpdateTimeRef.current = performance.now();
    animFrameId = requestAnimationFrame(poll);

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [ytPlayerRef, audioRef, isPlaying, ctxDuration]);

  // ── Fallback: dùng context duration khi cả audio lẫn YT đều chưa trả về ──
  useEffect(() => {
    if (ctxDuration > 0 && dur === 0 && !isTransitioningRef.current) {
      setDur(ctxDuration);
    }
  }, [ctxDuration]);

  // ── Reset khi đổi bài ──
  useEffect(() => {
    if (songIdRef.current !== currentSong?.id) {
      // Đánh dấu đang transition — polling sẽ không đọc giá trị cũ
      isTransitioningRef.current = true;
      songIdRef.current = currentSong?.id;
      setTime(0);
      setDur(0);
      syntheticTimeRef.current = 0;
      lastRealTimeRef.current = 0;
      // Cho phép polling đọc lại sau 500ms (đủ thời gian audio load metadata mới)
      const timer = setTimeout(() => { isTransitioningRef.current = false; }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentSong?.id]);

  // ── Seek handlers ──
  const handleSeekStart = (e) => {
    isDraggingRef.current = true;
    setIsDragging(true);
    setDragValue(parseFloat(e.target.value));
  };

  const handleSeekMove = (e) => {
    if (isDraggingRef.current) setDragValue(parseFloat(e.target.value));
  };

  const handleSeekEnd = (e) => {
    isDraggingRef.current = false;
    setIsDragging(false);

    // RẤT QUAN TRỌNG: Cập nhật biến time ảo (syntheticTime) bằng giá trị chuẩn 
    // để nhịp poll tiếp theo không bị giật (snap-back) về quá khứ 
    // trong khi chờ Player API (YouTube/Audio) trả về real time mới.
    const newTime = parseFloat(dragValue);
    syntheticTimeRef.current = newTime;
    lastRealTimeRef.current = newTime;
    setTime(newTime);

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
