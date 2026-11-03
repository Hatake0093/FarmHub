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

            entity.HasIndex(f => f.Name);
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
