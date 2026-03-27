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
                        nctKey = key,
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

        // Cache cho từng chart category
        private static readonly Dictionary<string, (List<object> data, DateTime expiry)> _chartCategoryCache = new();

        /// <summary>
        /// GET /api/songs/itunes-top-charts
        /// Proxy for Apple Music RSS Charts (top 50 most-played songs)
        /// </summary>
        private static (List<object> data, DateTime expiry)? _itunesChartsCache = null;

        [HttpGet("itunes-top-charts")]
        public async Task<ActionResult> ItunesTopCharts()
        {
            // Cache 30 min
            if (_itunesChartsCache != null && DateTime.UtcNow < _itunesChartsCache.Value.expiry)
                return Ok(new { success = true, data = _itunesChartsCache.Value.data });

            try
            {
                using var client = new System.Net.Http.HttpClient();
                client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0");
                var json = await client.GetStringAsync("https://rss.applemarketingtools.com/api/v2/us/music/most-played/50/songs.json");
                using var doc = System.Text.Json.JsonDocument.Parse(json);
                var results = doc.RootElement.GetProperty("feed").GetProperty("results");
                var songs = new List<object>();
                foreach (var s in results.EnumerateArray())
                {
                    var artwork = s.TryGetProperty("artworkUrl100", out var art) ? art.GetString() ?? "" : "";
                    songs.Add(new
                    {
                        id = s.TryGetProperty("id", out var idEl) ? idEl.GetString() ?? "" : "",
                        title = s.TryGetProperty("name", out var nameEl) ? nameEl.GetString() ?? "" : "",
                        artist = s.TryGetProperty("artistName", out var artEl) ? artEl.GetString() ?? "" : "",
                        cover = artwork.Replace("100x100bb", "600x600bb"),
                        audio = "YT_STREAM",
                    });
                }
                _itunesChartsCache = (songs, DateTime.UtcNow.AddMinutes(30));
                return Ok(new { success = true, data = songs });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "iTunes charts fetch failed", error = ex.Message });
            }
        }

        /// <summary>
        /// GET /api/songs/nct-chart/{category}
        /// category = "viet" | "chinese"
        /// NCT chart prefixes: viet=1, chinese=14
        /// </summary>
        [HttpGet("nct-chart/{category}")]
        public async Task<ActionResult> NctChartCategory(string category, [FromQuery] int limit = 50)
        {
            // Map category → NCT chart category ID
            // Full chart key format: 1-{categoryId}-d{dayOfYear}-{year}
            // Discovered from nhaccuatui.com homepage API:
            //   1-1 = Nhạc Việt, 1-5 = Thịnh Hành, 1-14 = Nhạc Hoa
            var categoryMap = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase) {
                { "viet", "1" },
                { "chinese", "14" },
                { "trending", "5" },
            };

            if (!categoryMap.TryGetValue(category, out var catId))
                return BadRequest(new { message = "Invalid category. Use: viet, chinese, trending" });

            // Check cache (30 phút)
            var cacheKey = $"nct_chart_{category}_{limit}";
            if (_chartCategoryCache.TryGetValue(cacheKey, out var cached) && DateTime.UtcNow < cached.expiry)
                return Ok(new { success = true, data = cached.data, total = cached.data.Count });

            try
            {
                using var client = new System.Net.Http.HttpClient();
                client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");

                var now = DateTime.UtcNow.AddHours(7);
                string json = "";
                bool found = false;

                for (int offset = 0; offset <= 7 && !found; offset++)
                {
                    var day = now.AddDays(-offset);
                    var chartKey = $"1-{catId}-d{day.DayOfYear}-{day.Year}";
                    var chartUrl = $"https://graph.nhaccuatui.com/api/v1/playlist/charts/{chartKey}?key={chartKey}&isShowLoading=false";
                    try
                    {
                        json = await client.GetStringAsync(chartUrl);
                        using var checkDoc = System.Text.Json.JsonDocument.Parse(json);
                        var checkItems = checkDoc.RootElement.GetProperty("data").GetProperty("items");
                        if (checkItems.GetArrayLength() > 0)
                        {
                            found = true;
                            Console.WriteLine($"[NctChart-{category}] Using chart key: {chartKey} ({checkItems.GetArrayLength()} items)");
                        }
                    }
                    catch { }
                }

                if (!found)
                    return Ok(new { success = true, data = new List<object>(), total = 0 });

                using var doc = System.Text.Json.JsonDocument.Parse(json);
                var items = doc.RootElement.GetProperty("data").GetProperty("items");

                var songs = new List<object>();
                int count = 0;
                foreach (var item in items.EnumerateArray())
                {
                    if (count >= limit) break;

                    var name = item.GetProperty("name").GetString() ?? "";
                    var artistName = "Unknown";
                    if (item.TryGetProperty("artistName", out var aName))
                        artistName = aName.GetString() ?? "Unknown";
                    else if (item.TryGetProperty("artist", out var artistArr) && artistArr.GetArrayLength() > 0)
                        artistName = artistArr[0].GetProperty("name").GetString() ?? "Unknown";

                    var image = item.GetProperty("image").GetString() ?? "";
                    var key = item.GetProperty("key").GetString() ?? "";
                    var duration = item.TryGetProperty("duration", out var dur) ? dur.GetInt32() : 0;

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
                        id = $"nct_{category}_{key}",
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

                _chartCategoryCache[cacheKey] = (songs, DateTime.UtcNow.AddMinutes(30));
                return Ok(new { success = true, data = songs, total = songs.Count });
            }
            catch (System.Exception ex)
            {
                return StatusCode(500, new { message = $"Error fetching NCT {category} chart", details = ex.Message });
            }
        }

        [HttpGet("nct-artists")]
        public async Task<ActionResult> NctArtists()
        {
            try
            {
                using var client = new System.Net.Http.HttpClient();
                client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");

                var artists = new List<object>();
                var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

                // 1) Lấy artist từ top chart
                try
                {
                    var chartUrl = "https://graph.nhaccuatui.com/api/v1/playlist/charts/1-5-d64-2026?key=1-5-d64-2026&isShowLoading=false";
                    var json = await client.GetStringAsync(chartUrl);
                    using var doc = System.Text.Json.JsonDocument.Parse(json);
                    var items = doc.RootElement.GetProperty("data").GetProperty("items");

                    foreach (var item in items.EnumerateArray())
                    {
                        if (item.TryGetProperty("artist", out var artistArr) && artistArr.ValueKind == System.Text.Json.JsonValueKind.Array)
                        {
                            foreach (var a in artistArr.EnumerateArray())
                            {
                                var aName = a.TryGetProperty("name", out var an) ? an.GetString() ?? "" : "";
                                var aImage = a.TryGetProperty("image", out var ai) ? ai.GetString() ?? "" : "";
                                var aKey = a.TryGetProperty("key", out var ak) ? ak.GetString() ?? "" : "";

                                if (string.IsNullOrEmpty(aName) || string.IsNullOrEmpty(aImage) || seen.Contains(aName))
                                    continue;

                                seen.Add(aName);
                                artists.Add(new { id = aKey, name = aName, picture = aImage });
                            }
                        }
                    }
                }
                catch { }

                // 2) Bổ sung từ trending search
                if (artists.Count < 16)
                {
                    try
                    {
                        var trendingUrl = "https://graph.nhaccuatui.com/api/v1/search/song?keyword=nhạc%20trẻ%20hot&pageindex=1&pagesize=30&correct=false";
                        var json = await client.GetStringAsync(trendingUrl);
                        using var doc = System.Text.Json.JsonDocument.Parse(json);
                        var data = doc.RootElement.GetProperty("data");

                        if (data.TryGetProperty("songs", out var songsArr))
                        {
                            foreach (var s in songsArr.EnumerateArray())
                            {
                                if (artists.Count >= 16) break;
                                if (s.TryGetProperty("artist", out var artistArr))
                                {
                                    foreach (var a in artistArr.EnumerateArray())
                                    {
                                        if (artists.Count >= 16) break;
                                        var aName = a.TryGetProperty("name", out var an) ? an.GetString() ?? "" : "";
                                        var aImage = a.TryGetProperty("image", out var ai) ? ai.GetString() ?? "" : "";
                                        var aKey = a.TryGetProperty("key", out var ak) ? ak.GetString() ?? "" : "";

                                        if (string.IsNullOrEmpty(aName) || string.IsNullOrEmpty(aImage) || seen.Contains(aName))
                                            continue;

                                        seen.Add(aName);
                                        artists.Add(new { id = aKey, name = aName, picture = aImage });
                                    }
                                }
                            }
                        }
                    }
                    catch { }
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

        // GET /api/songs/nct-artist-songs?name=ArtistName&limit=20
        [HttpGet("nct-artist-songs")]
        public async Task<ActionResult> NctArtistSongs([FromQuery] string name, [FromQuery] int limit = 20)
        {
            if (string.IsNullOrWhiteSpace(name))
                return BadRequest(new { message = "Artist name is required" });

            try
            {
                using var http = new System.Net.Http.HttpClient();
                http.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0");
                var json = await http.GetStringAsync(
                    $"https://graph.nhaccuatui.com/api/v1/search/song?keyword={System.Net.WebUtility.UrlEncode(name)}&pageindex=1&pagesize={limit}&correct=false");
                using var doc = System.Text.Json.JsonDocument.Parse(json);
                var data = doc.RootElement.GetProperty("data");

                string artistImage = "";
                int followers = 0;
                var tracks = new List<object>();

                if (data.TryGetProperty("songs", out var songsArr))
                {
                    bool artistFound = false;
                    foreach (var s in songsArr.EnumerateArray())
                    {
                        var key = s.TryGetProperty("key", out var k) ? k.GetString() ?? "" : "";
                        var title = s.TryGetProperty("name", out var n) ? n.GetString() ?? "" : "";
                        var artistName2 = s.TryGetProperty("artistName", out var an) ? an.GetString() ?? "" : "";
                        var image = s.TryGetProperty("image", out var img) ? img.GetString() ?? "" : "";
                        var dur = s.TryGetProperty("duration", out var d) ? d.GetInt32() : 0;

                        // Extract 128kbps stream URL
                        string streamUrl = "";
                        if (s.TryGetProperty("streamURL", out var streams))
                        {
                            foreach (var st in streams.EnumerateArray())
                            {
                                if (st.TryGetProperty("type", out var t) && t.GetString() == "128"
                                    && st.TryGetProperty("stream", out var stUrl))
                                {
                                    streamUrl = stUrl.GetString() ?? "";
                                    break;
                                }
                            }
                        }

                        var proxiedUrl = !string.IsNullOrEmpty(streamUrl)
                            ? $"/api/stream/proxy-audio?url={System.Net.WebUtility.UrlEncode(streamUrl)}"
                            : "";

                        tracks.Add(new
                        {
                            id = $"nct_{key}",
                            title,
                            artist = artistName2,
                            cover = image,
                            duration = dur,
                            audio = !string.IsNullOrEmpty(proxiedUrl) ? proxiedUrl : "YT_STREAM",
                            nctKey = key,
                            source = "nct"
                        });

                        // Get artist info from first song
                        if (!artistFound && s.TryGetProperty("artist", out var artistArr))
                        {
                            foreach (var a in artistArr.EnumerateArray())
                            {
                                var aName = a.TryGetProperty("name", out var anm) ? anm.GetString() : "";
                                if (aName != null && aName.Equals(name, StringComparison.OrdinalIgnoreCase))
                                {
                                    artistImage = a.TryGetProperty("image", out var ai) ? ai.GetString() ?? "" : "";
                                    followers = a.TryGetProperty("totalFollow", out var tf) ? tf.GetInt32() : 0;
                                    artistFound = true;
                                    break;
                                }
                            }
                        }
                    }
                }

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        artistName = name,
                        artistImage,
                        followers,
                        tracks
                    }
                });
            }
            catch (System.Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching artist songs", details = ex.Message });
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
        private static bool _npmInstalled = false;

        private static async Task EnsureNpmDeps(string scriptsDir)
        {
            if (_npmInstalled) return;
            var nodeModulesPath = Path.Combine(scriptsDir, "node_modules");
            if (Directory.Exists(nodeModulesPath)) { _npmInstalled = true; return; }

            Console.WriteLine($"[Zing] Installing npm deps in {scriptsDir}");
            var psi = new System.Diagnostics.ProcessStartInfo
            {
                FileName = "npm",
                Arguments = "install --omit=dev --no-optional",
                WorkingDirectory = scriptsDir,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false
            };
            using var proc = System.Diagnostics.Process.Start(psi)!;
            await proc.WaitForExitAsync();
            _npmInstalled = proc.ExitCode == 0;
            Console.WriteLine($"[Zing] npm install exit code: {proc.ExitCode}");
        }

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

                // Auto-install npm deps if missing
                await EnsureNpmDeps(Path.GetDirectoryName(scriptPath)!);

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

        // ── Zing MP3 Search (via Node.js helper) ─────────────────────────────
        [HttpGet("zing-search")]
        public async Task<ActionResult> ZingSearch([FromQuery] string q, [FromQuery] int limit = 10)
        {
            if (string.IsNullOrWhiteSpace(q)) return BadRequest(new { error = "Query is required" });
            try
            {
                var scriptDir = Path.Combine(Directory.GetCurrentDirectory(), "scripts");
                await EnsureNpmDeps(scriptDir);
                var scriptPath = Path.Combine(scriptDir, "zing-search.cjs");
                if (!System.IO.File.Exists(scriptPath))
                    return StatusCode(500, new { error = "zing-search.cjs not found" });

                var psi = new System.Diagnostics.ProcessStartInfo
                {
                    FileName = "node",
                    Arguments = $"\"{scriptPath}\" \"{q.Replace("\"", "\\\"")}\" {limit}",
                    WorkingDirectory = scriptDir,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                };
                using var proc = System.Diagnostics.Process.Start(psi)!;
                var output = await proc.StandardOutput.ReadToEndAsync();
                await proc.WaitForExitAsync();

                if (string.IsNullOrWhiteSpace(output))
                    return Ok(new { songs = Array.Empty<object>() });

                var json = System.Text.Json.JsonDocument.Parse(output);
                return Ok(json.RootElement);
            }
            catch (System.Exception ex)
            {
                Console.WriteLine($"[ZingSearch] ERROR: {ex.Message}");
                return Ok(new { songs = Array.Empty<object>(), error = ex.Message });
            }
        }

        // ── Zing MP3 Single Song Info (via Node.js helper) ──────────────────
        [HttpGet("zing-song/{id}")]
        public async Task<ActionResult> ZingSong(string id)
        {
            try
            {
                var scriptPath = Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "scripts", "zing-song.cjs");
                if (!System.IO.File.Exists(scriptPath))
                    scriptPath = Path.Combine(Directory.GetCurrentDirectory(), "scripts", "zing-song.cjs");

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
                    return StatusCode(500, new { success = false, message = "Failed to fetch song info", details = error });

                using var doc = System.Text.Json.JsonDocument.Parse(output);
                var root = doc.RootElement;

                if (root.TryGetProperty("error", out var errEl))
                    return StatusCode(400, new { success = false, message = errEl.GetString() });

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        id = root.TryGetProperty("id", out var sid) ? sid.GetString() ?? "" : "",
                        title = root.TryGetProperty("title", out var st) ? st.GetString() ?? "" : "",
                        artist = root.TryGetProperty("artist", out var sa) ? sa.GetString() ?? "Unknown" : "Unknown",
                        cover = root.TryGetProperty("cover", out var sc) ? sc.GetString() ?? "" : "",
                        duration = root.TryGetProperty("duration", out var sd) ? sd.GetInt32() : 0
                    }
                });
            }
            catch (System.Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Error fetching Zing song", details = ex.ToString() });
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
            var result = songs.Select(s =>
            {
                var proxiedUrl = !string.IsNullOrEmpty(s.StreamUrl)
                    ? $"/api/stream/proxy-audio?url={System.Net.WebUtility.UrlEncode(s.StreamUrl)}"
                    : "";
                return new
                {
                    id = $"nct_{s.Key}",
                    title = s.Name,
                    artist = s.ArtistName,
                    cover = s.Image,
                    audio = !string.IsNullOrEmpty(proxiedUrl) ? proxiedUrl : "YT_STREAM",
                    isExternal = true,
                    source = "nct",
                    duration = s.Duration,
                    nctKey = s.Key,
                };
            });
            return Ok(new { success = true, data = result, total = songs.Count });
        }

        [HttpGet("search-suggest")]
        public async Task<ActionResult> SearchSuggest([FromQuery] string q)
        {
            if (string.IsNullOrWhiteSpace(q) || q.Length < 1)
                return Ok(new { keywords = Array.Empty<string>(), songs = Array.Empty<object>() });

            try
            {
                // NCT prefix-word (keywords) + NCT search (songs) in parallel
                var keywordsTask = _nctApi.GetSuggestKeywordsAsync(q, 5);
                var songsTask = _nctApi.SearchSongsAsync(q, 1, 6);

                await Task.WhenAll(keywordsTask, songsTask);

                var keywords = keywordsTask.Result ?? new List<string>();
                var nctSongs = (songsTask.Result ?? new List<Soundia.Api.Services.NctSong>())
                    .Take(6)
                    .Select(s => new
                    {
                        title = s.Name,
                        artist = s.ArtistName,
                        cover = s.Image,
                        duration = s.Duration,
                        nctKey = s.Key,
                        source = "nct"
                    }).ToList();

                return Ok(new { keywords, songs = nctSongs });
            }
            catch (System.Exception ex)
            {
                return StatusCode(500, new { message = "Suggest error", details = ex.Message });
            }
        }


        [HttpGet("nct-stream/{key}")]
        public async Task<ActionResult> NctStream(string key)
        {
            var url = await _nctApi.GetStreamUrlAsync(key);
            if (url == null) return NotFound(new { message = "Stream not found" });
            // Proxy through backend to bypass CORS
            var proxyUrl = $"/api/stream/proxy-audio?url={System.Net.WebUtility.UrlEncode(url)}";
            return Ok(new { success = true, streamUrl = proxyUrl, directUrl = url });
        }

        [HttpGet("nct-song-detail/{key}")]
        public async Task<ActionResult> NctSongDetail(string key)
        {
            try
            {
                using var http = new System.Net.Http.HttpClient();
                http.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0");

                // Try Graph API first
                string title = "", artist = "Unknown", cover = "";
                int duration = 0;
                string nctKey = key;
                bool graphOk = false;

                try
                {
                    var json = await http.GetStringAsync($"https://graph.nhaccuatui.com/api/v1/song?key={key}");
                    using var doc = System.Text.Json.JsonDocument.Parse(json);
                    var root = doc.RootElement;
                    if (root.TryGetProperty("data", out var data))
                    {
                        title = data.TryGetProperty("title", out var t) ? t.GetString() ?? "" : "";
                        artist = data.TryGetProperty("artistName", out var a) ? a.GetString() ?? "Unknown" :
                                 data.TryGetProperty("artist", out var a2) ? a2.GetString() ?? "Unknown" : "Unknown";
                        cover = data.TryGetProperty("imageUrl", out var img) ? img.GetString() ?? "" :
                                data.TryGetProperty("thumbnail", out var th) ? th.GetString() ?? "" : "";
                        duration = data.TryGetProperty("duration", out var dur) ? dur.GetInt32() : 0;
                        graphOk = true;
                    }
                }
                catch { /* Graph API failed, try scraping */ }

                // Fallback: scrape NCT page for title/artist, then use NCT search
                if (!graphOk)
                {
                    try
                    {
                        var html = await http.GetStringAsync($"https://www.nhaccuatui.com/song/{key}");
                        // Extract from <title>TITLE - ARTIST - mp3 download | lyric - NhacCuaTui</title>
                        var titleMatch = System.Text.RegularExpressions.Regex.Match(html, @"<title>(.+?)\s*-\s*mp3\s*download", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                        if (titleMatch.Success)
                        {
                            var parts = titleMatch.Groups[1].Value.Split(new[] { " - " }, 2, StringSplitOptions.None);
                            title = parts[0].Trim();
                            artist = parts.Length > 1 ? parts[1].Trim() : "Unknown";
                        }
                        // Extract og:image for cover
                        var ogImg = System.Text.RegularExpressions.Regex.Match(html, @"og:image""\s*content=""([^""]+)""");
                        if (ogImg.Success) cover = ogImg.Groups[1].Value;

                        // Search NCT to find the real key + stream
                        if (!string.IsNullOrEmpty(title))
                        {
                            var searchResults = await _nctApi.SearchSongsAsync($"{title} {artist}", 1, 5);
                            var match = searchResults.FirstOrDefault();
                            if (match != null)
                            {
                                nctKey = match.Key;
                                if (string.IsNullOrEmpty(cover)) cover = match.Image ?? "";
                                duration = match.Duration;
                            }
                        }
                    }
                    catch { }
                }

                if (string.IsNullOrEmpty(title))
                    return NotFound(new { message = "Song not found" });

                // Get stream URL
                var streamUrl = await _nctApi.GetStreamUrlAsync(nctKey);
                var proxyUrl = !string.IsNullOrEmpty(streamUrl)
                    ? $"/api/stream/proxy-audio?url={System.Net.WebUtility.UrlEncode(streamUrl)}"
                    : "";

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        id = $"nct_{nctKey}",
                        title,
                        artist,
                        cover,
                        duration,
                        audio = !string.IsNullOrEmpty(proxyUrl) ? proxyUrl : "YT_STREAM",
                        nctKey,
                        source = "nct"
                    }
                });
            }
            catch (System.Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching NCT song", details = ex.Message });
            }
        }

        [HttpGet("nct-resolve")]
        public async Task<ActionResult> NctResolve([FromQuery] string title, [FromQuery] string artist, [FromQuery] int duration = 0)
        {
            if (string.IsNullOrWhiteSpace(title))
                return BadRequest(new { message = "title is required" });
            
            var (url, nctKey) = await _nctApi.ResolveStreamByTitleAsync(title, artist ?? "", duration);
            if (url == null)
            {
                return Ok(new { found = false });
            }
            var proxyUrl = $"/api/stream/proxy-audio?url={System.Net.WebUtility.UrlEncode(url)}";
            return Ok(new { found = true, success = true, streamUrl = proxyUrl, directUrl = url, nctKey = nctKey });
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

        // ── NCT Playlist Search (for genres/topics) ────────────────────────────
        [HttpGet("nct-search-playlists")]
        public async Task<ActionResult> NctSearchPlaylists([FromQuery] string keyword, [FromQuery] int limit = 4)
        {
            if (string.IsNullOrWhiteSpace(keyword))
                return BadRequest(new { message = "keyword is required" });

            var cacheKey = $"nct_pl_search_{keyword}_{limit}";
            if (_playlistSearchCache.TryGetValue(cacheKey, out var cached) && DateTime.UtcNow < cached.expiry)
                return Ok(new { success = true, data = cached.data });

            try
            {
                using var client = new System.Net.Http.HttpClient();
                client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
                var url = $"https://graph.nhaccuatui.com/api/v1/search/playlist?keyword={Uri.EscapeDataString(keyword)}&pageindex=1&pagesize={limit}&correct=false";
                var json = await client.GetStringAsync(url);
                using var doc = System.Text.Json.JsonDocument.Parse(json);
                var root = doc.RootElement;

                if (root.GetProperty("code").GetInt32() != 0)
                    return Ok(new { success = true, data = new List<object>() });

                var playlists = new List<object>();
                if (root.TryGetProperty("data", out var data) && data.TryGetProperty("playlists", out var pls))
                {
                    foreach (var pl in pls.EnumerateArray())
                    {
                        if (playlists.Count >= limit) break;
                        playlists.Add(new
                        {
                            key = pl.TryGetProperty("key", out var k) ? k.GetString() : "",
                            name = pl.TryGetProperty("name", out var n) ? n.GetString() : "",
                            image = pl.TryGetProperty("image", out var img) ? img.GetString() : "",
                            totalSongs = pl.TryGetProperty("totalSongs", out var ts) ? ts.GetInt32() : 0,
                            description = pl.TryGetProperty("description", out var d2) ? d2.GetString() : "",
                        });
                    }
                }

                _playlistSearchCache[cacheKey] = (playlists.Cast<object>().ToList(), DateTime.UtcNow.AddHours(6));
                return Ok(new { success = true, data = playlists });
            }
            catch (System.Exception ex)
            {
                return StatusCode(500, new { message = "Error searching NCT playlists", details = ex.Message });
            }
        }

        private static readonly Dictionary<string, (List<object> data, DateTime expiry)> _playlistSearchCache = new();

        // ── Zing MP3 New Releases ──────────────────────────────────────────────
        private static List<object>? _cachedZingNewReleases;
        private static DateTime _zingNewReleasesCacheExpiry = DateTime.MinValue;

        [HttpGet("zing-new-releases")]
        public async Task<ActionResult> ZingNewReleases([FromQuery] int limit = 12)
        {
            if (_cachedZingNewReleases != null && DateTime.UtcNow < _zingNewReleasesCacheExpiry)
                return Ok(new { success = true, data = _cachedZingNewReleases.Take(limit) });

            try
            {
                var scriptPath = Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "scripts", "zing-new-release.cjs");
                if (!System.IO.File.Exists(scriptPath))
                    scriptPath = Path.Combine(Directory.GetCurrentDirectory(), "scripts", "zing-new-release.cjs");

                var psi = new System.Diagnostics.ProcessStartInfo
                {
                    FileName = "node",
                    Arguments = $"\"{scriptPath}\"",
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
                await process.WaitForExitAsync();

                if (process.ExitCode != 0 || string.IsNullOrEmpty(output))
                    return StatusCode(500, new { success = false, message = "Failed to fetch new releases" });

                using var doc = System.Text.Json.JsonDocument.Parse(output);
                var root = doc.RootElement;

                if (root.TryGetProperty("error", out var errEl))
                    return StatusCode(400, new { success = false, message = errEl.GetString() });

                var songs = new List<object>();
                if (root.TryGetProperty("songs", out var songsArr))
                {
                    foreach (var item in songsArr.EnumerateArray())
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
                        });
                    }
                }

                _cachedZingNewReleases = songs;
                _zingNewReleasesCacheExpiry = DateTime.UtcNow.AddHours(1);

                return Ok(new { success = true, data = songs.Take(limit) });
            }
            catch (System.Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Error fetching Zing new releases", details = ex.Message });
            }
        }

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

            // Don't save NCT stream URLs or proxy URLs to DB — they expire!
            // Save as YT_STREAM so they get re-resolved each time
            if (!string.IsNullOrEmpty(song.AudioUrl) && 
                (song.AudioUrl.Contains("stream.nct.vn") || 
                 song.AudioUrl.Contains("proxy-audio") || 
                 song.AudioUrl.Contains("a01.nct.vn")))
            {
                Console.WriteLine($"[External] Replacing expiring NCT URL with YT_STREAM for: {song.Title}");
                song.AudioUrl = "YT_STREAM";
            }

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

        // ── Search Local Songs (admin-imported) ──────────────────────────────
        [HttpGet("search-local")]
        public async Task<ActionResult> SearchLocal([FromQuery] string q, [FromQuery] int limit = 10)
        {
            if (string.IsNullOrWhiteSpace(q)) return Ok(new { data = Array.Empty<object>() });
            var keyword = q.Trim().ToLower();
            var songs = await _context.Songs
                .Where(s => s.Title.ToLower().Contains(keyword) || s.Artist.ToLower().Contains(keyword))
                .OrderByDescending(s => s.Id)
                .Take(limit)
                .Select(s => new
                {
                    id = $"local_{s.Id}",
                    s.Title,
                    s.Artist,
                    s.Duration,
                    cover = s.CoverUrl ?? "",
                    audio = s.AudioUrl ?? "YT_STREAM",
                    source = "local"
                })
                .ToListAsync();
            return Ok(new { data = songs });
        }

        // ─── NCT Album (Top 100 Curated Playlists) ─────────────────────
        // GET /api/songs/nct-albums?limit=20
        [HttpGet("nct-albums")]
        public async Task<IActionResult> NctAlbumSearch([FromQuery] int limit = 20)
        {
            try
            {
                using var client = new System.Net.Http.HttpClient();
                client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");

                // Fetch curated Top 100 playlists from NCT (updated regularly by NCT editors)
                var url = "https://graph.nhaccuatui.com/api/v1/app/playlist/top-100";
                var json = await client.GetStringAsync(url);
                using var doc = System.Text.Json.JsonDocument.Parse(json);
                var root = doc.RootElement;

                var results = new List<object>();
                if (root.TryGetProperty("data", out var areaArr))
                {
                    foreach (var area in areaArr.EnumerateArray())
                    {
                        if (results.Count >= limit) break;
                        var areaName = area.TryGetProperty("area", out var an) ? an.GetString() : "";
                        if (!area.TryGetProperty("data", out var playlists)) continue;
                        foreach (var pl in playlists.EnumerateArray())
                        {
                            if (results.Count >= limit) break;
                            results.Add(new
                            {
                                key = pl.TryGetProperty("key", out var k) ? k.GetString() : "",
                                name = pl.TryGetProperty("name", out var n) ? n.GetString() : "",
                                image = pl.TryGetProperty("image", out var img) ? img.GetString() : "",
                                artistName = pl.TryGetProperty("subName", out var sn) ? sn.GetString() : "",
                                area = areaName,
                                totalSongs = 0,
                                description = "",
                            });
                        }
                    }
                }

                return Ok(new { success = true, data = results });
            }
            catch (System.Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching NCT albums", details = ex.Message });
            }
        }

        // ─── NCT Video (MV) Search — trending ────────────────────────────
        // GET /api/songs/nct-videos?limit=20
        [HttpGet("nct-videos")]
        public async Task<IActionResult> NctVideoSearch([FromQuery] int limit = 20)
        {
            try
            {
                using var client = new System.Net.Http.HttpClient();
                client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");

                var results = new List<object>();
                // Use trending artist/song keywords to get latest MVs
                var keywords = new[] { "HIEUTHUHAI", "Sơn Tùng MTP", "Đức Phúc", "bích phương", "erik", "hoàng thùy linh", "jack", "amee", "mono", "tlinh" };

                foreach (var kw in keywords)
                {
                    if (results.Count >= limit) break;
                    try
                    {
                        var url = $"https://graph.nhaccuatui.com/api/v1/search/video?keyword={Uri.EscapeDataString(kw)}&pageindex=1&pagesize=3&correct=false";
                        var json = await client.GetStringAsync(url);
                        using var doc = System.Text.Json.JsonDocument.Parse(json);
                        var root = doc.RootElement;

                        if (root.GetProperty("code").GetInt32() != 0) continue;
                        if (!root.TryGetProperty("data", out var data) || !data.TryGetProperty("videos", out var vids)) continue;

                        foreach (var v in vids.EnumerateArray())
                        {
                            if (results.Count >= limit) break;
                            var key = v.TryGetProperty("key", out var k2) ? k2.GetString() : "";
                            if (results.Any(r => ((dynamic)r).key == key)) continue;
                            results.Add(new
                            {
                                key,
                                name = v.TryGetProperty("name", out var n) ? n.GetString() : "",
                                artistName = v.TryGetProperty("artistName", out var a2) ? a2.GetString() : "",
                                image = v.TryGetProperty("image", out var im2) ? im2.GetString() : "",
                                duration = v.TryGetProperty("duration", out var d2) ? d2.GetInt32() : 0,
                            });
                        }
                    }
                    catch { /* skip failed keyword */ }
                }

                return Ok(new { success = true, data = results });
            }
            catch (System.Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching NCT videos", details = ex.Message });
            }
        }

        // ─── NCT Video Detail ─────────────────────────────────────────
        // GET /api/songs/nct-video-detail/{key}
        [HttpGet("nct-video-detail/{key}")]
        public async Task<IActionResult> NctVideoDetail(string key)
        {
            try
            {
                using var client = new System.Net.Http.HttpClient();
                client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");

                // Get video detail from NCT graph API
                var url = $"https://graph.nhaccuatui.com/api/v1/video/detail/{key}";
                var json = await client.GetStringAsync(url);
                using var doc = System.Text.Json.JsonDocument.Parse(json);
                var root = doc.RootElement;

                if (root.GetProperty("code").GetInt32() != 0)
                    return NotFound(new { message = "Video not found" });

                var data = root.GetProperty("data");
                var name = data.TryGetProperty("name", out var n) ? n.GetString() : "";
                var artistName = data.TryGetProperty("artistName", out var an) ? an.GetString() : "";
                var image = data.TryGetProperty("image", out var img) ? img.GetString() : "";
                var duration = data.TryGetProperty("duration", out var dur) ? dur.GetInt32() : 0;
                var linkShare = data.TryGetProperty("linkShare", out var ls) ? ls.GetString() : "";

                // Try to get stream URL from streamURL array
                string videoUrl = "";
                if (data.TryGetProperty("streamURL", out var streams))
                {
                    foreach (var stream in streams.EnumerateArray())
                    {
                        if (stream.TryGetProperty("stream", out var su))
                        {
                            videoUrl = su.GetString() ?? "";
                            break;
                        }
                    }
                }

                // If no stream from API, try scraping the web page
                if (string.IsNullOrEmpty(videoUrl) && !string.IsNullOrEmpty(linkShare))
                {
                    try
                    {
                        var html = await client.GetStringAsync(linkShare);
                        var nuxtMatch = System.Text.RegularExpressions.Regex.Match(html,
                            @"<script[^>]*id=""__NUXT_DATA__""[^>]*>([\s\S]*?)</script>");
                        if (nuxtMatch.Success)
                        {
                            var nuxtArr = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement[]>(nuxtMatch.Groups[1].Value);
                            foreach (var item in nuxtArr)
                            {
                                if (item.ValueKind != System.Text.Json.JsonValueKind.String) continue;
                                var v = item.GetString();
                                if (v != null && (v.Contains(".mp4") || v.Contains("video")) && (v.Contains("stream.nct.vn") || v.Contains("a01.nct.vn")))
                                {
                                    videoUrl = v;
                                    break;
                                }
                            }
                        }
                    }
                    catch { /* ignore scrape failures */ }
                }

                // Proxy the video URL
                var proxiedVideoUrl = !string.IsNullOrEmpty(videoUrl)
                    ? $"/api/stream/proxy-audio?url={System.Net.WebUtility.UrlEncode(videoUrl)}"
                    : "";

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        key,
                        name,
                        artistName,
                        image,
                        duration,
                        videoUrl = proxiedVideoUrl,
                        linkShare,
                    }
                });
            }
            catch (System.Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching NCT video detail", details = ex.Message });
            }
        }
    }
}
