import React from "react";
import { FaRandom } from "react-icons/fa";

export default function RandomDiscovery({ onDiscover }) {
  return (
    <div className="relative overflow-hidden rounded-xl sm:rounded-[2rem] p-4 sm:p-6 md:p-8 group shadow-lg mb-6 sm:mb-8">
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/20 via-purple-600/20 to-pink-600/20 animate-gradient bg-[length:200%_auto]"></div>
      <div className="absolute inset-0 backdrop-blur-3xl bg-[#050511]/40 border border-white/10 rounded-xl sm:rounded-[2rem]"></div>

      <div className="relative z-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-between sm:gap-6 md:gap-8">

        {/* Left: Icon & Text */}
        <div className="flex items-center gap-3 sm:gap-4 md:gap-6 flex-1 min-w-0 w-full sm:w-auto">
          <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-tr from-cyan-400 to-purple-500 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.4)] group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
            <FaRandom className="text-lg sm:text-2xl md:text-3xl text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 mb-0.5 sm:mb-1 md:mb-2 truncate">
              Khám phá ẩn số
            </h2>
            <p className="text-gray-300 text-xs sm:text-sm md:text-base truncate sm:whitespace-normal">
              Chưa biết nghe gì? Để thuật toán chọn bài ngẫu nhiên!
            </p>
          </div>
        </div>

        {/* Right: Call to Action */}
        <div className="flex-shrink-0">
          <button
            onClick={onDiscover}
            className="px-5 sm:px-6 md:px-8 py-2.5 sm:py-3 bg-white text-[#050511] text-xs sm:text-sm md:text-base font-bold rounded-full hover:bg-gray-200 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_25px_rgba(255,255,255,0.3)] tracking-wider whitespace-nowrap"
          >
            CHƠI NHẠC NGAY
          </button>
        </div>
      </div>
    </div>
  );
}
