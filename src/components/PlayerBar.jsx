import { useState, useRef, useCallback, useEffect } from "react";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";
import { useClickOutside } from "../hooks/useClickOutside";
import ProgressBar from "./ProgressBar";
import VolumeControl from "./VolumeControl";
import { HiPlay, HiPause, HiBackward, HiForward } from "react-icons/hi2";
import { HiMusicNote, HiHeart, HiDotsHorizontal, HiPlus, HiLink, HiShare, HiClock } from "react-icons/hi";
import { IoShuffle, IoRepeat } from "react-icons/io5";
import { HiQueueList } from "react-icons/hi2";

export default function PlayerBar() {
  const {
    currentSong, isPlaying, togglePlay, playNext, playPrev,
    shuffle, toggleShuffle, repeatMode, toggleRepeat,
    toggleFavorite, isFavorite, queueOpen, setQueueOpen,
    lyricsOpen, setLyricsOpen, addToQueue,
    playlists, addSongToPlaylist, isLoadingStream,
    sleepTimer, setSleepTimer,
    crossfade, setCrossfade,
  } = usePlayer();
  const { showToast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sleepMenuOpen, setSleepMenuOpen] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');
  const menuRef = useRef(null);
  const sleepMenuRef = useRef(null);

  const liked = currentSong ? isFavorite(currentSong.id) : false;

  // Use click outside hook để đóng menu
  useClickOutside(menuRef, () => setMenuOpen(false));
  useClickOutside(sleepMenuRef, () => setSleepMenuOpen(false));

  const handleSleepTimer = useCallback((option) => {
    setSleepTimer(option);
    setSleepMenuOpen(false);
    if (option === null || option === 'off') {
      showToast('⏱️ Đã tắt hẹn giờ', 'info');
    } else if (option === 'end') {
      showToast('⏱️ Sẽ dừng sau bài này', 'success');
    } else {
      showToast(`⏱️ Hẹn giờ: ${option} phút`, 'success');
    }
  }, [setSleepTimer, showToast]);

  const handleCrossfade = useCallback((val) => {
    setCrossfade(val);
    setSleepMenuOpen(false);
    showToast(val > 0 ? `🔀 Crossfade: ${val}s` : '🔀 Đã tắt crossfade', val > 0 ? 'success' : 'info');
  }, [setCrossfade, showToast]);

  const handleLike = useCallback(() => {
    if (!currentSong) return;
    toggleFavorite(currentSong);
    showToast(liked ? "Đã bỏ yêu thích" : "Đã thêm vào yêu thích", liked ? "info" : "success");
  }, [currentSong, liked, toggleFavorite, showToast]);

  const handleAddToQueue = useCallback(() => {
    if (!currentSong) return;
    addToQueue(currentSong);
    showToast(`Đã thêm vào danh sách chờ`, "success");
    setMenuOpen(false);
  }, [currentSong, addToQueue, showToast]);

  const handleAddToPlaylist = useCallback((pl) => {
    if (!currentSong) return;
    addSongToPlaylist(pl.id, currentSong.id);
    showToast(`Đã thêm vào "${pl.name}"`, "success");
    setMenuOpen(false);
  }, [currentSong, addSongToPlaylist, showToast]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(`https://soundia.app/song/${currentSong?.id}`);
    showToast("Đã sao chép liên kết", "success");
    setMenuOpen(false);
  }, [currentSong, showToast]);

  const handleShare = useCallback(() => {
    if (navigator.share) {
      navigator.share({ title: currentSong.title, text: `${currentSong.title} - ${currentSong.artist}` });
    } else {
      handleCopyLink();
    }
    setMenuOpen(false);
  }, [currentSong, handleCopyLink]);

  // Update Dynamic Document Title
  useEffect(() => {
    if (currentSong) {
      document.title = `${isPlaying ? "▶ " : ""}${currentSong.title} - ${currentSong.artist} | Soundia`;
    } else {
      document.title = "Soundia - Web Player";
    }
  }, [currentSong, isPlaying]);

  /* ─────────── MOBILE < 480px: layout 2 hàng ─────────── */
  /* Hàng 1: Cover + Title + Like + 3 chấm                */
  /* Hàng 2: Progress + Prev/Play/Next                     */
  /* ─────────── TABLET / DESKTOP: layout 1 hàng ────────── */

  return (
    <div
      className={`
        fixed bottom-0 left-0 right-0 z-30
        bg-gradient-to-r from-slate-900 to-slate-950 sm:backdrop-blur-xl border-t border-cyan-400/10
        transition-all duration-500
        shadow-[0_-4px_30px_rgba(56,189,248,0.08)]
        safe-bottom
        ${isPlaying ? "shadow-[0_-4px_30px_rgba(56,189,248,0.15)]" : ""}
      `}
    >
      <div className="mx-auto">

        {/* ═══ MOBILE LAYOUT (<640px): 3 rows ═══ */}
        <div className="sm:hidden">
          {/* Row 1: Song info */}
          <div className="flex items-center gap-2 px-2 sm:px-3 pt-2 pb-1">
            {currentSong ? (
              <>
                <div className={`w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 ${isPlaying ? "ring-1 ring-neon/30" : ""}`}>
                  <img src={currentSong.cover} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-white truncate">{currentSong.title}</p>
                  <p className="text-[11px] text-gray-500 truncate">{currentSong.artist}</p>
                </div>
                <button onClick={handleLike} className={`p-1.5 flex-shrink-0 rounded-full ${liked ? "text-red-500" : "text-gray-600"}`}>
                  <HiHeart className="text-[16px]" />
                </button>
                <div className="relative flex-shrink-0" ref={menuRef}>
                  <button onClick={() => setMenuOpen(!menuOpen)} className={`p-1.5 rounded-full ${menuOpen ? "text-neon" : "text-gray-600"}`}>
                    <HiDotsHorizontal className="text-[16px]" />
                  </button>
                  {menuOpen && (
                    <div className="absolute bottom-full right-0 mb-2 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl py-2 w-56 sm:w-52 z-50 max-w-[90vw]">
                      <button onClick={handleAddToQueue} className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-gray-300 hover:bg-white/5 text-left">
                        <HiQueueList className="text-sm text-gray-500 flex-shrink-0" /><span>Thêm vào danh sách chờ</span>
                      </button>
                      {playlists.length > 0 && (
                        <>
                          <div className="mx-3 my-1 h-px bg-white/5" />
                          {playlists.map((pl) => (
                            <button key={pl.id} onClick={() => handleAddToPlaylist(pl)} className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-gray-300 hover:bg-white/5 text-left">
                              <HiPlus className="text-sm text-neon/60 flex-shrink-0" /><span className="truncate">Thêm vào "{pl.name}"</span>
                            </button>
                          ))}
                        </>
                      )}
                      <div className="mx-3 my-1 h-px bg-white/5" />
                      <button onClick={handleShare} className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-gray-300 hover:bg-white/5 text-left">
                        <HiShare className="text-sm text-gray-500 flex-shrink-0" /><span>Chia sẻ</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                  <HiMusicNote className="text-gray-600 text-sm" />
                </div>
                <p className="text-[13px] text-gray-600">Chọn bài để phát</p>
              </div>
            )}
          </div>

          {/* Row 2: Progress */}
          <div className="px-3 py-0.5">
            <ProgressBar />
          </div>

          {/* Row 3: Controls — Simplified for mobile */}
          <div className="px-3 pb-1.5">
            <div className="flex items-center justify-between">
              {/* Left: shuffle */}
              <button onClick={toggleShuffle} className={`p-1.5 flex-shrink-0 ${shuffle ? "text-neon" : "text-gray-600"}`}>
                <IoShuffle className="text-[16px]" />
              </button>

              {/* Center: prev / play / next */}
              <div className="flex items-center gap-3">
                <button data-player-prev-btn onClick={playPrev} className="text-gray-400 active:text-white p-1.5 flex-shrink-0 rounded-full">
                  <HiBackward className="text-lg" />
                </button>
                <button
                  data-player-play-btn
                  onClick={togglePlay}
                  disabled={!currentSong || isLoadingStream}
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${currentSong ? "bg-white text-dark active:scale-90" : "bg-white/10 text-gray-600"} ${isLoadingStream ? "opacity-70 cursor-wait" : ""}`}
                >
                  {isLoadingStream ? (
                    <div className="w-4 h-4 rounded-full border-2 border-dark border-t-transparent animate-spin" />
                  ) : isPlaying ? <HiPause className="text-lg" /> : <HiPlay className="text-lg ml-0.5" />}
                </button>
                <button data-player-next-btn onClick={playNext} className="text-gray-400 active:text-white p-1.5 flex-shrink-0 rounded-full">
                  <HiForward className="text-lg" />
                </button>
              </div>

              {/* Right: repeat + lyrics + queue */}
              <div className="flex items-center gap-0.5">
                <button onClick={toggleRepeat} className={`p-1.5 flex-shrink-0 ${repeatMode !== "none" ? "text-neon" : "text-gray-600"}`}>
                  <IoRepeat className="text-[16px]" />
                  {repeatMode === "one" && <span className="absolute text-[7px] ml-0.5">1</span>}
                </button>
                <button data-player-lyrics-btn onClick={() => setLyricsOpen(!lyricsOpen)} className={`p-1.5 text-[10px] font-bold flex-shrink-0 ${lyricsOpen ? "text-neon" : "text-gray-600"}`}>
                  LRC
                </button>
                <button onClick={() => setQueueOpen(!queueOpen)} className={`p-1.5 flex-shrink-0 ${queueOpen ? "text-neon" : "text-gray-600"}`}>
                  <HiQueueList className="text-[16px]" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ TABLET + DESKTOP LAYOUT (>=640px): 1 row ═══ */}
        <div className="hidden sm:block">
          <div className="flex items-center px-4 py-2 gap-3 lg:gap-4">
            {/* LEFT: Song Info */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 w-[28%] sm:w-[25%] lg:w-[28%]">
              {currentSong ? (
                <>
                  <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden flex-shrink-0 border-2 border-neon/20 ${isPlaying ? "animate-spin-slow" : ""}`}>
                    <img src={currentSong.cover} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs sm:text-sm font-semibold text-white truncate">{currentSong.title}</p>
                      {isPlaying && (
                        <div className="playing-bars flex-shrink-0">
                          <span /><span /><span /><span />
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] sm:text-xs text-gray-500 truncate">{currentSong.artist}</p>
                  </div>
                  <button onClick={handleLike} className={`flex-shrink-0 p-1 rounded-full transition-all ${liked ? "text-red-500" : "text-gray-600 hover:text-gray-300"}`}>
                    <HiHeart className={`text-sm sm:text-base ${liked ? "drop-shadow-[0_0_4px_rgba(239,68,68,0.4)]" : ""}`} />
                  </button>
                  <div className="relative flex-shrink-0" ref={menuRef}>
                    <button onClick={() => setMenuOpen(!menuOpen)} className={`p-1 rounded-full transition-all ${menuOpen ? "text-neon bg-white/10" : "text-gray-600 hover:text-gray-300"}`}>
                      <HiDotsHorizontal className="text-sm sm:text-base" />
                    </button>
                    {menuOpen && (
                      <div className="absolute bottom-full left-0 mb-2 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl py-2 w-52 z-50">
                        <button onClick={handleAddToQueue} className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-gray-300 hover:text-white hover:bg-white/5 text-left">
                          <HiQueueList className="text-sm text-gray-500 flex-shrink-0" /><span>Thêm vào danh sách chờ</span>
                        </button>
                        {playlists.length > 0 && (
                          <>
                            <div className="mx-3 my-1 h-px bg-white/5" />
                            {playlists.map((pl) => (
                              <button key={pl.id} onClick={() => handleAddToPlaylist(pl)} className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-gray-300 hover:text-white hover:bg-white/5 text-left">
                                <HiPlus className="text-sm text-neon/60 flex-shrink-0" /><span className="truncate">Thêm vào "{pl.name}"</span>
                              </button>
                            ))}
                          </>
                        )}
                        <div className="mx-3 my-1 h-px bg-white/5" />
                        <button onClick={handleCopyLink} className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-gray-300 hover:text-white hover:bg-white/5 text-left">
                          <HiLink className="text-sm text-gray-500 flex-shrink-0" /><span>Sao chép liên kết</span>
                        </button>
                        <button onClick={handleShare} className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-gray-300 hover:text-white hover:bg-white/5 text-left">
                          <HiShare className="text-sm text-gray-500 flex-shrink-0" /><span>Chia sẻ</span>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
                    <HiMusicNote className="text-gray-600 text-sm sm:text-base" />
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600">Chọn bài để phát</p>
                </div>
              )}
            </div>

            {/* CENTER: Controls */}
            <div className="flex flex-col items-center gap-1 sm:gap-1.5 flex-1 max-w-xl">
              <div className="flex items-center gap-3 sm:gap-4 lg:gap-5">
                <button onClick={toggleShuffle} className={`relative p-1 transition-all hidden sm:block ${shuffle ? "text-neon" : "text-gray-600 hover:text-gray-300"}`}>
                  <IoShuffle className="text-[16px] sm:text-[17px]" />
                  {shuffle && <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-neon" />}
                </button>
                <button data-player-prev-btn onClick={playPrev} className="text-gray-400 hover:text-white transition-colors">
                  <HiBackward className="text-lg sm:text-xl" />
                </button>
                <button
                  data-player-play-btn
                  onClick={togglePlay}
                  disabled={!currentSong || isLoadingStream}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${currentSong ? "bg-white text-dark hover:scale-110" : "bg-white/10 text-gray-600 cursor-not-allowed"} ${isLoadingStream ? "opacity-70 cursor-wait hover:scale-100" : ""}`}
                >
                  {isLoadingStream ? (
                    <div className="w-5 h-5 rounded-full border-[2px] border-dark border-t-transparent animate-spin" />
                  ) : isPlaying ? <HiPause className="text-lg" /> : <HiPlay className="text-lg ml-0.5" />}
                </button>
                <button data-player-next-btn onClick={playNext} className="text-gray-400 hover:text-white transition-colors">
                  <HiForward className="text-lg sm:text-xl" />
                </button>
                <button onClick={toggleRepeat} className={`relative p-1 transition-all hidden sm:block ${repeatMode !== "none" ? "text-neon" : "text-gray-600 hover:text-gray-300"}`}>
                  <IoRepeat className="text-[16px] sm:text-[17px]" />
                  {repeatMode === "one" && <span className="absolute -top-1 -right-1 bg-neon text-dark text-[8px] rounded-full w-3 h-3 flex items-center justify-center font-bold">1</span>}
                  {repeatMode !== "none" && <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-neon" />}
                </button>
              </div>
              <div className="hidden lg:block w-full"><ProgressBar /></div>
            </div>

            {/* RIGHT: Extras */}
            <div className="flex items-center justify-end gap-2 w-[28%] sm:w-[25%] lg:w-[28%]">
              <button data-player-lyrics-btn onClick={() => setLyricsOpen(!lyricsOpen)} className={`p-1.5 rounded-lg transition-all hidden sm:block ${lyricsOpen ? "text-neon bg-neon/10" : "text-gray-600 hover:text-gray-300"}`} title="Lời bài hát">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="6" x2="13" y2="6" /><line x1="3" y1="11" x2="16" y2="11" /><line x1="3" y1="16" x2="11" y2="16" />
                  <circle cx="19" cy="16" r="2" fill="currentColor" /><line x1="21" y1="16" x2="21" y2="9" /><line x1="21" y1="9" x2="24" y2="9" />
                </svg>
              </button>
              {/* Sleep Timer */}
              <div className="relative hidden sm:block" ref={sleepMenuRef}>
                <button onClick={() => setSleepMenuOpen(!sleepMenuOpen)} className={`p-1 rounded-lg transition-all relative ${sleepTimer ? 'text-neon bg-neon/10' : 'text-gray-600 hover:text-gray-300'}`} title="Hẹn giờ">
                  <HiClock className="text-base" />
                  {sleepTimer && <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-neon rounded-full" />}
                </button>
                {sleepMenuOpen && (
                  <div className="absolute bottom-full right-0 mb-2 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl py-2 w-48 z-50">
                    <p className="px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">⏱️ Hẹn giờ tắt nhạc</p>
                    {[15, 30, 45, 60].map(m => (
                      <button key={m} onClick={() => handleSleepTimer(m)} className={`w-full flex justify-between px-4 py-2.5 text-[13px] text-left hover:bg-white/5 ${sleepTimer === m ? 'text-neon' : 'text-gray-300'}`}>
                        <span>{m} phút</span>
                        {sleepTimer === m && <span className="text-neon">✓</span>}
                      </button>
                    ))}
                    <button onClick={() => handleSleepTimer('end')} className={`w-full flex justify-between px-4 py-2.5 text-[13px] text-left hover:bg-white/5 ${sleepTimer === 'end' ? 'text-neon' : 'text-gray-300'}`}>
                      <span>Hết bài này</span>
                      {sleepTimer === 'end' && <span className="text-neon">✓</span>}
                    </button>
                    <div className="mx-3 my-1 h-px bg-white/5" />
                    <div className="px-3 py-1.5 flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="999"
                        placeholder="Tùy chọn (phút)"
                        value={customMinutes}
                        onChange={(e) => setCustomMinutes(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && customMinutes) { handleSleepTimer(Number(customMinutes)); setCustomMinutes(''); } }}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-[13px] text-white placeholder-gray-500 focus:outline-none focus:border-neon/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        onClick={() => { if (customMinutes) { handleSleepTimer(Number(customMinutes)); setCustomMinutes(''); } }}
                        className="text-neon text-xs font-semibold px-2 py-1.5 rounded-lg hover:bg-neon/10 transition-colors whitespace-nowrap"
                      >OK</button>
                    </div>
                    {sleepTimer && (
                      <>
                        <div className="mx-3 my-1 h-px bg-white/5" />
                        <button onClick={() => handleSleepTimer('off')} className="w-full px-4 py-2.5 text-[13px] text-red-400 text-left hover:bg-white/5">
                          Tắt hẹn giờ
                        </button>
                      </>
                    )}
                    <div className="mx-3 my-1 h-px bg-white/5" />
                    <p className="px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">🔀 Crossfade</p>
                    {[0, 3, 5, 8].map(v => (
                      <button key={v} onClick={() => handleCrossfade(v)} className={`w-full flex justify-between px-4 py-2.5 text-[13px] text-left hover:bg-white/5 ${crossfade === v ? 'text-neon' : 'text-gray-300'}`}>
                        <span>{v === 0 ? 'Tắt' : `${v} giây`}</span>
                        {crossfade === v && <span className="text-neon">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div data-player-mute-btn className="hidden md:block"><VolumeControl /></div>
              <button onClick={() => setQueueOpen(!queueOpen)} className={`p-1 rounded-lg transition-all ${queueOpen ? "text-neon bg-neon/10" : "text-gray-600 hover:text-gray-300"}`}>
                <HiQueueList className="text-base" />
              </button>
            </div>
          </div>
          {/* Progress bar for tablet (sm-lg) */}
          <div className="px-4 pb-1 lg:hidden"><ProgressBar /></div>
        </div>

      </div>
    </div>
  );
}
