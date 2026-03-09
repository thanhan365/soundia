
import { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import { AuthContext } from "./AuthContext";
import { useToast } from "./ToastContext";
import api from "../utils/api";
import { searchItunes, searchItunesArtist, getItunesArtistTopTracks } from "../services/iTunesService";
import { searchNctSongs, getNctStreamUrl, resolveNctStream } from "../services/nctService";
import { normalizeVietnamese } from "../utils/textUtils";

const PlayerContext = createContext();

export function PlayerProvider({ children }) {
  const { user } = useContext(AuthContext);
  const { showToast } = useToast();

  // ── State ─────────────────────────────────────────────────────────────────
  const [allSongs, setAllSongs] = useState([]);
  const [filteredSongs, setFilteredSongs] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem("soundia_volume");
    return saved ? parseFloat(saved) : 0.7;
  });
  const [error, setError] = useState(null);
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState("none");
  const [favorites, setFavorites] = useState([]);
  const [recentHistory, setRecentHistory] = useState([]);
  const [queueOpen, setQueueOpen] = useState(false);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [manualQueue, setManualQueue] = useState([]);
  const [autoQueue, setAutoQueue] = useState([]);
  const autoQueueLoadedRef = useRef(false);
  const [playlists, setPlaylists] = useState([]);
  const [isLoadingStream, setIsLoadingStream] = useState(false);
  const [isYTMode, setIsYTMode] = useState(false); // true khi đang phát YouTube
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHistory, setSearchHistory] = useState(() => JSON.parse(localStorage.getItem("soundia_search_history")) || []);
  const [searchArtistsResult, setSearchArtistsResult] = useState([]);
  const [searchPlaylistsResult, setSearchPlaylistsResult] = useState([]);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const audioRef = useRef(new Audio()); // HTML5 audio – dùng cho bài trong DB
  const ytPlayerRef = useRef(null);     // YouTubeAudioPlayer ref

  // ── Data Loading ──────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/songs");
        const songs = res.data.map((s) => ({ ...s, audio: s.audioUrl, cover: s.coverUrl }));
        setAllSongs(songs);
        setFilteredSongs(songs);
      } catch (e) {
        console.error("Failed to fetch songs", e);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!user) { setFavorites([]); setPlaylists([]); return; }
    const load = async () => {
      try {
        const [favRes, plRes] = await Promise.all([api.get("/favorites"), api.get("/playlists")]);
        setFavorites(favRes.data.map((s) => s.id));
        setPlaylists(plRes.data.map((pl) => ({
          ...pl,
          songs: pl.playlistSongs ? pl.playlistSongs.map((ps) => ps.songId) : [],
        })));
      } catch (e) {
        console.error("Failed to load user data", e);
      }
    };
    if (allSongs.length > 0) load();
  }, [user, allSongs.length]);

  // ── Search ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handle = async () => {
      const rawQ = searchQuery.trim();
      const q = rawQ.toLowerCase();
      if (!q) { setFilteredSongs(allSongs); return; }

      const local = allSongs.filter(
        (s) => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)
      );

      // 1. Normalize query
      const normQ = normalizeVietnamese(rawQ);

      // 2. Fetch parallel from NCT (priority) and iTunes
      const [nctResults, itunesResults] = await Promise.all([
        searchNctSongs(rawQ, 15),
        searchItunes(rawQ)
      ]);

      console.log(`[Search] NCT: ${(nctResults.tracks || []).length} tracks, iTunes: ${(itunesResults.tracks || []).length} tracks`);

      // 3. Merge Tracks: NCT first (better Vietnamese library + stream URLs), then iTunes
      const mergedTracks = [...(nctResults.tracks || [])];

      const generateKey = (track) => {
        const title = normalizeVietnamese(track.title).replace(/[^a-z0-9]/g, "");
        const artist = normalizeVietnamese(track.artist).replace(/[^a-z0-9]/g, "");
        return `${title}_${artist}`;
      };

      const existingKeys = new Set(mergedTracks.map(t => generateKey(t)));

      (itunesResults.tracks || []).forEach(itunesTrack => {
        const key = generateKey(itunesTrack);
        if (!existingKeys.has(key)) {
          mergedTracks.push(itunesTrack);
          existingKeys.add(key);
        }
      });

      // 4. Merge Artists (from iTunes)
      const mergedArtists = itunesResults.artists || [];

      const mergedPlaylists = [];

      console.log(`[Search] Final merged: ${mergedTracks.length} tracks (local: ${local.length})`);
      setFilteredSongs([...local, ...mergedTracks]);
      setSearchArtistsResult(mergedArtists);
      setSearchPlaylistsResult(mergedPlaylists);
    };
    const t = setTimeout(handle, 500);
    return () => clearTimeout(t);
  }, [searchQuery, allSongs]); // eslint-disable-line


  // ── Persistence ───────────────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem("soundia_volume", volume.toString());
    audioRef.current.volume = volume;
    ytPlayerRef.current?.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    localStorage.setItem("soundia_search_history", JSON.stringify(searchHistory));
  }, [searchHistory]);


  const isYTModeRef = useRef(isYTMode);
  const repeatModeRef = useRef(repeatMode);
  const playNextRef = useRef(null);
  const currentSongRef = useRef(currentSong);
  const playSongRef = useRef(null);

  // Sync refs mỗi khi state thay đổi
  useEffect(() => { currentSongRef.current = currentSong; }, [currentSong]);
  useEffect(() => { isYTModeRef.current = isYTMode; }, [isYTMode]);
  useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);

  // Effect 1: Đăng ký HTML5 audio event listeners – chỉ chạy 1 lần
  useEffect(() => {
    const audio = audioRef.current;

    const onMeta = () => {
      const dur = audio.duration;
      if (dur && !isNaN(dur)) setDuration(dur);
    };
    const onEnd = () => {
      if (repeatModeRef.current === "one") {
        if (currentSongRef.current && playSongRef.current) {
          playSongRef.current(currentSongRef.current, true); // forceReload
        }
      } else {
        // Dùng ref để tránh stale closure
        playNextRef.current?.();
      }
    };
    const onErr = () => handleAudioError("Không thể phát bài này.");
    const onPlay = () => { if (!isYTModeRef.current) setIsPlaying(true); };
    const onPause = () => { if (!isYTModeRef.current) setIsPlaying(false); };

    const onTimeUpdate = () => {
      if (!isYTModeRef.current) {
        // KHÔNG set state currentTime ở đây — ProgressBar/LyricsView dùng rAF polling
        // setCurrentTime sẽ gây re-render 30+ components mỗi frame!
        if (audio.duration && !isNaN(audio.duration)) setDuration(audio.duration);
      }
    };

    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("error", onErr);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("timeupdate", onTimeUpdate);

    return () => {
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("error", onErr);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, []); // eslint-disable-line


  // ── Helpers ───────────────────────────────────────────────────────────────
  const addToRecent = (song) =>
    setRecentHistory((p) => [song, ...p.filter((s) => s.id !== song.id)].slice(0, 20));

  const handleAudioError = (msg) => {
    // Bỏ qua lỗi giả từ audio.src = "" khi chuyển sang chế độ YouTube
    if (isYTModeRef.current) return;

    setIsPlaying(false); // Sửa lỗi kẹt nút Pause vĩnh viễn khi Zing URL bị 403

    // Fallback: Tự động cứu vãn bằng cách phát qua YouTube nếu lỗi HTML5 audio
    const song = currentSongRef.current;
    if (song && song.audio !== "YT_STREAM") {
      // Gọi playSong qua YouTube
      playSong({ ...song, audio: "YT_STREAM" });
      return;
    }

    setError(msg || "Lỗi phát nhạc.");
    setTimeout(() => setError(null), 3000);
  };

  // ── YouTube IFrame Callbacks (được đăng ký từ App) ────────────────────────
  const handleYTReady = useCallback(() => {
    // YT player sẵn sàng – apply volume
    ytPlayerRef.current?.setVolume(volume);
  }, [volume]);

  const handleYTStateChange = useCallback((state) => {
    // YT PlayerState: -1=unstarted, 0=ended, 1=playing, 2=paused, 3=buffering, 5=cued
    if (!isYTModeRef.current) return;
    if (state === 1) { setIsPlaying(true); setIsLoadingStream(false); }
    else if (state === 2) { setIsPlaying(false); }
    else if (state === 0) { // ended
      if (repeatModeRef.current === "one") {
        if (currentSongRef.current && playSongRef.current) {
          playSongRef.current(currentSongRef.current, true); // forceReload
        }
      } else {
        playNextRef.current?.();
      }
    }
    else if (state === 3) { setIsLoadingStream(true); } // buffering
    else if (state === 5) {
      // CUED nghĩa là sẵn sàng nhưng chưa phát (VD: Bị Browser chặn Autoplay)
      setIsPlaying(false);
      setIsLoadingStream(false);
    }
    else if (state === -1) {
      // UNSTARTED nghĩa là đã load xong data nhưng chưa gọi autoplay hoặc lỗi
      setIsLoadingStream(false);
    }
  }, []); // eslint-disable-line

  const handleYTTimeUpdate = useCallback((t, d) => {
    // KHÔNG set state currentTime — ProgressBar/LyricsView đọc trực tiếp từ ref
    // Chỉ cập nhật duration (thay đổi ít, không gây re-render liên tục)
    if (d > 0) setDuration(d);
  }, []);

  const handleYTError = useCallback(() => {
    setIsLoadingStream(false);
    setIsPlaying(false);
    handleAudioError("YouTube không thể phát bài này. Thử bài khác.");
  }, []);

  // ── Playback ──────────────────────────────────────────────────────────────
  const playSong = async (song, forceReload = false) => {
    const audio = audioRef.current;

    // Nếu click lại bài đang phát → toggle pause/play
    if (!forceReload && currentSong?.id === song.id) {
      if (isYTMode) {
        if (isPlaying) { ytPlayerRef.current?.pause(); setIsPlaying(false); }
        else { ytPlayerRef.current?.play(); setIsPlaying(true); }
      } else {
        if (isPlaying) { audio.pause(); } // state is synced via onPause listener
        else { setIsPlaying(true); audio.play().catch(() => handleAudioError()); }
      }
      return;
    }

    // Resolve Spotify songs without audio preview directly to YouTube fallback
    if (song.source === 'spotify' && !song.audio) {
      song.audio = "YT_STREAM";
    }

    // ── 3-in-1 Audio Strategy ──────────────────────────────────────────
    // Priority: NCT stream → iTunes preview → YouTube (fallback)
    // Try to resolve NCT stream for ANY song with YT_STREAM
    if (!song.audio || song.audio === 'YT_STREAM') {
      try {
        let streamUrl = null;
        // If NCT song with key → direct stream lookup
        if (song.nctKey) {
          streamUrl = await getNctStreamUrl(song.nctKey);
        }
        // Otherwise → search NCT by title+artist
        if (!streamUrl && song.title) {
          streamUrl = await resolveNctStream(song.title, song.artist);
        }
        if (streamUrl) {
          song.audio = streamUrl;
          console.log(`[3-in-1] ✅ NCT stream resolved for: ${song.title}`);
        } else {
          console.log(`[3-in-1] ⚠️ NCT not found, will use YouTube: ${song.title}`);
        }
      } catch (err) {
        console.log(`[3-in-1] NCT resolve failed, fallback to YT:`, err.message);
      }
    }

    // Determine if we have a direct audio URL (NCT proxy, NCT stream, or iTunes preview)
    const hasDirectUrl = song.audio && song.audio !== "YT_STREAM" && (song.audio.startsWith("http") || song.audio.startsWith("/api/"));
    // YouTube is ONLY a fallback — if we have a direct URL, use HTML5 Audio
    const needsYT = !hasDirectUrl && (!song.audio || song.audio === "YT_STREAM");

    if (needsYT) {
      // ── Chế độ YouTube IFrame ─────────────────────────────────────────────
      // QUAN TRỌNG: Set isYTMode TRƯỚC KHI clear audio.src
      // Vì audio.src = "" có thể trigger error event đồng bộ trên một số trình duyệt
      // Nếu isYTModeRef còn false lúc đó → handleAudioError sẽ chạy sai
      setIsYTMode(true);
      isYTModeRef.current = true;

      audio.pause();
      audio.src = "";

      setCurrentSong(song);
      addToRecent(song);
      // Optimistically assume it will play. If the API bridge crashes, 
      // the UI won't be stuck looking paused while music plays natively.
      setIsPlaying(true);
      setIsLoadingStream(true);
      setCurrentTime(0);

      const parseDurationStr = (str) => {
        if (typeof str === 'number') return str;
        if (!str || typeof str !== 'string') return 0;
        const parts = str.split(':');
        if (parts.length === 2) {
          return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
        }
        return 0;
      };

      // Khởi tạo duration bằng số (chuyển đổi nếu là chuỗi mm:ss)
      if (song.duration) {
        setDuration(parseDurationStr(song.duration));
      } else {
        setDuration(0);
      }

      // Query tìm kiếm: "Artist - Title official audio"
      const query = `${song.artist} - ${song.title} official audio`;
      ytPlayerRef.current?.loadAndPlay(query);

    } else {
      // ── Chế độ HTML5 Audio ────────────────────────────────────────────────
      if (isYTMode) {
        ytPlayerRef.current?.pause();
        setIsYTMode(false);
        isYTModeRef.current = false; // Sync ref NGAY LẬP TỨC
      }

      try {
        setCurrentSong(song);
        addToRecent(song);
        setIsLoadingStream(false);
        setIsPlaying(true);
        setCurrentTime(0);
        setDuration(0);

        const audioUrl = song.audio.startsWith('/api/')
          ? `http://localhost:5066${song.audio}`
          : song.audio;
        audio.src = audioUrl;
        audio.load();
        await audio.play();
      } catch (err) {
        console.warn("[3-in-1] HTML5 Audio failed, falling back to YouTube:", err.message);
        // ── Auto-fallback to YouTube ─────────────────────────────────
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

  // Sync playSong reference
  useEffect(() => {
    playSongRef.current = playSong;
  }, [playSong]);

  const togglePlay = () => {
    if (!currentSong) return;
    if (isYTMode) {
      if (isPlaying) { ytPlayerRef.current?.pause(); setIsPlaying(false); }
      else { ytPlayerRef.current?.play(); setIsPlaying(true); }
    } else {
      const audio = audioRef.current;
      if (isPlaying) { audio.pause(); }
      else { setIsPlaying(true); audio.play().catch(() => handleAudioError()); }
    }
  };

  // Auto-populate queue with NCT trending songs when needed
  const fetchAutoQueue = useCallback(async () => {
    if (autoQueueLoadedRef.current) return;
    autoQueueLoadedRef.current = true;
    try {
      const res = await api.get("/songs/nct-top");
      if (res?.data?.success && res?.data?.data) {
        // Shuffle the trending songs for variety
        const shuffled = [...res.data.data].sort(() => Math.random() - 0.5);
        setAutoQueue(shuffled.slice(0, 20));
      }
    } catch (err) {
      console.error("Failed to fetch auto queue:", err);
    }
  }, []);

  // Trigger auto-populate queue with suggestions
  useEffect(() => {
    // Wait until initial songs are loaded so we don't spam API on hard refresh instantly
    if (allSongs.length > 0 && autoQueue.length === 0 && !autoQueueLoadedRef.current) {
      fetchAutoQueue();
    }
  }, [allSongs.length, autoQueue.length, fetchAutoQueue]);

  const playNext = useCallback(() => {
    if (!currentSong) return;
    // 1. Phục vụ Play Next trong danh sách chờ (Manual Queue)
    if (manualQueue.length > 0) {
      const next = manualQueue[0];
      setManualQueue((q) => q.slice(1));
      playSong(next);
      return;
    }

    // 2. Phát tiếp từ autoQueue (trending songs) nếu có
    const autoFiltered = autoQueue.filter(s => s.id !== currentSong?.id);
    if (autoFiltered.length > 0) {
      const next = shuffle
        ? autoFiltered[Math.floor(Math.random() * autoFiltered.length)]
        : autoFiltered[0];
      setAutoQueue(prev => prev.filter(s => s.id !== next.id));
      playSong(next);
      return;
    }

    // 3. Nếu hết cả autoQueue, phát từ danh sách hiện tại
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
        // Refetch autoQueue when exhausted
        autoQueueLoadedRef.current = false;
        fetchAutoQueue();
        return;
      }
      playSong(list[(idx + 1) % list.length]);
    }
  }, [currentSong, manualQueue, autoQueue, filteredSongs, allSongs, shuffle, repeatMode, fetchAutoQueue]); // eslint-disable-line

  // Sync playNextRef để onEnd luôn gọi version mới nhất (tránh stale closure)
  useEffect(() => { playNextRef.current = playNext; }, [playNext]);

  const playPrev = () => {
    if (!currentSong) return;
    const list = filteredSongs.length > 0 ? filteredSongs : allSongs;
    const idx = list.findIndex((s) => s.id === currentSong.id);
    playSong(list[(idx - 1 + list.length) % list.length]);
  };

  const toggleShuffle = () => setShuffle((p) => !p);
  const toggleRepeat = () => setRepeatMode((m) => m === "none" ? "all" : m === "all" ? "one" : "none");

  const seekTo = (t) => {
    if (isYTMode) { ytPlayerRef.current?.seekTo(t); setCurrentTime(t); }
    else { audioRef.current.currentTime = t; setCurrentTime(t); }
  };

  const changeVolume = (v) => {
    audioRef.current.volume = v;
    ytPlayerRef.current?.setVolume(v);
    setVolume(v);
  };

  // ── Favorites ─────────────────────────────────────────────────────────────
  const toggleFavorite = async (song) => {
    if (!user) { showToast("Vui lòng đăng nhập để sử dụng tính năng này", "error"); return; }
    let songToSave = { ...song };
    try {
      if (song.isExternal) {
        const res = await api.post("/songs/external", { title: song.title, artist: song.artist, duration: song.duration, coverUrl: song.cover, audioUrl: "YT_STREAM" });
        songToSave = res.data;
      }
      const songId = songToSave.id;
      await api.post("/favorites", { songId });
      setFavorites((p) => p.includes(songId) ? p.filter((id) => id !== songId) : [...p, songId]);
      if (song.isExternal) setAllSongs((prev) => [...prev, { ...songToSave, cover: songToSave.coverUrl, audio: songToSave.audioUrl }]);
    } catch (e) { console.error("Failed to toggle favorite", e); }
  };
  const isFavorite = (id) => favorites.includes(id);

  // ── Queue ─────────────────────────────────────────────────────────────────
  const addToQueue = (song) => setManualQueue((q) => [...q, song]);

  const getQueue = () => {
    // Manual queue always comes first (FIFO)
    // If no manual queue, show auto-generated queue from trending
    const autoFiltered = autoQueue.filter(s => s.id !== currentSong?.id);
    return [...manualQueue, ...autoFiltered];
  };

  // ── Playlists ─────────────────────────────────────────────────────────────
  const createPlaylist = async (name) => {
    if (!user) return null;
    try {
      const res = await api.post("/playlists", { name });
      setPlaylists((p) => [...p, { ...res.data, songs: [] }]);
      return res.data.id;
    } catch (e) { console.error(e); return null; }
  };
  const deletePlaylist = (id) => setPlaylists((p) => p.filter((pl) => pl.id !== id));

  const addSongToPlaylist = async (playlistId, song) => {
    if (!user) return;
    let songToSave = { ...song };
    try {
      if (song.isExternal) {
        const res = await api.post("/songs/external", { title: song.title, artist: song.artist, duration: song.duration, coverUrl: song.cover, audioUrl: "YT_STREAM" });
        songToSave = res.data;
      }
      const songId = songToSave.id;
      await api.post(`/playlists/${playlistId}/songs`, { songId });
      setPlaylists((p) => p.map((pl) => {
        if (pl.id !== playlistId) return pl;
        if (pl.songs.some((id) => String(id) === String(songId))) return pl;
        return { ...pl, songs: [...pl.songs, songId] };
      }));
      if (song.isExternal) setAllSongs((prev) => [...prev, { ...songToSave, cover: songToSave.coverUrl, audio: songToSave.audioUrl }]);
    } catch (e) { console.error(e); }
  };
  const removeSongFromPlaylist = (playlistId, songId) =>
    setPlaylists((p) => p.map((pl) => pl.id === playlistId ? { ...pl, songs: pl.songs.filter((id) => String(id) !== String(songId)) } : pl));
  const renamePlaylist = (id, name) => {
    if (!name.trim()) return;
    setPlaylists((p) => p.map((pl) => pl.id === id ? { ...pl, name: name.trim() } : pl));
  };
  const reorderPlaylistSongs = (id, newIds) =>
    setPlaylists((p) => p.map((pl) => pl.id === id ? { ...pl, songs: newIds } : pl));
  const setPlaylistCover = (id, url) =>
    setPlaylists((p) => p.map((pl) => pl.id === id ? { ...pl, cover: url } : pl));

  // ── Search History ────────────────────────────────────────────────────────
  const addSearchHistory = (q) => {
    if (!q.trim()) return;
    setSearchHistory((p) => [q, ...p.filter((x) => x !== q)].slice(0, 10));
  };
  const clearSearchHistory = () => setSearchHistory([]);

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
        ytPlayerRef, audioRef, isYTModeRef,   // Dùng để đăng ký YT player từ App và đọc thời gian trực tiếp
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
