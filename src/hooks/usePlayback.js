import { useState, useRef, useEffect, useCallback } from "react";

/**
 * usePlayback — core playback logic (HTML5 Audio + YouTube IFrame)
 */
export function usePlayback({ showToast }) {
    const [currentSong, setCurrentSong] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(() => {
        const saved = localStorage.getItem("soundia_volume");
        return saved ? parseFloat(saved) : 0.7;
    });
    const [error, setError] = useState(null);
    const [shuffle, setShuffle] = useState(false);
    const [repeatMode, setRepeatMode] = useState("none");
    const [isLoadingStream, setIsLoadingStream] = useState(false);
    const [isYTMode, setIsYTMode] = useState(false);
    const [recentHistory, setRecentHistory] = useState([]);

    const audioRef = useRef(new Audio());
    const ytPlayerRef = useRef(null);
    const isYTModeRef = useRef(isYTMode);
    const repeatModeRef = useRef(repeatMode);
    const playNextRef = useRef(null);
    const currentSongRef = useRef(currentSong);
    const playSongRef = useRef(null);
    const ytPlayStartedRef = useRef(false);

    // Sync refs
    useEffect(() => { currentSongRef.current = currentSong; }, [currentSong]);
    useEffect(() => { isYTModeRef.current = isYTMode; }, [isYTMode]);
    useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);

    // Volume persistence
    useEffect(() => {
        localStorage.setItem("soundia_volume", volume.toString());
        audioRef.current.volume = volume;
        ytPlayerRef.current?.setVolume(volume);
    }, [volume]);

    const addToRecent = (song) =>
        setRecentHistory((p) => [song, ...p.filter((s) => s.id !== song.id)].slice(0, 20));

    const handleAudioError = (msg) => {
        if (isYTModeRef.current) return;
        setIsPlaying(false);
        const song = currentSongRef.current;
        if (song && song.audio !== "YT_STREAM") {
            playSongRef.current?.({ ...song, audio: "YT_STREAM" });
            return;
        }
        setError(msg || "Lỗi phát nhạc.");
        setTimeout(() => setError(null), 3000);
    };

    // HTML5 Audio event listeners (one-time setup)
    useEffect(() => {
        const audio = audioRef.current;
        const onMeta = () => { const dur = audio.duration; if (dur && !isNaN(dur)) setDuration(dur); };
        const onEnd = () => {
            if (repeatModeRef.current === "one") {
                if (currentSongRef.current && playSongRef.current) playSongRef.current(currentSongRef.current, true);
            } else { playNextRef.current?.(); }
        };
        const onErr = () => handleAudioError("Không thể phát bài này.");
        const onPlay = () => { if (!isYTModeRef.current) setIsPlaying(true); };
        const onPause = () => { if (!isYTModeRef.current) setIsPlaying(false); };
        const onTimeUpdate = () => {
            if (!isYTModeRef.current && audio.duration && !isNaN(audio.duration)) setDuration(audio.duration);
        };

        audio.addEventListener("loadedmetadata", onMeta);
        audio.addEventListener("ended", onEnd);
        audio.addEventListener("error", onErr);
        audio.addEventListener("play", onPlay);
        audio.addEventListener("pause", onPause);
        audio.addEventListener("timeupdate", onTimeUpdate);
        return () => {
            audio.removeEventListener("loadedmetadata", onMeta);
            audio.removeEventListener("ended", onEnd);
            audio.removeEventListener("error", onErr);
            audio.removeEventListener("play", onPlay);
            audio.removeEventListener("pause", onPause);
            audio.removeEventListener("timeupdate", onTimeUpdate);
        };
    }, []); // eslint-disable-line

    // YouTube IFrame Callbacks
    const handleYTReady = useCallback(() => { ytPlayerRef.current?.setVolume(volume); }, [volume]);

    const handleYTStateChange = useCallback((state) => {
        if (!isYTModeRef.current) return;
        if (state === 1) {
            ytPlayStartedRef.current = true;
            setIsPlaying(true);
            setIsLoadingStream(false);
        }
        else if (state === 2) { setIsPlaying(false); }
        else if (state === 0) {
            if (repeatModeRef.current === "one") {
                if (currentSongRef.current && playSongRef.current) playSongRef.current(currentSongRef.current, true);
            } else { playNextRef.current?.(); }
        }
        else if (state === 3) {
            // Only show spinner for INITIAL buffering, not mid-song buffering
            if (!ytPlayStartedRef.current) setIsLoadingStream(true);
        }
        else if (state === 5) { setIsPlaying(false); setIsLoadingStream(false); }
        // state -1 (unstarted): do NOT clear loading — song is transitioning
    }, []); // eslint-disable-line

    const handleYTTimeUpdate = useCallback((t, d) => {
        if (d > 0) setDuration(d);
        // Bulletproof: clear spinner when YouTube is actually playing
        if (t > 0.5) {
            if (!ytPlayStartedRef.current) ytPlayStartedRef.current = true;
            setIsLoadingStream(false);
        }
    }, []); // eslint-disable-line

    const handleYTError = useCallback(() => {
        setIsLoadingStream(false);
        setIsPlaying(false);
        handleAudioError("YouTube không thể phát bài này. Thử bài khác.");
    }, []); // eslint-disable-line

    const togglePlay = () => {
        if (!currentSong) return;
        if (isYTMode) {
            if (isPlaying) { ytPlayerRef.current?.pause(); setIsPlaying(false); }
            else { ytPlayerRef.current?.play(); setIsPlaying(true); }
        } else {
            const audio = audioRef.current;
            if (isPlaying) { audio.pause(); }
            else { setIsPlaying(true); audio.play().catch(() => handleAudioError()); }
        }
    };

    const seekTo = (t) => {
        if (isYTMode) { ytPlayerRef.current?.seekTo(t); setCurrentTime(t); }
        else { audioRef.current.currentTime = t; setCurrentTime(t); }
    };

    const changeVolume = (v) => {
        audioRef.current.volume = v;
        ytPlayerRef.current?.setVolume(v);
        setVolume(v);
    };

    const toggleShuffle = () => setShuffle((p) => !p);
    const toggleRepeat = () => setRepeatMode((m) => m === "none" ? "all" : m === "all" ? "one" : "none");

    return {
        currentSong, setCurrentSong, isPlaying, setIsPlaying,
        currentTime, setCurrentTime, duration, setDuration,
        volume, error, setError, shuffle, repeatMode,
        isLoadingStream, setIsLoadingStream, isYTMode, setIsYTMode,
        recentHistory,
        audioRef, ytPlayerRef, isYTModeRef, currentSongRef, playSongRef, playNextRef, ytPlayStartedRef,
        addToRecent, handleAudioError,
        handleYTReady, handleYTStateChange, handleYTTimeUpdate, handleYTError,
        togglePlay, seekTo, changeVolume, toggleShuffle, toggleRepeat,
    };
}
