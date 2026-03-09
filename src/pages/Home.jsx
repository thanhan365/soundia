import React from "react";
import { usePlayer } from "../context/PlayerContext";

// Import Original Sections
import BannerSlider from "../components/BannerSlider";

// Import New Sections
import TrendingSection from "../components/home/TrendingSection";
import TopTrendingSection from "../components/home/TopTrendingSection";
import MoodGenreSection from "../components/home/MoodGenreSection";
import PlaylistSection from "../components/home/PlaylistSection";
import ArtistSection from "../components/home/ArtistSection";
import SuggestedPlaylistSection from "../components/home/SuggestedPlaylistSection";
import RecentlyPlayed from "../components/home/RecentlyPlayed";
import RandomDiscovery from "../components/home/RandomDiscovery";
export default function Home() {
  const { error, allSongs, playSong, recentHistory } = usePlayer();

  // We no longer need featuredSong and trendingSongs since BannerSlider and SongList handle them
  const newReleaseSongs = allSongs.slice(7, 13);

  // Use recent history from context
  const recentSongs = recentHistory || [];

  const handleRandomDiscover = () => {
    if (allSongs.length > 0) {
      const randomIndex = Math.floor(Math.random() * allSongs.length);
      playSong(allSongs[randomIndex]);
    }
  };

  return (
    <div className="min-h-screen text-white pb-32">
      {/* Error Toast */}
      {error && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-red-500/80 backdrop-blur-md border border-red-400 text-white px-6 py-3 rounded-full shadow-2xl animate-bounce text-sm font-medium">
          {error}
        </div>
      )}

      {/* Banner / Hero Section using old slider mechanics */}
      <BannerSlider />

      {/* Main Content Area */}
      <div className="mx-auto px-4 sm:px-6 md:px-8 max-w-7xl space-y-6 md:space-y-8 mt-4">

        {/* Random Discovery Widget */}
        <RandomDiscovery onDiscover={handleRandomDiscover} />

        {/* Moods & Genres Grid */}
        <MoodGenreSection />

        {/* Top Trending from iTunes/NCT */}
        <TopTrendingSection />

        {/* Playlists */}
        <PlaylistSection />

        {/* Playlist Gợi Ý */}
        <SuggestedPlaylistSection />

        {/* Artists */}
        <ArtistSection />

        {/* More Songs */}
        {newReleaseSongs.length > 0 && (
          <TrendingSection songs={newReleaseSongs} title="Mới Phát Hành" />
        )}

        {/* Recently Played History */}
        {recentSongs.length > 0 && <RecentlyPlayed songs={recentSongs} />}

      </div>
    </div>
  );
}

