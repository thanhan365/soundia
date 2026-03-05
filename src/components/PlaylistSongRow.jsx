import { useState, useRef, useCallback } from "react";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";
import { useClickOutside } from "../hooks/useClickOutside";
import { HiPlay, HiHeart, HiDotsHorizontal, HiTrash, HiSwitchVertical } from "react-icons/hi";
import SongContextMenu from "./SongContextMenu";

export default function PlaylistSongRow({ song, index, isPlaying, isCurrent, onPlay, onRemove, onDragStart, onDragOver, onDrop, onDragEnd, isDragging }) {
  const { toggleFavorite, isFavorite, addToQueue } = usePlayer();
  const { showToast } = useToast();
  const [menuPos, setMenuPos] = useState(null);
  const menuRef = useRef(null);

  const liked = isFavorite(song.id);

  // Close menu khi click outside
  useClickOutside(menuRef, () => setMenuPos(null));

  const handleMenu = useCallback((e) => {
    e.stopPropagation();
    setMenuPos({ x: e.clientX, y: e.clientY });
  }, []);

  const extraItems = [
    {
      icon: HiTrash,
      label: "Xóa khỏi playlist",
      action: () => { onRemove(song.id); }
    },
  ];

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
      onDragEnd={onDragEnd}
      className={`
        group flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-lg transition-all duration-200 relative
        ${isCurrent ? "bg-neon/10 border border-neon/20 shadow-neon-sm" : "hover:bg-white/5 border border-transparent"}
        ${isDragging ? "opacity-40 scale-95" : "opacity-100"}
      `}
    >
      {/* Index / playing indicator */}
      <div className="w-6 sm:w-8 flex items-center justify-center flex-shrink-0">
        {isCurrent && isPlaying ? (
          <div className="flex items-end gap-[2px] h-4">
            <span className="w-[2px] sm:w-[3px] bg-neon rounded-full animate-bounce" style={{ height: "60%", animationDelay: "0ms" }} />
            <span className="w-[2px] sm:w-[3px] bg-neon rounded-full animate-bounce" style={{ height: "100%", animationDelay: "150ms" }} />
            <span className="w-[2px] sm:w-[3px] bg-neon rounded-full animate-bounce" style={{ height: "40%", animationDelay: "300ms" }} />
          </div>
        ) : (
          <span className={`text-[10px] sm:text-xs ${isCurrent ? "text-neon font-bold" : "text-gray-600"}`}>
            {String(index + 1).padStart(2, "0")}
          </span>
        )}
      </div>

      {/* Cover + Play overlay */}
      <div className="relative w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 group/cover">
        <img
          src={song.cover}
          alt={song.title}
          className="w-full h-full rounded-lg object-cover"
        />
        <div className={`absolute inset-0 transition-all duration-300 flex items-center justify-center rounded-lg ${isCurrent && isPlaying ? "bg-black/40" : "bg-black/0 group-hover/cover:bg-black/30"}`}>
          <button
            onClick={(e) => { e.stopPropagation(); onPlay(song); }}
            className={`w-7 h-7 rounded-full bg-neon flex items-center justify-center transform transition-transform duration-300 shadow-neon ${isCurrent && isPlaying ? "scale-100" : "scale-0 group-hover/cover:scale-100"}`}
          >
            {isCurrent && isPlaying ? (
              <svg className="w-3.5 h-3.5 text-dark" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            ) : (
              <svg className="w-3.5 h-3.5 text-dark ml-0.5" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/></svg>
            )}
          </button>
        </div>
      </div>

      {/* Title + Artist */}
      <div className="flex-1 min-w-0">
        <p className={`text-[12px] sm:text-sm lg:text-base font-semibold truncate ${isCurrent ? "text-neon" : "text-white"}`}>
          {song.title}
        </p>
        <p className="text-[10px] sm:text-xs lg:text-sm text-gray-400 truncate">{song.artist}</p>
      </div>

      {/* Duration */}
      <span className="text-[10px] sm:text-xs lg:text-sm text-gray-600 w-10 sm:w-12 text-right hidden sm:block">{song.duration}</span>

      {/* Actions */}
      <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
        {/* Like */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(song.id);
            showToast(liked ? "Đã bỏ yêu thích" : "Đã thêm yêu thích", liked ? "info" : "success");
          }}
          className={`p-1 sm:p-1.5 rounded-full transition-all ${liked ? "text-red-500" : "text-gray-600 sm:opacity-0 sm:group-hover:opacity-100 hover:text-white"}`}
        >
          <HiHeart className="text-[12px] sm:text-sm lg:text-base" />
        </button>

        {/* 3 dots menu */}
        <button
          onClick={handleMenu}
          className="p-1 sm:p-1.5 rounded-full transition-all text-gray-600 sm:opacity-0 sm:group-hover:opacity-100 hover:text-white"
        >
          <HiDotsHorizontal className="text-[12px] sm:text-sm lg:text-base" />
        </button>

        {/* Drag handle */}
        <span className="cursor-grab active:cursor-grabbing p-1 sm:p-1.5 text-gray-600 hover:text-white hidden md:block" title="Kéo để sắp xếp">
          <HiSwitchVertical className="text-sm" />
        </span>
      </div>

      {/* Context Menu */}
      {menuPos && (
        <div ref={menuRef}>
          <SongContextMenu
            song={song}
            position={menuPos}
            onClose={() => setMenuPos(null)}
            extraItems={extraItems}
          />
        </div>
      )}
    </div>
  );
}
