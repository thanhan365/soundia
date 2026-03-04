import { useEffect, useRef } from "react";
import { HiPlus, HiLink, HiShare, HiMusicNote } from "react-icons/hi";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";

export default function SongContextMenu({ song, position, onClose }) {
  const ref = useRef(null);
  const { playlists, addSongToPlaylist, setLyricsOpen } = usePlayer();
  const { showToast } = useToast();

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://soundia.app/song/${song.id}`);
    showToast("Đã sao chép liên kết", "success");
    onClose();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: song.title, text: `${song.title} - ${song.artist}`, url: window.location.href });
    } else {
      handleCopyLink();
    }
    onClose();
  };

  const handleAddToPlaylist = (pl) => {
    addSongToPlaylist(pl.id, song.id);
    showToast(`Đã thêm vào "${pl.name}"`, "success");
    onClose();
  };

  const handleLyrics = () => {
    setLyricsOpen(true);
    onClose();
  };

  const menuItems = [
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
  ];

  // Position the menu
  const style = {
    top: Math.min(position.y, window.innerHeight - 300),
    left: Math.min(position.x, window.innerWidth - 220),
  };

  return (
    <div className="fixed inset-0 z-[80]" onClick={onClose}>
      <div
        ref={ref}
        style={style}
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
    </div>
  );
}
