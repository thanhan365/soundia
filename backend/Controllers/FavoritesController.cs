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
    public class FavoritesController : ControllerBase
    {
        private readonly SoundiaDbContext _context;

        public FavoritesController(SoundiaDbContext context)
        {
            _context = context;
        }

        private int GetCurrentUserId()
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.Parse(userIdString!);
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Song>>> GetFavorites()
        {
            var userId = GetCurrentUserId();

            var favoriteSongs = await _context.Favorites
                .Where(f => f.UserId == userId)
                .Select(f => f.Song)
                .ToListAsync();

            return favoriteSongs;
        }

        [HttpPost]
        public async Task<ActionResult> ToggleFavorite([FromBody] AddSongToPlaylistRequest request)
        {
            var userId = GetCurrentUserId();

            var song = await _context.Songs.FindAsync(request.SongId);
            if (song == null) return NotFound("Song not found.");

            var existingFavorite = await _context.Favorites
                .FirstOrDefaultAsync(f => f.UserId == userId && f.SongId == request.SongId);

            if (existingFavorite != null)
            {
                // Remove favorite
                _context.Favorites.Remove(existingFavorite);
                await _context.SaveChangesAsync();
                return Ok(new { message = "Removed from favorites." });
            }
            else
            {
                // Add favorite
                var favorite = new Favorite
                {
                    UserId = userId,
                    SongId = request.SongId
                };
                
                _context.Favorites.Add(favorite);
                await _context.SaveChangesAsync();
                return Ok(new { message = "Added to favorites." });
            }
        }
    }
}
