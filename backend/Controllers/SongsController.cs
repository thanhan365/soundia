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

        [HttpGet("nct-artists")]
        public async Task<ActionResult> NctArtists()
        {
            try
            {
                // Scrape NCT homepage để lấy nghệ sĩ trending
                using var client = new System.Net.Http.HttpClient();
                client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
                
                var artists = new List<object>();
                var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                
                // 1) Lấy artist từ top chart (reuse nct-top data)
                try
                {
                    var chartUrl = "https://graph.nhaccuatui.com/api/v1/playlist/charts/1-5-d64-2026?key=1-5-d64-2026&isShowLoading=false";
                    var json = await client.GetStringAsync(chartUrl);
                    using var doc = System.Text.Json.JsonDocument.Parse(json);
                    var items = doc.RootElement.GetProperty("data").GetProperty("items");
                    
                    foreach (var item in items.EnumerateArray())
                    {
                        var artistName = item.TryGetProperty("artistName", out var an) ? an.GetString() : null;
                        if (string.IsNullOrEmpty(artistName)) continue;
                        
                        // Tách multi-artist (ví dụ "Sơn Tùng M-TP, Binz")
                        var primaryArtist = artistName.Split(',')[0].Trim();
                        if (seen.Contains(primaryArtist)) continue;
                        seen.Add(primaryArtist);
                        
                        var image = item.TryGetProperty("image", out var img) ? img.GetString() : null;
                        var artistKey = item.TryGetProperty("artist", out var artistArr) && artistArr.ValueKind == System.Text.Json.JsonValueKind.Array && artistArr.GetArrayLength() > 0
                            ? (artistArr[0].TryGetProperty("key", out var ak) ? ak.GetString() : null) : null;
                        
                        var artistImage = artistArr.ValueKind == System.Text.Json.JsonValueKind.Array && artistArr.GetArrayLength() > 0
                            ? (artistArr[0].TryGetProperty("image", out var ai) ? ai.GetString() : null) : null;
                        
                        artists.Add(new {
                            id = artistKey ?? primaryArtist,
                            name = primaryArtist,
                            picture = artistImage ?? image ?? ""
                        });
                    }
                }
                catch { /* best effort */ }
                
                // 2) Bổ sung thêm nghệ sĩ VN nổi bật (nếu chưa đủ 16)
                var extraArtists = new (string name, string key, string image)[]
                {
                    ("Sơn Tùng M-TP", "3086972", "https://avatar-ex-swe.nixcdn.com/song/2024/06/12/3/a/8/2/1718191316723.jpg"),
                    ("HIEUTHUHAI", "16717489", "https://avatar-ex-swe.nixcdn.com/singer/avatar/2024/02/04/d/6/1/3/1707033093906.jpg"),
                    ("Phan Mạnh Quỳnh", "3143752", "https://avatar-ex-swe.nixcdn.com/singer/avatar/2023/09/20/f/f/f/e/1695181003746.jpg"),
                    ("Đức Phúc", "3068698", "https://avatar-ex-swe.nixcdn.com/singer/avatar/2023/03/24/4/c/1/f/1679629085068.jpg"),
                    ("Vũ.", "14993651", "https://avatar-ex-swe.nixcdn.com/singer/avatar/2022/11/28/b/6/5/e/1669609012297.jpg"),
                    ("Hoàng Thùy Linh", "65358", "https://avatar-ex-swe.nixcdn.com/singer/avatar/2023/07/19/8/7/0/1/1689752508023.jpg"),
                    ("Trúc Nhân", "3038580", "https://avatar-ex-swe.nixcdn.com/singer/avatar/2024/01/12/d/2/d/c/1705041093249.jpg"),
                    ("Tóc Tiên", "69654", "https://avatar-ex-swe.nixcdn.com/singer/avatar/2022/12/29/7/6/2/b/1672296143073.jpg"),
                    ("Erik", "14792551", "https://avatar-ex-swe.nixcdn.com/singer/avatar/2023/05/05/c/0/7/6/1683268505645.jpg"),
                    ("Bích Phương", "3036468", "https://avatar-ex-swe.nixcdn.com/singer/avatar/2023/09/15/9/2/7/1/1694776023618.jpg"),
                    ("Jack - J97", "16645919", "https://avatar-ex-swe.nixcdn.com/singer/avatar/2023/06/27/4/5/9/a/1687856055773.jpg"),
                    ("Mỹ Tâm", "65291", "https://avatar-ex-swe.nixcdn.com/singer/avatar/2023/08/14/8/a/7/9/1692004010506.jpg"),
                    ("Hà Anh Tuấn", "65262", "https://avatar-ex-swe.nixcdn.com/singer/avatar/2023/05/25/f/3/d/1/1684985043853.jpg"),
                    ("Karik", "3108262", "https://avatar-ex-swe.nixcdn.com/singer/avatar/2023/03/08/1/6/1/9/1678266080155.jpg"),
                    ("MIN", "3064530", "https://avatar-ex-swe.nixcdn.com/singer/avatar/2023/10/06/7/6/7/2/1696587009843.jpg"),
                    ("Đen Vâu", "14832691", "https://avatar-ex-swe.nixcdn.com/singer/avatar/2023/12/08/4/c/0/7/1702005087825.jpg"),
                };
                
                foreach (var ea in extraArtists)
                {
                    if (artists.Count >= 16) break;
                    if (seen.Contains(ea.name)) continue;
                    seen.Add(ea.name);
                    artists.Add(new { id = ea.key, name = ea.name, picture = ea.image });
                }
                
                return Ok(new { success = true, data = artists });
            }
            catch (System.Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching NCT artists", details = ex.Message });
            }
        }

        private static List<object>? _cachedSuggestedPlaylists;
        private static DateTime _suggestedPlaylistsCacheTime = DateTime.MinValue;

        [HttpGet("suggested-playlists")]
        public async Task<ActionResult> SuggestedPlaylists()
        {
            // Cache 6 hours
            if (_cachedSuggestedPlaylists != null && DateTime.UtcNow < _suggestedPlaylistsCacheTime)
                return Ok(new { success = true, data = _cachedSuggestedPlaylists });

            try
            {
                using var client = new System.Net.Http.HttpClient();
                client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");

                // Lấy covers từ NCT trending songs
                var covers = new List<string>();
                try
                {
                    var chartUrl = "https://graph.nhaccuatui.com/api/v1/playlist/charts/1-5-d64-2026?key=1-5-d64-2026&isShowLoading=false";
                    var json = await client.GetStringAsync(chartUrl);
                    using var doc = System.Text.Json.JsonDocument.Parse(json);
                    var items = doc.RootElement.GetProperty("data").GetProperty("items");
                    foreach (var item in items.EnumerateArray())
                    {
                        var img = item.TryGetProperty("image", out var im) ? im.GetString() : null;
                        if (!string.IsNullOrEmpty(img)) covers.Add(img);
                    }
                }
                catch { }

                // Danh sách playlist gợi ý
                var playlists = new (string name, string desc, string query, string gradient)[]
                {
                    ("Trending TikTok", "Những bài hot nhất trên TikTok", "trending tiktok", "from-rose-500 to-orange-500"),
                    ("Nhạc Trung Lời Việt", "Nhạc Hoa lời Việt bất hủ", "nhạc trung lời việt", "from-red-500 to-yellow-600"),
                    ("Hôm Nay Tôi Suy", "Khi tâm trạng cần bình yên", "ballad buồn", "from-blue-500 to-purple-600"),
                    ("Rap Việt Chill", "Rap Việt nhẹ nhàng chill sad", "rap việt chill", "from-emerald-500 to-teal-600"),
                    ("Nhạc Remix Hot", "EDM remix bản hit V-Pop", "remix hot", "from-pink-500 to-violet-600"),
                    ("Nhạc Động Lực", "Tiếp thêm năng lượng mỗi ngày", "nhạc động lực", "from-amber-500 to-red-500"),
                    ("Chữa Lành Tâm Hồn", "Acoustic nhẹ nhàng thư giãn", "acoustic chữa lành", "from-cyan-500 to-blue-500"),
                    ("Dân Ca Đương Đại", "Dân ca mang hơi thở mới", "dân ca đương đại", "from-green-500 to-lime-500"),
                    ("K-Pop Hits", "Bản hit K-Pop hot nhất", "kpop hit", "from-fuchsia-500 to-pink-500"),
                    ("Lofi Chill Study", "Nhạc lofi học bài tập trung", "lofi chill", "from-indigo-500 to-slate-600"),
                };

                var result = new List<object>();
                for (int i = 0; i < playlists.Length; i++)
                {
                    var p = playlists[i];
                    // Lấy cover từ pool trending songs (mỗi playlist dùng 1 cover khác nhau)
                    var cover = covers.Count > i ? covers[i * 2 % covers.Count] : "";
                    
                    result.Add(new
                    {
                        id = $"suggested_{i}",
                        name = p.name,
                        description = p.desc,
                        searchQuery = p.query,
                        cover,
                        gradient = p.gradient
                    });
                }

                _cachedSuggestedPlaylists = result;
                _suggestedPlaylistsCacheTime = DateTime.UtcNow.AddHours(6);

                return Ok(new { success = true, data = result });
            }
            catch (System.Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching suggested playlists", details = ex.Message });
            }
        }

        // Curated search queries per playlist category for relevant results
        private static readonly Dictionary<string, string[]> _playlistQueries = new(StringComparer.OrdinalIgnoreCase)
        {
            ["trending tiktok"] = new[] { "Trọng Nhân vạn sự như ý", "Jack J97", "Quang Hùng MasterD dễ đến dễ đi", "HIEUTHUHAI ngủ một mình", "Obito có hẹn với thanh xuân", "Wren Evans", "Ricky Star", "VSTRA", "Pháo 2 phút hơn", "tiktok việt nam hot" },
            ["nhạc trung lời việt"] = new[] { "nhạc hoa lời việt", "Lệ Lưu Ly", "Tây Vấn", "Ly Cà Phê Cho Em", "Dạ Vũ Bến Thượng Hải", "Trương Tam Muội", "nhạc trung buồn", "Độ Ta Không Độ Nàng", "Người Lạ Ơi", "Sai Cách Yêu" },
            ["ballad buồn"] = new[] { "Phan Mạnh Quỳnh có chàng trai", "Vũ. lạ lùng", "Hà Anh Tuấn", "ballad việt nam buồn", "Nơi Này Có Anh", "Nàng Thơ", "Từ Đó", "Đức Phúc hơn cả yêu", "Bùi Anh Tuấn", "ballad vpop 2024" },
            ["rap việt chill"] = new[] { "Đen Vâu", "HIEUTHUHAI", "Low G", "Obito", "tlinh", "Wren Evans", "Karik", "Binz", "rap việt chill", "MCK" },
            ["remix hot"] = new[] { "remix vpop", "Masew", "nhạc trẻ remix", "Orinn Remix", "Hãy Trao Cho Anh remix", "vinahouse", "nonstop việt mix", "EDM việt nam", "DJ việt nam", "nhạc remix tiktok" },
            ["nhạc động lực"] = new[] { "Sơn Tùng MTP hãy trao cho anh", "Noo Phước Thịnh", "nhạc trẻ sôi động", "Erik đừng lý do", "nhạc vpop vui", "MIN", "Chi Pu", "Bích Phương đi đu đưa đi", "nhạc động lực việt", "Trúc Nhân sáng mắt chưa" },
            ["acoustic chữa lành"] = new[] { "acoustic việt nam", "Vũ. acoustic", "Thái Đinh", "Ngọt band", "Cá Hồi Hoang", "Da LAB", "Tăng Duy Tân", "Chillies band", "indie việt nam", "guitar acoustic chill" },
            ["dân ca đương đại"] = new[] { "Hoàng Thùy Linh để mị nói cho mà nghe", "dân ca việt nam modern", "bolero trẻ", "Quang Lê", "Phi Nhung", "nhạc quê hương", "dân ca đương đại việt", "Lệ Quyên", "nhạc trữ tình", "Đan Nguyên" },
            ["kpop hit"] = new[] { "BTS dynamite", "BLACKPINK", "NewJeans", "IVE", "aespa", "Stray Kids", "TWICE", "(G)I-DLE", "LE SSERAFIM", "SEVENTEEN" },
            ["lofi chill"] = new[] { "lofi chill vietnam", "lofi hip hop", "nhạc lofi buồn", "lofi study", "nhạc không lời chill", "piano lofi", "lofi Hoaprox", "lofi vpop", "chill beats vietnamese", "nhạc thư giãn" },
        };

        private static readonly Dictionary<string, (List<object> data, DateTime expiry)> _playlistSongsCache = new();

        [HttpGet("playlist-songs")]
        public async Task<ActionResult> PlaylistSongs([FromQuery] string keyword, [FromQuery] int limit = 30)
        {
            if (string.IsNullOrWhiteSpace(keyword))
                return BadRequest(new { message = "keyword is required" });

            // Check cache first (2-hour TTL)
            var cacheKey = $"{keyword}_{limit}".ToLowerInvariant();
            if (_playlistSongsCache.TryGetValue(cacheKey, out var cached) && DateTime.UtcNow < cached.expiry)
                return Ok(new { success = true, data = cached.data, total = cached.data.Count });

            try
            {
                using var client = new System.Net.Http.HttpClient();
                client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");

                // Get curated queries for this category
                var queries = _playlistQueries.TryGetValue(keyword, out var q) ? q : new[] { keyword };
                var perQuery = Math.Max(5, limit / queries.Length + 2);

                // ★ Parallel fetch all queries at once
                var tasks = queries.Select(async query =>
                {
                    try
                    {
                        var itunesUrl = $"https://itunes.apple.com/search?term={Uri.EscapeDataString(query)}&media=music&entity=song&limit={perQuery}&country=VN&lang=vi_vn";
                        var itunesJson = await client.GetStringAsync(itunesUrl);
                        using var doc = System.Text.Json.JsonDocument.Parse(itunesJson);
                        var results = doc.RootElement.GetProperty("results");
                        var items = new List<(long trackId, string title, string artist, string artwork, long duration, string previewUrl)>();
                        foreach (var item in results.EnumerateArray())
                        {
                            var trackId = item.TryGetProperty("trackId", out var ti) ? ti.GetInt64() : 0;
                            var trackName = item.TryGetProperty("trackName", out var tn) ? tn.GetString() ?? "" : "";
                            var artistName = item.TryGetProperty("artistName", out var an) ? an.GetString() ?? "" : "";
                            var artwork = item.TryGetProperty("artworkUrl100", out var aw) ? aw.GetString() ?? "" : "";
                            var duration = item.TryGetProperty("trackTimeMillis", out var dur) ? dur.GetInt64() / 1000 : 0;
                            var previewUrl = item.TryGetProperty("previewUrl", out var pv) ? pv.GetString() ?? "" : "";
                            if (!string.IsNullOrEmpty(artwork)) artwork = artwork.Replace("100x100", "600x600");
                            if (trackId > 0) items.Add((trackId, trackName, artistName, artwork, duration, previewUrl));
                        }
                        return items;
                    }
                    catch { return new List<(long, string, string, string, long, string)>(); }
                }).ToArray();

                var allResults = await Task.WhenAll(tasks);

                // Merge + deduplicate
                var songs = new List<object>();
                var seen = new HashSet<long>();
                var seenTitles = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

                foreach (var batch in allResults)
                {
                    foreach (var (trackId, title, artist, artwork, duration, previewUrl) in batch)
                    {
                        if (songs.Count >= limit) break;
                        if (seen.Contains(trackId)) continue;

                        var baseName = System.Text.RegularExpressions.Regex.Replace(title, @"\s*[\(\[\{].*?[\)\]\}]", "").Trim();
                        var dedupeKey = $"{baseName}|{artist.Split(',')[0].Split('&')[0].Trim()}".ToLowerInvariant();
                        if (seenTitles.Contains(dedupeKey)) continue;

                        seenTitles.Add(dedupeKey);
                        seen.Add(trackId);
                        songs.Add(new
                        {
                            id = $"itunes_{trackId}",
                            title,
                            artist,
                            cover = artwork,
                            audio = !string.IsNullOrEmpty(previewUrl) ? previewUrl : "YT_STREAM",
                            isExternal = true,
                            source = "itunes",
                            duration
                        });
                    }
                    if (songs.Count >= limit) break;
                }

                // Cache for 2 hours
                _playlistSongsCache[cacheKey] = (songs, DateTime.UtcNow.AddHours(2));

                return Ok(new { success = true, data = songs, total = songs.Count });
            }
            catch (System.Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching playlist songs", details = ex.Message });
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
