# Soundia Project Source Code Dump

## src/App.jsx
```jsx
import { useState } from "react";
import { PlayerProvider } from "./context/PlayerContext";
import Sidebar from "./components/Sidebar";
import PlayerBar from "./components/PlayerBar";
import Home from "./pages/Home";
import { HiMenuAlt2 } from "react-icons/hi";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <PlayerProvider>
      <div className="animated-bg min-h-screen flex">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main content */}
        <main className="flex-1 flex flex-col min-h-screen">
          {/* Top bar */}
          <header className="sticky top-0 z-20 bg-dark/80 backdrop-blur-lg border-b border-gray-dark/30 px-4 lg:px-8 py-4 flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-400 hover:text-white transition-colors"
            >
              <HiMenuAlt2 className="text-2xl" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-neon animate-pulse" />
              <span className="text-sm text-gray-400 font-medium">
                SOUNDIA Player
              </span>
            </div>
          </header>

          {/* Page content */}
          <div className="flex-1 px-4 lg:px-8 py-6 pb-32">
            <Home />
          </div>
        </main>

        {/* Player Bar */}
        <PlayerBar />
      </div>
    </PlayerProvider>
  );
}

export default App;
```

## src/index.css
```css
@import "tailwindcss/base";
@import "tailwindcss/components";
@import "tailwindcss/utilities";

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', sans-serif;
  background-color: #0f0f0f;
  color: #e0e0e0;
  overflow-x: hidden;
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: #1a1a2e;
}
::-webkit-scrollbar-thumb {
  background: #3a3a50;
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: #00ffcc;
}

/* Animated gradient background */
.animated-bg {
  background: linear-gradient(135deg, #0f0f0f 0%, #0a1628 25%, #0f0f0f 50%, #0d1f2d 75%, #0f0f0f 100%);
  background-size: 400% 400%;
  animation: gradientShift 15s ease infinite;
}

@keyframes gradientShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

/* Shimmer for skeleton */
.skeleton-shimmer {
  background: linear-gradient(90deg, #1a1a2e 25%, #2a2a3e 50%, #1a1a2e 75%);
  background-size: 200% 100%;
  animation: shimmer 2s infinite linear;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

/* Neon text glow */
.text-glow {
  text-shadow: 0 0 10px rgba(0, 255, 204, 0.6), 0 0 20px rgba(0, 255, 204, 0.3);
}

/* Range input styling */
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  border-radius: 2px;
  background: #3a3a50;
  outline: none;
  cursor: pointer;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #00ffcc;
  cursor: pointer;
  box-shadow: 0 0 8px rgba(0, 255, 204, 0.5);
  transition: transform 0.15s ease;
}

input[type="range"]::-webkit-slider-thumb:hover {
  transform: scale(1.3);
}

input[type="range"]::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #00ffcc;
  cursor: pointer;
  border: none;
  box-shadow: 0 0 8px rgba(0, 255, 204, 0.5);
}
```

## src/main.jsx
```jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

## src/components/PlayerBar.jsx
```jsx
import { usePlayer } from "../context/PlayerContext";
import ProgressBar from "./ProgressBar";
import VolumeControl from "./VolumeControl";
import {
  HiPlay,
  HiPause,
  HiBackward,
  HiForward,
} from "react-icons/hi2";
import { HiMusicNote } from "react-icons/hi";

export default function PlayerBar() {
  const { currentSong, isPlaying, togglePlay, playNext, playPrev } = usePlayer();

  return (
    <div
      className={`
        fixed bottom-0 left-0 right-0 z-30
        bg-dark-card/95 backdrop-blur-xl border-t border-gray-dark/50
        transition-all duration-500
        ${isPlaying ? "shadow-[0_-4px_30px_rgba(0,255,204,0.15)]" : ""}
      `}
    >
      <div className="max-w-screen-2xl mx-auto">
        {/* Progress bar on top of player (mobile-friendly) */}
        <div className="px-4 pt-2 lg:hidden">
          <ProgressBar />
        </div>

        <div className="flex items-center justify-between px-4 py-3 gap-4">
          {/* Song Info */}
          <div className="flex items-center gap-3 min-w-0 w-1/4">
            {currentSong ? (
              <>
                <img
                  src={currentSong.cover}
                  alt={currentSong.title}
                  className={`
                    w-12 h-12 rounded-lg object-cover flex-shrink-0
                    transition-all duration-500
                    ${isPlaying ? "shadow-neon-sm" : ""}
                  `}
                />
                <div className="min-w-0 hidden sm:block">
                  <p className="text-sm font-semibold text-white truncate">
                    {currentSong.title}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {currentSong.artist}
                  </p>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-gray-dark/50 flex items-center justify-center">
                  <HiMusicNote className="text-gray-500" />
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm text-gray-500">No track selected</p>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex flex-col items-center gap-2 flex-1 max-w-xl">
            <div className="flex items-center gap-4">
              <button
                onClick={playPrev}
                className="text-gray-400 hover:text-white transition-colors duration-200"
              >
                <HiBackward className="text-xl" />
              </button>

              <button
                onClick={togglePlay}
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center
                  transition-all duration-300
                  ${
                    currentSong
                      ? "bg-neon text-dark hover:scale-110 hover:shadow-neon"
                      : "bg-gray-dark text-gray-500 cursor-not-allowed"
                  }
                `}
                disabled={!currentSong}
              >
                {isPlaying ? (
                  <HiPause className="text-lg" />
                ) : (
                  <HiPlay className="text-lg ml-0.5" />
                )}
              </button>

              <button
                onClick={playNext}
                className="text-gray-400 hover:text-white transition-colors duration-200"
              >
                <HiForward className="text-xl" />
              </button>
            </div>

            {/* Desktop progress */}
            <div className="hidden lg:block w-full">
              <ProgressBar />
            </div>
          </div>

          {/* Volume (desktop only) */}
          <div className="hidden md:flex items-center justify-end w-1/4">
            <VolumeControl />
          </div>
        </div>
      </div>
    </div>
  );
}
```

## src/components/ProgressBar.jsx
```jsx
import { usePlayer } from "../context/PlayerContext";

function formatTime(seconds) {
  if (isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function ProgressBar() {
  const { currentTime, duration, seekTo } = usePlayer();
  const progress = duration ? (currentTime / duration) * 100 : 0;

  const handleSeek = (e) => {
    const value = parseFloat(e.target.value);
    seekTo(value);
  };

  return (
    <div className="flex items-center gap-3 w-full">
      <span className="text-xs text-gray-500 font-mono w-10 text-right">
        {formatTime(currentTime)}
      </span>
      <div className="relative flex-1 h-1 group">
        <div className="absolute inset-0 bg-gray-dark rounded-full" />
        <div
          className="absolute top-0 left-0 h-full bg-neon rounded-full transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
        <div
          className="absolute top-0 left-0 h-full bg-neon/30 rounded-full blur-sm"
          style={{ width: `${progress}%` }}
        />
        <input
          type="range"
          min="0"
          max={duration || 0}
          step="0.1"
          value={currentTime}
          onChange={handleSeek}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
      </div>
      <span className="text-xs text-gray-500 font-mono w-10">
        {formatTime(duration)}
      </span>
    </div>
  );
}
```

## src/components/Sidebar.jsx
```jsx
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
```

## src/components/SkeletonLoader.jsx
```jsx
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
```

## src/components/SongItem.jsx
```jsx
import { usePlayer } from "../context/PlayerContext";
import { HiPlay, HiPause } from "react-icons/hi2";
import { HiMusicNote } from "react-icons/hi";

export default function SongItem({ song, index }) {
  const { currentSong, isPlaying, playSong } = usePlayer();
  const isActive = currentSong?.id === song.id;

  return (
    <button
      onClick={() => playSong(song)}
      className={`
        w-full flex items-center gap-4 p-3 rounded-xl
        transition-all duration-300 ease-out group text-left
        ${
          isActive
            ? "bg-neon/10 border border-neon/30 shadow-neon-sm"
            : "bg-dark-card/60 border border-transparent hover:bg-dark-card hover:border-gray-dark/50 hover:shadow-neon-sm"
        }
      `}
    >
      {/* Index / Play icon */}
      <div
        className={`
          w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
          transition-all duration-300
          ${isActive ? "bg-neon/20" : "bg-gray-dark/50 group-hover:bg-neon/10"}
        `}
      >
        {isActive && isPlaying ? (
          <div className="flex items-center gap-0.5">
            <span className="w-0.5 h-3 bg-neon rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-0.5 h-4 bg-neon rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-0.5 h-2 bg-neon rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        ) : isActive ? (
          <HiPause className="text-neon text-lg" />
        ) : (
          <span className="text-gray-500 text-sm font-medium group-hover:hidden">
            {String(index + 1).padStart(2, "0")}
          </span>
        )}
        {!isActive && (
          <HiPlay className="text-neon text-lg hidden group-hover:block" />
        )}
      </div>

      {/* Cover */}
      <img
        src={song.cover}
        alt={song.title}
        className={`
          w-12 h-12 rounded-lg object-cover flex-shrink-0
          transition-all duration-300
          ${isActive ? "shadow-neon-sm" : "group-hover:shadow-neon-sm"}
        `}
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p
          className={`
            text-sm font-semibold truncate transition-colors duration-300
            ${isActive ? "text-neon" : "text-white group-hover:text-neon"}
          `}
        >
          {song.title}
        </p>
        <p className="text-xs text-gray-500 truncate">{song.artist}</p>
      </div>

      {/* Duration */}
      <span className="text-xs text-gray-500 font-mono flex-shrink-0">
        {song.duration}
      </span>
    </button>
  );
}
```

## src/components/SongList.jsx
```jsx
import { useState, useEffect } from "react";
import { usePlayer } from "../context/PlayerContext";
import SongItem from "./SongItem";
import SkeletonLoader from "./SkeletonLoader";

export default function SongList() {
  const { songList } = usePlayer();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Trending Now</h2>
          <p className="text-sm text-gray-500 mt-1">
            {songList.length} tracks available
          </p>
        </div>
      </div>

      {loading ? (
        <SkeletonLoader />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
          {songList.map((song, index) => (
            <SongItem key={song.id} song={song} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}
```

## src/components/VolumeControl.jsx
```jsx
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
```

## src/context/PlayerContext.jsx
```jsx
import { createContext, useContext, useState, useRef, useEffect } from "react";
import songs from "../data/songs";

const PlayerContext = createContext();

export function PlayerProvider({ children }) {
  const [songList] = useState(songs);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const audioRef = useRef(new Audio());

  useEffect(() => {
    const audio = audioRef.current;
    audio.volume = volume;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => playNext();

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [currentSong]);

  const playSong = (song) => {
    const audio = audioRef.current;
    if (currentSong?.id === song.id) {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        audio.play();
        setIsPlaying(true);
      }
      return;
    }
    setCurrentSong(song);
    audio.src = song.audio;
    audio.load();
    audio.play().then(() => setIsPlaying(true)).catch(() => {});
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!currentSong) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const playNext = () => {
    if (!currentSong) return;
    const idx = songList.findIndex((s) => s.id === currentSong.id);
    const next = songList[(idx + 1) % songList.length];
    playSong(next);
  };

  const playPrev = () => {
    if (!currentSong) return;
    const idx = songList.findIndex((s) => s.id === currentSong.id);
    const prev = songList[(idx - 1 + songList.length) % songList.length];
    playSong(prev);
  };

  const seekTo = (time) => {
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const changeVolume = (vol) => {
    audioRef.current.volume = vol;
    setVolume(vol);
  };

  return (
    <PlayerContext.Provider
      value={{
        songList,
        currentSong,
        isPlaying,
        currentTime,
        duration,
        volume,
        playSong,
        togglePlay,
        playNext,
        playPrev,
        seekTo,
        changeVolume,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) throw new Error("usePlayer must be used within PlayerProvider");
  return context;
}
```

## src/data/songs.js
```js
const songs = [
  {
    id: 1,
    title: "Midnight Pulse",
    artist: "NeonWave",
    duration: "3:42",
    cover: "https://picsum.photos/seed/song1/300/300",
    audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  },
  {
    id: 2,
    title: "Electric Dreams",
    artist: "SynthCity",
    duration: "4:15",
    cover: "https://picsum.photos/seed/song2/300/300",
    audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
  },
  {
    id: 3,
    title: "Cyber Horizon",
    artist: "Digital Aura",
    duration: "3:58",
    cover: "https://picsum.photos/seed/song3/300/300",
    audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
  },
  {
    id: 4,
    title: "Neon Lights",
    artist: "Futura",
    duration: "4:32",
    cover: "https://picsum.photos/seed/song4/300/300",
    audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
  },
  {
    id: 5,
    title: "Starfall",
    artist: "Cosmos",
    duration: "3:21",
    cover: "https://picsum.photos/seed/song5/300/300",
    audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
  },
  {
    id: 6,
    title: "Retrograde",
    artist: "Velocity",
    duration: "5:07",
    cover: "https://picsum.photos/seed/song6/300/300",
    audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
  },
  {
    id: 7,
    title: "Binary Sunset",
    artist: "CodeBreaker",
    duration: "4:44",
    cover: "https://picsum.photos/seed/song7/300/300",
    audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
  },
  {
    id: 8,
    title: "Quantum Beat",
    artist: "Particle",
    duration: "3:33",
    cover: "https://picsum.photos/seed/song8/300/300",
    audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
  },
  {
    id: 9,
    title: "Void Walker",
    artist: "DarkMatter",
    duration: "4:19",
    cover: "https://picsum.photos/seed/song9/300/300",
    audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3",
  },
  {
    id: 10,
    title: "Aurora",
    artist: "Skyline",
    duration: "3:56",
    cover: "https://picsum.photos/seed/song10/300/300",
    audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3",
  },
  {
    id: 11,
    title: "Midnight Pulse",
    artist: "NeonWave",
    duration: "3:42",
    cover: "https://picsum.photos/seed/song1/300/300",
    audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  },
  {
    id: 12,
    title: "Electric Dreams",
    artist: "SynthCity",
    duration: "4:15",
    cover: "https://picsum.photos/seed/song2/300/300",
    audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
  },
  {
    id: 13,
    title: "Cyber Horizon",
    artist: "Digital Aura",
    duration: "3:58",
    cover: "https://picsum.photos/seed/song3/300/300",
    audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
  },
  {
    id: 14,
    title: "Neon Lights",
    artist: "Futura",
    duration: "4:32",
    cover: "https://picsum.photos/seed/song4/300/300",
    audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
  },
  {
    id: 15,
    title: "Starfall",
    artist: "Cosmos",
    duration: "3:21",
    cover: "https://picsum.photos/seed/song5/300/300",
    audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
  },
  {
    id: 16,
    title: "Retrograde",
    artist: "Velocity",
    duration: "5:07",
    cover: "https://picsum.photos/seed/song6/300/300",
    audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
  },
  {
    id: 17,
    title: "Binary Sunset",
    artist: "CodeBreaker",
    duration: "4:44",
    cover: "https://picsum.photos/seed/song7/300/300",
    audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
  },
  {
    id: 18,
    title: "Quantum Beat",
    artist: "Particle",
    duration: "3:33",
    cover: "https://picsum.photos/seed/song8/300/300",
    audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
  },
  {
    id: 19,
    title: "Void Walker",
    artist: "DarkMatter",
    duration: "4:19",
    cover: "https://picsum.photos/seed/song9/300/300",
    audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3",
  },
  {
    id: 20,
    title: "Aurora",
    artist: "Skyline",
    duration: "3:56",
    cover: "https://picsum.photos/seed/song10/300/300",
    audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3",
  },  
  {
    id: 21,
    title: "Lướt Qua Tim Anh",
    artist: "Suno",
    duration: "2:29",
    cover: "https://picsum.photos/seed/song3/300/300",
    audio: "LƯỚT QUA TIM ANH.mp3",
  },
];

export default songs;
```

## src/pages/Home.jsx
```jsx
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
```

## src/App.css
```css
#root {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.react:hover {
  filter: drop-shadow(0 0 2em #61dafbaa);
}

@keyframes logo-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: no-preference) {
  a:nth-of-type(2) .logo {
    animation: logo-spin infinite 20s linear;
  }
}

.card {
  padding: 2em;
}

.read-the-docs {
  color: #888;
}
```
