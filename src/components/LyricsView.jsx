import { usePlayer } from "../context/PlayerContext";
import { HiX } from "react-icons/hi";

export default function LyricsView() {
  const { lyricsOpen, setLyricsOpen, currentSong, isPlaying } = usePlayer();

  if (!lyricsOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-2xl flex flex-col items-center justify-center animate-fade-in">
      {/* Close */}
      <button
        onClick={() => setLyricsOpen(false)}
        className="absolute top-4 right-4 sm:top-6 sm:right-6 text-gray-400 hover:text-white transition-colors z-10"
      >
        <HiX className="text-2xl" />
      </button>

      {/* Background glow */}
      {currentSong && (
        <div
          className="absolute inset-0 opacity-20 blur-3xl"
          style={{
            backgroundImage: `url(${currentSong.cover})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}

      <div className="relative z-10 flex flex-col items-center px-6 max-w-2xl w-full">
        {currentSong ? (
          <>
            {/* Spinning cover */}
            <div className={`w-36 h-36 sm:w-48 sm:h-48 md:w-64 md:h-64 rounded-full overflow-hidden border-4 border-white/10 shadow-2xl mb-6 sm:mb-8 ${isPlaying ? "animate-spin-slow" : ""}`}>
              <img src={currentSong.cover} alt={currentSong.title} className="w-full h-full object-cover" />
            </div>

            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white text-center mb-2">
              {currentSong.title}
            </h2>
            <p className="text-base sm:text-lg text-gray-400 mb-6 sm:mb-10">{currentSong.artist}</p>

            {/* Lyrics placeholder */}
            <div className="w-full max-h-[40vh] overflow-y-auto text-center space-y-4 scrollbar-hide">
              <p className="text-lg text-gray-300 leading-relaxed">
                ♪ Lời bài hát chưa khả dụng ♪
              </p>
              <p className="text-sm text-gray-500 mt-4">
                Tính năng hiển thị lời bài hát sẽ sớm được cập nhật.
                <br />Hãy tận hưởng giai điệu nhé! 🎵
              </p>
            </div>
          </>
        ) : (
          <div className="text-center">
            <p className="text-xl text-gray-400">Chưa phát bài nào</p>
            <p className="text-sm text-gray-600 mt-2">Chọn bài hát để xem lời</p>
          </div>
        )}
      </div>
    </div>
  );
}
