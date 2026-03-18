using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Soundia.Api.DTOs.Playlists
{
    public class BatchAddSongsRequest
    {
        [Required]
        public List<int> SongIds { get; set; } = new();
    }
}
