import { useState, useEffect } from "react";
import { usePlayer } from "../context/PlayerContext";
import SongItem from "./SongItem";
import SkeletonLoader from "./SkeletonLoader";

export default function SongList() {
  const { songList } = usePlayer();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Trending Now</h2>
          <p className="text-sm text-gray-500 mt-1">
            {songList.length} tracks available
          </p>
        </div>
      </div>

      {loading ? (
        <SkeletonLoader />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
          {songList.map((song, index) => (
            <SongItem key={song.id} song={song} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}
