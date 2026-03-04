import { useState, useEffect } from "react";
import { usePlayer } from "../context/PlayerContext";
import SongItem from "./SongItem";
import SkeletonLoader from "./SkeletonLoader";
import { HiMusicNote } from "react-icons/hi";

export default function SongList() {
  const { songList, searchQuery } = usePlayer();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, [songList]);

  const heading = searchQuery ? "Kết quả tìm kiếm" : "Thịnh hành";

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-white">{heading}</h2>
          <p className="text-xs text-gray-500 mt-1">
            {songList.length} bài {searchQuery ? "tìm thấy" : ""}
          </p>
        </div>
      </div>

      {loading ? (
        <SkeletonLoader />
      ) : songList.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2">
          {songList.map((song, index) => (
            <SongItem key={song.id} song={song} index={index} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <HiMusicNote className="text-5xl text-gray-700 mb-3" />
          <h3 className="text-lg font-semibold text-gray-400 mb-1">Không tìm thấy</h3>
          <p className="text-sm text-gray-500 max-w-sm">
            {searchQuery
              ? `Không có kết quả cho "${searchQuery}". Thử tìm kiếm khác!`
              : "Chưa có bài hát nào."}
          </p>
        </div>
      )}
    </div>
  );
}
