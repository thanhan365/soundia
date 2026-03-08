import HeroSection from "../components/HeroSection";
import { HiViewGrid } from "react-icons/hi";

const genres = [
  { name: "Pop", emoji: "🎤", color: "from-pink-500/20 to-red-500/20" },
  { name: "K-Pop", emoji: "🇰🇷", color: "from-blue-500/20 to-purple-500/20" },
  { name: "US-UK", emoji: "🌍", color: "from-green-500/20 to-teal-500/20" },
  { name: "V-Pop", emoji: "🇻🇳", color: "from-red-500/20 to-yellow-500/20" },
  { name: "EDM", emoji: "🎧", color: "from-purple-500/20 to-blue-500/20" },
  { name: "Bolero", emoji: "🎻", color: "from-amber-500/20 to-orange-500/20" },
  { name: "R&B", emoji: "🎵", color: "from-indigo-500/20 to-pink-500/20" },
  { name: "Rap", emoji: "🎤", color: "from-gray-500/20 to-red-500/20" },
];

export default function GenresPage() {
  return (
    <div className="space-y-8">
      <HeroSection
        icon={HiViewGrid}
        label="Thể loại"
        title={<>Khám phá <span className="text-neon text-glow">Thể loại</span></>}
        description="Duyệt nhạc theo thể loại yêu thích của bạn"
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {genres.map((g) => (
          <button
            key={g.name}
            className={`
              bg-gradient-to-br ${g.color} rounded-xl p-4 sm:p-6 text-left
              border border-white/5 hover:border-white/15
              transition-all duration-300
            `}
          >
            <p className="text-2xl sm:text-3xl mb-1 sm:mb-2">{g.emoji}</p>
            <h3 className="text-base sm:text-lg font-bold text-white">{g.name}</h3>
          </button>
        ))}
      </div>
    </div>
  );
}
