using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Soundia.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Songs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Artist = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Duration = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    CoverUrl = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    AudioUrl = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Songs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Username = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Favorites",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    SongId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Favorites", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Favorites_Songs_SongId",
                        column: x => x.SongId,
                        principalTable: "Songs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Favorites_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Playlists",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Playlists", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Playlists_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PlaylistSongs",
                columns: table => new
                {
                    PlaylistId = table.Column<int>(type: "int", nullable: false),
                    SongId = table.Column<int>(type: "int", nullable: false),
                    AddedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlaylistSongs", x => new { x.PlaylistId, x.SongId });
                    table.ForeignKey(
                        name: "FK_PlaylistSongs_Playlists_PlaylistId",
                        column: x => x.PlaylistId,
                        principalTable: "Playlists",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PlaylistSongs_Songs_SongId",
                        column: x => x.SongId,
                        principalTable: "Songs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "Songs",
                columns: new[] { "Id", "Artist", "AudioUrl", "CoverUrl", "Duration", "Title" },
                values: new object[,]
                {
                    { 1, "NeonWave", "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", "https://picsum.photos/seed/song1/300/300", "3:42", "Midnight Pulse" },
                    { 2, "SynthCity", "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", "https://picsum.photos/seed/song2/300/300", "4:15", "Electric Dreams" },
                    { 3, "Digital Aura", "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", "https://picsum.photos/seed/song3/300/300", "3:58", "Cyber Horizon" },
                    { 4, "Futura", "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3", "https://picsum.photos/seed/song4/300/300", "4:32", "Neon Lights" },
                    { 5, "Cosmos", "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3", "https://picsum.photos/seed/song5/300/300", "3:21", "Starfall" },
                    { 6, "Velocity", "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3", "https://picsum.photos/seed/song6/300/300", "5:07", "Retrograde" },
                    { 7, "CodeBreaker", "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3", "https://picsum.photos/seed/song7/300/300", "4:44", "Binary Sunset" },
                    { 8, "Particle", "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3", "https://picsum.photos/seed/song8/300/300", "3:33", "Quantum Beat" },
                    { 9, "DarkMatter", "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3", "https://picsum.photos/seed/song9/300/300", "4:19", "Void Walker" },
                    { 10, "Skyline", "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3", "https://picsum.photos/seed/song10/300/300", "3:56", "Aurora" },
                    { 11, "NeonWave", "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", "https://picsum.photos/seed/song1/300/300", "3:42", "Midnight Pulse" },
                    { 12, "SynthCity", "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", "https://picsum.photos/seed/song2/300/300", "4:15", "Electric Dreams" },
                    { 13, "Digital Aura", "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", "https://picsum.photos/seed/song3/300/300", "3:58", "Cyber Horizon" },
                    { 14, "Futura", "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3", "https://picsum.photos/seed/song4/300/300", "4:32", "Neon Lights" },
                    { 15, "Cosmos", "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3", "https://picsum.photos/seed/song5/300/300", "3:21", "Starfall" },
                    { 16, "Velocity", "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3", "https://picsum.photos/seed/song6/300/300", "5:07", "Retrograde" },
                    { 17, "CodeBreaker", "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3", "https://picsum.photos/seed/song7/300/300", "4:44", "Binary Sunset" },
                    { 18, "Particle", "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3", "https://picsum.photos/seed/song8/300/300", "3:33", "Quantum Beat" },
                    { 19, "DarkMatter", "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3", "https://picsum.photos/seed/song9/300/300", "4:19", "Void Walker" },
                    { 20, "Skyline", "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3", "https://picsum.photos/seed/song10/300/300", "3:56", "Aurora" },
                    { 21, "Suno", "/audio/LƯỚT QUA TIM ANH.mp3", "https://picsum.photos/seed/song3/300/300", "2:29", "Lướt Qua Tim Anh" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Favorites_SongId",
                table: "Favorites",
                column: "SongId");

            migrationBuilder.CreateIndex(
                name: "IX_Favorites_UserId",
                table: "Favorites",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Playlists_UserId",
                table: "Playlists",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_PlaylistSongs_SongId",
                table: "PlaylistSongs",
                column: "SongId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Favorites");

            migrationBuilder.DropTable(
                name: "PlaylistSongs");

            migrationBuilder.DropTable(
                name: "Playlists");

            migrationBuilder.DropTable(
                name: "Songs");

            migrationBuilder.DropTable(
                name: "Users");
        }
    }
}
