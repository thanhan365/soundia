
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
import { useMediaSession } from "../hooks/useMediaSession";

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
    recentHistory, setRecentHistory, crossfade, setCrossfade, crossfadeTriggeredRef,
    audioRef, ytPlayerRef, isYTModeRef, currentSongRef, playSongRef, playNextRef, ytPlayStartedRef, sleepTimerRef, sharedProgressRef, pendingPlayNextRef,
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

  // ── Load listening history from backend when user logs in ──────────────────
  useEffect(() => {
    if (!user) {
      setRecentHistory([]);
      return;
    }
    api.get('/history?limit=30').then(res => {
      const mapped = res.data.map(h => ({
        id: h.songId || `ext_${h.songTitle}_${h.songArtist}`,
        title: h.songTitle,
        artist: h.songArtist,
        cover: h.songCover,
        coverUrl: h.songCover,
        audio: h.audioUrl || 'YT_STREAM',
        audioUrl: h.audioUrl || 'YT_STREAM',
        duration: h.songDuration || null,
      }));
      setRecentHistory(mapped);
    }).catch(() => {});
  }, [user]); // eslint-disable-line

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
    const isItunesPreview = song.audio &&
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
      audio.play().catch(() => { });
    } else {
      // Needs stream resolution — show loading, set song info immediately
      setIsLoadingStream(true);
      // Stop old audio immediately to prevent stale progress reads
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      setCurrentSong(song);
      pendingPlayNextRef.current = false; // Clear pending flag — playback initiated
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
          audio.pause();
          const backendBase = BACKEND.replace('/api', '');
          const cachedUrl = cached.url.startsWith('/api/') ? `${backendBase}${cached.url}` : cached.url;
          // Proxy fallback for cached direct URLs
          if (cached.directUrl && cached.proxyUrl && cached.url === cached.directUrl) {
            const onCacheError = () => {
              audio.removeEventListener('error', onCacheError);
              const proxyUrl = cached.proxyUrl.startsWith('/api/') ? `${backendBase}${cached.proxyUrl}` : cached.proxyUrl;
              audio.src = proxyUrl;
              audio.play().catch(() => {});
              streamCacheRef.current.set(cacheKey, { ...cached, url: cached.proxyUrl, directUrl: null });
            };
            audio.addEventListener('error', onCacheError, { once: true });
          }
          audio.src = cachedUrl;
          audio.preload = 'auto';
          setIsLoadingStream(false); setIsPlaying(true);
          audio.play().catch(() => { });
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
      // Safety timeout: clear loading after 10s no matter what (prevents infinite spinner on mobile)
      const safetyTimer = setTimeout(() => {
        if (sessionId === playSessionRef.current) {
          console.warn(`⚠️ [playSong] Safety timeout — clearing loading state after 10s`);
          setIsLoadingStream(false);
        }
      }, 10000);

      try {
        let nctStream = null;

        // YouTube luôn pre-fetch song song với NCT
        const ytPromise = withTimeout(
          fetch(`${BACKEND}/stream/video-id?query=${encodeURIComponent(ytQuery)}${expectedDur > 0 ? `&expectedDuration=${Math.round(expectedDur)}` : ''}&songTitle=${encodeURIComponent(song.title || '')}&songArtist=${encodeURIComponent(song.artist || '')}`)
            .then(r => r.ok ? r.json() : null)
            .catch(() => null),
          4000
        );

        // NCT: try nctKey first (fastest: 1 API call), fallback to title resolve
        // song.key is fallback — nct-top returns key but not nctKey
        const songNctKey = song.nctKey || song.key;
        let nctDirect = null; // NCT CDN URL (fast)
        let nctProxy = null;  // Backend proxy URL (fallback)
        try {
          // 1. Fast path: if song has NCT key, get stream directly (1 API call, ~300-500ms)
          if (songNctKey) {
            const nctResult = await withTimeout(getNctStreamUrl(songNctKey), 4000);
            if (nctResult) {
              nctDirect = nctResult.directUrl;
              nctProxy = nctResult.proxyUrl;
              nctStream = nctDirect || nctProxy; // Prefer direct CDN
            }
          }
          // 2. Fallback: title+artist resolve if key didn't work (2 API calls, ~1500ms)
          if (!nctStream && song.title) {
            const titleResult = await withTimeout(resolveNctStream(song.title, song.artist, Math.round(expectedDur)), 4000);
            nctStream = titleResult?.url || null;
            if (!song.nctKey && titleResult?.nctKey) song.nctKey = titleResult.nctKey;
          }
        } catch { }
        // Cache result
        if (nctStream) streamCacheRef.current.set(cacheKey, { type: 'nct', url: nctStream, directUrl: nctDirect, proxyUrl: nctProxy });
        console.log(`⏱️ [playSong] Resolve done in ${(performance.now() - _t0).toFixed(0)}ms (NCT=${nctStream ? 'HIT' : 'MISS'}${nctDirect ? ' DIRECT' : ''})`);

        // Race condition guard: if user clicked another song while we were resolving, abort
        if (sessionId !== playSessionRef.current) {
          console.log(`⏱️ [playSong] Aborted — superseded by newer play request`);
          return;
        }

        if (nctStream) {
          // ✅ NCT tìm được → phát HTML5 Audio
          if (isYTMode) { ytPlayerRef.current?.pause(); setIsYTMode(false); isYTModeRef.current = false; }
          audio.pause();
          const backendBase = (import.meta.env.VITE_API_URL || 'http://localhost:5066/api').replace('/api', '');
          const audioUrl = nctStream.startsWith('/api/') ? `${backendBase}${nctStream}` : nctStream;
          
          // Set error handler cho proxy fallback (nếu direct CDN bị 403)
          if (nctDirect && nctProxy && nctStream === nctDirect) {
            const onDirectError = () => {
              audio.removeEventListener('error', onDirectError);
              console.log(`⚠️ [playSong] Direct CDN failed → fallback to proxy`);
              const proxyAudioUrl = nctProxy.startsWith('/api/') ? `${backendBase}${nctProxy}` : nctProxy;
              audio.src = proxyAudioUrl;
              audio.play().catch(() => {});
              // Update cache với proxy URL
              streamCacheRef.current.set(cacheKey, { type: 'nct', url: nctProxy, directUrl: null, proxyUrl: nctProxy });
            };
            audio.addEventListener('error', onDirectError, { once: true });
          }
          
          audio.preload = 'auto';
          audio.src = audioUrl;
          setIsLoadingStream(false);
          setIsPlaying(true);
          console.log(`⏱️ [playSong] NCT → audio.play() at ${(performance.now() - _t0).toFixed(0)}ms (${nctStream === nctDirect ? 'DIRECT CDN' : 'PROXY'})`);
          audio.play().catch(() => { });
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
      } catch (err) {
        console.error(`❌ [playSong] Stream resolution failed:`, err);
        setIsLoadingStream(false);
        // Last resort: try YouTube search as fallback
        try {
          setIsYTMode(true); isYTModeRef.current = true; ytPlayStartedRef.current = false;
          audio.pause(); audio.src = "";
          ytPlayerRef.current?.loadAndPlay(ytQuery, expectedDur, null, song.title, song.artist);
        } catch { }
      } finally {
        clearTimeout(safetyTimer);
      }
    }
  };

  useEffect(() => { playSongRef.current = playSong; }, [playSong]); // eslint-disable-line

  // ── playNext / playPrev ────────────────────────────────────────────────────
  const playNextGuardRef = useRef(false);
  const playNext = useCallback(async () => {
    if (!currentSong) return;
    // Guard against double invocation (crossfade + onEnd, or rapid calls)
    if (playNextGuardRef.current) return;
    playNextGuardRef.current = true;
    setTimeout(() => { playNextGuardRef.current = false; }, 500);
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

  // ── Pre-resolve next song: cache stream URL trước khi bài hiện tại hết ──
  // Khi tắt màn hình trên mobile, browser throttle network requests.
  // Nếu URL đã có sẵn trong cache → playNext không cần mạng → phát liên tục.
  useEffect(() => {
    if (!currentSong || !isPlaying) return;
    const timer = setTimeout(() => {
      // Xác định bài tiếp theo (giống logic playNext)
      let nextSong = null;
      if (manualQueue.length > 0) {
        nextSong = manualQueue[0];
      } else {
        const autoFiltered = autoQueue.filter(s => s.id !== currentSong?.id);
        if (autoFiltered.length > 0) {
          nextSong = shuffle ? autoFiltered[Math.floor(Math.random() * autoFiltered.length)] : autoFiltered[0];
        } else {
          const list = filteredSongs.length > 0 ? filteredSongs : allSongs;
          const idx = list.findIndex(s => s.id === currentSong.id);
          if (idx !== -1 && idx < list.length - 1) nextSong = list[idx + 1];
          else if (repeatMode !== 'none' && list.length > 0) nextSong = list[0];
        }
      }
      if (!nextSong) return;
      
      // Pre-resolve stream URL (kết quả tự cache trong nctService)
      const nctKey = nextSong.nctKey || nextSong.key;
      if (nctKey) {
        getNctStreamUrl(nctKey).catch(() => {});
      } else if (nextSong.title) {
        const dur = typeof nextSong.duration === 'string'
          ? nextSong.duration.split(':').reduce((a, b) => a * 60 + parseInt(b, 10), 0)
          : (nextSong.duration || 0);
        resolveNctStream(nextSong.title, nextSong.artist, Math.round(dur)).catch(() => {});
      }
      console.log(`🔮 [preResolve] Pre-resolving next: "${nextSong.title}"`);
    }, 3000); // Đợi 3s sau khi bài bắt đầu phát để không ảnh hưởng loading
    return () => clearTimeout(timer);
  }, [currentSong?.id, isPlaying]); // eslint-disable-line

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

  // ── Media Session API — lock screen controls + background playback ─────────
  useMediaSession({ currentSong, isPlaying, togglePlay, playNext, playPrev, seekTo, audioRef, isYTModeRef, ytPlayerRef });

  const contextValue = useMemo(() => ({
    songList: filteredSongs, allSongs, currentSong, isPlaying,
    duration, volume, searchQuery, setSearchQuery,
    error, shuffle, toggleShuffle, repeatMode, toggleRepeat,
    favorites, toggleFavorite, isFavorite,
    recentHistory, queueOpen, setQueueOpen, lyricsOpen, setLyricsOpen,
    manualQueue, setManualQueue, addToQueue, getQueue, autoQueue, setAutoQueue, fetchAutoQueue, setPlayContext, reorderAutoQueue, removeFromAutoQueue,
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
