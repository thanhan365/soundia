using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Soundia.Api.Data;
using Soundia.Api.DTOs.Auth;
using Soundia.Api.Models;
using Soundia.Api.Services;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

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

            var user = new User
            {
                Username = request.Username.ToLower(),
                Email = request.Email.ToLower(),
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password)
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return new AuthResponse
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                Token = _tokenService.CreateToken(user)
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

            return new AuthResponse
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                Token = _tokenService.CreateToken(user)
            };
        }
    }
}
