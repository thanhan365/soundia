import React from "react";
import { FaPlay } from "react-icons/fa";

export default function MoodGenreSection({ onPlayRandom }) {
  const moods = [
    { id: 1, title: "EDM / Remix Vina", from: "from-[#FF0080]", to: "to-[#7928CA]" },
    { id: 2, title: "Lofi Chill & Thư giãn", from: "from-[#00DFD8]", to: "to-[#007CF0]" },
    { id: 3, title: "Tâm Trạng Suy", from: "from-[#F5A18B]", to: "to-[#BCA1F7]" },
    { id: 4, title: "Năng Lượng Tích Cực", from: "from-[#FF4D4D]", to: "to-[#FF9A9E]" },
  ];

  return (
    <section className="mb-12">
      <h2 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-cyan-200 mb-6 drop-shadow-md">
        Cảm Xúc & Thể Loại
      </h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {moods.map((mood) => (
          <div
            key={mood.id}
            onClick={onPlayRandom}
            className={`cursor-pointer overflow-hidden rounded-3xl p-6 h-32 md:h-40 relative group transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_15px_30px_rgba(255,255,255,0.1)]`}
          >
            {/* Background Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${mood.from} ${mood.to} opacity-80 group-hover:opacity-100 mix-blend-screen transition-opacity`} />
            <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] group-hover:bg-transparent transition-colors duration-500" />
            
            <h3 className="relative z-10 text-xl md:text-2xl font-black text-white drop-shadow-lg pr-8">
              {mood.title}
            </h3>

            {/* Hover Play Button */}
            <button className="absolute bottom-4 right-4 bg-white text-black p-3 rounded-full opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.4)]">
              <FaPlay className="fill-current w-5 h-5 ml-1" />
            </button>

            {/* Decorative organic shape */}
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/20 blur-2xl rounded-full group-hover:scale-150 transition-transform duration-700" />
          </div>
        ))}
      </div>
    </section>
  );
}
