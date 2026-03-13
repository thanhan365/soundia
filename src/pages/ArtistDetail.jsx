import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaPlay, FaPause, FaRandom } from "react-icons/fa";
import { HiPlay, HiPause, HiHeart, HiDotsHorizontal, HiClock } from "react-icons/hi";
import { HiQueueList } from "react-icons/hi2";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";
import { useClickOutside } from "../hooks/useClickOutside";
import SongContextMenu from "../components/SongContextMenu";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:5066/api";

function formatDur(sec) {
  if (!sec || sec <= 0) return "--:--";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatTotalDur(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h} giờ ${m} phút`;
  return `${m} phút`;
}

// ─── Song Row Component (like PlaylistSongRow but without drag/remove) ───
function ArtistSongRow({ song, index, isPlaying, isCurrent, onPlay }) {
  const { toggleFavorite, isFavorite, addToQueue } = usePlayer();
  const { showToast } = useToast();
  const [menuPos, setMenuPos] = useState(null);
  const menuRef = useRef(null);
  const liked = isFavorite(song.id);

  useClickOutside(menuRef, () => setMenuPos(null));

  const handleMenu = useCallback((e) => {
    e.stopPropagation();
    setMenuPos({ x: e.clientX, y: e.clientY });
  }, []);

  return (
    <div
      onClick={() => onPlay(song)}
      className={`
        group flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-lg transition-all duration-200 relative cursor-pointer
        ${isCurrent ? "bg-neon/10 border border-neon/20 shadow-neon-sm" : "hover:bg-white/5 border border-transparent"}
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
        <img src={song.cover} alt={song.title} className="w-full h-full rounded-lg object-cover" />
        <div className={`absolute inset-0 transition-all duration-300 flex items-center justify-center rounded-lg ${isCurrent && isPlaying ? "bg-black/40" : "bg-black/0 group-hover/cover:bg-black/30"}`}>
          <div className="cursor-pointer w-full h-full flex items-center justify-center">
            {isCurrent && isPlaying ? (
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

      {/* Title + Artist */}
      <div className="flex-1 min-w-0">
        <p className={`text-[12px] sm:text-sm lg:text-base font-semibold truncate ${isCurrent ? "text-neon" : "text-white"}`}>
          {song.title}
        </p>
        <p className="text-[10px] sm:text-xs lg:text-sm text-gray-400 truncate">{song.artist}</p>
      </div>

      {/* Duration */}
      <span className="text-[10px] sm:text-xs lg:text-sm text-gray-600 w-10 sm:w-12 text-right hidden sm:block">{formatDur(song.duration)}</span>

      {/* Actions */}
      <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
        {/* Like */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(song.id);
            showToast(liked ? "Đã bỏ yêu thích" : "Đã thêm yêu thích", liked ? "info" : "success");
          }}
          className={`p-1 sm:p-1.5 rounded-full transition-all ${liked ? "text-red-500 sm:opacity-100" : "text-gray-600 sm:opacity-0 sm:group-hover:opacity-100 hover:text-white"}`}
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
      </div>

      {/* Context Menu */}
      {menuPos && (
        <div ref={menuRef}>
          <SongContextMenu
            song={song}
            position={menuPos}
            onClose={() => setMenuPos(null)}
          />
        </div>
      )}
    </div>
  );
}

// ─── Main Artist Detail Page ───
export default function ArtistDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playSong, currentSong, isPlaying, togglePlay, setPlayContext, addToQueue } = usePlayer();
  const { showToast } = useToast();
  const artistName = decodeURIComponent(id);

  const [artist, setArtist] = useState(null);
  const [topTracks, setTopTracks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArtistSongs = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API}/songs/nct-artist-songs`, {
          params: { name: artistName, limit: 20 }
        });
        const data = res.data;
        if (data.success && data.data) {
          setArtist({
            name: data.data.artistName,
            picture: data.data.artistImage,
            followers: data.data.followers || 0
          });
          setTopTracks(data.data.tracks || []);
        }
      } catch (e) {
        console.error("Error fetching artist songs:", e);
      } finally {
        setLoading(false);
      }
    };
    if (artistName) fetchArtistSongs();
  }, [artistName]);

  const isCurrentArtist = topTracks.some(t => t.id === currentSong?.id);

  const playAll = () => {
    if (topTracks.length > 0) {
      setPlayContext(topTracks);
      playSong(topTracks[0]);
      showToast(`Đang phát bài hát của ${artist?.name}`, "success");
    }
  };

  const toggleAll = () => {
    isCurrentArtist && isPlaying ? togglePlay() : playAll();
  };

  const shufflePlay = () => {
    if (!topTracks.length) return;
    const shuffled = [...topTracks].sort(() => Math.random() - 0.5);
    setPlayContext(topTracks);
    playSong(shuffled[0]);
    showToast(`Phát ngẫu nhiên ${artist?.name}`, "success");
  };

  const addAllToQueue = () => {
    if (!topTracks.length) return;
    topTracks.forEach(s => addToQueue(s));
    showToast(`Đã thêm ${topTracks.length} bài vào hàng chờ`, "success");
  };

  const handlePlayTrack = (song) => {
    if (currentSong?.id === song.id) {
      togglePlay();
    } else {
      setPlayContext(topTracks);
      playSong(song);
    }
  };

  const totalDuration = topTracks.reduce((sum, s) => sum + (s.duration || 0), 0);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-400">Đang tải thông tin nghệ sĩ...</p>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh]">
        <p className="text-red-400">Không tìm thấy nghệ sĩ</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-purple-400 hover:text-purple-300">
          Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="-mx-2 sm:-mx-4 lg:-mx-8 -mt-6">
      {/* ═══════════ HERO BANNER ═══════════ */}
      <div className="relative w-full h-64 md:h-80 overflow-hidden group">
        {/* Background Cover */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-105"
          style={{ backgroundImage: `url(${artist.picture})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050511] via-[#050511]/60 to-transparent" />

        {/* Content overlay */}
        <div className="relative z-10 h-full flex flex-col justify-end p-6 md:p-10">
          <div className="flex items-center gap-2 mb-2 text-purple-300 text-sm font-semibold uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            Nghệ Sĩ
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-white drop-shadow-lg mb-2">
            {artist.name}
          </h1>
          <p className="text-[13px] text-gray-300">
            {artist.followers > 0 && (
              <>
                <span className="font-semibold text-white">{new Intl.NumberFormat('vi-VN').format(artist.followers)}</span> người theo dõi
                <span className="mx-2 text-gray-500">•</span>
              </>
            )}
            <span className="font-semibold text-white">{topTracks.length}</span> bài hát
            <span className="mx-2 text-gray-500">•</span>
            <span>{formatTotalDur(totalDuration)}</span>
          </p>
        </div>
      </div>

      {/* Action buttons bar */}
      <div className="px-4 sm:px-6 lg:px-10 py-4 flex items-center gap-3">
        <button
          onClick={toggleAll}
          disabled={!topTracks.length}
          className="flex items-center gap-2 sm:gap-2.5 px-5 py-2.5 sm:px-7 sm:py-3 bg-neon text-dark rounded-full font-bold text-xs sm:text-sm hover:brightness-110 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-neon-sm active:scale-95"
        >
          {isCurrentArtist && isPlaying ? <HiPause className="text-xl" /> : <HiPlay className="text-xl" />}
          {isCurrentArtist && isPlaying ? "Tạm dừng" : "Phát tất cả"}
        </button>

        <button onClick={shufflePlay} disabled={!topTracks.length}
          className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-purple-300 hover:bg-purple-500/10 transition-all disabled:opacity-30" title="Phát ngẫu nhiên">
          <FaRandom className="text-base" />
        </button>
        <button onClick={addAllToQueue} disabled={!topTracks.length}
          className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-all disabled:opacity-30" title="Thêm tất cả vào hàng chờ">
          <HiQueueList className="text-lg" />
        </button>
      </div>

      {/* ═══════════ SONG TABLE ═══════════ */}
      <div className="px-4 sm:px-6 lg:px-10 mt-2">
        {/* Column headers */}
        <div className="flex items-center gap-3 px-3 py-3 border-b border-white/5 mb-2">
          <div className="w-8 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">#</div>
          <div className="w-10" />
          <div className="flex-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tiêu đề</div>
          <div className="w-12 text-right hidden sm:flex items-center justify-end">
            <HiClock className="text-gray-500 text-xs" />
          </div>
          <div className="w-20 hidden sm:block" />
        </div>

        {/* Songs */}
        <div className="space-y-0.5 pb-32">
          {topTracks.map((song, i) => (
            <ArtistSongRow
              key={song.id}
              song={song}
              index={i}
              isPlaying={isPlaying}
              isCurrent={currentSong?.id === song.id}
              onPlay={handlePlayTrack}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
