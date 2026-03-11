import { useState } from "react";
import { HiX, HiMusicNote } from "react-icons/hi";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";

export default function CreatePlaylistModal({ isOpen, onClose, songToAdd = null }) {
  const [name, setName] = useState("");
  const { createPlaylist, addSongToPlaylist } = usePlayer();
  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const newId = await createPlaylist(trimmed);
      if (newId && songToAdd) {
        await addSongToPlaylist(newId, songToAdd);
        showToast(`Đã tạo playlist "${trimmed}" và thêm "${songToAdd.title}"`, "success");
      } else if (newId) {
        showToast(`Đã tạo playlist "${trimmed}"`, "success");
      } else {
        showToast("Không thể tạo playlist", "error");
      }
    } catch (e) {
      showToast("Lỗi khi tạo playlist", "error");
    }
    setName("");
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleCreate();
    if (e.key === "Escape") onClose();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 w-full max-w-md mx-4 animate-modal-in shadow-2xl">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
        >
          <HiX className="text-xl" />
        </button>

        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-neon/10 flex items-center justify-center mx-auto mb-4">
          <HiMusicNote className="text-neon text-3xl" />
        </div>

        <h2 className="text-xl font-bold text-white text-center mb-1">
          Tạo playlist mới
        </h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          Đặt tên cho playlist của bạn
        </p>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nhập tên playlist..."
          autoFocus
          className="
            w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10
            text-white placeholder-gray-500 text-sm
            focus:outline-none focus:border-neon/50 focus:ring-1 focus:ring-neon/20
            transition-all duration-200
          "
        />

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm font-semibold hover:bg-white/5 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className={`
              flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
              ${name.trim()
                ? "bg-neon text-dark hover:shadow-neon"
                : "bg-gray-dark text-gray-500 cursor-not-allowed"
              }
            `}
          >
            Tạo playlist
          </button>
        </div>
      </div>
    </div>
  );
}
