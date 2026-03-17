import { useState, useRef, useCallback, useEffect } from "react";
import api from "../utils/api";

/**
 * useQueue — manual queue + context-aware smart auto-queue
 * 
 * Smart refill priority:
 * 1. playContext songs (playlist, album, artist page songs)
 * 2. NCT search by current song's artist
 * 3. NCT top trending
 * 4. Local DB songs (allSongs)
 */
export function useQueue({ currentSong, allSongs }) {
    const [manualQueue, setManualQueue] = useState([]);
    const [autoQueue, setAutoQueue] = useState([]);
    const autoQueueLoadedRef = useRef(false);
    const refillInProgressRef = useRef(false);
    const lastRefillKeyRef = useRef("");
    // Play context: songs from the page/playlist/album/artist the user is listening from
    const playContextRef = useRef([]);

    const setPlayContext = useCallback((songs, playingSongId) => {
        playContextRef.current = songs || [];
        // Immediately populate autoQueue with context songs
        if (songs && songs.length > 0) {
            // Use explicit playingSongId if provided (avoids stale currentSong closure)
            const excludeId = playingSongId ?? currentSong?.id;
            const filtered = songs.filter(s => s.id !== excludeId);
            setAutoQueue(filtered);
            lastRefillKeyRef.current = ""; // reset so refill can happen later
        }
    }, [currentSong?.id]);

    const fetchAutoQueue = useCallback(async () => {
        if (autoQueueLoadedRef.current) return;
        autoQueueLoadedRef.current = true;
        try {
            const res = await api.get("/songs/nct-top");
            if (res?.data?.success && res?.data?.data) {
                const shuffled = [...res.data.data].sort(() => Math.random() - 0.5);
                setAutoQueue(shuffled.slice(0, 20));
            }
        } catch (err) { console.error("Failed to fetch auto queue:", err); }
    }, []);

    // Smart refill: when autoQueue drops below 5, auto-populate
    useEffect(() => {
        if (!currentSong || refillInProgressRef.current) return;
        if (autoQueue.length >= 5) return;

        const refillKey = `${currentSong.id}_${currentSong.artist}`;
        if (lastRefillKeyRef.current === refillKey && autoQueue.length > 0) return;

        const refill = async () => {
            refillInProgressRef.current = true;
            try {
                const existingIds = new Set([
                    ...autoQueue.map(s => s.id),
                    ...manualQueue.map(s => s.id),
                    currentSong.id
                ]);
                let newSongs = [];

                // ═══ Strategy 1: Use playContext (playlist/album/artist page songs) ═══
                const contextSongs = playContextRef.current;
                if (contextSongs.length > 0) {
                    const fromContext = contextSongs
                        .filter(s => !existingIds.has(s.id))
                        .slice(0, 20);
                    newSongs.push(...fromContext);
                    fromContext.forEach(s => existingIds.add(s.id));
                }

                // ═══ Strategy 2: Search NCT for songs by current artist ═══
                if (newSongs.length < 10) {
                    try {
                        const artist = currentSong.artist || "";
                        const searchRes = await api.get(`/songs/nct-search?keyword=${encodeURIComponent(artist)}&limit=20`);
                        if (searchRes?.data?.success && searchRes?.data?.data) {
                            const nctSongs = searchRes.data.data
                                .filter(s => !existingIds.has(s.id) && s.title !== currentSong.title)
                                .sort(() => Math.random() - 0.5)
                                .slice(0, 15 - newSongs.length);
                            newSongs.push(...nctSongs);
                            nctSongs.forEach(s => existingIds.add(s.id));
                        }
                    } catch { /* ignore */ }
                }

                // ═══ Strategy 3: NCT top trending ═══
                if (newSongs.length < 10) {
                    try {
                        const topRes = await api.get("/songs/nct-top");
                        if (topRes?.data?.success && topRes?.data?.data) {
                            const topSongs = topRes.data.data
                                .filter(s => !existingIds.has(s.id))
                                .sort(() => Math.random() - 0.5)
                                .slice(0, 15 - newSongs.length);
                            newSongs.push(...topSongs);
                            topSongs.forEach(s => existingIds.add(s.id));
                        }
                    } catch { /* ignore */ }
                }

                // ═══ Strategy 4: Fallback to allSongs (local DB) ═══
                if (newSongs.length === 0 && allSongs.length > 0) {
                    const localSongs = allSongs
                        .filter(s => !existingIds.has(s.id))
                        .sort(() => Math.random() - 0.5)
                        .slice(0, 15);
                    newSongs.push(...localSongs);
                }

                if (newSongs.length > 0) {
                    setAutoQueue(prev => {
                        const prevIds = new Set(prev.map(s => s.id));
                        const unique = newSongs.filter(s => !prevIds.has(s.id));
                        return [...prev, ...unique];
                    });
                }
                lastRefillKeyRef.current = refillKey;
            } catch (err) {
                console.error("Failed to refill auto queue:", err);
            } finally {
                refillInProgressRef.current = false;
            }
        };

        const timer = setTimeout(refill, 1500);
        return () => clearTimeout(timer);
    }, [currentSong?.id, autoQueue.length]); // eslint-disable-line

    const addToQueue = (song) => setManualQueue((q) => [...q, song]);

    const reorderAutoQueue = useCallback((fromIndex, toIndex) => {
        setAutoQueue(prev => {
            const filtered = prev.filter(s => s.id !== currentSong?.id);
            const newArr = [...filtered];
            const [moved] = newArr.splice(fromIndex, 1);
            newArr.splice(toIndex, 0, moved);
            return newArr;
        });
    }, [currentSong?.id]);

    const removeFromAutoQueue = useCallback((index) => {
        setAutoQueue(prev => {
            const filtered = prev.filter(s => s.id !== currentSong?.id);
            return filtered.filter((_, i) => i !== index);
        });
    }, [currentSong?.id]);

    const getQueue = () => {
        const autoFiltered = autoQueue.filter(s => s.id !== currentSong?.id);
        return [...manualQueue, ...autoFiltered];
    };

    return {
        manualQueue, setManualQueue,
        autoQueue, setAutoQueue, autoQueueLoadedRef,
        fetchAutoQueue, addToQueue, getQueue,
        setPlayContext, reorderAutoQueue, removeFromAutoQueue,
    };
}
