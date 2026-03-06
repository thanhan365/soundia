import { useState, useRef, useCallback } from "react";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";
import { useClickOutside } from "../hooks/useClickOutside";
import { HiPlay, HiPause } from "react-icons/hi2";
import { HiHeart, HiDotsHorizontal } from "react-icons/hi";
import { HiQueueList } from "react-icons/hi2";
import SongContextMenu from "./SongContextMenu";

function SongItem({ song, index }) {
  const { currentSong, isPlaying, playSong, toggleFavorite, isFavorite, addToQueue } = usePlayer();
  const { showToast } = useToast();
  const isActive = currentSong?.id === song.id;
  const liked = isFavorite(song.id);
  const [menuPos, setMenuPos] = useState(null);
  const menuRef = useRef(null);

  // Close menu khi click outside
  useClickOutside(menuRef, () => setMenuPos(null));

  const handleFav = useCallback((e) => {
    e.stopPropagation();
    toggleFavorite(song.id);
    showToast(liked ? "Đã bỏ yêu thích" : "Đã thêm vào yêu thích", liked ? "info" : "success");
  }, [song.id, liked, toggleFavorite, showToast]);

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
        className={`
          w-full flex items-center gap-1 sm:gap-2 lg:gap-3 p-2 sm:p-2.5 lg:p-3 rounded-lg sm:rounded-xl
          transition-all duration-300 group text-left relative
          ${isActive
            ? "bg-neon/10 border border-neon/20"
            : "bg-white/[0.02] border border-transparent hover:bg-white/[0.05] hover:border-white/5"
          }
        `}
      >
        {/* Cover + Play overlay */}
        <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-lg overflow-hidden flex-shrink-0 group/cover">
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
                <svg className="w-3.5 h-3.5 text-dark ml-0.5" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/></svg>
              </div>
            )}
          </div>
        </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className={`text-[12px] sm:text-sm lg:text-base font-semibold truncate transition-colors ${isActive ? "text-neon" : "text-white"}`}>
            {song.title}
          </p>
          <p className="text-[10px] sm:text-xs lg:text-sm text-gray-500 truncate">{song.artist}</p>
        </div>

        {/* Duration */}
        <span className="text-[10px] sm:text-xs lg:text-sm text-gray-600 font-mono flex-shrink-0 hidden sm:block">
          {song.duration}
        </span>

        {/* Actions — ẩn khi hover trên desktop, luôn hiển thị trên mobile */}
        <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
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
}

export default SongItem;
