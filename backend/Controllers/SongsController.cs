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

        // ── Cache NCT Top chart (15 phút) ────────────────────────────────────
        private static List<object>? _cachedNctTop;
        private static DateTime _nctTopCacheExpiry = DateTime.MinValue;

        /// <summary>
        /// Tự động tạo chart key theo ngày hiện tại.
        /// Format NCT: "1-{weekOfYear}-d{dayOfYear}-{year}" (ví dụ: "1-5-d64-2026")
        /// Nếu key không hoạt động, thử key ngày hôm qua.
        /// </summary>
        private static string GenerateNctChartKey()
        {
            var now = DateTime.UtcNow.AddHours(7); // UTC+7 Vietnam
            var culture = System.Globalization.CultureInfo.InvariantCulture;
            var cal = culture.Calendar;
            int week = cal.GetWeekOfYear(now, System.Globalization.CalendarWeekRule.FirstDay, DayOfWeek.Monday);
            int dayOfYear = now.DayOfYear;
            int year = now.Year;
            return $"1-{week}-d{dayOfYear}-{year}";
        }

        [HttpGet("nct-top")]
        public async Task<ActionResult> NctTop()
        {
            // Trả cache nếu còn hiệu lực (15 phút)
            if (_cachedNctTop != null && DateTime.UtcNow < _nctTopCacheExpiry)
                return Ok(new { success = true, data = _cachedNctTop });

            try
            {
                using var client = new System.Net.Http.HttpClient();
                client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
                
                // NCT chart key format: "1-5-d{dayOfYear}-{year}"
                // Thử key hôm nay → lùi dần tối đa 7 ngày để tìm chart có data
                var now = DateTime.UtcNow.AddHours(7); // UTC+7 Vietnam
                string json = "";
                bool found = false;

                for (int offset = 0; offset <= 7 && !found; offset++)
                {
                    var day = now.AddDays(-offset);
                    var chartKey = $"1-5-d{day.DayOfYear}-{day.Year}";
                    var chartUrl = $"https://graph.nhaccuatui.com/api/v1/playlist/charts/{chartKey}?key={chartKey}&isShowLoading=false";
                    try
                    {
                        json = await client.GetStringAsync(chartUrl);
                        using var checkDoc = System.Text.Json.JsonDocument.Parse(json);
                        var checkItems = checkDoc.RootElement.GetProperty("data").GetProperty("items");
                        if (checkItems.GetArrayLength() > 0)
                        {
                            found = true;
                            Console.WriteLine($"[NctTop] Using chart key: {chartKey} ({checkItems.GetArrayLength()} items)");
                        }
                    }
                    catch { /* try next day */ }
                }

                if (!found)
                    return StatusCode(500, new { message = "NCT chart unavailable — no chart data found" });

                using var doc = System.Text.Json.JsonDocument.Parse(json);
                var dataNode = doc.RootElement.GetProperty("data");
                var items = dataNode.GetProperty("items");

                var songs = new List<object>();
                int count = 0;
                foreach (var item in items.EnumerateArray())
                {
                    if (count >= 20) break;

                    var name = item.GetProperty("name").GetString() ?? "";
                    
                    var artistName = "Unknown";
                    if (item.TryGetProperty("artistName", out var aName))
                         artistName = aName.GetString() ?? "Unknown";
                    else if (item.TryGetProperty("artist", out var artistArr) && artistArr.GetArrayLength() > 0)
                         artistName = artistArr[0].GetProperty("name").GetString() ?? "Unknown";
                    
                    var image = item.GetProperty("image").GetString() ?? "";
                    var key = item.GetProperty("key").GetString() ?? "";
                    var duration = item.TryGetProperty("duration", out var dur) ? dur.GetInt32() : 0;

                    // Lấy stream URL không VIP (ưu tiên 320kbps)
                    string streamUrl = "";
                    if (item.TryGetProperty("streamURL", out var streamUrls) && streamUrls.ValueKind == System.Text.Json.JsonValueKind.Array)
                    {
                        foreach (var su in streamUrls.EnumerateArray())
                        {
                            var onlyVIP = su.TryGetProperty("onlyVIP", out var vip) && vip.GetBoolean();
                            if (onlyVIP) continue;
                            
                            var stream = su.TryGetProperty("stream", out var s) ? s.GetString() : "";
                            var type = su.TryGetProperty("type", out var t) ? t.GetString() : "";
                            
                            if (!string.IsNullOrEmpty(stream))
                            {
                                streamUrl = stream;
                                if (type == "320") break;
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

                // Cache 15 phút
                _cachedNctTop = songs;
                _nctTopCacheExpiry = DateTime.UtcNow.AddMinutes(15);

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

                // Danh sách playlists — hỗ trợ cả NCT và Zing MP3
                var playlists = new (string key, string fallbackName, string gradient, string source)[]
                {
                    ("lv0G8HlIW0Vq", "TikTok Trending", "from-rose-500 to-orange-500", "nct"),
                    ("2JtgoYqhvgHL", "V-Pop Thịnh Hành", "from-violet-500 to-fuchsia-500", "nct"),
                    ("xFQ2g5ZHKFTp", "TikTok Remix Việt", "from-pink-500 to-violet-600", "nct"),
                    ("6C0WOI7D", "Rap Buồn Tâm Trạng", "from-slate-600 to-gray-800", "zing"),
                    ("jjF1M79lX8JD", "Cùng Lấy Động Lực", "from-amber-500 to-orange-500", "nct"),
                    ("iY1AnIsXedqE", "Rap Việt Hot", "from-emerald-500 to-teal-600", "nct"),
                    ("dOwhaum9O8W4", "Acoustic Indie", "from-cyan-500 to-blue-500", "nct"),
                    ("ZPOg5wVczPko", "K-Pop Hot Hits", "from-amber-500 to-red-500", "nct"),
                    ("6C8O0A66", "Nhạc Trung", "from-red-600 to-amber-500", "zing"),
                    ("YHu8Xj6dFxYJ", "Ballad Việt Quốc Dân", "from-indigo-500 to-slate-600", "nct"),
                    ("C6GaVhpbvkI4", "Lofi & Chill", "from-violet-500 to-fuchsia-600", "nct"),
                    ("6BF9EAFI", "Hôm Nay Suy Tí", "from-blue-500 to-indigo-600", "zing"),
                };

                var result = new List<object>();
                var tasks = playlists.Select(async (p, i) =>
                {
                    try
                    {
                        if (p.source == "zing")
                        {
                            // Zing MP3 playlist — fetch cover image from Zing API via Node.js
                            string zingCover = "";
                            string zingDesc = p.fallbackName;
                            int zingSongCount = 0;
                            try
                            {
                                var scriptPath = Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "scripts", "zing-playlist.cjs");
                                if (!System.IO.File.Exists(scriptPath))
                                    scriptPath = Path.Combine(Directory.GetCurrentDirectory(), "scripts", "zing-playlist.cjs");

                                var psi = new System.Diagnostics.ProcessStartInfo
                                {
                                    FileName = "node",
                                    Arguments = $"\"{scriptPath}\" {p.key}",
                                    RedirectStandardOutput = true,
                                    RedirectStandardError = true,
                                    UseShellExecute = false,
                                    CreateNoWindow = true,
                                    WorkingDirectory = Path.Combine(Directory.GetCurrentDirectory(), ".."),
                                    StandardOutputEncoding = System.Text.Encoding.UTF8,
                                    StandardErrorEncoding = System.Text.Encoding.UTF8
                                };

                                using var proc = System.Diagnostics.Process.Start(psi);
                                if (proc != null)
                                {
                                    var output = await proc.StandardOutput.ReadToEndAsync();
                                    await proc.WaitForExitAsync();
                                    if (proc.ExitCode == 0 && !string.IsNullOrEmpty(output))
                                    {
                                        using var zDoc = System.Text.Json.JsonDocument.Parse(output);
                                        var zRoot = zDoc.RootElement;
                                        if (zRoot.TryGetProperty("image", out var zImg))
                                            zingCover = zImg.GetString() ?? "";
                                        if (zRoot.TryGetProperty("name", out var zName) && !string.IsNullOrEmpty(zName.GetString()))
                                            zingDesc = zName.GetString();
                                        if (zRoot.TryGetProperty("totalSongs", out var zTs))
                                            zingSongCount = zTs.GetInt32();
                                    }
                                }
                            }
                            catch { /* fallback — no cover */ }

                            return new
                            {
                                id = $"zing_{p.key}_{i}",
                                name = p.fallbackName,
                                description = zingDesc,
                                searchQuery = p.fallbackName,
                                cover = zingCover,
                                gradient = p.gradient,
                                nctPlaylistKey = "",
                                zingPlaylistId = p.key,
                                songCount = zingSongCount,
                                order = i
                            };
                        }
                        else
                        {
                            var (name, image, description, totalSongs, songs) = await _nctApi.GetPlaylistAsync(p.key, 5);
                            return new
                            {
                                id = $"nct_{p.key}_{i}",
                                name = p.fallbackName,
                                description = !string.IsNullOrEmpty(description) ? description : p.fallbackName,
                                searchQuery = p.fallbackName,
                                cover = !string.IsNullOrEmpty(image) ? image : "",
                                gradient = p.gradient,
                                nctPlaylistKey = p.key,
                                zingPlaylistId = "",
                                songCount = totalSongs,
                                order = i
                            };
                        }
                    }
                    catch
                    {
                        return new
                        {
                            id = $"{p.source}_{p.key}_{i}",
                            name = p.fallbackName,
                            description = p.fallbackName,
                            searchQuery = p.fallbackName,
                            cover = "",
                            gradient = p.gradient,
                            nctPlaylistKey = p.source == "nct" ? p.key : "",
                            zingPlaylistId = p.source == "zing" ? p.key : "",
                            songCount = 0,
                            order = i
                        };
                    }
                }).ToArray();

                var results = await Task.WhenAll(tasks);
                result = results.OrderBy(r => r.order).Cast<object>().ToList();

                _cachedSuggestedPlaylists = result;
                _suggestedPlaylistsCacheTime = DateTime.UtcNow.AddHours(6);

                return Ok(new { success = true, data = result });
            }
            catch (System.Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching suggested playlists", details = ex.Message });
            }
        }

        // GET /api/songs/nct-playlist-detail/{key} — Lấy chi tiết playlist từ NCT
        [HttpGet("nct-playlist-detail/{key}")]
        public async Task<IActionResult> GetNctPlaylistDetail(string key)
        {
            try
            {
                var (name, image, description, totalSongs, songs) = await _nctApi.GetPlaylistAsync(key, 50);
                
                if (string.IsNullOrEmpty(name))
                    return NotFound(new { message = "Playlist not found" });

                var tracks = songs.Select(s =>
                {
                    var proxiedUrl = !string.IsNullOrEmpty(s.StreamUrl)
                        ? $"/api/stream/proxy-audio?url={System.Net.WebUtility.UrlEncode(s.StreamUrl)}"
                        : "";
                    return new
                    {
                        id = $"nct_{s.Key}",
                        title = s.Name,
                        artist = s.ArtistName,
                        album = name,
                        cover = s.Image,
                        artwork = s.Image,
                        duration = s.Duration,
                        audio = !string.IsNullOrEmpty(proxiedUrl) ? proxiedUrl : "YT_STREAM",
                        previewUrl = proxiedUrl,
                        streamUrl = proxiedUrl,
                        nctKey = s.Key,
                        source = "nct",
                        isExternal = true
                    };
                }).ToList();

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        name,
                        image,
                        description,
                        totalSongs,
                        tracks
                    }
                });
            }
            catch (System.Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching NCT playlist", details = ex.Message });
            }
        }

        // Curated search queries per playlist category for relevant results
        private static readonly Dictionary<string, string[]> _playlistQueries = new(StringComparer.OrdinalIgnoreCase)
        {
            ["trending tiktok"] = new[] { "Trọng Nhân vạn sự như ý", "Jack J97", "Quang Hùng MasterD dễ đến dễ đi", "HIEUTHUHAI ngủ một mình", "Obito có hẹn với thanh xuân", "Wren Evans", "Ricky Star", "VSTRA", "Pháo 2 phút hơn", "tiktok việt nam hot" },
            ["nhạc trung"] = new[] { "nhạc hoa lời việt", "Lệ Lưu Ly", "Tây Vấn", "Ly Cà Phê Cho Em", "Dạ Vũ Bến Thượng Hải", "Trương Tam Muội", "nhạc trung buồn", "Độ Ta Không Độ Nàng", "Người Lạ Ơi", "Sai Cách Yêu" },
            ["ballad buồn"] = new[] { "Phan Mạnh Quỳnh có chàng trai", "Vũ. lạ lùng", "Hà Anh Tuấn", "ballad việt nam buồn", "Nơi Này Có Anh", "Nàng Thơ", "Từ Đó", "Đức Phúc hơn cả yêu", "Bùi Anh Tuấn", "ballad vpop 2024" },
            ["rap việt chill"] = new[] { "Đen Vâu", "HIEUTHUHAI", "Low G", "Obito", "tlinh", "Wren Evans", "Karik", "Binz", "rap việt chill", "MCK" },
            ["rap buồn tâm trạng"] = new[] { "rap buồn tâm trạng", "Đạt G", "B Ray buồn", "Karik", "rap việt buồn thất tình", "Phước DKNY", "Lil Knight", "Rhy Dick", "MCK buồn", "rap tâm trạng việt" },
            ["cùng lấy động lực"] = new[] { "nhạc động lực", "Sơn Tùng MTP hãy trao cho anh", "Noo Phước Thịnh", "nhạc trẻ sôi động", "Erik đừng lý do", "Bích Phương đi đu đưa đi", "MIN", "Trúc Nhân sáng mắt chưa", "nhạc vpop vui", "Chi Pu" },
            ["hôm nay suy tí"] = new[] { "nhạc buồn nhẹ nhàng", "Vũ. lạ lùng", "Phan Mạnh Quỳnh", "nhạc trẻ tâm trạng", "Thái Đinh", "Ngọt band", "nhạc indie buồn", "Hà Anh Tuấn", "ballad việt nhẹ nhàng", "nhạc suy tư" },
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
                // Get curated queries for this category
                var queries = _playlistQueries.TryGetValue(keyword, out var q) ? q : new[] { keyword };
                var perQuery = Math.Max(3, limit / queries.Length + 1);

                var songs = new List<object>();
                var seenTitles = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

                // ★ Ưu tiên NCT search — full stream URLs!
                try
                {
                    var nctTasks = queries.Select(async query =>
                    {
                        try { return await _nctApi.SearchSongsWithStreamAsync(query, perQuery); }
                        catch { return new List<Soundia.Api.Services.NctSong>(); }
                    }).ToArray();

                    var nctResults = await Task.WhenAll(nctTasks);
                    var seenKeys = new HashSet<string>();

                    foreach (var batch in nctResults)
                    {
                        foreach (var s in batch)
                        {
                            if (songs.Count >= limit) break;
                            if (string.IsNullOrEmpty(s.Key) || seenKeys.Contains(s.Key)) continue;

                            var baseName = System.Text.RegularExpressions.Regex.Replace(s.Name ?? "", @"\s*[\(\[\{].*?[\)\]\}]", "").Trim();
                            var dedupeKey = $"{baseName}|{s.ArtistName?.Split(',')[0]?.Split('&')[0]?.Trim()}".ToLowerInvariant();
                            if (seenTitles.Contains(dedupeKey)) continue;

                            seenTitles.Add(dedupeKey);
                            seenKeys.Add(s.Key);

                            var audio = !string.IsNullOrEmpty(s.StreamUrl)
                                ? $"/api/stream/proxy-audio?url={System.Net.WebUtility.UrlEncode(s.StreamUrl)}"
                                : "YT_STREAM";

                            songs.Add(new
                            {
                                id = $"nct_{s.Key}",
                                title = s.Name,
                                artist = s.ArtistName,
                                cover = s.Image,
                                audio,
                                isExternal = true,
                                source = "nct",
                                duration = s.Duration,
                                nctKey = s.Key
                            });
                        }
                        if (songs.Count >= limit) break;
                    }
                }
                catch { /* NCT search thất bại — fallback iTunes bên dưới */ }

                // ★ Fallback iTunes + YT_STREAM nếu NCT không đủ kết quả
                if (songs.Count < limit)
                {
                    try
                    {
                        using var client = new System.Net.Http.HttpClient();
                        client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
                        var itunesPerQuery = Math.Max(5, (limit - songs.Count) / queries.Length + 2);

                        var itunesTasks = queries.Select(async query =>
                        {
                            try
                            {
                                var itunesUrl = $"https://itunes.apple.com/search?term={Uri.EscapeDataString(query)}&media=music&entity=song&limit={itunesPerQuery}&country=VN&lang=vi_vn";
                                var itunesJson = await client.GetStringAsync(itunesUrl);
                                using var doc = System.Text.Json.JsonDocument.Parse(itunesJson);
                                var results = doc.RootElement.GetProperty("results");
                                var items = new List<(long trackId, string title, string artist, string artwork, long duration)>();
                                foreach (var item in results.EnumerateArray())
                                {
                                    var trackId = item.TryGetProperty("trackId", out var ti) ? ti.GetInt64() : 0;
                                    var trackName = item.TryGetProperty("trackName", out var tn) ? tn.GetString() ?? "" : "";
                                    var artistName = item.TryGetProperty("artistName", out var an) ? an.GetString() ?? "" : "";
                                    var artwork = item.TryGetProperty("artworkUrl100", out var aw) ? aw.GetString() ?? "" : "";
                                    var duration = item.TryGetProperty("trackTimeMillis", out var dur) ? dur.GetInt64() / 1000 : 0;
                                    if (!string.IsNullOrEmpty(artwork)) artwork = artwork.Replace("100x100", "600x600");
                                    if (trackId > 0) items.Add((trackId, trackName, artistName, artwork, duration));
                                }
                                return items;
                            }
                            catch { return new List<(long, string, string, string, long)>(); }
                        }).ToArray();

                        var itunesResults = await Task.WhenAll(itunesTasks);
                        var seenIds = new HashSet<long>();

                        foreach (var batch in itunesResults)
                        {
                            foreach (var (trackId, title, artist, artwork, duration) in batch)
                            {
                                if (songs.Count >= limit) break;
                                if (seenIds.Contains(trackId)) continue;

                                var baseName = System.Text.RegularExpressions.Regex.Replace(title, @"\s*[\(\[\{].*?[\)\]\}]", "").Trim();
                                var dedupeKey = $"{baseName}|{artist.Split(',')[0].Split('&')[0].Trim()}".ToLowerInvariant();
                                if (seenTitles.Contains(dedupeKey)) continue;

                                seenTitles.Add(dedupeKey);
                                seenIds.Add(trackId);
                                songs.Add(new
                                {
                                    id = $"itunes_{trackId}",
                                    title,
                                    artist,
                                    cover = artwork,
                                    audio = "YT_STREAM", // Không dùng preview 30s — stream YouTube
                                    isExternal = true,
                                    source = "itunes",
                                    duration,
                                    nctKey = (string)null
                                });
                            }
                            if (songs.Count >= limit) break;
                        }
                    }
                    catch { /* iTunes cũng hỏng — trả kết quả NCT đã có */ }
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

        // ── Zing MP3 Playlist Import (via Node.js helper) ─────────────────────
        private static readonly Dictionary<string, (object data, DateTime expiry)> _zingPlaylistCache = new();

        [HttpGet("zing-playlist/{id}")]
        public async Task<ActionResult> ZingPlaylist(string id)
        {
            // Cache 1 hour
            if (_zingPlaylistCache.TryGetValue(id, out var cached) && DateTime.UtcNow < cached.expiry)
                return Ok(cached.data);

            try
            {
                // Call Node.js helper script that uses zingmp3-api-full package
                var scriptPath = Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "scripts", "zing-playlist.cjs");
                if (!System.IO.File.Exists(scriptPath))
                    scriptPath = Path.Combine(Directory.GetCurrentDirectory(), "scripts", "zing-playlist.cjs");

                Console.WriteLine($"[ZingPlaylist] Running: node {scriptPath} {id}");

                var psi = new System.Diagnostics.ProcessStartInfo
                {
                    FileName = "node",
                    Arguments = $"\"{scriptPath}\" {id}",
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    WorkingDirectory = Path.Combine(Directory.GetCurrentDirectory(), ".."),
                    StandardOutputEncoding = System.Text.Encoding.UTF8,
                    StandardErrorEncoding = System.Text.Encoding.UTF8
                };

                using var process = System.Diagnostics.Process.Start(psi);
                if (process == null)
                    return StatusCode(500, new { success = false, message = "Failed to start Node.js process" });

                var output = await process.StandardOutput.ReadToEndAsync();
                var error = await process.StandardError.ReadToEndAsync();
                await process.WaitForExitAsync();

                if (process.ExitCode != 0 || string.IsNullOrEmpty(output))
                {
                    Console.WriteLine($"[ZingPlaylist] Node.js error: {error}");
                    return StatusCode(500, new { success = false, message = "Failed to fetch playlist", details = error });
                }

                Console.WriteLine($"[ZingPlaylist] Got {output.Length} chars from Node.js");

                // Parse JSON output from Node.js script
                using var doc = System.Text.Json.JsonDocument.Parse(output);
                var root = doc.RootElement;

                if (root.TryGetProperty("error", out var errEl))
                {
                    return StatusCode(400, new { success = false, message = errEl.GetString() });
                }

                var playlistName = root.TryGetProperty("name", out var n) ? n.GetString() ?? "" : "";
                var playlistImage = root.TryGetProperty("image", out var img) ? img.GetString() ?? "" : "";
                var totalSongs = root.TryGetProperty("totalSongs", out var ts) ? ts.GetInt32() : 0;

                var songs = new List<object>();
                if (root.TryGetProperty("tracks", out var tracks) && tracks.ValueKind == System.Text.Json.JsonValueKind.Array)
                {
                    foreach (var item in tracks.EnumerateArray())
                    {
                        songs.Add(new
                        {
                            id = item.TryGetProperty("id", out var sid) ? sid.GetString() ?? "" : "",
                            title = item.TryGetProperty("title", out var st) ? st.GetString() ?? "" : "",
                            artist = item.TryGetProperty("artist", out var sa) ? sa.GetString() ?? "Unknown" : "Unknown",
                            cover = item.TryGetProperty("cover", out var sc) ? sc.GetString() ?? "" : "",
                            audio = "YT_STREAM",
                            source = "zing",
                            isExternal = true,
                            duration = item.TryGetProperty("duration", out var sd) ? sd.GetInt32() : 0,
                            nctKey = (string?)null
                        });
                    }
                }

                Console.WriteLine($"[ZingPlaylist] Extracted {songs.Count} songs");

                var result = new
                {
                    success = true,
                    data = new
                    {
                        name = playlistName,
                        image = playlistImage,
                        description = "Imported from Zing MP3",
                        totalSongs = songs.Count,
                        tracks = songs
                    }
                };

                _zingPlaylistCache[id] = (result, DateTime.UtcNow.AddHours(1));
                return Ok(result);
            }
            catch (System.Exception ex)
            {
                Console.WriteLine($"[ZingPlaylist] ERROR: {ex}");
                return StatusCode(500, new { success = false, message = "Error fetching Zing MP3 playlist", details = ex.ToString() });
            }
        }

        // ── NCT Graph API Endpoints ─────────────────────────────────────────
        private static readonly Soundia.Api.Services.NctApiService _nctApi = new();

        [HttpGet("nct-search")]
        public async Task<ActionResult> NctSearch([FromQuery] string keyword, [FromQuery] int limit = 20)
        {
            if (string.IsNullOrWhiteSpace(keyword))
                return BadRequest(new { message = "keyword is required" });

            var songs = await _nctApi.SearchSongsAsync(keyword, 1, limit);
            var result = songs.Select(s => new
            {
                id = $"nct_{s.Key}",
                title = s.Name,
                artist = s.ArtistName,
                cover = s.Image,
                audio = !string.IsNullOrEmpty(s.StreamUrl) ? s.StreamUrl : "YT_STREAM",
                isExternal = true,
                source = "nct",
                duration = s.Duration,
                nctKey = s.Key,
            });
            return Ok(new { success = true, data = result, total = songs.Count });
        }

        [HttpGet("nct-stream/{key}")]
        public async Task<ActionResult> NctStream(string key)
        {
            var url = await _nctApi.GetStreamUrlAsync(key);
            if (url == null) return NotFound(new { message = "Stream not found" });
            // Proxy through backend to bypass CORS
            var proxyUrl = $"/api/stream/proxy-audio?url={System.Net.WebUtility.UrlEncode(url)}";
            return Ok(new { success = true, streamUrl = proxyUrl });
        }

        [HttpGet("nct-resolve")]
        public async Task<ActionResult> NctResolve([FromQuery] string title, [FromQuery] string artist)
        {
            if (string.IsNullOrWhiteSpace(title))
                return BadRequest(new { message = "title is required" });
            var url = await _nctApi.ResolveStreamByTitleAsync(title, artist ?? "");
            if (url == null) return NotFound(new { message = "Not found on NCT" });
            // Proxy through backend to bypass CORS
            var proxyUrl = $"/api/stream/proxy-audio?url={System.Net.WebUtility.UrlEncode(url)}";
            return Ok(new { success = true, streamUrl = proxyUrl });
        }

        [HttpGet("nct-charts")]
        public async Task<ActionResult> NctCharts()
        {
            var charts = await _nctApi.GetChartsAsync();
            if (charts == null) return StatusCode(500, new { message = "Failed to fetch charts" });
            return Ok(new { success = true, data = charts });
        }

        [HttpGet("nct-top100")]
        public async Task<ActionResult> NctTop100()
        {
            var top100 = await _nctApi.GetTop100Async();
            if (top100 == null) return StatusCode(500, new { message = "Failed to fetch top 100" });
            return Ok(new { success = true, data = top100 });
        }

        [HttpGet("nct-artist/{artistId}/songs")]
        public async Task<ActionResult> NctArtistSongs(string artistId, [FromQuery] int limit = 20)
        {
            var songs = await _nctApi.GetArtistSongsAsync(artistId, 1, limit);
            var result = songs.Select(s => new
            {
                id = $"nct_{s.Key}",
                title = s.Name,
                artist = s.ArtistName,
                cover = s.Image,
                audio = "YT_STREAM",
                isExternal = true,
                source = "nct",
                duration = s.Duration,
                nctKey = s.Key,
            });
            return Ok(new { success = true, data = result, total = songs.Count });
        }

        [HttpGet("nct-similar/{key}")]
        public async Task<ActionResult> NctSimilar(string key, [FromQuery] int limit = 10)
        {
            var songs = await _nctApi.GetSimilarSongsAsync(key, limit);
            var result = songs.Select(s => new
            {
                id = $"nct_{s.Key}",
                title = s.Name,
                artist = s.ArtistName,
                cover = s.Image,
                audio = "YT_STREAM",
                isExternal = true,
                source = "nct",
                duration = s.Duration,
                nctKey = s.Key,
            });
            return Ok(new { success = true, data = result, total = songs.Count });
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
