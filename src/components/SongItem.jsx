import { useState, useRef, useCallback, memo } from "react";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";
import { useClickOutside } from "../hooks/useClickOutside";
import { resolveNctStream } from "../services/nctService";
import { HiPlay, HiPause } from "react-icons/hi2";
import { HiHeart, HiDotsHorizontal } from "react-icons/hi";
import { HiQueueList } from "react-icons/hi2";
import SongContextMenu from "./SongContextMenu";

function formatDuration(d) {
  if (!d && d !== 0) return "--:--";
  if (typeof d === "string" && d.includes(":")) return d;
  const sec = typeof d === "number" ? d : parseInt(d, 10);
  if (isNaN(sec) || sec <= 0) return "--:--";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
const SongItem = memo(function SongItem({ song, index }) {
  const { currentSong, isPlaying, playSong, toggleFavorite, isFavorite, addToQueue } = usePlayer();
  const { showToast } = useToast();
  const isActive = currentSong?.id === song.id;
  const liked = isFavorite(song.id);
  const [menuPos, setMenuPos] = useState(null);
  const menuRef = useRef(null);
  const prefetchTimer = useRef(null);

  // Close menu khi click outside
  useClickOutside(menuRef, () => setMenuPos(null));

  // Pre-fetch NCT stream on hover (300ms delay) — caches result for instant playback on click
  const handleMouseEnter = useCallback(() => {
    if (isActive) return; // Already playing this song
    prefetchTimer.current = setTimeout(() => {
      if (song.title) resolveNctStream(song.title, song.artist).catch(() => {});
    }, 300);
  }, [song.title, song.artist, isActive]);

  const handleMouseLeave = useCallback(() => {
    if (prefetchTimer.current) { clearTimeout(prefetchTimer.current); prefetchTimer.current = null; }
  }, []);

  const handleFav = useCallback((e) => {
    e.stopPropagation();
    toggleFavorite(song);
    showToast(liked ? "Đã bỏ yêu thích" : "Đã thêm vào yêu thích", liked ? "info" : "success");
  }, [song, liked, toggleFavorite, showToast]);

  const handleQueue = useCallback((e) => {
    e.stopPropagation();
    addToQueue(song);
    showToast(`"${song.title}" đã thêm vào hàng đợi`, "success");
  }, [song, addToQueue, showToast]);

  const handleMenu = useCallback((e) => {
    e.stopPropagation();
    setMenuPos({ x: e.clientX, y: e.clientY });
  }, []);

  return (
    <>
      <div
        onClick={() => playSong(song)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`
          w-full flex items-center gap-3 lg:gap-4 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg
          transition-colors duration-300 group cursor-pointer text-left relative
          ${isActive
            ? "bg-neon/10 border border-neon/20 shadow-[0_4px_12px_rgba(0,255,255,0.05)]"
            : "bg-transparent border border-white/0 hover:bg-white/[0.04] hover:border-white/5"
          }
        `}
      >
        {/* Cover + Play overlay */}
        <div className="relative w-10 h-10 lg:w-11 lg:h-11 rounded-md overflow-hidden flex-shrink-0 group/cover">
          <img
            src={song.cover}
            alt={song.title}
            className={`w-full h-full object-cover transition-all duration-300 ${isActive ? "shadow-neon-sm" : ""}`}
          />
          <div className={`absolute inset-0 transition-all duration-300 flex items-center justify-center rounded-lg ${isActive && isPlaying ? "bg-black/40" : "bg-black/0 group-hover/cover:bg-black/30"}`}>
            <div onClick={(e) => { e.stopPropagation(); playSong(song); }} className="cursor-pointer w-full h-full flex items-center justify-center">
              {isActive && isPlaying ? (
                <div className="flex items-center gap-[2px]">
                  <span className="w-[2px] bg-neon rounded-full animate-bounce" style={{ height: "8px", animationDelay: "0ms" }} />
                  <span className="w-[2px] bg-neon rounded-full animate-bounce" style={{ height: "12px", animationDelay: "150ms" }} />
                  <span className="w-[2px] bg-neon rounded-full animate-bounce" style={{ height: "6px", animationDelay: "300ms" }} />
                </div>
              ) : (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-neon flex items-center justify-center transform scale-0 group-hover/cover:scale-100 transition-transform duration-300 shadow-neon">
                  <svg className="w-3.5 h-3.5 text-dark ml-0.5" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" /></svg>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 pr-1 sm:pr-4 flex flex-col justify-center">
          <p className={`text-sm lg:text-[15px] font-semibold truncate transition-colors ${isActive ? "text-neon" : "text-white"}`}>
            {song.title}
          </p>
          <p className="text-xs lg:text-sm text-gray-400 mt-0.5 truncate flex items-center gap-1.5">
            {song.artist}
          </p>
        </div>

        {/* Duration */}
        <div className="w-16 text-center text-xs lg:text-sm text-gray-500 font-mono flex-shrink-0 hidden sm:block">
          {formatDuration(song.duration)}
        </div>

        {/* Actions — ẩn khi hover trên desktop, luôn hiển thị trên mobile */}
        <div className="w-auto sm:w-[100px] flex items-center justify-end gap-1 flex-shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
          {/* Add to queue */}
          <button
            onClick={handleQueue}
            className="p-1 sm:p-1.5 text-gray-500 hover:text-neon active:text-neon transition-colors rounded-full"
            title="Thêm vào hàng đợi"
          >
            <HiQueueList className="text-[11px] sm:text-sm lg:text-base" />
          </button>

          {/* Like */}
          <button
            onClick={handleFav}
            className={`p-1 sm:p-1.5 transition-all rounded-full ${liked ? "text-red-500" : "text-gray-500 hover:text-red-400 active:text-red-400"}`}
            title={liked ? "Bỏ yêu thích" : "Yêu thích"}
          >
            <HiHeart className={`text-[11px] sm:text-sm lg:text-base ${liked ? "drop-shadow-[0_0_4px_rgba(239,68,68,0.4)]" : ""}`} />
          </button>

          {/* Context menu */}
          <button
            onClick={handleMenu}
            className="p-1 sm:p-1.5 text-gray-500 hover:text-white active:text-white transition-colors rounded-full"
            title="Thêm tùy chọn"
          >
            <HiDotsHorizontal className="text-[11px] sm:text-sm lg:text-base" />
          </button>
        </div>
      </div>

      {menuPos && (
        <div ref={menuRef}>
          <SongContextMenu song={song} position={menuPos} onClose={() => setMenuPos(null)} />
        </div>
      )}
    </>
  );
});

export default SongItem;
