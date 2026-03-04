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