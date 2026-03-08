import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { HiArrowLeft } from "react-icons/hi";
import { FaPlay, FaPause, FaHeart, FaEllipsisH } from "react-icons/fa";
import { usePlayer } from "../context/PlayerContext";

export default function ExternalPlaylistPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playSong, currentSong, isPlaying, togglePlay, playlists, allSongs } = usePlayer();
  
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Determine if this is a local playlist or an external one that needs fetching
    // Since we removed Deezer, and Spotify playlists aren't fully supported without 
    // a dedicated backend endpoint for tracks, we will treat external playlists as 
    // "not found" or map local playlists.
    
    // Check if it's a local playlist id
    const localPl = playlists.find(p => p.id === id || p.id === parseInt(id, 10));
    
    if (localPl) {
      // Reconstruct local playlist with actual song objects
      const tracks = (localPl.songs || []).map(songId => 
        allSongs.find(s => s.id === songId)
      ).filter(Boolean);

      setPlaylist({
        id: localPl.id,
        title: localPl.name,
        creator: "Bạn",
        picture: localPl.cover,
        tracks: tracks,
        fans: 0,
        description: "Playlist cá nhân của bạn."
      });
    } else {
      setPlaylist(null); // Not found
    }
    setLoading(false);
  }, [id, playlists, allSongs]);

  const handlePlayPlaylist = () => {
    if (playlist?.tracks?.length > 0) {
      if (currentSong && playlist.tracks.some(t => t.id === currentSong.id)) {
        togglePlay();
      } else {
        playSong(playlist.tracks[0]);
      }
    }
  };

  const isPlaylistPlaying = () => {
    return isPlaying && currentSong && playlist?.tracks?.some(t => t.id === currentSong.id);
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-400">Đang tải playlist...</p>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh]">
        <p className="text-red-400">Không tìm thấy playlist / Có lỗi xảy ra</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-cyan-400 hover:text-cyan-300">
          Quay lại trang chủ
        </button>
      </div>
    );
  }

  return (
    <div className="pb-32 px-4 md:px-8 mt-4 max-w-7xl mx-auto">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8 mb-10 w-full animate-fade-in-up">
        {/* Cover */}
        <div className="relative group w-52 h-52 md:w-64 md:h-64 flex-shrink-0">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 rounded-3xl blur opacity-30 group-hover:opacity-60 transition duration-500" />
          <img
            src={playlist.picture}
            alt={playlist.title}
            className="relative w-full h-full object-cover rounded-3xl shadow-xl transition-transform duration-500"
          />
        </div>

        {/* Text Info */}
        <div className="flex flex-col text-center md:text-left flex-1 min-w-0">
          <p className="text-xs md:text-sm text-cyan-400 font-bold uppercase tracking-widest mb-1 md:mb-2">
            Top Playlist
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black text-white hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-cyan-400 hover:to-purple-500 transition-all duration-300 drop-shadow-lg mb-3 line-clamp-2 md:line-clamp-none">
            {playlist.title}
          </h1>
          <div className="flex items-center justify-center md:justify-start gap-4 text-gray-400 text-sm mb-4 md:mb-6">
            <span className="flex flex-col md:flex-row md:items-center gap-1">
              Người tạo: <span className="text-white font-semibold">{playlist.creator}</span>
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-gray-600 hidden md:block" />
            <span className="hidden md:inline-block">{playlist.tracks.length} Bài hát</span>
            <span className="w-1.5 h-1.5 rounded-full bg-gray-600 hidden md:block" />
            <span className="hidden md:inline-block uppercase font-mono">{new Intl.NumberFormat('vi-VN').format(playlist.fans)} Lưu</span>
          </div>

          <p className="text-gray-300 text-sm mb-4 line-clamp-2 hidden md:block whitespace-pre-wrap">
            {playlist.description}
          </p>

          <div className="flex items-center justify-center md:justify-start gap-4">
            <button
              onClick={handlePlayPlaylist}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-cyan-500/30 hover:shadow-cyan-400/50 transition-all duration-300 hover:scale-105 active:scale-95"
            >
              {isPlaylistPlaying() ? <FaPause className="w-5 h-5 fill-current" /> : <FaPlay className="w-5 h-5 ml-1 fill-current" />}
              {isPlaylistPlaying() ? "Tạm Dừng" : "Phát Nhạc"}
            </button>
            <button className="flex items-center justify-center border border-white/20 bg-white/5 hover:bg-white/10 text-white w-12 h-12 rounded-full transition-colors active:scale-95">
              <FaHeart className="w-5 h-5" />
            </button>
            <button className="flex items-center justify-center text-gray-400 hover:text-white transition-colors w-12 h-12">
              <FaEllipsisH className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Tracks List */}
      <div className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden backdrop-blur-sm p-2 md:p-6 mb-8 shadow-xl">
        {/* Table Header */}
        <div className="hidden md:grid grid-cols-[50px_minmax(150px,2fr)_minmax(120px,1fr)_80px] gap-4 px-6 py-3 border-b border-white/5 text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
          <div className="text-center">#</div>
          <div>BÀI HÁT</div>
          <div>NGHỆ SĨ</div>
          <div className="text-right">THỜI GIAN</div>
        </div>

        {/* Tracks List */}
        <div className="flex flex-col">
          {playlist.tracks.map((song, i) => {
            const isActive = currentSong?.id === song.id;
            const isActivePlaying = isActive && isPlaying;
            
            return (
              <div
                key={song.id}
                onClick={(e) => { e.stopPropagation(); if (isActive) togglePlay(); else playSong(song); }}
                className={`group grid grid-cols-[40px_1fr_40px] md:grid-cols-[50px_minmax(150px,2fr)_minmax(120px,1fr)_80px] gap-3 md:gap-4 px-2 md:px-6 py-2.5 md:py-3 items-center rounded-xl md:rounded-2xl cursor-pointer hover:-translate-y-0.5 transition-all duration-200 ${
                  isActive ? "bg-cyan-500/10 border border-cyan-500/20" : "hover:bg-white/[0.04] border border-transparent"
                }`}
              >
                {/* 1. Index / Play indicator */}
                <div className="flex justify-center flex-shrink-0 text-sm font-medium text-gray-500 w-full h-full md:items-center">
                  {isActivePlaying ? (
                    <div className="flex items-end justify-center w-4 h-4 gap-[2px]">
                      <div className="w-[3px] bg-cyan-400 animate-[music-bar_1s_ease-in-out_infinite] h-full" />
                      <div className="w-[3px] bg-cyan-400 animate-[music-bar_0.8s_ease-in-out_infinite_0.2s] h-3/4" />
                      <div className="w-[3px] bg-cyan-400 animate-[music-bar_1.2s_ease-in-out_infinite_0.4s] h-[80%]" />
                    </div>
                  ) : (
                    <span className="group-hover:hidden self-center">{i + 1}</span>
                  )}
                  <FaPlay className={`w-3 h-3 text-white hidden group-hover:inline-block ${isActivePlaying ? '!hidden' : ''} self-center`} />
                </div>

                {/* 2. Song Info */}
                <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1 h-full">
                  <div className="relative w-10 h-10 md:w-12 md:h-12 flex-shrink-0">
                    <img
                      src={song.cover}
                      alt={song.title}
                      className="w-full h-full object-cover rounded-md md:rounded-lg shadow-sm group-hover:shadow-md transition-all"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-md md:rounded-lg pointer-events-none" />
                  </div>
                  <div className="flex flex-col min-w-0 pt-0.5 justify-center">
                    <p className={`text-[13px] md:text-sm font-semibold truncate leading-tight ${isActive ? "text-cyan-400" : "text-white group-hover:text-cyan-200"}`}>
                      {song.title}
                    </p>
                    <p className="text-[11px] md:text-xs text-gray-400 truncate leading-relaxed group-hover:text-gray-300 md:hidden mt-0.5">
                      {song.artist}
                    </p>
                  </div>
                </div>

                {/* 3. Artist (Desktop only) */}
                <div className="hidden md:flex items-center min-w-0 h-full">
                  <p className="text-xs text-gray-400 truncate group-hover:text-gray-300">
                    {song.artist}
                  </p>
                </div>

                {/* 4. Actions / Duration */}
                <div className="flex items-center justify-end gap-3 h-full pr-1">
                  <button onClick={(e) => { e.stopPropagation(); }} className="text-gray-500 hover:text-pink-500 opacity-0 lg:group-hover:opacity-100 transition-all focus:opacity-100">
                    <FaHeart className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] md:text-sm text-gray-500 font-mono w-10 text-right group-hover:text-white transition-colors">
                    {song.duration}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
