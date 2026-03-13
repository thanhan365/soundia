import { usePlayer } from "../context/PlayerContext";
import RangeSlider from "./RangeSlider";
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
        data-player-mute-btn
        onClick={toggleMute}
        className="text-gray-400 hover:text-neon transition-colors duration-200"
      >
        {volume > 0 ? (
          <HiVolumeUp className="text-lg" />
        ) : (
          <HiVolumeOff className="text-lg" />
        )}
      </button>
      <RangeSlider
        value={volume}
        min={0}
        max={1}
        step={0.01}
        onChange={handleChange}
        showGlow={false}
        className="w-24 h-1"
      />
      {/* Hidden buttons for keyboard shortcuts */}
      <button data-player-vol-up onClick={() => changeVolume(Math.min(1, volume + 0.05))} className="hidden" />
      <button data-player-vol-down onClick={() => changeVolume(Math.max(0, volume - 0.05))} className="hidden" />
    </div>
  );
}
