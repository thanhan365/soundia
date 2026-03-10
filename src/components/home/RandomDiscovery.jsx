import React from "react";
import { FaRandom } from "react-icons/fa";

export default function RandomDiscovery({ onDiscover }) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] p-6 md:p-8 group shadow-lg mb-8">
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/20 via-purple-600/20 to-pink-600/20 animate-gradient bg-[length:200%_auto]"></div>
      <div className="absolute inset-0 backdrop-blur-3xl bg-[#050511]/40 border border-white/10 rounded-[2rem]"></div>

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">

        {/* Left: Icon & Text */}
        <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-4 md:gap-6 flex-1">
          <div className="flex-shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-tr from-cyan-400 to-purple-500 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.4)] group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
            <FaRandom className="text-2xl md:text-3xl text-white" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 mb-1 md:mb-2">
              Khám phá ẩn số
            </h2>
            <p className="text-gray-300 text-sm md:text-base">
              Chưa biết nghe gì hôm nay? Hãy để thuật toán chọn bài ngẫu nhiên!
            </p>
          </div>
        </div>

        {/* Right: Call to Action */}
        <div className="flex-shrink-0">
          <button
            onClick={onDiscover}
            className="px-6 md:px-8 py-3 bg-white text-[#050511] text-sm md:text-base font-bold rounded-full hover:bg-gray-200 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_25px_rgba(255,255,255,0.3)] tracking-wider whitespace-nowrap"
          >
            CHƠI NHẠC NGAY
          </button>
        </div>
      </div>
    </div>
  );
}
