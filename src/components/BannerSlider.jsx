import { useState, useEffect, useCallback } from "react";
import { usePlayer } from "../context/PlayerContext";

export default function BannerSlider() {
  const { allSongs, playSong } = usePlayer();
  const bannerSongs = allSongs.slice(0, 5);
  const [current, setCurrent] = useState(0);

  const nextSlide = useCallback(() => {
    setCurrent((p) => (p + 1) % bannerSongs.length);
  }, [bannerSongs.length]);

  // Auto slide
  useEffect(() => {
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, [nextSlide]);

  if (bannerSongs.length === 0) return null;

  return (
    <div className="relative w-full overflow-hidden rounded-2xl">
      {/* Slides */}
      <div
        className="flex transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {bannerSongs.map((song) => (
          <div
            key={song.id}
            onClick={() => playSong(song)}
            className="min-w-full relative cursor-pointer group"
          >
            {/* Background image */}
            <div className="relative w-full h-48 md:h-64 lg:h-72 overflow-hidden">
              <img
                src={song.cover}
                alt={song.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />
            </div>

            {/* Content */}
            <div className="absolute bottom-0 left-0 p-6 md:p-8">
              <p className="text-xs text-neon font-semibold uppercase tracking-widest mb-2">
                🔥 Nổi bật
              </p>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-1 group-hover:text-neon transition-colors">
                {song.title}
              </h2>
              <p className="text-sm text-gray-300">{song.artist}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Dots */}
      <div className="absolute bottom-4 right-6 flex gap-1.5">
        {bannerSongs.map((_, i) => (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
            className={`
              h-1 rounded-full transition-all duration-300
              ${i === current ? "w-6 bg-neon" : "w-2 bg-white/30 hover:bg-white/50"}
            `}
          />
        ))}
      </div>
    </div>
  );
}
