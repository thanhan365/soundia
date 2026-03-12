import { useState, useEffect } from "react";
import { searchItunes } from "../services/iTunesService";
import { searchNctSongs } from "../services/nctService";
import { normalizeVietnamese } from "../utils/textUtils";

/**
 * useSearchManager — search across NCT + iTunes with debounce
 */
export function useSearchManager({ allSongs }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [filteredSongs, setFilteredSongs] = useState(allSongs);
    const [searchArtistsResult, setSearchArtistsResult] = useState([]);
    const [searchPlaylistsResult, setSearchPlaylistsResult] = useState([]);
    const [searchHistory, setSearchHistory] = useState(() =>
        JSON.parse(localStorage.getItem("soundia_search_history")) || []
    );

    // Sync filteredSongs when allSongs changes and no search query
    useEffect(() => {
        if (!searchQuery.trim()) setFilteredSongs(allSongs);
    }, [allSongs, searchQuery]);

    // Debounced search effect
    useEffect(() => {
        const handle = async () => {
            const rawQ = searchQuery.trim();
            const q = rawQ.toLowerCase();
            if (!q) { setFilteredSongs(allSongs); return; }

            const local = allSongs.filter(
                (s) => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)
            );

            const apiUrl = import.meta.env.VITE_API_URL || '/api';
            const [nctResults, itunesResults, localDbResults] = await Promise.all([
                searchNctSongs(rawQ, 15),
                searchItunes(rawQ),
                fetch(`${apiUrl}/songs/search-local?q=${encodeURIComponent(rawQ)}&limit=10`)
                    .then(r => r.ok ? r.json() : { data: [] })
                    .catch(() => ({ data: [] }))
            ]);

            // Local DB songs (admin-imported) go first
            const localDbTracks = (localDbResults.data || []).map(s => ({
                id: s.id, title: s.title, artist: s.artist, cover: s.cover,
                audio: s.audio, source: s.source || 'local', duration: s.duration,
                isExternal: true,
            }));

            const mergedTracks = [...localDbTracks, ...(nctResults.tracks || [])];

            const generateKey = (track) => {
                const title = normalizeVietnamese(track.title).replace(/[^a-z0-9]/g, "");
                const artist = normalizeVietnamese(track.artist).replace(/[^a-z0-9]/g, "");
                return `${title}_${artist}`;
            };

            const existingKeys = new Set(mergedTracks.map(t => generateKey(t)));
            (itunesResults.tracks || []).forEach(itunesTrack => {
                const key = generateKey(itunesTrack);
                if (!existingKeys.has(key)) { mergedTracks.push(itunesTrack); existingKeys.add(key); }
            });

            const mergedArtists = itunesResults.artists || [];
            setFilteredSongs([...local, ...mergedTracks]);
            setSearchArtistsResult(mergedArtists);
            setSearchPlaylistsResult([]);
        };
        const t = setTimeout(handle, 500);
        return () => clearTimeout(t);
    }, [searchQuery, allSongs]); // eslint-disable-line

    // Persist search history
    useEffect(() => {
        localStorage.setItem("soundia_search_history", JSON.stringify(searchHistory));
    }, [searchHistory]);

    const addSearchHistory = (q) => {
        if (!q.trim()) return;
        setSearchHistory((p) => [q, ...p.filter((x) => x !== q)].slice(0, 10));
    };

    const clearSearchHistory = () => setSearchHistory([]);

    return {
        searchQuery, setSearchQuery,
        filteredSongs, setFilteredSongs,
        searchArtistsResult, searchPlaylistsResult,
        searchHistory, addSearchHistory, clearSearchHistory,
    };
}
