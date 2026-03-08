using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace Soundia.Api.Services
{
    public interface ISpotifyService
    {
        Task<string> SearchAsync(string query, string type = "track,artist");
        Task<string> SearchArtistAsync(string query);
        Task<string> GetArtistTopTracksAsync(string artistId);
    }

    public class SpotifyService : ISpotifyService
    {
        private readonly HttpClient _httpClient;
        private readonly string _clientId;
        private readonly string _clientSecret;

        private string? _accessToken;
        private DateTime _tokenExpiry;

        private const string _tokenEndpoint = "https://accounts.spotify.com/api/token";

        public SpotifyService(HttpClient httpClient, IConfiguration config)
        {
            _httpClient = httpClient;
            _clientId = config["Spotify:ClientId"] ?? "";
            _clientSecret = config["Spotify:ClientSecret"] ?? "";
            _tokenExpiry = DateTime.MinValue;

            Console.WriteLine($"[SpotifyService] Initialized. ClientId length={_clientId.Length}, ClientSecret length={_clientSecret.Length}");
        }

        private async Task EnsureAccessTokenAsync()
        {
            if (!string.IsNullOrEmpty(_accessToken) && DateTime.UtcNow < _tokenExpiry)
            {
                Console.WriteLine("[SpotifyService] Using cached access token.");
                return;
            }

            if (string.IsNullOrEmpty(_clientId) || string.IsNullOrEmpty(_clientSecret))
            {
                Console.WriteLine("[SpotifyService] ERROR: Spotify credentials are empty!");
                throw new InvalidOperationException("Spotify credentials are not configured.");
            }

            Console.WriteLine("[SpotifyService] Requesting new access token...");

            var authString = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_clientId}:{_clientSecret}"));
            var request = new HttpRequestMessage(HttpMethod.Post, _tokenEndpoint);
            request.Headers.Authorization = new AuthenticationHeaderValue("Basic", authString);
            request.Content = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("grant_type", "client_credentials")
            });

            var response = await _httpClient.SendAsync(request);
            var contentString = await response.Content.ReadAsStringAsync();

            Console.WriteLine($"[SpotifyService] Token response status: {(int)response.StatusCode}");
            Console.WriteLine($"[SpotifyService] Token response body: {contentString}");

            if (!response.IsSuccessStatusCode)
            {
                throw new HttpRequestException($"Spotify token request failed with status {(int)response.StatusCode}: {contentString}");
            }

            using var jsonDocument = JsonDocument.Parse(contentString);
            var tokenData = jsonDocument.RootElement;

            _accessToken = tokenData.GetProperty("access_token").GetString();
            var expiresInSeconds = tokenData.GetProperty("expires_in").GetInt32();

            // Subtract 5 minutes from expiry for safety margin
            _tokenExpiry = DateTime.UtcNow.AddSeconds(expiresInSeconds - 300);
            Console.WriteLine($"[SpotifyService] Got access token, expires in {expiresInSeconds}s");
        }

        /// <summary>
        /// Helper: gửi request đến Spotify API với retry logic.
        /// Khi gặp 403 sẽ reset token và thử lại (tối đa 3 lần).
        /// </summary>
        private async Task<string> SendWithRetryAsync(string url, string label, int maxRetries = 3)
        {
            for (int attempt = 1; attempt <= maxRetries; attempt++)
            {
                await EnsureAccessTokenAsync();
                Console.WriteLine($"[SpotifyService] {label} (attempt {attempt}/{maxRetries}) URL: {url}");

                var request = new HttpRequestMessage(HttpMethod.Get, url);
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _accessToken);
                var response = await _httpClient.SendAsync(request);
                var body = await response.Content.ReadAsStringAsync();

                Console.WriteLine($"[SpotifyService] {label} response status: {(int)response.StatusCode}");

                if (response.IsSuccessStatusCode)
                {
                    return body;
                }

                Console.WriteLine($"[SpotifyService] {label} error body: {body}");

                if ((int)response.StatusCode == 403 && attempt < maxRetries)
                {
                    Console.WriteLine($"[SpotifyService] Got 403, resetting token and retrying in {attempt * 500}ms...");
                    _accessToken = null;
                    _tokenExpiry = DateTime.MinValue;
                    await Task.Delay(attempt * 500);
                    continue;
                }

                if ((int)response.StatusCode == 401 && attempt < maxRetries)
                {
                    Console.WriteLine($"[SpotifyService] Got 401, token expired. Refreshing...");
                    _accessToken = null;
                    _tokenExpiry = DateTime.MinValue;
                    continue;
                }

                throw new HttpRequestException($"Spotify {label} failed with status {(int)response.StatusCode}: {body}");
            }

            throw new HttpRequestException($"Spotify {label} failed after {maxRetries} retries");
        }

        public async Task<string> SearchAsync(string query, string type = "track,artist")
        {
            var url = $"https://api.spotify.com/v1/search?q={Uri.EscapeDataString(query)}&type={type}&limit=10&market=VN";
            return await SendWithRetryAsync(url, "SearchAsync");
        }

        public async Task<string> SearchArtistAsync(string query)
        {
            var url = $"https://api.spotify.com/v1/search?q={Uri.EscapeDataString(query)}&type=artist&limit=5&market=VN";
            return await SendWithRetryAsync(url, "SearchArtistAsync");
        }

        public async Task<string> GetArtistTopTracksAsync(string artistId)
        {
            var url = $"https://api.spotify.com/v1/artists/{artistId}/top-tracks?market=VN";
            return await SendWithRetryAsync(url, "GetArtistTopTracksAsync");
        }
    }
}
