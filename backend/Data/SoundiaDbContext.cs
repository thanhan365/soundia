using Microsoft.EntityFrameworkCore;
using Soundia.Api.Models;

namespace Soundia.Api.Data
{
    public class SoundiaDbContext : DbContext
    {
        public SoundiaDbContext(DbContextOptions<SoundiaDbContext> options)
            : base(options)
        {
        }

        public DbSet<User> Users { get; set; } = null!;
        public DbSet<Song> Songs { get; set; } = null!;
        public DbSet<Favorite> Favorites { get; set; } = null!;
        public DbSet<Playlist> Playlists { get; set; } = null!;
        public DbSet<PlaylistSong> PlaylistSongs { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Configure Many-to-Many for PlaylistSong
            modelBuilder.Entity<PlaylistSong>()
                .HasKey(ps => new { ps.PlaylistId, ps.SongId });

            modelBuilder.Entity<PlaylistSong>()
                .HasOne(ps => ps.Playlist)
                .WithMany(p => p.PlaylistSongs)
                .HasForeignKey(ps => ps.PlaylistId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<PlaylistSong>()
                .HasOne(ps => ps.Song)
                .WithMany(s => s.PlaylistSongs)
                .HasForeignKey(ps => ps.SongId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configure One-to-Many for User -> Favorites
            modelBuilder.Entity<Favorite>()
                .HasOne(f => f.User)
                .WithMany(u => u.Favorites)
                .HasForeignKey(f => f.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Favorite>()
                .HasOne(f => f.Song)
                .WithMany(s => s.Favorites)
                .HasForeignKey(f => f.SongId)
                .OnDelete(DeleteBehavior.Cascade);

            // Seed Songs
            modelBuilder.Entity<Song>().HasData(
                new Song { Id = 1, Title = "Midnight Pulse", Artist = "NeonWave", Duration = "3:42", CoverUrl = "https://picsum.photos/seed/song1/300/300", AudioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
                new Song { Id = 2, Title = "Electric Dreams", Artist = "SynthCity", Duration = "4:15", CoverUrl = "https://picsum.photos/seed/song2/300/300", AudioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
                new Song { Id = 3, Title = "Cyber Horizon", Artist = "Digital Aura", Duration = "3:58", CoverUrl = "https://picsum.photos/seed/song3/300/300", AudioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
                new Song { Id = 4, Title = "Neon Lights", Artist = "Futura", Duration = "4:32", CoverUrl = "https://picsum.photos/seed/song4/300/300", AudioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
                new Song { Id = 5, Title = "Starfall", Artist = "Cosmos", Duration = "3:21", CoverUrl = "https://picsum.photos/seed/song5/300/300", AudioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3" },
                new Song { Id = 6, Title = "Retrograde", Artist = "Velocity", Duration = "5:07", CoverUrl = "https://picsum.photos/seed/song6/300/300", AudioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3" },
                new Song { Id = 7, Title = "Binary Sunset", Artist = "CodeBreaker", Duration = "4:44", CoverUrl = "https://picsum.photos/seed/song7/300/300", AudioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3" },
                new Song { Id = 8, Title = "Quantum Beat", Artist = "Particle", Duration = "3:33", CoverUrl = "https://picsum.photos/seed/song8/300/300", AudioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3" },
                new Song { Id = 9, Title = "Void Walker", Artist = "DarkMatter", Duration = "4:19", CoverUrl = "https://picsum.photos/seed/song9/300/300", AudioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3" },
                new Song { Id = 10, Title = "Aurora", Artist = "Skyline", Duration = "3:56", CoverUrl = "https://picsum.photos/seed/song10/300/300", AudioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3" },
                new Song { Id = 11, Title = "Midnight Pulse", Artist = "NeonWave", Duration = "3:42", CoverUrl = "https://picsum.photos/seed/song1/300/300", AudioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
                new Song { Id = 12, Title = "Electric Dreams", Artist = "SynthCity", Duration = "4:15", CoverUrl = "https://picsum.photos/seed/song2/300/300", AudioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
                new Song { Id = 13, Title = "Cyber Horizon", Artist = "Digital Aura", Duration = "3:58", CoverUrl = "https://picsum.photos/seed/song3/300/300", AudioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
                new Song { Id = 14, Title = "Neon Lights", Artist = "Futura", Duration = "4:32", CoverUrl = "https://picsum.photos/seed/song4/300/300", AudioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
                new Song { Id = 15, Title = "Starfall", Artist = "Cosmos", Duration = "3:21", CoverUrl = "https://picsum.photos/seed/song5/300/300", AudioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3" },
                new Song { Id = 16, Title = "Retrograde", Artist = "Velocity", Duration = "5:07", CoverUrl = "https://picsum.photos/seed/song6/300/300", AudioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3" },
                new Song { Id = 17, Title = "Binary Sunset", Artist = "CodeBreaker", Duration = "4:44", CoverUrl = "https://picsum.photos/seed/song7/300/300", AudioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3" },
                new Song { Id = 18, Title = "Quantum Beat", Artist = "Particle", Duration = "3:33", CoverUrl = "https://picsum.photos/seed/song8/300/300", AudioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3" },
                new Song { Id = 19, Title = "Void Walker", Artist = "DarkMatter", Duration = "4:19", CoverUrl = "https://picsum.photos/seed/song9/300/300", AudioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3" },
                new Song { Id = 20, Title = "Aurora", Artist = "Skyline", Duration = "3:56", CoverUrl = "https://picsum.photos/seed/song10/300/300", AudioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3" },
                new Song { Id = 21, Title = "Lướt Qua Tim Anh", Artist = "Suno", Duration = "2:29", CoverUrl = "https://picsum.photos/seed/song3/300/300", AudioUrl = "/audio/LƯỚT QUA TIM ANH.mp3" }
            );
        }
    }
}
