import { usePlayer } from "../context/PlayerContext";

function formatTime(seconds) {
  if (isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function ProgressBar() {
  const { currentTime, duration, seekTo } = usePlayer();
  const progress = duration ? (currentTime / duration) * 100 : 0;

  const handleSeek = (e) => {
    const value = parseFloat(e.target.value);
    seekTo(value);
  };

  return (
    <div className="flex items-center gap-3 w-full">
      <span className="text-xs text-gray-500 font-mono w-10 text-right">
        {formatTime(currentTime)}
      </span>
      <div className="relative flex-1 h-1 group">
        <div className="absolute inset-0 bg-gray-dark rounded-full" />
        <div
          className="absolute top-0 left-0 h-full bg-neon rounded-full transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
        <div
          className="absolute top-0 left-0 h-full bg-neon/30 rounded-full blur-sm"
          style={{ width: `${progress}%` }}
        />
        <input
          type="range"
          min="0"
          max={duration || 0}
          step="0.1"
          value={currentTime}
          onChange={handleSeek}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
      </div>
      <span className="text-xs text-gray-500 font-mono w-10">
        {formatTime(duration)}
      </span>
    </div>
  );
}
