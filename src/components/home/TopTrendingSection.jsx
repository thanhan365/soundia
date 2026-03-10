import React, { useState, useEffect } from "react";
import api from "../../utils/api";
import { usePlayer } from "../../context/PlayerContext";
import { HiFire } from "react-icons/hi";

export default function TopTrendingSection() {
  const { playSong, currentSong, isPlaying } = usePlayer();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchTrending = async () => {
      try {
        const nctRes = await api.get("/songs/nct-top");
        if (nctRes?.data?.success && nctRes?.data?.data && isMounted) {
          setSongs(nctRes.data.data);
        }
      } catch (err) {
        console.error("TopTrending fetch failed:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchTrending();
    return () => { isMounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="mb-10 px-4 md:px-0">
        <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500 flex items-center gap-2">
          <HiFire className="text-orange-500" /> Đang hot trên BXH
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="bg-white/5 rounded-xl p-3 h-20"></div>
          ))}
        </div>
      </div>
    );
  }

  if (songs.length === 0) return null;

  return (
    <div className="mb-10 px-4 md:px-0">
      <div className="flex items-center gap-2 mb-4 md:mb-6">
        <HiFire className="text-orange-500 text-2xl animate-pulse" />
        <h2 className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-red-500 to-pink-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.3)]">
          Đang hot trên BXH
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {songs.map((song, index) => {
          const isActive = currentSong?.id === song.id;
          const isCurrentlyPlaying = isActive && isPlaying;

          return (
            <div
              key={song.id}
              onClick={() => playSong(song)}
              className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-300 relative overflow-hidden
                ${isActive
                  ? "bg-neon/10 border border-neon/20 shadow-[0_4px_12px_rgba(0,255,255,0.08)]"
                  : "bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-orange-500/30"
                }`}
            >
              {/* Cover + Play/Equalizer overlay */}
              <div className="relative w-12 h-12 md:w-14 md:h-14 flex-shrink-0 rounded-lg overflow-hidden shadow-md group/cover">
                <img src={song.cover} alt={song.title} className={`w-full h-full object-cover transition-all duration-300 ${isActive ? "shadow-neon-sm" : ""}`} />
                <div className={`absolute inset-0 transition-all duration-300 flex items-center justify-center ${isCurrentlyPlaying ? "bg-black/40" : "bg-black/0 group-hover/cover:bg-black/30"}`}>
                  {isCurrentlyPlaying ? (
                    /* Equalizer bars — Soundia style */
                    <div className="flex items-center gap-[2px]">
                      <span className="w-[2px] bg-neon rounded-full animate-bounce" style={{ height: "8px", animationDelay: "0ms" }} />
                      <span className="w-[2px] bg-neon rounded-full animate-bounce" style={{ height: "12px", animationDelay: "150ms" }} />
                      <span className="w-[2px] bg-neon rounded-full animate-bounce" style={{ height: "6px", animationDelay: "300ms" }} />
                    </div>
                  ) : (
                    /* Neon play button on hover */
                    <div className="w-7 h-7 rounded-full bg-neon flex items-center justify-center transform scale-0 group-hover:scale-100 transition-transform duration-300 shadow-neon">
                      <svg className="w-3.5 h-3.5 text-dark ml-0.5" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" /></svg>
                    </div>
                  )}
                </div>
              </div>

              {/* Song info */}
              <div className="flex-1 min-w-0 pr-2">
                <p className={`text-sm font-semibold truncate transition-colors ${isActive ? "text-neon" : "text-white group-hover:text-orange-400"}`}>
                  {song.title}
                </p>
                <p className="text-[11px] text-gray-500 truncate mt-0.5">
                  {song.artist}
                </p>
              </div>

              {/* Rank number */}
              <div className={`w-6 text-center font-bold text-sm transition-colors tabular-nums ${isActive ? "text-neon/60" : "text-gray-600 group-hover:text-orange-400/50"}`}>
                #{index + 1}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
