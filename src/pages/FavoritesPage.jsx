import { useState, useEffect, useCallback } from "react";
import { HiHeart, HiRefresh } from "react-icons/hi";
import { usePlayer } from "../context/PlayerContext";
import SongItem from "../components/SongItem";
import HeroSection from "../components/HeroSection";
import api from "../utils/api";

export default function FavoritesPage() {
  const { favorites, playSong, setPlayContext } = usePlayer();
  const [favoriteSongs, setFavoriteSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/favorites");
      const songs = (res.data || []).map(s => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        duration: s.duration,
        cover: s.coverUrl || s.cover || '',
        audio: s.audioUrl || s.audio || 'YT_STREAM',
      }));
      setFavoriteSongs(songs);
    } catch (e) {
      console.error("Failed to load favorites", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload khi favorites thay đổi (toggle thêm/bỏ)
  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites, favorites]);

  const description = favoriteSongs.length > 0
    ? `Bạn có ${favoriteSongs.length} bài yêu thích`
    : "Chưa có bài nào được yêu thích";

  return (
    <div className="space-y-4 sm:space-y-8">
      {/* Hero section */}
      <HeroSection
        icon={HiHeart}
        label="Yêu thích"
        title={<>Bài hát <span className="text-neon text-glow">Yêu thích</span></>}
        description={description}
      />

      {/* Favorites list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <HiRefresh className="text-3xl text-gray-500 animate-spin" />
        </div>
      ) : favoriteSongs.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-3 sm:mb-6">
            <div>
              <h2 className="text-lg sm:text-2xl font-bold text-white">Yêu thích của bạn</h2>
              <p className="text-sm text-gray-500 mt-1">
                {favoriteSongs.length} bài
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-1.5 sm:gap-2">
            {favoriteSongs.map((song, index) => (
              <SongItem key={song.id} song={song} index={index} onPlay={(s) => { setPlayContext(favoriteSongs, s.id); playSong(s); }} />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <HiHeart className="text-6xl text-gray-700 mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">Chưa có bài yêu thích</h3>
          <p className="text-gray-500">
            Nhấn vào biểu tượng tim trên bài hát để thêm vào danh sách yêu thích!
          </p>
        </div>
      )}
    </div>
  );
}
