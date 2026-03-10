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
        public DbSet<ListeningHistory> ListeningHistories { get; set; } = null!;

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

            // Configure One-to-Many for User -> ListeningHistory
            modelBuilder.Entity<ListeningHistory>()
                .HasOne(lh => lh.User)
                .WithMany(u => u.ListeningHistories)
                .HasForeignKey(lh => lh.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ListeningHistory>()
                .HasOne(lh => lh.Song)
                .WithMany()
                .HasForeignKey(lh => lh.SongId)
                .OnDelete(DeleteBehavior.SetNull);
        }
    }
}
