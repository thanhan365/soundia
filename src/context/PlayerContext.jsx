import { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import { AuthContext } from "./AuthContext";
import { useToast } from "./ToastContext";
import api from "../utils/api";
import { searchDeezer } from "../services/deezerService";

const PlayerContext = createContext();

export function PlayerProvider({ children }) {
  const { user } = useContext(AuthContext);
  const { showToast } = useToast();
  const [allSongs, setAllSongs] = useState([]);
  const [filteredSongs, setFilteredSongs] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
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
  const [searchHistory, setSearchHistory] = useState(() => {
    const saved = localStorage.getItem("soundia_search_history");
    return saved ? JSON.parse(saved) : [];
  });
  const audioRef = useRef(new Audio());

  // Fetch Songs on Mount
  useEffect(() => {
    const loadSongs = async () => {
      try {
        const res = await api.get('/songs');
        const songsData = res.data.map(s => ({...s, audio: s.audioUrl, cover: s.coverUrl})); // Map DB labels to UI labels
        setAllSongs(songsData);
        setFilteredSongs(songsData);
      } catch (err) {
        console.error("Failed to fetch songs", err);
      }
    };
    loadSongs();
  }, []);

  // Fetch Favorites and Playlists when User logs in
  useEffect(() => {
    if (!user) {
      setFavorites([]);
      setPlaylists([]);
      return;
    }

    const loadUserData = async () => {
      try {
        const [favRes, plRes] = await Promise.all([
          api.get('/favorites'),
          api.get('/playlists')
        ]);
        
        // Favorites return list of songs, we just need IDs for the UI map
        setFavorites(favRes.data.map(s => s.id));

        // Playlists return objects with playlistSongs inner arrays
        setPlaylists(plRes.data.map(pl => ({
          ...pl,
          songs: pl.playlistSongs ? pl.playlistSongs.map(ps => ps.songId) : []
        })));
      } catch (err) {
        console.error("Failed to load user data", err);
      }
    };

    if (allSongs.length > 0) {
      loadUserData();
    }
  }, [user, allSongs.length]);
  // Search logic
  useEffect(() => {
    const handleSearch = async () => {
      const query = searchQuery.toLowerCase().trim();
      if (!query) {
        setFilteredSongs(allSongs);
        return;
      }

      // 1. Tìm trong database local trước
      const localResults = allSongs.filter(
        (s) =>
          s.title.toLowerCase().includes(query) ||
          s.artist.toLowerCase().includes(query)
      );

      // 2. Gọi Deezer để lấy hàng triệu bài hát khác
      const deezerResults = await searchDeezer(query);
      
      // Gộp kết quả (Ưu tiên local lên đầu)
      const combined = [...localResults, ...deezerResults.filter(ds => 
        !localResults.some(ls => ls.title === ds.title && ls.artist === ds.artist)
      )];
      
      setFilteredSongs(combined);
    };

    const timer = setTimeout(handleSearch, 500); // Debounce
    return () => clearTimeout(timer);
  }, [searchQuery, allSongs]);

  // Volume persistence
  useEffect(() => {
    localStorage.setItem("soundia_volume", volume.toString());
    audioRef.current.volume = volume;
  }, [volume]);


  // Search history persistence
  useEffect(() => {
    localStorage.setItem("soundia_search_history", JSON.stringify(searchHistory));
  }, [searchHistory]);

  // Audio events
  useEffect(() => {
    const audio = audioRef.current;
    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      if (repeatMode === "one") {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        playNext();
      }
    };
    const handleError = () =>
      handleAudioError("Không thể phát bài này. Hãy thử bài khác.");

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, [currentSong, repeatMode, shuffle]);

  // --- Helpers ---
  const addToRecent = (song) => {
    setRecentHistory((prev) => [song, ...prev.filter((s) => s.id !== song.id)].slice(0, 20));
  };

  const handleAudioError = (msg) => {
    setError(msg || "Lỗi phát nhạc.");
    setTimeout(() => setError(null), 3000);
  };

  // --- Playback ---
  const playSong = async (song) => {
    const audio = audioRef.current;
    
    // Nếu đang phát chính bài này thì Pause/Play
    if (currentSong?.id === song.id) {
      if (isPlaying) { audio.pause(); setIsPlaying(false); }
      else { audio.play().catch(() => handleAudioError()); setIsPlaying(true); }
      return;
    }

    try {
      let finalAudioUrl = song.audio;

      // Với bài hát từ Deezer: luôn thử lấy full stream từ YouTube trước
      if (song.isExternal) {
        try {
          const streamRes = await api.get(`/stream?query=${encodeURIComponent(`${song.artist} - ${song.title} audio`)}`);
          if (streamRes.data?.streamUrl) {
            finalAudioUrl = streamRes.data.streamUrl;
          }
        } catch (streamErr) {
          console.warn("Full stream failed, using Deezer preview:", streamErr);
          // Dùng Deezer preview 30s nếu stream thất bại
          if (!finalAudioUrl) {
            handleAudioError("Không thể phát bài này. Hãy thử bài khác.");
            return;
          }
        }
      }

      // Nếu bài hát không có audio URL nào cả, thử stream
      if (!finalAudioUrl) {
        try {
          const streamRes = await api.get(`/stream?query=${encodeURIComponent(`${song.artist} - ${song.title} audio`)}`);
          finalAudioUrl = streamRes.data.streamUrl;
        } catch {
          handleAudioError("Không thể phát bài này. Hãy thử bài khác.");
          return;
        }
      }

      setCurrentSong({ ...song, audio: finalAudioUrl });
      addToRecent(song);
      
      audio.src = finalAudioUrl;
      audio.load();
      await audio.play();
      setIsPlaying(true);
    } catch (err) {
      console.error("Playback error", err);
      handleAudioError("Không thể phát bài này. Hãy thử bài khác.");
    }
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!currentSong) return;
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else { audio.play().then(() => setIsPlaying(true)).catch(() => handleAudioError()); }
  };

  const playNext = () => {
    if (!currentSong) return;
    // Check manual queue first
    if (manualQueue.length > 0) {
      const next = manualQueue[0];
      setManualQueue((q) => q.slice(1));
      playSong(next);
      return;
    }
    const list = filteredSongs.length > 0 ? filteredSongs : allSongs;
    if (shuffle) {
      let idx;
      do { idx = Math.floor(Math.random() * list.length); }
      while (list.length > 1 && list[idx].id === currentSong.id);
      playSong(list[idx]);
    } else {
      const idx = list.findIndex((s) => s.id === currentSong.id);
      if (repeatMode === "none" && idx === list.length - 1) {
        audioRef.current.pause(); setIsPlaying(false); return;
      }
      playSong(list[(idx + 1) % list.length]);
    }
  };

  const playPrev = () => {
    if (!currentSong) return;
    const list = filteredSongs.length > 0 ? filteredSongs : allSongs;
    const idx = list.findIndex((s) => s.id === currentSong.id);
    playSong(list[(idx - 1 + list.length) % list.length]);
  };

  const toggleShuffle = () => setShuffle((p) => !p);
  const toggleRepeat = () =>
    setRepeatMode((m) => (m === "none" ? "all" : m === "all" ? "one" : "none"));

  // --- Favorites ---
  const toggleFavorite = async (song) => {
    if (!user) {
      showToast("Vui lòng đăng nhập để sử dụng tính năng này", "error");
      return;
    }

    let songToSave = { ...song };

    try {
      // 1. Nếu là bài từ Deezer, phải lưu vào DB của mình trước để lấy ID thật
      if (song.isExternal) {
        const res = await api.post('/songs/external', {
          title: song.title,
          artist: song.artist,
          duration: song.duration,
          coverUrl: song.cover,
          audioUrl: "YT_STREAM" // Placeholder
        });
        songToSave = res.data;
      }

      const songId = songToSave.id;
      await api.post('/favorites', { songId });
      
      setFavorites((p) => p.includes(songId) ? p.filter((id) => id !== songId) : [...p, songId]);
      
      // Nếu vừa mới thêm vào DB, cập nhật danh sách allSongs
      if (song.isExternal) {
        setAllSongs(prev => [...prev, {...songToSave, cover: songToSave.coverUrl, audio: songToSave.audioUrl}]);
      }
    } catch (err) {
      console.error("Failed to toggle favorite", err);
    }
  };
  const isFavorite = (songId) => favorites.includes(songId);

  // --- Seek / Volume ---
  const seekTo = (t) => { audioRef.current.currentTime = t; setCurrentTime(t); };
  const changeVolume = (v) => { audioRef.current.volume = v; setVolume(v); };

  // --- Queue ---
  const addToQueue = (song) => setManualQueue((q) => [...q, song]);
  const getQueue = () => {
    const list = filteredSongs.length > 0 ? filteredSongs : allSongs;
    if (!currentSong) return [...manualQueue, ...list];
    const idx = list.findIndex((s) => s.id === currentSong.id);
    const upcoming = idx === -1 ? list : [...list.slice(idx + 1), ...list.slice(0, idx)];
    return [...manualQueue, ...upcoming];
  };

  // --- Playlists ---
  const createPlaylist = async (name) => {
    if (!user) return null;
    try {
      const res = await api.post('/playlists', { name });
      const newPlaylist = { ...res.data, songs: [] };
      setPlaylists((p) => [...p, newPlaylist]);
      return res.data.id;
    } catch (err) {
      console.error("Failed to create playlist", err);
      return null;
    }
  };
  
  const deletePlaylist = (id) => {
    // Left empty assuming delete API is out of scope for now, just local filter
    setPlaylists((p) => p.filter((pl) => pl.id !== id));
  };

  const addSongToPlaylist = async (playlistId, song) => {
    if (!user) return;
    
    let songToSave = { ...song };

    try {
      // 1. Nếu là bài từ Deezer, lưu vào DB trước
      if (song.isExternal) {
        const res = await api.post('/songs/external', {
          title: song.title, artist: song.artist, duration: song.duration,
          coverUrl: song.cover, audioUrl: "YT_STREAM"
        });
        songToSave = res.data;
      }

      const songId = songToSave.id;
      await api.post(`/playlists/${playlistId}/songs`, { songId });
      
      setPlaylists((p) =>
        p.map((pl) => {
          if (pl.id !== playlistId) return pl;
          if (pl.songs.some((id) => String(id) === String(songId))) return pl;
          return { ...pl, songs: [...pl.songs, songId] };
        })
      );

      if (song.isExternal) {
        setAllSongs(prev => [...prev, {...songToSave, cover: songToSave.coverUrl, audio: songToSave.audioUrl}]);
      }
    } catch (err) {
      console.error("Failed to add song", err);
    }
  };
  const removeSongFromPlaylist = (playlistId, songId) => {
    setPlaylists((p) =>
      p.map((pl) =>
        pl.id === playlistId
          ? { ...pl, songs: pl.songs.filter((id) => String(id) !== String(songId)) }
          : pl
      )
    );
  };
  const renamePlaylist = (playlistId, newName) => {
    if (!newName.trim()) return;
    setPlaylists((p) =>
      p.map((pl) => pl.id === playlistId ? { ...pl, name: newName.trim() } : pl)
    );
  };
  const reorderPlaylistSongs = (playlistId, newSongIds) => {
    setPlaylists((p) =>
      p.map((pl) => pl.id === playlistId ? { ...pl, songs: newSongIds } : pl)
    );
  };
  const setPlaylistCover = (playlistId, coverUrl) => {
    setPlaylists((p) =>
      p.map((pl) => pl.id === playlistId ? { ...pl, cover: coverUrl } : pl)
    );
  };

  // --- Search History ---
  const addSearchHistory = (query) => {
    if (!query.trim()) return;
    setSearchHistory((p) => [query, ...p.filter((q) => q !== query)].slice(0, 10));
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
