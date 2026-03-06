import { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import { AuthContext } from "./AuthContext";
import { useToast } from "./ToastContext";
import api from "../utils/api";
import { searchDeezer } from "../services/deezerService";

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
  const [playlists, setPlaylists] = useState([]);
  const [isLoadingStream, setIsLoadingStream] = useState(false);
  const [isYTMode, setIsYTMode] = useState(false); // true khi đang phát YouTube
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHistory, setSearchHistory] = useState(() => {
    const saved = localStorage.getItem("soundia_search_history");
    return saved ? JSON.parse(saved) : [];
  });

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
      const q = searchQuery.toLowerCase().trim();
      if (!q) { setFilteredSongs(allSongs); return; }
      const local = allSongs.filter(
        (s) => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)
      );
      const deezer = await searchDeezer(q);
      setFilteredSongs([...local, ...deezer.filter((d) => !local.some((l) => l.title === d.title && l.artist === d.artist))]);
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

  // ── HTML5 Audio Events ────────────────────────────────────────────────────
  const animFrameRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;

    const updateProgress = () => {
      if (isPlaying && !isYTMode) {
        setCurrentTime(audio.currentTime);
        const dur = audio.duration;
        if (dur && !isNaN(dur)) setDuration(dur);
        animFrameRef.current = requestAnimationFrame(updateProgress);
      }
    };

    const onMeta = () => {
      const dur = audio.duration;
      if (dur && !isNaN(dur)) setDuration(dur);
    };
    const onEnd  = () => { if (repeatMode === "one") { audio.currentTime = 0; audio.play(); } else playNext(); };
    const onErr  = () => handleAudioError("Không thể phát bài này.");
    const onPlay = () => {
      setIsPlaying(true);
      if (!isYTMode) {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = requestAnimationFrame(updateProgress);
      }
    };
    const onPause = () => {
      setIsPlaying(false);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };

    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("error", onErr);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    
    // Resume animation loop if playing state changes but events don't fire
    if (isPlaying && !isYTMode) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(updateProgress);
    } else {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("error", onErr);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, [repeatMode, isPlaying, isYTMode]); // eslint-disable-line

  // ── Helpers ───────────────────────────────────────────────────────────────
  const addToRecent = (song) =>
    setRecentHistory((p) => [song, ...p.filter((s) => s.id !== song.id)].slice(0, 20));

  const handleAudioError = (msg) => {
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
    if (!isYTMode) return;
    if (state === 1) { setIsPlaying(true); setIsLoadingStream(false); }
    else if (state === 2) { setIsPlaying(false); }
    else if (state === 0) { // ended
      if (repeatMode === "one") {
        ytPlayerRef.current?.seekTo(0);
        ytPlayerRef.current?.play();
      } else {
        playNext();
      }
    }
    else if (state === 3) { setIsLoadingStream(true); } // buffering
  }, [isYTMode, repeatMode]); // eslint-disable-line

  const handleYTTimeUpdate = useCallback((t, d) => {
    if (isYTMode) { 
      setCurrentTime(t); 
      if (d > 0) setDuration(d); 
    }
  }, [isYTMode]);

  const handleYTError = useCallback(() => {
    setIsLoadingStream(false);
    handleAudioError("YouTube không thể phát bài này. Thử bài khác.");
  }, []);

  // ── Playback ──────────────────────────────────────────────────────────────
  const playSong = async (song) => {
    const audio = audioRef.current;

    // Nếu click lại bài đang phát → toggle pause/play
    if (currentSong?.id === song.id) {
      if (isYTMode) {
        if (isPlaying) { ytPlayerRef.current?.pause(); setIsPlaying(false); }
        else { ytPlayerRef.current?.play(); setIsPlaying(true); }
      } else {
        if (isPlaying) { audio.pause(); } // state is synced via onPause listener
        else { setIsPlaying(true); audio.play().catch(() => handleAudioError()); }
      }
      return;
    }

    const needsYT = song.isExternal || !song.audio || song.audio === "YT_STREAM";

    if (needsYT) {
      // ── Chế độ YouTube IFrame ─────────────────────────────────────────────
      audio.pause();
      audio.src = "";

      setCurrentSong(song);
      addToRecent(song);
      setIsYTMode(true);
      setIsPlaying(true); // always true immediately for UI responsiveness
      setIsLoadingStream(true);
      setCurrentTime(0);
      setDuration(0);

      // Query tìm kiếm: "Artist - Title official audio"
      const query = `${song.artist} - ${song.title} official audio`;
      ytPlayerRef.current?.loadAndPlay(query);

    } else {
      // ── Chế độ HTML5 Audio ────────────────────────────────────────────────
      if (isYTMode) {
        ytPlayerRef.current?.pause();
        setIsYTMode(false);
      }

      try {
        setCurrentSong(song);
        addToRecent(song);
        setIsLoadingStream(false);
        setIsPlaying(true); // Set to true immediately so play/pause button is accurate

        audio.src = song.audio;
        audio.load();
        await audio.play();
      } catch (err) {
        console.error("Playback error", err);
        handleAudioError("Không thể phát bài này.");
        setIsPlaying(false);
      }
    }
  };

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

  const playNext = useCallback(() => {
    if (!currentSong) return;
    // 1. Phục vụ Play Next trong danh sách chờ (Manual Queue)
    if (manualQueue.length > 0) {
      const next = manualQueue[0];
      setManualQueue((q) => q.slice(1));
      playSong(next);
      return;
    }
    
    // 2. Không có hàng đợi manual, tiếp tục play danh sách hiện tại
    const list = filteredSongs.length > 0 ? filteredSongs : allSongs;
    
    if (shuffle) {
      // Phát xáo trộn ngẫu nhiên
      const sourceList = list.length > 1 ? list : allSongs; // Nếu list chỉ có 1 bài, lấy allSongs cho random
      let idx;
      do { idx = Math.floor(Math.random() * sourceList.length); }
      while (sourceList.length > 1 && sourceList[idx].id === currentSong.id);
      playSong(sourceList[idx]);
    } else {
      // Phát bài biểu kế tiếp
      const idx = list.findIndex((s) => s.id === currentSong.id);
      
      // Tính năng theo yêu cầu: Khi phát hết bài trong list (hoặc bài không có trong list)
      // thì PHÁT RANDOM ngẫu nhiên từ thư viện (thay vì DỪNG LẠI).
      if (repeatMode === "none" && (idx === list.length - 1 || idx === -1)) {
        if (allSongs.length > 0) {
          let randomIdx;
          do { randomIdx = Math.floor(Math.random() * allSongs.length); }
          while (allSongs.length > 1 && allSongs[randomIdx].id === currentSong.id);
          playSong(allSongs[randomIdx]);
        }
        return;
      }
      playSong(list[(idx + 1) % list.length]);
    }
  }, [currentSong, manualQueue, filteredSongs, allSongs, shuffle, repeatMode, isYTMode]); // eslint-disable-line

  const playPrev = () => {
    if (!currentSong) return;
    const list = filteredSongs.length > 0 ? filteredSongs : allSongs;
    const idx = list.findIndex((s) => s.id === currentSong.id);
    playSong(list[(idx - 1 + list.length) % list.length]);
  };

  const toggleShuffle = () => setShuffle((p) => !p);
  const toggleRepeat  = () => setRepeatMode((m) => m === "none" ? "all" : m === "all" ? "one" : "none");

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
    const list = filteredSongs.length > 0 ? filteredSongs : allSongs;
    if (!currentSong) return [...manualQueue, ...list];
    const idx = list.findIndex((s) => s.id === currentSong.id);
    const upcoming = idx === -1 ? list : [...list.slice(idx + 1), ...list.slice(0, idx)];
    return [...manualQueue, ...upcoming];
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
        currentTime, duration, volume, searchQuery, setSearchQuery,
        error, shuffle, toggleShuffle, repeatMode, toggleRepeat,
        favorites, toggleFavorite, isFavorite,
        recentHistory, queueOpen, setQueueOpen, lyricsOpen, setLyricsOpen,
        manualQueue, addToQueue, getQueue,
        playlists, createPlaylist, deletePlaylist, addSongToPlaylist, removeSongFromPlaylist,
        renamePlaylist, reorderPlaylistSongs, setPlaylistCover,
        searchHistory, addSearchHistory, clearSearchHistory,
        isLoadingStream, isYTMode,
        ytPlayerRef,           // Dùng để đăng ký YT player từ App
        handleYTReady, handleYTStateChange, handleYTTimeUpdate, handleYTError,
        playSong, togglePlay, playNext, playPrev, seekTo, changeVolume,
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
