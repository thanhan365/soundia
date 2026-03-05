import { useState, useRef, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";
import PlaylistSongRow from "../components/PlaylistSongRow";
import { HiTrash, HiPlay, HiPause, HiPencil, HiPhotograph, HiClock } from "react-icons/hi";
import { HiMusicalNote } from "react-icons/hi2";

function parseDuration(str) {
  if (!str) return 0;
  const parts = str.split(":");
  return parts.length === 2 ? parseInt(parts[0]) * 60 + parseInt(parts[1]) : 0;
}

function formatTotalDuration(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h} giờ ${m} phút`;
  if (m > 0) return `${m} phút ${s} giây`;
  return `${s} giây`;
}

export default function PlaylistPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    playlists, allSongs, deletePlaylist, removeSongFromPlaylist,
    playSong, currentSong, isPlaying, togglePlay,
    renamePlaylist, reorderPlaylistSongs, setPlaylistCover,
  } = usePlayer();
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [dragIdx, setDragIdx] = useState(null);
  const fileInputRef = useRef(null);

  const playlist = playlists.find((pl) => pl.id === id);

  useEffect(() => {
    if (!playlist || typeof window === "undefined") return;
    const resolvedCount = playlist.songs.reduce(
      (acc, sid) =>
        acc + (allSongs.some((s) => String(s.id) === String(sid)) ? 1 : 0),
      0
    );
    // #region agent log
    fetch("http://127.0.0.1:7340/ingest/7a476181-2b3f-4bea-8a0b-e17fa8639b01", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "6bc027",
      },
      body: JSON.stringify({
        sessionId: "6bc027",
        runId: "pre-fix",
        hypothesisId: "PL_COUNT",
        location: "PlaylistPage.jsx:44",
        message: "PlaylistPage playlist vs resolved songs",
        data: {
          playlistId: playlist.id,
          rawCount: playlist.songs.length,
          resolvedCount,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, [playlist, allSongs]);

  if (!playlist) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <HiMusicalNote className="text-6xl text-gray-600 mb-5" />
        <h2 className="text-2xl font-bold text-white mb-2">Playlist không tồn tại</h2>
        <p className="text-gray-500 text-sm">Playlist đã bị xóa hoặc không hợp lệ.</p>
      </div>
    );
  }

  const songs = playlist.songs.map((sid) => allSongs.find((s) => String(s.id) === String(sid))).filter(Boolean);
  const totalDuration = songs.reduce((sum, s) => sum + parseDuration(s.duration), 0);
  const isCurrentPl = songs.some((s) => s.id === currentSong?.id);
  const covers = songs.slice(0, 4).map((s) => s.cover);

  // Actions
  const playAll = () => { if (songs.length) { playSong(songs[0]); showToast(`Đang phát "${playlist.name}"`, "success"); } };
  const toggleAll = () => { isCurrentPl && isPlaying ? togglePlay() : playAll(); };
  const delPlaylist = () => { deletePlaylist(id); showToast(`Đã xóa "${playlist.name}"`, "info"); navigate("/library"); };
  const removeSong = (sid) => { removeSongFromPlaylist(id, sid); showToast("Đã xóa bài khỏi playlist", "info"); };
  const startEdit = () => { setEditName(playlist.name); setEditing(true); };
  const saveEdit = () => { renamePlaylist(id, editName); setEditing(false); showToast("Đã đổi tên", "success"); };

  const uploadCover = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setPlaylistCover(id, ev.target.result); showToast("Đã cập nhật ảnh bìa", "success"); };
    reader.readAsDataURL(file);
  };

  // Drag
  const onDragStart = useCallback((e, i) => { setDragIdx(i); e.dataTransfer.effectAllowed = "move"; }, []);
  const onDragOver = useCallback((e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }, []);
  const onDrop = useCallback((e, dropI) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === dropI) return;
    const arr = [...playlist.songs]; const [m] = arr.splice(dragIdx, 1); arr.splice(dropI, 0, m);
    reorderPlaylistSongs(id, arr); setDragIdx(null);
  }, [dragIdx, playlist.songs, id, reorderPlaylistSongs]);
  const onDragEnd = useCallback(() => setDragIdx(null), []);

  return (
    <div className="-mx-2 sm:-mx-4 lg:-mx-8 -mt-6">
      {/* ═══════════ HERO HEADER ═══════════ */}
      <div className="relative px-4 sm:px-6 lg:px-10 pt-6 sm:pt-10 pb-6 sm:pb-8 bg-gradient-to-b from-neon/8 via-neon/3 to-transparent">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-4 sm:gap-7 max-w-5xl mx-auto">
          {/* Cover */}
          <div
            className="relative w-32 h-32 sm:w-44 sm:h-44 md:w-52 md:h-52 rounded-xl overflow-hidden flex-shrink-0 group/cover cursor-pointer shadow-[0_8px_40px_rgba(0,0,0,0.5)] hover:shadow-[0_8px_50px_rgba(29,185,144,0.15)] transition-shadow duration-500"
            onClick={() => fileInputRef.current?.click()}
          >
            {playlist.cover ? (
              <img src={playlist.cover} alt="" className="w-full h-full object-cover" />
            ) : covers.length >= 4 ? (
              <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
                {covers.map((src, i) => <img key={i} src={src} alt="" className="w-full h-full object-cover" />)}
              </div>
            ) : covers.length > 0 ? (
              <img src={covers[0]} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-dark-light to-dark-card flex items-center justify-center">
                <HiMusicalNote className="text-5xl text-gray-600" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/cover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-1">
              <HiPhotograph className="text-2xl text-white" />
              <span className="text-[11px] text-gray-300 font-medium">Đổi ảnh bìa</span>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={uploadCover} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 text-center md:text-left">
            <p className="text-[10px] font-bold text-neon/70 uppercase tracking-[0.2em] mb-2">Playlist</p>

            {editing ? (
              <div className="flex items-center gap-2 mb-3 justify-center md:justify-start">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                  autoFocus
                  className="bg-white/5 border border-white/15 rounded-lg px-4 py-2.5 text-2xl font-bold text-white outline-none focus:border-neon/40 w-full max-w-sm"
                />
                <button onClick={saveEdit} className="px-4 py-2.5 bg-neon text-dark rounded-lg text-sm font-bold hover:opacity-90 flex-shrink-0">Lưu</button>
                <button onClick={() => setEditing(false)} className="px-3 py-2.5 text-gray-400 text-sm hover:text-white flex-shrink-0">Hủy</button>
              </div>
            ) : (
              <h1
                className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-white mb-3 truncate cursor-pointer group/title hover:text-neon/90 transition-colors"
                onClick={startEdit}
                title="Bấm để đổi tên"
              >
                {playlist.name}
                <HiPencil className="inline-block ml-3 text-base text-gray-600 opacity-0 group-hover/title:opacity-100 transition-opacity align-middle" />
              </h1>
            )}

            <p className="text-[13px] text-gray-400 mb-5">
              <span className="font-semibold text-gray-300">{songs.length}</span> bài hát
              <span className="mx-2 text-gray-600">•</span>
              <span>{formatTotalDuration(totalDuration)}</span>
            </p>

            {/* Buttons */}
            <div className="flex items-center gap-3 justify-center md:justify-start">
              <button
                onClick={toggleAll}
                disabled={!songs.length}
                className="flex items-center gap-2 sm:gap-2.5 px-5 py-2.5 sm:px-7 sm:py-3 bg-neon text-dark rounded-full font-bold text-xs sm:text-sm hover:brightness-110 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-neon-sm active:scale-95"
              >
                {isCurrentPl && isPlaying ? <HiPause className="text-xl" /> : <HiPlay className="text-xl" />}
                {isCurrentPl && isPlaying ? "Tạm dừng" : "Phát tất cả"}
              </button>

              <button onClick={startEdit} className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all" title="Đổi tên">
                <HiPencil className="text-lg" />
              </button>
              <button onClick={delPlaylist} className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-all" title="Xóa playlist">
                <HiTrash className="text-lg" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ SONG TABLE ═══════════ */}
      <div className="px-4 sm:px-6 lg:px-10 max-w-5xl mx-auto mt-2">
        {songs.length > 0 ? (
          <>
            {/* Column headers */}
            <div className="flex items-center gap-3 px-3 py-3 border-b border-white/5 mb-2">
              <div className="w-8 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">#</div>
              <div className="w-10" />
              <div className="flex-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tiêu đề</div>
              <div className="w-12 text-right hidden sm:flex items-center justify-end">
                <HiClock className="text-gray-500 text-xs" />
              </div>
              <div className="w-28 hidden sm:block" />
            </div>

            {/* Songs */}
            <div className="space-y-0.5">
              {songs.map((song, i) => (
                <PlaylistSongRow
                  key={`${song.id}-${i}`}
                  song={song}
                  index={i}
                  isPlaying={isPlaying}
                  isCurrent={currentSong?.id === song.id}
                  onPlay={playSong}
                  onRemove={removeSong}
                  onDragStart={onDragStart}
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                  onDragEnd={onDragEnd}
                  isDragging={dragIdx === i}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-5">
              <HiMusicalNote className="text-3xl text-gray-600" />
            </div>
            <p className="text-white font-semibold mb-1">Playlist trống</p>
            <p className="text-gray-500 text-sm max-w-xs">
              Bấm dấu ··· ở thanh phát nhạc hoặc chuột phải vào bài hát để thêm vào playlist.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
