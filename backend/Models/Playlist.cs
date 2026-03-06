using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Soundia.Api.Models
{
    public class Playlist
    {
        public int Id { get; set; }

        public int UserId { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation Properties
        public User User { get; set; } = null!;
        public ICollection<PlaylistSong> PlaylistSongs { get; set; } = new List<PlaylistSong>();
    }
}
