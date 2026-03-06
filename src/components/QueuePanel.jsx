import { usePlayer } from "../context/PlayerContext";
import { HiX } from "react-icons/hi";
import { HiPlay } from "react-icons/hi2";
import { HiQueueList } from "react-icons/hi2";

export default function QueuePanel() {
  const { queueOpen, setQueueOpen, getQueue, currentSong, isPlaying, playSong, manualQueue } = usePlayer();
  const queue = getQueue();

  return (
    <>
      {queueOpen && <div className="fixed inset-0 bg-black/40 z-35 lg:hidden" onClick={() => setQueueOpen(false)} />}

      <aside
        className={`
          fixed top-0 right-0 h-full w-64 sm:w-80 z-40
          bg-[#170f23]/95 backdrop-blur-xl border-l border-white/5
          flex flex-col transition-transform duration-300
          ${queueOpen ? "translate-x-0" : "translate-x-full"}
        `}
      >
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <HiQueueList className="text-neon text-sm sm:text-base" />
            <h2 className="text-sm sm:text-base font-bold text-white">Danh sách phát</h2>
          </div>
          <button onClick={() => setQueueOpen(false)} className="text-gray-500 hover:text-white transition-colors p-1">
            <HiX className="text-lg" />
          </button>
        </div>

        {currentSong && (
          <div className="px-3 sm:px-4 py-2 sm:py-3 bg-neon/5 border-b border-white/5">
            <p className="text-[9px] sm:text-[10px] font-bold text-neon uppercase tracking-widest mb-1.5 sm:mb-2">Đang phát</p>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden flex-shrink-0 border border-neon/20 ${isPlaying ? "animate-spin-slow" : ""}`}>
                <img src={currentSong.cover} alt={currentSong.title} className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-semibold text-neon truncate">{currentSong.title}</p>
                <p className="text-[10px] sm:text-xs text-gray-500 truncate">{currentSong.artist}</p>
              </div>
            </div>
          </div>
        )}

        {/* Manual queue */}
        {manualQueue.length > 0 && (
          <div className="border-b border-white/5">
            <p className="px-3 sm:px-4 pt-2 sm:pt-3 pb-1 text-[9px] sm:text-[10px] font-bold text-neon/70 uppercase tracking-widest">
              Hàng đợi ({manualQueue.length})
            </p>
            <div className="px-2 pb-2">
              {manualQueue.map((song, i) => (
                <QueueItem key={`mq-${song.id}-${i}`} song={song} index={i + 1} onClick={() => playSong(song)} />
              ))}
            </div>
          </div>
        )}

        {/* Auto queue */}
        <div className="flex-1 overflow-y-auto pb-28">
          <p className="px-3 sm:px-4 pt-2 sm:pt-3 pb-1 text-[9px] sm:text-[10px] font-bold text-gray-500 uppercase tracking-widest">
            Tiếp theo ({queue.length - manualQueue.length})
          </p>
          <div className="px-2">
            {queue.filter((_, i) => i >= manualQueue.length).map((song, i) => (
              <QueueItem key={`q-${song.id}-${i}`} song={song} index={i + 1} onClick={() => playSong(song)} />
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}

function QueueItem({ song, index, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-1.5 sm:px-2 py-1.5 rounded-lg text-left hover:bg-white/5 group transition-colors"
    >
      <span className="text-[9px] sm:text-[10px] text-gray-600 font-mono w-3 sm:w-4 text-right flex-shrink-0">{index}</span>
      <img src={song.cover} alt={song.title} className="w-7 h-7 sm:w-8 sm:h-8 rounded-md object-cover flex-shrink-0" />
      <div className="min-w-0 flex-1 pl-0.5">
        <p className="text-[11px] sm:text-xs text-gray-300 truncate group-hover:text-white leading-tight">{song.title}</p>
        <p className="text-[9px] sm:text-[10px] text-gray-600 truncate leading-tight">{song.artist}</p>
      </div>
      <HiPlay className="text-neon text-[10px] sm:text-xs opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </button>
  );
}
