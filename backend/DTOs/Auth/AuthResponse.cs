namespace Soundia.Api.DTOs.Auth
{
    public class AuthResponse
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Token { get; set; } = string.Empty;
        public string? RefreshToken { get; set; }
        public string? DisplayName { get; set; }
        public string? AvatarUrl { get; set; }
        public string Role { get; set; } = "user";
    }
}
