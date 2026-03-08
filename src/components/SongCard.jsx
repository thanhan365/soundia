import { usePlayer } from "../context/PlayerContext";

function SongCard({ song }) {
  const { playSong, currentSong, isPlaying } = usePlayer();
  const isActive = currentSong?.id === song.id;

  return (
    <button
      onClick={() => playSong(song)}
      className="group text-left bg-white/[0.03] rounded-lg sm:rounded-xl p-2 sm:p-3 border border-transparent hover:border-white/10 hover:bg-white/[0.06] transition-all duration-300 w-full"
    >
      <div className="relative aspect-square rounded-lg overflow-hidden mb-2 sm:mb-3">
        <img
          src={song.cover}
          alt={song.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        {/* Play overlay */}
        <div className={`absolute inset-0 transition-all duration-300 flex items-center justify-center ${isActive && isPlaying ? "bg-black/40" : "bg-black/0 group-hover:bg-black/30"}`}>
          {isActive && isPlaying ? (
            <div className="flex items-center gap-[2px]">
              <span className="w-[2px] bg-neon rounded-full animate-bounce" style={{ height: "8px", animationDelay: "0ms" }} />
              <span className="w-[2px] bg-neon rounded-full animate-bounce" style={{ height: "12px", animationDelay: "150ms" }} />
              <span className="w-[2px] bg-neon rounded-full animate-bounce" style={{ height: "6px", animationDelay: "300ms" }} />
            </div>
          ) : (
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-neon flex items-center justify-center transform scale-0 group-hover:scale-100 transition-transform duration-300 shadow-neon">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-dark ml-0.5" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/></svg>
            </div>
          )}
        </div>
      </div>
      <h3 className={`text-xs sm:text-sm font-semibold truncate mb-0.5 transition-colors ${isActive ? "text-neon" : "text-white"}`}>
        {song.title}
      </h3>
      <p className="text-[10px] sm:text-xs text-gray-500 truncate">{song.artist}</p>
    </button>
  );
}

export default SongCard;
