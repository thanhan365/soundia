import React from "react";
import { FaPlay, FaPlus } from "react-icons/fa";
import { usePlayer } from "../../context/PlayerContext";

export default function HeroSection({ song }) {
  const { playSong } = usePlayer();

  if (!song) return null;

  return (
    <div className="relative h-[400px] md:h-[500px] w-full flex items-end p-6 md:p-12 mb-10 overflow-hidden group rounded-b-3xl md:rounded-3xl mt-0 md:mt-4 mx-0 md:mx-4 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
      {/* Background Image w/ Zoom Effect */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-105 opacity-50"
        style={{ backgroundImage: `url(${song.cover})` }}
      />
      {/* Aurora Gradient Overlay (Deep Indigo/Purple transition to dark) */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#050511] via-[#050511]/80 to-transparent mix-blend-multiply" />
      <div className="absolute inset-0 bg-gradient-to-r from-purple-900/40 via-transparent to-cyan-900/30" />

      {/* Content wrapper */}
      <div className="relative z-10 flex flex-col md:flex-row items-end gap-8 w-full">
        {/* Glow behind the cover image */}
        <div className="relative group/cover cursor-pointer" onClick={() => playSong(song)}>
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 rounded-2xl blur opacity-30 group-hover/cover:opacity-60 transition duration-500"></div>
          <img
            src={song.cover}
            alt={song.title}
            className="relative w-36 h-36 md:w-64 md:h-64 shadow-2xl rounded-2xl object-cover border border-white/10"
          />
          {/* Overlay Play Icon on Cover */}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/cover:opacity-100 transition-opacity rounded-2xl">
            <FaPlay className="w-16 h-16 text-white ml-2 drop-shadow-lg" />
          </div>
        </div>

        <div className="flex-1 space-y-4 pb-2">
          <p className="text-xs md:text-sm font-bold uppercase tracking-[0.2em] text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
            Tâm điểm nổi bật
          </p>
          <h1 
            className="text-4xl md:text-7xl font-black text-white cursor-pointer line-clamp-2 drop-shadow-md hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-cyan-400 hover:to-purple-500 transition-all"
            onClick={() => playSong(song)}
          >
            {song.title}
          </h1>
          <p className="text-lg md:text-2xl text-purple-200 font-medium opacity-90">
            {song.artist}
          </p>

          <div className="flex items-center gap-4 pt-4">
            <button 
              onClick={() => playSong(song)}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white px-8 md:px-10 py-3 md:py-4 rounded-full font-bold transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(168,85,247,0.5)]"
            >
              <FaPlay className="fill-current w-5 h-5 md:w-6 md:h-6" />
              Nghe ngay
            </button>
            <button className="flex items-center justify-center border border-white/20 bg-white/5 hover:bg-white/10 backdrop-blur-md text-white p-3 md:p-4 rounded-full transition-all duration-300 hover:scale-105 hover:border-pink-500/50 hover:shadow-[0_0_15px_rgba(236,72,153,0.3)]">
              <FaPlus className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
