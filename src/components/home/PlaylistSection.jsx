import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePlayer } from "../../context/PlayerContext";

export default function PlaylistSection() {
  const { playlists, user } = usePlayer();
  const navigate = useNavigate();

  const handlePlaylistClick = (pl) => {
    navigate(`/playlist-detail/${pl.id}`);
  };

  if (!playlists || playlists.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-gradient-to-b from-cyan-400 to-purple-500 rounded-full" />
          <h2 className="text-xl font-bold text-white">Playlist Của Bạn</h2>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {playlists.map((pl) => (
          <div
            key={pl.id}
            onClick={() => handlePlaylistClick(pl)}
            className="bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-purple-500/30 p-3 rounded-2xl transition-all duration-300 group cursor-pointer hover:shadow-[0_10px_25px_rgba(168,85,247,0.12)]"
          >
            <div className="relative w-full aspect-square mb-3 rounded-xl overflow-hidden shadow-lg bg-white/5 flex flex-col items-center justify-center">
              {pl.cover ? (
                <img
                  src={pl.cover}
                  alt={pl.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-800 to-pink-600 flex items-center justify-center">
                  <span className="text-4xl text-white font-bold">{pl.name.charAt(0).toUpperCase()}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-4 text-center">
                <span className="text-white text-sm font-bold bg-purple-600/80 px-4 py-1.5 rounded-full backdrop-blur-sm transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                  Xem Playlist
                </span>
              </div>
            </div>

            <h3 className="text-white font-semibold truncate text-sm mb-0.5 group-hover:text-purple-300 transition-colors">
              {pl.name}
            </h3>
            <p className="text-xs text-gray-500 truncate">
              {pl.songs?.length || 0} bài hát
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
