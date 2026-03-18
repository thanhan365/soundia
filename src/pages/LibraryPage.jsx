import { useState, useEffect, useCallback } from "react";
import { HiCollection, HiSearch, HiPlay, HiMusicNote, HiVideoCamera } from "react-icons/hi";
import { useNavigate } from "react-router-dom";
import { usePlayer } from "../context/PlayerContext";
import SongItem from "../components/SongItem";
import HeroSection from "../components/HeroSection";
import SkeletonLoader from "../components/SkeletonLoader";
import api from "../utils/api";

const tabs = ["Yêu thích", "Playlist", "Album", "MV"];

export default function LibraryPage() {
  const { allSongs, playlists, deletePlaylist, playSong, favorites, setPlayContext } = usePlayer();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Yêu thích");
  const [localSearch, setLocalSearch] = useState("");
  const [albums, setAlbums] = useState([]);
  const [mvs, setMvs] = useState([]);
  const [loadingExtras, setLoadingExtras] = useState(false);
  const [favoriteSongs, setFavoriteSongs] = useState([]);
  const [loadingFavs, setLoadingFavs] = useState(false);

  // Fetch favorites from API
  const fetchFavs = useCallback(async () => {
    setLoadingFavs(true);
    try {
      const res = await api.get("/favorites");
      setFavoriteSongs((res.data || []).map(s => ({
        id: s.id, title: s.title, artist: s.artist, duration: s.duration,
        cover: s.coverUrl || s.cover || '', audio: s.audioUrl || s.audio || 'YT_STREAM',
      })));
    } catch { }
    finally { setLoadingFavs(false); }
  }, []);

  useEffect(() => {
    if (activeTab === "Yêu thích") fetchFavs();
  }, [activeTab, favorites, fetchFavs]);

  // Fetch NCT albums
  useEffect(() => {
    if (activeTab === "Album" && albums.length === 0) {
      setLoadingExtras(true);
      api.get("/songs/nct-albums?limit=20")
        .then(res => setAlbums(res.data?.data || []))
        .catch(console.error)
        .finally(() => setLoadingExtras(false));
    } else if (activeTab === "MV" && mvs.length === 0) {
      setLoadingExtras(true);
      api.get("/songs/nct-videos?limit=20")
        .then(res => setMvs(res.data?.data || []))
        .catch(console.error)
        .finally(() => setLoadingExtras(false));
    }
  }, [activeTab]);

  const filteredLibSongs = localSearch
    ? favoriteSongs.filter(
      (s) =>
        s.title.toLowerCase().includes(localSearch.toLowerCase()) ||
        s.artist.toLowerCase().includes(localSearch.toLowerCase())
    )
    : favoriteSongs;

  return (
    <div className="space-y-6">
      <HeroSection
        icon={HiCollection}
        label="Thư viện"
        title={<>Bộ sưu tập <span className="text-neon text-glow">Của bạn</span></>}
        description="Quản lý toàn bộ bài hát, playlist và album"
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white/[0.03] rounded-xl p-1 w-full sm:w-fit overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`
              px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap flex-shrink-0
              ${activeTab === tab
                ? "bg-neon/15 text-neon"
                : "text-gray-400 hover:text-white hover:bg-white/5"
              }
            `}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ═══ Yêu thích Tab ═══ */}
      {activeTab === "Yêu thích" && (
        <div className="space-y-4 pb-10 sm:pb-16">
          <div className="relative max-w-sm">
            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Tìm trong thư viện..."
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-neon/30 transition-colors"
            />
          </div>

          <p className="text-sm text-gray-500">
            {filteredLibSongs.length} bài hát yêu thích
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-1.5 sm:gap-2">
            {filteredLibSongs.map((song, i) => (
              <SongItem key={song.id} song={song} index={i} onPlay={(s) => { setPlayContext(filteredLibSongs, s.id); playSong(s); }} />
            ))}
          </div>
        </div>
      )}

      {/* ═══ Playlist Tab ═══ */}
      {activeTab === "Playlist" && (
        <div className="pb-10 sm:pb-16">
          {playlists.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-4">
              {playlists.map((pl) => {
                const resolvedSongs = pl.songs
                  .map(sid => allSongs.find(s => String(s.id) === String(sid)))
                  .filter(Boolean);
                const resolvedCount = resolvedSongs.length;
                const coverArts = resolvedSongs
                  .map(s => s.cover)
                  .filter(Boolean)
                  .slice(0, 4);

                return (
                  <div
                    key={pl.id}
                    className="group bg-white/[0.03] rounded-xl p-3 sm:p-4 border border-white/5 hover:border-neon/20 hover:bg-white/[0.05] transition-all duration-300 cursor-pointer"
                    onClick={() => navigate(`/playlist/${pl.id}`)}
                  >
                    <div className="w-full aspect-square rounded-lg overflow-hidden mb-3 relative">
                      {coverArts.length >= 4 ? (
                        <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
                          {coverArts.map((src, i) => (
                            <img key={i} src={src} alt="" className="w-full h-full object-cover" />
                          ))}
                        </div>
                      ) : coverArts.length >= 1 ? (
                        <div className="w-full h-full relative">
                          <img src={coverArts[0]} alt="" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/20" />
                        </div>
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-neon/20 to-purple-500/20 flex items-center justify-center">
                          <HiCollection className="text-4xl text-neon/60" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <HiPlay className="text-4xl text-white drop-shadow-lg" />
                      </div>
                    </div>
                    <h3 className="text-sm font-semibold text-white truncate">{pl.name}</h3>
                    <p className="text-xs text-gray-500">{resolvedCount} bài hát</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); deletePlaylist(pl.id); }}
                      className="text-xs text-gray-600 hover:text-red-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Xóa playlist
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <HiCollection className="text-5xl text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500">Chưa có playlist nào. Tạo playlist từ Sidebar!</p>
            </div>
          )}
        </div>
      )}

      {/* ═══ Album Tab (NCT) ═══ */}
      {activeTab === "Album" && (
        <div className="pb-10 sm:pb-16">
          {loadingExtras ? <SkeletonLoader /> : albums.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-4">
              {albums.map((album) => (
                <div
                  key={album.key}
                  onClick={() => navigate(`/album/${album.key}`)}
                  className="group bg-white/[0.03] rounded-xl p-3 sm:p-4 border border-white/5 hover:border-neon/20 hover:bg-white/[0.05] transition-all cursor-pointer"
                >
                  <div className="w-full aspect-square rounded-lg overflow-hidden mb-3 relative">
                    {album.image ? (
                      <img src={album.image} alt={album.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-neon/20 to-purple-500/20 flex items-center justify-center">
                        <HiMusicNote className="text-4xl text-neon/60" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-neon flex items-center justify-center shadow-lg shadow-neon/30 group-hover:scale-110 transition-transform">
                        <HiPlay className="text-2xl text-dark ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-white truncate">{album.name}</h3>
                  <p className="text-xs text-gray-500 truncate">{album.artistName}</p>
                  {album.totalSongs > 0 && (
                    <p className="text-[10px] text-gray-600 mt-0.5">{album.totalSongs} bài hát</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <HiMusicNote className="text-5xl text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500">Chưa tìm thấy album nào.</p>
            </div>
          )}
        </div>
      )}

      {/* ═══ MV Tab (NCT) ═══ */}
      {activeTab === "MV" && (
        <div className="pb-10 sm:pb-16">
          {loadingExtras ? <SkeletonLoader /> : mvs.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {mvs.map((mv) => (
                <div
                  key={mv.key}
                  onClick={() => navigate(`/mv/${mv.key}`)}
                  className="group bg-white/[0.03] rounded-xl overflow-hidden border border-white/5 hover:border-neon/20 transition-all cursor-pointer"
                >
                  <div className="w-full aspect-video relative overflow-hidden bg-black flex items-center justify-center">
                    {mv.image ? (
                      <img src={mv.image} alt={mv.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-70 group-hover:opacity-100" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                        <HiVideoCamera className="text-4xl text-gray-700" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-neon/80 transition-all group-hover:scale-110">
                        <HiPlay className="text-2xl text-white ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-semibold text-white truncate">{mv.name}</h3>
                    <p className="text-xs text-gray-400 truncate mt-1">{mv.artistName}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <HiVideoCamera className="text-5xl text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500">Chưa tìm thấy MV nào.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
