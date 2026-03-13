import { useState, useEffect, useRef } from "react";
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

    // Keep a ref to allSongs so search effect doesn't re-trigger when allSongs changes
    const allSongsRef = useRef(allSongs);
    useEffect(() => { allSongsRef.current = allSongs; }, [allSongs]);

    // Sync filteredSongs when allSongs changes and no search query
    useEffect(() => {
        if (!searchQuery.trim()) setFilteredSongs(allSongs);
    }, [allSongs, searchQuery]);

    // Debounced search effect — only re-runs when searchQuery changes
    useEffect(() => {
        const handle = async () => {
            const rawQ = searchQuery.trim();
            const q = rawQ.toLowerCase();
            const currentSongs = allSongsRef.current;
            if (!q) { setFilteredSongs(currentSongs); return; }

            const local = currentSongs.filter(
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
    }, [searchQuery]); // Only re-run when searchQuery changes, not allSongs

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
