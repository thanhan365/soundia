using System;
using System.ComponentModel.DataAnnotations;

namespace Soundia.Api.Models
{
    public class ListeningHistory
    {
        public int Id { get; set; }

        public int UserId { get; set; }
        public User User { get; set; } = null!;

        public int? SongId { get; set; }
        public Song? Song { get; set; }

        // For external songs not in DB
        [MaxLength(200)]
        public string? ExternalTitle { get; set; }

        [MaxLength(200)]
        public string? ExternalArtist { get; set; }

        [MaxLength(500)]
        public string? ExternalCoverUrl { get; set; }

        public DateTime PlayedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Duration listened in seconds
        /// </summary>
        public int DurationListened { get; set; }
    }
}
