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
            [FromForm] string? coverUrl,
            [FromForm] string? duration)
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

            // Format duration robustly
            var finalDuration = "0:00";
            if (!string.IsNullOrWhiteSpace(duration))
            {
                if (duration.Contains(":")) finalDuration = duration;
                else if (int.TryParse(duration, out var sec)) finalDuration = $"{sec / 60}:{sec % 60:D2}";
            }

            // Save to DB
            var song = new Soundia.Api.Models.Song
            {
                Title = title,
                Artist = artist,
                Duration = finalDuration,
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
        }        // ── Public Playlists (no auth) ──────────────────────────────────────────
        [HttpGet("public-playlists")]
        [AllowAnonymous]
        public async Task<ActionResult> GetPublicPlaylists()
        {
            var playlists = await _context.Playlists
                .Where(p => p.IsPublic)
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => new
                {
                    p.Id,
                    p.Name,
                    songCount = p.PlaylistSongs.Count,
                    cover = p.PlaylistSongs
                        .OrderBy(ps => ps.AddedAt)
                        .Where(ps => ps.Song.CoverUrl != null && ps.Song.CoverUrl != "")
                        .Select(ps => ps.Song.CoverUrl)
                        .FirstOrDefault() ?? "",
                    songs = p.PlaylistSongs
                        .OrderBy(ps => ps.AddedAt)
                        .Select(ps => new
                        {
                            ps.Song.Id,
                            ps.Song.Title,
                            ps.Song.Artist,
                            ps.Song.Duration,
                            ps.Song.CoverUrl,
                            ps.Song.AudioUrl
                        }).ToList()
                })
                .ToListAsync();

            return Ok(playlists);
        }

        // ── Delete Public Playlist ───────────────────────────────────────────
        [HttpDelete("public-playlists/{id}")]
        public async Task<ActionResult> DeletePublicPlaylist(int id)
        {
            if (!await IsAdmin()) return Forbid();

            var playlist = await _context.Playlists
                .Include(p => p.PlaylistSongs)
                .FirstOrDefaultAsync(p => p.Id == id && p.IsPublic);

            if (playlist == null)
            {
                return NotFound(new { success = false, message = "Không tìm thấy playlist" });
            }

            // Tìm bài hát CHỈ nằm trong playlist này (không nằm ở playlist khác)
            var songIds = playlist.PlaylistSongs.Select(ps => ps.SongId).ToList();
            var orphanSongIds = new List<int>();
            foreach (var songId in songIds)
            {
                var otherCount = await _context.PlaylistSongs
                    .CountAsync(ps => ps.SongId == songId && ps.PlaylistId != id);
                if (otherCount == 0) orphanSongIds.Add(songId);
            }

            // Xóa liên kết PlaylistSongs
            _context.PlaylistSongs.RemoveRange(playlist.PlaylistSongs);
            
            // Xóa bài hát orphan
            if (orphanSongIds.Count > 0)
            {
                var orphanSongs = await _context.Songs
                    .Where(s => orphanSongIds.Contains(s.Id))
                    .ToListAsync();
                _context.Songs.RemoveRange(orphanSongs);
            }

            // Xóa playlist
            _context.Playlists.Remove(playlist);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = $"Đã xóa playlist và {orphanSongIds.Count} bài hát trong playlist đó." });
        }
        // ── Rename Public Playlist ──────────────────────────────────────────
        [HttpPut("public-playlists/{id}/rename")]
        public async Task<ActionResult> RenamePublicPlaylist(int id, [FromBody] RenamePlaylistRequest request)
        {
            if (!await IsAdmin()) return Forbid();

            var playlist = await _context.Playlists
                .FirstOrDefaultAsync(p => p.Id == id && p.IsPublic);

            if (playlist == null)
                return NotFound(new { success = false, message = "Không tìm thấy playlist" });

            playlist.Name = request.Name.Trim();
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Đã đổi tên playlist", name = playlist.Name });
        }

        // ── Import Songs from Link (Zing/NCT) ─────────────────────────────────
        [HttpPost("import-songs")]
        public async Task<ActionResult> ImportSongs([FromBody] ImportSongsRequest request)
        {
            if (!await IsAdmin()) return Forbid();

            if (request.Songs == null || request.Songs.Count == 0)
                return BadRequest("No songs provided.");

            var adminId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var savedSongs = new List<Soundia.Api.Models.Song>();
            var skipped = 0;

            foreach (var s in request.Songs)
            {
                if (string.IsNullOrWhiteSpace(s.Title)) continue;

                // Check if song already exists (same Title + Artist)
                var existing = await _context.Songs.FirstOrDefaultAsync(
                    x => x.Title == s.Title && x.Artist == (s.Artist ?? "Unknown"));

                if (existing != null)
                {
                    savedSongs.Add(existing);
                    skipped++;
                    continue;
                }

                var song = new Soundia.Api.Models.Song
                {
                    Title = s.Title?.Trim() ?? "",
                    Artist = s.Artist?.Trim() ?? "Unknown",
                    Duration = s.Duration ?? "0:00",
                    CoverUrl = s.Cover ?? "",
                    AudioUrl = s.Audio ?? "YT_STREAM"
                };
                _context.Songs.Add(song);
                await _context.SaveChangesAsync(); // Save to get ID
                savedSongs.Add(song);
            }

            // Create playlist if name provided (skip if already exists)
            int? playlistId = null;
            bool playlistExisted = false;
            if (!string.IsNullOrWhiteSpace(request.PlaylistName) && savedSongs.Count > 0)
            {
                var trimmedName = request.PlaylistName.Trim();
                var existingPlaylist = await _context.Playlists
                    .FirstOrDefaultAsync(p => p.Name == trimmedName);

                Soundia.Api.Models.Playlist playlist;
                if (existingPlaylist != null)
                {
                    playlist = existingPlaylist;
                    playlist.IsPublic = true; // Mark as public since it's admin-imported
                    playlistExisted = true;
                }
                else
                {
                    playlist = new Soundia.Api.Models.Playlist
                    {
                        UserId = adminId,
                        Name = trimmedName,
                        CreatedAt = DateTime.UtcNow,
                        IsPublic = true
                    };
                    _context.Playlists.Add(playlist);
                    await _context.SaveChangesAsync();
                }
                playlistId = playlist.Id;

                // Link songs to playlist
                var order = 0;
                foreach (var song in savedSongs)
                {
                    var exists = await _context.PlaylistSongs
                        .AnyAsync(ps => ps.PlaylistId == playlist.Id && ps.SongId == song.Id);
                    if (!exists)
                    {
                        _context.PlaylistSongs.Add(new Soundia.Api.Models.PlaylistSong
                        {
                            PlaylistId = playlist.Id,
                            SongId = song.Id,
                            AddedAt = DateTime.UtcNow
                        });
                    }
                    order++;
                }
                await _context.SaveChangesAsync();
            }

            return Ok(new
            {
                message = $"Đã lưu {savedSongs.Count - skipped} bài mới, {skipped} bài đã có sẵn.",
                totalSaved = savedSongs.Count,
                newSongs = savedSongs.Count - skipped,
                skipped,
                playlistId,
                playlistName = request.PlaylistName,
                playlistExisted
            });
        }

        public class ImportSongsRequest
        {
            public string? PlaylistName { get; set; }
            public string? Source { get; set; }
            public string? CoverImage { get; set; }
            public List<ImportSongItem> Songs { get; set; } = new();
        }

        public class ImportSongItem
        {
            public string? Title { get; set; }
            public string? Artist { get; set; }
            public string? Duration { get; set; }
            public string? Cover { get; set; }
            public string? Audio { get; set; }
        }

        public class RenamePlaylistRequest
        {
            public string Name { get; set; } = string.Empty;
        }
    }
}
