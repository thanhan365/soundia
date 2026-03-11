using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace Soundia.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class StreamController : ControllerBase
    {
        // Cache video IDs for 60 minutes
        private static readonly Dictionary<string, (string VideoId, DateTime Expiry)> _videoIdCache = new();
        // Cache stream URLs for 25 minutes
        private static readonly Dictionary<string, (string Url, DateTime Expiry)> _streamCache = new();

        /// <summary>
        /// Search YouTube by query and return the first video ID.
        /// Frontend uses this videoId with YouTube IFrame player.loadVideoById()
        /// GET /api/stream/video-id?query=Son+Tung+Muon+Roi+Ma+Sao+Con
        /// </summary>
        [HttpGet("video-id")]
        public async Task<IActionResult> GetVideoId([FromQuery] string query, [FromQuery] int? expectedDuration = null)
        {
            if (string.IsNullOrWhiteSpace(query))
                return BadRequest(new { message = "query is required" });

            var cacheKey = expectedDuration.HasValue
                ? $"{query.Trim().ToLowerInvariant()}__dur{expectedDuration.Value}"
                : query.Trim().ToLowerInvariant();

            // Check cache
            if (_videoIdCache.TryGetValue(cacheKey, out var cached) && cached.Expiry > DateTime.UtcNow)
            {
                Console.WriteLine($"[VideoId] Cache HIT: {cacheKey} → {cached.VideoId}");
                return Ok(new { videoId = cached.VideoId, source = "cache" });
            }

            Console.WriteLine($"[VideoId] Tìm YouTube cho: {query} (expectedDuration={expectedDuration}s)");

            using var http = new HttpClient();
            http.Timeout = TimeSpan.FromSeconds(10);
            http.DefaultRequestHeaders.Add("User-Agent",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
            http.DefaultRequestHeaders.Add("Accept-Language", "en-US,en;q=0.9");

            try
            {
                var url = $"https://www.youtube.com/results?search_query={Uri.EscapeDataString(query)}";
                var html = await http.GetStringAsync(url);

                // Trích xuất nhiều videoRenderer candidates kèm duration
                var candidates = new List<(string VideoId, int DurationSeconds, string Title)>();
                var matches = Regex.Matches(html,
                    @"""videoRenderer"":\{""videoId"":""([a-zA-Z0-9_-]{11})"".*?""lengthText"":\{""accessibility"":\{""accessibilityData"":\{""label"":""(.*?)""",
                    RegexOptions.Singleline);

                foreach (Match m in matches)
                {
                    if (candidates.Count >= 10) break;
                    var videoId = m.Groups[1].Value;
                    var durationLabel = m.Groups[2].Value; // VD: "3 minutes, 43 seconds"
                    var durationSec = ParseYouTubeDurationLabel(durationLabel);

                    // Cũng thử lấy title cho log
                    candidates.Add((videoId, durationSec, durationLabel));
                }

                if (candidates.Count == 0)
                {
                    // Fallback: thử regex đơn giản lấy video đầu tiên
                    var fallback = Regex.Match(html, @"""videoRenderer"":\{""videoId"":""([a-zA-Z0-9_-]{11})""");
                    if (fallback.Success)
                    {
                        var videoId = fallback.Groups[1].Value;
                        _videoIdCache[cacheKey] = (videoId, DateTime.UtcNow.AddMinutes(60));
                        Console.WriteLine($"[VideoId] Fallback (không parse được duration): {videoId}");
                        return Ok(new { videoId, source = "youtube-search" });
                    }
                    Console.WriteLine($"[VideoId] Không tìm thấy video cho: {query}");
                    return NotFound(new { message = "No video found for this query" });
                }

                // Log tất cả candidates
                Console.WriteLine($"[VideoId] Tìm thấy {candidates.Count} candidates:");
                foreach (var c in candidates)
                    Console.WriteLine($"  - {c.VideoId} | {c.DurationSeconds}s | {c.Title}");

                // Chọn video phù hợp nhất
                string bestVideoId;
                if (expectedDuration.HasValue && expectedDuration.Value > 0)
                {
                    // Chọn video có duration gần nhất với expectedDuration
                    var best = candidates.OrderBy(c => Math.Abs(c.DurationSeconds - expectedDuration.Value)).First();
                    bestVideoId = best.VideoId;
                    Console.WriteLine($"[VideoId] Chọn best match: {best.VideoId} ({best.DurationSeconds}s) — expected {expectedDuration.Value}s, chênh lệch {Math.Abs(best.DurationSeconds - expectedDuration.Value)}s");
                }
                else
                {
                    // Không có expectedDuration → lấy video đầu tiên
                    bestVideoId = candidates[0].VideoId;
                    Console.WriteLine($"[VideoId] Không có expectedDuration → lấy video đầu tiên: {bestVideoId}");
                }

                _videoIdCache[cacheKey] = (bestVideoId, DateTime.UtcNow.AddMinutes(60));
                return Ok(new { videoId = bestVideoId, source = "youtube-search" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[VideoId] Lỗi: {ex.Message}");
                return StatusCode(503, new { message = "Could not search YouTube" });
            }
        }

        /// <summary>
        /// Parse YouTube accessibility duration label, ví dụ:
        /// "3 minutes, 43 seconds" → 223
        /// "1 hour, 2 minutes, 30 seconds" → 3750
        /// "43 seconds" → 43
        /// </summary>
        private static int ParseYouTubeDurationLabel(string label)
        {
            if (string.IsNullOrWhiteSpace(label)) return 0;

            int total = 0;
            var hourMatch = Regex.Match(label, @"(\d+)\s*hour");
            var minMatch = Regex.Match(label, @"(\d+)\s*minute");
            var secMatch = Regex.Match(label, @"(\d+)\s*second");

            if (hourMatch.Success) total += int.Parse(hourMatch.Groups[1].Value) * 3600;
            if (minMatch.Success) total += int.Parse(minMatch.Groups[1].Value) * 60;
            if (secMatch.Success) total += int.Parse(secMatch.Groups[1].Value);

            return total;
        }


        [HttpGet]
        public async Task<IActionResult> GetStream([FromQuery] string query)
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return BadRequest(new { Message = "Query parameter is required." });
            }

            // Check cache first
            var cacheKey = query.ToLowerInvariant().Trim();
            if (_streamCache.TryGetValue(cacheKey, out var cached) && cached.Expiry > DateTime.UtcNow)
            {
                return Ok(new { StreamUrl = cached.Url, Title = query, Source = "cache" });
            }

            // Method 1: Use yt-dlp (most reliable YouTube extractor on earth)
            try
            {
                var result = await RunYtDlp(query);
                if (result != null)
                {
                    _streamCache[cacheKey] = (result.Value.Url, DateTime.UtcNow.AddMinutes(30));
                    return Ok(new
                    {
                        StreamUrl = result.Value.Url,
                        Title = result.Value.Title,
                        Source = "yt-dlp"
                    });
                }
            }
            catch (Exception ex)
            {
                // yt-dlp failed, continue to fallback
                Console.WriteLine($"yt-dlp failed: {ex.Message}");
            }

            // Method 2: Fallback to Piped API instances
            var pipedInstances = new[]
            {
                "https://pipedapi.kavin.rocks",
                "https://pipedapi.adminforge.de",
                "https://api.piped.yt",
                "https://pipedapi.r4fo.com"
            };

            foreach (var instance in pipedInstances)
            {
                try
                {
                    using var httpClient = new HttpClient();
                    httpClient.Timeout = TimeSpan.FromSeconds(8);

                    var searchUrl = $"{instance}/search?q={Uri.EscapeDataString(query)}&filter=music_songs";
                    var searchResponse = await httpClient.GetStringAsync(searchUrl);
                    using var searchDoc = JsonDocument.Parse(searchResponse);

                    var items = searchDoc.RootElement.GetProperty("items");
                    if (items.GetArrayLength() == 0) continue;

                    var videoUrl = items[0].GetProperty("url").GetString();
                    var videoId = videoUrl?.Replace("/watch?v=", "");
                    var title = items[0].GetProperty("title").GetString() ?? query;

                    var streamsUrl = $"{instance}/streams/{videoId}";
                    var streamsResponse = await httpClient.GetStringAsync(streamsUrl);
                    using var streamsDoc = JsonDocument.Parse(streamsResponse);

                    var audioStreams = streamsDoc.RootElement.GetProperty("audioStreams");
                    if (audioStreams.GetArrayLength() == 0) continue;

                    // Find best bitrate
                    string? bestUrl = null;
                    int bestBitrate = 0;
                    for (int i = 0; i < audioStreams.GetArrayLength(); i++)
                    {
                        var stream = audioStreams[i];
                        var bitrate = stream.TryGetProperty("bitrate", out var br) ? br.GetInt32() : 0;
                        var url = stream.TryGetProperty("url", out var u) ? u.GetString() : null;
                        if (url != null && bitrate > bestBitrate) { bestBitrate = bitrate; bestUrl = url; }
                    }
                    bestUrl ??= audioStreams[0].GetProperty("url").GetString();

                    if (bestUrl != null)
                    {
                        _streamCache[cacheKey] = (bestUrl, DateTime.UtcNow.AddMinutes(30));
                        return Ok(new { StreamUrl = bestUrl, Title = title, Source = instance });
                    }
                }
                catch { /* Try next instance */ }
            }

            return StatusCode(503, new { Message = "Không thể lấy nguồn phát. Vui lòng thử lại." });
        }

        private static async Task<(string Url, string Title)?> RunYtDlp(string query)
        {
            // yt-dlp command: search YouTube and get direct audio URL
            var psi = new ProcessStartInfo
            {
                FileName = "yt-dlp",
                Arguments = $"--no-download --print \"%(url)s|||%(title)s\" -f bestaudio --no-playlist \"ytsearch1:{query}\"",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = Process.Start(psi);
            if (process == null) return null;

            // Timeout after 15 seconds
            var cts = new CancellationTokenSource(TimeSpan.FromSeconds(15));
            try
            {
                var output = await process.StandardOutput.ReadToEndAsync(cts.Token);
                await process.WaitForExitAsync(cts.Token);

                if (process.ExitCode == 0 && !string.IsNullOrWhiteSpace(output))
                {
                    var parts = output.Trim().Split("|||", 2);
                    var url = parts[0].Trim();
                    var title = parts.Length > 1 ? parts[1].Trim() : query;

                    if (url.StartsWith("http"))
                    {
                        return (url, title);
                    }
                }
            }
            catch (OperationCanceledException)
            {
                process.Kill(entireProcessTree: true);
            }

            return null;
        }

        [HttpGet("proxy-audio")]
        public async Task ProxyAudio([FromQuery] string url)
        {
            if (string.IsNullOrWhiteSpace(url))
            {
                Response.StatusCode = 400;
                await Response.WriteAsync("URL is required");
                return;
            }

            try
            {
                var request = new HttpRequestMessage(HttpMethod.Get, url);
                request.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
                request.Headers.Add("Referer", "https://www.nhaccuatui.com/");

                // Forward range header if present
                if (Request.Headers.TryGetValue("Range", out var rangeHeader))
                {
                    request.Headers.Add("Range", rangeHeader.ToString());
                }

                using var client = new HttpClient();
                // SendAsync with HttpCompletionOption.ResponseHeadersRead is CRITICAL for streaming without buffering the whole file
                using var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead);

                if (!response.IsSuccessStatusCode)
                {
                    Response.StatusCode = (int)response.StatusCode;
                    return;
                }

                // Copy relevant response headers to our response
                Response.StatusCode = (int)response.StatusCode;
                
                if (response.Content.Headers.ContentType != null)
                    Response.ContentType = response.Content.Headers.ContentType.ToString();
                
                if (response.Content.Headers.ContentLength.HasValue)
                    Response.ContentLength = response.Content.Headers.ContentLength.Value;

                if (response.Content.Headers.ContentRange != null)
                    Response.Headers["Content-Range"] = response.Content.Headers.ContentRange.ToString();

                if (response.Headers.AcceptRanges != null)
                    Response.Headers["Accept-Ranges"] = response.Headers.AcceptRanges.ToString();

                // Stream the content directly to the client
                var stream = await response.Content.ReadAsStreamAsync();
                await stream.CopyToAsync(Response.Body);
            }
            catch (Exception ex)
            {
                if (!Response.HasStarted)
                {
                    Response.StatusCode = 500;
                    await Response.WriteAsync($"Error proxying audio: {ex.Message}");
                }
            }
        }
    }
}
