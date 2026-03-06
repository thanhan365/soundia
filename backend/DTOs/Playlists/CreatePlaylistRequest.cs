using System.ComponentModel.DataAnnotations;

namespace Soundia.Api.DTOs.Playlists
{
    public class CreatePlaylistRequest
    {
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;
    }
}
