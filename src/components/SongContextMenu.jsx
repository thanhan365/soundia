import { useRef, useCallback, useContext } from "react";
import { HiPlus, HiLink, HiShare, HiMusicNote, HiX, HiHeart } from "react-icons/hi";
import { HiQueueList } from "react-icons/hi2";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";
import { AuthContext } from "../context/AuthContext";
import { useClickOutside } from "../hooks/useClickOutside";

export default function SongContextMenu({ song, position, onClose, extraItems = [] }) {
  const ref = useRef(null);
  const { playlists, addSongToPlaylist, createPlaylist, setLyricsOpen, addToQueue, isFavorite, toggleFavorite } = usePlayer();
  const { showToast } = useToast();
  const { user } = useContext(AuthContext);

  useClickOutside(ref, onClose);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${song.title} - ${song.artist}`);
    showToast("Đã sao chép liên kết", "success");
    onClose();
  };

  const handleAddToQueue = useCallback(() => {
    addToQueue(song);
    showToast(`Đã thêm "${song.title}" vào hàng đợi`, "success");
    onClose();
  }, [song, addToQueue, showToast, onClose]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: song.title, text: `${song.title} - ${song.artist}`, url: window.location.href }).catch(() => {});
    } else {
      handleCopyLink();
      return;
    }
    onClose();
  };

  const handleAddToPlaylist = async (pl) => {
    if (!user) { showToast("Vui lòng đăng nhập để thêm vào playlist", "error"); onClose(); return; }
    try {
      await addSongToPlaylist(pl.id, song);
      showToast(`Đã thêm "${song.title}" vào "${pl.name}"`, "success");
    } catch (e) { showToast("Lỗi khi thêm vào playlist", "error"); }
    onClose();
  };

  const handleCreatePlaylist = async () => {
    if (!user) { showToast("Vui lòng đăng nhập để tạo playlist", "error"); onClose(); return; }
    const name = prompt('Tên playlist mới:');
    if (!name?.trim()) return;
    try {
      const newId = await createPlaylist(name.trim());
      if (newId) {
        await addSongToPlaylist(newId, song);
        showToast(`Đã tạo playlist "${name.trim()}" và thêm "${song.title}"`, "success");
      } else {
        showToast("Không thể tạo playlist", "error");
      }
    } catch (e) { showToast("Lỗi khi tạo playlist", "error"); }
    onClose();
  };

  const handleToggleFavorite = async () => {
    const wasLiked = isFavorite(song.id);
    await toggleFavorite(song);
    showToast(wasLiked ? `Đã bỏ yêu thích "${song.title}"` : `Đã thêm "${song.title}" vào yêu thích`, wasLiked ? "info" : "success");
    onClose();
  };

  const handleLyrics = () => {
    setLyricsOpen(true);
    onClose();
  };

  const liked = isFavorite(song.id);

  const menuItems = [
    { icon: HiQueueList, label: "Thêm vào danh sách chờ", action: handleAddToQueue },
    ...(playlists.length > 0
      ? playlists.map((pl) => ({
          icon: HiPlus,
          label: `Thêm vào "${pl.name}"`,
          action: () => handleAddToPlaylist(pl),
        }))
      : []),
    { icon: HiPlus, label: "Tạo playlist mới", action: handleCreatePlaylist, highlight: true },
    { icon: HiHeart, label: liked ? "Bỏ yêu thích" : "Yêu thích", action: handleToggleFavorite, highlight: liked },
    { divider: true },
    { icon: HiLink, label: "Sao chép liên kết", action: handleCopyLink },
    { icon: HiShare, label: "Chia sẻ", action: handleShare },
    { icon: HiMusicNote, label: "Xem lời bài hát", action: handleLyrics },
    ...extraItems,
  ];

  const isMobile = window.innerWidth < 640;

  const desktopStyle = {
    top: Math.min(position.y, window.innerHeight - 480),
    left: Math.min(position.x, window.innerWidth - 260),
    right: position.x > window.innerWidth - 260 ? 20 : undefined,
  };

  return (
    <div className="fixed inset-0 z-[80]" onClick={onClose}>
      {isMobile ? (
        <>
          <div className="absolute inset-0 bg-black/50" />
          <div
            ref={ref}
            className="absolute bottom-0 left-0 right-0 bg-[#1a1a2e] rounded-t-2xl py-3 px-1 animate-slide-up max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
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
            {menuItems.map((item, i) =>
              item.divider ? (
                <div key={i} className="border-t border-white/5 my-1" />
              ) : (
                <button
                  key={i}
                  onClick={item.action}
                  className={`w-full flex items-center gap-4 px-5 py-3.5 text-[14px] active:bg-white/5 transition-colors text-left ${item.highlight ? (item.icon === HiHeart ? 'text-red-500' : 'text-cyan-400') : 'text-gray-300'}`}
                >
                  <item.icon className={`text-base flex-shrink-0 ${item.highlight ? (item.icon === HiHeart ? 'text-red-500' : 'text-cyan-400') : 'text-gray-500'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              )
            )}
            <div className="h-2" />
          </div>
        </>
      ) : (
        <div
          ref={ref}
          style={desktopStyle}
          className="fixed bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl py-2 w-56 animate-fade-in max-h-[60vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {menuItems.map((item, i) =>
            item.divider ? (
              <div key={i} className="border-t border-white/5 my-1" />
            ) : (
              <button
                key={i}
                onClick={item.action}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-[13px] hover:bg-white/5 transition-colors text-left ${item.highlight ? (item.icon === HiHeart ? 'text-red-500 hover:text-red-400' : 'text-cyan-400 hover:text-cyan-300') : 'text-gray-300 hover:text-white'}`}
              >
                <item.icon className={`text-sm flex-shrink-0 ${item.highlight ? (item.icon === HiHeart ? 'text-red-500' : 'text-cyan-400') : 'text-gray-500'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
