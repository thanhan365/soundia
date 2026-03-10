using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Soundia.Api.Data;
using System.Security.Claims;

namespace Soundia.Api.Controllers
{
    [Route("api/admin")]
    [ApiController]
    [Authorize]
    public class AdminController : ControllerBase
    {
        private readonly SoundiaDbContext _context;

        public AdminController(SoundiaDbContext context)
        {
            _context = context;
        }

        // Helper: check if current user is admin
        private async Task<bool> IsAdmin()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return false;
            var userId = int.Parse(userIdClaim);
            var user = await _context.Users.FindAsync(userId);
            return user?.Role == "admin";
        }

        // ── Dashboard Stats ──────────────────────────────────────────────────
        [HttpGet("stats")]
        public async Task<ActionResult> GetStats()
        {
            if (!await IsAdmin()) return Forbid();

            var totalUsers = await _context.Users.CountAsync();
            var totalPlaylists = await _context.Playlists.CountAsync();
            var totalFavorites = await _context.Favorites.CountAsync();
            var totalListened = await _context.ListeningHistories.CountAsync();

            var weekAgo = DateTime.UtcNow.AddDays(-7);
            var newUsersThisWeek = await _context.Users.CountAsync(u => u.CreatedAt >= weekAgo);
            var listensThisWeek = await _context.ListeningHistories.CountAsync(h => h.PlayedAt >= weekAgo);

            var topSongs = await _context.ListeningHistories
                .Where(h => h.PlayedAt >= weekAgo && h.ExternalTitle != null)
                .GroupBy(h => new { h.ExternalTitle, h.ExternalArtist })
                .Select(g => new { title = g.Key.ExternalTitle, artist = g.Key.ExternalArtist, plays = g.Count() })
                .OrderByDescending(x => x.plays)
                .Take(10)
                .ToListAsync();

            return Ok(new
            {
                totalUsers,
                totalPlaylists,
                totalFavorites,
                totalListened,
                newUsersThisWeek,
                listensThisWeek,
                topSongs
            });
        }

        // ── User Management ──────────────────────────────────────────────────
        [HttpGet("users")]
        public async Task<ActionResult> GetUsers([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            if (!await IsAdmin()) return Forbid();

            var query = _context.Users.OrderByDescending(u => u.CreatedAt);
            var total = await query.CountAsync();
            var users = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(u => new
                {
                    u.Id,
                    u.Username,
                    u.Email,
                    u.DisplayName,
                    u.AvatarUrl,
                    u.Role,
                    u.CreatedAt,
                    playlistCount = _context.Playlists.Count(p => p.UserId == u.Id),
                    favoritesCount = _context.Favorites.Count(f => f.UserId == u.Id),
                    listenCount = _context.ListeningHistories.Count(h => h.UserId == u.Id)
                })
                .ToListAsync();

            return Ok(new { total, page, pageSize, users });
        }

        // ── Delete User ──────────────────────────────────────────────────────
        [HttpDelete("users/{id}")]
        public async Task<ActionResult> DeleteUser(int id)
        {
            if (!await IsAdmin()) return Forbid();

            var adminId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            if (id == adminId)
                return BadRequest("Cannot delete your own admin account.");

            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound("User not found.");

            // Remove all related data
            var favorites = await _context.Favorites.Where(f => f.UserId == id).ToListAsync();
            _context.Favorites.RemoveRange(favorites);

            // Remove playlist songs via raw SQL (PlaylistSong is not a DbSet)
            var playlistIds = await _context.Playlists.Where(p => p.UserId == id).Select(p => p.Id).ToListAsync();
            if (playlistIds.Any())
            {
                await _context.Database.ExecuteSqlRawAsync(
                    $"DELETE FROM PlaylistSongs WHERE PlaylistId IN ({string.Join(",", playlistIds)})");
            }

            var playlists = await _context.Playlists.Where(p => p.UserId == id).ToListAsync();
            _context.Playlists.RemoveRange(playlists);

            var history = await _context.ListeningHistories.Where(h => h.UserId == id).ToListAsync();
            _context.ListeningHistories.RemoveRange(history);

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            return Ok(new { message = $"User '{user.Username}' has been deleted." });
        }

        // ── Upload MP3 ──────────────────────────────────────────────────────
        [HttpPost("upload-song")]
        [RequestSizeLimit(50_000_000)] // 50MB max
        public async Task<ActionResult> UploadSong(
            [FromForm] IFormFile file,
            [FromForm] string title,
            [FromForm] string artist,
            [FromForm] string? coverUrl)
        {
            if (!await IsAdmin()) return Forbid();

            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded.");

            var ext = Path.GetExtension(file.FileName).ToLower();
            if (ext != ".mp3" && ext != ".m4a" && ext != ".wav" && ext != ".ogg")
                return BadRequest("Only audio files (.mp3, .m4a, .wav, .ogg) are allowed.");

            // Create upload directory
            var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "songs");
            Directory.CreateDirectory(uploadsDir);

            // Generate unique filename
            var fileName = $"{Guid.NewGuid()}{ext}";
            var filePath = Path.Combine(uploadsDir, fileName);

            // Save file
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // Build audio URL
            var audioUrl = $"/uploads/songs/{fileName}";

            // Save to DB
            var song = new Soundia.Api.Models.Song
            {
                Title = title,
                Artist = artist,
                Duration = "0:00",
                CoverUrl = coverUrl ?? "",
                AudioUrl = audioUrl
            };
            _context.Songs.Add(song);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                song.Id,
                song.Title,
                song.Artist,
                song.AudioUrl,
                song.CoverUrl,
                uploadedAt = DateTime.UtcNow,
                fileSize = file.Length
            });
        }

        // ── List Uploaded Songs ──────────────────────────────────────────────
        [HttpGet("uploaded-songs")]
        public async Task<ActionResult> GetUploadedSongs([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            if (!await IsAdmin()) return Forbid();

            var query = _context.Songs
                .Where(s => s.AudioUrl.StartsWith("/uploads/"))
                .OrderByDescending(s => s.Id);

            var total = await query.CountAsync();
            var songs = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(s => new { s.Id, s.Title, s.Artist, s.Duration, s.CoverUrl, s.AudioUrl })
                .ToListAsync();

            return Ok(new { total, page, pageSize, songs });
        }

        // ── Delete Uploaded Song ─────────────────────────────────────────────
        [HttpDelete("songs/{id}")]
        public async Task<ActionResult> DeleteSong(int id)
        {
            if (!await IsAdmin()) return Forbid();

            var song = await _context.Songs.FindAsync(id);
            if (song == null) return NotFound("Song not found.");

            // Delete physical file
            if (song.AudioUrl.StartsWith("/uploads/"))
            {
                var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", song.AudioUrl.TrimStart('/'));
                if (System.IO.File.Exists(filePath))
                    System.IO.File.Delete(filePath);
            }

            _context.Songs.Remove(song);
            await _context.SaveChangesAsync();

            return Ok(new { message = $"Song '{song.Title}' deleted." });
        }
    }
}
