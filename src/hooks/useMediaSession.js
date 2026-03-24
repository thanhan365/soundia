import { useEffect } from "react";

/**
 * useMediaSession — enables lock screen controls + background playback on mobile
 * - Android Chrome PWA: full background playback + notification media controls
 * - iOS Safari: Control Center controls + background audio when minimized
 */
export function useMediaSession({ currentSong, currentSongRef, isPlaying, togglePlay, playNext, playPrev, seekTo, audioRef, isYTModeRef, ytPlayerRef }) {
  // Update media session metadata when song changes
  useEffect(() => {
    if (!("mediaSession" in navigator) || !currentSong) return;

    const artwork = [];
    if (currentSong.cover) {
      artwork.push(
        { src: currentSong.cover, sizes: "96x96", type: "image/jpeg" },
        { src: currentSong.cover, sizes: "128x128", type: "image/jpeg" },
        { src: currentSong.cover, sizes: "192x192", type: "image/jpeg" },
        { src: currentSong.cover, sizes: "256x256", type: "image/jpeg" },
        { src: currentSong.cover, sizes: "384x384", type: "image/jpeg" },
        { src: currentSong.cover, sizes: "512x512", type: "image/jpeg" }
      );
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.title || "Soundia",
      artist: currentSong.artist || "",
      album: "Soundia",
      artwork,
    });
  }, [currentSong?.id, currentSong?.title, currentSong?.artist, currentSong?.cover]);

  // Update playback state
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  // Register action handlers (play/pause/next/prev/seekto)
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    const handlers = {
      play: () => togglePlay(),
      pause: () => togglePlay(),
      previoustrack: () => playPrev(),
      nexttrack: () => playNext(),
      seekto: (details) => {
        if (details.seekTime != null) {
          seekTo(details.seekTime);
        }
      },
      seekbackward: (details) => {
        const skipTime = details.seekOffset || 10;
        const current = isYTModeRef?.current
          ? (typeof ytPlayerRef?.current?.getCurrentTime === 'function' ? ytPlayerRef.current.getCurrentTime() : 0)
          : (audioRef?.current?.currentTime || 0);
        seekTo(Math.max(0, current - skipTime));
      },
      seekforward: (details) => {
        const skipTime = details.seekOffset || 10;
        const current = isYTModeRef?.current
          ? (typeof ytPlayerRef?.current?.getCurrentTime === 'function' ? ytPlayerRef.current.getCurrentTime() : 0)
          : (audioRef?.current?.currentTime || 0);
        seekTo(current + skipTime);
      },
    };

    for (const [action, handler] of Object.entries(handlers)) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Some actions not supported on all platforms
      }
    }

    return () => {
      for (const action of Object.keys(handlers)) {
        try { navigator.mediaSession.setActionHandler(action, null); } catch {}
      }
    };
  }, [togglePlay, playNext, playPrev, seekTo]);

  // Update position state periodically (for lock screen progress bar)
  useEffect(() => {
    if (!("mediaSession" in navigator) || !navigator.mediaSession.setPositionState) return;
    if (!currentSong) return;

    const updatePosition = () => {
      try {
        let currentTime = 0, duration = 0;
        if (isYTModeRef?.current) {
          const yt = ytPlayerRef?.current;
          if (yt) {
            currentTime = typeof yt.getCurrentTime === 'function' ? yt.getCurrentTime() : 0;
            duration = typeof yt.getDuration === 'function' ? yt.getDuration() : 0;
          }
        } else {
          const audio = audioRef?.current;
          if (audio) {
            currentTime = audio.currentTime || 0;
            duration = isFinite(audio.duration) ? audio.duration : 0;
          }
        }
        if (duration > 0 && currentTime >= 0) {
          navigator.mediaSession.setPositionState({
            duration,
            playbackRate: 1,
            position: Math.min(currentTime, duration),
          });
        }
      } catch {}
    };

    // Update every second when playing
    const interval = setInterval(updatePosition, 1000);
    updatePosition(); // initial
    return () => clearInterval(interval);
  }, [currentSong?.id, isPlaying]);

  // Safety net: khi audio thực sự phát, đảm bảo notification tồn tại
  useEffect(() => {
    const audio = audioRef?.current;
    if (!audio || !("mediaSession" in navigator)) return;
    const onAudioPlaying = () => {
      // Dùng ref thay closure — luôn đúng bài dù React không re-render (screen off)
      const song = currentSongRef?.current;
      if (!song) return;
      const artwork = [];
      if (song.cover) {
        artwork.push(
          { src: song.cover, sizes: "96x96", type: "image/jpeg" },
          { src: song.cover, sizes: "192x192", type: "image/jpeg" },
          { src: song.cover, sizes: "512x512", type: "image/jpeg" }
        );
      }
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title || "Soundia",
        artist: song.artist || "",
        album: "Soundia",
        artwork,
      });
      navigator.mediaSession.playbackState = "playing";
    };
    audio.addEventListener('playing', onAudioPlaying);
    return () => audio.removeEventListener('playing', onAudioPlaying);
  }, [currentSong?.id, currentSong?.title, currentSong?.artist, currentSong?.cover]);
}
