
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
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
    recentHistory, crossfade, setCrossfade, crossfadeTriggeredRef,
    audioRef, ytPlayerRef, isYTModeRef, currentSongRef, playSongRef, playNextRef, ytPlayStartedRef, sleepTimerRef, sharedProgressRef,
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

  // ── Sleep Timer ────────────────────────────────────────────────────────────
  const [sleepTimer, setSleepTimerState] = useState(null); // null | 'end' | minutes remaining display
  const [sleepTimerEnd, setSleepTimerEnd] = useState(null); // timestamp khi timer hết
  const sleepIntervalRef = useRef(null);

  const setSleepTimer = useCallback((option) => {
    // Clear existing timer
    if (sleepIntervalRef.current) { clearInterval(sleepIntervalRef.current); sleepIntervalRef.current = null; }
    if (option === null || option === 'off') {
      setSleepTimerState(null);
      setSleepTimerEnd(null);
      return;
    }
    if (option === 'end') {
      // Pause sau khi bài hiện tại kết thúc
      setSleepTimerState('end');
      setSleepTimerEnd(null);
      return;
    }
    // option = số phút (15, 30, 45, 60)
    const minutes = parseInt(option, 10);
    if (isNaN(minutes) || minutes <= 0) return;
    const endTime = Date.now() + minutes * 60 * 1000;
    setSleepTimerEnd(endTime);
    setSleepTimerState(minutes);
  }, []);

  // Countdown effect
  useEffect(() => {
    if (sleepIntervalRef.current) clearInterval(sleepIntervalRef.current);
    if (!sleepTimerEnd && sleepTimer !== 'end') return;

    if (sleepTimerEnd) {
      sleepIntervalRef.current = setInterval(() => {
        const remaining = sleepTimerEnd - Date.now();
        if (remaining <= 0) {
          // Timer hết — pause nhạc
          clearInterval(sleepIntervalRef.current);
          sleepIntervalRef.current = null;
          setSleepTimerState(null);
          setSleepTimerEnd(null);
          if (audioRef.current) audioRef.current.pause();
          if (ytPlayerRef.current?.pause) ytPlayerRef.current.pause();
          setIsPlaying(false);
          showToast('⏱️ Hẹn giờ kết thúc — đã tạm dừng nhạc', 'info');
        } else {
          setSleepTimerState(Math.ceil(remaining / 60000));
        }
      }, 10000); // update mỗi 10s
    }
    return () => { if (sleepIntervalRef.current) clearInterval(sleepIntervalRef.current); };
  }, [sleepTimerEnd]); // eslint-disable-line

  // Sync sleepTimerRef for usePlayback to check
  useEffect(() => {
    sleepTimerRef.current = sleepTimer;
    // When sleep timer 'end' mode triggers (song ends in usePlayback), reset state
    // The actual playing stop is handled in usePlayback onEnd
  }, [sleepTimer]);

  // Show toast when sleep timer 'end' finishes (detected by isPlaying going false while sleepTimer='end')
  useEffect(() => {
    if (sleepTimer === 'end' && !isPlaying && currentSong) {
      // Song ended with sleep timer active — clean up
      setSleepTimerState(null);
      showToast('⏱️ Hết bài — đã tạm dừng nhạc', 'info');
    }
  }, [isPlaying]); // eslint-disable-line

  // ── Auto-populate queue ────────────────────────────────────────────────────
  useEffect(() => {
    if (allSongs.length > 0 && autoQueue.length === 0 && !autoQueueLoadedRef.current) {
      fetchAutoQueue();
    }
  }, [allSongs.length, autoQueue.length, fetchAutoQueue]); // eslint-disable-line

  // ── Watchdog: auto-clear isLoadingStream if YT is actually playing ─────────
  useEffect(() => {
    if (!isLoadingStream || !isYTMode) return;
    const id = setInterval(() => {
      try {
        const t = ytPlayerRef.current?.getCurrentTime?.() ?? 0;
        if (t > 0.5) { setIsLoadingStream(false); clearInterval(id); }
      } catch { }
    }, 200);
    return () => clearInterval(id);
  }, [isLoadingStream, isYTMode]); // eslint-disable-line

  // ── Record listening event to backend ─────────────────────────────────────
  const recordListening = (song) => {
    if (!user) return; // chỉ ghi khi đã login
    api.post('/history', {
      songId: song.id && typeof song.id === 'number' ? song.id : null,
      externalTitle: song.title || '',
      externalArtist: song.artist || '',
      externalCoverUrl: song.cover || song.coverUrl || '',
      durationListened: 0,
    }).catch(() => { }); // fire-and-forget
  };

  // ── playSong (needs access to all hooks) ───────────────────────────────────
  const playSong = async (song, forceReload = false) => {
    const audio = audioRef.current;
    crossfadeTriggeredRef.current = false; // Reset crossfade trigger for new song

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

    const parseDurationStr = (str) => {
      if (typeof str === 'number') return str;
      if (!str || typeof str !== 'string') return 0;
      const parts = str.split(':');
      if (parts.length === 2) return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      return 0;
    };
    const expectedDur = parseDurationStr(song.duration);
    const ytQuery = `${song.artist} - ${song.title} official audio`;

    // Biến lưu videoId đã pre-fetch (nếu có)
    let ytPreFetchedVideoId = null;
    let ytMatchedDuration = 0; // Duration thực tế của YouTube video đã match

    // NCT stream resolution — resolve khi chưa có audio, hoặc khi là iTunes preview 30s
    if (!song.audio || song.audio === 'YT_STREAM' || isItunesPreview) {
      setIsLoadingStream(true); // Show loading spinner immediately
      try {
        const withTimeout = (promise, ms) => Promise.race([
          promise,
          new Promise(r => setTimeout(() => r(null), ms))
        ]);

        const BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:5066/api';

        // ═══ SONG SONG: NCT + YouTube pre-fetch cùng lúc ═══
        const [keyResult, titleResult, ytPreResult] = await Promise.all([
          song.nctKey ? withTimeout(getNctStreamUrl(song.nctKey), 4000) : Promise.resolve(null),
          song.title ? withTimeout(resolveNctStream(song.title, song.artist), 4000) : Promise.resolve(null),
          // Pre-fetch YouTube videoId (không chờ NCT fail — tiết kiệm thời gian)
          withTimeout(
            fetch(`${BACKEND}/stream/video-id?query=${encodeURIComponent(ytQuery)}${expectedDur > 0 ? `&expectedDuration=${Math.round(expectedDur)}` : ''}&songTitle=${encodeURIComponent(song.title || '')}&songArtist=${encodeURIComponent(song.artist || '')}`)
              .then(r => r.ok ? r.json() : null)
              .catch(() => null),
            5000
          ),
        ]);
        // resolveNctStream now returns { url, nctKey } or null
        const resolvedUrl = titleResult?.url || null;
        const resolvedNctKey = titleResult?.nctKey || null;
        const streamUrl = keyResult || resolvedUrl;

        if (streamUrl) {
          song.audio = streamUrl;
          // Lưu nctKey cho lyrics lookup (nếu chưa có)
          if (!song.nctKey && resolvedNctKey) song.nctKey = resolvedNctKey;
        } else {

          if (isItunesPreview) song.audio = "YT_STREAM";
          // Lưu pre-fetched videoId + matchedDuration để dùng bên dưới
          ytPreFetchedVideoId = ytPreResult?.videoId || null;
          ytMatchedDuration = ytPreResult?.matchedDuration || 0;
        }
      } catch (err) {

        if (isItunesPreview) song.audio = "YT_STREAM";
      }
    }

    const hasDirectUrl = song.audio && song.audio !== "YT_STREAM" && (song.audio.startsWith("http") || song.audio.startsWith("/api/"));
    const needsYT = !hasDirectUrl && (!song.audio || song.audio === "YT_STREAM");

    if (needsYT) {
      setIsYTMode(true);
      isYTModeRef.current = true;
      ytPlayStartedRef.current = false;
      audio.pause();
      audio.src = "";
      setCurrentSong(song);
      addToRecent(song);
      recordListening(song);
      setIsPlaying(true);
      setIsLoadingStream(true);
      setCurrentTime(0);
      // Dùng matchedDuration từ YouTube (thực tế) nếu có, fallback sang expectedDur
      const ytDur = ytMatchedDuration > 0 ? ytMatchedDuration : expectedDur;
      if (ytDur > 0) setDuration(ytDur);
      else setDuration(0);

      if (ytPreFetchedVideoId) {
        // 🚀 VideoId đã pre-fetch sẵn → skip API call, load tức thì

        ytPlayerRef.current?.loadAndPlay(ytQuery, expectedDur, ytPreFetchedVideoId);
      } else {
        ytPlayerRef.current?.loadAndPlay(ytQuery, expectedDur, null, song.title, song.artist);
      }
    } else {
      if (isYTMode) {
        ytPlayerRef.current?.pause();
        setIsYTMode(false);
        isYTModeRef.current = false;
      }
      try {
        setCurrentSong(song);
        addToRecent(song);
        recordListening(song);
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
        setIsLoadingStream(false); // Clear spinner — NCT resolve is done, audio is playing
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
        ytPlayerRef.current?.loadAndPlay(ytQuery, expectedDur);
      }
    }
  };

  useEffect(() => { playSongRef.current = playSong; }, [playSong]); // eslint-disable-line

  // ── playNext / playPrev ────────────────────────────────────────────────────
  const playNext = useCallback(async () => {
    if (!currentSong) return;
    // Sleep timer 'end' mode — dừng phát thay vì chuyển bài
    if (sleepTimerRef.current === 'end') {
      if (audioRef.current) audioRef.current.pause();
      if (ytPlayerRef.current?.pauseVideo) ytPlayerRef.current.pauseVideo();
      setIsPlaying(false);
      setSleepTimerState(null);
      sleepTimerRef.current = null;
      showToast('⏱️ Hết bài — đã tạm dừng nhạc', 'info');
      return;
    }
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
        // ── Autoplay tương tự: tìm bài cùng artist ──
        try {
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5066/api';
          const query = encodeURIComponent(currentSong.artist);
          const res = await fetch(`${apiUrl}/songs/search?q=${query}&limit=20`);
          if (res.ok) {
            const data = await res.json();
            const similar = (data.data || data).filter(s => s.id !== currentSong.id);
            if (similar.length > 0) {
              const pick = similar[Math.floor(Math.random() * Math.min(similar.length, 5))];
              const normalizedSong = { ...pick, audio: pick.audioUrl || pick.audio, cover: pick.coverUrl || pick.cover };
              showToast(`🎵 Phát bài tương tự: ${normalizedSong.title || pick.title}`, 'info');
              playSong(normalizedSong);
              return;
            }
          }
        } catch { /* fallback below */ }
        // Fallback: random từ allSongs
        if (allSongs.length > 1) {
          let rIdx;
          do { rIdx = Math.floor(Math.random() * allSongs.length); }
          while (allSongs.length > 1 && allSongs[rIdx].id === currentSong.id);
          showToast('🎵 Phát bài ngẫu nhiên', 'info');
          playSong(allSongs[rIdx]);
          return;
        }
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
        sleepTimer, setSleepTimer,
        crossfade, setCrossfade,
        ytPlayerRef, audioRef, isYTModeRef, sharedProgressRef,
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
