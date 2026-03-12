export default function RangeSlider({
  value,
  min = 0,
  max = 100,
  step = 0.1,
  onChange,
  onMouseDown,
  onMouseUp,
  showGlow = false,
  className = "w-full h-1",
}) {
  const progress = max > 0 ? (value / max) * 100 : 0;

  return (
    <div className={`relative flex items-center group ${className}`}>
      <div className="absolute inset-x-0 h-1 bg-gray-dark rounded-full" />
      <div
        className="absolute inset-y-0 left-0 h-1 bg-gradient-to-r from-[#22d3ee] to-[#2dd4bf] rounded-full"
        style={{ width: `${progress}%`, top: '50%', transform: 'translateY(-50%)' }}
      />
      {showGlow && (
        <div
          className="absolute inset-y-0 left-0 h-1 bg-[#2EC4B6]/30 rounded-full blur-sm"
          style={{ width: `${progress}%`, top: '50%', transform: 'translateY(-50%)' }}
        />
      )}
      <input
        type="range"
        min={min || 0}
        max={max || 100}
        step={step}
        value={value || 0}
        onChange={onChange}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onTouchStart={onMouseDown}
        onTouchEnd={onMouseUp}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer m-0 p-0"
      />
    </div>
  );
}
