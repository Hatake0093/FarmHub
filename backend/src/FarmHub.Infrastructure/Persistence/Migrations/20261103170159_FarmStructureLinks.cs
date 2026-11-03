using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FarmHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class FarmStructureLinks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "FarmSavedStructure",
                columns: table => new
                {
                    FarmsId = table.Column<int>(type: "integer", nullable: false),
                    StructuresId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FarmSavedStructure", x => new { x.FarmsId, x.StructuresId });
                    table.ForeignKey(
                        name: "FK_FarmSavedStructure_Farms_FarmsId",
                        column: x => x.FarmsId,
                        principalTable: "Farms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_FarmSavedStructure_SavedStructures_StructuresId",
                        column: x => x.StructuresId,
                        principalTable: "SavedStructures",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FarmSavedStructure_StructuresId",
                table: "FarmSavedStructure",
                column: "StructuresId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FarmSavedStructure");
        }
    }
}
