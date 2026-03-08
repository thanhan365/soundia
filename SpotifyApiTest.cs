using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;

class Program
{
    static async Task Main(string[] args)
    {
        try
        {
            var client = new HttpClient();
            var authString = Convert.ToBase64String(Encoding.UTF8.GetBytes("9126d12ad200472a9b4bd0c887b74a2d:535f4e2472894f06a371e568a69dec04"));
            var request = new HttpRequestMessage(HttpMethod.Post, "https://accounts.spotify.com/api/token");
            request.Headers.Authorization = new AuthenticationHeaderValue("Basic", authString);
            request.Content = new FormUrlEncodedContent(new[]
            {
                new System.Collections.Generic.KeyValuePair<string, string>("grant_type", "client_credentials")
            });

            var response = await client.SendAsync(request);
            var content = await response.Content.ReadAsStringAsync();
            
            Console.WriteLine("--- TOKEN API RESPONSE ---");
            Console.WriteLine("STATUS: " + response.StatusCode);
            Console.WriteLine("BODY: " + content);
            
            if (response.IsSuccessStatusCode)
            {
                var token = System.Text.Json.JsonDocument.Parse(content).RootElement.GetProperty("access_token").GetString();
                var searchReq = new HttpRequestMessage(HttpMethod.Get, "https://api.spotify.com/v1/search?q=den&type=artist&market=VN&limit=5");
                searchReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
                var searchRes = await client.SendAsync(searchReq);
                var searchContent = await searchRes.Content.ReadAsStringAsync();
                Console.WriteLine("\n--- SEARCH API RESPONSE ---");
                Console.WriteLine("STATUS: " + searchRes.StatusCode);
                Console.WriteLine("BODY: " + searchContent);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine("NATIVE CRASH: " + ex.Message);
        }
    }
}
