import React, { useState, useEffect, useCallback } from "react";
import { usePlayer } from "../context/PlayerContext";
import { FaPlay, FaPause, FaPlus, FaChevronLeft, FaChevronRight } from "react-icons/fa";

export default function BannerSlider() {
  const { allSongs, playSong, currentSong, isPlaying, togglePlay } = usePlayer();
  const bannerSongs = allSongs.slice(0, 5);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const nextSlide = useCallback(() => {
    setCurrent((p) => (p + 1) % bannerSongs.length);
  }, [bannerSongs.length]);

  const prevSlide = useCallback(() => {
    setCurrent((p) => (p - 1 + bannerSongs.length) % bannerSongs.length);
  }, [bannerSongs.length]);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, [nextSlide, paused]);

  if (bannerSongs.length === 0) return null;

  const handlePlayPause = (e, song) => {
    e.stopPropagation();
    if (currentSong?.id === song.id) {
      togglePlay();
    } else {
      playSong(song);
    }
  };

  return (
    <div 
      className="relative w-full max-w-[100vw] overflow-hidden rounded-b-3xl md:rounded-3xl mt-0 md:mt-4 shadow-[0_10px_40px_rgba(0,0,0,0.5)] group/slider mb-10"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slides wrapper */}
      <div
        className="flex transition-transform duration-700 ease-out h-[260px] md:h-[300px] lg:h-[340px]"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {bannerSongs.map((song) => {
          const isActivePlaying = currentSong?.id === song.id && isPlaying;
          
          return (
            <div
              key={song.id}
              className="min-w-full relative flex-shrink-0 group overflow-hidden flex items-end p-4 md:p-8 lg:p-10"
            >
              {/* Background Image w/ Zoom Effect */}
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-105 opacity-50"
                style={{ backgroundImage: `url(${song.cover})` }}
              />
              {/* Aurora Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#050511] via-[#050511]/80 to-transparent mix-blend-multiply" />
              <div className="absolute inset-0 bg-gradient-to-r from-purple-900/40 via-transparent to-cyan-900/30" />

              {/* Content wrapper */}
              <div className="relative z-10 flex flex-col md:flex-row items-end gap-8 w-full">
                {/* Glow behind the cover image */}
                <div className="relative group/cover cursor-pointer hidden sm:block" onClick={(e) => handlePlayPause(e, song)}>
                  <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 rounded-2xl blur opacity-30 group-hover/cover:opacity-60 transition duration-500"></div>
                  <img
                    src={song.cover}
                    alt={song.title}
                    className="relative w-28 h-28 md:w-36 md:h-36 lg:w-48 lg:h-48 shadow-xl rounded-2xl object-cover border border-white/10"
                  />
                  {/* Overlay Play Icon on Cover */}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/cover:opacity-100 transition-opacity rounded-2xl">
                    {isActivePlaying ? (
                      <FaPause className="w-16 h-16 text-white drop-shadow-lg" />
                    ) : (
                      <FaPlay className="w-16 h-16 text-white ml-2 drop-shadow-lg" />
                    )}
                  </div>
                </div>

                <div className="flex-1 space-y-2 md:space-y-3 pb-1 md:pb-2 z-20">
                  <p className="text-[10px] md:text-sm font-bold uppercase tracking-[0.2em] text-[#14b8a6] drop-shadow-[0_0_8px_rgba(20,184,166,0.5)]">
                    Tâm điểm nổi bật
                  </p>
                  <h1 
                    className="text-2xl md:text-4xl lg:text-5xl font-black text-white hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-[#14b8a6] hover:to-purple-500 cursor-pointer line-clamp-2 drop-shadow-md transition-all duration-300"
                    onClick={(e) => handlePlayPause(e, song)}
                  >
                    {song.title}
                  </h1>
                  <p className="text-xs md:text-sm lg:text-lg text-purple-200 font-medium opacity-90 pb-2">
                    {song.artist}
                  </p>

                  <div className="flex items-center gap-3 pt-2">
                    <button 
                      onClick={(e) => handlePlayPause(e, song)}
                      className="flex items-center gap-2 bg-gradient-to-r from-[#14b8a6] to-purple-600 hover:from-teal-400 hover:to-purple-500 text-white px-5 md:px-6 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-bold transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(20,184,166,0.5)]"
                    >
                      {isActivePlaying ? (
                        <>
                          <FaPause className="fill-current w-4 h-4 md:w-5 md:h-5" />
                          Tạm dừng
                        </>
                      ) : (
                        <>
                          <FaPlay className="fill-current w-4 h-4 md:w-5 md:h-5" />
                          Nghe ngay
                        </>
                      )}
                    </button>
                    <button className="flex items-center justify-center border border-white/20 bg-white/5 hover:bg-white/10 backdrop-blur-md text-white p-2 md:p-3 rounded-full transition-all duration-300 hover:scale-105 hover:border-pink-500/50 hover:shadow-[0_0_15px_rgba(236,72,153,0.3)]">
                      <FaPlus className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Prev arrow */}
      <button
        onClick={(e) => { e.stopPropagation(); prevSlide(); }}
        className="
          absolute left-4 top-1/2 -translate-y-1/2 z-30
          w-10 h-10 md:w-12 md:h-12 rounded-full
          bg-black/40 hover:bg-black/70 backdrop-blur-sm
          text-white/80
          flex items-center justify-center
          border border-white/10 hover:border-[#14b8a6]/50
          transform -translate-x-2 opacity-0 group-hover/slider:translate-x-0 group-hover/slider:opacity-100
          transition-all duration-300
          hover:scale-110 active:scale-95 hover:text-[#14b8a6]
        "
      >
        <FaChevronLeft className="text-xl md:text-2xl pr-1" />
      </button>

      {/* Next arrow */}
      <button
        onClick={(e) => { e.stopPropagation(); nextSlide(); }}
        className="
          absolute right-4 top-1/2 -translate-y-1/2 z-30
          w-10 h-10 md:w-12 md:h-12 rounded-full
          bg-black/40 hover:bg-black/70 backdrop-blur-sm
          text-white/80
          flex items-center justify-center
          border border-white/10 hover:border-[#14b8a6]/50
          transform translate-x-2 opacity-0 group-hover/slider:translate-x-0 group-hover/slider:opacity-100
          transition-all duration-300
          hover:scale-110 active:scale-95 hover:text-[#14b8a6]
        "
      >
        <FaChevronRight className="text-xl md:text-2xl pl-1" />
      </button>

      {/* Dots indicators */}
      <div className="absolute bottom-4 z-30 flex justify-center w-full gap-2">
        {bannerSongs.map((_, i) => (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
            aria-label={`Go to slide ${i + 1}`}
            className={`
              h-2 rounded-full transition-all duration-300
              ${i === current 
                ? "w-8 md:w-10 bg-[#14b8a6] shadow-[0_0_8px_rgba(20,184,166,0.8)]" 
                : "w-2.5 bg-white/40 hover:bg-white/70"}
            `}
          />
        ))}
      </div>
    </div>
  );
}
