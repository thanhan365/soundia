import { useState, useEffect, useRef, useCallback } from "react";
import { usePlayer } from "../context/PlayerContext";
import { HiX } from "react-icons/hi";
import { HiPlay, HiPause, HiBackward, HiForward } from "react-icons/hi2";
import { IoShuffle, IoRepeat } from "react-icons/io5";
import { HiQueueList } from "react-icons/hi2";
import ProgressBar from "./ProgressBar";
import VolumeControl from "./VolumeControl";

export default function LyricsView() {
  // CHỈ lấy những gì cần cho render, KHÔNG lấy currentTime (gây re-render mỗi frame)
  const {
    lyricsOpen, setLyricsOpen, currentSong, isPlaying, audioRef, ytPlayerRef, isYTModeRef,
    togglePlay, playNext, playPrev,
    shuffle, toggleShuffle, repeatMode, toggleRepeat,
    queueOpen, setQueueOpen, isLoadingStream,
  } = usePlayer();
  const [lyricsData, setLyricsData] = useState({ state: "idle", synced: [], plain: "", error: null });
  const [currentLyricIndex, setCurrentLyricIndex] = useState(-1);
  const containerRef = useRef(null);
  const activeLineRef = useRef(null);
  const rafIdRef = useRef(null);
  const lyricsDataRef = useRef(lyricsData);

  // Sync lyricsData vào ref để dùng trong rAF loop (tránh stale closure)
  useEffect(() => { lyricsDataRef.current = lyricsData; }, [lyricsData]);

  // Parse [mm:ss.xx] lyric line
  const parseSyncedLyrics = useCallback((lrcStr) => {
    if (!lrcStr) return [];
    const lines = lrcStr.split("\n");
    const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;
    const parsed = [];
    for (const line of lines) {
      const match = line.match(regex);
      if (match) {
        const m = parseInt(match[1], 10);
        const s = parseInt(match[2], 10);
        const ms = parseInt(match[3].padEnd(3, '0'), 10);
        const time = m * 60 + s + ms / 1000;
        const text = match[4].trim();
        if (text) parsed.push({ time, text });
      }
    }
    return parsed;
  }, []);

  // ── Fetch lyrics khi mở hoặc đổi bài ──────────────────────────────────
  useEffect(() => {
    if (!lyricsOpen || !currentSong) return;

    let isMounted = true;
    const fetchLyrics = async () => {
      setLyricsData({ state: "loading", synced: [], plain: "", error: null });
      setCurrentLyricIndex(-1);

      try {
        const trackName = encodeURIComponent(currentSong.title);
        const artistName = encodeURIComponent(currentSong.artist);
        // Nếu bài từ NCT → truyền nctKey để backend dùng NCT lyrics API (ưu tiên)
        const nctKeyParam = currentSong.key && currentSong.source === 'nct'
          ? `&nctKey=${encodeURIComponent(currentSong.key)}` : '';
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5066/api';
        const res = await fetch(`${apiUrl}/lyrics?track=${trackName}&artist=${artistName}${nctKeyParam}`);

        if (!isMounted) return;

        if (res.ok) {
          const data = await res.json();
          if (data.syncedLyrics) {
            setLyricsData({ state: "success", synced: parseSyncedLyrics(data.syncedLyrics), plain: "", error: null });
          } else if (data.plainLyrics) {
            // Không có synced → hiện plain text (không fake timestamps)
            setLyricsData({ state: "success", synced: [], plain: data.plainLyrics, error: null });
          } else {
            setLyricsData({ state: "error", synced: [], plain: "", error: "Không có lời cho bài hát này." });
          }
        } else {
          setLyricsData({ state: "error", synced: [], plain: "", error: "Không tìm thấy lời bài hát." });
        }
      } catch (err) {
        if (isMounted) setLyricsData({ state: "error", synced: [], plain: "", error: "Lỗi kết nối server." });
      }
    };

    fetchLyrics();
    return () => { isMounted = false; };
  }, [currentSong?.id, lyricsOpen, parseSyncedLyrics]);

  // ── requestAnimationFrame loop: poll time trực tiếp từ audio/YT ref ────
  // KHÔNG dùng currentTime từ context → KHÔNG gây re-render
  // CHỈ gọi setCurrentLyricIndex khi dòng lyric thực sự thay đổi
  useEffect(() => {
    if (!lyricsOpen) return;

    let prevIndex = -1;

    const tick = () => {
      const synced = lyricsDataRef.current.synced;
      if (synced.length === 0) {
        rafIdRef.current = requestAnimationFrame(tick);
        return;
      }

      // Lấy currentTime trực tiếp từ ref (KHÔNG qua React state)
      let time = 0;
      if (isYTModeRef.current) {
        time = ytPlayerRef.current?.getCurrentTime?.() || 0;
      } else {
        time = audioRef.current?.currentTime || 0;
      }

      // Tính active index
      let idx = -1;
      for (let i = 0; i < synced.length; i++) {
        if (time >= synced[i].time) idx = i;
        else break;
      }

      // CHỈ setState khi dòng thay đổi → tránh re-render liên tục
      if (idx !== prevIndex) {
        prevIndex = idx;
        setCurrentLyricIndex(idx);
      }

      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [lyricsOpen, audioRef, ytPlayerRef, isYTModeRef]);

  // ── Auto-scroll: CHỈ scroll khi dòng lyric thay đổi ───────────────────
  useEffect(() => {
    if (!lyricsOpen || currentLyricIndex < 0) return;

    // Dùng setTimeout nhỏ để đợi React commit DOM xong rồi mới scroll
    const timer = setTimeout(() => {
      if (activeLineRef.current && containerRef.current) {
        activeLineRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [currentLyricIndex, lyricsOpen]);

  if (!lyricsOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-2xl flex flex-col items-center justify-center animate-fade-in">
      {/* Close Button */}
      <button
        onClick={() => setLyricsOpen(false)}
        className="absolute top-4 right-4 sm:top-6 sm:right-6 text-gray-400 hover:text-white transition-colors z-10"
      >
        <HiX className="text-2xl" />
      </button>

      {/* Background Glow */}
      {currentSong && (
        <div
          className="absolute inset-0 opacity-20 blur-3xl transition-all duration-1000"
          style={{
            backgroundImage: `url(${currentSong.cover})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-center w-full max-w-6xl px-4 sm:px-8 h-full gap-8 md:gap-16 pt-16 pb-36">

        {/* Left Side: Cover Art */}
        {currentSong ? (
          <div className="flex flex-col items-center flex-shrink-0 mb-4 md:mb-0">
            <div className={`w-40 h-40 sm:w-56 sm:h-56 md:w-80 md:h-80 rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl transition-transform duration-500 ${isPlaying ? "scale-100" : "scale-95 opacity-80"}`}>
              <img src={currentSong.cover} alt={currentSong.title} className="w-full h-full object-cover" />
            </div>
            <div className="text-center mt-6 hidden md:block w-80">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 truncate px-4">{currentSong.title}</h2>
              <p className="text-lg text-gray-400 truncate px-4">{currentSong.artist}</p>
            </div>
          </div>
        ) : (
          <div className="text-center flex-1">
            <p className="text-xl text-gray-400">Chưa phát bài nào</p>
            <p className="text-sm text-gray-600 mt-2">Chọn bài hát để xem lời</p>
          </div>
        )}

        {/* Right Side: Lyrics Area */}
        {currentSong && (
          <div
            ref={containerRef}
            className="flex-1 w-full max-w-2xl h-[45vh] md:h-[60vh] overflow-y-auto scrollbar-hide select-none px-2 py-20"
            style={{ maskImage: "linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)" }}
          >
            <div className="space-y-6 md:space-y-8 pb-32 pt-16">
              {lyricsData.state === "loading" && (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-pulse flex space-x-2">
                    <div className="h-3 w-3 bg-neon rounded-full animation-delay-0"></div>
                    <div className="h-3 w-3 bg-neon rounded-full animation-delay-150"></div>
                    <div className="h-3 w-3 bg-neon rounded-full animation-delay-300"></div>
                  </div>
                </div>
              )}

              {lyricsData.state === "error" && (
                <div className="flex flex-col items-center justify-center text-center space-y-4 opacity-70">
                  <p className="text-xl md:text-2xl text-gray-300">♪ {lyricsData.error} ♪</p>
                  <p className="text-sm text-gray-500">Hãy tận hưởng giai điệu nhé! 🎵</p>
                </div>
              )}

              {/* Synced Lyrics — highlight dòng đang hát */}
              {lyricsData.state === "success" && lyricsData.synced.length > 0 && (
                lyricsData.synced.map((lyric, i) => {
                  const isActive = i === currentLyricIndex;
                  const isPassed = i < currentLyricIndex;
                  return (
                    <p
                      key={i}
                      ref={isActive ? activeLineRef : null}
                      className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold transform-gpu cursor-default
                        transition-all duration-500 ease-out
                        ${isActive ? "text-white scale-105 origin-left" :
                          isPassed ? "text-white/40" : "text-white/20"}
                      `}
                      style={{
                        textShadow: isActive ? "0 0 30px rgba(255,255,255,0.3), 0 0 60px rgba(255,255,255,0.1)" : "none",
                        paddingLeft: "1rem",
                      }}
                    >
                      {lyric.text}
                    </p>
                  );
                })
              )}

              {/* Plain Lyrics (Genius/lyrics.ovh) — cùng style */}
              {lyricsData.state === "success" && lyricsData.plain && !lyricsData.synced.length && (
                lyricsData.plain.split('\n')
                  .filter(line => {
                    const trimmed = line.trim();
                    if (!trimmed) return false;
                    if (/^\d*\s*Contributors/i.test(trimmed)) return false;
                    if (/Lyrics$/i.test(trimmed) && trimmed.length < 80) return false;
                    if (/^\[.*\]$/.test(trimmed)) return false;
                    if (/^You might also like$/i.test(trimmed)) return false;
                    if (/^Embed$/i.test(trimmed)) return false;
                    return true;
                  })
                  .map((line, i) => (
                    <p
                      key={i}
                      className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white/50 cursor-default transition-all duration-300"
                      style={{ paddingLeft: "1rem" }}
                    >
                      {line}
                    </p>
                  ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══ EMBEDDED PLAYER CONTROLS — full-width like NCT ═══ */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black via-black/90 to-transparent">
        {/* Progress Bar — full width */}
        <div className="w-full px-4 sm:px-6 pt-6">
          <ProgressBar />
        </div>

        {/* Controls Row — full width, 3 columns */}
        <div className="flex items-center px-4 sm:px-6 py-3 gap-4">
          {/* LEFT: Cover + Song Info */}
          <div className="flex items-center gap-3 min-w-0 w-[28%]">
            {currentSong && (
              <>
                <div className={`w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 ${isPlaying ? "ring-1 ring-neon/30" : ""}`}>
                  <img src={currentSong.cover} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{currentSong.title}</p>
                  <p className="text-xs text-gray-400 truncate">{currentSong.artist}</p>
                </div>
              </>
            )}
          </div>

          {/* CENTER: Transport controls */}
          <div className="flex items-center justify-center gap-4 sm:gap-5 flex-1">
            <button onClick={toggleShuffle} className={`relative p-1.5 transition-all ${shuffle ? "text-neon" : "text-gray-500 hover:text-gray-300"}`}>
              <IoShuffle className="text-lg" />
              {shuffle && <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-neon" />}
            </button>
            <button onClick={playPrev} className="text-gray-400 hover:text-white transition-colors p-1">
              <HiBackward className="text-xl" />
            </button>
            <button
              onClick={togglePlay}
              disabled={!currentSong || isLoadingStream}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${currentSong ? "bg-white text-dark hover:scale-110" : "bg-white/10 text-gray-600 cursor-not-allowed"} ${isLoadingStream ? "opacity-70 cursor-wait hover:scale-100" : ""}`}
            >
              {isLoadingStream ? (
                <div className="w-5 h-5 rounded-full border-[2px] border-dark border-t-transparent animate-spin" />
              ) : isPlaying ? <HiPause className="text-lg" /> : <HiPlay className="text-lg ml-0.5" />}
            </button>
            <button onClick={playNext} className="text-gray-400 hover:text-white transition-colors p-1">
              <HiForward className="text-xl" />
            </button>
            <button onClick={toggleRepeat} className={`relative p-1.5 transition-all ${repeatMode !== "none" ? "text-neon" : "text-gray-500 hover:text-gray-300"}`}>
              <IoRepeat className="text-lg" />
              {repeatMode === "one" && <span className="absolute -top-1 -right-1 bg-neon text-dark text-[8px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">1</span>}
              {repeatMode !== "none" && <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-neon" />}
            </button>
          </div>

          {/* RIGHT: LRC, Volume, Queue */}
          <div className="flex items-center justify-end gap-3 w-[28%]">
            <button onClick={() => setLyricsOpen(false)} className="p-1 rounded-lg text-xs font-bold text-neon bg-neon/10 transition-all">
              <span className="text-[11px]">LRC</span>
            </button>
            <div className="hidden sm:block">
              <VolumeControl />
            </div>
            <button onClick={() => setQueueOpen(!queueOpen)} className={`p-1 rounded-lg transition-all ${queueOpen ? "text-neon bg-neon/10" : "text-gray-500 hover:text-gray-300"}`}>
              <HiQueueList className="text-base" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
