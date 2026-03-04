import { HiHeart } from "react-icons/hi";
import { usePlayer } from "../context/PlayerContext";
import SongItem from "../components/SongItem";
import HeroSection from "../components/HeroSection";

export default function FavoritesPage() {
  const { allSongs, favorites } = usePlayer();
  const favoriteSongs = allSongs.filter((song) => favorites.includes(song.id));

  const description = favoriteSongs.length > 0
    ? `Bạn có ${favoriteSongs.length} bài yêu thích`
    : "Chưa có bài nào được yêu thích";

  return (
    <div className="space-y-8">
      {/* Hero section */}
      <HeroSection
        icon={HiHeart}
        label="Yêu thích"
        title={<>Bài hát <span className="text-neon text-glow">Yêu thích</span></>}
        description={description}
      />

      {/* Favorites list */}
      {favoriteSongs.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Yêu thích của bạn</h2>
              <p className="text-sm text-gray-500 mt-1">
                {favoriteSongs.length} bài
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
            {favoriteSongs.map((song, index) => (
              <SongItem key={song.id} song={song} index={index} />
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
