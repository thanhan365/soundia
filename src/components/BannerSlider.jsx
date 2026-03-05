import { useState, useEffect, useCallback } from "react";
import { usePlayer } from "../context/PlayerContext";
import { HiChevronLeft, HiChevronRight, HiPlay, HiPause } from "react-icons/hi2";

export default function BannerSlider() {
  const { allSongs, playSong, currentSong, isPlaying, togglePlay } = usePlayer();
  const bannerSongs = allSongs.slice(0, 5);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false); // auto-slide pause on hover

  const nextSlide = useCallback(() => {
    setCurrent((p) => (p + 1) % bannerSongs.length);
  }, [bannerSongs.length]);

  const prevSlide = useCallback(() => {
    setCurrent((p) => (p - 1 + bannerSongs.length) % bannerSongs.length);
  }, [bannerSongs.length]);

  // Auto slide — pause khi hover
  useEffect(() => {
    if (paused) return;
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, [nextSlide, paused]);

  if (bannerSongs.length === 0) return null;

  const activeSong = bannerSongs[current];
  const isActivePlaying = currentSong?.id === activeSong?.id && isPlaying;

  const handlePlayPause = (e) => {
    e.stopPropagation();
    if (currentSong?.id === activeSong.id) {
      togglePlay();
    } else {
      playSong(activeSong);
    }
  };

  return (
    <div 
      className="relative w-full overflow-hidden rounded-xl sm:rounded-2xl shadow-lg border border-white/5 group/slider"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slides */}
      <div
        className="flex transition-transform duration-700 ease-out h-full"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {bannerSongs.map((song) => (
          <div
            key={song.id}
            onClick={() => playSong(song)}
            className="min-w-full relative cursor-pointer group flex-shrink-0"
          >
            {/* Background image */}
            <div className="relative w-full h-[200px] sm:h-[280px] md:h-[320px] lg:h-[380px] overflow-hidden">
              <img
                src={song.cover}
                alt={song.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              {/* Overlay gradients for better text visibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-gray-900/80 via-gray-900/30 to-transparent" />
            </div>

            {/* Content text */}
            <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-6 md:p-8 lg:p-10 w-full md:w-2/3 lg:w-1/2 z-10 pb-12 sm:pb-6">
              <p className="text-[10px] sm:text-xs text-neon font-semibold uppercase tracking-[0.2em] mb-1 sm:mb-2 flex items-center gap-1.5 drop-shadow-md">
                <span className="w-1.5 h-1.5 rounded-full bg-neon animate-pulse"></span> Nổi bật
              </p>
              <h2 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mb-1 sm:mb-2 group-hover:text-neon transition-colors drop-shadow-lg line-clamp-1 sm:line-clamp-2">
                {song.title}
              </h2>
              <p className="text-sm sm:text-base md:text-lg text-gray-300 drop-shadow-md line-clamp-1 opacity-90">
                {song.artist}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Play/Pause button — chính giữa */}
      <button
        onClick={handlePlayPause}
        className="
          absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20
          w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full
          bg-neon/90 hover:bg-neon text-dark
          flex items-center justify-center
          shadow-[0_0_15px_rgba(20,184,166,0.5)] hover:shadow-[0_0_25px_rgba(20,184,166,0.8)]
          transform scale-90 sm:scale-0 sm:group-hover/slider:scale-100
          transition-all duration-300 ease-out
          hover:scale-110 active:scale-95
          backdrop-blur-sm
        "
      >
        {isActivePlaying ? (
          <HiPause className="text-lg sm:text-2xl md:text-3xl" />
        ) : (
          <HiPlay className="text-lg sm:text-2xl md:text-3xl ml-0.5" />
        )}
      </button>

      {/* Prev arrow */}
      <button
        onClick={(e) => { e.stopPropagation(); prevSlide(); }}
        className="
          absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20
          w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full
          bg-black/40 hover:bg-black/70 backdrop-blur-sm
          text-white/80 hover:text-white
          flex items-center justify-center
          border border-white/10 hover:border-white/25
          transform translate-x-0 opacity-80 sm:-translate-x-2 sm:opacity-0 sm:group-hover/slider:translate-x-0 sm:group-hover/slider:opacity-100
          transition-all duration-300
          hover:scale-110 active:scale-95
        "
      >
        <HiChevronLeft className="text-lg sm:text-xl md:text-2xl" />
      </button>

      {/* Next arrow */}
      <button
        onClick={(e) => { e.stopPropagation(); nextSlide(); }}
        className="
          absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20
          w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full
          bg-black/40 hover:bg-black/70 backdrop-blur-sm
          text-white/80 hover:text-white
          flex items-center justify-center
          border border-white/10 hover:border-white/25
          transform translate-x-0 opacity-80 sm:translate-x-2 sm:opacity-0 sm:group-hover/slider:translate-x-0 sm:group-hover/slider:opacity-100
          transition-all duration-300
          hover:scale-110 active:scale-95
        "
      >
        <HiChevronRight className="text-lg sm:text-xl md:text-2xl" />
      </button>

      {/* Dots indicators */}
      <div className="absolute bottom-3 sm:bottom-4 md:bottom-6 right-4 sm:right-6 md:right-8 flex gap-1.5 sm:gap-2 z-20">
        {bannerSongs.map((_, i) => (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
            aria-label={`Go to slide ${i + 1}`}
            className={`
              h-1.5 sm:h-2 rounded-full transition-all duration-300
              ${i === current 
                ? "w-6 sm:w-8 md:w-10 bg-neon shadow-[0_0_8px_rgba(20,184,166,0.8)]" 
                : "w-2 sm:w-2.5 bg-white/40 hover:bg-white/70"}
            `}
          />
        ))}
      </div>
    </div>
  );
}
