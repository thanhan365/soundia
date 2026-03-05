import { HiClock } from "react-icons/hi";
import HeroSection from "../components/HeroSection";
import SongItem from "../components/SongItem";
import { usePlayer } from "../context/PlayerContext";

export default function RecentPage() {
  const { recentHistory } = usePlayer();

  return (
    <div className="space-y-4 sm:space-y-8">
      {/* Hero section */}
      <HeroSection
        icon={HiClock}
        label="Đã nghe gần đây"
        title={<>Lịch sử <span className="text-neon text-glow">Nghe nhạc</span></>}
        description={
          recentHistory.length > 0
            ? `${recentHistory.length} bài đã nghe gần đây`
            : "Bắt đầu nghe nhạc để xem lịch sử ở đây!"
        }
      />

      {/* Recent list */}
      {recentHistory.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-3 sm:mb-6">
            <div>
              <h2 className="text-lg sm:text-2xl font-bold text-white">Nghe gần đây</h2>
              <p className="text-sm text-gray-500 mt-1">
                {recentHistory.length} bài (tối đa 20)
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-1.5 sm:gap-3">
            {recentHistory.map((song, index) => (
              <SongItem key={`recent-${song.id}-${index}`} song={song} index={index} />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <HiClock className="text-6xl text-gray-700 mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">Chưa có lịch sử</h3>
          <p className="text-gray-500">
            Phát nhạc để xem lịch sử nghe ở đây!
          </p>
        </div>
      )}
    </div>
  );
}
