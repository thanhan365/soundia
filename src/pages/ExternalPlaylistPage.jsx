import React, { useState, useEffect, useRef, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { HiPlus } from "react-icons/hi";
import { FaPlay, FaPause, FaHeart, FaRandom, FaEllipsisH, FaShareAlt, FaLink } from "react-icons/fa";
import { HiQueueList } from "react-icons/hi2";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";
import { AuthContext } from "../context/AuthContext";
import CreatePlaylistModal from "../components/CreatePlaylistModal";

export default function ExternalPlaylistPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playSong, currentSong, isPlaying, togglePlay, playlists, allSongs, addToQueue, isFavorite, toggleFavorite, addSongToPlaylist, createPlaylist } = usePlayer();
  const { showToast } = useToast();
  const { user } = useContext(AuthContext);
  const [songMenu, setSongMenu] = useState(null); // {id, x, y, song, sub}
  const [headerPlMenu, setHeaderPlMenu] = useState(false);
  const [createModalSong, setCreateModalSong] = useState(null); // song to add after creating playlist
  const menuRef = useRef(null);
  const headerMenuRef = useRef(null);

  // Close menus on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setSongMenu(null);
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target)) setHeaderPlMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleAddToPlaylist = async (playlistId, song) => {
    if (!user) { showToast("Vui lòng đăng nhập để thêm vào playlist", "error"); setSongMenu(null); return; }
    try {
      await addSongToPlaylist(playlistId, { ...song, isExternal: true });
      const pl = playlists.find(p => p.id === playlistId);
      showToast(`Đã thêm "${song.title}" vào "${pl?.name || 'playlist'}"`, "success");
    } catch (e) { showToast("Lỗi khi thêm vào playlist", "error"); }
    setSongMenu(null);
  };

  const handleCreateAndAdd = (song) => {
    if (!user) { showToast("Vui lòng đăng nhập để tạo playlist", "error"); setSongMenu(null); return; }
    setCreateModalSong({ ...song, isExternal: true });
    setSongMenu(null);
  };

  const handleAddAllToPlaylist = async (playlistId) => {
    if (!user) { showToast("Vui lòng đăng nhập để thêm vào playlist", "error"); setHeaderPlMenu(false); return; }
    if (!playlist?.tracks?.length) return;
    try {
      for (const song of playlist.tracks) {
        await addSongToPlaylist(playlistId, { ...song, isExternal: true });
      }
      const pl = playlists.find(p => p.id === playlistId);
      showToast(`Đã thêm ${playlist.tracks.length} bài vào "${pl?.name || 'playlist'}"`, "success");
    } catch (e) { showToast("Lỗi khi thêm vào playlist", "error"); }
    setHeaderPlMenu(false);
  };

  const handleCreatePlaylistAndAddAll = () => {
    if (!user) { showToast("Vui lòng đăng nhập để tạo playlist", "error"); setHeaderPlMenu(false); return; }
    // Open modal without a specific song - will just create playlist
    setCreateModalSong({});
    setHeaderPlMenu(false);
  };

  const handleCopyLink = (song) => {
    const text = `${song.title} - ${song.artist}`;
    navigator.clipboard.writeText(text).catch(() => {});
    showToast("Đã sao chép liên kết", "success");
    setSongMenu(null);
  };

  const handleShare = (song) => {
    if (navigator.share) {
      navigator.share({ title: song.title, text: `${song.title} - ${song.artist}`, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${song.title} - ${song.artist} | ${window.location.href}`).catch(() => {});
      showToast("Đã sao chép để chia sẻ", "success");
    }
    setSongMenu(null);
  };

  const handleToggleFavorite = async (song) => {
    const wasLiked = isFavorite(song.id);
    await toggleFavorite({ ...song, isExternal: true });
    showToast(wasLiked ? `Đã bỏ yêu thích "${song.title}"` : `Đã thêm "${song.title}" vào yêu thích`, wasLiked ? "info" : "success");
    setSongMenu(null);
  };

  const handleAddToQueue = (song) => {
    addToQueue({ ...song, audio: song.audio || 'YT_STREAM' });
    showToast(`Đã thêm "${song.title}" vào danh sách chờ`, "success");
    setSongMenu(null);
  };

  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPlaylist = async () => {
      const localPl = playlists.find(p => p.id === id || p.id === parseInt(id, 10));
      if (localPl) {
        const tracks = (localPl.songs || []).map(songId => allSongs.find(s => s.id === songId)).filter(Boolean);
        const coverFromTrack = tracks.find(t => t.cover || t.coverUrl)?.cover || tracks.find(t => t.cover || t.coverUrl)?.coverUrl || '';
        setPlaylist({ id: localPl.id, title: localPl.name, picture: localPl.cover || coverFromTrack, tracks });
        setLoading(false);
        return;
      }
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5066/api';
        const res = await fetch(`${apiUrl}/admin/public-playlists`);
        if (res.ok) {
          const data = await res.json();
          const dbPl = data.find(p => p.id === parseInt(id, 10));
          if (dbPl) {
            const tracks = (dbPl.songs || []).map(s => ({ id: s.id, title: s.title, artist: s.artist, duration: s.duration, cover: s.coverUrl || '', audio: s.audioUrl || 'YT_STREAM' }));
            const coverFromTrack = tracks.find(t => t.cover)?.cover || '';
            setPlaylist({ id: dbPl.id, title: dbPl.name, picture: dbPl.cover || coverFromTrack, tracks });
            setLoading(false);
            return;
          }
        }
      } catch (err) { console.error("Failed to fetch DB playlist:", err); }
      setPlaylist(null);
      setLoading(false);
    };
    loadPlaylist();
  }, [id, playlists, allSongs]);

  const handlePlayPlaylist = () => {
    if (playlist?.tracks?.length > 0) {
      if (currentSong && playlist.tracks.some(t => t.id === currentSong.id)) togglePlay();
      else playSong(playlist.tracks[0]);
    }
  };

  const handleShufflePlay = () => {
    if (!playlist?.tracks?.length) return;
    const shuffled = [...playlist.tracks].sort(() => Math.random() - 0.5);
    playSong(shuffled[0]);
    shuffled.slice(1).forEach(s => addToQueue({ ...s, audio: s.audio || 'YT_STREAM' }));
    showToast("Phát ngẫu nhiên", "success");
  };

  const handleAddAllToQueue = () => {
    if (!playlist?.tracks?.length) return;
    playlist.tracks.forEach(s => addToQueue({ ...s, audio: s.audio || 'YT_STREAM' }));
    showToast(`Đã thêm ${playlist.tracks.length} bài vào hàng chờ`, "success");
  };

  const isPlaylistPlaying = () => isPlaying && currentSong && playlist?.tracks?.some(t => t.id === currentSong.id);

  const coverUrl = playlist?.picture;
  const hasCover = coverUrl && coverUrl.startsWith('http');

  const totalDuration = playlist?.tracks?.reduce((sum, t) => {
    if (typeof t.duration === 'number') return sum + t.duration;
    if (typeof t.duration === 'string') { const parts = t.duration.split(':'); if (parts.length === 2) return sum + parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10); }
    return sum;
  }, 0) || 0;
  const totalMin = Math.floor(totalDuration / 60);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-400">Đang tải playlist...</p>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh]">
        <p className="text-red-400">Không tìm thấy playlist / Có lỗi xảy ra</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-cyan-400 hover:text-cyan-300">Quay lại trang chủ</button>
      </div>
    );
  }

  const getMenuStyle = (menuH = 280) => {
    if (!songMenu) return {};
    const showAbove = songMenu.y + menuH > window.innerHeight;
    return {
      position: 'fixed',
      right: Math.max(8, window.innerWidth - songMenu.x),
      ...(showAbove ? { bottom: window.innerHeight - songMenu.y + 8 } : { top: songMenu.y + 8 }),
      zIndex: 9999,
    };
  };

  return (
    <div className="pb-32 px-4 md:px-8 mt-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8 mb-10 w-full animate-fade-in-up">
        <div className="relative group w-52 h-52 md:w-64 md:h-64 flex-shrink-0">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 rounded-3xl blur opacity-30 group-hover:opacity-60 transition duration-500" />
          {hasCover ? (
            <img src={coverUrl} alt={playlist.title} className="relative w-full h-full object-cover rounded-3xl shadow-xl"
              onError={(e) => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; }} />
          ) : null}
          <div className={`relative w-full h-full bg-gradient-to-br from-purple-600 to-pink-500 rounded-3xl shadow-xl flex items-center justify-center ${hasCover ? 'hidden' : ''}`}>
            <span className="text-6xl font-bold text-white/80">{playlist.title?.charAt(0)?.toUpperCase() || '♪'}</span>
          </div>
        </div>

        <div className="flex flex-col text-center md:text-left flex-1 min-w-0">
          <p className="text-xs md:text-sm text-cyan-400 font-bold uppercase tracking-widest mb-1 md:mb-2">Playlist</p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black text-white hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-cyan-400 hover:to-purple-500 transition-all duration-300 drop-shadow-lg mb-3 line-clamp-2 md:line-clamp-none">{playlist.title}</h1>
          <div className="flex items-center justify-center md:justify-start gap-2 text-gray-400 text-sm mb-4 md:mb-6">
            <span>{playlist.tracks.length} bài hát</span>
            {totalMin > 0 && (<><span className="w-1 h-1 rounded-full bg-gray-600" /><span>{totalMin} phút</span></>)}
          </div>
          <div className="flex items-center justify-center md:justify-start gap-3">
            <button onClick={handlePlayPlaylist} className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-cyan-500/30 hover:shadow-cyan-400/50 transition-all duration-300 hover:scale-105 active:scale-95">
              {isPlaylistPlaying() ? <FaPause className="w-5 h-5" /> : <FaPlay className="w-5 h-5 ml-1" />}
              {isPlaylistPlaying() ? "Tạm Dừng" : "Phát Nhạc"}
            </button>
            <button onClick={handleShufflePlay} className="flex items-center justify-center border border-white/20 bg-white/5 hover:bg-purple-500/20 hover:border-purple-400/40 text-gray-300 hover:text-purple-300 w-12 h-12 rounded-full transition-all active:scale-95" title="Phát ngẫu nhiên">
              <FaRandom className="w-4 h-4" />
            </button>
            <button onClick={handleAddAllToQueue} className="flex items-center justify-center border border-white/20 bg-white/5 hover:bg-cyan-500/20 hover:border-cyan-400/40 text-gray-300 hover:text-cyan-300 w-12 h-12 rounded-full transition-all active:scale-95" title="Thêm tất cả vào hàng chờ">
              <HiQueueList className="w-5 h-5" />
            </button>
            <div className="relative">
              <button onClick={() => setHeaderPlMenu(!headerPlMenu)} className="flex items-center justify-center border border-white/20 bg-white/5 hover:bg-green-500/20 hover:border-green-400/40 text-gray-300 hover:text-green-300 w-12 h-12 rounded-full transition-all active:scale-95" title="Thêm vào playlist">
                <HiPlus className="w-5 h-5" />
              </button>
              {headerPlMenu && (
                <div ref={headerMenuRef} className="absolute left-0 top-14 z-50 w-56 bg-[#282040] border border-white/10 rounded-xl shadow-2xl py-2 animate-fade-in-up">
                  <p className="px-3 py-1 text-[10px] text-gray-400 uppercase tracking-wider">Thêm tất cả vào playlist</p>
                  {playlists.length > 0 ? playlists.map(pl => (
                    <button key={pl.id} onClick={() => handleAddAllToPlaylist(pl.id)} className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 truncate transition-colors">{pl.name}</button>
                  )) : <p className="px-3 py-2 text-xs text-gray-500">Chưa có playlist nào</p>}
                  <div className="border-t border-white/10 mt-1 pt-1">
                    <button onClick={handleCreatePlaylistAndAddAll} className="w-full text-left px-3 py-2 text-sm text-cyan-400 hover:bg-white/10 flex items-center gap-2 transition-colors">
                      <HiPlus className="w-4 h-4" /> Tạo playlist mới
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tracks */}
      <div className="bg-white/[0.02] border border-white/5 rounded-3xl backdrop-blur-sm p-2 md:p-6 mb-8 shadow-xl">
        <div className="hidden md:grid grid-cols-[50px_minmax(150px,2fr)_minmax(120px,1fr)_100px] gap-4 px-6 py-3 border-b border-white/5 text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
          <div className="text-center">#</div><div>BÀI HÁT</div><div>NGHỆ SĨ</div><div className="text-right">THỜI GIAN</div>
        </div>
        <div className="flex flex-col">
          {playlist.tracks.map((song, i) => {
            const isActive = currentSong?.id === song.id;
            const isActivePlaying = isActive && isPlaying;
            const liked = isFavorite(song.id);
            return (
              <div key={song.id} onClick={() => { if (isActive) togglePlay(); else playSong(song); }}
                className={`group grid grid-cols-[40px_1fr_40px] md:grid-cols-[50px_minmax(150px,2fr)_minmax(120px,1fr)_100px] gap-3 md:gap-4 px-2 md:px-6 py-2.5 md:py-3 items-center rounded-xl md:rounded-2xl cursor-pointer transition-all duration-200 ${isActive ? "bg-cyan-500/10 border border-cyan-500/20" : "hover:bg-white/[0.04] border border-transparent"}`}>
                <div className="flex justify-center text-sm font-medium text-gray-500">
                  {isActivePlaying ? (
                    <div className="flex items-end justify-center w-4 h-4 gap-[2px]">
                      <div className="w-[3px] bg-cyan-400 animate-[music-bar_1s_ease-in-out_infinite] h-full" />
                      <div className="w-[3px] bg-cyan-400 animate-[music-bar_0.8s_ease-in-out_infinite_0.2s] h-3/4" />
                      <div className="w-[3px] bg-cyan-400 animate-[music-bar_1.2s_ease-in-out_infinite_0.4s] h-[80%]" />
                    </div>
                  ) : (<span className="group-hover:hidden">{i + 1}</span>)}
                  <FaPlay className={`w-3 h-3 text-white hidden group-hover:inline-block ${isActivePlaying ? '!hidden' : ''}`} />
                </div>
                <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
                  <div className="relative w-10 h-10 md:w-12 md:h-12 flex-shrink-0">
                    <img src={song.cover} alt={song.title} className="w-full h-full object-cover rounded-md md:rounded-lg shadow-sm" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <p className={`text-[13px] md:text-sm font-semibold truncate ${isActive ? "text-cyan-400" : "text-white group-hover:text-cyan-200"}`}>{song.title}</p>
                    <p className="text-[11px] md:text-xs text-gray-400 truncate md:hidden mt-0.5">{song.artist}</p>
                  </div>
                </div>
                <div className="hidden md:flex items-center min-w-0">
                  <p className="text-xs text-gray-400 truncate group-hover:text-gray-300">{song.artist}</p>
                </div>
                <div className="flex items-center justify-end gap-2 pr-1">
                  <button onClick={(e) => { e.stopPropagation(); handleToggleFavorite(song); }}
                    className={`transition-all opacity-0 lg:group-hover:opacity-100 hover:scale-110 active:scale-90 ${liked ? 'text-pink-500 !opacity-100' : 'text-gray-500 hover:text-pink-400'}`}>
                    <FaHeart className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={(e) => {
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    setSongMenu(songMenu?.id === song.id && !songMenu?.sub ? null : { id: song.id, x: rect.right, y: rect.bottom, song });
                  }} className="text-gray-500 hover:text-white opacity-0 lg:group-hover:opacity-100 transition-all hover:scale-110 active:scale-90">
                    <FaEllipsisH className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] md:text-sm text-gray-500 font-mono w-10 text-right group-hover:text-white transition-colors">{song.duration}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fixed Context Menu */}
      {songMenu && !songMenu.sub && (
        <div className="fixed inset-0 z-[9998]" onClick={() => setSongMenu(null)}>
          <div ref={menuRef} style={getMenuStyle(280)} className="w-56 bg-[#282040] border border-white/10 rounded-xl shadow-2xl py-2 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => handleAddToQueue(songMenu.song)} className="w-full text-left px-3 py-2.5 text-sm text-white hover:bg-white/10 flex items-center gap-3 transition-colors">
              <HiQueueList className="w-4 h-4 text-cyan-400" /> Thêm vào danh sách chờ
            </button>
            <button onClick={() => setSongMenu({ ...songMenu, sub: 'pl' })} className="w-full text-left px-3 py-2.5 text-sm text-white hover:bg-white/10 flex items-center gap-3 transition-colors">
              <HiPlus className="w-4 h-4 text-green-400" /> Thêm vào playlist
            </button>
            <button onClick={() => handleToggleFavorite(songMenu.song)} className="w-full text-left px-3 py-2.5 text-sm text-white hover:bg-white/10 flex items-center gap-3 transition-colors">
              <FaHeart className={`w-4 h-4 ${isFavorite(songMenu.song.id) ? 'text-pink-500' : 'text-pink-400'}`} /> {isFavorite(songMenu.song.id) ? 'Bỏ yêu thích' : 'Yêu thích'}
            </button>
            <div className="border-t border-white/10 my-1" />
            <button onClick={() => handleCopyLink(songMenu.song)} className="w-full text-left px-3 py-2.5 text-sm text-white hover:bg-white/10 flex items-center gap-3 transition-colors">
              <FaLink className="w-4 h-4 text-gray-400" /> Sao chép liên kết
            </button>
            <button onClick={() => handleShare(songMenu.song)} className="w-full text-left px-3 py-2.5 text-sm text-white hover:bg-white/10 flex items-center gap-3 transition-colors">
              <FaShareAlt className="w-4 h-4 text-gray-400" /> Chia sẻ
            </button>
          </div>
        </div>
      )}

      {songMenu?.sub === 'pl' && (
        <div className="fixed inset-0 z-[9998]" onClick={() => setSongMenu(null)}>
          <div ref={menuRef} style={getMenuStyle(200)} className="w-56 bg-[#282040] border border-white/10 rounded-xl shadow-2xl py-2 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSongMenu({ ...songMenu, sub: undefined })} className="w-full text-left px-3 py-1.5 text-[10px] text-gray-400 uppercase tracking-wider hover:bg-white/5 flex items-center gap-1">← Quay lại</button>
            {playlists.length > 0 ? playlists.map(pl => (
              <button key={pl.id} onClick={() => handleAddToPlaylist(pl.id, songMenu.song)} className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 truncate transition-colors">{pl.name}</button>
            )) : <p className="px-3 py-2 text-xs text-gray-500">Chưa có playlist nào</p>}
            <div className="border-t border-white/10 mt-1 pt-1">
              <button onClick={() => handleCreateAndAdd(songMenu.song)} className="w-full text-left px-3 py-2 text-sm text-cyan-400 hover:bg-white/10 flex items-center gap-2 transition-colors">
                <HiPlus className="w-4 h-4" /> Tạo playlist mới
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Playlist Modal */}
      <CreatePlaylistModal
        isOpen={!!createModalSong}
        onClose={() => setCreateModalSong(null)}
        songToAdd={createModalSong?.title ? createModalSong : null}
      />
    </div>
  );
}
