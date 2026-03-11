import { useState, useEffect, useRef, useCallback } from 'react';

// EQ Presets — gain values for 5 bands [60Hz, 230Hz, 910Hz, 4kHz, 14kHz]
export const EQ_PRESETS = {
    flat:       { name: 'Mặc định',     gains: [0, 0, 0, 0, 0] },
    bass:       { name: 'Bass Boost',   gains: [6, 4, 0, 0, 0] },
    treble:     { name: 'Treble Boost', gains: [0, 0, 0, 4, 6] },
    pop:        { name: 'Pop',          gains: [-1, 2, 4, 2, -1] },
    rock:       { name: 'Rock',         gains: [4, 2, -1, 2, 4] },
    jazz:       { name: 'Jazz',         gains: [3, 1, -2, 1, 3] },
    classical:  { name: 'Classical',    gains: [4, 2, -1, 0, 3] },
    electronic: { name: 'Electronic',   gains: [5, 3, 0, 2, 4] },
    vocal:      { name: 'Vocal',        gains: [-2, 0, 4, 3, -1] },
    hiphop:     { name: 'Hip Hop',      gains: [5, 3, 0, 1, 2] },
};

// 5-band EQ frequencies
const FREQUENCIES = [60, 230, 910, 4000, 14000];
const BAND_LABELS = ['60', '230', '910', '4K', '14K'];

/**
 * useEqualizer — 5-band parametric EQ using Web Audio API
 * Connects to an HTML5 Audio element via audioRef
 */
export function useEqualizer(audioRef) {
    const [eqEnabled, setEqEnabled] = useState(() => {
        return localStorage.getItem('soundia_eq_enabled') === 'true';
    });
    const [activePreset, setActivePreset] = useState(() => {
        return localStorage.getItem('soundia_eq_preset') || 'flat';
    });
    const [gains, setGains] = useState(() => {
        const saved = localStorage.getItem('soundia_eq_gains');
        if (saved) {
            try { return JSON.parse(saved); } catch { }
        }
        return [0, 0, 0, 0, 0];
    });

    const audioContextRef = useRef(null);
    const sourceNodeRef = useRef(null);
    const filtersRef = useRef([]);
    const connectedRef = useRef(false);

    // Initialize Web Audio API and create filter nodes
    const initEQ = useCallback(() => {
        if (connectedRef.current || !audioRef.current) return;

        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!audioContextRef.current) {
                audioContextRef.current = new AudioCtx();
            }
            const ctx = audioContextRef.current;

            // Create source from audio element (only once)
            if (!sourceNodeRef.current) {
                sourceNodeRef.current = ctx.createMediaElementSource(audioRef.current);
            }

            // Create 5-band BiquadFilter nodes
            const filters = FREQUENCIES.map((freq, i) => {
                const filter = ctx.createBiquadFilter();
                filter.type = i === 0 ? 'lowshelf' : i === FREQUENCIES.length - 1 ? 'highshelf' : 'peaking';
                filter.frequency.value = freq;
                filter.Q.value = 1.0;
                filter.gain.value = eqEnabled ? gains[i] : 0;
                return filter;
            });

            // Chain: source → filter[0] → filter[1] → ... → destination
            sourceNodeRef.current.connect(filters[0]);
            for (let i = 0; i < filters.length - 1; i++) {
                filters[i].connect(filters[i + 1]);
            }
            filters[filters.length - 1].connect(ctx.destination);

            filtersRef.current = filters;
            connectedRef.current = true;
        } catch (err) {
            console.warn('[EQ] Failed to initialize:', err.message);
        }
    }, [audioRef, eqEnabled, gains]);

    // Resume audio context on user interaction
    useEffect(() => {
        const resumeCtx = () => {
            if (audioContextRef.current?.state === 'suspended') {
                audioContextRef.current.resume();
            }
        };
        document.addEventListener('click', resumeCtx, { once: true });
        return () => document.removeEventListener('click', resumeCtx);
    }, []);

    // Initialize EQ when audio starts playing
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handlePlay = () => {
            if (!connectedRef.current) initEQ();
            if (audioContextRef.current?.state === 'suspended') {
                audioContextRef.current.resume();
            }
        };

        audio.addEventListener('play', handlePlay);
        // If already playing, init now
        if (!audio.paused && !connectedRef.current) initEQ();

        return () => audio.removeEventListener('play', handlePlay);
    }, [audioRef, initEQ]);

    // Apply gain values to filters
    useEffect(() => {
        filtersRef.current.forEach((filter, i) => {
            if (filter) {
                filter.gain.value = eqEnabled ? (gains[i] || 0) : 0;
            }
        });
    }, [gains, eqEnabled]);

    // Persistence
    useEffect(() => {
        localStorage.setItem('soundia_eq_enabled', eqEnabled.toString());
    }, [eqEnabled]);

    useEffect(() => {
        localStorage.setItem('soundia_eq_preset', activePreset);
    }, [activePreset]);

    useEffect(() => {
        localStorage.setItem('soundia_eq_gains', JSON.stringify(gains));
    }, [gains]);

    // Set a specific band gain
    const setBandGain = useCallback((bandIndex, value) => {
        setGains(prev => {
            const next = [...prev];
            next[bandIndex] = Math.max(-12, Math.min(12, value));
            return next;
        });
        setActivePreset('custom');
    }, []);

    // Apply a preset
    const applyPreset = useCallback((presetKey) => {
        const preset = EQ_PRESETS[presetKey];
        if (preset) {
            setGains([...preset.gains]);
            setActivePreset(presetKey);
        }
    }, []);

    // Toggle EQ on/off
    const toggleEQ = useCallback(() => {
        setEqEnabled(prev => !prev);
    }, []);

    return {
        eqEnabled, toggleEQ,
        gains, setBandGain,
        activePreset, applyPreset,
        frequencies: FREQUENCIES,
        bandLabels: BAND_LABELS,
        presets: EQ_PRESETS,
    };
}
