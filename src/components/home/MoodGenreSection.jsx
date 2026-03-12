import React from "react";
import { useNavigate } from "react-router-dom";
import { FaPlay } from "react-icons/fa";
import { HiChevronRight } from "react-icons/hi";
import { searchItunes } from "../../services/iTunesService";
import { usePlayer } from "../../context/PlayerContext";

const moods = [
  { id: 1, title: "EDM / Remix Vina", query: "EDM remix vinahouse", from: "from-[#FF0080]", to: "to-[#7928CA]" },
  { id: 2, title: "Lofi Chill & Thư giãn", query: "lofi chill relax", from: "from-[#00DFD8]", to: "to-[#007CF0]" },
  { id: 3, title: "Tâm Trạng Suy", query: "nhạc tâm trạng buồn", from: "from-[#F5A18B]", to: "to-[#BCA1F7]" },
  { id: 4, title: "Năng Lượng Tích Cực", query: "happy upbeat energetic", from: "from-[#FF4D4D]", to: "to-[#FF9A9E]" },
  { id: 5, title: "Ballad Việt", query: "ballad việt nam acoustic", from: "from-[#667eea]", to: "to-[#764ba2]" },
];

export default function MoodGenreSection() {
  const { playSong } = usePlayer();
  const navigate = useNavigate();

  const handleMoodClick = async (mood) => {
    try {
      const results = await searchItunes(mood.query);
      if (results?.tracks?.length > 0) {
        // Phát bài ngẫu nhiên trong top 5 kết quả
        const randomIdx = Math.floor(Math.random() * Math.min(5, results.tracks.length));
        playSong(results.tracks[randomIdx]);
      }
    } catch (err) {
      console.error("Mood search error:", err);
    }
  };

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">
          Cảm Xúc &amp; Thể Loại
        </h2>
        <button
          onClick={() => navigate('/genres')}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-neon transition-colors group"
        >
          Xem thêm
          <HiChevronRight className="text-base group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Mobile: horizontal scroll, Tablet+: grid */}
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:gap-4 md:overflow-visible md:pb-0">
        {moods.map((mood) => (
          <div
            key={mood.id}
            onClick={() => handleMoodClick(mood)}
            className={`cursor-pointer overflow-hidden rounded-xl md:rounded-2xl p-3 md:p-5 h-24 md:h-36 relative group transition-all duration-500 hover:shadow-[0_15px_30px_rgba(255,255,255,0.08)] flex-shrink-0 w-[calc(50%-6px)] min-w-[140px] snap-start md:w-auto md:min-w-0`}
          >
            {/* Background Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${mood.from} ${mood.to} opacity-75 group-hover:opacity-100 transition-opacity duration-300`} />
            <div className="absolute inset-0 bg-black/30 group-hover:bg-transparent transition-colors duration-300" />

            <h3 className="relative z-10 text-base md:text-xl font-black text-white drop-shadow-lg pr-6 leading-tight line-clamp-2">
              {mood.title}
            </h3>

            {/* Hover Play Button */}
            <button className="absolute bottom-2 right-2 md:bottom-3 md:right-3 bg-white text-black p-2 md:p-2.5 rounded-full opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 shadow-lg">
              <FaPlay className="fill-current w-3 h-3 md:w-3.5 md:h-3.5 ml-0.5" />
            </button>

            {/* Decorative shape */}
            <div className="absolute -bottom-8 -right-8 w-28 h-28 bg-white/15 blur-2xl rounded-full group-hover:scale-150 transition-transform duration-700" />
          </div>
        ))}
      </div>
    </section>
  );
}
