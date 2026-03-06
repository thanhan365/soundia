using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Soundia.Api.Data;
using Soundia.Api.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Soundia.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SongsController : ControllerBase
    {
        private readonly SoundiaDbContext _context;

        public SongsController(SoundiaDbContext context)
        {
            _context = context;
        }

        [HttpGet("deezer-proxy")]
        public async Task<ActionResult> DeezerProxy([FromQuery] string query)
        {
            using var client = new System.Net.Http.HttpClient();
            var response = await client.GetStringAsync($"https://api.deezer.com/search?q={System.Net.WebUtility.UrlEncode(query)}");
            return Content(response, "application/json");
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Song>>> GetSongs()
        {
            return await _context.Songs.ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Song>> GetSong(int id)
        {
            var song = await _context.Songs.FindAsync(id);

            if (song == null) return NotFound();

            return song;
        }

        // Endpoint mới để lưu bài hát từ Deezer vào DB
        [HttpPost("external")]
        public async Task<ActionResult<Song>> CreateExternalSong([FromBody] Song song)
        {
            var existingSong = await _context.Songs
                .FirstOrDefaultAsync(s => s.Title == song.Title && s.Artist == song.Artist);

            if (existingSong != null) return Ok(existingSong);

            song.Id = 0; 
            _context.Songs.Add(song);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetSong), new { id = song.Id }, song);
        }

        // Endpoint tạm thời để xóa bài hát mẫu
        [HttpDelete("cleanup-static")]
        public async Task<IActionResult> CleanupStaticSongs()
        {
            var staticSongs = await _context.Songs
                .Where(s => s.AudioUrl.Contains("soundhelix.com") || s.Artist == "NeonWave")
                .ToListAsync();

            if (staticSongs.Count == 0)
            {
                return Ok(new { message = "Không tìm thấy bài hát tĩnh nào." });
            }

            _context.Songs.RemoveRange(staticSongs);
            await _context.SaveChangesAsync();

            return Ok(new { message = $"Đã xóa {staticSongs.Count} bài hát tĩnh.", count = staticSongs.Count });
        }
    }
}
