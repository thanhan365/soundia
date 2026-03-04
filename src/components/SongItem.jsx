import { usePlayer } from "../context/PlayerContext";
import { HiPlay, HiPause } from "react-icons/hi2";
import { HiMusicNote } from "react-icons/hi";

export default function SongItem({ song, index }) {
  const { currentSong, isPlaying, playSong } = usePlayer();
  const isActive = currentSong?.id === song.id;

  return (
    <button
      onClick={() => playSong(song)}
      className={`
        w-full flex items-center gap-4 p-3 rounded-xl
        transition-all duration-300 ease-out group text-left
        ${
          isActive
            ? "bg-neon/10 border border-neon/30 shadow-neon-sm"
            : "bg-dark-card/60 border border-transparent hover:bg-dark-card hover:border-gray-dark/50 hover:shadow-neon-sm"
        }
      `}
    >
      {/* Index / Play icon */}
      <div
        className={`
          w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
          transition-all duration-300
          ${isActive ? "bg-neon/20" : "bg-gray-dark/50 group-hover:bg-neon/10"}
        `}
      >
        {isActive && isPlaying ? (
          <div className="flex items-center gap-0.5">
            <span className="w-0.5 h-3 bg-neon rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-0.5 h-4 bg-neon rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-0.5 h-2 bg-neon rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        ) : isActive ? (
          <HiPause className="text-neon text-lg" />
        ) : (
          <span className="text-gray-500 text-sm font-medium group-hover:hidden">
            {String(index + 1).padStart(2, "0")}
          </span>
        )}
        {!isActive && (
          <HiPlay className="text-neon text-lg hidden group-hover:block" />
        )}
      </div>

      {/* Cover */}
      <img
        src={song.cover}
        alt={song.title}
        className={`
          w-12 h-12 rounded-lg object-cover flex-shrink-0
          transition-all duration-300
          ${isActive ? "shadow-neon-sm" : "group-hover:shadow-neon-sm"}
        `}
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p
          className={`
            text-sm font-semibold truncate transition-colors duration-300
            ${isActive ? "text-neon" : "text-white group-hover:text-neon"}
          `}
        >
          {song.title}
        </p>
        <p className="text-xs text-gray-500 truncate">{song.artist}</p>
      </div>

      {/* Duration */}
      <span className="text-xs text-gray-500 font-mono flex-shrink-0">
        {song.duration}
      </span>
    </button>
  );
}
