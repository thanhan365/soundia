using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace Soundia.Api.Services
{
    public class NctApiService
    {
        private readonly HttpClient _http;
        private const string GRAPH_API = "https://graph.nhaccuatui.com/api/v1";
        private const string GRAPH_API_V2 = "https://graph.nhaccuatui.com/api/v2";
        private const string WEB_BASE = "https://www.nhaccuatui.com";
        private const string UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

        // Caches
        private static readonly ConcurrentDictionary<string, (object data, DateTime expiry)> _cache = new();

        public NctApiService()
        {
            _http = new HttpClient();
            _http.DefaultRequestHeaders.Add("User-Agent", UA);
        }

        // ─── Search Songs ──────────────────────────────────────────────────
        public async Task<List<NctSong>> SearchSongsAsync(string keyword, int page = 1, int limit = 20)
        {
            var cacheKey = $"search_{keyword}_{page}_{limit}";
            if (TryGetCache<List<NctSong>>(cacheKey, out var cached)) return cached;

            try
            {
                var url = $"{GRAPH_API}/search/song?keyword={Uri.EscapeDataString(keyword)}&pageindex={page}&pagesize={limit}&correct=false";
                var json = await _http.GetStringAsync(url);
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;

                if (root.GetProperty("code").GetInt32() != 0) return new List<NctSong>();

                var songs = new List<NctSong>();
                if (root.TryGetProperty("data", out var data) && data.TryGetProperty("songs", out var songsArr))
                {
                    foreach (var s in songsArr.EnumerateArray())
                    {
                        songs.Add(ParseSong(s));
                    }
                }

                SetCache(cacheKey, songs, TimeSpan.FromHours(1));
                return songs;
            }
            catch { return new List<NctSong>(); }
        }

        // ─── Get Stream URL (scrape SSR page) ─────────────────────────────
        public async Task<string> GetStreamUrlAsync(string songKey)
        {
            var cacheKey = $"stream_{songKey}";
            if (TryGetCache<string>(cacheKey, out var cached)) return cached;

            try
            {
                // First get song detail for linkShare
                var detailUrl = $"{GRAPH_API}/song/detail/{songKey}";
                var detailJson = await _http.GetStringAsync(detailUrl);
                using var detailDoc = JsonDocument.Parse(detailJson);
                var detailData = detailDoc.RootElement.GetProperty("data");
                var linkShare = detailData.TryGetProperty("linkShare", out var ls) ? ls.GetString() : null;

                // Build linkShare if not available (pattern: /bai-hat/{slug}.{key}.html)
                if (string.IsNullOrEmpty(linkShare))
                {
                    var name = detailData.TryGetProperty("name", out var nm) ? nm.GetString() : "";
                    var artistName = detailData.TryGetProperty("artistName", out var an) ? an.GetString() : "";
                    if (!string.IsNullOrEmpty(name))
                    {
                        var slug = Regex.Replace($"{name} {artistName}".ToLowerInvariant(), @"[^a-z0-9\s]", "")
                            .Trim().Replace(" ", "-");
                        slug = Regex.Replace(slug, @"-+", "-");
                        linkShare = $"{WEB_BASE}/bai-hat/{slug}.{songKey}.html";
                    }
                }

                if (string.IsNullOrEmpty(linkShare)) return null;

                // Scrape SSR page for stream URL in __NUXT_DATA__
                var pageHtml = await _http.GetStringAsync(linkShare);
                var nuxtMatch = Regex.Match(pageHtml, @"<script[^>]*id=""__NUXT_DATA__""[^>]*>([\s\S]*?)</script>");
                if (!nuxtMatch.Success) return null;

                var nuxtArr = JsonSerializer.Deserialize<JsonElement[]>(nuxtMatch.Groups[1].Value);
                // Find stream URL patterns: stream.nct.vn or a01.nct.vn with .mp3
                string streamUrl = null;
                string hqUrl = null;
                foreach (var item in nuxtArr)
                {
                    if (item.ValueKind != JsonValueKind.String) continue;
                    var v = item.GetString();
                    if (v == null || v.Contains("download=true")) continue;
                    
                    var isStream = v.Contains("stream.nct.vn") || v.Contains("a01.nct.vn");
                    var isMp3 = v.Contains(".mp3");
                    if (isStream && isMp3)
                    {
                        if (!v.Contains("_hq.mp3") && !v.Contains("_hq."))
                            streamUrl ??= v;
                        else
                            hqUrl ??= v;
                    }
                }

                var result = streamUrl ?? hqUrl;
                if (result != null) SetCache(cacheKey, result, TimeSpan.FromMinutes(30));
                return result;
            }
            catch { return null; }
        }

        // ─── Resolve Stream URL by Title+Artist (for any source) ─────────
        public async Task<string> ResolveStreamByTitleAsync(string title, string artist)
        {
            var cacheKey = $"resolve_{title}_{artist}".ToLowerInvariant();
            if (TryGetCache<string>(cacheKey, out var cached)) return cached;

            try
            {
                // Search NCT with the song title
                var searchKeyword = $"{title} {artist?.Split(',')[0]?.Split('&')[0]?.Trim()}";
                var songs = await SearchSongsAsync(searchKeyword, 1, 5);
                if (songs.Count == 0) return null;

                // Find best match by normalized title comparison
                var normTitle = Regex.Replace(title?.ToLowerInvariant() ?? "", @"[^a-z0-9]", "");
                NctSong bestMatch = null;
                foreach (var s in songs)
                {
                    var normName = Regex.Replace(s.Name?.ToLowerInvariant() ?? "", @"[^a-z0-9]", "");
                    if (normName == normTitle || normName.Contains(normTitle) || normTitle.Contains(normName))
                    {
                        bestMatch = s;
                        break;
                    }
                }
                // If no exact match, use first result (likely relevant)
                bestMatch ??= songs[0];

                // Get stream URL for the matched song
                var streamUrl = await GetStreamUrlAsync(bestMatch.Key);
                if (streamUrl != null)
                {
                    SetCache(cacheKey, streamUrl, TimeSpan.FromMinutes(30));
                }
                return streamUrl;
            }
            catch { return null; }
        }

        // ─── Search Songs With Stream URLs ─────────────────────────────────
        public async Task<List<NctSong>> SearchSongsWithStreamAsync(string keyword, int limit = 20)
        {
            var songs = await SearchSongsAsync(keyword, 1, limit);

            // Fetch stream URLs in parallel (batch of 5 to avoid rate limiting)
            var batches = songs.Select((s, i) => (song: s, index: i))
                .GroupBy(x => x.index / 5)
                .Select(g => g.Select(x => x.song).ToList())
                .ToList();

            foreach (var batch in batches)
            {
                var tasks = batch.Select(async song =>
                {
                    try
                    {
                        song.StreamUrl = await GetStreamUrlAsync(song.Key);
                    }
                    catch { /* skip failed streams */ }
                });
                await Task.WhenAll(tasks);
            }

            return songs;
        }

        // ─── Charts ────────────────────────────────────────────────────────
        public async Task<JsonElement?> GetChartsAsync()
        {
            if (TryGetCache<JsonElement>("charts_list", out var cached)) return cached;
            try
            {
                var json = await _http.GetStringAsync($"{GRAPH_API}/playlist/charts");
                using var doc = JsonDocument.Parse(json);
                var data = doc.RootElement.GetProperty("data").Clone();
                SetCache("charts_list", data, TimeSpan.FromHours(2));
                return data;
            }
            catch { return null; }
        }

        // ─── Chart Detail ──────────────────────────────────────────────────
        public async Task<List<NctSong>> GetChartSongsAsync(string chartKey)
        {
            var cacheKey = $"chart_{chartKey}";
            if (TryGetCache<List<NctSong>>(cacheKey, out var cached)) return cached;
            try
            {
                var json = await _http.GetStringAsync($"{GRAPH_API}/playlist/charts/{chartKey}");
                using var doc = JsonDocument.Parse(json);
                var items = doc.RootElement.GetProperty("data").GetProperty("items");
                var songs = new List<NctSong>();
                foreach (var s in items.EnumerateArray())
                {
                    var song = ParseSong(s);
                    // Chart items have streamURL field
                    if (s.TryGetProperty("streamURL", out var su) && !string.IsNullOrEmpty(su.GetString()))
                        song.StreamUrl = su.GetString();
                    songs.Add(song);
                }
                SetCache(cacheKey, songs, TimeSpan.FromHours(2));
                return songs;
            }
            catch { return new List<NctSong>(); }
        }

        // ─── Top 100 ──────────────────────────────────────────────────────
        public async Task<JsonElement?> GetTop100Async()
        {
            if (TryGetCache<JsonElement>("top100", out var cached)) return cached;
            try
            {
                var json = await _http.GetStringAsync($"{GRAPH_API}/app/playlist/top-100");
                using var doc = JsonDocument.Parse(json);
                var data = doc.RootElement.GetProperty("data").Clone();
                SetCache("top100", data, TimeSpan.FromHours(2));
                return data;
            }
            catch { return null; }
        }

        // ─── Artist Songs ──────────────────────────────────────────────────
        public async Task<List<NctSong>> GetArtistSongsAsync(string artistId, int page = 1, int limit = 20)
        {
            var cacheKey = $"artist_songs_{artistId}_{page}";
            if (TryGetCache<List<NctSong>>(cacheKey, out var cached)) return cached;
            try
            {
                var url = $"{GRAPH_API}/search/artist/song/{artistId}?pageindex={page}&pagesize={limit}";
                var json = await _http.GetStringAsync(url);
                using var doc = JsonDocument.Parse(json);
                var data = doc.RootElement.GetProperty("data");
                var songs = new List<NctSong>();
                foreach (var s in data.EnumerateArray())
                    songs.Add(ParseSong(s));
                SetCache(cacheKey, songs, TimeSpan.FromHours(1));
                return songs;
            }
            catch { return new List<NctSong>(); }
        }

        // ─── Song Detail ───────────────────────────────────────────────────
        public async Task<NctSong> GetSongDetailAsync(string key)
        {
            try
            {
                var json = await _http.GetStringAsync($"{GRAPH_API}/song/detail/{key}");
                using var doc = JsonDocument.Parse(json);
                return ParseSong(doc.RootElement.GetProperty("data"));
            }
            catch { return null; }
        }

        // ─── Similar Songs ─────────────────────────────────────────────────
        public async Task<List<NctSong>> GetSimilarSongsAsync(string key, int limit = 10)
        {
            try
            {
                var json = await _http.GetStringAsync($"{GRAPH_API}/song/similar/{key}");
                using var doc = JsonDocument.Parse(json);
                var list = doc.RootElement.GetProperty("data").GetProperty("list");
                var songs = new List<NctSong>();
                foreach (var s in list.EnumerateArray())
                {
                    if (songs.Count >= limit) break;
                    songs.Add(ParseSong(s));
                }
                return songs;
            }
            catch { return new List<NctSong>(); }
        }

        // ─── Helpers ───────────────────────────────────────────────────────
        private NctSong ParseSong(JsonElement s)
        {
            return new NctSong
            {
                Key = s.TryGetProperty("key", out var k) ? k.GetString() : "",
                Name = s.TryGetProperty("name", out var n) ? n.GetString() : "",
                ArtistName = s.TryGetProperty("artistName", out var an) ? an.GetString() : "",
                ArtistId = s.TryGetProperty("artistId", out var ai) ? ai.GetString() : "",
                Image = s.TryGetProperty("image", out var img) ? img.GetString() : "",
                Duration = s.TryGetProperty("duration", out var d) ? d.GetInt32() : 0,
                GenreName = s.TryGetProperty("genreName", out var g) ? g.GetString() : "",
                LinkShare = s.TryGetProperty("linkShare", out var ls) ? ls.GetString() : "",
            };
        }

        private bool TryGetCache<T>(string key, out T value)
        {
            if (_cache.TryGetValue(key, out var entry) && DateTime.UtcNow < entry.expiry)
            {
                value = (T)entry.data;
                return true;
            }
            value = default;
            return false;
        }

        private void SetCache<T>(string key, T data, TimeSpan ttl)
        {
            _cache[key] = (data, DateTime.UtcNow.Add(ttl));
            // Cleanup old entries (max 500)
            if (_cache.Count > 500)
            {
                var expired = _cache.Where(x => DateTime.UtcNow >= x.Value.expiry).Select(x => x.Key).ToList();
                foreach (var k in expired) _cache.TryRemove(k, out _);
            }
        }
    }

    public class NctSong
    {
        public string Key { get; set; }
        public string Name { get; set; }
        public string ArtistName { get; set; }
        public string ArtistId { get; set; }
        public string Image { get; set; }
        public int Duration { get; set; }
        public string GenreName { get; set; }
        public string LinkShare { get; set; }
        public string StreamUrl { get; set; }
    }
}
