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
        public async Task<IActionResult> GetVideoId([FromQuery] string query)
        {
            if (string.IsNullOrWhiteSpace(query))
                return BadRequest(new { message = "query is required" });

            var cacheKey = query.Trim().ToLowerInvariant();

            // Check cache
            if (_videoIdCache.TryGetValue(cacheKey, out var cached) && cached.Expiry > DateTime.UtcNow)
            {
                Console.WriteLine($"[VideoId] Cache HIT: {cacheKey} → {cached.VideoId}");
                return Ok(new { videoId = cached.VideoId, source = "cache" });
            }

            Console.WriteLine($"[VideoId] Searching YouTube for: {query}");

            using var http = new HttpClient();
            http.Timeout = TimeSpan.FromSeconds(10);
            http.DefaultRequestHeaders.Add("User-Agent",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
            http.DefaultRequestHeaders.Add("Accept-Language", "en-US,en;q=0.9");

            try
            {
                var url = $"https://www.youtube.com/results?search_query={Uri.EscapeDataString(query)}";
                var html = await http.GetStringAsync(url);

                // YouTube embeds initial data as JSON in the page - extract video IDs
                // Pattern: "videoId":"XXXXXXXXXXX"
                var match = Regex.Match(html, "\"videoId\":\"([a-zA-Z0-9_-]{11})\"");
                if (match.Success)
                {
                    var videoId = match.Groups[1].Value;
                    _videoIdCache[cacheKey] = (videoId, DateTime.UtcNow.AddMinutes(60));
                    Console.WriteLine($"[VideoId] Found: {videoId} for query: {query}");
                    return Ok(new { videoId, source = "youtube-search" });
                }

                Console.WriteLine($"[VideoId] No video ID found in search results for: {query}");
                return NotFound(new { message = "No video found for this query" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[VideoId] Error: {ex.Message}");
                return StatusCode(503, new { message = "Could not search YouTube" });
            }
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
    }
}
