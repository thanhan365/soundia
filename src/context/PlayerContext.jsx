import { createContext, useContext, useState, useRef, useEffect } from "react";
import songs from "../data/songs";

const PlayerContext = createContext();

export function PlayerProvider({ children }) {
  const [songList] = useState(songs);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const audioRef = useRef(new Audio());

  useEffect(() => {
    const audio = audioRef.current;
    audio.volume = volume;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => playNext();

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [currentSong]);

  const playSong = (song) => {
    const audio = audioRef.current;
    if (currentSong?.id === song.id) {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        audio.play();
        setIsPlaying(true);
      }
      return;
    }
    setCurrentSong(song);
    audio.src = song.audio;
    audio.load();
    audio.play().then(() => setIsPlaying(true)).catch(() => {});
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!currentSong) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const playNext = () => {
    if (!currentSong) return;
    const idx = songList.findIndex((s) => s.id === currentSong.id);
    const next = songList[(idx + 1) % songList.length];
    playSong(next);
  };

  const playPrev = () => {
    if (!currentSong) return;
    const idx = songList.findIndex((s) => s.id === currentSong.id);
    const prev = songList[(idx - 1 + songList.length) % songList.length];
    playSong(prev);
  };

  const seekTo = (time) => {
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const changeVolume = (vol) => {
    audioRef.current.volume = vol;
    setVolume(vol);
  };

  return (
    <PlayerContext.Provider
      value={{
        songList,
        currentSong,
        isPlaying,
        currentTime,
        duration,
        volume,
        playSong,
        togglePlay,
        playNext,
        playPrev,
        seekTo,
        changeVolume,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) throw new Error("usePlayer must be used within PlayerProvider");
  return context;
}
