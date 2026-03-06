import { useState } from "react";
import { HiCollection, HiSearch } from "react-icons/hi";
import { usePlayer } from "../context/PlayerContext";
import SongItem from "../components/SongItem";
import HeroSection from "../components/HeroSection";

const tabs = ["Bài hát", "Playlist", "Album", "MV"];

export default function LibraryPage() {
  const { allSongs, playlists, deletePlaylist } = usePlayer();
  const [activeTab, setActiveTab] = useState("Bài hát");
  const [localSearch, setLocalSearch] = useState("");

  const filteredLibSongs = localSearch
    ? allSongs.filter(
        (s) =>
          s.title.toLowerCase().includes(localSearch.toLowerCase()) ||
          s.artist.toLowerCase().includes(localSearch.toLowerCase())
      )
    : allSongs;

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

      {/* Tab Content */}
      {activeTab === "Bài hát" && (
        <div className="space-y-4 pb-10 sm:pb-16">
          {/* Local search */}
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
            {filteredLibSongs.length} bài hát
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2">
            {filteredLibSongs.map((song, i) => (
              <SongItem key={song.id} song={song} index={i} />
            ))}
          </div>
        </div>
      )}

      {activeTab === "Playlist" && (
        <div className="pb-10 sm:pb-16">
          {playlists.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4">
              {playlists.map((pl) => {
                const resolvedCount = pl.songs.reduce(
                  (acc, sid) =>
                    acc +
                    (allSongs.some((s) => String(s.id) === String(sid)) ? 1 : 0),
                  0
                );

                // #region agent log
                if (typeof window !== "undefined") {
                  fetch(
                    "http://127.0.0.1:7340/ingest/7a476181-2b3f-4bea-8a0b-e17fa8639b01",
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "X-Debug-Session-Id": "6bc027",
                      },
                      body: JSON.stringify({
                        sessionId: "6bc027",
                        runId: "pre-fix",
                        hypothesisId: "PL_COUNT_LIB",
                        location: "LibraryPage.jsx:80",
                        message: "Library playlist card count",
                        data: {
                          playlistId: pl.id,
                          rawCount: pl.songs.length,
                          resolvedCount,
                        },
                        timestamp: Date.now(),
                      }),
                    }
                  ).catch(() => {});
                }
                // #endregion

                return (
                  <div
                    key={pl.id}
                    className="group bg-white/[0.03] rounded-xl p-3 sm:p-4 border border-white/5 hover:border-neon/20 hover:bg-white/[0.05] transition-all duration-300 hover:scale-[1.02]"
                  >
                    <div className="w-full aspect-square rounded-lg bg-gradient-to-br from-neon/20 to-purple-500/20 flex items-center justify-center mb-3">
                      <HiCollection className="text-4xl text-neon/60" />
                    </div>
                    <h3 className="text-sm font-semibold text-white truncate">
                      {pl.name}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {resolvedCount} bài hát
                    </p>
                    <button
                      onClick={() => deletePlaylist(pl.id)}
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

      {(activeTab === "Album" || activeTab === "MV") && (
        <div className="text-center py-16">
          <p className="text-2xl mb-2">🎵</p>
          <h3 className="text-lg font-semibold text-gray-400 mb-1">Sắp ra mắt</h3>
          <p className="text-sm text-gray-600">Tính năng {activeTab} sẽ có trong phiên bản tiếp theo!</p>
        </div>
      )}
    </div>
  );
}
