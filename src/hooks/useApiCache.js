import { useState, useRef, useCallback } from "react";

/**
 * useApiCache — simple in-memory cache with TTL
 * Usage: const { cachedFetch } = useApiCache();
 *        const data = await cachedFetch("trending", () => api.get("/songs/nct-top"), 5 * 60 * 1000);
 */

const globalCache = new Map();

export function useApiCache() {
    const cachedFetch = useCallback(async (key, fetchFn, ttl = 5 * 60 * 1000) => {
        const cached = globalCache.get(key);
        if (cached && Date.now() - cached.timestamp < ttl) {
            return cached.data;
        }

        try {
            const data = await fetchFn();
            globalCache.set(key, { data, timestamp: Date.now() });
            return data;
        } catch (error) {
            // Return stale data if available
            if (cached) return cached.data;
            throw error;
        }
    }, []);

    const invalidate = useCallback((key) => {
        if (key) globalCache.delete(key);
        else globalCache.clear();
    }, []);

    return { cachedFetch, invalidate };
}
