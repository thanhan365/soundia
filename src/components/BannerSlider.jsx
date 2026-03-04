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
      className="relative w-full overflow-hidden rounded-2xl group/slider"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slides */}
      <div
        className="flex transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {bannerSongs.map((song) => (
          <div
            key={song.id}
            className="min-w-full relative cursor-pointer group/slide"
            onClick={() => playSong(song)}
          >
            {/* Background image — cố định tỉ lệ, không tràn */}
            <div className="relative w-full h-40 sm:h-48 md:h-64 lg:h-72 overflow-hidden">
              <img
                src={song.cover}
                alt={song.title}
                className="w-full h-full object-cover object-center group-hover/slide:scale-105 transition-transform duration-700"
              />
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent" />
            </div>

            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3 md:p-6 lg:p-8 z-10">
              <p className="text-[9px] sm:text-xs text-neon font-semibold uppercase tracking-widest mb-1 sm:mb-2">
                🔥 Nổi bật
              </p>
              <h2 className="text-sm sm:text-lg md:text-2xl lg:text-3xl font-extrabold text-white mb-0.5 sm:mb-1 drop-shadow-lg line-clamp-2 sm:line-clamp-3">
                {song.title}
              </h2>
              <p className="text-xs sm:text-sm text-gray-300 line-clamp-1">{song.artist}</p>
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
          shadow-neon-lg hover:shadow-neon
          transform scale-0 group-hover/slider:scale-100
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
          absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-20
          w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-full
          bg-black/40 hover:bg-black/70 backdrop-blur-sm
          text-white/80 hover:text-white
          flex items-center justify-center
          border border-white/10 hover:border-white/25
          transform -translate-x-2 opacity-0 group-hover/slider:translate-x-0 group-hover/slider:opacity-100
          transition-all duration-300
          hover:scale-110 active:scale-95
        "
      >
        <HiChevronLeft className="text-lg sm:text-xl" />
      </button>

      {/* Next arrow */}
      <button
        onClick={(e) => { e.stopPropagation(); nextSlide(); }}
        className="
          absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-20
          w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-full
          bg-black/40 hover:bg-black/70 backdrop-blur-sm
          text-white/80 hover:text-white
          flex items-center justify-center
          border border-white/10 hover:border-white/25
          transform translate-x-2 opacity-0 group-hover/slider:translate-x-0 group-hover/slider:opacity-100
          transition-all duration-300
          hover:scale-110 active:scale-95
        "
      >
        <HiChevronRight className="text-lg sm:text-xl" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 sm:gap-2 z-20">
        {bannerSongs.map((_, i) => (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
            className={`
              h-1 sm:h-1.5 rounded-full transition-all duration-300
              ${i === current
                ? "w-6 sm:w-8 bg-neon shadow-[0_0_8px_rgba(0,255,204,0.5)]"
                : "w-1.5 sm:w-2 bg-white/30 hover:bg-white/60"
              }
            `}
          />
        ))}
      </div>
    </div>
  );
}
