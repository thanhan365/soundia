import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { usePlayer } from "../context/PlayerContext";
import SongList from "../components/SongList";
import HeroSection from "../components/HeroSection";
import { HiSearch, HiUserGroup, HiViewGrid, HiMusicNote, HiDotsHorizontal, HiShare, HiPlay } from "react-icons/hi";

const TABS = [
  { key: "all",       label: "Tất cả" },
  { key: "songs",     label: "Bài hát" },
  { key: "playlists", label: "Playlist" },
  { key: "artists",   label: "Nghệ sĩ" },
];

function ArtistResultCard({ artist, compact }) {
  const [imgFailed, setImgFailed] = useState(false);
  const navigate = useNavigate();
  const initial = artist.name.charAt(0).toUpperCase();

  return (
    <div
      onClick={() => navigate(`/artist-detail/${artist.id}`)}
      className={`flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer group ${compact ? "w-24 md:w-32" : "w-28 md:w-36"}`}
    >
      <div className={`relative rounded-full overflow-hidden shadow-lg ring-2 ring-white/10 group-hover:ring-neon/60 transition-all duration-300 ${compact ? "w-20 h-20 md:w-28 md:h-28" : "w-24 h-24 md:w-32 md:h-32"}`}>
        {artist.picture && !imgFailed ? (
          <img
            src={artist.picture}
            alt={artist.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
            <span className="text-3xl md:text-4xl font-black text-white drop-shadow-lg">{initial}</span>
          </div>
        )}
      </div>
      <h3 className="text-white font-semibold text-xs md:text-sm text-center leading-tight group-hover:text-neon transition-colors line-clamp-2">
        {artist.name}
      </h3>
    </div>
  );
}

function PlaylistResultCard({ pl, compact }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleClick = () => {
    if (pl.key) navigate(`/album/${pl.key}`);
    else navigate(`/playlist-detail/${pl.id}`);
  };

  const handlePlay = (e) => {
    e.stopPropagation();
    if (pl.key) navigate(`/album/${pl.key}?autoplay=true`);
    else navigate(`/playlist-detail/${pl.id}?autoplay=true`);
  };

  const handleShare = (e) => {
    e.stopPropagation();
    const url = pl.key ? `${window.location.origin}/album/${pl.key}` : `${window.location.origin}/playlist-detail/${pl.id}`;
    if (navigator.share) {
      navigator.share({ title: pl.title, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    setMenuOpen(false);
  };

  return (
    <div
      onClick={handleClick}
      className={`bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-neon/30 p-2 md:p-3 rounded-xl transition-all duration-300 group cursor-pointer flex-shrink-0 relative ${compact ? "w-32 md:w-40" : "w-full"}`}
    >
      <div className="relative w-full aspect-square mb-2 rounded-lg overflow-hidden shadow-md">
        {pl.cover ? (
          <img src={pl.cover} alt={pl.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-black flex items-center justify-center">
            <HiMusicNote className="text-3xl text-gray-600" />
          </div>
        )}
        {/* Play button overlay */}
        <button
          onClick={handlePlay}
          className="absolute bottom-2 right-2 w-8 h-8 md:w-9 md:h-9 bg-neon rounded-full flex items-center justify-center shadow-lg shadow-neon/30 transform scale-0 group-hover:scale-100 transition-transform duration-300 hover:brightness-110 active:scale-90 z-10"
        >
          <svg className="w-3.5 h-3.5 text-dark ml-0.5" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/></svg>
        </button>
      </div>
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1">
          <h3 className="text-white font-semibold text-xs md:text-sm mb-0.5 group-hover:text-neon transition-colors line-clamp-2">
            {pl.title}
          </h3>
          {pl.totalSongs > 0 && (
            <p className="text-[10px] md:text-xs text-gray-500 truncate">{pl.totalSongs} bài hát</p>
          )}
          {pl.artist && (
            <p className="text-[10px] md:text-xs text-gray-500 truncate">{pl.artist}</p>
          )}
        </div>
        {/* Three dots menu */}
        <div className="relative flex-shrink-0" ref={menuRef}>
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className="p-1 text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all rounded-full hover:bg-white/10"
          >
            <HiDotsHorizontal className="text-sm" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-7 z-50 w-44 bg-[#1e1833] border border-white/10 rounded-xl shadow-2xl py-1.5 animate-fade-in-up">
              <button onClick={handlePlay} className="w-full text-left px-3 py-2 text-xs text-white hover:bg-white/10 flex items-center gap-2 transition-colors">
                <HiPlay className="text-neon text-sm" /> Phát nhạc
              </button>
              <button onClick={handleShare} className="w-full text-left px-3 py-2 text-xs text-white hover:bg-white/10 flex items-center gap-2 transition-colors">
                <HiShare className="text-gray-400 text-sm" /> Chia sẻ
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  const { searchQuery, searchArtistsResult, searchPlaylistsResult } = usePlayer();
  const [activeTab, setActiveTab] = useState("all");

  const hasArtists = searchArtistsResult?.length > 0;
  const hasPlaylists = searchPlaylistsResult?.length > 0;

  return (
    <div className="space-y-6 pb-20">
      <HeroSection
        icon={HiSearch}
        label="Tìm kiếm"
        title={<>Khám phá <span className="text-neon text-glow">Âm nhạc</span></>}
        description="Tìm kiếm bài hát, nghệ sĩ yêu thích của bạn."
      />

      {/* ═══════════ TAB BAR ═══════════ */}
      {searchQuery && (
        <div className="border-b border-white/10">
          <div className="flex gap-1 sm:gap-2">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                  relative px-4 sm:px-5 py-2.5 text-sm sm:text-base font-semibold transition-all duration-200
                  ${activeTab === tab.key
                    ? "text-neon"
                    : "text-gray-400 hover:text-white"
                  }
                `}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-neon rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════ TAB CONTENT ═══════════ */}
      {searchQuery && (
        <div className="space-y-8">

          {/* ── TAB: Tất cả ── */}
          {activeTab === "all" && (
            <>
              {/* Nghệ Sĩ */}
              {hasArtists && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <HiUserGroup className="text-neon text-xl" />
                    <h2 className="text-lg md:text-xl font-bold text-white">Nghệ Sĩ</h2>
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                    {searchArtistsResult.slice(0, 8).map(a => <ArtistResultCard key={a.id} artist={a} compact />)}
                  </div>
                </section>
              )}

              {/* Playlist */}
              {hasPlaylists && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <HiViewGrid className="text-neon text-xl" />
                    <h2 className="text-lg md:text-xl font-bold text-white">Playlist</h2>
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                    {searchPlaylistsResult.slice(0, 6).map(p => <PlaylistResultCard key={p.id} pl={p} compact />)}
                  </div>
                </section>
              )}

              {/* Songs */}
              <SongList />
            </>
          )}

          {/* ── TAB: Bài hát ── */}
          {activeTab === "songs" && <SongList />}

          {/* ── TAB: Playlist ── */}
          {activeTab === "playlists" && (
            <section>
              {hasPlaylists ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {searchPlaylistsResult.map(p => <PlaylistResultCard key={p.id} pl={p} />)}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                  <HiViewGrid className="text-4xl mb-3 opacity-40" />
                  <p className="text-sm">Không tìm thấy playlist nào</p>
                </div>
              )}
            </section>
          )}

          {/* ── TAB: Nghệ sĩ ── */}
          {activeTab === "artists" && (
            <section>
              {hasArtists ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 md:gap-6">
                  {searchArtistsResult.map(a => <ArtistResultCard key={a.id} artist={a} />)}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                  <HiUserGroup className="text-4xl mb-3 opacity-40" />
                  <p className="text-sm">Không tìm thấy nghệ sĩ nào</p>
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {/* When no query, show all songs */}
      {!searchQuery && <SongList />}
    </div>
  );
}
