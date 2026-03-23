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

        public string? PasswordHash { get; set; }

        // Google OAuth
        [MaxLength(200)]
        public string? GoogleId { get; set; }

        // Profile fields
        [MaxLength(100)]
        public string? DisplayName { get; set; }

        [MaxLength(500)]
        public string? AvatarUrl { get; set; }

        // Role: "user" or "admin"
        [MaxLength(20)]
        public string Role { get; set; } = "user";

        // Refresh Token
        public string? RefreshToken { get; set; }
        public DateTime? RefreshTokenExpiry { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation Properties
        public ICollection<Favorite> Favorites { get; set; } = new List<Favorite>();
        public ICollection<Playlist> Playlists { get; set; } = new List<Playlist>();
        public ICollection<ListeningHistory> ListeningHistories { get; set; } = new List<ListeningHistory>();
    }
}
