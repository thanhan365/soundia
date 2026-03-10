using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Soundia.Api.Data;
using Soundia.Api.DTOs.Auth;
using Soundia.Api.Models;
using Soundia.Api.Services;
using System.Security.Claims;
using System.Security.Cryptography;

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
                return BadRequest("Username is already taken.");

            if (await _context.Users.AnyAsync(u => u.Email == request.Email.ToLower()))
                return BadRequest("Email is already taken.");

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
                AvatarUrl = user.AvatarUrl
            };
        }

        [HttpPost("login")]
        public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Username == request.Username.ToLower());

            if (user == null)
                return Unauthorized("Invalid username or password.");

            var isPasswordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);
            if (!isPasswordValid)
                return Unauthorized("Invalid username or password.");

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
                AvatarUrl = user.AvatarUrl
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
                AvatarUrl = user.AvatarUrl
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
