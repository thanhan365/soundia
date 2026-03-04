export default function SkeletonLoader() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="bg-dark-card rounded-xl p-4 flex items-center gap-4 animate-pulse"
        >
          {/* Cover skeleton */}
          <div className="w-14 h-14 rounded-lg skeleton-shimmer flex-shrink-0" />
          {/* Text skeleton */}
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded skeleton-shimmer" />
            <div className="h-3 w-1/2 rounded skeleton-shimmer" />
          </div>
          {/* Duration skeleton */}
          <div className="h-3 w-10 rounded skeleton-shimmer" />
        </div>
      ))}
    </div>
  );
}
