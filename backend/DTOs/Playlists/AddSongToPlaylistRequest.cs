using System.ComponentModel.DataAnnotations;

namespace Soundia.Api.DTOs.Playlists
{
    public class AddSongToPlaylistRequest
    {
        [Required]
        public int SongId { get; set; }
    }
}
