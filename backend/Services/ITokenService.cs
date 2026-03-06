using Soundia.Api.Models;

namespace Soundia.Api.Services
{
    public interface ITokenService
    {
        string CreateToken(User user);
    }
}
