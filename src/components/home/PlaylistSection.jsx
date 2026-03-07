import React, { useState, useEffect } from "react";
import { FaPlay } from "react-icons/fa";
import { getDeezerPlaylists } from "../../services/deezerService";

export default function PlaylistSection({ onPlayRandom }) {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlaylists = async () => {
      setLoading(true);
      const data = await getDeezerPlaylists(15);
      setPlaylists(data);
      setLoading(false);
    };
    fetchPlaylists();
  }, []);

  if (loading) {
    return (
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1.5 h-8 bg-gradient-to-b from-cyan-400 to-purple-500 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.8)]"></div>
          <h2 className="text-2xl md:text-3xl font-black text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.1)]">
            Playlist Đề Xuất
          </h2>
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-[160px] md:w-full flex-shrink-0 animate-pulse bg-white/5 p-4 rounded-[2rem]">
              <div className="w-full aspect-square bg-white/10 rounded-3xl mb-4"></div>
              <div className="h-4 bg-white/10 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-white/10 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (playlists.length === 0) return null;

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-8 bg-gradient-to-b from-cyan-400 to-purple-500 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.8)]"></div>
          <h2 className="text-2xl md:text-3xl font-black text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.1)]">
            Playlist Đề Xuất
          </h2>
        </div>
        <p className="text-sm font-semibold text-purple-400 hidden sm:block">Từ thư viện Deezer</p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-6 snap-x snap-mandatory custom-scrollbar lg:grid lg:grid-cols-5 md:overflow-visible md:pb-0">
        {playlists.map((pl) => (
          <div
            key={pl.id}
            onClick={onPlayRandom}
            className="snap-start flex-shrink-0 w-[160px] lg:w-full bg-[#181825]/50 backdrop-blur-xl border border-white/5 hover:border-purple-500/30 p-4 rounded-[2rem] transition-all duration-500 group cursor-pointer hover:bg-[#1e1e2e]/80 hover:-translate-y-2 hover:shadow-[0_15px_30px_rgba(168,85,247,0.15)]"
          >
            <div className="relative w-full aspect-square mb-4 rounded-3xl overflow-hidden shadow-2xl">
              <img
                src={pl.cover}
                alt={pl.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                <button className="bg-white/20 backdrop-blur-md rounded-full p-4 shadow-xl border border-white/20 text-white hover:bg-white hover:text-black hover:scale-110 transition-all duration-300">
                  <FaPlay className="fill-current w-6 h-6 ml-1" />
                </button>
              </div>
            </div>
            
            <h3 className="text-white font-bold truncate text-base mb-1 group-hover:text-purple-300 transition-colors">
              {pl.title}
            </h3>
            <p className="text-xs text-blue-200/60 line-clamp-2">
              Bởi {pl.user || "Deezer"}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
