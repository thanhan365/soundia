import SongList from "../components/SongList";
import { HiSparkles } from "react-icons/hi";

export default function Home() {
  return (
    <div className="space-y-8">
      {/* Hero section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-neon/10 via-dark-card to-dark-light p-8 border border-neon/10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-neon/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-neon/5 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <HiSparkles className="text-neon text-lg" />
            <span className="text-neon text-sm font-semibold uppercase tracking-widest">
              Discover
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">
            Feel the <span className="text-neon text-glow">Rhythm</span>
          </h1>
          <p className="text-gray-400 max-w-lg">
            Immerse yourself in the future of sound. Curated tracks from the
            best electronic and synthwave artists.
          </p>
        </div>
      </div>

      {/* Song list */}
      <SongList />
    </div>
  );
}
