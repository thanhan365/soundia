using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Soundia.Api.Data;
using Soundia.Api.DTOs.Playlists;
using Soundia.Api.Models;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Soundia.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class PlaylistsController : ControllerBase
    {
        private readonly SoundiaDbContext _context;

        public PlaylistsController(SoundiaDbContext context)
        {
            _context = context;
        }

        private int GetCurrentUserId()
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.Parse(userIdString!);
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Playlist>>> GetPlaylists()
        {
            var userId = GetCurrentUserId();

            return await _context.Playlists
                .Include(p => p.PlaylistSongs)
                .ThenInclude(ps => ps.Song)
                .Where(p => p.UserId == userId && !p.IsPublic)
                .ToListAsync();
        }

        [HttpPost]
        public async Task<ActionResult<Playlist>> CreatePlaylist([FromBody] CreatePlaylistRequest request)
        {
            var userId = GetCurrentUserId();

            var playlist = new Playlist
            {
                Name = request.Name,
                UserId = userId
            };

            _context.Playlists.Add(playlist);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetPlaylists), new { id = playlist.Id }, playlist);
        }

        [HttpPost("{id}/songs")]
        public async Task<ActionResult> AddSongToPlaylist(int id, [FromBody] AddSongToPlaylistRequest request)
        {
            var userId = GetCurrentUserId();

            var playlist = await _context.Playlists
                .Include(p => p.PlaylistSongs)
                .FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);

            if (playlist == null)
            {
                return NotFound("Playlist not found or access denied.");
            }

            var songExists = await _context.Songs.AnyAsync(s => s.Id == request.SongId);
            if (!songExists) return NotFound("Song not found.");

            if (playlist.PlaylistSongs.Any(ps => ps.SongId == request.SongId))
            {
                return BadRequest("Song is already in this playlist.");
            }

            var playlistSong = new PlaylistSong
            {
                PlaylistId = id,
                SongId = request.SongId
            };

            _context.PlaylistSongs.Add(playlistSong);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Song added to playlist." });
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> DeletePlaylist(int id)
        {
            var userId = GetCurrentUserId();

            var playlist = await _context.Playlists
                .Include(p => p.PlaylistSongs)
                .FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);

            if (playlist == null)
            {
                return NotFound("Playlist not found or access denied.");
            }

            _context.PlaylistSongs.RemoveRange(playlist.PlaylistSongs);
            _context.Playlists.Remove(playlist);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Playlist deleted." });
        }
    }
}
