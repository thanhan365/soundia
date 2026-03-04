import { useState } from "react";
import { NavLink } from "react-router-dom";
import { usePlayer } from "../context/PlayerContext";
import {
  HiHome, HiHeart, HiClock,
  HiCollection, HiPlus,
  HiSparkles, HiViewGrid,
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
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full w-64 z-50
          bg-[#170f23]/95 backdrop-blur-xl border-r border-white/5
          flex flex-col transition-transform duration-300
          lg:translate-x-0 lg:static lg:z-auto
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo */}
        <div className="p-5 pb-3">
          <NavLink to="/" onClick={onClose} className="flex items-center gap-3 no-underline group">
            <img
              src="/soundia-logo.jpg"
              alt="Soundia"
              className="w-10 h-10 rounded-xl object-cover group-hover:shadow-neon group-hover:scale-105 transition-all duration-300"
            />
            <h1 className="text-xl font-extrabold tracking-wider text-white group-hover:text-neon transition-colors duration-300">
              SOUNDIA
            </h1>
          </NavLink>
        </div>

        {/* Main Nav */}
        <nav className="px-3 space-y-0.5">
          {mainNav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={onClose}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-semibold
                no-underline transition-all duration-200
                ${isActive
                  ? "bg-white/10 text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
                }
              `}
            >
              <Icon className="text-lg flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Divider */}
        <div className="mx-4 my-3 h-px bg-white/10" />

        {/* Personal */}
        <div className="px-3 flex-1 overflow-y-auto">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest px-3 mb-2">
            Cá nhân
          </p>
          {personalNav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-semibold
                no-underline transition-all duration-200
                ${isActive
                  ? "bg-white/10 text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
                }
              `}
            >
              <Icon className="text-lg flex-shrink-0" />
              {label}
            </NavLink>
          ))}

          {/* Playlists section */}
          <div className="mt-4">
            <div className="flex items-center justify-between px-3 mb-2">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                Playlist
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="text-gray-500 hover:text-neon transition-colors"
                title="Tạo playlist mới"
              >
                <HiPlus className="text-lg" />
              </button>
            </div>

            {playlists.length > 0 ? (
              <div className="space-y-0.5">
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
        </div>

        {/* Now Playing mini */}
        {currentSong && (
          <div className="p-4 border-t border-white/5">
            <div className="flex items-center gap-3">
              <img
                src={currentSong.cover}
                alt={currentSong.title}
                className="w-10 h-10 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
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
