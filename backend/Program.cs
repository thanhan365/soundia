using Microsoft.AspNetCore.Authentication.JwtBearer;
using Soundia.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Soundia.Api.Data;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Support Render's PORT environment variable
var port = Environment.GetEnvironmentVariable("PORT") ?? "5066";
builder.WebHost.UseUrls($"http://+:{port}");

// Add services to the container.

// 1. DbContext Configuration
var connectionString = Environment.GetEnvironmentVariable("DATABASE_URL") 
    ?? builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<SoundiaDbContext>(options =>
    options.UseSqlServer(connectionString, sqlOptions => 
    {
        sqlOptions.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(30),
            errorNumbersToAdd: null);
    }));

// Register Services
builder.Services.AddScoped<ITokenService, TokenService>();

// 2. Controllers and JSON settings
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });

// 3. CORS Settings (Allow React App)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp",
        policy => policy
            .WithOrigins(
                "http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176",
                "http://localhost:3000",
                "http://127.0.0.1:5173", "http://127.0.0.1:5174", "http://127.0.0.1:5175", "http://127.0.0.1:5176",
                "https://soundia-player.netlify.app",
                "https://attendance-scene-practitioner-sciences.trycloudflare.com"
            )
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials());
});

// 4. JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"];
var jwtIssuer = builder.Configuration["Jwt:Issuer"];
var jwtAudience = builder.Configuration["Jwt:Audience"];

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey!)),
            RoleClaimType = System.Security.Claims.ClaimTypes.Role
        };
    });

// 5. Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddHttpClient<Soundia.Api.Services.ISpotifyService, Soundia.Api.Services.SpotifyService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Only redirect HTTPS in production to avoid certificate issues in dev
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

// Use CORS before Auth
app.UseCors("AllowReactApp");

app.UseAuthentication();
app.UseAuthorization();
app.UseStaticFiles(); // Serve uploaded files from wwwroot/

// 6. Auto-Migrate Database
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var logger = services.GetRequiredService<ILogger<Program>>();
    try
    {
        var context = services.GetRequiredService<SoundiaDbContext>();
        logger.LogInformation("Applying migrations...");
        context.Database.Migrate();
        logger.LogInformation("Migrations applied successfully.");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "An error occurred during migration. The app will continue without migration.");
    }
}

app.MapControllers();

app.Run();

