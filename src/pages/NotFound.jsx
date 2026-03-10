import React from "react";
import { Link } from "react-router-dom";
import { HiHome, HiSearch, HiMusicNote } from "react-icons/hi";

export default function NotFound() {
    return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
            {/* Animated 404 Number */}
            <div className="relative mb-8">
                <h1 className="text-[150px] sm:text-[200px] font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 leading-none select-none animate-pulse">
                    404
                </h1>
                <div className="absolute inset-0 text-[150px] sm:text-[200px] font-black text-purple-500/10 blur-2xl leading-none select-none">
                    404
                </div>
            </div>

            {/* Floating music note */}
            <div className="mb-6 animate-bounce">
                <HiMusicNote className="text-5xl text-purple-400/60" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                Không tìm thấy trang này
            </h2>
            <p className="text-gray-400 mb-8 max-w-md text-sm sm:text-base">
                Trang bạn đang tìm có thể đã bị xóa, đổi tên, hoặc tạm thời không khả dụng.
                Hãy thử quay về trang chủ hoặc tìm kiếm nội dung bạn muốn.
            </p>

            <div className="flex flex-wrap gap-3 justify-center">
                <Link
                    to="/"
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-full transition-all duration-300 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-105"
                >
                    <HiHome className="text-lg" />
                    Trang chủ
                </Link>
                <Link
                    to="/search"
                    className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-full transition-all duration-300 border border-white/10 hover:border-white/20 hover:scale-105"
                >
                    <HiSearch className="text-lg" />
                    Tìm kiếm
                </Link>
            </div>
        </div>
    );
}
