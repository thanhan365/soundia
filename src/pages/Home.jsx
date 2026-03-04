import SongList from "../components/SongList";
import BannerSlider from "../components/BannerSlider";
import { usePlayer } from "../context/PlayerContext";

export default function Home() {
  const { error, allSongs } = usePlayer();

  // Pick some songs to show as "cards"
  const newSongs = allSongs.slice(5, 11);

  return (
    <div className="space-y-8">
      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg animate-pulse">
          {error}
        </div>
      )}

      {/* Banner Slider */}
      <BannerSlider />

      {/* New music cards */}
      {newSongs.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-white mb-4">Gợi ý cho bạn</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
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

function SongCard({ song }) {
  const { playSong, currentSong, isPlaying } = usePlayer();
  const isActive = currentSong?.id === song.id;

  return (
    <button
      onClick={() => playSong(song)}
      className="group text-left bg-white/[0.03] rounded-xl p-3 border border-transparent hover:border-white/10 hover:bg-white/[0.06] transition-all duration-300 hover:scale-[1.03]"
    >
      <div className="relative aspect-square rounded-lg overflow-hidden mb-3">
        <img
          src={song.cover}
          alt={song.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
          <div className={`w-10 h-10 rounded-full bg-neon flex items-center justify-center transform scale-0 group-hover:scale-100 transition-transform duration-300 shadow-neon ${isActive && isPlaying ? "scale-100" : ""}`}>
            {isActive && isPlaying ? (
              <div className="flex items-center gap-0.5">
                <span className="w-0.5 h-2 bg-dark rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-0.5 h-3 bg-dark rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-0.5 h-2 bg-dark rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            ) : (
              <svg className="w-4 h-4 text-dark ml-0.5" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/></svg>
            )}
          </div>
        </div>
      </div>
      <h3 className={`text-sm font-semibold truncate mb-0.5 transition-colors ${isActive ? "text-neon" : "text-white"}`}>
        {song.title}
      </h3>
      <p className="text-xs text-gray-500 truncate">{song.artist}</p>
    </button>
  );
}
