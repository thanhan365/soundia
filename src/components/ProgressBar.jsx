import { usePlayer } from "../context/PlayerContext";
import RangeSlider from "./RangeSlider";

function formatTime(seconds) {
  if (isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function ProgressBar() {
  const { currentTime, duration, seekTo } = usePlayer();

  const handleSeek = (e) => {
    seekTo(parseFloat(e.target.value));
  };

  return (
    <div className="flex items-center gap-3 w-full">
      <span className="text-xs text-gray-500 font-mono w-10 text-right">
        {formatTime(currentTime)}
      </span>
      <RangeSlider
        value={currentTime}
        min={0}
        max={duration || 0}
        step={0.1}
        onChange={handleSeek}
        showGlow={true}
        className="flex-1 h-1"
      />
      <span className="text-xs text-gray-500 font-mono w-10">
        {formatTime(duration)}
      </span>
    </div>
  );
}
