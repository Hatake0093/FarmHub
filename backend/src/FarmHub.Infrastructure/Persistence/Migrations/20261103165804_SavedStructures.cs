using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FarmHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SavedStructures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SavedStructures",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    Width = table.Column<int>(type: "integer", nullable: false),
                    Height = table.Column<int>(type: "integer", nullable: false),
                    Depth = table.Column<int>(type: "integer", nullable: false),
                    BaseX = table.Column<int>(type: "integer", nullable: false),
                    BaseY = table.Column<int>(type: "integer", nullable: false),
                    BaseZ = table.Column<int>(type: "integer", nullable: false),
                    PaletteText = table.Column<string>(type: "text", nullable: false),
                    Cells = table.Column<byte[]>(type: "bytea", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SavedStructures", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SavedStructures_Name",
                table: "SavedStructures",
                column: "Name");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SavedStructures");
        }
    }
}
