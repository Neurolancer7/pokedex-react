import { v } from "convex/values";
import { internalQuery, internalMutation } from "./_generated/server";

// Internal query to check if Pokemon exists
export const getByIdInternal = internalQuery({
  args: { pokemonId: v.number() },
  handler: async (ctx, args) => {
    // Return the first matching document if duplicates exist
    const results = await ctx.db
      .query("pokemon")
      .withIndex("by_pokemon_id", (q) => q.eq("pokemonId", args.pokemonId))
      .collect();
    return results[0] ?? null;
  },
});

// Internal mutation to cache Pokemon data
export const cachePokemon = internalMutation({
  args: {
    pokemonData: v.any(),
    speciesData: v.any(),
  },
  handler: async (ctx, args) => {
    const { pokemonData, speciesData } = args;
    
    // Cache Pokemon
    await ctx.db.insert("pokemon", {
      pokemonId: pokemonData.id,
      name: pokemonData.name,
      height: pokemonData.height,
      weight: pokemonData.weight,
      baseExperience: pokemonData.base_experience,
      types: pokemonData.types.map((t: any) => t.type.name),
      abilities: pokemonData.abilities.map((a: any) => ({
        name: a.ability.name,
        isHidden: a.is_hidden,
      })),
      stats: pokemonData.stats.map((s: any) => ({
        name: s.stat.name,
        baseStat: s.base_stat,
        effort: s.effort,
      })),
      sprites: {
        frontDefault: pokemonData.sprites.front_default,
        frontShiny: pokemonData.sprites.front_shiny,
        officialArtwork: pokemonData.sprites.other?.["official-artwork"]?.front_default,
      },
      moves: pokemonData.moves.slice(0, 20).map((m: any) => m.move.name), // Limit moves
      generation: getGenerationFromId(pokemonData.id),
    });
    
    // Cache species data
    const flavorText = speciesData.flavor_text_entries
      ?.find((entry: any) => entry.language.name === "en")?.flavor_text
      ?.replace(/\f/g, " ") || "";
    
    await ctx.db.insert("pokemonSpecies", {
      pokemonId: pokemonData.id,
      name: speciesData.name,
      flavorText,
      genus: speciesData.genera?.find((g: any) => g.language.name === "en")?.genus,
      captureRate: speciesData.capture_rate,
      baseHappiness: speciesData.base_happiness,
      growthRate: speciesData.growth_rate?.name,
      habitat: speciesData.habitat?.name,
      evolutionChainId: speciesData.evolution_chain?.url ? 
        parseInt(speciesData.evolution_chain.url.split('/').slice(-2, -1)[0]) : undefined,
      generation: getGenerationFromId(pokemonData.id),
    });
  },
});

// Internal mutation to cache Pokemon types
export const cacheType = internalMutation({
  args: {
    name: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pokemonTypes")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .unique();
    
    if (!existing) {
      await ctx.db.insert("pokemonTypes", {
        name: args.name,
        color: args.color,
      });
    }
  },
});

function getGenerationFromId(id: number): number {
  if (id <= 151) return 1;
  if (id <= 251) return 2;
  if (id <= 386) return 3;
  if (id <= 493) return 4;
  if (id <= 649) return 5;
  if (id <= 721) return 6;
  if (id <= 809) return 7;
  if (id <= 905) return 8;
  return 9;
}