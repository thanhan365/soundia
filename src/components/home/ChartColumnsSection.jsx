import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePlayer } from "../../context/PlayerContext";
import api from "../../utils/api";
import { HiChevronRight, HiDotsHorizontal } from "react-icons/hi";
import SongContextMenu from "../SongContextMenu";

const CHARTS = [
  { key: "viet",    label: "Top 50 Nhạc Việt",    gradient: "from-emerald-500 to-cyan-500",    emoji: "🇻🇳" },
  { key: "chinese", label: "Top 50 Nhạc Hoa",     gradient: "from-red-500 to-orange-500",      emoji: "🇨🇳" },
  { key: "intl",    label: "Top 50 Quốc Tế",      gradient: "from-purple-500 to-pink-500",     emoji: "🌍" },
];

function formatDur(sec) {
  if (!sec) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function ChartColumn({ chart, songs, loading, onPlaySong, currentSong, isPlaying }) {
  const navigate = useNavigate();
  const previewSongs = songs.slice(0, 5);
  const [ctxMenu, setCtxMenu] = useState(null);

  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3 md:p-4 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <h3 className={`text-sm sm:text-base md:text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r ${chart.gradient} flex items-center gap-1.5`}>
          <span className="text-base">{chart.emoji}</span>
          <span className="truncate">{chart.label}</span>
        </h3>
        <button
          onClick={() => navigate(`/trending/${chart.key}`)}
          className="flex items-center gap-0.5 text-[10px] sm:text-xs font-semibold text-neon hover:text-neon/80 transition-colors whitespace-nowrap group"
        >
          Phát
          <span className="ml-1 w-6 h-6 bg-neon rounded-full flex items-center justify-center shadow-neon/30 shadow-md group-hover:scale-110 transition-transform">
            <svg className="w-3 h-3 text-dark ml-0.5" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/></svg>
          </span>
        </button>
      </div>

      {/* Song list */}
      <div className="space-y-1">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-2 px-2 py-2 rounded-lg animate-pulse">
              <div className="w-5 h-4 bg-white/5 rounded" />
              <div className="w-9 h-9 bg-white/5 rounded-md" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-white/5 rounded w-3/4" />
                <div className="h-2.5 bg-white/5 rounded w-1/2" />
              </div>
            </div>
          ))
        ) : (
          previewSongs.map((song, i) => {
            const isActive = currentSong?.id === song.id;
            const isCurrentlyPlaying = isActive && isPlaying;
            return (
              <div
                key={song.id}
                onClick={() => onPlaySong(song)}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all duration-200 group/item
                  ${isActive ? "bg-neon/10 border border-neon/20" : "hover:bg-white/[0.05] border border-transparent"}`}
              >
                {/* Rank */}
                <div className="w-5 flex-shrink-0 text-center">
                  {isCurrentlyPlaying ? (
                    <div className="flex items-center justify-center gap-[2px]">
                      <span className="w-[2px] bg-neon rounded-full animate-bounce" style={{ height: "8px", animationDelay: "0ms" }} />
                      <span className="w-[2px] bg-neon rounded-full animate-bounce" style={{ height: "12px", animationDelay: "150ms" }} />
                      <span className="w-[2px] bg-neon rounded-full animate-bounce" style={{ height: "6px", animationDelay: "300ms" }} />
                    </div>
                  ) : (
                    <span className={`text-xs font-bold ${i < 3 ? "text-neon" : "text-gray-600"}`}>{i + 1}</span>
                  )}
                </div>

                {/* Cover */}
                <img
                  src={song.cover}
                  alt={song.title}
                  className="w-9 h-9 rounded-md object-cover flex-shrink-0 shadow-sm"
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={`text-[11px] sm:text-xs font-semibold truncate ${isActive ? "text-neon" : "text-white"}`}>{song.title}</p>
                  <p className="text-[10px] text-gray-500 truncate">{song.artist}</p>
                </div>

                {/* Three dots */}
                <button
                  onClick={(e) => { e.stopPropagation(); setCtxMenu({ song, x: e.clientX, y: e.clientY }); }}
                  className="p-1 text-gray-600 hover:text-white opacity-0 group-hover/item:opacity-100 transition-all rounded-full hover:bg-white/10 flex-shrink-0"
                >
                  <HiDotsHorizontal className="text-xs" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Xem tất cả */}
      {!loading && songs.length > 5 && (
        <button
          onClick={() => navigate(`/trending/${chart.key}`)}
          className="mt-2 w-full text-center py-2 text-[10px] sm:text-xs font-semibold text-gray-400 hover:text-neon transition-colors flex items-center justify-center gap-1 group"
        >
          Xem tất cả
          <HiChevronRight className="text-sm group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}

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

export default function ChartColumnsSection() {
  const { playSong, currentSong, isPlaying } = usePlayer();
  const [chartData, setChartData] = useState({ viet: [], chinese: [], intl: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchAll = async () => {
      try {
        const [vietRes, chineseRes, intlRes] = await Promise.allSettled([
          api.get("/songs/nct-chart/viet?limit=50"),
          api.get("/songs/nct-chart/chinese?limit=50"),
          api.get("/songs/itunes-top-charts"),
        ]);

        if (!mounted) return;

        const mapNctSongs = (res, prefix) => {
          if (res.status !== "fulfilled" || !res.value?.data?.data) return [];
          return res.value.data.data.map(s => ({
            id: s.id || `nct_${prefix}_${s.key}`,
            title: s.title,
            artist: s.artist,
            cover: s.cover,
            audio: s.audio || "YT_STREAM",
            source: "nct",
            isExternal: true,
            key: s.key,
            duration: formatDur(s.duration),
          }));
        };

        const viet = mapNctSongs(vietRes, "viet");
        const chinese = mapNctSongs(chineseRes, "chinese");

        // iTunes RSS Charts for international (via backend proxy)
        const intlRaw = intlRes.status === "fulfilled" && intlRes.value?.data?.data
          ? intlRes.value.data.data.map(s => ({
              id: `itunes_intl_${s.id}`,
              title: s.title,
              artist: s.artist || "Unknown",
              cover: s.cover || "",
              audio: s.audio || "YT_STREAM",
              source: "itunes",
              isExternal: true,
            }))
          : [];

        setChartData({ viet, chinese, intl: intlRaw });
      } catch (err) {
        console.error("ChartColumns fetch error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchAll();
    return () => { mounted = false; };
  }, []);

  return (
    <section className="mb-8">
      <div className="flex items-center gap-3 mb-4 md:mb-6">
        <div className="w-1 h-6 bg-gradient-to-b from-neon to-emerald-400 rounded-full" />
        <h2 className="text-xl font-bold text-white">Bảng Xếp Hạng</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 w-full">
        {CHARTS.map(chart => (
          <ChartColumn
            key={chart.key}
            chart={chart}
            songs={chartData[chart.key]}
            loading={loading}
            onPlaySong={playSong}
            currentSong={currentSong}
            isPlaying={isPlaying}
          />
        ))}
      </div>
    </section>
  );
}
