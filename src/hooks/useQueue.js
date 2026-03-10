import { useState, useRef, useCallback } from "react";
import api from "../utils/api";

/**
 * useQueue — manual queue + auto-generated trending queue
 */
export function useQueue({ currentSong, allSongs }) {
    const [manualQueue, setManualQueue] = useState([]);
    const [autoQueue, setAutoQueue] = useState([]);
    const autoQueueLoadedRef = useRef(false);

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

    const addToQueue = (song) => setManualQueue((q) => [...q, song]);

    const getQueue = () => {
        const autoFiltered = autoQueue.filter(s => s.id !== currentSong?.id);
        return [...manualQueue, ...autoFiltered];
    };

    return {
        manualQueue, setManualQueue,
        autoQueue, setAutoQueue, autoQueueLoadedRef,
        fetchAutoQueue, addToQueue, getQueue,
    };
}
