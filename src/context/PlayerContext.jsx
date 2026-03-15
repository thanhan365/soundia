
import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from "react";
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

  const setFilteredSongsRef = useRef(null);
  const { favorites, toggleFavorite, isFavorite } = useFavorites({ user, showToast, allSongs, setAllSongs, currentSong, setCurrentSong, setFilteredSongsRef });

  // Stream resolution cache — avoid re-resolving the same song
  const streamCacheRef = useRef(new Map());
  const queue = useQueue({ currentSong, allSongs });
  const { manualQueue, setManualQueue, autoQueue, setAutoQueue, autoQueueLoadedRef, fetchAutoQueue, addToQueue, getQueue, setPlayContext, reorderAutoQueue, removeFromAutoQueue } = queue;

  const { playlists, createPlaylist, deletePlaylist, addSongToPlaylist, removeSongFromPlaylist, renamePlaylist, reorderPlaylistSongs, setPlaylistCover } = usePlaylistManager({ user, allSongs, setAllSongs });

  const search = useSearchManager({ allSongs });
  const { searchQuery, setSearchQuery, filteredSongs, setFilteredSongs, searchArtistsResult, searchPlaylistsResult, searchHistory, addSearchHistory, clearSearchHistory, isSearching } = search;
  setFilteredSongsRef.current = setFilteredSongs;

  // ── UI State ───────────────────────────────────────────────────────────────
  const [queueOpen, setQueueOpen] = useState(false);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const playHistoryRef = useRef([]); // Stack of previously played songs for playPrev

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
  const playSessionRef = useRef(0); // race-condition guard for rapid song switching

  const playSong = async (song, forceReload = false) => {
    const _t0 = performance.now();
    const audio = audioRef.current;
    crossfadeTriggeredRef.current = false; // Reset crossfade trigger for new song
    const sessionId = ++playSessionRef.current; // unique ID for this play call

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

    // Detect stored NCT/iTunes URLs that need re-resolution
    const isItunesPreview = song.source === 'itunes' && song.audio &&
      (song.audio.includes('audio.itunes.apple.com') || song.audio.includes('audio-ssl.itunes.apple.com'));
    const isStoredNctUrl = song.audio && (
      song.audio.includes('stream.nct.vn') || song.audio.includes('a01.nct.vn') || song.audio.includes('proxy-audio')
    );
    const hasStableDirectUrl = song.audio && song.audio !== 'YT_STREAM' && 
      !isItunesPreview && !isStoredNctUrl &&
      (song.audio.startsWith('http') || song.audio.startsWith('/api/'));

    const parseDurationStr = (str) => {
      if (typeof str === 'number') return str;
      if (!str || typeof str !== 'string') return 0;
      const parts = str.split(':');
      if (parts.length === 2) return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      return 0;
    };
    const expectedDur = parseDurationStr(song.duration);
    const ytQuery = `${song.artist} - ${song.title} official audio`;

    // ═══ FAST PLAYBACK: Set UI immediately, resolve stream in background ═══
    if (hasStableDirectUrl) {
      // Direct URL — play instantly
      if (isYTMode) { ytPlayerRef.current?.pause(); setIsYTMode(false); isYTModeRef.current = false; }
      setCurrentSong(song);
      addToRecent(song);
      recordListening(song);
      setCurrentTime(0);
      setDuration(0);
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      const backendBase = (import.meta.env.VITE_API_URL || 'http://localhost:5066/api').replace('/api', '');
      const audioUrl = song.audio.startsWith('/api/') ? `${backendBase}${song.audio}` : song.audio;
      audio.src = audioUrl;
      audio.preload = 'auto';
      setIsLoadingStream(false);
      setIsPlaying(true);
      console.log(`⏱️ [playSong] Direct URL → play in ${(performance.now() - _t0).toFixed(0)}ms`);
      audio.play().catch(() => {});
    } else {
      // Needs stream resolution — show loading, set song info immediately
      setIsLoadingStream(true);
      // Stop old audio immediately to prevent stale progress reads
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      setCurrentSong(song);
      addToRecent(song);
      recordListening(song);
      setIsPlaying(false); // Don't show as playing until audio actually starts
      setCurrentTime(0);
      setDuration(expectedDur > 0 ? expectedDur : 0);

      const withTimeout = (promise, ms) => Promise.race([
        promise,
        new Promise(r => setTimeout(() => r(null), ms))
      ]);

      const BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:5066/api';

      // ═══ STREAM CACHE — instant replay for songs already resolved ═══
      const cacheKey = `${song.title}_${song.artist}`.toLowerCase();
      const cached = streamCacheRef.current.get(cacheKey);
      if (cached) {
        console.log(`⏱️ [playSong] Cache HIT → ${cached.type} in ${(performance.now() - _t0).toFixed(0)}ms`);
        if (cached.type === 'nct') {
          if (isYTMode) { ytPlayerRef.current?.pause(); setIsYTMode(false); isYTModeRef.current = false; }
          audio.pause(); audio.removeAttribute('src'); audio.load();
          const backendBase = BACKEND.replace('/api', '');
          audio.src = cached.url.startsWith('/api/') ? `${backendBase}${cached.url}` : cached.url;
          audio.preload = 'auto';
          setIsLoadingStream(false); setIsPlaying(true);
          audio.play().catch(() => {});
          return;
        } else if (cached.type === 'yt' && cached.videoId) {
          setIsYTMode(true); isYTModeRef.current = true; ytPlayStartedRef.current = false;
          audio.pause(); audio.src = "";
          if (cached.duration > 0) setDuration(cached.duration);
          setIsLoadingStream(false);
          ytPlayerRef.current?.loadAndPlay(ytQuery, expectedDur, cached.videoId);
          return;
        }
      }

      // ═══ NCT + YouTube chạy ĐỒNG THỜI (không đợi NCT xong mới chạy YT) ═══
      let nctStream = null;

      // YouTube luôn pre-fetch song song với NCT
      const ytPromise = withTimeout(
        fetch(`${BACKEND}/stream/video-id?query=${encodeURIComponent(ytQuery)}${expectedDur > 0 ? `&expectedDuration=${Math.round(expectedDur)}` : ''}&songTitle=${encodeURIComponent(song.title || '')}&songArtist=${encodeURIComponent(song.artist || '')}`)
          .then(r => r.ok ? r.json() : null)
          .catch(() => null),
        4000
      );

      // NCT: 2s timeout (giảm từ 3s → nhanh hơn trên mobile)
      try {
        const [keyResult, titleResult] = await Promise.all([
          song.nctKey ? withTimeout(getNctStreamUrl(song.nctKey), 2000) : Promise.resolve(null),
          song.title ? withTimeout(resolveNctStream(song.title, song.artist), 2000) : Promise.resolve(null),
        ]);

        nctStream = keyResult || titleResult?.url || null;
        if (!song.nctKey && titleResult?.nctKey) song.nctKey = titleResult.nctKey;
      } catch {}
      // Cache result
      if (nctStream) streamCacheRef.current.set(cacheKey, { type: 'nct', url: nctStream });
      console.log(`⏱️ [playSong] Resolve done in ${(performance.now() - _t0).toFixed(0)}ms (NCT=${nctStream ? 'HIT' : 'MISS'})`);

      // Race condition guard: if user clicked another song while we were resolving, abort
      if (sessionId !== playSessionRef.current) {
        console.log(`⏱️ [playSong] Aborted — superseded by newer play request`);
        return;
      }

      if (nctStream) {
        // ✅ NCT tìm được → phát HTML5 Audio (ổn định hơn)
        if (isYTMode) { ytPlayerRef.current?.pause(); setIsYTMode(false); isYTModeRef.current = false; }
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
        const backendBase = (import.meta.env.VITE_API_URL || 'http://localhost:5066/api').replace('/api', '');
        const audioUrl = nctStream.startsWith('/api/') ? `${backendBase}${nctStream}` : nctStream;
        audio.src = audioUrl;
        audio.preload = 'auto';
        setIsLoadingStream(false);
        setIsPlaying(true);
        console.log(`⏱️ [playSong] NCT → audio.play() at ${(performance.now() - _t0).toFixed(0)}ms`);
        audio.play().catch(() => {});
      } else {
        // ❌ NCT không có → dùng YouTube (đã chạy ngầm, chỉ cần await)
        const ytResult = await ytPromise;
        // Race condition guard again after YouTube await
        if (sessionId !== playSessionRef.current) return;
        setIsYTMode(true);
        isYTModeRef.current = true;
        ytPlayStartedRef.current = false;
        audio.pause();
        audio.src = "";
        const ytDur = ytResult?.matchedDuration > 0 ? ytResult.matchedDuration : expectedDur;
        if (ytDur > 0) setDuration(ytDur);
        console.log(`⏱️ [playSong] YouTube → loadAndPlay at ${(performance.now() - _t0).toFixed(0)}ms`);
        if (ytResult?.videoId) {
          streamCacheRef.current.set(cacheKey, { type: 'yt', videoId: ytResult.videoId, duration: ytDur });
          ytPlayerRef.current?.loadAndPlay(ytQuery, expectedDur, ytResult.videoId);
        } else {
          ytPlayerRef.current?.loadAndPlay(ytQuery, expectedDur, null, song.title, song.artist);
        }
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
    // Push current song to history before advancing
    if (currentSong) playHistoryRef.current.push(currentSong);
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
    // Pop from history stack
    if (playHistoryRef.current.length > 0) {
      const prev = playHistoryRef.current.pop();
      playSong(prev);
      return;
    }
    // Fallback: loop in list
    const list = filteredSongs.length > 0 ? filteredSongs : allSongs;
    const idx = list.findIndex((s) => s.id === currentSong.id);
    playSong(list[(idx - 1 + list.length) % list.length]);
  };

  const contextValue = useMemo(() => ({
        songList: filteredSongs, allSongs, currentSong, isPlaying,
        duration, volume, searchQuery, setSearchQuery,
        error, shuffle, toggleShuffle, repeatMode, toggleRepeat,
        favorites, toggleFavorite, isFavorite,
        recentHistory, queueOpen, setQueueOpen, lyricsOpen, setLyricsOpen,
        manualQueue, addToQueue, getQueue, autoQueue, fetchAutoQueue, setPlayContext, reorderAutoQueue, removeFromAutoQueue,
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
        isSearching,
  }), [
    filteredSongs, allSongs, currentSong, isPlaying,
    duration, volume, searchQuery, error, shuffle, repeatMode,
    favorites, recentHistory, queueOpen, lyricsOpen,
    manualQueue, autoQueue, playlists,
    searchHistory, isLoadingStream, isYTMode,
    sleepTimer, crossfade, searchArtistsResult, searchPlaylistsResult, isSearching,
  ]); // eslint-disable-line

  return (
    <PlayerContext.Provider value={contextValue}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}
