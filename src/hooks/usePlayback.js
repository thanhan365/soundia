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
    const [crossfade, setCrossfade] = useState(() => {
        const saved = localStorage.getItem('soundia_crossfade');
        return saved ? parseInt(saved, 10) : 0; // 0=off, 3/5/8 seconds
    });

    const audioRef = useRef(null);

    // Khởi tạo audio element gắn vào DOM — mobile browser giữ audio chạy nền khi tắt màn hình
    if (!audioRef.current) {
        const audio = document.createElement('audio');
        audio.id = 'soundia-main-audio';
        audio.preload = 'auto';
        audio.setAttribute('playsinline', '');
        audio.setAttribute('webkit-playsinline', '');
        // Ẩn khỏi giao diện nhưng vẫn trong DOM
        audio.style.position = 'fixed';
        audio.style.top = '-9999px';
        audio.style.left = '-9999px';
        audio.style.width = '0';
        audio.style.height = '0';
        audio.style.opacity = '0';
        audio.style.pointerEvents = 'none';
        document.body.appendChild(audio);
        audioRef.current = audio;
    }
    const ytPlayerRef = useRef(null);
    const isYTModeRef = useRef(isYTMode);
    const repeatModeRef = useRef(repeatMode);
    const playNextRef = useRef(null);
    const currentSongRef = useRef(currentSong);
    const playSongRef = useRef(null);
    const ytPlayStartedRef = useRef(false);
    const crossfadeTriggeredRef = useRef(false);
    const crossfadeRef = useRef(crossfade);
    const volumeRef = useRef(volume);
    const sleepTimerRef = useRef(null); // synced from PlayerContext
    const sharedProgressRef = useRef({ time: 0, dur: 0 }); // shared between all ProgressBar instances

    // Sync refs
    useEffect(() => { currentSongRef.current = currentSong; }, [currentSong]);
    useEffect(() => { isYTModeRef.current = isYTMode; }, [isYTMode]);
    useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);
    useEffect(() => { crossfadeRef.current = crossfade; }, [crossfade]);
    useEffect(() => { volumeRef.current = volume; }, [volume]);

    // Crossfade persistence
    useEffect(() => { localStorage.setItem('soundia_crossfade', crossfade.toString()); }, [crossfade]);

    // Volume persistence
    useEffect(() => {
        localStorage.setItem("soundia_volume", volume.toString());
        audioRef.current.volume = volume;
        ytPlayerRef.current?.setVolume(volume);
    }, [volume]);

    const addToRecent = (song) =>
        setRecentHistory((p) => [song, ...p.filter((s) => s.id !== song.id)].slice(0, 30));

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
        const onMeta = () => {
          const dur = audio.duration;
          if (dur && !isNaN(dur) && isFinite(dur)) {
            setDuration(dur);
          } else {
            // Fallback: use song.duration from data (seconds) when browser can't determine
            const songDur = currentSongRef.current?.duration;
            if (songDur && typeof songDur === 'number' && songDur > 0) setDuration(songDur);
            else if (typeof songDur === 'string') {
              const parts = songDur.split(':');
              if (parts.length === 2) setDuration(parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10));
            }
          }
        };
        const onEnd = () => {
            // Crossfade: nếu đã trigger sớm thì không playNext lại
            if (crossfadeTriggeredRef.current) {
                crossfadeTriggeredRef.current = false;
                return;
            }
            // Sleep timer 'end' mode — dừng phát
            if (sleepTimerRef.current === 'end') {
                setIsPlaying(false);
                return;
            }
            if (repeatModeRef.current === "one") {
                if (currentSongRef.current && playSongRef.current) playSongRef.current(currentSongRef.current, true);
            } else { playNextRef.current?.(); }
        };
        const onErr = () => handleAudioError("Không thể phát bài này.");
        const onPlay = () => { if (!isYTModeRef.current) setIsPlaying(true); };
        const onPause = () => { if (!isYTModeRef.current) setIsPlaying(false); };
        const lastReportedDur = { value: 0 }; // track to avoid redundant setDuration on mobile
        const onTimeUpdate = () => {
            if (!isYTModeRef.current && audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
                // Only update context duration when it changes significantly (>1s)
                // Mobile browsers report tiny float variations that cause re-renders
                if (Math.abs(audio.duration - lastReportedDur.value) > 1) {
                    lastReportedDur.value = audio.duration;
                    setDuration(audio.duration);
                }
            }
            // Crossfade: fade out trước khi bài kết thúc
            const cf = crossfadeRef.current;
            if (cf > 0 && !isYTModeRef.current && audio.duration > 0 && !isNaN(audio.duration)) {
                const remaining = audio.duration - audio.currentTime;
                if (remaining <= cf && remaining > 0 && !crossfadeTriggeredRef.current) {
                    crossfadeTriggeredRef.current = true;
                    // Fade out volume dần
                    const fadeSteps = 20;
                    const stepTime = (remaining * 1000) / fadeSteps;
                    const targetVol = volumeRef.current;
                    let step = 0;
                    const fadeInterval = setInterval(() => {
                        step++;
                        const newVol = targetVol * (1 - step / fadeSteps);
                        audio.volume = Math.max(0, newVol);
                        if (step >= fadeSteps) {
                            clearInterval(fadeInterval);
                            audio.volume = targetVol; // restore for next song
                        }
                    }, stepTime);
                    // Trigger next song sớm (crossfade overlap) — unless sleep timer 'end'
                    if (sleepTimerRef.current !== 'end') {
                        setTimeout(() => { playNextRef.current?.(); }, Math.max(0, (remaining - 0.5) * 1000));
                    }
                }
            }
        };

        audio.addEventListener("loadedmetadata", onMeta);
        audio.addEventListener("ended", onEnd);
        audio.addEventListener("error", onErr);
        audio.addEventListener("play", onPlay);
        audio.addEventListener("pause", onPause);
        audio.addEventListener("timeupdate", onTimeUpdate);

        // ── Mobile background resume: khi mở màn hình lại, resume audio nếu bị browser tạm dừng ──
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                // Nếu app nghĩ đang phát nhưng audio thực sự bị pause → resume
                const wasPlayingYT = isYTModeRef.current;
                if (!wasPlayingYT && audio.paused && audio.src && audio.currentTime > 0) {
                    // HTML5 Audio bị browser tạm dừng khi background → resume
                    audio.play().catch(() => {});
                }
            }
        };
        document.addEventListener("visibilitychange", onVisibilityChange);

        return () => {
            audio.removeEventListener("loadedmetadata", onMeta);
            audio.removeEventListener("ended", onEnd);
            audio.removeEventListener("error", onErr);
            audio.removeEventListener("play", onPlay);
            audio.removeEventListener("pause", onPause);
            audio.removeEventListener("timeupdate", onTimeUpdate);
            document.removeEventListener("visibilitychange", onVisibilityChange);
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
            // Sleep timer 'end' mode — dừng phát
            if (sleepTimerRef.current === 'end') {
                setIsPlaying(false);
                return;
            }
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
        recentHistory, crossfade, setCrossfade, crossfadeTriggeredRef,
        audioRef, ytPlayerRef, isYTModeRef, currentSongRef, playSongRef, playNextRef, ytPlayStartedRef, sleepTimerRef, sharedProgressRef,
        addToRecent, handleAudioError,
        handleYTReady, handleYTStateChange, handleYTTimeUpdate, handleYTError,
        togglePlay, seekTo, changeVolume, toggleShuffle, toggleRepeat,
    };
}
