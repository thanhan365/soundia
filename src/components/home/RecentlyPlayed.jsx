import React from "react";
import { FaPlay } from "react-icons/fa";
import { usePlayer } from "../../context/PlayerContext";

export default function RecentlyPlayed({ songs }) {
  const { playSong } = usePlayer();

  if (!songs || songs.length === 0) return null;

  // Render a compact list
  return (
    <section className="mb-12">
      <h2 className="text-2xl font-black text-indigo-100 mb-4 opacity-90 drop-shadow-md">
        Nghe Gần Đây
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {songs.slice(0, 8).map((song) => (
          <div
            key={song.id}
            onClick={() => playSong(song)}
            className="flex items-center gap-4 bg-white/5 border border-white/5 backdrop-blur-md p-3 rounded-2xl cursor-pointer group transition-all duration-300 hover:bg-white/10 hover:shadow-[0_5px_15px_rgba(168,85,247,0.2)] hover:border-white/10"
          >
            <div className="relative w-14 h-14 md:w-16 md:h-16 flex-shrink-0 rounded-xl overflow-hidden shadow-md">
              <img
                src={song.cover}
                alt={song.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                <FaPlay className="w-6 h-6 text-cyan-300 fill-current ml-0.5" />
              </div>
            </div>

            <div className="flex-1 min-w-0 pr-2">
              <h3 className="text-white font-bold text-sm md:text-base truncate group-hover:text-cyan-300 transition-colors">
                {song.title}
              </h3>
              <p className="text-xs text-indigo-200/60 truncate mt-0.5">
                {song.artist}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
