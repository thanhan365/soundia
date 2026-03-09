import { useState } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { PlayerProvider, usePlayer } from "./context/PlayerContext";
import { ToastProvider } from "./context/ToastContext";
import Sidebar from "./components/Sidebar";
import PlayerBar from "./components/PlayerBar";
import QueuePanel from "./components/QueuePanel";
import LyricsView from "./components/LyricsView";
import SearchBar from "./components/SearchBar";
import YouTubeAudioPlayer from "./components/YouTubeAudioPlayer";
import Home from "./pages/Home";
import SearchPage from "./pages/SearchPage";
import FavoritesPage from "./pages/FavoritesPage";
import RecentPage from "./pages/RecentPage";
import LibraryPage from "./pages/LibraryPage";
import NewMusicPage from "./pages/NewMusicPage";
import GenresPage from "./pages/GenresPage";
import PlaylistPage from "./pages/PlaylistPage";
import ArtistDetail from "./pages/ArtistDetail";
import ExternalPlaylistPage from "./pages/ExternalPlaylistPage";
import ProfilePage from "./pages/ProfilePage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { AuthProvider } from "./context/AuthContext";
import { HiMenuAlt2, HiArrowLeft } from "react-icons/hi";

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const {
    queueOpen,
    ytPlayerRef,
    handleYTReady, handleYTStateChange, handleYTTimeUpdate, handleYTError,
  } = usePlayer();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="animated-bg h-[100dvh] w-full max-w-[100vw] overflow-hidden flex">
      {/* YouTube IFrame Player ẩn – dùng cho Deezer songs */}
      <YouTubeAudioPlayer
        ref={ytPlayerRef}
        onReady={handleYTReady}
        onStateChange={handleYTStateChange}
        onTimeUpdate={handleYTTimeUpdate}
        onError={handleYTError}
      />

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className={`flex-1 flex flex-col h-full transition-all duration-300 lg:pl-[68px] ${queueOpen ? "lg:mr-80" : ""}`}>
        {/* Header */}
        <header className="flex-shrink-0 sticky top-0 z-50 bg-[#170f23]/80 backdrop-blur-xl border-b border-white/5 px-2 sm:px-4 lg:px-8 py-2 sm:py-3 flex items-center gap-2 sm:gap-4 shadow-md">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-400 hover:text-neon transition-colors text-lg sm:text-xl"
            title="Quay lại"
          >
            <HiArrowLeft />
          </button>
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-400 hover:text-white transition-colors text-lg sm:text-xl"
          >
            <HiMenuAlt2 />
          </button>
          <div className="flex-1">
            <SearchBar />
          </div>
        </header>

        {/* Pages */}
        <div className="flex-1 px-2 sm:px-4 lg:px-8 py-4 sm:py-6 pb-32 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/recent" element={<RecentPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/new-music" element={<NewMusicPage />} />
            <Route path="/genres" element={<GenresPage />} />
            <Route path="/playlist/:id" element={<PlaylistPage />} />
            <Route path="/artist-detail/:id" element={<ArtistDetail />} />
            <Route path="/playlist-detail/:id" element={<ExternalPlaylistPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Routes>
        </div>
      </main>

      <QueuePanel />
      <LyricsView />
      <PlayerBar />
    </div>
  );
}


export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <PlayerProvider>
          <AppContent />
        </PlayerProvider>
      </ToastProvider>
    </AuthProvider>
  );
}