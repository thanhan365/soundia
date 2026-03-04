import SongList from "../components/SongList";
import BannerSlider from "../components/BannerSlider";
import SongCard from "../components/SongCard";
import { usePlayer } from "../context/PlayerContext";

export default function Home() {
  const { error, allSongs } = usePlayer();

  // Pick some songs to show as "cards"
  const newSongs = allSongs.slice(5, 11);

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-3 sm:px-4 py-2 sm:py-3 rounded-lg animate-pulse text-xs sm:text-sm">
          {error}
        </div>
      )}

      {/* Banner Slider */}
      <BannerSlider />

      {/* New music cards */}
      {newSongs.length > 0 && (
        <div>
          <h2 className="text-base sm:text-lg md:text-xl font-bold text-white mb-2 sm:mb-3 md:mb-4">Gợi ý cho bạn</h2>

          {/* Mobile: scroll ngang */}
          <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide sm:hidden -mx-4 px-4">
            {newSongs.map((song) => (
              <div key={song.id} className="snap-start flex-shrink-0 w-[120px] sm:w-[140px]">
                <SongCard song={song} />
              </div>
            ))}
          </div>

          {/* Tablet/Desktop: grid */}
          <div className="hidden sm:grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
            {newSongs.map((song) => (
              <SongCard key={song.id} song={song} />
            ))}
          </div>
        </div>
      )}

      {/* Trending song list */}
      <SongList />
    </div>
  );
}
