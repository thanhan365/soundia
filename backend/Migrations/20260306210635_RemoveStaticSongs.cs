using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Soundia.Api.Migrations
{
    /// <inheritdoc />
    public partial class RemoveStaticSongs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Songs",
                keyColumn: "Id",
                keyValue: 1);

            migrationBuilder.DeleteData(
                table: "Songs",
                keyColumn: "Id",
                keyValue: 2);

            migrationBuilder.DeleteData(
                table: "Songs",
                keyColumn: "Id",
                keyValue: 3);

            migrationBuilder.DeleteData(
                table: "Songs",
                keyColumn: "Id",
                keyValue: 4);

            migrationBuilder.DeleteData(
                table: "Songs",
                keyColumn: "Id",
                keyValue: 5);

            migrationBuilder.DeleteData(
                table: "Songs",
                keyColumn: "Id",
                keyValue: 6);

            migrationBuilder.DeleteData(
                table: "Songs",
                keyColumn: "Id",
                keyValue: 7);

            migrationBuilder.DeleteData(
                table: "Songs",
                keyColumn: "Id",
                keyValue: 8);

            migrationBuilder.DeleteData(
                table: "Songs",
                keyColumn: "Id",
                keyValue: 9);

            migrationBuilder.DeleteData(
                table: "Songs",
                keyColumn: "Id",
                keyValue: 10);

            migrationBuilder.DeleteData(
                table: "Songs",
                keyColumn: "Id",
                keyValue: 11);

            migrationBuilder.DeleteData(
                table: "Songs",
                keyColumn: "Id",
                keyValue: 12);

            migrationBuilder.DeleteData(
                table: "Songs",
                keyColumn: "Id",
                keyValue: 13);

            migrationBuilder.DeleteData(
                table: "Songs",
                keyColumn: "Id",
                keyValue: 14);

            migrationBuilder.DeleteData(
                table: "Songs",
                keyColumn: "Id",
                keyValue: 15);

            migrationBuilder.DeleteData(
                table: "Songs",
                keyColumn: "Id",
                keyValue: 16);

            migrationBuilder.DeleteData(
                table: "Songs",
                keyColumn: "Id",
                keyValue: 17);

            migrationBuilder.DeleteData(
                table: "Songs",
                keyColumn: "Id",
                keyValue: 18);

            migrationBuilder.DeleteData(
                table: "Songs",
                keyColumn: "Id",
                keyValue: 19);

            migrationBuilder.DeleteData(
                table: "Songs",
                keyColumn: "Id",
                keyValue: 20);

            migrationBuilder.DeleteData(
                table: "Songs",
                keyColumn: "Id",
                keyValue: 21);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
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
        }
    }
}
