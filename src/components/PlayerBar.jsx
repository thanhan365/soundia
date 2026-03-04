import { usePlayer } from "../context/PlayerContext";
import ProgressBar from "./ProgressBar";
import VolumeControl from "./VolumeControl";
import {
  HiPlay,
  HiPause,
  HiBackward,
  HiForward,
} from "react-icons/hi2";
import { HiMusicNote } from "react-icons/hi";

export default function PlayerBar() {
  const { currentSong, isPlaying, togglePlay, playNext, playPrev } = usePlayer();

  return (
    <div
      className={`
        fixed bottom-0 left-0 right-0 z-30
        bg-dark-card/95 backdrop-blur-xl border-t border-gray-dark/50
        transition-all duration-500
        ${isPlaying ? "shadow-[0_-4px_30px_rgba(0,255,204,0.15)]" : ""}
      `}
    >
      <div className="max-w-screen-2xl mx-auto">
        {/* Progress bar on top of player (mobile-friendly) */}
        <div className="px-4 pt-2 lg:hidden">
          <ProgressBar />
        </div>

        <div className="flex items-center justify-between px-4 py-3 gap-4">
          {/* Song Info */}
          <div className="flex items-center gap-3 min-w-0 w-1/4">
            {currentSong ? (
              <>
                <img
                  src={currentSong.cover}
                  alt={currentSong.title}
                  className={`
                    w-12 h-12 rounded-lg object-cover flex-shrink-0
                    transition-all duration-500
                    ${isPlaying ? "shadow-neon-sm" : ""}
                  `}
                />
                <div className="min-w-0 hidden sm:block">
                  <p className="text-sm font-semibold text-white truncate">
                    {currentSong.title}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {currentSong.artist}
                  </p>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-gray-dark/50 flex items-center justify-center">
                  <HiMusicNote className="text-gray-500" />
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm text-gray-500">No track selected</p>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex flex-col items-center gap-2 flex-1 max-w-xl">
            <div className="flex items-center gap-4">
              <button
                onClick={playPrev}
                className="text-gray-400 hover:text-white transition-colors duration-200"
              >
                <HiBackward className="text-xl" />
              </button>

              <button
                onClick={togglePlay}
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center
                  transition-all duration-300
                  ${
                    currentSong
                      ? "bg-neon text-dark hover:scale-110 hover:shadow-neon"
                      : "bg-gray-dark text-gray-500 cursor-not-allowed"
                  }
                `}
                disabled={!currentSong}
              >
                {isPlaying ? (
                  <HiPause className="text-lg" />
                ) : (
                  <HiPlay className="text-lg ml-0.5" />
                )}
              </button>

              <button
                onClick={playNext}
                className="text-gray-400 hover:text-white transition-colors duration-200"
              >
                <HiForward className="text-xl" />
              </button>
            </div>

            {/* Desktop progress */}
            <div className="hidden lg:block w-full">
              <ProgressBar />
            </div>
          </div>

          {/* Volume (desktop only) */}
          <div className="hidden md:flex items-center justify-end w-1/4">
            <VolumeControl />
          </div>
        </div>
      </div>
    </div>
  );
}
