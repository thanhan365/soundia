import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";
import { FaPlay } from "react-icons/fa";
import { HiArrowLeft, HiHeart, HiDotsHorizontal } from "react-icons/hi";
import SongContextMenu from "../components/SongContextMenu";
import api from "../utils/api";

const CHART_META = {
  viet:    { label: "Top 50 Nhạc Việt",    emoji: "🇻🇳", gradient: "from-emerald-500 to-cyan-500",   desc: "Bảng xếp hạng nhạc Việt hot nhất" },
  chinese: { label: "Top 50 Nhạc Hoa",     emoji: "🇨🇳", gradient: "from-red-500 to-orange-500",     desc: "Bảng xếp hạng nhạc Hoa nổi bật" },
  intl:    { label: "Top 50 Quốc Tế",      emoji: "🌍", gradient: "from-purple-500 to-pink-500",    desc: "Bảng xếp hạng âm nhạc quốc tế" },
};

function formatDur(sec) {
  if (!sec) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function TrendingDetailPage() {
  const { type } = useParams();
  const navigate = useNavigate();
  const { playSong, currentSong, isPlaying, togglePlay, setPlayContext, isFavorite, toggleFavorite } = usePlayer();
  const { showToast } = useToast();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ctxMenu, setCtxMenu] = useState(null);
  const [localFavs, setLocalFavs] = useState(new Set());

  const handleFavorite = (song) => {
    toggleFavorite(song);
    setLocalFavs(prev => {
      const next = new Set(prev);
      if (next.has(song.id)) next.delete(song.id);
      else next.add(song.id);
      return next;
    });
  };

  const meta = CHART_META[type] || CHART_META.viet;

  useEffect(() => {
    let mounted = true;
    const fetchSongs = async () => {
      setLoading(true);
      try {
        if (type === "intl") {
          const res = await api.get("/songs/itunes-top-charts");
          if (mounted && res?.data?.data) {
            const tracks = res.data.data.map(s => ({
              id: `itunes_intl_${s.id}`,
              title: s.title,
              artist: s.artist || "Unknown",
              cover: s.cover || "",
              audio: s.audio || "YT_STREAM",
              source: "itunes",
              isExternal: true,
            }));
            setSongs(tracks);
          }
        } else {
          // viet or chinese → use nct-chart backend (correct chart key prefixes)
          const res = await api.get(`/songs/nct-chart/${type}?limit=50`);
          if (mounted && res?.data?.data) {
            setSongs(res.data.data.map(s => ({
              id: s.id || `nct_${type}_${s.key}`,
              title: s.title,
              artist: s.artist,
              cover: s.cover,
              audio: s.audio || "YT_STREAM",
              source: "nct",
              isExternal: true,
              key: s.key,
              duration: formatDur(s.duration),
            })));
          }
        }
      } catch (err) {
        console.error("Trending fetch error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchSongs();
    return () => { mounted = false; };
  }, [type]);

  const handlePlayAll = () => {
    if (songs.length > 0) {
      setPlayContext(songs, songs[0].id);
      playSong(songs[0]);
    }
  };

  const handleShufflePlay = () => {
    if (songs.length > 0) {
      const shuffled = [...songs].sort(() => Math.random() - 0.5);
      setPlayContext(shuffled, shuffled[0].id);
      playSong(shuffled[0]);
    }
  };

  const isCurrentSong = (s) => currentSong?.id === s.id;

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <div className={`relative overflow-hidden rounded-2xl mx-2 sm:mx-0 mb-6 md:mb-8`}>
        <div className={`absolute inset-0 bg-gradient-to-r ${meta.gradient} opacity-20`} />
        <div className="absolute inset-0 bg-black/40 backdrop-blur-xl" />

        <div className="relative z-10 px-4 sm:px-6 md:px-8 py-6 md:py-10">
          <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-gray-400 hover:text-white transition-colors text-sm">
            <HiArrowLeft />
            Quay lại
          </button>

          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl md:text-4xl">{meta.emoji}</span>
            <h1 className={`text-2xl md:text-3xl lg:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r ${meta.gradient}`}>
              {meta.label}
            </h1>
          </div>
          <p className="text-gray-400 text-sm mb-5">{meta.desc}</p>

          <div className="flex gap-3">
            <button onClick={handlePlayAll} className="px-5 py-2.5 bg-neon text-dark font-bold rounded-full text-sm hover:brightness-110 transition-all hover:scale-105 shadow-neon/30 shadow-md flex items-center gap-2">
              <FaPlay className="text-xs" /> Phát tất cả
            </button>
            <button onClick={handleShufflePlay} className="px-5 py-2.5 bg-white/10 text-white font-bold rounded-full text-sm hover:bg-white/20 transition-all hover:scale-105 border border-white/10">
              🔀 Trộn bài
            </button>
          </div>
        </div>
      </div>

      {/* Song list */}
      <div className="px-2 sm:px-0">
        {loading ? (
          <div className="space-y-2">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                <div className="w-8 h-4 bg-white/5 rounded" />
                <div className="w-10 h-10 bg-white/5 rounded-lg" />
                <div className="flex-1 space-y-1.5"><div className="h-3 bg-white/5 rounded w-3/4" /><div className="h-2.5 bg-white/5 rounded w-1/2" /></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {songs.map((song, i) => {
              const isActive = isCurrentSong(song);
              const isActivePlaying = isActive && isPlaying;
              const liked = isFavorite(song.id) || localFavs.has(song.id);

              return (
                <div
                  key={song.id}
                  onClick={() => { if (isActive) togglePlay(); else { setPlayContext(songs, song.id); playSong(song); } }}
                  className={`group flex items-center gap-3 px-3 md:px-5 py-2.5 md:py-3 rounded-xl cursor-pointer transition-all duration-200
                    ${isActive ? "bg-neon/10 border border-neon/20" : "hover:bg-white/[0.04] border border-transparent"}`}
                >
                  {/* Rank */}
                  <div className="w-8 flex-shrink-0 text-center text-sm font-bold">
                    {isActivePlaying ? (
                      <div className="flex items-center justify-center gap-[2px]">
                        <span className="w-[2px] bg-neon rounded-full animate-bounce" style={{ height: "8px", animationDelay: "0ms" }} />
                        <span className="w-[2px] bg-neon rounded-full animate-bounce" style={{ height: "12px", animationDelay: "150ms" }} />
                        <span className="w-[2px] bg-neon rounded-full animate-bounce" style={{ height: "6px", animationDelay: "300ms" }} />
                      </div>
                    ) : (
                      <span className={i < 3 ? `text-transparent bg-clip-text bg-gradient-to-r ${meta.gradient}` : "text-gray-600"}>
                        {i + 1}
                      </span>
                    )}
                  </div>

                  {/* Cover */}
                  <div className="relative w-10 h-10 md:w-12 md:h-12 flex-shrink-0 group/cover rounded-lg overflow-hidden">
                    <img src={song.cover} alt={song.title} className="w-full h-full object-cover" />
                    <div className={`absolute inset-0 flex items-center justify-center transition-all ${isActivePlaying ? "bg-black/40" : "bg-black/0 group-hover/cover:bg-black/30"}`}>
                      {isActivePlaying ? (
                        <div className="flex items-center gap-[2px]">
                          <span className="w-[2px] bg-neon rounded-full animate-bounce" style={{ height: "8px", animationDelay: "0ms" }} />
                          <span className="w-[2px] bg-neon rounded-full animate-bounce" style={{ height: "12px", animationDelay: "150ms" }} />
                          <span className="w-[2px] bg-neon rounded-full animate-bounce" style={{ height: "6px", animationDelay: "300ms" }} />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-neon flex items-center justify-center transform scale-0 group-hover/cover:scale-100 transition-transform duration-300 shadow-neon">
                          <svg className="w-3 h-3 text-dark ml-0.5" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/></svg>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] md:text-sm font-semibold truncate ${isActive ? "text-neon" : "text-white"}`}>{song.title}</p>
                    <p className="text-[11px] md:text-xs text-gray-500 truncate">{song.artist}</p>
                  </div>

                  {/* Like */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleFavorite(song); showToast(liked ? "Đã bỏ yêu thích" : "Đã thêm yêu thích", liked ? "info" : "success"); }}
                    className={`p-1 rounded-full transition-all ${liked ? "text-red-500 opacity-100" : "text-gray-600 opacity-0 group-hover:opacity-100 hover:text-white"}`}
                  >
                    <HiHeart className="text-sm" />
                  </button>

                  {/* Three dots */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setCtxMenu({ song, x: e.clientX, y: e.clientY }); }}
                    className="p-1 text-gray-600 hover:text-white opacity-0 group-hover:opacity-100 transition-all rounded-full hover:bg-white/10 flex-shrink-0"
                  >
                    <HiDotsHorizontal className="text-sm" />
                  </button>

                  {/* Duration */}
                  <span className="text-[11px] md:text-sm text-gray-500 font-mono w-10 text-right group-hover:text-white transition-colors hidden sm:block">{song.duration}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Context menu */}
      {ctxMenu && (
        <SongContextMenu
          song={ctxMenu.song}
          position={{ x: ctxMenu.x, y: ctxMenu.y }}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </div>
  );
}
