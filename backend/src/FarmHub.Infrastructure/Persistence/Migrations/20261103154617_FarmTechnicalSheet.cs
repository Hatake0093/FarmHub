using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FarmHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class FarmTechnicalSheet : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DepthZ",
                table: "Farms",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "HeightY",
                table: "Farms",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OperatingConditions",
                table: "Farms",
                type: "character varying(4000)",
                maxLength: 4000,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "WidthX",
                table: "Farms",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "FarmDependencies",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    FarmId = table.Column<int>(type: "integer", nullable: false),
                    RequiredFarmId = table.Column<int>(type: "integer", nullable: false),
                    Note = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FarmDependencies", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FarmDependencies_Farms_FarmId",
                        column: x => x.FarmId,
                        principalTable: "Farms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_FarmDependencies_Farms_RequiredFarmId",
                        column: x => x.RequiredFarmId,
                        principalTable: "Farms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "FarmLinks",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    FarmId = table.Column<int>(type: "integer", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Url = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    Kind = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FarmLinks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FarmLinks_Farms_FarmId",
                        column: x => x.FarmId,
                        principalTable: "Farms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "FarmProductions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    FarmId = table.Column<int>(type: "integer", nullable: false),
                    ResourceName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    AmountPerHour = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    Unit = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    RequiresAfk = table.Column<bool>(type: "boolean", nullable: false),
                    MeasurementConditions = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    Source = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    MeasuredInVersionId = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FarmProductions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FarmProductions_Farms_FarmId",
                        column: x => x.FarmId,
                        principalTable: "Farms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_FarmProductions_MinecraftVersions_MeasuredInVersionId",
                        column: x => x.MeasuredInVersionId,
                        principalTable: "MinecraftVersions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FarmDependencies_FarmId_RequiredFarmId",
                table: "FarmDependencies",
                columns: new[] { "FarmId", "RequiredFarmId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FarmDependencies_RequiredFarmId",
                table: "FarmDependencies",
                column: "RequiredFarmId");

            migrationBuilder.CreateIndex(
                name: "IX_FarmLinks_FarmId",
                table: "FarmLinks",
                column: "FarmId");

            migrationBuilder.CreateIndex(
                name: "IX_FarmProductions_FarmId",
                table: "FarmProductions",
                column: "FarmId");

            migrationBuilder.CreateIndex(
                name: "IX_FarmProductions_MeasuredInVersionId",
                table: "FarmProductions",
                column: "MeasuredInVersionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FarmDependencies");

            migrationBuilder.DropTable(
                name: "FarmLinks");

            migrationBuilder.DropTable(
                name: "FarmProductions");

            migrationBuilder.DropColumn(
                name: "DepthZ",
                table: "Farms");

            migrationBuilder.DropColumn(
                name: "HeightY",
                table: "Farms");

            migrationBuilder.DropColumn(
                name: "OperatingConditions",
                table: "Farms");

            migrationBuilder.DropColumn(
                name: "WidthX",
                table: "Farms");
        }
    }
}
