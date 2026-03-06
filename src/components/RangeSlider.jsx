export default function RangeSlider({
  value,
  min = 0,
  max = 100,
  step = 0.1,
  onChange,
  showGlow = false,
  className = "w-full h-1",
}) {
  const progress = max > 0 ? (value / max) * 100 : 0;

  return (
    <div className={`relative flex-1 group ${className}`}>
      <div className="absolute inset-0 bg-gray-dark rounded-full" />
      <div
        className="absolute top-0 left-0 h-full bg-neon rounded-full transition-all duration-100"
        style={{ width: `${progress}%` }}
      />
      {showGlow && (
        <div
          className="absolute top-0 left-0 h-full bg-neon/30 rounded-full blur-sm"
          style={{ width: `${progress}%` }}
        />
      )}
      <input
        type="range"
        min={min || 0}
        max={max || 100}
        step={step}
        value={value || 0}
        onChange={onChange}
        className="absolute inset-0 w-full opacity-0 cursor-pointer"
      />
    </div>
  );
}
