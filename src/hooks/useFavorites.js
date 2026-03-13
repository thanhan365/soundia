import { useState, useEffect } from "react";
import api from "../utils/api";

/**
 * useFavorites — manage favorite songs (synced with backend)
 */
export function useFavorites({ user, showToast, allSongs, setAllSongs, currentSong, setCurrentSong }) {
    const [favorites, setFavorites] = useState([]);

    // Load favorites when user changes
    useEffect(() => {
        if (!user) { setFavorites([]); return; }
        const load = async () => {
            try {
                const favRes = await api.get("/favorites");
                setFavorites(favRes.data.map((s) => s.id));
            } catch (e) { console.error("Failed to load favorites", e); }
        };
        load();
    }, [user]);

    const toggleFavorite = async (song) => {
        if (!user) { showToast("Vui lòng đăng nhập để sử dụng tính năng này", "error"); return; }
        let songToSave = { ...song };
        try {
            // Detect external song: either has isExternal flag, or id is not a pure integer
            const isExternal = song.isExternal || (typeof song.id === 'string' && !/^\d+$/.test(song.id));
            if (isExternal) {
                // Save external song to DB first, then get its integer DB id
                const res = await api.post("/songs/external", {
                    title: song.title,
                    artist: song.artist,
                    duration: String(song.duration || "0:00"),
                    coverUrl: song.cover || song.coverUrl || "",
                    audioUrl: song.audio || song.audioUrl || "YT_STREAM"
                });
                songToSave = res.data;
                // Update currentSong's ID via React setState so isFavorite() matches
                if (currentSong && (currentSong.id === song.id ||
                    (currentSong.title === song.title && currentSong.artist === song.artist))) {
                    setCurrentSong(prev => prev ? { ...prev, id: songToSave.id } : prev);
                }
            }
            const songId = songToSave.id;
            await api.post("/favorites", { songId });
            setFavorites((p) => p.includes(songId) ? p.filter((id) => id !== songId) : [...p, songId]);
            if (isExternal) setAllSongs((prev) => {
                if (prev.some(s => s.id === songToSave.id)) return prev;
                return [...prev, { ...songToSave, cover: songToSave.coverUrl || songToSave.cover, audio: songToSave.audioUrl || songToSave.audio }];
            });
        } catch (e) { console.error("Failed to toggle favorite", e); }
    };

    const isFavorite = (id) => favorites.includes(id);

    return { favorites, toggleFavorite, isFavorite };
}
