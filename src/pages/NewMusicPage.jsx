import { useState, useEffect } from "react";
import HeroSection from "../components/HeroSection";
import { HiSparkles, HiMusicNote } from "react-icons/hi";
import SongItem from "../components/SongItem";
import SkeletonLoader from "../components/SkeletonLoader";
import api from "../utils/api";

export default function NewMusicPage() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchNewMusic = async () => {
      try {
        setLoading(true);
        // Using nct-top which returns 20 newest trending songs
        const res = await api.get("/songs/nct-top");
        if (mounted && res?.data?.success) {
          setSongs(res.data.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch new music", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchNewMusic();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="space-y-8 pb-32">
      <HeroSection
        icon={HiSparkles}
        label="Nhạc mới"
        title={<>Mới & <span className="text-neon text-glow">Thịnh Hành</span></>}
        description="Những bài hát mới và nổi bật nhất hiện nay"
      />

      <div className="pb-10 sm:pb-16">
        <div className="flex items-center justify-between mb-3 sm:mb-4 lg:mb-5">
          <div>
            <h2 className="text-base sm:text-lg lg:text-xl font-bold text-white">Top 20 Nhạc Mới</h2>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">
              Cập nhật liên tục
            </p>
          </div>
        </div>

        {loading ? (
          <SkeletonLoader />
        ) : songs.length > 0 ? (
          <>
            {/* Header Row for Desktop */}
            <div className="hidden md:flex items-center gap-3 lg:gap-4 px-4 py-2 border-b border-white/5 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-widest">
              <div className="flex-1">Bài Hát</div>
              <div className="w-16 text-center">Thời Gian</div>
              <div className="w-[100px] opacity-0">Actions</div>
            </div>

            <div className="flex flex-col gap-1">
              {songs.map((song, index) => (
                <SongItem key={`${song.id}-${Math.random()}`} song={song} index={index} />
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <HiMusicNote className="text-4xl sm:text-5xl text-gray-700 mb-2 sm:mb-3" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-400 mb-0.5 sm:mb-1">Không có dữ liệu</h3>
            <p className="text-xs sm:text-sm text-gray-500 max-w-sm px-4">
              Không thể tải danh sách nhạc mới. Vui lòng thử lại sau!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
