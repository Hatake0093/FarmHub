using FarmHub.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace FarmHub.Infrastructure.Persistence;

public sealed class FarmHubDbContext(DbContextOptions<FarmHubDbContext> options) : DbContext(options)
{
    public DbSet<Farm> Farms => Set<Farm>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Author> Authors => Set<Author>();
    public DbSet<Design> Designs => Set<Design>();
    public DbSet<DesignFile> DesignFiles => Set<DesignFile>();
    public DbSet<MinecraftVersion> MinecraftVersions => Set<MinecraftVersion>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<FarmLink> FarmLinks => Set<FarmLink>();
    public DbSet<FarmProduction> FarmProductions => Set<FarmProduction>();
    public DbSet<FarmDependency> FarmDependencies => Set<FarmDependency>();
    public DbSet<SavedStructure> SavedStructures => Set<SavedStructure>();
    public DbSet<BlockName> BlockNames => Set<BlockName>();
    public DbSet<ItemName> ItemNames => Set<ItemName>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Farm>(entity =>
        {
            entity.Property(f => f.Name).HasMaxLength(200).IsRequired();
            entity.Property(f => f.Description).HasMaxLength(4000);
            entity.Property(f => f.Difficulty).HasConversion<string>().HasMaxLength(20);

            // Una categoría no puede borrarse si tiene granjas.
            entity.HasOne(f => f.Category)
                  .WithMany(c => c.Farms)
                  .HasForeignKey(f => f.CategoryId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(f => f.MinecraftVersions).WithMany(v => v.Farms);
            entity.HasMany(f => f.Tags).WithMany(t => t.Farms);
            entity.HasMany(f => f.Structures).WithMany(s => s.Farms);

            entity.Property(f => f.OperatingConditions).HasMaxLength(4000);

            entity.HasIndex(f => f.Name);
        });

        modelBuilder.Entity<FarmLink>(entity =>
        {
            entity.Property(l => l.Title).HasMaxLength(200).IsRequired();
            entity.Property(l => l.Url).HasMaxLength(2000).IsRequired();
            entity.Property(l => l.Kind).HasConversion<string>().HasMaxLength(20);
            entity.HasOne(l => l.Farm).WithMany(f => f.Links).HasForeignKey(l => l.FarmId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<FarmProduction>(entity =>
        {
            entity.Property(p => p.ResourceName).HasMaxLength(200).IsRequired();
            entity.Property(p => p.AmountPerHour).HasPrecision(18, 4);
            entity.Property(p => p.Unit).HasConversion<string>().HasMaxLength(20);
            entity.Property(p => p.MeasurementConditions).HasMaxLength(2000);
            entity.Property(p => p.Source).HasMaxLength(500);
            entity.HasOne(p => p.Farm).WithMany(f => f.Productions).HasForeignKey(p => p.FarmId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(p => p.MeasuredInVersion).WithMany().HasForeignKey(p => p.MeasuredInVersionId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<FarmDependency>(entity =>
        {
            entity.Property(d => d.Note).HasMaxLength(500);
            entity.HasOne(d => d.Farm).WithMany(f => f.Requires).HasForeignKey(d => d.FarmId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(d => d.RequiredFarm).WithMany(f => f.RequiredBy).HasForeignKey(d => d.RequiredFarmId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(d => new { d.FarmId, d.RequiredFarmId }).IsUnique();
        });

        modelBuilder.Entity<Design>(entity =>
        {
            entity.Property(d => d.Name).HasMaxLength(200).IsRequired();
            entity.Property(d => d.Description).HasMaxLength(4000);

            // Borrar una granja borra sus diseños; borrar un autor deja sus diseños sin autor.
            entity.HasOne(d => d.Farm)
                  .WithMany(f => f.Designs)
                  .HasForeignKey(d => d.FarmId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(d => d.Author)
                  .WithMany(a => a.Designs)
                  .HasForeignKey(d => d.AuthorId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(d => d.FarmId);
        });

        modelBuilder.Entity<DesignFile>(entity =>
        {
            entity.Property(f => f.Kind).HasConversion<string>().HasMaxLength(20);
            entity.Property(f => f.OriginalFileName).HasMaxLength(255).IsRequired();
            entity.Property(f => f.ContentType).HasMaxLength(100).IsRequired();
            entity.Property(f => f.Sha256).HasMaxLength(64).IsRequired();
            entity.Property(f => f.StorageKey).HasMaxLength(64).IsRequired();

            // Los archivos no existen sin su diseño.
            entity.HasOne(f => f.Design)
                  .WithMany(d => d.Files)
                  .HasForeignKey(f => f.DesignId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(f => f.StorageKey).IsUnique();
        });

        modelBuilder.Entity<BlockName>(entity =>
        {
            entity.HasKey(b => b.Id);
            entity.Property(b => b.Id).HasMaxLength(200);
            entity.Property(b => b.SpanishName).HasMaxLength(100);
            entity.Property(b => b.Color).HasMaxLength(7);
            entity.Property(b => b.TextureKey).HasMaxLength(64);
        });

        modelBuilder.Entity<ItemName>(entity =>
        {
            entity.HasKey(i => i.Id);
            entity.Property(i => i.Id).HasMaxLength(200);
            entity.Property(i => i.SpanishName).HasMaxLength(100);
            entity.Property(i => i.Color).HasMaxLength(7);
        });

        modelBuilder.Entity<SavedStructure>(entity =>
        {
            entity.Property(s => s.Name).HasMaxLength(200).IsRequired();
            entity.Property(s => s.Description).HasMaxLength(4000);
            entity.Property(s => s.PaletteText).IsRequired();
            entity.Property(s => s.Cells).IsRequired();
            entity.HasIndex(s => s.Name);
            entity.HasMany(s => s.Farms).WithMany(f => f.Structures);
        });

        modelBuilder.Entity<Category>(entity =>
        {
            entity.Property(c => c.Name).HasMaxLength(100).IsRequired();
            entity.Property(c => c.Description).HasMaxLength(2000);
            entity.HasIndex(c => c.Name).IsUnique();
        });

        modelBuilder.Entity<Author>(entity =>
        {
            entity.Property(a => a.Name).HasMaxLength(200).IsRequired();
            entity.Property(a => a.Url).HasMaxLength(500);
        });

        modelBuilder.Entity<MinecraftVersion>(entity =>
        {
            entity.Property(v => v.Name).HasMaxLength(20).IsRequired();
            entity.HasIndex(v => v.Name).IsUnique();
        });

        modelBuilder.Entity<Tag>(entity =>
        {
            entity.Property(t => t.Name).HasMaxLength(50).IsRequired();
            entity.HasIndex(t => t.Name).IsUnique();
        });
    }
}
