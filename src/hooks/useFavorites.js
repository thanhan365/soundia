import { useState, useEffect } from "react";
import api from "../utils/api";

/**
 * useFavorites — manage favorite songs (synced with backend)
 */
export function useFavorites({ user, showToast, allSongs, setAllSongs }) {
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
        if (allSongs.length > 0) load();
    }, [user, allSongs.length]);

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

    return { favorites, toggleFavorite, isFavorite };
}
