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
            _http.Timeout = TimeSpan.FromSeconds(5); // Prevent hanging on slow NCT servers
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
        // Overload: use provided linkShare directly (skips detail API call → faster)
        public async Task<string> GetStreamUrlAsync(string songKey, string linkShare = null)
        {
            var cacheKey = $"stream_{songKey}";
            if (TryGetCache<string>(cacheKey, out var cached)) return cached;

            try
            {
                // If no linkShare provided, fetch from detail API
                if (string.IsNullOrEmpty(linkShare))
                {
                    var detailUrl = $"{GRAPH_API}/song/detail/{songKey}";
                    var detailJson = await _http.GetStringAsync(detailUrl);
                    using var detailDoc = JsonDocument.Parse(detailJson);
                    var detailData = detailDoc.RootElement.GetProperty("data");
                    linkShare = detailData.TryGetProperty("linkShare", out var ls) ? ls.GetString() : null;

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
                }

                if (string.IsNullOrEmpty(linkShare)) return null;

                // Scrape SSR page for stream URL in __NUXT_DATA__
                var pageHtml = await _http.GetStringAsync(linkShare);
                var nuxtMatch = Regex.Match(pageHtml, @"<script[^>]*id=""__NUXT_DATA__""[^>]*>([\s\S]*?)</script>");
                if (!nuxtMatch.Success) return null;

                var nuxtArr = JsonSerializer.Deserialize<JsonElement[]>(nuxtMatch.Groups[1].Value);
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
        public async Task<string> ResolveStreamByTitleAsync(string title, string artist, int durationSec = 0)
        {
            var cacheKey = $"resolve_{title}_{artist}_{durationSec}".ToLowerInvariant();
            if (TryGetCache<string>(cacheKey, out var cached)) return cached;

            try
            {
                // Search NCT with the song title + first 2 artists (more context for better results)
                var artistParts = SplitArtists(artist);
                var searchArtists = string.Join(" ", artistParts.Take(2));
                var searchKeyword = $"{title} {searchArtists}".Trim();
                var songs = await SearchSongsAsync(searchKeyword, 1, 10);
                if (songs.Count == 0) return null;

                // Normalize input title & artist list (remove diacritics + non-alphanumeric)
                var normTitle = NormalizeForMatch(title ?? "");
                var inputArtists = SplitArtists(artist).Select(NormalizeForMatch).Where(a => a.Length > 0).ToList();

                NctSong bestMatch = null;
                int bestScore = 0;

                foreach (var s in songs)
                {
                    var normName = NormalizeForMatch(s.Name ?? "");
                    var nctNameLower = (s.Name ?? "").ToLowerInvariant();
                    var normNameBase = NormalizeForMatch(Regex.Replace(s.Name ?? "", @"\s*[\(\[\{].*?[\)\]\}]", ""));
                    var inputTitleLower = (title ?? "").ToLowerInvariant();

                    // Version mismatch filter
                    var versionTags = new[] { "remix", "cover", "acoustic", "live", "instrumental", "lofi", "karaoke" };
                    bool versionMismatch = false;
                    foreach (var tag in versionTags)
                    {
                        bool inputHas = inputTitleLower.Contains(tag);
                        bool nctHas = nctNameLower.Contains(tag);
                        if (inputHas != nctHas) { versionMismatch = true; break; }
                    }
                    if (versionMismatch) continue;

                    // Title matching
                    int titleScore = 0;
                    if (normName == normTitle || normNameBase == normTitle)
                        titleScore = 10;
                    else if (normTitle.Length >= 4 && normName.StartsWith(normTitle) && normName.Length <= normTitle.Length + 8)
                        titleScore = 7;
                    else
                        continue;

                    // Artist matching — strict for short names
                    int artistScore = 0;
                    if (inputArtists.Count > 0)
                    {
                        var nctArtists = SplitArtists(s.ArtistName).Select(NormalizeForMatch).Where(a => a.Length > 0).ToList();
                        int matchCount = 0;
                        foreach (var inputArt in inputArtists)
                        {
                            if (inputArt.Length < 2) continue;
                            foreach (var nctArt in nctArtists)
                            {
                                bool isMatch;
                                if (inputArt.Length <= 4 || nctArt.Length <= 4)
                                    isMatch = (nctArt == inputArt);
                                else
                                    isMatch = (nctArt == inputArt || nctArt.Contains(inputArt) || inputArt.Contains(nctArt));

                                if (isMatch) { matchCount++; break; }
                            }
                        }

                        if (matchCount >= 2) artistScore = 5;
                        else if (matchCount == 1) artistScore = 3;

                        if (artistScore == 0) continue;
                    }

                    int score = titleScore + artistScore;

                    // Duration-based scoring: prefer closest to expected duration
                    if (durationSec > 0 && s.Duration > 0)
                    {
                        var diff = Math.Abs(s.Duration - durationSec);
                        if (diff <= 2) score += 3;       // exact/nearly exact match
                        else if (diff <= 5) score += 2;  // close match
                        else if (diff <= 15) score += 1; // moderate match
                        // diff > 15 → no bonus (likely wrong version)
                    }

                    if (score > bestScore)
                    {
                        bestScore = score;
                        bestMatch = s;
                    }
                }

                if (bestMatch == null || bestScore < 7) return null;

                Console.WriteLine($"[NCT-Match] \"{bestMatch.Name}\" by {bestMatch.ArtistName} (score={bestScore})");

                // Pass linkShare directly to skip detail API call (faster!)
                var streamUrl = await GetStreamUrlAsync(bestMatch.Key, bestMatch.LinkShare);
                if (streamUrl != null)
                    SetCache(cacheKey, streamUrl, TimeSpan.FromMinutes(30));
                return streamUrl;
            }
            catch { return null; }
        }

        /// <summary>Split multi-artist string into individual artists</summary>
        private static List<string> SplitArtists(string artists)
        {
            if (string.IsNullOrWhiteSpace(artists)) return new List<string>();
            // Split on: , / & ft. feat. x (as separator)
            return Regex.Split(artists, @"\s*[,/&]\s*|\s+(?:ft\.?|feat\.?|x)\s+", RegexOptions.IgnoreCase)
                .Select(a => a.Trim())
                .Where(a => a.Length > 0)
                .ToList();
        }

        /// <summary>Normalize string for fuzzy matching: remove diacritics + non-alphanumeric</summary>
        private static string NormalizeForMatch(string input)
        {
            if (string.IsNullOrEmpty(input)) return "";
            // Normalize Unicode → decomposed form, strip combining marks (diacritics)
            var normalized = input.Normalize(System.Text.NormalizationForm.FormD);
            var sb = new System.Text.StringBuilder(normalized.Length);
            foreach (var c in normalized)
            {
                var cat = System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c);
                if (cat != System.Globalization.UnicodeCategory.NonSpacingMark)
                    sb.Append(c);
            }
            var noDiacritics = sb.ToString().Normalize(System.Text.NormalizationForm.FormC).ToLowerInvariant();
            // Special Vietnamese chars that don't decompose: đ → d
            noDiacritics = noDiacritics.Replace("đ", "d").Replace("Đ", "d");
            // Keep only alphanumeric
            return Regex.Replace(noDiacritics, @"[^a-z0-9]", "");
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

        // ─── Playlist Detail ──────────────────────────────────────────────
        public async Task<(string name, string image, string description, int totalSongs, List<NctSong> songs)> GetPlaylistAsync(string playlistKey, int limit = 30)
        {
            var cacheKey = $"nct_playlist_{playlistKey}_{limit}";
            if (TryGetCache<(string, string, string, int, List<NctSong>)>(cacheKey, out var cached))
                return cached;

            try
            {
                var url = $"{GRAPH_API}/playlist/detail/{playlistKey}?pn=1&rn={limit}&key={playlistKey}";
                var json = await _http.GetStringAsync(url);
                using var doc = JsonDocument.Parse(json);
                var data = doc.RootElement.GetProperty("data");

                var name = data.TryGetProperty("name", out var n) ? n.GetString() ?? "" : "";
                var image = data.TryGetProperty("image", out var img) ? img.GetString() ?? "" : "";
                var description = data.TryGetProperty("description", out var desc) ? desc.GetString() ?? "" : "";
                var totalSongs = data.TryGetProperty("totalSongs", out var ts) ? ts.GetInt32() : 0;

                var songs = new List<NctSong>();
                if (data.TryGetProperty("listSong", out var listSong))
                {
                    foreach (var s in listSong.EnumerateArray())
                    {
                        var song = ParseSong(s);
                        // Extract 128kbps stream URL
                        if (s.TryGetProperty("streamURL", out var streams))
                        {
                            foreach (var stream in streams.EnumerateArray())
                            {
                                if (stream.TryGetProperty("type", out var t) && t.GetString() == "128"
                                    && stream.TryGetProperty("stream", out var streamUrl))
                                {
                                    song.StreamUrl = streamUrl.GetString() ?? "";
                                    break;
                                }
                            }
                        }
                        songs.Add(song);
                    }
                }

                var result = (name, image, description, totalSongs, songs);
                SetCache(cacheKey, result, TimeSpan.FromMinutes(30));
                return result;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"GetPlaylist error: {ex.Message}");
                return ("", "", "", 0, new List<NctSong>());
            }
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
