import { useState, useCallback } from "react";
import { usePlayer } from "../context/PlayerContext";
import { HiX, HiSwitchVertical } from "react-icons/hi";
import { HiPlay } from "react-icons/hi2";
import { HiQueueList } from "react-icons/hi2";

export default function QueuePanel() {
  const { queueOpen, setQueueOpen, getQueue, currentSong, isPlaying, playSong, manualQueue, autoQueue, reorderAutoQueue, removeFromAutoQueue, setManualQueue, setAutoQueue } = usePlayer();
  const queue = getQueue();
  const autoSongs = queue.filter((_, i) => i >= manualQueue.length);

  // Play song from manual queue — remove it from queue first
  const playFromManualQueue = (song, index) => {
    setManualQueue(q => q.filter((_, i) => i !== index));
    playSong(song);
  };

  // Play song from auto queue — remove it from queue first
  const playFromAutoQueue = (song, index) => {
    // Remove all songs before this one (consume in order) + the song itself
    setAutoQueue(prev => {
      const filtered = prev.filter(s => s.id !== currentSong?.id);
      return filtered.filter((_, i) => i !== index);
    });
    playSong(song);
  };

  // Drag state - auto queue
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  // Drag state - manual queue
  const [mqDragIdx, setMqDragIdx] = useState(null);
  const [mqDragOverIdx, setMqDragOverIdx] = useState(null);

  const onDragStart = useCallback((e, i) => {
    setDragIdx(i);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", i);
  }, []);

  const onDragOver = useCallback((e, i) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIdx(i);
  }, []);

  const onDrop = useCallback((e, dropI) => {
    e.preventDefault();
    if (dragIdx !== null && dragIdx !== dropI) {
      reorderAutoQueue(dragIdx, dropI);
    }
    setDragIdx(null);
    setDragOverIdx(null);
  }, [dragIdx, reorderAutoQueue]);

  const onDragEnd = useCallback(() => {
    setDragIdx(null);
    setDragOverIdx(null);
  }, []);

  return (
    <>
      {queueOpen && <div className="fixed inset-0 bg-black/40 z-[55] lg:hidden" onClick={() => setQueueOpen(false)} />}

      <aside
        className={`
          fixed top-0 right-0 h-full w-64 sm:w-80 z-[60]
          bg-[#170f23]/95 sm:backdrop-blur-xl border-l border-white/5
          flex flex-col transition-transform duration-300
          ${queueOpen ? "translate-x-0" : "translate-x-full"}
        `}
      >
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <HiQueueList className="text-neon text-sm sm:text-base" />
            <h2 className="text-sm sm:text-base font-bold text-white">Danh sách phát</h2>
          </div>
          <button onClick={() => setQueueOpen(false)} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 active:bg-white/30 transition-colors">
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

        {/* Scrollable queue content */}
        <div className="flex-1 overflow-y-auto pb-28">
        {/* Manual queue — with drag reorder + remove */}
        {manualQueue.length > 0 && (() => {
          const onMqDragStart = (e, i) => { setMqDragIdx(i); e.dataTransfer.effectAllowed = "move"; };
          const onMqDragOver = (e, i) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setMqDragOverIdx(i); };
          const onMqDrop = (e, dropI) => {
            e.preventDefault();
            if (mqDragIdx !== null && mqDragIdx !== dropI) {
              setManualQueue(q => { const n = [...q]; const [item] = n.splice(mqDragIdx, 1); n.splice(dropI, 0, item); return n; });
            }
            setMqDragIdx(null); setMqDragOverIdx(null);
          };
          const onMqDragEnd = () => { setMqDragIdx(null); setMqDragOverIdx(null); };
          return (
            <div className="border-b border-white/5">
              <p className="px-3 sm:px-4 pt-2 sm:pt-3 pb-1 text-[9px] sm:text-[10px] font-bold text-neon/70 uppercase tracking-widest">
                Hàng đợi ({manualQueue.length})
              </p>
              <div className="px-2 pb-2">
                {manualQueue.map((song, i) => (
                  <div
                    key={`mq-${song.id}-${i}`}
                    draggable
                    onDragStart={(e) => onMqDragStart(e, i)}
                    onDragOver={(e) => onMqDragOver(e, i)}
                    onDrop={(e) => onMqDrop(e, i)}
                    onDragEnd={onMqDragEnd}
                    className={`transition-all duration-150 rounded-lg ${mqDragIdx === i ? "opacity-40 scale-95" : ""} ${mqDragOverIdx === i && mqDragIdx !== i ? "border-t-2 border-neon/50" : "border-t-2 border-transparent"}`}
                  >
                    <QueueItem song={song} index={i + 1} onClick={() => playFromManualQueue(song, i)} onRemove={() => setManualQueue(q => q.filter((_, j) => j !== i))} draggable />
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Auto queue - draggable */}
        <div>
          <p className="px-3 sm:px-4 pt-2 sm:pt-3 pb-1 text-[9px] sm:text-[10px] font-bold text-gray-500 uppercase tracking-widest">
            {manualQueue.length > 0 ? "Tiếp theo" : "Gợi ý cho bạn"} ({autoSongs.length})
          </p>
          <div className="px-2">
            {autoSongs.map((song, i) => (
              <div
                key={`q-${song.id}-${i}`}
                draggable
                onDragStart={(e) => onDragStart(e, i)}
                onDragOver={(e) => onDragOver(e, i)}
                onDrop={(e) => onDrop(e, i)}
                onDragEnd={onDragEnd}
                className={`
                  transition-all duration-150 rounded-lg
                  ${dragIdx === i ? "opacity-40 scale-95" : ""}
                  ${dragOverIdx === i && dragIdx !== i ? "border-t-2 border-neon/50" : "border-t-2 border-transparent"}
                `}
              >
                <QueueItem
                  song={song}
                  index={i + 1}
                  onClick={() => playFromAutoQueue(song, i)}
                  onRemove={() => removeFromAutoQueue(i)}
                  draggable
                />
              </div>
            ))}
          </div>
        </div>
        </div>
      </aside>
    </>
  );
}

function QueueItem({ song, index, onClick, onRemove, draggable }) {
  return (
    <div className="w-full flex items-center gap-2 px-1.5 sm:px-2 py-1.5 rounded-lg text-left hover:bg-white/5 group transition-colors">
      {/* Drag handle */}
      {draggable && (
        <span className="cursor-grab active:cursor-grabbing p-1 text-gray-600 hover:text-white flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" title="Kéo để sắp xếp">
          <HiSwitchVertical className="text-sm" />
        </span>
      )}
      <span className="text-[9px] sm:text-[10px] text-gray-600 font-mono w-3 sm:w-4 text-right flex-shrink-0">{index}</span>
      <img src={song.cover} alt={song.title} className="w-7 h-7 sm:w-8 sm:h-8 rounded-md object-cover flex-shrink-0" />
      <button onClick={onClick} className="min-w-0 flex-1 pl-0.5 text-left">
        <p className="text-[11px] sm:text-xs text-gray-300 truncate group-hover:text-white leading-tight">{song.title}</p>
        <p className="text-[9px] sm:text-[10px] text-gray-600 truncate leading-tight">{song.artist}</p>
      </button>
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <HiPlay onClick={onClick} className="text-neon text-[10px] sm:text-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" />
        {onRemove && (
          <HiX onClick={(e) => { e.stopPropagation(); onRemove(); }} className="text-gray-600 hover:text-red-400 text-[10px] sm:text-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" />
        )}
      </div>
    </div>
  );
}
