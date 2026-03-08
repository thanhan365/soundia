import React, { useState, useEffect } from "react";
import { getDeezerTrending } from "../../services/deezerService";
import { usePlayer } from "../../context/PlayerContext";
import { FaPlay, FaPause, FaHeart, FaEllipsisH } from "react-icons/fa";

// NOTE: deezerService already formats duration as "3:42" string, display directly

function TrendingRow({ song, index }) {
  const { playSong, currentSong, isPlaying, togglePlay } = usePlayer();
  const [hovered, setHovered] = useState(false);
  const isActive = currentSong?.id === song.id;
  const isActivePlaying = isActive && isPlaying;

  const handleClick = (e) => {
    e.stopPropagation();
    if (isActive) {
      togglePlay();
    } else {
      playSong(song);
    }
  };

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer group transition-all duration-200 ${
        isActive
          ? "bg-[#14b8a6]/10 border border-[#14b8a6]/20"
          : "hover:bg-white/[0.05] border border-transparent"
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
    >
      {/* Index / Play indicator */}
      <div className="w-5 flex-shrink-0 text-center">
        {hovered || isActive ? (
          <button
            onClick={handleClick}
            className="text-white"
          >
            {isActivePlaying ? (
              <FaPause className="w-3.5 h-3.5 fill-current text-[#14b8a6]" />
            ) : (
              <FaPlay className="w-3.5 h-3.5 fill-current text-white" />
            )}
          </button>
        ) : (
          <span
            className={`text-xs font-bold ${
              isActive ? "text-[#14b8a6]" : "text-gray-500"
            }`}
          >
            {index + 1}
          </span>
        )}
      </div>

      {/* Thumbnail */}
      <div className="relative w-9 h-9 flex-shrink-0 rounded-md overflow-hidden shadow-md">
        <img
          src={song.cover}
          alt={song.title}
          className="w-full h-full object-cover"
        />
        {isActivePlaying && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="flex gap-[2px] items-end h-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-[3px] bg-[#14b8a6] rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s`, height: `${50 + i * 25}%` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Song info */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-semibold truncate leading-tight ${
            isActive ? "text-[#14b8a6]" : "text-white group-hover:text-[#14b8a6]"
          } transition-colors duration-150`}
        >
          {song.title}
        </p>
        <p className="text-[11px] text-gray-500 truncate mt-0.5 leading-tight">
          {song.artist}
        </p>
      </div>

      {/* Actions (visible on hover) */}
      <div
        className={`flex items-center gap-2 flex-shrink-0 transition-opacity duration-150 ${
          hovered || isActive ? "opacity-100" : "opacity-0"
        }`}
      >
        <button
          className="text-gray-500 hover:text-pink-400 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <FaHeart className="w-3 h-3" />
        </button>
        <button
          className="text-gray-500 hover:text-white transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <FaEllipsisH className="w-3 h-3" />
        </button>
      </div>

      {/* Duration */}
      <div className="w-9 text-right flex-shrink-0">
        <span className="text-[11px] text-gray-500 font-mono">
          {song.duration}
        </span>
      </div>
    </div>
  );
}

export default function DeezerTrendingSection() {
  const [trendingSongs, setTrendingSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrending = async () => {
      setLoading(true);
      const data = await getDeezerTrending(20);
      setTrendingSongs(data);
      setLoading(false);
    };
    fetchTrending();
  }, []);

  if (loading) {
    return (
      <section className="mb-8">
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="h-6 w-40 bg-white/5 rounded-lg animate-pulse mb-2" />
            <div className="h-3 w-60 bg-white/5 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1">
          {[...Array(16)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl animate-pulse">
              <div className="w-5 h-3 bg-white/5 rounded" />
              <div className="w-9 h-9 bg-white/5 rounded-md flex-shrink-0" />
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="h-3 bg-white/5 rounded w-4/5" />
                <div className="h-2.5 bg-white/5 rounded w-3/5" />
              </div>
              <div className="w-9 h-2.5 bg-white/5 rounded" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (trendingSongs.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-white">Thịnh hành</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {trendingSongs.length} bài
          </p>
        </div>
        <button className="text-xs font-semibold text-[#14b8a6] hover:text-[#0d9488] transition-colors">
          Xem tất cả
        </button>
      </div>

      {/* 4-column compact grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1">
        {trendingSongs.map((song, index) => (
          <TrendingRow key={song.id} song={song} index={index} />
        ))}
      </div>
    </section>
  );
}
