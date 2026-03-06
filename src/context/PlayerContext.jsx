import { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
<<<<<<< HEAD
import { AuthContext } from "./AuthContext";
import { useToast } from "./ToastContext";
import api from "../utils/api";
=======
import songs from "../data/songs";
>>>>>>> d9b9a7bdd6beca500ceafa680c096f24878e5382

const PlayerContext = createContext();

export function PlayerProvider({ children }) {
<<<<<<< HEAD
  const { user } = useContext(AuthContext);
  const { showToast } = useToast();
  const [allSongs, setAllSongs] = useState([]);
  const [filteredSongs, setFilteredSongs] = useState([]);
=======
  const [allSongs] = useState(songs);
  const [filteredSongs, setFilteredSongs] = useState(songs);
>>>>>>> d9b9a7bdd6beca500ceafa680c096f24878e5382
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
<<<<<<< HEAD
  const [favorites, setFavorites] = useState([]);
=======
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem("soundia_favorites");
    return saved ? JSON.parse(saved) : [];
  });
>>>>>>> d9b9a7bdd6beca500ceafa680c096f24878e5382
  const [recentHistory, setRecentHistory] = useState([]);
  const [queueOpen, setQueueOpen] = useState(false);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [manualQueue, setManualQueue] = useState([]);
<<<<<<< HEAD
  const [playlists, setPlaylists] = useState([]);
=======
  const [playlists, setPlaylists] = useState(() => {
    const saved = localStorage.getItem("soundia_playlists");
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      // Clean up invalid song IDs and remove duplicates
      return parsed.map((pl) => ({
        ...pl,
        songs: [...new Set(pl.songs)].filter((sid) => songs.some((s) => String(s.id) === String(sid)))
      }));
    } catch {
      return [];
    }
  });
>>>>>>> d9b9a7bdd6beca500ceafa680c096f24878e5382
  const [searchHistory, setSearchHistory] = useState(() => {
    const saved = localStorage.getItem("soundia_search_history");
    return saved ? JSON.parse(saved) : [];
  });
  const audioRef = useRef(new Audio());

<<<<<<< HEAD
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

=======
>>>>>>> d9b9a7bdd6beca500ceafa680c096f24878e5382
  // Search filter
  useEffect(() => {
    const query = searchQuery.toLowerCase();
    if (!query) {
      setFilteredSongs(allSongs);
    } else {
      setFilteredSongs(
        allSongs.filter(
          (s) =>
            s.title.toLowerCase().includes(query) ||
            s.artist.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, allSongs]);

  // Volume persistence
  useEffect(() => {
    localStorage.setItem("soundia_volume", volume.toString());
    audioRef.current.volume = volume;
  }, [volume]);

<<<<<<< HEAD
=======
  // Favorites persistence
  useEffect(() => {
    localStorage.setItem("soundia_favorites", JSON.stringify(favorites));
  }, [favorites]);

  // Playlists persistence
  useEffect(() => {
    localStorage.setItem("soundia_playlists", JSON.stringify(playlists));
  }, [playlists]);

>>>>>>> d9b9a7bdd6beca500ceafa680c096f24878e5382
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
  const playSong = (song) => {
    const audio = audioRef.current;
    if (currentSong?.id === song.id) {
      if (isPlaying) { audio.pause(); setIsPlaying(false); }
      else { audio.play().catch(() => handleAudioError()); setIsPlaying(true); }
      return;
    }
    setCurrentSong(song);
    addToRecent(song);
    audio.src = song.audio;
    audio.load();
    audio.play().then(() => setIsPlaying(true)).catch(() => handleAudioError());
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
<<<<<<< HEAD
  const toggleFavorite = async (songId) => {
    if (!user) {
      showToast("Vui lòng đăng nhập để sử dụng tính năng này", "error");
      return;
    }

    try {
      await api.post('/favorites', { songId });
      setFavorites((p) => p.includes(songId) ? p.filter((id) => id !== songId) : [...p, songId]);
    } catch (err) {
      console.error("Failed to toggle favorite", err);
    }
  };
=======
  const toggleFavorite = (songId) =>
    setFavorites((p) => p.includes(songId) ? p.filter((id) => id !== songId) : [...p, songId]);
>>>>>>> d9b9a7bdd6beca500ceafa680c096f24878e5382
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
<<<<<<< HEAD
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

  const addSongToPlaylist = async (playlistId, songId) => {
    if (!user) return;
    try {
      await api.post(`/playlists/${playlistId}/songs`, { songId });
      setPlaylists((p) =>
        p.map((pl) => {
          if (pl.id !== playlistId) return pl;
          if (pl.songs.some((id) => String(id) === String(songId))) return pl;
          return { ...pl, songs: [...pl.songs, songId] };
        })
      );
    } catch (err) {
      console.error("Failed to add song", err);
    }
=======
  const createPlaylist = (name) => {
    const id = `pl_${Date.now()}`;
    setPlaylists((p) => [...p, { id, name, songs: [], createdAt: Date.now() }]);
    return id;
  };
  const deletePlaylist = (id) => setPlaylists((p) => p.filter((pl) => pl.id !== id));
  const addSongToPlaylist = (playlistId, songId) => {
    setPlaylists((p) =>
      p.map((pl) => {
        if (pl.id !== playlistId) return pl;
        if (pl.songs.some((id) => String(id) === String(songId))) return pl;
        return { ...pl, songs: [...pl.songs, songId] };
      })
    );
>>>>>>> d9b9a7bdd6beca500ceafa680c096f24878e5382
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
