import { useState, useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { usePlayer } from "../context/PlayerContext";
import { AuthContext } from "../context/AuthContext";
import {
  HiHome, HiHeart, HiClock,
  HiCollection, HiPlus,
  HiSparkles, HiViewGrid
} from "react-icons/hi";
import CreatePlaylistModal from "./CreatePlaylistModal";

const mainNav = [
  { to: "/", icon: HiHome, label: "Khám phá" },
  { to: "/new-music", icon: HiSparkles, label: "Nhạc mới" },
  { to: "/genres", icon: HiViewGrid, label: "Thể loại" },
];

const personalNav = [
  { to: "/library", icon: HiCollection, label: "Thư viện" },
  { to: "/recent", icon: HiClock, label: "Lịch sử" },
  { to: "/favorites", icon: HiHeart, label: "Yêu thích" },
];

export default function Sidebar({ isOpen, onClose }) {
  const { currentSong, playlists } = usePlayer();
  const { user, logout } = useContext(AuthContext);
  const [showModal, setShowModal] = useState(false);
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();

  // Desktop: sidebar nổi, chỉ hiện icon, hover mở rộng
  // Mobile: slide-in khi bấm menu
  const isExpanded = isOpen || hovered;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 z-[55] lg:hidden" onClick={onClose} />
      )}

      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`
          fixed top-0 left-0 z-[60] bottom-[96px] sm:bottom-[72px]
          bg-[#170f23]/98 backdrop-blur-2xl border-r border-white/5
          flex flex-col transition-all duration-300 ease-in-out
          ${isExpanded ? "w-64 shadow-2xl shadow-black/50" : "w-[72px]"}
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Logo */}
        <div className="p-4 flex items-center gap-3 flex-shrink-0">
          <NavLink to="/" onClick={onClose} className="flex items-center gap-[10px] no-underline group min-w-0">
            <img
              src="/soundia-logo.jpg"
              alt="Soundia"
              className="w-10 h-10 sm:w-[42px] sm:h-[42px] img-crisp rounded-xl object-cover flex-shrink-0 group-hover:shadow-neon group-hover:scale-105 transition-all duration-300"
            />
            <h1
              className={`
                text-[22px] font-black tracking-widest text-white group-hover:text-neon group-hover:text-glow
                transition-all duration-300 whitespace-nowrap
                ${isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"}
              `}
            >
              SOUNDIA
            </h1>
          </NavLink>
        </div>

        {/* Main Nav */}
        <nav className="px-2 space-y-0.5">
          {mainNav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={onClose}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-semibold
                no-underline transition-all duration-200 whitespace-nowrap overflow-hidden
                ${isActive
                  ? "bg-neon/10 text-neon"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
                }
              `}
            >
              <Icon className="text-lg flex-shrink-0" />
              <span className={`transition-all duration-300 ${isExpanded ? "opacity-100" : "opacity-0 w-0"}`}>
                {label}
              </span>
            </NavLink>
          ))}
        </nav>

        {/* Divider */}
        <div className="mx-3 my-3 h-px bg-white/10" />

        {/* Personal - Fixed */}
        <div className="px-2 flex-shrink-0">
          <p className={`text-[10px] font-bold text-gray-500 uppercase tracking-widest px-3 mb-2 transition-all duration-300 whitespace-nowrap ${isExpanded ? "opacity-100" : "opacity-0"}`}>
            Cá nhân
          </p>
          {personalNav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-semibold
                no-underline transition-all duration-200 whitespace-nowrap overflow-hidden
                ${isActive
                  ? "bg-neon/10 text-neon"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
                }
              `}
            >
              <Icon className="text-lg flex-shrink-0" />
              <span className={`transition-all duration-300 ${isExpanded ? "opacity-100" : "opacity-0 w-0"}`}>
                {label}
              </span>
            </NavLink>
          ))}
        </div>

        {/* Playlists - Scrollable */}
        <div className={`px-2 flex-1 overflow-y-auto scrollbar-hide mt-4 transition-all duration-300 ${isExpanded ? "opacity-100" : "opacity-0 h-0 overflow-hidden"}`}>
          <div className="flex items-center justify-between px-3 mb-2 sticky top-0 bg-[#170f23]/98 z-10 py-1">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Playlist
            </p>
            <button
              onClick={() => {
                if (!user) {
                  navigate('/login');
                } else {
                  setShowModal(true);
                }
              }}
              className="text-gray-500 hover:text-neon transition-colors"
              title="Tạo playlist mới"
            >
              <HiPlus className="text-lg" />
            </button>
          </div>

          {playlists.length > 0 ? (
            <div className="space-y-0.5 pb-4">
              {playlists.map((pl) => (
                <NavLink
                  key={pl.id}
                  to={`/playlist/${pl.id}`}
                  onClick={onClose}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-3 py-2 rounded-lg text-[13px]
                    no-underline transition-all duration-200
                    ${isActive
                      ? "bg-white/10 text-white font-semibold"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                    }
                  `}
                >
                  <HiCollection className="text-sm flex-shrink-0 text-neon/60" />
                  <span className="truncate">{pl.name}</span>
                  <span className="text-[10px] text-gray-600 ml-auto">{pl.songs.length}</span>
                </NavLink>
              ))}
            </div>
          ) : (
            <p className="px-3 text-xs text-gray-600 italic">Chưa có playlist nào</p>
          )}
        </div>


        {/* Now Playing mini */}
        {currentSong && (
          <div className="p-3 border-t border-white/5 flex-shrink-0">
            <div className="flex items-center gap-3">
              <img
                src={currentSong.cover}
                alt={currentSong.title}
                className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
              />
              <div className={`min-w-0 flex-1 transition-all duration-300 ${isExpanded ? "opacity-100" : "opacity-0 w-0"}`}>
                <p className="text-xs font-semibold text-white truncate">{currentSong.title}</p>
                <p className="text-[10px] text-gray-500 truncate">{currentSong.artist}</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Create Playlist Modal */}
      <CreatePlaylistModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
