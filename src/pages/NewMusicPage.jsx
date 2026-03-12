import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import HeroSection from "../components/HeroSection";
import { HiSparkles, HiMusicNote, HiFire, HiCalendar } from "react-icons/hi";
import SongItem from "../components/SongItem";
import SkeletonLoader from "../components/SkeletonLoader";
import api from "../utils/api";

export default function NewMusicPage() {
  const navigate = useNavigate();
  const [trendingSongs, setTrendingSongs] = useState([]);
  const [newSongs, setNewSongs] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState({ trending: true, newSongs: true, albums: true });

  // Fetch all data on mount
  useEffect(() => {
    let mounted = true;

    // 1) Top Trending (reuse nct-top)
    const fetchTrending = async () => {
      try {
        const res = await api.get("/songs/nct-top");
        if (mounted && res?.data?.success) setTrendingSongs(res.data.data || []);
      } catch (err) { console.error("Failed to fetch trending", err); }
      finally { if (mounted) setLoading(p => ({ ...p, trending: false })); }
    };

    // 2) Nhạc mới hôm nay — lấy 12 bài đầu từ nct-top trending
    const fetchNew = async () => {
      try {
        const res = await api.get("/songs/nct-top");
        if (mounted && res?.data?.success) {
          setNewSongs((res.data.data || []).slice(0, 12));
        }
      } catch (err) { console.error("Failed to fetch new songs", err); }
      finally { if (mounted) setLoading(p => ({ ...p, newSongs: false })); }
    };

    // 3) Albums mới (iTunes)
    const fetchAlbums = async () => {
      try {
        const res = await api.get("/songs/itunes-proxy?term=" + encodeURIComponent("nhạc mới việt nam 2026") + "&entity=album&country=VN&limit=12");
        if (mounted && res?.data?.results) {
          const seen = new Set();
          const deduped = res.data.results.filter(a => {
            if (!a.collectionId) return false;
            if (seen.has(a.collectionId)) return false;
            seen.add(a.collectionId);
            return true;
          });
          setAlbums(deduped);
        }
      } catch (err) { console.error("Failed to fetch albums", err); }
      finally { if (mounted) setLoading(p => ({ ...p, albums: false })); }
    };

    fetchTrending();
    fetchNew();
    fetchAlbums();
    return () => { mounted = false; };
  }, []);

  const handleAlbumClick = (album) => {
    const params = new URLSearchParams({
      q: `${album.collectionName} ${album.artistName}`,
      name: album.collectionName,
      cover: (album.artworkUrl100 || "").replace("100x100", "600x600"),
      gradient: "from-purple-500 to-pink-500",
    });
    navigate(`/suggested-playlist?${params.toString()}`);
  };


  return (
    <div className="space-y-8 sm:space-y-10 pb-32">
      <HeroSection
        icon={HiSparkles}
        label="Nhạc mới"
        title={<>Mới & <span className="text-neon text-glow">Thịnh Hành</span></>}
        description="Những bài hát mới và nổi bật nhất hiện nay"
      />

      {/* ═══ Section 1: Nhạc mới hôm nay ═══ */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <HiSparkles className="text-cyan-400 text-xl animate-pulse" />
          <h2 className="text-lg sm:text-xl font-bold text-white">Nhạc mới hôm nay</h2>
        </div>

        {loading.newSongs ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square bg-white/5 rounded-xl mb-2" />
                <div className="h-3 bg-white/5 rounded w-3/4 mb-1" />
                <div className="h-2 bg-white/5 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : newSongs.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {newSongs.map((song) => (
              <NewSongCard key={song.id} song={song} />
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Đang cập nhật...</p>
        )}
      </section>

      {/* ═══ Section 2: Nhạc tuần này (Top 20) ═══ */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <HiCalendar className="text-purple-400 text-xl" />
          <h2 className="text-lg sm:text-xl font-bold text-white">Nhạc hot tuần này</h2>
          <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full ml-auto">Top 20</span>
        </div>

        {loading.trending ? (
          <SkeletonLoader />
        ) : trendingSongs.length > 0 ? (
          <>
            <div className="hidden md:flex items-center gap-3 lg:gap-4 px-4 py-2 border-b border-white/5 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-widest">
              <div className="flex-1">Bài Hát</div>
              <div className="w-16 text-center">Thời Gian</div>
              <div className="w-[100px] opacity-0">Actions</div>
            </div>
            <div className="flex flex-col gap-1">
              {trendingSongs.map((song, index) => (
                <SongItem key={`${song.id}-${index}`} song={song} index={index} />
              ))}
            </div>
          </>
        ) : (
          <EmptyState />
        )}
      </section>

      {/* ═══ Section 3: Album mới ═══ */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <HiMusicNote className="text-pink-400 text-xl" />
          <h2 className="text-lg sm:text-xl font-bold text-white">Album mới phát hành</h2>
        </div>

        {loading.albums ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square bg-white/5 rounded-xl mb-2" />
                <div className="h-3 bg-white/5 rounded w-3/4 mb-1" />
                <div className="h-2 bg-white/5 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : albums.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {albums.map((album) => (
              <button
                key={album.collectionId}
                onClick={() => handleAlbumClick(album)}
                className="group text-left transition-all duration-300 hover:scale-[1.03] active:scale-95"
              >
                <div className="relative aspect-square rounded-xl overflow-hidden shadow-lg mb-2 group-hover:shadow-2xl transition-shadow">
                  <img
                    src={(album.artworkUrl100 || "").replace("100x100", "600x600")}
                    alt={album.collectionName}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-neon flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 shadow-neon">
                      <svg className="w-4 h-4 text-dark ml-0.5" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" /></svg>
                    </div>
                  </div>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-cyan-400 transition-colors">{album.collectionName}</p>
                <p className="text-[10px] sm:text-xs text-gray-500 truncate">{album.artistName}</p>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Đang cập nhật...</p>
        )}
      </section>

      {/* ═══ Section 4: Top Trending ═══ */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <HiFire className="text-orange-500 text-xl animate-pulse" />
          <h2 className="text-lg sm:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-red-500 to-pink-500">
            Đang hot trên BXH
          </h2>
        </div>

        {loading.trending ? (
          <SkeletonLoader />
        ) : trendingSongs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {trendingSongs.slice(0, 10).map((song, index) => (
              <TrendingCard key={song.id} song={song} index={index} />
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </section>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────

import { usePlayer } from "../context/PlayerContext";

function NewSongCard({ song }) {
  const { playSong, currentSong, isPlaying } = usePlayer();
  const isActive = currentSong?.id === song.id;

  return (
    <button
      onClick={() => playSong(song)}
      className="group text-left transition-all duration-300 hover:scale-[1.03] active:scale-95"
    >
      <div className="relative aspect-square rounded-xl overflow-hidden shadow-lg mb-2 group-hover:shadow-2xl transition-shadow">
        <img src={song.cover} alt={song.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          {isActive && isPlaying ? (
            <div className="flex items-center gap-[2px]">
              <span className="w-[3px] bg-neon rounded-full animate-bounce" style={{ height: "10px", animationDelay: "0ms" }} />
              <span className="w-[3px] bg-neon rounded-full animate-bounce" style={{ height: "14px", animationDelay: "150ms" }} />
              <span className="w-[3px] bg-neon rounded-full animate-bounce" style={{ height: "8px", animationDelay: "300ms" }} />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-neon flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 shadow-neon">
              <svg className="w-4 h-4 text-dark ml-0.5" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" /></svg>
            </div>
          )}
        </div>
        {isActive && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 to-purple-500" />
        )}
      </div>
      <p className={`text-xs sm:text-sm font-semibold truncate transition-colors ${isActive ? "text-neon" : "text-white group-hover:text-cyan-400"}`}>{song.title}</p>
      <p className="text-[10px] sm:text-xs text-gray-500 truncate">{song.artist}</p>
    </button>
  );
}

function TrendingCard({ song, index }) {
  const { playSong, currentSong, isPlaying } = usePlayer();
  const isActive = currentSong?.id === song.id;
  const isCurrentlyPlaying = isActive && isPlaying;

  return (
    <div
      onClick={() => playSong(song)}
      className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-300 relative overflow-hidden
        ${isActive
          ? "bg-neon/10 border border-neon/20 shadow-[0_4px_12px_rgba(0,255,255,0.08)]"
          : "bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-orange-500/30"
        }`}
    >
      <div className="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden shadow-md">
        <img src={song.cover} alt={song.title} className="w-full h-full object-cover" />
        {isCurrentlyPlaying && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="flex items-center gap-[2px]">
              <span className="w-[2px] bg-neon rounded-full animate-bounce" style={{ height: "8px", animationDelay: "0ms" }} />
              <span className="w-[2px] bg-neon rounded-full animate-bounce" style={{ height: "12px", animationDelay: "150ms" }} />
              <span className="w-[2px] bg-neon rounded-full animate-bounce" style={{ height: "6px", animationDelay: "300ms" }} />
            </div>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] sm:text-sm font-semibold truncate ${isActive ? "text-neon" : "text-white group-hover:text-orange-400"}`}>{song.title}</p>
        <p className="text-[11px] text-gray-500 truncate mt-0.5">{song.artist}</p>
      </div>
      <div className={`w-6 text-center font-bold text-sm tabular-nums ${isActive ? "text-neon/60" : "text-gray-600 group-hover:text-orange-400/50"}`}>
        #{index + 1}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <HiMusicNote className="text-4xl text-gray-700 mb-2" />
      <h3 className="text-base font-semibold text-gray-400 mb-0.5">Không có dữ liệu</h3>
      <p className="text-xs text-gray-500">Vui lòng thử lại sau!</p>
    </div>
  );
}
