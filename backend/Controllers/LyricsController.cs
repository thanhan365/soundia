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
            http.Timeout = TimeSpan.FromSeconds(8);
            http.DefaultRequestHeaders.Add("User-Agent",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
            
            // HttpClient riêng cho LRC download (timeout dài hơn vì file lớn)
            using var lrcHttp = new HttpClient();
            lrcHttp.Timeout = TimeSpan.FromSeconds(12);
            lrcHttp.DefaultRequestHeaders.Add("User-Agent",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");

            // Clean title: remove (feat. X), [Official MV], etc.
            var cleanTrack = System.Text.RegularExpressions.Regex.Replace(track,
                @"\s*[\(\[].*?[\)\]]\s*", "").Trim();
            cleanTrack = System.Text.RegularExpressions.Regex.Replace(cleanTrack,
                @"\s*[-–]\s*(Official|MV|Lyric|Audio|Video|Music Video).*", "",
                System.Text.RegularExpressions.RegexOptions.IgnoreCase).Trim();
            // Clean each artist name, but keep ALL artists for search
            var artistParts = artist.Split(new[] { ',', '/', '&' }, StringSplitOptions.RemoveEmptyEntries)
                .Select(a => a.Trim()).Where(a => a.Length > 0).ToList();
            var cleanArtist = artistParts.FirstOrDefault() ?? artist.Trim();
            var fullArtist = string.Join(" ", artistParts); // all artists joined

            Console.WriteLine($"[Lyrics] Searching for: {track} - {artist} (clean: {cleanTrack} - {cleanArtist}, full: {fullArtist})");

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
                                    var lrcBytes = await lrcHttp.GetByteArrayAsync(lrcUrl);
                                    var lrcRaw = System.Text.Encoding.UTF8.GetString(lrcBytes);
                                    
                                    // Check if LRC is plain text (starts with [mm:ss) or encrypted
                                    if (lrcRaw.TrimStart().StartsWith("[") && System.Text.RegularExpressions.Regex.IsMatch(lrcRaw, @"\[\d{2}:\d{2}"))
                                    {
                                        syncedLyrics = lrcRaw;
                                        Console.WriteLine($"[Lyrics] NCT LRC plain text (not encrypted)");
                                    }
                                    else
                                    {
                                        syncedLyrics = DecryptNctLrc(lrcBytes, lrcRaw, decryptKey);
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
            
            // ═══ Strategy 0b: NCT Search fallback (search bằng title+artist, cũng lấy synced LRC) ═══
            {
                try
                {
                    Console.WriteLine($"[Lyrics] Trying NCT search for lyrics: {cleanTrack} - {cleanArtist}");
                    var searchUrl = $"https://graph.nhaccuatui.com/api/v1/search/song?keyword={Uri.EscapeDataString($"{cleanTrack} {cleanArtist}")}&pageindex=0&pagesize=5&correct=false";
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
                                
                                try
                                {
                                    var lyricUrl = $"https://graph.nhaccuatui.com/api/v1/song/lyric/detail?songKey={foundKey}";
                                    var lyricJson = await http.GetStringAsync(lyricUrl);
                                    var lyricDoc = JsonSerializer.Deserialize<JsonElement>(lyricJson);
                                    
                                    if (lyricDoc.TryGetProperty("data", out var lyricData))
                                    {
                                        string searchPlain = "";
                                        string? searchSynced = null;

                                        // Plain lyrics
                                        if (lyricData.TryGetProperty("content", out var lc) && lc.ValueKind == JsonValueKind.String)
                                            searchPlain = lc.GetString()?.Trim() ?? "";

                                        // Synced LRC (tìm timedLyric + decrypt)
                                        if (lyricData.TryGetProperty("timedLyric", out var tl) && tl.ValueKind == JsonValueKind.String)
                                        {
                                            var lrcUrl2 = tl.GetString();
                                            var dk2 = "Lyr1cjust4nct";
                                            if (lyricData.TryGetProperty("keyDecryptLyric", out var kd2) && kd2.ValueKind == JsonValueKind.String)
                                                dk2 = kd2.GetString() ?? dk2;

                                            if (!string.IsNullOrEmpty(lrcUrl2))
                                            {
                                                try
                                                {
                                                    var lrcBytes2 = await lrcHttp.GetByteArrayAsync(lrcUrl2);
                                                    var lrcRaw2 = System.Text.Encoding.UTF8.GetString(lrcBytes2);
                                                    if (lrcRaw2.TrimStart().StartsWith("[") && System.Text.RegularExpressions.Regex.IsMatch(lrcRaw2, @"\[\d{2}:\d{2}"))
                                                        searchSynced = lrcRaw2;
                                                    else
                                                        searchSynced = DecryptNctLrc(lrcBytes2, lrcRaw2, dk2);
                                                }
                                                catch { }
                                            }
                                        }

                                        if (searchSynced != null)
                                        {
                                            if (string.IsNullOrWhiteSpace(searchPlain))
                                                searchPlain = System.Text.RegularExpressions.Regex.Replace(searchSynced, @"\[\d{2}:\d{2}\.\d{2,3}\]", "").Trim();
                                            Console.WriteLine($"[Lyrics] NCT search found SYNCED for: {cleanTrack} (key: {foundKey})");
                                            var result = new { syncedLyrics = searchSynced, plainLyrics = searchPlain, source = "nct-search" };
                                            _cache[cacheKey] = (result, DateTime.UtcNow.AddHours(24));
                                            return Ok(result);
                                        }

                                        if (searchPlain.Length > 20 && string.IsNullOrWhiteSpace(nctFallbackPlain))
                                        {
                                            nctFallbackPlain = searchPlain;
                                            Console.WriteLine($"[Lyrics] NCT search found plain for: {cleanTrack} (key: {foundKey})");
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
                var q = Uri.EscapeDataString($"{cleanTrack} {fullArtist}");
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
                                // Validate: check if result matches our song
                                var resultArtistS = item.TryGetProperty("artistName", out var raS) ? raS.GetString()?.ToLowerInvariant() ?? "" : "";
                                var resultTrackS = item.TryGetProperty("trackName", out var rtS) ? rtS.GetString()?.ToLowerInvariant() ?? "" : "";
                                bool artistMatchS = artistParts.Any(a => resultArtistS.Contains(a.ToLowerInvariant()) || a.ToLowerInvariant().Contains(resultArtistS));
                                bool trackMatchS = resultTrackS.Contains(cleanTrack.ToLowerInvariant()) || cleanTrack.ToLowerInvariant().Contains(resultTrackS);
                                if (artistMatchS || trackMatchS)
                                {
                                    best = item;
                                    break;
                                }
                            }
                            if (best == null && item.TryGetProperty("plainLyrics", out var pl) && pl.ValueKind != JsonValueKind.Null)
                            {
                                // Validate: check if result artist matches at least one of our artists
                                var resultArtist = item.TryGetProperty("artistName", out var ra) ? ra.GetString()?.ToLowerInvariant() ?? "" : "";
                                var resultTrack = item.TryGetProperty("trackName", out var rt) ? rt.GetString()?.ToLowerInvariant() ?? "" : "";
                                bool artistMatch = artistParts.Any(a => resultArtist.Contains(a.ToLowerInvariant()) || a.ToLowerInvariant().Contains(resultArtist));
                                bool trackMatch = resultTrack.Contains(cleanTrack.ToLowerInvariant()) || cleanTrack.ToLowerInvariant().Contains(resultTrack);
                                if (artistMatch || trackMatch) best = item;
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

        /// <summary>
        /// Decrypt NCT LRC file — NCT dùng mcrypt PHP (Blowfish ECB).
        /// Thử Blowfish ECB (primary), DES ECB, AES ECB fallback.
        /// </summary>
        private static string? DecryptNctLrc(byte[] lrcBytes, string lrcRaw, string decryptKey)
        {
            try
            {
                var keyBytes = System.Text.Encoding.UTF8.GetBytes(decryptKey);
                var trimmedRaw = lrcRaw.Trim();
                var lrcRegex = new System.Text.RegularExpressions.Regex(@"\[\d{2}:\d{2}\.\d{2,3}\]");

                // Parse hex → raw bytes
                byte[]? encryptedBytes = null;
                var hexClean = System.Text.RegularExpressions.Regex.Replace(trimmedRaw, @"\s+", "");
                if (System.Text.RegularExpressions.Regex.IsMatch(hexClean, @"^[0-9A-Fa-f]+$") && hexClean.Length >= 16)
                {
                    if (hexClean.Length % 2 != 0) hexClean = hexClean.Substring(0, hexClean.Length - 1);
                    try
                    {
                        encryptedBytes = Enumerable.Range(0, hexClean.Length / 2)
                            .Select(i => Convert.ToByte(hexClean.Substring(i * 2, 2), 16)).ToArray();
                        Console.WriteLine($"[Lyrics] NCT LRC hex → {encryptedBytes.Length} bytes");
                    }
                    catch { encryptedBytes = null; }
                }
                if (encryptedBytes == null)
                {
                    try { encryptedBytes = Convert.FromBase64String(trimmedRaw); }
                    catch { encryptedBytes = lrcBytes; }
                }

                // === 1) Blowfish ECB (primary — NCT dùng mcrypt PHP = Blowfish ECB) ===
                try
                {
                    // Blowfish block size = 8 bytes, align input
                    int bfBlockLen = (encryptedBytes.Length / 8) * 8;
                    var bfInput = encryptedBytes.Take(bfBlockLen).ToArray();

                    var bfEngine = new Org.BouncyCastle.Crypto.Engines.BlowfishEngine();
                    var bfCipher = new Org.BouncyCastle.Crypto.BufferedBlockCipher(
                        new Org.BouncyCastle.Crypto.Modes.EcbBlockCipher(bfEngine));
                    bfCipher.Init(false, new Org.BouncyCastle.Crypto.Parameters.KeyParameter(keyBytes));
                    
                    var output = new byte[bfCipher.GetOutputSize(bfInput.Length)];
                    int len = bfCipher.ProcessBytes(bfInput, 0, bfInput.Length, output, 0);
                    len += bfCipher.DoFinal(output, len);
                    
                    var txt = System.Text.Encoding.UTF8.GetString(output, 0, len).TrimEnd('\0').Trim();
                    if (lrcRegex.Matches(txt).Count >= 3)
                    {
                        Console.WriteLine($"[Lyrics] NCT LRC Blowfish ECB decrypt OK ({txt.Length} chars)");
                        return txt;
                    }
                }
                catch (Exception bfEx) { Console.WriteLine($"[Lyrics] Blowfish decrypt error: {bfEx.Message}"); }

                // === 2) DES ECB fallback ===
                try
                {
                    var desKey = System.Text.Encoding.UTF8.GetBytes(decryptKey.PadRight(8, '\0').Substring(0, 8));
                    int desBlockLen = (encryptedBytes.Length / 8) * 8;
                    var desInput = encryptedBytes.Take(desBlockLen).ToArray();
                    using var des = System.Security.Cryptography.DES.Create();
                    des.Key = desKey;
                    des.Mode = System.Security.Cryptography.CipherMode.ECB;
                    des.Padding = System.Security.Cryptography.PaddingMode.None;
                    using var dec = des.CreateDecryptor();
                    var db = dec.TransformFinalBlock(desInput, 0, desInput.Length);
                    var txt = System.Text.Encoding.UTF8.GetString(db).TrimEnd('\0').Trim();
                    if (lrcRegex.Matches(txt).Count >= 3)
                    {
                        Console.WriteLine($"[Lyrics] NCT LRC DES ECB decrypt OK ({txt.Length} chars)");
                        return txt;
                    }
                }
                catch { }

                // === 3) AES ECB fallback ===
                try
                {
                    var aesKey = System.Text.Encoding.UTF8.GetBytes(decryptKey.PadRight(16, '\0').Substring(0, 16));
                    int aesBlockLen = (encryptedBytes.Length / 16) * 16;
                    var aesInput = encryptedBytes.Take(aesBlockLen).ToArray();
                    using var aes = System.Security.Cryptography.Aes.Create();
                    aes.Key = aesKey;
                    aes.Mode = System.Security.Cryptography.CipherMode.ECB;
                    aes.Padding = System.Security.Cryptography.PaddingMode.None;
                    using var dec = aes.CreateDecryptor();
                    var db = dec.TransformFinalBlock(aesInput, 0, aesInput.Length);
                    var txt = System.Text.Encoding.UTF8.GetString(db).TrimEnd('\0').Trim();
                    if (lrcRegex.Matches(txt).Count >= 3)
                    {
                        Console.WriteLine($"[Lyrics] NCT LRC AES ECB decrypt OK ({txt.Length} chars)");
                        return txt;
                    }
                }
                catch { }

                // === 4) XOR cipher (NCT mới có thể dùng XOR đơn giản) ===
                try
                {
                    var xorOutput = new byte[encryptedBytes.Length];
                    for (int i = 0; i < encryptedBytes.Length; i++)
                        xorOutput[i] = (byte)(encryptedBytes[i] ^ keyBytes[i % keyBytes.Length]);
                    var txt = System.Text.Encoding.UTF8.GetString(xorOutput).TrimEnd('\0').Trim();
                    if (lrcRegex.Matches(txt).Count >= 3)
                    {
                        Console.WriteLine($"[Lyrics] NCT LRC XOR decrypt OK ({txt.Length} chars)");
                        return txt;
                    }
                }
                catch { }

                // === 5) Blowfish CBC with IV = first 8 bytes ===
                try
                {
                    if (encryptedBytes.Length > 8)
                    {
                        var iv = encryptedBytes.Take(8).ToArray();
                        var cipherData = encryptedBytes.Skip(8).ToArray();
                        int bfBlockLen = (cipherData.Length / 8) * 8;
                        var bfInput = cipherData.Take(bfBlockLen).ToArray();

                        var bfEngine = new Org.BouncyCastle.Crypto.Engines.BlowfishEngine();
                        var bfCbcCipher = new Org.BouncyCastle.Crypto.BufferedBlockCipher(
                            new Org.BouncyCastle.Crypto.Modes.CbcBlockCipher(bfEngine));
                        bfCbcCipher.Init(false, new Org.BouncyCastle.Crypto.Parameters.ParametersWithIV(
                            new Org.BouncyCastle.Crypto.Parameters.KeyParameter(keyBytes), iv));

                        var output = new byte[bfCbcCipher.GetOutputSize(bfInput.Length)];
                        int len = bfCbcCipher.ProcessBytes(bfInput, 0, bfInput.Length, output, 0);
                        len += bfCbcCipher.DoFinal(output, len);

                        var txt = System.Text.Encoding.UTF8.GetString(output, 0, len).TrimEnd('\0').Trim();
                        if (lrcRegex.Matches(txt).Count >= 3)
                        {
                            Console.WriteLine($"[Lyrics] NCT LRC Blowfish CBC decrypt OK ({txt.Length} chars)");
                            return txt;
                        }
                    }
                }
                catch { }

                // === 6) Raw bytes as UTF-8 (maybe not encrypted, just binary) ===
                try
                {
                    var txt = System.Text.Encoding.UTF8.GetString(encryptedBytes).TrimEnd('\0').Trim();
                    if (lrcRegex.Matches(txt).Count >= 3)
                    {
                        Console.WriteLine($"[Lyrics] NCT LRC raw UTF-8 OK ({txt.Length} chars)");
                        return txt;
                    }
                }
                catch { }

                Console.WriteLine($"[Lyrics] NCT LRC decrypt: all ciphers failed");
            }
            catch (Exception ex) { Console.WriteLine($"[Lyrics] NCT LRC decrypt error: {ex.Message}"); }
            return null;
        }
    }
}

