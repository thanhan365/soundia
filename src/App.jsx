import { useState, useRef, useEffect, useCallback } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { PlayerProvider, usePlayer } from "./context/PlayerContext";
import { ToastProvider } from "./context/ToastContext";
import Sidebar from "./components/Sidebar";
import PlayerBar from "./components/PlayerBar";
import QueuePanel from "./components/QueuePanel";
import LyricsView from "./components/LyricsView";
import SearchBar from "./components/SearchBar";
import YouTubeAudioPlayer from "./components/YouTubeAudioPlayer";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AuthProvider } from "./context/AuthContext";
import { HiMenuAlt2, HiArrowLeft } from "react-icons/hi";
import React, { Suspense } from "react";

// Lazy-loaded pages (Phase 2: Code Splitting)
const Home = React.lazy(() => import("./pages/Home"));
const SearchPage = React.lazy(() => import("./pages/SearchPage"));
const FavoritesPage = React.lazy(() => import("./pages/FavoritesPage"));
const RecentPage = React.lazy(() => import("./pages/RecentPage"));
const LibraryPage = React.lazy(() => import("./pages/LibraryPage"));
const NewMusicPage = React.lazy(() => import("./pages/NewMusicPage"));
const GenresPage = React.lazy(() => import("./pages/GenresPage"));
const PlaylistPage = React.lazy(() => import("./pages/PlaylistPage"));
const ArtistDetail = React.lazy(() => import("./pages/ArtistDetail"));
const ExternalPlaylistPage = React.lazy(() => import("./pages/ExternalPlaylistPage"));
const ProfilePage = React.lazy(() => import("./pages/ProfilePage"));
const AllArtists = React.lazy(() => import("./pages/AllArtists"));
const SuggestedPlaylistDetail = React.lazy(() => import("./pages/SuggestedPlaylistDetail"));
const Login = React.lazy(() => import("./pages/Login"));
const Register = React.lazy(() => import("./pages/Register"));
const AdminPage = React.lazy(() => import("./pages/AdminPage"));
const SetupAdmin = React.lazy(() => import("./pages/SetupAdmin"));
const NotFound = React.lazy(() => import("./pages/NotFound"));

// Loading fallback
function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        <p className="text-gray-400 text-sm animate-pulse">Đang tải...</p>
      </div>
    </div>
  );
}

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const {
    queueOpen,
    ytPlayerRef,
    handleYTReady, handleYTStateChange, handleYTTimeUpdate, handleYTError,
  } = usePlayer();
  const navigate = useNavigate();
  const location = useLocation();

  // ── Keyboard Shortcuts (Phase 3: #10) ──────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          document.querySelector('[data-player-play-btn]')?.click();
          break;
        case 'ArrowRight':
          if (e.shiftKey) document.querySelector('[data-player-next-btn]')?.click();
          break;
        case 'ArrowLeft':
          if (e.shiftKey) document.querySelector('[data-player-prev-btn]')?.click();
          break;
        case 'KeyN':
          if (!e.ctrlKey && !e.metaKey) document.querySelector('[data-player-next-btn]')?.click();
          break;
        case 'KeyP':
          if (!e.ctrlKey && !e.metaKey) document.querySelector('[data-player-prev-btn]')?.click();
          break;
        case 'KeyM':
          if (!e.ctrlKey && !e.metaKey) document.querySelector('[data-player-mute-btn]')?.click();
          break;
        case 'KeyL':
          if (!e.ctrlKey && !e.metaKey) document.querySelector('[data-player-lyrics-btn]')?.click();
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
        <header className="flex-shrink-0 sticky top-0 z-50 bg-[#170f23]/80 backdrop-blur-xl border-b border-white/5 px-3 sm:px-4 lg:px-6 xl:px-8 py-2 sm:py-3 flex items-center gap-2 sm:gap-4 shadow-md">
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
        <div className="flex-1 px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 pb-32 overflow-y-auto">
          <Suspense fallback={<PageLoader />}>
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
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/admin/setup" element={<SetupAdmin />} />
              <Route path="/artists" element={<AllArtists />} />
              <Route path="/suggested-playlist" element={<SuggestedPlaylistDetail />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
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
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <PlayerProvider>
            <AppContent />
          </PlayerProvider>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}