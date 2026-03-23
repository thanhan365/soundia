using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Soundia.Api.Data;
using Soundia.Api.DTOs.Auth;
using Soundia.Api.Models;
using Soundia.Api.Services;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text.Json;

namespace Soundia.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly SoundiaDbContext _context;
        private readonly ITokenService _tokenService;

        public AuthController(SoundiaDbContext context, ITokenService tokenService)
        {
            _context = context;
            _tokenService = tokenService;
        }

        [HttpPost("register")]
        public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
        {
            if (await _context.Users.AnyAsync(u => u.Username == request.Username.ToLower()))
                return BadRequest("Tên đăng nhập đã được sử dụng.");

            if (await _context.Users.AnyAsync(u => u.Email == request.Email.ToLower()))
                return BadRequest("Email đã được sử dụng.");

            var refreshToken = GenerateRefreshToken();
            var user = new User
            {
                Username = request.Username.ToLower(),
                Email = request.Email.ToLower(),
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                RefreshToken = refreshToken,
                RefreshTokenExpiry = DateTime.UtcNow.AddDays(30)
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return new AuthResponse
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                Token = _tokenService.CreateToken(user),
                RefreshToken = refreshToken,
                DisplayName = user.DisplayName,
                AvatarUrl = user.AvatarUrl,
                Role = user.Role
            };
        }

        [HttpPost("login")]
        public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
        {
            var input = request.Username.ToLower();
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Username == input || u.Email == input);

            if (user == null)
                return Unauthorized("Tên đăng nhập hoặc mật khẩu không đúng.");

            if (string.IsNullOrEmpty(user.PasswordHash))
                return Unauthorized("Tài khoản này dùng đăng nhập Google.");

            var isPasswordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);
            if (!isPasswordValid)
                return Unauthorized("Tên đăng nhập hoặc mật khẩu không đúng.");

            // Update refresh token
            user.RefreshToken = GenerateRefreshToken();
            user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(30);
            await _context.SaveChangesAsync();

            return new AuthResponse
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                Token = _tokenService.CreateToken(user),
                RefreshToken = user.RefreshToken,
                DisplayName = user.DisplayName,
                AvatarUrl = user.AvatarUrl,
                Role = user.Role
            };
        }

        [HttpPost("google-login")]
        public async Task<ActionResult<AuthResponse>> GoogleLogin([FromBody] GoogleLoginRequest request)
        {
            // Verify Google ID token
            using var http = new HttpClient();
            var verifyUrl = $"https://oauth2.googleapis.com/tokeninfo?id_token={request.IdToken}";
            var verifyRes = await http.GetAsync(verifyUrl);
            if (!verifyRes.IsSuccessStatusCode)
                return Unauthorized("Google token không hợp lệ.");

            var json = await verifyRes.Content.ReadAsStringAsync();
            var googleData = JsonSerializer.Deserialize<JsonElement>(json);

            var googleId = googleData.GetProperty("sub").GetString();
            var email = googleData.GetProperty("email").GetString()?.ToLower();
            var name = googleData.TryGetProperty("name", out var n) ? n.GetString() : null;
            var picture = googleData.TryGetProperty("picture", out var p) ? p.GetString() : null;

            if (string.IsNullOrEmpty(googleId) || string.IsNullOrEmpty(email))
                return BadRequest("Không lấy được thông tin từ Google.");

            // Find existing user by GoogleId
            var user = await _context.Users.FirstOrDefaultAsync(u => u.GoogleId == googleId);

            if (user == null)
            {
                // Try find by email (link existing account)
                user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
                if (user != null)
                {
                    // Link Google to existing account
                    user.GoogleId = googleId;
                    if (string.IsNullOrEmpty(user.AvatarUrl) && picture != null)
                        user.AvatarUrl = picture;
                }
                else
                {
                    // Create new user
                    user = new User
                    {
                        Username = email.Split('@')[0] + "_g" + googleId[^4..],
                        Email = email,
                        GoogleId = googleId,
                        DisplayName = name ?? email.Split('@')[0],
                        AvatarUrl = picture,
                        Role = "user"
                    };
                    _context.Users.Add(user);
                }
            }
            else
            {
                // Update avatar if changed
                if (picture != null && user.AvatarUrl != picture)
                    user.AvatarUrl = picture;
            }

            // Set refresh token
            user.RefreshToken = GenerateRefreshToken();
            user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(30);
            await _context.SaveChangesAsync();

            return new AuthResponse
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                Token = _tokenService.CreateToken(user),
                RefreshToken = user.RefreshToken,
                DisplayName = user.DisplayName,
                AvatarUrl = user.AvatarUrl,
                Role = user.Role
            };
        }

        [HttpPost("refresh")]
        public async Task<ActionResult<AuthResponse>> RefreshToken([FromBody] RefreshTokenRequest request)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.RefreshToken == request.RefreshToken);

            if (user == null || user.RefreshTokenExpiry < DateTime.UtcNow)
                return Unauthorized("Invalid or expired refresh token.");

            // Rotate refresh token
            user.RefreshToken = GenerateRefreshToken();
            user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(30);
            await _context.SaveChangesAsync();

            return new AuthResponse
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                Token = _tokenService.CreateToken(user),
                RefreshToken = user.RefreshToken,
                DisplayName = user.DisplayName,
                AvatarUrl = user.AvatarUrl,
                Role = user.Role
            };
        }

        [Authorize]
        [HttpGet("profile")]
        public async Task<ActionResult> GetProfile()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound();

            return Ok(new
            {
                user.Id, user.Username, user.Email,
                user.DisplayName, user.AvatarUrl,
                user.CreatedAt,
                FavoritesCount = await _context.Favorites.CountAsync(f => f.UserId == userId),
                PlaylistsCount = await _context.Playlists.CountAsync(p => p.UserId == userId),
                TotalListened = await _context.ListeningHistories.CountAsync(lh => lh.UserId == userId)
            });
        }

        [Authorize]
        [HttpPut("profile")]
        public async Task<ActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound();

            if (request.DisplayName != null) user.DisplayName = request.DisplayName;
            if (request.AvatarUrl != null) user.AvatarUrl = request.AvatarUrl;

            await _context.SaveChangesAsync();
            return Ok(new { user.DisplayName, user.AvatarUrl });
        }

        [HttpGet("check-admin")]
        public async Task<ActionResult> CheckAdmin()
        {
            var hasAdmin = await _context.Users.AnyAsync(u => u.Role == "admin");
            return Ok(new { hasAdmin });
        }

        [HttpPost("seed-admin")]
        public async Task<ActionResult> SeedAdmin([FromBody] RegisterRequest request)
        {
            // Cho phép tối đa 5 tài khoản admin
            var adminCount = await _context.Users.CountAsync(u => u.Role == "admin");
            if (adminCount >= 5)
                return BadRequest("Đã đạt giới hạn 5 tài khoản admin.");

            if (await _context.Users.AnyAsync(u => u.Username == request.Username.ToLower()))
                return BadRequest("Tên đăng nhập đã tồn tại.");

            if (await _context.Users.AnyAsync(u => u.Email == request.Email.ToLower()))
                return BadRequest("Email đã tồn tại.");

            var admin = new User
            {
                Username = request.Username.ToLower(),
                Email = request.Email.ToLower(),
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                Role = "admin",
                DisplayName = request.Username
            };
            _context.Users.Add(admin);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Admin account created successfully.", username = admin.Username });
        }

        private static string GenerateRefreshToken()
        {
            var bytes = new byte[64];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(bytes);
            return Convert.ToBase64String(bytes);
        }
    }

    // DTOs
    public class RefreshTokenRequest
    {
        public string RefreshToken { get; set; } = string.Empty;
    }

    public class UpdateProfileRequest
    {
        public string? DisplayName { get; set; }
        public string? AvatarUrl { get; set; }
    }
}
