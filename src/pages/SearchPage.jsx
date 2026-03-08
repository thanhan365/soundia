import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePlayer } from "../context/PlayerContext";
import SongList from "../components/SongList";
import HeroSection from "../components/HeroSection";
import { HiSearch, HiUserGroup, HiViewGrid } from "react-icons/hi";

function ArtistResultCard({ artist }) {
  const [imgFailed, setImgFailed] = useState(false);
  const navigate = useNavigate();
  const initial = artist.name.charAt(0).toUpperCase();

  return (
    <div
      onClick={() => navigate(`/artist-detail/${artist.id}`)}
      className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer group w-24 md:w-32"
    >
      <div className="relative w-20 h-20 md:w-28 md:h-28 rounded-full overflow-hidden shadow-lg ring-2 ring-white/10 group-hover:ring-neon/60 transition-all duration-300">
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

function PlaylistResultCard({ pl }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate(`/playlist-detail/${pl.id}`)}
      className="bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-neon/30 p-2 md:p-3 rounded-xl transition-all duration-300 group cursor-pointer w-32 md:w-40 flex-shrink-0"
    >
      <div className="relative w-full aspect-square mb-2 rounded-lg overflow-hidden shadow-md">
        {pl.cover ? (
          <img src={pl.cover} alt={pl.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-black" />
        )}
      </div>
      <h3 className="text-white font-semibold text-xs md:text-sm mb-0.5 group-hover:text-neon transition-colors line-clamp-2">
        {pl.title}
      </h3>
      <p className="text-[10px] md:text-xs text-gray-500 truncate">{pl.user}</p>
    </div>
  );
}

export default function SearchPage() {
  const { searchQuery, searchArtistsResult, searchPlaylistsResult } = usePlayer();

  return (
    <div className="space-y-8 pb-20">
      <HeroSection
        icon={HiSearch}
        label="Tìm kiếm"
        title={<>Khám phá <span className="text-neon text-glow">Âm nhạc</span></>}
        description="Kết quả từ iTunes & NhacCuaTui."
      />
      
      {searchQuery && (
        <div className="space-y-10 px-0 md:px-0">
          
          {/* Nghệ Sĩ Section */}
          {searchArtistsResult?.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <HiUserGroup className="text-neon text-xl" />
                <h2 className="text-lg md:text-xl font-bold text-white">Nghệ Sĩ</h2>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {searchArtistsResult.map(a => <ArtistResultCard key={a.id} artist={a} />)}
              </div>
            </section>
          )}

          {/* Playlist Section */}
          {searchPlaylistsResult?.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <HiViewGrid className="text-neon text-xl" />
                <h2 className="text-lg md:text-xl font-bold text-white">Playlist Tương Tự</h2>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {searchPlaylistsResult.map(p => <PlaylistResultCard key={p.id} pl={p} />)}
              </div>
            </section>
          )}

        </div>
      )}

      {/* Track List Section (Luôn render SongList, nó tự quyết định có hiện placeholder "Chưa có" hay ko) */}
      <SongList />
    </div>
  );
}
