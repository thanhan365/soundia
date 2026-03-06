import { useEffect, useRef, useCallback } from "react";
import { HiPlus, HiLink, HiShare, HiMusicNote, HiX } from "react-icons/hi";
import { HiQueueList } from "react-icons/hi2";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";
import { useClickOutside } from "../hooks/useClickOutside";

export default function SongContextMenu({ song, position, onClose, extraItems = [] }) {
  const ref = useRef(null);
  const { playlists, addSongToPlaylist, setLyricsOpen, addToQueue } = usePlayer();
  const { showToast } = useToast();

  // Close menu khi click outside
  useClickOutside(ref, onClose);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://soundia.app/song/${song.id}`);
    showToast("Đã sao chép liên kết", "success");
    onClose();
  };

  const handleAddToQueue = useCallback(() => {
    addToQueue(song);
    showToast(`"${song.title}" đã thêm vào hàng đợi`, "success");
    onClose();
  }, [song, addToQueue, showToast, onClose]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: song.title, text: `${song.title} - ${song.artist}`, url: window.location.href });
    } else {
      handleCopyLink();
    }
    onClose();
  };

  const handleAddToPlaylist = (pl) => {
    addSongToPlaylist(pl.id, song);
    showToast(`Đã thêm vào "${pl.name}"`, "success");
    onClose();
  };

  const handleLyrics = () => {
    setLyricsOpen(true);
    onClose();
  };

  const menuItems = [
    { icon: HiQueueList, label: "Thêm vào danh sách chờ", action: handleAddToQueue },
    ...(playlists.length > 0
      ? playlists.map((pl) => ({
          icon: HiPlus,
          label: `Thêm vào "${pl.name}"`,
          action: () => handleAddToPlaylist(pl),
        }))
      : []),
    { icon: HiLink, label: "Sao chép liên kết", action: handleCopyLink },
    { icon: HiShare, label: "Chia sẻ", action: handleShare },
    { icon: HiMusicNote, label: "Xem lời bài hát", action: handleLyrics },
    ...extraItems,
  ];

  const isMobile = window.innerWidth < 640;

  // Desktop: context menu tại vị trí click
  const desktopStyle = {
    top: Math.min(position.y, window.innerHeight - 300),
    left: Math.min(position.x, window.innerWidth - 220),
  };

  return (
    <div className="fixed inset-0 z-[80]" onClick={onClose}>
      {isMobile ? (
        /* ═══ MOBILE: Bottom sheet ═══ */
        <>
          <div className="absolute inset-0 bg-black/50" />
          <div
            ref={ref}
            className="absolute bottom-0 left-0 right-0 bg-[#1a1a2e] rounded-t-2xl py-3 px-1 animate-slide-up max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 pb-3 mb-1 border-b border-white/5">
              <img src={song.cover} alt="" className="w-10 h-10 rounded-lg object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{song.title}</p>
                <p className="text-xs text-gray-500 truncate">{song.artist}</p>
              </div>
              <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-white">
                <HiX className="text-lg" />
              </button>
            </div>

            {/* Items */}
            {menuItems.map((item, i) => (
              <button
                key={i}
                onClick={item.action}
                className="w-full flex items-center gap-4 px-5 py-3.5 text-[14px] text-gray-300 active:bg-white/5 transition-colors text-left"
              >
                <item.icon className="text-base text-gray-500 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            ))}

            {/* Safe area bottom */}
            <div className="h-2" />
          </div>
        </>
      ) : (
        /* ═══ DESKTOP: Context menu ═══ */
        <div
          ref={ref}
          style={desktopStyle}
          className="fixed bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl py-2 w-52 animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          {menuItems.map((item, i) => (
            <button
              key={i}
              onClick={item.action}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-gray-300 hover:text-white hover:bg-white/5 transition-colors text-left"
            >
              <item.icon className="text-sm text-gray-500 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
