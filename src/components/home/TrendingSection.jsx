import React from "react";
import { FaPlay } from "react-icons/fa";
import { Link } from "react-router-dom";
import { usePlayer } from "../../context/PlayerContext";

export default function TrendingSection({ songs, title = "Đang Thịnh Hành", viewMoreLink }) {
  const { playSong } = usePlayer();

  if (!songs || songs.length === 0) return null;

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-200">
          {title}
        </h2>
        {viewMoreLink && (
          <Link to={viewMoreLink} className="text-sm font-semibold text-cyan-400 hover:text-cyan-300 hover:underline tracking-wide transition-colors">
            Xem tất cả
          </Link>
        )}
      </div>

      {/* Horizontal scroll on mobile, Grid on desktop */}
      <div className="flex gap-4 md:gap-6 overflow-x-auto pb-6 snap-x snap-mandatory scrollbar-hide md:grid md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 md:overflow-visible md:pb-0">
        {songs.map((song) => (
          <div
            key={song.id}
            onClick={() => playSong(song)}
            className="snap-start flex-shrink-0 w-[140px] md:w-full bg-white/5 border border-white/5 hover:border-white/10 backdrop-blur-md p-3 md:p-4 rounded-2xl transition-all duration-400 group cursor-pointer hover:bg-white/10 hover:shadow-[0_10px_30px_rgba(168,85,247,0.2)]"
          >
            {/* Cover image area */}
            <div className="relative w-full aspect-square mb-4 rounded-xl overflow-hidden shadow-lg">
              <img
                src={song.cover}
                alt={song.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />

              {/* Glowing Play Button */}
              <button className="absolute bottom-2 right-2 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-full p-3 shadow-[0_0_15px_rgba(34,211,238,0.5)] opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:scale-110">
                <FaPlay className="fill-current w-5 h-5 text-white ml-0.5" />
              </button>
            </div>

            {/* Song Metadata */}
            <h3 className="text-white font-bold truncate text-sm md:text-base group-hover:text-cyan-300 transition-colors">
              {song.title}
            </h3>
            <p className="text-xs md:text-sm text-purple-200/70 truncate mt-1">
              {song.artist}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
