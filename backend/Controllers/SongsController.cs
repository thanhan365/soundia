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
        private readonly Soundia.Api.Services.ISpotifyService _spotifyService;

        public SongsController(SoundiaDbContext context, Soundia.Api.Services.ISpotifyService spotifyService)
        {
            _context = context;
            _spotifyService = spotifyService;
        }



        // ── Spotify Proxies (kept for future use) ────────────────────────────
        [HttpGet("spotify-proxy")]
        public async Task<ActionResult> SpotifyProxy([FromQuery] string query, [FromQuery] string type = "track,artist")
        {
            try { return Content(await _spotifyService.SearchAsync(query, type), "application/json"); }
            catch (System.Exception ex) { return StatusCode(500, new { message = "Error communicating with Spotify API", details = ex.Message }); }
        }

        [HttpGet("spotify-artist-search")]
        public async Task<ActionResult> SpotifyArtistSearch([FromQuery] string query)
        {
            try { return Content(await _spotifyService.SearchArtistAsync(query), "application/json"); }
            catch (System.Exception ex) { return StatusCode(500, new { message = "Error communicating with Spotify API", details = ex.Message }); }
        }

        [HttpGet("spotify-artist-top-tracks")]
        public async Task<ActionResult> SpotifyArtistTopTracks([FromQuery] string artistId)
        {
            try { return Content(await _spotifyService.GetArtistTopTracksAsync(artistId), "application/json"); }
            catch (System.Exception ex) { return StatusCode(500, new { message = "Error communicating with Spotify API", details = ex.Message }); }
        }

        // ── iTunes Proxies (CORS bypass) ──────────────────────────────────────
        [HttpGet("itunes-proxy")]
        public async Task<ActionResult> ItunesProxy(
            [FromQuery] string term,
            [FromQuery] string media = "music",
            [FromQuery] string entity = "song",
            [FromQuery] int limit = 15,
            [FromQuery] string country = "VN")
        {
            try
            {
                using var client = new System.Net.Http.HttpClient();
                var url = $"https://itunes.apple.com/search?term={System.Net.WebUtility.UrlEncode(term)}&media={media}&entity={entity}&limit={limit}&country={country}";
                var response = await client.GetStringAsync(url);
                return Content(response, "application/json");
            }
            catch (System.Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching from iTunes API", details = ex.Message });
            }
        }

        [HttpGet("itunes-lookup")]
        public async Task<ActionResult> ItunesLookup(
            [FromQuery] string id,
            [FromQuery] string entity = "song",
            [FromQuery] int limit = 20,
            [FromQuery] string country = "VN")
        {
            try
            {
                using var client = new System.Net.Http.HttpClient();
                var url = $"https://itunes.apple.com/lookup?id={id}&entity={entity}&limit={limit}&country={country}";
                var response = await client.GetStringAsync(url);
                return Content(response, "application/json");
            }
            catch (System.Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching from iTunes Lookup API", details = ex.Message });
            }
        }

        // ── Database Song Endpoints ────────────────────────────────────────────
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

        // Endpoint để lưu bài hát từ external source vào DB
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

        // Endpoint để xóa bài hát mẫu tĩnh
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
