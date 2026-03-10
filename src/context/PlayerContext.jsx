
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { AuthContext } from "./AuthContext";
import { useToast } from "./ToastContext";
import api from "../utils/api";
import { getNctStreamUrl, resolveNctStream } from "../services/nctService";

// Custom hooks
import { usePlayback } from "../hooks/usePlayback";
import { useFavorites } from "../hooks/useFavorites";
import { useQueue } from "../hooks/useQueue";
import { usePlaylistManager } from "../hooks/usePlaylistManager";
import { useSearchManager } from "../hooks/useSearchManager";

const PlayerContext = createContext();

export function PlayerProvider({ children }) {
  const { user } = useContext(AuthContext);
  const { showToast } = useToast();

  // ── Songs Data ─────────────────────────────────────────────────────────────
  const [allSongs, setAllSongs] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/songs");
        const songs = res.data.map((s) => ({ ...s, audio: s.audioUrl, cover: s.coverUrl }));
        setAllSongs(songs);
      } catch (e) { console.error("Failed to fetch songs", e); }
    };
    load();
  }, []);

  // ── Compose Hooks ──────────────────────────────────────────────────────────
  const playback = usePlayback({ showToast });
  const {
    currentSong, setCurrentSong, isPlaying, setIsPlaying,
    currentTime, setCurrentTime, duration, setDuration,
    volume, error, setError, shuffle, repeatMode,
    isLoadingStream, setIsLoadingStream, isYTMode, setIsYTMode,
    recentHistory,
    audioRef, ytPlayerRef, isYTModeRef, currentSongRef, playSongRef, playNextRef,
    addToRecent, handleAudioError,
    handleYTReady, handleYTStateChange, handleYTTimeUpdate, handleYTError,
    togglePlay, seekTo, changeVolume, toggleShuffle, toggleRepeat,
  } = playback;

  const { favorites, toggleFavorite, isFavorite } = useFavorites({ user, showToast, allSongs, setAllSongs });

  const queue = useQueue({ currentSong, allSongs });
  const { manualQueue, setManualQueue, autoQueue, setAutoQueue, autoQueueLoadedRef, fetchAutoQueue, addToQueue, getQueue } = queue;

  const { playlists, createPlaylist, deletePlaylist, addSongToPlaylist, removeSongFromPlaylist, renamePlaylist, reorderPlaylistSongs, setPlaylistCover } = usePlaylistManager({ user, allSongs, setAllSongs });

  const search = useSearchManager({ allSongs });
  const { searchQuery, setSearchQuery, filteredSongs, searchArtistsResult, searchPlaylistsResult, searchHistory, addSearchHistory, clearSearchHistory } = search;

  // ── UI State ───────────────────────────────────────────────────────────────
  const [queueOpen, setQueueOpen] = useState(false);
  const [lyricsOpen, setLyricsOpen] = useState(false);

  // ── Auto-populate queue ────────────────────────────────────────────────────
  useEffect(() => {
    if (allSongs.length > 0 && autoQueue.length === 0 && !autoQueueLoadedRef.current) {
      fetchAutoQueue();
    }
  }, [allSongs.length, autoQueue.length, fetchAutoQueue]); // eslint-disable-line

  // ── playSong (needs access to all hooks) ───────────────────────────────────
  const playSong = async (song, forceReload = false) => {
    const audio = audioRef.current;

    if (!forceReload && currentSong?.id === song.id) {
      if (isYTMode) {
        if (isPlaying) { ytPlayerRef.current?.pause(); setIsPlaying(false); }
        else { ytPlayerRef.current?.play(); setIsPlaying(true); }
      } else {
        if (isPlaying) { audio.pause(); }
        else { setIsPlaying(true); audio.play().catch(() => handleAudioError()); }
      }
      return;
    }

    if (song.source === 'spotify' && !song.audio) song.audio = "YT_STREAM";

    // Detect iTunes preview URL (chỉ 30s) — cần resolve full stream từ NCT
    const isItunesPreview = song.source === 'itunes' && song.audio &&
      (song.audio.includes('audio.itunes.apple.com') || song.audio.includes('audio-ssl.itunes.apple.com'));

    // NCT stream resolution — resolve khi chưa có audio, hoặc khi là iTunes preview 30s
    if (!song.audio || song.audio === 'YT_STREAM' || isItunesPreview) {
      try {
        let streamUrl = null;
        if (song.nctKey) streamUrl = await getNctStreamUrl(song.nctKey);
        if (!streamUrl && song.title) streamUrl = await resolveNctStream(song.title, song.artist);
        if (streamUrl) song.audio = streamUrl;
        else if (isItunesPreview) song.audio = "YT_STREAM"; // Fallback YT thay vì preview 30s
      } catch (err) {
        console.log(`[3-in-1] NCT resolve failed:`, err.message);
        if (isItunesPreview) song.audio = "YT_STREAM"; // Fallback YT
      }
    }

    const hasDirectUrl = song.audio && song.audio !== "YT_STREAM" && (song.audio.startsWith("http") || song.audio.startsWith("/api/"));
    const needsYT = !hasDirectUrl && (!song.audio || song.audio === "YT_STREAM");

    const parseDurationStr = (str) => {
      if (typeof str === 'number') return str;
      if (!str || typeof str !== 'string') return 0;
      const parts = str.split(':');
      if (parts.length === 2) return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      return 0;
    };

    if (needsYT) {
      setIsYTMode(true);
      isYTModeRef.current = true;
      audio.pause();
      audio.src = "";
      setCurrentSong(song);
      addToRecent(song);
      setIsPlaying(true);
      setIsLoadingStream(true);
      setCurrentTime(0);
      if (song.duration) setDuration(parseDurationStr(song.duration));
      else setDuration(0);
      const query = `${song.artist} - ${song.title} official audio`;
      ytPlayerRef.current?.loadAndPlay(query);
    } else {
      if (isYTMode) {
        ytPlayerRef.current?.pause();
        setIsYTMode(false);
        isYTModeRef.current = false;
      }
      try {
        setCurrentSong(song);
        addToRecent(song);
        setIsPlaying(true);
        setCurrentTime(0);
        setDuration(0);
        // Clear hoàn toàn audio cũ — xóa duration/time bài trước
        audio.pause();
        audio.removeAttribute('src');
        audio.load(); // force clear internal state
        // Set src bài mới và phát ngay
        const backendBase = (import.meta.env.VITE_API_URL || 'http://localhost:5066/api').replace('/api', '');
        const audioUrl = song.audio.startsWith('/api/') ? `${backendBase}${song.audio}` : song.audio;
        audio.src = audioUrl;
        audio.preload = 'auto';
        // Phát ngay — trình duyệt tự buffer và phát khi sẵn sàng
        audio.play().catch(() => { });
      } catch (err) {
        console.warn("[3-in-1] HTML5 Audio failed, falling back to YouTube:", err.message);
        setIsYTMode(true);
        isYTModeRef.current = true;
        audio.pause();
        audio.src = "";
        setIsPlaying(true);
        setIsLoadingStream(true);
        setCurrentTime(0);
        const query = `${song.artist} - ${song.title} official audio`;
        ytPlayerRef.current?.loadAndPlay(query);
      }
    }
  };

  useEffect(() => { playSongRef.current = playSong; }, [playSong]); // eslint-disable-line

  // ── playNext / playPrev ────────────────────────────────────────────────────
  const playNext = useCallback(() => {
    if (!currentSong) return;
    if (manualQueue.length > 0) {
      const next = manualQueue[0];
      setManualQueue((q) => q.slice(1));
      playSong(next);
      return;
    }
    const autoFiltered = autoQueue.filter(s => s.id !== currentSong?.id);
    if (autoFiltered.length > 0) {
      const next = shuffle
        ? autoFiltered[Math.floor(Math.random() * autoFiltered.length)]
        : autoFiltered[0];
      setAutoQueue(prev => prev.filter(s => s.id !== next.id));
      playSong(next);
      return;
    }
    const list = filteredSongs.length > 0 ? filteredSongs : allSongs;
    if (shuffle) {
      const sourceList = list.length > 1 ? list : allSongs;
      let idx;
      do { idx = Math.floor(Math.random() * sourceList.length); }
      while (sourceList.length > 1 && sourceList[idx].id === currentSong.id);
      playSong(sourceList[idx]);
    } else {
      const idx = list.findIndex((s) => s.id === currentSong.id);
      if (repeatMode === "none" && (idx === list.length - 1 || idx === -1)) {
        autoQueueLoadedRef.current = false;
        fetchAutoQueue();
        return;
      }
      playSong(list[(idx + 1) % list.length]);
    }
  }, [currentSong, manualQueue, autoQueue, filteredSongs, allSongs, shuffle, repeatMode, fetchAutoQueue]); // eslint-disable-line

  useEffect(() => { playNextRef.current = playNext; }, [playNext]);

  const playPrev = () => {
    if (!currentSong) return;
    const list = filteredSongs.length > 0 ? filteredSongs : allSongs;
    const idx = list.findIndex((s) => s.id === currentSong.id);
    playSong(list[(idx - 1 + list.length) % list.length]);
  };

  return (
    <PlayerContext.Provider
      value={{
        songList: filteredSongs, allSongs, currentSong, isPlaying,
        duration, volume, searchQuery, setSearchQuery,
        error, shuffle, toggleShuffle, repeatMode, toggleRepeat,
        favorites, toggleFavorite, isFavorite,
        recentHistory, queueOpen, setQueueOpen, lyricsOpen, setLyricsOpen,
        manualQueue, addToQueue, getQueue, autoQueue, fetchAutoQueue,
        playlists, createPlaylist, deletePlaylist, addSongToPlaylist, removeSongFromPlaylist,
        renamePlaylist, reorderPlaylistSongs, setPlaylistCover,
        searchHistory, addSearchHistory, clearSearchHistory,
        isLoadingStream, isYTMode,
        ytPlayerRef, audioRef, isYTModeRef,
        handleYTReady, handleYTStateChange, handleYTTimeUpdate, handleYTError,
        playSong, togglePlay, playNext, playPrev, seekTo, changeVolume,
        searchArtistsResult, searchPlaylistsResult,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}
