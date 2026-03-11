import { useState, useEffect, useMemo } from 'react';
import { usePlayer } from '../../context/PlayerContext';
import { HiPlay } from 'react-icons/hi2';
import { HiSparkles } from 'react-icons/hi';

/**
 * DailyMixSection — Gợi ý bài hát dựa trên lịch sử nghe gần đây
 * Phân tích artists phổ biến → hiển thị 3 "Daily Mix" playlists
 */
export default function DailyMixSection() {
    const { recentHistory, allSongs, playSong, addToQueue, currentSong } = usePlayer();

    // Phân tích top artists từ recent history
    const mixes = useMemo(() => {
        if (recentHistory.length < 2 && allSongs.length === 0) return [];

        // Count artist frequencies from recent + all songs
        const artistCounts = {};
        const artistSongs = {};

        // Prioritize recent history
        recentHistory.forEach((song, i) => {
            const artist = song.artist?.trim();
            if (!artist) return;
            artistCounts[artist] = (artistCounts[artist] || 0) + (10 - Math.min(i, 9)); // Weight by recency
            if (!artistSongs[artist]) artistSongs[artist] = [];
            if (!artistSongs[artist].find(s => s.id === song.id)) {
                artistSongs[artist].push(song);
            }
        });

        // Add songs from allSongs for these artists
        Object.keys(artistCounts).forEach(artist => {
            allSongs.forEach(song => {
                if (song.artist?.trim() === artist && !artistSongs[artist]?.find(s => s.id === song.id)) {
                    if (!artistSongs[artist]) artistSongs[artist] = [];
                    artistSongs[artist].push(song);
                }
            });
        });

        // Sort artists by frequency
        const sortedArtists = Object.entries(artistCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 9); // Top 9 artists

        if (sortedArtists.length < 2) {
            // Not enough data — use random songs from allSongs
            const shuffled = [...allSongs].sort(() => Math.random() - 0.5);
            return [{
                id: 'discover',
                title: 'Khám Phá Mới',
                subtitle: 'Bài hát ngẫu nhiên cho bạn',
                songs: shuffled.slice(0, 8),
                gradient: 'from-purple-600 to-indigo-700',
                icon: '✨',
            }];
        }

        // Group artists into 3 mixes (3 artists each)
        const gradients = [
            'from-emerald-600 to-cyan-700',
            'from-purple-600 to-pink-700',
            'from-orange-500 to-red-600',
        ];
        const mixNames = ['Daily Mix 1', 'Daily Mix 2', 'Daily Mix 3'];
        const icons = ['🎵', '🎶', '🎸'];

        const result = [];
        for (let i = 0; i < Math.min(3, Math.ceil(sortedArtists.length / 3)); i++) {
            const groupArtists = sortedArtists.slice(i * 3, i * 3 + 3);
            const songs = [];
            groupArtists.forEach(([artist]) => {
                const aSongs = artistSongs[artist] || [];
                songs.push(...aSongs.slice(0, 4)); // Max 4 songs per artist
            });

            // Deduplicate and shuffle
            const uniqueSongs = [];
            const seenIds = new Set();
            songs.forEach(s => {
                if (!seenIds.has(s.id)) {
                    seenIds.add(s.id);
                    uniqueSongs.push(s);
                }
            });
            const shuffled = uniqueSongs.sort(() => Math.random() - 0.5).slice(0, 8);

            if (shuffled.length >= 2) {
                result.push({
                    id: `mix-${i + 1}`,
                    title: mixNames[i],
                    subtitle: groupArtists.map(([a]) => a).join(', '),
                    songs: shuffled,
                    gradient: gradients[i],
                    icon: icons[i],
                });
            }
        }

        return result;
    }, [recentHistory, allSongs]);

    const handlePlayMix = (mix) => {
        if (mix.songs.length === 0) return;
        playSong(mix.songs[0]);
        mix.songs.slice(1).forEach(s => addToQueue(s));
    };

    if (mixes.length === 0) return null;

    return (
        <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
                <HiSparkles className="text-neon text-lg" />
                <h2 className="text-lg sm:text-xl font-bold text-white">Daily Mix</h2>
                <span className="text-[11px] text-gray-500 ml-1">Dựa trên lịch sử nghe</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {mixes.map(mix => (
                    <div
                        key={mix.id}
                        className={`group relative rounded-xl overflow-hidden bg-gradient-to-br ${mix.gradient} p-4 cursor-pointer hover:scale-[1.02] transition-transform`}
                        onClick={() => handlePlayMix(mix)}
                    >
                        {/* Play overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100">
                                <HiPlay className="text-white text-xl ml-0.5" />
                            </div>
                        </div>

                        {/* Content */}
                        <div className="relative z-10">
                            <span className="text-2xl mb-2 block">{mix.icon}</span>
                            <h3 className="text-white font-bold text-base mb-1">{mix.title}</h3>
                            <p className="text-white/70 text-[12px] line-clamp-1">{mix.subtitle}</p>
                            <p className="text-white/40 text-[10px] mt-2">{mix.songs.length} bài hát</p>
                        </div>

                        {/* Mini cover art grid */}
                        <div className="absolute top-3 right-3 grid grid-cols-2 gap-0.5 w-14 h-14 rounded-lg overflow-hidden opacity-60">
                            {mix.songs.slice(0, 4).map((s, i) => (
                                <img
                                    key={i}
                                    src={s.cover || s.coverUrl}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    onError={e => e.target.style.display = 'none'}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
