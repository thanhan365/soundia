import React, { useState, useEffect } from "react";
import { getDeezerTrending } from "../../services/deezerService";
import { usePlayer } from "../../context/PlayerContext";
import { FaPlay, FaPause } from "react-icons/fa";

export default function DeezerTrendingSection() {
  const [trendingSongs, setTrendingSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { playSong, currentSong, isPlaying, togglePlay } = usePlayer();

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
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-6">Đang Thịnh Hành</h2>
        <div className="flex gap-4 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-[160px] md:w-[200px] flex-shrink-0 animate-pulse">
              <div className="w-full aspect-square bg-white/5 rounded-xl mb-3"></div>
              <div className="h-4 bg-white/5 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-white/5 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (trendingSongs.length === 0) return null;

  const handlePlayPause = (e, song) => {
    e.stopPropagation();
    if (currentSong?.id === song.id) {
      togglePlay();
    } else {
      playSong(song);
    }
  };

  return (
    <section className="mb-12">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Đang Thịnh Hành</h2>
          <p className="text-sm text-gray-400 mt-1">Cập nhật liên tục từ bảng xếp hạng Deezer</p>
        </div>
        <p className="text-sm font-semibold text-[#14b8a6]">{trendingSongs.length} bài</p>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-6 snap-x snap-mandatory custom-scrollbar">
        {trendingSongs.map((song) => {
          const isActivePlaying = currentSong?.id === song.id && isPlaying;
          return (
            <div 
              key={song.id} 
              className="snap-start flex-shrink-0 w-[160px] md:w-[200px] bg-white/[0.02] hover:bg-white/[0.08] p-4 rounded-xl transition-all duration-300 group cursor-pointer border border-transparent hover:border-white/10"
              onClick={(e) => handlePlayPause(e, song)}
            >
              <div className="relative w-full aspect-square mb-4 rounded-lg overflow-hidden shadow-lg group-hover:shadow-[0_10px_30px_rgba(20,184,166,0.3)] transition-shadow duration-300">
                <img src={song.cover} alt={song.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                
                {/* Play Button Overlay */}
                <div className={`absolute bottom-2 right-2 rounded-full p-3 shadow-xl transition-all duration-300 ${
                  isActivePlaying 
                    ? 'opacity-100 translate-y-0 bg-[#14b8a6] text-white' 
                    : 'opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 bg-white text-[#050511] hover:scale-110 hover:bg-[#14b8a6] hover:text-white'
                }`}>
                  {isActivePlaying ? <FaPause className="w-5 h-5 fill-current" /> : <FaPlay className="w-5 h-5 fill-current ml-0.5" />}
                </div>
              </div>
              
              <h3 className="text-base text-white font-bold truncate group-hover:text-[#14b8a6] transition-colors">
                {song.title}
              </h3>
              <p className="text-xs text-gray-400 truncate mt-1">
                {song.artist}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
