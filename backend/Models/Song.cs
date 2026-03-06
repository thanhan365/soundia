using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Soundia.Api.Models
{
    public class Song
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required]
        [MaxLength(200)]
        public string Artist { get; set; } = string.Empty;

        [Required]
        [MaxLength(10)]
        public string Duration { get; set; } = string.Empty;

        [Required]
        [MaxLength(1000)]
        public string CoverUrl { get; set; } = string.Empty;

        [Required]
        [MaxLength(1000)]
        public string AudioUrl { get; set; } = string.Empty;

        // Navigation Properties
        public ICollection<Favorite> Favorites { get; set; } = new List<Favorite>();
        public ICollection<PlaylistSong> PlaylistSongs { get; set; } = new List<PlaylistSong>();
    }
}
