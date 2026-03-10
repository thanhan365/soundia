using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using System.Linq;
using Microsoft.Extensions.Configuration;

namespace Soundia.Api.Services
{
    public interface INctService
    {
        Task<string> SearchAsync(string keyword);
        Task<string> GetHomeAsync();
        Task<string> GetSongAsync(string songId);
        Task<string> GetPlaylistDetailAsync(string playlistId);
        Task<string> GetArtistDetailAsync(string artistId);
        Task<string> GetTrendingArtistsAsync();
    }

    public class NctService : INctService
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiUrl;
        private readonly string _apiKey;
        private readonly string _secretKey;

        public NctService(HttpClient httpClient, IConfiguration config)
        {
            _httpClient = httpClient;
            _apiUrl = config["Nct:ApiUrl"] ?? "https://beta.nhaccuatui.com/api";
            _apiKey = config["Nct:ApiKey"] ?? "";
            _secretKey = config["Nct:SecretKey"] ?? "";
        }

        private async Task<string> SendRequestAsync(string endpoint, Dictionary<string, string> queryParams = null)
        {
            var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString();
            
            var secretKeyBytes = Encoding.UTF8.GetBytes(_secretKey);
            var dataBytes = Encoding.UTF8.GetBytes(now);
            using var hmac = new HMACSHA512(secretKeyBytes);
            var hashBytes = hmac.ComputeHash(dataBytes);
            var hash = BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();

            var requestUri = $"{_apiUrl}/{endpoint}?a={_apiKey}&t={now}&s={hash}";

            HttpContent content = null;
            if (queryParams != null && queryParams.Count > 0)
            {
                var dictContent = queryParams.Select(kvp => $"{Uri.EscapeDataString(kvp.Key)}={Uri.EscapeDataString(kvp.Value)}");
                var stringContent = string.Join("&", dictContent);
                content = new StringContent(stringContent, Encoding.UTF8, "application/x-www-form-urlencoded");
            }

            var request = new HttpRequestMessage(HttpMethod.Post, requestUri);
            if (content != null)
            {
                request.Content = content;
            }

            var response = await _httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();

            return await response.Content.ReadAsStringAsync();
        }

        public Task<string> SearchAsync(string keyword)
        {
            return SendRequestAsync("search/all", new Dictionary<string, string> { { "key", keyword } });
        }

        public Task<string> GetHomeAsync()
        {
            return SendRequestAsync("home");
        }

        public Task<string> GetSongAsync(string songId)
        {
            return SendRequestAsync("media/info", new Dictionary<string, string> { { "key", songId }, { "type", "song" } });
        }

        public Task<string> GetPlaylistDetailAsync(string playlistId)
        {
            return SendRequestAsync("media/info", new Dictionary<string, string> { { "key", playlistId }, { "type", "playlist" } });
        }

        public Task<string> GetArtistDetailAsync(string artistId)
        {
            return SendRequestAsync("artist/detail", new Dictionary<string, string> 
            { 
                { "shortLink", artistId }, 
                { "type", "all" },
                { "size", "20" },
                { "index", "1" },
                { "sort", "0" }
            });
        }

        public Task<string> GetTrendingArtistsAsync()
        {
            return SendRequestAsync("ranking/artist", new Dictionary<string, string> { { "size", "10" } });
        }
    }
}
