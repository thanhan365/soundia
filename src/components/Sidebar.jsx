import { HiMusicNote, HiHome, HiSearch, HiHeart, HiClock } from "react-icons/hi";
import { usePlayer } from "../context/PlayerContext";

const navItems = [
  { icon: HiHome, label: "Home", active: true },
  { icon: HiSearch, label: "Search" },
  { icon: HiHeart, label: "Favorites" },
  { icon: HiClock, label: "Recent" },
];

export default function Sidebar({ isOpen, onClose }) {
  const { currentSong } = usePlayer();

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-dark-card/95 backdrop-blur-lg
          border-r border-gray-dark/50 z-50 flex flex-col
          transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo */}
        <div className="p-6 pb-4">
          <div
            className="
              group flex items-center gap-3 cursor-pointer
              transition-all duration-300 ease-out
            "
          >
            <div
              className="
                w-10 h-10 rounded-xl bg-neon/10 flex items-center justify-center
                group-hover:bg-neon/20 group-hover:shadow-neon
                group-hover:scale-110 transition-all duration-300
              "
            >
              <HiMusicNote className="text-neon text-xl" />
            </div>
            <h1
              className="
                text-2xl font-extrabold tracking-wider text-white
                group-hover:text-neon group-hover:text-glow
                transition-all duration-300
              "
            >
              SOUNDIA
            </h1>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-5 h-px bg-gradient-to-r from-transparent via-gray-dark to-transparent" />

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest px-3 mb-3">
            Menu
          </p>
          {navItems.map(({ icon: Icon, label, active }) => (
            <button
              key={label}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                transition-all duration-200 text-sm font-medium
                ${
                  active
                    ? "bg-neon/10 text-neon shadow-neon-sm"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }
              `}
            >
              <Icon className="text-lg" />
              {label}
            </button>
          ))}
        </nav>

        {/* Now Playing mini */}
        {currentSong && (
          <div className="p-4 border-t border-gray-dark/50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
              Now Playing
            </p>
            <div className="flex items-center gap-3">
              <img
                src={currentSong.cover}
                alt={currentSong.title}
                className="w-10 h-10 rounded-lg object-cover"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {currentSong.title}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {currentSong.artist}
                </p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
