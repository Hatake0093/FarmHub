using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FarmHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddBlockFaceTextures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "TextureKeyBottom",
                table: "BlockNames",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TextureKeyTop",
                table: "BlockNames",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TextureKeyBottom",
                table: "BlockNames");

            migrationBuilder.DropColumn(
                name: "TextureKeyTop",
                table: "BlockNames");
        }
    }
}
