import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { HiPlay, HiArrowLeft, HiMusicNote } from "react-icons/hi";
import { FaPlay, FaPause, FaRandom, FaHeart } from "react-icons/fa";
import { HiQueueList } from "react-icons/hi2";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";
import api from "../utils/api";

export default function AlbumDetailPage() {
  const { key } = useParams();
  const navigate = useNavigate();
  const { playSong, currentSong, isPlaying, togglePlay, addToQueue, isFavorite, toggleFavorite, setPlayContext } = usePlayer();
  const { showToast } = useToast();

  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAlbum = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/songs/nct-playlist-detail/${key}`);
        if (res.data?.success) {
          setAlbum(res.data.data);
        }
      } catch (err) {
        console.error("Failed to load album:", err);
      }
      setLoading(false);
    };
    if (key) loadAlbum();
  }, [key]);

  const handlePlayAll = () => {
    if (!album?.tracks?.length) return;
    const isAlbumPlaying = isPlaying && currentSong && album.tracks.some(t => t.id === currentSong.id);
    if (isAlbumPlaying) {
      togglePlay();
    } else {
      setPlayContext(album.tracks, album.tracks[0].id);
      playSong(album.tracks[0]);
      album.tracks.slice(1).forEach(s => addToQueue(s));
    }
  };

  const handleShufflePlay = () => {
    if (!album?.tracks?.length) return;
    const shuffled = [...album.tracks].sort(() => Math.random() - 0.5);
    setPlayContext(album.tracks, shuffled[0].id);
    playSong(shuffled[0]);
    shuffled.slice(1).forEach(s => addToQueue(s));
    showToast("Phát ngẫu nhiên", "success");
  };

  const handleAddAllToQueue = () => {
    if (!album?.tracks?.length) return;
    album.tracks.forEach(s => addToQueue(s));
    showToast(`Đã thêm ${album.tracks.length} bài vào hàng chờ`, "success");
  };

  const isAlbumPlaying = () => isPlaying && currentSong && album?.tracks?.some(t => t.id === currentSong.id);

  const formatDuration = (dur) => {
    if (!dur) return "0:00";
    if (typeof dur === 'string') return dur;
    const m = Math.floor(dur / 60);
    const s = dur % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const totalDuration = album?.tracks?.reduce((sum, t) => {
    if (typeof t.duration === 'number') return sum + t.duration;
    if (typeof t.duration === 'string') {
      const parts = t.duration.split(':');
      if (parts.length === 2) return sum + parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }
    return sum;
  }, 0) || 0;
  const totalMin = Math.floor(totalDuration / 60);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-12 h-12 border-4 border-neon border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-400">Đang tải album...</p>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh]">
        <HiMusicNote className="text-5xl text-gray-700 mb-3" />
        <p className="text-red-400">Không tìm thấy album</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-neon hover:text-neon/80">Quay lại</button>
      </div>
    );
  }

  return (
    <div className="pb-32 px-4 md:px-8 mt-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8 mb-10 w-full animate-fade-in-up">
        <div className="relative group w-52 h-52 md:w-64 md:h-64 flex-shrink-0">
          <div className="absolute -inset-1 bg-gradient-to-r from-neon via-purple-500 to-pink-500 rounded-3xl blur opacity-30 group-hover:opacity-60 transition duration-500" />
          {album.image ? (
            <img src={album.image} alt={album.name} className="relative w-full h-full object-cover rounded-3xl shadow-xl" />
          ) : (
            <div className="relative w-full h-full bg-gradient-to-br from-neon/30 to-purple-500/30 rounded-3xl shadow-xl flex items-center justify-center">
              <HiMusicNote className="text-6xl text-neon/60" />
            </div>
          )}
        </div>

        <div className="flex flex-col text-center md:text-left flex-1 min-w-0">
          <p className="text-xs md:text-sm text-neon font-bold uppercase tracking-widest mb-1 md:mb-2">Album</p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white drop-shadow-lg mb-3 line-clamp-2">
            {album.name}
          </h1>
          {album.description && (
            <p className="text-sm text-gray-400 mb-2 line-clamp-2">{album.description}</p>
          )}
          <div className="flex items-center justify-center md:justify-start gap-2 text-gray-400 text-sm mb-4 md:mb-6">
            <span>{album.tracks?.length || album.totalSongs} bài hát</span>
            {totalMin > 0 && (<><span className="w-1 h-1 rounded-full bg-gray-600" /><span>{totalMin} phút</span></>)}
          </div>
          <div className="flex items-center justify-center md:justify-start gap-3">
            <button onClick={handlePlayAll} className="flex items-center gap-2 bg-gradient-to-r from-neon to-purple-600 hover:from-neon/80 hover:to-purple-500 text-dark px-8 py-3 rounded-full font-bold shadow-lg shadow-neon/30 hover:shadow-neon/50 transition-all duration-300 hover:scale-105 active:scale-95">
              {isAlbumPlaying() ? <FaPause className="w-5 h-5" /> : <FaPlay className="w-5 h-5 ml-1" />}
              {isAlbumPlaying() ? "Tạm Dừng" : "Phát Nhạc"}
            </button>
            <button onClick={handleShufflePlay} className="flex items-center justify-center border border-white/20 bg-white/5 hover:bg-purple-500/20 hover:border-purple-400/40 text-gray-300 hover:text-purple-300 w-12 h-12 rounded-full transition-all active:scale-95" title="Phát ngẫu nhiên">
              <FaRandom className="w-4 h-4" />
            </button>
            <button onClick={handleAddAllToQueue} className="flex items-center justify-center border border-white/20 bg-white/5 hover:bg-neon/20 hover:border-neon/40 text-gray-300 hover:text-neon w-12 h-12 rounded-full transition-all active:scale-95" title="Thêm tất cả vào hàng chờ">
              <HiQueueList className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Tracks List */}
      <div className="bg-white/[0.02] border border-white/5 rounded-3xl backdrop-blur-sm p-2 md:p-6 mb-8 shadow-xl">
        <div className="hidden md:grid grid-cols-[50px_minmax(150px,2fr)_minmax(120px,1fr)_100px] gap-4 px-6 py-3 border-b border-white/5 text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
          <div className="text-center">#</div><div>BÀI HÁT</div><div>NGHỆ SĨ</div><div className="text-right">THỜI GIAN</div>
        </div>
        <div className="flex flex-col">
          {(album.tracks || []).map((song, i) => {
            const isActive = currentSong?.id === song.id;
            const isActivePlaying = isActive && isPlaying;
            const liked = isFavorite(song.id);
            return (
              <div key={song.id || i}
                onClick={() => { if (isActive) togglePlay(); else { setPlayContext(album.tracks, song.id); playSong(song); } }}
                className={`group grid grid-cols-[40px_1fr_40px] md:grid-cols-[50px_minmax(150px,2fr)_minmax(120px,1fr)_100px] gap-3 md:gap-4 px-2 md:px-6 py-2.5 md:py-3 items-center rounded-xl md:rounded-2xl cursor-pointer transition-all duration-200 ${isActive ? "bg-neon/10 border border-neon/20" : "hover:bg-white/[0.04] border border-transparent"}`}>
                <div className="flex justify-center text-sm font-medium text-gray-500">
                  {isActivePlaying ? (
                    <div className="flex items-center gap-[2px]">
                      <span className="w-[2px] bg-neon rounded-full animate-bounce" style={{ height: "8px", animationDelay: "0ms" }} />
                      <span className="w-[2px] bg-neon rounded-full animate-bounce" style={{ height: "12px", animationDelay: "150ms" }} />
                      <span className="w-[2px] bg-neon rounded-full animate-bounce" style={{ height: "6px", animationDelay: "300ms" }} />
                    </div>
                  ) : (<span className="group-hover:hidden">{i + 1}</span>)}
                  <FaPlay className={`w-3 h-3 text-white hidden group-hover:inline-block ${isActivePlaying ? '!hidden' : ''}`} />
                </div>
                <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
                  <div className="relative w-10 h-10 md:w-12 md:h-12 flex-shrink-0">
                    <img src={song.cover || song.artwork || album.image} alt={song.title} className="w-full h-full object-cover rounded-md md:rounded-lg shadow-sm" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <p className={`text-[13px] md:text-sm font-semibold truncate ${isActive ? "text-neon" : "text-white group-hover:text-neon/80"}`}>{song.title}</p>
                    <p className="text-[11px] md:text-xs text-gray-400 truncate md:hidden mt-0.5">{song.artist}</p>
                  </div>
                </div>
                <div className="hidden md:flex items-center min-w-0">
                  <p className="text-xs text-gray-400 truncate group-hover:text-gray-300">{song.artist}</p>
                </div>
                <div className="flex items-center justify-end gap-2 pr-1">
                  <button onClick={(e) => { e.stopPropagation(); toggleFavorite({ ...song, isExternal: true }); }}
                    className={`transition-all opacity-0 lg:group-hover:opacity-100 hover:scale-110 active:scale-90 ${liked ? 'text-red-500 !opacity-100' : 'text-gray-500 hover:text-red-400'}`}>
                    <FaHeart className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] md:text-sm text-gray-500 font-mono w-10 text-right group-hover:text-white transition-colors">
                    {formatDuration(song.duration)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
