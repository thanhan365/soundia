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

        [HttpGet("itunes-top")]
        public async Task<ActionResult> ItunesTop([FromQuery] int limit = 50)
        {
            try
            {
                using var client = new System.Net.Http.HttpClient();
                var url = $"https://itunes.apple.com/vn/rss/topsongs/limit={limit}/json";
                var response = await client.GetStringAsync(url);
                return Content(response, "application/json");
            }
            catch (System.Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching from iTunes Top API", details = ex.Message });
            }
        }

        [HttpGet("nct-top")]
        public async Task<ActionResult> NctTop()
        {
            try
            {
                // Use NCT's internal chart API directly — returns Top 50 with stream URLs
                using var client = new System.Net.Http.HttpClient();
                client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
                
                var chartUrl = "https://graph.nhaccuatui.com/api/v1/playlist/charts/1-5-d64-2026?key=1-5-d64-2026&isShowLoading=false";
                var json = await client.GetStringAsync(chartUrl);
                using var doc = System.Text.Json.JsonDocument.Parse(json);

                var dataNode = doc.RootElement.GetProperty("data");
                var items = dataNode.GetProperty("items");

                var songs = new List<object>();
                int count = 0;
                foreach (var item in items.EnumerateArray())
                {
                    if (count >= 20) break; // Only take top 20

                    var name = item.GetProperty("name").GetString() ?? "";
                    
                    var artistName = "Unknown";
                    if (item.TryGetProperty("artistName", out var aName))
                    {
                         artistName = aName.GetString() ?? "Unknown";
                    }
                    else if (item.TryGetProperty("artist", out var artistArr) && artistArr.GetArrayLength() > 0)
                    {
                         artistName = artistArr[0].GetProperty("name").GetString() ?? "Unknown";
                    }
                    
                    var image = item.GetProperty("image").GetString() ?? "";
                    var key = item.GetProperty("key").GetString() ?? "";
                    var duration = item.TryGetProperty("duration", out var dur) ? dur.GetInt32() : 0;

                    // Get best non-VIP stream URL (prefer 320kbps)
                    string streamUrl = "";
                    if (item.TryGetProperty("streamURL", out var streamUrls) && streamUrls.ValueKind == System.Text.Json.JsonValueKind.Array)
                    {
                        // Try 320kbps first, then 128kbps
                        foreach (var su in streamUrls.EnumerateArray())
                        {
                            var onlyVIP = su.TryGetProperty("onlyVIP", out var vip) && vip.GetBoolean();
                            if (onlyVIP) continue;
                            
                            var stream = su.TryGetProperty("stream", out var s) ? s.GetString() : "";
                            var type = su.TryGetProperty("type", out var t) ? t.GetString() : "";
                            
                            if (!string.IsNullOrEmpty(stream))
                            {
                                streamUrl = stream;
                                if (type == "320") break; // Prefer 320kbps
                            }
                        }
                    }

                    songs.Add(new {
                        id = $"nct_top_{key}",
                        title = name,
                        artist = artistName,
                        cover = image,
                        key,
                        audio = string.IsNullOrEmpty(streamUrl) ? "YT_STREAM" : $"/api/stream/proxy-audio?url={System.Net.WebUtility.UrlEncode(streamUrl)}",
                        source = "nct",
                        duration
                    });
                    count++;
                }

                return Ok(new { success = true, data = songs });
            }
            catch (System.Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching from NCT Top", details = ex.Message });
            }
        }

        // ── Database Song Endpoints ────────────────────────────────────────────
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Song>>> GetSongs()
        {
            return await _context.Songs.ToListAsync();
        }

        [HttpGet("{id:int}")]
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
