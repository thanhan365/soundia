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
            
            // ═══ Strategy 0: NCT Lyrics via Graph API (primary — lấy plain + decrypt synced LRC) ═══
            if (!string.IsNullOrWhiteSpace(nctKey))
            {
                try
                {
                    Console.WriteLine($"[Lyrics] Trying NCT Graph API for key: {nctKey}");
                    
                    var nctLyricUrl = $"https://graph.nhaccuatui.com/api/v1/song/lyric/detail?songKey={nctKey}";
                    var nctRes = await http.GetStringAsync(nctLyricUrl);
                    var nctDoc = JsonSerializer.Deserialize<JsonElement>(nctRes);
                    
                    if (nctDoc.TryGetProperty("data", out var nctData))
                    {
                        string plainLyrics = "";
                        string? syncedLyrics = null;
                        
                        // 1) Plain lyrics từ "content" field
                        if (nctData.TryGetProperty("content", out var content) && content.ValueKind == JsonValueKind.String)
                        {
                            plainLyrics = content.GetString()?.Trim() ?? "";
                            Console.WriteLine($"[Lyrics] NCT API plain lyrics: {plainLyrics.Length} chars");
                        }
                        
                        // 2) Synced LRC: download + decrypt
                        if (nctData.TryGetProperty("timedLyric", out var timedLyric) && timedLyric.ValueKind == JsonValueKind.String)
                        {
                            var lrcUrl = timedLyric.GetString();
                            var decryptKey = "Lyr1cjust4nct"; // Default NCT decrypt key
                            if (nctData.TryGetProperty("keyDecryptLyric", out var kd) && kd.ValueKind == JsonValueKind.String)
                                decryptKey = kd.GetString() ?? decryptKey;
                            
                            if (!string.IsNullOrEmpty(lrcUrl))
                            {
                                try
                                {
                                    Console.WriteLine($"[Lyrics] Fetching NCT LRC: {lrcUrl}");
                                    var lrcBytes = await http.GetByteArrayAsync(lrcUrl);
                                    var lrcRaw = System.Text.Encoding.UTF8.GetString(lrcBytes);
                                    
                                    // Check if LRC is plain text (starts with [) or encrypted (hex string)
                                    if (lrcRaw.TrimStart().StartsWith("["))
                                    {
                                        syncedLyrics = lrcRaw;
                                        Console.WriteLine($"[Lyrics] NCT LRC plain text (not encrypted)");
                                    }
                                    else
                                    {
                                        // Try decrypt with AES (NCT encrypts LRC with AES-ECB)
                                        try
                                        {
                                            var keyBytes = System.Text.Encoding.UTF8.GetBytes(decryptKey.PadRight(16, '\0').Substring(0, 16));
                                            using var aes = System.Security.Cryptography.Aes.Create();
                                            aes.Key = keyBytes;
                                            aes.Mode = System.Security.Cryptography.CipherMode.ECB;
                                            aes.Padding = System.Security.Cryptography.PaddingMode.PKCS7;
                                            
                                            // LRC data might be hex-encoded or raw bytes
                                            byte[] encryptedBytes;
                                            if (System.Text.RegularExpressions.Regex.IsMatch(lrcRaw.Trim(), @"^[0-9A-Fa-f]+$"))
                                            {
                                                // Hex-encoded
                                                encryptedBytes = Enumerable.Range(0, lrcRaw.Trim().Length / 2)
                                                    .Select(i => Convert.ToByte(lrcRaw.Trim().Substring(i * 2, 2), 16))
                                                    .ToArray();
                                            }
                                            else
                                            {
                                                encryptedBytes = lrcBytes;
                                            }
                                            
                                            using var decryptor = aes.CreateDecryptor();
                                            var decryptedBytes = decryptor.TransformFinalBlock(encryptedBytes, 0, encryptedBytes.Length);
                                            var decrypted = System.Text.Encoding.UTF8.GetString(decryptedBytes);
                                            
                                            if (decrypted.Contains("[") && decrypted.Contains(":"))
                                            {
                                                syncedLyrics = decrypted;
                                                Console.WriteLine($"[Lyrics] NCT LRC decrypted successfully ({syncedLyrics.Length} chars)");
                                            }
                                            else
                                            {
                                                Console.WriteLine($"[Lyrics] NCT LRC decrypted but doesn't look like LRC format");
                                            }
                                        }
                                        catch (Exception dex) 
                                        { 
                                            Console.WriteLine($"[Lyrics] NCT LRC decrypt failed: {dex.Message}"); 
                                        }
                                    }
                                }
                                catch (Exception lrcEx) { Console.WriteLine($"[Lyrics] NCT LRC fetch error: {lrcEx.Message}"); }
                            }
                        }
                        
                        // Trả kết quả NCT nếu có SYNCED lyrics (chữ chạy theo nhạc)
                        if (syncedLyrics != null)
                        {
                            // Có synced → extract plain nếu thiếu
                            if (string.IsNullOrWhiteSpace(plainLyrics))
                            {
                                plainLyrics = System.Text.RegularExpressions.Regex.Replace(
                                    syncedLyrics, @"\[\d{2}:\d{2}\.\d{2,3}\]", "").Trim();
                            }
                            
                            Console.WriteLine($"[Lyrics] NCT API success with SYNCED for: {track}");
                            var result = new { syncedLyrics, plainLyrics, source = "nct" };
                            _cache[cacheKey] = (result, DateTime.UtcNow.AddHours(24));
                            return Ok(result);
                        }
                        
                        // Chỉ có plain (LRC decrypt fail) → lưu fallback, tiếp tục tìm synced
                        if (!string.IsNullOrWhiteSpace(plainLyrics) && plainLyrics.Length > 20)
                        {
                            nctFallbackPlain = plainLyrics;
                            Console.WriteLine($"[Lyrics] NCT has plain only ({plainLyrics.Length} chars), continuing to find synced...");
                        }
                    }
                }
                catch (Exception ex) { Console.WriteLine($"[Lyrics] NCT API error: {ex.Message}"); }
            }
            
            // ═══ Strategy 0b: NCT Search fallback (nếu không có nctKey, search bằng title+artist) ═══
            if (string.IsNullOrWhiteSpace(nctKey))
            {
                try
                {
                    Console.WriteLine($"[Lyrics] Trying NCT search for lyrics: {cleanTrack} - {cleanArtist}");
                    var searchUrl = $"https://graph.nhaccuatui.com/api/v1/search/song?keyword={Uri.EscapeDataString($"{cleanTrack} {cleanArtist}")}&pageindex=0&pagesize=3&correct=false";
                    var searchJson = await http.GetStringAsync(searchUrl);
                    var searchDoc = JsonSerializer.Deserialize<JsonElement>(searchJson);
                    
                    if (searchDoc.TryGetProperty("data", out var searchData) 
                        && searchData.TryGetProperty("songs", out var songsArr)
                        && songsArr.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var song in songsArr.EnumerateArray())
                        {
                            if (song.TryGetProperty("key", out var songKey))
                            {
                                var foundKey = songKey.GetString();
                                if (string.IsNullOrEmpty(foundKey)) continue;
                                
                                // Fetch lyric for this song
                                try
                                {
                                    var lyricUrl = $"https://graph.nhaccuatui.com/api/v1/song/lyric/detail?songKey={foundKey}";
                                    var lyricJson = await http.GetStringAsync(lyricUrl);
                                    var lyricDoc = JsonSerializer.Deserialize<JsonElement>(lyricJson);
                                    
                                    if (lyricDoc.TryGetProperty("data", out var lyricData) 
                                        && lyricData.TryGetProperty("content", out var lyricContent)
                                        && lyricContent.ValueKind == JsonValueKind.String)
                                    {
                                        var lyrics = lyricContent.GetString()?.Trim() ?? "";
                                        if (lyrics.Length > 20)
                                        {
                                            Console.WriteLine($"[Lyrics] NCT search found lyrics for: {cleanTrack} (key: {foundKey})");
                                            var result = new { syncedLyrics = (string?)null, plainLyrics = lyrics, source = "nct-search" };
                                            _cache[cacheKey] = (result, DateTime.UtcNow.AddHours(24));
                                            return Ok(result);
                                        }
                                    }
                                }
                                catch { continue; }
                            }
                        }
                    }
                }
                catch (Exception ex) { Console.WriteLine($"[Lyrics] NCT search lyrics error: {ex.Message}"); }
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
