using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Soundia.Api.Models
{
    public class User
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(50)]
        public string Username { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [MaxLength(100)]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string PasswordHash { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation Properties
        public ICollection<Favorite> Favorites { get; set; } = new List<Favorite>();
        public ICollection<Playlist> Playlists { get; set; } = new List<Playlist>();
    }
}
