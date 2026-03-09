using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace Soundia.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LyricsController : ControllerBase
    {
        // Cache lyrics for 24 hours
        private static readonly Dictionary<string, (object Data, DateTime Expiry)> _cache = new();

        /// <summary>
        /// Proxy lyrics from multiple sources to avoid CORS.
        /// GET /api/lyrics?track=SongTitle&artist=ArtistName&nctKey=optional
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetLyrics([FromQuery] string track, [FromQuery] string artist, [FromQuery] string? nctKey = null)
        {
            if (string.IsNullOrWhiteSpace(track) || string.IsNullOrWhiteSpace(artist))
                return BadRequest(new { message = "track and artist are required" });

            var cacheKey = $"{track.Trim().ToLowerInvariant()}|{artist.Trim().ToLowerInvariant()}|{(nctKey ?? "").Trim()}";

            // Check cache
            if (_cache.TryGetValue(cacheKey, out var cached) && cached.Expiry > DateTime.UtcNow)
            {
                Console.WriteLine($"[Lyrics] Cache HIT: {track} - {artist}");
                return Ok(cached.Data);
            }

            using var http = new HttpClient();
            http.Timeout = TimeSpan.FromSeconds(6);
            http.DefaultRequestHeaders.Add("User-Agent",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");

            // Clean title: remove (feat. X), [Official MV], etc.
            var cleanTrack = System.Text.RegularExpressions.Regex.Replace(track,
                @"\s*[\(\[].*?[\)\]]\s*", "").Trim();
            cleanTrack = System.Text.RegularExpressions.Regex.Replace(cleanTrack,
                @"\s*[-–]\s*(Official|MV|Lyric|Audio|Video|Music Video).*", "",
                System.Text.RegularExpressions.RegexOptions.IgnoreCase).Trim();
            var cleanArtist = artist.Split(",")[0].Trim();

            Console.WriteLine($"[Lyrics] Searching for: {track} - {artist} (clean: {cleanTrack} - {cleanArtist})");

            // Biến lưu NCT plain lyrics fallback (dùng cuối nếu LRCLib không có synced)
            string? nctFallbackPlain = null;
            
            // ═══ Strategy 0: NCT Lyrics (scrape song page — lấy synced LRC + plain lyrics) ═══
            if (!string.IsNullOrWhiteSpace(nctKey))
            {
                try
                {
                    Console.WriteLine($"[Lyrics] Trying NCT page scrape for key: {nctKey}");
                    
                    // Fetch song page HTML — chứa inline JSON data với timedLyric URL và content
                    var pageUrl = $"https://www.nhaccuatui.com/song/{nctKey}";
                    var pageHtml = await http.GetStringAsync(pageUrl);
                    
                    string? syncedLyrics = null;
                    string plainLyrics = "";
                    
                    // 1) Tìm LRC URL trực tiếp (lyric.nct.vn CDN)
                    var lrcMatch = System.Text.RegularExpressions.Regex.Match(pageHtml, 
                        @"""(https?://lyric\.nct\.vn/[^""]+\.lrc)""");
                    if (lrcMatch.Success)
                    {
                        var lrcUrl = lrcMatch.Groups[1].Value;
                        Console.WriteLine($"[Lyrics] Found NCT LRC URL: {lrcUrl}");
                        try 
                        {
                            var lrcContent = await http.GetStringAsync(lrcUrl);
                            // NCT có thể mã hóa LRC — check nếu toàn hex thì skip
                            bool isEncrypted = System.Text.RegularExpressions.Regex.IsMatch(
                                lrcContent.Trim(), @"^[0-9A-Fa-f]+$");
                            if (!isEncrypted && lrcContent.Contains("["))
                            {
                                syncedLyrics = lrcContent;
                                plainLyrics = System.Text.RegularExpressions.Regex.Replace(
                                    syncedLyrics, @"\[\d{2}:\d{2}\.\d{2,3}\]", "").Trim();
                            }
                            else
                            {
                                Console.WriteLine($"[Lyrics] NCT LRC is encrypted, skipping");
                            }
                        }
                        catch (Exception ex) { Console.WriteLine($"[Lyrics] Failed to fetch LRC: {ex.Message}"); }
                    }
                    
                    // 2) Nếu không có LRC, tìm plain lyrics trong HTML
                    if (string.IsNullOrWhiteSpace(plainLyrics))
                    {
                        // Tìm block text dài có \\n (lyrics)
                        var contentMatches = System.Text.RegularExpressions.Regex.Matches(pageHtml,
                            @"""((?:[^""\\]|\\.){100,})""");
                        foreach (System.Text.RegularExpressions.Match cm in contentMatches)
                        {
                            var val = cm.Groups[1].Value;
                            // Skip hex-only strings (encrypted data)
                            if (System.Text.RegularExpressions.Regex.IsMatch(val, @"^[0-9A-Fa-f]+$")) continue;
                            // Skip URLs, paths, HTML
                            if (val.StartsWith("http") || val.Contains("<br/>") || val.Contains("Artist:")) continue;
                            // Lyrics chứa nhiều \\n (line breaks) và có spaces (text thường)
                            if (val.Contains("\\n") && System.Text.RegularExpressions.Regex.Matches(val, @"\\n").Count >= 5 
                                && val.Contains(" "))
                            {
                                plainLyrics = val
                                    .Replace("\\n", "\n")
                                    .Replace("\\t", " ")
                                    .Replace("\\\"", "\"");
                                plainLyrics = System.Net.WebUtility.HtmlDecode(plainLyrics).Trim();
                                Console.WriteLine($"[Lyrics] Found NCT plain lyrics ({plainLyrics.Length} chars)");
                                break;
                            }
                        }
                    }
                    
                    // Nếu NCT có synced (LRC không encrypt) → trả ngay
                    if (syncedLyrics != null && !string.IsNullOrWhiteSpace(plainLyrics))
                    {
                        Console.WriteLine($"[Lyrics] NCT found synced lyrics for: {track}");
                        var result = new { syncedLyrics, plainLyrics, source = "nct" };
                        _cache[cacheKey] = (result, DateTime.UtcNow.AddHours(24));
                        return Ok(result);
                    }
                    
                    // NCT LRC bị encrypt → lưu plain lyrics làm fallback, tiếp tục LRCLib lấy synced
                    if (!string.IsNullOrWhiteSpace(plainLyrics) && plainLyrics.Length > 20)
                    {
                        nctFallbackPlain = plainLyrics;
                        Console.WriteLine($"[Lyrics] NCT has plain lyrics only (LRC encrypted). Trying LRCLib for synced...");
                    }
                }
                catch (Exception ex) { Console.WriteLine($"[Lyrics] NCT scrape error: {ex.Message}"); }
            }

            // Strategy 1: LRCLib exact match
            try
            {
                var url = $"https://lrclib.net/api/get?track_name={Uri.EscapeDataString(track)}&artist_name={Uri.EscapeDataString(artist)}";
                var res = await http.GetAsync(url);
                if (res.IsSuccessStatusCode)
                {
                    var json = await res.Content.ReadAsStringAsync();
                    var data = JsonSerializer.Deserialize<JsonElement>(json);

                    var hasSynced = data.TryGetProperty("syncedLyrics", out var synced) && synced.ValueKind != JsonValueKind.Null;
                    var hasPlain = data.TryGetProperty("plainLyrics", out var plain) && plain.ValueKind != JsonValueKind.Null;

                    if (hasSynced || hasPlain)
                    {
                        Console.WriteLine($"[Lyrics] LRCLib exact match found for: {track}");
                        var result = new
                        {
                            syncedLyrics = hasSynced ? synced.GetString() : null,
                            plainLyrics = hasPlain ? plain.GetString() : null,
                            source = "lrclib-exact"
                        };
                        _cache[cacheKey] = (result, DateTime.UtcNow.AddHours(24));
                        return Ok(result);
                    }
                }
            }
            catch (Exception ex) { Console.WriteLine($"[Lyrics] LRCLib exact error: {ex.Message}"); }

            // Strategy 2: LRCLib search (fuzzy)
            try
            {
                var q = Uri.EscapeDataString($"{cleanTrack} {cleanArtist}");
                var url = $"https://lrclib.net/api/search?q={q}";
                var res = await http.GetAsync(url);
                if (res.IsSuccessStatusCode)
                {
                    var json = await res.Content.ReadAsStringAsync();
                    var results = JsonSerializer.Deserialize<JsonElement>(json);

                    if (results.ValueKind == JsonValueKind.Array && results.GetArrayLength() > 0)
                    {
                        // Find best result that has lyrics
                        JsonElement? best = null;
                        foreach (var item in results.EnumerateArray())
                        {
                            if (item.TryGetProperty("syncedLyrics", out var sl) && sl.ValueKind != JsonValueKind.Null)
                            {
                                best = item;
                                break;
                            }
                            if (best == null && item.TryGetProperty("plainLyrics", out var pl) && pl.ValueKind != JsonValueKind.Null)
                            {
                                best = item;
                            }
                        }

                        if (best.HasValue)
                        {
                            var b = best.Value;
                            var hasSynced = b.TryGetProperty("syncedLyrics", out var synced) && synced.ValueKind != JsonValueKind.Null;
                            var hasPlain = b.TryGetProperty("plainLyrics", out var plain) && plain.ValueKind != JsonValueKind.Null;

                            Console.WriteLine($"[Lyrics] LRCLib search found for: {cleanTrack}");
                            var result = new
                            {
                                syncedLyrics = hasSynced ? synced.GetString() : null,
                                plainLyrics = hasPlain ? plain.GetString() : null,
                                source = "lrclib-search"
                            };
                            _cache[cacheKey] = (result, DateTime.UtcNow.AddHours(24));
                            return Ok(result);
                        }
                    }
                }
            }
            catch (Exception ex) { Console.WriteLine($"[Lyrics] LRCLib search error: {ex.Message}"); }

            // Strategy 3: lyrics.ovh fallback (short timeout vì API này hay chậm)
            try
            {
                using var ovhHttp = new HttpClient { Timeout = TimeSpan.FromSeconds(3) };
                var url = $"https://api.lyrics.ovh/v1/{Uri.EscapeDataString(cleanArtist)}/{Uri.EscapeDataString(cleanTrack)}";
                var res = await ovhHttp.GetAsync(url);
                if (res.IsSuccessStatusCode)
                {
                    var json = await res.Content.ReadAsStringAsync();
                    var data = JsonSerializer.Deserialize<JsonElement>(json);

                    if (data.TryGetProperty("lyrics", out var lyrics) && lyrics.ValueKind != JsonValueKind.Null)
                    {
                        var lyricsText = lyrics.GetString();
                        if (!string.IsNullOrWhiteSpace(lyricsText))
                        {
                            Console.WriteLine($"[Lyrics] lyrics.ovh found for: {cleanTrack}");
                            var result = new
                            {
                                syncedLyrics = (string?)null,
                                plainLyrics = lyricsText,
                                source = "lyrics-ovh"
                            };
                            _cache[cacheKey] = (result, DateTime.UtcNow.AddHours(24));
                            return Ok(result);
                        }
                    }
                }
            }
            catch (Exception ex) { Console.WriteLine($"[Lyrics] lyrics.ovh error: {ex.Message}"); }

            // Strategy 4: Genius search + scrape (nguồn lyrics lớn nhất, hỗ trợ tiếng Việt tốt)
            try
            {
                using var geniusHttp = new HttpClient { Timeout = TimeSpan.FromSeconds(6) };
                geniusHttp.DefaultRequestHeaders.Add("User-Agent",
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");

                var searchQuery = Uri.EscapeDataString($"{cleanTrack} {cleanArtist}");
                var searchUrl = $"https://genius.com/api/search/multi?q={searchQuery}";
                var searchRes = await geniusHttp.GetStringAsync(searchUrl);
                var searchData = JsonSerializer.Deserialize<JsonElement>(searchRes);

                string? geniusPath = null;
                if (searchData.TryGetProperty("response", out var response) &&
                    response.TryGetProperty("sections", out var sections))
                {
                    foreach (var section in sections.EnumerateArray())
                    {
                        if (section.TryGetProperty("hits", out var hits))
                        {
                            foreach (var hit in hits.EnumerateArray())
                            {
                                if (hit.TryGetProperty("result", out var hitResult) &&
                                    hitResult.TryGetProperty("path", out var path))
                                {
                                    geniusPath = path.GetString();
                                    break;
                                }
                            }
                        }
                        if (geniusPath != null) break;
                    }
                }

                if (!string.IsNullOrEmpty(geniusPath))
                {
                    var pageUrl = $"https://genius.com{geniusPath}";
                    var pageHtml = await geniusHttp.GetStringAsync(pageUrl);

                    // Extract lyrics from Genius HTML - lyrics are in data-lyrics-container divs
                    var lyricsBuilder = new System.Text.StringBuilder();
                    var containerRegex = new System.Text.RegularExpressions.Regex(
                        @"data-lyrics-container=""true""[^>]*>(.*?)</div>",
                        System.Text.RegularExpressions.RegexOptions.Singleline);
                    var matches = containerRegex.Matches(pageHtml);

                    foreach (System.Text.RegularExpressions.Match m in matches)
                    {
                        var html = m.Groups[1].Value;
                        // Replace <br/> with newlines
                        html = System.Text.RegularExpressions.Regex.Replace(html, @"<br\s*/?>", "\n");
                        // Remove all HTML tags
                        html = System.Text.RegularExpressions.Regex.Replace(html, @"<[^>]+>", "");
                        // Decode HTML entities
                        html = System.Net.WebUtility.HtmlDecode(html);
                        lyricsBuilder.AppendLine(html.Trim());
                    }

                    var geniusLyrics = lyricsBuilder.ToString().Trim();
                    if (!string.IsNullOrWhiteSpace(geniusLyrics) && geniusLyrics.Length > 20)
                    {
                        Console.WriteLine($"[Lyrics] Genius found for: {cleanTrack}");
                        var result = new
                        {
                            syncedLyrics = (string?)null,
                            plainLyrics = geniusLyrics,
                            source = "genius"
                        };
                        _cache[cacheKey] = (result, DateTime.UtcNow.AddHours(24));
                        return Ok(result);
                    }
                }
            }
            catch (Exception ex) { Console.WriteLine($"[Lyrics] Genius error: {ex.Message}"); }

            // Trước khi return 404, check NCT fallback
            if (!string.IsNullOrWhiteSpace(nctFallbackPlain))
            {
                Console.WriteLine($"[Lyrics] Using NCT fallback plain lyrics for: {track}");
                var nctResult = new { syncedLyrics = (string?)null, plainLyrics = nctFallbackPlain, source = "nct" };
                _cache[cacheKey] = (nctResult, DateTime.UtcNow.AddHours(24));
                return Ok(nctResult);
            }

            // All strategies failed
            Console.WriteLine($"[Lyrics] No lyrics found for: {track} - {artist}");
            var notFound = new { syncedLyrics = (string?)null, plainLyrics = (string?)null, source = "none" };
            _cache[cacheKey] = (notFound, DateTime.UtcNow.AddHours(1));
            return NotFound(new { message = "Không tìm thấy lời bài hát." });
        }
        // Helper: lấy danh sách keys trong JsonElement
        private static IEnumerable<string> GetJsonKeys(JsonElement element)
        {
            if (element.ValueKind == System.Text.Json.JsonValueKind.Object)
            {
                foreach (var prop in element.EnumerateObject())
                    yield return prop.Name;
            }
        }
    }
}
