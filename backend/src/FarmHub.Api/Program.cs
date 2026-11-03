using FarmHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("FarmHub")
    ?? throw new InvalidOperationException("Falta la cadena de conexión 'FarmHub'.");

builder.Services.AddDbContext<FarmHubDbContext>(options => options.UseNpgsql(connectionString));
builder.Services.AddControllers();
builder.Services.AddOpenApi();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.MapControllers();

app.Run();

// Expuesto para las pruebas de integración.
public partial class Program;
