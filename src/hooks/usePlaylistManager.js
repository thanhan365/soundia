import { useState, useEffect } from "react";
import api from "../utils/api";

/**
 * usePlaylistManager — CRUD playlists (synced with backend)
 */
export function usePlaylistManager({ user, allSongs, setAllSongs }) {
    const [playlists, setPlaylists] = useState([]);

    // Load playlists when user changes
    useEffect(() => {
        if (!user) { setPlaylists([]); return; }
        const load = async () => {
            try {
                const plRes = await api.get("/playlists");
                setPlaylists(plRes.data.map((pl) => ({
                    ...pl,
                    songs: pl.playlistSongs ? pl.playlistSongs.map((ps) => ps.songId) : [],
                })));
            } catch (e) { console.error("Failed to load playlists", e); }
        };
        if (allSongs.length > 0) load();
    }, [user, allSongs.length]);

    const createPlaylist = async (name) => {
        if (!user) return null;
        try {
            const res = await api.post("/playlists", { name });
            setPlaylists((p) => [...p, { ...res.data, songs: [] }]);
            return res.data.id;
        } catch (e) { console.error(e); return null; }
    };

    const deletePlaylist = async (id) => {
        try {
            await api.delete(`/playlists/${id}`);
            setPlaylists((p) => p.filter((pl) => String(pl.id) !== String(id)));
        } catch (e) { console.error("Failed to delete playlist", e); }
    };

    const addSongToPlaylist = async (playlistId, song) => {
        if (!user) return;
        let songToSave = { ...song };
        try {
            if (song.isExternal) {
                // Ensure duration is a string for backend [MaxLength(10)] constraint
                const dur = typeof song.duration === 'number'
                    ? `${Math.floor(song.duration / 60)}:${String(Math.floor(song.duration % 60)).padStart(2, '0')}`
                    : (song.duration || "0:00");
                const res = await api.post("/songs/external", {
                    title: song.title || "Unknown",
                    artist: song.artist || "Unknown",
                    duration: dur,
                    coverUrl: song.cover || song.coverUrl || "",
                    audioUrl: "YT_STREAM"
                });
                songToSave = res.data;
            }
            const songId = songToSave.id;
            await api.post(`/playlists/${playlistId}/songs`, { songId });
            setPlaylists((p) => p.map((pl) => {
                if (String(pl.id) !== String(playlistId)) return pl;
                if (pl.songs.some((id) => String(id) === String(songId))) return pl;
                return { ...pl, songs: [...pl.songs, songId] };
            }));
            if (song.isExternal) setAllSongs((prev) => [...prev, { ...songToSave, cover: songToSave.coverUrl, audio: songToSave.audioUrl }]);
        } catch (e) {
            console.error("addSongToPlaylist error:", e);
            throw e; // Re-throw so SongContextMenu can show error toast
        }
    };

    const removeSongFromPlaylist = (playlistId, songId) =>
        setPlaylists((p) => p.map((pl) => pl.id === playlistId ? { ...pl, songs: pl.songs.filter((id) => String(id) !== String(songId)) } : pl));

    const renamePlaylist = (id, name) => {
        if (!name.trim()) return;
        setPlaylists((p) => p.map((pl) => String(pl.id) === String(id) ? { ...pl, name: name.trim() } : pl));
    };

    const reorderPlaylistSongs = (id, newIds) =>
        setPlaylists((p) => p.map((pl) => String(pl.id) === String(id) ? { ...pl, songs: newIds } : pl));

    const setPlaylistCover = (id, url) =>
        setPlaylists((p) => p.map((pl) => String(pl.id) === String(id) ? { ...pl, cover: url } : pl));

    return {
        playlists, createPlaylist, deletePlaylist,
        addSongToPlaylist, removeSongFromPlaylist,
        renamePlaylist, reorderPlaylistSongs, setPlaylistCover,
    };
}
