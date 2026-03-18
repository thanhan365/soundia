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

    const removeSongFromPlaylist = async (playlistId, songId) => {
        // Optimistic update (UI trước, API sau)
        setPlaylists((p) => p.map((pl) => String(pl.id) === String(playlistId) ? { ...pl, songs: pl.songs.filter((id) => String(id) !== String(songId)) } : pl));
        try {
            await api.delete(`/playlists/${playlistId}/songs/${songId}`);
        } catch (e) { console.error("Failed to remove song from playlist:", e); }
    };

    const renamePlaylist = (id, name) => {
        if (!name.trim()) return;
        setPlaylists((p) => p.map((pl) => String(pl.id) === String(id) ? { ...pl, name: name.trim() } : pl));
    };

    const reorderPlaylistSongs = (id, newIds) =>
        setPlaylists((p) => p.map((pl) => String(pl.id) === String(id) ? { ...pl, songs: newIds } : pl));

    const setPlaylistCover = (id, url) =>
        setPlaylists((p) => p.map((pl) => String(pl.id) === String(id) ? { ...pl, cover: url } : pl));

    // Batch add: save externals in parallel, then one API call
    const addSongsToPlaylistBatch = async (playlistId, songs) => {
        if (!user || !songs.length) return;
        try {
            // 1) Save external songs to DB (5 concurrent)
            const savedSongs = [];
            const chunks = [];
            for (let i = 0; i < songs.length; i += 5) chunks.push(songs.slice(i, i + 5));
            for (const chunk of chunks) {
                const results = await Promise.all(chunk.map(async (song) => {
                    if (song.isExternal || (typeof song.id === 'string' && !/^\d+$/.test(song.id))) {
                        const dur = typeof song.duration === 'number'
                            ? `${Math.floor(song.duration / 60)}:${String(Math.floor(song.duration % 60)).padStart(2, '0')}`
                            : (song.duration || "0:00");
                        const res = await api.post("/songs/external", {
                            title: song.title || "Unknown", artist: song.artist || "Unknown",
                            duration: dur, coverUrl: song.cover || song.coverUrl || "", audioUrl: "YT_STREAM"
                        });
                        return res.data;
                    }
                    return song;
                }));
                savedSongs.push(...results);
            }
            // 2) Batch add to playlist in one call
            const songIds = savedSongs.map(s => s.id);
            await api.post(`/playlists/${playlistId}/songs/batch`, { songIds });
            // 3) Update local state once
            setPlaylists((p) => p.map((pl) => {
                if (String(pl.id) !== String(playlistId)) return pl;
                const existingIds = new Set(pl.songs.map(id => String(id)));
                const newIds = songIds.filter(id => !existingIds.has(String(id)));
                return { ...pl, songs: [...pl.songs, ...newIds] };
            }));
            // 4) Add to allSongs if external
            setAllSongs((prev) => {
                const existing = new Set(prev.map(s => s.id));
                const newOnes = savedSongs.filter(s => !existing.has(s.id))
                    .map(s => ({ ...s, cover: s.coverUrl || s.cover, audio: s.audioUrl || s.audio }));
                return newOnes.length ? [...prev, ...newOnes] : prev;
            });
        } catch (e) { console.error("Batch add error:", e); throw e; }
    };

    return {
        playlists, createPlaylist, deletePlaylist,
        addSongToPlaylist, addSongsToPlaylistBatch, removeSongFromPlaylist,
        renamePlaylist, reorderPlaylistSongs, setPlaylistCover,
    };
}
