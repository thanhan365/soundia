import React, { useState, useEffect } from "react";
import { usePlayer } from "../context/PlayerContext";

// Import Original Sections
import BannerSlider from "../components/BannerSlider";

// Import New Sections
import TrendingSection from "../components/home/TrendingSection";
import TopTrendingSection from "../components/home/TopTrendingSection";
import MoodGenreSection from "../components/home/MoodGenreSection";

import ArtistSection from "../components/home/ArtistSection";
import SuggestedPlaylistSection from "../components/home/SuggestedPlaylistSection";
import RecentlyPlayed from "../components/home/RecentlyPlayed";
import RandomDiscovery from "../components/home/RandomDiscovery";
import api from "../utils/api";

export default function Home() {
  const { error, allSongs, playSong, recentHistory } = usePlayer();
  const [newReleaseSongs, setNewReleaseSongs] = useState([]);

  // Use recent history from context
  const recentSongs = recentHistory || [];

  // Fetch new releases from iTunes API
  useEffect(() => {
    const fetchNewReleases = async () => {
      try {
        const res = await api.get("/songs/itunes-proxy?term=" + encodeURIComponent("nhạc mới việt nam") + "&entity=song&country=VN&limit=14");
        if (res?.data?.results) {
          const songs = res.data.results
            .filter(s => s.trackId && s.trackName)
            .map(s => ({
              id: `itunes_${s.trackId}`,
              title: s.trackName,
              artist: s.artistName || "Unknown",
              cover: (s.artworkUrl100 || "").replace("100x100", "600x600"),
              audio: s.previewUrl || "YT_STREAM",
              duration: s.trackTimeMillis ? Math.round(s.trackTimeMillis / 1000) : 0,
              source: "itunes",
              isExternal: true,
            }));
          setNewReleaseSongs(songs.slice(0, 14));
        }
      } catch (err) { console.error("Failed to fetch new releases", err); }
    };
    fetchNewReleases();
  }, []);

  const handleRandomDiscover = () => {
    if (allSongs.length > 0) {
      const randomIndex = Math.floor(Math.random() * allSongs.length);
      playSong(allSongs[randomIndex]);
    }
  };

  return (
    <div className="min-h-screen text-white pb-32 overflow-hidden">
      {/* Error Toast */}
      {error && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-red-500/80 backdrop-blur-md border border-red-400 text-white px-6 py-3 rounded-full shadow-2xl animate-bounce text-sm font-medium">
          {error}
        </div>
      )}

      {/* Banner / Hero Section using old slider mechanics */}
      <BannerSlider />

      {/* Main Content Area */}
      <div className="px-2 sm:px-4 md:px-6 lg:px-8 space-y-4 md:space-y-8 mt-3 sm:mt-4">

        {/* Random Discovery Widget */}
        <RandomDiscovery onDiscover={handleRandomDiscover} />

        {/* Moods & Genres Grid */}
        <MoodGenreSection />

        {/* Top Trending from iTunes/NCT */}
        <TopTrendingSection />


        {/* Playlist Gợi Ý */}
        <SuggestedPlaylistSection />

        {/* Artists */}
        <ArtistSection />

        {/* Mới Phát Hành — iTunes API */}
        {newReleaseSongs.length > 0 && (
          <TrendingSection songs={newReleaseSongs} title="Đề Xuất Nghe Thử" />
        )}

        {/* Recently Played History */}
        {recentSongs.length > 0 && <RecentlyPlayed songs={recentSongs} />}

      </div>
    </div>
  );
}

