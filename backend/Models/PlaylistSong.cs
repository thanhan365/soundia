using System;

namespace Soundia.Api.Models
{
    public class PlaylistSong
    {
        public int PlaylistId { get; set; }
        public int SongId { get; set; }

        public DateTime AddedAt { get; set; } = DateTime.UtcNow;

        // Navigation Properties
        public Playlist Playlist { get; set; } = null!;
        public Song Song { get; set; } = null!;
    }
}
