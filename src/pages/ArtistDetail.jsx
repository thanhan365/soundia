import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { HiArrowLeft } from "react-icons/hi";
import { FaPlay, FaPause, FaHeart, FaEllipsisH } from "react-icons/fa";
import { usePlayer } from "../context/PlayerContext";
import { searchItunes } from "../services/iTunesService";

export default function ArtistDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playSong, currentSong, isPlaying, togglePlay } = usePlayer();
  
  const [artist, setArtist] = useState(null);
  const [topTracks, setTopTracks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Parse artist name from ID (format: "itunes_artist_{id}" or name-based)
  const actualId = id.startsWith("itunes_artist_") ? id.replace("itunes_artist_", "") : id;

  useEffect(() => {
    const fetchArtistData = async () => {
      setLoading(true);
      try {
        // Dùng iTunes search để tìm bài hát của nghệ sĩ
        // Thử tìm theo tên từ URL hoặc search lại
        const results = await searchItunes(decodeURIComponent(actualId));
        
        if (results?.tracks?.length > 0) {
           const firstTrack = results.tracks[0];
           setArtist({
              name: firstTrack.artist,
              picture: firstTrack.cover,
              fans: 0
           });
           setTopTracks(results.tracks);
        }
      } catch(e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    if (actualId) fetchArtistData();
  }, [actualId]);

  const handlePlayArtist = () => {
    if (topTracks.length > 0) {
      if (currentSong && topTracks.some(t => t.id === currentSong.id)) {
        togglePlay();
      } else {
        playSong(topTracks[0]);
      }
    }
  };

  const isArtistPlaying = () => {
    return isPlaying && currentSong && topTracks.some(t => t.id === currentSong.id);
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-400">Đang tải thông tin nghệ sĩ...</p>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh]">
        <p className="text-red-400">Không tìm thấy nghệ sĩ</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-purple-400 hover:text-purple-300">
          Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="pb-32 px-4 md:px-8 mt-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="relative w-full h-64 md:h-80 rounded-3xl overflow-hidden mb-8 shadow-2xl group flex items-end">
        {/* Background Cover */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-105"
          style={{ backgroundImage: `url(${artist.picture})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050511] via-[#050511]/60 to-transparent" />
        
        {/* Content */}
        <div className="relative z-10 p-6 md:p-10 w-full flex flex-col md:flex-row items-end gap-6 justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2 text-purple-300 text-sm font-semibold uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Nghệ Sĩ Được Xác Minh
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-white drop-shadow-lg mb-2">
              {artist.name}
            </h1>
            <p className="text-gray-300">
              {new Intl.NumberFormat('vi-VN').format(artist.fans)} người theo dõi
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={handlePlayArtist}
              className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white rounded-full p-4 shadow-[0_0_20px_rgba(236,72,153,0.4)] transition-all duration-300 hover:scale-105"
            >
              {isArtistPlaying() ? <FaPause className="w-6 h-6" /> : <FaPlay className="w-6 h-6 ml-1" />}
            </button>
            <button className="border border-white/20 hover:bg-white/10 text-white rounded-full p-4 transition-all duration-300">
              <FaHeart className="w-6 h-6" />
            </button>
            <button className="text-gray-400 hover:text-white transition-colors">
              <FaEllipsisH className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Actions */}
      <div className="flex items-center gap-4 mb-8 md:hidden px-2">
        <button
          onClick={handlePlayArtist}
          className="bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-full p-4 shadow-lg transition-transform active:scale-95"
        >
          {isArtistPlaying() ? <FaPause className="w-5 h-5" /> : <FaPlay className="w-5 h-5 ml-1" />}
        </button>
        <button className="border border-white/20 text-white rounded-full p-4">
          <FaHeart className="w-5 h-5" />
        </button>
      </div>

      {/* Top Tracks List */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <span className="w-1.5 h-8 bg-gradient-to-b from-blue-400 to-emerald-400 rounded-full" />
          Bài Hát Phổ Biến
        </h2>

        <div className="space-y-1">
          {topTracks.map((song, index) => {
            const isActive = currentSong?.id === song.id;
            const isActivePlaying = isActive && isPlaying;
            return (
              <div
                key={song.id}
                onClick={() => {
                  if (isActive) togglePlay();
                  else playSong(song);
                }}
                className={`group flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                  isActive ? "bg-white/10" : "hover:bg-white/5"
                }`}
              >
                {/* Index / Play indicator */}
                <div className="w-8 text-center flex-shrink-0 text-gray-500 font-medium">
                  {isActivePlaying ? (
                    <div className="flex items-end justify-center gap-0.5 h-4">
                      <div className="w-1 bg-[#14b8a6] animate-[music-bar_1s_ease-in-out_infinite] h-full" />
                      <div className="w-1 bg-[#14b8a6] animate-[music-bar_0.8s_ease-in-out_infinite_0.2s] h-3/4" />
                      <div className="w-1 bg-[#14b8a6] animate-[music-bar_1.2s_ease-in-out_infinite_0.4s] h-full" />
                    </div>
                  ) : (
                    <span className="group-hover:hidden">{index + 1}</span>
                  )}
                  <FaPlay className={`w-3 h-3 text-white hidden group-hover:inline-block ${isActivePlaying ? '!hidden' : ''}`} />
                </div>

                {/* Cover & Title */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <img src={song.cover} alt={song.title} className="w-12 h-12 rounded-lg object-cover shadow-sm" />
                  <div className="min-w-0">
                    <p className={`font-semibold truncate ${isActive ? "text-[#14b8a6]" : "text-white"}`}>
                      {song.title}
                    </p>
                    <p className="text-sm text-gray-400 truncate">
                      Lượt nghe khủng
                    </p>
                  </div>
                </div>

                {/* Duration & Actions */}
                <div className="flex items-center gap-6">
                  <button onClick={(e) => e.stopPropagation()} className="text-gray-500 hover:text-pink-500 opacity-0 group-hover:opacity-100 transition-all">
                    <FaHeart />
                  </button>
                  <span className="text-gray-400 text-sm font-mono w-12 text-right">
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
