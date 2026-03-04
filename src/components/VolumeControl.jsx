import { usePlayer } from "../context/PlayerContext";
import { HiVolumeUp, HiVolumeOff } from "react-icons/hi";

export default function VolumeControl() {
  const { volume, changeVolume } = usePlayer();

  const handleChange = (e) => {
    changeVolume(parseFloat(e.target.value));
  };

  const toggleMute = () => {
    changeVolume(volume > 0 ? 0 : 0.7);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggleMute}
        className="text-gray-400 hover:text-neon transition-colors duration-200"
      >
        {volume > 0 ? (
          <HiVolumeUp className="text-lg" />
        ) : (
          <HiVolumeOff className="text-lg" />
        )}
      </button>
      <div className="relative w-20 h-1 group">
        <div className="absolute inset-0 bg-gray-dark rounded-full" />
        <div
          className="absolute top-0 left-0 h-full bg-neon rounded-full"
          style={{ width: `${volume * 100}%` }}
        />
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={handleChange}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );
}
