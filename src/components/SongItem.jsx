import { useState } from "react";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";
import { HiPlay, HiPause } from "react-icons/hi2";
import { HiHeart, HiDotsHorizontal } from "react-icons/hi";
import { HiQueueList } from "react-icons/hi2";
import SongContextMenu from "./SongContextMenu";

export default function SongItem({ song, index }) {
  const { currentSong, isPlaying, playSong, toggleFavorite, isFavorite, addToQueue } = usePlayer();
  const { showToast } = useToast();
  const isActive = currentSong?.id === song.id;
  const liked = isFavorite(song.id);
  const [menuPos, setMenuPos] = useState(null);

  const handleFav = (e) => {
    e.stopPropagation();
    toggleFavorite(song.id);
    showToast(liked ? "Đã bỏ yêu thích" : "Đã thêm vào yêu thích", liked ? "info" : "success");
  };

  const handleQueue = (e) => {
    e.stopPropagation();
    addToQueue(song);
    showToast(`"${song.title}" đã thêm vào hàng đợi`, "success");
  };

  const handleMenu = (e) => {
    e.stopPropagation();
    setMenuPos({ x: e.clientX, y: e.clientY });
  };

  return (
    <>
      <button
        onClick={() => playSong(song)}
        className={`
          w-full flex items-center gap-3 p-3 rounded-xl
          transition-all duration-300 group text-left relative
          ${isActive
            ? "bg-neon/10 border border-neon/20"
            : "bg-white/[0.02] border border-transparent hover:bg-white/[0.05] hover:border-white/5"
          }
        `}
      >
        {/* Index / Play overlay */}
        <div
          className={`
            w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
            transition-all duration-300 relative overflow-hidden
            ${isActive ? "bg-neon/15" : "bg-white/5 group-hover:bg-neon/10"}
          `}
        >
          {isActive && isPlaying ? (
            <div className="flex items-center gap-0.5">
              <span className="w-0.5 h-3 bg-neon rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-0.5 h-4 bg-neon rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-0.5 h-2 bg-neon rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          ) : isActive ? (
            <HiPause className="text-neon text-lg" />
          ) : (
            <>
              <span className="text-gray-500 text-xs font-medium group-hover:hidden">
                {String(index + 1).padStart(2, "0")}
              </span>
              <HiPlay className="text-neon text-lg hidden group-hover:block" />
            </>
          )}
        </div>

        {/* Cover */}
        <img
          src={song.cover}
          alt={song.title}
          className={`
            w-10 h-10 rounded-lg object-cover flex-shrink-0
            transition-all duration-300
            ${isActive ? "shadow-neon-sm" : ""}
          `}
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold truncate transition-colors ${isActive ? "text-neon" : "text-white"}`}>
            {song.title}
          </p>
          <p className="text-xs text-gray-500 truncate">{song.artist}</p>
        </div>

        {/* Duration */}
        <span className="text-xs text-gray-600 font-mono flex-shrink-0 hidden sm:block">
          {song.duration}
        </span>

        {/* Action buttons - shown on hover */}
        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Add to queue */}
          <button
            onClick={handleQueue}
            className="p-1.5 text-gray-500 hover:text-neon transition-colors rounded-full hover:bg-white/5"
            title="Thêm vào hàng đợi"
          >
            <HiQueueList className="text-sm" />
          </button>

          {/* Like */}
          <button
            onClick={handleFav}
            className={`p-1.5 transition-all rounded-full hover:bg-white/5 ${liked ? "text-red-500" : "text-gray-500 hover:text-red-400"}`}
            title={liked ? "Bỏ yêu thích" : "Yêu thích"}
          >
            <HiHeart className={`text-sm ${liked ? "drop-shadow-[0_0_4px_rgba(239,68,68,0.4)]" : ""}`} />
          </button>

          {/* Context menu */}
          <button
            onClick={handleMenu}
            className="p-1.5 text-gray-500 hover:text-white transition-colors rounded-full hover:bg-white/5"
            title="Thêm tùy chọn"
          >
            <HiDotsHorizontal className="text-sm" />
          </button>
        </div>

        {/* Always visible like on non-hover for active */}
        {!isActive && (
          <button
            onClick={handleFav}
            className={`p-1 flex-shrink-0 group-hover:hidden ${liked ? "text-red-500" : "text-transparent"}`}
          >
            <HiHeart className="text-sm" />
          </button>
        )}
      </button>

      {/* Context Menu */}
      {menuPos && (
        <SongContextMenu song={song} position={menuPos} onClose={() => setMenuPos(null)} />
      )}
    </>
  );
}
