using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Soundia.Api.Data;
using Soundia.Api.Models;
using System.Security.Claims;

namespace Soundia.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class HistoryController : ControllerBase
    {
        private readonly SoundiaDbContext _context;

        public HistoryController(SoundiaDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Record a listening event
        /// </summary>
        [HttpPost]
        public async Task<ActionResult> RecordListening([FromBody] RecordListeningRequest request)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

            var history = new ListeningHistory
            {
                UserId = userId,
                SongId = request.SongId,
                ExternalTitle = request.ExternalTitle,
                ExternalArtist = request.ExternalArtist,
                ExternalCoverUrl = request.ExternalCoverUrl,
                DurationListened = request.DurationListened,
                PlayedAt = DateTime.UtcNow
            };

            _context.ListeningHistories.Add(history);
            await _context.SaveChangesAsync();

            return Ok();
        }

        /// <summary>
        /// Get listening history (last 50)
        /// </summary>
        [HttpGet]
        public async Task<ActionResult> GetHistory([FromQuery] int limit = 50)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

            var history = await _context.ListeningHistories
                .Where(lh => lh.UserId == userId)
                .OrderByDescending(lh => lh.PlayedAt)
                .Take(limit)
                .Select(lh => new
                {
                    lh.Id,
                    lh.SongId,
                    SongTitle = lh.Song != null ? lh.Song.Title : lh.ExternalTitle,
                    SongArtist = lh.Song != null ? lh.Song.Artist : lh.ExternalArtist,
                    SongCover = lh.Song != null ? lh.Song.CoverUrl : lh.ExternalCoverUrl,
                    lh.PlayedAt,
                    lh.DurationListened
                })
                .ToListAsync();

            return Ok(history);
        }

        /// <summary>
        /// Get listening stats
        /// </summary>
        [HttpGet("stats")]
        public async Task<ActionResult> GetStats()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

            var totalListened = await _context.ListeningHistories
                .Where(lh => lh.UserId == userId)
                .SumAsync(lh => lh.DurationListened);

            var totalSongs = await _context.ListeningHistories
                .Where(lh => lh.UserId == userId)
                .CountAsync();

            // Top 5 most played songs
            var topSongs = await _context.ListeningHistories
                .Where(lh => lh.UserId == userId && lh.SongId != null)
                .GroupBy(lh => lh.SongId)
                .Select(g => new
                {
                    SongId = g.Key,
                    PlayCount = g.Count(),
                    TotalDuration = g.Sum(lh => lh.DurationListened)
                })
                .OrderByDescending(x => x.PlayCount)
                .Take(5)
                .ToListAsync();

            // Enrich with song data
            var songIds = topSongs.Select(t => t.SongId).ToList();
            var songs = await _context.Songs
                .Where(s => songIds.Contains(s.Id))
                .ToDictionaryAsync(s => s.Id);

            var topSongsResult = topSongs.Select(t => new
            {
                t.SongId,
                Title = songs.ContainsKey(t.SongId!.Value) ? songs[t.SongId.Value].Title : "Unknown",
                Artist = songs.ContainsKey(t.SongId!.Value) ? songs[t.SongId.Value].Artist : "Unknown",
                CoverUrl = songs.ContainsKey(t.SongId!.Value) ? songs[t.SongId.Value].CoverUrl : null,
                t.PlayCount,
                t.TotalDuration
            });

            return Ok(new
            {
                TotalListeningSeconds = totalListened,
                TotalListeningMinutes = totalListened / 60,
                TotalSongsPlayed = totalSongs,
                TopSongs = topSongsResult
            });
        }
    }

    public class RecordListeningRequest
    {
        public int? SongId { get; set; }
        public string? ExternalTitle { get; set; }
        public string? ExternalArtist { get; set; }
        public string? ExternalCoverUrl { get; set; }
        public int DurationListened { get; set; }
    }
}
