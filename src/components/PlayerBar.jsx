import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";
import ProgressBar from "./ProgressBar";
import VolumeControl from "./VolumeControl";
import { HiPlay, HiPause, HiBackward, HiForward } from "react-icons/hi2";
import { HiMusicNote, HiHeart } from "react-icons/hi";
import { IoShuffle, IoRepeat } from "react-icons/io5";
import { HiQueueList } from "react-icons/hi2";

export default function PlayerBar() {
  const {
    currentSong, isPlaying, togglePlay, playNext, playPrev,
    shuffle, toggleShuffle, repeatMode, toggleRepeat,
    toggleFavorite, isFavorite, queueOpen, setQueueOpen,
    lyricsOpen, setLyricsOpen,
  } = usePlayer();
  const { showToast } = useToast();

  const liked = currentSong ? isFavorite(currentSong.id) : false;

  const handleLike = () => {
    if (!currentSong) return;
    toggleFavorite(currentSong.id);
    showToast(liked ? "Đã bỏ yêu thích" : "Đã thêm vào yêu thích", liked ? "info" : "success");
  };

  return (
    <div
      className={`
        fixed bottom-0 left-0 right-0 z-30
        bg-[#130c1c]/95 backdrop-blur-xl border-t border-white/5
        transition-all duration-500
        ${isPlaying ? "shadow-[0_-2px_20px_rgba(0,255,204,0.08)]" : ""}
      `}
    >
      <div className="max-w-screen-2xl mx-auto">
        <div className="px-4 pt-1.5 lg:hidden"><ProgressBar /></div>

        <div className="flex items-center justify-between px-4 py-2.5 gap-4">
          {/* Song Info + Like */}
          <div className="flex items-center gap-3 min-w-0 w-1/4">
            {currentSong ? (
              <>
                {/* Spinning cover */}
                <div className={`w-11 h-11 rounded-full overflow-hidden flex-shrink-0 border-2 border-neon/20 ${isPlaying ? "animate-spin-slow" : ""}`}>
                  <img src={currentSong.cover} alt={currentSong.title} className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 hidden sm:block">
                  <p className="text-sm font-semibold text-white truncate">{currentSong.title}</p>
                  <p className="text-xs text-gray-500 truncate">{currentSong.artist}</p>
                </div>
                <button
                  onClick={handleLike}
                  className={`hidden sm:flex flex-shrink-0 p-1 rounded-full transition-all duration-300 ${liked ? "text-red-500" : "text-gray-600 hover:text-gray-300"}`}
                >
                  <HiHeart className={`text-base ${liked ? "drop-shadow-[0_0_4px_rgba(239,68,68,0.4)]" : ""}`} />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-white/5 flex items-center justify-center">
                  <HiMusicNote className="text-gray-600" />
                </div>
                <p className="text-sm text-gray-600 hidden sm:block">Chọn bài để phát</p>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex flex-col items-center gap-1.5 flex-1 max-w-xl">
            <div className="flex items-center gap-5">
              <button
                onClick={toggleShuffle}
                className={`relative p-1 transition-all duration-300 ${shuffle ? "text-neon drop-shadow-[0_0_6px_rgba(0,255,204,0.4)]" : "text-gray-600 hover:text-gray-300"}`}
                title={shuffle ? "Tắt ngẫu nhiên" : "Phát ngẫu nhiên"}
              >
                <IoShuffle className="text-[17px]" />
                {shuffle && <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-neon" />}
              </button>

              <button onClick={playPrev} className="text-gray-400 hover:text-white transition-colors">
                <HiBackward className="text-xl" />
              </button>

              <button
                onClick={togglePlay}
                disabled={!currentSong}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${currentSong ? "bg-white text-dark hover:scale-110" : "bg-white/10 text-gray-600 cursor-not-allowed"}`}
              >
                {isPlaying ? <HiPause className="text-lg" /> : <HiPlay className="text-lg ml-0.5" />}
              </button>

              <button onClick={playNext} className="text-gray-400 hover:text-white transition-colors">
                <HiForward className="text-xl" />
              </button>

              <button
                onClick={toggleRepeat}
                className={`relative p-1 transition-all duration-300 ${repeatMode !== "none" ? "text-neon drop-shadow-[0_0_6px_rgba(0,255,204,0.4)]" : "text-gray-600 hover:text-gray-300"}`}
                title={repeatMode === "none" ? "Tắt" : repeatMode === "all" ? "Lặp tất cả" : "Lặp 1 bài"}
              >
                <IoRepeat className="text-[17px]" />
                {repeatMode === "one" && (
                  <span className="absolute -top-1 -right-1 bg-neon text-dark text-[8px] rounded-full w-3 h-3 flex items-center justify-center font-bold">1</span>
                )}
                {repeatMode !== "none" && <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-neon" />}
              </button>
            </div>
            <div className="hidden lg:block w-full"><ProgressBar /></div>
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center justify-end gap-2 w-1/4">
            {/* Lyrics toggle */}
            <button
              onClick={() => setLyricsOpen(!lyricsOpen)}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all ${lyricsOpen ? "text-neon bg-neon/10" : "text-gray-600 hover:text-gray-300"}`}
              title="Lời bài hát"
            >
              <span className="text-[11px] leading-none">LRC</span>
            </button>
            <VolumeControl />
            <button
              onClick={() => setQueueOpen(!queueOpen)}
              className={`p-1.5 rounded-lg transition-all ${queueOpen ? "text-neon bg-neon/10" : "text-gray-600 hover:text-gray-300"}`}
              title="Danh sách phát"
            >
              <HiQueueList className="text-base" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
