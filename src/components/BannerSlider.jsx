import React, { useState, useEffect, useCallback } from "react";
import { usePlayer } from "../context/PlayerContext";
import { FaPlay, FaPause, FaHeart, FaChevronLeft, FaChevronRight, FaPlus } from "react-icons/fa";


export default function BannerSlider() {
  const { playSong, currentSong, isPlaying, togglePlay } = usePlayer();
  const [songs, setSongs] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  // Fetch Top 5 bài hát thịnh hành từ NCT charts (TRENDING_MUSIC)
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        // Step 1: Lấy danh sách charts để tìm key của TRENDING_MUSIC
        const chartsRes = await fetch("https://graph.nhaccuatui.com/api/v1/playlist/charts");
        if (!chartsRes.ok) return;
        const chartsData = await chartsRes.json();
        if (chartsData.code !== 0 || !Array.isArray(chartsData.data)) return;

        const trendingChart = chartsData.data.find(c => c.tag === "TRENDING_MUSIC" || c.id === 5);
        if (!trendingChart?.key) return;

        // Step 2: Lấy chi tiết chart (đầy đủ 50 bài) bằng chart key
        const detailRes = await fetch(`https://graph.nhaccuatui.com/api/v1/playlist/charts/${trendingChart.key}`);
        if (!detailRes.ok) return;
        const detailData = await detailRes.json();
        if (detailData.code !== 0) return;

        const items = detailData.data?.items || [];
        if (items.length === 0) return;

        // Take top 5 items and map to our song format
        const top5 = items.slice(0, 5).map(item => {
          // Extract stream URL (prefer 320kbps, fallback 128kbps)
          let streamUrl = "";
          if (Array.isArray(item.streamURL)) {
            const hq = item.streamURL.find(s => s.type === "320");
            const normal = item.streamURL.find(s => s.type === "128");
            streamUrl = (hq?.stream || normal?.stream || "");
          }

          return {
            id: `nct-${item.key}`,
            title: item.name,
            artist: item.artistName,
            cover: item.image || item.bgImage || "",
            duration: item.duration || 0,
            source: "nct",
            key: item.key,
            streamUrl,
          };
        });

        setSongs(top5);
      } catch (err) {
        console.error("BannerSlider: Failed to fetch NCT trending:", err);
      }
    };
    fetchBanners();
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentIndex((p) => (p + 1) % songs.length);
  }, [songs.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((p) => (p - 1 + songs.length) % songs.length);
  }, [songs.length]);

  useEffect(() => {
    if (paused || songs.length === 0) return;
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, [nextSlide, paused, songs.length]);

  if (songs.length === 0) return null;

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
      className="relative mx-auto max-w-7xl w-[calc(100%-2rem)] overflow-hidden rounded-2xl md:rounded-3xl mt-0 md:mt-4 shadow-[0_10px_40px_rgba(0,0,0,0.5)] group/slider mb-4"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slides wrapper */}
      <div
        className="flex transition-transform duration-700 ease-out h-[260px] md:h-[300px] lg:h-[340px]"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {songs.map((song) => {
          const isActivePlaying = currentSong?.id === song.id && isPlaying;

          return (
            <div
              key={song.id}
              className="min-w-full relative flex-shrink-0 group overflow-hidden flex items-end p-4 md:p-8 lg:p-10"
            >
              {/* Background removed to make banner transparent */}
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
        {songs.map((_, i) => (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); setCurrentIndex(i); }}
            aria-label={`Go to slide ${i + 1}`}
            className={`
              h-2 rounded-full transition-all duration-300
              ${i === currentIndex
                ? "w-8 md:w-10 bg-[#14b8a6] shadow-[0_0_8px_rgba(20,184,166,0.8)]"
                : "w-2.5 bg-white/40 hover:bg-white/70"}
            `}
          />
        ))}
      </div>
    </div>
  );
}
